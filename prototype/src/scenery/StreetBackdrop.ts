import Phaser from 'phaser'
import { layout, STAGE_H } from '../render/layout'
import { layerWidth, mix, paintLayer, range, rgba, rng, softGlow, vGradient, type Ctx } from './paint/canvas'
import { buildClouds, buildDust, buildSky, buildSunRays, buildVignette, type SkyLook } from './paint/atmosphere'

/** Time of day is chosen per scene from the script's stage directions (see 기획안 §6.1). */
export type StreetTime = 'day' | 'night'

interface StreetLook {
  sky: SkyLook
  cloud: { light: string; shade: string; alpha: number; density: number }
  mountainFar: string
  mountainNear: string
  haze: string
  farCity: string
  wood: string
  woodDark: string
  plaster: string
  roof: string
  roofLight: string
  roofDark: string
  noren: string[]
  sign: string
  interior: string
  shoji: string
  lit: boolean
  shadow: string
  light: string
  pole: string
  wire: string
  roadFar: string
  roadNear: string
  curb: string
  curbShade: string
  stone: string
  rail: string
  railHi: string
  rays?: string
  dust: number
  dustCount: number
  vignette: [string, number]
}

const LOOKS: Record<StreetTime, StreetLook> = {
  day: {
    sky: {
      stops: [
        [0, '#5b9cd2'],
        [0.4, '#98c6e6'],
        [0.72, '#d6e8ee'],
        [1, '#f4e6cb'],
      ],
      sun: { fx: 0.85, y: 64, radius: 44, core: '#fffdf2', glow: '#ffe7b0' },
    },
    cloud: { light: '#ffffff', shade: '#9db2c9', alpha: 0.96, density: 7.5 },
    mountainFar: '#a7bfd5',
    mountainNear: '#8eaac3',
    haze: '#eaeee6',
    farCity: '#8fa3b7',
    wood: '#7d5c40',
    woodDark: '#4e3826',
    plaster: '#ece2cd',
    roof: '#4b5767',
    roofLight: '#7e8a99',
    roofDark: '#2f3742',
    noren: ['#2b4a75', '#a9733a', '#566848', '#7d3a33', '#3c3f6b'],
    sign: '#a07e56',
    interior: '#2c2520',
    shoji: '#efe6d2',
    lit: false,
    shadow: '#2b1f17',
    light: '#fff3d6',
    pole: '#5d4733',
    wire: '#2f2924',
    roadFar: '#d6c09c',
    roadNear: '#b39672',
    curb: '#d3cab9',
    curbShade: '#a59b8a',
    stone: '#7a6248',
    rail: '#5e5a56',
    railHi: '#f0eadc',
    rays: '#fff1c9',
    dust: 0xfff4d6,
    dustCount: 42,
    vignette: ['#3a2a1a', 0.26],
  },
  night: {
    sky: {
      stops: [
        [0, '#050916'],
        [0.5, '#111f42'],
        [0.85, '#23305a'],
        [1, '#373a5c'],
      ],
      moon: true,
      stars: true,
    },
    cloud: { light: '#33426a', shade: '#121831', alpha: 0.55, density: 4.5 },
    mountainFar: '#1c2644',
    mountainNear: '#151d37',
    haze: '#2a3255',
    farCity: '#131b32',
    wood: '#3a2c25',
    woodDark: '#211915',
    plaster: '#585667',
    roof: '#1b212d',
    roofLight: '#394151',
    roofDark: '#10141c',
    noren: ['#1b2c4a', '#5c4222', '#2e3826', '#4a2420', '#26284a'],
    sign: '#4d3d2d',
    interior: '#ffb85c',
    shoji: '#ffd38a',
    lit: true,
    shadow: '#03040c',
    light: '#ffcf87',
    pole: '#1e1915',
    wire: '#0c0a09',
    roadFar: '#3c3940',
    roadNear: '#29252a',
    curb: '#56535c',
    curbShade: '#38363e',
    stone: '#151315',
    rail: '#55555c',
    railHi: '#b8b6cc',
    dust: 0xffd27a,
    dustCount: 22,
    vignette: ['#02030a', 0.55],
  },
}

const BASE_Y = 398 // where the far side of the street meets the building fronts

