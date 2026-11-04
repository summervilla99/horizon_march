import Phaser from 'phaser'
import { layout, margin } from '../render/layout'
import { actionButton, onAction, popText, topPanel, UI_DEPTH } from './ui'

export type Grade = 'perfect' | 'good' | 'miss'

export interface TimingOpts {
  title: string
  hint: string
  rounds: number
  /** half-width of the sweet zone as a fraction of the bar (shrinks a little each round) */
  zone?: number
  /** back-and-forth cycles per second of the first round (speeds up each round) */
  speed?: number
  /** words on the big button */
  button?: string
  zoneColor?: number
  /** an optional line above the bar per round, e.g. the price being offered */
  roundLabel?: (round: number) => string
  /** awaited after each round with the grade — the story hooks its reaction lines in here */
  after?: (round: number, grade: Grade) => Promise<void>
}

const GRADE_TEXT: Record<Grade, [string, string]> = {
  perfect: ['완벽!', '#ffe36e'],
  good: ['좋아요!', '#b8f5b0'],
  miss: ['아쉬워요…', '#ffb0a8'],
}

/**
 * Stop-the-needle game: a marker slides back and forth, tap to stop it inside the green zone.
 * Never blocks the story — a miss only changes how the characters react afterwards.
 */
export function timingBar(scene: Phaser.Scene, o: TimingOpts): Promise<Grade[]> {
  return new Promise((resolve) => {
    const results: Grade[] = []
    const panel = topPanel(scene, o.title, o.hint)
    const barW = Math.min(layout.viewW - margin() * 2 - layout.safeL - layout.safeR, 460)
    const barH = Math.round(30 * layout.uiScale)
    const cx = layout.viewW / 2
    const barY = panel.bottom + Math.round(44 * layout.uiScale)

    const g = scene.add.graphics().setScrollFactor(0).setDepth(UI_DEPTH + 1)
    const label = scene.add
      .text(cx, barY - barH / 2 - 14, '', { fontSize: `${Math.round(17 * layout.uiScale)}px`, color: '#fff', fontStyle: 'bold', stroke: '#1b140f', strokeThickness: 4 })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(UI_DEPTH + 2)
    const btn = actionButton(scene, o.button ?? '지금!', cx, layout.viewH - layout.safeB - margin() - 40 * layout.uiScale, () => press())

    let round = 0
    let u = 0
    let centre = 0.5
    let hw = o.zone ?? 0.15
    let startedAt = 0
    let speed = o.speed ?? 0.55
    let running = false
    let offAction: (() => void) | null = null

    const draw = () => {
      g.clear()
      const left = cx - barW / 2
      const top = barY - barH / 2
      g.fillStyle(0x000000, 0.45).fillRoundedRect(left - 4, top - 4, barW + 8, barH + 8, 12)
      g.fillStyle(0x2b3350, 1).fillRoundedRect(left, top, barW, barH, 9)
      const zl = left + (centre - hw) * barW
      g.fillStyle(o.zoneColor ?? 0x4fbf6b, 1).fillRoundedRect(zl, top, hw * 2 * barW, barH, 6)
      g.fillStyle(0xfff6c0, 0.9).fillRect(left + centre * barW - 2, top, 4, barH)
      const mx = left + u * barW
      g.fillStyle(0xffffff, 1).fillRoundedRect(mx - 5, top - 8, 10, barH + 16, 4)
      g.lineStyle(2, 0x1b140f, 1).strokeRoundedRect(mx - 5, top - 8, 10, barH + 16, 4)
    }

    const update = (time: number) => {
      if (!running) return
      const t = (time - startedAt) / 1000
      u = 0.5 - 0.5 * Math.cos(2 * Math.PI * speed * t)
      draw()
    }

    const beginRound = () => {
      centre = Phaser.Math.FloatBetween(0.26, 0.74)
      hw = Math.max(0.08, (o.zone ?? 0.15) - round * 0.015)
      speed = (o.speed ?? 0.55) + round * 0.12
      label.setText(o.roundLabel?.(round) ?? `${round + 1} / ${o.rounds}`)
      startedAt = scene.time.now
      running = true
      offAction?.()
      offAction = onAction(scene, press, 280)
    }

    const press = () => {
      if (!running) return
      running = false
      offAction?.()
      offAction = null
      const d = Math.abs(u - centre)
      const grade: Grade = d < hw * 0.4 ? 'perfect' : d < hw ? 'good' : 'miss'
      results.push(grade)
      draw()
      const [txt, col] = GRADE_TEXT[grade]
      popText(scene, cx, barY - barH - 30, txt, col, 26)
      scene.time.delayedCall(720, async () => {
        const idx = round
        round++
        if (o.after) {
          panel.setVisible(false)
          g.setVisible(false)
          label.setVisible(false)
          btn.setVisible(false)
          await o.after(idx, grade)
          panel.setVisible(true)
          g.setVisible(true)
          label.setVisible(true)
          btn.setVisible(true)
        }
        if (round >= o.rounds) finish()
        else beginRound()
      })
    }

    const finish = () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, update)
      offAction?.()
      g.destroy()
      label.destroy()
      btn.destroy()
      panel.destroy()
      resolve(results)
    }

    scene.events.on(Phaser.Scenes.Events.UPDATE, update)
    beginRound()
  })
}

/** Convenience: 0..1 quality from grades. */
export function score(grades: Grade[]) {
  if (!grades.length) return 0
  return grades.reduce((s, g) => s + (g === 'perfect' ? 1 : g === 'good' ? 0.6 : 0), 0) / grades.length
}
