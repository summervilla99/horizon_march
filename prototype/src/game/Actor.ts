import Phaser from 'phaser'
import { outlined } from '../ui/textStyle'
import type { ActorDef } from './actors'
import { textureKey } from './actors'

/** Where characters' feet stand on every stage, and how far they can wander toward / away from the camera. */
export const FEET_Y = 454
export const BAND_TOP = 410
export const BAND_BOTTOM = 510

const CHAR_H = 185
const DEPTH_SCALE_MIN = 0.82
const DEPTH_SCALE_MAX = 1.18
export const LABEL_DEPTH = 600

export function laneScale(feetY: number) {
  const t = Phaser.Math.Clamp((feetY - BAND_TOP) / (BAND_BOTTOM - BAND_TOP), 0, 1)
  return Phaser.Math.Linear(DEPTH_SCALE_MIN, DEPTH_SCALE_MAX, t)
}

/**
 * One character on stage. All motion (walking, hopping, tumbling) is expressed as offsets that
 * update() folds into the sprite every frame, so tweens and the idle breathing never fight each
 * other over scale / position.
 */
export class Actor {
  readonly def: ActorDef
  readonly image: Phaser.GameObjects.Image
  readonly label: Phaser.GameObjects.Text

  x: number
  /** feet y on the world (also drives depth sorting and the near/far scale) */
  lane: number
  offX = 0
  offY = 0
  rot = 0
  flip = false
  /** extra multiplier on top of the lane scale (e.g. 0.6 for someone standing far up on a ship's deck) */
  scaleMul = 1
  /** force the walking wobble (used by the run montage, where the actor is moved by a tween) */
  marching = false
  /** the stage may dim a character into a sepia memory */
  private labelVisible = true

  private scene: Phaser.Scene
  private walkTarget: number | null = null
  private walkSpeed = 170
  private walkDone: (() => void) | null = null
  private phase = Math.random() * 6
  private walkPhase = 0
  private lastDust = 0

  constructor(scene: Phaser.Scene, def: ActorDef, x: number, lane = FEET_Y) {
    this.scene = scene
    this.def = def
    this.x = x
    this.lane = lane
    this.image = scene.add.image(x, lane, textureKey(def.id)).setOrigin(0.5, 1)
    this.label = scene.add
      .text(x, lane, def.name, outlined(def.color, '13px', true))
      .setOrigin(0.5, 1)
      .setDepth(LABEL_DEPTH)
    this.sync(0, 0)
  }

  get walking() {
    return this.walkTarget !== null
  }

  get visible() {
    return this.image.visible
  }

  setVisible(v: boolean) {
    this.image.setVisible(v)
    this.label.setVisible(v && this.labelVisible)
    return this
  }

  setLabelVisible(v: boolean) {
    this.labelVisible = v
    this.label.setVisible(v && this.image.visible)
    return this
  }

  setAlpha(a: number) {
    this.image.setAlpha(a)
    this.label.setAlpha(a)
    return this
  }

  tint(color: number) {
    this.image.setTint(color)
    return this
  }

  face(dir: 'left' | 'right') {
    this.flip = dir === 'left'
    return this
  }

  faceToward(x: number) {
    if (Math.abs(x - this.x) > 4) this.flip = x < this.x
    return this
  }

  /** Walk to x; resolves on arrival. A new walkTo cancels (and resolves) the previous one. */
  walkTo(x: number, speed = 170): Promise<void> {
    this.walkDone?.()
    this.walkTarget = x
    this.walkSpeed = speed
    return new Promise((resolve) => {
      this.walkDone = resolve
    })
  }

  stop() {
    this.walkTarget = null
    this.walkDone?.()
    this.walkDone = null
  }

