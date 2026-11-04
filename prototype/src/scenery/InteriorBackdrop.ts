import Phaser from 'phaser'
import { layout } from '../render/layout'
import { mix, paintLayer, range, rgba, rng, softGlow, vGradient, type Ctx } from './paint/canvas'
import { buildDust, buildVignette } from './paint/atmosphere'

export type InteriorTime = 'day' | 'night'

const FLOOR_Y = 392 // where the wall meets the tatami
const FLOOR_BOTTOM_PAD = 0

interface Look {
  wall: [string, string]
  beam: string
  beamDark: string
  floor: [string, string]
  mat: string
  matEdge: string
  window: string
  windowGlow: string
  lamp: boolean
  shade: string
  vignette: [string, number]
}

const LOOKS: Record<InteriorTime, Look> = {
  day: {
    wall: ['#c9ad86', '#a98a64'],
    beam: '#6a4a33',
    beamDark: '#3e2a1c',
    floor: ['#c8b27c', '#a3905c'],
    mat: '#bfae78',
    matEdge: '#3f3a32',
    window: '#fdf3d8',
    windowGlow: '#ffe6ad',
    lamp: false,
    shade: '#2b1d12',
    vignette: ['#2a1a0c', 0.34],
  },
  night: {
    wall: ['#4a392d', '#352920'],
    beam: '#2a1d14',
    beamDark: '#150e09',
    floor: ['#7d6d49', '#55482f'],
    mat: '#6f6140',
    matEdge: '#15120e',
    window: '#46567f',
    windowGlow: '#6c80b8',
    lamp: true,
    shade: '#07050a',
    vignette: ['#050308', 0.6],
  },
}

/**
 * A small wooden Korean-immigrant room in Osaka: plank walls, a paper window, tatami, a low table
 * and sacks of rice. By day the window throws warm light across the floor; at night a single bulb
 * (and the moon behind the paper) is all there is.
 */
export function buildInteriorBackdrop(scene: Phaser.Scene, time: InteriorTime) {
  const look = LOOKS[time]
  const w = layout.viewW
  const name = `interior-${time}`

  // wall + ceiling: from the top of the (possibly taller) view down to the floor line
  paintLayer(scene, `${name}-wall`, w, FLOOR_Y - layout.camY, (ctx) => paintWall(ctx, w, look), {
    y: layout.camY,
    scrollFactor: 1,
    depth: -90,
  })
  paintLayer(scene, `${name}-floor`, w, layout.worldBottom - FLOOR_Y + FLOOR_BOTTOM_PAD, (ctx) => paintFloor(ctx, w, look), {
    y: FLOOR_Y,
    scrollFactor: 1,
    depth: -60,
  })
  paintLayer(scene, `${name}-props`, w, 540 - layout.camY, (ctx) => paintProps(ctx, w, look), {
    y: layout.camY,
    scrollFactor: 1,
    depth: -30,
  })
  addLampSway(scene, w, look)

  buildDust(scene, time === 'day' ? 0xfff0cf : 0xffd9a0, time === 'day' ? 26 : 14, w)
  buildVignette(scene, name, look.vignette[0], look.vignette[1])
}

/** all painters below draw in world coordinates; shift so world y=0 is where the stage starts */
function toWorld(ctx: Ctx) {
  ctx.translate(0, -layout.camY)
}