export function buildStreetBackdrop(scene: Phaser.Scene, worldWidth: number, time: StreetTime) {
  const look = LOOKS[time]
  const name = `street-${time}`

  // taller (portrait) views have a lot more sky above the rooftops; drop the sun into it
  const sun = look.sky.sun && { ...look.sky.sun, y: look.sky.sun.y + -layout.camY * 0.45 }
  buildSky(scene, name, worldWidth, { ...look.sky, sun })
  buildClouds(scene, name, worldWidth, look.cloud)
  paintMountains(scene, name, worldWidth, look)
  paintFarCity(scene, name, worldWidth, look)
  paintMachiya(scene, name, worldWidth, look)
  paintPoles(scene, name, worldWidth, look)
  paintRoad(scene, name, worldWidth, look)

  if (look.rays) buildSunRays(scene, name, look.rays, 0.9)
  buildDust(scene, look.dust, look.dustCount, worldWidth)
  buildVignette(scene, name, look.vignette[0], look.vignette[1])
}

// ---------------------------------------------------------------- distant layers

function ridge(x: number, base: number, amp: number, seed: number) {
  return (
    base +
    amp * Math.sin(x / 140 + seed) +
    amp * 0.55 * Math.sin(x / 57 + seed * 2.1) +
    amp * 0.22 * Math.sin(x / 19 + seed * 3.7)
  )
}

function paintMountains(scene: Phaser.Scene, name: string, worldWidth: number, look: StreetLook) {
  const sf = 0.1
  const w = layerWidth(worldWidth, layout.viewW, sf)
  paintLayer(
    scene,
    `${name}-mountains`,
    w,
    STAGE_H,
    (ctx) => {
      for (const [base, amp, seed, color, fadeTo] of [
        [212, 24, 1.3, look.mountainFar, 330],
        [252, 18, 4.1, look.mountainNear, 345],
      ] as const) {
        ctx.beginPath()
        ctx.moveTo(0, STAGE_H)
        for (let x = 0; x <= w; x += 6) ctx.lineTo(x, ridge(x, base, amp, seed))
        ctx.lineTo(w, STAGE_H)
        ctx.closePath()
        const g = ctx.createLinearGradient(0, base - amp * 1.8, 0, fadeTo)
        g.addColorStop(0, color)
        g.addColorStop(1, look.haze)
        ctx.fillStyle = g
        ctx.fill()
      }
    },
    { scrollFactor: sf, depth: -95 },
  )
}

function paintFarCity(scene: Phaser.Scene, name: string, worldWidth: number, look: StreetLook) {
  const sf = 0.22
  const w = layerWidth(worldWidth, layout.viewW, sf)
  const r = rng(101)

  type Block = { x: number; w: number; top: number; kind: number; tone: number }
  const blocks: Block[] = []
  for (let x = -10; x < w; ) {
    const bw = range(r, 34, 90)
    blocks.push({ x, w: bw, top: range(r, 228, 318), kind: Math.floor(r() * 3), tone: range(r, -0.08, 0.08) })
    x += bw + range(r, -6, 4)
  }
  const chimneys = Array.from({ length: Math.ceil(w / 420) }, () => ({ x: range(r, 0, w), h: range(r, 70, 120) }))
  const towerX = 620

  paintLayer(
    scene,
    `${name}-farcity`,
    w,
    STAGE_H,
    (ctx) => {
      const base = 372
      for (const c of chimneys) {
        ctx.fillStyle = mix(look.farCity, '#000000', 0.08)
        ctx.fillRect(c.x, base - c.h - 150, 7, c.h + 150)
        if (!look.lit) {
          for (let i = 0; i < 5; i++) {
            softGlow(ctx, c.x + 4 + i * 9, base - c.h - 160 - i * 16, 10 + i * 5, rgba('#e9ecef', 0.35 - i * 0.05), rgba('#e9ecef', 0))
          }
        }
      }

      for (const b of blocks) {
        ctx.fillStyle = mix(look.farCity, b.tone > 0 ? '#ffffff' : '#000000', Math.abs(b.tone))
        ctx.beginPath()
        if (b.kind === 0) {
          ctx.rect(b.x, b.top, b.w, base - b.top)
        } else if (b.kind === 1) {
          // gabled roof
          ctx.moveTo(b.x - 3, b.top + 10)
          ctx.lineTo(b.x + b.w / 2, b.top - 8)
          ctx.lineTo(b.x + b.w + 3, b.top + 10)
          ctx.lineTo(b.x + b.w, base)
          ctx.lineTo(b.x, base)
        } else {
          // hipped roof
          ctx.moveTo(b.x - 4, b.top + 8)
          ctx.lineTo(b.x + b.w * 0.25, b.top - 6)
          ctx.lineTo(b.x + b.w * 0.75, b.top - 6)
          ctx.lineTo(b.x + b.w + 4, b.top + 8)
          ctx.lineTo(b.x + b.w, base)
          ctx.lineTo(b.x, base)
        }
        ctx.fill()

        if (look.lit) {
          const wr = rng(Math.floor(b.x * 13))
          for (let wy = b.top + 14; wy < base - 8; wy += 11) {
            for (let wx = b.x + 5; wx < b.x + b.w - 5; wx += 9) {
              if (wr() < 0.18) {
                ctx.fillStyle = rgba('#ffcc7a', range(wr, 0.5, 0.9))
                ctx.fillRect(wx, wy, 3, 4)
              }
            }
          }
        }
      }

      paintTsutenkaku(ctx, towerX, base, mix(look.farCity, '#000000', 0.15), look.lit)

      // atmospheric haze sinking into the far city
      vGradient(ctx, 0, 240, w, base - 240 + 4, [
        [0, rgba(look.haze, 0)],
        [1, rgba(look.haze, look.lit ? 0.35 : 0.75)],
      ])
    },
    { scrollFactor: sf, depth: -90 },
  )
}

