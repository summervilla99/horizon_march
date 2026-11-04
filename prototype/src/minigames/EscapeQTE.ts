import Phaser from 'phaser'
import { fs, layout } from '../render/layout'
import { Panel } from '../ui/Panel'
import { Button, touchMin } from '../ui/Button'

export type EscapeResult = 'CLEAN' | 'CLOSE'
type PromptKey = 'LEFT' | 'RIGHT' | 'SPACE'

const DEPTH = 1200
const INPUT_GUARD_MS = 220

const PROMPT_COUNT = 4
const BASE_WINDOW_MS = 900
const WINDOW_STEP_MS = 90

const DISTANCE_MIN = 0
const DISTANCE_MAX = 100
const DISTANCE_START = 55
const SUCCESS_PUSH = 16
const FAIL_PULL = 22

type Part = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text

/**
 * Reaction QTE for the military-police chase. Answer with ←/→/Space *or* the three large
 * on-panel buttons (the only touch controls this game shows, and only while this is running).
 */
export class EscapeQTE {
  private panel!: Panel
  private parts: Part[] = []
  private buttons: Button[] = []

  private promptText!: Phaser.GameObjects.Text
  private hintText!: Phaser.GameObjects.Text
  private timerBar!: Phaser.GameObjects.Rectangle
  private chaserMarker!: Phaser.GameObjects.Rectangle
  private chaserLabel!: Phaser.GameObjects.Text
  private resultText!: Phaser.GameObjects.Text

  private trackLeft = 0
  private trackRight = 0

