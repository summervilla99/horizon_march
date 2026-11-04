import Phaser from 'phaser'
import { DialogueBox } from '../dialogue/DialogueBox'
import { akikoSugarTree } from '../dialogue/data/akikoSugar'
import { PriceNegotiation } from '../minigames/PriceNegotiation'
import { EscapeQTE } from '../minigames/EscapeQTE'
import { buildStreetBackdrop, type StreetTime } from '../scenery/StreetBackdrop'
import { followCameraX, fs, layout, RENDER_SCALE, setupHiDpiScene, snapCameraX } from '../render/layout'
import { paintTexture } from '../scenery/paint/canvas'
import { outlined } from '../ui/textStyle'
import { Button, touchMin } from '../ui/Button'
import { ganemuraLine, gangseongLine, sunjuLine } from '../dialogue/data/companionLines'
import type { DialogueTree } from '../dialogue/types'

import yasudaArt from '../assets/characters/yasuda.png'
import cheongokArt from '../assets/characters/cheongok.png'
import ganemuraArt from '../assets/characters/ganemura.png'
import gangseongArt from '../assets/characters/gangseong.png'
import sunjuArt from '../assets/characters/sunju.png'
import akikoArt from '../assets/characters/akiko.png'

const CHAR_TARGET_HEIGHT = 185 // on-screen height, in px, that every character sprite is scaled to

type Direction = 'left' | 'right'
type Judgement = 'PERFECT' | 'GOOD' | 'MISS'
type ChaseState = 'IDLE' | 'INTRO' | 'DRUM' | 'RESULT'

interface Npc {
  name: string
  sprite: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
  homeX: number
  homeY: number
  tree: DialogueTree
  interactPrompt: Phaser.GameObjects.Text
}

interface Interactable {
  x: () => number
  range: number
  /** how close (world units) a tap must land to count as tapping this thing */
  hitRadius: number
  promptText: Phaser.GameObjects.Text
  action: () => void
}

interface DrumHit {
  time: number // scheduled absolute hit time (ms, scene time)
  direction: Direction // direction the player must move toward to dodge
  resolved: boolean
  judgement?: Judgement
  telegraph?: Phaser.GameObjects.Text
}

const WORLD_WIDTH = 2400
const GROUND_Y = 420

// Script p.3 "1940년대. 어느 집 앞" — 아키코's sugar haggling happens by daylight. Night is
// reserved for the scenes the script actually sets at night (가네무라's flight p.9, 밤길 p.11).
const SCENE_TIME: StreetTime = 'day'
// dev-only preview of the other lighting: http://localhost:5173/?time=night
const PREVIEW_TIME = import.meta.env.DEV ? (new URLSearchParams(location.search).get('time') as StreetTime | null) : null
const TIME: StreetTime = PREVIEW_TIME === 'night' ? 'night' : SCENE_TIME
// characters are painted in daylight; at night they get a cool moonlit cast to sit in the scene
const CHARACTER_TINT: Record<StreetTime, number> = { day: 0xffffff, night: 0x9ea6cf }

// above characters (whose depth = their y, ~410–510) but below screen-space light effects
const LABEL_DEPTH = 600
const UI_DEPTH = 950

// 2.5D depth axis: the player can walk "into"/"out of" the screen along a shallow
// band around the ground line. Further back = smaller + behind NPCs; closer to
// camera = bigger + in front of them. Z-order follows y, the usual trick 2.5D
// side-scrollers use in place of a true 3D camera.
const DEPTH_BAND_TOP = GROUND_Y - 10
const DEPTH_BAND_BOTTOM = GROUND_Y + 90
const DEPTH_SCALE_MIN = 0.82
const DEPTH_SCALE_MAX = 1.18
const DEPTH_MOVE_SPEED = 90 // px/sec

const WANDER_RADIUS = 90 // how far an idle NPC strays from its home spot
const WANDER_MIN_DELAY = 1800
const WANDER_MAX_DELAY = 4200

const EXIT_GATE_X = WORLD_WIDTH - 180

const INPUT_WINDOW_PERFECT = 160 // ms
const INPUT_WINDOW_GOOD = 340 // ms
const TELEGRAPH_LEAD = 650 // ms before hit the warning appears
const HIT_INTERVAL = 1500 // ms between drum hits

