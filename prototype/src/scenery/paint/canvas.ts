import Phaser from 'phaser'
import { layoutTag, RENDER_SCALE } from '../../render/layout'

export type Ctx = CanvasRenderingContext2D
export type Stops = [number, string][]

/** Deterministic PRNG (mulberry32) so cached layers repaint identically. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function range(r: () => number, min: number, max: number) {
  return min + r() * (max - min)
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

export function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export function vGradient(ctx: Ctx, x: number, y: number, w: number, h: number, stops: Stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  for (const [o, c] of stops) g.addColorStop(o, c)
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
}

export function softGlow(ctx: Ctx, x: number, y: number, r: number, inner: string, outer: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

/** Texture key for painted content whose size/composition depends on the current view layout. */
export function layoutKey(name: string) {
  return `bg:${layoutTag()}:${name}`
}

interface LayerOptions {
  x?: number
  y?: number
  scrollFactor: number
  /** vertical scroll factor: 1 (default) anchors the layer to the world, 0 pins it to the screen */
  scrollFactorY?: number
  depth: number
  chunk?: number
  blend?: Phaser.BlendModes
  alpha?: number
}

/**
 * Paints a (possibly very wide) layer with Canvas 2D at RENDER_SCALE density and adds it
 * to the scene as image strips (chunked to stay under GPU max texture sizes). `name` +
 * the current layout form the texture cache key, so re-entering a scene doesn't repaint
 * anything — the painter must therefore be deterministic (use `rng`).
 */
export function paintLayer(
  scene: Phaser.Scene,
  name: string,
  w: number,
  h: number,
  paint: (ctx: Ctx) => void,
  opts: LayerOptions,
): Phaser.GameObjects.Image[] {
  const chunk = opts.chunk ?? 900
  const images: Phaser.GameObjects.Image[] = []
  for (let start = 0; start < w; start += chunk) {
    const pad = start === 0 ? 0 : 2 // tiny overlap hides seams between strips
    const cw = Math.min(chunk, w - start) + pad
    const key = layoutKey(`${name}@${start}`)
    if (!scene.textures.exists(key)) {
      const tex = scene.textures.createCanvas(key, Math.ceil(cw * RENDER_SCALE), Math.ceil(h * RENDER_SCALE))!
      const ctx = tex.getContext()
      ctx.scale(RENDER_SCALE, RENDER_SCALE)
      ctx.translate(-(start - pad), 0)
      paint(ctx)
      tex.refresh()
    }
    const img = scene.add
      .image((opts.x ?? 0) + start - pad, opts.y ?? 0, key)
      .setOrigin(0, 0)
      .setScale(1 / RENDER_SCALE)
      .setScrollFactor(opts.scrollFactor, opts.scrollFactorY ?? 1)
      .setDepth(opts.depth)
    if (opts.blend !== undefined) img.setBlendMode(opts.blend)
    if (opts.alpha !== undefined) img.setAlpha(opts.alpha)
    images.push(img)
  }
  return images
}

/** Paints a small standalone sprite texture (cloud, smoke puff…) and returns its key. Pass a layoutKey() for layout-dependent ones. */
export function paintTexture(scene: Phaser.Scene, key: string, w: number, h: number, paint: (ctx: Ctx) => void) {
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, Math.ceil(w * RENDER_SCALE), Math.ceil(h * RENDER_SCALE))!
    const ctx = tex.getContext()
    ctx.scale(RENDER_SCALE, RENDER_SCALE)
    paint(ctx)
    tex.refresh()
  }
  return key
}

/** Width a parallax layer must have to cover the whole world at a given scroll factor. */
export function layerWidth(worldWidth: number, viewWidth: number, scrollFactor: number) {
  return Math.ceil(viewWidth + (worldWidth - viewWidth) * scrollFactor) + 4
}
