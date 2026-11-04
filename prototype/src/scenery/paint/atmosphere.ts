import Phaser from 'phaser'
import { layout, RENDER_SCALE, worldToScreenY } from '../../render/layout'
import {
  layerWidth,
  layoutKey,
  paintLayer,
  paintTexture,
  range,
  rgba,
  rng,
  softGlow,
  vGradient,
  type Stops,
} from './canvas'

export interface SkyLook {
  stops: Stops
  /** sun position as a fraction of view width; y is a distance below the top of the sky */
  sun?: { fx: number; y: number; radius: number; core: string; glow: string }
  moon?: boolean
  stars?: boolean
}

/**
 * Screen-pinned sky. The gradient runs from the top of the view down to just past the horizon
 * (`horizonWorldY`), then holds its last colour, so the warm horizon tones always sit where the
 * rooftops are no matter how tall the view is.
 */
export function buildSky(scene: Phaser.Scene, name: string, worldWidth: number, look: SkyLook, horizonWorldY = 400) {
  const sf = 0.03
  const w = layerWidth(worldWidth, layout.viewW, sf)
  const h = layout.viewH
  const gradientLen = Math.min(h, worldToScreenY(horizonWorldY) + 140)
  const last = look.stops[look.stops.length - 1][1]

  paintLayer(
    scene,
    `${name}-sky`,
    w,
    h,
    (ctx) => {
      vGradient(ctx, 0, 0, w, gradientLen, look.stops)
      if (gradientLen < h) {
        ctx.fillStyle = last
        ctx.fillRect(0, gradientLen - 1, w, h - gradientLen + 1)
      }
      if (look.sun) {
        const { fx, y, radius, core, glow } = look.sun
        const x = layout.viewW * fx
        softGlow(ctx, x, y, radius * 3.2, rgba(glow, 0.35), rgba(glow, 0))
        softGlow(ctx, x, y, radius * 1.4, rgba(core, 0.85), rgba(glow, 0))
        softGlow(ctx, x, y, radius * 0.45, rgba(core, 1), rgba(core, 0.9))
      }
    },
    { scrollFactor: sf, scrollFactorY: 0, depth: -100, chunk: 1100 },
  )

  const skyBottom = worldToScreenY(horizonWorldY)
  if (look.stars) buildStars(scene, worldWidth, skyBottom)
  if (look.moon) buildMoon(scene, skyBottom)
}

function buildStars(scene: Phaser.Scene, worldWidth: number, skyBottom: number) {
  const r = rng(7)
  const count = Math.round(110 * Math.max(1, skyBottom / 400))
  for (let i = 0; i < count; i++) {
    const star = scene.add
      .circle(
        range(r, 0, layout.viewW + worldWidth * 0.03),
        range(r, 10, skyBottom * 0.58),
        range(r, 0.5, 1.4),
        0xffffff,
        range(r, 0.3, 0.9),
      )
      .setScrollFactor(0.03, 0)
      .setDepth(-99)
    scene.tweens.add({
      targets: star,
      alpha: star.alpha * 0.3,
      duration: range(r, 1600, 3800),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: range(r, 0, 2400),
    })
  }
}

