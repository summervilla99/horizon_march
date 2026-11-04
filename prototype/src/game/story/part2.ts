import type { ChapterDef } from '../script'
import { popText } from '../../minigames/ui'

export const part2: ChapterDef[] = [
  // ------------------------------------------------------------------------------------------ 6
  {
    no: 6,
    title: '닭꼬끼 아저씨',
    sub: '아키코, 마사요, 메구미',
    scenes: [
      {
        kind: 'story',
        id: 'chicken',
        stage: 'street-day',
        bgm: 'daepan',
        async play(s) {
          const y = s.put('yasuda', 0.3, { face: 'right' })
          const g = s.put('ganemura', 1.1, { face: 'left' })
          const k = s.put('gangseong', 1.2, { face: 'left', lane: 440 })
          const sj = s.put('sunju', 1.3, { face: 'left', lane: 480 })
          void g.walkTo(s.fx(0.62), 200)
          void k.walkTo(s.fx(0.74), 200)
          await sj.walkTo(s.fx(0.5), 200)
          await s.talk([
            ['가네무라', '뭐야, 헛소문이었어?'],
            ['야스다', '당연한 거 아니야! 나한테는 좋아하는 사람이 있단 말이야. 조용히 지켜봐!'],
            ['야스다', '(자세를 가다듬고 심호흡을 하며) 저기요. 저기요. .......안녕하세요.'],
            ['네 사람', '안녕하세요!'],
            ['야스다', '왜 너네가 같이 말하는데! 저 기 숨어서 지켜봐!'],
          ])
          // the three go hide at the far right, small and sulky
          await Promise.all([g.walkTo(s.fx(0.88), 260), k.walkTo(s.fx(0.95), 260), sj.walkTo(s.fx(0.8), 260)])
          g.face('left')
          k.face('left')
          sj.face('left')
          s.music('akiko', 1500)
          await s.enter('akiko', 0.4, 'left', { speed: 150 })
          await s.talk([
            ['아키코', '네? 아, 안녕하세요. 방금 목소리가 되게 많이 들린 것 같은데.'],
            ['야스다', '메아리 아닐까요?'],
            ['아키코', '메아리? 아, 마침 잘됐어요.'],
            ['순주', '뭐야? 꽤 예쁘잖아.'],
            ['가네무라', '그건 좀 재미없는데.'],
            ['아키코', '마사짱, 메구짱-'],
          ])
          const m = await s.enter('masayo', 0.2, 'left', { speed: 200, lane: 470 })
          const mg = await s.enter('megumi', 0.1, 'left', { speed: 200, lane: 440 })
          await s.talk([
            ['', '마사요, 메구미가 다가온다. "이 사람?"이라고 확인하고 있다.'],
            ['야스다', '어라? 찡구인가요?'],
            ['', '마사요와 메구미, 깔깔거리며 웃는다. 아키코, 가볍게 손으로 주의를 준다.'],
            ['아키코', '네. 친구랑 사촌이에요.'],
            ['마사요', '친구 마사요입니다.'],
            ['메구미', '사촌 메구미입니다.'],
            ['야스다', '야스다입니다. 반깝습니다.'],
            ['마사요', '반깝습니다?'],
            ['', '마사요와 메구미, 야스다의 발음을 따라하며 킥킥 웃는다. 숨어서 지켜보는 세 사람의 표정이 흐려진다.'],
          ])
          void Promise.all([m.hop(14, 200), mg.hop(14, 220)])
          const pick = await s.choose('야스다', '오늘 좋은 물건을 구했어요. 이걸 뭐라고 소개하지?', [
            '"닭꼬끼입니다!" (자신 있게)',
            '"닭고기... 입니다." (또박또박)',
          ])
          if (pick === 0) {
            await s.talk([
              ['야스다', '닭꼬끼입니다!'],
              ['마사요', '닭꼬끼?'],
              ['메구미', '닭꼬끼래! (참지 못하고 웃음을 터뜨린다)'],
            ])
            void Promise.all([m.fall(-1, 30), mg.hop(24, 260)])
          } else {
            await s.talk([
              ['야스다', '닭고기... 입니다.'],
              ['마사요', '닭고기? ...어쩐지 "꼬끼"라고 해야 더 맛있게 들려요!'],
              ['메구미', '닭꼬끼! 닭꼬끼! (깔깔)'],
            ])
          }
          await s.say('아키코', '닭고기 한근 주세요!')
          await s.say('', '야스다, 마대자루 속을 보여준다. 즐겁게 대화가 펼쳐진다. 밖에 있던 세 사람은 엿보는 것을 멈춘다.')
          await s.talk([
            ['야스다', '고마워요. 그럼, 거스름돈 50쩬입니다.'],
            ['아키코', '고맙습니다. 마사짱, 메구짱!'],
          ])
          for (const id of ['akiko', 'masayo', 'megumi'] as const) s.actor(id).face('left')
          void s.exit('akiko', 'left', 150)
          void s.exit('masayo', 'left', 170)
          await s.exit('megumi', 'left', 170)
          s.music('daepan', 1800)
          y.face('right')
          await Promise.all([g, k, sj].map((p) => p.walkTo(s.fx(0.7), 200)))
          await s.talk([
            ['야스다', '어때? 예쁘지?'],
            ['', '세 사람, 대답이 없다.'],
            ['야스다', '뭐야? 무슨 일이야? 너무 예뻐서 말문이 막혔냐?'],
            ['가네무라', '나는 그냥 바보인데, 넌 똥멍청이야.'],
            ['야스다', '뭐?'],
            ['순주', '오빠는 이 상황에 웃음이 나와?'],
            ['강성', '나는 말이야, 최소한 내 아이는 비웃음 당하지 않게 키우고 싶어.'],
          ])
          await Promise.all([g.walkTo(s.fx(1.2), 160), k.walkTo(s.fx(1.3), 160), sj.walkTo(s.fx(1.1), 160)])
          for (const id of ['ganemura', 'gangseong', 'sunju'] as const) s.remove(id)
          await s.caption('혼자 남은 야스다.', 1600)
          await s.talk([
            ['야스다', '웃음거리가 되는 게 뭐가 문제야? 이 나라에 와서 아무것도 모르는 상태에서 장사를 시작했을 때, 처음에는 아무도 웃어주지 않았어.'],
            ['야스다', '아키코짱도 처음에는 나를 무서워했는데, 내가 무슨 말을 해야 할지 허둥대다가 "쌀 한 되에 오십쩬으로 어때요?"라고 말하니까 부끄러운 듯이 웃어주었어.'],
            ['야스다', '내 일본어 발음이 어색해서 웃는 건 알았지만, 웃어준 게 너무 기뻤어. 지금은 아무도 웃지 않는 시대야. 웃어주는 아키코짱이 좋아.'],
          ])
          const sj2 = await s.enter('sunju', 0.8, 'right', { speed: 160 })
          sj2.face('left')
          await s.talk([
            ['야스다', '순백이 동생!'],
            ['순주', '어...아...아....'],
            ['야스다', '뭐야? 이름 부르라고 화 안내?'],
            ['순주', '(...) 순백이 동생. 순백이 동생. 응... 나는 무슨 일이 있어도 순백이 동생이야.'],
          ])
          await s.exit('sunju', 'right', 160)
          await s.talk([
            ['야스다', '(…) 얼마전, 순백이는 아마가사키에서 죽었다는 소식을 들었어.'],
            ['야스다(노)', '우리가 오사카에 왔을 때는, 이미 순백이가 죽은 지 2년째였지.'],
            ['야스다', '모두들 기운을 잃어가. 웃으면서 배에서 내린 그날은 이제 신기루 같아.'],
          ])
          // a hopeful beat: the girls pass by waving — answer them as loudly as you can
          y.face('right')
          s.music('akiko', 1500)
          const a2 = s.put('akiko', -80, { abs: true, face: 'right' })
          const m2 = s.put('masayo', -130, { abs: true, face: 'right', lane: 470 })
          const g2 = s.put('megumi', -180, { abs: true, face: 'right', lane: 440 })
          void a2.walkTo(s.fx(0.62), 140)
          void m2.walkTo(s.fx(0.74), 150)
          void g2.walkTo(s.fx(0.86), 150)
          await s.wait(1200)
          s.cameras.main.shake(0, 0)
          await s.talk([
            ['마사요', '아! 50센 아저씨다!'],
            ['메구미', '50센 아저씨 안녕!'],
            ['아키코', '잠깐! 마사짱, 메구짱!'],
            ['', '세 사람 모두 웃으며 손을 흔들고 있다. 야스다, 왠지 모르게 기뻐서 큰 소리로 화답한다.'],
          ])
          const shout = ['네! 50쩬 아저씨예요~!', '갈게요!', '거스름돈 50쩬 가지고!']
          let n = 0
          await s.mash({
            title: '크게 화답하자!',
            hint: '탭할 때마다 야스다가 외친다',
            seconds: 6,
            goal: 12,
            button: '외친다!',
            onTap: () => {
              void y.hop(16, 140)
              popText(s, y.x, y.lane - 215, shout[n++ % shout.length], '#fff3b0', 18, false)
              if (n % 3 === 0) void Promise.all([a2.hop(10, 160), m2.hop(14, 180), g2.hop(14, 200)])
            },
          })
          await s.talk([
            ['마사요', '다음에는 우리 집에도 팔러 오세요~!'],
            ['메구미', '우리 집에도요!'],
            ['야스다', '갈게요! 거스름돈 50쩬 가지고!'],
          ])
          void s.exit('akiko', 'right', 150)
          void s.exit('masayo', 'right', 160)
          await s.exit('megumi', 'right', 160)
          s.music('daepan', 1800)
          s.sepia(true, 1200)
          await s.talk([
            ['야스다', '아무것도 없는 제주도에 있을 땐 일본이 멋진 나라라는 말을 듣고 동경했어. 처음으로 만난 일본은 활기가 넘치고, 모든 게 눈부셨어.'],
            ['야스다', '그런데 히로시마와 나가사키에 큰 폭탄이 떨어지고 많은 사람들이 다치고 죽고, 모두들 겁에 질리고, 움츠러들고, 아무도 웃지 않게 됐어.'],
            ['야스다', '여름의 빌어먹을 더운 아침. 술을 마시고 기분 좋게 집에 돌아왔을 때 나는 빨간 종이 한 장을 받았어. 입영통지서. "축하합니다"라고 적혀 있었어.'],
            ['야스다', '이제 대학은 못 갈 거라는 생각이 들었어. 웃으면서 배에서 내린 그날은 모두가 함께 꾸었던 꿈이었을까. 술이 깨면 다 사라져버리는.'],
          ])
        },
      },
    ],
  },
  // ------------------------------------------------------------------------------------------ 7
  {
    no: 7,
    title: '술 한잔',
    sub: '청옥의 집',
    scenes: [
      {
        kind: 'story',
        id: 'sake',
        stage: 'interior-day',
        bgm: 'cheongok',
        async play(s) {
          const c = s.put('cheongok', 0.66, { face: 'left' })
          const y = s.put('yasuda', -80, { abs: true, face: 'right' })
          await s.caption('청옥의 집. 청옥, 바느질을 하고 있다. 야스다, 가만히 그 모습을 바라본다.', 2600)
          await y.walkTo(s.fx(0.3), 120)
          await s.talk([
            ['청옥', '무슨 일이야?'],
            ['야스다', '술.'],
            ['청옥', '어?'],
            ['야스다', '"어?"가 아니라! 술 내놔라 하면 내놔!'],
            ['청옥', '아침 댓바람부터 갑자기 와서는 누구한테 명령하는 거야! 아직 덜 맞았지?'],
            ['야스다', '시끄러! 아내가 될 거면 순순히 말 좀 들어라!'],
          ])
          void c.hop(24, 220)
          await s.say('', '청옥, 기뻐하며 서둘러 술을 준비한다.')
          await s.say('야스다', '따라.')
          await s.say('', '야스다, 청옥이 따라준 술을 단숨에 마신다. 그리고 청옥에게 술을 따라 줄 차례.')
          const grades = await s.timing({
            title: '술 따르기',
            hint: '잔이 딱 찰 때 멈추자 — 초록 구간!',
            rounds: 2,
            zone: 0.17,
            button: '그만!',
            zoneColor: 0xd8b24a,
            roundLabel: (i) => (i === 0 ? '청옥의 잔에 한 잔' : '한 잔 더'),
            async after(_i, grade) {
              void c.hop(10, 160)
              await s.say('청옥', grade === 'miss' ? '아이고, 흘렸네! ...그래도 좋아!' : grade === 'perfect' ? '딱 알맞아! 역시 내 남편!' : '고마워, 여보!')
            },
          })
          void grades
          await s.talk([
            ['야스다', '너도 마셔.'],
            ['', '청옥, 마신다.'],
            ['야스다', '너랑 나밖에 없지만, 이제 우린 부부야.'],
            ['청옥', '나로 괜찮은 거야?'],
            ['야스다', '혼인신고 같은 어려운 일은 강성한테 다 맡겨. 나는 할 수 없으니까. 내가 없어도 넌 살아갈 수 있겠지...'],
            ['청옥', '무슨 일이야? 기반아-'],
          ])
          await y.walkTo(c.x - 62, 100)
          s.flash(0xffe6b0, 600)
          await s.say('', '야스다, 서서히 청옥을 끌어안는다. 청옥, 당황하면서도 받아들인다. 야스다, 얼굴을 파묻고 흐느낀다.')
          await s.say('', '애절하고 좋은 장면이 될 때, 너무 기뻐서 흥분한 청옥이 야스다를 밀어 넘어뜨린다.')
          await y.fall(-1, 120)
          s.shakeCam(260, 0.01)
          await s.talk([
            ['청옥', '여보!!'],
            ['야스다', '어라? 잠깐만! 아, 아니...! 마지막만큼은 나도 멋있고 싶다고…!'],
          ])
        },
      },
    ],
  },
  // ------------------------------------------------------------------------------------------ 8
  {
    no: 8,
    title: '오늘 밤, 도망쳐야 돼',
    sub: '가네무라의 위기',
    scenes: [
      {
        kind: 'story',
        id: 'crisis',
        stage: 'interior-night',
        bgm: 'daepan',
        async play(s) {
          await s.caption('전환. 강성의 집. 가네무라, 강성, 순주 모여있다.', 2200)
          s.put('ganemura', 0.28, { face: 'right' })
          s.put('gangseong', 0.5, { face: 'left' })
          s.put('sunju', 0.68, { face: 'left', lane: 470 })
          await s.talk([
            ['가네무라', '내가 쌀을 팔던 헌병이 잡혀서 내 이름이 들통난 모양이야. 오늘 밤 중으로 도망칠 거야.'],
            ['순주', '어디로?'],
            ['가네무라', '와카야마. 나 대신, 저 멍청이를 배웅해줘.'],
            ['강성', '내가 맡아줄게.'],
            ['순주', '계속해도 소용없는 전쟁인데... 이제 와서 또 끌려가다니....'],
          ])
          s.music('chulbyeong', 1200)
          const y = await s.enter('yasudaArmy', 0.86, 'right', { speed: 200 })
          y.face('left')
          void y.hop(20, 220)
          await s.talk([
            ['야스다', '어때. 잘 어울리지.'],
            ['야스다', '강성, 혼인신고 부탁해.'],
            ['강성', '내가 다 해줄게.'],
            ['야스다', '내 제사도 셋이서 제대로 해줘야지? 요령 피우지 말라고, 너희들?'],
            ['가네무라', '네가 기뻐할 수 있도록 뭐든 할 테니까!'],
            ['야스다', '(…) 그래, 고마워.'],
            ['순주', '청옥이 울고 있더라. 그 녀석이 우는 거 처음 봤어.'],
            ['가네무라', '불쌍하다.'],
            ['순주', '그래! 저 어디서 간장 한 병 마시고 군대에 안 끌려간 놈이 있다더라!'],
            ['강성', '그래! 간장 마셔, 간장!'],
            ['야스다', '됐어. 이제 됐어. 이게 더 좋다고. 생각해 봐. 어느 쪽이 지옥이야? 전쟁에서 깔끔하게 죽는 거랑, 앞으로 죽을 때까지 저 괴물이랑 함께 사는 거 중에 어느 쪽이 더 지옥일까?'],
            ['순주', '죽는다고 정해진 건 아니잖아.'],
            ['야스다', '저런 여자와 살면 죽고 말거야.'],
            ['강성', '얼마 전에 모닥불을 피우고 있는데, 딸이 "이제는 불 속에 들어가서 죽자"고 하더라. 아직 세 살밖에 안 됐는데-'],
            ['순주', '좀 더 잘 살 수 있을 줄 알았어. 돈도 많이 벌어서 고향에도 보내주고-'],
            ['야스다', '생각해보니 난 출병을 해야지 그 괴물한테서 해방될 수 있는 거야. 막상 가보면 의외로 편할지도 몰라.'],
          ])
          s.shakeCam(300, 0.006)
          await s.say('가네무라', '난, 오늘 밤 도망쳐야 돼. 암거래 손님한테 밀고 당했어.')
          await s.talk([
            ['야스다', '(…)'],
            ['가네무라', '친구 배웅도 못 해줘. 한심하게.'],
            ['야스다', '야! 뭐야 이 새끼들아! 전쟁에 가는 건 나야! 이딴 곳은 정말, 빌어먹을!!'],
          ])
          await s.caption('그때 — 문밖에서 헌병의 군홧발 소리가 들려온다!', 2000)
          s.flash(0xff5040, 500)
          await s.say('가네무라', '들켰어! 먼저 간다!')
        },
      },
      { kind: 'runner', id: 'ganemura-run', bgm: 'chulbyeong' },
    ],
  },
  // ------------------------------------------------------------------------------------------ 9
  {
    no: 9,
    title: '야스다, 입대',
    sub: '출정 전날 밤',
    scenes: [
      {
        kind: 'story',
        id: 'akiko-farewell',
        stage: 'interior-night',
        bgm: 'chulbyeong',
        async play(s) {
          await s.caption('아키코의 집. 아키코와 마사요, 메구미가 라디오를 듣고 있다.', 2400)
          const a = s.put('akiko', 0.3, { face: 'right' })
          const m = s.put('masayo', 0.46, { face: 'right', lane: 470 })
          const mg = s.put('megumi', 0.6, { face: 'left', lane: 440 })
          await s.talk([
            ['마사요', '뭘까? 중요한 방송이라니.'],
            ['메구미', '우리가 전쟁에서 지는 거 아니야?'],
            ['아키코', '메구미! 함부로 말 하면 안 돼!'],
            ['메구미', '말 안 하면 뭐가 달라져?'],
            ['마사요', '히로시마도 나가사키도 엉망진창이 됐는데, 일본은 어떻게 해?'],
            ['아키코', '일단 내일까지 기다릴 수밖에 없어!'],
          ])
          const y = await s.enter('yasudaArmy', 0.82, 'right', { speed: 150 })
          y.face('left')
          await s.talk([
            ['야스다', '저기, 안녕하세요.'],
            ['아키코', '네? 아...안녕하세요...'],
            ['마사요', '아, 50센 아저씨.'],
            ['메구미', '50센 아저씨다.'],
            ['아키코', '그만! 마사요! 메구미!'],
            ['야스다', '.......... 하하, 50쩬 아저씨입니다.'],
            ['마사요', '아...아저씨...'],
            ['메구미', '그 옷....'],
            ['야스다', '잘 어울리나요? 내일 아침 배를 타고 출발합니다. 암거래는 폐업입니다.'],
          ])
          await s.caption('사이.', 1400)
          await s.talk([
            ['아키코', '오메데또 고자이마스!'],
            ['야스다', '(…)'],
            ['마사요 · 메구미', '오메데또 고자이마스!'],
            ['아키코', '오쿠니노 타메니 간밧떼쿠다사이!'],
          ])
          await s.talk([
            ['아키코', '이마 닛뽄와 히로시마토 나가사키니 신가따 바쿠단오 오토사레떼 쿠센시떼마스. 소야케도 코쿠민가 이치간토 낫떼 타타카에바 젯따이니 노리코에레마스. 간밧떼쿠다사이!'],
            ['마사요', '간밧떼쿠다사이!'],
            ['메구미', '간밧떼쿠다사이!'],
          ])
          const pick = await s.choose('야스다', '(…) 뭐라고 대답할까?', ['"네."', '(말없이 웃으며 경례한다)'])
          await s.say('야스다', pick === 0 ? '네.' : '(…)')
          await s.say('', '야스다, 손에 들고 있던 마대자루를 아키코에게 건넨다.')
          await s.talk([
            ['야스다', '이거 받아요. 쌀과 설탕, 그리고 계란, 닭고기가 들어 있어요.'],
            ['아키코', '아니요…받을 수 없어요.'],
            ['야스다', '난, 더 이상은 필요 없잖아요. 받아 주세요.'],
          ])
          void a.hop(10, 200)
          await s.talk([
            ['', '아키코, 받아든다.'],
            ['야스다', '저기, 좋은 걸 구했어요-'],
            ['', '야스다, 주머니에 손을 넣는다. 잠시 동안.'],
            ['야스다', '(…) 하하, 평소 버릇이 나왔네. 죄송합니다. 그럼 멋지게 싸우겠습니다.'],
          ])
          await s.say('', '야스다, 웃으며 경례를 한다. 아키코, 망설이면서 가볍게 경례를 한다.')
          void a.bow(500)
          await y.walkTo(s.fx(1.15), 150)
          s.remove('yasudaArmy')
          await s.talk([
            ['마사요', '이런 때에도 병사들을 보내다니.'],
            ['메구미', '아저씨가 가버리면 엄청 섭섭할 텐데.'],
            ['아키코', '(…) 우리 아빠는 학교 선생님이니까, 나약한 말은 해선 안돼.'],
          ])
          void [m, mg]
        },
      },
      {
        kind: 'story',
        id: 'night-walk',
        stage: 'street-night',
        bgm: 'chulbyeong',
        world: 1.8,
        async play(s) {
          const y = s.put('yasudaArmy', 0.1, { face: 'right' })
          s.setFollow(y, true)
          await s.caption('밤길을 걷는 야스다. (탭해서 걷고, 점프도 해보자!)', 2600)
          await s.goTo('yasudaArmy', 0.45, '조금만 더 걸어가자', false)
          y.stop()
          y.face('left')
          await s.talk([
            ['', '야스다, 아키코의 집 쪽으로 돌아선다.'],
            ['야스다', '많이 먹어주세요. 나쁜 짓을 하더라도 많이 먹고 기운 내세요.'],
            ['야스다', '바보취급을 해도 좋으니 힘껏 웃고 기운 내세요.'],
            ['야스다(노)', '고향이란 것은, 먼 곳에서 너덜너덜 망가진 사람들이 돌아왔을 때 건강하게 맞이해 주어야 돼.'],
            ['야스다(노)', '고향이 건강하게 있어주기 때문에 인간은 머나먼 곳에서도 마음 놓고 망가질 수 있는 거야.'],
            ['야스다', '난, 고향이 멀리 떨어져 있으니까. 잘 알아요...'],
          ])
          // throw the ring away — a power-gauge toss
          const grades = await s.timing({
            title: '반지 던지기',
            hint: '힘을 가득 모았을 때(초록) 탭 — 반지를 힘껏 던져라',
            rounds: 1,
            zone: 0.2,
            button: '던진다!',
            zoneColor: 0xe0b84a,
            roundLabel: () => '반지를 던질 힘!',
          })
          const power = grades[0] === 'perfect' ? 1 : grades[0] === 'good' ? 0.75 : 0.5
          const ring = s.add.circle(y.x + 12, y.lane - 120, 6, 0xf6e27a).setStrokeStyle(2, 0xfff8d0).setDepth(900)
          y.flip = false
          await new Promise<void>((resolve) =>
            s.tweens.add({
              targets: ring,
              x: ring.x + 360 * power,
              duration: 1300,
              ease: 'Linear',
              onUpdate: (tw) => {
                const t = tw.progress
                ring.y = y.lane - 120 - Math.sin(Math.PI * t) * 190 + t * t * 120
                ring.setRotation(t * 20)
              },
              onComplete: () => resolve(),
            }),
          )
          s.flash(0xfff6d0, 400)
          ring.destroy()
          await s.caption('반지가 어둠 속으로 사라졌다. 야스다, 반지를 힘껏 던져버린다.', 2400)
          await y.walkTo(s.fx(0.5) + s.cameras.main.scrollX, 150)
        },
      },
      {
        kind: 'story',
        id: 'harbor-farewell',
        stage: 'harbor',
        bgm: 'chulbyeong',
        async play(s) {
          await s.card('다음날 아침', '항구', 1900)
          s.horn()
          // Yasuda stands on the ship's deck, high up and a little small
          const y = s.put('yasudaArmy', 0.78, { face: 'left', lane: 372 })
          y.scaleMul = 0.78
          await s.caption('아침. 항구. 배 위에서 바다를 바라보고 있는 야스다.', 2400)
          const k = await s.enter('gangseong', 0.28, 'left', { speed: 320, lane: 470 })
          const sj = await s.enter('sunju', 0.42, 'left', { speed: 320, lane: 484 })
          await s.talk([
            ['강성', '기반아!'],
            ['순주', '오빠!'],
            ['야스다', '얘들아! 안 와도 괜찮았는데! 고마워! (…)'],
            ['야스다', '힘있게 반자이 해줘! 자!'],
          ])
          const pick = await s.choose('(강성·순주)', '야스다가 "반자이"를 외쳐 달라고 한다. 어떻게 할까?', ['반자이!!', '…입이 떨어지지 않는다'])
          if (pick === 0) await s.say('강성 · 순주', '반…자…이…? (목소리가 떨린다)')
          else await s.say('', '두 사람은 입술만 깨물고 있다.')
          await s.talk([
            ['야스다', '봐! 반자이! 반자이! 자, 반자이! (…) 말해! 말하라고!'],
            ['', '가네무라가 숨을 헐떡이며 다가온다.'],
          ])
          const g = await s.enter('ganemura', 0.14, 'left', { speed: 380, lane: 450 })
          await s.talk([
            ['가네무라', '기반아!'],
            ['야스다', '이 바보야! 왜 왔어! 빨리 도망쳐!'],
            ['가네무라', '시끄러! 친구가 감신디 나 안위만 챙길 수 이실 말이가?'],
            ['야스다', '멍청한 놈… 너네 바보냐...!'],
          ])
          await s.caption('세 사람, 당당하게 조선어로 외친다. — 함께 외쳐 보자!', 2600)
          const lines = ['살아서 돌아오라!', '반드시 돌아오라!', '우리는 살아야 하는거라!', '고향을 위해서!']
          let n = 0
          await s.mash({
            title: '살아서 돌아와!',
            hint: '탭할 때마다 친구들이 외친다',
            seconds: 7,
            goal: 16,
            button: '외쳐라!',
            onTap: () => {
              const who = [g, k, sj][n % 3]
              void who.hop(16, 150)
              popText(s, who.x, who.lane - 215, lines[n++ % lines.length], '#fff3b0', 18, false)
            },
          })
          await s.talk([
            ['강성', '우리는 다른 나라를 위해 죽어야 하는 게 아니라! 고향을 위해 죽어야 하는 게 아니여! 우리는 살아야 하는거라! 반드시 돌아오라!'],
            ['순주', '살아서 돌아오라!'],
            ['가네무라', '반드시, 반드시 돌아오라!'],
            ['', '사이.'],
            ['', '야스다, 경례한다.'],
            ['야스다', '야스다 모토노리! 다이닛뽄 테이코쿠 쿤진토시떼 립파니 타타캇테 칫테마이리마스!'],
            ['', '세 사람, 분한 듯 주먹을 불끈 쥔다.'],
            ['야스다', '제발…"반자이"라고 외쳐 달라고...!'],
          ])
        },
      },
    ],
  },
  // ------------------------------------------------------------------------------------------ 10
  {
    no: 10,
    title: '종전, 그리고 만세',
    sub: '바다가 모든 것을 감싸 안는다',
    scenes: [
      {
        kind: 'story',
        id: 'radio',
        stage: 'harbor',
        bgm: 'chulbyeong',
        async play(s) {
          const y = s.put('yasudaArmy', 0.78, { face: 'left', lane: 372 })
          y.scaleMul = 0.78
          const g = s.put('ganemura', 0.16, { face: 'right', lane: 450 })
          const k = s.put('gangseong', 0.28, { face: 'right', lane: 470 })
          const sj = s.put('sunju', 0.4, { face: 'right', lane: 484 })
          void y
          // the broadcast starts and keeps playing under the whole exchange; it fades out on "전쟁이 끝났어!"
          s.broadcast()
          await s.caption('잠시 후. 항구에 울려 퍼지는 라디오의 목소리 — 천황의 방송.', 3200)
          s.shakeCam(400, 0.004)
          await s.caption('네 사람은 그때까지의 공기의 차이를 알아차린다.', 2600)
          await s.wait(2500)
          await s.talk([
            ['야스다', '저기, 지금 무슨 얘길 하고 있는 건가요?'],
            ['가네무라', '저기요, 저희들은 일본어를 잘 못하는데, 무슨 뜻인가요?'],
            ['야스다', '저기 아저씨, 울지 말고 좀 말해줘!'],
          ])
          await s.wait(1500)
          await s.say('순주', '전쟁이 끝났어! 전쟁이 끝났다고!')
          s.endBroadcast(2500)
          await s.caption('잠시간의 사이.', 1400)
          await Promise.all([g.jump(60, 460), k.jump(70, 480), sj.jump(80, 500)])
          s.confetti(2500)
          await s.say('', '세 사람, 환호하며 입모양으로 야스다에게 "내려와라!"라고 외친다.')
          await s.say('야스다', '기다려! 지금 내려갈 테니까!')
          await s.caption('야스다, 예전에 희망을 품고 배에서 내렸던 그날처럼 달려가려고 한다. 그때 —', 3000)
          s.music('ed', 2500)
          const c = await s.enter('cheongok', 0.58, 'right', { speed: 420, lane: 500 })
          c.face('left')
          s.shakeCam(300, 0.01)
          await s.talk([
            ['', '세 사람을 밀어내고 폭포수처럼 눈물을 흘리는 청옥이 나타난다. 두 손을 활짝 펴고.'],
            ['청옥', '여보! 여보!'],
            ['야스다', '아...!'],
            ['청옥', '빨리 내려와!'],
            ['', '야스다, 차에 치이기 직전의 고양이처럼 딱딱하게 굳어 내려오려고 하지 않는다. 하지만 세 사람은 기쁨에 겨워 야스다의 심정을 모른 채 계속 부른다.'],
            ['야스다', '새로운 식민지의 시작이야...'],
            ['청옥', '나를 안아줘~!'],
            ['가네무라', '빨리 내려와!'],
            ['강성', '기반아!'],
            ['순주', '오빠, 빨리!'],
            ['야스다', '바다가 예쁘니까 좀 더 보고 있을게...'],
          ])
          await s.say('', '야스다를 계속 부르는 네 사람. 야스다, 애써 모른척하며 곤란해 한다.')
        },
      },
      {
        kind: 'story',
        id: 'finale',
        stage: 'harbor',
        bgm: 'ed',
        async play(s) {
          const cast = [
            ['yasuda', 0.22], ['ganemura', 0.32], ['gangseong', 0.42], ['sunju', 0.52],
            ['akiko', 0.62], ['masayo', 0.72], ['megumi', 0.82], ['cheongok', 0.92],
          ] as const
          await s.caption('청옥이 야스다를 잡으러 쫓아가고, 야스다는 도망친다. 서로를 쫓으며 달리는 사람들.', 3000)
          cast.forEach(([id, f], i) => s.put(id, f, { face: 'right', lane: 440 + (i % 3) * 22 }))
          // the old men are watching from the back, a little ghostly
          const yo = s.put('yasudaOld', 0.07, { face: 'right', lane: 418 })
          const go = s.put('ganemuraOld', 0.14, { face: 'right', lane: 418 })
          yo.setLabelVisible(false)
          go.setLabelVisible(false)
          yo.setAlpha(0.65)
          go.setAlpha(0.65)
          yo.scaleMul = 0.9
          go.scaleMul = 0.9
          await s.say('', '전속력으로 달리는 모습이 즐거워 보인다. 그리고 — 모두가 항구에 모였다!')
          s.confetti(9000)
          let n = 0
          const shouts = ['만세!', '호라이즌!', '대판이다!', '살았다!', '와아!']
          const everyone = ['yasuda', 'ganemura', 'gangseong', 'sunju', 'akiko', 'masayo', 'megumi', 'cheongok'] as const
          await s.mash({
            title: '모두 함께 환호!',
            hint: '탭할 때마다 모두가 뛰어오르며 외친다',
            seconds: 9,
            goal: 24,
            button: '만세!',
            onTap: () => {
              const a = s.actor(everyone[n % everyone.length])
              popText(s, a.x, a.lane - 215, shouts[n % shouts.length], '#fff3b0', 20, false)
              n++
              for (const id of everyone) void s.actor(id).hop(18 + (n % 3) * 6, 200)
              if (n % 6 === 0) s.confetti(2500)
            },
          })
          await s.cheer([...everyone], 3)
          await s.talk([
            ['야스다(노)', '바다가 예쁘잖아. 좀 더 보고 싶어.'],
            ['가네무라(노)', '그래… 50년 만에, 처음으로 같은 걸 봤네.'],
          ])
          await s.caption('바다가 모든 것을 감싸 안는다.', 3200)
          await s.card(
            '막.',
            '『호라이즌 마치』\n\n작 김철의 · 연출 권민경\n\n야스다 황성인 · 노인 야스다 강성근 · 가네무라 남율\n강성 희림 · 순주 김신애 · 청옥 문태극\n아키코 손자영 · 마사요 송윤아 · 메구미 이아영\n\n— 플레이해 주셔서 고맙습니다 —',
            9000,
          )
        },
      },
    ],
  },
]
