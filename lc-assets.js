/* =========================================================
   Lectern Company — 자료실 (lc-assets.js)
   ---------------------------------------------------------
   사이트에서 이미지를 올리고, 어느 공간에서든 같은 이름으로 불러 씁니다.

   · 저장 위치: Firebase Realtime Database
       assets/{분류}/{이름}      = { d: 압축한 이미지(webp), t: 올린 시각 }
       assetIndex/{분류}/{이름}  = { name, w, h, size, t, by }   ← 목록용 (가벼움)
     ※ 무료 요금제(Spark)는 Firebase Storage를 쓸 수 없어 데이터베이스에 넣습니다.
       올릴 때 브라우저에서 줄이고 압축하므로 한 장에 보통 100~400KB.
   · 이미지 주소 대신  asset:분류/이름  을 쓰면 됩니다.
       <img src="asset:foe/cyclops">,  style="background-image:url(asset:sym/no12)"
       데이터 파일의 img: 'asset:identity/id_03_witness' 도 그대로 작동
   · 한 번 받은 이미지는 브라우저에 보관 → 다시 받지 않음 (올린 시각이 바뀌면 새로 받음)
   · 시안 모드(?demo · Firebase 없음)에서는 이 브라우저 안에만 저장
   ========================================================= */
(function(){
  if(window.LC_ASSET) return;
  var CFG = {
    apiKey: "AIzaSyARSLd9Xs7s98PTf6ht5gVtJM2OBe3Sobw",
    authDomain: "lectern-company.firebaseapp.com",
    databaseURL: "https://lectern-company-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "lectern-company",
    storageBucket: "lectern-company.firebasestorage.app",
    messagingSenderId: "719328977812",
    appId: "1:719328977812:web:5159887c26083d2c6fa581"
  };
  var SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  var DEMO = /[?&]demo\b/.test(location.search) || location.protocol === 'file:';

  /* 분류 — 올릴 때 크기 · 이름표 */
  var KINDS = {
    char:     { kr:'캐릭터 스탠딩', max:[1100,1600], alpha:true },
    back:     { kr:'캐릭터 뒷면',   max:[1100,1600], alpha:true },
    sym:      { kr:'심볼',          max:[512,512],   alpha:true },
    identity: { kr:'인격 스탠딩',   max:[1100,1600], alpha:true },
    ego:      { kr:'E.G.O. 일러스트', max:[1600,1600], alpha:false },
    gacha:    { kr:'뽑기 카드',     max:[1100,1600], alpha:true },
    foe:      { kr:'전투 적',       max:[900,1200],  alpha:true },
    abno:     { kr:'환상체',        max:[1200,1200], alpha:true },
    gift:     { kr:'기프트',        max:[512,512],   alpha:true },
    illust:   { kr:'스토리 일러스트', max:[1920,1920], alpha:false },
    bg:       { kr:'배경',          max:[1920,1920], alpha:false },
    etc:      { kr:'기타',          max:[1600,1600], alpha:true }
  };
  var LIMIT = 1800000;   // 저장할 이미지 글자 수 상한 (≈1.3MB) — 넘으면 품질을 낮춤

  /* ---------- 브라우저 보관함 (IndexedDB) ---------- */
  var idbP = null;
  function idb(){
    if(idbP) return idbP;
    idbP = new Promise(function(res){
      try{
        var r = indexedDB.open('lc-assets', 1);
        r.onupgradeneeded = function(){ r.result.createObjectStore('b'); };
        r.onsuccess = function(){ res(r.result); };
        r.onerror = function(){ res(null); };
      }catch(e){ res(null); }
    });
    return idbP;
  }
  function idbGet(k){ return idb().then(function(db){ if(!db) return null; return new Promise(function(res){ try{ var q=db.transaction('b').objectStore('b').get(k); q.onsuccess=function(){res(q.result||null)}; q.onerror=function(){res(null)}; }catch(e){res(null)} }); }); }
  function idbPut(k,v){ return idb().then(function(db){ if(!db) return; return new Promise(function(res){ try{ var tx=db.transaction('b','readwrite'); tx.objectStore('b').put(v,k); tx.oncomplete=res; tx.onerror=res; }catch(e){res()} }); }); }
  function idbDel(k){ return idb().then(function(db){ if(!db) return; return new Promise(function(res){ try{ var tx=db.transaction('b','readwrite'); tx.objectStore('b').delete(k); tx.oncomplete=res; tx.onerror=res; }catch(e){res()} }); }); }

  /* ---------- Firebase 연결 (없으면 불러옴) ---------- */
  var fbP = null;
  function loadScript(src){ return new Promise(function(res,rej){ var s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
  function fb(){
    if(DEMO) return Promise.resolve(null);
    if(fbP) return fbP;
    fbP = (async function(){
      try{
        // 페이지가 직접 Firebase를 켜는 중이면 잠깐 기다림 (같은 앱을 두 번 켜지 않도록)
        for(var w=0; w<30 && window.firebase && !firebase.apps.length; w++) await new Promise(function(r){ setTimeout(r,100); });
        if(!window.firebase) await loadScript(SDK+'firebase-app-compat.js');
        if(!firebase.auth) await loadScript(SDK+'firebase-auth-compat.js');
        if(!firebase.database) await loadScript(SDK+'firebase-database-compat.js');
        if(!firebase.apps.length) firebase.initializeApp(CFG);
        await new Promise(function(res){ var off=firebase.auth().onAuthStateChanged(function(){ off(); res(); }); setTimeout(res,5000); });
        return firebase.database();
      }catch(e){ console.warn('[자료실] Firebase 연결 실패', e); return null; }
    })();
    return fbP;
  }

  /* ---------- 목록 ---------- */
  var IDX = {}, idxReady = false, idxWait = [], idxSubs = [], idxStarted = false;
  function flat(tree){ var o={}; Object.keys(tree||{}).forEach(function(k){ Object.keys(tree[k]||{}).forEach(function(n){ o[k+'/'+n]=Object.assign({kind:k,id:n,key:k+'/'+n}, tree[k][n]); }); }); return o; }
  function setIdx(o){ IDX=o; idxReady=true; idxWait.splice(0).forEach(function(f){f()}); idxSubs.forEach(function(f){ try{f(IDX)}catch(e){} }); }
  function demoIdxLoad(){ try{ return JSON.parse(localStorage.getItem('lc-asset-demo')||'{}'); }catch(e){ return {}; } }
  function demoIdxSave(t){ try{ localStorage.setItem('lc-asset-demo', JSON.stringify(t)); }catch(e){} }
  function startIndex(){
    if(idxStarted) return; idxStarted = true;
    if(DEMO){ setIdx(flat(demoIdxLoad())); return; }
    fb().then(function(db){
      if(!db){ setIdx({}); return; }
      db.ref('assetIndex').on('value', function(s){ setIdx(flat(s.val())); }, function(){ setIdx({}); });
    });
    setTimeout(function(){ if(!idxReady) setIdx(IDX); }, 6000);
  }
  function whenIndex(){ startIndex(); return idxReady ? Promise.resolve() : new Promise(function(r){ idxWait.push(r); }); }

  /* ---------- 불러오기 ---------- */
  var MEM = {}, PEND = {};
  function isRef(s){ return typeof s==='string' && s.slice(0,6)==='asset:'; }
  function keyOf(ref){ return String(ref).slice(6).replace(/^\/+/,''); }
  function okKey(k){ return /^[a-z]+\/[a-z0-9_-]{1,60}$/.test(k); }
  async function url(ref){
    if(!isRef(ref)) return ref;
    var key = keyOf(ref); if(!okKey(key)) return '';
    await whenIndex();
    var t = (IDX[key] && IDX[key].t) || 0;
    if(MEM[key] && MEM[key].t === t) return MEM[key].u;
    if(PEND[key+'@'+t]) return PEND[key+'@'+t];
    var p = (async function(){
      var c = await idbGet(key);
      var blob = null;
      if(c && c.blob && (c.t === t || (DEMO && c.t))) blob = c.blob;
      if(!blob){
        var d = null;
        if(!DEMO){ var db = await fb(); if(db){ try{ var s = await db.ref('assets/'+key+'/d').once('value'); d = s.val(); }catch(e){ console.warn('[자료실]', key, e && e.code); } } }
        if(!d) return '';
        blob = await (await fetch(d)).blob();
        idbPut(key, {t:t, blob:blob});
      }
      if(MEM[key]) try{ URL.revokeObjectURL(MEM[key].u); }catch(e){}
      var u = URL.createObjectURL(blob); MEM[key] = {t:t, u:u}; return u;
    })();
    PEND[key+'@'+t] = p;
    try{ return await p; } finally { delete PEND[key+'@'+t]; }
  }

  /* ---------- 화면 자동 연결: asset: 이 들어간 img · style 을 찾아 바꿈 ---------- */
  var RX = /url\((['"]?)(asset:[a-z]+\/[a-z0-9_-]+)\1\)/g;
  function fixEl(el){
    if(!el || el.nodeType!==1) return;
    if(el.tagName==='IMG' || el.tagName==='image'){
      var a = el.tagName==='IMG' ? 'src' : 'href';
      var r = el.getAttribute(a);
      if(isRef(r)){ el.dataset.asset = r; url(r).then(function(u){ if(el.getAttribute(a)===r){ if(u) el.setAttribute(a,u); else { el.removeAttribute(a); el.classList.add('asset-miss'); } } }); }
    }
    var st = el.getAttribute('style');
    if(st && st.indexOf('asset:')>=0){
      var refs = []; st.replace(RX, function(m,q,r){ refs.push(r); return m; });
      Promise.all(refs.map(url)).then(function(us){
        var now = el.getAttribute('style'); if(now!==st) return;
        var i=0; el.setAttribute('style', st.replace(RX, function(){ var u=us[i++]; return u ? 'url("'+u+'")' : 'none'; }));
      });
    }
  }
  function scan(root){
    if(!root || !root.querySelectorAll) return;
    if(root.nodeType===1) fixEl(root);
    root.querySelectorAll('img[src^="asset:"],image[href^="asset:"],[style*="asset:"]').forEach(fixEl);
  }
  function startObserver(){
    var css = document.createElement('style');
    css.textContent = 'img[src^="asset:"]{opacity:0}img.asset-miss{opacity:.25}';
    document.head.appendChild(css);
    scan(document.body || document.documentElement);
    new MutationObserver(function(ms){
      ms.forEach(function(m){
        if(m.type==='attributes'){ var v=m.target.getAttribute(m.attributeName); if(v && v.indexOf('asset:')>=0) fixEl(m.target); }
        else m.addedNodes.forEach(function(n){ if(n.nodeType===1) scan(n); });
      });
    }).observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['src','style','href']});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', startObserver); else startObserver();

  /* ---------- 올리기 ---------- */
  function slug(s){ return String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60); }
  async function compress(file, kind, opt){
    opt = opt || {};
    var K = KINDS[kind] || KINDS.etc, mw = opt.maxW || K.max[0], mh = opt.maxH || K.max[1];
    var bmp;
    try{ bmp = await createImageBitmap(file); }
    catch(e){ bmp = await new Promise(function(res,rej){ var im=new Image(); im.onload=function(){res(im)}; im.onerror=rej; im.src=URL.createObjectURL(file); }); }
    var w = bmp.width, h = bmp.height;
    // 투명 여백 자르기 (스탠딩 · 심볼 등)
    var cut = null;
    if(K.alpha && opt.trim !== false){
      var c0 = document.createElement('canvas'), sc = Math.min(1, 600/Math.max(w,h)); c0.width=Math.max(1,Math.round(w*sc)); c0.height=Math.max(1,Math.round(h*sc));
      var x0 = c0.getContext('2d'); x0.drawImage(bmp,0,0,c0.width,c0.height);
      try{
        var px = x0.getImageData(0,0,c0.width,c0.height).data, L=c0.width, T=c0.height, R=-1, B=-1, Lm=L, Tm=T;
        for(var y=0;y<c0.height;y++) for(var x=0;x<c0.width;x++){ if(px[(y*c0.width+x)*4+3]>8){ if(x<Lm)Lm=x; if(x>R)R=x; if(y<Tm)Tm=y; if(y>B)B=y; } }
        if(R>=0 && (Lm>2 || Tm>2 || R<c0.width-3 || B<c0.height-3)){
          var pad=2; cut={x:Math.max(0,(Lm-pad)/sc), y:Math.max(0,(Tm-pad)/sc)}; cut.w=Math.min(w,(R+pad+1)/sc)-cut.x; cut.h=Math.min(h,(B+pad+1)/sc)-cut.y;
        }
      }catch(e){}
    }
    var sw = cut ? cut.w : w, sh = cut ? cut.h : h;
    var r = Math.min(1, mw/sw, mh/sh), cw = Math.max(1,Math.round(sw*r)), ch = Math.max(1,Math.round(sh*r));
    var cv = document.createElement('canvas'); cv.width=cw; cv.height=ch;
    var cx = cv.getContext('2d'); cx.imageSmoothingQuality='high';
    if(!K.alpha){ cx.fillStyle='#000'; cx.fillRect(0,0,cw,ch); }
    if(cut) cx.drawImage(bmp, cut.x, cut.y, cut.w, cut.h, 0, 0, cw, ch); else cx.drawImage(bmp, 0, 0, cw, ch);
    var q = .88, d = cv.toDataURL('image/webp', q);
    if(d.indexOf('data:image/webp')!==0){ d = K.alpha ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', .86); }
    while(d.length > LIMIT && q > .45){ q -= .1; d = cv.toDataURL(d.indexOf('image/png')>0?'image/jpeg':'image/webp', q); }
    var shrink = 0;
    while(d.length > LIMIT && shrink < 4){ shrink++; cw=Math.round(cw*.8); ch=Math.round(ch*.8); var c2=document.createElement('canvas'); c2.width=cw; c2.height=ch; c2.getContext('2d').drawImage(cv,0,0,cw,ch); cv=c2; d=cv.toDataURL('image/webp', q); }
    return { d:d, w:cw, h:ch, size: Math.round(d.length*.75) };
  }
  async function upload(file, o){
    o = o || {};
    var kind = KINDS[o.kind] ? o.kind : 'etc';
    var id = slug(o.id || o.name || file.name.replace(/\.[^.]+$/,'')) || ('img-'+Date.now().toString(36));
    var key = kind+'/'+id;
    if(!okKey(key)) throw new Error('이름은 영문 소문자 · 숫자 · - · _ 로 적어 주세요');
    var c = await compress(file, kind, o);
    var meta = { name: String(o.name||id).slice(0,60), w:c.w, h:c.h, size:c.size };
    if(DEMO){
      var t = Date.now(); meta.t = t;
      var tree = demoIdxLoad(); tree[kind] = tree[kind]||{}; tree[kind][id] = meta; demoIdxSave(tree);
      await idbPut(key, {t:t, blob: await (await fetch(c.d)).blob()});
      startIndex(); setIdx(flat(tree));
    }else{
      var db = await fb(); if(!db) throw new Error('Firebase에 연결하지 못했습니다');
      var TS = firebase.database.ServerValue.TIMESTAMP, by = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
      await db.ref('assets/'+key).set({ d:c.d, t:TS });
      meta.t = TS; meta.by = by;
      await db.ref('assetIndex/'+key).set(meta);
    }
    return { ref:'asset:'+key, key:key, w:c.w, h:c.h, size:c.size };
  }
  async function remove(ref){
    var key = isRef(ref) ? keyOf(ref) : ref; if(!okKey(key)) return;
    var kind = key.split('/')[0], id = key.split('/')[1];
    if(DEMO){ var tree=demoIdxLoad(); if(tree[kind]) delete tree[kind][id]; demoIdxSave(tree); setIdx(flat(tree)); }
    else { var db = await fb(); if(!db) throw new Error('Firebase에 연결하지 못했습니다'); await db.ref('assetIndex/'+key).remove(); await db.ref('assets/'+key).remove(); }
    idbDel(key); if(MEM[key]){ try{ URL.revokeObjectURL(MEM[key].u); }catch(e){} delete MEM[key]; }
  }

  /* ---------- 파일 고르기 → 올리기 (간단 버튼용) ---------- */
  function pick(accept){ return new Promise(function(res){ var i=document.createElement('input'); i.type='file'; i.accept=accept||'image/*'; i.onchange=function(){ res(i.files && i.files[0] || null); }; i.click(); }); }
  async function pickAndUpload(o){ var f = await pick(); if(!f) return null; return upload(f, o); }

  window.LC_ASSET = {
    KINDS: KINDS, DEMO: DEMO,
    isRef: isRef, url: url, upload: upload, remove: remove, compress: compress, pick: pick, pickAndUpload: pickAndUpload, slug: slug,
    index: function(){ startIndex(); return IDX; },
    ready: whenIndex,
    onIndex: function(f){ idxSubs.push(f); startIndex(); if(idxReady) f(IDX); },
    list: function(kind){ return Object.values(IDX).filter(function(a){ return !kind || a.kind===kind; }).sort(function(a,b){ return (b.t||0)-(a.t||0); }); },
    scan: scan
  };
})();
