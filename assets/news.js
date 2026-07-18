/* ============================================================
   CipherVault — Cybersecurity News feed
   Aggregates public RSS/Atom feeds through a free CORS proxy,
   caches to localStorage, and auto-refreshes. No user data is
   ever sent — this only reads public headlines.
   ============================================================ */
(function(){
'use strict';
const grid = document.getElementById('newsGrid');
if(!grid) return;

const FEEDS = [
  { name:'The Hacker News',  url:'https://feeds.feedburner.com/TheHackersNews' },
  { name:'Krebs on Security',url:'https://krebsonsecurity.com/feed/' },
  { name:'The Register',     url:'https://www.theregister.com/security/headlines.atom' },
  { name:'Dark Reading',     url:'https://www.darkreading.com/rss.xml' },
  { name:'SecurityWeek',     url:'https://www.securityweek.com/feed/' },
  { name:'BleepingComputer', url:'https://www.bleepingcomputer.com/feed/' }
];
/* several free CORS proxies — each feed falls through to the next if one fails
   or gets rate-limited, which keeps coverage high across all sources */
const PROXIES = [
  u => 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u),
  u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
  u => 'https://corsproxy.io/?url=' + encodeURIComponent(u)
];
const CACHE_KEY = 'cv-news-cache';
const REFRESH_MS = 5 * 60 * 1000;

const sourcesEl = document.getElementById('newsSources');
const updatedEl = document.getElementById('newsUpdated');
const refreshBtn = document.getElementById('newsRefresh');

let allItems = [];
let filter = 'All';
let lastFetch = 0;
let loading = false;

/* ---------- helpers ---------- */
function strip(html){ const d=new DOMParser().parseFromString(html||'','text/html'); return (d.body.textContent||'').replace(/\s+/g,' ').trim(); }
function ago(ts){
  if(!ts) return '';
  const s=(Date.now()-ts)/1000;
  if(s<60) return 'just now';
  const m=s/60; if(m<60) return Math.floor(m)+'m ago';
  const h=m/60; if(h<24) return Math.floor(h)+'h ago';
  const d=h/24; return Math.floor(d)+'d ago';
}
function svg(p){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'; }

function parse(xml, source){
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if(doc.getElementsByTagNameNS('*','parsererror').length) return [];
  // namespace-agnostic: works for both RSS <item> and Atom <entry>
  const nodes = [...doc.getElementsByTagNameNS('*','item'), ...doc.getElementsByTagNameNS('*','entry')];
  const out = [];
  nodes.forEach(el=>{
    const first = tag => { const n = el.getElementsByTagNameNS('*',tag)[0]; return n ? n.textContent.trim() : ''; };
    const title = first('title');
    // link: RSS <link>text</link>, Atom <link href> (prefer rel="alternate")
    const links = [...el.getElementsByTagNameNS('*','link')];
    const linkEl = links.find(l=>l.getAttribute && l.getAttribute('rel')==='alternate') || links[0];
    let link = linkEl ? (linkEl.getAttribute('href') || linkEl.textContent.trim()) : '';
    if(!link){ const g = el.getElementsByTagNameNS('*','guid')[0]; if(g && /^https?:/.test(g.textContent)) link = g.textContent.trim(); }
    const dateStr = first('pubDate') || first('published') || first('updated') || first('date') || '';
    const desc = strip(first('description') || first('summary'));
    if(title && /^https?:\/\//i.test(link)){
      out.push({ title, link, ts: dateStr ? (Date.parse(dateStr)||0) : 0, desc: desc.slice(0,240), source });
    }
  });
  return out.slice(0, 12);
}

async function fetchFeed(feed){
  for(const proxy of PROXIES){
    const ctrl = new AbortController();
    const to = setTimeout(()=>ctrl.abort(), 9000);
    try{
      const res = await fetch(proxy(feed.url), { signal: ctrl.signal });
      if(res.ok){
        const items = parse(await res.text(), feed.name);
        if(items.length){ clearTimeout(to); return items; }
      }
    }catch(e){ /* try next proxy */ }
    clearTimeout(to);
  }
  return [];
}

/* ---------- render ---------- */
function card(item){
  const a = document.createElement('a');
  a.className = 'news-card'; a.href = item.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
  const top = document.createElement('div'); top.className = 'nc-top';
  const src = document.createElement('span'); src.className = 'nc-source'; src.textContent = item.source;
  const time = document.createElement('span'); time.className = 'nc-time'; time.textContent = ago(item.ts) || '';
  top.appendChild(src); top.appendChild(time);
  const h = document.createElement('h3'); h.className = 'nc-title'; h.textContent = item.title;
  const p = document.createElement('p'); p.className = 'nc-desc'; p.textContent = item.desc || '';
  const more = document.createElement('span'); more.className = 'nc-more';
  more.innerHTML = 'Read at '+item.source.replace(/&/g,'&amp;').replace(/</g,'&lt;')+' '+svg('<path d="M7 17L17 7M7 7h10v10"/>');
  a.appendChild(top); a.appendChild(h); if(item.desc) a.appendChild(p); a.appendChild(more);
  return a;
}
function skeletons(n){
  grid.innerHTML = '';
  for(let i=0;i<n;i++){
    const s = document.createElement('div'); s.className = 'news-skel';
    s.innerHTML = '<div class="sk" style="width:38%;height:20px;margin-bottom:16px"></div>'+
      '<div class="sk" style="width:100%;height:16px;margin-bottom:8px"></div>'+
      '<div class="sk" style="width:85%;height:16px;margin-bottom:18px"></div>'+
      '<div class="sk" style="width:100%;height:12px;margin-bottom:6px"></div>'+
      '<div class="sk" style="width:70%;height:12px"></div>';
    grid.appendChild(s);
  }
}
function message(html){
  grid.innerHTML = '<div class="news-msg">'+html+'</div>';
}
function render(){
  const items = filter==='All' ? allItems : allItems.filter(i=>i.source===filter);
  if(!items.length){
    if(!allItems.length){
      message(svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>')+
        '<div>Couldn’t load the news feeds right now.</div>'+
        '<button class="mini go" id="newsRetry" style="margin:16px auto 0">Try again</button>');
      const rb=document.getElementById('newsRetry'); if(rb) rb.addEventListener('click',()=>load(true));
    } else {
      message('<div>No stories from this source right now.</div>');
    }
    return;
  }
  grid.innerHTML = '';
  items.forEach(it=>grid.appendChild(card(it)));
}
function renderSources(){
  const names = ['All', ...FEEDS.map(f=>f.name).filter(n=>allItems.some(i=>i.source===n))];
  sourcesEl.innerHTML = '';
  names.forEach(n=>{
    const b=document.createElement('button'); b.className='news-chip'+(n===filter?' active':''); b.textContent=n;
    b.addEventListener('click',()=>{ filter=n; renderSources(); render(); });
    sourcesEl.appendChild(b);
  });
}
function updateStamp(){ updatedEl.textContent = lastFetch ? ('updated '+(ago(lastFetch)||'just now')) : 'loading…'; }

/* ---------- load ---------- */
function saveCache(){ try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ ts:lastFetch, items:allItems })); }catch(e){} }
function loadCache(){
  try{ const c=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
    if(c && Array.isArray(c.items) && c.items.length){ allItems=c.items; lastFetch=c.ts||0; return true; } }catch(e){}
  return false;
}
async function load(manual){
  if(loading) return; loading = true;
  refreshBtn.classList.add('spin');
  if(!allItems.length) skeletons(6);
  const fresh = [], seen = new Set();
  // fetch all feeds in parallel; render progressively as each one lands
  await Promise.all(FEEDS.map(async feed=>{
    const items = await fetchFeed(feed);
    let added = false;
    items.forEach(it=>{ if(!seen.has(it.link)){ seen.add(it.link); fresh.push(it); added = true; } });
    if(added){
      fresh.sort((a,b)=>b.ts-a.ts);
      allItems = fresh.slice(0, 45);
      lastFetch = Date.now();
      renderSources(); render(); updateStamp();
    }
  }));
  if(fresh.length) saveCache();
  else { renderSources(); render(); }   // all failed → show cache or error state
  loading = false;
  refreshBtn.classList.remove('spin');
  updateStamp();
}

/* ---------- init ---------- */
if(loadCache()){ renderSources(); render(); updateStamp(); }   // instant paint from cache
load(false);                                                    // then refresh
refreshBtn.addEventListener('click',()=>load(true));
setInterval(()=>{ if(!document.hidden) load(false); }, REFRESH_MS);
setInterval(updateStamp, 30000);
})();
