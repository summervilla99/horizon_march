import Phaser from 'phaser'
import { fs, layout } from '../render/layout'
import { Panel } from '../ui/Panel'

export type DealResult = 'GREAT' | 'GOOD' | 'POOR'

const MIN_PRICE = 30
const MAX_PRICE = 90
const SWEET_RANGE: [number, number] = [45, 55]
const GOOD_RANGE: [number, number] = [35, 65]
const SWEEP_MS = 1300
const DEPTH = 1100
const INPUT_GUARD_MS = 220

type Part = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text | Phaser.GameObjects.Image

/**
 * Timing-bar haggling. Tap anywhere (or press Space) to stop the sweeping pointer.
 * The panel is laid out from the live view size, so it fits a 480-wide portrait screen too.
 */
export class PriceNegotiation {
  private parts: Part[] = []
  private panel!: Panel

  private pointer!: Phaser.GameObjects.Rectangle
  private priceLabel!: Phaser.GameObjects.Text
  private resultText!: Phaser.GameObjects.Text

  private barLeft = 0
  private barWidth = 0
  private barY = 0

  private sweepTween?: Phaser.Tweens.Tween
  private active = false
  private stopped = false
  private activatedAt = 0
  private onComplete?: (result: DealResult, price: number) => void

  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.build()
    scene.input.keyboard!.on('keydown-SPACE', () => this.handleStop())
    scene.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: unknown[]) => {
      if (over.length === 0) this.handleStop()
    })
  }

  isActive(): boolean {
    return this.active
  }

  start(onComplete: (result: DealResult, price: number) => void) {
    this.onComplete = onComplete
    this.active = true
    this.stopped = false
    this.activatedAt = performance.now()
    this.setVisible(true)
    this.resultText.setText('')
    this.pointer.x = this.barLeft

    this.sweepTween?.stop()
    this.sweepTween = this.scene.tweens.add({
      targets: this.pointer,
      x: this.barLeft + this.barWidth,
      duration: SWEEP_MS,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      onUpdate: () => this.updatePriceLabel(),
    })
    this.updatePriceLabel()
  }

  private priceToX(price: number): number {
    return this.barLeft + ((price - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * this.barWidth
  }

  private currentPrice(): number {
    const t = Phaser.Math.Clamp((this.pointer.x - this.barLeft) / this.barWidth, 0, 1)
    return Math.round(MIN_PRICE + t * (MAX_PRICE - MIN_PRICE))
  }

  private updatePriceLabel() {
    this.priceLabel.setText(`${this.currentPrice()}전`).setPosition(this.pointer.x, this.barY - 34 * layout.uiScale)
  }

  private handleStop() {
    if (!this.active || this.stopped || performance.now() - this.activatedAt < INPUT_GUARD_MS) return
    this.stopped = true // a second tap during the result flash must not re-trigger; stay "active" so the world ignores it

    this.sweepTween?.stop()
    const price = this.currentPrice()

    let result: DealResult
    if (price >= SWEET_RANGE[0] && price <= SWEET_RANGE[1]) result = 'GREAT'
    else if (price >= GOOD_RANGE[0] && price <= GOOD_RANGE[1]) result = 'GOOD'
    else result = 'POOR'

    const label = result === 'GREAT' ? 'GREAT DEAL!' : result === 'GOOD' ? 'GOOD DEAL' : 'POOR DEAL...'
    const color = result === 'GREAT' ? '#7CFF9B' : result === 'GOOD' ? '#FFE066' : '#FF6B6B'
    this.resultText.setText(label).setColor(color)

    this.scene.time.delayedCall(1100, () => {
      this.active = false
      this.setVisible(false)
      this.onComplete?.(result, price)
    })
  }

  private build() {
    const u = layout.uiScale
    const margin = Math.round(12 * u)
    const panelW = Math.min(760, layout.viewW - margin * 2)
    const panelH = Math.round(230 * u)
    const cx = layout.viewW / 2
    const cy = layout.portrait ? layout.viewH * 0.34 : 250
    const top = cy - panelH / 2

    this.panel = new Panel(this.scene, cx, cy, panelW, panelH, { fill: 0x0d0f1c, fillAlpha: 0.95, border: 0x5a6b9c })

    const title = this.scene.add
      .text(cx, top + 22 * u, '흥정! 적당한 가격에서 멈추세요', {
        fontSize: fs(16),
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: panelW - 32 },
      })
      .setOrigin(0.5)
    const hint = this.scene.add
      .text(cx, top + 22 * u + title.height * 0.5 + 12 * u, layout.touch ? '화면 아무 곳이나 탭' : '[Space] 또는 클릭', {
        fontSize: fs(12),
        color: '#9fb0e0',
      })
      .setOrigin(0.5)

    this.barWidth = panelW - 64 * u
    this.barLeft = cx - this.barWidth / 2
    const barH = Math.round(30 * u)
    this.barY = cy + 10 * u

    const track = this.scene.add.rectangle(cx, this.barY, this.barWidth, barH, 0x2a2f45).setStrokeStyle(2, 0x44507a)

    const goodX = this.priceToX(GOOD_RANGE[0])
    const goodW = this.priceToX(GOOD_RANGE[1]) - goodX
    const zoneGood = this.scene.add.rectangle(goodX + goodW / 2, this.barY, goodW, barH, 0xd8b23c, 0.55)

    const sweetX = this.priceToX(SWEET_RANGE[0])
    const sweetW = this.priceToX(SWEET_RANGE[1]) - sweetX
    const zoneSweet = this.scene.add.rectangle(sweetX + sweetW / 2, this.barY, sweetW, barH, 0x5cd97a, 0.7)

    const minLabel = this.scene.add
      .text(this.barLeft, this.barY + barH / 2 + 8 * u, `${MIN_PRICE}전\n너무 싸요`, { fontSize: fs(12), color: '#aab4d8' })
      .setOrigin(0, 0)
    const maxLabel = this.scene.add
      .text(this.barLeft + this.barWidth, this.barY + barH / 2 + 8 * u, `${MAX_PRICE}전\n너무 비싸요`, {
        fontSize: fs(12),
        color: '#aab4d8',
        align: 'right',
      })
      .setOrigin(1, 0)

    this.pointer = this.scene.add.rectangle(this.barLeft, this.barY, 8, barH + 14, 0xffffff)
    this.priceLabel = this.scene.add
      .text(this.barLeft, this.barY - 34 * u, '', { fontSize: fs(15), color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5)
    this.resultText = this.scene.add
      .text(cx, top + panelH - 30 * u, '', { fontSize: fs(20), fontStyle: 'bold' })
      .setOrigin(0.5)

    this.parts = [title, hint, track, zoneGood, zoneSweet, minLabel, maxLabel, this.pointer, this.priceLabel, this.resultText]
    for (const p of this.parts) {
      p.setScrollFactor(0)
      p.setDepth(DEPTH + 1)
    }
    this.panel.setScrollFactor(0).setDepth(DEPTH)
    this.setVisible(false)
  }

  private setVisible(v: boolean) {
    this.panel.setVisible(v)
    for (const p of this.parts) p.setVisible(v)
  }
}