export class PrologueScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody
  private playerLabel!: Phaser.GameObjects.Text
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private npcs: Npc[] = []
  private cheongok!: Phaser.GameObjects.Rectangle
  private cheongokLabel!: Phaser.GameObjects.Text
  private drum!: Phaser.GameObjects.Arc

  private state: ChaseState = 'IDLE'
  private hits: DrumHit[] = []
  private comboText!: Phaser.GameObjects.Text
  private statusText!: Phaser.GameObjects.Text
  private resultText!: Phaser.GameObjects.Text
  private perfectStreak = true

  private lastDodgeKeyTime: Record<Direction, number> = { left: -99999, right: -99999 }

  // procedural "animation" for the static cutout art: walk bob/tilt, idle
  // breathing, footstep dust — see updatePlayerAnimation()
  private playerWalkPhase = 0
  private lastFootstepAt = 0
  private playerKnockedBack = false

  private dialogueBox!: DialogueBox
  private priceGame!: PriceNegotiation
  private escapeQTE!: EscapeQTE
  private pendingNegotiation = false
  private readonly AKIKO_X = 900

  // generic "walk up to it and press Space / tap it" interactables — companions, 아키코,
  // and the map-exit gate are all just entries here now
  private interactables: Interactable[] = []
  private currentInteractable: Interactable | null = null

  // tap / drag-to-move (no on-screen joystick: touch anywhere and the character walks there)
  private moveTarget: { x: number; y: number } | null = null
  private pendingInteract: Interactable | null = null
  private holdingPointer = false

  private startX = 260
  private demoMenu: Button[] = []
  private demoMenuOpen = false
  private menuButton?: Button
  private touchHint?: Phaser.GameObjects.Text

  constructor() {
    super('PrologueScene')
  }

  preload() {
    this.load.image('tex-player', yasudaArt)
    this.load.image('tex-npc-ganemura', ganemuraArt)
    this.load.image('tex-npc-gangseong', gangseongArt)
    this.load.image('tex-npc-sunju', sunjuArt)
    this.load.image('tex-cheongok', cheongokArt)
    this.load.image('tex-akiko', akikoArt)
  }

  init(data: { playerX?: number }) {
    this.startX = data?.playerX ?? 260
  }

  /** Carried across a layout change (e.g. phone rotation) so the scene restarts where you stood. */
  relayoutData() {
    return { playerX: this.player?.x }
  }

  create() {
    this.resetRunState()
    setupHiDpiScene(this)
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, 540)

    this.buildBackground()
    this.buildGround()
    this.buildPlayer()
    this.buildCompanions()
    this.buildCheongok()
    this.buildAkiko()
    this.buildExitGate()
    this.buildUI()
    this.buildDialogue()

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.input.keyboard!.on('keydown-LEFT', () => this.onDodgeKey('left'))
    this.input.keyboard!.on('keydown-RIGHT', () => this.onDodgeKey('right'))
    this.input.keyboard!.on('keydown-E', () => this.tryStartChase())
    this.input.keyboard!.on('keydown-SPACE', () => this.tryInteract())
    this.input.keyboard!.on('keydown-Q', () => this.tryStartEscape())
    this.input.keyboard!.on('keydown-C', () => this.tryGoToNextChapter())

    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: unknown[]) => this.onPointerDown(p, over))
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p))
    this.input.on('pointerup', () => (this.holdingPointer = false))
    this.input.on('pointerupoutside', () => (this.holdingPointer = false))

    // horizontal-only follow (vertical player movement is the 2.5D depth axis); see update()
    snapCameraX(this, this.player.x, WORLD_WIDTH)
  }

  /**
   * Phaser reuses this Scene instance when it's re-entered via scene.start (e.g. coming back
   * from Ch.5), so field initialisers don't run again — clear everything that belongs to a
   * single visit, otherwise stale (destroyed) NPCs and prompts linger in these arrays.
   */
  private resetRunState() {
    this.npcs = []
    this.interactables = []
    this.currentInteractable = null
    this.state = 'IDLE'
    this.hits = []
    this.perfectStreak = true
    this.pendingNegotiation = false
    this.playerWalkPhase = 0
    this.lastFootstepAt = 0
    this.playerKnockedBack = false
    this.moveTarget = null
    this.pendingInteract = null
    this.holdingPointer = false
    this.demoMenu = []
    this.demoMenuOpen = false
    this.menuButton = undefined
    this.touchHint = undefined
  }

  // ---------- setup helpers ----------

  /**
   * Scales + anchors a character image so its feet sit on the ground line at (x, GROUND_Y).
   * `animated` adds a slow idle-breathing loop — off for the player, whose animation is
   * driven per-frame by updatePlayerAnimation() instead (would otherwise fight it).
   */
  private fitCharacterSprite(image: Phaser.GameObjects.Image, x: number, animated = true) {
    const scale = CHAR_TARGET_HEIGHT / image.height
    image.setScale(scale)
    image.setOrigin(0.5, 1)
    image.setPosition(x, GROUND_Y + 34)
    image.setDepth(image.y) // static z-order baseline; see applyDepthScale() for the player's dynamic version
    image.setTint(CHARACTER_TINT[TIME])
    if (animated) this.addIdleBreathing(image)
  }

  /** Slow, subtle scale-pulse loop so standing NPCs don't look frozen. */
  private addIdleBreathing(image: Phaser.GameObjects.Image) {
    const baseScaleX = image.scaleX
    const baseScaleY = image.scaleY
    this.tweens.add({
      targets: image,
      scaleX: baseScaleX * 1.015,
      scaleY: baseScaleY * 0.985,
      duration: Phaser.Math.Between(1700, 2300),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, 1500),
    })
  }

  /** Rescales + re-sorts the player sprite from its current depth-axis (y) position. */
  private applyDepthScale(image: Phaser.GameObjects.Image) {
    const t = Phaser.Math.Clamp((image.y - DEPTH_BAND_TOP) / (DEPTH_BAND_BOTTOM - DEPTH_BAND_TOP), 0, 1)
    const baseScale = CHAR_TARGET_HEIGHT / image.height
    const depthScale = Phaser.Math.Linear(DEPTH_SCALE_MIN, DEPTH_SCALE_MAX, t)
    image.setScale(baseScale * depthScale)
    image.setDepth(image.y)
  }

  /**
   * Layers a walk bob/tilt (or, when standing still, a slower breathing pulse)
   * on top of whatever base scale applyDepthScale() set this frame — since we
   * only have a single static illustration per character, this is the stand-in
   * for a real walk-cycle animation.
   */
  private updatePlayerAnimation(delta: number, isMoving: boolean) {
    if (this.playerKnockedBack) return

    const baseScaleX = this.player.scaleX
    const baseScaleY = this.player.scaleY

    if (isMoving) {
      this.playerWalkPhase += delta * 0.012
      const wobble = Math.sin(this.playerWalkPhase)
      this.player.setScale(baseScaleX * (1 - wobble * 0.025), baseScaleY * (1 + wobble * 0.045))
      this.player.setRotation(wobble * 0.05)

      const now = this.time.now
      if (now - this.lastFootstepAt > 260) {
        this.lastFootstepAt = now
        this.spawnFootstepDust()
      }
    } else {
      this.playerWalkPhase = 0
      const breathe = Math.sin(this.time.now * 0.0022)
      this.player.setScale(baseScaleX * (1 + breathe * 0.012), baseScaleY * (1 - breathe * 0.008))
      if (this.player.rotation !== 0) {
        this.player.setRotation(Phaser.Math.Linear(this.player.rotation, 0, 0.2))
      }
    }
  }

  private spawnFootstepDust() {
    const dust = this.add.ellipse(
      this.player.x + Phaser.Math.Between(-6, 6),
      this.player.y - 4,
      14,
      6,
      0xcbbf9a,
      0.35,
    )
    dust.setDepth(this.player.depth - 1)
    this.tweens.add({
      targets: dust,
      scaleX: 2.2,
      scaleY: 1.6,
      alpha: 0,
      y: dust.y - 4,
      duration: 420,
      ease: 'Sine.easeOut',
      onComplete: () => dust.destroy(),
    })
  }

  private buildBackground() {
    buildStreetBackdrop(this, WORLD_WIDTH, TIME)
  }

  private buildGround() {
    // Backdrop already paints a textured ground strip; this invisible static
    // body just reserves the physics world-bounds floor line for future collision use.
    const ground = this.add.rectangle(WORLD_WIDTH / 2, GROUND_Y + 60, WORLD_WIDTH, 120, 0x000000, 0)
    this.physics.add.existing(ground, true)
  }

  private buildPlayer() {
    this.player = this.physics.add.image(this.startX, GROUND_Y, 'tex-player')
    this.fitCharacterSprite(this.player, this.startX, false)
    this.player.setCollideWorldBounds(true)
    this.player.setDamping(true)
    this.player.setDrag(0.0012)
    this.player.setMaxVelocity(260, 600)
    this.playerLabel = this.add
      .text(this.player.x, this.labelY(), '야스다 (플레이어)', outlined('#ffe9b3', '14px', true))
      .setOrigin(0.5)
      .setDepth(LABEL_DEPTH)
  }

  private labelY(): number {
    return GROUND_Y + 34 - CHAR_TARGET_HEIGHT - 14
  }

  private buildCompanions() {
    const defs: { key: string; name: string; x: number; color: string; tree: DialogueTree }[] = [
      { key: 'tex-npc-ganemura', name: '가네무라', x: 400, color: '#b7e6b2', tree: ganemuraLine },
      { key: 'tex-npc-gangseong', name: '강성', x: 520, color: '#c7cbe8', tree: gangseongLine },
      { key: 'tex-npc-sunju', name: '순주', x: 130, color: '#ead9b0', tree: sunjuLine },
    ]
    for (const d of defs) {
      const img = this.add.image(d.x, GROUND_Y, d.key)
      this.fitCharacterSprite(img, d.x)
      const label = this.add.text(d.x, this.labelY(), d.name, outlined(d.color)).setOrigin(0.5).setDepth(LABEL_DEPTH)
      const interactPrompt = this.createInteractPrompt(d.x)

      const npc: Npc = {
        name: d.name,
        sprite: img as unknown as Phaser.GameObjects.Rectangle,
        label,
        homeX: d.x,
        homeY: GROUND_Y,
        tree: d.tree,
        interactPrompt,
      }
      this.npcs.push(npc)

      this.interactables.push({
        x: () => npc.sprite.x,
        range: 80,
        hitRadius: 56,
        promptText: interactPrompt,
        action: () => {
          this.statusText.setText(`${npc.name}와 대화 중...`)
          this.dialogueBox.start(npc.tree, 'start')
        },
      })

      this.scheduleWander(npc)
    }
  }

  /** The little "talk" pill above an interactable. Tappable, so touch players don't need Space. */
  private createInteractPrompt(x: number, label = '말 걸기'): Phaser.GameObjects.Text {
    const u = layout.uiScale
    const prompt = this.add
      .text(x, this.labelY() - 26 * u, layout.touch ? label : `[Space] ${label}`, {
        fontSize: fs(13),
        color: '#ffffff',
        backgroundColor: '#2d3a63',
        padding: { x: Math.round(10 * u), y: Math.round(7 * u) },
      })
      .setOrigin(0.5)
      .setDepth(LABEL_DEPTH + 1)
      .setVisible(false)
    prompt.setInteractive({ useHandCursor: true })
    prompt.on('pointerdown', (...args: unknown[]) => {
      ;(args[3] as { stopPropagation?: () => void } | undefined)?.stopPropagation?.()
      if (prompt.visible) this.tryInteract()
    })
    return prompt
  }

  /** Idle NPCs drift within a short radius of home instead of standing frozen in place. */
  private scheduleWander(npc: Npc) {
    const delay = Phaser.Math.Between(WANDER_MIN_DELAY, WANDER_MAX_DELAY)
    this.time.delayedCall(delay, () => {
      const canWander = this.state === 'IDLE' && !this.isBusy()
      if (canWander) {
        const targetX = Phaser.Math.Clamp(
          npc.homeX + Phaser.Math.Between(-WANDER_RADIUS, WANDER_RADIUS),
          40,
          WORLD_WIDTH - 40,
        )
        const facingLeft = targetX < npc.sprite.x
        ;(npc.sprite as unknown as Phaser.GameObjects.Image).setFlipX(facingLeft)
        this.tweens.add({
          targets: [npc.sprite],
          x: targetX,
          duration: Phaser.Math.Between(1200, 2200),
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            npc.label.setPosition(npc.sprite.x, this.labelY())
            npc.interactPrompt.setPosition(npc.sprite.x, this.labelY() - 26 * layout.uiScale)
          },
        })
      }
      this.scheduleWander(npc)
    })
  }

  private buildCheongok() {
    const img = this.add.image(-200, GROUND_Y, 'tex-cheongok')
    this.fitCharacterSprite(img, -200)
    img.setVisible(false)
    this.cheongok = img as unknown as Phaser.GameObjects.Rectangle
    this.cheongokLabel = this.add
      .text(-200, this.labelY(), '청옥', outlined('#ff9b9b', '14px', true))
      .setOrigin(0.5)
      .setDepth(LABEL_DEPTH)
      .setVisible(false)

    this.drum = this.add.circle(-200, GROUND_Y - 10, 10, 0x3b2a1a).setDepth(LABEL_DEPTH - 1).setVisible(false)
  }

  private buildAkiko() {
    const img = this.add.image(this.AKIKO_X, GROUND_Y, 'tex-akiko')
    this.fitCharacterSprite(img, this.AKIKO_X)
    this.add.text(this.AKIKO_X, this.labelY(), '아키코', outlined('#ffd0da')).setOrigin(0.5).setDepth(LABEL_DEPTH)
    const interactPrompt = this.createInteractPrompt(this.AKIKO_X)

    this.interactables.push({
      x: () => this.AKIKO_X,
      range: 90,
      hitRadius: 56,
      promptText: interactPrompt,
      action: () => {
        this.statusText.setText('아키코와 대화 중...')
        this.pendingNegotiation = true
        this.dialogueBox.start(akikoSugarTree, 'start')
      },
    })
  }

  /** The literal "walk to the edge of the map to leave it" gate — one map per episode. */
  private buildExitGate() {
    const gateW = 150
    const gateH = 176
    const key = paintTexture(this, 'exit-torii', gateW, gateH, (ctx) => {
      const vermilion = '#c8462f'
      ctx.fillStyle = 'rgba(30,20,12,0.22)'
      ctx.beginPath()
      ctx.ellipse(gateW / 2, gateH - 4, 70, 6, 0, 0, Math.PI * 2)
      ctx.fill()
      for (const px of [32, gateW - 32]) {
        const pg = ctx.createLinearGradient(px - 6, 0, px + 6, 0)
        pg.addColorStop(0, '#93311f')
        pg.addColorStop(0.55, vermilion)
        pg.addColorStop(1, '#e06a4c')
        ctx.fillStyle = pg
        ctx.beginPath()
        ctx.moveTo(px - 5, 34)
        ctx.lineTo(px + 5, 34)
        ctx.lineTo(px + 6.5, gateH - 6)
        ctx.lineTo(px - 6.5, gateH - 6)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#231b17'
        ctx.fillRect(px - 7.5, gateH - 18, 15, 12)
      }
      ctx.fillStyle = vermilion
      ctx.fillRect(12, 56, gateW - 24, 8) // nuki
      ctx.fillRect(8, 26, gateW - 16, 9) // shimaki
      // plaque (gaku) where the destination is written
      ctx.fillStyle = '#231b17'
      ctx.fillRect(gateW / 2 - 26, 34, 52, 21)
      ctx.strokeStyle = '#d6b25e'
      ctx.lineWidth = 1.4
      ctx.strokeRect(gateW / 2 - 23.5, 36.5, 47, 16)
      ctx.fillStyle = '#231b17' // kasagi with upswept ends
      ctx.beginPath()
      ctx.moveTo(0, 12)
      ctx.quadraticCurveTo(gateW / 2, 22, gateW, 12)
      ctx.lineTo(gateW - 4, 24)
      ctx.quadraticCurveTo(gateW / 2, 30, 4, 24)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(255,240,210,0.35)'
      ctx.fillRect(10, 27, gateW - 20, 1.2)
    })
    this.add
      .image(EXIT_GATE_X, GROUND_Y + 30, key)
      .setOrigin(0.5, 1)
      .setScale(1 / RENDER_SCALE)
      .setDepth(GROUND_Y)
    this.add
      .text(EXIT_GATE_X, GROUND_Y + 30 - gateH + 44.5, '다음 장소', { fontSize: '9px', color: '#f0d27a', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(GROUND_Y + 1)

    const interactPrompt = this.createInteractPrompt(EXIT_GATE_X)
    interactPrompt.setText(layout.touch ? '다음 장소로' : '[Space] 다음 장소로 이동')

    this.interactables.push({
      x: () => EXIT_GATE_X,
      range: 70,
      hitRadius: 84,
      promptText: interactPrompt,
      action: () => this.tryGoToNextChapter(),
    })
  }

  private buildDialogue() {
    this.dialogueBox = new DialogueBox(this)
    this.priceGame = new PriceNegotiation(this)
    this.escapeQTE = new EscapeQTE(this)

    this.dialogueBox.onEnd = () => {
      if (this.pendingNegotiation) {
        this.pendingNegotiation = false
        this.startPriceNegotiation()
      } else {
        this.statusText.setText('오사카 거리 — 평온한 노점의 나날')
      }
    }
  }

  private startPriceNegotiation() {
    this.statusText.setText(layout.touch ? '아키코와 흥정 중... (탭해서 멈추기)' : '아키코와 흥정 중... (Space로 멈추기)')
    this.priceGame.start((result) => {
      const dealNode = result === 'GREAT' ? 'deal_great' : result === 'GOOD' ? 'deal_good' : 'deal_poor'
      this.statusText.setText('아키코와 대화 중...')
      this.dialogueBox.start(akikoSugarTree, dealNode)
    })
  }

  private isBusy(): boolean {
    return this.dialogueBox.isActive() || this.priceGame.isActive() || this.escapeQTE.isActive()
  }

  private tryStartEscape() {
    if (this.isBusy()) return
    if (this.state !== 'IDLE') return

    this.player.setVelocityX(0)
    this.statusText.setText('헌병이다! 가네무라, 도망쳐!')
    this.escapeQTE.start((result) => {
      this.statusText.setText(
        result === 'CLEAN'
          ? '가네무라: "휴... 간신히 따돌렸다." (들키지 않고 깔끔하게 도망쳤다!)'
          : '가네무라: "하필 왜 이런 때 단속을... 큰일 날 뻔했네." (아슬아슬하게 도망쳤다)',
      )
      this.time.delayedCall(1800, () => {
        this.statusText.setText('오사카 거리 — 평온한 노점의 나날')
      })
    })
  }

  private tryGoToNextChapter() {
    if (this.isBusy()) return
    if (this.state !== 'IDLE') return
    this.scene.start('Ch5EnlistmentScene')
  }

  private buildUI() {
    const u = layout.uiScale
    const margin = Math.round(14 * u)
    const btn = touchMin()
    const cx = layout.viewW / 2

    // keyboard cheat-sheet on desktop; on touch a short "how to move" hint that fades out
    if (layout.touch) {
      this.touchHint = this.add
        .text(cx, layout.viewH - Math.round(110 * u), '화면을 누르거나 끌어서 이동\n가까이 가서 말 걸기를 눌러 대화', {
          ...outlined('#f3ecdf', '13px'),
          align: 'center',
          wordWrap: { width: layout.viewW - margin * 2 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(UI_DEPTH)
      this.tweens.add({ targets: this.touchHint, alpha: 0, delay: 6500, duration: 1200 })
    } else {
      this.add
        .text(cx, layout.viewH - margin, '←→ 이동 ↑↓ 깊이(2.5D) | [Space] 가까운 NPC와 대화 | [E] 청옥 | [Q] 도주 QTE | 맵 끝 문으로 다음 장소', {
          ...outlined('#f3ecdf', '12px'),
          align: 'center',
          wordWrap: { width: layout.viewW - margin * 2 },
        })
        .setOrigin(0.5, 1)
        .setScrollFactor(0)
        .setDepth(UI_DEPTH)
    }

    this.statusText = this.add
      .text(margin, margin, '오사카 거리 — 평온한 노점의 나날', {
        ...outlined('#ffffff', '15px', true),
        wordWrap: { width: layout.viewW - margin * 3 - btn },
      })
      .setScrollFactor(0)
      .setDepth(UI_DEPTH)

    this.comboText = this.add
      .text(cx, margin + btn + 20 * u, '', outlined('#ffe066', '20px', true))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(UI_DEPTH)

    this.resultText = this.add
      .text(cx, margin + btn + 56 * u, '', {
        ...outlined('#ffffff', '16px'),
        align: 'center',
        wordWrap: { width: layout.viewW - margin * 2 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(UI_DEPTH)

    this.buildDemoMenu(margin, btn)
  }

  /** ☰ button with the demo triggers that keyboard players get as E / Q / C. */
  private buildDemoMenu(margin: number, btn: number) {
    const u = layout.uiScale
    const x = layout.viewW - margin - btn / 2
    const y = margin + btn / 2

    this.menuButton = new Button(this, {
      x,
      y,
      w: btn,
      h: btn,
      label: '☰',
      fontPx: 18,
      depth: UI_DEPTH + 10,
      onPress: () => this.setDemoMenu(!this.demoMenuOpen),
    })

    const itemW = Math.round(168 * u)
    const itemH = btn
    const items: { label: string; run: () => void }[] = [
      { label: '청옥 등장 (북소리)', run: () => this.tryStartChase() },
      { label: '헌병 도주 QTE', run: () => this.tryStartEscape() },
      { label: '다음 장소로', run: () => this.tryGoToNextChapter() },
    ]
    items.forEach((it, i) => {
      this.demoMenu.push(
        new Button(this, {
          x: layout.viewW - margin - itemW / 2,
          y: y + btn / 2 + 10 * u + itemH / 2 + i * (itemH + 8 * u),
          w: itemW,
          h: itemH,
          label: it.label,
          fontPx: 13,
          depth: UI_DEPTH + 10,
          onPress: () => {
            this.setDemoMenu(false)
            it.run()
          },
        }).setVisible(false),
      )
    })
  }

  private setDemoMenu(open: boolean) {
    this.demoMenuOpen = open
    for (const b of this.demoMenu) b.setVisible(open)
  }

  // ---------- update loop ----------

  update(time: number, delta: number) {
    this.handleMovement(delta)
    followCameraX(this, this.player.x, WORLD_WIDTH)

    this.playerLabel.setPosition(this.player.x, this.player.y - this.player.displayHeight - 14)

    if (this.state === 'DRUM') {
      this.updateDrumSequence(time)
    }

    this.updateInteractPrompt()

    const busy = this.isBusy() || this.state !== 'IDLE'
    this.menuButton?.setVisible(!busy)
    if (busy && this.demoMenuOpen) this.setDemoMenu(false)
  }

  private updateInteractPrompt() {
    const canInteract = this.state === 'IDLE' && !this.isBusy()
    let nearest: Interactable | null = null
    let nearestDist = Infinity

    for (const it of this.interactables) {
      const dist = Math.abs(this.player.x - it.x())
      if (dist <= it.range && dist < nearestDist) {
        nearest = it
        nearestDist = dist
      }
    }

    const next = canInteract ? nearest : null
    this.currentInteractable = next
    // show exactly one prompt (or none): anything that isn't the current target is hidden
    for (const it of this.interactables) it.promptText.setVisible(it === next)
  }

  private tryInteract() {
    if (this.isBusy()) return
    if (this.state !== 'IDLE') return
    if (!this.currentInteractable) return

    this.player.setVelocityX(0)
    this.currentInteractable.promptText.setVisible(false)
    this.currentInteractable.action()
  }

  private handleMovement(delta: number) {
    const canMove = (this.state === 'IDLE' || this.state === 'DRUM') && !this.isBusy()
    let isMoving = false

    if (!canMove) {
      this.player.setVelocityX(0)
      this.moveTarget = null
      this.pendingInteract = null
    } else {
      const speed = 200
      const depthStep = (DEPTH_MOVE_SPEED * delta) / 1000
      const keyLeft = !!this.cursors.left?.isDown
      const keyRight = !!this.cursors.right?.isDown
      const keyUp = !!this.cursors.up?.isDown
      const keyDown = !!this.cursors.down?.isDown

      if (keyLeft || keyRight || keyUp || keyDown) {
        // a key press always wins over (and cancels) a tap destination
        this.moveTarget = null
        this.pendingInteract = null
      }

      if (keyLeft) {
        this.player.setVelocityX(-speed)
        this.player.setFlipX(true)
        isMoving = true
      } else if (keyRight) {
        this.player.setVelocityX(speed)
        this.player.setFlipX(false)
        isMoving = true
      } else if (this.moveTarget) {
        isMoving = this.walkTowardTarget(speed, depthStep)
      } else {
        this.player.setVelocityX(0)
      }

      // depth axis (2.5D): ↑ walks further into the scene (smaller, behind NPCs),
      // ↓ walks toward the camera (bigger, in front of NPCs)
      if (keyUp) {
        this.player.y = Math.max(DEPTH_BAND_TOP, this.player.y - depthStep)
        isMoving = true
      } else if (keyDown) {
        this.player.y = Math.min(DEPTH_BAND_BOTTOM, this.player.y + depthStep)
        isMoving = true
      }
    }

    this.applyDepthScale(this.player)
    this.updatePlayerAnimation(delta, isMoving)
  }

  // ---------- tap / drag to move ----------

  /** The interactable (NPC, gate…) under a tap, if any. */
  private interactableAt(wx: number, wy: number): Interactable | null {
    if (wy < GROUND_Y - 200 || wy > GROUND_Y + 120) return null
    let best: Interactable | null = null
    let bestDist = Infinity
    for (const it of this.interactables) {
      const d = Math.abs(wx - it.x())
      if (d <= it.hitRadius && d < bestDist) {
        best = it
        bestDist = d
      }
    }
    return best
  }

  private setMoveTargetFrom(pointer: Phaser.Input.Pointer) {
    const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const target = this.pendingInteract
    if (target) {
      this.moveTarget = { x: this.standOffX(target), y: GROUND_Y + 34 }
      return
    }
    // taps on the street also set the depth; taps up in the sky / rooftops keep the current depth
    const y = wp.y >= DEPTH_BAND_TOP - 40 ? Phaser.Math.Clamp(wp.y, DEPTH_BAND_TOP, DEPTH_BAND_BOTTOM) : this.player.y
    this.moveTarget = { x: Phaser.Math.Clamp(wp.x, 40, WORLD_WIDTH - 40), y }
  }

  /** Where to stop in front of an interactable (on the side we're approaching from). */
  private standOffX(it: Interactable) {
    const gap = Math.min(it.range * 0.6, 54)
    return it.x() + (this.player.x < it.x() ? -gap : gap)
  }

  private onPointerDown(pointer: Phaser.Input.Pointer, over: unknown[]) {
    if (over.length > 0) return // a button / prompt already took this press
    if (this.demoMenuOpen) {
      this.setDemoMenu(false)
      return
    }
    if (this.isBusy()) return // dialogue and minigames handle their own taps

    if (this.state === 'DRUM') {
      // during the drum dodge the screen is split in two: left half dodges left, right half right
      this.onDodgeKey(pointer.x < this.scale.width / 2 ? 'left' : 'right')
      return
    }
    if (this.state !== 'IDLE') return

    const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    this.pendingInteract = this.interactableAt(wp.x, wp.y)
    this.holdingPointer = true
    this.setMoveTargetFrom(pointer)
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.holdingPointer || !pointer.isDown || this.isBusy() || this.state !== 'IDLE') return
    // dragging steers continuously, like an invisible joystick
    this.pendingInteract = null
    this.setMoveTargetFrom(pointer)
  }

  /** Steps toward moveTarget; returns whether the player is still travelling. */
  private walkTowardTarget(speed: number, depthStep: number): boolean {
    const target = this.moveTarget
    if (!target) return false

    // a followed NPC keeps wandering — chase its current position
    if (this.pendingInteract && !this.holdingPointer) {
      target.x = this.standOffX(this.pendingInteract)
    }

    const dx = target.x - this.player.x
    const dy = target.y - this.player.y
    const arrivedX = Math.abs(dx) <= 8
    const arrivedY = Math.abs(dy) <= 3

    if (arrivedX) {
      this.player.setVelocityX(0)
    } else {
      // ease off over the last stretch so the stop isn't abrupt
      this.player.setVelocityX(Math.sign(dx) * speed * Math.min(1, Math.abs(dx) / 60 + 0.25))
      this.player.setFlipX(dx < 0)
    }
    if (!arrivedY) {
      this.player.y += Math.sign(dy) * Math.min(Math.abs(dy), depthStep * 1.6)
    }

    if (arrivedX && arrivedY && !this.holdingPointer) {
      this.moveTarget = null
      const it = this.pendingInteract
      this.pendingInteract = null
      if (it && Math.abs(this.player.x - it.x()) <= it.range) {
        this.currentInteractable = it
        this.tryInteract()
      }
      return false
    }
    return !(arrivedX && arrivedY)
  }

  // ---------- 청옥 북소리 체이스 ----------

  private tryStartChase() {
    if (this.state !== 'IDLE') return
    if (this.isBusy()) return
    this.startChase()
  }

  private startChase() {
    this.state = 'INTRO'
    this.resultText.setText('')
    this.comboText.setText('')
    this.perfectStreak = true
    this.statusText.setText('청옥 등장! 다들 도망쳐!')

    // 청옥 enters from the right edge of current view
    const entryX = this.player.x + 420
    this.cheongok.setVisible(true)
    this.cheongokLabel.setVisible(true)
    this.cheongok.setPosition(entryX, GROUND_Y)
    this.cheongokLabel.setPosition(entryX, this.labelY())

    this.tweens.add({
      targets: [this.cheongok],
      x: this.player.x + 160,
      duration: 900,
      ease: 'Sine.easeOut',
      onUpdate: () => this.cheongokLabel.setPosition(this.cheongok.x, this.labelY()),
    })

    // NPCs scatter away from 청옥's entry direction
    for (const npc of this.npcs) {
      const fleeX = npc.homeX - Phaser.Math.Between(140, 220)
      this.tweens.add({
        targets: [npc.sprite],
        x: fleeX,
        duration: 700,
        ease: 'Back.easeOut',
        onUpdate: () => npc.label.setPosition(npc.sprite.x, this.labelY()),
      })
      this.tweens.add({ targets: [npc.label], x: fleeX, duration: 700 })
    }

    this.time.delayedCall(950, () => this.beginDrumSequence())
  }

  private beginDrumSequence() {
    this.state = 'DRUM'
    this.statusText.setText(layout.touch ? '북소리에 맞춰 화면 왼쪽/오른쪽을 탭해서 피하기!' : '북소리에 맞춰 반대 방향으로 피해라! (← / →)')

    this.drum.setVisible(true)
    this.drum.setPosition(this.cheongok.x - 22, this.cheongok.y - CHAR_TARGET_HEIGHT * 0.55)

    const hitCount = 3
    const startTime = this.time.now + 500
    this.hits = []
    for (let i = 0; i < hitCount; i++) {
      const direction: Direction = Math.random() < 0.5 ? 'left' : 'right'
      this.hits.push({
        time: startTime + i * HIT_INTERVAL,
        direction,
        resolved: false,
      })
    }
  }

  private updateDrumSequence(now: number) {
    for (const hit of this.hits) {
      if (hit.resolved) continue

      const untilHit = hit.time - now

      // spawn telegraph
      if (!hit.telegraph && untilHit <= TELEGRAPH_LEAD) {
        const arrow = hit.direction === 'left' ? '◀◀ 피해!' : '피해! ▶▶'
        hit.telegraph = this.add
          .text(this.cheongok.x, this.cheongok.y - CHAR_TARGET_HEIGHT - 20, arrow, {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold',
            backgroundColor: '#8c2f2f',
            padding: { x: 8, y: 4 },
          })
          .setOrigin(0.5)
          .setDepth(LABEL_DEPTH + 2)

        this.tweens.add({
          targets: this.drum,
          scale: { from: 1, to: 1.6 },
          duration: TELEGRAPH_LEAD,
          ease: 'Sine.easeIn',
        })
      }

      if (hit.telegraph) {
        hit.telegraph.setPosition(this.cheongok.x, this.cheongok.y - CHAR_TARGET_HEIGHT - 20)
      }

      // resolve on timeout (missed window)
      if (untilHit <= -INPUT_WINDOW_GOOD) {
        this.resolveHit(hit, 'MISS')
      }
    }

    if (this.hits.length > 0 && this.hits.every((h) => h.resolved)) {
      this.endDrumSequence()
    }
  }

  private onDodgeKey(direction: Direction) {
    this.lastDodgeKeyTime[direction] = this.time.now
    if (this.state !== 'DRUM') return

    const active = this.hits.find(
      (h) => !h.resolved && Math.abs(h.time - this.time.now) <= INPUT_WINDOW_GOOD,
    )
    if (!active) return

    if (direction !== active.direction) {
      // wrong direction = straight into the hit
      this.resolveHit(active, 'MISS')
      return
    }

    const delta = Math.abs(active.time - this.time.now)
    const judgement: Judgement = delta <= INPUT_WINDOW_PERFECT ? 'PERFECT' : 'GOOD'
    this.resolveHit(active, judgement)
  }

  private resolveHit(hit: DrumHit, judgement: Judgement) {
    hit.resolved = true
    hit.judgement = judgement
    hit.telegraph?.destroy()
    this.drum.setScale(1)

    if (judgement === 'PERFECT') {
      this.flashComboText('PERFECT!', '#7CFF9B')
    } else if (judgement === 'GOOD') {
      this.perfectStreak = false
      this.flashComboText('GOOD', '#FFE066')
      this.cameras.main.shake(100, 0.002)
    } else {
      this.perfectStreak = false
      this.flashComboText('MISS!', '#FF6B6B')
      this.applyKnockback(hit.direction)
    }
  }

  private flashComboText(label: string, color: string) {
    this.comboText.setText(label).setColor(color).setScale(1.4)
    this.tweens.add({ targets: this.comboText, scale: 1, duration: 220, ease: 'Back.easeOut' })
  }

  private applyKnockback(hitDirection: Direction) {
    this.cameras.main.shake(220, 0.01)
    const launchDir = hitDirection === 'left' ? 1 : -1 // player flies opposite of the drum's approach side
    const startY = this.player.y

    this.playerKnockedBack = true
    this.player.setVelocity(launchDir * 260, -220)
    this.time.delayedCall(60, () => {
      this.tweens.add({
        targets: this.player,
        y: startY,
        duration: 420,
        ease: 'Bounce.easeOut',
      })
    })

    this.tweens.add({
      targets: this.player,
      angle: { from: 0, to: launchDir * 360 },
      duration: 480,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.player.setAngle(0)
        this.playerKnockedBack = false
      },
    })
  }

  private endDrumSequence() {
    this.drum.setVisible(false)
    this.state = 'RESULT'

    const text = this.perfectStreak
      ? '청옥: "어...? 오늘따라 왜 이렇게 잘 피해..." (머쓱한 청옥, 콤보 보너스!)'
      : '청옥: "거기 서! 안 서?!" 다들 다시 도망치기 시작한다.'
    this.resultText.setText(text)

    this.time.delayedCall(1800, () => this.endChase())
  }

  private endChase() {
    this.tweens.add({
      targets: [this.cheongok],
      x: this.cheongok.x + 500,
      duration: 700,
      ease: 'Sine.easeIn',
      onUpdate: () => this.cheongokLabel.setPosition(this.cheongok.x, this.labelY()),
      onComplete: () => {
        this.cheongok.setVisible(false)
        this.cheongokLabel.setVisible(false)
      },
    })

    for (const npc of this.npcs) {
      this.tweens.add({
        targets: [npc.sprite],
        x: npc.homeX,
        duration: 700,
        ease: 'Sine.easeInOut',
        onUpdate: () => npc.label.setPosition(npc.sprite.x, this.labelY()),
      })
      this.tweens.add({ targets: [npc.label], x: npc.homeX, duration: 700 })
    }

    this.statusText.setText('오사카 거리 — 평온한 노점의 나날')
    this.comboText.setText('')
    this.time.delayedCall(800, () => {
      this.resultText.setText('')
      this.state = 'IDLE'
    })
  }
}
