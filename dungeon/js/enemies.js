/* ─────────────────────────────────────────────────────────────────────
   Lectern Company · 거울 던전 — 적(환상체) 데이터
   - 사용자 캡처 자료(환상체 시트)를 그대로 옮긴 것. 원문 표기 최대한 유지
   - 스킬 slot: 'n' = 일반 스킬 (환상체 스킬은 정해진 순서 없음 — 사용자 확정) · 'ex' = 조건부 전용 스킬
   - fx: 코인별 효과 배열 (fx[0] = 1코인). 빈 칸은 ''
   - res: 공격 유형 내성 배율 / sin: 죄악 속성 배율 (2 약점 · 1 보통 · 0.5 강점)
   - stagger: 흐트러짐 구간 HP (시트 값 그대로)
   - def(방어도): 최종 피해에서 상시 그만큼 감소 · slots(전투 슬롯): 부위마다 그 수만큼 속도 주사위 = 행동 횟수 (사용자 확정)
   - season: 1 = Season 1 시나리오 · 2 = Season 2 시나리오 (양소유 이후)
   - rec: 시트의 '추천 공격' (물리 · 죄악 + 배율)
   ───────────────────────────────────────────────────────────────────── */
(function () {
  const ALL1 = { 분노: 1, 색욕: 1, 나태: 1, 탐식: 1, 우울: 1, 오만: 1, 질투: 1, 허무: 1 };
  const sin = (o) => Object.assign({}, ALL1, o);

  window.MD_ENEMIES = [
    /* ── 1. 불량한 식사 ─────────────────────────────────────────── */
    {
      id: 'teth03', name: '불량한 식사', code: 'TETH-03', risk: 'TETH', kind: '환상체', season: 1,
      hp: 350, speed: [3, 4], def: 5, slots: 4,
      ego: '팡파레', gift: { name: '퀵 스낵', fx: '분노 스킬 사용 시 화상 1 부여' },
      img: 'img/abno/teth03_meal.webp', imgs: { food: 'img/abno/teth03_food.webp' },
      passives: [
        { name: '식품 대접', fx: '불량한 식사 사망시 불량 식품 넷 생성.' },
        { name: '달아오르는 알갱이', fx: '일정 턴 이후 자멸(3턴 후 먹어! 사용)' }
      ],
      parts: [
        {
          id: 'body', name: '몸', core: true, breakable: false, hp: 300, stagger: [150],
          speed: [3, 4], def: 5, slots: 4,
          res: { 참격: 2, 관통: 0.5, 타격: 1 }, sin: sin({}),
          rec: { phys: ['참격', 2], sin: ['전체', 1] },
          skills: [
            { slot: 'n', name: '맛있어?', sin: '색욕', type: '타격', coins: 2, base: 6, cp: 4, weight: 1, fx: ['', '[적중시] 화상 1 부여'] },
            { slot: 'n', name: '마이쩡!', sin: '분노', type: '타격', coins: 3, base: 3, cp: 4, weight: 1, fx: ['', '[적중시] 화상 1 부여', '[앞면 적중시] 화상 1 부여'] },
            { slot: 'ex', name: '먹어!', sin: '색욕', type: '타격', coins: 1, base: 5, cp: 6, weight: 10,
              fx: ['[합 불가능] 전투 슬롯을 한개로 고정 / [공격 종료 시] 사망 / [적중시] 화상 3부여'],
              when: '달아오르는 알갱이 — 3턴 후 사용' }
          ]
        }
      ],
      summons: [
        {
          id: 'food', name: '불량 식품', from: '식품 대접 (사망 시 4체 생성)', core: true, breakable: true, hp: 50, stagger: [],
          speed: [2, 3], def: 5, slots: 1, img: 'img/abno/teth03_food.webp',
          res: { 참격: 1, 관통: 1, 타격: 1 }, sin: sin({ 분노: 2 }),
          rec: { phys: ['전체', 1], sin: ['분노', 2] },
          skills: [
            { slot: 'n', name: '냠!', sin: '색욕', type: '타격', coins: 2, base: 4, cp: 6, weight: 1, fx: ['', ''] }
          ]
        }
      ]
    },

    /* ── 2. 내닫는 어마 ─────────────────────────────────────────── */
    {
      id: 'f04391', name: '내닫는 어마', code: 'F-04-391', risk: 'TETH', kind: '환상체', season: 1,
      hp: 300, speed: [2, 3], def: 2, slots: 4,
      ego: '녹슨 동상', gift: { name: '녹빛 창날', fx: '부여하는 진동 +1' },
      img: 'img/abno/f04391_horse.webp',
      passives: [
        { name: '녹슬어 가는 기마상', fx: '방패 파괴 시, 의지 판정. 성공 시 위력 감소 3, 취약 3 얻음' },
        { name: '휘몰아 가리라', fx: '3턴 째가 되었을 때 몸의 마지막 슬롯으로 [모든 것은 잠겨가리] 사용' },
        { name: '관망하리라', fx: '[모든 것은 잠겨가리] 사용 후, 1턴 동안 수비 스킬만 사용' },
        { name: '좌절하리라', fx: '[관망하리라] 동안 공격한 적에게 위력 감소 1, 취약 2 부여' }
      ],
      parts: [
        {
          id: 'body', name: '몸', core: true, breakable: false, hp: 150, stagger: [99, 50],
          speed: [2, 3], def: 8, slots: 2,
          res: { 참격: 0.5, 관통: 1, 타격: 1 }, sin: sin({ 분노: 2, 오만: 2 }),
          rec: { phys: ['관통·타격', 1], sin: ['분노·오만', 2] },
          skills: [
            { slot: 'n', name: '녹슨 창', sin: '나태', type: '타격', coins: 3, base: 7, cp: 3, weight: 1, fx: ['[사용시] 다음 턴에 신속 1 얻음', '[사용시] 진동 3 얻음', ''] },
            { slot: 'n', name: '두박한 돌격', sin: '색욕', type: '타격', coins: 1, base: 8, cp: 13, weight: 2, fx: ['[사용시] 진동 4 얻음'] },
            { slot: 'n', name: '꿰뚫는 일격', sin: '나태', type: '관통', coins: 4, base: 10, cp: 4, weight: 1, fx: ['[사용시] 진동 2 얻음', '[적중시] 다음 턴에 신속 2 얻음', '', '[적중시] 진동 폭발'] },
            { slot: 'n', name: '부동', sin: '없음', type: '방어', coins: 1, base: 8, cp: 13, weight: null, fx: ['[사용시] 진동 3 얻음'] },
            { slot: 'ex', name: '모든 것은 잠겨가리', sin: '우울', type: '타격', coins: 3, base: 10, cp: 5, weight: 5,
              fx: ['[합 승리시] 자신의 진동이 7 이상일 경우 적 전체에게 다음 턴 속박 2 부여', '[적중시] 침잠 5 부여', ''],
              when: '휘몰아 가리라 — 3턴 째, 몸의 마지막 슬롯' }
          ]
        },
        {
          id: 'arm', name: '원팔', note: '시트 표기 그대로 (왼팔?)', core: false, breakable: true, hp: 150, stagger: [99, 50],
          speed: [2, 3], def: 8, slots: 2,
          res: { 참격: 0.5, 관통: 2, 타격: 1 }, sin: sin({}),
          rec: { phys: ['관통', 2], sin: ['전체', 1] },
          skills: [
            { slot: 'n', name: '휘두르기', sin: '우울', type: '타격', coins: 3, base: 7, cp: 3, weight: 2, fx: ['[적중시] 진동 2 부여', '', ''] },
            { slot: 'n', name: '밀쳐내기', sin: '나태', type: '타격', coins: 2, base: 9, cp: 6, weight: 1, fx: ['[적중시] 진동 3 부여', ''] },
            { slot: 'n', name: '내려 찍기', sin: '우울', type: '관통', coins: 2, base: 10, cp: 8, weight: 1, fx: ['[적중시] 진동 2 부여', '[적중시] 진동 폭발'] },
            { slot: 'n', name: '방패 막기', sin: '없음', type: '방어', coins: 1, base: 10, cp: 11, weight: null, fx: [''] }
          ]
        }
      ]
    },

    /* ── 3. 하나뿐 ─────────────────────────────────────────────── */
    {
      id: 'f04193', name: '하나뿐', code: 'F-04-193', risk: 'TETH', kind: '환상체', season: 1,
      hp: 200, speed: [3, 4], def: 0, slots: 4,
      ego: '에이스', gift: { name: '거짓 된 하나', fx: '받는 출혈 수치 -1' },
      img: 'img/abno/f04193_rose.webp',
      passives: [
        { name: '고고한 하나', fx: '[몸]이 흐트러짐 상태가 되면 즉시, 흐트러짐이 풀리고 1턴 동안 기본 위력으로 전투한다.' },
        { name: '거짓 된 한 송이', fx: '[거짓 속의 피어남] 사용 후, 색욕 판정. 성공 시 덩굴 흐트러짐 다음 턴까지 유지, 위력 감소 2, 속박 2 부여' },
        { name: '아름다움의 가시', fx: '수비 스킬 사용 시 15 이하의 데미지를 받았을 경우 입은 데미지의 절반만큼의 피해를 줌' },
        { name: '고귀한 하나', fx: '덩굴이 흐트러진 후 다음 턴에 [거짓 속의 피어남] 사용' }
      ],
      parts: [
        {
          id: 'body', name: '몸', core: true, breakable: false, hp: 140, stagger: [92, 46],
          speed: [3, 4], def: 4, slots: 3,
          res: { 참격: 2, 관통: 0.5, 타격: 1 }, sin: sin({ 탐식: 2, 오만: 0.5 }),
          rec: { phys: ['참격', 2], sin: ['탐식', 2] },
          skills: [
            { slot: 'n', name: '뜨리, 세미', sin: '색욕', type: '타격', coins: 2, base: 9, cp: 3, weight: 1, fx: ['[적중시] 출혈 2 부여', '[적중시] 마비 1 부여'] },
            { slot: 'n', name: '아진', sin: '색욕', type: '참격', coins: 3, base: 11, cp: 3, weight: 1, fx: ['[적중시] 출혈 2 부여', '[적중시] 속박 1 부여', '[앞면 적중시] 다음 턴에 위력 증가 1 얻음'] },
            { slot: 'n', name: '뜨리, 세미.. 다마', sin: '오만', type: '관통', coins: 3, base: 13, cp: 4, weight: 1, fx: ['[합 승리 시] 대상의 출혈의 절반 만큼 회복', '[적중시] 출혈 2 부여', '[뒷면 적중 시] 다음 턴에 위력 증가 2 얻음'] },
            { slot: 'n', name: '거짓 된 아름다움', sin: '없음', type: '회피', coins: 1, base: 10, cp: 6, weight: null, fx: ['[회피 성공 시] 다음 턴에 위력 증가 1 얻음'] },
            { slot: 'ex', name: '거짓 속의 피어남', sin: '분노', type: '타격', coins: 3, base: 10, cp: 5, weight: 5,
              fx: ['[적중시] 출혈이 4이상인 대상에게 다음 턴에 마비 1 부여', '[적중시] 출혈 5 부여', ''],
              when: '고귀한 하나 — 덩굴이 흐트러진 다음 턴' }
          ]
        },
        {
          id: 'vine', name: '덩굴', core: false, breakable: true, hp: 60, stagger: [40, 20],
          speed: [3, 4], def: 4, slots: 1,
          res: { 참격: 2, 관통: 1, 타격: 0.5 }, sin: sin({ 색욕: 2, 허무: 0.5 }),
          rec: { phys: ['참격', 2], sin: ['색욕', 2] },
          skills: [
            { slot: 'n', name: '츠비톡', sin: '탐식', type: '참격', coins: 2, base: 6, cp: 5, weight: 2, fx: ['[적중시] 출혈 1 부여', '[적중시] 취약 1 부여'] },
            { slot: 'n', name: '드웨르', sin: '색욕', type: '관통', coins: 2, base: 7, cp: 7, weight: 2, fx: ['[적중시] 출혈 2 부여', '[적중시] 속박 1 부여'] },
            { slot: 'n', name: '파우크', sin: '탐식', type: '참격', coins: 2, base: 8, cp: 9, weight: 1, fx: ['[적중시] 출혈 2 부여', '[사용시] 신속 1 얻음'] },
            { slot: 'n', name: '롬프', sin: '없음', type: '방어', coins: 1, base: 10, cp: 10, weight: null, fx: ['[사용시] [몸]에 위력의 반절만큼 방어막 부여'] }
          ]
        }
      ]
    },

    /* ── 4. 구르는 무게 ────────────────────────────────────────── */
    {
      id: 'o04942', name: '구르는 무게', code: 'O-04-942', risk: 'TETH', kind: '환상체', season: 1,
      hp: 200, speed: [4, 4], def: 0, slots: 2, count: 3, note: '한번에 세마리씩 나옴',
      ego: '스트라이크 & 스페어', gift: { name: '구르는 추', fx: '속도값이 2 이하일 경우 위력 증가 1 얻음' },
      img: 'img/abno/o04942_ball.webp', imgs: { broken: 'img/abno/o04942_ball_broken.webp', special: 'img/abno/o04942_ball_special.webp' },
      passives: [
        { name: '퍼펙트 게임', fx: '다리가 파괴될 경우 맨 앞줄 한명을 대상으로 [스트라이크 & 스페어] 사용 그 후 다리 재생' },
        { name: '스플릿', fx: '공 부위의 공격 첫번째 이후 남아있는 적의 수만큼 속박 얻음(최대 3)' },
        { name: '준비 운동', fx: '다리가 한 번 파괴되기 전까지 공이 받는 피해를 다리가 대신 받음.' }
      ],
      parts: [
        {
          id: 'ball', name: '공', core: true, breakable: false, hp: 150, stagger: [99, 50],
          speed: [4, 4], def: 2, slots: 1,
          res: { 참격: 1, 관통: 1, 타격: 1 }, sin: sin({}),
          rec: { phys: ['전체', 1], sin: ['전체', 1] },
          skills: [
            { slot: 'n', name: '골포스트', sin: '탐식', type: '타격', coins: 2, base: 3, cp: 6, weight: 1, fx: ['[사용시] 자신에게 속박 2 부여', '[적중시] 진동 3부여 / [적중시] 자신의 속도가 2 이하일 경우 마비 1 부여'] },
            { slot: 'n', name: '올월스', sin: '없음', type: '회피', coins: 1, base: 10, cp: 9, weight: 1, fx: ['[사용시] 자신의 속도가 3 이상일 경우 속박 1 얻음'] },
            { slot: 'n', name: '크레스지', sin: '오만', type: '타격', coins: 3, base: 9, cp: 5, weight: 1, fx: ['[사용시] 자신에게 속박 1 부여', '[적중시] 진동 4 부여', '[적중시] 자신의 속도가 2 이하일 경우 마비 1 부여'] },
            { slot: 'n', name: '골든게이트', sin: '나태', type: '타격', coins: 1, base: 10, cp: 12, weight: 1, fx: ['[적중시] 진동 폭발 / [적중시] 자신의 속도가 2 이하일 경우 진동폭발'] },
            { slot: 'ex', name: '스트라이크 & 스페어', sin: '탐식', type: '타격', coins: 1, base: 10, cp: 12, weight: '최대 10',
              fx: ['이 스킬은 가장 앞에 있는 대상만을 공격하며, [합 승리시] 그 뒤에 있는 인원에게 피라미드 형태로 가중치 증가 / [앞면 적중시] 진동 폭발, 마비 1 부여 / [뒷면 적중시] 이 코인 재사용 (최대 1회)'],
              when: '퍼펙트 게임 — 다리가 파괴될 때' }
          ]
        },
        {
          id: 'leg', name: '다리', core: false, breakable: true, hp: 50, stagger: [],
          speed: [4, 4], def: 2, slots: 1,
          res: { 참격: 2, 관통: 1, 타격: 0.5 }, sin: sin({ 우울: 2, 허무: 0.5 }),
          rec: { phys: ['참격', 2], sin: ['우울', 2] },
          skills: [
            { slot: 'n', name: '데드 우드', sin: '나태', type: '관통', coins: 1, base: 7, cp: 9, weight: 1, fx: ['[사용시] 다리의 체력 10 감소 / [적중시] 진동 3 부여'] },
            { slot: 'n', name: '가비지 히트', sin: '없음', type: '방어', coins: 1, base: 12, cp: 10, weight: 1, fx: ['[사용시] 자신의 속도가 3 이상일 경우 체력 5 회복 / 2이하일 경우 5 감소'] }
          ]
        }
      ]
    },

    /* ── 5. 갑부 요정 ──────────────────────────────────────────── */
    {
      id: 'o01871', name: '갑부 요정', code: 'O-01-871', risk: 'TETH', kind: '환상체', season: 1,
      hp: 450, speed: [3, 3], def: 2, slots: 5,
      ego: '거짓 재화', gift: { name: '밀랍 금화', fx: '탐식 스킬을 사용할 시 SP 5 회복' },
      img: 'img/abno/o01871_fairy.webp',
      keywords: ['금화'],
      passives: [
        { name: '돈은 다 내꺼야!', fx: '턴 시작 시 무작위 대상에게 금화를 부여. 금화가 3 이상인 대상의 금화를 모두 소모하고 특정 스킬 사용' },
        { name: '돈은 언제나 옳다', fx: '패에 탐식 스킬을 가지고 있는 대상은 의지 판정 또는 육체 판정을 하여 실패 했을 시, 그 대상은 속박 3 얻음.' },
        { name: '머니 이즈 파워!', fx: '본인의 금화 5당 최종 위력 +1' }
      ],
      parts: [
        {
          id: 'body', name: '몸', core: true, breakable: false, hp: 300, stagger: [198, 99],
          speed: [3, 3], def: 2, slots: 3,
          res: { 참격: 1, 관통: 2, 타격: 0.5 }, sin: sin({ 탐식: 0.5, 질투: 2, 허무: 2 }),
          rec: { phys: ['관통', 2], sin: ['질투·허무', 2] },
          skills: [
            { slot: 'n', name: '금화를 가지고 싶나!', sin: '탐식', type: '타격', coins: 2, base: 9, cp: 5, weight: 1, fx: ['[적중시] 금화 1부여', '[적중시] 다음 턴에 속박 1 부여'] },
            { slot: 'n', name: '이 금화는 내 것이네!', sin: '탐식', type: '타격', coins: 2, base: 10, cp: 8, weight: 1, fx: ['[적중시] 대상에게 금화가 있을 경우, 다음 턴에 공격 위력 감소 2부여', '[적중시] 금화 2 얻음'] },
            { slot: 'n', name: '유희를 즐길 시간이다!', sin: '나태', type: '타격', coins: 4, base: 11, cp: 5, weight: 1, fx: ['[앞면 적중시] 대상에게 금화가 있을 경우, 다음 턴에 마비 2 부여', '[적중시] 본인의 금화반큼 추가 데미지', '[적중시] 자신의 금화가 5이상일 경우, 금화를 모두 소모하고 취약 3 부여', '[앞면 적중시] 이 스킬로 금화를 소모했다면, 추가 데미지 +5'] },
            { slot: 'n', name: '이 금화는 내거야!', sin: '나태', type: '방어', coins: 1, base: 9, cp: 13, weight: 1, fx: ['[사용시] 금화 1얻음, 다음 턴에 속박 1 얻음'] },
            { slot: 'ex', name: '이 금화는 내 것이네!', sin: '탐식', type: '타격', coins: 2, base: 8, cp: 3, weight: 1,
              fx: ['[합 불가능] [적중시] 대상에게 금화가 있을 경우, 다음 턴에 공격 위력 감소 1 부여', '[적중시] 금화 2 얻음'],
              when: '돈은 다 내꺼야! — 금화 3 이상인 대상에게 (해석)' }
          ]
        },
        {
          id: 'rarm', name: '오른팔', core: false, breakable: true, hp: 150, stagger: [99, 50],
          speed: [3, 3], def: 2, slots: 2,
          res: { 참격: 2, 관통: 1, 타격: 0.5 }, sin: sin({ 탐식: 0.5, 질투: 2, 허무: 2 }),
          rec: { phys: ['참격', 2], sin: ['질투·허무', 2] },
          skills: [
            { slot: 'n', name: '이것도!', sin: '탐식', type: '관통', coins: 3, base: 7, cp: 4, weight: 1, fx: ['[적중시] 금화 1부여', '[앞면 적중시] 금화 1 부여', '[적중시] 다음 턴에, 속박 2 부여'] },
            { slot: 'n', name: '저것도!', sin: '오만', type: '참격', coins: 1, base: 9, cp: 17, weight: 1, fx: ['[적중시] 대상의 금화+1 만큼 금화 얻음'] },
            { slot: 'n', name: '내 손으로!', sin: '나태', type: '타격', coins: 2, base: 9, cp: 11, weight: 1, fx: ['[적중시] 대상에게 금화가 있을 경우, 금화 3얻음 / 금화 2 얻음', '[적중시] 대상에게 금화 있을 경우, 마비 1 부여'] },
            { slot: 'n', name: '눈 독 들이지 마라!', sin: '탐식', type: '반격', coins: 1, base: 8, cp: 14, weight: 1, fx: ['[적중시] 대상에게 금화가 있을 경우, 다음 턴에 취약 1 부여'] }
          ]
        }
      ]
    },

    /* ── 6. 타버린 피 ──────────────────────────────────────────── */
    {
      id: 'f024637', name: '타버린 피', code: 'F-02-4637', risk: 'HE', kind: '환상체', season: 1,
      hp: 400, speed: [4, 6], def: 0, slots: 6, note: '바니 더 뱀파이어 모티브',
      ego: '응혈흔(凝血痕)', gift: { name: '고장난 제세동기', fx: '대상에게 출혈 부여시 대상의 출혈이 8 이상일 경우 화상 2 부여' },
      img: 'img/abno/f024637_blood.webp', imgs: { ash: 'img/abno/f024637_blood_ash.webp', exec: 'img/abno/f024637_blood_exec.webp' },
      keywords: ['형벌 카운터'],
      punish: { 3: '태형 - 불꽃 채찍', 6: '장형 - 집중 타격', 9: '도형 - 압류', 12: '유형 - 무기징역', 15: '사형 - 집행' },
      passives: [
        { name: '끝없는 갈증', fx: '대상이 출혈로 입는 피해만큼 체력 회복(목이 파괴되었을 경우 발동하지 않음)' },
        { name: '화산재', fx: '화상이 있는 대상 한명당 위력 증가 1 얻음 (최대 3)' },
        { name: '죄를 가늠한다', fx: '피격 당할 시 대상에게 형벌 카운터를 1 쌓으며 상대 전체의 카운터 총합이 특정 수치에 도달할때마다 특정 스킬을 사용한다.' },
        { name: '꼬리 자르기', fx: '꼬리 부위가 파괴될 경우 다음 턴에 몸의 체력을 50 깎고 꼬리 체력 전부 회복. 그 후 한턴동안 공격 위력 감소 3 얻음' }
      ],
      parts: [
        {
          id: 'body', name: '몸', core: true, breakable: false, hp: 250, stagger: [165, 83],
          speed: [5, 5], def: 0, slots: 3,
          res: { 참격: 1, 관통: 0.5, 타격: 2 }, sin: sin({ 오만: 0.5, 허무: 2 }),
          rec: { phys: ['타격', 2], sin: ['허무', 2] },
          skills: [
            { slot: 'n', name: '짓밟기', sin: '나태', type: '타격', coins: 2, base: 4, cp: 6, weight: 1, fx: ['[적중시] 출혈 2 부여', '[적중시] 출혈 2 부여'] },
            { slot: 'n', name: '화염 내뿜기', sin: '분노', type: '타격', coins: 1, base: 5, cp: 12, weight: 2, fx: ['[적중시] 화상 4 부여'] },
            { slot: 'n', name: '웅크리기', sin: '없음', type: '방어', coins: 1, base: 15, cp: 7, weight: 1, fx: ['[사용시] 화상이 있는 대상 두명당 위력 1 증가'] },
            { slot: 'ex', name: '사형 - 집행', sin: '분노', type: '타격', coins: 1, base: 17, cp: 13, weight: 1, punish: true,
              fx: ['형벌 카운터가 가장 높은 대상을 대상으로 함.(변경 불가) / [적중시] 대상의 출혈과 화상을 1회씩 강제 발동'],
              when: '죄를 가늠한다 — 형벌 스킬 (카운터 합 3 태형 · 6 장형 · 9 도형 · 12 유형 · 15 사형)' }
          ]
        },
        {
          id: 'neck', name: '목', core: false, breakable: true, hp: 100, stagger: [50],
          speed: [4, 4], def: 0, slots: 2,
          res: { 참격: 1, 관통: 0.5, 타격: 0.5 }, sin: sin({ 분노: 2, 허무: 2 }),
          rec: { phys: ['참격', 1], sin: ['분노·허무', 2] },
          skills: [
            { slot: 'n', name: '잿빛 돌진', sin: '오만', type: '타격', coins: 1, base: 7, cp: 9, weight: 1, fx: ['[사용시] 신속 1 얻음 / [적중시] 화상 3 부여'] },
            { slot: 'n', name: '핏빛 돌진', sin: '질투', type: '타격', coins: 1, base: 9, cp: 7, weight: 1, fx: ['[사용시] 신속 1 얻음 / [적중시] 출혈 3 부여'] },
            { slot: 'ex', name: '도형 - 압류', sin: '탐식', type: '타격', coins: 2, base: 10, cp: 12, weight: 1, punish: true,
              fx: ['[사용시] 다음턴 시작시 대상의 패의 가장 높은 등급의 스킬을 버림 그 후 다시 뽑기', '[적중시] 속박 3 부여'], when: '죄를 가늠한다 — 형벌 스킬 (카운터 합 3 태형 · 6 장형 · 9 도형 · 12 유형 · 15 사형)' },
            { slot: 'ex', name: '유형 - 무기징역', sin: '나태', type: '타격', coins: 3, base: 9, cp: 5, weight: 1, punish: true,
              fx: ['[사용시] 속박 2 부여', '[적중시] 출혈 3 부여', '[적중시] 화상 4 부여'], when: '죄를 가늠한다 — 형벌 스킬 (카운터 합 3 태형 · 6 장형 · 9 도형 · 12 유형 · 15 사형)' }
          ]
        },
        {
          id: 'tail', name: '꼬리', core: false, breakable: true, hp: 50, stagger: [],
          speed: [6, 6], def: 0, slots: 1,
          res: { 참격: 1, 관통: 1, 타격: 1 }, sin: sin({}),
          rec: { phys: ['전체', 1], sin: ['전체', 1] },
          skills: [
            { slot: 'n', name: '꼬리치기', sin: '색욕', type: '타격', coins: 2, base: 6, cp: 4, weight: 1, fx: ['[적중시] 출혈 3 부여', '[적중시] 화상 2 부여'] },
            { slot: 'n', name: '꼬리 말기', sin: '없음', type: '방어', coins: 1, base: 7, cp: 12, weight: 1, fx: [''] },
            { slot: 'ex', name: '태형 - 불꽃 채찍', sin: '분노', type: '타격', coins: 4, base: 6, cp: 3, weight: 3, punish: true,
              fx: ['지금까지 패시브로 회복한 체력 /5만큼 최종 위력 증가 (최대 4)', '[적중시] 화상 2 부여', '[적중시] 화상 2 부여', ''], when: '죄를 가늠한다 — 형벌 스킬 (카운터 합 3 태형 · 6 장형 · 9 도형 · 12 유형 · 15 사형)' },
            { slot: 'ex', name: '장형 - 집중 타격', sin: '색욕', type: '타격', coins: 3, base: 6, cp: 6, weight: 1, punish: true,
              fx: ['[적중시] 출혈 2 부여', '[적중시] 출혈 2 부여', '[적중시] 위력 감소 2 부여'], when: '죄를 가늠한다 — 형벌 스킬 (카운터 합 3 태형 · 6 장형 · 9 도형 · 12 유형 · 15 사형)' }
          ]
        }
      ]
    },

    /* ══════════ 뒤틀림 (Season 2) — SP 있음 · 통합 SP 하나 · 죄악 속성 내성 있음 ══════════ */
    /* ── 7. 언젠가의 주민 ─────────────────────────────────────── */
    {
      id: 'someday', name: '언젠가의 주민', code: '식별 번호 미정', risk: 'TETH', kind: '뒤틀림', season: 2,
      hp: 240, speed: [3, 4], def: 0, slots: 4, note: '시트 전투 슬롯 4 (부위 합은 3)',
      ego: '미정', gift: { name: '노란 가면', fx: '설득에 해당하는 죄악 판정 굴림 시 주사위 최종값 +1' },
      img: 'img/dist/someday.webp',
      passives: [
        { name: '대화(물리), 공격(평화)', fx: '대화를 하려 한다면 공격을 합니다. 공격을 하려 한다면 대화를 합니다.' },
        { name: '절규', fx: '4번 피격 될 때 마다 전체 의지 판정 실패하면 정신력 -5, 얼굴이 파괴되면 발동되지 않음' },
        { name: '싸우지 않아', fx: '[언젠가의 주민]이 한 턴 동안 공격을 맞지 않으면 전투가 종료되고 다시 대화를 할 지 공격을 할 지를 선택한다.' }
      ],
      parts: [
        {
          id: 'body', name: '몸', core: true, breakable: false, hp: 140, stagger: [92, 46],
          speed: [3, 4], def: 0, slots: 2,
          res: { 참격: 1, 관통: 1, 타격: 1 }, sin: sin({ 색욕: 0.5, 나태: 2, 탐식: 0.5, 우울: 2, 허무: 2 }),
          rec: { phys: ['전체', 1], sin: ['나태·우울·허무', 2] },
          skills: [
            { slot: 'n', name: '휘두르기', sin: '분노', type: '타격', coins: 2, base: 8, cp: 5, weight: 1, fx: ['[적중시] 파열 2 부여', '[적중시] 다음 턴에 취약 1 부여'] },
            { slot: 'n', name: '잡기', sin: '질투', type: '타격', coins: 1, base: 10, cp: 13, weight: 1, fx: ['[적중시] 다음 턴에 속박 2 부여'] },
            { slot: 'n', name: '찌르기', sin: '우울', type: '관통', coins: 2, base: 8, cp: 8, weight: 1, fx: ['[적중시] 출혈 4 부여', '[적중시] 파열 4 부여'] },
            { slot: 'n', name: '막기', sin: '우울', type: '방어', coins: 1, base: 10, cp: 12, weight: 1, fx: ['[사용시] 위력 증가 1 얻음'] }
          ]
        },
        {
          id: 'face', name: '얼굴', core: false, breakable: true, hp: 100, stagger: [66, 33],
          speed: [3, 4], def: 0, slots: 1,
          res: { 참격: 1, 관통: 0.5, 타격: 2 }, sin: sin({ 분노: 2, 색욕: 2, 나태: 0.5, 허무: 2 }),
          rec: { phys: ['타격', 2], sin: ['분노·색욕·허무', 2] },
          skills: [
            { slot: 'n', name: '소리지르기', sin: '허무', type: '관통', coins: 1, base: 9, cp: 9, weight: 1, fx: ['[적중시] 침잠 3 부여'] },
            { slot: 'n', name: '박치기', sin: '질투', type: '타격', coins: 2, base: 9, cp: 8, weight: 1, fx: ['[적중시] 파열 3 부여', '[적중시] 침잠 2 부여'] },
            { slot: 'n', name: '물기', sin: '분노', type: '관통', coins: 2, base: 10, cp: 10, weight: 1, fx: ['[적중시] 출혈 3 부여', '[적중시] 침잠 3 부여'] },
            { slot: 'n', name: '흔들리는 머리', sin: '허무', type: '회피', coins: 1, base: 9, cp: 9, weight: 1, fx: ['[사용시] 신속 1 얻음'] }
          ]
        }
      ]
    },

    /* ── 8. 바라보고 바라 보아지는 화면 ────────────────────────── */
    {
      id: 'screen', name: '바라보고 바라 보아지는 화면', code: '식별 번호 미정', risk: 'TETH', kind: '뒤틀림', season: 2,
      hp: 250, speed: [1, 6], def: '2 · 0', slots: 4,
      ego: '미정', gift: { name: '미정', fx: '' },
      img: 'img/dist/screen.webp',
      passives: [
        { name: '바라보고 있어 너를', fx: '모니터들의 공격대상은 본인을 대상으로 지정한 모니터만을 공격해야 한다. (합을 가져가도 이 패시브의 효과는 사라지지 않는다.)' },
        { name: '바라보고 있어 나를', fx: '모니터와 합에서 질 경우, 대상에게 침잠 2부여' },
        { name: '계속 보고 있구나', fx: '같은 모니터를 2턴 연속으로 공격할 시 침잠 5 부여' },
        { name: '볼수가 없어', fx: '모니터가 하나라도 파괴 될 시 도주(육체, 의지) 판정 가능' }
      ],
      parts: [
        {
          id: 'body', name: '팔다리몸', core: true, breakable: false, hp: 130, stagger: [86, 43],
          speed: [1, 6], def: 2, slots: 1,
          res: { 참격: 2, 관통: 0.5, 타격: 1 }, sin: sin({ 색욕: 2, 오만: 0.5, 허무: 2 }),
          rec: { phys: ['참격', 2], sin: ['색욕·허무', 2] },
          skills: [
            { slot: 'n', name: '움직이기', sin: '질투', type: '타격', coins: 2, base: 9, cp: 4, weight: 1, fx: ['[사용시] 다음턴에 신속 1 얻음', '[앞면 적중시] 다음턴에 신속 1 얻음'] },
            { slot: 'n', name: '걷어차기', sin: '분노', type: '타격', coins: 3, base: 9, cp: 5, weight: 1, fx: ['[적중시] 파열 2 부여', '[적중시] 취약 2 부여', '[앞면 적중시] 다음턴에 신속 1 얻음'] },
            { slot: 'n', name: '누르기', sin: '분노', type: '타격', coins: 1, base: 12, cp: 15, weight: 1, fx: ['[적중시] 속박 3 부여'] },
            { slot: 'n', name: '뒤틀린 피부', sin: '허무', type: '방어', coins: 1, base: 8, cp: 12, weight: 1, fx: ['[사용시] 상대에게 침잠이 없을 경우 5 데미지를 받음'] }
          ]
        }
      ].concat(['R', 'G', 'B'].map((c) => ({
        id: 'mon' + c, name: '모니터 ' + c, monitor: c, core: false, breakable: true, hp: 40, stagger: [20],
        speed: [1, 6], def: 0, slots: 1,
        res: { 참격: 0.5, 관통: 1, 타격: 2 }, sin: sin({ 색욕: 2, 나태: 0.5, 탐식: 2, 우울: 0.5, 허무: 2 }),
        rec: { phys: ['타격', 2], sin: ['색욕·탐식·허무', 2] },
        skills: [
          { slot: 'n', name: '바라보다', sin: '허무', type: '관통', coins: 1, base: 8, cp: 8, weight: 1, fx: ['[뒷면 적중시] 침잠 3 부여'] },
          { slot: 'n', name: '바라보게 하다', sin: '색욕', type: '관통', coins: 1, base: 10, cp: 12, weight: 1, fx: ['[뒷면 적중시] 침잠 2, 속박 2 부여'] },
          { slot: 'n', name: '끌어들이다', sin: '색욕', type: '관통', coins: 3, base: 7, cp: 7, weight: 1, fx: ['[적중시] 취약 2 부여', '[앞면 적중시] 마비 1 부여 / [뒷면 적중시] 마비 2 부여', '[뒷면 적중시] 침잠 2부여'] },
          { slot: 'n', name: '시선을 가리지 마라', sin: '허무', type: '반격', coins: 1, base: 8, cp: 12, weight: 1, fx: ['[뒷면 적중시] 침잠 2 부여'] }
        ]
      })))
    },

    /* ── 9. 웃고 웃는 광대 ─────────────────────────────────────── */
    {
      id: 'clown', name: '웃고 웃는 광대', code: '식별 번호 미정', risk: 'UNKNOWN', kind: '뒤틀림', season: 2,
      hp: 140, speed: [1, 6], def: 0, slots: 4, narrative: true,
      censor: true, note: '스탠딩 모자이크 처리 (광대 공포증 배려)',
      ego: '미정', gift: { name: '미정', fx: '' },
      img: 'img/dist/clown_mosaic.webp',
      passives: [
        { name: '파티 타임!', fx: '전투 시작시 그 후 2턴마다 풍선 1개를 소환(색 랜덤) 풍선은 2턴 뒤 터지며 해당 색의 스킬로만 피해가 들어간다.' },
        { name: '쇼 타임!', fx: '2번째 턴 시작시 랜덤 3명에게 특정 대사를 시킴. 가장 잘한 사람에게 위력 증가 3 부여, 가장 아쉬운 사람에게 위력 감소 3 부여',
          site: '사이트 처리(확정): 아군 전원이 설득 판정(색욕·허무 스킬, 2d6 + 슬롯 주사위)을 굴림 → 최고값 위력 증가 3 · 최저값 위력 감소 3. 설득 죄악 스킬이 없어 못 굴리는 사람은 제외' }
      ],
      parts: [
        {
          id: 'body', name: '몸통', core: true, breakable: false, hp: 130, stagger: [86, 43],
          speed: [1, 6], def: 0, slots: 3,
          res: { 참격: 1, 관통: 1, 타격: 1 }, sin: sin({ 분노: 2, 탐식: 2, 질투: 2 }),
          rec: { phys: ['전체', 1], sin: ['분노·탐식·질투', 2] },
          skills: [
            { slot: 'n', name: '탁! 탁!', sin: '분노', type: '타격', coins: 2, base: 8, cp: 6, weight: 1, fx: ['[적중시] 마비 2 부여', ''] },
            { slot: 'n', name: '촵! 촵!', sin: '탐식', type: '참격', coins: 2, base: 8, cp: 6, weight: 1, fx: ['[적중시] 신속 2 얻음', ''] },
            { slot: 'n', name: '츕! 츕!', sin: '질투', type: '관통', coins: 2, base: 8, cp: 6, weight: 1, fx: ['[적중시] 속박 2 부여', ''] },
            { slot: 'n', name: '휙! 휙!', sin: '없음', type: '회피', coins: 1, base: 10, cp: 3, weight: 1, fx: [''] }
          ]
        },
        {
          id: 'balloon', name: '풍선', core: false, breakable: true, hp: 10, stagger: [],
          speed: [1, 1], def: 0, slots: 1, summoned: true,
          res: { 참격: 1, 관통: 1, 타격: 1 }, sin: sin({}),
          rec: { phys: ['전체', 1], sin: ['전체', 1] },
          note: '파티 타임!으로 소환 · 색 랜덤 · 2턴 뒤 터짐 · 해당 색 스킬로만 피해',
          skills: [
            { slot: 'n', name: '꿈틀거리는 환락', sin: '없음', type: '방어', coins: 1, base: 10, cp: 5, weight: 1, fx: [''] },
            { slot: 'n', name: '펑이요!', sin: '풍선 색', type: '타격', coins: 1, base: 6, cp: 6, weight: 1, fx: ['[합 불가능] [적중시] 마비 3 부여'], note: '공격 속성 = 풍선 색과 동일' }
          ]
        }
      ]
    }
  ];

  /* 이벤트 전투 이름 → 환상체 연결 [가안: 기프트·E.G.O. 이름으로 추정] */
  window.MD_ENEMY_LINK = {
    '물에 잠긴 동상': 'f04391',   // E02 → 녹빛 창날 · 녹슨 동상
    '거대한 핀': 'o04942',        // E04 → 구르는 추 · 스트라이크 & 스페어
    '황금빛 요정': 'o01871',      // E05 → 밀랍 금화 · 거짓 재화
    '형벌의 말': 'f024637'        // E06 → 고장난 제세동기 · 응혈흔
  };
})();
