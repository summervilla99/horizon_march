import Phaser from 'phaser'
import { DialogueBox } from '../dialogue/DialogueBox'
import { enlistmentTree } from '../dialogue/data/enlistment'
import { buildHarborBackdrop } from '../scenery/HarborBackdrop'
import { layout, setupHiDpiScene } from '../render/layout'
import { outlined } from '../ui/textStyle'
import { Button, touchMin } from '../ui/Button'

import yasudaArt from '../assets/characters/yasuda.png'
import ganemuraArt from '../assets/characters/ganemura.png'
import gangseongArt from '../assets/characters/gangseong.png'
import sunjuArt from '../assets/characters/sunju.png'

const GROUND_Y = 420
const CHAR_HEIGHT = 185

export class Ch5EnlistmentScene extends Phaser.Scene {
  private dialogueBox!: DialogueBox
  private backButton!: Button

  constructor() {
    super('Ch5EnlistmentScene')
  }

  preload() {
    // Keys already loaded by PrologueScene in the normal flow; re-declaring here
    // makes this scene safe to enter directly too (Phaser skips an existing key).
    this.load.image('tex-player', yasudaArt)
    this.load.image('tex-npc-ganemura', ganemuraArt)
    this.load.image('tex-npc-gangseong', gangseongArt)
    this.load.image('tex-npc-sunju', sunjuArt)
  }

  create() {
    setupHiDpiScene(this)
    // script p.12 "아침. 항구" — the send-off happens in morning light
    buildHarborBackdrop(this)

    const margin = Math.round(14 * layout.uiScale)
    this.add
      .text(margin, margin, 'Ch.5 — 입영 (프로토타입)', outlined('#ffffff', '15px', true))
      .setScrollFactor(0)
      .setDepth(950)

    // four friends in a row, centred; spacing shrinks to fit a narrow portrait view
    const cx = layout.viewW / 2
    const spacing = Math.min(150, (layout.viewW - 90) / 3)
    const cast: [string, string][] = [
      ['tex-npc-sunju', '순주'],
      ['tex-npc-gangseong', '강성'],
      ['tex-player', '야스다'],
      ['tex-npc-ganemura', '가네무라'],
    ]
    cast.forEach(([key, name], i) => this.placeCharacter(key, cx + (i - 1.5) * spacing, name))

    this.dialogueBox = new DialogueBox(this)

    const btnH = touchMin()
    this.backButton = new Button(this, {
      x: cx,
      y: layout.viewH - margin - btnH / 2,
      w: Math.min(layout.viewW - margin * 2, Math.round(300 * layout.uiScale)),
      h: btnH,
      label: layout.touch ? '오사카 거리로 돌아가기' : '[B] 오사카 거리로 돌아가기',
      fontPx: 14,
      depth: 950,
      onPress: () => this.scene.start('PrologueScene'),
    }).setVisible(false)

    this.dialogueBox.onEnd = () => this.backButton.setVisible(true)

    this.input.keyboard!.on('keydown-B', () => this.scene.start('PrologueScene'))

    // auto-play the scene's dialogue on entry
    this.time.delayedCall(300, () => this.dialogueBox.start(enlistmentTree, 'start'))
  }

  private placeCharacter(textureKey: string, x: number, name: string) {
    const img = this.add.image(x, GROUND_Y + 34, textureKey)
    const scale = CHAR_HEIGHT / img.height
    img.setScale(scale)
    img.setOrigin(0.5, 1)
    this.add
      .text(x, GROUND_Y + 34 - CHAR_HEIGHT - 14, name, outlined('#f6ecd8'))
      .setOrigin(0.5)
      .setDepth(600)

    // same subtle idle-breathing loop as PrologueScene's standing NPCs
    this.tweens.add({
      targets: img,
      scaleX: scale * 1.015,
      scaleY: scale * 0.985,
      duration: Phaser.Math.Between(1700, 2300),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, 1500),
    })
  }
}

