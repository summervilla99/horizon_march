import Phaser from 'phaser'
import { RENDER_SCALE } from '../render/layout'
import { paintTexture } from '../scenery/paint/canvas'

function hex(n: number) {
  return `#${n.toString(16).padStart(6, '0')}`
}

export interface PanelStyle {
  fill?: number
  fillAlpha?: number
  border?: number
  radius?: number
}

const PAD = 18 // room around the panel for the blurred shadow / border stroke

function panelTextures(scene: Phaser.Scene, w: number, h: number, style: PanelStyle) {
  w = Math.round(w)
  h = Math.round(h)
  const fill = hex(style.fill ?? 0x12141f)
  const fillAlpha = style.fillAlpha ?? 0.94
  const border = hex(style.border ?? 0x5a6b9c)
  const radius = style.radius ?? 14
  const id = `${w}x${h}-${fill}-${fillAlpha}-${border}-${radius}`

  const shadow = paintTexture(scene, `panel-shadow-${id}`, w + PAD * 2, h + PAD * 2, (ctx) => {
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 4 * RENDER_SCALE
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.roundRect(PAD, PAD, w, h, radius)
    ctx.fill()
  })
  const panel = paintTexture(scene, `panel-${id}`, w + PAD * 2, h + PAD * 2, (ctx) => {
    ctx.beginPath()
    ctx.roundRect(PAD, PAD, w, h, radius)
    ctx.globalAlpha = fillAlpha
    ctx.fillStyle = fill
    ctx.fill()
    ctx.globalAlpha = 1
    const sheen = ctx.createLinearGradient(0, PAD, 0, PAD + h)
    sheen.addColorStop(0, 'rgba(255,255,255,0.07)')
    sheen.addColorStop(0.4, 'rgba(255,255,255,0)')
    ctx.fillStyle = sheen
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = border
    ctx.stroke()
    ctx.beginPath()
    ctx.roundRect(PAD + 3, PAD + 3, w - 6, h - 6, Math.max(2, radius - 3))
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.stroke()
  })
  return { shadow, panel }
}

/**
 * Rounded panel with a soft blurred drop shadow, a gentle sheen and an inner highlight,
 * painted at RENDER_SCALE so it stays crisp. Can be resized in place (swaps cached textures).
 */
export class Panel {
  readonly shadow: Phaser.GameObjects.Image
  readonly panel: Phaser.GameObjects.Image

  private scene: Phaser.Scene
  private style: PanelStyle

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, style: PanelStyle = {}) {
    this.scene = scene
    this.style = style
    const keys = panelTextures(scene, w, h, style)
    this.shadow = scene.add.image(x, y, keys.shadow).setScale(1 / RENDER_SCALE)
    this.panel = scene.add.image(x, y, keys.panel).setScale(1 / RENDER_SCALE)
  }

  resize(w: number, h: number) {
    const keys = panelTextures(this.scene, w, h, this.style)
    this.shadow.setTexture(keys.shadow)
    this.panel.setTexture(keys.panel)
    return this
  }

  setPosition(x: number, y: number) {
    this.shadow.setPosition(x, y)
    this.panel.setPosition(x, y)
    return this
  }

  setDepth(d: number) {
    this.shadow.setDepth(d - 0.5)
    this.panel.setDepth(d)
    return this
  }

  setScrollFactor(f: number) {
    this.shadow.setScrollFactor(f)
    this.panel.setScrollFactor(f)
    return this
  }

  setVisible(v: boolean) {
    this.shadow.setVisible(v)
    this.panel.setVisible(v)
    return this
  }

  destroy() {
    this.shadow.destroy()
    this.panel.destroy()
  }
}
