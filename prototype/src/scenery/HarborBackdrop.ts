import Phaser from 'phaser'
import { layout, RENDER_SCALE, STAGE_H, worldToScreenY } from '../render/layout'
import { mix, paintLayer, paintTexture, range, rgba, rng, softGlow, vGradient, type Ctx } from './paint/canvas'
import { buildClouds, buildDust, buildSky, buildSunRays, buildVignette } from './paint/atmosphere'

const HORIZON = 300
const PIER_Y = 392

const SUN_Y = 236

/** x-anchors that depend on view width, so the composition holds from a 480 portrait to a 1170 wide view */
const G = { W: 960, sunX: 230, shipX0: 470, shipX1: 1010, craneX: 88 }
function setGeo(W: number) {
  G.W = W
  G.sunX = W * 0.24
  G.shipX1 = W + 40 // the ship runs off the right edge
  G.shipX0 = G.shipX1 - 540
  G.craneX = Math.max(60, W * 0.092)
}

/**
 * Ch.5 harbour at morning ("아침. 항구" in the script). A single-screen set, so every
 * layer is exactly one view wide and nothing needs to scroll.
 */
export function buildHarborBackdrop(scene: Phaser.Scene) {
  const name = 'harbor-morning'
  const w = layout.viewW
  setGeo(w)

  buildSky(
    scene,
    name,
    w,
    {
      stops: [
        [0, '#7ea5cf'],
        [0.38, '#c9c6d2'],
        [0.62, '#f3cfae'],
        [1, '#f7b47e'],
      ],
      sun: { fx: 0.24, y: worldToScreenY(SUN_Y), radius: 40, core: '#fff7e4', glow: '#ffc98a' },
    },
    HORIZON,
  )
  buildClouds(scene, name, w, { light: '#fff3e6', shade: '#d4968a', alpha: 0.92, density: 5.2 }, 5, HORIZON)

  // a single-screen set: the camera never scrolls sideways, so these are plain world layers
  paintLayer(scene, `${name}-far`, w, STAGE_H, (ctx) => paintFarShore(ctx, w), { scrollFactor: 1, depth: -92 })
  paintLayer(scene, `${name}-sea`, w, STAGE_H, (ctx) => paintSea(ctx, w), { scrollFactor: 1, depth: -88 })
  addSeaGlints(scene)
  paintLayer(scene, `${name}-ship`, w, STAGE_H, (ctx) => paintShipAndCranes(ctx), { scrollFactor: 1, depth: -70 })
  addFunnelSmoke(scene)
  // runs from the top of the stage to the bottom of the view; props (crates, bollards) rise above the deck line
  paintLayer(scene, `${name}-pier`, w, layout.worldBottom, (ctx) => paintPier(ctx, w), { scrollFactor: 1, depth: -10 })
  addGulls(scene)
  addMist(scene)

  buildSunRays(scene, name, '#ffe2b8', 0.13)
  buildDust(scene, 0xffe8c8, 18, w)
  buildVignette(scene, name, '#3a2010', 0.3)
}

function paintFarShore(ctx: Ctx, w: number) {
  // distant headland and hills across the bay
  ctx.beginPath()
  ctx.moveTo(0, HORIZON + 2)
  for (let x = 0; x <= w; x += 6) {
    const y = HORIZON - 18 - 22 * Math.sin(x / 180 + 0.7) - 10 * Math.sin(x / 61 + 2) - (x > w * 0.62 ? (x - w * 0.62) * 0.06 : 0)
    ctx.lineTo(x, Math.min(HORIZON, y))
  }
  ctx.lineTo(w, HORIZON + 2)
  ctx.closePath()
  const g = ctx.createLinearGradient(0, HORIZON - 70, 0, HORIZON)
  g.addColorStop(0, '#a99ab4')
  g.addColorStop(1, '#efcdb1')
  ctx.fillStyle = g
  ctx.fill()

  // tiny ships on the horizon
  for (const [sx, s] of [
    [w * 0.56, 1],
    [w * 0.73, 0.7],
  ] as const) {
    ctx.fillStyle = rgba('#7b7d92', 0.8)
    ctx.beginPath()
    ctx.moveTo(sx - 18 * s, HORIZON - 1)
    ctx.lineTo(sx + 18 * s, HORIZON - 1)
    ctx.lineTo(sx + 14 * s, HORIZON - 6 * s)
    ctx.lineTo(sx - 16 * s, HORIZON - 6 * s)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(sx - 3 * s, HORIZON - 12 * s, 5 * s, 6 * s)
  }
}