/** Lattice observation tower in the spirit of Osaka's 通天閣, as on the character sheet. */
function paintTsutenkaku(ctx: Ctx, cx: number, base: number, color: string, lit: boolean) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2.2
  const waistY = 210
  // splayed legs
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx + s * 44, base)
    ctx.quadraticCurveTo(cx + s * 22, base - 70, cx + s * 13, waistY)
    ctx.stroke()
  }
  // leg lattice
  ctx.lineWidth = 1
  for (let y = base - 14; y > waistY; y -= 14) {
    const t = (base - y) / (base - waistY)
    const half = 44 - (44 - 13) * Math.sqrt(t)
    ctx.beginPath()
    ctx.moveTo(cx - half, y)
    ctx.lineTo(cx + half, y)
    ctx.moveTo(cx - half, y)
    ctx.lineTo(cx + half * 0.6, y - 14)
    ctx.moveTo(cx + half, y)
    ctx.lineTo(cx - half * 0.6, y - 14)
    ctx.stroke()
  }
  // lower observation deck
  ctx.fillRect(cx - 22, waistY - 12, 44, 12)
  // shaft
  ctx.beginPath()
  ctx.moveTo(cx - 10, waistY - 12)
  ctx.lineTo(cx - 6, 118)
  ctx.lineTo(cx + 6, 118)
  ctx.lineTo(cx + 10, waistY - 12)
  ctx.closePath()
  ctx.fill()
  // upper deck + spire
  ctx.fillRect(cx - 15, 108, 30, 11)
  ctx.beginPath()
  ctx.moveTo(cx - 5, 108)
  ctx.lineTo(cx, 66)
  ctx.lineTo(cx + 5, 108)
  ctx.closePath()
  ctx.fill()
  if (lit) {
    softGlow(ctx, cx, 112, 26, 'rgba(255,214,140,0.55)', 'rgba(255,214,140,0)')
    softGlow(ctx, cx, 66, 10, 'rgba(255,90,70,0.9)', 'rgba(255,90,70,0)')
  }
}

// ---------------------------------------------------------------- the street proper

interface Shop {
  x: number
  w: number
  groundTop: number
  upperTop: number
  roofTop: number
  plasterUpper: boolean
  window: 'mushiko' | 'shoji'
  noren: string
  hasLattice: boolean
  sign: 'hang' | 'board' | 'none'
  lantern: boolean
  props: ('pot' | 'barrel' | 'crates' | 'bike' | 'bucket')[]
}

