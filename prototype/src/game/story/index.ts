import type { ChapterDef, SceneDef } from '../script'
import { part1 } from './part1'
import { part2 } from './part2'

export const CHAPTERS: ChapterDef[] = [...part1, ...part2]

/** Every scene in play order, with its chapter. */
export const FLAT: { def: SceneDef; chapter: ChapterDef }[] = CHAPTERS.flatMap((chapter) =>
  chapter.scenes.map((def) => ({ def, chapter })),
)
