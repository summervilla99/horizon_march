import type { ChapterScene } from './ChapterScene'

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
  /** the whole scene plays out in this async script */
  play: (s: ChapterScene) => Promise<void>
}

export interface RunnerSceneDef {
  kind: 'runner'
  id: string
}

export type SceneDef = StoryScene | RunnerSceneDef

export interface ChapterDef {
  no: number
  title: string
  sub: string
  scenes: SceneDef[]
}
