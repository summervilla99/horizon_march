import type { ChapterDef } from '../script'
import { score } from '../../minigames/TimingBar'

export const part1: ChapterDef[] = [
  // ------------------------------------------------------------------------------------------ 1
  {
    no: 1,
    title: '노인들의 부두',
    sub: '1990년대 후반',
    scenes: [
      {
        kind: 'story',
        id: 'pier-1990',
        stage: 'harbor-memory',
        bgm: null,
        sea: 0.6,
        async play(s) {
          const ya = s.put('yasudaOld', 0.36, { face: 'right' })
          const ga = s.put('ganemuraOld', 0.6, { face: 'left' })
          void s.caption('시대는 1990년대 후반. 파도 소리가 울려퍼지는 부두. 두 노인이 수평선을 바라보고 있다.', 3600)
          await s.wait(900)
          ga.faceToward(ya.x)
          await s.talk([
            ['가네무라(노)', '언제까지 있으려고?'],
            ['야스다(노)', '바다가 예쁘잖아. 좀 더 보고 싶어.'],
            ['가네무라(노)', '50년을 헛 살았구만-'],
            ['야스다(노)', '뭐?'],
            ['가네무라(노)', '집에 가기 싫어? 50년이나 지났는데 아직도 아내가 무서워?'],
            ['야스다(노)', '넌 50년이나 이어진, 나만의 새로운 식민지 생활을 모르니까 그렇게 쉽게 말하지.'],
            ['가네무라(노)', '다들 죽었구나. 여기까지 함께 배를 타고 온 친구들은.'],
            ['야스다(노)', '내 눈 앞엔 아직 생생해.'],
            ['가네무라(노)', '나도 아직 보여. 여기서 돈을 왕창 벌어서 부자가 될 수 있을 거라고 믿고, 있는 힘껏 살았지.'],
            ['야스다(노)', '다들 죽어버렸네.'],
            ['가네무라(노)', '우리 둘만 남았어. 일본어를 못 하는 아저씨라고 젊은 사람들도 비웃었지.'],
            ['야스다(노)', '비웃어도 괜찮아. 아무것도 모르는 젊은이들이 웃는 건 괜찮아. 웃을 수 없는 시대였으니까.'],
            ['가네무라(노)', '너, 아키코짱 얘기지? 좋아했잖아.'],
          ])
          void ya.shake(6, 500)
          await s.talk([
            ['야스다(노)', '대체 뭐라는 거야! 그런 이름은 까맣게 잊어버렸어.'],
            ['가네무라(노)', '숨기지 않아도 괜찮아. 이 변태 영감탱이야.'],
            ['야스다(노)', '죽을래?! 너, 개쳐맞으면서 50년 사는 거랑, 비웃음 당하면서 50년 사는 거랑 어느 쪽이 더 낫겠냐!?'],
            ['가네무라(노)', '개새끼처럼 시끄럽게 왈왈거리지 마라!'],
          ])
          // the bickering turns into a standoff — the player taps them into their fighting stances
          const mid = (ya.x + ga.x) / 2
          const x0 = [ya.x, ga.x]
          await s.mash({
            title: '실랑이!',
            hint: '탭해서 두 노인을 싸움 자세로 만들자',
            seconds: 6,
            goal: 14,
            onTap: (p) => {
              ya.x = x0[0] + (mid - 40 - x0[0]) * p
              ga.x = x0[1] + (mid + 40 - x0[1]) * p
              ya.faceToward(ga.x)
              ga.faceToward(ya.x)
              void ya.hop(8, 100)
              void ga.hop(8, 100)
            },
          })
          ya.faceToward(ga.x)
          ga.faceToward(ya.x)
          await Promise.all([ya.shake(6, 600), ga.shake(6, 600)])
          await s.caption('두 노인은 실랑이를 하다 싸움 자세를 취한다.', 2200)
          s.flash(0xfff6dc, 700)
          s.sepia(false, 900)
          s.sea(0.18, 2500)
          s.music('daepan', 2200)
          await s.wait(500)
        },
      },
    ],
  },
  // ------------------------------------------------------------------------------------------ 2
  {
    no: 2,
    title: '대판이다, 대판!',
    sub: '60년 전, 1930년대 후반',
    scenes: [
      {
        kind: 'story',
        id: 'deck',
        stage: 'deck',
        bgm: 'daepan',
        async play(s) {
          await s.card('60년 전', '시대는 1930년대 후반', 1100)
          s.horn()
          const y = s.put('yasuda', 0.3, { face: 'right', lane: 470 })
          const g = s.put('ganemura', 0.46, { face: 'left', lane: 470 })
          void Promise.all([y.shake(5, 500), g.shake(5, 500)])
          void s.caption('배 위. 붐비는 승객들. 희망을 품고 술렁거린다.', 2600)
          const gs = s.enter('gangseong', 0.66, 'right', { speed: 300, lane: 478 })
          const sj = s.enter('sunju', 0.8, 'right', { speed: 300, lane: 462 })
          await Promise.all([gs, sj])
          await s.talk([
            ['강성', '너희들 언제까지 싸울래? 도착했어!'],
            ['순주', '일본이야! 대판이다!'],
          ])
          await Promise.all([y.hop(30, 300), g.hop(30, 300)])
          await s.talk([
            ['가네무라', '어!'],
            ['야스다', '진짜?!'],
            ['야스다', '짐 좀 챙겨, 순백이 동생아!'],
            ['순주', '순주라고 불러!'],
            ['야스다', '내가 첫번째로 내려야지!'],
            ['가네무라', '내가 제일 먼저 내릴 거야!'],
            ['순주', '네명이 함께 와서 다행이다.'],
            ['강성', '인연이 이어져 있는거지.'],
            ['순주', '청옥이는 어떻게 됐어?'],
            ['야스다', '응?'],
            ['가네무라', '제주도에서 너를 쫓아다니던 괴물말이야. 먼저 일본으로 건너갔지?'],
            ['순주', '무서운 소리 마.'],
            ['야스다', '좋은 남자 찾았겠지. 여자는 미련이 없거든.'],
            ['순주', '난 오빠를 찾아야지! 우선 자리를 잡고 돈을 벌면서 찾아볼 거야.'],
            ['야스다', '찾을 수 있을 거야! 여기서 돈을 왕창 벌어서 제주도로 돌아가면 우린 영웅이 될 거야! 대판이다, 대판!'],
          ])
          await s.cheer(['yasuda', 'ganemura', 'gangseong', 'sunju'], 2)
          await s.caption('네 사람, 배에서 내린다.', 1400)
        },
      },
      {
        kind: 'story',
        id: 'dock-drum',
        stage: 'harbor',
        bgm: 'daepan',
        async play(s) {
          const y = s.put('yasuda', 0.2, { face: 'right' })
          const g = s.put('ganemura', 0.32, { face: 'right', lane: 475 })
          const gs = s.put('gangseong', 0.44, { face: 'right', lane: 440 })
          const sj = s.put('sunju', 0.55, { face: 'right', lane: 468 })
          await s.caption('네 사람이 공기를 만끽하려 할 때-', 1800)
          s.music('cheongok', 900)
          const c = await s.enter('cheongok', 0.9, 'right', { speed: 150 })
          c.face('left')
          await s.say('청옥', '기반아!!')
          s.shakeCam(300, 0.01)
          await Promise.all([y, g, gs, sj].map((a) => a.hop(26, 260)))
          await s.talk([
            ['청옥', '용케도 나한테서 도망쳤구나!!'],
            ['야스다', '어떻게 여기 있는 거야?!'],
            ['순주', '뭔 소리야?'],
            ['야스다', '두달 전에 배를 타려고 했을 때, 저 녀석이 먼저 타 있는 걸 보고 바다에 뛰어들어서 출발을 늦췄어.'],
            ['가네무라', '그래서 우리랑 같이 왔구나!'],
            ['청옥', '매일 매일 배가 오는 걸 기다렸어!'],
            ['야스다', '이제 나 좀 쫓아다니지마!'],
            ['청옥', '일 안하는 제주도 남자는 한심한 놈이지만! 그런데도 그런 남자한테 시집가겠다고 하고 있잖아! 고맙다고 말해!'],
            ['야스다', '단념해주면 고맙다고 말할게!'],
            ['청옥', '널 사랑한다고!'],
          ])
          await s.caption('청옥이 북을 꺼내 들었다! 쿵 소리에 맞춰 점프해서 충격파를 피하자.', 2600)
          const r = await s.drum({ leader: y, drummer: c, victims: [g, gs, sj] })
          if (r.dodged >= Math.ceil(r.total * 0.6)) await s.say('야스다', '하하! 이번엔 안 맞았다! ...앗, 다들 쓰러졌네.')
          else await s.say('야스다', '으윽... 이 여자, 북이 무기야...!')
          s.music('daepan', 1500)
          await s.say('야스다', '도망쳐!')
          await Promise.all([y, g, gs, sj].map((a) => a.hop(34, 260)))
        },
      },
      {
        kind: 'story',
        id: 'osaka-run',
        stage: 'street-day',
        bgm: 'daepan',
        world: 3.2,
        async play(s) {
          const ids = ['yasuda', 'ganemura', 'gangseong', 'sunju'] as const
          const xs = [150, 100, 52, 6]
          ids.forEach((id, i) => s.put(id, xs[i], { abs: true, lane: 440 + i * 18, face: 'right' }))
          const c = s.put('cheongok', -150, { abs: true, face: 'right' })
          s.setFollow(s.actor('yasuda'), true)
          void s.caption('오사카의 거리. 힘차게 달리는 네 사람. 화려한 일본의 풍경이 지나간다.', 3200)
          ids.forEach((id) => (s.actor(id).marching = true))
          c.marching = true
          const end = s.worldW - 190
          void c.walkTo(end - 300, 232)
          await s.runAcross([...ids], end, 300, 'yasuda')
          ids.forEach((id) => (s.actor(id).marching = false))
          c.marching = false
          await s.say('', '전속력으로 도망치는 모습이 즐거워 보인다.')
        },
      },
    ],
  },
  // ------------------------------------------------------------------------------------------ 3
  {
    no: 3,
    title: '오십 전 아저씨',
    sub: '1940년대, 야스다와 아키코',
    scenes: [
      {
        kind: 'story',
        id: 'akiko-sugar',
        stage: 'street-day',
        bgm: 'daepan',
        async play(s) {
          await s.card('1940년대', '어느 집 앞', 1900)
          const y = s.put('yasuda', 0.2, { face: 'right' })
          await y.walkTo(s.fx(0.38), 150)
          await s.say('야스다', '저기요, 실례합니다. 실례합니다!')
          await s.caption('야스다, 조금 긴장하고 있다. 집 안에서 아키코가 나온다.', 1800)
          s.music('akiko', 1500)
          const a = await s.enter('akiko', 0.62, 'right', { speed: 120 })
          a.face('left')
          await s.talk([
            ['아키코', '네-아, 안녕하세요.'],
            ['야스다', '안녕하세요. 오늘 좋은 걸 구했는데요-'],
            ['아키코', '설탕 같은 거 있나요? 한 근에 얼마 정도 할까요?'],
          ])
          const reactions: Record<number, Record<string, string[][]>> = {
            0: {
              perfect: [['야스다', '음, 70쩬 정도면 어때요?'], ['아키코', '에이, 정말?']],
              good: [['야스다', '음, 70쩬 정도면 어때요?'], ['아키코', '에이, 정말?']],
              miss: [['야스다', '으, 음... 70쩬?'], ['아키코', '에이, 정말요?']],
            },
            1: {
              perfect: [['야스다', '아니면 60쩬?'], ['아키코', '60센이요? 조금만 더요!']],
              good: [['야스다', '아니면 60쩬?'], ['아키코', '60센이요? 조금만 더요!']],
              miss: [['야스다', '아니면... 60쩬?'], ['아키코', '60센이요? 조금만 더요!']],
            },
            2: {
              perfect: [['야스다', '에이, 이제 잘하시네. 50쩬은 어때요?'], ['아키코', '고마워요. 한 근 주세요.']],
              good: [['야스다', '에이, 이제 잘하시네. 50쩬은 어때요?'], ['아키코', '고마워요. 한 근 주세요.']],
              miss: [['야스다', '에이... 50쩬은 어때요?'], ['아키코', '(빙그레) 고마워요. 한 근 주세요.']],
            },
          }
          const grades = await s.timing({
            title: '가격 흥정!',
            hint: '초록 구간에서 멈추면 아키코가 활짝 웃어요',
            rounds: 3,
            button: '이 가격!',
            roundLabel: (i) => ['70쩬 부를까?', '60쩬은 어때?', '50쩬으로 마무리!'][i],
            async after(i, grade) {
              void (grade === 'miss' ? a.shake(3, 300) : a.hop(14, 200))
              await s.talk(reactions[i][grade] as unknown as [string, string][])
            },
          })
          await s.say('', score(grades) > 0.5 ? '아키코가 환하게 웃는다. 야스다의 얼굴이 새빨개졌다.' : '아키코가 쑥스러운 듯 웃는다. 야스다도 따라 웃었다.')
          await s.talk([
            ['', '아키코, 1엔짜리 지폐로 계산한다.'],
            ['야스다', '자, 거스름돈 50쩬입니다.'],
            ['아키코', '(빙그레 웃으며) 감사합니다. 점점 더 비싸지는 것 같더라구요? 암거래로 사는 게...'],
            ['야스다', '물건이 없으니까...'],
            ['아키코', '쌀 한 되가 45센인데, 암거래로 사면 15엔이래요. 한 근에 45센인 설탕을 18엔이나 받는다니까요?'],
            ['야스다', '그게 시세군요.'],
            ['아키코', '야스다 씨는 왜 싸게 팔아 주시는 거예요?'],
            ['야스다', '어, 그건-힘들 때에는 서로 도와야죠!'],
            ['아키코', '야스다 씨는 좋은 분이에요.'],
            ['야스다', '그, 그렇지 않습니다. 이게 당연하죠.'],
            ['아키코', '들은 이야기로는 쌀 18엔, 설탕 20엔에 파는 사람도 있대요.'],
            ['야스다', '진짜?! 암거래의 상도덕이 없는 놈이네. 아키코 짱. 그런 사람한테는 절대 사지 마세요.'],
            ['아키코', '야스다 씨 말고는 아무한테도 안 사요. 제 몫은 팔지 말아주세요.'],
            ['야스다', '난 항상 아키코 짱 건 남겨두고 있어요.'],
            ['아키코', '고마워요. ...어떻게 되려나. 전쟁.'],
            ['야스다', '위험하다고 하더라고요.'],
            ['아키코', '아, 이런 말 하면 안 돼요. 우리 아빠는 학교 선생님이니까, 저도 모범을 보여야 하는데.'],
            ['아키코', '다들 나라를 위해 열심히 노력하고 있는데 우리 집은 남들보다 좋은 음식만 사먹고. 어쩌면 난, 국민의 자격이 없는 사람일지도 몰라요.'],
            ['야스다', '그런 생각 하지 마세요! 고향에서 기다리고 있는 사람이 잘 먹고 기운 내야죠.'],
            ['야스다', '아! 아까 좋은 걸 구했다고 했죠? 자, 여기. 꼬끼. 소꼬끼. 드릴게요.'],
            ['아키코', '안 돼요! 이건 받을 수 없어요. 야스다 씨가 드세요.'],
            ['야스다', '난, 혼자 사니까 이런 거 안 먹어도 돼요. 어려울 때는 서로 도와야죠.'],
            ['아키코', '(…) 고맙습니다.'],
          ])
          // Akiko steps closer, reaching for his hand — the player decides what Yasuda does
          await s.caption('아키코가 한 걸음, 두 걸음 다가온다. 야스다의 손과 포장에 손을 뻗는다…', 1800)
          await a.walkTo(y.x + 52, 70)
          void a.hop(6, 200)
          const pick = await s.choose('야스다', '(아키코의 손이 닿으려 한다!)', ['1. 가만히 있기', '2. 부끄러워서 피하기'])
          if (pick === 0) {
            s.flash(0xffe0e8, 500)
            void y.shake(3, 600)
            await s.say('', '아키코가 야스다의 손과 포장을 겹쳐 잡는다. 야스다, 얼굴이 새빨개진다…')
            await s.talk([
              ['야스다', '나, 나, 나 갈게요!'],
              ['아키코', '정말 고마워요.'],
            ])
            void a.hop(10, 200)
            y.face('left')
            await y.walkTo(s.fx(-0.1), 260)
          } else {
            y.face('left')
            void y.hop(26, 220)
            await y.walkTo(y.x - 70, 360)
            a.face('right')
            await s.say('', '아키코의 손이 허공을 갈랐다. 야스다는 부끄러워 한 발 물러났다.')
            await s.talk([
              ['야스다', '아, 아니, 그게, 저는, 그, 갈게요!'],
              ['아키코', '아… 죄, 죄송해요! 저, 저도 이만!'],
            ])
            void a.shake(4, 300)
            void y.walkTo(s.fx(-0.1), 380)
            await a.walkTo(s.fx(1.15), 330)
          }
          s.remove('akiko')
          await s.sepia(true, 800)
          await s.talk([
            ['야스다', '먹을 게 없어서 다들 힘들어하는데, 그런 어려운 상황을 이용해서 비싸게 팔아먹다니. 진짜 나쁜 놈들이 다 있네. 아키코짱, 미안해. 그거, 내 얘기야!'],
            ['', '"야스다 씨! 아무리 그래도 쌀 18엔은 너무 비싸다고요!"\n"그럼 안 사면 되잖아요! 사고 싶어 하는 사람은 얼마든지 있거든요!"'],
            ['', '"야스다 씨! 설탕 20엔은 아무리 그래도 너무해요!"\n"그럼 바다 가서 소금이라도 핥아 먹어! 물건이 없는 시대잖아! 곤란할 때는 서로 도와야지!"'],
            ['야스다', '다른 곳에서 비싸게 팔고, 그 만큼 아키코짱에게 싸게 팔아. 남는 돈은 저축해. 나는 대학에 가고 싶으니까.'],
            ['야스다(노)', '벚꽃나무도 초록빛으로 물들었네. 일본에 와서 벚꽃이 흩날리는 것을 몇 번이나 보았을까. 일본 성으로 바꾸지 않으면 안된다고 해서, 잘 모르는 채로 아는 야스다 가문의 성을 따라서 야스다라고 지었지. 야스다 모토노리.'],
          ])
          s.sepia(false, 900)
          s.music('daepan', 2000)
        },
      },
    ],
  },
  // ------------------------------------------------------------------------------------------ 4
  {
    no: 4,
    title: '밥은 먹고 가!',
    sub: '청옥의 집 앞, 그리고 순주',
    scenes: [
      {
        kind: 'story',
        id: 'rice-sunju',
        stage: 'street-day',
        bgm: 'daepan',
        async play(s) {
          const y = s.put('yasuda', 0.5, { face: 'right' })
          await s.say('야스다', '고향은 어떻게 되어가고 있을까. 일본이 지면 고향은 어떻게 되는 거지...')
          await s.caption('야스다, 청옥의 집 앞을 지나간다.', 1500)
          const c = s.put('cheongok', 1.2, { face: 'left' })
          s.music('cheongok', 900)
          await c.walkTo(s.fx(0.74), 330)
          void c.hop(20, 200)
          s.shakeCam(240, 0.006)
          await s.say('청옥', '어서 와! 고생했어!')
          await y.walkTo(s.fx(0.26), 160)
          y.face('right')
          await s.caption('청옥이 밥그릇을 닥치는 대로 던진다! 날아오는 밥에 맞춰 점프해서 피하자!', 2600)
          const r = await s.rice({ leader: y, thrower: c })
          if (r.dodged >= Math.ceil(r.total / 2)) {
            await s.say('청옥', '밥은 먹고 가!!')
            await s.say('야스다', '안 먹어! 안 먹는다고!')
          } else {
            await s.say('청옥', '밥은 먹고 가!')
            await s.say('야스다', '으억! 얼굴에 밥이... ...잘 먹었습니다.')
          }
          c.face('right')
          await s.exit('cheongok', 'right', 140)
          s.music('daepan', 1800)
          y.face('right')
          await s.talk([
            ['야스다', '깜짝 놀랐어! 무서웠어! 언제까지 쫓아다닐 생각이지?'],
            ['야스다', '저런 여자보다 아키코짱이 더 좋아. 항상 거스름돈이 오십쩬. 아키코짱은 항상 쑥스러운 듯이 웃어.'],
            ['야스다', '아키코짱. 좋은 걸 구했다고 말했잖아요?'],
          ])
          await s.caption('야스다, 주머니에서 반지를 꺼낸다.', 1800)
          await s.talk([
            ['야스다(노)', '전쟁은 점점 격해지고 있지만-'],
            ['야스다', '것보다... 우리... 어떻게 좀 잘 해보고 싶은데-'],
          ])
          const sj = await s.enter('sunju', 0.72, 'right', { speed: 150 })
          sj.face('left')
          await s.talk([
            ['순주', '아.'],
            ['야스다', '아. 순백이 동생.'],
            ['순주', '순주라고 불러.'],
            ['야스다', '뭐야?'],
            ['순주', '결혼하는 거야...?'],
            ['야스다', '잠깐, 잠깐만. 내 혼잣말 들었어? 아, 혹시나 그렇게 되면 좋겠다고 생각한 것뿐인데...'],
            ['순주', '(불쌍한 사람을 보는 눈빛으로) 축하해.'],
            ['야스다', '말과 표정이 너무 다르잖아.'],
          ])
          await s.exit('sunju', 'right', 420)
          await s.say('야스다', '뭐야, 저 녀석?')
        },
      },
    ],
  },
  // ------------------------------------------------------------------------------------------ 5
  {
    no: 5,
    title: '괴물과 결혼?!',
    sub: '강성의 집, 소문, 그리고 북소리',
    scenes: [
      {
        kind: 'story',
        id: 'gangseong-house',
        stage: 'interior-day',
        bgm: 'daepan',
        async play(s) {
          s.put('ganemura', 0.3, { face: 'right' })
          const k = s.put('gangseong', 0.58, { face: 'left' })
          await s.caption('강성의 집.', 1200)
          await s.talk([
            ['가네무라', '그래, 아무리 법이 있어도 먹고는 살아야지. 그러니까 암묵적으로 묵인해주는 거야.'],
            ['가네무라', '그런데도 2엔, 3엔 더 비싸게 파는 놈이 나오면 어떡해. 관청의 압박 때문에 이제 더는 봐줄 수가 없대.'],
            ['강성', '나쁜 놈들은 어디나 있네.'],
            ['가네무라', '이러다가 나도 밀고당해 조사받게 될거야. 그땐 도망쳐야 돼.'],
            ['강성', '(…)'],
            ['', '아기 울음소리가 들린다.'],
          ])
          void k.hop(14, 200)
          await s.talk([
            ['강성', '아이고 공주님, 똥 쌌어요? 기저귀 갈아 줄게요.'],
            ['가네무라', '내가 해줄게.'],
            ['강성', '왜?'],
            ['가네무라', '일본에 건너와서 처음으로 태어난 소중한 아이잖아? 잘 보살펴 주고 싶은데, 난 곧 도망쳐야 될지도 모르니까.'],
          ])
          const y = await s.enter('yasuda', 0.82, 'right', { speed: 200 })
          y.face('left')
          await s.talk([
            ['가네무라', '아이고야.'],
            ['야스다', '뭐야?'],
            ['강성', '아이고, 그래.........(불쌍한 사람을 보는 눈빛으로) 축하해...'],
            ['가네무라', '(불쌍한 사람 보는 눈빛으로) 축하해... 결혼하는 거지? 그 괴물이랑.'],
            ['강성', '어쩔 수 없이 하는 거야. 청옥이랑.'],
            ['야스다', '잠깐만! 나 빼고 왜 독단적으로 결정하는데!'],
            ['강성', '모두에게 말하면서 돌아다니고 있어.'],
            ['가네무라', '아까 무서운 광경을 봤어. 그 여자, 헌병이랑 싸우고 있었어. 헌병이 "너, 조센징이지!"라고 하니까 "조센징 아니야. 난 아무도 아니야! 난 오직 안기반의 아내야!"라고 했어.'],
            ['야스다', '뭐?!'],
            ['강성', '온 동네에 소문 다 났어.'],
            ['가네무라', '이미 네 인생 다 포기한 줄 알았어.'],
            ['야스다', '너 죽여버린다!!'],
            ['가네무라', '죽여봐라!'],
          ])
          await s.say('', '야스다, 가네무라를 붙잡는다. 그러다 갑자기 — 야스다가 뛰쳐나간다.')
          s.actor('yasuda').marching = true
          await y.walkTo(s.fx(-0.15), 380)
        },
      },
      {
        kind: 'story',
        id: 'cheongok-door',
        stage: 'street-day',
        bgm: 'cheongok',
        async play(s) {
          const c = s.put('cheongok', 0.72, { face: 'left' })
          const y = s.put('yasuda', -120, { abs: true, face: 'right' })
          await s.caption('청옥의 집 앞. 야스다, 뛰어든다.', 1600)
          await y.walkTo(s.fx(0.36), 360)
          await s.talk([
            ['청옥', '아이고! 어서 와!'],
            ['야스다', '어서 와! 가 아냐! 적당히 해 이 녀석아!'],
          ])
          await y.walkTo(c.x - 60, 300)
          await s.say('', '야스다, 청옥을 끌어당겨서 발차기를 날린다. 하지만 곧바로 청옥에게 얻어맞고 만다.')
          void y.fall(-1, 50)
          const g = await s.enter('ganemura', 0.1, 'left', { speed: 260, lane: 480 })
          const k = await s.enter('gangseong', 0.2, 'left', { speed: 260, lane: 436 })
          await s.talk([
            ['청옥', '놈팽이 제주도 남자 주제에 여자한테 손찌검을 하다니. 용서 못해!'],
            ['야스다', '쓸데없는 소문 퍼뜨리지 마!'],
            ['청옥', '결혼하면 소문이 아니게 되잖아!!'],
          ])
          await s.caption('청옥이 북을 집어 들었다! 야스다를 구경하러 온 사람들까지 휘말린다 — 쿵 소리에 맞춰 점프!', 2800)
          const r = await s.drum({ leader: y, drummer: c, victims: [g, k], beats: 6, title: '청옥의 분노의 북!' })
          await s.say('야스다', r.dodged >= 4 ? '저기요! 헌병 형님! 이놈을 총살 시켜주세요!! ...(다들 쓰러져 있네)' : '저기요! 헌병 형님! 이놈을 총살 시켜주세요!! 이봐~! 모른 척하지 마!')
          await s.say('야스다', '서둘러 걷지 마! 너희들, 조선에서는 거만하게 굴면서! 여기 너네 나라잖아! 당당하게 굴어! 도망치지 마!')
          await s.say('', '야스다, 청옥에게 끌려간다.')
          c.face('right')
          y.face('right')
          void c.walkTo(s.fx(1.2), 160)
          await y.walkTo(s.fx(1.2) - 70, 160)
        },
      },
    ],
  },
]
