import Phaser from 'phaser'

/**
 * Responsive layout. The game is authored against a 540-unit-tall "stage" (ground line, shop
 * fronts, characters…). What changes with the device is how much of the world around that
 * stage is visible:
 *   - landscape / desktop: stage height fixed at 540, view width follows the window aspect
 *     (960 at 16:9, up to 1170 on very wide phones);
 *   - portrait: view width fixed at 480 and the view grows *taller* than the stage, with the
 *     extra height becoming more sky above and more road/pier below (where the UI lives).
 * Every module reads `layout` at call time, never at import time, so a rotation can swap the
 * numbers and simply restart the scenes (see main.ts).
 */
export const RENDER_SCALE = 2
export const STAGE_H = 540

const PORTRAIT_W = 480
const MAX_LANDSCAPE_W = 1300
const MAX_PORTRAIT_H = 1100
const STREET_HORIZON_Y = 400

export interface Layout {
  viewW: number
  viewH: number
  portrait: boolean
  /** multiplier for UI text / hit-target sizes so they stay readable when the view is scaled down */
  uiScale: number
  /** world y at the top edge of the view (negative when the view is taller than the stage) */
  camY: number
  /** world y at the bottom edge of the view */
  worldBottom: number
  touch: boolean
  /** notch / home-indicator insets, in logical units — backdrops bleed under them, UI stays clear */
  safeL: number
  safeR: number
  safeT: number
  safeB: number
}

export const layout: Layout = {
  viewW: 960,
  viewH: STAGE_H,
  portrait: false,
  uiScale: 1,
  camY: 0,
  worldBottom: STAGE_H,
  touch: false,
  safeL: 0,
  safeR: 0,
  safeT: 0,
  safeB: 0,
}

export function detectTouch(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
}

export interface SafeInsets {
  l: number
  r: number
  t: number
  b: number
}

/** CSS px of notch / home-indicator padding, read from env(safe-area-inset-*). */
export function readSafeInsets(): SafeInsets {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;' +
    'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'
  document.body.appendChild(probe)
  const cs = getComputedStyle(probe)
  const insets = {
    t: parseFloat(cs.paddingTop) || 0,
    r: parseFloat(cs.paddingRight) || 0,
    b: parseFloat(cs.paddingBottom) || 0,
    l: parseFloat(cs.paddingLeft) || 0,
  }
  probe.remove()
  return insets
}

export function computeLayout(stageW: number, stageH: number, safe: SafeInsets = { l: 0, r: 0, t: 0, b: 0 }): Layout {
  const aspect = stageW / Math.max(1, stageH)
  let viewW: number
  let viewH: number
  if (aspect >= PORTRAIT_W / STAGE_H) {
    viewH = STAGE_H
    viewW = Phaser.Math.Clamp(Math.round(STAGE_H * aspect), PORTRAIT_W, MAX_LANDSCAPE_W)
  } else {
    viewW = PORTRAIT_W
    viewH = Math.min(Math.round(PORTRAIT_W / aspect), MAX_PORTRAIT_H)
  }

  const cssScale = Math.min(stageW / viewW, stageH / viewH)
  const uiScale = Phaser.Math.Clamp(0.95 / cssScale, 1, 1.9)
  const camY = -Math.round((viewH - STAGE_H) * 0.6)

  return {
    viewW,
    viewH,
    portrait: aspect < 1,
    uiScale,
    camY,
    worldBottom: camY + viewH,
    touch: detectTouch(),
    safeL: Math.round(safe.l / cssScale),
    safeR: Math.round(safe.r / cssScale),
    safeT: Math.round(safe.t / cssScale),
    safeB: Math.round(safe.b / cssScale),
  }
}

/** Standard HUD margin from the screen edge (logical units), already clear of notches. */
export function margin() {
  return Math.round(14 * layout.uiScale)
}

export function applyLayout(next: Layout) {
  Object.assign(layout, next)
}

/** True when `next` is different enough from the live layout to justify rebuilding scenes. */
export function layoutChangedEnough(next: Layout): boolean {
  const dw = Math.abs(next.viewW - layout.viewW) / layout.viewW
  const dh = Math.abs(next.viewH - layout.viewH) / layout.viewH
  return next.portrait !== layout.portrait || dw > 0.06 || dh > 0.06
}

export function layoutTag(): string {
  return `${layout.viewW}x${layout.viewH}`
}

/** Scaled font size string, e.g. fs(15) -> "17px" on a phone. */
export function fs(px: number): string {
  return `${Math.round(px * layout.uiScale)}px`
}

/** Screen y (view coordinates) of a world y. */
export function worldToScreenY(worldY: number): number {
  return worldY - layout.camY
}

export function streetHorizonScreenY(): number {
  return worldToScreenY(STREET_HORIZON_Y)
}

/** Drops every painted background texture; they're keyed by layout so stale ones are dead weight. */
export function purgeLayoutTextures(textures: Phaser.Textures.TextureManager) {
  for (const key of textures.getTextureKeys()) {
    if (key.startsWith('bg:')) textures.remove(key)
  }
}

// ---- camera helpers -------------------------------------------------------------------------

// every Text object rasterises at RENDER_SCALE so it stays crisp under the zoomed camera
function crispText(obj: Phaser.GameObjects.GameObject) {
  if (obj instanceof Phaser.GameObjects.Text) obj.setResolution(RENDER_SCALE)
}

/**
 * The canvas is RENDER_SCALE x the logical view and the camera is zoomed by the same amount
 * from a top-left origin, so all game code works in logical units while sprites, shapes and
 * text render at full density.
 */
export function setupHiDpiScene(scene: Phaser.Scene) {
  const cam = scene.cameras.main
  cam.setOrigin(0, 0)
  cam.setZoom(RENDER_SCALE)
  cam.scrollY = layout.camY
  cam.disableCull = true

  // scene.events outlives scene restarts, so make sure the hook is registered only once
  scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, crispText)
  scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, crispText)
}

/** Horizontal camera follow in logical units (Phaser's startFollow assumes a centre-origin camera). */
export function followCameraX(scene: Phaser.Scene, targetX: number, worldWidth: number, lerp = 0.08) {
  const cam = scene.cameras.main
  const desired = Phaser.Math.Clamp(targetX - layout.viewW / 2, 0, Math.max(0, worldWidth - layout.viewW))
  cam.scrollX += (desired - cam.scrollX) * lerp
}

export function snapCameraX(scene: Phaser.Scene, targetX: number, worldWidth: number) {
  scene.cameras.main.scrollX = Phaser.Math.Clamp(targetX - layout.viewW / 2, 0, Math.max(0, worldWidth - layout.viewW))
}