function paintSea(ctx: Ctx, w: number) {
  vGradient(ctx, 0, HORIZON, w, PIER_Y - HORIZON + 4, [
    [0, '#c8c4cb'],
    [0.25, '#a7b4c3'],
    [1, '#5e819d'],
  ])
  const r = rng(77)
  // wave strokes, longer and further apart toward the viewer
  for (let y = HORIZON + 3; y < PIER_Y; y += 2 + (y - HORIZON) * 0.06) {
    const depth = (y - HORIZON) / (PIER_Y - HORIZON)
    for (let x = range(r, -40, 0); x < w; x += range(r, 30, 70) * (0.5 + depth)) {
      const len = range(r, 8, 22) * (0.5 + depth * 1.3)
      ctx.fillStyle = rgba(r() < 0.5 ? '#ffffff' : '#2c4c69', range(r, 0.06, 0.18))
      ctx.fillRect(x, y, len, 0.8 + depth * 1.2)
    }
  }
  // the sun's glitter path
  for (let y = HORIZON + 2; y < PIER_Y; y += 2) {
    const depth = (y - HORIZON) / (PIER_Y - HORIZON)
    const spread = 18 + depth * 120
    for (let i = 0; i < 3 + depth * 6; i++) {
      const x = G.sunX + range(r, -spread, spread) * (0.4 + r() * 0.6)
      ctx.fillStyle = rgba('#fff2d6', range(r, 0.35, 0.85) * (1 - Math.abs(x - G.sunX) / (spread * 1.4)))
      ctx.fillRect(x, y, range(r, 3, 12) * (0.6 + depth), 1)
    }
  }
  softGlow(ctx, G.sunX, HORIZON + 6, 140, 'rgba(255,214,160,0.35)', 'rgba(255,214,160,0)')
}

function addSeaGlints(scene: Phaser.Scene) {
  const r = rng(91)
  for (let i = 0; i < 34; i++) {
    const nearSun = r() < 0.7
    const y = range(r, HORIZON + 4, PIER_Y - 8)
    const depth = (y - HORIZON) / (PIER_Y - HORIZON)
    const x = nearSun ? G.sunX + range(r, -1, 1) * (20 + depth * 120) : range(r, 0, G.W)
    const glint = scene.add
      .rectangle(x, y, range(r, 3, 9) * (0.6 + depth), 1.2, 0xfff6e0, 0)
      .setDepth(-86)
      .setBlendMode(Phaser.BlendModes.SCREEN)
    scene.tweens.add({
      targets: glint,
      alpha: range(r, 0.6, 1),
      duration: range(r, 400, 900),
      yoyo: true,
      repeat: -1,
      delay: range(r, 0, 2400),
      repeatDelay: range(r, 300, 1800),
    })
  }
}

