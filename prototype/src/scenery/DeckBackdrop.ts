import Phaser from 'phaser'
import { layout, STAGE_H, worldToScreenY } from '../render/layout'
import { mix, paintLayer, range, rgba, rng, softGlow, vGradient, type Ctx } from './paint/canvas'
import { buildClouds, buildDust, buildSky, buildSunRays, buildVignette } from './paint/atmosphere'
import { addGulls, addMist, HORIZON, setHarborGeo } from './HarborBackdrop'

const RAIL_Y = 384 // top rail of the ship's bulwark
const DECK_Y = 398 // where the planks start

/**
 * The arrival deck (script p.2, "배 위. 붐비는 승객들"): morning over Osaka bay with the port
 * skyline ahead, a deck thick with hopeful passengers, and a weathered plank floor to stand on.
 */
export function buildDeckBackdrop(scene: Phaser.Scene) {
  const name = 'deck'
  const w = layout.viewW
  setHarborGeo(w)

  buildSky(
    scene,
    name,
    w,
    {
      stops: [
        [0, '#7aa6d6'],
        [0.4, '#c6cfe0'],
        [0.64, '#f6d9b4'],
        [1, '#fbc58c'],
      ],
      sun: { fx: 0.72, y: worldToScreenY(250), radius: 38, core: '#fffaf0', glow: '#ffd29a' },
    },
    HORIZON,
  )
  buildClouds(scene, name, w, { light: '#fffaf1', shade: '#dba58f', alpha: 0.93, density: 5.5 }, 9, HORIZON)

  paintLayer(scene, `${name}-port`, w, STAGE_H, (ctx) => paintPortSkyline(ctx, w), { scrollFactor: 1, depth: -92 })
  paintLayer(scene, `${name}-sea`, w, STAGE_H, (ctx) => paintBaySea(ctx, w), { scrollFactor: 1, depth: -88 })
  paintLayer(scene, `${name}-crowd`, w, STAGE_H, (ctx) => paintCrowd(ctx, w), { scrollFactor: 1, depth: -40 })
  paintLayer(scene, `${name}-deck`, w, layout.worldBottom, (ctx) => paintDeck(ctx, w), { scrollFactor: 1, depth: -10 })
  addGulls(scene)
  addMist(scene)

  buildSunRays(scene, name, '#ffe6bf', 0.74)
  buildDust(scene, 0xfff0d8, 16, w)
  buildVignette(scene, name, '#2f1d10', 0.3)
}

function paintPortSkyline(ctx: Ctx, w: number) {
  const base = HORIZON + 2
  const r = rng(404)
  // the far shore: low warehouses, gantry cranes, smoking chimneys — Osaka as the first thing they see
  ctx.beginPath()
  ctx.moveTo(0, base)
  for (let x = 0; x <= w; x += 8) {
    ctx.lineTo(x, base - 10 - 14 * Math.sin(x / 150 + 1) - 6 * Math.sin(x / 47))
  }
  ctx.lineTo(w, base)
  ctx.closePath()
  const hill = ctx.createLinearGradient(0, base - 40, 0, base)
  hill.addColorStop(0, '#9b9fb6')
  hill.addColorStop(1, '#e4c9b6')
  ctx.fillStyle = hill
  ctx.fill()

  for (let x = w * 0.04; x < w * 0.96; ) {
    const bw = range(r, 18, 46)
    const bh = range(r, 12, 34)
    ctx.fillStyle = mix('#8e90a7', '#d4b8a6', range(r, 0, 0.5))
    ctx.fillRect(x, base - bh, bw, bh)
    ctx.fillStyle = rgba('#6e7088', 0.8)
    ctx.beginPath()
    ctx.moveTo(x - 2, base - bh)
    ctx.lineTo(x + bw / 2, base - bh - 7)
    ctx.lineTo(x + bw + 2, base - bh)
    ctx.closePath()
    ctx.fill()
    x += bw + range(r, 3, 14)
  }

  // gantry cranes
  for (const cx of [w * 0.2, w * 0.58, w * 0.83]) {
    ctx.strokeStyle = '#6f7189'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(cx - 10, base)
    ctx.lineTo(cx - 6, base - 46)
    ctx.moveTo(cx + 10, base)
    ctx.lineTo(cx + 6, base - 46)
    ctx.moveTo(cx - 22, base - 46)
    ctx.lineTo(cx + 34, base - 52)
    ctx.moveTo(cx - 8, base - 22)
    ctx.lineTo(cx + 8, base - 38)
    ctx.stroke()
  }
  // factory chimneys with thin smoke
  for (const cx of [w * 0.12, w * 0.46, w * 0.7]) {
    ctx.fillStyle = '#7b7d93'
    ctx.fillRect(cx, base - 56, 5, 56)
    softGlow(ctx, cx + 3, base - 66, 14, 'rgba(236,230,226,0.55)', 'rgba(236,230,226,0)')
    softGlow(ctx, cx + 14, base - 82, 20, 'rgba(236,230,226,0.35)', 'rgba(236,230,226,0)')
  }
  // a lighthouse
  const lx = w * 0.34
  ctx.fillStyle = '#e8dcd0'
  ctx.beginPath()
  ctx.moveTo(lx - 4, base)
  ctx.lineTo(lx - 2.5, base - 38)
  ctx.lineTo(lx + 2.5, base - 38)
  ctx.lineTo(lx + 4, base)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#c4453a'
  ctx.fillRect(lx - 3.2, base - 24, 6.4, 4)
  ctx.fillRect(lx - 3.4, base - 42, 6.8, 5)
}

