import Phaser from 'phaser'
import { layout, margin, RENDER_SCALE } from '../render/layout'
import { Actor } from '../game/Actor'
import { paintTexture } from '../scenery/paint/canvas'
import { actionButton, onAction, popText, topPanel } from './ui'

export interface RiceOpts {
  leader: Actor
  thrower: Actor
  beats?: number
}

const FLIGHT_MS = 900

function bowlTexture(scene: Phaser.Scene) {
  return paintTexture(scene, 'prop-ricebowl', 40, 34, (ctx) => {
    ctx.fillStyle = '#fffdf4'
    ctx.beginPath()
    ctx.ellipse(20, 14, 15, 10, 0, Math.PI, 0)
    ctx.fill()
    ctx.fillStyle = '#e8e2cf'
    for (let i = 0; i < 9; i++) ctx.fillRect(9 + i * 2.6, 7 + (i % 3) * 2, 1.6, 2)
    ctx.fillStyle = '#3d5a7a'
    ctx.beginPath()
    ctx.moveTo(4, 14)
    ctx.lineTo(36, 14)
    ctx.quadraticCurveTo(34, 31, 20, 31)
    ctx.quadraticCurveTo(6, 31, 4, 14)
    ctx.fill()
    ctx.strokeStyle = '#f2ead0'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(8, 19)
    ctx.lineTo(32, 19)
    ctx.stroke()
  })
}

/** 청옥's rice barrage: bowls sail along the ground toward the hero; jump (tap / Space / ↑) to clear them. */
export async function riceDodge(scene: Phaser.Scene, o: RiceOpts): Promise<{ dodged: number; total: number }> {
  const total = o.beats ?? 7
  const { leader, thrower } = o
  const key = bowlTexture(scene)
  const panel = topPanel(scene, '밥 공격 피하기!', '날아오는 밥그릇이 가까워지면 탭 → 점프!')
  let dodged = 0
  let busy = false
  const jump = () => {
    if (busy) return
    busy = true
    void leader.jump(116, 620).then(() => (busy = false))
  }
  const off = onAction(scene, jump, 400)
  const btn = actionButton(scene, '점프! ⤒', layout.viewW / 2, layout.viewH - layout.safeB - margin() - 40 * layout.uiScale, jump)

  const gaps = [1500, 1200, 1200, 900, 1100, 800, 1000, 800]
  const jobs: Promise<void>[] = []
  let t = 800
  for (let i = 0; i < total; i++) {
    jobs.push(
      new Promise((resolve) => {
        scene.time.delayedCall(t, () => {
          void thrower.hop(16, 140)
          popText(scene, thrower.x, thrower.lane - 225, i % 2 ? '먹어!' : '밥!', '#fff3b0', 22, false)
          const bowl = scene.add.image(thrower.x - 20, thrower.lane - 70, key).setScale(1 / RENDER_SCALE).setDepth(thrower.lane + 3)
          const dir = leader.x < thrower.x ? -1 : 1
          const x0 = bowl.x
          const x1 = leader.x
          const prox = { u: 0 }
          let judged = false
          scene.tweens.add({
            targets: prox,
            u: 1.35,
            duration: FLIGHT_MS * 1.35,
            ease: 'Linear',
            onUpdate: () => {
              bowl.x = x0 + (x1 - x0) * prox.u
              bowl.y = thrower.lane - 70 + Math.sin(Math.PI * Math.min(1, prox.u)) * -34 + Math.min(1, prox.u) * 60
              bowl.rotation = prox.u * 12 * -dir
              if (!judged && prox.u >= 1) {
                judged = true
                if (leader.offY < -34) {
                  dodged++
                  popText(scene, leader.x, leader.lane - 225, '피했다!', '#b8f5b0', 22, false)
                } else {
                  popText(scene, leader.x, leader.lane - 225, '철퍼덕!', '#ffb0a8', 24, false)
                  scene.cameras.main.shake(120, 0.005)
                  leader.tint(0xfff2c8)
                  scene.time.delayedCall(350, () => leader.tint(0xffffff))
                  void leader.shake(6, 400)
                }
              }
            },
            onComplete: () => {
              bowl.destroy()
              resolve()
            },
          })
        })
      }),
    )
    t += gaps[i % gaps.length]
  }
  await Promise.all(jobs)
  await new Promise((r) => scene.time.delayedCall(500, () => r(null)))
  off()
  btn.destroy()
  panel.destroy()
  return { dodged, total }
}