function paintShipAndCranes(ctx: Ctx) {
  // lattice crane on the left quay
  const cx = G.craneX
  ctx.strokeStyle = '#5a4c48'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx - 20, PIER_Y)
  ctx.lineTo(cx - 6, 150)
  ctx.lineTo(cx + 6, 150)
  ctx.lineTo(cx + 20, PIER_Y)
  ctx.stroke()
  ctx.lineWidth = 1
  for (let y = PIER_Y - 16; y > 156; y -= 16) {
    const t = (PIER_Y - y) / (PIER_Y - 150)
    const half = 20 - 14 * t
    ctx.beginPath()
    ctx.moveTo(cx - half, y)
    ctx.lineTo(cx + half, y - 16)
    ctx.moveTo(cx + half, y)
    ctx.lineTo(cx - half, y - 16)
    ctx.stroke()
  }
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(cx - 30, 156)
  ctx.lineTo(cx + 150, 128)
  ctx.stroke()
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(cx + 140, 130)
  ctx.lineTo(cx + 140, 250)
  ctx.stroke()
  ctx.fillStyle = '#5a4c48'
  ctx.fillRect(cx + 134, 250, 12, 9)

  // troop transport moored along the pier
  const x0 = G.shipX0
  const x1 = G.shipX1
  const deck = 286
  const waterline = PIER_Y - 6
  // masts + rigging
  ctx.strokeStyle = '#3d3a40'
  ctx.lineWidth = 2
  for (const mx of [x0 + 70, x1 - 90]) {
    ctx.beginPath()
    ctx.moveTo(mx, deck)
    ctx.lineTo(mx, 150)
    ctx.stroke()
  }
  ctx.lineWidth = 0.7
  ctx.beginPath()
  ctx.moveTo(x0 + 10, deck - 4)
  ctx.lineTo(x0 + 70, 152)
  ctx.lineTo(x1 - 90, 152)
  ctx.lineTo(x1 - 20, deck - 4)
  ctx.stroke()
  // signal flags on the stay
  const flagColors = ['#c8463a', '#f2e6c8', '#2f5d8a', '#e2b83c']
  for (let i = 0; i < 14; i++) {
    const t = i / 13
    const fx = x0 + 70 + (x1 - 160 - x0) * t
    const fy = 154 + Math.sin(t * Math.PI) * 10
    ctx.fillStyle = flagColors[i % flagColors.length]
    ctx.beginPath()
    ctx.moveTo(fx, fy)
    ctx.lineTo(fx + 8, fy)
    ctx.lineTo(fx + 4, fy + 9)
    ctx.closePath()
    ctx.fill()
  }

  // hull
  const hull = ctx.createLinearGradient(0, deck, 0, waterline)
  hull.addColorStop(0, '#4a5262')
  hull.addColorStop(1, '#2b303b')
  ctx.fillStyle = hull
  ctx.beginPath()
  ctx.moveTo(x0, deck)
  ctx.lineTo(x1, deck)
  ctx.lineTo(x1, waterline)
  ctx.lineTo(x0 + 34, waterline)
  ctx.quadraticCurveTo(x0 + 6, waterline - 20, x0, deck)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#7d3a32'
  ctx.fillRect(x0 + 26, waterline - 9, x1 - x0 - 26, 9)
  ctx.fillStyle = rgba('#ffffff', 0.25)
  ctx.fillRect(x0 + 6, deck + 1, x1 - x0 - 6, 1.2)
  ctx.fillStyle = rgba('#dfe6ef', 0.85)
  for (let px = x0 + 50; px < x1 - 10; px += 16) {
    ctx.beginPath()
    ctx.arc(px, deck + 22, 2.2, 0, Math.PI * 2)
    ctx.fill()
  }

  // superstructure
  const sx0 = x0 + 150
  const sx1 = x0 + 360
  for (const [top, inset, color] of [
    [244, 0, '#e8e1d3'],
    [214, 30, '#efe9dc'],
  ] as const) {
    ctx.fillStyle = color
    ctx.fillRect(sx0 + inset, top, sx1 - sx0 - inset * 2, deck - top)
    ctx.fillStyle = rgba('#7a6f60', 0.45)
    ctx.fillRect(sx0 + inset, top, sx1 - sx0 - inset * 2, 2)
    ctx.fillStyle = '#2f3846'
    for (let wx = sx0 + inset + 8; wx < sx1 - inset - 10; wx += 12) ctx.fillRect(wx, top + 8, 6, 5)
  }
  ctx.fillStyle = rgba('#5c4f40', 0.2)
  ctx.fillRect(sx1 - 50, 214, 50, deck - 214)

  // funnel
  const fx = x0 + 255
  ctx.fillStyle = '#2f3440'
  ctx.beginPath()
  ctx.moveTo(fx - 18, 214)
  ctx.lineTo(fx - 14, 160)
  ctx.lineTo(fx + 16, 160)
  ctx.lineTo(fx + 18, 214)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#c9a23a'
  ctx.fillRect(fx - 16, 172, 33, 7)
  ctx.fillStyle = '#1b1e25'
  ctx.fillRect(fx - 14, 157, 30, 5)

  // morning light rim along the sun-facing (left) edges
  ctx.fillStyle = rgba('#ffd9a8', 0.4)
  ctx.fillRect(sx0, 244, 2, deck - 244)
  ctx.fillRect(fx - 18, 162, 2, 52)
}

function addFunnelSmoke(scene: Phaser.Scene) {
  const key = paintTexture(scene, 'smoke-puff', 80, 80, (ctx) => {
    softGlow(ctx, 40, 40, 40, 'rgba(236,230,226,0.7)', 'rgba(236,230,226,0)')
    softGlow(ctx, 30, 34, 20, 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)')
  })
  const fx = G.shipX0 + 255
  scene.time.addEvent({
    delay: 520,
    loop: true,
    callback: () => {
      const puff = scene.add
        .image(fx + range(Math.random, -4, 4), 156, key)
        .setScale(0.28 / RENDER_SCALE)
        .setAlpha(0.85)
        .setDepth(-71)
      scene.tweens.add({
        targets: puff,
        x: puff.x + range(Math.random, 60, 110),
        y: puff.y - range(Math.random, 70, 110),
        scale: range(Math.random, 1.1, 1.6) / RENDER_SCALE,
        alpha: 0,
        duration: range(Math.random, 4200, 5600),
        ease: 'Sine.easeOut',
        onComplete: () => puff.destroy(),
      })
    },
  })
}

