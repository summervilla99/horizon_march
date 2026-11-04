import type { DialogueTree } from '../types'

// 대본 pp.3-4 "아키코의 집 앞" 설탕 흥정 장면을 축약·각색한 샘플 대화 트리.
export const akikoSugarTree: DialogueTree = {
  start: {
    id: 'start',
    speaker: '야스다',
    text: '저기요, 실례합니다. 실례합니다!',
    next: 'akiko_greet',
  },
  akiko_greet: {
    id: 'akiko_greet',
    speaker: '아키코',
    text: '네-아, 안녕하세요.',
    next: 'yasuda_pitch',
  },
  yasuda_pitch: {
    id: 'yasuda_pitch',
    speaker: '야스다',
    text: '안녕하세요. 좀 어떠세요? 오늘 좋은 걸 구했는데요-',
    next: 'akiko_ask',
  },
  akiko_ask: {
    id: 'akiko_ask',
    speaker: '아키코',
    text: '설탕 같은 거 있나요?',
    next: 'yasuda_have',
  },
  yasuda_have: {
    id: 'yasuda_have',
    speaker: '야스다',
    text: '있어요. 한 근에 얼마면 좋을지, 한번 흥정해봐요!',
    // next가 없는 리프 노드 — PrologueScene이 대화 종료를 감지해 흥정 미니게임을 시작한다.
  },
  deal_great: {
    id: 'deal_great',
    speaker: '아키코',
    text: '우와, 저한테 딱 좋은 가격이에요! 역시 야스다 씨밖에 없어요.',
    next: 'gift1',
  },
  deal_good: {
    id: 'deal_good',
    speaker: '아키코',
    text: '음, 나쁘지 않네요. 이 정도면 괜찮아요. 한 근 주세요.',
    next: 'gift1',
  },
  deal_poor: {
    id: 'deal_poor',
    speaker: '아키코',
    text: '어... 이건 좀 아쉬운 가격인데요. 그래도... 고마워요.',
    next: 'gift1',
  },
  gift1: {
    id: 'gift1',
    speaker: '야스다',
    text: '아! 좋은 걸 구했다고 했죠? 자, 여기. (가방에서 포장을 꺼낸다)',
    next: 'gift2',
  },
  gift2: {
    id: 'gift2',
    speaker: '아키코',
    text: '뭐예요?',
    next: 'gift3',
  },
  gift3: {
    id: 'gift3',
    speaker: '야스다',
    text: '꼬끼. 소꼬끼. 드릴게요.',
    next: 'gift4',
  },
  gift4: {
    id: 'gift4',
    speaker: '아키코',
    text: '안 돼요! 이건 받을 수 없어요. 야스다 씨가 드세요.',
    next: 'gift5',
  },
  gift5: {
    id: 'gift5',
    speaker: '야스다',
    text: '어려울 때는 서로 도와야죠.',
    next: 'gift6',
  },
  gift6: {
    id: 'gift6',
    speaker: '아키코',
    text: '(...) 고마워요.',
  },
}
