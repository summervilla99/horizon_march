import './style.css'
import Phaser from 'phaser'
import { TitleScene } from './scenes/TitleScene'
import { RunnerScene } from './scenes/RunnerScene'
import { ChapterScene } from './game/ChapterScene'
import {
  applyLayout,
  computeLayout,
  layout,
  layoutChangedEnough,
  purgeLayoutTextures,
  readSafeInsets,
  RENDER_SCALE,
} from './render/layout'

const stageEl = document.getElementById('stage')!
const measure = () => computeLayout(stageEl.clientWidth, stageEl.clientHeight, readSafeInsets())
applyLayout(measure())

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#1b2238',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: stageEl,
    width: layout.viewW * RENDER_SCALE,
    height: layout.viewH * RENDER_SCALE,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  input: {
    activePointers: 3,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [TitleScene, ChapterScene, RunnerScene],
}

const game = new Phaser.Game(config)

/**
 * Rotating a phone (or resizing a window enough) changes the logical view, which every scene
 * lays itself out from — so adopt the new layout and restart the running scene, carrying over
 * whatever it says is worth keeping (see PrologueScene.relayoutData). Small resizes, such as the
 * mobile address bar sliding away, are left to Phaser's FIT letterboxing.
 */
function relayout() {
  const next = measure()
  updateRotateHint(next.portrait)
  if (!layoutChangedEnough(next)) return
  applyLayout(next)
  game.scale.setGameSize(layout.viewW * RENDER_SCALE, layout.viewH * RENDER_SCALE)

  for (const scene of game.scene.getScenes(true)) {
    const data = (scene as unknown as { relayoutData?: () => object }).relayoutData?.()
    // painted backdrops are keyed by layout; drop the old ones once the old scene is gone
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => purgeLayoutTextures(game.textures))
    scene.scene.restart(data)
  }
}

// phones held upright get a dismissible nudge to rotate; the layout works either way
const hintEl = document.getElementById('rotate-hint')
let hintDismissed = false
hintEl?.querySelector('button')?.addEventListener('click', () => {
  hintDismissed = true
  hintEl.classList.remove('show')
})
function updateRotateHint(portrait: boolean) {
  hintEl?.classList.toggle('show', portrait && layout.touch && !hintDismissed)
}
updateRotateHint(layout.portrait)

let resizeTimer: number | undefined
const scheduleRelayout = () => {
  window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(relayout, 180)
}
window.addEventListener('resize', scheduleRelayout)
window.addEventListener('orientationchange', scheduleRelayout)
window.visualViewport?.addEventListener('resize', scheduleRelayout)

if (import.meta.env.DEV) {
  ;(window as unknown as { __game: Phaser.Game }).__game = game
}
