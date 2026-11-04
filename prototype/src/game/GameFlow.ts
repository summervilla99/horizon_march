import Phaser from 'phaser'
import { CHAPTERS, FLAT } from './story'

const KEY = 'horizon-march/progress'

export function sceneCount() {
  return FLAT.length
}

export function savedProgress(): number {
  try {
    return Math.min(FLAT.length - 1, Math.max(0, parseInt(localStorage.getItem(KEY) ?? '0', 10) || 0))
  } catch {
    return 0
  }
}

function remember(index: number) {
  try {
    if (index > savedProgress() || localStorage.getItem(KEY) === null) localStorage.setItem(KEY, String(index))
  } catch {
    /* private mode — progress just isn't saved */
  }
}

/** Fades the running scene out, then starts scene #index of the flat story list. */
export function goToScene(from: Phaser.Scene, index: number, fadeMs = 450) {
  const target = FLAT[index]
  if (!target) {
    from.scene.start('Title')
    return
  }
  remember(index)
  const cam = from.cameras.main
  cam.fadeOut(fadeMs, 0, 0, 0)
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    if (target.def.kind === 'runner') from.scene.start('Runner', { index })
    else from.scene.start('Chapter', { index })
  })
}

export function nextScene(from: Phaser.Scene, index: number) {
  if (index + 1 >= FLAT.length) {
    from.cameras.main.fadeOut(900, 0, 0, 0)
    from.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => from.scene.start('Title', { finished: true }))
    return
  }
  goToScene(from, index + 1)
}

export function goToTitle(from: Phaser.Scene) {
  from.cameras.main.fadeOut(350, 0, 0, 0)
  from.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => from.scene.start('Title'))
}

export { CHAPTERS }
