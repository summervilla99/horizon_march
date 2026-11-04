import yasudaArt from '../assets/characters/yasuda.png'
import yasudaOldArt from '../assets/characters/yasuda_old.png'
import yasudaArmyArt from '../assets/characters/yasuda_army.png'
import ganemuraArt from '../assets/characters/ganemura.png'
import ganemuraOldArt from '../assets/characters/ganemura_old.png'
import gangseongArt from '../assets/characters/gangseong.png'
import sunjuArt from '../assets/characters/sunju.png'
import cheongokArt from '../assets/characters/cheongok.png'
import akikoArt from '../assets/characters/akiko.png'
import masayoArt from '../assets/characters/masayo.png'
import megumiArt from '../assets/characters/megumi.png'

export type ActorId =
  | 'yasuda'
  | 'yasudaOld'
  | 'yasudaArmy'
  | 'ganemura'
  | 'ganemuraOld'
  | 'gangseong'
  | 'sunju'
  | 'cheongok'
  | 'akiko'
  | 'masayo'
  | 'megumi'
  | 'gendarme'

export interface ActorDef {
  id: ActorId
  /** the speaker name used in the script, so a dialogue line can find who is talking */
  name: string
  art: string
  /** label colour */
  color: string
  /** height relative to a grown-up (the sheet's friends are a little younger / smaller) */
  height?: number
  /** forward stoop for the old men: squashes the figure vertically */
  hunch?: number
}

export const ACTORS: Record<ActorId, ActorDef> = {
  yasuda: { id: 'yasuda', name: '야스다', art: yasudaArt, color: '#ffe9b3' },
  yasudaOld: { id: 'yasudaOld', name: '야스다(노)', art: yasudaOldArt, color: '#d9d2c2', hunch: 0.07, height: 0.97 },
  yasudaArmy: { id: 'yasudaArmy', name: '야스다', art: yasudaArmyArt, color: '#d5e3a4' },
  ganemura: { id: 'ganemura', name: '가네무라', art: ganemuraArt, color: '#b7e6b2' },
  ganemuraOld: { id: 'ganemuraOld', name: '가네무라(노)', art: ganemuraOldArt, color: '#d9d2c2', hunch: 0.07, height: 0.97 },
  gangseong: { id: 'gangseong', name: '강성', art: gangseongArt, color: '#c7cbe8' },
  sunju: { id: 'sunju', name: '순주', art: sunjuArt, color: '#ead9b0' },
  cheongok: { id: 'cheongok', name: '청옥', art: cheongokArt, color: '#ff9b9b' },
  akiko: { id: 'akiko', name: '아키코', art: akikoArt, color: '#ffd0da' },
  masayo: { id: 'masayo', name: '마사요', art: masayoArt, color: '#bfe8d8', height: 0.92 },
  gendarme: { id: 'gendarme', name: '헌병', art: '', color: '#d8d28c', height: 0.98 },
  megumi: { id: 'megumi', name: '메구미', art: megumiArt, color: '#d6c4f0', height: 0.9 },
}

export function textureKey(id: ActorId) {
  return `actor-${id}`
}
