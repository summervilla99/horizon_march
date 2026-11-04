import type { DialogueTree } from '../types'

// 대본 pp.9-13 "입영 ~ 반자이" 장면을 축약·각색한 Ch.5 대화 트리.
// '반자이를 외칠 것인가 / 거부할 것인가'는 기획안 §4 Ch.5에서 계획한
// "결말에는 영향 없는 감정적 선택" 분기를 실제로 구현한 것.
export const enlistmentTree: DialogueTree = {
  start: {
    id: 'start',
    speaker: '야스다',
    text: '강성, 혼인신고 부탁해. 내 제사도 셋이서 제대로 해줘야지? 요령 피우지 말고.',
    next: 'gangseong_reply',
  },
  gangseong_reply: {
    id: 'gangseong_reply',
    speaker: '강성',
    text: '내가 다 해줄게.',
    next: 'ganemura_reply',
  },
  ganemura_reply: {
    id: 'ganemura_reply',
    speaker: '가네무라',
    text: '네가 기뻐할 수 있도록, 뭐든 할 테니까!',
    next: 'narration_notice',
  },
  narration_notice: {
    id: 'narration_notice',
    speaker: '(내레이션)',
    text: '며칠 뒤, 야스다 앞으로 빨간 종이 한 장이 도착했다. "입영통지서. 축하합니다."',
    next: 'sunju_worry',
  },
  sunju_worry: {
    id: 'sunju_worry',
    speaker: '순주',
    text: '계속해도 소용없는 전쟁인데... 이제 와서 또 끌려가다니.',
    next: 'yasuda_joke',
  },
  yasuda_joke: {
    id: 'yasuda_joke',
    speaker: '야스다',
    text: '됐어. 이제 됐어. 이게 더 좋다고 생각해 봐. 저 괴물이랑 평생 사는 거랑, 전쟁에서 죽는 거랑, 어느 쪽이 더 지옥일까?',
    next: 'dock_banzai_prompt',
  },
  dock_banzai_prompt: {
    id: 'dock_banzai_prompt',
    speaker: '(내레이션)',
    text: '부두에 모인 사람들이 입을 모아 외친다. "반자이!" 이제 당신 차례다.',
    choices: [
      { text: '"반자이!" 라고 크게 외친다', next: 'branch_banzai' },
      { text: '입을 다물고 고개만 숙인다', next: 'branch_silent' },
    ],
  },
  branch_banzai: {
    id: 'branch_banzai',
    speaker: '야스다',
    text: '반자이! ...목소리는 컸지만, 마음은 자꾸만 가라앉는다.',
    next: 'friends_cry',
  },
  branch_silent: {
    id: 'branch_silent',
    speaker: '야스다',
    text: '...말이 나오지 않는다. 그저 고개를 숙인 채, 가슴 속으로만 되뇐다. 살아서 돌아가야 해.',
    next: 'friends_cry',
  },
  friends_cry: {
    id: 'friends_cry',
    speaker: '강성·순주·가네무라',
    text: '우리는 다른 나라를 위해 죽어야 하는 게 아니야! 고향을 위해 죽어야 하는 것도 아니야! 반드시, 반드시 돌아오라!',
    next: 'yasuda_vow',
  },
  yasuda_vow: {
    id: 'yasuda_vow',
    speaker: '야스다',
    text: '...기다려. 꼭 돌아올게.',
  },
}
