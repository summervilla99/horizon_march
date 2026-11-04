import type { DialogueTree } from '../types'

// short one-line flavor chats for the three companions, so every NPC on the
// map is actually talk-to-able, not just 아키코.
export const ganemuraLine: DialogueTree = {
  start: {
    id: 'start',
    speaker: '가네무라',
    text: '오늘은 또 뭘 팔아볼까? 장사 밑천이 똑 떨어질까 봐 걱정이야.',
  },
}

export const gangseongLine: DialogueTree = {
  start: {
    id: 'start',
    speaker: '강성',
    text: '...별일 없지? 무슨 일 있으면 말해.',
  },
}

export const sunjuLine: DialogueTree = {
  start: {
    id: 'start',
    speaker: '순주',
    text: '순백이 동생 소리 좀 그만해... (웃음) 아, 미안. 그냥 해본 말이야.',
  },
}
