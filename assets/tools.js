/* ============================================================
   CipherVault — cryptography tools (toolkit page only)
   All operations run client-side via the Web Crypto API.
   ============================================================ */
(function(){
'use strict';
if(!document.querySelector('.console')) return;   // safety: only run on the toolkit page

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const enc = new TextEncoder();
const dec = new TextDecoder();
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}

/* ---------- toast + copy ---------- */
let toastT;
function toast(msg){
  const t=$('#toast'); if(!t) return;
  $('#toastMsg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(()=>t.classList.remove('show'), 2600);
}
async function copy(text, label){
  if(!text){ toast('Nothing to copy yet'); return; }
  try{ await navigator.clipboard.writeText(text); toast((label||'Copied')+' to clipboard'); }
  catch(e){
    const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta);
    ta.select(); try{document.execCommand('copy');toast('Copied to clipboard');}catch(_){toast('Copy failed');}
    ta.remove();
  }
}
$$('[data-copy]').forEach(b=>b.addEventListener('click',()=>copy($('#'+b.dataset.copy).value,'Result')));

/* ---------- tabs ---------- */
const tabs=$$('.tab');
tabs.forEach(tab=>tab.addEventListener('click',()=>selectTab(tab)));
function selectTab(tab){
  tabs.forEach(t=>t.setAttribute('aria-selected', t===tab));
  $$('.panel').forEach(p=>p.classList.remove('active'));
  $('#p-'+tab.dataset.tab).classList.add('active');
  if(tab.dataset.tab==='rsa' && !rsaKeys[rsaPurpose]) rsaGenerate();
}
$('.tabs').addEventListener('keydown',e=>{
  const i=tabs.indexOf(document.activeElement);
  if(i<0) return;
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
    e.preventDefault();
    const n=(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;
    tabs[n].focus(); selectTab(tabs[n]);
  }
});

/* ============================================================
   1. HASHING
   ============================================================ */
const HASH_ALGS=[['MD5*','MD5'],['SHA-1','SHA-1'],['SHA-256','SHA-256'],['SHA-384','SHA-384'],['SHA-512','SHA-512']];
async function sha(algo, buf){
  const h=await crypto.subtle.digest(algo, buf);
  return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
// Tiny MD5 (legacy demo only) — pure JS
function md5(str){
  function rl(n,c){return(n<<c)|(n>>>(32-c));}
  function au(a,b){const l=(a&0xffff)+(b&0xffff),m=(a>>16)+(b>>16)+(l>>16);return(m<<16)|(l&0xffff);}
  function cmn(q,a,b,x,s,t){return au(rl(au(au(a,q),au(x,t)),s),b);}
  function ff(a,b,c,d,x,s,t){return cmn((b&c)|((~b)&d),a,b,x,s,t);}
  function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&(~d)),a,b,x,s,t);}
  function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t);}
  function ii(a,b,c,d,x,s,t){return cmn(c^(b|(~d)),a,b,x,s,t);}
  function tb(s){const n=s.length,b=[];for(let i=0;i<n*8;i+=8)b[i>>5]|=(s.charCodeAt(i/8)&255)<<(i%32);return b;}
  function th(b){let s='';for(let i=0;i<b.length*4;i++)s+=((b[i>>2]>>((i%4)*8+4))&15).toString(16)+((b[i>>2]>>((i%4)*8))&15).toString(16);return s;}
  const utf8=unescape(encodeURIComponent(str));
  let x=tb(utf8);const len=utf8.length*8;
  x[len>>5]|=0x80<<(len%32);x[(((len+64)>>>9)<<4)+14]=len;
  let a=1732584193,b=-271733879,c=-1732584194,d=271733878;
  for(let i=0;i<x.length;i+=16){
    const oa=a,ob=b,oc=c,od=d;
    a=ff(a,b,c,d,x[i],7,-680876936);d=ff(d,a,b,c,x[i+1],12,-389564586);c=ff(c,d,a,b,x[i+2],17,606105819);b=ff(b,c,d,a,x[i+3],22,-1044525330);
    a=ff(a,b,c,d,x[i+4],7,-176418897);d=ff(d,a,b,c,x[i+5],12,1200080426);c=ff(c,d,a,b,x[i+6],17,-1473231341);b=ff(b,c,d,a,x[i+7],22,-45705983);
    a=ff(a,b,c,d,x[i+8],7,1770035416);d=ff(d,a,b,c,x[i+9],12,-1958414417);c=ff(c,d,a,b,x[i+10],17,-42063);b=ff(b,c,d,a,x[i+11],22,-1990404162);
    a=ff(a,b,c,d,x[i+12],7,1804603682);d=ff(d,a,b,c,x[i+13],12,-40341101);c=ff(c,d,a,b,x[i+14],17,-1502002290);b=ff(b,c,d,a,x[i+15],22,1236535329);
    a=gg(a,b,c,d,x[i+1],5,-165796510);d=gg(d,a,b,c,x[i+6],9,-1069501632);c=gg(c,d,a,b,x[i+11],14,643717713);b=gg(b,c,d,a,x[i],20,-373897302);
    a=gg(a,b,c,d,x[i+5],5,-701558691);d=gg(d,a,b,c,x[i+10],9,38016083);c=gg(c,d,a,b,x[i+15],14,-660478335);b=gg(b,c,d,a,x[i+4],20,-405537848);
    a=gg(a,b,c,d,x[i+9],5,568446438);d=gg(d,a,b,c,x[i+14],9,-1019803690);c=gg(c,d,a,b,x[i+3],14,-187363961);b=gg(b,c,d,a,x[i+8],20,1163531501);
    a=gg(a,b,c,d,x[i+13],5,-1444681467);d=gg(d,a,b,c,x[i+2],9,-51403784);c=gg(c,d,a,b,x[i+7],14,1735328473);b=gg(b,c,d,a,x[i+12],20,-1926607734);
    a=hh(a,b,c,d,x[i+5],4,-378558);d=hh(d,a,b,c,x[i+8],11,-2022574463);c=hh(c,d,a,b,x[i+11],16,1839030562);b=hh(b,c,d,a,x[i+14],23,-35309556);
    a=hh(a,b,c,d,x[i+1],4,-1530992060);d=hh(d,a,b,c,x[i+4],11,1272893353);c=hh(c,d,a,b,x[i+7],16,-155497632);b=hh(b,c,d,a,x[i+10],23,-1094730640);
    a=hh(a,b,c,d,x[i+13],4,681279174);d=hh(d,a,b,c,x[i],11,-358537222);c=hh(c,d,a,b,x[i+3],16,-722521979);b=hh(b,c,d,a,x[i+6],23,76029189);
    a=hh(a,b,c,d,x[i+9],4,-640364487);d=hh(d,a,b,c,x[i+12],11,-421815835);c=hh(c,d,a,b,x[i+15],16,530742520);b=hh(b,c,d,a,x[i+2],23,-995338651);
    a=ii(a,b,c,d,x[i],6,-198630844);d=ii(d,a,b,c,x[i+7],10,1126891415);c=ii(c,d,a,b,x[i+14],15,-1416354905);b=ii(b,c,d,a,x[i+5],21,-57434055);
    a=ii(a,b,c,d,x[i+12],6,1700485571);d=ii(d,a,b,c,x[i+3],10,-1894986606);c=ii(c,d,a,b,x[i+10],15,-1051523);b=ii(b,c,d,a,x[i+1],21,-2054922799);
    a=ii(a,b,c,d,x[i+8],6,1873313359);d=ii(d,a,b,c,x[i+15],10,-30611744);c=ii(c,d,a,b,x[i+6],15,-1560198380);b=ii(b,c,d,a,x[i+13],21,1309151649);
    a=ii(a,b,c,d,x[i+4],6,-145523070);d=ii(d,a,b,c,x[i+11],10,-1120210379);c=ii(c,d,a,b,x[i+2],15,718787259);b=ii(b,c,d,a,x[i+9],21,-343485551);
    a=au(a,oa);b=au(b,ob);c=au(c,oc);d=au(d,od);
  }
  return th([a,b,c,d]);
}
async function renderHashes(){
  const txt=$('#hashInput').value;
  const buf=enc.encode(txt);
  $('#hashBytes').textContent=buf.length;
  const box=$('#hashOut'); box.innerHTML='';
  for(const [label,algo] of HASH_ALGS){
    let val;
    try{ val = algo==='MD5' ? md5(txt) : await sha(algo, buf); }
    catch(e){ val='(unavailable)'; }
    const row=document.createElement('div'); row.className='hashline';
    row.innerHTML=`<span class="algo">${label}</span><span class="val">${val}</span>`;
    const btn=document.createElement('button'); btn.className='copy-ico'; btn.setAttribute('aria-label','Copy '+label+' hash');
    btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
    btn.addEventListener('click',()=>copy(val, label));
    row.appendChild(btn); box.appendChild(row);
  }
}
$('#hashInput').addEventListener('input', debounce(renderHashes, 120));

