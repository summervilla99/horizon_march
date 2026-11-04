import Phaser from 'phaser'
import { fs, layout, margin, setupHiDpiScene } from '../render/layout'
import { Actor, FEET_Y } from '../game/Actor'
import { ACTORS, textureKey, type ActorId } from '../game/actors'
import { audio } from '../game/audio'
import { goToScene, savedProgress } from '../game/GameFlow'
import { CHAPTERS, FLAT } from '../game/story'
import { ensureGendarmeTexture } from '../game/props'
import { buildHarborBackdrop } from '../scenery/HarborBackdrop'
import { Button, touchMin } from '../ui/Button'

const LINEUP: [ActorId, number][] = [
  ['yasuda', 0.06],
  ['ganemura', 0.17],
  ['gangseong', 0.28],
  ['sunju', 0.39],
  ['akiko', 0.5],
  ['masayo', 0.61],
  ['megumi', 0.72],
  ['cheongok', 0.83],
]

export class TitleScene extends Phaser.Scene {
  private actors: Actor[] = []
  private finished = false

  constructor() {
    super('Title')
  }

  init(data: { finished?: boolean }) {
    this.finished = !!data?.finished
    this.actors = []
  }

  preload() {
    const bar = this.add.graphics()
    const label = this.add
      .text(layout.viewW / 2, layout.viewH / 2 - 26, '불러오는 중…', { fontSize: '16px', color: '#cfd8ff' })
      .setOrigin(0.5)
    this.cameras.main.setOrigin(0, 0).setZoom(2)
    this.load.on('progress', (p: number) => {
      bar.clear()
      bar.fillStyle(0x2b3350, 1).fillRoundedRect(layout.viewW / 2 - 120, layout.viewH / 2, 240, 10, 5)
      bar.fillStyle(0xffd37a, 1).fillRoundedRect(layout.viewW / 2 - 120, layout.viewH / 2, 240 * p, 10, 5)
    })
    this.load.once('complete', () => {
      bar.destroy()
      label.destroy()
    })
    for (const def of Object.values(ACTORS)) {
      if (def.art) this.load.image(textureKey(def.id), def.art)
    }
  }

  create() {
    setupHiDpiScene(this)
    audio.stopAll(900)
    ensureGendarmeTexture(this)
    buildHarborBackdrop(this, 'morning')

    for (const [id, f] of LINEUP) {
      const a = new Actor(this, ACTORS[id], Math.round(layout.viewW * (layout.portrait ? 0.08 + f * 0.88 : 0.03 + f * 0.64)), FEET_Y + (id === 'cheongok' ? 24 : id === 'masayo' ? 14 : id === 'megumi' ? -8 : 0))
      a.face(f > 0.45 ? 'left' : 'right')
      a.setLabelVisible(false)
      this.actors.push(a)
    }
    this.time.addEvent({
      delay: 1100,
      loop: true,
      callback: () => {
        const a = Phaser.Utils.Array.GetRandom(this.actors)
        void a.hop(14, 200)
      },
    })

    const cx = layout.viewW / 2
    const top = layout.safeT + margin() + (layout.portrait ? 96 : 28)
    const shadowStyle = { stroke: '#2a1a10', strokeThickness: 8 }
    this.add
      .text(cx, top, '호라이즌 마치', { fontSize: fs(layout.portrait ? 46 : 58), color: '#fff0c8', fontStyle: 'bold', ...shadowStyle })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(900)
    this.add
      .text(cx, top + (layout.portrait ? 62 : 76) * layout.uiScale, 'HORIZON MARCH  ·  2026 한일연극제', { fontSize: fs(14), color: '#ffe3b8', stroke: '#2a1a10', strokeThickness: 5 })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(900)

    this.buildButtons()
    this.cameras.main.fadeIn(600, 0, 0, 0)
  }

  private buildButtons() {
    const saved = savedProgress()
    const hasSave = saved > 0
    const w = Math.min(layout.viewW - margin() * 2, layout.portrait ? 320 : 250)
    const h = Math.round(touchMin() * 1.1)
    const gap = 12
    const items: { label: string; fill: string; stroke: string; run: () => void }[] = []

    items.push({
      label: this.finished ? '다시 처음부터 ▶' : '처음부터 시작 ▶',
      fill: '#7a2e2e',
      stroke: '#ffb0a0',
      run: () => void this.begin(0),
    })
    if (hasSave) {
      const ch = FLAT[saved]?.chapter
      items.push({
        label: `이어하기 · ${ch?.no ?? 1}장`,
        fill: '#2d4a6b',
        stroke: '#9ec8f5',
        run: () => void this.begin(saved),
      })
    }
    if (layout.touch) {
      items.push({ label: '전체화면 · 가로 모드', fill: '#2b2b3a', stroke: '#9aa', run: () => void this.goFullscreen() })
    }

    const total = items.length * h + (items.length - 1) * gap
    const x = layout.portrait ? layout.viewW / 2 : layout.viewW - layout.safeR - margin() - w / 2
    const bottom = layout.viewH - layout.safeB - margin() - 18
    const startY = layout.portrait ? bottom - total : Math.max(layout.safeT + 170, layout.viewH / 2 - total / 2 + 60)
    items.forEach((it, i) => {
      new Button(this, {
        x,
        y: startY + i * (h + gap) + h / 2,
        w,
        h,
        label: it.label,
        fontPx: 17,
        fill: it.fill,
        stroke: it.stroke,
        depth: 1000,
        onPress: it.run,
      })
    })

    this.add
      .text(layout.viewW / 2, layout.viewH - layout.safeB - 6, `${CHAPTERS.length}개의 장 · 탭하거나 방향키/Space로 즐겨요`, { fontSize: fs(11), color: '#f3e7cd', stroke: '#2a1a10', strokeThickness: 4 })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(900)
  }

  private async goFullscreen() {
    try {
      if (!this.scale.isFullscreen) this.scale.startFullscreen()
      await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape')
    } catch {
      /* iOS Safari and some browsers refuse; the layout adapts to either orientation */
    }
  }

  private async begin(index: number) {
    audio.unlock()
    if (layout.touch && layout.portrait) void this.goFullscreen()
    goToScene(this, index)
  }
}