function paintBaySea(ctx: Ctx, w: number) {
  vGradient(ctx, 0, HORIZON, w, RAIL_Y - HORIZON + 8, [
    [0, '#cbc9d2'],
    [0.3, '#a5b6c8'],
    [1, '#5f84a0'],
  ])
  const r = rng(405)
  for (let y = HORIZON + 3; y < RAIL_Y; y += 2 + (y - HORIZON) * 0.07) {
    const depth = (y - HORIZON) / (RAIL_Y - HORIZON)
    for (let x = range(r, -30, 0); x < w; x += range(r, 28, 66) * (0.5 + depth)) {
      ctx.fillStyle = rgba(r() < 0.5 ? '#ffffff' : '#2c4c69', range(r, 0.06, 0.2))
      ctx.fillRect(x, y, range(r, 8, 22) * (0.5 + depth * 1.3), 0.8 + depth * 1.2)
    }
  }
  // the sun's glitter path under the sun
  const sx = w * 0.72
  for (let y = HORIZON + 2; y < RAIL_Y; y += 2) {
    const depth = (y - HORIZON) / (RAIL_Y - HORIZON)
    const spread = 14 + depth * 70
    for (let i = 0; i < 3 + depth * 5; i++) {
      const x = sx + range(r, -spread, spread) * (0.4 + r() * 0.6)
      ctx.fillStyle = rgba('#fff2d6', range(r, 0.35, 0.85) * (1 - Math.abs(x - sx) / (spread * 1.4)))
      ctx.fillRect(x, y, range(r, 3, 11) * (0.6 + depth), 1)
    }
  }
}

/** Passengers pressed against the rail, seen as warm silhouettes in layered rows, some waving. */
function paintCrowd(ctx: Ctx, w: number) {
  const r = rng(406)
  const coats = ['#5c4a42', '#3f4658', '#6b5a48', '#4a3f3a', '#6a4f58', '#4f5a4a', '#7a6a58', '#364055']
  const hats = ['#2e2a28', '#4a4038', '#5a4a3a', '#d9cfba']
  for (let row = 0; row < 3; row++) {
    const baseY = RAIL_Y + 18 + row * 9
    const scale = 0.82 + row * 0.12
    const dim = 0.42 - row * 0.12
    for (let x = range(r, -10, 10); x < w + 10; x += range(r, 20, 34) * scale) {
      const hy = baseY - 46 * scale
      const coat = mix(coats[Math.floor(r() * coats.length)], '#2a1f1a', dim)
      // shoulders / body
      ctx.fillStyle = coat
      ctx.beginPath()
      ctx.ellipse(x, baseY - 14 * scale, 13 * scale, 24 * scale, 0, Math.PI, 0)
      ctx.rect(x - 13 * scale, baseY - 14 * scale, 26 * scale, 16 * scale)
      ctx.fill()
      // head
      ctx.fillStyle = mix('#e3b992', '#3a2a22', dim + 0.1)
      ctx.beginPath()
      ctx.arc(x, hy, 6.2 * scale, 0, Math.PI * 2)
      ctx.fill()
      // hair / hat
      if (r() < 0.55) {
        ctx.fillStyle = mix(hats[Math.floor(r() * hats.length)], '#1a1210', dim)
        ctx.beginPath()
        ctx.ellipse(x, hy - 2 * scale, 8 * scale, 4.4 * scale, 0, Math.PI, 0)
        ctx.fill()
        ctx.fillRect(x - 9 * scale, hy - 2.4 * scale, 18 * scale, 1.8 * scale)
      } else {
        ctx.fillStyle = mix('#2a211c', '#0e0a08', dim)
        ctx.beginPath()
        ctx.arc(x, hy - 1.4 * scale, 6.4 * scale, Math.PI, 0)
        ctx.fill()
      }
      // someone waves a handkerchief
      if (row < 2 && r() < 0.16) {
        ctx.strokeStyle = coat
        ctx.lineWidth = 3 * scale
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x + 9 * scale, baseY - 26 * scale)
        ctx.lineTo(x + 15 * scale, hy - 10 * scale)
        ctx.stroke()
        ctx.fillStyle = '#fdf6e6'
        ctx.fillRect(x + 12 * scale, hy - 20 * scale, 9 * scale, 7 * scale)
      }
    }
  }
}

