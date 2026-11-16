'use strict';
(()=>{
const D=window.ORCHID_DATA; if(!D)return;
const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const img=name=>`assets/images/${encodeURIComponent(name)}.webp`;
const sourceLink=index=>index===null||index===undefined?'':D.sources[index]?.url||'';
const state={filter:'all',query:'',photoUrl:null};
let toastTimer;
function showToast(message){let el=$('#toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true},3600)}
const typeName={root:'뿌리',leaf:'잎',crown:'생장점',flower:'꽃·봉오리',pest:'해충'};
function renderConditions(){
 const items=D.conditions.filter(item=>(state.filter==='all'||item.category===state.filter)&&(!state.query||[item.name,item.teaser,...item.clues,...item.causes].join(' ').toLowerCase().includes(state.query)));
 $('#conditionGrid').innerHTML=items.map(item=>`<button type="button" class="condition-card" data-id="${item.id}" aria-label="${esc(item.name)} 상태 상세 보기"><div class="picture"><img loading="lazy" src="${img(item.img)}" alt="AI 생성 참고 이미지: ${esc(item.name)}"><span class="condition-tag level-${item.level}">${esc(item.status)}</span></div><div class="condition-body"><h3>${esc(item.name)}</h3><p>${esc(item.teaser)}</p><span class="condition-see">자세히 비교하기 ↗</span></div></button>`).join('');
 $('#compareEmpty').hidden=!!items.length;
}
function openDetail(id){
 const item=D.conditions.find(c=>c.id===id);if(!item)return;
 const link=sourceLink(item.source);
 $('#detailContent').innerHTML=`<div class="detail-top"><img src="${img(item.img)}" alt="AI 생성 참고 이미지: ${esc(item.name)}"></div><div class="detail-copy"><div class="section-index">${esc(typeName[item.category])} · ${esc(item.status)}</div><h3>${esc(item.name)}</h3><p class="subtitle">${esc(item.teaser)} · AI 생성 실사형 참고 이미지</p><h4>🔎 관찰 포인트</h4><ul>${item.clues.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><h4>💡 생각할 수 있는 원인</h4><ul>${item.causes.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><h4>🛠️ 이렇게 대처해요</h4><ol>${item.action.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p class="detail-warning">⚠️ 주의: ${esc(item.avoid)}</p>${link?`<a class="detail-source" href="${esc(link)}" target="_blank" rel="noopener noreferrer">참고 근거 원문 확인 ↗</a>`:''}<button type="button" class="btn dark" data-compare-id="${item.id}">이 이미지로 나란히 비교 ↗</button><p class="visual-note">다른 질환이나 환경 문제가 비슷한 외형을 만들 수 있습니다. 진단이 아닌 초기 관찰 가이드입니다.</p></div>`;
 const dialog=$('#detailDialog'); if(!dialog.open)dialog.showModal();
}
$$('#filterPills .filter').forEach(button=>button.addEventListener('click',()=>{
 state.filter=button.dataset.filter;
 $$('#filterPills .filter').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});renderConditions();
}));
$('#searchInput').addEventListener('input',e=>{state.query=e.target.value.trim().toLowerCase();renderConditions()});
$('#conditionGrid').addEventListener('click',e=>{let b=e.target.closest('[data-id]');if(b)openDetail(b.dataset.id)});
$('#detailContent').addEventListener('click',e=>{const button=e.target.closest('[data-compare-id]');if(!button)return;const id=button.dataset.compareId;$('#referenceSelect').value=id;setReference(id);$('#detailDialog').close();$('#photoComparison').scrollIntoView({behavior:'smooth',block:'center'});});
$('#detailClose').addEventListener('click',()=>$('#detailDialog').close());
$('#detailDialog').addEventListener('click',e=>{if(e.target===$('#detailDialog'))e.target.close()});
$('#posterClose').addEventListener('click',()=>$('#posterDialog').close());
$('#posterDialog').addEventListener('click',e=>{if(e.target===$('#posterDialog'))e.target.close()});
$$('.poster-card').forEach(b=>b.addEventListener('click',()=>{
 $('#posterDialogTitle').textContent=b.dataset.title;
 $('#posterLarge').src=img(b.dataset.poster);$('#posterOriginal').href=img(b.dataset.poster);
 $('#posterLarge').alt=`${b.dataset.title} 대형 인포그래픽`;
 $('#posterDialog').showModal();
}));
function setReference(id){let item=D.conditions.find(v=>v.id===id);if(!item)return;$('#referencePhoto').src=img(item.img);$('#referencePhoto').alt=`AI 생성 참고 이미지: ${item.name}`;$('#referenceCaption').textContent=item.name;}
$('#referenceSelect').innerHTML=D.conditions.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
$('#referenceSelect').addEventListener('change',e=>setReference(e.target.value));
const photoDefault=img('photo-empty');
function resetPhoto(){
 if(state.photoUrl)URL.revokeObjectURL(state.photoUrl);
 state.photoUrl=null;$('#ownPhoto').value='';
 const preview=$('#userPhotoPreview');preview.src=photoDefault;preview.classList.add('is-fallback');
 $('#photoPlaceholder').hidden=false;$('#userPhotoCaption').textContent='내 사진 · 아직 선택하지 않음';$('#clearPhoto').hidden=true;
}
$('#userPhotoPreview').addEventListener('error',()=>{
 const preview=$('#userPhotoPreview');
 if(preview.classList.contains('is-fallback'))return;
 resetPhoto();showToast('사진을 읽지 못했습니다. 다른 이미지를 선택해 주세요.');
});
$('#ownPhoto').addEventListener('change',e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(!file.type.startsWith('image/')){showToast('이미지 파일을 선택해 주세요.');resetPhoto();return;}
 if(file.size>18*1024*1024){showToast('18MB 이하 이미지를 선택해 주세요.');resetPhoto();return;}
 const url=URL.createObjectURL(file);if(state.photoUrl)URL.revokeObjectURL(state.photoUrl);
 state.photoUrl=url;const preview=$('#userPhotoPreview');
 preview.src=url;preview.classList.remove('is-fallback');$('#photoPlaceholder').hidden=true;
 $('#userPhotoCaption').textContent='내 사진 · 기기에서만 표시';$('#clearPhoto').hidden=false;
 showToast('사진은 서버에 전송되지 않습니다.');
});
$('#clearPhoto').addEventListener('click',resetPhoto);
// Care cards: native details allows keyboard interaction.
$('#careGrid').innerHTML=D.care.map((c,i)=>`<details class="care-card" ${i===1?'open':''}><summary><span class="care-icon">${c.icon}</span><h3>${esc(c.name)}</h3><p>${esc(c.summary)}</p><span class="care-chevron">⌄</span></summary><ul>${c.details.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></details>`).join('');
// Guided observation: does not make a medical or botanical diagnosis.
const triage={step:0,part:null,moist:null,speed:null};
const QUESTIONS=[
 {heading:'어느 부분에 이상이 보이나요?',options:[['root','🪴 뿌리·화분'],['leaf','🍃 잎'],['crown','🌱 잎 가운데·생장점'],['flower','🌸 꽃·봉오리'],['pest','🐛 벌레·반점']]},
 {heading:'배지와 뿌리는 어떤 상태인가요?',options:[['wet','💦 오래 젖어 있고 무르다'],['dry','☀️ 아주 건조하고 가볍다'],['normal','🌿 상태가 괜찮아 보인다'],['unknown','❔ 아직 확인하지 못했다']]},
 {heading:'증상이 얼마나 빠르게 변하나요?',options:[['rapid','⚠️ 하루 이틀 사이 급격히 번진다'],['stable','🕊️ 서서히 변하거나 거의 그대로다'],['unknown','❔ 잘 모르겠다']]}
];
function triageRecommendations(){
 if(triage.speed==='rapid'||(triage.part==='crown'&&triage.moist==='wet'))return ['crown-rot','leaf-spot','root-rot'];
 if(triage.part==='root')return triage.moist==='dry'?['root-dry','healthy','root-rot']:['root-rot','root-dry','healthy'];
 if(triage.part==='crown')return ['crown-rot','leaf-spot'];
 if(triage.part==='pest')return ['pest-mealy','pest-scale','leaf-spot'];
 if(triage.part==='flower')return ['bud-blast','leaf-dark'];
 if(triage.moist==='wet')return ['root-rot','leaf-wilt','leaf-spot'];
 if(triage.moist==='dry')return ['leaf-wilt','root-dry','leaf-sun'];
 return ['leaf-sun','leaf-aging','leaf-wilt','leaf-dark'];
}
function renderTriage(){
 $('#triageProgress').textContent=triage.step<3?`${triage.step+1} / 3`:'관찰 결과';
 $('#triageBack').disabled=triage.step===0;
 if(triage.step<3){let q=QUESTIONS[triage.step];$('#triageQuestion').textContent=q.heading;$('#triageChoices').innerHTML=q.options.map(([key,label])=>`<button class="choice" data-value="${key}" type="button">${esc(label)} <span aria-hidden="true">→</span></button>`).join('');return;}
 $('#triageQuestion').textContent='이 항목부터 확인해 보세요.';
 const warning=triage.speed==='rapid'||(triage.part==='crown'&&triage.moist==='wet');
 const matches=triageRecommendations();
 $('#triageChoices').innerHTML=`<div class="triage-result" style="grid-column:1/-1"><h4>${warning?'⚠️ 빠르게 번지는 증상입니다':'관찰에 도움이 되는 참고 항목'}</h4><p>${warning?'다른 난과 격리하고 잎에 물을 뿌리지 마세요. 악취·무름·급속 확산 시 전문가 상담을 권합니다.':'아래 후보는 증상의 유사성을 바탕으로 한 참고 자료입니다. 외형만으로 원인을 확정할 수 없습니다.'}</p>${matches.map(id=>{let c=D.conditions.find(x=>x.id===id);return `<button type="button" data-open-detail="${c.id}">${esc(c.name)} ↗</button>`}).join('')}<p>※ 뿌리가 축축하고 무른지, 단단하고 건조한지 직접 확인하세요.</p></div>`;
}
$('#triageChoices').addEventListener('click',e=>{
 let detail=e.target.closest('[data-open-detail]');if(detail){openDetail(detail.dataset.openDetail);return;}
 let button=e.target.closest('[data-value]');if(!button)return;
 if(triage.step===0)triage.part=button.dataset.value;
 else if(triage.step===1)triage.moist=button.dataset.value;
 else if(triage.step===2)triage.speed=button.dataset.value;
 triage.step=Math.min(3,triage.step+1);renderTriage();
});
$('#triageBack').addEventListener('click',()=>{triage.step=Math.max(0,triage.step-1);renderTriage()});
$('#triageReset').addEventListener('click',()=>{triage.step=0;triage.part=triage.moist=triage.speed=null;renderTriage()});
// species differentiation
function renderSpecies(id){let s=D.species.find(p=>p.id===id)||D.species[0];
 $$('#speciesPicker .species-button').forEach(b=>{let active=b.dataset.species===s.id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
 let link=sourceLink(s.source);
 $('#speciesPanel').innerHTML=`<div class="species-illustration"><span aria-hidden="true">${s.symbol}</span><small>${esc(s.latin)}</small></div><div class="species-content"><span class="label-mini">ORCHID PROFILE</span><h3>${esc(s.name)}</h3><p>${esc(s.subtitle)}</p><div class="species-facts"><div><b>☀️ 빛</b>${esc(s.light)}</div><div><b>💧 물</b>${esc(s.water)}</div><div><b>🌡️ 온도</b>${esc(s.climate)}</div><div><b>🌸 개화</b>${esc(s.flower)}</div></div><div class="species-tip">✳ ${esc(s.tips)}</div>${link?`<a class="species-link" href="${esc(link)}" rel="noopener noreferrer" target="_blank">재배법 근거 원문 보기 ↗</a>`:''}</div>`;
}
$('#speciesPicker').innerHTML=D.species.map(s=>`<button type="button" class="species-button" data-species="${s.id}" aria-pressed="false">${s.symbol} ${esc(s.name)}</button>`).join('');
$('#speciesPicker').addEventListener('click',e=>{const b=e.target.closest('[data-species]');if(b)renderSpecies(b.dataset.species)});
$('#repotSteps').innerHTML=D.repot.map(s=>`<li>${esc(s)}</li>`).join('');
$('#sourceList').innerHTML=D.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} <span>↗</span></a>`).join('');
// v2 diary is initialized by journal-v2.js. Legacy data is migrated on first use.
$$('.file-label').forEach(label=>label.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();document.getElementById(label.htmlFor)?.click()}}));
// Mobile nav
$('#menuToggle').addEventListener('click',()=>{let menu=$('#mobileMenu');menu.hidden=!menu.hidden;$('#menuToggle').setAttribute('aria-expanded',String(!menu.hidden));$('#menuToggle').textContent=menu.hidden?'☰':'✕'});
$$('#mobileMenu a').forEach(a=>a.addEventListener('click',()=>{$('#mobileMenu').hidden=true;$('#menuToggle').setAttribute('aria-expanded','false');$('#menuToggle').textContent='☰'}));
// Season tip can be checked without sending a time/location request.
const month=new Date().getMonth()+1;const season=D.seasons.find(s=>s.months.includes(month));if(season){let top=$('.ticker');const tip=document.createElement('span');tip.textContent=`${season.icon} 지금은 ${season.name} · ${season.tips[0]}`;top.append(tip)}
renderConditions();renderTriage();renderSpecies('phalaenopsis');
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