function buildMoon(scene: Phaser.Scene, skyBottom: number) {
  const key = paintTexture(scene, 'moon', 200, 200, (ctx) => {
    softGlow(ctx, 100, 100, 100, 'rgba(255,244,214,0.28)', 'rgba(255,244,214,0)')
    softGlow(ctx, 100, 100, 46, 'rgba(255,248,226,0.5)', 'rgba(255,248,226,0)')
    ctx.fillStyle = '#fff6df'
    ctx.beginPath()
    ctx.arc(100, 100, 22, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(214,200,170,0.35)'
    for (const [cx, cy, cr] of [
      [94, 94, 5],
      [106, 106, 3.5],
      [104, 92, 2.5],
    ]) {
      ctx.beginPath()
      ctx.arc(cx, cy, cr, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  scene.add
    .image(layout.viewW * 0.76, Math.max(95, skyBottom * 0.24), key)
    .setScale(1 / RENDER_SCALE)
    .setScrollFactor(0.02, 0)
    .setDepth(-98)
}

export interface CloudLook {
  light: string
  shade: string
  alpha: number
  /** clouds per 400 units of sky height */
  density: number
}

/** Soft cumulus built from many overlapping radial puffs, shaded on the underside. */
export function buildClouds(
  scene: Phaser.Scene,
  name: string,
  worldWidth: number,
  look: CloudLook,
  seed = 3,
  horizonWorldY = 400,
) {
  const variants = 4
  const keys: string[] = []
  for (let v = 0; v < variants; v++) {
    const w = 300
    const h = 120
    keys.push(
      paintTexture(scene, `${name}-cloud-${v}`, w, h, (ctx) => {
        const r = rng(seed * 31 + v)
        const puffs: [number, number, number][] = []
        const n = 9 + Math.floor(r() * 6)
        for (let i = 0; i < n; i++) {
          const px = range(r, 50, w - 50)
          const spread = 1 - Math.abs(px - w / 2) / (w / 2)
          puffs.push([px, h - 34 - range(r, 0, 46) * spread, range(r, 18, 34) + 14 * spread])
        }
        for (const [px, py, pr] of puffs) softGlow(ctx, px, py, pr * 1.25, rgba(look.light, 0.95), rgba(look.light, 0))
        // underside shading
        ctx.globalCompositeOperation = 'source-atop'
        vGradient(ctx, 0, 0, w, h, [
          [0, rgba(look.shade, 0)],
          [0.55, rgba(look.shade, 0)],
          [1, rgba(look.shade, 0.55)],
        ])
        ctx.globalCompositeOperation = 'source-over'
      }),
    )
  }

  const skyBottom = worldToScreenY(horizonWorldY)
  const r = rng(seed)
  const span = layout.viewW + worldWidth * 0.06
  const count = Math.round(look.density * (skyBottom / 400) * (layout.viewW / 960 + 0.5) * 0.9)
  for (let i = 0; i < count; i++) {
    const cloud = scene.add
      .image(range(r, -80, span), range(r, 40, Math.max(120, skyBottom - 210)), keys[i % variants])
      .setScale(range(r, 0.55, 1.05) / RENDER_SCALE)
      .setAlpha(look.alpha * range(r, 0.75, 1))
      .setScrollFactor(0.06, 0)
      .setDepth(-97)
    scene.tweens.add({
      targets: cloud,
      x: cloud.x + range(r, 40, 90),
      duration: range(r, 40000, 70000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }
}

/** Diagonal god-rays from the sun side, pinned to the screen and slowly breathing. */
export function buildSunRays(scene: Phaser.Scene, name: string, color: string, fromFx: number) {
  const { viewW, viewH } = layout
  const fromX = viewW * fromFx
  const key = paintTexture(scene, layoutKey(`${name}-rays`), viewW, viewH, (ctx) => {
    const r = rng(11)
    for (let i = 0; i < 5; i++) {
      const topX = fromX + range(r, -160, 120) * (viewW / 960)
      const spread = range(r, 40, 110)
      const tilt = fromX > viewW / 2 ? -1 : 1
      const g = ctx.createLinearGradient(topX, 0, topX + tilt * 260, viewH)
      g.addColorStop(0, rgba(color, range(r, 0.16, 0.26)))
      g.addColorStop(1, rgba(color, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(topX, -10)
      ctx.lineTo(topX + spread, -10)
      ctx.lineTo(topX + spread + tilt * 380, viewH)
      ctx.lineTo(topX + tilt * 300, viewH)
      ctx.closePath()
      ctx.fill()
    }
  })
  const rays = scene.add
    .image(0, 0, key)
    .setOrigin(0, 0)
    .setScale(1 / RENDER_SCALE)
    .setScrollFactor(0)
    .setDepth(800)
    .setBlendMode(Phaser.BlendModes.SCREEN)
    .setAlpha(0.7)
  scene.tweens.add({ targets: rays, alpha: 1, duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
}

/** Slowly drifting motes of dust / pollen catching the light. */
export function buildDust(scene: Phaser.Scene, color: number, count: number, worldWidth: number) {
  const r = rng(19)
  const top = layout.camY + layout.viewH * 0.18
  for (let i = 0; i < count; i++) {
    const mote = scene.add
      .circle(range(r, 0, worldWidth), range(r, top, layout.worldBottom - 20), range(r, 0.8, 2), color, range(r, 0.25, 0.6))
      .setScrollFactor(0.9, 1)
      .setDepth(700)
      .setBlendMode(Phaser.BlendModes.SCREEN)
    scene.tweens.add({
      targets: mote,
      x: mote.x + range(r, -60, 60),
      y: mote.y - range(r, 30, 90),
      alpha: 0,
      duration: range(r, 6000, 11000),
      repeat: -1,
      delay: range(r, 0, 6000),
      ease: 'Sine.easeInOut',
    })
  }
}

export function buildVignette(scene: Phaser.Scene, name: string, edge: string, strength: number) {
  const { viewW, viewH } = layout
  const key = paintTexture(scene, layoutKey(`${name}-vignette`), viewW, viewH, (ctx) => {
    const cy = viewH * 0.45
    const g = ctx.createRadialGradient(viewW / 2, cy, Math.min(viewW, viewH) * 0.3, viewW / 2, cy, Math.max(viewW, viewH) * 0.7)
    g.addColorStop(0, rgba(edge, 0))
    g.addColorStop(1, rgba(edge, strength))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, viewW, viewH)
  })
  scene.add.image(0, 0, key).setOrigin(0, 0).setScale(1 / RENDER_SCALE).setScrollFactor(0).setDepth(900)
}