function paintDeck(ctx: Ctx, w: number) {
  const bottom = layout.worldBottom

  // the bulwark: a painted steel rail and top rail
  vGradient(ctx, 0, RAIL_Y, w, DECK_Y - RAIL_Y + 2, [
    [0, '#3d4658'],
    [1, '#232a37'],
  ])
  ctx.fillStyle = '#8e7a5e'
  ctx.fillRect(0, RAIL_Y - 5, w, 6)
  ctx.fillStyle = rgba('#fff0d4', 0.4)
  ctx.fillRect(0, RAIL_Y - 5, w, 1.4)
  ctx.fillStyle = '#1b2029'
  for (let x = 20; x < w; x += 54) ctx.fillRect(x, RAIL_Y - 5, 4, DECK_Y - RAIL_Y + 6)
  // a lifebuoy
  const bx = w * 0.14
  ctx.lineWidth = 7
  ctx.strokeStyle = '#f2ece0'
  ctx.beginPath()
  ctx.arc(bx, RAIL_Y + 9, 15, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = '#c4453a'
  for (let a = 0; a < 4; a++) {
    ctx.beginPath()
    ctx.arc(bx, RAIL_Y + 9, 15, a * Math.PI / 2 + 0.3, a * Math.PI / 2 + 0.9)
    ctx.stroke()
  }

  // weathered planks, seams fanning out toward the viewer
  vGradient(ctx, 0, DECK_Y, w, bottom - DECK_Y, [
    [0, '#8a6a4c'],
    [1, '#5d4531'],
  ])
  const r = rng(407)
  for (let y = DECK_Y + 2; y < bottom; y += 7 + ((y - DECK_Y) / (bottom - DECK_Y)) * 14) {
    ctx.fillStyle = rgba('#241811', 0.5)
    ctx.fillRect(0, y, w, 1.3)
    ctx.fillStyle = rgba('#ffe3bd', 0.1)
    ctx.fillRect(0, y + 1.3, w, 0.9)
    for (let x = range(r, 0, 90); x < w; x += range(r, 110, 240)) {
      ctx.fillStyle = rgba('#241811', 0.4)
      ctx.fillRect(x, y, 1, 8 + ((y - DECK_Y) / (bottom - DECK_Y)) * 12)
    }
  }
  for (let i = 0; i < 280; i++) {
    ctx.fillStyle = rgba(r() < 0.5 ? '#2a1c12' : '#d6b896', range(r, 0.05, 0.12))
    ctx.fillRect(range(r, 0, w), range(r, DECK_Y + 4, bottom), range(r, 12, 44), 0.8)
  }

  // deck furniture: rope coil, a ventilator cowl, a crate with luggage
  const coilX = w * 0.9
  ctx.strokeStyle = '#b8955f'
  ctx.lineWidth = 3
  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.ellipse(coilX, DECK_Y + 24, 24 - i * 4, 7 - i * 1.1, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  const vx = w * 0.05
  ctx.fillStyle = '#2f3644'
  ctx.fillRect(vx, DECK_Y - 34, 12, 38)
  ctx.beginPath()
  ctx.ellipse(vx + 6, DECK_Y - 34, 20, 11, -0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1a1f29'
  ctx.beginPath()
  ctx.ellipse(vx - 6, DECK_Y - 38, 8, 7, -0.4, 0, Math.PI * 2)
  ctx.fill()
  for (const [lx, ly, lw, lh, col] of [
    [w * 0.43, DECK_Y + 6, 46, 26, '#a07e56'],
    [w * 0.43 + 34, DECK_Y - 10, 38, 22, '#7d6446'],
    [w * 0.43 - 16, DECK_Y - 4, 24, 20, '#b69a74'],
  ] as const) {
    ctx.fillStyle = col
    ctx.fillRect(lx, ly, lw, lh)
    ctx.strokeStyle = '#4b3926'
    ctx.lineWidth = 1.4
    ctx.strokeRect(lx, ly, lw, lh)
    ctx.beginPath()
    ctx.moveTo(lx, ly + lh / 2)
    ctx.lineTo(lx + lw, ly + lh / 2)
    ctx.stroke()
  }

  // morning light pooling on the planks
  ctx.save()
  ctx.translate(w * 0.72, DECK_Y + 30)
  ctx.scale(1, 0.28)
  softGlow(ctx, 0, 0, 340, 'rgba(255,224,170,0.28)', 'rgba(255,224,170,0)')
  ctx.restore()
}
