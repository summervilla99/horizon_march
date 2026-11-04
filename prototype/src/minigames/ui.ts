import Phaser from 'phaser'
import { fs, layout, margin } from '../render/layout'
import { Button, touchMin } from '../ui/Button'
import { Panel } from '../ui/Panel'

export const UI_DEPTH = 1100

/**
 * Wires "the player pressed the action" for a minigame: any tap that isn't on another UI element,
 * Space, or ↑. Presses within `guardMs` of the start are ignored so the tap that dismissed the
 * previous dialogue line can't also trigger the game. Returns an unsubscribe function.
 */
export function onAction(scene: Phaser.Scene, handler: () => void, guardMs = 320): () => void {
  const born = performance.now()
  const fire = () => {
    if (performance.now() - born < guardMs) return
    handler()
  }
  const pointer = (_p: Phaser.Input.Pointer, over: unknown[]) => {
    if (over.length === 0) fire()
  }
  scene.input.on('pointerdown', pointer)
  const kb = scene.input.keyboard!
  kb.on('keydown-SPACE', fire)
  kb.on('keydown-UP', fire)
  return () => {
    scene.input.off('pointerdown', pointer)
    kb.off('keydown-SPACE', fire)
    kb.off('keydown-UP', fire)
  }
}

/** Big round action button used by the timing games (also reachable by tapping anywhere). */
export function actionButton(scene: Phaser.Scene, label: string, x: number, y: number, onPress: () => void) {
  const r = Math.round(touchMin() * 1.05)
  return new Button(scene, {
    x,
    y,
    w: r * 3,
    h: r * 1.25,
    label,
    fontPx: 20,
    fill: '#7a2e2e',
    stroke: '#ffb0a0',
    depth: UI_DEPTH + 5,
    onPress,
  })
}

/** Pops a short text above a point and floats it away. Scroll-aware: pass screen coords with scrollFactor 0. */
export function popText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = '#fff3b0',
  px = 22,
  pinned = true,
) {
  const t = scene.add
    .text(x, y, text, { fontSize: fs(px), color, fontStyle: 'bold', stroke: '#1b140f', strokeThickness: 5 })
    .setOrigin(0.5)
    .setDepth(UI_DEPTH + 20)
    .setScrollFactor(pinned ? 0 : 1)
  t.setScale(0.6)
  scene.tweens.add({ targets: t, scale: 1.1, duration: 160, ease: 'Back.easeOut' })
  scene.tweens.add({
    targets: t,
    y: y - 38,
    alpha: 0,
    delay: 380,
    duration: 520,
    onComplete: () => t.destroy(),
  })
  return t
}

/** A top-centred instruction panel. Returns helpers to update/destroy. */
export function topPanel(scene: Phaser.Scene, title: string, sub: string) {
  const w = Math.min(layout.viewW - margin() * 2 - layout.safeL - layout.safeR, 520)
  const pad = Math.round(14 * layout.uiScale)
  const titleT = scene.add
    .text(0, 0, title, { fontSize: fs(18), color: '#ffe3a0', fontStyle: 'bold', align: 'center', wordWrap: { width: w - pad * 2 } })
    .setOrigin(0.5, 0)
    .setScrollFactor(0)
    .setDepth(UI_DEPTH + 2)
  const subT = scene.add
    .text(0, 0, sub, { fontSize: fs(13), color: '#d9e2ff', align: 'center', wordWrap: { width: w - pad * 2 } })
    .setOrigin(0.5, 0)
    .setScrollFactor(0)
    .setDepth(UI_DEPTH + 2)
  const h = pad * 2 + titleT.height + 6 + subT.height
  const cx = layout.viewW / 2
  const top = layout.safeT + margin() + Math.round(46 * layout.uiScale) // leave the ☰ button's row clear
  const panel = new Panel(scene, cx, top + h / 2, w, h, { fill: 0x10131d, fillAlpha: 0.9, border: 0xf2c46b })
    .setScrollFactor(0)
    .setDepth(UI_DEPTH)
  titleT.setPosition(cx, top + pad)
  subT.setPosition(cx, top + pad + titleT.height + 6)
  return {
    bottom: top + h,
    setSub: (s: string) => subT.setText(s),
    setVisible: (v: boolean) => {
      panel.setVisible(v)
      titleT.setVisible(v)
      subT.setVisible(v)
    },
    destroy: () => {
      panel.destroy()
      titleT.destroy()
      subT.destroy()
    },
  }
}
