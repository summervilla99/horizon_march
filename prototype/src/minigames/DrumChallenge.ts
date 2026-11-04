import Phaser from 'phaser'
import { layout, margin, RENDER_SCALE } from '../render/layout'
import { Actor } from '../game/Actor'
import { paintTexture } from '../scenery/paint/canvas'
import { onAction, popText, topPanel, UI_DEPTH } from './ui'
import { touchMin } from '../ui/Button'

export interface DrumOpts {
  leader: Actor
  drummer: Actor
  /** everyone else on stage: they get blown over by every beat, no matter what */
  victims: Actor[]
  beats?: number
  title?: string
  hint?: string
}

const TRAVEL = 1000 // ring shrink time
const WAVE_MS = 260 // shockwave time from the drum to the leader

function drumTexture(scene: Phaser.Scene) {
  return paintTexture(scene, 'prop-drum', 64, 56, (ctx) => {
    ctx.fillStyle = '#7a3322'
    ctx.beginPath()
    ctx.ellipse(32, 40, 26, 11, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(6, 24, 52, 16)
    ctx.fillStyle = '#9b4630'
    ctx.fillRect(6, 24, 52, 6)
    ctx.fillStyle = '#e6d3a2'
    ctx.beginPath()
    ctx.ellipse(32, 24, 26, 11, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#4a1f14'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.strokeStyle = '#2b140d'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 6; i++) {
      ctx.beginPath()
      ctx.moveTo(10 + i * 9, 26)
      ctx.lineTo(14 + i * 8, 46)
      ctx.stroke()
    }
  })
}

/**
 * 청옥의 북 — the drum duel. Rings close in on the target; tapping makes the hero JUMP, and the
 * shockwave that rolls out of the drum only hurts someone still on the ground when it passes.
 * Everyone else on stage is flattened by every beat (that's the joke); the hero tumbles only on a
 * mistimed jump. Always runs to the end.
 */
export async function drumChallenge(scene: Phaser.Scene, o: DrumOpts): Promise<{ dodged: number; total: number }> {
  const total = o.beats ?? 7
  const { leader, drummer } = o
  const drum = scene.add.image(drummer.x - 30 * (drummer.flip ? -1 : 1), drummer.lane + 2, drumTexture(scene)).setOrigin(0.5, 1).setScale(1.15 / RENDER_SCALE).setDepth(drummer.lane + 1)

  const panel = topPanel(scene, o.title ?? '청옥의 북!', o.hint ?? '고리가 안쪽 원에 닿을 때 탭 → 점프해서 충격파를 넘어요')
  const cx = layout.viewW / 2
  const ty = layout.viewH - layout.safeB - margin() - Math.round(70 * layout.uiScale)
  const R0 = Math.round(touchMin() * 1.9)
  const R1 = Math.round(touchMin() * 0.7)

  const target = scene.add.graphics().setScrollFactor(0).setDepth(UI_DEPTH + 1)
  target.lineStyle(5, 0xffe3a0, 1).strokeCircle(cx, ty, R1)
  target.fillStyle(0xffe3a0, 0.18).fillCircle(cx, ty, R1)
  const tText = scene.add
    .text(cx, ty, '탭!', { fontSize: `${Math.round(18 * layout.uiScale)}px`, color: '#fff3c8', fontStyle: 'bold', stroke: '#1b140f', strokeThickness: 4 })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(UI_DEPTH + 2)

  let dodged = 0
  let leaderBusy = false
  const falling = new Set<Actor>()
  const arrivals: number[] = []

  const jump = () => {
    if (leaderBusy) return
    leaderBusy = true
    void leader.jump(120, 640).then(() => {
      leaderBusy = false
    })
    const now = scene.time.now
    const nearest = arrivals.reduce((best, t) => (Math.abs(t - now) < Math.abs(best - now) ? t : best), Infinity)
    const diff = Math.abs(nearest - now)
    if (diff < 90) popText(scene, cx, ty - R1 - 24, '완벽!', '#ffe36e', 24)
    else if (diff < 190) popText(scene, cx, ty - R1 - 24, '좋아요', '#b8f5b0', 20)
  }
  const off = onAction(scene, jump, 500)

  const tumble = (a: Actor, dir: 1 | -1) => {
    if (falling.has(a)) return
    falling.add(a)
    void a.fall(dir, 70).then(() => falling.delete(a))
  }

  const sendWave = (dir: 1 | -1, speed: number, T: number) => {
    const wave = scene.add.ellipse(drummer.x, drummer.lane - 6, 26, 70, 0xffd37a, 0.7).setDepth(drummer.lane + 5)
    wave.setStrokeStyle(4, 0xfff2c8, 0.9)
    const reach = layout.viewW * 3
    scene.tweens.add({
      targets: wave,
      x: drummer.x + dir * reach,
      alpha: 0.2,
      duration: (reach / speed) * 1000,
      ease: 'Linear',
      onComplete: () => wave.destroy(),
    })
    // everyone caught in the wave's path tumbles when it reaches them
    for (const v of o.victims) {
      const d = (v.x - drummer.x) * dir
      if (d <= 0) continue
      scene.time.delayedCall((d / speed) * 1000, () => tumble(v, dir))
    }
    // the hero: judged by whether they're in the air at that moment
    const dl = (leader.x - drummer.x) * dir
    if (dl > 0) {
      scene.time.delayedCall((dl / speed) * 1000, () => {
        if (leader.offY < -34) {
          dodged++
          popText(scene, leader.x, leader.lane - 220, '넘었다!', '#b8f5b0', 22, false)
        } else {
          popText(scene, leader.x, leader.lane - 220, '쿵!', '#ffb0a8', 24, false)
          leaderBusy = true
          void leader.fall(dir, 60).then(() => {
            leaderBusy = false
          })
        }
      })
    }
    void T
  }

  const hit = (T: number) => {
    void drummer.hop(16, 110)
    scene.cameras.main.shake(180, 0.006)
    popText(scene, drummer.x, drummer.lane - 230, '둥!', '#ffd37a', 28, false)
    const dist = Math.abs(leader.x - drummer.x)
    const speed = Math.max(220, dist / (WAVE_MS / 1000))
    sendWave(-1, speed, T)
    sendWave(1, speed, T)
  }

  const gaps = [1500, 1350, 1350, 1000, 1000, 1350, 850, 850, 1350, 700, 700]
  let t = scene.time.now + 900
  const timers: Promise<void>[] = []
  for (let i = 0; i < total; i++) {
    const spawn = t
    const arrive = spawn + TRAVEL
    arrivals.push(arrive)
    timers.push(
      new Promise((resolve) => {
        scene.time.delayedCall(spawn - scene.time.now, () => {
          const ring = scene.add.graphics().setScrollFactor(0).setDepth(UI_DEPTH + 1)
          const prox = { r: R0 }
          scene.tweens.add({
            targets: prox,
            r: R1,
            duration: TRAVEL,
            ease: 'Linear',
            onUpdate: () => {
              ring.clear().lineStyle(6, 0xff7a5c, 0.95).strokeCircle(cx, ty, prox.r)
            },
            onComplete: () => {
              ring.destroy()
              hit(arrive)
              scene.time.delayedCall(WAVE_MS + 500, () => resolve())
            },
          })
        })
      }),
    )
    t += gaps[i % gaps.length]
  }
  await Promise.all(timers)
  await new Promise((r) => scene.time.delayedCall(900, () => r(null)))

  off()
  target.destroy()
  tText.destroy()
  panel.destroy()
  drum.destroy()
  return { dodged, total }
}
