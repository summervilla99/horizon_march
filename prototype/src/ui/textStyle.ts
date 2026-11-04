import type Phaser from 'phaser'
import { fs } from '../render/layout'

/**
 * World/HUD text style: scaled for the current layout (see fs()) with a dark outline so it
 * stays legible over bright daytime scenery.
 */
export function outlined(color: string, fontSize = '13px', bold = false): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontSize: fs(parseFloat(fontSize)), color, fontStyle: bold ? 'bold' : 'normal', stroke: '#1b140f', strokeThickness: 4 }
}
