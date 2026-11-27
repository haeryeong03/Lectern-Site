/* =========================================================
   Lectern Company — 통합 연결 다리 (lc-bridge.js)
   ---------------------------------------------------------
   각 공간(PDA · 거울 뽑기 · 거울 던전 · 비주얼 노벨)이 통합 사이트 안에
   들어가 있을 때만 작동합니다. 파일을 따로 열면(단독 실행) 아무 일도 하지 않음.

   · window.LC_EMBED  — 'overlay'(PDA 단말기) · 'admin'(계정 관리) · 'space'(일반 공간) / 단독이면 null
   · LC_post({type, ...})  — 통합 사이트(바깥 틀)로 알림 보내기
   · LC_on(type, fn)       — 통합 사이트에서 오는 알림 받기
   ========================================================= */
(function(){
  var qs = new URLSearchParams(location.search);
  var inFrame = false; try{ inFrame = window.parent && window.parent !== window; }catch(e){ inFrame = true; }
  var mode = qs.get('embed') || (inFrame ? 'space' : null);
  window.LC_EMBED = mode;
  window.LC_post = function(){};
  window.LC_on = function(){};
  if(!mode) return;

  var root = document.documentElement;
  root.classList.add('lc-embed', 'lc-embed-' + mode);
  var theme = qs.get('theme'); if(theme) root.setAttribute('data-lc-theme', theme);
  var who = qs.get('u'); if(who) window.LC_USER = who;

  window.LC_post = function(msg){ try{ var m = msg || {}; m.lc = 1; window.parent.postMessage(m, '*'); }catch(e){} };
  var handlers = {};
  window.LC_on = function(type, fn){ (handlers[type] = handlers[type] || []).push(fn); };
  window.addEventListener('message', function(e){
    if(e.source !== window.parent) return;
    var d = e.data; if(!d || !d.lc || !d.type) return;
    (handlers[d.type] || []).forEach(function(f){ try{ f(d); }catch(x){ console.warn('[lc-bridge]', x); } });
  });
  // 바깥 틀이 다시 그려 달라고 할 때를 위해 준비 완료 알림
  window.addEventListener('load', function(){ window.LC_post({type:'loaded', mode: mode}); });
})();
