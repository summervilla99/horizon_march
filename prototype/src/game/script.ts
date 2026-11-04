import type { ChapterScene } from './ChapterScene'
import type { Bgm } from './audio'

export type StageId =
  | 'harbor-memory' // 1990s pier, no ship, sepia
  | 'deck'
  | 'harbor'
  | 'street-day'
  | 'street-night'
  | 'interior-day'
  | 'interior-night'

export interface StoryScene {
  kind: 'story'
  id: string
  stage: StageId
  /** world width in screens (street stages used for the running montage are wider) */
  world?: number
  /** music at the start of the scene (null = silence); keeps playing if it's already the current track */
  bgm?: Bgm | null
  /** sea ambience volume 0..1 (defaults by stage) */
  sea?: number
  /** the whole scene plays out in this async script */
  play: (s: ChapterScene) => Promise<void>
}

export interface RunnerSceneDef {
  kind: 'runner'
  id: string
  bgm?: Bgm | null
}

export type SceneDef = StoryScene | RunnerSceneDef

export interface ChapterDef {
  no: number
  title: string
  sub: string
  scenes: SceneDef[]
}
