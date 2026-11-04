import Phaser from 'phaser'
import { layout, margin } from '../render/layout'
import { actionButton, onAction, topPanel, UI_DEPTH } from './ui'

export interface MashOpts {
  title: string
  hint: string
  /** seconds to fill the meter */
  seconds: number
  /** taps needed to fill it */
  goal: number
  button?: string
  /** called on every tap with progress 0..1 (the story makes the characters run / cheer here) */
  onTap?: (progress: number) => void
}

/** Tap as fast as you can. Resolves with the final fill (0..1); filling it early ends it early. */
export function tapMash(scene: Phaser.Scene, o: MashOpts): Promise<number> {
  return new Promise((resolve) => {
    const panel = topPanel(scene, o.title, o.hint)
    const barW = Math.min(layout.viewW - margin() * 2 - layout.safeL - layout.safeR, 440)
    const barH = Math.round(24 * layout.uiScale)
    const cx = layout.viewW / 2
    const barY = panel.bottom + Math.round(30 * layout.uiScale)
    const g = scene.add.graphics().setScrollFactor(0).setDepth(UI_DEPTH + 1)

    let taps = 0
    let fill = 0
    let started = false
    let finished = false
    let t0 = 0
    let offAction: (() => void) | null = null

    const draw = () => {
      g.clear()
      const left = cx - barW / 2
      const top = barY - barH / 2
      g.fillStyle(0x000000, 0.45).fillRoundedRect(left - 4, top - 4, barW + 8, barH + 8, 12)
      g.fillStyle(0x2b3350, 1).fillRoundedRect(left, top, barW, barH, 9)
      if (fill > 0.01) {
        g.fillStyle(fill > 0.8 ? 0xffd45a : 0xff8a5c, 1).fillRoundedRect(left, top, Math.max(barH, barW * fill), barH, 9)
      }
    }

    const tap = () => {
      if (!started || finished) return
      taps++
      fill = Math.min(1, taps / o.goal)
      o.onTap?.(fill)
      if (fill >= 1) done()
    }

    const btn = actionButton(scene, o.button ?? '탕탕!', cx, layout.viewH - layout.safeB - margin() - 40 * layout.uiScale, tap)

    const update = (time: number) => {
      if (!started || finished) return
      draw()
      if ((time - t0) / 1000 >= o.seconds) done()
    }

    const done = () => {
      if (finished) return
      finished = true
      scene.events.off(Phaser.Scenes.Events.UPDATE, update)
      offAction?.()
      scene.time.delayedCall(450, () => {
        g.destroy()
        btn.destroy()
        panel.destroy()
        resolve(fill)
      })
    }

    draw()
    scene.events.on(Phaser.Scenes.Events.UPDATE, update)
    offAction = onAction(scene, tap, 600)
    scene.time.delayedCall(600, () => {
      started = true
      t0 = scene.time.now
    })
  })
}