/* ============================================================
   2. ENCODER
   ============================================================ */
let encFmt='base64';
$$('[data-fmt]').forEach(b=>b.addEventListener('click',()=>{
  $$('[data-fmt]').forEach(x=>x.setAttribute('aria-pressed', x===b));
  encFmt=b.dataset.fmt; runEncode();
}));
function toBase64(str){return btoa(unescape(encodeURIComponent(str)));}
function fromBase64(str){return decodeURIComponent(escape(atob(str.trim())));}
function toHex(str){return[...enc.encode(str)].map(b=>b.toString(16).padStart(2,'0')).join(' ');}
function fromHex(str){const h=str.replace(/[^0-9a-fA-F]/g,'');const a=[];for(let i=0;i<h.length;i+=2)a.push(parseInt(h.substr(i,2),16));return dec.decode(new Uint8Array(a));}
function toBin(str){return[...enc.encode(str)].map(b=>b.toString(2).padStart(8,'0')).join(' ');}
function fromBin(str){const parts=str.trim().split(/\s+/);return dec.decode(new Uint8Array(parts.map(p=>parseInt(p,2))));}
function encodeVal(v){
  if(encFmt==='base64')return toBase64(v);
  if(encFmt==='hex')return toHex(v);
  if(encFmt==='url')return encodeURIComponent(v);
  if(encFmt==='binary')return toBin(v);
}
function decodeVal(v){
  if(encFmt==='base64')return fromBase64(v);
  if(encFmt==='hex')return fromHex(v);
  if(encFmt==='url')return decodeURIComponent(v);
  if(encFmt==='binary')return fromBin(v);
}
function runEncode(){try{$('#encOut').value=encodeVal($('#encIn').value);}catch(e){$('#encOut').value='⚠ '+e.message;}}
function runDecode(){try{$('#encOut').value=decodeVal($('#encIn').value);}catch(e){$('#encOut').value='⚠ Invalid '+encFmt+' input';}}
$('#encRun').addEventListener('click',runEncode);
$('#decRun').addEventListener('click',runDecode);
$('#encSwap').addEventListener('click',()=>{const a=$('#encIn'),b=$('#encOut');const t=a.value;a.value=b.value;b.value=t;});
$('#encIn').addEventListener('input',debounce(runEncode,150));

