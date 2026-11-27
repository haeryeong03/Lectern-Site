/* =========================================================================
   Lectern Company — 거울 던전  ·  1단계: 던전 뼈대
   시작 편성 → 노드 지도 → 이벤트 / 상점 / (임시) 전투 → 층 클리어 → 5층 완료
   전투는 '승리 / 패배' 임시 처리 (2단계에서 전투 엔진 연결)
   저장: 브라우저 localStorage (4단계에서 Firebase로 이전)
   ========================================================================= */
(() => {
  'use strict';
  const D = window.MD_DATA;
  const R = D.RULES;

  /* ── 작은 도구 ───────────────────────────────────────────────────── */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const node = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad2 = (n) => String(n).padStart(2, '0');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const CH = Object.fromEntries(D.CHARS.map((c) => [c.id, c]));
  const IDT = Object.fromEntries(D.IDENTITIES.map((i) => [i.id, i]));
  const EGO = Object.fromEntries(D.EGOS.map((e) => [e.id, e]));
  const GIFT = Object.fromEntries(D.GIFTS.map((g) => [g.id, g]));
  const EVT = Object.fromEntries(D.EVENTS.map((e) => [e.id, e]));
  const THEME = Object.fromEntries(D.THEMES.map((t) => [t.id, t]));
  const CHAR_IDS = D.CHARS.map((c) => c.id);
  const GRADE_MARK = { 1: 'ɵ', 2: 'ɵɵ', 3: 'ɵɵɵ' };

  /* ── 저장소 ─────────────────────────────────────────────────────── */
  const KEY = { save: 'lcmd_save_v1', set: 'lcmd_settings_v1', mad: 'lcmd_madness_v1' };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* */ } }
  };
  const S = Object.assign({ theme: 'dark', level: R.startLevel, own: 'all', typeSpeed: 'normal' }, store.get(KEY.set, {}));
  const saveSettings = () => store.set(KEY.set, S);
  document.documentElement.dataset.theme = S.theme;

  let run = store.get(KEY.save, null);
  if (run && run.v !== 1) run = null;
  const save = () => { if (run) { run.saved = Date.now(); store.set(KEY.save, run); } };
  const wipeSave = () => { store.del(KEY.save); run = null; };

  /* 주간 광기 (임시 — 4단계에서 서버 처리) */
  function weekKey() {
    const now = new Date(Date.now() + 9 * 3600e3);           // KST
    const day = (now.getUTCDay() + 6) % 7;                   // 월=0
    const mon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
    return mon.toISOString().slice(0, 10);
  }
  function madness() {
    const m = store.get(KEY.mad, { week: weekKey(), earned: 0 });
    if (m.week !== weekKey()) { m.week = weekKey(); m.earned = 0; store.set(KEY.mad, m); }
    return m;
  }
  function grantMadness(n) {
    const m = madness(); const give = Math.max(0, Math.min(n, R.madnessWeeklyCap - m.earned));
    m.earned += give; store.set(KEY.mad, m); return give;
  }

  /* ── 규칙 도우미 ─────────────────────────────────────────────────── */
  const maxHp = (cid, lv = run ? run.level : S.level) => lv * 6 + (R.hpBase[cid] || 60);
  const charColor = (c) => (S.theme === 'dark' ? c.colorDark || c.color : c.colorLight || c.color);
  const sinVar = (s) => `var(--sin-${s})`;
  const idsOf = (cid) => D.IDENTITIES.filter((i) => i.char === cid);
  const ownedIds = (cid) => idsOf(cid).filter((i) => S.own === 'all' || i.grade === 1);
  const baseIdOf = (cid) => idsOf(cid).find((i) => i.grade === 1);
  const egosOf = (cid) => D.EGOS.filter((e) => e.char === cid);
  const ownedEgos = (cid) => egosOf(cid).filter((e) => e.base || S.own === 'all');
  const baseEgoOf = (cid) => egosOf(cid).find((e) => e.base);
  const hasSin = (idt, sin) => idt.skills.some((s) => s.sin === sin);
  const P = (cid) => run.party[cid];
  const alive = (cid) => !run.party[cid].dead;
  // 전투에 직접 서는 5명 = 출전 순서상 앞에서부터 살아 있는 5명
  const activeIds = () => run.order.filter(alive).slice(0, R.activeSlots);

  function sinChip(sin, extra = '') { return `<span class="chip sin" style="--c:${sinVar(sin)}"><span class="dot"></span><b>${esc(sin)}</b>${extra}</span>`; }
  function sinDot(sin) { return `<span class="sin-dot" style="--c:${sinVar(sin)}" title="${esc(sin)}"></span>`; }
  function gradeHtml(g) { return `<span class="grade g${g}">${GRADE_MARK[g]}</span>`; }
  function resHtml(res) {
    return ['참격', '관통', '타격'].map((t) => {
      const v = res[t]; if (v == null) return `<span class="res">${t} ?</span>`;
      const cls = v > 1 ? 'weak' : v < 1 ? 'strong' : '';
      const word = v > 1 ? '약점' : v < 1 ? '강점' : '보통';
      return `<span class="res ${cls}">${t} ${word} ×${v}</span>`;
    }).join('');
  }
  function giftArt(g, cls = '') {
    if (g.img) return `<img class="${cls}" src="${g.img}" alt="${esc(g.name)}">`;
    if (g.glyph === 'snack') return `<svg class="${cls}" viewBox="0 0 64 64" aria-label="${esc(g.name)}"><path d="M16 26h32l-4 30H20z" fill="var(--panel-2)" stroke="var(--brass)" stroke-width="2"/><path d="M22 26l2 30M32 26v30M42 26l-2 30" stroke="var(--danger)" stroke-width="3" opacity=".7"/><g fill="var(--ink)" stroke="var(--line-2)"><circle cx="22" cy="22" r="5"/><circle cx="30" cy="18" r="6"/><circle cx="39" cy="20" r="5.5"/><circle cx="45" cy="25" r="4"/><circle cx="18" cy="26" r="4"/></g><path d="M46 8l2 16" stroke="var(--brass)" stroke-width="3"/></svg>`;
    if (g.glyph === 'pillow') return `<svg class="${cls}" viewBox="0 0 64 64" aria-label="${esc(g.name)}"><path d="M10 22c6-6 14 2 22-3s16-4 22 3c3 8-2 12 0 20-6 7-15 0-22 4s-16 4-22-3c-2-8 2-13 0-21z" fill="var(--panel-2)" stroke="var(--sin-우울)" stroke-width="2"/><path d="M20 30c5 3 10-2 14 2M28 38c4 2 8-1 12 1" fill="none" stroke="var(--line-2)" stroke-width="1.6"/><path d="M48 10c2 2 2 5 0 7M53 8c3 3 3 8 0 11" fill="none" stroke="var(--dim)" stroke-width="1.4"/></svg>`;
    return `<svg class="${cls}" viewBox="0 0 64 64"><rect x="14" y="14" width="36" height="36" fill="none" stroke="var(--brass)"/></svg>`;
  }

  /* ── 화면 전환 ───────────────────────────────────────────────────── */
  const screen = $('#screen');
  const hud = $('#hud');
  let currentView = null;
  function show(name, html, after) {
    currentView = name;
    const v = node(`<section class="view ${name}-view">${html}</section>`);
    screen.replaceChildren(v);
    hud.hidden = !run || name === 'title' || name === 'setup';
    if (!hud.hidden) renderHud();
    bindDragScroll(v);
    if (after) after(v);
    return v;
  }

  /* ── HUD ─────────────────────────────────────────────────────────── */
  function renderHud(bumpAn) {
    $('#hud-floor').textContent = `FLOOR ${run.floor} / ${R.floors}`;
    const anEl = $('#hud-an'); anEl.textContent = run.an;
    if (bumpAn) { const b = anEl.parentElement; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    const g = $('#hud-gifts');
    g.innerHTML = run.gifts.length
      ? run.gifts.map((id) => { const gf = GIFT[id]; return `<button class="gift-ico" data-tip-title="${esc(gf.name)}" data-tip="${esc(gf.fx)}">${giftArt(gf)}</button>`; }).join('')
      : `<span class="empty mono">[ 보유 에고 기프트 없음 ]</span>`;
    const n = $('#hud-gift-n'); n.textContent = run.gifts.length; n.dataset.n = run.gifts.length;
    const sw = $('#hud-sins'); if (sw) { const sn = run.sins || {}; const tot = D.SIN_ORDER.reduce((a, k) => a + (sn[k] || 0), 0);
      sw.innerHTML = D.SIN_ORDER.map((k) => `<span class="hs ${sn[k] ? 'on' : ''}" style="--sc:var(--sin-${k})" data-tip-title="죄악 재화 · ${k}" data-tip="${sn[k] || 0}개 — 던전이 끝날 때까지 쌓이고, E.G.O. 사용에 소모 (2-3 단계)">${sn[k] || ''}</span>`).join('');
      sw.dataset.tot = tot; }
    requestAnimationFrame(giftEdges);
    const lock = !['map'].includes(currentView);
    $$('.hud-btn[data-act="save-exit"], .hud-btn[data-act="abandon"]').forEach((b) => b.classList.toggle('locked', currentView === 'battle'));
    $('.hud-btn[data-act="party"]').dataset.lock = lock ? '1' : '';
  }
  /* 상단 기프트 줄: 끌기 · 휠 · 화살표로 옆으로 넘기기 */
  const giftRow = $('#hud-gifts');
  function giftEdges() {
    const l = giftRow.scrollLeft > 2, r = giftRow.scrollLeft + giftRow.clientWidth < giftRow.scrollWidth - 2;
    giftRow.classList.toggle('can-l', l); giftRow.classList.toggle('can-r', r);
    $('.hg-arrow.l').classList.toggle('on', l); $('.hg-arrow.r').classList.toggle('on', r);
  }
  bindDragScroll(hud);
  giftRow.addEventListener('scroll', giftEdges, { passive: true });
  window.addEventListener('resize', giftEdges);
  giftRow.addEventListener('wheel', (e) => {
    if (giftRow.scrollWidth <= giftRow.clientWidth) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    e.preventDefault(); giftRow.style.scrollBehavior = 'auto'; giftRow.scrollLeft += d; giftRow.style.scrollBehavior = '';
  }, { passive: false });
  function giftScrollEnd() { giftRow.scrollLeft = giftRow.scrollWidth; }
  hud.addEventListener('click', (e) => {
    const sb = e.target.closest('[data-scroll]');
    if (sb) { giftRow.scrollBy({ left: +sb.dataset.scroll * Math.max(120, giftRow.clientWidth * 0.7) }); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'party') openPartyDrawer(currentView === 'map');
    if (a === 'gifts') openGiftDrawer();
    if (a === 'settings') openSettings();
    if (a === 'save-exit') { save(); toast('저장했습니다. 이어하기로 돌아올 수 있습니다.', 'gold'); renderTitle(); }
    if (a === 'abandon') confirmAbandon();
  });

  /* ── 툴팁 ────────────────────────────────────────────────────────── */
  const tip = node('<div class="tip"><h5></h5><p></p></div>'); document.body.append(tip);
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-tip]'); if (!t) return;
    tip.querySelector('h5').textContent = t.dataset.tipTitle || '';
    tip.querySelector('h5').hidden = !t.dataset.tipTitle;
    tip.querySelector('p').textContent = t.dataset.tip;
    const r = t.getBoundingClientRect();
    tip.style.left = Math.min(innerWidth - 300, Math.max(8, r.left)) + 'px';
    tip.style.top = (r.bottom + 8 + 120 > innerHeight ? r.top - 8 - tip.offsetHeight : r.bottom + 8) + 'px';
    tip.classList.add('on');
  });
  document.addEventListener('pointerout', (e) => { if (e.target.closest('[data-tip]')) tip.classList.remove('on'); });

  /* ── 드래그 스크롤 (스크롤바 대신) ─────────────────────────────── */
  function bindDragScroll(root) {
    $$('[data-drag-scroll]', root).concat(root.matches?.('[data-drag-scroll]') ? [root] : []).forEach((el) => {
      if (el._ds) return; el._ds = true;
      let sx, sy, sl, st, down = false, moved = false;
      el.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true; moved = false; sx = e.clientX; sy = e.clientY; sl = el.scrollLeft; st = el.scrollTop;
      });
      window.addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (!moved && Math.hypot(dx, dy) > 6) { moved = true; el.classList.add('dragging'); }
        if (moved) { el.scrollLeft = sl - dx; el.scrollTop = st - dy; }
      });
      window.addEventListener('pointerup', () => { if (!down) return; down = false; setTimeout(() => el.classList.remove('dragging'), 0); });
      el.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    });
  }

  /* ── 토스트 · 모달 · 서랍 ─────────────────────────────────────────── */
  function toast(msg, kind = '') {
    const t = node(`<div class="toast ${kind}">${msg}</div>`); $('#toast-root').append(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 3200);
  }
  function modal({ label = '', title = '', body = '', buttons = [], wide = false, onMount, dismiss = true }) {
    return new Promise((resolve) => {
      const m = node(`<div class="modal"><div class="modal-veil"></div><div class="modal-box ${wide ? 'wide' : ''}">
        ${title || label ? `<div class="mb-head">${label ? `<span class="label">${esc(label)}</span>` : ''}${title ? `<h3>${title}</h3>` : ''}</div>` : ''}
        <div class="mb-body">${body}</div>
        ${buttons.length ? `<div class="mb-foot">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}" ${b.disabled ? 'disabled' : ''}>${b.label}</button>`).join('')}</div>` : ''}
      </div></div>`);
      const close = (v) => { m.classList.add('out'); setTimeout(() => m.remove(), 230); resolve(v); };
      m.addEventListener('click', (e) => {
        const b = e.target.closest('.mb-foot [data-i]'); if (b) { const def = buttons[+b.dataset.i]; close(def.value ?? def.label); }
        if (dismiss && e.target.classList.contains('modal-veil')) close(null);
      });
      m._close = close;
      $('#modal-root').append(m);
      bindDragScroll(m);
      if (onMount) onMount(m, close);
    });
  }
  function drawer(title, label, bodyHtml, { foot = '', onMount } = {}) {
    const d = $('#drawer');
    d.innerHTML = `<div class="drawer-veil"></div><div class="drawer-panel">
      <div class="dr-head"><div><span class="label">${esc(label)}</span><h3>${title}</h3></div><button class="btn sm ghost x" data-close>닫기 <span class="k">ESC</span></button></div>
      <div class="dr-body" data-drag-scroll>${bodyHtml}</div>${foot ? `<div class="dr-foot">${foot}</div>` : ''}</div>`;
    d.hidden = false; d.classList.remove('out');
    const close = () => { d.classList.add('out'); setTimeout(() => { d.hidden = true; d.innerHTML = ''; }, 300); if (d._onClose) d._onClose(); };
    d._close = close; d._onClose = null;
    d.querySelector('.drawer-veil').onclick = close;
    d.querySelector('[data-close]').onclick = close;
    bindDragScroll(d);
    if (onMount) onMount(d, close);
    return d;
  }
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const m = $$('#modal-root .modal').pop(); if (m && m._close) { m._close(null); return; }
    const d = $('#drawer'); if (!d.hidden && d._close) d._close();
  });

  /* =====================================================================
     타이틀
     ===================================================================== */
  function renderTitle() {
    const m = madness();
    const sv = run;
    const html = `
      <div class="title-left">
        <svg class="title-rings" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          ${[120, 190, 260, 330, 400].map((r, i) => `<circle cx="400" cy="400" r="${r}" stroke-dasharray="${i % 2 ? '2 6' : 'none'}" opacity="${0.6 - i * 0.08}"/>`).join('')}
          <line x1="400" y1="0" x2="400" y2="800" stroke="var(--line)" stroke-dasharray="2 8"/>
          <line x1="0" y1="400" x2="800" y2="400" stroke="var(--line)" stroke-dasharray="2 8"/>
        </svg>
        <svg class="title-arch" viewBox="0 0 400 480" aria-label="거울 던전 아치">
          <defs><linearGradient id="ray" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--ink)" stop-opacity=".0"/><stop offset=".5" stop-color="var(--ink)" stop-opacity=".22"/><stop offset="1" stop-color="var(--ink)" stop-opacity="0"/></linearGradient></defs>
          <path class="ray" d="M120 120 L-60 470 L40 470 L150 150 Z" fill="url(#ray)"/>
          <path class="draw" pathLength="1" d="M90 440 V200 A110 110 0 0 1 310 200 V440" fill="none" stroke="currentColor" stroke-width="2"/>
          <path class="draw d2" pathLength="1" d="M110 440 V206 A90 90 0 0 1 290 206 V440" fill="none" stroke="currentColor" stroke-width="1" opacity=".55"/>
          <path class="draw d3" pathLength="1" d="M60 452 H340 M40 466 H360" fill="none" stroke="currentColor" stroke-width="1.2"/>
          <g class="star"><path class="twinkle" d="M200 170 L210 214 L250 226 L210 238 L200 284 L190 238 L150 226 L190 214 Z" fill="currentColor"/></g>
          <g class="star" style="animation-delay:2.1s"><circle cx="246" cy="164" r="3" fill="currentColor"/><circle cx="152" cy="290" r="2.4" fill="currentColor"/><circle cx="262" cy="312" r="2" fill="currentColor"/><path d="M160 150 l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="currentColor"/></g>
          <path class="draw d3" pathLength="1" d="M130 410 C160 392 186 392 200 404 C214 392 240 392 270 410 M200 404 V430" fill="none" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        <div class="title-meta mono tiny dim"><span>LC-MD / 984 · CANTO 2.5</span><span>FACE THE SIN, BUILD THE E.G.O.</span></div>
      </div>
      <div class="title-right">
        <span class="label">LECTERN COMPANY · LCB</span>
        <h1>Mirror<br>Dungeon<small>거울 던전</small></h1>
        <div class="slogan">Face the Sin, Build the E.G.O.</div>
        <dl class="title-info">
          <dt>LEVEL</dt><dd>LV ${S.level} <span class="dim small">· 스토리 진행으로 오름 (설정에서 GM이 변경)</span></dd>
          <dt>MADNESS</dt><dd>이번 주 광기 <b>${m.earned}</b> / ${R.madnessWeeklyCap} <span class="dim small">· 층 클리어마다 ${R.madnessPerFloor}</span></dd>
          <dt>SAVE</dt><dd class="save-card">${sv ? `FLOOR ${sv.floor} 진행 중 · ${sv.an}안 · 기프트 ${sv.gifts.length}개<br><span class="dim">${new Date(sv.saved || sv.started).toLocaleString('ko-KR')}</span>` : '<span class="dim">저장된 판 없음</span>'}</dd>
        </dl>
        <div class="title-actions">
          ${sv ? `<button class="btn primary lg" data-a="continue"><span>이어하기</span><span class="k">CONTINUE</span></button>` : ''}
          <button class="btn ${sv ? '' : 'primary'} lg" data-a="new"><span>새로 시작</span><span class="k">NEW RUN</span></button>
          <button class="btn ghost" data-a="settings"><span>환경 설정</span><span class="k">SETTINGS</span></button>
        </div>
      </div>`;
    show('title', html, (v) => {
      v.addEventListener('click', async (e) => {
        const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
        if (a === 'continue') resume();
        if (a === 'settings') openSettings();
        if (a === 'new') {
          if (run) {
            const ok = await modal({ label: 'NEW RUN', title: '진행 중인 판이 있습니다', body: '<p>새로 시작하면 지금 세이브가 <b>삭제</b>됩니다. 세이브 칸은 하나뿐입니다.</p>', buttons: [{ label: '취소', value: false, cls: 'ghost' }, { label: '삭제하고 새로 시작', value: true, cls: 'warn' }] });
            if (!ok) return; wipeSave();
          }
          renderSetup();
        }
      });
    });
  }

  function resume() {
    if (!run) return renderTitle();
    const p = run.pending;
    if (!p) return renderMap();
    if (p.kind === 'event') return renderEvent();
    if (p.kind === 'shop') return renderShop();
    if (p.kind === 'battle') return renderBattle();
    if (p.kind === 'floorclear') return renderFloorClear();
    if (p.kind === 'reward') return renderReward();
    renderMap();
  }

  /* =====================================================================
     시작 편성 — 인격 · E.G.O. · 출전 순서
     ===================================================================== */
  let draft = null;
  function newDraft() {
    const d = { order: CHAR_IDS.slice(), picks: {} };
    CHAR_IDS.forEach((cid) => { d.picks[cid] = { identity: baseIdOf(cid).id, egos: { Zayin: baseEgoOf(cid).id } }; });
    return d;
  }
  function renderSetup() {
    draft = draft || newDraft();
    // 보유 범위가 바뀌었을 때 보유하지 않은 선택 정리
    CHAR_IDS.forEach((cid) => {
      const pk = draft.picks[cid];
      if (!ownedIds(cid).some((i) => i.id === pk.identity)) pk.identity = baseIdOf(cid).id;
      Object.keys(pk.egos).forEach((g) => { if (!ownedEgos(cid).some((e) => e.id === pk.egos[g])) delete pk.egos[g]; });
      if (!pk.egos.Zayin) pk.egos.Zayin = baseEgoOf(cid).id;
    });
    const mgr = D.MANAGER;
    const html = `
      <div class="setup-head">
        <div>
          <span class="label">01. FORMATION · 던전 입장 준비</span>
          <h2>인격과 E.G.O.를 고르고 출전 순서를 정하세요</h2>
          <p>입장 시 인격 교체는 무료입니다. 앞의 <b class="accent">5명</b>이 전투에 서고, 나머지 5명은 대기하다가 한 명이 쓰러지면 순서대로 들어옵니다.</p>
        </div>
        <div class="mono small dim nowrap">LV ${S.level} · ${S.own === 'all' ? '보유: 전체 (테스트)' : '보유: 기본 인격만'}</div>
      </div>
      <div class="setup-body">
        <div class="roster" data-drag-scroll><div class="roster-grid" id="roster"></div></div>
        <aside class="side">
          <div><span class="label">SORTIE ORDER · 출전 순서</span><p class="small dim" style="margin:6px 0 10px">끌어서 순서를 바꿉니다. 카드를 눌러 인격을 고릅니다.</p>
            <div class="order-list" id="order-list"></div></div>
          <div><span class="label">MANAGER CARD · 관리자 카드</span>
            <div class="mgr-card" style="margin-top:8px">
              <img src="${mgr.img}" alt="셰르">
              <div><div class="serif" style="font-weight:700">No.10 셰르 <span class="dim small">· ${mgr.title}</span></div>
                <div class="small ink2">${mgr.identity}</div>
                <div class="mc-cards">${mgr.cards.map((c) => `<span class="chip sin" style="--c:${sinVar(c.sin)}" data-tip-title="${c.slot === 'D' ? '수비' : c.slot + '스킬'} · ${esc(c.name)}" data-tip="${esc(c.note)}"><span class="dot"></span><b>${esc(c.name)}</b></span>`).join('')}</div>
                <div class="tiny dim mono" style="margin-top:6px">전투에 서지 않고 매 턴 먼저 버프를 줌 · 2단계 전투 엔진에서 작동</div></div>
            </div></div>
        </aside>
      </div>
      <div class="setup-foot">
        <button class="btn ghost" data-a="back">← 타이틀</button>
        <div class="mono small dim">시작 자금 <b class="brass">${R.startAn}안</b> · ${R.floors}개 층 · 층마다 무작위 보스</div>
        <button class="btn primary lg" data-a="start">던전 입장 <span class="k">ENTER</span></button>
      </div>`;
    show('setup', html, (v) => {
      paintRoster(); paintOrder();
      v.addEventListener('click', (e) => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a === 'back') { renderTitle(); }
        if (a === 'start') startRun();
        const card = e.target.closest('.pcard'); if (card) openIdentityDrawer(card.dataset.cid);
      });
    });
  }
  function paintRoster() {
    const box = $('#roster'); if (!box) return;
    box.innerHTML = draft.order.map((cid, i) => {
      const c = CH[cid], pk = draft.picks[cid], idt = IDT[pk.identity];
      const act = i < R.activeSlots;
      const sep = i === R.activeSlots ? `<div class="roster-sep"><span class="label">STANDBY · 대기</span><div class="ticks"></div></div>` : (i === 0 ? `<div class="roster-sep"><span class="label accent">ACTIVE · 전투</span><div class="ticks"></div></div>` : '');
      return `${sep}<button class="pcard ${act ? '' : 'standby'}" data-cid="${cid}" style="--cc:${charColor(c)}">
        <div class="pc-top"><span class="pc-ord ${act ? 'act' : ''}">${pad2(i + 1)}</span><img class="pc-sym" src="${c.sym}" alt=""></div>
        <div class="pc-stage"><img src="${idt.img}" alt="${esc(idt.name)}" loading="lazy"></div>
        <div class="pc-info">
          <div class="pc-name">${gradeHtml(idt.grade)} ${esc(c.short || c.name)} <span class="mono tiny dim" style="margin-left:auto">HP ${maxHp(cid, S.level)}</span></div>
          <div class="pc-id">${esc(idt.name)}</div>
          <div class="pc-sins">${idt.skills.map((s) => `<span class="s-lab">${s.slot === 'D' ? 'D' : s.slot}</span>${sinDot(s.sin)}`).join('')}</div>
          <div class="pc-ego" title="장착 E.G.O.">${D.EGO_GRADES.map((g) => `<span class="${pk.egos[g] ? 'on' : ''}"></span>`).join('')}</div>
        </div></button>`;
    }).join('');
  }
  function paintOrder() {
    const list = $('#order-list'); if (!list) return;
    renderOrderList(list, draft.order, (o) => { draft.order = o; paintRoster(); });
  }

  /* 순서 드래그 목록 (편성 · 파티 공용) */
  function renderOrderList(list, order, onChange, deadFn) {
    const rows = order.map((cid, i) => {
      const c = CH[cid]; const dead = deadFn ? deadFn(cid) : false;
      return `<div class="order-row ${i < R.activeSlots ? 'act' : ''}" data-cid="${cid}" style="${dead ? 'opacity:.45' : ''}">
        <span class="n">${pad2(i + 1)}</span><img src="${c.sym}" alt=""><span class="nm">${esc(c.name)}${dead ? ' <span class="danger mono tiny">K.I.A.</span>' : ''}</span><span class="tag">${i < R.activeSlots ? 'ACTIVE' : 'STANDBY'}</span></div>`;
    });
    rows.splice(R.activeSlots, 0, `<div class="order-split">STANDBY</div>`);
    list.innerHTML = rows.join('');
    let drag = null;
    list.querySelectorAll('.order-row').forEach((row) => {
      row.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const rows = [...list.querySelectorAll('.order-row')];
        drag = { row, startY: e.clientY, h: row.offsetHeight + 4, rows, from: rows.indexOf(row), to: rows.indexOf(row), moved: false };
        row.setPointerCapture(e.pointerId);
      });
      row.addEventListener('pointermove', (e) => {
        if (!drag || drag.row !== row) return;
        const dy = e.clientY - drag.startY; if (Math.abs(dy) > 4) drag.moved = true;
        row.classList.add('drag'); row.style.transform = `translateY(${dy}px)`;
        const to = clamp(drag.from + Math.round(dy / drag.h), 0, drag.rows.length - 1); drag.to = to;
        drag.rows.forEach((r, i) => {
          if (r === row) return;
          let shift = 0;
          if (drag.from < to && i > drag.from && i <= to) shift = -drag.h;
          if (drag.from > to && i < drag.from && i >= to) shift = drag.h;
          r.style.transform = shift ? `translateY(${shift}px)` : '';
        });
      });
      const end = () => {
        if (!drag || drag.row !== row) return;
        const { from, to, moved } = drag; drag.rows.forEach((r) => { r.style.transform = ''; r.classList.remove('drag'); }); drag = null;
        if (moved && from !== to) { const o = order.slice(); const [x] = o.splice(from, 1); o.splice(to, 0, x); onChange(o); renderOrderList(list, o, onChange, deadFn); }
      };
      row.addEventListener('pointerup', end); row.addEventListener('pointercancel', end);
    });
  }

  /* 인격 · E.G.O. 선택 서랍 */
  function openIdentityDrawer(cid, opts = {}) {
    const c = CH[cid];
    const pk = opts.pk || draft.picks[cid];
    const readOnly = !!opts.readOnly;
    const paint = (d) => {
      const idt = IDT[pk.identity];
      const body = d.querySelector('.dr-body');
      body.innerHTML = `
        <div class="id-layout" style="--cc:${charColor(c)}">
          <div class="id-hero"><img src="${idt.img}" alt="${esc(idt.name)}"></div>
          <div>
            <span class="label">IDENTITY · 인격 (${ownedIds(cid).length} / ${idsOf(cid).length} 보유)</span>
            <div class="id-list" style="margin:8px 0 14px">
              ${idsOf(cid).map((i) => { const own = ownedIds(cid).includes(i); return `<button class="id-opt ${i.id === pk.identity ? 'on' : ''} ${own ? '' : 'locked'}" data-id="${i.id}" ${readOnly ? 'disabled' : ''}>
                <img src="${i.img}" alt="" loading="lazy"><span><span class="gr">${gradeHtml(i.grade)}</span><br><span class="nm">${esc(i.name)}</span></span>${i.release !== '기본' ? `<span class="rel">${esc(i.release === '상시' ? '' : i.release)}</span>` : ''}</button>`; }).join('')}
            </div>
            <div class="serif" style="font-size:19px;font-weight:700">${gradeHtml(idt.grade)} ${esc(idt.name)}</div>
            <div class="small dim mono" style="margin:2px 0 8px">${esc(idt.aff)} · ${esc(idt.release)} · HP ${maxHp(cid, opts.level || S.level)} (LV ${opts.level || S.level}) · 흐트러짐 ${idt.grade === 1 ? '75 / 50 / 25%' : idt.grade === 2 ? '66 / 33%' : '50%'}</div>
            <div class="res-row">${resHtml(idt.res)}</div>
            <table class="skill-table" style="margin-top:12px">
              <thead><tr><th>SLOT</th><th>스킬</th><th>유형</th><th>죄악</th><th>코인</th><th>위력</th></tr></thead>
              <tbody>${idt.skills.map((s) => `<tr><td class="slot">${s.slot === 'D' ? '수비' : s.slot + '스킬'}</td><td class="nm">${esc(s.name)}</td><td>${s.type ? esc(s.type) : '<span class="pending">—</span>'}</td><td>${sinChip(s.sin)}</td><td>${s.coins ?? '<span class="pending">—</span>'}</td><td>${s.base != null ? `${s.base} <span class="dim">+${s.cp}</span>` : '<span class="pending">—</span>'}</td></tr>`).join('')}</tbody>
            </table>
            ${idt.detail ? '' : `<p class="tiny dim mono" style="margin-top:6px">— 표시 수치는 2단계(전투 엔진)에서 인격 목록 문서로 채웁니다. 죄악·슬롯은 이벤트 판정에 그대로 쓰입니다.</p>`}
            <div class="rule" style="margin:18px 0 12px"></div>
            <span class="label">E.G.O. · 등급별 1개</span>
            <div class="ego-slots" style="margin-top:8px">
              ${D.EGO_GRADES.map((g) => {
                const opts2 = ownedEgos(cid).filter((e) => e.grade === g);
                return `<div class="ego-slot"><div class="eg-h"><span>${g.toUpperCase()}</span><span>SP ${D.EGO_SP[g]}</span></div><div class="eg-opts">
                  ${opts2.length ? opts2.map((e) => `<button class="ego-opt ${pk.egos[g] === e.id ? 'on' : ''}" data-ego="${e.id}" data-g="${g}" ${readOnly ? 'disabled' : ''}><img src="${e.img}" alt="" loading="lazy"><span>${esc(e.name)}</span></button>`).join('') + (g !== 'Zayin' && !readOnly ? `<button class="btn sm ghost" data-unequip="${g}" ${pk.egos[g] ? '' : 'disabled'}>비우기</button>` : '')
                  : `<div class="ego-none">보유 E.G.O. 없음</div>`}
                </div></div>`;
              }).join('')}
            </div>
            <div class="ego-detail" id="ego-detail">${egoDetail(EGO[pk.egos.Zayin])}</div>
          </div>
        </div>`;
      body.querySelectorAll('.id-opt').forEach((b) => b.addEventListener('click', () => { pk.identity = b.dataset.id; paint(d); opts.onChange?.(); }));
      body.querySelectorAll('.ego-opt').forEach((b) => {
        b.addEventListener('pointerenter', () => { $('#ego-detail').innerHTML = egoDetail(EGO[b.dataset.ego]); });
        b.addEventListener('click', () => { pk.egos[b.dataset.g] = b.dataset.ego; paint(d); $('#ego-detail').innerHTML = egoDetail(EGO[b.dataset.ego]); opts.onChange?.(); });
      });
      body.querySelectorAll('[data-unequip]').forEach((b) => b.addEventListener('click', () => { delete pk.egos[b.dataset.unequip]; paint(d); opts.onChange?.(); }));
    };
    drawer(`No.${pad2(c.no)} ${esc(c.name)}`, readOnly ? 'IDENTITY · 보기' : 'IDENTITY · E.G.O. 선택', '', {
      foot: readOnly ? '' : `<button class="btn primary" data-done>확인</button>`,
      onMount: (d, close) => {
        paint(d);
        d.querySelector('[data-done]')?.addEventListener('click', close);
        d._onClose = () => { if (!readOnly && currentView === 'setup') { paintRoster(); paintOrder(); } };
      }
    });
  }
  function egoDetail(e) {
    if (!e) return '<span class="dim">E.G.O.를 고르세요</span>';
    return `<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap"><b class="serif" style="font-size:15px">${esc(e.name)}</b>${e.sub ? `<span class="dim small">${esc(e.sub)}</span>` : ''}<span class="mono tiny brass">${e.grade.toUpperCase()} · SP ${D.EGO_SP[e.grade]}</span>${e.base ? '<span class="mono tiny dim">BASE</span>' : `<span class="mono tiny dim">${esc(e.src)}</span>`}</div>
      <div class="small">${esc(e.type)} · ${sinChip(e.sin)} · 코인 ${e.coins} · 위력 ${e.pw} <span class="dim">+${e.cp}</span> · 가중치 ${e.weight}${e.cond ? ` · <span class="brass">조건: ${esc(e.cond)}</span>` : ''}</div>
      <div class="small ink2">${esc(e.fx)}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">${Object.entries(e.cost).map(([s, n]) => sinChip(s, ` ×${n}`)).join('')}</div>`;
  }

  function startRun() {
    const party = {};
    CHAR_IDS.forEach((cid) => {
      const pk = draft.picks[cid];
      party[cid] = { identity: pk.identity, egos: clone(pk.egos), hp: maxHp(cid, S.level), sp: 0, dead: false };
    });
    run = {
      v: 1, level: S.level, an: R.startAn, floor: 1, order: draft.order.slice(), party, gifts: [], nextCheck: 0, sins: {},
      eventsSeen: [], map: genMap(1), shops: {}, pending: null,
      stats: { battles: 0, events: 0, floors: 0, madness: 0, an: 0 }, started: Date.now(), saved: Date.now()
    };
    draft = null; save();
    floorIntro();
  }

  /* =====================================================================
     지도 생성 (진행기획 3-4)
     ===================================================================== */
  /* 이 층의 보스 (층마다 무작위 · 예전 저장 기록은 테마 기본 보스) */
  function floorBoss(m) { const th = THEME[m.theme]; const id = m.boss || th.bossFoe; const f = foeById(id); return { id, name: f ? f.name : th.boss, f }; }
  function genMap(floor, prevBoss) {
    const L = rnd(R.floorLen[0], R.floorLen[1]);
    const theme = pick(D.THEMES);
    const stages = [];
    for (let s = 1; s <= L; s++) {
      let list;
      if (s === L) list = [{ type: 'boss' }];
      else if (s === L - 1) list = [{ type: 'shop' }];
      else list = Array.from({ length: rnd(R.nodesPerStage[0], R.nodesPerStage[1]) }, () => ({ type: Math.random() < R.battleRate ? 'battle' : 'event' }));
      const n = list.length;
      list.forEach((nd, i) => {
        nd.id = `s${s}n${i}`; nd.stage = s; nd.next = [];
        nd.y = n === 1 ? 0.5 : 0.16 + i * (0.68 / (n - 1)) + (Math.random() - 0.5) * 0.07;
      });
      stages.push(list);
    }
    for (let s = 0; s < L - 1; s++) linkStages(stages[s], stages[s + 1]);
    const bp = (theme.bossFoes || [theme.bossFoe]).filter((id) => id && foeById(id));
    /* 1층은 무작위, 그다음 층부터는 보스를 번갈아 → 한 번의 던전 안에서 1:1 */
    const pi = bp.indexOf(prevBoss || '');
    const boss = !bp.length ? theme.bossFoe : (prevBoss && floor > 1) ? bp[(Math.max(pi, -1) + 1) % bp.length] : pick(bp);
    return { floor, len: L, theme: theme.id, boss, stages, cur: null, visited: [] };
  }
  // 교차 없는 계단식 연결 → 모든 칸이 들어오는/나가는 선을 1개 이상 가짐
  function linkStages(A, B) {
    const edges = [];
    const add = (i, j) => { if (!edges.some(([a, b]) => a === i && b === j)) edges.push([i, j]); };
    let i = 0, j = 0; add(0, 0);
    while (i < A.length - 1 || j < B.length - 1) {
      if (i === A.length - 1) j++;
      else if (j === B.length - 1) i++;
      else { const r = Math.random(); if (r < 0.38) i++; else if (r < 0.76) j++; else { i++; j++; } }
      add(i, j);
    }
    // 갈림길 보강: 나가는 선이 1개뿐인 칸에 교차하지 않는 선을 하나 더 (최대 2개)
    const cross = (a, b, c, d) => (a < c && b > d) || (a > c && b < d);
    A.forEach((_, ai) => {
      const outs = edges.filter(([a]) => a === ai);
      if (outs.length !== 1 || B.length < 2 || Math.random() < 0.25) return;
      const bj = outs[0][1];
      for (const cand of shuffle([bj - 1, bj + 1])) {
        if (cand < 0 || cand >= B.length) continue;
        if (!edges.some(([a, b]) => cross(ai, cand, a, b))) { add(ai, cand); break; }
      }
    });
    edges.forEach(([a, b]) => A[a].next.push(B[b].id));
  }
  const nodeById = (id) => run.map.stages.flat().find((n) => n.id === id);
  function reachable() {
    const m = run.map;
    if (!m.cur) return m.stages[0].map((n) => n.id);
    return nodeById(m.cur).next.slice();
  }

  /* 층 시작 연출 */
  function floorIntro() {
    const th = THEME[run.map.theme];
    show('center', `<div class="banner">
      <span class="label">FLOOR ${pad2(run.floor)} / ${pad2(R.floors)}</span>
      <div class="big">FLOOR ${run.floor}</div>
      <div class="sub">${esc(th.name)} · ${run.map.len}칸 · 보스 ${esc(floorBoss(run.map).name)}</div>
      <div class="reward-list">
        <div class="reward" style="animation-delay:.2s"><div class="k">HP</div><div class="v">MAX</div></div>
        <div class="reward" style="animation-delay:.32s"><div class="k">SP</div><div class="v">0</div></div>
        <div class="reward" style="animation-delay:.44s"><div class="k">AHN</div><div class="v">${run.an}</div></div>
      </div>
      <button class="btn primary lg" data-a="go">지도 열기 <span class="k">MAP</span></button></div>`, (v) => {
      v.querySelector('[data-a="go"]').onclick = renderMap;
    });
  }

  /* =====================================================================
     지도 화면
     ===================================================================== */
  const ICON = {
    battle: '<path class="ico" d="M-7 -7 L7 7 M7 -7 L-7 7 M-9 -3 L-3 -9 M9 -3 L3 -9 M-5 5 l-3 3 M5 5 l3 3"/>',
    event: '<path class="ico" d="M-10 0 Q0 -9 10 0 Q0 9 -10 0Z"/><circle class="ico-f" r="3"/>',
    shop: '<path class="ico" d="M-8 -2 H8 L6 9 H-6 Z M-4 -2 V-5 A4 4 0 0 1 4 -5 V-2"/><circle class="ico-f" cx="0" cy="3.5" r="1.6"/>',
    boss: '<path class="ico" d="M-11 12 V-1 A11 11 0 0 1 11 -1 V12"/><path class="ico-f" d="M0 -6 L1.8 -0.8 L7 0 L1.8 0.8 L0 6 L-1.8 0.8 L-7 0 L-1.8 -0.8Z"/>',
    start: '<path class="ico" d="M-7 9 V-1 A7 7 0 0 1 7 -1 V9 M-10 9 H10"/>'
  };
  const TYPE_LABEL = { battle: '전투', event: '이벤트', shop: '상점', boss: '보스', start: '시작' };
  function renderMap() {
    run.pending = null; save();
    const m = run.map; const open = reachable();
    const colW = 168, H = 470, padX = 80;
    const W = padX * 2 + m.len * colW;
    const X = (stage) => padX + stage * colW;
    const Y = (y) => 46 + y * (H - 92);
    const walked = new Set(); // 지나온 길
    const pathIds = ['start'].concat(m.visited);
    for (let k = 0; k < pathIds.length - 1; k++) walked.add(pathIds[k] + '>' + pathIds[k + 1]);
    let links = '';
    const curId = m.cur || 'start';
    const curStage = m.cur ? nodeById(m.cur).stage : 0;
    // 앞으로 갈 수 있는 칸 전체 (갈 수 없는 칸은 흐리게)
    const future = new Set(open); const q = open.slice();
    while (q.length) { const id = q.shift(); nodeById(id).next.forEach((x) => { if (!future.has(x)) { future.add(x); q.push(x); } }); }
    const linkPath = (x1, y1, x2, y2) => `M${x1} ${y1} C${x1 + colW * 0.5} ${y1}, ${x2 - colW * 0.5} ${y2}, ${x2} ${y2}`;
    // 시작 → 1단계
    m.stages[0].forEach((n) => {
      const k = 'start>' + n.id; const cls = walked.has(k) ? 'walked' : (!m.cur ? 'open' : 'dead');
      links += `<path class="link ${cls}" d="${linkPath(X(0), Y(0.5), X(1), Y(n.y))}"/>`;
    });
    m.stages.forEach((st) => st.forEach((n) => n.next.forEach((nid) => {
      const t = nodeById(nid); const k = n.id + '>' + nid;
      const cls = walked.has(k) ? 'walked' : (n.id === curId ? 'open' : (n.stage <= curStage || !future.has(nid) || !future.has(n.id) ? 'dead' : ''));
      links += `<path class="link ${cls}" d="${linkPath(X(n.stage), Y(n.y), X(t.stage), Y(t.y))}"/>`;
    })));
    const nodeSvg = (n) => {
      const isOpen = open.includes(n.id), vis = m.visited.includes(n.id), cur = m.cur === n.id;
      const dim = !vis && !future.has(n.id);
      const r = n.type === 'boss' ? 25 : n.type === 'shop' ? 21 : 19;
      return `<g class="node ${n.type} ${isOpen ? 'open' : ''} ${vis ? 'visited' : ''} ${cur ? 'cur' : ''} ${dim ? 'dim' : ''}" data-id="${n.id}" transform="translate(${X(n.stage)} ${Y(n.y)})" ${isOpen ? 'tabindex="0" role="button"' : ''} aria-label="${TYPE_LABEL[n.type]}">
        <circle class="halo" r="${r}"/><circle class="ring" r="${r}"/>${n.type === 'boss' ? `<circle class="ring" r="${r - 5}" style="fill:none"/>` : ''}
        <g transform="scale(${n.type === 'boss' ? 1.05 : 0.95})">${ICON[n.type]}</g>
        <text y="${r + 16}" text-anchor="middle">${TYPE_LABEL[n.type]}</text>
        ${cur ? `<path class="marker" d="M0 ${-r - 16} l-6 -10 h12z"/>` : ''}
      </g>`;
    };
    const cols = m.stages.map((st, i) => `<text class="col-lab" x="${X(i + 1)}" y="22" text-anchor="middle">[ ${pad2(i + 1)} ]</text>`).join('');
    const start = `<g class="node start ${m.cur ? 'visited' : 'cur'}" transform="translate(${X(0)} ${Y(0.5)})"><circle class="ring" r="18"/>${ICON.start}<text y="34" text-anchor="middle">시작</text></g>`;
    const svg = `<svg class="map-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMid meet">
      <text class="col-lab" x="${X(0)}" y="22" text-anchor="middle">[ IN ]</text>${cols}
      ${links}${start}${m.stages.flat().map(nodeSvg).join('')}</svg>`;
    const th = THEME[m.theme];
    const html = `
      <div class="map-head">
        <div><span class="label">MAP · ${esc(th.name)} · 보스 ${esc(floorBoss(m).name)}</span><h2>Floor ${run.floor}<small>${m.len}칸 · ${curStage}/${m.len} 진행</small></h2></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <div class="floor-steps">${Array.from({ length: R.floors }, (_, i) => `<i class="${i + 1 < run.floor ? 'done' : i + 1 === run.floor ? 'cur' : ''}"></i>`).join('')}</div>
          <div class="map-legend">${['battle', 'event', 'shop', 'boss'].map((t) => `<span><svg viewBox="-12 -12 24 24"><g class="node">${ICON[t]}</g></svg>${TYPE_LABEL[t]}</span>`).join('')}${run.nextCheck ? `<span class="brass mono tiny">다음 판정 +${run.nextCheck}</span>` : ''}</div>
        </div>
      </div>
      <div class="map-wrap" id="map-wrap" data-drag-scroll>${svg}</div>
      <div class="partybar" id="partybar"></div>`;
    show('map', html, (v) => {
      paintPartyBar();
      const wrap = $('#map-wrap', v);
      // 현재 위치가 보이도록 스크롤
      const sc = $('.map-svg', v).getBoundingClientRect().height / H;
      const target = X(curStage) * sc - wrap.clientWidth * 0.35; wrap.scrollLeft = Math.max(0, target);
      wrap.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && wrap.scrollWidth > wrap.clientWidth) { wrap.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
      wrap.addEventListener('click', (e) => { const g = e.target.closest('.node.open'); if (g) enterNode(g.dataset.id); });
      wrap.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const g = e.target.closest('.node.open'); if (g) enterNode(g.dataset.id); } });
      $('#partybar', v).addEventListener('click', () => openPartyDrawer(true));
    });
  }
  function paintPartyBar(highlight = []) {
    const bar = $('#partybar'); if (!bar) return;
    const act = activeIds();
    bar.innerHTML = run.order.map((cid, i) => {
      const c = CH[cid], p = P(cid), mh = maxHp(cid);
      return `<button class="pb ${act.includes(cid) ? 'act' : ''} ${p.dead ? 'dead' : ''} ${highlight.includes(cid) ? 'hit' : ''}" style="--cc:${charColor(c)}" data-tip-title="${esc(c.name)} · ${esc(IDT[p.identity].name)}" data-tip="HP ${p.hp} / ${mh} · SP ${p.sp}">
        <span class="ord">${pad2(i + 1)}</span><img src="${c.sym}" alt="">
        <span><span class="nm">${esc(c.short || c.name)}</span><span class="meta"><span>${p.hp}/${mh}</span><span class="sp ${p.sp > 0 ? 'pos' : p.sp < 0 ? 'neg' : ''}">SP ${p.sp > 0 ? '+' : ''}${p.sp}</span></span>
        <div class="bar hp ${p.hp / mh < 0.3 ? 'low' : ''}"><i style="width:${(p.hp / mh) * 100}%"></i></div></span></button>`;
    }).join('');
  }

  function enterNode(id) {
    const n = nodeById(id); const m = run.map;
    if (!reachable().includes(id)) return;
    m.cur = id; m.visited.push(id);
    if (n.type === 'battle' || n.type === 'boss') {
      const th = THEME[m.theme], boss = n.type === 'boss';
      const G = window.MD_FOE_GROUPS || [];
      const pool = (th.groups || []).map((g) => G.find((x) => x.id === g)).filter((g) => g && g.foes.every(([id]) => foeById(id)));
      if (!boss && pool.length) {
        const g = pick(pool);
        const group = g.foes.map(([id, n]) => ({ foeId: id, count: Array.isArray(n) ? n[0] + Math.floor(Math.random() * (n[1] - n[0] + 1)) : n }));
        const total = group.reduce((a, x) => a + x.count, 0);
        const nm = group.length === 1 ? `${g.name.replace(/\s*×\d+$/, '')} ×${total}` : g.name;
        return beginBattle({ src: 'node', boss: false, group, groupId: g.id, foeId: group[0].foeId, count: total, name: nm });
      }
      const fid = boss ? floorBoss(m).id : pick(th.enemies);
      const f = foeById(fid);
      const count = f ? f.group[0] + Math.floor(Math.random() * (f.group[1] - f.group[0] + 1)) : 1;
      return beginBattle({ src: 'node', boss, foeId: fid, count, name: f ? `${f.title}${f.name !== f.title ? ' ' + f.name : ''}${count > 1 ? ` ×${count}` : ''}${boss ? ' (보스)' : ''}` : `${floorBoss(m).name} (보스)` });
    }
    if (n.type === 'event') {
      const pool = THEME[m.theme].events.filter((e) => !run.eventsSeen.includes(e));
      const evId = pick(pool.length ? pool : THEME[m.theme].events);
      if (!pool.length) run.eventsSeen = [];
      run.eventsSeen.push(evId);
      run.pending = { kind: 'event', id: evId, phase: 'choose' }; save();
      return renderEvent();
    }
    if (n.type === 'shop') {
      const key = `${run.floor}:${id}`;
      if (!run.shops[key]) run.shops[key] = { track: stockGifts([]), sold: [] };
      run.pending = { kind: 'shop', key }; save();
      return renderShop();
    }
  }

  /* =====================================================================
     이벤트
     ===================================================================== */
  function eventEmblem() {
    return `<svg class="emblem" viewBox="0 0 300 300" aria-hidden="true">
      <circle class="draw" pathLength="1" cx="150" cy="150" r="128" fill="none" stroke="currentColor" stroke-width="1"/>
      <circle cx="150" cy="150" r="106" fill="none" stroke="currentColor" stroke-dasharray="2 6" opacity=".6"/>
      <path class="draw" pathLength="1" d="M92 250 V140 A58 58 0 0 1 208 140 V250" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <path class="draw" pathLength="1" d="M150 96 L136 150 L162 172 L144 214 L156 250" fill="none" stroke="var(--accent)" stroke-width="1.4"/>
      <path class="draw" pathLength="1" d="M136 150 L108 168 M162 172 L196 160" fill="none" stroke="currentColor" stroke-width="1" opacity=".7"/>
      <path d="M150 60 l4 12 12 4-12 4-4 12-4-12-12-4 12-4z" fill="currentColor"/>
    </svg>`;
  }
  async function renderEvent() {
    const pd = run.pending; const ev = EVT[pd.id];
    const html = `
      <div class="ev-art hatch">
        <div class="code"><span class="label">EVENT · ${esc(ev.id)}</span></div>
        ${eventEmblem()}
        <div class="abno mono tiny dim"><span>${ev.abno ? 'ABNORMALITY · ' + esc(ev.abno) : 'NO ENTITY DETECTED'}</span><span>FLOOR ${run.floor}</span></div>
      </div>
      <div class="ev-main" data-drag-scroll>
        <span class="label">LC-LOG / ${run.floor}-${esc(ev.id)}</span>
        <h2>${esc(ev.title)}</h2>
        <div class="ev-text" id="ev-text"></div>
        <div class="ev-choices" id="ev-choices"></div>
        <div id="ev-result"></div>
        <div class="partybar" id="partybar" style="padding:22px 0 0;margin-top:auto;grid-template-columns:repeat(5,minmax(0,1fr))"></div>
      </div>`;
    show('event', html, async (v) => {
      paintPartyBar();
      await typeText($('#ev-text', v), ev.text, pd.phase !== 'choose' || pd.typed);
      pd.typed = true; save();
      if (pd.phase === 'choose') paintChoices(ev);
      else paintEventResult(ev);
    });
  }
  async function typeText(el, text, instant) {
    if (instant || S.typeSpeed === 'off') { el.textContent = text; return; }
    const sp = S.typeSpeed === 'fast' ? 9 : 22;
    el.innerHTML = '<span></span><span class="caret"></span>';
    const span = el.firstChild; let skip = false;
    const onSkip = () => { skip = true; }; el.parentElement.addEventListener('click', onSkip, { once: true });
    for (let i = 0; i < text.length; i++) {
      if (skip) { span.textContent = text; break; }
      span.textContent += text[i]; await sleep(text[i] === '\n' ? sp * 8 : /[.,?!"]/.test(text[i]) ? sp * 4 : sp);
    }
    el.lastChild?.remove?.();
  }
  function rollersFor(sin) {
    return run.order.filter(alive).map((cid) => {
      const idt = IDT[P(cid).identity];
      const slots = idt.skills.filter((s) => s.sin === sin);
      if (!slots.length) return null;
      const best = slots.reduce((a, b) => (D.SLOT_DIE[b.slot] > D.SLOT_DIE[a.slot] ? b : a));
      return { cid, idt, slots, best, die: D.SLOT_DIE[best.slot] };
    }).filter(Boolean);
  }
  function paintChoices(ev) {
    const box = $('#ev-choices');
    box.innerHTML = ev.choices.map((ch, i) => {
      let tags = '', disabled = false;
      if (ch.check) {
        const rs = rollersFor(ch.check.sin); disabled = !rs.length;
        tags = `${sinChip(ch.check.sin, ` 판정 ${ch.check.dc}`)}${disabled ? '<span class="chip danger">판정 가능한 수감자 없음</span>' : ''}`;
      }
      if (ch.battle) tags = `<span class="chip tag-battle">전투 · ${esc(ch.battle.name)}</span>`;
      return `<button class="ev-choice" data-i="${i}" style="animation-delay:${0.08 * i}s" ${disabled ? 'disabled' : ''}>
        <span class="n">[ ${i + 1} ]</span><span class="t">${esc(ch.label)}${ch.note ? `<br><span class="tiny dim">${esc(ch.note)}</span>` : ''}</span><span class="tags">${tags}</span></button>`;
    }).join('');
    box.onclick = async (e) => {
      const b = e.target.closest('.ev-choice'); if (!b || b.disabled) return;
      const ch = ev.choices[+b.dataset.i];
      if (ch.check) {
        const res = await rollCheck(ch.check); if (!res) return;           // 취소
        const effects = res.success ? ch.success : ch.fail;
        await resolveEvent(ev, +b.dataset.i, { roll: res, effects });
      } else if (ch.battle) {
        box.querySelectorAll('button').forEach((x) => (x.disabled = true));
        if (ch.pre) await showPreLine(ch.pre);
        run.stats.events++;
        beginBattle({ src: 'event', eventId: ev.id, choice: +b.dataset.i, name: ch.battle.name, abno: true, win: ch.win });
      } else {
        await resolveEvent(ev, +b.dataset.i, { effects: ch.now });
      }
    };
  }
  async function showPreLine(text) {
    const r = $('#ev-result'); r.innerHTML = `<div class="ev-result"><ul class="fx-list"><li class="q">${esc(text)}</li></ul></div>`;
    await sleep(1300);
  }
  async function resolveEvent(ev, ci, { roll, effects }) {
    const lines = []; const gifts = [];
    if (roll) lines.push(`<li>${CH[roll.cid].name} — ${sinChip(roll.sin)} 판정 ${roll.total} / ${roll.dc} → <b class="${roll.success ? 'ok' : 'danger'}">${roll.success ? '성공' : '실패'}</b></li>`);
    for (const fx of effects) applyEffect(fx, lines, gifts, roll);
    run.stats.events++;
    run.pending = { kind: 'event', id: ev.id, phase: 'done', choice: ci, lines, gifts: gifts.map((g) => g.id), typed: true };
    save(); renderHud(true);
    paintEventResult(ev);
    for (const g of gifts) await giftPopup(g.gift, g.dup);
  }
  function paintEventResult(ev) {
    const pd = run.pending;
    const box = $('#ev-choices');
    if (box) box.innerHTML = `<div class="ev-choice" style="opacity:.6;animation:none;grid-template-columns:34px 1fr"><span class="n">[ ${pd.choice + 1} ]</span><span class="t">${esc(ev.choices[pd.choice].label)}</span></div>`;
    $('#ev-result').innerHTML = `<div class="ev-result"><span class="label">RESULT</span><ul class="fx-list" style="margin-top:8px">${pd.lines.join('')}</ul>
      <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn primary" data-a="cont">계속 <span class="k">CONTINUE</span></button></div></div>`;
    $('#ev-result [data-a="cont"]').onclick = () => { run.pending = null; save(); renderMap(); };
    paintPartyBarIfAny();
  }
  function paintPartyBarIfAny() { if ($('#partybar')) paintPartyBar(); }

  /* 효과 적용 — 표시 줄과 기프트 목록을 채움 */
  function applyEffect(fx, lines, gifts, roll) {
    if (fx.text) lines.push(`<li class="${fx.text.startsWith('"') ? 'q' : ''}">${esc(fx.text.replace(/^"|"$/g, ''))}</li>`);
    if (fx.an) { run.an += fx.an; run.stats.an += fx.an; lines.push(`<li><b class="brass">+${fx.an}안</b> 획득</li>`); }
    if (fx.gift) {
      const g = GIFT[fx.gift];
      if (run.gifts.includes(g.id)) { run.an += R.dupGiftAn; lines.push(`<li>이미 가진 <b>${esc(g.name)}</b> → 대신 <b class="brass">+${R.dupGiftAn}안</b></li>`); gifts.push({ id: g.id, gift: g, dup: true }); }
      else { run.gifts.push(g.id); lines.push(`<li>에고 기프트 <b class="brass">${esc(g.name)}</b> 획득</li>`); gifts.push({ id: g.id, gift: g, dup: false }); }
    }
    if (fx.sp) {
      const targets = run.order.filter(alive).filter((cid) => {
        const idt = IDT[P(cid).identity];
        if (fx.who === 'all') return true;
        const [k, sin] = fx.who.split(':');
        return k === 'noSin' ? !hasSin(idt, sin) : hasSin(idt, sin);
      });
      targets.forEach((cid) => { P(cid).sp = clamp(P(cid).sp + fx.sp, R.spMin, R.spMax); });
      const desc = fx.who === 'all' ? '아군 전원' : fx.who.startsWith('noSin') ? `${fx.who.split(':')[1]} 스킬이 없는 인격` : `${fx.who.split(':')[1]} 스킬 보유 인격`;
      lines.push(`<li>${desc} <b class="danger">SP ${fx.sp}</b> — ${targets.length ? targets.map((c) => CH[c].short || CH[c].name).join(', ') : '해당 없음'}</li>`);
    }
    if (fx.nextCheck) { run.nextCheck += fx.nextCheck; lines.push(`<li>다음 주사위 판정 <b class="ok">+${fx.nextCheck}</b></li>`); }
    if (fx.kill === 'roller' && roll) {
      const n = killChar(roll.cid);
      lines.push(`<li><b class="danger">${esc(CH[roll.cid].name)}</b> 이(가) 이 층에서 사망 — 다음 층에서 부활${n.length ? ` · 출전 중 생존 아군 SP ${R.deathSp}` : ''}</li>`);
    }
  }
  function killChar(cid) {
    const wasActive = activeIds().includes(cid);
    const p = P(cid); p.dead = true; p.hp = 0;
    // 출전 중(전투 5인) 생존 아군 SP −10  (확정: 이벤트 사망도 같은 규칙)
    const others = wasActive ? activeIds().filter((c) => c !== cid) : [];
    others.forEach((c) => { P(c).sp = clamp(P(c).sp + R.deathSp, R.spMin, R.spMax); });
    return others;
  }

  /* 죄악 판정 — 굴릴 수감자 고르기 → 주사위 */
  function rollCheck(check) {
    const rs = rollersFor(check.sin).sort((a, b) => b.die - a.die);
    const top = rs[0]?.die;
    return modal({
      label: `CHECK · ${D.SINS[check.sin].en}`, wide: true, dismiss: true,
      title: `${sinChip(check.sin)} 판정 — <b>${check.dc}</b> 이상`,
      body: `<p>${esc(check.sin)} 스킬을 가진 수감자 중 한 명이 굴립니다. <span class="mono small">2d6 + 슬롯 주사위 (1스킬 d4 · 2스킬/수비 d6 · 3스킬 d8)</span>${run.nextCheck ? ` <b class="ok">· 보너스 +${run.nextCheck}</b>` : ''}</p>
        <div class="roller-list">${rs.map((r) => `<button class="roller ${r.die === top ? 'best' : ''}" data-cid="${r.cid}" style="--cc:${charColor(CH[r.cid])}">
          ${r.die === top ? '<span class="rec">추천</span>' : ''}<img src="${CH[r.cid].sym}" alt="">
          <span><b>${esc(CH[r.cid].name)}</b><br><span class="small dim">${r.best.slot === 'D' ? '수비' : r.best.slot + '스킬'} ${esc(r.best.name)}</span><br><span class="mono small">2d6 + d${r.die}</span></span></button>`).join('')}</div>
        <div id="dice-area"></div>`,
      buttons: [{ label: '취소', value: null, cls: 'ghost' }],
      onMount: (m, close) => {
        m.querySelectorAll('.roller').forEach((b) => b.addEventListener('click', async () => {
          m.querySelectorAll('.roller, .mb-foot button').forEach((x) => (x.disabled = true));
          m.querySelector('.modal-veil').style.pointerEvents = 'none'; m._close = null;
          const r = rs.find((x) => x.cid === b.dataset.cid);
          const res = await animateDice(m.querySelector('#dice-area'), r, check);
          await sleep(1300);
          close(res);
        }));
      }
    });
  }
  function dieSvg(sides) {
    if (sides === 4) return '<svg viewBox="0 0 74 74"><path class="shape" d="M37 6 L69 64 H5 Z"/></svg>';
    if (sides === 8) return '<svg viewBox="0 0 74 74"><path class="shape" d="M37 3 L68 37 L37 71 L6 37 Z"/><path d="M6 37 H68" stroke="var(--line-2)" stroke-width="1"/></svg>';
    return '<svg viewBox="0 0 74 74"><rect class="shape" x="7" y="7" width="60" height="60" rx="10"/></svg>';
  }
  async function animateDice(area, r, check) {
    const bonus = run.nextCheck;
    const vals = [rnd(1, 6), rnd(1, 6), rnd(1, r.die)];
    const total = vals[0] + vals[1] + vals[2] + bonus;
    const sides = [6, 6, r.die];
    area.innerHTML = `<div class="dice-stage">${sides.map((s, i) => `<div class="die ${i === 2 ? 'slot' : ''} roll" style="--c:${sinVar(check.sin)}">${dieSvg(s)}<b>?</b><small>D${s}</small></div>`).join('')}</div>
      <div class="dice-total" id="dt">ROLLING…</div>`;
    const dice = [...area.querySelectorAll('.die')];
    const spin = setInterval(() => dice.forEach((d, i) => { if (d.classList.contains('roll')) d.querySelector('b').textContent = rnd(1, sides[i]); }), 70);
    for (let i = 0; i < 3; i++) { await sleep(i === 0 ? 700 : 380); dice[i].classList.remove('roll'); dice[i].classList.add('land'); dice[i].querySelector('b').textContent = vals[i]; }
    clearInterval(spin);
    const success = total >= check.dc;
    area.querySelector('#dt').innerHTML = `${vals.join(' + ')}${bonus ? ` + <span class="ok">${bonus}</span>` : ''} = <b>${total}</b> / ${check.dc}`;
    area.insertAdjacentHTML('beforeend', `<div class="verdict ${success ? 's' : 'f'}">${success ? 'SUCCESS' : 'FAILURE'}</div>`);
    run.nextCheck = 0;
    return { cid: r.cid, sin: check.sin, dc: check.dc, vals, bonus, total, success };
  }

  /* 기프트 획득 팝업 */
  function giftPopup(g, dup) {
    return modal({
      body: `<div class="gift-pop"><span class="label">${dup ? 'DUPLICATE' : 'E.G.O. GIFT ACQUIRED'}</span>
        <div class="gp-art">${giftArt(g)}</div><h3>${esc(g.name)}</h3><p>${esc(g.fx)}</p>
        ${dup ? `<div class="dup">이미 보유한 기프트 → <b>${R.dupGiftAn}안</b>으로 받았습니다</div>` : `<div class="mono tiny dim" style="margin-top:10px">${esc(g.kw)}</div>`}</div>`,
      buttons: [{ label: '확인', cls: 'primary', value: true }]
    }).then((v) => { renderHud(true); const ico = $$('#hud-gifts .gift-ico').pop(); if (ico && !dup) { ico.classList.add('new'); giftScrollEnd(); } return v; });
  }

  /* =====================================================================
     상점
     ===================================================================== */
  function stockGifts(exclude) {
    const pool = D.GIFTS.filter((g) => g.shop && !run.gifts.includes(g.id));
    const fresh = shuffle(pool.filter((g) => !exclude.includes(g.id)));
    const rest = shuffle(pool.filter((g) => exclude.includes(g.id)));
    return fresh.concat(rest).slice(0, D.SHOP.giftTrack).map((g) => g.id);
  }
  function renderShop() {
    const sh = run.shops[run.pending.key];
    const SV = D.SHOP;
    const deadN = run.order.filter((c) => P(c).dead).length;
    const hurtN = run.order.filter((c) => alive(c) && P(c).hp < maxHp(c)).length;
    const html = `
      <div class="shop-main" data-drag-scroll>
        <span class="label">SHOP · 층 ${run.floor} · 보스 앞 마지막 칸</span>
        <h2>상점</h2>
        <p class="small dim" style="margin:0">아직 가지지 않은 에고 기프트가 매대에 ${SV.giftTrack}개 올라옵니다. 새로 고침하면 ${SV.giftTrack}개가 새로 바뀝니다.</p>
        <div class="shelf" id="shelf">
          ${sh.track.length ? sh.track.map((id, i) => {
            const g = GIFT[id]; const sold = sh.sold.includes(id) || run.gifts.includes(id);
            return `<button class="ware ${sold ? 'sold' : ''}" data-g="${id}" style="animation-delay:${i * 0.06}s" ${sold ? 'disabled' : ''}>
              <div class="w-img">${giftArt(g)}</div>
              <div class="w-body"><h4>${esc(g.name)}</h4><p>${esc(g.fx)}</p>
                <div class="w-foot"><span class="mono tiny dim">${esc(g.kw)}</span><span class="price ${run.an < g.shop ? 'short' : ''}">${g.shop}<i>안</i></span></div></div></button>`;
          }).join('') : '<div class="notice">살 수 있는 기프트가 더 없습니다.</div>'}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
          <button class="btn brass" data-a="refresh" ${run.an < SV.refresh ? 'disabled' : ''}>새로 고침 <span class="price" style="font-size:16px">${SV.refresh}<i>안</i></span></button>
          <button class="btn primary lg" data-a="leave">상점 나가기 → 보스</button>
        </div>
      </div>
      <aside class="shop-side" data-drag-scroll>
        <span class="label">SERVICE · 수감자 관리</span>
        <button class="svc" data-a="swap"><b>인격 교체</b><span class="price">${SV.swap[1]}~${SV.swap[3]}<i>안</i></span><small>ɵ ${SV.swap[1]} · ɵɵ ${SV.swap[2]} · ɵɵɵ ${SV.swap[3]}안</small></button>
        <button class="svc" data-a="ego"><b>E.G.O. 새로 장착</b><span class="price">${SV.egoEquip}<i>안</i></span><small>등급 관계없이</small></button>
        <button class="svc" data-a="heal" ${hurtN ? '' : 'disabled'}><b>지정 대상 치료</b><span class="price">${SV.healOne}<i>안</i></span><small>한 명 HP 최대치까지 · 부상 ${hurtN}명</small></button>
        <button class="svc" data-a="healall" ${hurtN ? '' : 'disabled'}><b>전체 치료</b><span class="price">${SV.healAll}<i>안</i></span><small>생존 아군 전원 HP 최대치</small></button>
        <button class="svc" data-a="revive" ${deadN ? '' : 'disabled'}><b>죽은 아군 부활</b><span class="price">${SV.revive}<i>안</i></span><small>사망 ${deadN}명 · HP 최대치로</small></button>
        <div class="shopkeeper">— 거울 너머에서도 장사는 계속됩니다. 남은 안은 이 층을 나가도 그대로예요.</div>
        <div class="partybar" id="partybar" style="grid-template-columns:repeat(2,minmax(0,1fr));padding:0"></div>
      </aside>`;
    show('shop', html, (v) => {
      paintPartyBar();
      v.addEventListener('click', async (e) => {
        const ware = e.target.closest('.ware'); const a = e.target.closest('[data-a]')?.dataset.a;
        if (ware && !ware.disabled) return buyGift(sh, ware.dataset.g);
        if (a === 'refresh') { if (!pay(SV.refresh)) return; sh.track = stockGifts(sh.track); sh.sold = []; save(); toast('매대를 새로 고쳤습니다.'); renderShop(); }
        if (a === 'leave') { run.pending = null; save(); renderMap(); }
        if (a === 'heal') shopHeal();
        if (a === 'healall') { if (!pay(SV.healAll)) return; run.order.filter(alive).forEach((c) => (P(c).hp = maxHp(c))); save(); toast('생존 아군 전원을 치료했습니다.', 'gold'); renderShop(); }
        if (a === 'revive') shopRevive();
        if (a === 'swap') shopSwap();
        if (a === 'ego') shopEgo();
      });
    });
  }
  function pay(n) {
    if (run.an < n) { toast(`안이 부족합니다 (${run.an} / ${n})`, 'warn'); return false; }
    run.an -= n; renderHud(true); return true;
  }
  async function buyGift(sh, id) {
    const g = GIFT[id];
    const short = run.an < g.shop;
    const ok = await modal({
      label: 'PURCHASE · 구입 확인', title: esc(g.name),
      body: `<div class="buy-conf">
        <div class="bc-art">${giftArt(g)}</div>
        <div class="bc-body">
          <span class="mono tiny dim">${esc(g.kw || 'E.G.O. GIFT')}</span>
          <p class="bc-fx">${esc(g.fx)}</p>
          <div class="bc-ledger">
            <div><span>보유</span><b>${run.an}<i>안</i></b></div>
            <div class="minus"><span>가격</span><b>− ${g.shop}<i>안</i></b></div>
            <div class="after ${short ? 'short' : ''}"><span>구입 후</span><b>${short ? '부족' : run.an - g.shop}${short ? '' : '<i>안</i>'}</b></div>
          </div>
          ${short ? `<p class="bc-warn">안이 ${g.shop - run.an} 모자랍니다.</p>` : ''}
        </div></div>`,
      buttons: [{ label: '← 뒤로', value: false, cls: 'ghost' }, { label: `구입 · ${g.shop}안`, value: true, cls: 'primary', disabled: short }]
    });
    if (!ok) return;
    if (!pay(g.shop)) return;
    run.gifts.push(id); sh.sold.push(id); save();
    await giftPopup(g, false); renderShop();
  }
  function pickChar(title, filter, sub) {
    return modal({
      label: 'SELECT', title, wide: true,
      body: `<div class="pick-list">${run.order.map((cid) => { const c = CH[cid], p = P(cid); const ok = filter(cid);
        return `<button class="pick" data-cid="${cid}" style="--cc:${charColor(c)}" ${ok ? '' : 'disabled'}><img src="${c.sym}" alt=""><span><b>${esc(c.short || c.name)}</b><br><span class="s">${sub ? sub(cid) : `HP ${p.hp}/${maxHp(cid)}`}</span></span></button>`; }).join('')}</div>`,
      buttons: [{ label: '취소', value: null, cls: 'ghost' }],
      onMount: (m, close) => m.querySelectorAll('.pick').forEach((b) => b.addEventListener('click', () => close(b.dataset.cid)))
    });
  }
  async function shopHeal() {
    const cid = await pickChar('치료할 수감자', (c) => alive(c) && P(c).hp < maxHp(c)); if (!cid) return;
    if (!pay(D.SHOP.healOne)) return; P(cid).hp = maxHp(cid); save(); toast(`${CH[cid].name} 치료 완료`, 'gold'); renderShop();
  }
  async function shopRevive() {
    const cid = await pickChar('부활할 수감자', (c) => P(c).dead, (c) => (P(c).dead ? '사망' : '생존')); if (!cid) return;
    if (!pay(D.SHOP.revive)) return; Object.assign(P(cid), { dead: false, hp: maxHp(cid) }); save(); toast(`${CH[cid].name} 부활`, 'gold'); renderShop();
  }
  async function shopSwap() {
    const cid = await pickChar('인격을 바꿀 수감자', (c) => ownedIds(c).length > 1, (c) => IDT[P(c).identity].name); if (!cid) return;
    const cur = P(cid).identity;
    const id = await modal({
      label: 'IDENTITY SWAP', title: `${esc(CH[cid].name)} — 인격 교체`, wide: true,
      body: `<div class="id-list">${ownedIds(cid).map((i) => `<button class="id-opt ${i.id === cur ? 'on' : ''}" data-id="${i.id}" ${i.id === cur ? 'disabled' : ''}><img src="${i.img}" alt=""><span><span class="gr">${gradeHtml(i.grade)}</span> <span class="price" style="font-size:15px">${D.SHOP.swap[i.grade]}<i>안</i></span><br><span class="nm">${esc(i.name)}</span></span></button>`).join('')}</div>`,
      buttons: [{ label: '취소', value: null, cls: 'ghost' }],
      onMount: (m, close) => m.querySelectorAll('.id-opt').forEach((b) => b.addEventListener('click', () => close(b.dataset.id)))
    });
    if (!id) return; if (!pay(D.SHOP.swap[IDT[id].grade])) return;
    P(cid).identity = id; save(); toast(`${CH[cid].name} → ${IDT[id].name}`, 'gold'); renderShop();
  }
  async function shopEgo() {
    const cid = await pickChar('E.G.O.를 장착할 수감자', (c) => ownedEgos(c).some((e) => P(c).egos[e.grade] !== e.id), (c) => `장착 ${Object.keys(P(c).egos).length}개`); if (!cid) return;
    const id = await modal({
      label: 'E.G.O. EQUIP', title: `${esc(CH[cid].name)} — E.G.O. 장착`, wide: true,
      body: `<p>같은 등급은 하나만 장착됩니다. 이미 그 등급에 장착한 E.G.O.가 있으면 바뀝니다.</p><div class="ego-slots" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${ownedEgos(cid).map((e) => {
        const on = P(cid).egos[e.grade] === e.id;
        return `<div class="ego-slot"><div class="eg-h"><span>${e.grade.toUpperCase()}</span><span>${on ? '장착 중' : ''}</span></div><div class="eg-opts"><button class="ego-opt ${on ? 'on' : ''}" data-ego="${e.id}" ${on ? 'disabled' : ''}><img src="${e.img}" alt=""><span>${esc(e.name)}</span></button><div class="tiny ink2">${esc(e.fx)}</div></div></div>`;
      }).join('')}</div>`,
      buttons: [{ label: '취소', value: null, cls: 'ghost' }],
      onMount: (m, close) => m.querySelectorAll('.ego-opt').forEach((b) => b.addEventListener('click', () => close(b.dataset.ego)))
    });
    if (!id) return; if (!pay(D.SHOP.egoEquip)) return;
    P(cid).egos[EGO[id].grade] = id; save(); toast(`${CH[cid].name} — ${EGO[id].name} 장착`, 'gold'); renderShop();
  }

  /* =====================================================================
     전투 (임시) — 승리 / 패배 버튼 + 사망 · 교대 테스트 도구
     ===================================================================== */
  function beginBattle(info) {
    const act = activeIds();
    const queue = run.order.filter(alive).filter((c) => !act.includes(c));
    run.pending = Object.assign({ kind: 'battle', deployed: act, queue, joined: [] }, info);
    const snap = clone(run); run.pending.snapshot = snap;          // 재도전용 — 전투 진입 직전 상태
    save(); renderBattle();
  }
  /* 전투 엔진(js/battle.js)에 넘기는 도구 모음 */
  const battleCtx = {
    get run() { return run; }, D, CH, IDT, GIFT, R, GRADE_MARK, maxHp, save, show, esc, charColor, toast, modal,
    battleWin: () => battleWin(), battleLose: (w) => battleLose(w), currentView: () => currentView, hud: () => renderHud()
  };
  function renderBattle() {
    const b = run.pending;
    if (window.MDBattle && window.MDBattle.canRun(b)) return window.MDBattle.render(battleCtx);
    const kindLabel = b.boss ? 'BOSS' : b.abno ? 'ABNORMALITY' : 'COMBAT';
    const human = b.foeId ? foeById(b.foeId) : null;
    const foe = human ? null : findFoe(b.name);
    const html = `
      <div class="bt-head">
        <div><span class="label">${kindLabel} · FLOOR ${run.floor}</span><h2>${esc(b.name)}</h2></div>
        <div class="notice">전투 엔진은 <b>2단계</b>에서 연결합니다. 지금은 아래 도구로 피해·사망을 시험하고 <b>승리 / 패배</b>로 결과를 정합니다.</div>
      </div>
      <div class="bt-field">
        <div class="bt-side" data-drag-scroll>
          <span class="label accent">ACTIVE · 전투 중 (${b.deployed.length}/${R.activeSlots})</span>
          <div class="bt-line" id="bt-line"></div>
          <span class="label" style="margin-top:6px">STANDBY · 교대 순서</span>
          <div class="bt-standby" id="bt-standby"></div>
        </div>
        <div class="bt-side enemy ${foe || human ? 'has-foe' : ''}" data-drag-scroll>
          ${human ? humanPanel(human, b.count || 1) : foe ? foePanel(foe) : `
          <svg class="enemy-sil" viewBox="0 0 200 240" aria-hidden="true">
            <path d="M100 18 L132 60 L120 62 L150 112 L128 110 L160 170 L118 158 L126 224 L100 196 L74 224 L82 158 L40 170 L72 110 L50 112 L80 62 L68 60 Z" fill="currentColor" opacity=".18" stroke="currentColor" stroke-width="1.4"/>
            <path d="M100 60 L108 98 L92 120 L106 150 L96 190" fill="none" stroke="currentColor" stroke-width="1.2"/>
            <circle cx="100" cy="84" r="5" fill="currentColor"/>
          </svg>
          <div class="serif" style="font-size:20px;font-weight:700">${esc(b.name)}</div>
          <div class="mono tiny dim">${b.boss ? '보스 데이터 대기' : b.abno ? '이벤트 환상체 · 수치 대기' : '적 데이터 대기'}</div>`}
          ${(() => { if (b.boss) return ''; const rw = b.abno ? (b.win || []).map((f) => (f.gift ? GIFT[f.gift].name : f.an ? f.an + '안' : '')).filter(Boolean).join(' + ') : R.rewardBattle + '안'; return rw ? `<div class="small ink2">승리 보상: ${rw}</div>` : ''; })()}
          ${b.boss ? `<div class="small ink2">승리 시 층 클리어 · ${R.rewardFloor}안 · 광기 ${R.madnessPerFloor}</div>` : ''}
        </div>
      </div>
      <div class="bt-foot">
        <button class="btn warn" data-a="lose">패배 처리 <span class="k">DEFEAT</span></button>
        <span class="mono tiny dim" style="flex:1">패배 조건: 출전한 아군 전멸 · 패배하면 전투 직전 상태로 재도전</span>
        <button class="btn primary lg" data-a="win">승리 처리 <span class="k">VICTORY</span></button>
      </div>`;
    show('battle', html, (v) => {
      paintBattleUnits();
      v.addEventListener('click', (e) => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a === 'win') battleWin();
        if (a === 'lose') battleLose();
        const t = e.target.closest('[data-t]'); if (t) battleTool(t.dataset.cid, t.dataset.t);
      });
    });
  }
  /* 환상체 데이터 미리보기 (2단계 전투 엔진 전 — 표시만) */
  function foeById(id) { return (window.MD_FOES || []).find((f) => f.id === id) || null; }
  function findFoe(name) {
    const E = window.MD_ENEMIES || [], L = window.MD_ENEMY_LINK || {};
    const id = L[name]; return E.find((e) => e.id === id || e.name === name) || null;
  }
  const RES_TXT = (v) => (v >= 2 ? 'weak' : v <= 0.5 ? 'resist' : '');
  function foePanel(e) {
    const parts = e.parts.filter((pt) => !pt.monitor || pt.monitor === 'R').map((pt) => {
      const label = pt.monitor ? `모니터 R · G · B <span class="mono tiny dim">×3 · 수치 같음</span>` : esc(pt.name);
      const st = pt.stagger.length ? pt.stagger.join(' · ') : '없음';
      const res = ['참격', '관통', '타격'].map((k) => `<span class="rs ${RES_TXT(pt.res[k])}">${k[0]}<b>×${pt.res[k]}</b></span>`).join('');
      const sins = D.SIN_ORDER.filter((k) => pt.sin[k] !== 1).map((k) => `<span class="rs sin ${RES_TXT(pt.sin[k])}" style="--sc:var(--sin-${k})">${k}<b>×${pt.sin[k]}</b></span>`).join('');
      return `<div class="fp-part">
        <div class="fp-ph"><b>${label}</b>${pt.core ? '<span class="tag core">본체</span>' : ''}${pt.summoned ? '<span class="tag">소환</span>' : ''}${pt.breakable ? '<span class="tag">파괴됨</span>' : '<span class="tag">파괴 안 됨</span>'}<span class="mono tiny dim" style="margin-left:auto">HP ${pt.hp}</span></div>
        <div class="fp-bar"><i style="width:100%"></i>${pt.stagger.map((v) => `<em style="left:${(v / pt.hp) * 100}%"></em>`).join('')}</div>
        <div class="fp-meta mono tiny dim">속도 ${pt.speed[0] === pt.speed[1] ? pt.speed[0] : pt.speed.join('~')} · 방어도 ${pt.def} · 슬롯 ${pt.slots} · 흐트러짐 ${st}</div>
        <div class="fp-res">${res}${sins}</div>
        <div class="fp-skills">${pt.skills.map((k) => `<span class="sk" style="--sc:${D.SIN_ORDER.includes(k.sin) ? `var(--sin-${k.sin})` : 'var(--line-2)'}" data-tip-title="${esc(k.name)} · ${esc(k.type)} ${k.coins}코인 ${k.base}+${k.cp}" data-tip="${esc(k.fx.filter(Boolean).map((f, i) => `${i + 1}코인 ${f}`).join('\n') || '효과 없음')}${k.when ? esc('\n· ' + k.when) : ''}">${k.slot === 'ex' ? '◆ ' : ''}${esc(k.name)}</span>`).join('')}</div>
      </div>`;
    }).join('');
    return `<div class="fp-top">
        <div class="fp-img ${e.censor ? 'censor' : ''}">${e.censor ? '<span class="cz mono">MOSAIC</span>' : ''}${e.img ? `<img src="${e.img}" alt="${esc(e.name)}">` : `<span class="fp-noimg serif">${esc(e.name.slice(0, 1))}</span>`}</div>
        <div class="fp-id"><span class="mono tiny dim">${esc(e.kind)} · ${esc(e.code)} · Season ${e.season}</span><span class="risk r-${e.risk.toLowerCase()}">${e.risk}</span>
          <div class="serif fp-name">${esc(e.name)}</div>
          <div class="mono tiny dim">HP ${e.hp} · 전투 슬롯 ${e.slots} · 방어도 ${e.def} · ${e.kind === '환상체' ? 'SP 없음' : '통합 SP'}${e.count ? ` · ${e.count}체 등장` : ''}</div>
          <div class="fp-drops small"><span>E.G.O.</span> ${esc(e.ego)} <span>GIFT</span> ${esc(e.gift.name)}</div>
          ${e.note ? `<div class="mono tiny dim">${esc(e.note)}</div>` : ''}
        </div>
      </div>
      <div class="fp-parts">${parts}</div>
      <details class="fp-pass"><summary class="mono tiny">[ 패시브 ${e.passives.length} ]</summary>${e.passives.map((p) => `<p><b>${esc(p.name)}</b> ${esc(p.fx)}${p.site ? `<span class="site">${esc(p.site)}</span>` : ''}</p>`).join('')}</details>
      <div class="mono tiny dim" style="text-align:center">수치 미리보기 · 전투 엔진은 2단계에서 연결</div>`;
  }
  const CHECK_KEYS = ['육체', '기술', '설득', '의지'];
  function humanPanel(f, count = 1) {
    const grade = 'ɵ'.repeat(f.grade);
    const res = ['참격', '관통', '타격'].map((k) => `<span class="rs ${RES_TXT(f.res[k])}">${k[0]}<b>×${f.res[k]}</b></span>`).join('');
    const SL = { 1: '1스킬 ×3', 2: '2스킬 ×2', 3: '3스킬 ×1', def: '수비' };
    const skills = f.skills.map((k) => `<div class="hs-row" style="--sc:var(--sin-${k.sin})">
        <span class="mono tiny dim hs-slot">${SL[k.slot]}</span>
        <span class="hs-name" data-tip-title="${esc(k.name)} · ${esc(k.type)} ${k.coins}코인 ${k.base}+${k.cp}${k.weight && k.weight !== 1 ? ' · 가중치 ' + k.weight : ''}" data-tip="${esc(k.fx.map((x, i) => (x ? `${i + 1}코인 ${x}` : '')).filter(Boolean).join('\n') || '효과 없음')}">${esc(k.name)}</span>
        <span class="mono tiny hs-num">${k.type} · ${k.coins}c · ${k.base}+${k.cp}</span></div>`).join('');
    const checks = CHECK_KEYS.map((k) => `<div><span>${k}</span>${f.checks[k].length ? f.checks[k].map((x) => `<i style="--sc:var(--sin-${x})">${x}</i>`).join('') : '<em>—</em>'}</div>`).join('');
    return `<div class="fp-top">
        <div class="fp-img ${f.imgAlt && count > 1 ? 'pair' : ''}">${f.img ? `<img src="${f.img}" alt="${esc(f.name)}">` : `<span class="fp-noimg serif">${esc(f.name.slice(0, 1))}</span>`}${f.imgAlt && count > 1 ? `<img class="alt" src="${f.imgAlt}" alt="">` : ''}</div>
        <div class="fp-id"><span class="mono tiny dim">${esc(f.title)}</span><span class="risk human">${grade} · 동기화 ${esc(f.rank)}</span>
          <div class="serif fp-name">${esc(f.name)}</div>
          <div class="mono tiny dim">LV ${f.lv} · HP ${f.hp}${f.speed ? ' · 속도 ' + f.speed : ''} · 전투 슬롯 ${f.slots} · Season ${f.season}</div>
          <div class="fp-group">${Array.from({ length: count }, (_, i) => `<i>${String.fromCharCode(65 + i)}</i>`).join('')}<span>${count > 1 ? `${count}명 등장 · ${esc(window.MD_FOE_GRADE[f.grade].label)}` : '단일 등장'}</span></div>
          ${f.keywords.length ? `<div class="fp-kw">${f.keywords.map((k) => `<span class="tag">${esc(k)}</span>`).join('')}</div>` : ''}
        </div>
      </div>
      <div class="fp-part">
        <div class="fp-ph"><b>HP ${f.hp}</b>${count > 1 ? '<span class="mono tiny dim">· 1명당</span>' : ''}<span class="mono tiny dim" style="margin-left:auto">흐트러짐 ${f.stagger.join(' · ')}</span></div>
        <div class="fp-bar"><i style="width:100%"></i>${f.stagger.map((v) => `<em style="left:${(v / f.hp) * 100}%"></em>`).join('')}${f.winAt ? `<em class="win" style="left:${(f.winAt / f.hp) * 100}%"></em>` : ''}</div>
        ${f.winNote ? `<div class="fp-win small">◆ ${esc(f.winNote)}</div>` : ''}
        <div class="fp-res">${res}<span class="rs" style="opacity:.6">죄악 내성 없음 · SP 있음</span></div>
      </div>
      <div class="fp-part hs">${skills}</div>
      <div class="fp-checks"><span class="label">조사 판정 · 연출용</span>${checks}</div>
      ${f.note ? `<div class="mono tiny dim">${esc(f.note)}</div>` : ''}
      <div class="mono tiny dim" style="text-align:center">수치 미리보기 · 전투 엔진은 2단계에서 연결</div>`;
  }
  function paintBattleUnits() {
    const b = run.pending;
    $('#bt-line').innerHTML = b.deployed.map((cid) => {
      const c = CH[cid], p = P(cid), mh = maxHp(cid), idt = IDT[p.identity];
      return `<div class="bunit ${p.dead ? 'dead' : ''} ${b.joined.includes(cid) ? 'join' : ''}" style="--cc:${charColor(c)}">
        <div class="bu-img"><img src="${idt.img}" alt=""></div>
        <div class="bu-info"><b>${esc(c.short || c.name)}</b> <span class="mono tiny dim">${GRADE_MARK[idt.grade]}</span>
          <div class="mono tiny" style="display:flex;justify-content:space-between"><span>${p.hp}/${mh}</span><span class="sp ${p.sp > 0 ? 'pos' : p.sp < 0 ? 'neg' : ''}">SP ${p.sp}</span></div>
          <div class="bar hp ${p.hp / mh < 0.3 ? 'low' : ''}"><i style="width:${(p.hp / mh) * 100}%"></i></div>
          ${p.dead ? '<div class="mono tiny danger" style="margin-top:5px">K.I.A.</div>' : `<div class="bu-tools"><button data-cid="${cid}" data-t="hit">−20</button><button data-cid="${cid}" data-t="sp-">SP−</button><button data-cid="${cid}" data-t="sp+">SP+</button><button data-cid="${cid}" data-t="kill">사망</button></div>`}
        </div></div>`;
    }).join('');
    $('#bt-standby').innerHTML = b.queue.length ? b.queue.map((cid, i) => { const c = CH[cid], p = P(cid);
      return `<div class="pb" style="--cc:${charColor(c)}"><span class="ord">${pad2(i + 1)}</span><img src="${c.sym}" alt=""><span><span class="nm">${esc(c.short || c.name)}</span><span class="meta"><span>${p.hp}/${maxHp(cid)}</span><span>SP ${p.sp}</span></span></span></div>`; }).join('')
      : '<div class="mono tiny dim">대기 인원 없음</div>';
  }
  function battleTool(cid, t) {
    const b = run.pending, p = P(cid);
    if (t === 'sp-') p.sp = clamp(p.sp - 5, R.spMin, R.spMax);
    if (t === 'sp+') p.sp = clamp(p.sp + 5, R.spMin, R.spMax);
    if (t === 'hit') { p.hp = Math.max(0, p.hp - 20); if (p.hp === 0) return battleDeath(cid); }
    if (t === 'kill') return battleDeath(cid);
    save(); paintBattleUnits();
  }
  function battleDeath(cid) {
    const b = run.pending, p = P(cid);
    p.dead = true; p.hp = 0;
    b.deployed.filter((c) => c !== cid && alive(c)).forEach((c) => { P(c).sp = clamp(P(c).sp + R.deathSp, R.spMin, R.spMax); });
    toast(`${CH[cid].name} 사망 — 출전 중 생존 아군 SP ${R.deathSp}`, 'warn');
    // 대기 인원 교대
    const idx = b.deployed.indexOf(cid);
    if (b.queue.length) {
      const nx = b.queue.shift(); b.deployed[idx] = nx; b.joined = [nx];
      toast(`${CH[nx].name} 이(가) 대기열에서 전투에 들어왔습니다.`);
    }
    save(); paintBattleUnits();
    if (!b.deployed.some(alive)) { setTimeout(() => battleLose(true), 500); }
  }
  async function battleLose(wiped) {
    const b = run.pending;
    const v = await modal({
      label: 'DEFEAT', title: wiped ? '출전한 아군이 전멸했습니다' : '패배', dismiss: false,
      body: `<p>패배하면 <b>이 전투에 들어가기 직전 상태</b>로 되돌아가 재도전할 수 있습니다. HP · SP · 안 · 기프트가 모두 그 시점으로 돌아갑니다.</p>`,
      buttons: [{ label: '판 포기', value: 'quit', cls: 'warn' }, { label: '재도전', value: 'retry', cls: 'primary' }]
    });
    if (v === 'retry') {
      const snap = b.snapshot; run = clone(snap); run.pending.snapshot = clone(snap); save(); toast('전투 직전으로 돌아왔습니다.'); renderBattle();
    } else if (v === 'quit') { abandonRun(); }
  }
  async function battleWin() {
    const b = run.pending; run.stats.battles++;
    if (b.boss) {
      run.pending = { kind: 'floorclear' }; run.an += R.rewardFloor; run.stats.an += R.rewardFloor;
      const got = grantMadness(R.madnessPerFloor); run.stats.madness += got; run.stats.floors++;
      run.pending.madness = got; save(); return renderFloorClear();
    }
    const lines = []; const gifts = [];
    if (b.abno) (b.win || []).forEach((fx) => applyEffect(fx, lines, gifts));
    else { run.an += R.rewardBattle; run.stats.an += R.rewardBattle; lines.push(`<li><b class="brass">+${R.rewardBattle}안</b></li>`); }
    run.pending = { kind: 'reward', name: b.name, abno: !!b.abno, lines, gifts: gifts.map((g) => ({ id: g.id, dup: g.dup })), shown: false };
    save(); renderReward();
  }
  async function renderReward() {
    const pd = run.pending;
    show('center', `<div class="banner"><span class="label">${pd.abno ? 'ABNORMALITY SUPPRESSED' : 'COMBAT CLEAR'}</span>
      <div class="big">VICTORY</div><div class="sub">${esc(pd.name)}</div>
      <div class="ev-result" style="text-align:left;margin:26px auto;max-width:440px"><ul class="fx-list">${pd.lines.join('')}</ul></div>
      <button class="btn primary lg" data-a="go">지도로 <span class="k">MAP</span></button></div>`, async (v) => {
      renderHud(true);
      v.querySelector('[data-a="go"]').onclick = () => { run.pending = null; save(); renderMap(); };
      if (!pd.shown) { pd.shown = true; save(); for (const g of pd.gifts) await giftPopup(GIFT[g.id], g.dup); }
    });
  }

  /* 층 클리어 → 다음 층 / 5층 완료 */
  function renderFloorClear() {
    const pd = run.pending; const last = run.floor >= R.floors;
    const m = madness();
    show('center', `<div class="banner"><span class="label">FLOOR ${pad2(run.floor)} CLEAR</span>
      <div class="big">${last ? 'DUNGEON CLEAR' : 'FLOOR CLEAR'}</div>
      <div class="sub">${last ? '5개 층을 모두 돌파했습니다' : '다음 층으로 넘어가면 HP 최대 회복 · SP 0 · 사망한 아군 부활'}</div>
      <div class="reward-list">
        <div class="reward" style="animation-delay:.15s"><div class="k">AHN</div><div class="v">+${R.rewardFloor}</div></div>
        <div class="reward" style="animation-delay:.3s"><div class="k">MADNESS</div><div class="v">+${pd.madness}</div><div class="tiny dim mono">이번 주 ${m.earned} / ${R.madnessWeeklyCap}${pd.madness < R.madnessPerFloor ? ' · 상한 도달' : ''}</div></div>
      </div>
      <button class="btn primary lg" data-a="go">${last ? '결과 보기' : `FLOOR ${run.floor + 1}로`} <span class="k">NEXT</span></button></div>`, (v) => {
      renderHud(true);
      v.querySelector('[data-a="go"]').onclick = () => (last ? finishRun() : nextFloor());
    });
  }
  function nextFloor() {
    run.floor++;
    CHAR_IDS.forEach((cid) => Object.assign(P(cid), { hp: maxHp(cid), sp: 0, dead: false }));
    run.map = genMap(run.floor, run.map && (run.map.boss || THEME[run.map.theme].bossFoe)); run.pending = null; save();
    floorIntro();
  }
  function finishRun() {
    const st = run.stats, gifts = run.gifts.slice();
    wipeSave();                                   // 5층 클리어 시 세이브 삭제 (진행기획 7)
    hud.hidden = true;
    show('center', `<div class="banner"><span class="label">RUN COMPLETE · 세이브 삭제됨</span>
      <div class="big">Face the Sin</div><div class="sub">거울 던전 완주 — 다음 판은 인격 세팅부터 다시 1층</div>
      <div class="reward-list">
        <div class="reward"><div class="k">FLOORS</div><div class="v">${st.floors}</div></div>
        <div class="reward" style="animation-delay:.1s"><div class="k">BATTLES</div><div class="v">${st.battles}</div></div>
        <div class="reward" style="animation-delay:.2s"><div class="k">EVENTS</div><div class="v">${st.events}</div></div>
        <div class="reward" style="animation-delay:.3s"><div class="k">MADNESS</div><div class="v">+${st.madness}</div></div>
      </div>
      <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:24px">${gifts.map((id) => `<div class="gift-ico" data-tip-title="${esc(GIFT[id].name)}" data-tip="${esc(GIFT[id].fx)}">${giftArt(GIFT[id])}</div>`).join('')}</div>
      <button class="btn primary lg" data-a="title">타이틀로</button></div>`, (v) => {
      v.querySelector('[data-a="title"]').onclick = renderTitle;
    });
  }

  /* =====================================================================
     파티 · 기프트 · 설정 · 포기
     ===================================================================== */
  function openPartyDrawer(editable) {
    const body = `
      <p class="small dim" style="margin:0 0 10px">${editable ? '지도에서는 출전 순서를 끌어서 바꿀 수 있습니다. 앞의 5명(생존자 기준)이 다음 전투에 섭니다.' : '지금은 순서를 바꿀 수 없습니다 (지도 화면에서 가능).'}</p>
      <div class="id-layout" style="grid-template-columns:260px 1fr">
        <div><span class="label">ORDER</span><div class="order-list" id="p-order" style="margin-top:8px"></div></div>
        <div><span class="label">STATUS</span><div class="pick-list" id="p-stat" style="margin-top:8px;grid-template-columns:1fr"></div></div>
      </div>`;
    drawer('파티', `PARTY · LV ${run.level}`, body, {
      onMount: (d) => {
        const paint = () => {
          const ol = $('#p-order', d);
          if (editable) renderOrderList(ol, run.order, (o) => { run.order = o; save(); paintStat(); paintPartyBarIfAny(); }, (c) => P(c).dead);
          else ol.innerHTML = run.order.map((cid, i) => `<div class="order-row ${i < R.activeSlots ? 'act' : ''}" style="cursor:default"><span class="n">${pad2(i + 1)}</span><img src="${CH[cid].sym}" alt=""><span class="nm">${esc(CH[cid].name)}</span><span class="tag">${P(cid).dead ? 'K.I.A.' : ''}</span></div>`).join('');
          paintStat();
        };
        const paintStat = () => {
          const act = activeIds();
          $('#p-stat', d).innerHTML = run.order.map((cid) => {
            const c = CH[cid], p = P(cid), idt = IDT[p.identity], mh = maxHp(cid);
            return `<button class="pick" data-cid="${cid}" style="--cc:${charColor(c)};grid-template-columns:42px 1fr auto;${p.dead ? 'opacity:.5' : ''}"><img src="${c.sym}" alt="" style="width:42px;height:42px">
              <span><b>${esc(c.name)}</b> ${gradeHtml(idt.grade)} <span class="small ink2">${esc(idt.name)}</span><br>
              <span class="s">${Object.entries(p.egos).map(([g, e]) => `${g} ${EGO[e].name}`).join(' · ')}</span>
              <div class="bar hp ${p.hp / mh < 0.3 ? 'low' : ''}" style="margin-top:4px"><i style="width:${(p.hp / mh) * 100}%"></i></div></span>
              <span class="mono small" style="text-align:right">${p.dead ? '<span class="danger">K.I.A.</span>' : `${p.hp}/${mh}`}<br><span class="sp ${p.sp > 0 ? 'pos' : p.sp < 0 ? 'neg' : ''}">SP ${p.sp}</span><br><span class="tiny ${act.includes(cid) ? 'accent' : 'dim'}">${act.includes(cid) ? 'ACTIVE' : p.dead ? '' : 'STANDBY'}</span></span></button>`;
          }).join('');
          $$('#p-stat .pick', d).forEach((b) => b.addEventListener('click', () => {
            const cid = b.dataset.cid; const p = P(cid);
            openIdentityDrawer(cid, { readOnly: true, pk: { identity: p.identity, egos: p.egos }, level: run.level });
          }));
        };
        paint();
      }
    });
  }
  function openGiftDrawer() {
    drawer('에고 기프트', `E.G.O. GIFT · ${run.gifts.length}개 보유`, run.gifts.length
      ? `<div class="gift-grid">${run.gifts.map((id) => { const g = GIFT[id]; return `<div class="gift-row">${giftArt(g)}<div><h5>${esc(g.name)}</h5><p>${esc(g.fx)}</p><span class="mono tiny dim">${esc(g.kw)}${g.from ? ' · 이벤트 ' + g.from : ' · 상점'}</span></div></div>`; }).join('')}</div>`
      : '<div class="notice">아직 가진 기프트가 없습니다. 이벤트 · 환상체 전투 · 상점에서 얻을 수 있습니다.</div>');
  }
  function openSettings() {
    const inRun = !!run && currentView !== 'title';
    modal({
      label: 'SETTINGS', title: '환경 설정',
      body: `
        <div class="field"><label>테마</label><div class="seg" data-k="theme"><button data-v="dark">심야 단말기 (다크)</button><button data-v="light">양피지 서고 (라이트)</button></div></div>
        <div class="field"><label>이벤트 글자 출력</label><div class="seg" data-k="typeSpeed"><button data-v="normal">보통</button><button data-v="fast">빠르게</button><button data-v="off">바로 표시</button></div></div>
        <div class="field"><label>현재 레벨 (GM 설정)</label><div style="display:flex;gap:8px;align-items:center"><input class="num-in" type="number" min="1" max="99" value="${S.level}" id="lv-in"><small>스토리 1장당 +5 · 다음 판부터 적용${inRun ? ` (진행 중인 판은 LV ${run.level})` : ''}</small></div></div>
        <div class="field"><label>보유 인격 · E.G.O.</label><div class="seg" data-k="own"><button data-v="all">전체 보유 (테스트)</button><button data-v="base">기본 인격만</button></div><small>4단계에서 뽑기 기록(Firebase)과 연결합니다. 지금은 시험용 전환입니다.</small></div>
        <div class="rule"></div>
        <div class="field"><label>시험용</label><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm ghost" id="mad-reset">이번 주 광기 기록 0으로</button></div></div>`,
      buttons: [{ label: '닫기', cls: 'primary', value: true }],
      onMount: (m) => {
        m.querySelectorAll('.seg').forEach((seg) => {
          const k = seg.dataset.k; seg.querySelectorAll('button').forEach((b) => {
            b.classList.toggle('on', S[k] === b.dataset.v);
            b.onclick = () => {
              S[k] = b.dataset.v; saveSettings(); seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
              if (k === 'theme') { document.documentElement.dataset.theme = S.theme; rerender(); }
              if (k === 'own' && currentView === 'setup') renderSetup();
            };
          });
        });
        $('#lv-in', m).onchange = (e) => { S.level = clamp(parseInt(e.target.value, 10) || R.startLevel, 1, 99); e.target.value = S.level; saveSettings(); if (currentView === 'setup' || currentView === 'title') rerender(); };
        $('#mad-reset', m).onclick = () => { store.set(KEY.mad, { week: weekKey(), earned: 0 }); toast('이번 주 광기 기록을 0으로 돌렸습니다.'); if (currentView === 'title') renderTitle(); };
      }
    });
  }
  function rerender() {
    if (currentView === 'title') renderTitle();
    else if (currentView === 'setup') renderSetup();
    else if (currentView === 'map') renderMap();
    else if (currentView === 'shop') renderShop();
    else if (currentView === 'battle') renderBattle();
    else if (currentView === 'event') renderEvent();
  }
  async function confirmAbandon() {
    if (currentView === 'battle') return;
    const ok = await modal({
      label: 'ABANDON', title: '이 판을 포기할까요?',
      body: '<p>지금까지의 진행(지도 · 안 · 기프트)이 모두 사라지고 세이브가 삭제됩니다. 이미 받은 광기는 그대로 남습니다.</p>',
      buttons: [{ label: '계속 진행', value: false, cls: 'ghost' }, { label: '포기하고 세이브 삭제', value: true, cls: 'warn' }]
    });
    if (ok) abandonRun();
  }
  function abandonRun() { wipeSave(); toast('판을 포기했습니다. 세이브를 삭제했습니다.', 'warn'); renderTitle(); }

  /* ── 시작 ─────────────────────────────────────────────────────────── */
  // 이미지 미리 불러오기 (지연 없이 보이도록)
  const preload = () => { [...D.CHARS.map((c) => c.sym), ...D.IDENTITIES.map((i) => i.img)].forEach((src) => { const im = new Image(); im.src = src; }); };
  renderTitle();
  if ('requestIdleCallback' in window) requestIdleCallback(preload); else setTimeout(preload, 800);

  // 개발 확인용
  window.__MD = { get run() { return run; }, genMap, D, beginBattle, enterNode };
})();