function paintMachiya(scene: Phaser.Scene, name: string, worldWidth: number, look: StreetLook) {
  const sf = 0.55
  const w = layerWidth(worldWidth, layout.viewW, sf)
  const r = rng(202)

  const shops: Shop[] = []
  const propKinds = ['pot', 'barrel', 'crates', 'bike', 'bucket'] as const
  for (let x = -20; x < w; ) {
    const sw = range(r, 128, 186)
    const groundTop = 300 + range(r, -8, 6)
    const upperTop = groundTop - 15 - range(r, 68, 86)
    const props: Shop['props'] = []
    const nProps = Math.floor(r() * 3)
    for (let i = 0; i < nProps; i++) props.push(propKinds[Math.floor(r() * propKinds.length)])
    shops.push({
      x,
      w: sw,
      groundTop,
      upperTop,
      roofTop: upperTop - range(r, 24, 34),
      plasterUpper: r() < 0.55,
      window: r() < 0.5 ? 'mushiko' : 'shoji',
      noren: look.noren[Math.floor(r() * look.noren.length)],
      hasLattice: r() < 0.7,
      sign: r() < 0.45 ? 'hang' : r() < 0.7 ? 'board' : 'none',
      lantern: r() < 0.45,
      props,
    })
    x += sw + (r() < 0.35 ? range(r, 12, 26) : 0)
  }

  paintLayer(
    scene,
    `${name}-machiya`,
    w,
    STAGE_H,
    (ctx) => {
      for (const s of shops) paintShop(ctx, s, look)
      // light haze so the row sits behind the street, not on it
      vGradient(ctx, 0, 150, w, BASE_Y - 150, [
        [0, rgba(look.haze, 0.1)],
        [1, rgba(look.haze, look.lit ? 0.04 : 0.14)],
      ])
    },
    { scrollFactor: sf, depth: -60 },
  )
}

function tiledRoof(ctx: Ctx, x0: number, x1: number, yTop: number, yBottom: number, inset: number, look: StreetLook) {
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x0, yBottom)
  // a gentle upward sweep at the eave ends, characteristic of kawara roofs
  ctx.quadraticCurveTo(x0 + 6, yBottom - 2, x0 + inset, yTop)
  ctx.lineTo(x1 - inset, yTop)
  ctx.quadraticCurveTo(x1 - 6, yBottom - 2, x1, yBottom)
  ctx.closePath()
  const g = ctx.createLinearGradient(0, yTop, 0, yBottom)
  g.addColorStop(0, look.roofLight)
  g.addColorStop(1, look.roof)
  ctx.fillStyle = g
  ctx.fill()
  ctx.clip()
  // tile columns
  ctx.strokeStyle = rgba(look.roofDark, 0.55)
  ctx.lineWidth = 1.4
  for (let x = x0; x < x1; x += 6.5) {
    ctx.beginPath()
    ctx.moveTo(x, yTop)
    ctx.lineTo(x + (x - (x0 + x1) / 2) * 0.04, yBottom)
    ctx.stroke()
  }
  // tile courses
  ctx.strokeStyle = rgba(look.roofLight, 0.35)
  ctx.lineWidth = 1
  for (let y = yTop + 5; y < yBottom; y += 5.5) {
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x1, y)
    ctx.stroke()
  }
  ctx.restore()
  // eave edge + highlight
  ctx.fillStyle = look.roofDark
  ctx.fillRect(x0, yBottom - 2, x1 - x0, 3.5)
  ctx.fillStyle = rgba(look.roofLight, 0.6)
  ctx.fillRect(x0 + 2, yBottom - 3.5, x1 - x0 - 4, 1)
}

