/* =========================================================
   Lectern Company — 거울 뽑기 기본 카탈로그
   - 관리 화면의 「초기 데이터 기록」 / 「카탈로그 동기화」가 이 파일을 Firebase에 씁니다.
   - 새 인격을 추가할 때: 이미지를 img/it/ 폴더에 넣고, 아래 목록에 한 줄을 추가한 뒤
     관리 화면에서 「카탈로그 동기화」를 누르거나, 관리 화면에서 직접 추가하세요.
   grade: g1(ɵ) g2(ɵɵ) g3(ɵɵɵ) ego(E.G.O.)
   pool : standard(상시) / season(시즌, season 번호) / event(이벤트, tag)
   base : true = 수감자 기본 E.G.O. (모두 처음부터 보유, 뽑기 제외)
   ========================================================= */
window.LC_CATALOG = (function(){
  const L = [];
  let n = 0;
  const T0 = 1763380000000;
  const add = (id, grade, char, name, o={}) => L.push(Object.assign({id, grade, char, name, pool:'standard', created:T0 + (n++)}, o));
  const st = (id) => ({img:`img/it/${id}.webp`});

  /* ---- ɵ  LCB 수감자 (기본 보유) ---- */
  [['01','몽현'],['02','클라라'],['03','주제 사라마구'],['04','나나시 마구라'],['05','생 제르맹'],
   ['06','백령'],['07','캡틴 재스'],['08','핀헤드'],['09','예브게니 오네긴'],['11','알름']]
   .forEach(([c,nm]) => add('g1_'+c, 'g1', c, 'LCB 수감자 '+nm, {img:`img/st${c}.webp`}));

  /* ---- ɵɵ · ɵɵɵ 인격 ---- */
  const S1 = {pool:'season', season:1}, S2 = {pool:'season', season:2};
  // No.01 몽현
  add('id_01_s',    'g2','01','북부 시 협회 5과 몽현',            st('id_01_s'));
  add('id_01_d',    'g2','01','동부 디에치 협회 5과 몽현',        st('id_01_d'));
  add('id_01_w',    'g2','01','W사 2등급 정리 요원 몽현',         st('id_01_w'));
  add('id_01_dream','g3','01','순수한 꿈 몽현',                   {...st('id_01_dream'), ...S2});
  // No.02 클라라
  add('id_02_r',    'g2','02','서부 리우 협회 5과 클라라',        st('id_02_r'));
  add('id_02_z',    'g2','02','남부 츠바이 협회 5과 클라라',      st('id_02_z'));
  add('id_02_w',    'g2','02','W사 2등급 정리 요원 클라라',       st('id_02_w'));
  add('id_02_s',    'g2','02','S사 뼈당파 군인 클라라',           {...st('id_02_s'), ...S2});
  // No.03 주제 사라마구
  add('id_03_t',    'g2','03','서부 트레스 협회 5과 주제 사라마구', st('id_03_t'));
  add('id_03_7',    'g2','03','북부 세븐 협회 5과 주제 사라마구', st('id_03_7'));
  add('id_03_r',    'g2','03','R사 제 4무리 순록팀 주제 사라마구', st('id_03_r'));
  add('id_03_hand', 'g2','03','손빠른 해결사 주제 사라마구',      {...st('id_03_hand'), ...S1});
  // No.04 나나시 마구라
  add('id_04_s',    'g2','04','북부 시 협회 5과 나나시 마구라',    st('id_04_s'));
  add('id_04_d',    'g2','04','동부 디에치 협회 5과 나나시 마구라', st('id_04_d'));
  add('id_04_w',    'g2','04','W사 2등급 정리 요원 나나시 마구라', st('id_04_w'));
  add('id_04_fairy','g2','04','요정 추격자 나나시 마구라',        {...st('id_04_fairy'), ...S2});
  // No.05 생 제르맹
  add('id_05_u',    'g2','05','동부 외우피 협회 5과 생 제르맹',    st('id_05_u'));
  add('id_05_sh',   'g2','05','북부 섕크 협회 5과 생 제르맹',      st('id_05_sh'));
  add('id_05_r',    'g2','05','R사 제 4무리 토끼팀 생 제르맹',     st('id_05_r'));
  add('id_05_eye',  'g2','05','눈빠른 해결사 생 제르맹',          {...st('id_05_eye'), ...S1});
  // No.06 백령
  add('id_06_l',    'g2','06','서부 리우 협회 5과 백령',          st('id_06_l'));
  add('id_06_t',    'g2','06','서부 트레스 협회 5과 백령',        st('id_06_t'));
  add('id_06_w',    'g2','06','W사 2등급 정리 요원 백령',         st('id_06_w'));
  add('id_06_s',    'g2','06','동부 시 협회 5과 부장 백령',       {...st('id_06_s'), ...S2});
  // No.07 캡틴 재스
  add('id_07_7',    'g2','07','북부 세븐 협회 5과 캡틴 재스',      st('id_07_7'));
  add('id_07_8',    'g2','07','남부 에잇 협회 5과 캡틴 재스',      st('id_07_8'));
  add('id_07_r',    'g2','07','R사 제 4무리 토끼팀 캡틴 재스',     st('id_07_r'));
  add('id_07_lem',  'g2','07','레뮤얼 캡틴 재스',                 {...st('id_07_lem'), ...S1});
  // No.08 핀헤드
  add('id_08_8',    'g2','08','남부 에잇 협회 5과 핀헤드',        st('id_08_8'));
  add('id_08_z',    'g2','08','서부 제뱌찌 협회 5과 핀헤드',      st('id_08_z'));
  add('id_08_w',    'g2','08','W사 2등급 정리 요원 핀헤드',       st('id_08_w'));
  add('id_08_act',  'g2','08','섕크의 연기자 핀헤드',             {...st('id_08_act'), ...S1});
  // No.09 예브게니 오네긴
  add('id_09_sh',   'g2','09','북부 섕크 협회 5과 예브게니 오네긴', st('id_09_sh'));
  add('id_09_z',    'g2','09','서부 제뱌찌 협회 5과 예브게니 오네긴', st('id_09_z'));
  add('id_09_r',    'g2','09','R사 제 4무리 순록팀 예브게니 오네긴', st('id_09_r'));
  add('id_09_fairy','g2','09','요정 추격자 예브게니 오네긴',      {...st('id_09_fairy'), ...S2});
  add('id_09_love', 'g3','09','사랑의 복수자 예브게니 오네긴',    {...st('id_09_love'), ...S1});
  // No.11 알름
  add('id_11_z',    'g2','11','남부 츠바이 협회 5과 알름',        st('id_11_z'));
  add('id_11_u',    'g2','11','동부 외우피 협회 5과 알름',        st('id_11_u'));
  add('id_11_r',    'g2','11','R사 제 4무리 코뿔소팀 알름',       st('id_11_r'));

  /* ---- E.G.O. ---- */
  const E = (id, tier, char, name, o={}) => add(id, 'ego', char, name, {tier, ...st(id), ...o});
  // 기본 Zayin (수감자 기본 E.G.O. — 처음부터 보유, 뽑기 제외)
  E('base_01','zayin','01','해몽',{base:true});
  E('base_02','zayin','02','For Fritz',{base:true});
  E('base_03','zayin','03','세게이라 브랑카',{base:true});
  E('base_04','zayin','04','태아몽 「胎児夢」',{base:true});
  E('base_05','zayin','05','레 쉬미스트 듀 텀',{base:true});
  E('base_06','zayin','06','월하백영',{base:true});
  E('base_07','zayin','07','플라잉 더치맨',{base:true});
  E('base_08','zayin','08','위대한 마법사',{base:true});
  E('base_09','zayin','09','표방된 질투',{base:true});
  E('base_11','zayin','11','아델하이트의 언덕',{base:true});
  // 뽑기 E.G.O. — 출시 (EGO 목록 v2)
  E('ego_01_cake1',  'zayin','01','케이크 하나', {pool:'event', tag:'birthday'});   // 생일 이벤트 증정
  E('ego_02_fanfare','zayin','02','팡파레', S1);
  E('ego_06_ace',    'teth','06','에이스', S1);
  E('ego_11_statue', 'teth','11','녹슨 동상', S1);
  E('ego_04_blood',  'he','04','응혈흔(凝血痕)', S2);
  E('ego_07_strike', 'teth','07','스트라이크 & 스페어', S2);
  E('ego_08_coin',   'teth','08','거짓 재화', S2);
  // 미출시 — 스킬 원문이 오기 전까지 사이트 어디에도 보이지 않음 (일러스트만 미리 넣어 둠)
  const U={unreleased:true};
  E('ego_02_cake2',  'zayin','02','케이크 둘', U);
  E('ego_01_rain',   'teth','01','고이는 빗물', U);
  E('ego_03_fruit',  'teth','03','괴사된 과사', U);
  E('ego_04_toss',   'teth','04','뒤척임', U);
  E('ego_09_burn',   'teth','09','번아웃', U);
  E('ego_11_copy',   'teth','11','복사본', U);
  E('ego_02_wood',   'he','02','목도', U);
  E('ego_05_butterfly','he','05','나비몰기', U);
  E('ego_06_gold',   'he','06','금타레', U);

  return L;
})();

