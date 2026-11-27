/* =========================================================
   Lectern Company — 미디어 등록표 (일러스트 · BGM)
   ---------------------------------------------------------
   비주얼 노벨 대본의 [컷씬: 이름] · [BGM: 이름] 과 같은 이름으로 연결됩니다.
   · 일러스트 파일: media/illust/ 폴더에 「이름.webp」 (또는 .png / .jpg)
       예) media/illust/canto0_illust_01.png
   · BGM 파일:     media/bgm/ 폴더에 아래 file 이름 그대로 (.mp3 또는 .ogg)
   · 효과음 파일:  media/sfx/ 폴더에 아래 file 이름 그대로 (.mp3)
   · 배경 이미지:  media/bg/ 폴더에 「0-1.webp」처럼 대본의 [배경: 이름] 그대로
       예) media/bgm/c0_01.mp3
   파일이 없으면 화면에는 '등록 대기'로 보이고, 해금 기록은 그대로 남습니다.
   새 Canto가 나오면 albums · illust · bgm 에 줄을 추가하면 됩니다.
   ========================================================= */
window.LC_MEDIA = {
  albums: [
    { id:'hell-main-00', chapter:'지옥장', chapterEn:'INFERNO', cat:'MAIN', no:'0', title:'순례길에 오르는', color:'#FB6544', date:'984.01' },
  ],
  // 다음에 열릴 Canto (자리만 · 이름 없이 봉인)
  sealed: [ { chapter:'지옥장', no:'1', color:'#E04450' } ],

  // 로비 기본 BGM (처음부터 열려 있음 · 위쪽 BGM 버튼 목록 순서)
  lobby: [
    { id:'before_canto',    title:'Before Canto',              kr:'로비 · 막이 오르기 전' },
    { id:'train_trane',     title:'Train Trane',               kr:'오판 · 달리는 창가' },
    { id:'electro_swing',   title:'Electro Swing Party',       kr:'스윙 · 파티 홀' },
    { id:'dramatic_tango',  title:'Dramatic Tango',            kr:'탱고 · 극적인 한 막' },
    { id:'oriental_hiphop', title:'Oriental Hip-hop',          kr:'골목 · 동양풍 리듬' },
    { id:'styx_helix',      title:'Styx Helix (English Ver.)', kr:'영어 커버 · AmaLee' },
  ],

  illust: {
    canto0_illust_01:{ album:'hell-main-00', cap:'거울 속, 등불이 된 머리' },
    canto0_illust_02:{ album:'hell-main-00', cap:'P사 중앙도로' },
    canto0_illust_03:{ album:'hell-main-00', cap:'200주년 신년 행사 포스터' },
    canto0_illust_04:{ album:'hell-main-00', cap:'등불 머리를 찾아낸 세 사람' },
    canto0_illust_05:{ album:'hell-main-00', cap:"버스 '오판'의 도착" },
    canto0_illust_06:{ album:'hell-main-00', cap:'그렇겐 안되지!' },
    canto0_illust_07:{ album:'hell-main-00', cap:'수적 우세, 그러나' },
    canto0_illust_08:{ album:'hell-main-00', cap:'쓰러지는 사람들' },
    canto0_illust_09:{ album:'hell-main-00', cap:"특색 '갈빛들개'" },
    canto0_illust_10:{ album:'hell-main-00', cap:'예브게니 오네긴' },
    canto0_illust_11:{ album:'hell-main-00', cap:'몽현' },
    canto0_illust_12:{ album:'hell-main-00', cap:'주제 사라마구' },
    canto0_illust_13:{ album:'hell-main-00', cap:'캡틴 재스' },
    canto0_illust_14:{ album:'hell-main-00', cap:'백령' },
    canto0_illust_15:{ album:'hell-main-00', cap:'클라라와 프리츠' },
    canto0_illust_16:{ album:'hell-main-00', cap:'알름' },
    canto0_illust_17:{ album:'hell-main-00', cap:'핀헤드' },
    canto0_illust_18:{ album:'hell-main-00', cap:'나나시 마구라' },
    canto0_illust_19:{ album:'hell-main-00', cap:'생 제르맹' },
    canto0_illust_20:{ album:'hell-main-00', cap:'길잡이 허클베리 핀' },
    canto0_illust_21:{ album:'hell-main-00', cap:'운전수 제이미 서더크' },
  },

  bgm: {
    'Karma':                       { album:'hell-main-00', file:'c0_01', title:'Karma', scene:'시작 — 떠도는 의식' },
    'Warm Light':                  { album:'hell-main-00', file:'c0_02', title:'Warm Light (Ambient Piano)', scene:'여관' },
    'COORDINATION':                { album:'hell-main-00', file:'c0_03', title:'COORDINATION', scene:'P사 중앙도로' },
    'Upbeat Groove':               { album:'hell-main-00', file:'c0_04', title:'Upbeat Groove', scene:'등불 머리를 찾아낸 세 사람' },
    'Gaming Rock':                 { album:'hell-main-00', file:'c0_05', title:'Gaming Rock', scene:'첫 전투' },
    'Serious Weighty Report Tone': { album:'hell-main-00', file:'c0_06', title:'Serious Weighty Report Tone', scene:"특색 '갈빛들개'" },
    'Ethereal':                    { album:'hell-main-00', file:'c0_07', title:'Ethereal', scene:'다시, 여관' },
    'Slowly':                      { album:'hell-main-00', file:'c0_08', title:'Slowly', scene:'오판 안' },
  },

  /* 배경 — 대본의 [배경: 이름] · 파일은 media/bg/ 폴더 (video: 움직이는 배경, 소리 없이 반복 재생 · 이미지는 영상이 뜨기 전·안 될 때 표시) */
  bg: {
    '0-1': { img:'0-1.webp', video:'0-1.mp4', label:'여관' },
    '0-2': { img:'0-2.webp', label:'P사 중앙도로' },
    '0-3': { img:'0-3.webp', label:'오판 안' },
  },

  /* 효과음 — 대본의 [효과음: 이름] 과 같은 이름 · 파일은 media/sfx/ 폴더 (vol: 상대 음량)
     ※ 표시가 붙은 4개는 같은 이름의 파일이 없어 비슷한 소리로 임시 연결 */
  sfx: {
    '火炎魔法1':            { file:'c0_fire1' },
    '火炎魔法2':            { file:'c0_fire2' },
    '導火線':               { file:'c0_fuse', vol:.8 },
    'マッチで火をつける':    { file:'c0_match' },
    '刀で斬る3':            { file:'c0_katana3' },
    '水がジューッと蒸発':    { file:'c0_sizzle', vol:.8 },
    '車の急ブレーキ1':       { file:'c0_brake' },
    'バスのドアが開く2':     { file:'c0_busdoor' },
    'Swordsoundfx1':        { file:'c0_sword' },
    '지정사서 관통':         { file:'c0_pierce' },
    '電気ドリル':            { file:'c0_drill' },
    'Defense_Evasion':      { file:'c0_evade' },        // ※ 임시: 주사위회피
    'Object_Crash':         { file:'c0_crash', vol:.75 }, // ※ 임시: 충격파
    'Index_Hubert_Start':   { file:'c0_index_start' },  // ※ 임시: Index_Gloria_Start
    'Object_Destory':       { file:'c0_fall' },         // ※ 임시: 넘어지는
  },
};
/* 경로 도우미 — base: 이 파일이 있는 사이트 최상위까지의 상대 경로 ('' 또는 '../') */
LC_MEDIA.illustUrls = (name, base='') => ['webp','png','jpg'].map(e=>`${base}media/illust/${name}.${e}`);
LC_MEDIA.bgmUrls    = (name, base='') => { const b=LC_MEDIA.bgm[name]; return b ? ['mp3','ogg'].map(e=>`${base}media/bgm/${b.file}.${e}`) : []; };
LC_MEDIA.sfxUrl  = (name, base='') => { const f=(LC_MEDIA.sfx||{})[String(name).trim()]; return f ? `${base}media/sfx/${f.file}.mp3` : null; };
LC_MEDIA.lobbyUrl = (id, base='') => `${base}media/lobby/${id}.mp3`;
LC_MEDIA.key = name => encodeURIComponent(String(name)).replace(/\./g,'%2E');   // Firebase 열쇠로 쓸 수 있게
LC_MEDIA.unkey = k => decodeURIComponent(String(k).replace(/%2E/g,'.'));
