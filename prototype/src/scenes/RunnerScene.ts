import Phaser from 'phaser'
import { fs, followCameraX, layout, margin, setupHiDpiScene } from '../render/layout'
import { DialogueBox } from '../dialogue/DialogueBox'
import { Actor, FEET_Y } from '../game/Actor'
import { ACTORS, textureKey } from '../game/actors'
import { goToTitle, nextScene } from '../game/GameFlow'
import { buildStreetBackdrop } from '../scenery/StreetBackdrop'
import { Button, touchMin } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { onAction, popText } from '../minigames/ui'

const LENGTH = 4300
const BASE_SPEED = 225
const JUMP_H = 118
const JUMP_MS = 640

/**
 * 가네무라의 도주 — an endless-runner stretch where the hero (Ganemura) outruns the military
 * police. Tap / Space / ↑ to jump over each 헌병. A hit slows him and lets the pursuers close in;
 * if they catch him he simply starts again, a little more forgiving each time.
 */
export class RunnerScene extends Phaser.Scene {
  private index = 0
  private dialogue!: DialogueBox
  private runner!: Actor
  private worldW = 0
  private obstacles: Phaser.GameObjects.Image[] = []
  private chasers: Phaser.GameObjects.Image[] = []
  private hud!: Phaser.GameObjects.Graphics
  private state: 'intro' | 'run' | 'caught' | 'done' = 'intro'
  private gap = 330
  private invuln = 0
  private slow = 0
  private attempt = 0
  private offAction: (() => void) | null = null

  constructor() {
    super('Runner')
  }

  init(data: { index?: number }) {
    this.index = data.index ?? 0
    this.obstacles = []
    this.chasers = []
    this.attempt = 0
    this.state = 'intro'
    this.offAction = null
  }

  relayoutData() {
    return { index: this.index }
  }

  create() {
    setupHiDpiScene(this)
    this.worldW = LENGTH + layout.viewW * 1.4
    buildStreetBackdrop(this, this.worldW, 'night')
    this.dialogue = new DialogueBox(this)
    this.hud = this.add.graphics().setScrollFactor(0).setDepth(1100)

    this.runner = new Actor(this, ACTORS.ganemura, 150)
    this.runner.setLabelVisible(true)
    this.addMenuButton()
    this.cameras.main.fadeIn(500, 0, 0, 0)
    void this.intro()
  }

  private addMenuButton() {
    const s = touchMin()
    new Button(this, {
      x: layout.viewW - layout.safeR - margin() - s * 0.55,
      y: layout.safeT + margin() + s * 0.5,
      w: s * 1.1,
      h: s,
      label: '⏭',
      fontPx: 18,
      fill: '#1d2236',
      stroke: '#8fa2e0',
      depth: 1300,
      onPress: () => this.leave(),
    })
  }

  private leave() {
    if (this.state === 'done') return
    this.state = 'done'
    this.offAction?.()
    nextScene(this, this.index)
  }

  private async intro() {
    await this.dialogue.play([
      ['', '이번엔 가네무라가 주인공! 오사카의 밤거리를 달려, 헌병의 눈을 피해 항구로 가야 한다.'],
      ['가네무라', '하필 왜 이런 때 단속을 하고 난리야. 기반아, 미안해. 배웅 못해줘서.'],
      ['가네무라', '빨리 도망쳐야 돼, 빨리 도망쳐야 돼...!'],
    ])
    this.startRun()
  }

