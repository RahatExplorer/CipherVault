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

/* ---------- mobile nav ---------- */
const menuBtn=$('#menuBtn'), navLinks=$('#navLinks');
if(menuBtn && navLinks){
  menuBtn.addEventListener('click',function(){
    const open=navLinks.classList.toggle('open');
    this.setAttribute('aria-expanded',open);
  });
  $$('#navLinks a').forEach(a=>a.addEventListener('click',()=>{
    navLinks.classList.remove('open'); menuBtn.setAttribute('aria-expanded','false');
  }));
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

/* ---------- matrix rain (respects reduced-motion) ---------- */
const cv=$('#matrix');
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(cv && !prefersReduced){
  const ctx=cv.getContext('2d');
  let cols,drops,fontSize=15;
  const glyphs='01ABCDEF{}[]<>#$%&*+=/\\|~^ゲセキュリティ暗号';
  function resize(){
    cv.width=innerWidth; cv.height=innerHeight;
    cols=Math.floor(cv.width/fontSize);
    drops=Array(cols).fill(0).map(()=>Math.random()*-40);
  }
  resize(); addEventListener('resize', debounce(resize,200));
  let last=0;
  function draw(ts){
    if(ts-last>55){
      last=ts;
      ctx.fillStyle='rgba(7,11,22,0.10)';
      ctx.fillRect(0,0,cv.width,cv.height);
      ctx.font=fontSize+'px "JetBrains Mono", monospace';
      for(let i=0;i<cols;i++){
        const ch=glyphs[Math.floor(Math.random()*glyphs.length)];
        const x=i*fontSize, y=drops[i]*fontSize;
        ctx.fillStyle = Math.random()>0.975 ? '#eef4ff' : (i%3===0?'#38e1ff':'#22e58f');
        ctx.fillText(ch,x,y);
        if(y>cv.height && Math.random()>0.975) drops[i]=0;
        drops[i]++;
      }
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}
})();
