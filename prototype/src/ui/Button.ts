import Phaser from 'phaser'
import { fs, layout, RENDER_SCALE } from '../render/layout'
import { paintTexture } from '../scenery/paint/canvas'

export interface ButtonOptions {
  x: number
  y: number
  w: number
  h: number
  label: string
  fontPx?: number
  fill?: string
  stroke?: string
  textColor?: string
  depth?: number
  /** default 0: pinned to the screen */
  scrollFactor?: number
  onPress: () => void
}

/** Comfortable minimum touch target, in logical units (≈44 CSS px). */
export function touchMin() {
  return Math.round(44 * layout.uiScale)
}

function pillTexture(scene: Phaser.Scene, w: number, h: number, fill: string, stroke: string) {
  w = Math.round(w)
  h = Math.round(h)
  const pad = 8
  return paintTexture(scene, `btn-${w}x${h}-${fill}-${stroke}`, w + pad * 2, h + pad * 2, (ctx) => {
    const r = Math.min(h * 0.32, 18)
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2 * RENDER_SCALE
    ctx.beginPath()
    ctx.roundRect(pad, pad, w, h, r)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.shadowColor = 'transparent'
    const sheen = ctx.createLinearGradient(0, pad, 0, pad + h)
    sheen.addColorStop(0, 'rgba(255,255,255,0.16)')
    sheen.addColorStop(0.5, 'rgba(255,255,255,0)')
    ctx.fillStyle = sheen
    ctx.fill()
    ctx.lineWidth = 1.6
    ctx.strokeStyle = stroke
    ctx.stroke()
  })
}

/**
 * Tappable pill button (image + text; avoids Container hit-area quirks). Fires on pointer
 * *down* so touch feels immediate, and stops propagation so taps don't also reach game input.
 */
export class Button {
  readonly bg: Phaser.GameObjects.Image
  readonly label: Phaser.GameObjects.Text
  private enabled = true
  private baseScale = 1 / RENDER_SCALE

  private opts: ButtonOptions

  constructor(scene: Phaser.Scene, opts: ButtonOptions) {
    this.opts = opts
    const key = pillTexture(scene, opts.w, opts.h, opts.fill ?? '#2d3a63', opts.stroke ?? '#8fa2e0')
    this.bg = scene.add.image(opts.x, opts.y, key).setScale(this.baseScale)
    this.label = scene.add
      .text(opts.x, opts.y, opts.label, {
        fontSize: fs(opts.fontPx ?? 15),
        color: opts.textColor ?? '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: opts.w - 12 },
      })
      .setOrigin(0.5)

    const sf = opts.scrollFactor ?? 0
    this.bg.setScrollFactor(sf)
    this.label.setScrollFactor(sf)
    this.setDepth(opts.depth ?? 1000)

    this.bg.setInteractive({ useHandCursor: true })
    this.bg.on('pointerdown', (...args: unknown[]) => {
      ;(args[3] as { stopPropagation?: () => void } | undefined)?.stopPropagation?.()
      if (!this.enabled) return
      this.pulse(0.92)
      this.opts.onPress()
    })
    this.bg.on('pointerover', () => this.enabled && scene.tweens.add({ targets: this.bg, scale: this.baseScale * 1.04, duration: 90 }))
    this.bg.on('pointerout', () => scene.tweens.add({ targets: this.bg, scale: this.baseScale, duration: 90 }))
  }

  private pulse(to: number) {
    this.bg.scene.tweens.add({
      targets: this.bg,
      scale: this.baseScale * to,
      duration: 70,
      yoyo: true,
      ease: 'Sine.easeOut',
    })
  }

  setText(text: string) {
    this.label.setText(text)
    return this
  }

  setPosition(x: number, y: number) {
    this.bg.setPosition(x, y)
    this.label.setPosition(x, y)
    return this
  }

  setDepth(d: number) {
    this.bg.setDepth(d)
    this.label.setDepth(d + 0.1)
    return this
  }

  setVisible(v: boolean) {
    this.bg.setVisible(v)
    this.label.setVisible(v)
    if (this.bg.input) this.bg.input.enabled = v
    return this
  }

  setEnabled(v: boolean) {
    this.enabled = v
    this.bg.setAlpha(v ? 1 : 0.5)
    return this
  }

  destroy() {
    this.bg.destroy()
    this.label.destroy()
  }
}
