import Phaser from 'phaser'
import type { DialogueTree } from './types'
import { fs, layout } from '../render/layout'
import { Panel } from '../ui/Panel'
import { Button, touchMin } from '../ui/Button'

const TEXT_SPEED_MS = 20
const DEPTH = 1000
/** A tap/keypress that *started* or *ended* something must not also advance it — see guard(). */
const INPUT_GUARD_MS = 220

/**
 * Bottom-anchored dialogue panel. Sized from the current layout (so it works in portrait and
 * landscape), grows to fit each line, and is fully operable by touch: tap anywhere to advance
 * (or finish the typewriter), tap a choice button to pick it. Keyboard (Space, 1/2/3) still works.
 */
export class DialogueBox {
  private panel: Panel
  private nameText: Phaser.GameObjects.Text
  private bodyText: Phaser.GameObjects.Text
  private continuePrompt: Phaser.GameObjects.Text
  private choiceButtons: Button[] = []

  private tree: DialogueTree | null = null
  private currentId: string | null = null
  private fullText = ''
  private typeTimer?: Phaser.Time.TimerEvent
  private isTyping = false
  private showingChoices = false
  private active = false
  private closing = false
  private activatedAt = 0

  // geometry of the current node, computed in layoutForNode()
  private panelLeft = 0
  private panelW = 0
  private pad = 0