/* ============================================================
   3. AES-GCM VAULT
   ============================================================ */
let aesMode='enc';
$$('[data-aes]').forEach(b=>b.addEventListener('click',()=>{
  $$('[data-aes]').forEach(x=>x.setAttribute('aria-pressed', x===b));
  aesMode=b.dataset.aes; syncAesLabels();
}));
function syncAesLabels(){
  const e=aesMode==='enc';
  $('#aesInLbl').textContent=e?'Plaintext':'Ciphertext (Base64)';
  $('#aesOutLbl').textContent=e?'Ciphertext (Base64)':'Plaintext';
  $('#aesBtnLbl').textContent=e?'Encrypt':'Decrypt';
  $('#aesIn').placeholder=e?'Message to encrypt…':'Paste the Base64 blob…';
}
async function deriveKey(pass, salt){
  const base=await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {name:'PBKDF2', salt, iterations:250000, hash:'SHA-256'},
    base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
function b64enc(bytes){let s='';bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s);}
function b64dec(str){const bin=atob(str.trim());return Uint8Array.from(bin,c=>c.charCodeAt(0));}
async function aesEncrypt(){
  const pass=$('#aesPass').value, msg=$('#aesIn').value;
  if(!pass){toast('Enter a passphrase');return;}
  if(!msg){toast('Enter a message');return;}
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await deriveKey(pass, salt);
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, enc.encode(msg)));
  const packed=new Uint8Array(salt.length+iv.length+ct.length);
  packed.set(salt,0);packed.set(iv,16);packed.set(ct,28);
  $('#aesOut').value=b64enc(packed);
}
async function aesDecrypt(){
  const pass=$('#aesPass').value, blob=$('#aesIn').value.trim();
  if(!pass){toast('Enter a passphrase');return;}
  if(!blob){toast('Paste a ciphertext blob');return;}
  try{
    const packed=b64dec(blob);
    const salt=packed.slice(0,16), iv=packed.slice(16,28), ct=packed.slice(28);
    const key=await deriveKey(pass, salt);
    const pt=await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, ct);
    $('#aesOut').value=dec.decode(pt);
  }catch(e){
    $('#aesOut').value='';
    toast('Decryption failed — wrong passphrase or corrupt data');
  }
}
$('#aesRun').addEventListener('click',async function(){
  this.disabled=true; const lbl=$('#aesBtnLbl').textContent; $('#aesBtnLbl').textContent='Working…';
  if(window.CVLoader) window.CVLoader.show(aesMode==='enc'?'Encrypting':'Decrypting');
  try{ aesMode==='enc' ? await aesEncrypt() : await aesDecrypt(); }
  finally{ this.disabled=false; $('#aesBtnLbl').textContent=lbl; if(window.CVLoader) window.CVLoader.hide(); }
});
$('#aesClear').addEventListener('click',()=>{$('#aesIn').value='';$('#aesOut').value='';});
syncAesLabels();