  /** Slide the feet to another lane (toward / away from the camera). */
  laneTo(lane: number, ms = 400): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({ targets: this, lane, duration: ms, ease: 'Sine.easeInOut', onComplete: () => resolve() })
    })
  }

  hop(height = 18, ms = 220): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        offY: -height,
        duration: ms,
        yoyo: true,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.offY = 0
          resolve()
        },
      })
    })
  }

  jump(height = 110, ms = 520): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        offY: -height,
        duration: ms / 2,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.offY = 0
          resolve()
        },
      })
    })
  }

  /** A quick sideways tremble — scared, furious, giggling. */
  shake(amount = 5, ms = 420): Promise<void> {
    return new Promise((resolve) => {
      const proxy = { t: 0 }
      this.scene.tweens.add({
        targets: proxy,
        t: 1,
        duration: ms,
        onUpdate: () => {
          this.offX = Math.sin(proxy.t * Math.PI * 10) * amount * (1 - proxy.t)
        },
        onComplete: () => {
          this.offX = 0
          resolve()
        },
      })
    })
  }

  /** Small nod used when a character starts speaking. */
  talk() {
    if (this.offY === 0) void this.hop(6, 110)
  }

  bow(ms = 700): Promise<void> {
    return new Promise((resolve) => {
      const proxy = { t: 0 }
      this.scene.tweens.add({
        targets: proxy,
        t: 1,
        duration: ms / 2,
        yoyo: true,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          this.rot = proxy.t * 0.28 * (this.flip ? -1 : 1)
        },
        onComplete: () => {
          this.rot = 0
          resolve()
        },
      })
    })
  }

  /** Knocked flying and tumbling, then picks themselves back up. dir: +1 flies right, -1 left. */
  fall(dir: 1 | -1, distance = 80): Promise<void> {
    return new Promise((resolve) => {
      const proxy = { t: 0 }
      this.scene.tweens.add({
        targets: proxy,
        t: 1,
        duration: 640,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          const t = proxy.t
          this.offX = dir * distance * t
          this.offY = -Math.sin(Math.PI * Math.min(1, t * 1.04)) * 74
          this.rot = dir * Math.PI * 2 * t
        },
        onComplete: () => {
          this.rot = 0
          this.offY = 0
          // pick yourself up: slide back to where you were standing
          this.scene.tweens.add({
            targets: this,
            offX: 0,
            duration: 520,
            delay: 260,
            ease: 'Sine.easeInOut',
            onComplete: () => resolve(),
          })
        },
      })
    })
  }

  update(time: number, delta: number) {
    let moving = this.marching
    if (this.walkTarget !== null) {
      const dx = this.walkTarget - this.x
      const step = (this.walkSpeed * delta) / 1000
      if (Math.abs(dx) <= step) {
        this.x = this.walkTarget
        this.walkTarget = null
        const done = this.walkDone
        this.walkDone = null
        done?.()
      } else {
        this.x += Math.sign(dx) * step
        this.flip = dx < 0
        moving = true
      }
    }
    this.sync(time, delta, moving)
  }

  private sync(time: number, delta: number, moving = false) {
    if (moving) this.walkPhase += delta * (this.walkSpeed > 240 || this.marching ? 0.02 : 0.012)
    else this.walkPhase = 0
    const wobble = moving ? Math.sin(this.walkPhase) : 0
    const breathe = moving ? 0 : Math.sin(time * 0.0022 + this.phase)

    const base = ((CHAR_H * (this.def.height ?? 1)) / this.image.height) * laneScale(this.lane) * this.scaleMul
    const hunch = 1 - (this.def.hunch ?? 0)
    this.image.setScale(
      base * (1 - wobble * 0.025 + breathe * 0.012),
      base * hunch * (1 + wobble * 0.045 - breathe * 0.008),
    )
    this.image.setRotation(this.rot + wobble * 0.05)
    this.image.setFlipX(this.flip)
    this.image.setPosition(this.x + this.offX, this.lane + this.offY)
    this.image.setDepth(this.lane)

    this.label.setPosition(this.x + this.offX, this.lane + this.offY - this.image.displayHeight - 8)

    if (moving && time - this.lastDust > 300 && this.image.visible) {
      this.lastDust = time
      this.dust()
    }
  }

  private dust() {
    const puff = this.scene.add
      .ellipse(this.x + Phaser.Math.Between(-6, 6), this.lane - 3, 14, 6, 0xcbbf9a, 0.32)
      .setDepth(this.lane - 1)
    this.scene.tweens.add({
      targets: puff,
      scaleX: 2.2,
      scaleY: 1.6,
      alpha: 0,
      y: puff.y - 4,
      duration: 420,
      ease: 'Sine.easeOut',
      onComplete: () => puff.destroy(),
    })
  }

  destroy() {
    this.image.destroy()
    this.label.destroy()
  }
}

