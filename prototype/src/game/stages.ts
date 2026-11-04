import Phaser from 'phaser'
import { layout } from '../render/layout'
import { buildHarborBackdrop } from '../scenery/HarborBackdrop'
import { buildDeckBackdrop } from '../scenery/DeckBackdrop'
import { buildInteriorBackdrop } from '../scenery/InteriorBackdrop'
import { buildStreetBackdrop } from '../scenery/StreetBackdrop'
import type { StageId } from './script'

/** Builds the backdrop for a stage and returns the world width (in logical units). */
export function buildStage(scene: Phaser.Scene, id: StageId, worlds = 1): number {
  const worldW = Math.round(layout.viewW * worlds)
  switch (id) {
    case 'harbor-memory':
      buildHarborBackdrop(scene, 'memory')
      break
    case 'harbor':
      buildHarborBackdrop(scene, 'morning')
      break
    case 'deck':
      buildDeckBackdrop(scene)
      break
    case 'street-day':
      buildStreetBackdrop(scene, worldW, 'day')
      break
    case 'street-night':
      buildStreetBackdrop(scene, worldW, 'night')
      break
    case 'interior-day':
      buildInteriorBackdrop(scene, 'day')
      break
    case 'interior-night':
      buildInteriorBackdrop(scene, 'night')
      break
  }
  return worldW
}
