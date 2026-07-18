/* ============================================================
   CipherVault — Home news teaser
   Shows the 3 freshest cybersecurity headlines linking to the
   News page. Prefers the shared cache written by news.js; if the
   visitor hasn't opened the News page yet, it fetches one feed.
   ============================================================ */
(function(){
'use strict';
const box = document.getElementById('newsTeaser');
const sec = document.getElementById('newsTeaserSec');
if(!box || !sec) return;

const CACHE_KEY = 'cv-news-cache';
const PROXIES = [
  u => 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u),
  u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
  u => 'https://corsproxy.io/?url=' + encodeURIComponent(u)
];
const FEED = { name:'The Hacker News', url:'https://feeds.feedburner.com/TheHackersNews' };

function ago(ts){
  if(!ts) return '';
  const s=(Date.now()-ts)/1000;
  if(s<60) return 'just now';
  const m=s/60; if(m<60) return Math.floor(m)+'m ago';
  const h=m/60; if(h<24) return Math.floor(h)+'h ago';
  return Math.floor(h/24)+'d ago';
}
function parse(xml, source){
  const doc=new DOMParser().parseFromString(xml,'text/xml');
  if(doc.getElementsByTagNameNS('*','parsererror').length) return [];
  const nodes=[...doc.getElementsByTagNameNS('*','item'), ...doc.getElementsByTagNameNS('*','entry')];
  const out=[];
  nodes.forEach(el=>{
    const first=t=>{ const n=el.getElementsByTagNameNS('*',t)[0]; return n?n.textContent.trim():''; };
    const title=first('title');
    const links=[...el.getElementsByTagNameNS('*','link')];
    const le=links.find(l=>l.getAttribute && l.getAttribute('rel')==='alternate') || links[0];
    const link=le ? (le.getAttribute('href') || le.textContent.trim()) : '';
    const ds=first('pubDate')||first('published')||first('updated')||'';
    if(title && /^https?:\/\//i.test(link)) out.push({ title, link, ts: ds?(Date.parse(ds)||0):0, source });
  });
  return out;
}
function render(items){
  if(!items || !items.length) return false;
  box.innerHTML='';
  items.slice(0,3).forEach(it=>{
    const a=document.createElement('a'); a.className='nt-item'; a.href=it.link; a.target='_blank'; a.rel='noopener noreferrer';
    const top=document.createElement('div'); top.className='nt-top';
    const s=document.createElement('span'); s.className='nt-src'; s.textContent=it.source;
    const t=document.createElement('span'); t.className='nt-time'; t.textContent=ago(it.ts);
    top.appendChild(s); top.appendChild(t);
    const h=document.createElement('div'); h.className='nt-title'; h.textContent=it.title;
    a.appendChild(top); a.appendChild(h); box.appendChild(a);
  });
  sec.hidden=false;
  return true;
}

/* 1) instant paint from the shared cache (freshest across all sources) */
let shown=false;
try{ const c=JSON.parse(localStorage.getItem(CACHE_KEY)||'null'); if(c && c.items && c.items.length) shown=render(c.items); }catch(e){}

/* 2) first-time visitor with no cache → fetch one reliable feed */
if(!shown){
  (async()=>{
    for(const proxy of PROXIES){
      const ctrl=new AbortController(); const to=setTimeout(()=>ctrl.abort(),9000);
      try{
        const res=await fetch(proxy(FEED.url),{signal:ctrl.signal});
        if(res.ok){ const items=parse(await res.text(), FEED.name); if(items.length){ clearTimeout(to); items.sort((a,b)=>b.ts-a.ts); render(items); return; } }
      }catch(e){}
      clearTimeout(to);
    }
  })();
}
})();
