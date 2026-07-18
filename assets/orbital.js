/* ============================================================
   CipherVault — Radial Orbital Toolkit Explorer
   Vanilla port of the radial-orbital-timeline, brand-themed.
   Renders into #orbital (Home page only).
   ============================================================ */
(function(){
'use strict';
const stage = document.getElementById('orbital');
if(!stage) return;

const ICONS = {
  hash:'<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
  code:'<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
  lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  key:'<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L19 4M15 4h4v4M14 9l3 3"/>',
  cipher:'<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>',
  shield:'<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/>',
  core:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>'
};
function svg(path, sw){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(sw||2)+'" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>'; }

const TOOLS = [
  {id:1,title:'Hashing',tech:'SHA-256 · one-way',icon:'hash',desc:'Fixed-length fingerprints that verify integrity and store passwords. Irreversible by design — flip one character and the whole digest changes.',related:[2,6]},
  {id:2,title:'Encoder',tech:'Base64 · Hex · reversible',icon:'code',desc:'Reshape data so it survives text-only systems like URLs and JSON. Fully reversible by anyone — it is not encryption.',related:[1]},
  {id:3,title:'AES Vault',tech:'AES-256-GCM · PBKDF2',icon:'lock',desc:'Authenticated symmetric encryption from a passphrase. One key locks and unlocks; tampering is detected on decrypt.',related:[4,6]},
  {id:4,title:'RSA Keys',tech:'RSA-2048 · OAEP / PSS',icon:'key',desc:'Public-key cryptography: share a public key, guard a private one. Encrypt to anyone and sign to prove authenticity.',related:[3]},
  {id:5,title:'Ciphers',tech:'Caesar · Vigenère · XOR',icon:'cipher',desc:'The classic substitution ciphers — perfect for learning modular arithmetic, but unsafe for anything real.',related:[1]},
  {id:6,title:'Passwords',tech:'entropy · CSPRNG',icon:'shield',desc:'Measure strength in bits of entropy and generate secure passwords with a cryptographic random source, all locally.',related:[3,1]}
];

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let radius = 210, rotation = 0, autoRotate = true, activeId = null, raf = 0, lastT = 0;
let hovering = false;                 // pause the spin while the user is interacting
let tween = null;   // {from,to,start,dur}

/* ---- build DOM ---- */
const field = document.createElement('div'); field.className='orbital-field';
const core = document.createElement('div'); core.className='orbital-core';
core.innerHTML = '<span class="ring r1"></span><span class="ring r2"></span><span class="core-dot">'+svg(ICONS.core,2.2)+'</span>';
const ring = document.createElement('div'); ring.className='orbital-ring';
field.appendChild(ring); field.appendChild(core);

const nodeEls = {};
TOOLS.forEach(t=>{
  const n=document.createElement('div'); n.className='orbital-node'; n.dataset.id=t.id;
  n.setAttribute('role','button'); n.setAttribute('tabindex','0');
  n.setAttribute('aria-label',t.title+' — '+t.tech);
  n.innerHTML='<span class="node-glow"></span><button class="node-btn" tabindex="-1" aria-hidden="true">'+svg(ICONS[t.icon])+'</button><span class="node-label">'+t.title+'</span>';
  n.addEventListener('click',e=>{ e.stopPropagation(); toggle(t.id); });
  n.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(t.id); } });
  field.appendChild(n); nodeEls[t.id]=n;
});

const hint=document.createElement('div'); hint.className='orbital-hint'; hint.textContent='click a node to explore';
stage.appendChild(field); stage.appendChild(hint);
stage.addEventListener('click',e=>{ if(e.target===stage||e.target===field||e.target===ring) collapse(); });
/* pause the spin while pointing at / touching the orbit, so nodes are easy to click */
stage.addEventListener('pointerenter',()=>{ hovering=true; });
stage.addEventListener('pointerleave',()=>{ hovering=false; });

/* ---- sizing ---- */
function sizeUp(){
  const w = stage.clientWidth, h = stage.clientHeight;
  radius = Math.max(120, Math.min(210, Math.min(w,h)/2 - 80));
  ring.style.width = ring.style.height = (radius*2)+'px';
}
sizeUp();
window.addEventListener('resize', ()=>{ sizeUp(); layout(); });

