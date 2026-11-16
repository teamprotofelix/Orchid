'use strict';
(()=>{
const d=window.ORCHID_DATA,el=document.getElementById('deepGuideGrid');if(!d||!el)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
el.innerHTML=d.deepGuides.map((item,i)=>{const src=d.sources[item.source];return `<details class="deep-guide-card" ${i===1?'open':''}><summary><span class="deep-guide-icon">${item.icon}</span><div><small>${esc(item.meta)}</small><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p></div><span class="deep-guide-arrow">+</span></summary><div class="deep-guide-content"><ol>${item.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p class="deep-guide-warning">⚠ ${esc(item.warning)}</p>${src?`<a href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">근거 원문 확인 ↗</a>`:''}</div></details>`}).join('');
})();