function paintPier(ctx: Ctx, w: number) {
  const h = layout.worldBottom - PIER_Y + 6
  ctx.translate(0, PIER_Y - 6) // local y=0 is the pier's water edge
  // timber edge beam facing the water
  ctx.fillStyle = '#4b3a2c'
  ctx.fillRect(0, 0, w, 8)
  ctx.fillStyle = rgba('#ffd9a8', 0.35)
  ctx.fillRect(0, 0, w, 1.2)

  vGradient(ctx, 0, 8, w, h - 8, [
    [0, '#9d8064'],
    [1, '#6f5640'],
  ])
  const r = rng(55)
  // planks run toward the viewer, so seams get wider apart further down
  for (let y = 12; y < h; y += 6 + (y / h) * 12) {
    ctx.fillStyle = rgba('#2c2016', 0.45)
    ctx.fillRect(0, y, w, 1.2)
    ctx.fillStyle = rgba('#ffe7c4', 0.12)
    ctx.fillRect(0, y + 1.2, w, 0.8)
    for (let x = range(r, 0, 80); x < w; x += range(r, 90, 200)) {
      ctx.fillStyle = rgba('#2c2016', 0.4)
      ctx.fillRect(x, y, 1, 6 + (y / h) * 12)
    }
  }
  // grain
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = rgba(r() < 0.5 ? '#3a2a1c' : '#d2b48e', range(r, 0.05, 0.12))
    ctx.fillRect(range(r, 0, w), range(r, 10, h), range(r, 10, 40), 0.7)
  }
  // warm morning light pooling from the left
  ctx.save()
  ctx.translate(G.sunX, 30)
  ctx.scale(1, 0.3)
  softGlow(ctx, 0, 0, 380, 'rgba(255,214,160,0.28)', 'rgba(255,214,160,0)')
  ctx.restore()

  // mooring bollards
  for (const bx of [G.W * 0.16, G.W * 0.45]) {
    ctx.fillStyle = '#2a2a2e'
    ctx.beginPath()
    ctx.roundRect(bx - 8, -2, 16, 18, 3)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(bx, -2, 11, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = rgba('#ffd9a8', 0.5)
    ctx.fillRect(bx - 7, -1, 2, 15)
  }
  // coiled rope by the first bollard
  ctx.strokeStyle = '#b8955f'
  ctx.lineWidth = 2
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.ellipse(G.W * 0.16 + 46, 18, 16 - i * 3.5, 5 - i * 1, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  // stacked cargo crates at the right edge
  for (const [cx, cy, cw, ch] of [
    [G.W - 98, -18, 52, 30],
    [G.W - 46, -18, 46, 30],
    [G.W - 76, -46, 50, 28],
  ] as const) {
    ctx.fillStyle = mix('#a77f52', '#000000', cy < -30 ? 0.05 : 0.12)
    ctx.fillRect(cx, cy + 20, cw, ch)
    ctx.strokeStyle = '#5b4229'
    ctx.lineWidth = 1.5
    ctx.strokeRect(cx, cy + 20, cw, ch)
    ctx.beginPath()
    ctx.moveTo(cx, cy + 20)
    ctx.lineTo(cx + cw, cy + 20 + ch)
    ctx.stroke()
  }
}

function addGulls(scene: Phaser.Scene) {
  const key = paintTexture(scene, 'gull', 40, 16, (ctx) => {
    ctx.strokeStyle = '#fbf6ee'
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(3, 11)
    ctx.quadraticCurveTo(11, 2, 20, 9)
    ctx.quadraticCurveTo(29, 2, 37, 11)
    ctx.stroke()
    ctx.strokeStyle = rgba('#5b5f70', 0.6)
    ctx.lineWidth = 1
    ctx.stroke()
  })
  const r = rng(13)
  for (let i = 0; i < 4; i++) {
    const gull = scene.add
      .image(range(r, -100, G.W * 0.3), range(r, layout.camY + 60, 200), key)
      .setScale(range(r, 0.45, 0.75) / RENDER_SCALE)
      .setDepth(-80)
    const flap = () =>
      scene.tweens.add({ targets: gull, scaleY: gull.scaleX * 0.45, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    flap()
    scene.tweens.add({
      targets: gull,
      x: G.W + 120,
      y: gull.y + range(r, -40, 30),
      duration: range(r, 16000, 26000),
      repeat: -1,
      delay: range(r, 0, 8000),
    })
  }
}

function addMist(scene: Phaser.Scene) {
  const key = paintTexture(scene, 'harbor-mist', 600, 60, (ctx) => {
    ctx.save()
    ctx.translate(300, 30)
    ctx.scale(1, 0.1)
    softGlow(ctx, 0, 0, 300, 'rgba(255,236,220,0.6)', 'rgba(255,236,220,0)')
    ctx.restore()
  })
  const r = rng(21)
  for (let i = 0; i < 4; i++) {
    const mist = scene.add
      .image(range(r, 0, G.W), range(r, HORIZON + 6, PIER_Y - 30), key)
      .setScale(range(r, 0.8, 1.3) / RENDER_SCALE)
      .setAlpha(range(r, 0.35, 0.6))
      .setDepth(-84)
    scene.tweens.add({
      targets: mist,
      x: mist.x + range(r, -120, 120),
      duration: range(r, 14000, 22000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }
}