  /** Called once the conversation reaches a node with no `next` and no `choices`. */
  public onEnd?: () => void
  /** Called with the index of the chosen option when a choice's `next` is the empty string. */
  /** Called whenever a line starts (so the stage can make the speaker nod). */
  public onLine?: (speaker: string, text: string) => void
  public onChoice?: (index: number) => void

  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.panel = new Panel(scene, 0, 0, 100, 100, { fill: 0x11141f, fillAlpha: 0.95, border: 0x5a6b9c })
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false)

    this.nameText = scene.add
      .text(0, 0, '', { fontSize: fs(15), color: '#ffd37a', fontStyle: 'bold' })
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false)

    this.bodyText = scene.add
      .text(0, 0, '', { fontSize: fs(15), color: '#f3f3f3', lineSpacing: Math.round(6 * layout.uiScale) })
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false)

    this.continuePrompt = scene.add
      .text(0, 0, layout.touch ? '탭하여 계속 ▶' : '▶ 계속 (Space)', { fontSize: fs(12), color: '#9fb0e0' })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false)

    scene.input.keyboard!.on('keydown-SPACE', () => this.handleAdvance())
    scene.input.keyboard!.on('keydown-ONE', () => this.handleChoice(0))
    scene.input.keyboard!.on('keydown-TWO', () => this.handleChoice(1))
    scene.input.keyboard!.on('keydown-THREE', () => this.handleChoice(2))

    // tap anywhere that isn't another UI element
    scene.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: unknown[]) => {
      if (over.length === 0) this.handleAdvance()
    })
  }

  /** Plays [speaker, text] pairs as one conversation and resolves when it ends. */
  play(lines: ReadonlyArray<readonly [string, string]>): Promise<void> {
    if (!lines.length) return Promise.resolve()
    const tree: DialogueTree = {}
    lines.forEach(([speaker, text], i) => {
      tree[`l${i}`] = { id: `l${i}`, speaker, text, next: i < lines.length - 1 ? `l${i + 1}` : undefined }
    })
    return new Promise((resolve) => {
      this.onEnd = () => resolve()
      this.start(tree, 'l0')
    })
  }

  isActive(): boolean {
    return this.active
  }

  start(tree: DialogueTree, startId: string) {
    this.tree = tree
    this.currentId = startId
    this.active = true
    this.closing = false
    this.activatedAt = performance.now()
    this.panel.setVisible(true)
    this.nameText.setVisible(true)
    this.bodyText.setVisible(true)
    this.renderCurrentNode()
  }

  /** True while a press/tap is too close to a state change to be meant for this box. */
  private guard() {
    return performance.now() - this.activatedAt < INPUT_GUARD_MS
  }

  private renderCurrentNode() {
    if (!this.tree || !this.currentId) return
    const node = this.tree[this.currentId]
    this.activatedAt = performance.now()
    this.clearChoices()
    this.showingChoices = false
    this.continuePrompt.setVisible(false)

    this.nameText.setText(node.speaker)
    this.onLine?.(node.speaker, node.text)
    this.nameText.setColor(node.speaker ? '#ffd37a' : '#9fb0e0')
    this.fullText = node.text
    this.layoutForNode(node.text, node.choices?.length ?? 0)
    this.bodyText.setText('')
    this.startTypewriter()
  }

  /** Sizes and positions the panel for this node's text (and choice rows, if any). */
  private layoutForNode(text: string, choiceCount: number) {
    const margin = Math.round(12 * layout.uiScale)
    this.pad = Math.round(16 * layout.uiScale)
    this.panelW = Math.min(880, layout.viewW - margin * 2)
    this.panelLeft = (layout.viewW - this.panelW) / 2

    this.bodyText.setWordWrapWidth(this.panelW - this.pad * 2)
    this.bodyText.setText(text)
    const bodyH = this.bodyText.height
    const nameH = this.nameText.height
    const rowH = touchMin()
    const rowGap = Math.round(8 * layout.uiScale)
    const gap = Math.round(8 * layout.uiScale)
    const footH = choiceCount > 0 ? choiceCount * (rowH + rowGap) : this.continuePrompt.height + gap

    const panelH = this.pad + nameH + gap + bodyH + gap + footH + this.pad
    const bottom = layout.viewH - margin
    const top = bottom - panelH
    const cx = layout.viewW / 2

    this.panel.resize(this.panelW, panelH).setPosition(cx, top + panelH / 2)
    this.nameText.setPosition(this.panelLeft + this.pad, top + this.pad)
    this.bodyText.setPosition(this.panelLeft + this.pad, top + this.pad + nameH + gap)
    this.continuePrompt.setPosition(this.panelLeft + this.panelW - this.pad, bottom - this.pad + 2)

    this.choiceTop = top + this.pad + nameH + gap + bodyH + gap
    this.choiceRowH = rowH
    this.choiceRowGap = rowGap
  }

  private choiceTop = 0
  private choiceRowH = 0
  private choiceRowGap = 0

  private startTypewriter() {
    this.isTyping = true
    let charIndex = 0
    this.typeTimer?.remove()
    this.typeTimer = this.scene.time.addEvent({
      delay: TEXT_SPEED_MS,
      loop: true,
      callback: () => {
        charIndex++
        this.bodyText.setText(this.fullText.slice(0, charIndex))
        if (charIndex >= this.fullText.length) {
          this.typeTimer?.remove()
          this.onTypingComplete()
        }
      },
    })
  }

  private skipTypewriter() {
    this.typeTimer?.remove()
    this.bodyText.setText(this.fullText)
    this.onTypingComplete()
  }

  private onTypingComplete() {
    this.isTyping = false
    const node = this.tree && this.currentId ? this.tree[this.currentId] : undefined
    if (!node) return

    if (node.choices && node.choices.length > 0) {
      this.renderChoices(node.choices.map((c) => c.text))
    } else {
      this.continuePrompt.setVisible(true)
    }
  }

  private renderChoices(options: string[]) {
    this.showingChoices = true
    this.clearChoices()
    const rowW = this.panelW - this.pad * 2
    options.forEach((text, i) => {
      const y = this.choiceTop + i * (this.choiceRowH + this.choiceRowGap) + this.choiceRowH / 2
      const button = new Button(this.scene, {
        x: layout.viewW / 2,
        y,
        w: rowW,
        h: this.choiceRowH,
        label: `${i + 1}   ${text}`,
        fontPx: 14,
        fill: '#243a2f',
        stroke: '#7fd69a',
        textColor: '#d8f7e1',
        depth: DEPTH + 2,
        onPress: () => this.handleChoice(i, true),
      })
      this.choiceButtons.push(button)
    })
  }

  private clearChoices() {
    this.choiceButtons.forEach((b) => b.destroy())
    this.choiceButtons = []
  }

  private handleAdvance() {
    if (!this.active || this.closing || this.guard()) return
    if (this.isTyping) {
      this.skipTypewriter()
      return
    }
    if (this.showingChoices) return // choices need a number key or a tap on a button

    const node = this.tree && this.currentId ? this.tree[this.currentId] : undefined
    if (node?.next) {
      this.currentId = node.next
      this.renderCurrentNode()
    } else {
      this.end()
    }
  }

  private handleChoice(index: number, fromButton = false) {
    if (!this.active || this.closing || !this.showingChoices || this.isTyping) return
    if (!fromButton && this.guard()) return
    const node = this.tree && this.currentId ? this.tree[this.currentId] : undefined
    const choice = node?.choices?.[index]
    if (!choice) return
    if (!choice.next) {
      this.onChoice?.(index)
      this.end()
      return
    }
    this.currentId = choice.next
    this.renderCurrentNode()
  }

  private end() {
    // Stay "active" until the next tick: the press that closes this box is still being dispatched
    // to other listeners, and they must keep seeing a modal (otherwise the same tap/keypress would
    // also walk the player or re-open the conversation).
    this.closing = true
    this.typeTimer?.remove()
    this.panel.setVisible(false)
    this.nameText.setVisible(false)
    this.bodyText.setVisible(false)
    this.continuePrompt.setVisible(false)
    this.clearChoices()
    this.tree = null
    this.currentId = null
    this.scene.time.delayedCall(0, () => {
      this.active = false
      this.closing = false
      this.onEnd?.()
    })
  }
}
