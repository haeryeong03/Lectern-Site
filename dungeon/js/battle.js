/* ─────────────────────────────────────────────────────────────────────
   Lectern Company · 거울 던전 — 전투 엔진 v3 (2-1 기본 전투 + 2-2 키워드 · 코인 효과 + 관리자 셰르)
   규칙: claude/거울던전_전투규칙.md v26 · claude/거울던전_적_규칙.md v8 · claude/lcb_관리자_셰르.md
   화면: 전장 무대 · 속도 주사위 · 곡선 화살표 · 카드 트레이 · 합 연출(3D 코인) · 정보창(가운데 고정)
   다음 단계: 2-3 E.G.O. · 공명 · 기프트 / 2-4 적 기믹
   ───────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  let X = null, sel = null, selM = null, busy = false, hoverAid = null, endq = [], notes = [];
  const egoTab = new Set();
  const d6 = () => 1 + Math.floor(Math.random() * 6);
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pickR = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const DEF_TYPES = ['방어', '회피', '반격'];
  const isDef = (sk) => DEF_TYPES.includes(sk.type);
  const STAG_PCT = { 1: [0.75, 0.5, 0.25], 2: [0.66, 0.33], 3: [0.5] };
  const TYPE_ICON = { 참격: '⟋', 관통: '➶', 타격: '✸', 방어: '▣', 회피: '↷', 반격: '⇄', 가변: '✧' };
  const FULL = ['1', '1', '1', '2', '2', '3'];
  const MGR_COLOR = '#FF9200';

  /* 키워드 */
  const KW = {
    출혈: { c: '#e0504a', d: '합을 칠 때마다 수치만큼 피해 → 절반' },
    화상: { c: '#ff8a3d', d: '턴 종료 시 수치만큼 피해 → −1' },
    진동: { c: '#4fd1c5', d: '진동 폭발 때 임계치 상승 · 턴 종료 −1' },
    파열: { c: '#ff6fa8', d: '피격 시 수치만큼 추가 피해 → −1' },
    침잠: { c: '#5b86e0', d: '5 이상이면 앞 코인 뒷면 고정 + SP 감소' },
    호흡: { c: '#8fd3ff', d: '5 이상이면 앞 코인 앞면 고정' },
    충전: { c: '#f2d14c', d: '스킬 효과의 비용 · 턴 종료 −1' },
    마비: { c: '#c8e05a', d: '다음에 쓰는 스킬의 앞 코인 소멸' },
    방어막: { c: '#d9d4c7', d: '받는 피해 감소 · 턴 종료 소멸' }
  };
  const NX = { // 다음 턴에 적용되는 키워드
    haste: { n: '신속', c: '#7fd6a0', d: '속도 +' }, bind: { n: '속박', c: '#c08a5a', d: '속도 −' },
    atkUp: { n: '위력+', c: '#f0b45a', d: '공격 위력 +' }, atkDown: { n: '위력−', c: '#a58a6a', d: '공격 위력 −' },
    defUp: { n: '방어+', c: '#b9c9e0', d: '수비 위력 +' }, defDown: { n: '방어−', c: '#9a8fb8', d: '수비 위력 −' },
    guard: { n: '보호', c: '#a8c8e8', d: '받는 피해 −5×' }, vuln: { n: '취약', c: '#e07a9a', d: '받는 피해 +5×' },
    para: { n: '마비', c: '#c8e05a', d: '다음 턴 마비' }
  };
  const NXK = { 신속: 'haste', 속박: 'bind', 위력증가: 'atkUp', 위력감소: 'atkDown', 방어증가: 'defUp', 방어감소: 'defDown', 보호: 'guard', 취약: 'vuln' };
  const CAP = { 침잠: 20, 호흡: 20 };

  /* ═════════════ 효과음 (Web Audio 합성 · 파일 없음) ═════════════ */
  const SFX = (() => {
    let ac = null, on = true;
    try { on = localStorage.getItem('lcmd_sfx') !== '0'; } catch (e) { /* 저장소 없음 */ }
    const ctx = () => {
      if (!on) return null;
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    };
    const master = 0.55;
    function tone(f, t, dur, g, type = 'sine', f2) {
      const c = ctx(); if (!c) return; const t0 = c.currentTime + t;
      const o = c.createOscillator(), v = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
      v.gain.setValueAtTime(0.0001, t0); v.gain.exponentialRampToValueAtTime(g * master, t0 + 0.006); v.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(v).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    }
    function noise(t, dur, g, lo, hi) {
      const c = ctx(); if (!c) return; const t0 = c.currentTime + t;
      const len = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = (lo + hi) / 2; bp.Q.value = (lo + hi) / 2 / Math.max(1, hi - lo);
      const v = c.createGain(); v.gain.setValueAtTime(g * master, t0); v.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(bp).connect(v).connect(c.destination); src.start(t0);
    }
    const metal = (f, t, dur, g) => { tone(f, t, dur, g); tone(f * 2.76, t, dur * 0.6, g * 0.45); tone(f * 5.4, t, dur * 0.35, g * 0.2); };
    return {
      get on() { return on; },
      toggle() { on = !on; try { localStorage.setItem('lcmd_sfx', on ? '1' : '0'); } catch (e) { /* 무시 */ } if (on) this.ui(); },
      flip() { const f = 2300 + Math.random() * 500; metal(f, 0, 0.09, 0.16); noise(0, 0.07, 0.05, 3000, 9000); },
      land(h) { if (h) { metal(1560 + Math.random() * 60, 0, 0.42, 0.2); tone(3120, 0.02, 0.25, 0.05); } else { metal(620 + Math.random() * 40, 0, 0.16, 0.16); noise(0, 0.05, 0.08, 400, 1600); } },
      lock() { metal(1900, 0, 0.18, 0.1); },
      clash() { noise(0, 0.22, 0.35, 900, 5000); tone(180, 0, 0.28, 0.35, 'triangle', 60); metal(1200, 0.01, 0.3, 0.08); },
      hit(big) { noise(0, big ? 0.26 : 0.16, big ? 0.4 : 0.26, 200, 2400); tone(big ? 110 : 150, 0, 0.22, 0.32, 'sine', 45); },
      tie() { metal(1800, 0, 0.12, 0.12); metal(1800, 0.11, 0.16, 0.12); },
      shatter() { noise(0, 0.32, 0.22, 3500, 11000); metal(2900, 0, 0.08, 0.06); metal(2300, 0.05, 0.08, 0.05); metal(1700, 0.1, 0.1, 0.04); },
      flame() { noise(0, 0.6, 0.12, 300, 1400); tone(320, 0, 0.6, 0.06, 'sine', 640); metal(1320, 0.15, 0.5, 0.06); },
      kw() { tone(1050, 0, 0.09, 0.05, 'triangle', 1400); },
      egoIn() { noise(0, 0.55, 0.22, 600, 5000); tone(220, 0, 0.5, 0.12, 'sawtooth', 880); for (let i = 0; i < 6; i++) metal(1400 + i * 260, i * 0.06, 0.12, 0.05); },
      ego() { noise(0, 0.5, 0.14, 200, 1200); tone(110, 0, 0.9, 0.22, 'sawtooth', 55); [392, 494, 587, 784].forEach((f, i) => metal(f, 0.05 + i * 0.05, 0.9, 0.07)); },
      ui() { tone(1400, 0, 0.05, 0.05, 'triangle'); },
      win() { [523, 659, 784, 1046].forEach((f, i) => metal(f, i * 0.09, 0.6, 0.1)); },
      lose() { [392, 330, 262].forEach((f, i) => tone(f, i * 0.16, 0.5, 0.12, 'triangle')); }
    };
  })();
  const sfx = (k, ...a) => { if (!X || SKIP() || !SFX.on) return; try { SFX[k](...a); } catch (e) { /* 소리 실패 무시 */ } };

  const B = () => X.run.pending;
  /* 죄악 재화: 던전 전체에 쌓임 (run.sins). 스킬을 쓰면 이번 턴 몫(tsins)에 모였다가 턴 종료 뒤 지급 (전투 규칙 6-1) */
  const SINS = () => X.run.sins || (X.run.sins = {});
  function addSin(sin) { const t = T(); if (!t.tsins) t.tsins = {}; t.tsins[sin] = (t.tsins[sin] || 0) + 1 + (t.mgr.x2 || 0); paintSins(); }
  function paySins() {
    const t = T(), p = t.tsins || {}, S = SINS(), got = [];
    X.D.SIN_ORDER.forEach((k) => { if (p[k]) { S[k] = (S[k] || 0) + p[k]; got.push(`${k} +${p[k]}`); } });
    t.tsins = {};
    if (got.length) { log(`◆ 죄악 재화 ${got.join(' · ')}`, 'sin'); $$('#bv-sins .sn.pend').forEach((e) => e.classList.add('pay')); }
    if (X.hud) X.hud();
  }
  const T = () => B().bt;
  const P = (cid) => X.run.party[cid];
  const K = () => (T().speed === 'fast' ? 0.45 : 1);
  const SKIP = () => T().speed === 'skip';
  const MGR = () => window.MD_MGR || {};

  /* ═════════════ 효과 해석기 ═════════════ */
  const TRIG = [['앞면적중', 'head'], ['뒷면적중', 'tail'], ['적중', 'hit'], ['사용', 'use'], ['공격종료', 'end'], ['턴종료', 'turnEnd'], ['적처치', 'kill'], ['회피성공', 'evade'], ['합승리', 'clashWin']];
  const KRE = /(공격\s*위력\s*증가|공격\s*위력\s*감소|수비\s*위력\s*증가|수비\s*위력\s*감소|위력\s*증가|위력\s*감소|방어\s*감소|방어\s*증가|호흡|침잠|출혈|화상|진동|파열|충전|신속|속박|마비|보호막|방어막|보호|취약|위력)\s*(\d+)(?!\s*당)(\s*(?:증가|감소))?/g;
  function normK(k, tail) {
    k = k.replace(/\s/g, '');
    if (k === '공격위력증가' || k === '위력증가') return '위력증가';
    if (k === '공격위력감소' || k === '위력감소') return '위력감소';
    if (k === '수비위력감소' || k === '방어감소') return '방어감소';
    if (k === '수비위력증가' || k === '방어증가') return '방어증가';
    if (k === '보호막') return '방어막';
    if (k === '위력') return /감소/.test(tail || '') ? '위력감소' : '위력증가';
    return k;
  }
  function whoOf(s) {
    if (/아군\s*전원|아군\s*전체/.test(s)) return 'allyAll';
    if (/(HP|체력)가?이?\s*가장\s*높은/.test(s)) return 'allyHpHigh';
    if (/(HP|체력)가?이?\s*가장\s*낮은/.test(s)) return 'allyHpLow';
    if (/SP가?\s*가장\s*낮은/.test(s)) return 'allySpLow';
    if (/아군/.test(s)) return 'ally';
    if (/자신에게|자신의|본인|얻음|얻는|획득/.test(s)) return 'self';
    if (/부여|대상|상대/.test(s)) return 'target';
    return 'self';
  }
  function parseSeg(trig, s) {
    const src = s; let cond = null, m;
    if (!trig || trig === 'x') return [{ trig: 'x', act: 'text', src }];
    const next = /다음\s*턴/.test(s);
    if (/흐트러지거나|흐트러짐\s*상태가\s*되거나/.test(s)) cond = { type: 'stagKill' };
    else if ((m = s.match(/(대상의|자신의|본인의|상대의)?\s*(침잠|호흡|출혈|화상|진동|파열|충전)\s*(?:수치)?\s*(?:이|가)?\s*(\d+)\s*(이상|이하)/))) cond = { type: 'kw', of: m[1] ? (/대상|상대/.test(m[1]) ? 'target' : 'self') : null, k: m[2], n: +m[3], op: m[4] === '이상' ? 'gte' : 'lte' };
    else if (/(정신력|SP)이?가?\s*0\s*이하/.test(s)) cond = { type: 'spLe0' };
    if (/(\d+\s*회\s*발동|강제\s*발동|재사용|재장전|버림|전이|복제|대상만|경보|코인을\s*하나|단계|절반\s*소모|만큼\s*금화|독\s*부여|금화)/.test(s)) return [{ trig, act: 'text', src }];
    if (!cond && /(경우|이면|일\s*시|했다면|있을|두명당)/.test(s)) return [{ trig, act: 'text', src }];
    let body = s;
    if (cond && cond.type !== 'stagKill') { const i = body.search(/(경우|이면|일\s*시|인\s*대상에게)/); if (i >= 0) body = body.slice(i).replace(/^(경우|이면|일\s*시|인\s*대상에게)\s*,?/, ''); }
    if (cond && cond.type === 'stagKill') body = body.replace(/^.*?(사망하면|사망 시|되면)\s*,?/, '');
    const ops = [];
    const cntM = body.match(/(\d+)\s*명/); const cnt = cntM ? +cntM[1] : 1;
    if ((m = body.match(/(호흡|충전|침잠|출혈|파열|화상|진동)\s*(\d+)\s*당\s*(?:대상에게\s*)?(공격\s*위력\s*감소|위력\s*감소|방어\s*감소|위력\s*증가|방어\s*증가|출혈|화상|침잠|파열|진동|마비|취약)\s*(\d+)/))) {
      ops.push({ act: 'kwPer', base: m[1], div: +m[2], k: normK(m[3]), n: +m[4], who: /얻음/.test(body) ? 'self' : 'target', next });
      body = body.replace(m[0], '');
    }
    if ((m = body.match(/(대상의|상대의)?\s*(출혈|침잠|파열|화상|진동|호흡)\s*(?:수치)?\s*만큼\s*(SP|정신력|HP|체력)\s*회복/))) {
      ops.push({ act: /SP|정신력/.test(m[3]) ? 'spBy' : 'healBy', k: m[2], of: m[1] || m[2] !== '호흡' ? 'target' : 'self' });
      body = body.replace(m[0], '');
    }
    if ((m = body.match(/잃은\s*(?:HP|체력)\s*÷\s*(\d+)\s*(?:만큼\s*)?추가\s*(?:피해|데미지)\s*\(?\s*최대\s*(\d+)/))) { ops.push({ act: 'dmgLost', div: +m[1], cap: +m[2] }); body = body.replace(m[0], ''); }
    if (/진동\s*폭발/.test(body)) ops.push({ act: 'burst' });
    if (/침잠.*전부\s*출혈로\s*전환/.test(body)) ops.push({ act: 'convert' });
    if ((m = body.match(/(충전|화상|금화)[을를]\s*전부\s*소모/))) ops.push({ act: 'consume', k: m[1] });
    if ((m = body.match(/(?:추가\s*(?:데미지|피해)|피해량)\s*\+?\s*(\d+)/))) ops.push({ act: 'dmg', n: +m[1] });
    else if ((m = body.match(/(침잠|파열|출혈|화상|진동|호흡)\s*(?:수치)?\s*만큼\s*(?:추가\s*)?(?:데미지|피해)/))) ops.push({ act: 'dmgBy', k: m[1], of: m[1] === '호흡' ? 'self' : 'target' });
    if ((m = body.match(/기본\s*위력\s*(\d+)\s*증가/))) ops.push({ act: 'dmg', n: +m[1] });
    if ((m = body.match(/(?:SP|정신력)\s*(\d+)\s*(감소|회복|상승|증가)/))) ops.push({ act: 'sp', n: (m[2] === '감소' ? -1 : 1) * m[1], who: /대상의|상대의/.test(body) ? 'target' : whoOf(body.replace(/부여/, '')) });
    if ((m = body.match(/(?:HP|체력)\s*(\d+)\s*회복/))) ops.push({ act: 'heal', n: +m[1], who: /아군/.test(body) ? whoOf(body) : 'self' });
    let scan = body.replace(/기본\s*위력\s*\d+\s*증가/g, '').replace(/(?:SP|정신력|HP|체력)\s*\d+\s*(감소|회복|상승|증가)/g, '').replace(/(?:추가\s*(?:데미지|피해)|피해량)\s*\+?\s*\d+/g, '');
    const who = whoOf(body);
    KRE.lastIndex = 0;
    while ((m = KRE.exec(scan))) {
      const k = normK(m[1], m[3]);
      if (trig === 'use' && k === '위력증가' && !next && !/얻음|얻는|부여/.test(body)) ops.push({ act: 'pow', n: +m[2] });   // '최종 위력 +N'류: 이 스킬에 바로
      else ops.push({ act: 'kw', k, n: +m[2], who, next });
    }
    if (!ops.length) return [{ trig, act: 'text', src }];
    return ops.map((o) => Object.assign(o, { trig, cond, src, cnt }));
  }
  function parseFx(str) {
    if (!str) return [];
    const out = []; let trig = null;
    String(str).split(/(\[[^\]]+\])/).forEach((p) => {
      if (!p || !p.trim()) return;
      const b = p.match(/^\[([^\]]+)\]$/);
      if (b) { const key = b[1].replace(/\s/g, ''); const t = TRIG.find(([k]) => key.startsWith(k)); trig = t ? t[1] : 'x'; return; }
      p.split('/').forEach((seg) => { seg = seg.trim().replace(/^[,.\s]+|[,.\s]+$/g, ''); if (seg) out.push(...parseSeg(trig, seg)); });
    });
    return out;
  }
  const FXC = new WeakMap();
  function fxText(sk, idt, slot) {
    if (sk.ego) return sk.fx || [];
    if (idt) { const F = (window.MD_FX || {})[idt]; return (F && F[slot]) || []; }
    return sk.fx || [];
  }
  function fxOps(sk, idt, slot) {
    if (FXC.has(sk)) return FXC.get(sk);
    const arr = fxText(sk, idt, slot); const res = [];
    for (let i = 0; i < (sk.coins | 0); i++) res.push(parseFx(arr[i]));
    FXC.set(sk, res); return res;
  }

  /* ═════════════ 데이터 ═════════════ */
  function canRun(b) { if (b.group) return b.group.every((g) => foeById(g.foeId)); return b.foeId ? !!foeById(b.foeId) : !!enemyFor(b.name); }
  function foeById(id) { return (window.MD_FOES || []).find((f) => f.id === id); }
  function enemyFor(name) { const E = window.MD_ENEMIES || [], L = window.MD_ENEMY_LINK || {}; const id = L[name]; return E.find((e) => e.id === id || e.name === name); }
  const ensure = (o) => { o.k = o.k || {}; o.nx = o.nx || {}; o.cur = o.cur || {}; o.mg = o.mg || {}; return o; };

  function initBattle() {
    const b = B(); const en = [];
    if (b.group || b.foeId) {
      const list = []; (b.group || [{ foeId: b.foeId, count: b.count || 1 }]).forEach((g) => { const f = foeById(g.foeId); for (let i = 0; i < g.count; i++) list.push({ f, i }); });
      const ids = {}; list.forEach(({ f }) => { (ids[f.name] = ids[f.name] || new Set()).add(f.id); });
      list.forEach((x) => { const ttl = list.filter((y) => y.f.name === x.f.name).map((y) => y.f.title); if (ids[x.f.name].size > 1 && new Set(ttl).size === ttl.length && x.f.title !== x.f.name) x.label = x.f.title; });
      const nameCnt = {}; list.forEach((x) => { const n = x.label || x.f.name; nameCnt[n] = (nameCnt[n] || 0) + 1; });
      const nameIdx = {};
      list.forEach(({ f, i, label }, k) => { const base = label || f.name; const j = nameIdx[base] = (nameIdx[base] || 0) + 1; en.push({
        uid: 'e' + k, ref: 'foe:' + f.id, kind: 'human', name: base + (nameCnt[base] > 1 ? ' ' + String.fromCharCode(64 + j) : ''), title: f.title,
        img: i > 0 && f.imgAlt ? f.imgAlt : f.img, grade: f.grade, sp: 0, hasSp: true, dead: false, gone: false, winAt: f.winAt || null, deck: [], panic: false,
        parts: [ensure({ pid: 'p0', name: f.name, core: true, breakable: false, hp: f.hp, max: f.hp, thr: f.stagger.slice(), stUntil: -1, broken: false, def: 0,
          slots: f.slots, speed: f.speed ? [f.speed, f.speed] : [1, 6], res: f.res, sin: null, fid: f.id,
          skills: f.skills.map((k) => Object.assign({}, k, { slot: k.slot === 'def' ? 'def' : String(k.slot) })) })]
      }); });
    } else {
      const e = enemyFor(b.name);
      en.push({
        uid: 'e0', ref: 'abno:' + e.id, kind: e.kind === '뒤틀림' ? 'dist' : 'abno', name: e.name, title: e.kind + ' · ' + e.risk, img: e.img, censor: !!e.censor,
        sp: e.kind === '뒤틀림' ? 0 : null, hasSp: e.kind === '뒤틀림', dead: false, gone: false, winAt: null, passives: e.passives, panic: false,
        parts: e.parts.filter((p) => !p.summoned).map((p) => ensure({
          pid: p.id, name: p.monitor ? '모니터 ' + p.monitor : p.name, core: p.core, breakable: p.breakable, hp: p.hp, max: p.hp, thr: p.stagger.slice(),
          stUntil: -1, broken: false, def: Number(p.def) || 0, slots: p.slots, speed: p.speed, res: p.res, sin: p.sin,
          skills: p.skills.filter((k) => k.slot !== 'ex').map((k) => Object.assign({}, k))
        }))
      });
    }
    const al = {}; b.deployed.concat(b.queue).forEach((cid) => { al[cid] = allyState(cid); });
    b.bt = { v: 3, turn: 0, phase: 'plan', en, al, acts: [], plans: {}, tsins: {}, log: [], speed: (b.bt && b.bt.speed) || 'normal', result: null,
      mgr: { deck: shuffle(FULL), hand: [], used: null, x2: 0 } };
    X.run.known = X.run.known || {};
    startTurn();
  }
  function allyState(cid) {
    const p = P(cid), idt = X.IDT[p.identity], mh = X.maxHp(cid);
    const thr = (STAG_PCT[idt.grade] || [0.5]).map((r) => Math.floor(mh * r)).filter((v) => v < p.hp);
    return ensure({ deck: shuffle(FULL), hand: [], thr, stUntil: -1, speed: 0, panic: false, chain: false });
  }
  function refill(a) {
    while (a.hand.length < 2) {
      if (!a.deck.length) { const pool = FULL.slice(); a.hand.forEach((h) => { const i = pool.indexOf(h); if (i >= 0) pool.splice(i, 1); }); a.deck = shuffle(pool); }
      a.hand.push(a.deck.shift());
    }
  }

  /* ═════════════ 엔티티 (아군 · 적 부위 공통) ═════════════ */
  const EA = (cid) => ({ side: 'a', cid, o: ensure(T().al[cid]) });
  const EE = (u, pt) => ({ side: 'e', u, pt, o: ensure(pt) });
  const eName = (e) => (e.side === 'a' ? nm(e.cid) : X.esc(e.u.name) + (e.u.parts.length > 1 ? '·' + X.esc(e.pt.name) : ''));
  const eSel = (e) => (e.side === 'a' ? `[data-fig="a:${e.cid}"] .fg-body` : e.u.parts.length > 1 ? `.fg-plate[data-part="${e.u.uid}|${e.pt.pid}"]` : `[data-fig="e:${e.u.uid}"] .fg-body`);
  const eFig = (e) => (e.side === 'a' ? `[data-fig="a:${e.cid}"]` : e.u.parts.length > 1 ? eSel(e) : `[data-fig="e:${e.u.uid}"]`);
  const eSp = (e) => (e.side === 'a' ? P(e.cid).sp : e.u.hasSp ? e.u.sp : null);
  const eHp = (e) => (e.side === 'a' ? P(e.cid).hp : e.pt.hp);
  const eAlive = (e) => (e.side === 'a' ? !P(e.cid).dead : !(e.u.dead || e.u.gone || e.pt.broken || e.pt.hp <= 0));
  const same = (a, b) => a && b && a.side === b.side && (a.side === 'a' ? a.cid === b.cid : a.pt === b.pt);
  function eSpAdd(e, v) {
    if (e.side === 'a') { const p = P(e.cid); p.sp = clamp(p.sp + v, X.R.spMin, X.R.spMax); }
    else if (e.u.hasSp) e.u.sp = clamp(e.u.sp + v, X.R.spMin, X.R.spMax);
  }
  function team(e) {
    if (e.side === 'a') return activeAllies().map(EA);
    return T().en.filter((u) => !u.dead && !u.gone).map((u) => { const pts = u.parts.filter((p) => !p.broken && p.hp > 0); const pt = pts.find((p) => p.core) || pts[0]; return pt ? EE(u, pt) : null; }).filter(Boolean);
  }

  /* ═════════════ 턴 시작 ═════════════ */
  function rollOver(o) { ensure(o); o.cur = o.nx || {}; o.nx = {}; o.mg = {}; if (o.cur.para) { o.k.마비 = (o.k.마비 || 0) + o.cur.para; } }
  function startTurn() {
    const t = T(), b = B();
    t.turn++; t.phase = 'plan'; t.plans = {}; t.acts = []; endq = []; egoTab.clear();
    t.mgr.used = null; t.mgr.x2 = 0; refill(t.mgr);
    b.deployed = b.deployed.map((cid) => {
      if (!P(cid).dead) return cid;
      const nx = b.queue.shift();
      if (nx) { log(`<b>${nm(nx)}</b> 이(가) 대기열에서 전장에 들어옵니다.`, 'join'); return nx; }
      return cid;
    });
    activeAllies().forEach((cid) => {
      const a = t.al[cid] || (t.al[cid] = allyState(cid)); const p = P(cid);
      rollOver(a); a.chain = false;
      a.panic = p.sp <= X.R.spMin;
      if (a.panic) log(`<b>${nm(cid)}</b> 패닉 — 이번 턴 행동하지 않습니다.`, 'warn');
      refill(a); a.speed = Math.max(1, d6() + spSpeed(p.sp) + (a.cur.haste || 0) - (a.cur.bind || 0));
    });
    t.en.forEach((u) => {
      if (u.dead || u.gone) return;
      u.panic = u.hasSp && u.sp <= X.R.spMin;
      if (u.panic) log(`<b>${X.esc(u.name)}</b> 패닉 — 이번 턴 행동하지 않습니다.`, 'warn');
      u.parts.forEach((pt) => {
        rollOver(pt);
        if (u.panic || pt.broken || pt.hp <= 0 || staggered(pt)) return;
        for (let i = 0; i < pt.slots; i++) {
          const sk = enemyDraw(u, pt); if (!sk) continue;
          const tgt = isDef(sk) ? null : pickR(activeAllies());
          if (!isDef(sk) && !tgt) continue;
          const spd = Math.max(1, rint(pt.speed[0], pt.speed[1]) + (u.hasSp ? spSpeed(u.sp) : 0) + (pt.cur.haste || 0) - (pt.cur.bind || 0));
          t.acts.push({ aid: `${u.uid}.${pt.pid}.${i}`, uid: u.uid, pid: pt.pid, sk, speed: spd, target: tgt, done: false, used: false });
        }
      });
    });
    t.acts.sort((a, b2) => b2.speed - a.speed);
    log(`TURN ${t.turn} · 적 행동 ${t.acts.length}`, 'turn');
    X.save();
  }
  function enemyDraw(u, pt) {
    if (u.kind === 'human') { if (!u.deck.length) u.deck = shuffle(['1', '1', '1', '2', '2', '3', 'def']); const s = u.deck.shift(); return pt.skills.find((k) => k.slot === s) || pt.skills[0]; }
    return pt.skills.length ? pickR(pt.skills) : null;
  }
  const spSpeed = (sp) => (sp >= 15 && sp < 30 ? 1 : sp <= -15 && sp > -30 ? -1 : 0);
  function band(sp) {
    if (sp == null) return null;
    if (sp >= 45) return { t: '위력 +3', c: 'pos' }; if (sp >= 30) return { t: '앞면 고정 1', c: 'pos' }; if (sp >= 15) return { t: '신속 1', c: 'pos' };
    if (sp <= -45) return { t: '패닉', c: 'neg' }; if (sp <= -30) return { t: '뒷면 고정 1', c: 'neg' }; if (sp <= -15) return { t: '속박 1', c: 'neg' };
    return null;
  }
  const staggered = (o) => o.stUntil >= T().turn;
  const activeAllies = () => B().deployed.filter((c) => !P(c).dead);
  const nm = (cid) => X.CH[cid].short || X.CH[cid].name;
  const unit = (uid) => T().en.find((u) => u.uid === uid);
  const part = (uid, pid) => unit(uid).parts.find((p) => p.pid === pid);
  const actBy = (aid) => T().acts.find((a) => a.aid === aid);
  const idtOf = (cid) => X.IDT[P(cid).identity];
  const EGOSK = {};
  const isEgo = (slot) => String(slot).startsWith('E:');
  function egoSk(id) {
    if (EGOSK[id]) return EGOSK[id];
    const e = (X.D.EGOS || []).find((x) => x.id === id); if (!e) return null;
    return (EGOSK[id] = { slot: 'E:' + id, ego: id, grade: e.grade, name: e.name, type: e.type, sin: e.sin, coins: e.coins, base: e.pw, cp: e.cp, weight: e.weight,
      fx: (window.MD_EGO_FX || {})[id] || [e.fx], img: e.img, cost: e.cost || {}, cond: e.cond || '', spCost: (X.D.EGO_SP || {})[e.grade] || 10, sub: e.sub || '' });
  }
  const skillOf = (cid, slot) => (isEgo(slot) ? egoSk(String(slot).slice(2)) : idtOf(cid).skills.find((s) => s.slot === slot));
  const egosOf = (cid) => { const eq = P(cid).egos || {}; return (X.D.EGO_GRADES || []).map((g) => eq[g] && egoSk(eq[g])).filter(Boolean); };
  /* E.G.O. 사용 가능 판정: 이번 턴 다른 수감자가 예약한 재화를 뺀 나머지로 계산 */
  function egoReserved(exceptCid) {
    const r = {}; Object.entries(T().plans).forEach(([c, pl]) => { if (c === exceptCid || !isEgo(pl.slot)) return; const sk = skillOf(c, pl.slot); Object.entries(sk.cost).forEach(([k, v]) => { r[k] = (r[k] || 0) + v; }); });
    return r;
  }
  function egoCheck(cid, sk) {
    const S = SINS(), res = egoReserved(cid), lack = [];
    Object.entries(sk.cost).forEach(([k, v]) => { const have = (S[k] || 0) - (res[k] || 0); if (have < v) lack.push(`${k} ${Math.max(0, have)}/${v}`); });
    const sp = P(cid).sp, spOk = sp - sk.spCost >= X.R.spMin;
    let condOk = true;
    const m = sk.cond && sk.cond.match(/(호흡|충전|침잠|출혈|파열|화상|진동)\s*(\d+)\s*이상/);
    if (m) condOk = (ensure(T().al[cid]).k[m[1]] || 0) >= +m[2];
    const why = [lack.length ? `재화 부족 (${lack.join(' · ')})` : '', spOk ? '' : `SP 부족 (${sp} − ${sk.spCost})`, condOk ? '' : `조건: ${sk.cond}`].filter(Boolean);
    return { ok: !why.length, why, lack, spOk, condOk };
  }
  const canAct = (cid) => { const a = T().al[cid], p = P(cid); return !p.dead && !a.panic && !staggered(a); };
  const sinC = (s) => (X.D.SIN_ORDER.includes(s) ? `var(--sin-${s})` : '#8a8a8a');
  const known = (u, pt) => { const k = X.run.known || (X.run.known = {}); return k[u.ref + ':' + pt.pid] || (k[u.ref + ':' + pt.pid] = {}); };
  const actE = (a) => { const u = unit(a.uid); return EE(u, part(a.uid, a.pid)); };

  /* ═════════════ 코인 계획 (침잠 · 호흡 · 마비 · SP) ═════════════ */
  function prep(sk, e, isAtk, dry) {
    const st = ensure(e.o), k = st.k, n = sk.coins | 0, faces = Array(n).fill(null);
    const sp = eSp(e), sink = k.침잠 || 0, br = k.호흡 || 0;
    const a = sink >= 5 ? Math.min(Math.floor(sink / 5), n) : 0, b = br >= 5 ? Math.min(Math.floor(br / 5), n) : 0, both = Math.min(a, b);
    for (let i = 0; i < n; i++) faces[i] = i < both ? null : i < a ? 'T' : i < b ? 'H' : null;
    let para = k.마비 || 0, removed = 0;
    for (let i = 0; i < n && para > 0; i++) { if (faces[i] === 'T' && i < a) continue; faces[i] = 'X'; para--; removed++; }
    let spFix = 0;
    if (sp != null && sp >= 30 && sp < 45) { const i = faces.indexOf(null); if (i >= 0) { faces[i] = 'H'; spFix = 1; } }
    if (sp != null && sp <= -30 && sp > -45) { const i = faces.indexOf(null); if (i >= 0) { faces[i] = 'T'; spFix = -1; } }
    const mgAtk = isAtk ? st.mg.atk || 0 : 0;
    const bonus = (sp != null && sp >= 45 ? 3 : 0) + (isAtk ? (st.cur.atkUp || 0) - (st.cur.atkDown || 0) + mgAtk : (st.cur.defUp || 0) - (st.cur.defDown || 0));
    const res = { faces, bonus, a, b, removed, spFix, sinkLoss: 0 };
    if (!dry) {
      if (a) { k.침잠 = Math.max(0, sink - 3 * a); res.sinkLoss = Math.floor(sink / 5) <= n ? sink : a * 5; }
      if (b) k.호흡 = Math.max(0, br - 3 * b);
      if (removed) k.마비 = para;
    }
    return res;
  }
  function roll(sk, pl) {
    const coins = pl.faces.map((f) => (f === 'X' ? null : f === 'H' ? true : f === 'T' ? false : Math.random() < 0.5));
    const heads = coins.filter((c) => c === true).length;
    return { coins, fixed: pl.faces.slice(), v: Math.max(0, sk.base + heads * sk.cp + pl.bonus), base: sk.base + pl.bonus, cp: sk.cp };
  }
  function distP(sk, pl) {
    const free = pl.faces.filter((f) => f === null).length, fh = pl.faces.filter((f) => f === 'H').length;
    const m = new Map(); let c = 1;
    for (let k = 0; k <= free; k++) {
      if (k > 0) c = (c * (free - k + 1)) / k;
      const v = Math.max(0, sk.base + (fh + k) * sk.cp + pl.bonus);
      m.set(v, (m.get(v) || 0) + c / 2 ** free);
    }
    return m;
  }
  function winRate(a, b) {
    let w = 0, tie = 0;
    a.forEach((pa, va) => b.forEach((pb, vb) => { if (va > vb) w += pa * pb; else if (va === vb) tie += pa * pb; }));
    return tie >= 1 ? 0.5 : w / (1 - tie);
  }
  function rangeP(sk, pl) { const d = [...distP(sk, pl).keys()]; return [Math.min(...d), Math.max(...d)]; }
  const allyPlan = (cid, sk) => prep(sk, EA(cid), !isDef(sk), true);
  const actPlan = (a) => prep(a.sk, actE(a), !isDef(a.sk), true);
  const clashWin = (cid, slot, a) => { const sk = skillOf(cid, slot); return winRate(distP(sk, allyPlan(cid, sk)), distP(a.sk, actPlan(a))); };

  /* ═════════════ 효과 실행 ═════════════ */
  function giveKw(e, k, n, next) {
    if (!eAlive(e) || !n) return;
    ensure(e.o);
    let label;
    if (NXK[k]) { const kk = NXK[k]; e.o.nx[kk] = (e.o.nx[kk] || 0) + n; label = `${NX[kk].n} ▸${n}`; kwPop(e, label, NX[kk].c); }
    else if (k === '마비' && next) { e.o.nx.para = (e.o.nx.para || 0) + n; label = `마비 ▸${n}`; kwPop(e, label, KW.마비.c); }
    else { e.o.k[k] = Math.min((e.o.k[k] || 0) + n, CAP[k] || 999); label = `${k} +${n}`; kwPop(e, label, (KW[k] || {}).c); }
    notes.push(`${label}→${eName(e)}`);
  }
  function targetsOf(who, ctx) {
    const me = ctx.me, tg = ctx.tgt;
    if (who === 'target') return tg ? [tg] : [];
    if (who === 'self') return [me];
    const tm = team(me); if (!tm.length) return [me];
    const n = Math.max(1, ctx.cnt || 1);
    const pickBy = (f, max) => shuffle(tm).map((x) => [x, f(x)]).sort((a, b) => (max ? b[1] - a[1] : a[1] - b[1])).slice(0, n).map((x) => x[0]);
    if (who === 'allyAll') return tm;
    if (who === 'allyHpHigh') return pickBy(eHp, true);
    if (who === 'allyHpLow') return pickBy(eHp, false);
    if (who === 'allySpLow') return pickBy((x) => eSp(x) ?? 0, false);
    if (who === 'ally') { const others = tm.filter((x) => !same(x, me)); return [others.length ? pickR(others) : me]; }
    return [me];
  }
  function condOk(op, ctx) {
    const c = op.cond; if (!c) return true;
    if (c.type === 'stagKill') return !!(ctx.res && (ctx.res.stagNow || ctx.res.died));
    if (c.type === 'spLe0') { const sp = ctx.tgt && eSp(ctx.tgt); return sp != null && sp <= 0; }
    if (c.type === 'kw') {
      const of = c.of || (['호흡', '충전'].includes(c.k) ? 'self' : 'target');
      const v = of === 'self' ? (ctx.snap ? ctx.snap[c.k] || 0 : ctx.me.o.k[c.k] || 0) : ctx.tgt ? ctx.tgt.o.k[c.k] || 0 : 0;
      return c.op === 'gte' ? v >= c.n : v <= c.n;
    }
    return true;
  }
  function doOp(op, ctx) {
    const me = ctx.me, tg = ctx.tgt;
    switch (op.act) {
      case 'kw': targetsOf(op.who, Object.assign({}, ctx, { cnt: op.cnt })).forEach((e) => giveKw(e, op.k, op.n, op.next)); break;
      case 'kwPer': { const base = ctx.snap ? ctx.snap[op.base] || 0 : me.o.k[op.base] || 0; const n = Math.floor(base / op.div) * op.n; if (n > 0) targetsOf(op.who, ctx).forEach((e) => giveKw(e, op.k, n, op.next)); break; }
      case 'spBy': { const s = op.of === 'target' ? tg : me; const v = s ? s.o.k[op.k] || 0 : 0; if (v && eSp(me) != null) { eSpAdd(me, v); kwPop(me, `SP +${v}`, '#6fc093'); notes.push(`SP +${v}→${eName(me)}`); } break; }
      case 'healBy': { const s = op.of === 'target' ? tg : me; const v = s ? s.o.k[op.k] || 0 : 0; if (v) heal(me, v); break; }
      case 'dmgLost': if (ctx.phase === 'hit') { const mx = me.side === 'a' ? X.maxHp(me.cid) : me.pt.max; ctx.extra += Math.min(op.cap, Math.floor((mx - eHp(me)) / op.div)); } break;
      case 'burst': if (tg && eAlive(tg)) burst(tg); break;
      case 'dmg': if (ctx.phase === 'hit') ctx.extra += op.n; break;
      case 'dmgBy': if (ctx.phase === 'hit') { const s = op.of === 'self' ? me : tg; if (s) ctx.extra += s.o.k[op.k] || 0; } break;
      case 'convert': if (tg) { const k = tg.o.k; if (k.침잠) { k.출혈 = (k.출혈 || 0) + k.침잠; kwPop(tg, `침잠→출혈 ${k.침잠}`, KW.출혈.c); notes.push(`침잠 ${k.침잠}→출혈 (${eName(tg)})`); k.침잠 = 0; } } break;
      case 'consume': if (me.o.k[op.k]) { notes.push(`${op.k} ${me.o.k[op.k]} 소모`); me.o.k[op.k] = 0; } break;
      case 'sp': targetsOf(op.who, Object.assign({}, ctx, { cnt: op.cnt })).forEach((e) => { if (eSp(e) == null) return; eSpAdd(e, op.n); kwPop(e, `SP ${op.n > 0 ? '+' : ''}${op.n}`, op.n > 0 ? '#6fc093' : '#d65a4a'); notes.push(`SP ${op.n > 0 ? '+' : ''}${op.n}→${eName(e)}`); }); break;
      case 'heal': targetsOf(op.who, Object.assign({}, ctx, { cnt: op.cnt })).forEach((e) => heal(e, op.n)); break;
      case 'pow': if (ctx.plan) { ctx.plan.bonus += op.n; notes.push(`이번 스킬 위력 +${op.n}`); } break;
    }
  }
  function heal(e, n) {
    if (!eAlive(e)) return;
    if (e.side === 'a') { const p = P(e.cid); p.hp = Math.min(X.maxHp(e.cid), p.hp + n); } else e.pt.hp = Math.min(e.pt.max, e.pt.hp + n);
    kwPop(e, `HP +${n}`, '#6fc093'); notes.push(`HP +${n}→${eName(e)}`);
  }
  function burst(e) {
    const v = e.o.k.진동 || 0; if (!v) return;
    const thr = e.side === 'a' ? e.o.thr : e.pt.thr;
    for (let i = 0; i < thr.length; i++) thr[i] += v;
    e.o.k.진동 = 0;
    kwPop(e, `진동 폭발 +${v}`, KW.진동.c); notes.push(`진동 폭발 ${v} (${eName(e)})`);
    const hp = eHp(e);
    if (hp > 0 && thr.some((x) => x >= hp)) { if (e.side === 'a') e.o.thr = thr.filter((x) => x < hp); else e.pt.thr = thr.filter((x) => x < hp); const was = staggered(e.o); e.o.stUntil = T().turn + 1; if (!was) { e.o.stagBy = true; log(`└ <b>${eName(e)}</b> <span class="st">흐트러짐!</span> (진동 폭발)`); popTxt(eSel(e), 'BREAK'); } }
  }
  /* 스킬 사용 시작: 스냅샷 → 코인 고정 소모 → [사용시] */
  function begin(e, sk, tgt, src) {
    const isAtk = !isDef(sk);
    ensure(e.o); const snap = Object.assign({}, e.o.k);
    const plan = prep(sk, e, isAtk, false);
    if (plan.a) {
      if (eSp(e) != null) { eSpAdd(e, -plan.sinkLoss); kwPop(e, `침잠 · SP −${plan.sinkLoss}`, KW.침잠.c); log(`└ <b>${eName(e)}</b> 침잠 — 코인 ${plan.a}개 뒷면 고정 · SP −${plan.sinkLoss}`, 'dim'); }
      else hurt(e, 5 * plan.a, { m: 1, tag: '' }, `└ 침잠 고정 ${plan.a} →`, { kw: false, kind: 'sink' });
    }
    if (plan.b) log(`└ <b>${eName(e)}</b> 호흡 — 코인 ${plan.b}개 앞면 고정`, 'dim');
    if (plan.removed) { log(`└ <b>${eName(e)}</b> 마비 — 코인 ${plan.removed}개 소멸`, 'dim'); kwPop(e, `마비 · 코인 −${plan.removed}`, KW.마비.c); }
    const ops = fxOps(sk, src && src.idt, src && src.slot);
    const ctx = { me: e, tgt, sk, plan, ops, snap, extra: 0, res: {}, phase: 'use' };
    notes = [];
    ops.forEach((list, i) => { if (plan.faces[i] === 'X') return; list.forEach((op) => { if (op.trig === 'use' && condOk(op, ctx)) doOp(op, ctx); }); });
    flushNotes('사용', e);
    return ctx;
  }
  function hitPhase(ctx, r, tgt, primary = true) {
    const c2 = Object.assign({}, ctx, { tgt, extra: 0, phase: 'hit', rupt: null });
    notes = [];
    let last = -1; r.coins.forEach((c, i) => { if (c !== null && c !== undefined) last = i; });
    ctx.ops.forEach((list, i) => {
      const face = r.coins[i]; if (face === null || face === undefined) return;
      if (i === last) c2.rupt = tgt.o.k.파열 || 0;   // 파열은 마지막 코인이 맞는 순간의 수치 (같은 코인이 주는 파열은 다음 피격부터)
      list.forEach((op) => {
        const ok = op.trig === 'hit' || (op.trig === 'head' && face === true) || (op.trig === 'tail' && face === false);
        if (!ok) return;
        if (!primary && !(op.who === 'target' || ['burst', 'convert', 'dmg', 'dmgBy'].includes(op.act))) return;
        if (condOk(op, c2)) doOp(op, c2);
      });
    });
    return { extra: c2.extra, rupt: c2.rupt == null ? (tgt.o.k.파열 || 0) : c2.rupt };
  }
  function fireTrig(ctx, trig, tgt) {
    const c2 = Object.assign({}, ctx, { tgt: tgt === undefined ? ctx.tgt : tgt, phase: trig });
    notes = [];
    ctx.ops.forEach((list, i) => { if (ctx.plan.faces[i] === 'X') return; list.forEach((op) => { if (op.trig === trig && condOk(op, c2)) doOp(op, c2); }); });
    flushNotes(trig === 'evade' ? '회피 성공' : trig === 'clashWin' ? '합 승리' : '', ctx.me);
  }
  function finish(ctx, res) {
    const c2 = Object.assign({}, ctx, { res, phase: 'end' });
    notes = [];
    ctx.ops.forEach((list, i) => {
      if (ctx.plan.faces[i] === 'X') return;
      list.forEach((op) => {
        if (op.trig === 'end' || (op.trig === 'kill' && res.died)) { if (condOk(op, c2)) doOp(op, c2); }
        else if (op.trig === 'turnEnd') endq.push({ c: c2, op });
      });
    });
    flushNotes(res.died ? '처치 · 종료' : '공격 종료', ctx.me);
  }
  function flushNotes(tag, who) { if (notes.length) log(`└ ✦ ${who ? `<b>${eName(who)}</b> ` : ''}${tag ? `<span class="fxk">${tag}</span> ` : ''}${notes.join(' · ')}`, 'fx'); notes = []; }

  /* ═════════════ 피해 ═════════════ */
  function mulPart(u, pt, sk) {
    if (staggered(pt)) return { m: 2, tag: 'stag' };
    const a = pt.res[sk.type] ?? 1, b = pt.sin ? pt.sin[sk.sin] ?? 1 : 1, m = a * b;
    const kn = known(u, pt); if (pt.res[sk.type] != null) kn[sk.type] = true; if (pt.sin) kn['sin:' + sk.sin] = true;
    return { m, tag: m > 1 ? 'weak' : m < 1 ? 'resist' : '' };
  }
  function mulAlly(cid, type) {
    if (staggered(T().al[cid])) return { m: 2, tag: 'stag' };
    const v = idtOf(cid).res[type] ?? 1; return { m: v, tag: v > 1 ? 'weak' : v < 1 ? 'resist' : '' };
  }
  const mulOf = (e, sk) => (e.side === 'a' ? mulAlly(e.cid, sk.type) : mulPart(e.u, e.pt, sk));
  /* 피해 계산 순서 (전투 규칙 3-5) */
  function hurt(e, raw, mul, src, o = {}) {
    if (!eAlive(e)) return { d: 0 };
    const st = ensure(e.o), k = st.k, cur = st.cur, stag = staggered(st);
    let d = stag ? raw : Math.floor(raw * mul.m); const bits = [];
    if (o.kw !== false) {
      const r = o.rupt != null ? Math.min(o.rupt, k.파열 || 0) : k.파열 || 0, v = (cur.vuln || 0) * 5, g = (cur.guard || 0) * 5;
      if (r) bits.push(`파열 ${r}`); if (v) bits.push(`취약 +${v}`); if (g) bits.push(`보호 −${g}`);
      d += r + v - g;
    }
    if (o.extra) { d += o.extra; bits.push(`추가 ${o.extra}`); }
    const sh = k.방어막 || 0; if (sh > 0 && d > 0) { const u = Math.min(sh, d); d -= u; k.방어막 = sh - u; bits.push(`방어막 −${u}`); }
    if (o.minus) d -= o.minus;
    d = Math.max(0, d);
    if (stag) d *= 2;
    if (e.side === 'e' && e.pt.def) { d -= e.pt.def; bits.push(`방어도 −${e.pt.def}`); }
    d = Math.max(0, Math.floor(d));
    if (o.kw !== false && k.파열 > 0 && (o.rupt == null || o.rupt > 0)) k.파열--;
    let stagNow = false, died = false;
    const thrOwner = e.side === 'a' ? st : e.pt;
    if (e.side === 'a') P(e.cid).hp = Math.max(0, P(e.cid).hp - d); else e.pt.hp = Math.max(0, e.pt.hp - d);
    const hp = eHp(e);
    if (!o.noStag && hp > 0 && thrOwner.thr.some((v) => hp <= v)) { thrOwner.thr = thrOwner.thr.filter((v) => hp > v); if (!stag) stagNow = true; st.stUntil = T().turn + 1; }
    log(`${src} <b>${eName(e)}</b> −${d}${bits.length ? ` <span class="dim">(${bits.join(' · ')})</span>` : ''}${stagNow ? ' <span class="st">흐트러짐!</span>' : ''}`, o.kind ? 'fx' : '');
    popDmg(eSel(e), d, o.kind || mul.tag, stagNow);
    hit(eFig(e));
    if (e.side === 'a') { if (P(e.cid).hp <= 0) { allyDie(e.cid); died = true; } }
    else {
      const u = e.u, pt = e.pt;
      if (u.winAt && pt.core && pt.hp <= u.winAt && !u.gone) { u.gone = true; log(`<b>${X.esc(u.name)}</b> 후퇴 — 목표 달성`, 'kill'); banner(`${u.name} · 후퇴`, 'win'); }
      else if (pt.hp <= 0) {
        died = true;
        if (pt.core) { u.dead = true; log(`<b>${X.esc(u.name)}</b> 쓰러짐`, 'kill'); banner(`${u.name} · DOWN`, 'down'); }
        else { pt.broken = true; log(`<b>${X.esc(u.name)}·${X.esc(pt.name)}</b> ${pt.breakable ? '파괴' : '무력화'}`, 'kill'); }
      }
    }
    return { d, stagNow, died };
  }
  function allyDie(cid) {
    const p = P(cid); if (p.dead) return; p.dead = true; p.hp = 0;
    log(`<b>${nm(cid)}</b> 사망 — 전장의 생존 아군 SP ${X.R.deathSp}`, 'kill');
    activeAllies().forEach((c) => { P(c).sp = clamp(P(c).sp + X.R.deathSp, X.R.spMin, X.R.spMax); });
    banner(`${X.CH[cid].name} · K.I.A.`, 'kia');
  }
  /* 출혈: 합을 칠 때마다 (흐트러짐은 한 대를 더 맞아야) */
  function bleed(e) {
    const n = e.o.k.출혈 || 0; if (!n || !eAlive(e)) return false;
    hurt(e, n, { m: 1, tag: '' }, '└ 출혈', { kw: false, noStag: true, kind: 'bleed' });
    e.o.k.출혈 = n <= 1 ? 0 : Math.round(n / 2);
    return true;
  }
  function spGain(e, v) {
    if (!e || eSp(e) == null || !eAlive(e)) return;
    const b0 = eSp(e); eSpAdd(e, v); const d = eSp(e) - b0;
    kwPop(e, `SP ${v > 0 ? '+' : '−'}${Math.abs(v)}${d !== v ? ' (한계)' : ''}`, v > 0 ? '#6fc093' : '#e0604e');
    return d;
  }
  /* 합 결과 SP: 이긴 쪽 +5 · 진 쪽 −5 (수비와 겨룬 경우도 같음 [가안]) */
  function clashSp(W, L) {
    spGain(W, 5); spGain(L, -5);
    const part = [W, L].filter((e) => eSp(e) != null).map((e) => `${eName(e)} ${same(e, W) ? '+5' : '−5'}`);
    if (part.length) log(`└ <span class="fxk">SP</span> 합 ${part.join(' · ')}`, 'fx');
  }
  function nearAllies(cid, w) {
    const line = activeAllies(); const i = line.indexOf(cid); const out = [];
    for (let d = 1; out.length < w - 1 && d < line.length; d++) { const side = [line[i - d], line[i + d]].filter(Boolean); if (side.length === 2 && out.length === w - 2) out.push(pickR(side)); else out.push(...side); }
    return out.slice(0, w - 1);
  }
  function nearEnemies(uid, w) {
    return shuffle(T().en.filter((u) => u.uid !== uid && !u.dead && !u.gone)).slice(0, w - 1).map((u) => ({ u, pt: pickR(u.parts.filter((p) => !p.broken && p.hp > 0)) })).filter((x) => x.pt);
  }
  /* 적중 처리: 코인 효과 → 피해 → 가중치 */
  function strike(ctx, r, tgt, src, o = {}) {
    const hp0 = hitPhase(ctx, r, tgt, true);
    const res = hurt(tgt, r.v, o.mul || mulOf(tgt, ctx.sk), src, { extra: hp0.extra, rupt: hp0.rupt, minus: o.minus || 0 });
    flushNotes('적중', ctx.me);
    const w = Number(ctx.sk.weight) || 1;
    if (w > 1 && !o.noWeight) {
      const list = ctx.me.side === 'a' ? nearEnemies(tgt.u.uid, w).map(({ u, pt }) => EE(u, pt)) : nearAllies(tgt.cid, w).map(EA);
      list.forEach((wt) => { if (!eAlive(wt)) return; const ex = hitPhase(ctx, r, wt, false); const rr = hurt(wt, r.v, mulOf(wt, ctx.sk), '└ 가중치', { extra: ex.extra, rupt: ex.rupt }); flushNotes('가중치 적중', ctx.me); if (rr.died) res.died = true; });
    }
    return res;
  }

  /* ═════════════ 화면 골격 ═════════════ */
  function render(ctx) {
    X = ctx;
    if (!B().bt || B().bt.v !== 3) initBattle();
    const b = B(), kind = b.boss ? 'BOSS' : b.abno ? 'ABNORMALITY' : 'COMBAT';
    const html = `
      <div class="bv-top">
        <div class="bv-title"><span class="label">${kind} · FLOOR ${String(X.run.floor).padStart(2, '0')}</span><h2>${X.esc(b.name)}</h2></div>
        <div class="bv-tl" id="bv-tl"></div>
        <div class="bv-meta">
          <div class="bv-turn"><span>TURN</span><b id="bv-turn">1</b></div>
          <div class="bv-sins" id="bv-sins" title="죄악 재화 — 던전이 끝날 때까지 쌓임 (+ = 이번 턴 끝에 들어올 몫)"></div>
          <div class="bv-tools">
            <button class="bv-tool" data-b="log" title="전투 기록">LOG</button>
            <button class="bv-tool" data-b="speed" title="연출 속도">${spdLabel()}</button>
            <button class="bv-tool ${SFX.on ? '' : 'off'}" data-b="sfx" title="효과음 켜기 / 끄기">${SFX.on ? '♪' : '♪̸'}</button>
            <button class="bv-tool" data-b="help" title="전투 방법">?</button>
          </div>
        </div>
      </div>
      <div class="bv-stage" id="bv-stage">
        <div class="bv-sky"></div><div class="bv-floor"></div><div class="bv-grain"></div>
        <span class="bv-corner tl"></span><span class="bv-corner tr"></span><span class="bv-corner bl"></span><span class="bv-corner br"></span>
        <span class="bv-tag l mono">[ LCB · SINNERS ]</span><span class="bv-tag r mono">[ HOSTILE · ${X.esc(b.name)} ]</span>
        <div class="bv-lantern" id="bv-lantern"></div>
        <svg class="bv-arrows" id="bv-arrows"></svg>
        <div class="bv-field" id="bv-field"></div>
        <div class="bv-ticker" id="bv-ticker"></div>
        <div class="bv-intel" id="bv-intel" hidden></div>
        <div class="bv-wish" id="bv-wish" hidden></div>
        <div class="bv-cinema" id="bv-cinema"></div>
        <div class="bv-fx" id="bv-fx"></div>
        <aside class="bv-log" id="bv-log" hidden></aside>
      </div>
      <div class="bv-dock">
        <div class="bv-hands" id="bv-hands" data-drag-scroll></div>
        <div class="bv-go">
          <div class="bv-hint" id="bv-hint"></div>
          <div class="bv-go-row">
            <button class="bv-auto" data-b="auto"><span class="mono">AUTO</span>자동 배치</button>
            <button class="bv-start" data-b="go"><span class="mono">ENGAGE</span><b>전투 개시</b><i>ENTER</i></button>
          </div>
        </div>
      </div>`;
    X.show('battle', html, (v) => {
      v.classList.add('bv');
      v.addEventListener('click', onClick);
      v.addEventListener('pointerover', onHover);
      v.addEventListener('pointerout', onHoverOut);
      paintAll();
      if (!window.__bvKey) { window.__bvKey = true; document.addEventListener('keydown', onKey); window.addEventListener('resize', () => { if (X && X.currentView() === 'battle') { fitStage(); drawArrows(); } }); }
    });
  }
  const spdLabel = () => ({ normal: '×1', fast: '×2', skip: 'SKIP' }[T().speed] || '×1');
  function onKey(e) {
    if (!X || X.currentView() !== 'battle' || busy || document.querySelector('.modal') || !$('#bv-wish')?.hidden) return;
    if (e.key === 'Enter') { e.preventDefault(); resolveTurn(); }
    if (e.key === 'Escape') { sel = null; selM = null; paintAll(); }
    const n = Number(e.key);
    if (n >= 1 && n <= 5) { const cid = B().deployed[n - 1]; if (cid && canAct(cid)) { sel = { cid, slot: T().al[cid].hand[0] }; selM = null; paintAll(); } }
  }
  function fitStage() {
    const st = $('#bv-stage'); if (!st) return;
    const fs = clamp(st.clientHeight / 560, 0.56, 1.1), fw = clamp(st.clientWidth / 1400, 0.7, 1.1);
    st.style.setProperty('--fs', Math.min(fs, fw * 1.05).toFixed(3));
  }
  function paintAll() {
    fitStage();
    paintField(); paintHands(); paintTimeline(); paintSins(); paintTicker(); paintHint(); paintLog(); paintLantern();
    const tn = $('#bv-turn'); if (tn) tn.textContent = T().turn;
    requestAnimationFrame(drawArrows);
  }

  /* ═════════════ 전장 ═════════════ */
  const ALLY_POS = [{ x: 41, y: 95, s: 1 }, { x: 27, y: 95, s: 1 }, { x: 34, y: 55, s: 0.8 }, { x: 20, y: 55, s: 0.8 }, { x: 13, y: 95, s: 1 }];
  const FOE_POS = {
    1: [{ x: 72, y: 93, s: 1.2 }],
    2: [{ x: 65, y: 95, s: 1.04 }, { x: 81, y: 95, s: 1.04 }],
    3: [{ x: 64, y: 95, s: 1 }, { x: 79, y: 95, s: 1 }, { x: 72, y: 55, s: 0.8 }],
    4: [{ x: 64, y: 95, s: 1 }, { x: 79, y: 95, s: 1 }, { x: 72, y: 55, s: 0.8 }, { x: 87, y: 55, s: 0.8 }]
  };
  function hpBar(cur, max, thr, extra = '') {
    const pct = clamp(cur / max, 0, 1) * 100;
    return `<div class="hb ${pct < 30 ? 'low' : ''}"><i style="width:${pct}%"></i><s style="width:${pct}%"></s>${thr.filter((v) => v < max).map((v) => `<em style="left:${(v / max) * 100}%"></em>`).join('')}${extra}</div>`;
  }
  const spTxt = (sp) => { const bd = band(sp); return `<span class="sp ${sp > 0 ? 'pos' : sp < 0 ? 'neg' : ''}" title="${bd ? 'SP 효과: ' + bd.t : 'SP 효과 없음'}">SP ${sp > 0 ? '+' : ''}${sp}${bd ? `<em class="${bd.c}">${bd.t}</em>` : ''}</span>`; };
  function kwChips(o, extraMg) {
    ensure(o); const out = [];
    Object.keys(KW).forEach((k) => { const v = o.k[k]; if (v > 0) out.push(`<i class="kw" style="--kc:${KW[k].c}" title="${k} ${v} — ${KW[k].d}">${k}${v}</i>`); });
    Object.keys(NX).forEach((k) => { const v = o.cur[k]; if (v > 0 && k !== 'para') out.push(`<i class="kw now" style="--kc:${NX[k].c}" title="이번 턴 ${NX[k].n} ${v}">${NX[k].n}${v}</i>`); });
    if (o.mg.haste) out.push(`<i class="kw mg" title="셰르 · 신속 ${o.mg.haste} (이번 턴)">신속${o.mg.haste}</i>`);
    if (o.mg.atk) out.push(`<i class="kw mg" title="셰르 · 공격 위력 +${o.mg.atk} (이번 턴)">위력+${o.mg.atk}</i>`);
    if (extraMg) out.push(extraMg);
    Object.keys(NX).forEach((k) => { const v = o.nx[k]; if (v > 0) out.push(`<i class="kw nx" style="--kc:${NX[k].c}" title="다음 턴 ${NX[k].n} ${v}">▸${NX[k].n}${v}</i>`); });
    return out.length ? `<div class="kws">${out.join('')}</div>` : '';
  }

  function paintField() {
    const el = $('#bv-field'); if (!el) return;
    const t = T(), b = B();
    const allies = b.deployed.map((cid, i) => {
      const p = P(cid), a = ensure(t.al[cid]), c = X.CH[cid], idt = X.IDT[p.identity], pos = ALLY_POS[i] || ALLY_POS[0];
      const pl = t.plans[cid];
      const st = p.dead ? 'dead' : staggered(a) ? 'stag' : a.panic ? 'panic' : '';
      return `<div class="fg ally ${pos.y < 70 ? 'back' : ''} ${st} ${sel && sel.cid === cid ? 'sel' : ''} ${selM && !p.dead ? 'bless' : ''}" data-fig="a:${cid}" data-ally="${cid}" style="left:${pos.x}%;top:${pos.y}%;--s:${pos.s};--cc:${X.charColor(c)};z-index:${Math.round(pos.y)}">
        <div class="fg-dice">${p.dead ? '' : `<button class="die a ${pl ? 'set' : ''} ${canAct(cid) ? '' : 'off'}" id="die-${cid}" data-adie="${cid}"><b>${a.speed}</b></button>`}</div>
        <div class="fg-body"><img src="img/fig/${idt.id}.webp" alt="" onerror="this.src='${idt.img}'"></div>
        <div class="fg-plate">
          <div class="pl-n"><b>${X.esc(c.short || c.name)}</b>${spTxt(p.sp)}</div>
          ${hpBar(p.hp, X.maxHp(cid), a.thr)}
          <div class="pl-s mono"><span>${p.hp}</span>${st === 'stag' ? '<em>흐트러짐</em>' : st === 'panic' ? '<em>패닉</em>' : st === 'dead' ? '<em>K.I.A.</em>' : ''}</div>
          ${p.dead ? '' : kwChips(a)}
        </div>
      </div>`;
    }).join('');
    const alive = t.en;
    const isMulti = alive.length === 1 && alive[0].parts.length > 1;
    const foes = alive.map((u, i) => {
      const pos = isMulti ? { x: 66, y: 72, s: 1.08 } : (FOE_POS[alive.length] || FOE_POS[4])[i];
      const st = u.dead ? 'dead' : u.gone ? 'gone' : u.parts.every((p) => staggered(p) || p.broken) ? 'stag' : '';
      const dice = isMulti ? '' : diceRow(u, u.parts[0]);
      const plate = isMulti ? '' : partPlate(u, u.parts[0], true);
      return `<div class="fg foe ${pos.y < 70 ? 'back' : ''} ${st} ${u.censor ? 'censor' : ''}" data-fig="e:${u.uid}" data-uid="${u.uid}" style="left:${pos.x}%;top:${pos.y}%;--s:${pos.s};z-index:${Math.round(pos.y)}">
        <div class="fg-dice">${dice}</div>
        <div class="fg-body ${sel && !u.dead && !u.gone && !isMulti ? 'aim' : ''}" ${isMulti ? '' : `data-part="${u.uid}|${u.parts[0].pid}"`}>${u.img ? `<img src="${u.img}" alt="">` : `<span class="fg-ph serif">${X.esc(u.name[0])}</span>`}</div>
        ${plate}
        ${u.dead || u.gone ? `<span class="fg-ko mono">${u.gone ? 'RETREAT' : 'DEFEATED'}</span>` : ''}
      </div>`;
    }).join('');
    const parts = isMulti ? `<div class="bv-parts">${alive[0].parts.map((pt) => `<div class="pp-wrap"><div class="pp-dice">${diceRow(alive[0], pt)}</div>${partPlate(alive[0], pt, false)}</div>`).join('')}</div>` : '';
    el.innerHTML = allies + foes + parts;
  }
  function diceRow(u, pt) {
    const t = T(); const acts = t.acts.filter((a) => a.uid === u.uid && a.pid === pt.pid);
    const selSk = sel ? skillOf(sel.cid, sel.slot) : null;
    return acts.map((a) => {
      const def = isDef(a.sk); const by = Object.entries(t.plans).find(([, pl]) => pl.aid === a.aid);
      let ok = false;
      if (sel && selSk && !a.done) { const sp = t.al[sel.cid].speed; ok = def ? !isDef(selSk) : (a.target === sel.cid || sp > a.speed); if (by && by[0] !== sel.cid) ok = false; }
      return `<button class="die e ${def ? 'def' : ''} ${ok ? 'ok' : ''} ${by ? 'set' : ''} ${a.done ? 'done' : ''} ${hoverAid === a.aid ? 'hov' : ''}" data-aid="${a.aid}" style="--sc:${sinC(a.sk.sin)}">
        ${def ? '<b class="gd">⛨</b>' : `<b>${a.speed}</b>`}<i>${TYPE_ICON[a.sk.type] || '•'}</i></button>`;
    }).join('');
  }
  function partPlate(u, pt, single) {
    const kn = known(u, pt);
    const res = ['참격', '관통', '타격'].map((k) => { const v = pt.res[k]; const show = kn[k]; return `<span class="rz ${show ? (v >= 2 ? 'w' : v <= 0.5 ? 's' : '') : 'q'}" title="${k}">${TYPE_ICON[k]}${show ? '×' + v : '?'}</span>`; }).join('');
    const out = pt.broken || pt.hp <= 0;
    return `<div class="fg-plate foe ${out ? 'out' : ''} ${staggered(pt) ? 'stag' : ''} ${sel && !out && !u.dead && !u.gone ? 'aim' : ''}" data-part="${u.uid}|${pt.pid}">
      <div class="pl-n"><b>${X.esc(single ? u.name : pt.name)}</b>${single ? (u.hasSp ? spTxt(u.sp) : '') : pt.core ? '<span class="core">본체</span>' : ''}</div>
      ${hpBar(pt.hp, pt.max, pt.thr, u.winAt && pt.core ? `<em class="win" style="left:${(u.winAt / pt.max) * 100}%"></em>` : '')}
      <div class="pl-s mono"><span>${Math.max(0, pt.hp)}/${pt.max}</span>${staggered(pt) ? '<em>흐트러짐</em>' : out ? `<em>${pt.breakable ? '파괴' : '무력화'}</em>` : ''}${pt.def ? `<span class="df">방어도 ${pt.def}</span>` : ''}</div>
      <div class="pl-r">${res}</div>
      ${out ? '' : kwChips(pt)}
    </div>`;
  }
  function paintLantern() {
    const el = $('#bv-lantern'); if (!el) return; const m = T().mgr, c = m.used ? MGR()[m.used] : null;
    el.className = 'bv-lantern ' + (c ? 'lit' : 'idle');
    el.style.setProperty('--fl', c ? c.flame : MGR_COLOR);
    el.innerHTML = `<img src="img/pt/no10.webp" alt=""><div><span class="mono">MANAGER · 셰르</span><b>${c ? X.esc(c.name) : '관리자 카드 대기'}</b></div>`;
  }

  /* ═════════════ 화살표 ═════════════ */
  function center(el, st, side) {
    const r = el.getBoundingClientRect();
    return { x: r.left - st.left + r.width / 2, y: r.top - st.top + (side === 'top' ? 0 : r.height / 2) };
  }
  function drawArrows() {
    const svg = $('#bv-arrows'), stage = $('#bv-stage'); if (!svg || !stage) return;
    const st = stage.getBoundingClientRect(), t = T();
    svg.setAttribute('viewBox', `0 0 ${st.width} ${st.height}`);
    const paths = [];
    const curve = (a, b, cls, lift = 0.3) => {
      const mx = (a.x + b.x) / 2, top = Math.min(a.y, b.y);
      const my = Math.max(16, top - Math.min(Math.abs(b.x - a.x) * lift, top * 0.75) - 24);
      return `<path class="${cls}" d="M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}" marker-end="url(#ah-${cls.split(' ')[0]})"/>`;
    };
    t.acts.forEach((a) => {
      if (a.done || isDef(a.sk)) return;
      const by = Object.entries(t.plans).find(([, pl]) => pl.aid === a.aid);
      const de = $(`[data-aid="${a.aid}"]`); if (!de) return;
      if (by) { const ad = $(`#die-${by[0]}`); if (!ad) return; paths.push(curve(center(ad, st), center(de, st), `clash ${hoverAid === a.aid ? 'hl' : ''}`, 0.16)); }
      else { const tg = $(`[data-fig="a:${a.target}"] .fg-body`); if (!tg) return; paths.push(curve(center(de, st), center(tg, st, 'top'), `foe ${hoverAid === a.aid ? 'hl' : ''}`, 0.24)); }
    });
    Object.entries(t.plans).forEach(([cid, pl]) => {
      if (pl.kind !== 'one') return;
      const ad = $(`#die-${cid}`), tg = $(`.fg-plate[data-part="${pl.uid}|${pl.pid}"]`) || $(`[data-fig="e:${pl.uid}"] .fg-body`);
      if (ad && tg) paths.push(curve(center(ad, st), center(tg, st, 'top'), 'one', 0.2));
    });
    svg.innerHTML = `<defs>${['foe', 'clash', 'one'].map((k) => `<marker id="ah-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="mk-${k}"/></marker>`).join('')}</defs>${paths.join('')}`;
  }

  /* ═════════════ 카드 트레이 ═════════════ */
  function pips(sk, pl) {
    return pl.faces.map((f) => `<i class="${f === 'H' ? 'h' : f === 'T' ? 't' : f === 'X' ? 'x' : ''}"></i>`).join('');
  }
  function paintHands() {
    const el = $('#bv-hands'); if (!el) return;
    const t = T(), b = B();
    el.innerHTML = mgrPanel() + b.deployed.map((cid, i) => {
      const p = P(cid), a = ensure(t.al[cid]), c = X.CH[cid], idt = X.IDT[p.identity], pl = t.plans[cid];
      const act = canAct(cid);
      const inc = t.acts.filter((x) => x.target === cid && !x.done && !isDef(x.sk)).length;
      const egs = p.dead ? [] : egosOf(cid), egoOn = egoTab.has(cid) && egs.length;
      const anyEgo = egs.some((sk) => egoCheck(cid, sk).ok);
      const cards = p.dead ? '<div class="hd-ko mono">K.I.A.</div>' : egoOn ? egs.map((sk) => egoCard(cid, sk, act, pl)).join('') : a.hand.concat(['D']).map((slot) => card(cid, slot, act, pl)).join('');
      let planTxt = act ? '카드를 고르세요' : p.dead ? '' : staggered(a) ? '흐트러짐 — 행동 불가' : '패닉 — 행동 불가';
      if (pl) {
        const egoTag = isEgo(pl.slot) ? `<b class="k ego">E.G.O.</b> ` : '';
        if (pl.kind === 'one') planTxt = `${egoTag}<b class="k one">➹ 일방</b> ${X.esc(unit(pl.uid).name)}${unit(pl.uid).parts.length > 1 ? '·' + X.esc(part(pl.uid, pl.pid).name) : ''}`;
        else { const ac = actBy(pl.aid); const w = pl.kind === 'clash' ? clashWin(cid, pl.slot, ac) : null; planTxt = `${egoTag}<b class="k ${pl.kind}">${pl.kind === 'def' ? '🛡 수비' : '⚔ 합'}</b> ${X.esc(unit(ac.uid).name)} · ${X.esc(ac.sk.name)}${w != null ? ` <span class="wr ${w >= 0.6 ? 'hi' : w <= 0.4 ? 'lo' : ''}">${Math.round(w * 100)}%</span>` : ''}`; }
      }
      const bd = band(p.sp);
      return `<div class="hd ${p.dead ? 'dead' : ''} ${sel && sel.cid === cid ? 'sel' : ''} ${act ? '' : 'off'} ${selM && !p.dead ? 'bless' : ''} ${egoOn ? 'egov' : ''}" data-hand="${cid}" style="--cc:${X.charColor(c)}">
        <div class="hd-h"><span class="hd-k mono">${i + 1}</span><img src="img/pt/${idt.id}.webp" alt=""><b>${X.esc(c.short || c.name)}</b>
          ${bd && !p.dead ? `<span class="hd-bd ${bd.c}" title="SP ${p.sp} 효과">${bd.t}</span>` : ''}
          ${inc ? `<span class="hd-inc" title="나를 노리는 적 공격">⚑${inc}</span>` : ''}
          ${egs.length ? `<button class="hd-ego ${egoOn ? 'on' : ''} ${anyEgo ? 'rdy' : ''}" data-egotab="${cid}" title="${egoOn ? '스킬 카드로 돌아가기' : anyEgo ? '사용할 수 있는 E.G.O.가 있어요' : 'E.G.O. 보기 (재화 · SP 부족)'}">${egoOn ? '스킬' : 'E.G.O.'}</button>` : ''}
          <span class="hd-spd" title="이번 턴 속도">${p.dead ? '—' : a.speed}</span></div>
        <div class="hd-cards ${egoOn ? 'ego n' + egs.length : ''}">${cards}</div>
        <div class="hd-plan ${pl ? 'on' : ''}">${planTxt}${pl ? `<button class="x" data-unplan="${cid}" title="취소">×</button>` : ''}</div>
      </div>`;
    }).join('') + (b.queue.length ? `<div class="hd-queue"><span class="label">STANDBY</span>${b.queue.map((cid, i) => `<span class="q" style="--cc:${X.charColor(X.CH[cid])}" title="${X.esc(X.CH[cid].name)} · HP ${P(cid).hp}"><img src="${X.CH[cid].sym}" alt=""><i class="mono">${i + 1}</i></span>`).join('')}</div>` : '');
  }
  function card(cid, slot, act, pl) {
    const sk = skillOf(cid, slot), plan = allyPlan(cid, sk), [lo, hi] = rangeP(sk, plan);
    const isSel = sel && sel.cid === cid && sel.slot === slot, used = pl && pl.slot === slot;
    const hasFx = fxText(sk, idtOf(cid).id, slot).some(Boolean);
    const mod = plan.bonus || plan.faces.some((f) => f && f !== null);
    return `<button class="cd ${slot === 'D' ? 'def' : ''} ${isSel ? 'sel' : ''} ${used ? 'used' : ''}" data-card="${cid}|${slot}" ${act && !busy ? '' : 'disabled'} style="--sc:${sinC(sk.sin)}">
      <span class="cd-band"><i>${slot === 'D' ? 'DEF' : 'S' + slot}</i><em>${X.esc(sk.sin)}</em></span>
      <span class="cd-ic">${TYPE_ICON[sk.type] || '•'}</span>
      <span class="cd-n">${X.esc(sk.name)}</span>
      <span class="cd-c">${pips(sk, plan)}${hasFx ? '<s title="코인 효과 있음">✦</s>' : ''}</span>
      <span class="cd-v mono ${mod ? 'mod' : ''}">${lo}<small>–</small>${hi}</span>
      <span class="cd-t mono">${sk.type}</span>
    </button>`;
  }
  function egoCard(cid, sk, act, pl) {
    const chk = egoCheck(cid, sk), plan = allyPlan(cid, sk), [lo, hi] = rangeP(sk, plan);
    const isSel = sel && sel.cid === cid && sel.slot === sk.slot, used = pl && pl.slot === sk.slot;
    const ok = act && !busy;
    const cost = Object.entries(sk.cost).map(([k, v]) => `<i style="--sc:${sinC(k)}" title="${k} ${v}">${v}</i>`).join('');
    return `<button class="cd ego ${isSel ? 'sel' : ''} ${used ? 'used' : ''} ${chk.ok || used ? 'rdy' : 'lack'}" data-card="${cid}|${sk.slot}" ${ok ? '' : 'disabled'} style="--sc:${sinC(sk.sin)}">
      <span class="cd-band"><i>${sk.grade.toUpperCase()}</i><em>${X.esc(sk.sin)}</em></span>
      <span class="cd-art"><img src="${sk.img}" alt=""></span>
      <span class="cd-n">${X.esc(sk.name)}</span>
      <span class="cd-v mono">${lo}<small>–</small>${hi}</span>
      <span class="cd-cost"><b class="mono">SP${sk.spCost}</b>${cost}</span>
      ${chk.ok || used ? '' : `<span class="cd-lack mono">${!chk.condOk ? '조건 미충족' : chk.lack.length ? '재화 부족' : 'SP 부족'}</span>`}
    </button>`;
  }
  function mgrPanel() {
    const m = T().mgr, M = MGR();
    const cards = m.hand.concat(['D']).map((slot) => {
      const c = M[slot]; const isSel = selM === slot, used = m.used === slot;
      return `<button class="cd mg ${slot === 'D' ? 'def' : ''} ${isSel ? 'sel' : ''} ${used ? 'used' : ''}" data-mcard="${slot}" ${m.used || busy ? 'disabled' : ''} style="--sc:${sinC(c.sin)};--fl:${c.flame}">
        <span class="cd-band"><i>${slot === 'D' ? 'DEF' : 'S' + slot}</i><em>${c.sin}</em></span>
        <span class="cd-ic fl">✹</span>
        <span class="cd-n">${X.esc(c.name)}</span>
        <span class="cd-c"><i></i></span>
        <span class="cd-v mono">${c.base}<small>/</small>${c.base + c.cp}</span>
        <span class="cd-t mono">관리자</span>
      </button>`;
    }).join('');
    const st = m.used ? `<b class="k mg">✹ ${X.esc(M[m.used].name)}</b> 사용 완료` : selM ? `<b class="k mg">✹ ${X.esc(M[selM].name)}</b> → 아군 선택` : '먼저 관리자 카드를 쓰세요';
    return `<div class="hd mgr ${m.used ? 'done' : 'todo'}" style="--cc:${MGR_COLOR}">
      <div class="hd-h"><span class="hd-k mono">M</span><img src="img/pt/no10.webp" alt="" class="sym"><b>셰르</b><span class="hd-tag mono">MANAGER</span></div>
      <div class="hd-cards">${cards}</div>
      <div class="hd-plan ${m.used || selM ? 'on' : ''}">${st}${selM ? '<button class="x" data-mcancel title="취소">×</button>' : ''}</div>
    </div>`;
  }

  /* ═════════════ 타임라인 · 정보 ═════════════ */
  function buildEvents() {
    const t = T(), ev = [];
    Object.entries(t.plans).forEach(([cid, pl]) => {
      const sp = t.al[cid].speed;
      if (pl.kind === 'one') ev.push({ type: 'one', cid, pl, speed: sp, ally: 1 });
      else { const a = actBy(pl.aid); ev.push({ type: pl.kind, cid, pl, aid: pl.aid, speed: Math.max(sp, a.speed), ally: 1 }); }
    });
    t.acts.forEach((a) => { if (!Object.values(t.plans).some((pl) => pl.aid === a.aid) && !isDef(a.sk)) ev.push({ type: 'enemy', aid: a.aid, speed: a.speed, ally: 0 }); });
    ev.sort((x, y) => y.speed - x.speed || y.ally - x.ally);
    return ev;
  }
  function paintTimeline() {
    const el = $('#bv-tl'); if (!el) return;
    const ev = buildEvents();
    el.innerHTML = `<span class="tl-k mono">ORDER</span>` + (ev.length ? ev.map((e, i) => {
      if (e.type === 'enemy') { const a = actBy(e.aid), u = unit(a.uid); return `<span class="tl e ${a.done ? 'done' : ''}" data-tl="${i}" style="--sc:${sinC(a.sk.sin)}" title="${X.esc(u.name)} · ${X.esc(a.sk.name)} → ${nm(a.target)}"><b>${e.speed}</b>${u.img ? `<img src="${u.img}" alt="">` : ''}</span>`; }
      const c = X.CH[e.cid];
      return `<span class="tl a ${e.type}" data-tl="${i}" style="--cc:${X.charColor(c)}" title="${X.esc(c.name)}"><b>${e.speed}</b><img src="img/pt/${idtOf(e.cid).id}.webp" alt="">${e.type === 'clash' ? '<i>⚔</i>' : e.type === 'def' ? '<i>🛡</i>' : ''}</span>`;
    }).join('<span class="tl-arr">›</span>') : '<span class="mono tiny dim">—</span>');
  }
  function paintSins() {
    const el = $('#bv-sins'); if (!el) return; const s = SINS(), p = T().tsins || {};
    el.innerHTML = X.D.SIN_ORDER.map((k) => `<span class="sn ${s[k] ? 'on' : ''} ${p[k] ? 'pend' : ''}" style="--sc:var(--sin-${k})" title="${k} ${s[k] || 0}${p[k] ? ` (+${p[k]} 이번 턴 끝)` : ''}">${s[k] || ''}${p[k] ? `<sup>+${p[k]}</sup>` : ''}</span>`).join('');
  }
  function paintTicker() {
    const el = $('#bv-ticker'); if (!el) return;
    el.innerHTML = T().log.slice(-3).map((l) => `<p class="${l.c}">${l.h}</p>`).join('');
  }
  function paintHint() {
    const el = $('#bv-hint'); if (!el) return;
    if (busy) { el.innerHTML = '<span class="mono">전투 진행 중…</span>'; return; }
    const t = T(), ready = activeAllies().filter(canAct), done = ready.filter((c) => t.plans[c]).length;
    if (selM) { const c = MGR()[selM]; el.innerHTML = `<span class="sel" style="--sc:${c.flame}"><b>셰르</b> · ${X.esc(c.name)}</span><span>버프를 줄 <b>아군</b>을 누르세요 (스탠딩 또는 카드 칸)</span>`; return; }
    if (!sel) {
      el.innerHTML = `<span class="mono">${t.mgr.used ? '✹' : '○'} 셰르 · ${done}/${ready.length} 배치</span><span>${t.mgr.used ? '카드 선택 → 적 <b>주사위</b>(합) 또는 적 <b>몸</b>(일방)' : '먼저 <b>셰르</b>의 관리자 카드를 쓰세요'}</span>`; return;
    }
    const sk = skillOf(sel.cid, sel.slot);
    el.innerHTML = `<span class="sel" style="--sc:${sinC(sk.sin)}"><b>${nm(sel.cid)}</b> · ${X.esc(sk.name)}</span><span>${isDef(sk) ? '나를 노리는 적 주사위에 연결' : '빛나는 주사위 = 합 가능 · 적 몸 = 일방 공격'}</span>`;
  }
  function paintLog() {
    const el = $('#bv-log'); if (!el || el.hidden) return;
    el.innerHTML = `<div class="lg-h"><span class="label">BATTLE LOG</span><button class="x" data-b="log">×</button></div>` + T().log.slice(-200).map((l) => `<p class="lg ${l.c}">${l.h}</p>`).join('');
    el.scrollTop = el.scrollHeight;
  }
  function log(h, c = '') { const t = T(); t.log.push({ h, c }); if (t.log.length > 400) t.log.splice(0, t.log.length - 400); }

  /* 정보창 — 가운데 위 고정 자리 (주사위 · 스탠딩을 가리지 않음) */
  function intel(html) { const box = $('#bv-intel'); if (!box) return; box.innerHTML = html; box.hidden = false; $('#bv-ticker')?.classList.add('hide'); }
  function intelOff() { const box = $('#bv-intel'); if (box) box.hidden = true; $('#bv-ticker')?.classList.remove('hide'); }
  function fxList(sk, idt, slot, plan) {
    const arr = fxText(sk, idt, slot); const n = Math.max(sk.coins | 0, arr.length); const li = [];
    for (let i = 0; i < n; i++) {
      const s = arr[i]; if (!s) continue;
      const ops = i < (sk.coins | 0) ? fxOps(sk, idt, slot)[i] : [];
      const bad = ops.some((o) => o.act === 'text') || i >= (sk.coins | 0);
      const f = plan && plan.faces[i];
      li.push(`<li class="${bad ? 'na' : ''} ${f === 'X' ? 'gone' : ''}"><i>${i < (sk.coins | 0) ? i + 1 : '·'}</i><span>${X.esc(s)}${bad ? ' <em>미적용</em>' : ''}${f === 'X' ? ' <em>마비로 소멸</em>' : ''}</span></li>`);
    }
    return li.length ? `<ul class="fo-fx">${li.join('')}</ul>` : '';
  }
  function planLine(sk, pl) {
    const t = [];
    const h = pl.faces.filter((f) => f === 'H').length, tl = pl.faces.filter((f) => f === 'T').length, x = pl.faces.filter((f) => f === 'X').length;
    if (h) t.push(`<span class="pos">앞면 고정 ${h}</span>`); if (tl) t.push(`<span class="neg">뒷면 고정 ${tl}</span>`); if (x) t.push(`<span class="neg">코인 소멸 ${x}</span>`);
    if (pl.bonus) t.push(`<span class="${pl.bonus > 0 ? 'pos' : 'neg'}">위력 ${pl.bonus > 0 ? '+' : ''}${pl.bonus}</span>`);
    return t.length ? `<div class="fo-pl">${t.join(' · ')}</div>` : '';
  }
  function showFore(a) {
    const u = unit(a.uid), pt = part(a.uid, a.pid), ePl = actPlan(a), [elo, ehi] = rangeP(a.sk, ePl);
    let body = `<div class="fo-h" style="--sc:${sinC(a.sk.sin)}"><span>${X.esc(u.name)}${u.parts.length > 1 ? ' · ' + X.esc(pt.name) : ''}</span><b>${X.esc(a.sk.name)}</b><span>${TYPE_ICON[a.sk.type] || ''} ${a.sk.type} · ${X.esc(a.sk.sin)} · 코인 ${a.sk.coins}${Number(a.sk.weight) > 1 ? ' · 가중치 ' + a.sk.weight : ''}</span></div>
      <div class="fo-r mono">${isDef(a.sk) ? '수비' : `속도 ${a.speed} · 대상 ${nm(a.target)}`} · 위력 ${elo}–${ehi}</div>${planLine(a.sk, ePl)}`;
    if (isDef(a.sk)) body += `<div class="fo-k">이 적을 공격하면 이 수비로 받아냅니다</div>`;
    if (sel && !isDef(a.sk)) {
      const sk = skillOf(sel.cid, sel.slot), pl = allyPlan(sel.cid, sk), [lo, hi] = rangeP(sk, pl);
      const can = a.target === sel.cid || T().al[sel.cid].speed > a.speed;
      if (isDef(sk)) body += `<div class="fo-k">${nm(sel.cid)} · ${sk.type} 수비로 받아냄 (${lo}–${hi})</div>`;
      else {
        const wr = winRate(distP(sk, pl), distP(a.sk, ePl));
        body += `<div class="fo-vs"><span>${nm(sel.cid)} <b>${lo}–${hi}</b></span><i>VS</i><span><b>${elo}–${ehi}</b></span></div>
          <div class="fo-w"><div class="bar"><i style="width:${wr * 100}%"></i></div><b class="${wr >= 0.6 ? 'hi' : wr <= 0.4 ? 'lo' : ''}">합 승률 ${Math.round(wr * 100)}%</b></div>`;
      }
      if (!can && !isDef(sk)) body += `<div class="fo-no">속도가 느려 가로챌 수 없음 (${T().al[sel.cid].speed} ≤ ${a.speed})</div>`;
    }
    body += fxList(a.sk, null, null, ePl);
    intel(body);
  }
  function showForePart(uid, pid) {
    const u = unit(uid), pt = part(uid, pid);
    if (!sel || u.dead || u.gone) return showInspect(uid);
    const sk = skillOf(sel.cid, sel.slot); if (isDef(sk)) return showInspect(uid);
    const kn = known(u, pt), pl = allyPlan(sel.cid, sk), [lo, hi] = rangeP(sk, pl);
    const m = staggered(pt) ? 1 : (kn[sk.type] ? pt.res[sk.type] : 1) * (pt.sin && kn['sin:' + sk.sin] ? pt.sin[sk.sin] : 1);
    const k = ensure(pt).k, cur = pt.cur;
    const add = (k.파열 || 0) + (cur.vuln || 0) * 5 - (cur.guard || 0) * 5;
    const dmg = (v) => Math.max(0, Math.floor((Math.max(0, Math.floor(v * m) + add)) * (staggered(pt) ? 2 : 1)) - (pt.def || 0));
    const guard = T().acts.find((x) => x.uid === uid && x.pid === pid && isDef(x.sk) && !x.done);
    intel(`<div class="fo-h" style="--sc:${sinC(sk.sin)}"><span>${nm(sel.cid)} → ${X.esc(u.name)}${u.parts.length > 1 ? ' · ' + X.esc(pt.name) : ''}</span><b>➹ 일방 공격 · ${X.esc(sk.name)}</b><span>${TYPE_ICON[sk.type]} ${sk.type} · ${X.esc(sk.sin)}</span></div>
      <div class="fo-r mono">예상 피해 ${dmg(lo)}–${dmg(hi)}${kn[sk.type] ? '' : ' · 내성 미확인'}${staggered(pt) ? ' · 흐트러짐 ×2' : ''}${add ? ` · 키워드 ${add > 0 ? '+' : ''}${add}` : ''}</div>${planLine(sk, pl)}
      ${guard ? `<div class="fo-k">⛨ 적이 ${X.esc(guard.sk.name)}(${guard.sk.type})로 받아냄</div>` : ''}${fxList(sk, idtOf(sel.cid).id, sel.slot, pl)}`);
  }
  function showInspect(uid) {
    const u = uid && unit(uid); if (!u) return;
    intel(`<div class="in-h"><span class="mono">${X.esc(u.title || '')}</span><b class="serif">${X.esc(u.name)}</b>${u.hasSp ? `<span class="mono">SP ${u.sp}${band(u.sp) ? ' · ' + band(u.sp).t : ''}</span>` : ''}</div>
      ${u.parts.map((pt) => { const kn = known(u, pt); return `<div class="in-p"><div class="in-pn">${X.esc(pt.name)} <span class="mono">${Math.max(0, pt.hp)}/${pt.max} · 슬롯 ${pt.slots}${pt.def ? ' · 방어도 ' + pt.def : ''}</span></div>
        <div class="in-r">${['참격', '관통', '타격'].map((k) => `<span class="${kn[k] ? (pt.res[k] >= 2 ? 'w' : pt.res[k] <= 0.5 ? 's' : '') : 'q'}">${k} ${kn[k] ? '×' + pt.res[k] : '?'}</span>`).join('')}</div>
        ${pt.sin ? `<div class="in-r sin">${X.D.SIN_ORDER.map((s) => `<span class="${kn['sin:' + s] ? (pt.sin[s] >= 2 ? 'w' : pt.sin[s] <= 0.5 ? 's' : '') : 'q'}" style="--sc:var(--sin-${s})">${s} ${kn['sin:' + s] ? '×' + pt.sin[s] : '?'}</span>`).join('')}</div>` : ''}${kwChips(pt)}</div>`; }).join('')}
      ${u.passives ? `<div class="in-ps">${u.passives.map((p) => `<p><b>${X.esc(p.name)}</b> ${X.esc(p.fx)}</p>`).join('')}</div>` : ''}
      <div class="in-n mono">내성은 그 유형 · 죄악으로 공격하면 공개됩니다</div>`);
  }
  function showCard(cid, slot) {
    const sk = skillOf(cid, slot), pl = allyPlan(cid, sk), [lo, hi] = rangeP(sk, pl);
    if (sk.ego) {
      const chk = egoCheck(cid, sk), S = SINS(), rs = egoReserved(cid);
      const cost = Object.entries(sk.cost).map(([k, v]) => { const have = (S[k] || 0) - (rs[k] || 0); return `<span class="${have >= v ? 'ok' : 'no'}" style="--sc:${sinC(k)}">${k} ${v}<small>/${Math.max(0, have)}</small></span>`; }).join('');
      return intel(`<div class="fo-h ego" style="--sc:${sinC(sk.sin)}"><span>${nm(cid)} · E.G.O. ${sk.grade}</span><b>${X.esc(sk.name)}${sk.sub ? ` <small>${X.esc(sk.sub)}</small>` : ''}</b><span>${TYPE_ICON[sk.type] || ''} ${sk.type} · ${X.esc(sk.sin)} · 코인 ${sk.coins} (+${sk.cp})${Number(sk.weight) > 1 ? ' · 가중치 ' + sk.weight : ''}</span></div>
        <div class="fo-r mono">위력 ${lo}–${hi} <span class="dim">(기본 ${sk.base})</span></div>${planLine(sk, pl)}
        <div class="fo-cost"><b class="${chk.spOk ? 'ok' : 'no'}">SP ${sk.spCost}<small>/${P(cid).sp}</small></b>${cost}</div>
        ${sk.cond ? `<div class="fo-k ${chk.condOk ? '' : 'no'}">사용 조건: ${X.esc(sk.cond)}</div>` : ''}
        ${chk.ok ? '<div class="fo-k">사용 가능 — 쓰면 SP · 재화가 빠지고, 손패는 그대로 남아요</div>' : `<div class="fo-no">${chk.why.filter((w) => !w.startsWith('조건')).concat(chk.condOk ? [] : ['조건을 아직 채우지 못했어요']).join('<br>')}</div>`}
        ${fxList(sk, null, null, pl)}`);
    }
    intel(`<div class="fo-h" style="--sc:${sinC(sk.sin)}"><span>${nm(cid)} · ${slot === 'D' ? '수비' : slot + '스킬'}</span><b>${X.esc(sk.name)}</b><span>${TYPE_ICON[sk.type] || ''} ${sk.type} · ${X.esc(sk.sin)} · 코인 ${sk.coins} (${sk.cp >= 0 ? '+' : ''}${sk.cp})${Number(sk.weight) > 1 ? ' · 가중치 ' + sk.weight : ''}</span></div>
      <div class="fo-r mono">위력 ${lo}–${hi} <span class="dim">(기본 ${sk.base})</span></div>${planLine(sk, pl)}${fxList(sk, idtOf(cid).id, slot, pl) || '<div class="fo-n">코인 효과 없음</div>'}`);
  }
  function showAlly(cid) {
    const p = P(cid), a = ensure(T().al[cid]), idt = idtOf(cid), bd = band(p.sp);
    intel(`<div class="in-h"><span class="mono">${X.esc(idt.name)}</span><b class="serif">${X.esc(X.CH[cid].name)}</b><span class="mono">HP ${p.hp}/${X.maxHp(cid)} · SP ${p.sp}${bd ? ' · ' + bd.t : ''} · 속도 ${a.speed}</span></div>
      <div class="in-r">${['참격', '관통', '타격'].map((k) => `<span class="${idt.res[k] >= 2 ? 'w' : idt.res[k] <= 0.5 ? 's' : ''}">${k} ×${idt.res[k]}</span>`).join('')}</div>
      ${kwChips(a) || '<div class="fo-n">키워드 없음</div>'}`);
  }
  function showMgr(slot) {
    const c = MGR()[slot];
    intel(`<div class="fo-h" style="--sc:${c.flame}"><span>관리자 셰르 · ${slot === 'D' ? '수비' : slot + '스킬'}</span><b>${X.esc(c.full)}</b><span>${X.esc(c.sin)} · 코인 1 · 최종값 ${c.base} / ${c.base + c.cp}</span></div>
      <div class="fo-r">${X.esc(c.desc)}</div><div class="fo-n">${X.esc(c.note)}</div><div class="fo-n">셰르는 합을 겨루지 않고, 준 버프는 이번 턴에만 유지됩니다.</div>`);
  }
  function onHover(e) {
    if (busy) return;
    const d = e.target.closest('[data-aid]'), pt = e.target.closest('[data-part]'), fg = e.target.closest('[data-fig^="e:"]');
    const cd = e.target.closest('[data-card]'), mc = e.target.closest('[data-mcard]'), fa = e.target.closest('[data-fig^="a:"]');
    if (d) { if (hoverAid !== d.dataset.aid) { hoverAid = d.dataset.aid; drawArrows(); } showFore(actBy(d.dataset.aid)); return; }
    if (cd && cd.classList.contains('lack')) { const [cid, slot] = cd.dataset.card.split('|'); const chk = egoCheck(cid, skillOf(cid, slot)); X.toast(`${skillOf(cid, slot).name} — ${chk.why.join(' · ')}`, 'warn'); showCard(cid, slot); return; }
    if (cd) { const [cid, slot] = cd.dataset.card.split('|'); showCard(cid, slot); return; }
    if (mc) { showMgr(mc.dataset.mcard); return; }
    if (pt) { const [uid, pid] = pt.dataset.part.split('|'); showForePart(uid, pid); return; }
    if (fg) { showInspect(fg.dataset.uid); return; }
    if (fa) { showAlly(fa.dataset.ally); }
  }
  function onHoverOut(e) {
    if (e.target.closest('[data-aid]') && !e.relatedTarget?.closest?.('[data-aid]')) { hoverAid = null; drawArrows(); }
    if (!e.relatedTarget?.closest?.('[data-aid],[data-part],[data-fig],[data-card],[data-mcard]')) intelOff();
  }

  /* ═════════════ 입력 ═════════════ */
  function onClick(e) {
    const btn = e.target.closest('[data-b]');
    if (btn) {
      const k = btn.dataset.b;
      if (k === 'log') { const l = $('#bv-log'); l.hidden = !l.hidden; paintLog(); return; }
      if (k === 'speed') { const order = ['normal', 'fast', 'skip']; T().speed = order[(order.indexOf(T().speed) + 1) % 3]; btn.textContent = spdLabel(); X.save(); return; }
      if (k === 'help') return help();
      if (k === 'sfx') { SFX.toggle(); btn.classList.toggle('off', !SFX.on); btn.textContent = SFX.on ? '♪' : '♪̸'; return; }
      if (busy) return;
      if (k === 'go') resolveTurn();
      if (k === 'auto') { autoPlan(); paintAll(); }
      return;
    }
    if (busy) return;
    if (e.target.closest('[data-mcancel]')) { selM = null; paintAll(); return; }
    const mc = e.target.closest('[data-mcard]');
    if (mc) { const slot = mc.dataset.mcard; if (T().mgr.used) return; sel = null; if (!MGR()[slot].need) { selM = null; useMgr(slot, null); return; } selM = selM === slot ? null : slot; paintAll(); return; }
    if (selM) {
      const tg = e.target.closest('[data-ally],[data-hand]');
      if (tg) { const cid = tg.dataset.ally || tg.dataset.hand; if (!P(cid).dead) { const slot = selM; selM = null; useMgr(slot, cid); } return; }
    }
    const et = e.target.closest('[data-egotab]'); if (et) { const c = et.dataset.egotab; if (egoTab.has(c)) egoTab.delete(c); else egoTab.add(c); if (sel && sel.cid === c) sel = null; sfx('ui'); paintHands(); return; }
    const un = e.target.closest('[data-unplan]'); if (un) { delete T().plans[un.dataset.unplan]; X.save(); paintAll(); return; }
    const cd = e.target.closest('[data-card]');
    if (cd && cd.classList.contains('lack')) { const [cid, slot] = cd.dataset.card.split('|'); const chk = egoCheck(cid, skillOf(cid, slot)); X.toast(`${skillOf(cid, slot).name} — ${chk.why.join(' · ')}`, 'warn'); showCard(cid, slot); return; }
    if (cd) { const [cid, slot] = cd.dataset.card.split('|'); sel = sel && sel.cid === cid && sel.slot === slot ? null : { cid, slot }; selM = null; sfx('ui'); paintAll(); return; }
    const ad = e.target.closest('[data-adie]');
    if (ad) { const cid = ad.dataset.adie; if (canAct(cid)) { sel = sel && sel.cid === cid ? null : { cid, slot: (T().plans[cid] || {}).slot || T().al[cid].hand[0] }; paintAll(); } return; }
    const chip = e.target.closest('[data-aid]');
    if (chip && sel) { assignAct(chip.dataset.aid); return; }
    const pt = e.target.closest('[data-part]');
    if (pt && sel) { const [uid, pid] = pt.dataset.part.split('|'); assignPart(uid, pid); return; }
    const fa = e.target.closest('[data-fig^="a:"]');
    if (fa) { const cid = fa.dataset.ally; if (canAct(cid)) { sel = { cid, slot: T().al[cid].hand[0] }; paintAll(); } }
  }
  function assignAct(aid) {
    const t = T(), a = actBy(aid), sk = skillOf(sel.cid, sel.slot), sp = t.al[sel.cid].speed;
    if (isDef(a.sk)) { if (isDef(sk)) return X.toast('적의 수비에는 공격 카드로만 들어갈 수 있어요.', 'warn'); return assignPart(a.uid, a.pid); }
    if (!(a.target === sel.cid || sp > a.speed)) return X.toast(`가로채려면 속도가 더 빨라야 해요 (${sp} ≤ ${a.speed})`, 'warn');
    const other = Object.entries(t.plans).find(([c, pl]) => pl.aid === aid && c !== sel.cid); if (other) delete t.plans[other[0]];
    t.plans[sel.cid] = { slot: sel.slot, kind: isDef(sk) ? 'def' : 'clash', aid };
    sel = null; X.save(); paintAll();
  }
  function assignPart(uid, pid) {
    const u = unit(uid), pt = part(uid, pid), sk = skillOf(sel.cid, sel.slot);
    if (u.dead || u.gone || pt.broken || pt.hp <= 0) return X.toast('이미 쓰러진 대상이에요.', 'warn');
    if (isDef(sk)) return X.toast('수비 카드는 나를 노리는 적 주사위에 연결해 주세요.', 'warn');
    T().plans[sel.cid] = { slot: sel.slot, kind: 'one', uid, pid };
    sel = null; X.save(); paintAll();
  }
  function autoPlan() {
    const t = T();
    activeAllies().filter(canAct).forEach((cid) => {
      if (t.plans[cid]) return;
      const a = t.al[cid];
      const mine = t.acts.filter((x) => x.target === cid && !isDef(x.sk) && !x.done && !Object.values(t.plans).some((pl) => pl.aid === x.aid));
      if (mine.length) {
        const ac = mine[0];
        const best = a.hand.map((s) => ({ s, w: clashWin(cid, s, ac) })).sort((x, y) => y.w - x.w)[0];
        t.plans[cid] = { slot: best.s, kind: 'clash', aid: ac.aid }; return;
      }
      const best = a.hand.map((s) => { const sk = skillOf(cid, s), r = rangeP(sk, allyPlan(cid, sk)); return { s, v: (r[0] + r[1]) / 2 }; }).sort((x, y) => y.v - x.v)[0];
      const tg = pickR(t.en.filter((u) => !u.dead && !u.gone).flatMap((u) => u.parts.filter((p) => !p.broken && p.hp > 0).map((p) => ({ uid: u.uid, pid: p.pid }))));
      if (tg) t.plans[cid] = { slot: best.s, kind: 'one', uid: tg.uid, pid: tg.pid };
    });
    X.save();
  }
  function help() {
    X.modal({ label: 'HOW TO FIGHT', title: '전투 방법', wide: true, body: `<div class="bx-help">
      <p><b>⓪ 관리자 셰르</b> — 매 턴 가장 먼저, 왼쪽 아래 <b style="color:${MGR_COLOR}">셰르</b> 칸에서 카드 1장을 씁니다. 안내(신속) · 위협(위력) · 소망(보호막/호흡/신속/재화) · 불씨 살리기(SP). 카드를 고른 뒤 버프를 줄 아군을 누르세요. 효과는 이번 턴에 바로 적용되고 턴이 끝나면 사라져요.</p>
      <p><b>① 카드 고르기</b> — 수감자 칸에서 카드를 누르세요. 한 턴에 1장 (숫자키 1~5로 수감자 선택). 카드에 마우스를 올리면 가운데 위 <b>정보창</b>에 코인 효과가 나와요.</p>
      <p><b>② 연결하기</b> — 적 머리 위 <b>주사위</b> = 합, 적 <b>몸</b>/명판 = 일방 공격. 나를 노린 주사위는 언제든, 동료를 노린 주사위는 <b>내 속도가 더 빠를 때만</b> 가로챌 수 있어요. ⛨ 주사위는 적의 수비예요.</p>
      <p><b>①-2 E.G.O.</b> — 수감자 칸 머리의 <b>E.G.O.</b> 버튼을 누르면 장착한 E.G.O.가 나와요. 모아 둔 <b>죄악 재화 + SP</b>를 내고 스킬 대신 씁니다 (손패는 그대로). 재화 · SP · 조건이 모자라면 흐리게 표시돼요. 버튼이 금색으로 빛나면 지금 쓸 수 있는 E.G.O.가 있다는 뜻이에요.</p>
      <p><b>③ 키워드</b> — 출혈(합마다 피해) · 화상(턴 종료 피해) · 파열(피격 시 추가 피해) · 진동(폭발 시 흐트러짐 앞당김) · 침잠(뒷면 고정 + SP 감소) · 호흡(앞면 고정) · 충전 · 마비(코인 소멸). 명판 아래 칩으로 보여요. <b>▸</b>가 붙은 칩은 다음 턴에 적용돼요.</p>
      <p><b>④ SP 효과</b> — +15 신속 1 · +30 코인 1개 앞면 고정 · +45 위력 +3 / −15 속박 1 · −30 코인 1개 뒷면 고정 · −45 패닉. 명판 SP 옆에 표시되고 승률 계산에도 들어가요.</p>
      <p><b>⑤ 화살표</b> — <span style="color:#d65a4a">빨강</span> = 적의 공격 · <span style="color:#d8b25a">금색</span> = 합 · <span style="color:#5ab4d8">파랑</span> = 내 일방 공격. 전투 개시(Enter)를 누르면 위쪽 <b>ORDER</b> 순서대로 진행돼요.</p>
      <p class="dim small">공명 · 에고 기프트는 2-3 단계, 적 고유 기믹은 2-4 단계에서 적용됩니다. 정보창에 '미적용'으로 표시된 효과도 그때 함께 들어가요.</p></div>`,
      buttons: [{ label: '알겠어요', value: true, cls: 'primary' }] });
  }

  /* ═════════════ 관리자 셰르 ═════════════ */
  async function useMgr(slot, cid) {
    const t = T(), m = t.mgr, c = MGR()[slot]; if (m.used || busy) return;
    busy = true; paintAll(); intelOff(); sfx('flame');
    const head = Math.random() < 0.5;
    const r = { coins: [head], fixed: [null], v: c.base + (head ? c.cp : 0), base: c.base, cp: c.cp };
    await cinemaOne({ name: '셰르 · 관리자', img: 'img/pt/no10.webp', sk: { name: c.full, sin: c.sin, type: '관리자' }, color: c.flame, mgr: true }, r, 'l', cid ? `→ ${nm(cid)}` : 'LANTERN');
    const lines = [];
    if (slot === '1') { const a = ensure(t.al[cid]); const n = head ? 2 : 1; a.mg.haste = (a.mg.haste || 0) + n; a.speed += n; lines.push(`신속 ${n} → ${nm(cid)} (속도 ${a.speed})`); kwPop(EA(cid), `신속 +${n}`, c.flame); }
    if (slot === '2') { const a = ensure(t.al[cid]); const n = head ? 2 : 1; a.mg.atk = (a.mg.atk || 0) + n; lines.push(`공격 위력 +${n} → ${nm(cid)}`); kwPop(EA(cid), `위력 +${n}`, c.flame); }
    if (slot === 'D') { const tm = activeAllies(); const lo = Math.min(...tm.map((x) => P(x).sp)); const tg = pickR(tm.filter((x) => P(x).sp === lo)); if (tg) { eSpAdd(EA(tg), 5); lines.push(`SP +5 → ${nm(tg)}`); kwPop(EA(tg), 'SP +5', c.flame); cid = tg; } }
    if (slot === '3') { const picks = await wishPicker(head ? 2 : 1, cid, r.v); picks.forEach((w) => lines.push(w)); }
    m.used = slot; if (slot !== 'D') { const i = m.hand.indexOf(slot); if (i >= 0) m.hand.splice(i, 1); }
    addSin(c.sin);
    log(`✹ <b>셰르</b> ${X.esc(c.full)} ${head ? '<span class="cz">●</span> 앞면' : '<span class="cz">○</span> 뒷면'} — ${lines.join(' · ')}`, 'mgr');
    if (cid) { const f = $(`[data-fig="a:${cid}"]`); f?.classList.add('blessed'); setTimeout(() => f?.classList.remove('blessed'), 1200); }
    busy = false; X.save(); paintAll();
  }
  function wishPicker(n, cid, val) {
    return new Promise((resolve) => {
      const box = $('#bv-wish'); const out = []; let left = n, tgt = cid;
      const W = [
        { k: 'shield', t: '보호막 생성', d: `최종값만큼 방어막 ${val}` },
        { k: 'breath', t: '호흡 5', d: '첫 코인 앞면 고정' },
        { k: 'haste', t: '신속 2', d: '이번 턴 속도 +2' },
        { k: 'x2', t: 'E.G.O. 자원 +1', d: '이번 턴 스킬당 재화 +1 (전체)' }
      ];
      const draw = () => {
        box.innerHTML = `<div class="ws-h"><span class="mono">ORIGIN FLAME · 소망 ${n - left + 1}/${n}</span><b class="serif">원초의 불꽃 — 소망을 고르세요</b></div>
          <div class="ws-allies">${activeAllies().map((c) => `<button class="ws-a ${c === tgt ? 'on' : ''}" data-wa="${c}" style="--cc:${X.charColor(X.CH[c])}"><img src="img/pt/${idtOf(c).id}.webp" alt=""><span>${nm(c)}</span></button>`).join('')}</div>
          <div class="ws-list">${W.map((w) => `<button class="ws-w" data-ww="${w.k}"><b>${w.t}</b><span>${w.d}</span></button>`).join('')}</div>
          ${out.length ? `<div class="ws-done mono">${out.map((x) => '✹ ' + x).join('  ')}</div>` : ''}`;
      };
      const onC = (e) => {
        const a = e.target.closest('[data-wa]'); if (a) { tgt = a.dataset.wa; draw(); return; }
        const w = e.target.closest('[data-ww]'); if (!w) return;
        const k = w.dataset.ww, s = ensure(T().al[tgt]), en = EA(tgt);
        if (k === 'shield') { s.k.방어막 = (s.k.방어막 || 0) + val; out.push(`방어막 ${val} → ${nm(tgt)}`); kwPop(en, `방어막 +${val}`, MGR_COLOR); }
        if (k === 'breath') { s.k.호흡 = Math.min(20, (s.k.호흡 || 0) + 5); s.mg.breath = (s.mg.breath || 0) + 5; out.push(`호흡 5 → ${nm(tgt)}`); kwPop(en, '호흡 +5', MGR_COLOR); }
        if (k === 'haste') { s.mg.haste = (s.mg.haste || 0) + 2; s.speed += 2; out.push(`신속 2 → ${nm(tgt)} (속도 ${s.speed})`); kwPop(en, '신속 +2', MGR_COLOR); }
        if (k === 'x2') { T().mgr.x2 = (T().mgr.x2 || 0) + 1; out.push('재화 획득 +1 (아군 전체)'); }
        paintField(); requestAnimationFrame(drawArrows);
        left--; if (left > 0) { draw(); return; }
        box.removeEventListener('click', onC); box.hidden = true; resolve(out);
      };
      box.addEventListener('click', onC); draw(); box.hidden = false;
    });
  }

  /* ═════════════ 연출 ═════════════ */
  function figPos(selector) {
    const st = $('#bv-stage'), el = $(selector); if (!st || !el) return null;
    const s = st.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - s.left + r.width / 2, y: r.top - s.top + Math.min(r.height * 0.25, 60) };
  }
  function popDmg(selector, dmg, tag, stag) {
    const fx = $('#bv-fx'), p = figPos(selector); if (!fx || !p) return;
    const n = document.createElement('div');
    n.className = `dmg ${tag || ''} ${dmg === 0 ? 'zero' : ''}`;
    const lab = { weak: '약점', resist: '내성', stag: '×2', bleed: '출혈', burn: '화상', sink: '침잠' }[tag];
    n.innerHTML = `<b>${dmg}</b>${lab ? `<i>${lab}</i>` : ''}${stag ? '<em>흐트러짐!</em>' : ''}`;
    n.style.left = p.x + (Math.random() * 30 - 15) + 'px'; n.style.top = p.y + 'px';
    fx.append(n); setTimeout(() => n.remove(), 1500);
    if (dmg > 0) sfx('hit', dmg >= 25 || tag === 'weak' || stag);
  }
  const popStack = new Map();
  function kwPop(e, txt, color) {
    const fx = $('#bv-fx'), sel2 = eSel(e), p = figPos(sel2); if (!fx || !p) return;
    const now = Date.now(), s = popStack.get(sel2) || { t: 0, i: 0 }; const i = now - s.t < 900 ? s.i + 1 : 0; popStack.set(sel2, { t: now, i });
    const n = document.createElement('div'); n.className = 'kwp'; n.style.setProperty('--kc', color || '#c9a45c');
    n.textContent = txt; n.style.left = p.x + 'px'; n.style.top = p.y + 34 + i * 20 + 'px'; if (i === 0) sfx('kw');
    fx.append(n); setTimeout(() => n.remove(), 1500);
  }
  function hit(selector) { const el = $(selector); if (!el) return; el.classList.remove('hurt'); void el.offsetWidth; el.classList.add('hurt'); shake(); }
  function shake() { const st = $('#bv-stage'); if (!st || SKIP()) return; st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake'); }
  function lunge(selector, dir) { const el = $(selector); if (!el || SKIP()) return; el.classList.remove('lunge-r', 'lunge-l'); void el.offsetWidth; el.classList.add('lunge-' + dir); }
  function banner(txt, kind, dur = 1600) {
    const fx = $('#bv-fx'); if (!fx) return;
    const n = document.createElement('div'); n.className = 'bnr ' + kind; n.innerHTML = `<span>${X.esc(txt)}</span>`;
    n.style.animationDuration = dur + 'ms';
    fx.append(n); setTimeout(() => n.remove(), dur);
  }
  function popTxt(selector, txt) {
    const fx = $('#bv-fx'), p = figPos(selector); if (!fx || !p) return;
    const n = document.createElement('div'); n.className = 'dmg txt'; n.innerHTML = `<b>${txt}</b>`;
    n.style.left = p.x + 'px'; n.style.top = p.y + 'px'; fx.append(n); setTimeout(() => n.remove(), 1300);
  }
  /* E.G.O. 컷인 — 카드가 휘리릭 돌며 날아들어 오는 궁극기 연출 */
  async function egoCut(cid, sk) {
    if (SKIP()) return;
    const st = $('#bv-stage'); if (!st) return; const k = K();
    const c = X.CH[cid], el = document.createElement('div');
    el.className = 'eg-cut'; el.style.setProperty('--sc', sinC(sk.sin)); el.style.setProperty('--cc', X.charColor(c)); el.style.setProperty('--k', k);
    el.innerHTML = `<div class="eg-bg"></div><div class="eg-rays"></div><div class="eg-band"></div><div class="eg-band b2"></div>
      <div class="eg-card"><div class="eg-face"><img src="${sk.img}" alt=""><i class="eg-shine"></i><span class="eg-tag mono">${sk.grade.toUpperCase()}</span></div><div class="eg-back"><b>E.G.O.</b></div></div>
      <div class="eg-txt"><span class="eg-grade mono">E.G.O. · ${sk.grade.toUpperCase()} · ${X.esc(sk.sin)}</span><b class="eg-name serif">${X.esc(sk.name)}</b>${sk.sub ? `<em class="eg-sub serif">${X.esc(sk.sub)}</em>` : ''}<span class="eg-who">${X.esc(c.name)}</span></div>
      <div class="eg-flash"></div>`;
    st.append(el);
    sfx('egoIn'); setTimeout(() => sfx('ego'), 520 * k);
    await wait(1900 * k);
    el.classList.add('out'); await wait(260 * k); el.remove();
  }
  function coinEl(c, f) {
    if (c === null) return '<span class="coin gone" title="마비로 소멸"><i class="cf cf-x"></i></span>';
    return `<span class="coin ${f === 'H' || f === 'T' ? 'lock' : ''}" data-h="${c ? 1 : 0}"><i class="cf cf-h"></i><i class="cf cf-t"></i></span>`;
  }
  async function flipCoins(row, r, valEl) {
    row.innerHTML = r.coins.map((c, i) => coinEl(c, r.fixed[i])).join('');
    const els = $$('.coin', row); const k = K();
    let v = r.base; valEl.textContent = Math.max(0, v);
    for (let i = 0; i < els.length; i++) {
      const h = r.coins[i]; if (h === null) continue;
      const lock = r.fixed[i] === 'H' || r.fixed[i] === 'T';
      const turns = lock ? 1 : 3 + Math.floor(Math.random() * 2);
      els[i].animate([
        { transform: 'perspective(260px) translateY(0) rotateY(0deg) scale(1)' },
        { transform: `perspective(260px) translateY(${lock ? -10 : -26}px) rotateY(${turns * 180}deg) scale(1.2)`, offset: 0.55 },
        { transform: `perspective(260px) translateY(0) rotateY(${turns * 360 + (h ? 0 : 180)}deg) scale(1)` }
      ], { duration: (lock ? 360 : 520) * k, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
      sfx(lock ? 'lock' : 'flip');
      await wait(170 * k);
      setTimeout(() => {
        els[i].classList.add(h ? 'is-h' : 'is-t'); sfx('land', h);
        if (h) { v += r.cp; valEl.textContent = Math.max(0, v); valEl.classList.remove('pop'); void valEl.offsetWidth; valEl.classList.add('pop'); }
      }, (lock ? 220 : 360) * k);
    }
    await wait(420 * k);
  }
  function side(info, cls) {
    return `<div class="cn-side ${cls} ${info.mgr ? 'mgr' : ''} ${info.ego ? 'ego' : ''}" style="--sc:${info.mgr ? info.color : sinC(info.sk.sin)};--cc:${info.color || 'var(--brass)'}">
      <div class="cn-img ${info.censor ? 'censor' : ''}">${info.img ? `<img src="${info.img}" alt="">` : ''}</div>
      <div class="cn-info"><span class="cn-who">${X.esc(info.name)}</span><b class="cn-sk">${X.esc(info.sk.name)}</b><span class="cn-ty mono">${TYPE_ICON[info.sk.type] || '✹'} ${info.sk.type} · ${X.esc(info.sk.sin)}</span>
        <div class="cn-coins"></div></div><div class="cn-val">0</div>
    </div>`;
  }
  async function cinemaClash(L, R, rounds, winSide, dmgRoll, mode) {
    if (SKIP()) return;
    const box = $('#bv-cinema'); if (!box) return; const k = K();
    box.innerHTML = `<div class="cn ${mode}">${side(L, 'l')}<div class="cn-mid"><span class="cn-vs">${mode === 'def' ? 'GUARD' : 'VS'}</span><span class="cn-cnt mono"></span></div>${side(R, 'r')}</div>`;
    box.classList.add('on'); $('#bv-stage')?.classList.add('cine'); await wait(260 * k);
    const sl = $('.cn-side.l', box), sr = $('.cn-side.r', box), cnt = $('.cn-cnt', box);
    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i]; cnt.textContent = rounds.length > 1 || mode !== 'def' ? `${i + 1}합` : '';
      sl.classList.remove('win', 'lose'); sr.classList.remove('win', 'lose');
      await Promise.all([flipCoins($('.cn-coins', sl), r.l, $('.cn-val', sl)), flipCoins($('.cn-coins', sr), r.r, $('.cn-val', sr))]);
      if (i < rounds.length - 1) { cnt.textContent = '동률 · 재합'; sfx('tie'); box.querySelector('.cn').classList.add('tie'); await wait(420 * k); box.querySelector('.cn').classList.remove('tie'); }
    }
    if (winSide) {
      const w = winSide === 'l' ? sl : sr, l = winSide === 'l' ? sr : sl;
      w.classList.add('win'); l.classList.add('lose'); shake(); sfx('clash');
      if (mode === 'clash' || (winSide === 'l' ? L : R).sk.type === '회피') {
        $$('.coin', l).forEach((c, ci) => { c.style.animationDelay = ci * 40 + 'ms'; c.classList.add('shatter'); });
        const stamp = document.createElement('span'); stamp.className = 'cn-broken mono'; stamp.textContent = mode === 'clash' ? '합 패배 · 적중 효과 없음' : '빗나감 · 적중 효과 없음';
        $('.cn-info', l).append(stamp); setTimeout(() => sfx('shatter'), 120 * k);
      }
      await wait(420 * k);
      if (dmgRoll) { cnt.textContent = '피해 굴림'; await flipCoins($('.cn-coins', w), dmgRoll, $('.cn-val', w)); await wait(160 * k); }
    }
    box.classList.remove('on'); $('#bv-stage')?.classList.remove('cine'); await wait(180 * k); box.innerHTML = '';
  }
  async function cinemaOne(A, r, dir, tagTxt) {
    if (SKIP()) return;
    const box = $('#bv-cinema'); if (!box) return; const k = K();
    box.innerHTML = `<div class="cn one ${dir} ${A.mgr ? 'mgr' : ''}">${side(A, dir)}<div class="cn-mid"><span class="cn-vs">${X.esc(tagTxt)}</span></div></div>`;
    box.classList.add('on'); $('#bv-stage')?.classList.add('cine'); await wait(220 * k);
    const s = $('.cn-side', box);
    await flipCoins($('.cn-coins', s), r, $('.cn-val', s));
    s.classList.add('win'); await wait(260 * k);
    box.classList.remove('on'); $('#bv-stage')?.classList.remove('cine'); await wait(160 * k); box.innerHTML = '';
  }
  const allyInfo = (cid, sk) => (sk.ego ? { name: `${nm(cid)} · E.G.O. ${sk.grade}`, img: sk.img, sk, color: X.charColor(X.CH[cid]), ego: true }
    : { name: nm(cid), img: `img/pt/${idtOf(cid).id}.webp`, sk, color: X.charColor(X.CH[cid]) });
  const foeInfo = (u, pt, sk) => ({ name: u.name + (u.parts.length > 1 ? ' · ' + pt.name : ''), img: u.img, censor: u.censor, sk, color: 'var(--danger)' });
  const coinStr = (r) => `<span class="cz">${r.coins.map((c) => (c === null ? '×' : c ? '●' : '○')).join('')}</span>`;

  /* ═════════════ 턴 진행 ═════════════ */
  async function resolveTurn() {
    if (busy || T().result) return;
    const t = T();
    if (!t.mgr.used) {
      const ok = await X.modal({ label: 'MANAGER', title: '셰르가 아직 관리자 카드를 쓰지 않았어요', body: `<p>셰르는 매 턴 <b>전투 전에 먼저</b> 행동합니다. 왼쪽 아래 셰르 칸에서 카드를 골라 주세요.</p><p class="dim small">급하면 '불씨 살리기'(SP가 가장 낮은 아군 SP +5)로 바로 진행할 수 있어요.</p>`, buttons: [{ label: '돌아가기', value: false, cls: 'ghost' }, { label: '불씨 살리기 쓰고 진행', value: true, cls: 'primary' }] });
      if (!ok) return;
      await useMgr('D', null);
    }
    const idle = activeAllies().filter((c) => canAct(c) && !t.plans[c]);
    if (idle.length) {
      const ok = await X.modal({ label: 'CONFIRM', title: '카드를 고르지 않은 수감자가 있어요', body: `<p>${idle.map(nm).join(', ')} — 이번 턴에 행동하지 않습니다. 빈 칸을 채우려면 '자동 배치'를 눌러 주세요.</p>`, buttons: [{ label: '돌아가기', value: false, cls: 'ghost' }, { label: '이대로 진행', value: true, cls: 'primary' }] });
      if (!ok) return;
    }
    busy = true; sel = null; selM = null; t.phase = 'resolve'; intelOff();
    const ev = buildEvents();
    ev.forEach((e) => { if (e.aid) actBy(e.aid).used = true; });
    paintAll(); $('#bv-stage')?.classList.add('live');
    for (let i = 0; i < ev.length; i++) {
      if (over()) break;
      $$('.tl').forEach((x) => x.classList.toggle('now', x.dataset.tl === String(i)));
      await runEvent(ev[i]);
      paintField(); paintHands(); paintTicker(); paintSins(); requestAnimationFrame(drawArrows);
      $$('.tl').forEach((x) => { if (Number(x.dataset.tl) <= i) x.classList.add('past'); });
      await wait(SKIP() ? 90 : 260 * K());
    }
    $('#bv-stage')?.classList.remove('live');
    endTurn();
  }
  const over = () => T().en.every((u) => u.dead || u.gone) || !B().deployed.concat(B().queue).some((c) => !P(c).dead);
  function useAlly(cid, slot, sk) {
    const a = T().al[cid];
    if (isEgo(slot)) {
      const S = SINS(), lack = Object.entries(sk.cost).filter(([k, v]) => (S[k] || 0) < v).map(([k, v]) => `${k} ${S[k] || 0}/${v}`);
      const m = sk.cond && sk.cond.match(/(호흡|충전|침잠|출혈|파열|화상|진동)\s*(\d+)\s*이상/);
      const condOk = !m || (ensure(a).k[m[1]] || 0) >= +m[2];
      if (lack.length || !condOk) { log(`<b>${nm(cid)}</b> E.G.O. ${X.esc(sk.name)} — 사용 실패 (${lack.length ? '재화 부족 ' + lack.join(' · ') : '조건 ' + sk.cond}) → 이번 턴 행동 없음`, 'warn'); kwPop(EA(cid), 'E.G.O. 실패', '#e0a030'); return false; }
      Object.entries(sk.cost).forEach(([k, v]) => { S[k] = Math.max(0, (S[k] || 0) - v); });
      eSpAdd(EA(cid), -sk.spCost);
      log(`❖ <b>${nm(cid)}</b> E.G.O. <b>${X.esc(sk.name)}</b> (${sk.grade}) — SP −${sk.spCost} · 재화 ${Object.entries(sk.cost).map(([k, v]) => `${k} −${v}`).join(' · ')}`, 'ego');
      kwPop(EA(cid), `SP −${sk.spCost}`, '#e0604e');
      if (X.hud) X.hud();
      addSin(sk.sin); paintSins(); paintField();
      return true;                                   // 손패는 그대로 (전투 규칙 7)
    }
    if (slot !== 'D') { const i = a.hand.indexOf(slot); if (i >= 0) a.hand.splice(i, 1); }
    addSin(sk.sin);
    return true;
  }
  async function runEvent(e) {
    if (e.type === 'one') return allyOneSided(e.cid, e.pl);
    if (e.type === 'enemy') return enemyOneSided(actBy(e.aid));
    const a = actBy(e.aid); a.done = true;
    const u = unit(a.uid), pt = part(a.uid, a.pid);
    if (!canAct(e.cid)) { log(`<b>${nm(e.cid)}</b> 행동 불가 — ${X.esc(a.sk.name)}이(가) 그대로 들어옵니다`, 'dim'); return enemyOneSided(a, true); }
    if (u.dead || u.gone || pt.broken || pt.hp <= 0 || staggered(pt)) { log(`${X.esc(u.name)} · ${X.esc(a.sk.name)} 무산`, 'dim'); return allyOneSided(e.cid, { slot: e.pl.slot, kind: 'one', uid: a.uid, pid: a.pid }); }
    const ask = skillOf(e.cid, e.pl.slot);
    if (!useAlly(e.cid, e.pl.slot, ask)) return enemyOneSided(a, true);
    if (isEgo(e.pl.slot)) await egoCut(e.cid, ask);
    if (e.type === 'def' || isDef(ask)) return defendAlly(e.cid, ask, a, u, pt);
    const A = EA(e.cid), E = EE(u, pt);
    const ca = begin(A, ask, E, { idt: idtOf(e.cid).id, slot: e.pl.slot }), ce = begin(E, a.sk, A, null);
    const rounds = []; let ar, er, bled = false;
    do {
      if (bleed(A)) bled = true; if (bleed(E)) bled = true;
      if (!eAlive(A) || !eAlive(E)) break;
      ar = roll(ask, ca.plan); er = roll(a.sk, ce.plan); rounds.push({ l: ar, r: er });
    } while (ar.v === er.v && rounds.length < 20);
    if (bled) { paintField(); await wait(SKIP() ? 60 : 420 * K()); }
    if (!eAlive(A) || !eAlive(E) || !rounds.length) { finish(ca, {}); finish(ce, {}); return; }
    const win = ar.v > er.v ? 'l' : 'r';
    const W = win === 'l' ? ca : ce, L = win === 'l' ? ce : ca;
    fireTrig(W, 'clashWin');
    const dr = roll(W.sk, W.plan);
    lunge(`[data-fig="a:${e.cid}"]`, 'r'); lunge(`[data-fig="e:${u.uid}"]`, 'l');
    await cinemaClash(allyInfo(e.cid, ask), foeInfo(u, pt, a.sk), rounds, win, dr, 'clash');
    log(`⚔ <b>${nm(e.cid)}</b> ${X.esc(ask.name)} ${coinStr(ar)} <b>${ar.v}</b> vs <b>${er.v}</b> ${coinStr(er)} ${X.esc(a.sk.name)}${rounds.length > 1 ? ` <span class="dim">(${rounds.length}합)</span>` : ''}`, 'clash');
    clashSp(W.me, L.me);
    lunge(eFig(W.me), win === 'l' ? 'r' : 'l');
    const res = strike(W, dr, L.me, `└ ${win === 'l' ? '승리' : '패배'} · 피해 ${coinStr(dr)} ${dr.v} →`);
    finish(W, res); finish(L, {});
  }
  async function defendAlly(cid, dsk, a, u, pt, chain) {
    const A = EA(cid), E = EE(u, pt);
    const ce = begin(E, a.sk, A, null), cd = begin(A, dsk, E, { idt: idtOf(cid).id, slot: 'D' });
    const ar = roll(a.sk, ce.plan), dr = roll(dsk, cd.plan);
    const win = dsk.type === '회피' ? (dr.v > ar.v ? 'l' : 'r') : dsk.type === '반격' ? null : 'r';
    lunge(`[data-fig="e:${u.uid}"]`, 'l');
    await cinemaClash(allyInfo(cid, dsk), foeInfo(u, pt, a.sk), [{ l: dr, r: ar }], win, null, 'def');
    const head = `🛡 <b>${nm(cid)}</b> ${X.esc(dsk.name)}(${dsk.type}${chain ? ' · 연속' : ''}) ${coinStr(dr)} <b>${dr.v}</b> vs <b>${ar.v}</b> ${coinStr(ar)} ${X.esc(a.sk.name)}`;
    if (dsk.type === '회피') {
      if (dr.v > ar.v) { log(`${head} → <span class="ok">회피</span>`, 'clash'); clashSp(A, E); T().al[cid].chain = true; popTxt(`[data-fig="a:${cid}"] .fg-body`, 'EVADE'); fireTrig(cd, 'evade'); finish(ce, {}); finish(cd, {}); return; }
      log(`${head} → 회피 실패`, 'clash'); clashSp(E, A); const res = strike(ce, ar, A, '└'); finish(ce, res); finish(cd, {}); return;
    }
    if (dsk.type === '방어') {
      log(`${head} → 방어 ${dr.v}`, 'clash'); if (dr.v > ar.v) clashSp(A, E); else clashSp(E, A);
      const res = strike(ce, ar, A, '└', { minus: dr.v }); if (!res.d) popTxt(`[data-fig="a:${cid}"] .fg-body`, 'BLOCK');
      finish(ce, res); finish(cd, {}); return;
    }
    log(`${head} → 반격`, 'clash'); if (dr.v > ar.v) clashSp(A, E); else clashSp(E, A);
    const res = strike(ce, ar, A, '└ 받은 피해');
    if (eAlive(A) && eAlive(E)) {
      const m = staggered(pt) ? { m: 2, tag: 'stag' } : { m: pt.sin ? pt.sin[dsk.sin] ?? 1 : 1, tag: pt.sin && (pt.sin[dsk.sin] ?? 1) > 1 ? 'weak' : '' };
      if (pt.sin) known(u, pt)['sin:' + dsk.sin] = true;
      lunge(`[data-fig="a:${cid}"]`, 'r');
      const r2 = strike(cd, dr, E, '└ 반격', { mul: m, noWeight: true }); finish(cd, r2);
    } else finish(cd, {});
    finish(ce, res);
  }
  async function allyOneSided(cid, pl) {
    if (!canAct(cid)) { log(`<b>${nm(cid)}</b> 행동 불가`, 'dim'); return; }
    let u = unit(pl.uid), pt = part(pl.uid, pl.pid);
    if (u.dead || u.gone || pt.broken || pt.hp <= 0) {
      const alt = T().en.filter((x) => !x.dead && !x.gone).flatMap((x) => x.parts.filter((p) => !p.broken && p.hp > 0).map((p) => [x, p]));
      if (!alt.length) return; [u, pt] = pickR(alt);
    }
    const sk = skillOf(cid, pl.slot); if (!useAlly(cid, pl.slot, sk)) return;
    if (isEgo(pl.slot)) await egoCut(cid, sk);
    const A = EA(cid), E = EE(u, pt);
    const ca = begin(A, sk, E, { idt: idtOf(cid).id, slot: pl.slot });
    const d = T().acts.find((x) => x.uid === u.uid && x.pid === pt.pid && isDef(x.sk) && !x.done && !staggered(pt) && !u.panic);
    const ar = roll(sk, ca.plan);
    lunge(`[data-fig="a:${cid}"]`, 'r');
    if (d) {
      d.done = true; const cd = begin(E, d.sk, A, null); const dr = roll(d.sk, cd.plan);
      const win = d.sk.type === '회피' ? (dr.v > ar.v ? 'r' : 'l') : d.sk.type === '반격' ? null : 'l';
      await cinemaClash(allyInfo(cid, sk), foeInfo(u, pt, d.sk), [{ l: ar, r: dr }], win, null, 'def');
      const head = `➹ <b>${nm(cid)}</b> ${X.esc(sk.name)} ${coinStr(ar)} <b>${ar.v}</b> → ${X.esc(u.name)} ${X.esc(d.sk.name)}(${d.sk.type}) ${coinStr(dr)} <b>${dr.v}</b>`;
      if (d.sk.type === '회피' && dr.v > ar.v) { log(`${head} → 적이 피함`, 'clash'); clashSp(E, A); popTxt(`[data-fig="e:${u.uid}"] .fg-body`, 'EVADE'); fireTrig(cd, 'evade'); finish(ca, {}); finish(cd, {}); return; }
      if (d.sk.type === '방어') { log(`${head} → 적 방어`, 'clash'); if (dr.v > ar.v) clashSp(E, A); else clashSp(A, E); const res = strike(ca, ar, E, '└', { minus: dr.v }); if (!res.d) popTxt(`[data-fig="e:${u.uid}"] .fg-body`, 'BLOCK'); finish(ca, res); finish(cd, {}); return; }
      if (d.sk.type === '반격') {
        log(`${head} → 적 반격`, 'clash'); if (dr.v > ar.v) clashSp(E, A); else clashSp(A, E); const res = strike(ca, ar, E, '└');
        if (eAlive(A) && eAlive(E)) { lunge(`[data-fig="e:${u.uid}"]`, 'l'); const r2 = strike(cd, dr, A, '└ 반격', { mul: { m: staggered(T().al[cid]) ? 2 : 1, tag: '' }, noWeight: true }); finish(cd, r2); } else finish(cd, {});
        finish(ca, res); return;
      }
      log(`${head} → 회피 실패`, 'clash'); clashSp(A, E); finish(cd, {});
    } else {
      await cinemaOne(allyInfo(cid, sk), ar, 'l', 'STRIKE');
      log(`➹ <b>${nm(cid)}</b> ${X.esc(sk.name)} ${coinStr(ar)} <b>${ar.v}</b>`, 'one');
    }
    const res = strike(ca, ar, E, '└'); finish(ca, res);
  }
  async function enemyOneSided(a, forced) {
    if (!a || (a.done && !forced)) return;
    a.done = true;
    const u = unit(a.uid), pt = part(a.uid, a.pid);
    if (u.dead || u.gone || u.panic || pt.broken || pt.hp <= 0 || staggered(pt)) return;
    let tg = a.target; if (!tg || P(tg).dead || !B().deployed.includes(tg)) { tg = pickR(activeAllies()); if (!tg) return; }
    const al = T().al[tg];
    if (al && al.chain && canAct(tg) && !forced) return defendAlly(tg, skillOf(tg, 'D'), a, u, pt, true);
    const E = EE(u, pt), A = EA(tg);
    const ce = begin(E, a.sk, A, null);
    const r = roll(a.sk, ce.plan);
    lunge(`[data-fig="e:${u.uid}"]`, 'l');
    await cinemaOne(foeInfo(u, pt, a.sk), r, 'r', `→ ${nm(tg)}`);
    log(`✖ <b>${X.esc(u.name)}</b> ${X.esc(a.sk.name)} → ${nm(tg)} ${coinStr(r)} <b>${r.v}</b>`, 'enemy');
    const res = strike(ce, r, A, '└'); finish(ce, res);
  }

  /* ═════════════ 턴 종료 (화상 · 키워드 감소 · 셰르 버프 소멸) ═════════════ */
  async function endTurn() {
    const t = T(), b = B();
    const ents = activeAllies().map(EA).concat(t.en.filter((u) => !u.dead && !u.gone).flatMap((u) => u.parts.filter((p) => !p.broken && p.hp > 0).map((p) => EE(u, p))));
    let burned = false;
    ents.forEach((e) => {
      const k = e.o.k;
      if (k.화상 > 0 && eAlive(e)) { burned = true; hurt(e, k.화상, { m: 1, tag: '' }, '◎ 화상', { kw: false, kind: 'burn' }); k.화상 = Math.max(0, k.화상 - 1); }
      if (k.진동 > 0) k.진동--; if (k.충전 > 0) k.충전--;
      k.방어막 = 0;
      if (e.side === 'a' && e.o.mg.breath) { k.호흡 = Math.max(0, (k.호흡 || 0) - Math.min(k.호흡 || 0, e.o.mg.breath)); }
      e.o.mg = {}; e.o.stagBy = false;
    });
    if (endq.length) { notes = []; endq.forEach(({ c, op }) => { if (condOk(op, c)) doOp(op, c); }); flushNotes('턴 종료'); endq = []; }
    if (burned) { paintField(); await wait(SKIP() ? 80 : 650); }
    paySins(); paintSins();
    activeAllies().forEach((c) => { if (t.al[c].panic) { P(c).sp = 0; log(`<b>${nm(c)}</b> 패닉에서 벗어남 (SP 0)`, 'dim'); } });
    t.en.forEach((u) => { if (u.panic) { u.sp = 0; u.panic = false; } });
    if (t.en.every((u) => u.dead || u.gone)) { t.result = 'win'; log('VICTORY', 'turn'); X.save(); paintAll(); banner('VICTORY', 'win big'); sfx('win'); await wait(1100); busy = false; return X.battleWin(); }
    if (!b.deployed.concat(b.queue).some((c) => !P(c).dead)) { t.result = 'lose'; log('DEFEAT', 'turn'); paintAll(); banner('DEFEAT', 'kia big'); sfx('lose'); await wait(900); busy = false; return X.battleLose(true); }
    busy = false; startTurn(); paintAll();
    banner(`TURN ${t.turn}`, 'turn');
  }

  window.MDBattle = { render, canRun, _parse: parseFx };
})();