  private active = false
  private activatedAt = 0
  private promptIndex = 0
  private failCount = 0
  private distance = DISTANCE_START
  private currentKey: PromptKey = 'LEFT'
  private timerTween?: Phaser.Tweens.Tween
  private onComplete?: (result: EscapeResult) => void

  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.build()
    const key = (k: PromptKey) => () => this.handleKey(k, false)
    scene.input.keyboard!.on('keydown-LEFT', key('LEFT'))
    scene.input.keyboard!.on('keydown-RIGHT', key('RIGHT'))
    scene.input.keyboard!.on('keydown-SPACE', key('SPACE'))
  }

  isActive(): boolean {
    return this.active
  }

  start(onComplete: (result: EscapeResult) => void) {
    this.onComplete = onComplete
    this.active = true
    this.activatedAt = performance.now()
    this.promptIndex = 0
    this.failCount = 0
    this.distance = DISTANCE_START
    this.resultText.setText('')
    this.setVisible(true)
    this.updateTrack()
    this.nextPrompt()
  }

  private nextPrompt() {
    if (this.promptIndex >= PROMPT_COUNT) {
      this.finish()
      return
    }

    const keys: PromptKey[] = ['LEFT', 'RIGHT', 'SPACE']
    this.currentKey = Phaser.Utils.Array.GetRandom(keys)
    this.promptText.setText(this.labelFor(this.currentKey)).setColor('#ffffff')
    this.hintText.setText(`${this.promptIndex + 1} / ${PROMPT_COUNT}`)

    const windowMs = Math.max(400, BASE_WINDOW_MS - this.promptIndex * WINDOW_STEP_MS)
    this.timerBar.setScale(1, 1)
    this.timerTween?.stop()
    this.timerTween = this.scene.tweens.add({
      targets: this.timerBar,
      scaleX: { from: 1, to: 0 },
      duration: windowMs,
      ease: 'Linear',
      onComplete: () => this.resolvePrompt(false),
    })
  }

  private labelFor(key: PromptKey): string {
    if (key === 'LEFT') return '◀ 왼쪽 골목으로!'
    if (key === 'RIGHT') return '오른쪽으로! ▶'
    return '뛰어넘어!'
  }

  private handleKey(key: PromptKey, fromButton: boolean) {
    if (!this.active) return
    if (!fromButton && performance.now() - this.activatedAt < INPUT_GUARD_MS) return
    this.resolvePrompt(key === this.currentKey)
  }

  private resolvePrompt(success: boolean) {
    if (!this.active) return
    this.timerTween?.stop()

    if (success) {
      this.distance = Phaser.Math.Clamp(this.distance + SUCCESS_PUSH, DISTANCE_MIN, DISTANCE_MAX)
      this.promptText.setColor('#7CFF9B')
    } else {
      this.failCount++
      this.distance = Phaser.Math.Clamp(this.distance - FAIL_PULL, DISTANCE_MIN, DISTANCE_MAX)
      this.promptText.setColor('#FF6B6B')
      this.scene.cameras.main.shake(90, 0.003)
    }

    this.updateTrack()
    this.promptIndex++
    this.scene.time.delayedCall(260, () => this.nextPrompt())
  }

  private updateTrack() {
    const t = this.distance / DISTANCE_MAX
    this.chaserMarker.x = Phaser.Math.Linear(this.trackLeft, this.trackRight, t)
    this.chaserLabel.x = this.chaserMarker.x
  }

  private finish() {
    const result: EscapeResult = this.failCount <= 1 ? 'CLEAN' : 'CLOSE'
    this.resultText
      .setText(result === 'CLEAN' ? '무사히 따돌렸다!' : '가까스로 도망쳤다...!')
      .setColor(result === 'CLEAN' ? '#7CFF9B' : '#FFE066')

    this.scene.time.delayedCall(1200, () => {
      this.active = false
      this.setVisible(false)
      this.onComplete?.(result)
    })
  }

  private build() {
    const u = layout.uiScale
    const margin = Math.round(12 * u)
    const panelW = Math.min(760, layout.viewW - margin * 2)
    const btnH = Math.max(touchMin(), Math.round(56 * u))
    const panelH = Math.round(236 * u) + btnH + Math.round(16 * u)
    const cx = layout.viewW / 2
    const cy = layout.portrait ? layout.viewH * 0.4 : layout.viewH * 0.48
    const top = cy - panelH / 2

    this.panel = new Panel(this.scene, cx, cy, panelW, panelH, { fill: 0x0d0f1c, fillAlpha: 0.95, border: 0x8c2f2f })

    const title = this.scene.add
      .text(cx, top + 22 * u, '헌병이다! 피해라!', { fontSize: fs(17), color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5)
    this.hintText = this.scene.add
      .text(cx, top + 46 * u, '', { fontSize: fs(12), color: '#aab4d8' })
      .setOrigin(0.5)
    this.promptText = this.scene.add
      .text(cx, top + 76 * u, '', { fontSize: fs(22), fontStyle: 'bold', color: '#ffffff', align: 'center' })
      .setOrigin(0.5)

    const timerW = Math.min(400, panelW - 64 * u)
    const timerY = top + 106 * u
    const timerBg = this.scene.add.rectangle(cx, timerY, timerW, 10, 0x2a2f45)
    this.timerBar = this.scene.add.rectangle(cx, timerY, timerW, 10, 0xd8a33c)

    this.trackLeft = cx - panelW / 2 + 40 * u
    this.trackRight = cx + panelW / 2 - 40 * u
    const trackY = top + 170 * u
    const trackBg = this.scene.add.rectangle(cx, trackY, this.trackRight - this.trackLeft + 24, 22, 0x2a2f45)
    const safeLabel = this.scene.add
      .text(this.trackRight, trackY - 28 * u, '안전', { fontSize: fs(11), color: '#9fe0a0' })
      .setOrigin(1, 0)
    const dangerLabel = this.scene.add
      .text(this.trackLeft, trackY - 28 * u, '위험', { fontSize: fs(11), color: '#ff8a8a' })
      .setOrigin(0, 0)

    const playerMarker = this.scene.add.rectangle(this.trackLeft, trackY, 16, 24, 0xd8c7a1)
    const playerLabel = this.scene.add
      .text(this.trackLeft, trackY + 20 * u, '가네무라', { fontSize: fs(11), color: '#ffe9b3' })
      .setOrigin(0.5, 0)

    this.chaserMarker = this.scene.add.rectangle(this.trackLeft, trackY, 16, 24, 0x6b7a4a)
    this.chaserLabel = this.scene.add
      .text(this.trackLeft, trackY - 46 * u, '헌병', { fontSize: fs(11), color: '#c9d49a' })
      .setOrigin(0.5)

    this.resultText = this.scene.add
      .text(cx, trackY + 46 * u, '', { fontSize: fs(18), fontStyle: 'bold' })
      .setOrigin(0.5)

    this.parts = [
      title,
      this.hintText,
      this.promptText,
      timerBg,
      this.timerBar,
      trackBg,
      safeLabel,
      dangerLabel,
      playerMarker,
      playerLabel,
      this.chaserMarker,
      this.chaserLabel,
      this.resultText,
    ]
    for (const p of this.parts) {
      p.setScrollFactor(0)
      p.setDepth(DEPTH + 1)
    }
    this.panel.setScrollFactor(0).setDepth(DEPTH)

    // answer buttons: ◀ / jump / ▶
    const btnGap = Math.round(10 * u)
    const btnW = (panelW - 32 * u - btnGap * 2) / 3
    const btnY = top + panelH - 16 * u - btnH / 2
    const defs: { key: PromptKey; label: string; fill: string; stroke: string }[] = [
      { key: 'LEFT', label: '◀  왼쪽', fill: '#3a2f1c', stroke: '#e0b95c' },
      { key: 'SPACE', label: '점프', fill: '#2d3a63', stroke: '#8fa2e0' },
      { key: 'RIGHT', label: '오른쪽  ▶', fill: '#3a2f1c', stroke: '#e0b95c' },
    ]
    defs.forEach((d, i) => {
      this.buttons.push(
        new Button(this.scene, {
          x: cx - panelW / 2 + 16 * u + btnW / 2 + i * (btnW + btnGap),
          y: btnY,
          w: btnW,
          h: btnH,
          label: d.label,
          fontPx: 16,
          fill: d.fill,
          stroke: d.stroke,
          depth: DEPTH + 2,
          onPress: () => this.handleKey(d.key, true),
        }),
      )
    })

    this.setVisible(false)
  }

  private setVisible(v: boolean) {
    this.panel.setVisible(v)
    for (const p of this.parts) p.setVisible(v)
    for (const b of this.buttons) b.setVisible(v)
  }
}