/* ============================================================
   4. CLASSIC CIPHERS
   ============================================================ */
let cipDir='enc';
$$('[data-dir]').forEach(b=>b.addEventListener('click',()=>{
  $$('[data-dir]').forEach(x=>x.setAttribute('aria-pressed', x===b));
  cipDir=b.dataset.dir; runCipher();
}));
$('#cipType').addEventListener('change',()=>{
  const t=$('#cipType').value, kf=$('#keyField'), lbl=$('#cipKeyLbl'), key=$('#cipKey');
  const hideKey = (t==='rot13'||t==='atbash');
  kf.style.display=hideKey?'none':'flex';
  if(t==='caesar'){lbl.textContent='Shift (0–25)';key.value=/^\d+$/.test(key.value)?key.value:'3';}
  else if(t==='vigenere'){lbl.textContent='Keyword';key.value=/[a-z]/i.test(key.value)?key.value:'LEMON';}
  else if(t==='xor'){lbl.textContent='Key';key.value='secret';}
  runCipher();
});
function shiftChar(c, n){
  const code=c.charCodeAt(0);
  if(code>=65&&code<=90)return String.fromCharCode((code-65+n+26)%26+65);
  if(code>=97&&code<=122)return String.fromCharCode((code-97+n+26)%26+97);
  return c;
}
function caesar(str,n){return str.split('').map(c=>shiftChar(c,n)).join('');}
function atbash(str){return str.split('').map(c=>{
  const code=c.charCodeAt(0);
  if(code>=65&&code<=90)return String.fromCharCode(90-(code-65));
  if(code>=97&&code<=122)return String.fromCharCode(122-(code-97));
  return c;}).join('');}
function vigenere(str,key,dir){
  key=key.replace(/[^a-z]/gi,'');if(!key)return str;
  let ki=0;
  return str.split('').map(c=>{
    if(!/[a-z]/i.test(c))return c;
    let k=key[ki%key.length].toLowerCase().charCodeAt(0)-97;
    if(dir==='dec')k=-k;
    ki++;
    return shiftChar(c,k);
  }).join('');
}
function xorHex(str,key,dir){
  if(!key)return str;
  if(dir==='enc'){
    const bytes=enc.encode(str);
    return [...bytes].map((b,i)=>(b^key.charCodeAt(i%key.length)).toString(16).padStart(2,'0')).join('');
  }else{
    const h=str.replace(/[^0-9a-f]/gi,'');const out=[];
    for(let i=0;i<h.length;i+=2)out.push(parseInt(h.substr(i,2),16)^key.charCodeAt((i/2)%key.length));
    return dec.decode(new Uint8Array(out));
  }
}
function runCipher(){
  const t=$('#cipType').value, v=$('#cipIn').value, k=$('#cipKey').value;
  let out='';
  try{
    if(t==='caesar'){let n=parseInt(k,10)||0;if(cipDir==='dec')n=-n;out=caesar(v,n);}
    else if(t==='rot13'){out=caesar(v,13);}
    else if(t==='atbash'){out=atbash(v);}
    else if(t==='vigenere'){out=vigenere(v,k,cipDir);}
    else if(t==='xor'){out=xorHex(v,k,cipDir);}
  }catch(e){out='⚠ '+e.message;}
  $('#cipOut').value=out;
}
$('#cipRun').addEventListener('click',runCipher);
$('#cipIn').addEventListener('input',debounce(runCipher,150));
$('#cipKey').addEventListener('input',debounce(runCipher,150));

