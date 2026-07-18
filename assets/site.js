/* ============================================================
   CipherVault — shared site behaviour
   Runs on every page. Every hook is guarded so missing
   elements never throw.
   ============================================================ */
(function(){
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}

/* ---------- curved menu (Olivier Larose style, vanilla port) ---------- */
const menuBtn = $('#menuBtn');
if(menuBtn && !document.querySelector('.cm-root')){
  const cmReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // cubic-bezier(.76,0,.24,1) solver — the signature easing of the effect
  const bez = (function(x1,y1,x2,y2){
    const A=(a,b)=>1-3*b+3*a, B=(a,b)=>3*b-6*a, C=a=>3*a;
    const calc=(t,a,b)=>((A(a,b)*t+B(a,b))*t+C(a))*t;
    const slope=(t,a,b)=>3*A(a,b)*t*t+2*B(a,b)*t+C(a);
    const tForX=x=>{ let t=x; for(let i=0;i<6;i++){ const s=slope(t,x1,x2); if(!s)break; t-=(calc(t,x1,x2)-x)/s; } return t; };
    return x => x<=0?0 : x>=1?1 : calc(tForX(x),y1,y2);
  })(0.76,0,0.24,1);

  // burger → animated bars
  menuBtn.innerHTML = '<span class="cm-burger"><span></span><span></span></span>';
  menuBtn.setAttribute('aria-controls','cmRoot');
  menuBtn.setAttribute('aria-expanded','false');

  // active page
  const cur = (location.pathname.split('/').pop() || 'index').replace('.html','') || 'index';
  const LINKS = [['Home','index.html'],['Toolkit','toolkit.html'],['Learn','learn.html'],['News','news.html']];

  const root = document.createElement('div');
  root.className='cm-root'; root.id='cmRoot';
  root.setAttribute('role','dialog'); root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','Menu'); root.setAttribute('aria-hidden','true');
  root.innerHTML =
    '<div class="cm-backdrop" data-cm-close></div>'+
    '<nav class="cm-panel" aria-label="Primary">'+
      '<svg class="cm-curve" aria-hidden="true"><path d=""></path></svg>'+
      '<div class="cm-body">'+
        '<div class="cm-nav">'+
          '<div class="cm-label">Navigation</div>'+
          LINKS.map((l,i)=>{
            const active = cur === l[1].replace('.html','');
            return '<a class="cm-link'+(active?' active':'')+'" style="--i:'+i+'" href="'+l[1]+'"'+(active?' aria-current="page"':'')+'><span class="cm-dot"></span>'+l[0]+'</a>';
          }).join('')+
        '</div>'+
        '<div class="cm-foot"><span><b>100%</b> client-side</span><span>Web Crypto API</span><span>Works offline</span></div>'+
      '</div>'+
    '</nav>';
  document.body.appendChild(root);

  const pathEl = root.querySelector('.cm-curve path');
  const pathFor = cx => { const h=window.innerHeight||document.documentElement.clientHeight||800; return 'M100 0 L200 0 L200 '+h+' L100 '+h+' Q'+cx+' '+(h/2)+' 100 0'; };
  let curveRAF=0, curCx=-100;
  function animateCurve(from,to,dur){
    cancelAnimationFrame(curveRAF); curCx=to;
    if(cmReduce){ pathEl.setAttribute('d', pathFor(to)); return; }
    const t0=performance.now();
    (function step(now){
      const p=Math.min(1,(now-t0)/dur), e=bez(p);
      pathEl.setAttribute('d', pathFor(from+(to-from)*e));
      if(p<1) curveRAF=requestAnimationFrame(step);
    })(t0);
  }

  let open=false, lastFocus=null;
  function openMenu(){
    if(open) return; open=true;
    lastFocus=document.activeElement;
    root.classList.add('open'); root.setAttribute('aria-hidden','false');
    document.documentElement.classList.add('cm-active');
    menuBtn.classList.add('active'); menuBtn.setAttribute('aria-expanded','true');
    document.body.style.overflow='hidden';
    pathEl.setAttribute('d', pathFor(-100)); animateCurve(-100,100,1000);
    const first=root.querySelector('.cm-link');
    if(first) setTimeout(()=>first.focus(), 60);
  }
  function closeMenu(){
    if(!open) return; open=false;
    root.classList.remove('open'); root.setAttribute('aria-hidden','true');
    document.documentElement.classList.remove('cm-active');
    menuBtn.classList.remove('active'); menuBtn.setAttribute('aria-expanded','false');
    document.body.style.overflow='';
    animateCurve(curCx,-100,800);
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  }
  menuBtn.addEventListener('click',()=> open ? closeMenu() : openMenu());
  root.addEventListener('click',e=>{ if(e.target.hasAttribute('data-cm-close')) closeMenu(); });
  root.querySelectorAll('.cm-link').forEach(a=>a.addEventListener('click',()=>closeMenu()));
  document.addEventListener('keydown',e=>{ if(e.key==='Escape' && open) closeMenu(); });
  window.addEventListener('resize', debounce(()=>{ if(open) pathEl.setAttribute('d', pathFor(curCx)); },120));
  // simple focus trap
  root.addEventListener('keydown',e=>{
    if(e.key!=='Tab' || !open) return;
    const f=root.querySelectorAll('a[href],button,[tabindex]:not([tabindex="-1"])');
    if(!f.length) return;
    const first=f[0], last=f[f.length-1];
    if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  });
  pathEl.setAttribute('d', pathFor(-100));   // seed
}

/* ---------- theme toggle ---------- */
const themeBtn=$('#themeBtn');
if(themeBtn){
  const ICON_SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const ICON_MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>';
  const applyTheme=t=>{
    document.documentElement.setAttribute('data-theme', t);
    themeBtn.innerHTML = t==='dark' ? ICON_SUN : ICON_MOON;
    themeBtn.setAttribute('aria-label', t==='dark' ? 'Switch to light theme' : 'Switch to dark theme');
    try{ localStorage.setItem('cv-theme', t); }catch(e){}
  };
  let theme = (function(){ try{ return localStorage.getItem('cv-theme'); }catch(e){ return null; } })() || 'dark';
  applyTheme(theme);
  themeBtn.addEventListener('click',()=>{ theme = theme==='dark' ? 'light' : 'dark'; applyTheme(theme); });
}

/* ---------- scroll reveal ----------
   Scroll/position based so it never depends on IntersectionObserver firing.
   Content is visible by default; .cv-anim enables the hide-then-reveal only
   once JS is running, and a timed safety net guarantees nothing stays hidden. */
const revealEls=$$('.reveal');
if(revealEls.length){
  document.documentElement.classList.add('cv-anim');
  const reveal=el=>el.classList.add('in');
  let ticking=false;
  function check(){
    ticking=false;
    const vh=window.innerHeight||document.documentElement.clientHeight;
    for(const el of revealEls){
      if(el.classList.contains('in')) continue;
      const r=el.getBoundingClientRect();
      if(r.top < vh*0.92 && r.bottom > 0) reveal(el);
    }
  }
  const onScroll=()=>{ if(!ticking){ ticking=true; requestAnimationFrame(check); } };
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', debounce(onScroll,150));
  addEventListener('load', check);
  // let the hidden start-state paint once, then reveal what's on screen (so the fade plays)
  requestAnimationFrame(()=>requestAnimationFrame(check));
  // ultimate safety: never leave anything permanently hidden
  setTimeout(()=>revealEls.forEach(reveal), 3000);
}

/* ---------- full-screen loader (window.CVLoader) ----------
   Reusable across pages/scripts: CVLoader.show('Generating'), CVLoader.hide().
   The overlay DOM is created lazily on first use. */
window.CVLoader = (function(){
  let el, hideT, shownAt=0;
  const MIN_MS=600;                  // keep visible long enough to be seen, not flicker
  function ensure(){
    if(el) return el;
    el=document.createElement('div');
    el.className='cv-loader';
    el.setAttribute('role','status');
    el.setAttribute('aria-live','polite');
    el.innerHTML='<div class="cv-loader-box"><span class="cv-loader-text"></span><span class="cv-loader-ring"></span></div>';
    document.body.appendChild(el);
    return el;
  }
  function show(text){
    const l=ensure(); clearTimeout(hideT);
    text = text || 'Loading';
    l.querySelector('.cv-loader-text').innerHTML =
      text.split('').map((c,i)=>'<span style="animation-delay:'+(i*0.1)+'s">'+(c===' '?'&nbsp;':c)+'</span>').join('');
    l.setAttribute('aria-label', text+'…');
    l.style.display='flex';
    void l.offsetHeight;              // reflow so the fade-in plays
    l.classList.add('show');
    shownAt=Date.now();
  }
  function hide(){
    if(!el) return;
    clearTimeout(hideT);
    const wait=Math.max(0, MIN_MS-(Date.now()-shownAt));   // enforce a minimum on-screen time
    hideT=setTimeout(()=>{
      el.classList.remove('show');
      setTimeout(()=>{ if(el && !el.classList.contains('show')) el.style.display='none'; }, 260);
    }, wait);
  }
  return { show, hide };
})();

/* ---------- animated search bars (.cv-search) ----------
   Any .cv-search-input with a data-filter selector live-filters the
   matching elements by their text content. Drop the markup + attribute
   anywhere to get a working, brand-styled search. */
$$('.cv-search-input[data-filter]').forEach(inp=>{
  const targets=$$(inp.dataset.filter);
  if(!targets.length) return;
  const empty = inp.dataset.empty ? document.querySelector(inp.dataset.empty) : null;
  inp.addEventListener('input',()=>{
    const q=inp.value.trim().toLowerCase();
    let shown=0;
    targets.forEach(t=>{
      const match = !q || t.textContent.toLowerCase().includes(q);
      t.style.display = match ? '' : 'none';
      if(match) shown++;
    });
    if(empty) empty.style.display = shown ? 'none' : 'block';
  });
});

/* ---------- ambient particle network (respects reduced-motion) ----------
   Drifting nodes linked by faint lines in the brand palette — reads as a
   secure, connected mesh rather than a "Matrix" glyph rain. */
const cv=$('#matrix');
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(cv && !prefersReduced){
  const ctx=cv.getContext('2d');
  const DPR=Math.min(window.devicePixelRatio||1, 1.5);
  const COLORS=['56,225,255','34,229,143','139,123,255'];   // cyan · green · violet
  const LINK=132;
  let W,H,particles,raf=0;
  function resize(){
    W=window.innerWidth; H=window.innerHeight;
    cv.style.width=W+'px'; cv.style.height=H+'px';
    cv.width=Math.round(W*DPR); cv.height=Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    const count=Math.max(28, Math.min(90, Math.round(W*H/20000)));
    particles=Array.from({length:count},()=>({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-.5)*.22, vy:(Math.random()-.5)*.22,
      r:Math.random()*1.5+.7, c:COLORS[(Math.random()*COLORS.length)|0]
    }));
  }
  resize(); addEventListener('resize', debounce(resize,200));
  function draw(){
    ctx.clearRect(0,0,W,H);
    for(const p of particles){
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<-30)p.x=W+30; else if(p.x>W+30)p.x=-30;
      if(p.y<-30)p.y=H+30; else if(p.y>H+30)p.y=-30;
    }
    for(let i=0;i<particles.length;i++){
      const a=particles[i];
      for(let j=i+1;j<particles.length;j++){
        const b=particles[j], dx=a.x-b.x, dy=a.y-b.y, d2=dx*dx+dy*dy;
        if(d2<LINK*LINK){
          const al=(0.14*(1-Math.sqrt(d2)/LINK)).toFixed(3);
          ctx.strokeStyle='rgba('+a.c+','+al+')';
          ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
    }
    for(const p of particles){
      ctx.fillStyle='rgba('+p.c+',0.55)';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.283); ctx.fill();
    }
    raf=requestAnimationFrame(draw);
  }
  draw();
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){ cancelAnimationFrame(raf); raf=0; }
    else if(!raf){ raf=requestAnimationFrame(draw); }
  });
}
})();