  private startRun() {
    // fresh obstacle course every attempt
    this.obstacles.forEach((o) => o.destroy())
    this.chasers.forEach((c) => c.destroy())
    this.obstacles = []
    this.chasers = []
    this.runner.x = 150
    this.runner.lane = FEET_Y
    this.runner.offY = 0
    this.runner.rot = 0
    this.runner.setAlpha(1)
    this.runner.marching = true
    this.runner.tint(0xffffff)
    this.gap = 330 + this.attempt * 70
    this.invuln = 0
    this.slow = 0
    this.cameras.main.scrollX = 0

    const tex = textureKey('gendarme')
    const h = 150
    let x = 820
    let n = 0
    while (x < LENGTH - 260) {
      const img = this.add.image(x, FEET_Y, tex).setOrigin(0.5, 1).setFlipX(true).setDepth(FEET_Y)
      img.setScale(h / img.height)
      this.obstacles.push(img)
      n++
      x += Phaser.Math.Between(360, 520) + (n % 4 === 0 ? 120 : 0) + this.attempt * 40
    }
    for (let i = 0; i < 2; i++) {
      const c = this.add.image(0, FEET_Y - i * 6, tex).setOrigin(0.5, 1).setDepth(FEET_Y - i)
      c.setScale((h + 6 - i * 10) / c.height)
      this.chasers.push(c)
    }

    const hint = this.add
      .text(layout.viewW / 2, layout.viewH * 0.34, layout.touch ? '화면을 탭하면 점프!' : '탭 / Space / ↑ 로 점프!', {
        fontSize: fs(22),
        color: '#fff3c8',
        fontStyle: 'bold',
        stroke: '#1b140f',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1100)
    this.tweens.add({ targets: hint, alpha: 0, delay: 2400, duration: 600, onComplete: () => hint.destroy() })

    this.state = 'run'
    this.offAction?.()
    this.offAction = onAction(this, () => this.jump(), 150)
  }

  private jump() {
    if (this.state !== 'run' || this.runner.offY !== 0) return
    void this.runner.jump(JUMP_H, JUMP_MS)
  }

  update(time: number, delta: number) {
    this.runner.update(time, delta)
    if (this.state !== 'run') {
      if (this.state === 'caught' || this.state === 'intro') followCameraX(this, this.runner.x + layout.viewW * 0.18, this.worldW, 0.1)
      return
    }
    const dt = delta / 1000
    this.slow = Math.max(0, this.slow - dt)
    this.invuln = Math.max(0, this.invuln - dt)
    const v = (BASE_SPEED - this.attempt * 14) * (this.slow > 0 ? 0.45 : 1)
    this.runner.x += v * dt
    this.runner.setAlpha(this.invuln > 0 ? 0.5 + 0.5 * Math.sin(time / 40) : 1)
    followCameraX(this, this.runner.x + layout.viewW * 0.2, this.worldW, 0.18)

    // pursuers hang behind, bobbing, and slowly lose ground when the player runs clean
    this.gap = Math.min(380, this.gap + dt * 7)
    this.chasers.forEach((c, i) => {
      c.x = this.runner.x - this.gap - i * 52
      c.y = FEET_Y - i * 6 + Math.sin(time / 90 + i) * 3
    })

    for (const o of this.obstacles) {
      if (this.invuln <= 0 && Math.abs(o.x - this.runner.x) < 32 && this.runner.offY > -62) {
        this.hit(time)
        break
      }
    }

    if (this.gap < 70) return this.caught()
    if (this.runner.x >= LENGTH) return this.finish()
    this.drawHud()
  }

  private hit(_time: number) {
    this.invuln = 1.3
    this.slow = 0.55
    this.gap -= 105
    this.runner.tint(0xff9a9a)
    this.time.delayedCall(260, () => this.runner.tint(0xffffff))
    this.cameras.main.shake(140, 0.007)
    popText(this, this.runner.x, this.runner.lane - 215, '윽!', '#ff9a8a', 26, false)
  }

  private drawHud() {
    const g = this.hud
    g.clear()
    const w = Math.min(layout.viewW - margin() * 2 - layout.safeL - layout.safeR - touchMin() * 1.5, 420)
    const x = layout.safeL + margin()
    const y = layout.safeT + margin() + 8
    const p = Phaser.Math.Clamp(this.runner.x / LENGTH, 0, 1)
    g.fillStyle(0x000000, 0.5).fillRoundedRect(x - 3, y - 3, w + 6, 40, 10)
    g.fillStyle(0x2b3350, 1).fillRoundedRect(x, y, w, 12, 5)
    g.fillStyle(0x8fd6ff, 1).fillRoundedRect(x, y, Math.max(12, w * p), 12, 5)
    g.fillStyle(0xfff3c8, 1).fillCircle(x + Math.max(6, w * p), y + 6, 7)
    // danger meter: how close the pursuers are
    const danger = 1 - Phaser.Math.Clamp((this.gap - 70) / 310, 0, 1)
    g.fillStyle(0x2b3350, 1).fillRoundedRect(x, y + 20, w, 10, 5)
    g.fillStyle(danger > 0.6 ? 0xff5a4a : 0xe6b04a, 1).fillRoundedRect(x, y + 20, Math.max(8, w * danger), 10, 5)
  }

  private caught() {
    this.state = 'caught'
    this.offAction?.()
    this.runner.marching = false
    this.runner.tint(0xff9a9a)
    this.cameras.main.shake(260, 0.01)
    this.attempt++
    this.panel('잡혔다!', '괜찮아, 다시 도망치자!\n(이번엔 조금 더 여유 있게)', '다시 달리기', () => this.startRun())
  }

  private async finish() {
    this.state = 'done'
    this.offAction?.()
    this.hud.clear()
    this.runner.marching = false
    this.runner.stop()
    this.chasers.forEach((c) => c.setVisible(false))
    this.cameras.main.flash(300, 255, 255, 255)
    await this.dialogue.play([
      ['', '항구가 보인다. 헌병은 따돌렸다!'],
      ['가네무라', '빨리 도망쳐야 되는데...!'],
      ['', '…그런데 가네무라의 발이 멈췄다. 그는 달려온 길을 되돌아간다.'],
    ])
    this.runner.face('left')
    await this.runner.walkTo(this.runner.x - 140, 260)
    nextScene(this, this.index)
  }

  private panel(title: string, body: string, buttonLabel: string, onPress: () => void) {
    const w = Math.min(layout.viewW - margin() * 2, 400)
    const t = this.add.text(0, 0, title, { fontSize: fs(26), color: '#ffe3a0', fontStyle: 'bold' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1202)
    const b = this.add
      .text(0, 0, body, { fontSize: fs(15), color: '#e8ecff', align: 'center', lineSpacing: 6, wordWrap: { width: w - 40 } })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1202)
    const bh = touchMin() * 1.1
    const h = 20 + t.height + 8 + b.height + 18 + bh + 20
    const cy = layout.viewH / 2
    const top = cy - h / 2
    const panel = new Panel(this, layout.viewW / 2, cy, w, h, { fill: 0x10131d, fillAlpha: 0.94, border: 0xf2c46b }).setScrollFactor(0).setDepth(1200)
    t.setPosition(layout.viewW / 2, top + 20)
    b.setPosition(layout.viewW / 2, top + 20 + t.height + 8)
    const btn = new Button(this, {
      x: layout.viewW / 2,
      y: top + h - 20 - bh / 2,
      w: w - 60,
      h: bh,
      label: buttonLabel,
      fontPx: 17,
      fill: '#7a2e2e',
      stroke: '#ffb0a0',
      depth: 1210,
      onPress: () => {
        panel.destroy()
        t.destroy()
        b.destroy()
        btn.destroy()
        this.time.delayedCall(0, onPress)
      },
    })
  }

  shutdown() {
    this.offAction?.()
  }
}

export function leaveRunnerToTitle(scene: Phaser.Scene) {
  goToTitle(scene)
}