/* ============================================================
   5. PASSWORD STRENGTH + GENERATOR
   ============================================================ */
function analyze(pw){
  if(!pw)return{bits:0,pool:0,checks:{len:false,upper:false,lower:false,num:false,sym:false}};
  let pool=0;
  const checks={
    lower:/[a-z]/.test(pw), upper:/[A-Z]/.test(pw),
    num:/[0-9]/.test(pw), sym:/[^A-Za-z0-9]/.test(pw),
    len:pw.length>=12
  };
  if(checks.lower)pool+=26; if(checks.upper)pool+=26;
  if(checks.num)pool+=10; if(checks.sym)pool+=33;
  const bits=pw.length*Math.log2(pool||1);
  return{bits:Math.round(bits),pool,checks};
}
function crackTime(bits){
  const guesses=Math.pow(2,bits)/2;
  const perSec=1e10; // 10B/s offline attacker
  let s=guesses/perSec;
  if(s<1)return'instant';
  const units=[['years',3.154e7],['days',86400],['hours',3600],['minutes',60],['seconds',1]];
  for(const [name,secs] of units){
    if(s>=secs){const v=s/secs; if(name==='years'&&v>1e6)return'centuries+';return Math.round(v)+' '+name;}
  }
  return'instant';
}
const CHECK_META=[['len','12+ characters'],['upper','Uppercase'],['lower','Lowercase'],['num','Numbers'],['sym','Symbols']];
function renderStrength(){
  const pw=$('#pwTest').value;
  const {bits,checks}=analyze(pw);
  const bar=$('#pwBar');
  let pct=Math.min(100, bits/1.28), color, verdict;
  if(bits===0){color='var(--muted)';verdict='—';pct=0;}
  else if(bits<40){color='var(--danger)';verdict='Weak';}
  else if(bits<70){color='var(--warn)';verdict='Fair';}
  else if(bits<100){color='var(--accent-2)';verdict='Strong';}
  else{color='var(--accent)';verdict='Fortress';}
  bar.style.width=pct+'%'; bar.style.background=color;
  $('#pwVerdict').textContent=verdict; $('#pwVerdict').style.color=color;
  $('#pwEntropy').textContent=bits;
  $('#pwCrack').textContent=bits?crackTime(bits):'—';
  const box=$('#pwChecks'); box.innerHTML='';
  CHECK_META.forEach(([k,label])=>{
    const ok=checks[k];
    const el=document.createElement('div'); el.className='check'+(ok?' ok':'');
    el.innerHTML=(ok
      ?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
      :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/></svg>')
      +'<span>'+label+'</span>';
    box.appendChild(el);
  });
}
$('#pwTest').addEventListener('input',renderStrength);

const genLen=$('#genLen');
genLen.addEventListener('input',()=>{$('#genLenVal').textContent='length '+genLen.value;});
function generate(){
  let pool='';
  if($('#gU').checked)pool+='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if($('#gL').checked)pool+='abcdefghijklmnopqrstuvwxyz';
  if($('#gN').checked)pool+='0123456789';
  if($('#gS').checked)pool+='!@#$%^&*()-_=+[]{};:,.<>?';
  if(!pool){toast('Select at least one character set');return;}
  const len=parseInt(genLen.value,10);
  const rnd=crypto.getRandomValues(new Uint32Array(len));
  let out='';
  for(let i=0;i<len;i++)out+=pool[rnd[i]%pool.length];
  $('#genOut').value=out;
  $('#pwTest').value=out; renderStrength();
}
$('#genRun').addEventListener('click',generate);

/* ============================================================
   6. RSA (RSA-OAEP encrypt/decrypt · RSA-PSS sign/verify)
   ============================================================ */
let rsaPurpose='enc';
const rsaKeys={enc:null, sig:null};
function pem(b64, label){
  const body=(b64.match(/.{1,64}/g)||[b64]).join('\n');
  return '-----BEGIN '+label+'-----\n'+body+'\n-----END '+label+'-----';
}
async function exportPub(key){const b=await crypto.subtle.exportKey('spki',key);return pem(b64enc(new Uint8Array(b)),'PUBLIC KEY');}
async function exportPriv(key){const b=await crypto.subtle.exportKey('pkcs8',key);return pem(b64enc(new Uint8Array(b)),'PRIVATE KEY');}
function rsaStatus(msg,color){const el=$('#rsaStatus');el.textContent=msg;el.style.color=color||'var(--fg-faint)';}

$$('[data-rsa]').forEach(b=>b.addEventListener('click',()=>{
  $$('[data-rsa]').forEach(x=>x.setAttribute('aria-pressed', x===b));
  rsaPurpose=b.dataset.rsa; syncRsa();
  if(!rsaKeys[rsaPurpose]) rsaGenerate();
}));
function syncRsa(){
  const e=rsaPurpose==='enc';
  $('#rsaEncControls').style.display=e?'flex':'none';
  $('#rsaSigControls').style.display=e?'none':'flex';
  $('#rsaInLbl').textContent=e?'Message':'Message to sign';
  $('#rsaOutLbl').textContent=e?'Ciphertext (Base64)':'Signature (Base64)';
  $('#rsaOut').value='';
  rsaStatus('');
  const k=rsaKeys[rsaPurpose];
  $('#rsaPub').value=k?k.pubPem:'';
  $('#rsaPriv').value=k?k.privPem:'';
}
async function rsaGenerate(){
  const btn=$('#rsaGen'); btn.disabled=true; const html=btn.innerHTML; btn.innerHTML='Generating…';
  if(window.CVLoader) window.CVLoader.show('Generating');
  rsaStatus('Generating 2048-bit key pair…');
  try{
    const algo = rsaPurpose==='enc'
      ? {name:'RSA-OAEP', modulusLength:2048, publicExponent:new Uint8Array([1,0,1]), hash:'SHA-256'}
      : {name:'RSA-PSS',  modulusLength:2048, publicExponent:new Uint8Array([1,0,1]), hash:'SHA-256'};
    const usages = rsaPurpose==='enc' ? ['encrypt','decrypt'] : ['sign','verify'];
    const pair=await crypto.subtle.generateKey(algo, true, usages);
    const pubPem=await exportPub(pair.publicKey), privPem=await exportPriv(pair.privateKey);
    rsaKeys[rsaPurpose]={pair, pubPem, privPem};
    $('#rsaPub').value=pubPem; $('#rsaPriv').value=privPem;
    rsaStatus('✓ 2048-bit '+(rsaPurpose==='enc'?'RSA-OAEP':'RSA-PSS')+' key pair ready','var(--accent)');
  }catch(e){ rsaStatus('⚠ Key generation failed: '+e.message,'var(--danger)'); }
  finally{ btn.disabled=false; btn.innerHTML=html; if(window.CVLoader) window.CVLoader.hide(); }
}
$('#rsaGen').addEventListener('click',rsaGenerate);
$('#rsaSwap').addEventListener('click',()=>{const a=$('#rsaIn'),b=$('#rsaOut');const t=a.value;a.value=b.value;b.value=t;});

$('#rsaEncrypt').addEventListener('click',async()=>{
  const k=rsaKeys.enc; if(!k){toast('Generate a key pair first');return;}
  const msg=$('#rsaIn').value; if(!msg){toast('Enter a message');return;}
  try{
    const ct=await crypto.subtle.encrypt({name:'RSA-OAEP'}, k.pair.publicKey, enc.encode(msg));
    $('#rsaOut').value=b64enc(new Uint8Array(ct));
    rsaStatus('Encrypted with the public key.');
  }catch(e){ rsaStatus('⚠ '+(e.name==='OperationError'?'Message too long for a 2048-bit RSA key (max ~190 bytes).':e.message),'var(--danger)'); }
});
$('#rsaDecrypt').addEventListener('click',async()=>{
  const k=rsaKeys.enc; if(!k){toast('Generate a key pair first');return;}
  const blob=$('#rsaIn').value.trim(); if(!blob){toast('Paste a ciphertext blob into the input');return;}
  try{
    const pt=await crypto.subtle.decrypt({name:'RSA-OAEP'}, k.pair.privateKey, b64dec(blob));
    $('#rsaOut').value=dec.decode(pt);
    rsaStatus('✓ Decrypted with the private key.','var(--accent)');
  }catch(e){ rsaStatus('✗ Decryption failed — wrong key or invalid ciphertext.','var(--danger)'); }
});
$('#rsaSign').addEventListener('click',async()=>{
  const k=rsaKeys.sig; if(!k){toast('Generate a key pair first');return;}
  const msg=$('#rsaIn').value; if(!msg){toast('Enter a message to sign');return;}
  try{
    const sig=await crypto.subtle.sign({name:'RSA-PSS', saltLength:32}, k.pair.privateKey, enc.encode(msg));
    $('#rsaOut').value=b64enc(new Uint8Array(sig));
    rsaStatus('Signed. Edit the message, then Verify to see tamper-detection.');
  }catch(e){ rsaStatus('⚠ '+e.message,'var(--danger)'); }
});
$('#rsaVerify').addEventListener('click',async()=>{
  const k=rsaKeys.sig; if(!k){toast('Generate a key pair first');return;}
  const sig=$('#rsaOut').value.trim(); if(!sig){toast('Sign a message first to produce a signature');return;}
  try{
    const ok=await crypto.subtle.verify({name:'RSA-PSS', saltLength:32}, k.pair.publicKey, b64dec(sig), enc.encode($('#rsaIn').value));
    ok ? rsaStatus('✓ Signature valid — message is authentic and untampered.','var(--accent)')
       : rsaStatus('✗ Invalid signature — message was altered or key mismatch.','var(--danger)');
  }catch(e){ rsaStatus('✗ Verification error — signature is malformed.','var(--danger)'); }
});

/* ============================================================
   7. BREACH CHECK (Have I Been Pwned · Pwned Passwords, k-anonymity)
   ============================================================ */
const BR_WARN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
const BR_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>';
async function sha1hex(str){
  const buf=await crypto.subtle.digest('SHA-1', enc.encode(str));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
}
async function checkBreach(){
  const pw=$('#breachInput').value;
  if(!pw){ toast('Enter a password to check'); return; }
  const box=$('#breachResult'), btn=$('#breachRun'), html=btn.innerHTML;
  btn.disabled=true; btn.innerHTML='Checking…';
  box.className='breach-result show'; box.style.borderColor=''; box.innerHTML='<div class="br-head" style="color:var(--fg-dim)">Querying Have I Been Pwned…</div>';
  try{
    const hash=await sha1hex(pw), prefix=hash.slice(0,5), suffix=hash.slice(5);
    const res=await fetch('https://api.pwnedpasswords.com/range/'+prefix);
    if(!res.ok) throw new Error('HTTP '+res.status);
    const text=await res.text();
    let count=0;
    text.split('\n').forEach(line=>{ const p=line.trim().split(':'); if(p[0]===suffix) count=parseInt(p[1],10)||0; });
    if(count>0){
      box.className='breach-result show pwned';
      box.innerHTML='<div class="br-head">'+BR_WARN+'Found in a breach</div>'+
        '<p>This password has appeared <b>'+count.toLocaleString()+'</b> times in known data breaches. Attackers already have it — never use it anywhere. Generate a strong, unique one in the <b>Passwords</b> tab.</p>';
    }else{
      box.className='breach-result show safe';
      box.innerHTML='<div class="br-head">'+BR_CHECK+'No breach found</div>'+
        '<p>This password wasn’t found in any known breach dataset — a good sign. But “not breached” doesn’t mean “strong”; check its entropy in the <b>Passwords</b> tab too.</p>';
    }
  }catch(e){
    box.className='breach-result show'; box.style.borderColor='var(--warn)';
    box.innerHTML='<div class="br-head" style="color:var(--warn)">'+BR_WARN+'Couldn’t reach the service</div>'+
      '<p>The Have I Been Pwned API couldn’t be reached ('+ (e.message||'network error') +'). This is the only tool that needs the network — check your connection and try again.</p>';
  }finally{ btn.disabled=false; btn.innerHTML=html; }
}
$('#breachRun').addEventListener('click',checkBreach);
$('#breachInput').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); checkBreach(); } });

/* ---------- init all tools ---------- */
renderHashes(); runEncode(); runCipher(); renderStrength(); generate();
})();