/* 셰르(관리자) 계정의 이전 사이트 보유 현황 — 「초기 데이터 기록」 때 공식 기록에 들어갑니다 */
window.LC_SHER_OWNED = [
  // 인격 38종
  'id_01_s','id_01_w','id_01_d','id_01_dream',
  'id_02_r','id_02_s','id_02_w',
  'id_03_hand','id_03_r','id_03_7','id_03_t',
  'id_04_w','id_04_d','id_04_s','id_04_fairy',
  'id_05_eye','id_05_u','id_05_r',
  'id_06_l','id_06_t','id_06_w','id_06_s',
  'id_07_lem','id_07_8','id_07_r','id_07_7',
  'id_08_z','id_08_act','id_08_w','id_08_8',
  'id_09_sh','id_09_z','id_09_r','id_09_love','id_09_fairy',
  'id_11_z','id_11_u','id_11_r',
  // E.G.O. 7종
  'ego_01_cake1','ego_02_fanfare','ego_04_blood','ego_06_ace','ego_07_strike','ego_08_coin','ego_11_statue',
];

/* 운영 설정 기본값 (현재 Season 2) */
window.LC_DEFAULT_CFG = {
  season:{no:2, name:'SEASON 2', open:true},
  event:{open:false, kind:'walpurgis', name:'발푸르기스의 밤', tag:'walpurgis-1'},
  bonus:{season:2, event:3},
  cost:{single:100, ten:1000},
  dup:{g1:1, g2:5, g3:10},
  exchange:{g1:50, g2:100, g3:200, ego:200},
  startShards:50,
  startMadness:0,
  baseOwned:true,
  practice:{madness:10000},
};
