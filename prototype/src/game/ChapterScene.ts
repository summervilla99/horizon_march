import Phaser from 'phaser'
import { fs, followCameraX, layout, margin, setupHiDpiScene, snapCameraX } from '../render/layout'
import { DialogueBox } from '../dialogue/DialogueBox'
import type { DialogueTree } from '../dialogue/types'
import { Button, touchMin } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Actor, BAND_BOTTOM, BAND_TOP, FEET_Y } from './Actor'
import { ACTORS, type ActorId } from './actors'
import { goToScene, goToTitle, nextScene } from './GameFlow'
import { CHAPTERS, FLAT } from './story'
import type { StoryScene } from './script'
import { buildStage } from './stages'
import { drumChallenge, type DrumOpts } from '../minigames/DrumChallenge'
import { timingBar, type TimingOpts } from '../minigames/TimingBar'
import { tapMash, type MashOpts } from '../minigames/TapMash'
import { riceDodge, type RiceOpts } from '../minigames/RiceDodge'

const CARD_DEPTH = 1500
const MENU_DEPTH = 1400

/**
 * Plays one scripted scene. Story scripts (src/game/story/*) are async functions that drive this
 * class: place actors, make them talk / walk / fall over, hand control to the player for a
 * stretch, or launch a minigame — and simply return when the scene is over.
 */
export class ChapterScene extends Phaser.Scene {
  index = 0
  def!: StoryScene
  worldW = 0
  dialogue!: DialogueBox

  private actors = new Map<ActorId, Actor>()
  private follow: Actor | null = null
  private sepiaRect?: Phaser.GameObjects.Rectangle
  private goal: { x: number; leader: Actor; resolve: () => void; marker: Phaser.GameObjects.GameObject[] } | null = null
  private laneTarget: number | null = null
  private jumpBtn?: Button
  private menuObjs: Phaser.GameObjects.GameObject[] = []
  private menuBtns: Button[] = []
  private keys!: Record<'left' | 'right' | 'up' | 'down' | 'a' | 'd', Phaser.Input.Keyboard.Key>
  private leaving = false

  constructor() {
    super('Chapter')
  }

  init(data: { index?: number }) {
    this.index = data.index ?? 0
    this.actors = new Map()
    this.follow = null
    this.goal = null
    this.laneTarget = null
    this.menuObjs = []
    this.menuBtns = []
    this.leaving = false
  }

  relayoutData() {
    return { index: this.index }
  }