function paintWall(ctx: Ctx, w: number, look: Look) {
  toWorld(ctx)
  const top = layout.camY
  vGradient(ctx, 0, top, w, FLOOR_Y - top + 2, [
    [0, look.wall[1]],
    [1, look.wall[0]],
  ])
  const r = rng(11)
  // vertical planks
  for (let x = 0; x < w; x += 22) {
    ctx.fillStyle = rgba(look.beamDark, 0.16)
    ctx.fillRect(x, top, 1.6, FLOOR_Y - top)
    ctx.fillStyle = rgba('#fff0d0', look.lamp ? 0.015 : 0.05)
    ctx.fillRect(x + 1.6, top, 1, FLOOR_Y - top)
  }
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = rgba(r() < 0.5 ? look.beamDark : '#fff0d0', range(r, 0.03, 0.08))
    ctx.fillRect(range(r, 0, w), range(r, top, FLOOR_Y), 1, range(r, 6, 30))
  }

  // ceiling beams and a heavy lintel
  vGradient(ctx, 0, top, w, 78 - top, [
    [0, look.beamDark],
    [1, look.beam],
  ])
  ctx.fillStyle = look.beamDark
  ctx.fillRect(0, 70, w, 10)
  ctx.fillStyle = rgba('#ffe2b0', 0.18)
  ctx.fillRect(0, 80, w, 1.4)
  // posts
  for (const px of [w * 0.02, w * 0.5, w * 0.98]) {
    const grad = ctx.createLinearGradient(px - 9, 0, px + 9, 0)
    grad.addColorStop(0, look.beamDark)
    grad.addColorStop(0.55, look.beam)
    grad.addColorStop(1, mix(look.beam, '#000000', 0.25))
    ctx.fillStyle = grad
    ctx.fillRect(px - 9, 78, 18, FLOOR_Y - 78)
  }
  // base board
  ctx.fillStyle = look.beamDark
  ctx.fillRect(0, FLOOR_Y - 12, w, 12)
  ctx.fillStyle = rgba('#ffe2b0', 0.12)
  ctx.fillRect(0, FLOOR_Y - 12, w, 1.2)

  // paper window (shoji) with its light
  const wx = w * 0.7
  const wy = 112
  const ww = Math.min(190, w * 0.3)
  const wh = 150
  ctx.fillStyle = look.beamDark
  ctx.fillRect(wx - ww / 2 - 8, wy - 8, ww + 16, wh + 16)
  const pane = ctx.createLinearGradient(0, wy, 0, wy + wh)
  pane.addColorStop(0, look.window)
  pane.addColorStop(1, mix(look.window, look.windowGlow, 0.6))
  ctx.fillStyle = pane
  ctx.fillRect(wx - ww / 2, wy, ww, wh)
  ctx.strokeStyle = look.beamDark
  ctx.lineWidth = 3
  ctx.strokeRect(wx - ww / 2, wy, ww, wh)
  ctx.lineWidth = 2
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(wx - ww / 2 + (ww / 4) * i, wy)
    ctx.lineTo(wx - ww / 2 + (ww / 4) * i, wy + wh)
    ctx.stroke()
  }
  for (let i = 1; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(wx - ww / 2, wy + (wh / 3) * i)
    ctx.lineTo(wx + ww / 2, wy + (wh / 3) * i)
    ctx.stroke()
  }
  softGlow(ctx, wx, wy + wh / 2, ww * (look.lamp ? 1.1 : 1.8), rgba(look.windowGlow, look.lamp ? 0.2 : 0.42), rgba(look.windowGlow, 0))
}

function paintFloor(ctx: Ctx, w: number, look: Look) {
  const h = layout.worldBottom - FLOOR_Y
  // tatami: mats laid in a perspective grid, dark cloth borders between them
  vGradient(ctx, 0, 0, w, h, [
    [0, look.floor[1]],
    [1, look.floor[0]],
  ])
  const r = rng(13)
  const rows = [0, 26, 62, 112, 180, 270]
  for (let i = 0; i < rows.length - 1; i++) {
    const y0 = rows[i]
    const y1 = Math.min(h, rows[i + 1])
    if (y0 >= h) break
    const t0 = y0 / 270
    const t1 = y1 / 270
    const matW = 120 + t1 * 150
    const shift = (i % 2) * matW * 0.5
    for (let x = -shift; x < w; x += matW) {
      ctx.fillStyle = mix(look.mat, '#000000', range(r, 0, 0.08))
      ctx.fillRect(x, y0, matW, y1 - y0)
      // weave
      ctx.strokeStyle = rgba('#000000', 0.07)
      ctx.lineWidth = 0.6
      for (let wy = y0 + 2; wy < y1; wy += 2 + t1 * 2) {
        ctx.beginPath()
        ctx.moveTo(x, wy)
        ctx.lineTo(x + matW, wy)
        ctx.stroke()
      }
      ctx.fillStyle = look.matEdge
      ctx.fillRect(x, y0, 2 + t0 * 2.5, y1 - y0)
    }
    ctx.fillStyle = look.matEdge
    ctx.fillRect(0, y0, w, 1.6 + t0 * 3)
  }
  vGradient(ctx, 0, 0, w, 36, [
    [0, rgba(look.shade, 0.5)],
    [1, rgba(look.shade, 0)],
  ])
  if (!look.lamp) {
    // window light falling in a long parallelogram across the mats
    ctx.save()
    ctx.fillStyle = 'rgba(255,230,170,0.16)'
    const wx = w * 0.7
    ctx.beginPath()
    ctx.moveTo(wx - 96, 0)
    ctx.lineTo(wx + 96, 0)
    ctx.lineTo(wx - 20, h)
    ctx.lineTo(wx - 300, h)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  } else {
    ctx.save()
    ctx.translate(w * 0.3, 40)
    ctx.scale(1, 0.34)
    softGlow(ctx, 0, 0, 340, 'rgba(255,198,110,0.32)', 'rgba(255,198,110,0)')
    ctx.restore()
  }
}

