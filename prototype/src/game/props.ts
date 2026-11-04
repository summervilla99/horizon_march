import Phaser from 'phaser'
import { paintTexture } from '../scenery/paint/canvas'
import { textureKey } from './actors'

/** The 헌병 (military policeman) is drawn in code: khaki tunic, flat cap, armband, rifle with bayonet. Faces right. */
export function ensureGendarmeTexture(scene: Phaser.Scene) {
  paintTexture(scene, textureKey('gendarme'), 90, 200, (ctx) => {
    const cx = 40
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    // rifle (behind the body), bayonet up
    ctx.strokeStyle = '#4a3320'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(cx + 22, 176)
    ctx.lineTo(cx + 26, 30)
    ctx.stroke()
    ctx.strokeStyle = '#cfd3da'
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(cx + 26, 30)
    ctx.lineTo(cx + 27, 6)
    ctx.stroke()
    // boots
    ctx.fillStyle = '#17120e'
    ctx.beginPath()
    ctx.roundRect(cx - 17, 176, 18, 22, 4)
    ctx.roundRect(cx + 2, 176, 24, 22, 4)
    ctx.fill()
    // trousers
    ctx.fillStyle = '#63602f'
    ctx.beginPath()
    ctx.moveTo(cx - 16, 108)
    ctx.lineTo(cx + 18, 108)
    ctx.lineTo(cx + 20, 180)
    ctx.lineTo(cx + 4, 180)
    ctx.lineTo(cx + 1, 130)
    ctx.lineTo(cx - 3, 180)
    ctx.lineTo(cx - 17, 180)
    ctx.closePath()
    ctx.fill()
    // puttees
    ctx.fillStyle = '#4e4b24'
    ctx.fillRect(cx - 17, 150, 15, 28)
    ctx.fillRect(cx + 4, 150, 16, 28)
    // tunic
    ctx.fillStyle = '#8a8648'
    ctx.beginPath()
    ctx.roundRect(cx - 21, 58, 46, 62, 9)
    ctx.fill()
    ctx.fillStyle = '#6f6c38'
    ctx.fillRect(cx - 21, 104, 46, 7) // belt
    ctx.fillStyle = '#d9c26b'
    ctx.fillRect(cx - 3, 104, 8, 7)
    ctx.fillStyle = '#d9c26b'
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.arc(cx + 2, 68 + i * 9, 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
    // arm holding the rifle + armband (white with a red mark)
    ctx.strokeStyle = '#8a8648'
    ctx.lineWidth = 11
    ctx.beginPath()
    ctx.moveTo(cx + 18, 66)
    ctx.lineTo(cx + 26, 96)
    ctx.stroke()
    ctx.fillStyle = '#efe8d4'
    ctx.fillRect(cx + 15, 76, 18, 9)
    ctx.fillStyle = '#c4382c'
    ctx.fillRect(cx + 21, 77.5, 6, 6)
    ctx.fillStyle = '#d8b48f'
    ctx.beginPath()
    ctx.arc(cx + 26, 100, 5.4, 0, Math.PI * 2)
    ctx.fill()
    // head
    ctx.fillStyle = '#e0b890'
    ctx.beginPath()
    ctx.ellipse(cx + 2, 40, 14, 17, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2a1a12'
    ctx.beginPath()
    ctx.arc(cx + 9, 41, 1.9, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#2a1a12'
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(cx + 4, 35)
    ctx.lineTo(cx + 14, 33)
    ctx.stroke() // stern brow
    ctx.beginPath()
    ctx.moveTo(cx + 5, 50)
    ctx.lineTo(cx + 12, 50)
    ctx.stroke()
    // cap: crown, red band, brim
    ctx.fillStyle = '#7d7a3e'
    ctx.beginPath()
    ctx.roundRect(cx - 14, 14, 32, 17, 6)
    ctx.fill()
    ctx.fillStyle = '#c4382c'
    ctx.fillRect(cx - 14, 26, 32, 4)
    ctx.fillStyle = '#17120e'
    ctx.beginPath()
    ctx.roundRect(cx + 4, 29, 20, 4, 2)
    ctx.fill()
    ctx.fillStyle = '#e8d27a'
    ctx.beginPath()
    ctx.arc(cx + 2, 22, 2.8, 0, Math.PI * 2)
    ctx.fill()
  })
}
