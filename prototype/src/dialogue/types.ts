export interface DialogueChoice {
  text: string
  next: string
}

export interface DialogueLine {
  id: string
  speaker: string
  text: string
  next?: string
  choices?: DialogueChoice[]
}

export type DialogueTree = Record<string, DialogueLine>
