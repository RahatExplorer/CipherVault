/* ============================================================
   CipherVault — Hero Odyssey lightning (Home page only)
   Vanilla port of the WebGL lightning shader + elastic hue slider.
   Performance-guarded: reduced-motion / no-WebGL fallback,
   downscaled render buffer, and paused when hidden or off-screen.
   ============================================================ */
(function(){
'use strict';
const canvas = document.getElementById('lightning');
const hero = document.querySelector('.hero-odyssey');
if(!canvas || !hero) return;

/* ---- hue slider (works even without WebGL) ---- */
const slider = document.getElementById('hueSlider');
const hueOut = document.getElementById('hueValue');
let hue = slider ? Number(slider.value) : 190;   // brand cyan ≈ 190°
function setHue(h){
  hue = h;
  if(hueOut) hueOut.textContent = Math.round(h) + '°';
  hero.style.setProperty('--hero-hue', h);
}
if(slider){
  slider.addEventListener('input',()=>{
    setHue(Number(slider.value));
    if(hueOut){ hueOut.classList.remove('bump'); void hueOut.offsetWidth; hueOut.classList.add('bump'); }
  });
}
setHue(hue);

/* ---- slowly orbit the four feature labels around the globe ----
   Runs regardless of WebGL. Labels fade as they pass the busy centre
   (a subtle depth effect) so the composition never looks packed. */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
(function(){
  const labels = Array.from(document.querySelectorAll('.odyssey-features .feature-item'));
  const fbox = document.querySelector('.odyssey-features');
  if(!labels.length || !fbox) return;
  let angle = -90, lastT = 0, raf = 0;
  function place(){
    const R = fbox.clientWidth * 0.5 + 42;             // just OUTSIDE the globe's rim
    labels.forEach((el,i)=>{
      const a = (angle + i*90) * Math.PI/180;
      const x = Math.cos(a)*R, y = Math.sin(a)*R;
      el.style.transform = 'translate(-50%,-50%) translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px)';
      el.style.opacity = (0.6 + 0.4*((Math.sin(a)+1)/2)).toFixed(3);   // subtle depth: brighter toward the front (bottom)
    });
  }
  place();
  if(reduce) return;                                   // static placement, no motion
  function loop(now){
    let dt = lastT ? (now-lastT) : 16; lastT = now; if(dt>60) dt=60;
    angle = (angle + dt*0.0035) % 360;                 // ~3.5°/sec — a slow drift
    place();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  window.addEventListener('resize', place);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){ cancelAnimationFrame(raf); raf=0; lastT=0; }
    else if(!raf){ raf=requestAnimationFrame(loop); }
  });
})();

/* ---- bail to CSS fallback when animation isn't wanted/possible ---- */
let gl = null;
try{ gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl'); }catch(e){}
if(reduce || !gl){ hero.classList.add('reduced'); canvas.style.display='none'; return; }

/* ---- shaders (GLSL is framework-agnostic — ported verbatim) ---- */
const vertexShaderSource = `
  attribute vec2 aPosition;
  void main(){ gl_Position = vec4(aPosition, 0.0, 1.0); }
`;
const fragmentShaderSource = `
  precision mediump float;
  uniform vec2 iResolution;
  uniform float iTime;
  uniform float uHue;
  uniform float uXOffset;
  uniform float uSpeed;
  uniform float uIntensity;
  uniform float uSize;
  #define OCTAVE_COUNT 10
  vec3 hsv2rgb(vec3 c){
    vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);
    return c.z*mix(vec3(1.0),rgb,c.y);
  }
  float hash11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
  float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
  mat2 rotate2d(float t){ float c=cos(t); float s=sin(t); return mat2(c,-s,s,c); }
  float noise(vec2 p){
    vec2 ip=floor(p); vec2 fp=fract(p);
    float a=hash12(ip); float b=hash12(ip+vec2(1.0,0.0));
    float c=hash12(ip+vec2(0.0,1.0)); float d=hash12(ip+vec2(1.0,1.0));
    vec2 t=smoothstep(0.0,1.0,fp);
    return mix(mix(a,b,t.x),mix(c,d,t.x),t.y);
  }
  float fbm(vec2 p){
    float value=0.0; float amplitude=0.5;
    for(int i=0;i<OCTAVE_COUNT;++i){ value+=amplitude*noise(p); p*=rotate2d(0.45); p*=2.0; amplitude*=0.5; }
    return value;
  }
  void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = fragCoord/iResolution.xy;
    uv = 2.0*uv-1.0;
    uv.x *= iResolution.x/iResolution.y;
    uv.x += uXOffset;
    uv += 2.0*fbm(uv*uSize+0.8*iTime*uSpeed)-1.0;
    float dist = abs(uv.x);
    vec3 baseColor = hsv2rgb(vec3(uHue/360.0,0.7,0.8));
    vec3 col = baseColor*pow(mix(0.0,0.07,hash11(iTime*uSpeed))/dist,1.0)*uIntensity;
    col = pow(col,vec3(1.0));
    fragColor = vec4(col,1.0);
  }
  void main(){ mainImage(gl_FragColor, gl_FragCoord.xy); }
`;

function compile(src, type){
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src); gl.compileShader(sh);
  if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS)){
    console.error('Shader compile error:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh); return null;
  }
  return sh;
}
const vs = compile(vertexShaderSource, gl.VERTEX_SHADER);
const fs = compile(fragmentShaderSource, gl.FRAGMENT_SHADER);
if(!vs || !fs){ hero.classList.add('reduced'); canvas.style.display='none'; return; }
const program = gl.createProgram();
gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
  console.error('Program link error:', gl.getProgramInfoLog(program));
  hero.classList.add('reduced'); canvas.style.display='none'; return;
}
gl.useProgram(program);

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
const aPosition = gl.getAttribLocation(program, 'aPosition');
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

const U = n => gl.getUniformLocation(program, n);
const uRes=U('iResolution'), uTime=U('iTime'), uHue=U('uHue'),
      uXOff=U('uXOffset'), uSpeed=U('uSpeed'), uInt=U('uIntensity'), uSize=U('uSize');

/* downscale the render buffer for performance — lightning is diffuse, so it
   looks great at reduced resolution and costs a fraction of the fragment work */
const quality = window.innerWidth < 700 ? 0.5 : 0.7;
function resize(){
  const w = Math.max(1, Math.floor(canvas.clientWidth * quality));
  const h = Math.max(1, Math.floor(canvas.clientHeight * quality));
  if(canvas.width!==w || canvas.height!==h){ canvas.width=w; canvas.height=h; }
}
window.addEventListener('resize', resize);

const start = performance.now();
let raf = 0, running = false;
function frame(){
  resize();
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.uniform2f(uRes, canvas.width, canvas.height);
  gl.uniform1f(uTime, (performance.now()-start)/1000);
  gl.uniform1f(uHue, hue);
  gl.uniform1f(uXOff, 0.0);
  gl.uniform1f(uSpeed, 1.6);
  gl.uniform1f(uInt, 0.6);
  gl.uniform1f(uSize, 2.0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  raf = requestAnimationFrame(frame);
}
function play(){ if(!running){ running=true; raf=requestAnimationFrame(frame); } }
function pause(){ if(running){ running=false; cancelAnimationFrame(raf); } }

document.addEventListener('visibilitychange',()=>{ document.hidden ? pause() : play(); });
// stop rendering when the hero scrolls out of view
if('IntersectionObserver' in window){
  new IntersectionObserver(es=>{ es.forEach(e=> e.isIntersecting ? play() : pause()); },{threshold:0.01}).observe(canvas);
} else {
  play();
}
play();
})();
