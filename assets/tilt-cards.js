/* ============================================================
   CipherVault — 3D tilt cards
   Rebuilds .feat / .concept / .step into the UIVERSE-style tilt
   card (glass panel + nested-circles logo + layered depth),
   reusing each card's existing icon / number / title / text.
   ============================================================ */
(function(){
'use strict';
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

document.querySelectorAll('.feat, .concept, .step').forEach(card=>{
  if(card.dataset.tilt) return; card.dataset.tilt = '1';

  const iconSvg = card.querySelector('.ico svg');
  const num     = card.querySelector('.step-num');
  const tag     = card.querySelector('.tag');
  const title   = card.querySelector('h3');
  const text    = card.querySelector('p');

  const inner = iconSvg ? iconSvg.outerHTML
              : num     ? '<span class="tc-num">'+esc(num.textContent)+'</span>'
              : '';

  card.innerHTML =
    '<div class="tc-card">'+
      '<div class="tc-glass"></div>'+
      '<div class="tc-logo">'+
        '<span class="tc-circle tc-c1"></span>'+
        '<span class="tc-circle tc-c2"></span>'+
        '<span class="tc-circle tc-c3"></span>'+
        '<span class="tc-circle tc-c4"></span>'+
        '<span class="tc-circle tc-c5">'+inner+'</span>'+
      '</div>'+
      '<div class="tc-content">'+
        (tag   ? '<span class="tc-tag">'+esc(tag.textContent)+'</span>' : '')+
        (title ? '<span class="tc-title">'+esc(title.textContent)+'</span>' : '')+
        (text  ? '<span class="tc-text">'+esc(text.textContent)+'</span>' : '')+
      '</div>'+
    '</div>';
});
})();