  create() {
    setupHiDpiScene(this)
    this.def = FLAT[this.index].def as StoryScene
    this.worldW = buildStage(this, this.def.stage, this.def.world ?? 1)
    this.cameras.main.scrollX = 0

    this.dialogue = new DialogueBox(this)
    this.dialogue.onLine = (speaker) => this.nod(speaker)

    const kb = this.input.keyboard!
    this.keys = {
      left: kb.addKey('LEFT'),
      right: kb.addKey('RIGHT'),
      up: kb.addKey('UP'),
      down: kb.addKey('DOWN'),
      a: kb.addKey('A'),
      d: kb.addKey('D'),
    }
    kb.on('keydown-SPACE', () => this.tryJump())
    kb.on('keydown-UP', () => this.tryJump())
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: unknown[]) => this.onTap(p, over))

    if (this.def.stage === 'harbor-memory') this.sepia(true, 0)
    this.buildMenuButton()
    this.cameras.main.fadeIn(550, 0, 0, 0)

    void this.runScript()
  }

  // ---------------------------------------------------------------- script runner

  private async runScript() {
    try {
      const ch = CHAPTERS.find((c) => c.scenes.includes(this.def))
      if (ch && ch.scenes[0] === this.def) await this.card(`제 ${ch.no} 장`, `${ch.title}\n${ch.sub}`, 2300)
      await this.def.play(this)
    } catch (err) {
      console.error('scene script failed', err)
    }
    if (!this.leaving && this.scene.isActive('Chapter')) {
      this.leaving = true
      nextScene(this, this.index)
    }
  }

  // ---------------------------------------------------------------- actors

  fx(frac: number) {
    return Math.round(layout.viewW * frac)
  }

  put(id: ActorId, frac: number, o: { lane?: number; face?: 'left' | 'right'; hidden?: boolean; abs?: boolean } = {}) {
    const x = o.abs ? frac : this.fx(frac)
    const a = new Actor(this, ACTORS[id], x, o.lane ?? FEET_Y)
    if (o.face) a.face(o.face)
    if (o.hidden) a.setVisible(false)
    this.actors.set(id, a)
    return a
  }

  /** Walks a new actor in from off-screen. */
  async enter(id: ActorId, frac: number, from: 'left' | 'right' = 'left', o: { lane?: number; speed?: number } = {}) {
    const startX = from === 'left' ? this.cameras.main.scrollX - 70 : this.cameras.main.scrollX + layout.viewW + 70
    const a = this.put(id, startX, { lane: o.lane, abs: true })
    await a.walkTo(this.fx(frac) + (this.def.world ? this.cameras.main.scrollX : 0), o.speed ?? 190)
    return a
  }

  actor(id: ActorId) {
    const a = this.actors.get(id)
    if (!a) throw new Error(`actor ${id} is not on stage`)
    return a
  }

  has(id: ActorId) {
    return this.actors.has(id)
  }

  remove(id: ActorId) {
    this.actors.get(id)?.destroy()
    this.actors.delete(id)
  }

  /** Everyone currently on stage except the given ones. */
  others(...except: ActorId[]) {
    return [...this.actors.entries()].filter(([id]) => !except.includes(id)).map(([, a]) => a)
  }

  async exit(id: ActorId, to: 'left' | 'right' = 'right', speed = 200) {
    const a = this.actor(id)
    const x = to === 'right' ? this.cameras.main.scrollX + layout.viewW + 90 : this.cameras.main.scrollX - 90
    await a.walkTo(x, speed)
    this.remove(id)
  }

  /** Everyone turns to look at somebody. */
  gather(towards: ActorId) {
    const t = this.actor(towards)
    for (const a of this.actors.values()) if (a !== t) a.faceToward(t.x)
  }

  private nod(speaker: string) {
    if (!speaker) return
    for (const a of this.actors.values()) {
      if (a.def.name === speaker && a.visible) {
        a.talk()
        break
      }
    }
  }

  setFollow(a: Actor | null, snap = false) {
    this.follow = a
    if (a && snap) snapCameraX(this, a.x, this.worldW)
  }

  panTo(x: number, ms = 900): Promise<void> {
    const target = Phaser.Math.Clamp(x - layout.viewW / 2, 0, Math.max(0, this.worldW - layout.viewW))
    this.follow = null
    return new Promise((resolve) =>
      this.tweens.add({ targets: this.cameras.main, scrollX: target, duration: ms, ease: 'Sine.easeInOut', onComplete: () => resolve() }),
    )
  }

  // ---------------------------------------------------------------- dialogue

  /** A conversation: [speaker, line] pairs. Speaker '' is a stage direction. */
  talk(lines: ReadonlyArray<readonly [string, string]>): Promise<void> {
    if (!lines.length) return Promise.resolve()
    const tree: DialogueTree = {}
    lines.forEach(([speaker, text], i) => {
      tree[`l${i}`] = { id: `l${i}`, speaker, text, next: i < lines.length - 1 ? `l${i + 1}` : undefined }
    })
    return new Promise((resolve) => {
      this.dialogue.onEnd = () => resolve()
      this.dialogue.start(tree, 'l0')
    })
  }

  say(speaker: string, text: string) {
    return this.talk([[speaker, text]])
  }

  narrate(text: string) {
    return this.talk([['', text]])
  }

  choose(speaker: string, text: string, options: string[]): Promise<number> {
    const tree: DialogueTree = {
      q: { id: 'q', speaker, text, choices: options.map((t) => ({ text: t, next: '' })) },
    }
    return new Promise((resolve) => {
      let picked = 0
      this.dialogue.onChoice = (i) => (picked = i)
      this.dialogue.onEnd = () => resolve(picked)
      this.dialogue.start(tree, 'q')
    })
  }

  wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, () => resolve()))
  }

  /** A short, non-blocking caption (stage directions) near the top of the screen. */
  caption(text: string, ms = 2200): Promise<void> {
    const w = Math.min(layout.viewW - margin() * 2 - layout.safeL - layout.safeR, 560)
    const t = this.add
      .text(0, 0, text, { fontSize: fs(14), color: '#f6efe0', align: 'center', wordWrap: { width: w - 28 }, fontStyle: 'italic' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(CARD_DEPTH - 50)
    const h = t.height + 22
    const y = layout.safeT + margin() + Math.round(84 * layout.uiScale)
    const panel = new Panel(this, layout.viewW / 2, y, w, h, { fill: 0x1a1410, fillAlpha: 0.8, border: 0xc9b48a }).setScrollFactor(0).setDepth(CARD_DEPTH - 51)
    t.setPosition(layout.viewW / 2, y)
    panel.setVisible(true)
    const all = [panel.shadow, panel.panel, t]
    all.forEach((o) => (o as Phaser.GameObjects.Image).setAlpha(0))
    this.tweens.add({ targets: all, alpha: 1, duration: 260 })
    return new Promise((resolve) => {
      this.time.delayedCall(ms, () => {
        this.tweens.add({
          targets: all,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            panel.destroy()
            t.destroy()
            resolve()
          },
        })
      })
    })
  }

  // ---------------------------------------------------------------- effects

  /** Black title card (chapter / era). Tap to skip. */
  card(big: string, small = '', ms = 2400): Promise<void> {
    const veil = this.add
      .rectangle(0, 0, layout.viewW + 8, layout.viewH + 8, 0x07060a, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(CARD_DEPTH)
      .setInteractive()
    const bigT = this.add
      .text(layout.viewW / 2, layout.viewH / 2 - 14 * layout.uiScale, big, {
        fontSize: fs(36),
        color: '#f4e7c6',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: layout.viewW - 40 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(CARD_DEPTH + 1)
    const smallT = this.add
      .text(layout.viewW / 2, bigT.y + bigT.height / 2 + 14 * layout.uiScale, small, {
        fontSize: fs(17),
        color: '#cfc3a6',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: layout.viewW - 40 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(CARD_DEPTH + 1)
    const stuff = [bigT, smallT]
    stuff.forEach((o) => o.setAlpha(0))
    veil.setAlpha(0)
    this.tweens.add({ targets: veil, alpha: 1, duration: 380 })
    this.tweens.add({ targets: stuff, alpha: 1, duration: 520, delay: 260 })
    return new Promise((resolve) => {
      let done = false
      const finish = () => {
        if (done) return
        done = true
        this.tweens.add({
          targets: [veil, ...stuff],
          alpha: 0,
          duration: 520,
          onComplete: () => {
            veil.destroy()
            stuff.forEach((o) => o.destroy())
            resolve()
          },
        })
      }
      this.time.delayedCall(ms, finish)
      this.time.delayedCall(700, () => veil.once('pointerdown', finish))
    })
  }

  sepia(on: boolean, ms = 1400) {
    if (!this.sepiaRect) {
      this.sepiaRect = this.add
        .rectangle(0, 0, layout.viewW + 8, layout.viewH + 8, 0xb58a52, 0)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(850)
        .setBlendMode(Phaser.BlendModes.MULTIPLY)
    }
    this.tweens.add({ targets: this.sepiaRect, alpha: on ? 0.62 : 0, duration: ms })
  }

  flash(color = 0xffffff, ms = 380) {
    this.cameras.main.flash(ms, (color >> 16) & 255, (color >> 8) & 255, color & 255)
  }

  shakeCam(ms = 260, power = 0.008) {
    this.cameras.main.shake(ms, power)
  }

  confetti(ms = 5000) {
    const colors = [0xff6b6b, 0xffd95a, 0x6bd6ff, 0x9bff8a, 0xff9be1, 0xffffff]
    const cam = this.cameras.main
    const n = Math.round(layout.viewW / 5)
    for (let i = 0; i < n; i++) {
      this.time.delayedCall(Math.random() * ms * 0.6, () => {
        const r = this.add
          .rectangle(cam.scrollX + Math.random() * layout.viewW, layout.camY - 20, 7, 11, Phaser.Utils.Array.GetRandom(colors))
          .setDepth(950)
          .setRotation(Math.random() * 3)
        this.tweens.add({
          targets: r,
          y: layout.worldBottom + 20,
          x: r.x + (Math.random() - 0.5) * 140,
          rotation: r.rotation + 8 + Math.random() * 6,
          duration: 2200 + Math.random() * 2000,
          ease: 'Sine.easeIn',
          onComplete: () => r.destroy(),
        })
      })
    }
  }

  /** Everyone on stage jumps for joy, `times` times, slightly out of step. */
  async cheer(ids?: ActorId[], times = 3) {
    const list = ids ? ids.map((id) => this.actor(id)) : [...this.actors.values()]
    const jobs = list.map(async (a, i) => {
      await this.wait(i * 70)
      for (let k = 0; k < times; k++) await a.jump(46 + (i % 3) * 8, 380)
    })
    await Promise.all(jobs)
  }

  /** Everyone runs (marching in place while the x tween moves them) to x, camera tracking `lead`. */
  async runAcross(ids: ActorId[], toX: number, speed = 260, lead?: ActorId) {
    const list = ids.map((id) => this.actor(id))
    if (lead) this.setFollow(this.actor(lead))
    await Promise.all(list.map((a, i) => a.walkTo(toX - i * 34, speed - i * 6)))
  }

  // ---------------------------------------------------------------- minigames

  drum(o: DrumOpts) {
    return drumChallenge(this, o)
  }
  rice(o: RiceOpts) {
    return riceDodge(this, o)
  }
  timing(o: TimingOpts) {
    return timingBar(this, o)
  }
  mash(o: MashOpts) {
    return tapMash(this, o)
  }

  // ---------------------------------------------------------------- player control

  /**
   * Hands the player control of `id` until they reach `x` (a screen fraction unless abs).
   * Tap the ground to walk there, arrow keys / A-D to steer, Space / ↑ / the jump button to jump.
   */
  goTo(id: ActorId, xFrac: number, hint: string, abs = false): Promise<void> {
    const leader = this.actor(id)
    const x = abs ? xFrac : this.fx(xFrac)
    this.follow = this.worldW > layout.viewW ? leader : null

    const arrow = this.add
      .text(x, FEET_Y - 215, '▼', { fontSize: '30px', color: '#ffe36e', stroke: '#1b140f', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(900)
    const label = this.add
      .text(x, FEET_Y - 245, hint, { fontSize: fs(14), color: '#fff3c8', fontStyle: 'bold', stroke: '#1b140f', strokeThickness: 5, align: 'center' })
      .setOrigin(0.5)
      .setDepth(900)
    const ring = this.add.ellipse(x, FEET_Y + 6, 90, 22, 0xffe36e, 0.28).setDepth(5)
    this.tweens.add({ targets: arrow, y: arrow.y + 10, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.tweens.add({ targets: ring, scaleX: 1.35, alpha: 0.1, duration: 800, yoyo: true, repeat: -1 })

    this.jumpBtn?.destroy()
    this.jumpBtn = new Button(this, {
      x: layout.viewW - layout.safeR - margin() - touchMin() * 0.9,
      y: layout.viewH - layout.safeB - margin() - touchMin() * 0.7,
      w: touchMin() * 1.7,
      h: touchMin() * 1.15,
      label: '점프 ⤒',
      fontPx: 16,
      fill: '#2d4a6b',
      stroke: '#9ec8f5',
      depth: 1200,
      onPress: () => this.tryJump(),
    })

    return new Promise((resolve) => {
      this.goal = {
        x,
        leader,
        marker: [arrow, label, ring],
        resolve: () => {
          this.goal = null
          this.jumpBtn?.destroy()
          this.jumpBtn = undefined
          ;[arrow, label, ring].forEach((o) => o.destroy())
          leader.stop()
          resolve()
        },
      }
    })
  }

  private tryJump() {
    if (!this.goal || this.dialogue.isActive()) return
    const a = this.goal.leader
    if (a.offY === 0) void a.jump(96, 560)
  }

  private onTap(p: Phaser.Input.Pointer, over: unknown[]) {
    if (!this.goal || over.length > 0 || this.dialogue.isActive() || this.menuObjs.length) return
    const wp = this.cameras.main.getWorldPoint(p.x, p.y)
    const leader = this.goal.leader
    // tapping the hero hops / jumps; tapping elsewhere walks there (y picks the lane)
    if (Math.abs(wp.x - leader.x) < 34 && wp.y > leader.lane - 190 && wp.y < leader.lane + 10) {
      this.tryJump()
      return
    }
    leader.walkTo(Phaser.Math.Clamp(wp.x, 30, this.worldW - 30), 190)
    this.laneTarget = Phaser.Math.Clamp(wp.y, BAND_TOP, BAND_BOTTOM)
  }

  // ---------------------------------------------------------------- menu

  private buildMenuButton() {
    const s = touchMin()
    new Button(this, {
      x: layout.viewW - layout.safeR - margin() - s * 0.55,
      y: layout.safeT + margin() + s * 0.5,
      w: s * 1.1,
      h: s,
      label: '☰',
      fontPx: 20,
      fill: '#1d2236',
      stroke: '#8fa2e0',
      depth: 1300,
      onPress: () => this.openMenu(),
    })
  }

  private openMenu() {
    if (this.menuObjs.length) return
    const blocker = this.add
      .rectangle(0, 0, layout.viewW, layout.viewH, 0x000000, 0.66)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(MENU_DEPTH)
      .setInteractive()
    this.menuObjs.push(blocker)
    const title = this.add
      .text(layout.viewW / 2, layout.safeT + margin() + 6, '장 이동', { fontSize: fs(20), color: '#ffe3a0', fontStyle: 'bold' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(MENU_DEPTH + 1)
    this.menuObjs.push(title)

    const cols = layout.viewW >= 760 ? 2 : 1
    const rowH = Math.round(touchMin() * (cols === 2 ? 0.95 : 0.86))
    const gap = 6
    const gridW = Math.min(layout.viewW - margin() * 2, cols === 2 ? 700 : 420)
    const colW = (gridW - gap * (cols - 1)) / cols
    const left = (layout.viewW - gridW) / 2
    let top = title.y + title.height + 12
    CHAPTERS.forEach((ch, i) => {
      const col = cols === 2 ? i % 2 : 0
      const row = cols === 2 ? Math.floor(i / 2) : i
      const firstIdx = FLAT.findIndex((f) => f.def === ch.scenes[0])
      const here = ch.scenes.includes(this.def)
      this.menuBtns.push(
        new Button(this, {
          x: left + col * (colW + gap) + colW / 2,
          y: top + row * (rowH + gap) + rowH / 2,
          w: colW,
          h: rowH,
          label: `${ch.no}. ${ch.title}`,
          fontPx: 14,
          fill: here ? '#4a3a1e' : '#232a43',
          stroke: here ? '#ffd37a' : '#6677b0',
          depth: MENU_DEPTH + 2,
          onPress: () => {
            this.closeMenu()
            goToScene(this, firstIdx)
          },
        }),
      )
    })
    const rows = cols === 2 ? Math.ceil(CHAPTERS.length / 2) : CHAPTERS.length
    const by = top + rows * (rowH + gap) + rowH * 0.2
    const half = (gridW - gap) / 2
    const mk = (label: string, x: number, fn: () => void, fill = '#2b2b3a', stroke = '#9aa') =>
      this.menuBtns.push(
        new Button(this, { x, y: by + rowH / 2, w: half, h: rowH, label, fontPx: 14, fill, stroke, depth: MENU_DEPTH + 2, onPress: fn }),
      )
    mk('이 장면 건너뛰기 ⏭', left + half / 2, () => {
      this.closeMenu()
      if (!this.leaving) {
        this.leaving = true
        nextScene(this, this.index)
      }
    })
    mk('닫기', left + half + gap + half / 2, () => this.closeMenu(), '#3a2b2b', '#caa')
    // title + the "title screen" shortcut sit on a third row to keep the buttons large
    this.menuBtns.push(
      new Button(this, {
        x: layout.viewW / 2,
        y: by + rowH * 1.5 + gap,
        w: gridW,
        h: rowH,
        label: '타이틀 화면으로',
        fontPx: 14,
        fill: '#2b2b3a',
        stroke: '#9aa',
        depth: MENU_DEPTH + 2,
        onPress: () => {
          this.closeMenu()
          goToTitle(this)
        },
      }),
    )
  }

  private closeMenu() {
    this.menuBtns.forEach((b) => b.destroy())
    this.menuBtns = []
    // keep the blocker alive until the next tick so the closing tap isn't read by the stage
    const objs = this.menuObjs
    this.time.delayedCall(0, () => {
      objs.forEach((o) => o.destroy())
      if (this.menuObjs === objs) this.menuObjs = []
    })
  }

  // ---------------------------------------------------------------- loop

  update(time: number, delta: number) {
    for (const a of this.actors.values()) a.update(time, delta)

    if (this.goal) {
      const { leader, x } = this.goal
      const k = this.keys
      const dir = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0)
      if (dir !== 0 && !this.dialogue.isActive()) {
        leader.stop()
        leader.x = Phaser.Math.Clamp(leader.x + (dir * 200 * delta) / 1000, 30, this.worldW - 30)
        leader.flip = dir < 0
        leader.marching = true
      } else leader.marching = false
      if (k.down.isDown) leader.lane = Phaser.Math.Clamp(leader.lane + (120 * delta) / 1000, BAND_TOP, BAND_BOTTOM)
      if (this.laneTarget !== null) {
        const dl = this.laneTarget - leader.lane
        if (Math.abs(dl) < 1.5) this.laneTarget = null
        else leader.lane += Math.sign(dl) * Math.min(Math.abs(dl), (110 * delta) / 1000)
      }
      if (Math.abs(leader.x - x) < 36 && !this.dialogue.isActive()) this.goal.resolve()
    }

    if (this.follow) followCameraX(this, this.follow.x, this.worldW)
  }
}