/* ---- position math (ported) ---- */
function layout(){
  TOOLS.forEach((t,i)=>{
    const el=nodeEls[t.id];
    const angle = ((i/TOOLS.length)*360 + rotation) % 360;
    const rad = angle*Math.PI/180;
    const x = radius*Math.cos(rad), y = radius*Math.sin(rad);
    const z = Math.round(100 + 50*Math.cos(rad));
    const op = Math.max(.4, Math.min(1, .4 + .6*((1+Math.sin(rad))/2)));
    const expanded = t.id===activeId;
    el.style.transform = 'translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px)';
    el.style.zIndex = expanded ? 400 : z;
    el.style.opacity = expanded ? 1 : op;
  });
}

/* ---- animation loop ---- */
function frame(now){
  let dt = lastT ? (now-lastT) : 16; lastT = now;
  if(dt>60) dt=60;                                  // avoid big jumps after a stall
  if(tween){
    const p = Math.min(1,(now-tween.start)/tween.dur);
    const e = p<.5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2;  // easeInOutQuad
    rotation = tween.from + (tween.to-tween.from)*e;
    if(p>=1) tween=null;
    layout();
  } else if(autoRotate && !hovering){
    rotation = (rotation + dt*0.012) % 360;          // ~12deg/sec — gentle
    layout();
  }
  raf = requestAnimationFrame(frame);
}

/* ---- interactions ---- */
function relatedOf(id){ const t=TOOLS.find(x=>x.id===id); return t?t.related:[]; }
function shortestTo(target){
  let d = (target - rotation) % 360; if(d>180) d-=360; if(d<-180) d+=360; return rotation + d;
}
function toggle(id){
  if(activeId===id){ collapse(); return; }
  activeId = id; autoRotate = false;
  stage.classList.add('engaged');
  const idx = TOOLS.findIndex(t=>t.id===id);
  const target = 270 - (idx/TOOLS.length)*360;          // bring node to top
  tween = { from:rotation, to:shortestTo(target), start:performance.now(), dur:700 };
  render();
}
function collapse(){
  if(activeId===null && autoRotate) return;
  activeId = null; autoRotate = true; tween=null; stage.classList.remove('engaged');
  render();
}
function render(){
  const related = activeId ? relatedOf(activeId) : [];
  TOOLS.forEach(t=>{
    const el=nodeEls[t.id];
    el.classList.toggle('active', t.id===activeId);
    el.classList.toggle('related', related.includes(t.id));
    const existing = el.querySelector('.orbital-card');
    if(t.id===activeId && !existing) el.appendChild(buildCard(t));
    else if(t.id!==activeId && existing) existing.remove();
  });
  layout();
}
function buildCard(t){
  const c=document.createElement('div'); c.className='orbital-card';
  c.addEventListener('click',e=>e.stopPropagation());
  const chips = t.related.map(rid=>{
    const r=TOOLS.find(x=>x.id===rid);
    return '<button class="oc-chip" data-rel="'+rid+'">'+r.title+svg('<path d="M5 12h14M13 6l6 6-6 6"/>',2)+'</button>';
  }).join('');
  c.innerHTML =
    '<div class="oc-head"><span class="oc-badge">'+t.tech+'</span><div class="oc-title">'+t.title+'</div></div>'+
    '<div class="oc-body"><p class="oc-desc">'+t.desc+'</p>'+
      (t.related.length?'<div class="oc-connect"><h4>'+svg('<path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/>',2)+'Connected tools</h4><div class="oc-chips">'+chips+'</div></div>':'')+
      '<a class="oc-launch" href="toolkit.html">'+svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',2.2)+'Open in the toolkit</a>'+
    '</div>';
  c.querySelectorAll('.oc-chip').forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation(); toggle(Number(b.dataset.rel)); }));
  return c;
}

/* ---- start ---- */
layout();
if(reduce){ rotation = 270 - 0; layout(); }   // static, node 0 at top
else raf = requestAnimationFrame(frame);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){ cancelAnimationFrame(raf); raf=0; lastT=0; }
  else if(!raf && !reduce){ raf=requestAnimationFrame(frame); }
});
})();