function paintProps(ctx: Ctx, w: number, look: Look) {
  toWorld(ctx)
  const r = rng(17)

  // sacks of rice stacked in the corner (left)
  const sx = w * 0.07
  for (const [dx, dy, s] of [
    [0, 0, 1],
    [46, 4, 0.96],
    [20, -34, 0.92],
  ] as const) {
    const x = sx + dx
    const y = FLOOR_Y - 6 + dy
    ctx.fillStyle = mix('#c8b48a', '#000000', look.lamp ? 0.5 : 0.06)
    ctx.beginPath()
    ctx.moveTo(x - 20 * s, y)
    ctx.quadraticCurveTo(x - 24 * s, y - 28 * s, x - 12 * s, y - 40 * s)
    ctx.lineTo(x + 12 * s, y - 40 * s)
    ctx.quadraticCurveTo(x + 24 * s, y - 28 * s, x + 20 * s, y)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = rgba('#4b3a22', 0.6)
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.strokeStyle = rgba('#4b3a22', 0.5)
    ctx.beginPath()
    ctx.moveTo(x - 13 * s, y - 36 * s)
    ctx.lineTo(x + 13 * s, y - 36 * s)
    ctx.stroke()
  }

  // a low table (chabudai) with a teapot and cups
  const tx = w * 0.3
  const ty = FLOOR_Y + 18
  ctx.fillStyle = mix('#7a5a3c', '#000000', look.lamp ? 0.45 : 0)
  ctx.fillRect(tx - 52, ty - 12, 104, 8)
  ctx.fillStyle = mix('#4a3322', '#000000', look.lamp ? 0.45 : 0)
  ctx.fillRect(tx - 46, ty - 4, 7, 14)
  ctx.fillRect(tx + 39, ty - 4, 7, 14)
  ctx.fillStyle = mix('#3b4f58', '#000000', look.lamp ? 0.4 : 0)
  ctx.beginPath()
  ctx.ellipse(tx - 6, ty - 22, 14, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(tx + 6, ty - 26, 12, 3)
  ctx.fillRect(tx - 7, ty - 34, 4, 4)
  for (const cx of [tx + 24, tx + 34]) {
    ctx.fillStyle = '#e8e0cf'
    ctx.beginPath()
    ctx.ellipse(cx, ty - 14, 5, 3.4, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // wall dressing: a calendar, a shelf of jars, hanging gourds
  const calX = w * 0.17
  ctx.fillStyle = '#efe7d3'
  ctx.fillRect(calX, 118, 38, 52)
  ctx.fillStyle = '#b6453a'
  ctx.fillRect(calX, 118, 38, 12)
  ctx.fillStyle = rgba('#3a2c20', 0.7)
  for (let i = 0; i < 5; i++) ctx.fillRect(calX + 4, 136 + i * 6.5, 30, 1.6)

  const shX = w * 0.4
  ctx.fillStyle = look.beamDark
  ctx.fillRect(shX, 190, 108, 6)
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = mix(['#8a5a3c', '#6a7a63', '#a07a52', '#5d6a74'][i], '#000000', look.lamp ? 0.4 : 0)
    ctx.beginPath()
    ctx.roundRect(shX + 6 + i * 26, 190 - 24 - (i % 2) * 6, 18, 24 + (i % 2) * 6, 5)
    ctx.fill()
  }
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = rgba(look.beamDark, 0.9)
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(w * 0.56 + i * 11, 82)
    ctx.lineTo(w * 0.56 + i * 11, 104 + (i % 2) * 8)
    ctx.stroke()
    ctx.fillStyle = mix('#b88a3c', '#000000', look.lamp ? 0.45 : 0)
    ctx.beginPath()
    ctx.ellipse(w * 0.56 + i * 11, 112 + (i % 2) * 8, 4.6, 7, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  void r
}

/** A bare bulb on a cord (night) / a hanging paper lantern (day) that sways a touch. */
function addLampSway(scene: Phaser.Scene, w: number, look: Look) {
  const x = w * 0.3
  const cord = scene.add.rectangle(x, 78 - layout.camY * 0 - 0, 2, 40, 0x1a120c, 0.9).setOrigin(0.5, 0).setDepth(-20)
  cord.y = 80
  const glow = scene.add.circle(x, 124, look.lamp ? 70 : 36, look.lamp ? 0xffc46a : 0xffe0a0, look.lamp ? 0.2 : 0.1).setDepth(-21)
  glow.setBlendMode(Phaser.BlendModes.SCREEN)
  const bulb = scene.add.circle(x, 124, look.lamp ? 7 : 11, look.lamp ? 0xfff1c9 : 0xd9553f, 1).setDepth(-19)
  scene.tweens.add({ targets: [bulb, glow], x: x + 5, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  scene.tweens.add({ targets: cord, scaleX: 1.3, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  if (look.lamp) {
    scene.tweens.add({ targets: glow, alpha: 0.26, duration: 340, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  }
}