function paintShop(ctx: Ctx, s: Shop, look: StreetLook) {
  const { x, w, groundTop, upperTop, roofTop } = s
  const hisashiTop = groundTop - 15

  // upper storey wall
  if (s.plasterUpper) {
    ctx.fillStyle = look.plaster
    ctx.fillRect(x + 4, upperTop, w - 8, hisashiTop - upperTop)
    ctx.fillStyle = look.woodDark
    for (const px of [x + 4, x + w / 2 - 2, x + w - 8]) ctx.fillRect(px, upperTop, 4, hisashiTop - upperTop)
    ctx.fillRect(x + 4, upperTop + (hisashiTop - upperTop) * 0.55, w - 8, 3)
  } else {
    ctx.fillStyle = look.wood
    ctx.fillRect(x + 4, upperTop, w - 8, hisashiTop - upperTop)
    ctx.strokeStyle = rgba(look.woodDark, 0.45)
    ctx.lineWidth = 1
    for (let px = x + 10; px < x + w - 6; px += 7) {
      ctx.beginPath()
      ctx.moveTo(px, upperTop)
      ctx.lineTo(px, hisashiTop)
      ctx.stroke()
    }
  }

  // upper window
  const winW = w * 0.46
  const winX = x + (w - winW) / 2
  const winY = upperTop + 16
  const winH = (hisashiTop - upperTop) * 0.42
  if (s.window === 'mushiko') {
    ctx.fillStyle = look.lit ? rgba(look.interior, 0.85) : look.woodDark
    ctx.fillRect(winX, winY, winW, winH)
    ctx.fillStyle = look.plaster
    for (let bx = winX + 2; bx < winX + winW - 2; bx += 6) ctx.fillRect(bx, winY, 3, winH)
  } else {
    ctx.fillStyle = look.lit ? look.shoji : mix(look.shoji, '#c9bca2', 0.25)
    ctx.fillRect(winX, winY, winW, winH)
    ctx.strokeStyle = look.woodDark
    ctx.lineWidth = 1.2
    ctx.strokeRect(winX, winY, winW, winH)
    for (let bx = winX + winW / 4; bx < winX + winW; bx += winW / 4) {
      ctx.beginPath()
      ctx.moveTo(bx, winY)
      ctx.lineTo(bx, winY + winH)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(winX, winY + winH / 2)
    ctx.lineTo(winX + winW, winY + winH / 2)
    ctx.stroke()
  }
  if (look.lit) softGlow(ctx, winX + winW / 2, winY + winH / 2, winW * 0.8, rgba(look.light, 0.25), rgba(look.light, 0))

  // main roof
  tiledRoof(ctx, x - 7, x + w + 7, roofTop, upperTop + 2, 12, look)
  ctx.fillStyle = look.roofDark
  ctx.beginPath()
  ctx.roundRect(x + 8, roofTop - 5, w - 16, 6, 3)
  ctx.fill()
  for (const ex of [x + 8, x + w - 8]) {
    ctx.beginPath()
    ctx.arc(ex, roofTop - 4, 4.5, 0, Math.PI * 2)
    ctx.fill()
  }
  vGradient(ctx, x + 4, upperTop + 2, w - 8, 14, [
    [0, rgba(look.shadow, 0.35)],
    [1, rgba(look.shadow, 0)],
  ])

  // ground floor
  ctx.fillStyle = look.wood
  ctx.fillRect(x + 2, groundTop, w - 4, BASE_Y - groundTop)
  const openX = s.hasLattice ? x + w * 0.42 : x + 10
  const openW = x + w - 10 - openX
  // interior
  const ig = ctx.createLinearGradient(0, groundTop, 0, BASE_Y)
  ig.addColorStop(0, look.lit ? rgba(look.interior, 0.95) : look.interior)
  ig.addColorStop(1, look.lit ? rgba(look.interior, 0.55) : mix(look.interior, '#000000', 0.3))
  ctx.fillStyle = ig
  ctx.fillRect(openX, groundTop + 6, openW, BASE_Y - groundTop - 10)
  if (look.lit) softGlow(ctx, openX + openW / 2, BASE_Y - 30, openW * 0.9, rgba(look.light, 0.32), rgba(look.light, 0))

  // koshi lattice
  if (s.hasLattice) {
    ctx.fillStyle = look.lit ? rgba(look.interior, 0.7) : mix(look.interior, look.wood, 0.25)
    ctx.fillRect(x + 8, groundTop + 8, openX - x - 14, BASE_Y - groundTop - 14)
    ctx.fillStyle = look.woodDark
    for (let lx = x + 8; lx < openX - 6; lx += 4) ctx.fillRect(lx, groundTop + 8, 2, BASE_Y - groundTop - 14)
    ctx.fillRect(x + 8, groundTop + 8, openX - x - 14, 2)
  }

  // noren curtain across the shop opening
  const panels = Math.max(2, Math.round(openW / 26))
  const panelW = openW / panels
  const norenH = (BASE_Y - groundTop) * 0.42
  for (let i = 0; i < panels; i++) {
    const px = openX + i * panelW + 1
    ctx.fillStyle = s.noren
    ctx.beginPath()
    ctx.moveTo(px, groundTop + 4)
    ctx.lineTo(px + panelW - 2, groundTop + 4)
    ctx.lineTo(px + panelW - 2.5, groundTop + 4 + norenH)
    ctx.quadraticCurveTo(px + panelW / 2, groundTop + 6 + norenH, px + 0.5, groundTop + 4 + norenH)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = rgba('#000000', 0.12)
    ctx.fillRect(px + panelW - 4, groundTop + 4, 2, norenH)
  }
  // crest
  ctx.strokeStyle = rgba('#f4efe4', 0.85)
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(openX + openW / 2, groundTop + 4 + norenH * 0.5, Math.min(9, norenH * 0.28), 0, Math.PI * 2)
  ctx.stroke()
  // noren rod
  ctx.fillStyle = look.woodDark
  ctx.fillRect(openX - 2, groundTop + 2, openW + 4, 3)

  // lower pent roof (hisashi)
  tiledRoof(ctx, x - 9, x + w + 9, hisashiTop, groundTop + 2, 4, look)
  vGradient(ctx, x + 2, groundTop + 2, w - 4, 18, [
    [0, rgba(look.shadow, 0.42)],
    [1, rgba(look.shadow, 0)],
  ])

  // signage
  if (s.sign === 'hang') {
    const sx = x + 10
    ctx.fillStyle = look.sign
    ctx.fillRect(sx, groundTop + 6, 15, 54)
    ctx.strokeStyle = look.woodDark
    ctx.lineWidth = 1.5
    ctx.strokeRect(sx, groundTop + 6, 15, 54)
    ctx.fillStyle = rgba('#1c140e', 0.8)
    for (let i = 0; i < 3; i++) ctx.fillRect(sx + 5, groundTop + 13 + i * 15, 5 + (i % 2) * 2, 8)
  } else if (s.sign === 'board') {
    const bw = Math.min(70, w * 0.5)
    const bx = x + (w - bw) / 2
    ctx.fillStyle = look.sign
    ctx.fillRect(bx, hisashiTop - 18, bw, 14)
    ctx.strokeStyle = look.woodDark
    ctx.lineWidth = 1.5
    ctx.strokeRect(bx, hisashiTop - 18, bw, 14)
    ctx.fillStyle = rgba('#1c140e', 0.8)
    for (let i = 0; i < 4; i++) ctx.fillRect(bx + 8 + i * ((bw - 16) / 4), hisashiTop - 14, (bw - 16) / 4 - 5, 6)
  }

  // red paper lantern (chōchin)
  if (s.lantern) {
    const lx = openX - 6
    const ly = groundTop + 20
    if (look.lit) softGlow(ctx, lx, ly, 34, 'rgba(255,140,90,0.45)', 'rgba(255,140,90,0)')
    ctx.fillStyle = look.lit ? '#ff6a4a' : '#c2402f'
    ctx.beginPath()
    ctx.ellipse(lx, ly, 7, 10, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = rgba('#5a1a12', 0.6)
    ctx.lineWidth = 0.8
    for (let ry = ly - 7; ry <= ly + 7; ry += 3.5) {
      ctx.beginPath()
      ctx.moveTo(lx - Math.sqrt(Math.max(0, 1 - ((ry - ly) / 10) ** 2)) * 7, ry)
      ctx.lineTo(lx + Math.sqrt(Math.max(0, 1 - ((ry - ly) / 10) ** 2)) * 7, ry)
      ctx.stroke()
    }
    ctx.fillStyle = '#1a1410'
    ctx.fillRect(lx - 4, ly - 12, 8, 3)
    ctx.fillRect(lx - 4, ly + 9, 8, 3)
  }

  // stone footing + side light
  ctx.fillStyle = mix(look.curbShade, '#000000', 0.1)
  ctx.fillRect(x, BASE_Y - 6, w, 6)
  const side = ctx.createLinearGradient(x, 0, x + w, 0)
  side.addColorStop(0, rgba(look.shadow, 0.2))
  side.addColorStop(0.5, rgba(look.shadow, 0))
  side.addColorStop(1, rgba(look.light, look.lit ? 0 : 0.08))
  ctx.fillStyle = side
  ctx.fillRect(x, roofTop - 6, w, BASE_Y - roofTop + 6)

  // props in front of the shop
  let px = x + w * 0.15
  for (const p of s.props) {
    paintProp(ctx, p, px, BASE_Y, look)
    px += w * 0.3
  }
}

function paintProp(ctx: Ctx, kind: Shop['props'][number], x: number, base: number, look: StreetLook) {
  switch (kind) {
    case 'pot':
      ctx.fillStyle = '#8a5a3c'
      ctx.beginPath()
      ctx.moveTo(x - 8, base - 14)
      ctx.lineTo(x + 8, base - 14)
      ctx.lineTo(x + 6, base)
      ctx.lineTo(x - 6, base)
      ctx.closePath()
      ctx.fill()
      for (const [dx, dy, rr] of [
        [-6, -20, 7],
        [5, -22, 8],
        [0, -28, 7],
      ]) {
        ctx.fillStyle = look.lit ? '#1f2a1e' : '#4f7a46'
        ctx.beginPath()
        ctx.arc(x + dx, base + dy, rr, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    case 'barrel':
      ctx.fillStyle = mix(look.wood, '#000000', 0.1)
      ctx.beginPath()
      ctx.roundRect(x - 9, base - 22, 18, 22, 4)
      ctx.fill()
      ctx.fillStyle = look.woodDark
      ctx.fillRect(x - 9, base - 17, 18, 2)
      ctx.fillRect(x - 9, base - 7, 18, 2)
      break
    case 'crates':
      ctx.fillStyle = mix(look.wood, '#e0c89a', 0.25)
      ctx.fillRect(x - 12, base - 14, 18, 14)
      ctx.fillRect(x - 6, base - 26, 16, 12)
      ctx.strokeStyle = look.woodDark
      ctx.lineWidth = 1
      ctx.strokeRect(x - 12, base - 14, 18, 14)
      ctx.strokeRect(x - 6, base - 26, 16, 12)
      break
    case 'bike':
      ctx.strokeStyle = look.lit ? '#0f0c0b' : '#2a2522'
      ctx.lineWidth = 1.4
      for (const wx of [x - 11, x + 11]) {
        ctx.beginPath()
        ctx.arc(wx, base - 8, 8, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.moveTo(x - 11, base - 8)
      ctx.lineTo(x - 2, base - 20)
      ctx.lineTo(x + 7, base - 20)
      ctx.lineTo(x + 11, base - 8)
      ctx.moveTo(x - 2, base - 20)
      ctx.lineTo(x, base - 8)
      ctx.lineTo(x - 11, base - 8)
      ctx.moveTo(x + 7, base - 20)
      ctx.lineTo(x + 9, base - 26)
      ctx.stroke()
      break
    case 'bucket':
      ctx.fillStyle = '#8f8a7d'
      ctx.beginPath()
      ctx.moveTo(x - 6, base - 12)
      ctx.lineTo(x + 6, base - 12)
      ctx.lineTo(x + 5, base)
      ctx.lineTo(x - 5, base)
      ctx.closePath()
      ctx.fill()
      break
  }
}

function paintPoles(scene: Phaser.Scene, name: string, worldWidth: number, look: StreetLook) {
  const sf = 0.8
  const w = layerWidth(worldWidth, layout.viewW, sf)
  const r = rng(303)
  const poles: number[] = []
  for (let x = 90; x < w; x += range(r, 270, 340)) poles.push(x)
  const birds = poles.slice(0, -1).map(() => (r() < 0.45 ? range(r, 0.25, 0.75) : -1))

  paintLayer(
    scene,
    `${name}-poles`,
    w,
    STAGE_H,
    (ctx) => {
      const arms = [
        { y: 168, half: 30 },
        { y: 188, half: 22 },
      ]
      // wires first so poles sit in front of them
      ctx.strokeStyle = rgba(look.wire, 0.85)
      ctx.lineWidth = 1
      for (let i = 0; i < poles.length - 1; i++) {
        const a = poles[i]
        const b = poles[i + 1]
        for (const arm of arms) {
          for (const off of [-arm.half + 3, arm.half - 3]) {
            ctx.beginPath()
            ctx.moveTo(a + off, arm.y - 2)
            ctx.quadraticCurveTo((a + b) / 2, arm.y + 22, b + off, arm.y - 2)
            ctx.stroke()
          }
        }
        if (birds[i] > 0) {
          // a pair of sparrows perched on the top wire
          const t = birds[i]
          const bx = a + (b - a) * t
          const by = 166 + 22 * 4 * t * (1 - t) * 0.5 + 9
          for (const dx of [0, 9]) {
            ctx.fillStyle = look.lit ? '#0c0a09' : '#3a2e26'
            ctx.beginPath()
            ctx.ellipse(bx + dx, by - 3, 3.2, 2.4, 0, 0, Math.PI * 2)
            ctx.arc(bx + dx + 2.5, by - 5.5, 1.6, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      for (const px of poles) {
        const pg = ctx.createLinearGradient(px - 4, 0, px + 4, 0)
        pg.addColorStop(0, mix(look.pole, '#000000', 0.25))
        pg.addColorStop(0.6, look.pole)
        pg.addColorStop(1, mix(look.pole, '#ffffff', look.lit ? 0.05 : 0.18))
        ctx.fillStyle = pg
        ctx.beginPath()
        ctx.moveTo(px - 4, 412)
        ctx.lineTo(px - 2.5, 146)
        ctx.lineTo(px + 2.5, 146)
        ctx.lineTo(px + 4, 412)
        ctx.closePath()
        ctx.fill()
        for (const arm of arms) {
          ctx.fillStyle = mix(look.pole, '#000000', 0.15)
          ctx.fillRect(px - arm.half, arm.y, arm.half * 2, 3)
          ctx.fillStyle = look.lit ? '#8f97a8' : '#e9e4d8'
          for (const off of [-arm.half + 3, arm.half - 3]) {
            ctx.beginPath()
            ctx.arc(px + off, arm.y - 1.5, 2, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        // street lamp hung from the pole
        ctx.fillStyle = look.lit ? '#2a2724' : '#3f3a34'
        ctx.fillRect(px, 236, 16, 2)
        ctx.beginPath()
        ctx.moveTo(px + 9, 238)
        ctx.lineTo(px + 22, 238)
        ctx.lineTo(px + 19, 244)
        ctx.lineTo(px + 12, 244)
        ctx.closePath()
        ctx.fill()
        if (look.lit) {
          softGlow(ctx, px + 15.5, 247, 60, rgba(look.light, 0.32), rgba(look.light, 0))
          softGlow(ctx, px + 15.5, 246, 6, 'rgba(255,240,200,1)', 'rgba(255,230,180,0.6)')
        } else {
          ctx.fillStyle = '#e8e2cf'
          ctx.beginPath()
          ctx.arc(px + 15.5, 245.5, 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    },
    { scrollFactor: sf, depth: -40 },
  )
}

function paintRoad(scene: Phaser.Scene, name: string, worldWidth: number, look: StreetLook) {
  const top = BASE_Y - 4
  const h = layout.worldBottom - top
  const r = rng(404)

  type Stone = { x: number; y: number; w: number; h: number; a: number }
  const stones: Stone[] = []
  let y = 22
  let row = 0
  while (y < h) {
    const size = 5 + (y / h) * 16
    for (let x = (row % 2) * size * 0.6; x < worldWidth; x += size * range(r, 1.3, 1.8)) {
      stones.push({ x, y: y + range(r, -1, 1), w: size * range(r, 0.8, 1.1), h: size * 0.42, a: range(r, 0.1, 0.24) })
    }
    y += size * 0.62
    row++
  }
  const patches = Array.from({ length: Math.ceil(worldWidth / 260) }, () => ({
    x: range(r, 0, worldWidth),
    y: range(r, 40, h - 10),
    rx: range(r, 70, 160),
  }))

  paintLayer(
    scene,
    `${name}-road`,
    worldWidth,
    h,
    (ctx) => {
      // curb + gutter on the far side
      ctx.fillStyle = look.curb
      ctx.fillRect(0, 0, worldWidth, 9)
      ctx.fillStyle = look.curbShade
      ctx.fillRect(0, 9, worldWidth, 5)
      ctx.fillStyle = rgba('#000000', 0.25)
      ctx.fillRect(0, 14, worldWidth, 3)
      ctx.fillStyle = rgba(look.curbShade, 0.9)
      for (let x = 0; x < worldWidth; x += 42) ctx.fillRect(x, 0, 1.2, 14)

      vGradient(ctx, 0, 17, worldWidth, h - 17, [
        [0, look.roadFar],
        [1, look.roadNear],
      ])
      // shade cast by the shop row onto the far half of the road
      vGradient(ctx, 0, 17, worldWidth, 40, [
        [0, rgba(look.shadow, look.lit ? 0.3 : 0.22)],
        [1, rgba(look.shadow, 0)],
      ])

      for (const p of patches) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.scale(1, 0.25)
        softGlow(ctx, 0, 0, p.rx, rgba(look.light, look.lit ? 0.07 : 0.1), rgba(look.light, 0))
        ctx.restore()
      }

      for (const s of stones) {
        ctx.fillStyle = rgba(look.stone, s.a)
        ctx.beginPath()
        ctx.ellipse(s.x, s.y, s.w / 2, s.h / 2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = rgba(look.light, s.a * 0.45)
        ctx.fillRect(s.x - s.w * 0.3, s.y - s.h * 0.45, s.w * 0.6, 0.8)
      }

      // tram rails
      for (const ry of [74, 92]) {
        ctx.fillStyle = look.rail
        ctx.fillRect(0, ry, worldWidth, 2.4)
        ctx.fillStyle = rgba(look.railHi, look.lit ? 0.5 : 0.7)
        ctx.fillRect(0, ry - 0.6, worldWidth, 0.9)
      }
    },
    { y: top, scrollFactor: 1, depth: -10, chunk: 1000 },
  )
}
