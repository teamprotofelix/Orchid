'use strict';
/* ORCHID ATELIER v2 – multi-plant offline diary. No external requests. */
(()=>{
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='orchid-atelier-journal-v2',OLD_KEY='orchid-atelier-journal-v1',fallback='assets/images/photo-empty.webp';
const allowedTypes=['관찰','물주기','비료','분갈이','해충 점검','새잎·새뿌리','개화','환경 변경','기타'];
const defaultState=()=>({version:2,plants:[],entries:[],activeId:null});
let data=defaultState(), editEntryId=null, plantPhoto='',entryPhoto='',filterDay=null,calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1),photoPending=0;
const id=()=>globalThis.crypto?.randomUUID?.()||'orchid-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const today=()=>{let d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const validDate=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00');return !Number.isNaN(d.valueOf())&&d.getFullYear()===Number(s.slice(0,4))&&(d.getMonth()+1)===Number(s.slice(5,7))&&d.getDate()===Number(s.slice(8,10));};
const niceDate=s=>{if(!validDate(s))return s;return new Date(s+'T12:00:00').toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'})};
const daysAgo=d=>Math.max(0,Math.round((new Date(today()+'T12:00:00')-new Date(d+'T12:00:00'))/864e5));
const imageOK=v=>!v||(typeof v==='string'&&v.length<=210000&&/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(v));
const validText=(v,n)=>typeof v==='string'&&v.length<=n;
function validateRecord(r){
 if(!r||r.version!==2||!Array.isArray(r.plants)||r.plants.length>50||!Array.isArray(r.entries)||r.entries.length>500)return false;
 if(r.plants.some(p=>!p||!validText(p.id,80)||!validText(p.name,45)||!p.name.trim()||!validText(p.species,60)||!validText(p.place,70)||!validText(p.medium,40)||!validText(p.pot,40)||!validText(p.memo,450)||!validText(p.acquired,10)|| (p.acquired&&!validDate(p.acquired))||!imageOK(p.photo)))return false;
 const ids=r.plants.map(p=>p.id);if(new Set(ids).size!==ids.length|| (r.activeId!==null&&!ids.includes(r.activeId)))return false;
 if(r.entries.some(e=>!e||!validText(e.id,80)||!ids.includes(e.plantId)||!validDate(e.date)||!allowedTypes.includes(e.type)||!validText(e.note,1200)||!validText(e.moisture,30)||!validText(e.roots,30)||!validText(e.leaves,30)||!validText(e.light,30)||!imageOK(e.photo)||!(e.temp===null||typeof e.temp==='number'&&e.temp>=-10&&e.temp<=55)||!(e.humidity===null||Number.isInteger(e.humidity)&&e.humidity>=0&&e.humidity<=100)))return false;
 return new Set(r.entries.map(e=>e.id)).size===r.entries.length;
}
function fromOld(o){
 if(!o||o.version!==1||!o.profile||!Array.isArray(o.entries)||o.entries.length>500)return null;
 const hasContent=!!String(o.profile.name||'').trim()||o.entries.length>0;if(!hasContent)return null;
 const plantId=id(),species=window.ORCHID_DATA.species.some(s=>s.id===o.profile.species)?o.profile.species:'phalaenopsis';
 const plants=[{id:plantId,name:String(o.profile.name||'첫 번째 난').slice(0,45)||'첫 번째 난',species,place:String(o.profile.place||'').slice(0,70),medium:'',pot:'',acquired:'',memo:'v1에서 자동으로 이전된 프로필',photo:''}];
 const entries=o.entries.slice(0,500).filter(x=>x&&typeof x.type==='string').map(x=>({id:id(),plantId,date:typeof x.date==='string'&&!isNaN(Date.parse(x.date))?new Date(x.date).toLocaleDateString('sv-SE'):today(),type:allowedTypes.includes(x.type)?x.type:'기타',note:String(x.note||'').slice(0,1200),moisture:'',roots:'',leaves:'',light:'',temp:null,humidity:null,photo:''}));
 const result={version:2,plants,entries,activeId:plantId};return validateRecord(result)?result:null;
}
function toast(str){const el=$('#toast');if(!el)return;el.textContent=str;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,3600)}
function persist(next){if(!validateRecord(next)){toast('기록 형식에 문제가 있어 저장하지 않았습니다.');return false;}try{localStorage.setItem(KEY,JSON.stringify(next));data=next;return true;}catch(e){toast('기기 저장 공간이 부족하거나 차단되었습니다. 기존 기록은 유지됩니다. JSON 백업을 확인하세요.');return false}}
function update(mut){const next=JSON.parse(JSON.stringify(data));mut(next);if(persist(next)){render();return true;}return false}
function load(){try{const newer=localStorage.getItem(KEY);if(newer){const parsed=JSON.parse(newer);if(validateRecord(parsed)){data=parsed;return;}}
 const old=localStorage.getItem(OLD_KEY);if(old){const result=fromOld(JSON.parse(old));if(result&&persist(result))toast('기존 v1 관리일지를 새 일기장으로 옮겼습니다.');}
 }catch(e){toast('기록 읽기에 실패했습니다. 브라우저 설정을 확인해 주세요.')}}
function active(){return data.plants.find(x=>x.id===data.activeId)||null}
function entriesFor(){return data.entries.filter(e=>e.plantId===data.activeId).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id))}
function clearPlantPhoto(){plantPhoto='';$('#plantPhotoPreview').src=fallback;$('#plantPhotoPreview').classList.add('is-fallback');$('#plantPhotoFile').value=''}
function clearEntryPhoto(){entryPhoto='';$('#diaryPhotoPreview').src=fallback;$('#diaryPhotoPreview').classList.add('is-fallback');$('#diaryFileInfo').textContent='사진 없음 · 선택하면 작은 WebP로 저장';$('#diaryPhotoFile').value='';$('#diaryPhotoRemove').hidden=true}
async function compressPhoto(file){
 if(!file||!file.type.startsWith('image/')||file.size>18*1024*1024)throw new Error('18MB 이하 이미지 파일을 선택해 주세요.');
 const u=URL.createObjectURL(file);let image=new Image();
 try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('지원하지 않거나 손상된 이미지입니다.'));image.src=u});
 const max=640,scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
 canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
 let dataUrl=canvas.toDataURL('image/webp',.64);if(!dataUrl.startsWith('data:image/webp'))dataUrl=canvas.toDataURL('image/jpeg',.62);
 if(!imageOK(dataUrl))throw new Error('사진 용량이 커서 저장할 수 없습니다. 다른 사진을 선택하세요.');return dataUrl;
 }finally{URL.revokeObjectURL(u)}
}
function plantDialogOpen(plant){const p=plant||{id:'',name:'',species:'phalaenopsis',acquired:'',place:'',medium:'',pot:'',memo:'',photo:''};
 $('#plantDialogTitle').textContent=plant?'난 프로필 편집':'새 난 등록하기';$('#plantEditId').value=p.id;
 for(const [field,value] of [['plantName',p.name],['plantSpecies',p.species],['plantAcquired',p.acquired],['plantPlace',p.place],['plantMedium',p.medium],['plantPot',p.pot],['plantMemo',p.memo]])$('#'+field).value=value;
 plantPhoto=p.photo||'';$('#plantPhotoPreview').src=plantPhoto||fallback;$('#plantPhotoPreview').classList.toggle('is-fallback',!plantPhoto);$('#plantPhotoFile').value='';$('#deletePlant').hidden=!plant;$('#plantDialog').showModal();
}
function render(){
 const p=active();$('#statsPlants').innerHTML=data.plants.length+'<small>그루</small>';$('#statsRecords').innerHTML=data.entries.length+'<small>개</small>';
 const all=data.entries.slice().sort((a,b)=>b.date.localeCompare(a.date));$('#statsLatest').textContent=all.length?niceDate(all[0].date):'—';$('#statsActive').textContent=p?p.name:'선택 전';
 $('#plantList').innerHTML=data.plants.length?data.plants.map(x=>`<button type="button" class="plant-list-item ${x.id===data.activeId?'active':''}" data-plant="${esc(x.id)}" aria-pressed="${x.id===data.activeId}"><img src="${x.photo||fallback}" alt="${esc(x.name)} 사진"><span><b>${esc(x.name)}</b><small>${esc(window.ORCHID_DATA.species.find(s=>s.id===x.species)?.name||'난')} · ${esc(x.place||'장소 미입력')}</small></span></button>`).join(''):'<div class="diary-empty-small">아직 등록한 난이 없습니다.<br>‘＋ 난 등록’을 눌러 시작하세요.</div>';
 const e=entriesFor();const waters=e.filter(x=>x.type==='물주기');const water=waters[0];const feed=e.find(x=>x.type==='비료'),repot=e.find(x=>x.type==='분갈이');
 $('#activePlantPanel').innerHTML=p?`<img src="${p.photo||fallback}" alt="${esc(p.name)} 프로필 사진"><div class="active-plant-info"><span class="label-mini">MY GARDEN · ${esc(window.ORCHID_DATA.species.find(x=>x.id===p.species)?.latin||'ORCHID')}</span><h3>${esc(p.name)}</h3><p>${esc(p.place||'위치를 기록해 주세요')} · ${esc(p.medium||'배지 미입력')} · ${esc(p.pot||'화분 미입력')}</p><div class="active-plant-chips"><span>💧 마지막 물주기 <b>${water?niceDate(water.date)+' · '+daysAgo(water.date)+'일 전':'미기록'}</b></span><span>🧪 비료 <b>${feed?niceDate(feed.date):'미기록'}</b></span><span>🪴 분갈이 <b>${repot?niceDate(repot.date):'미기록'}</b></span></div><button type="button" class="text-button" id="editActivePlant">프로필 수정 ↗</button></div>`:'<div class="active-plant-empty">아직 등록한 난이 없습니다. 왼쪽에서 ‘＋ 난 등록’을 눌러 시작하세요.</div>';
 $('#diaryForm').querySelectorAll('input,select,textarea,button').forEach(el=>{if(el.id!=='cancelDiaryEdit')el.disabled=!p});
 $$('#quickActions button').forEach(b=>b.disabled=!p);
 renderCalendar();renderHistory();
}
function renderCalendar(){const year=calendarMonth.getFullYear(),month=calendarMonth.getMonth();$('#diaryMonthLabel').textContent=`${year}년 ${month+1}월`;
 const first=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate();const countByDay={};for(const x of entriesFor()){countByDay[x.date]=(countByDay[x.date]||0)+1;}
 let html='<div class="weekday">일</div><div class="weekday">월</div><div class="weekday">화</div><div class="weekday">수</div><div class="weekday">목</div><div class="weekday">금</div><div class="weekday">토</div>';
 for(let i=0;i<first;i++)html+='<span class="day-spacer"></span>';
 for(let i=1;i<=days;i++){const date=[year,String(month+1).padStart(2,'0'),String(i).padStart(2,'0')].join('-'),n=countByDay[date]||0;html+=`<button type="button" class="diary-day ${date===today()?'today':''} ${date===filterDay?'selected':''}" data-date="${date}" aria-label="${date} ${n}건 기록" ${!active()?'disabled':''}><span>${i}</span>${n?`<i>${n}</i>`:''}</button>`;}
 $('#diaryCalendar').innerHTML=html;
}
function renderHistory(){let e=entriesFor(),category=$('#diaryEntryFilter').value;
 if(category!=='all')e=e.filter(x=>x.type===category);if(filterDay)e=e.filter(x=>x.date===filterDay);
 $('#diaryHistory').innerHTML=`${filterDay?`<div class="diary-filter-indicator">${esc(niceDate(filterDay))} 기록 보기 <button type="button" id="clearDateFilter">전체 날짜 보기 ✕</button></div>`:''}${e.length?e.map(x=>`<article class="diary-event"><div class="diary-event-top"><strong>${esc(iconFor(x.type))} ${esc(x.type)}</strong><time>${esc(niceDate(x.date))}</time></div><div class="diary-event-body">${x.photo?`<img loading="lazy" src="${x.photo}" alt="관찰 기록 사진">`:''}<div><p>${esc(x.note||'메모 없이 남긴 관리 기록')}</p><div class="diary-facts">${[['배지',x.moisture],['뿌리',x.roots],['잎',x.leaves],['빛',x.light],['온도',x.temp===null?'':x.temp+'°C'],['습도',x.humidity===null?'':x.humidity+'%']].filter(y=>y[1]!=='').map(y=>`<span>${esc(y[0])}: ${esc(y[1])}</span>`).join('')}</div></div></div><div class="diary-event-actions"><button type="button" data-entry-edit="${esc(x.id)}">수정</button><button type="button" data-entry-delete="${esc(x.id)}">삭제</button></div></article>`).join(''):'<div class="diary-history-empty">선택한 날짜와 조건의 기록이 없습니다.<br>관찰·물주기를 실제로 진행한 후 기록해 보세요.</div>'}`;
}
const iconFor=t=>({'물주기':'💧','비료':'🧪','분갈이':'🪴','해충 점검':'🔎','새잎·새뿌리':'🌱','개화':'🌸','환경 변경':'☀️','기타':'✍️','관찰':'👀'}[t]||'✍️');
function resetEntryForm(){editEntryId=null;$('#diaryForm').reset();$('#diaryDate').value=today();$('#diaryFormHeading').textContent='오늘의 난 관리 기록';$('#saveDiaryEntry').textContent='＋ 기록 저장';$('#cancelDiaryEdit').hidden=true;clearEntryPhoto()}
function setActive(plantId){if(!data.plants.some(x=>x.id===plantId))return;update(d=>{d.activeId=plantId});filterDay=null;resetEntryForm();render()}
function safeNum(id,min,max,integer=false){const s=$('#'+id).value.trim();if(!s)return null;const n=Number(s);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new Error('온도 또는 습도 입력값을 확인해 주세요.');return n}
function startEditEntry(entryId){let e=data.entries.find(x=>x.id===entryId&&x.plantId===data.activeId);if(!e)return;
 editEntryId=e.id;for(const [id,v] of [['diaryDate',e.date],['diaryType',e.type],['diaryMoisture',e.moisture],['diaryRoots',e.roots],['diaryLeaves',e.leaves],['diaryTemp',e.temp??''],['diaryHumidity',e.humidity??''],['diaryLight',e.light],['diaryNote',e.note]])$('#'+id).value=v;
 entryPhoto=e.photo||'';$('#diaryPhotoPreview').src=entryPhoto||fallback;$('#diaryPhotoPreview').classList.toggle('is-fallback',!entryPhoto);$('#diaryPhotoRemove').hidden=!entryPhoto;$('#diaryFileInfo').textContent=entryPhoto?'기존 사진 유지 중':'사진 없음';$('#diaryFormHeading').textContent='관리 기록 수정';$('#saveDiaryEntry').textContent='변경 내용 저장';$('#cancelDiaryEdit').hidden=false;$('.diary-form-shell').scrollIntoView({behavior:'smooth',block:'start'});
}
$('#plantSpecies').innerHTML=window.ORCHID_DATA.species.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
$('#addPlant').addEventListener('click',()=>{if(data.plants.length>=50){toast('등록 가능한 난은 최대 50그루입니다.');return;}plantDialogOpen(null)});
$('#closePlantDialog').addEventListener('click',()=>$('#plantDialog').close());
$('#plantDialog').addEventListener('click',e=>{if(e.target===$('#plantDialog'))e.target.close()});
$('#plantForm').addEventListener('submit',e=>{e.preventDefault();const plantId=$('#plantEditId').value||id(),name=$('#plantName').value.trim();if(!name){toast('이름을 입력해 주세요.');return;}
 const plant={id:plantId,name:name.slice(0,45),species:$('#plantSpecies').value,place:$('#plantPlace').value.trim(),medium:$('#plantMedium').value,pot:$('#plantPot').value,acquired:$('#plantAcquired').value,memo:$('#plantMemo').value.trim(),photo:plantPhoto};
 if(update(d=>{const i=d.plants.findIndex(x=>x.id===plantId);if(i<0)d.plants.push(plant);else d.plants[i]=plant;d.activeId=plantId})){filterDay=null;resetEntryForm();$('#plantDialog').close();render();toast('난의 프로필을 저장했습니다.');}
});
$('#deletePlant').addEventListener('click',()=>{const plantId=$('#plantEditId').value,p=data.plants.find(x=>x.id===plantId);if(!p)return;if(!confirm(`'${p.name}'와 이 난의 모든 관리 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`))return;
 if(update(d=>{d.plants=d.plants.filter(x=>x.id!==plantId);d.entries=d.entries.filter(x=>x.plantId!==plantId);d.activeId=d.plants[0]?.id||null})){filterDay=null;resetEntryForm();$('#plantDialog').close();render();toast('난과 기록을 삭제했습니다.');}});
$('#plantList').addEventListener('click',e=>{const b=e.target.closest('[data-plant]');if(b)setActive(b.dataset.plant)});
$('#activePlantPanel').addEventListener('click',e=>{if(e.target.closest('#editActivePlant'))plantDialogOpen(active())});
$('#quickActions').addEventListener('click',e=>{const b=e.target.closest('[data-fast]');if(!b||!active())return;resetEntryForm();$('#diaryType').value=b.dataset.fast;$('.diary-form-shell').scrollIntoView({behavior:'smooth',block:'start'});$('#diaryNote').focus({preventScroll:true});toast('실제 관리한 내용을 적고 ‘기록 저장’을 눌러주세요.');});
$('#diaryForm').addEventListener('submit',e=>{e.preventDefault();if(!active()){toast('먼저 난을 등록해 주세요.');return;}
 let temp,humidity;try{temp=safeNum('diaryTemp',-10,55);humidity=safeNum('diaryHumidity',0,100,true)}catch(err){toast(err.message);return;}
 const date=$('#diaryDate').value,type=$('#diaryType').value;if(!validDate(date)||!allowedTypes.includes(type)){toast('날짜와 관리 종류를 확인해 주세요.');return;}
 const note=$('#diaryNote').value.trim().slice(0,1200);
 if(type==='물주기'&&!note&&!editEntryId){if(!confirm('실제로 물을 준 뒤 기록하는 기능입니다. 물을 주셨나요?'))return;}
 const event={id:editEntryId||id(),plantId:data.activeId,date,type,note,moisture:$('#diaryMoisture').value,roots:$('#diaryRoots').value,leaves:$('#diaryLeaves').value,temp,humidity,light:$('#diaryLight').value,photo:entryPhoto};
 const worked=update(d=>{const i=d.entries.findIndex(x=>x.id===event.id);if(i>=0)d.entries[i]=event;else d.entries.push(event);});
 if(worked){resetEntryForm();filterDay=null;render();toast('관리일지가 안전하게 저장되었습니다.');}
});
$('#cancelDiaryEdit').addEventListener('click',resetEntryForm);
$('#diaryHistory').addEventListener('click',e=>{const edit=e.target.closest('[data-entry-edit]'),del=e.target.closest('[data-entry-delete]');if(edit){startEditEntry(edit.dataset.entryEdit);return;}if(del){const event=data.entries.find(x=>x.id===del.dataset.entryDelete);if(!event||!confirm(`${niceDate(event.date)} ${event.type} 기록을 삭제할까요?`))return;if(update(d=>{d.entries=d.entries.filter(x=>x.id!==event.id)})){if(editEntryId===event.id)resetEntryForm();toast('기록을 삭제했습니다.')}return;}if(e.target.id==='clearDateFilter'){filterDay=null;render()}});
$('#diaryEntryFilter').addEventListener('change',renderHistory);
$('#diaryCalendar').addEventListener('click',e=>{const b=e.target.closest('[data-date]');if(!b||!active())return;filterDay=filterDay===b.dataset.date?null:b.dataset.date;$('#diaryDate').value=b.dataset.date;renderCalendar();renderHistory();});
$('#prevDiaryMonth').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);renderCalendar()});
$('#nextDiaryMonth').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);renderCalendar()});
async function imageChange(input,callback){let file=input.files?.[0];input.value='';if(!file)return;const seq=++photoPending;try{const url=await compressPhoto(file);if(seq!==photoPending)return;callback(url);toast('사진을 작은 WebP 이미지로 압축했습니다. 기록 저장 시 함께 보관됩니다.');}catch(err){toast(err.message)}}
$('#plantPhotoFile').addEventListener('change',e=>imageChange(e.target,url=>{plantPhoto=url;$('#plantPhotoPreview').src=url;$('#plantPhotoPreview').classList.remove('is-fallback')}));
$('#removePlantPhoto').addEventListener('click',clearPlantPhoto);
$('#diaryPhotoFile').addEventListener('change',e=>imageChange(e.target,url=>{entryPhoto=url;$('#diaryPhotoPreview').src=url;$('#diaryPhotoPreview').classList.remove('is-fallback');$('#diaryFileInfo').textContent='사진 압축 완료 · 기록 저장 시 함께 보관';$('#diaryPhotoRemove').hidden=false}));
$('#diaryPhotoRemove').addEventListener('click',clearEntryPhoto);
$$('.attach-photo,.plant-photo-button,.backup-actions label').forEach(label=>label.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();document.getElementById(label.htmlFor)?.click()}}));
function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}
$('#exportDiary').addEventListener('click',()=>{download(JSON.stringify(data,null,2),'application/json;charset=utf-8',`orchid-atelier-v2-backup-${today()}.json`);toast('모든 난과 관리 사진이 포함된 JSON 백업을 저장했습니다.');});
$('#exportDiaryCsv').addEventListener('click',()=>{const safe=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
 const rows=[['난 이름','품종','날짜','관리 종류','상태 메모','배지','뿌리','잎','온도(°C)','습도(%)','빛 환경']];for(const e of data.entries){const p=data.plants.find(x=>x.id===e.plantId);rows.push([p?.name||'',p?.species||'',e.date,e.type,e.note,e.moisture,e.roots,e.leaves,e.temp??'',e.humidity??'',e.light]);}
 download('\ufeff'+rows.map(r=>r.map(safe).join(',')).join('\r\n'),'text/csv;charset=utf-8',`orchid-atelier-v2-diary-${today()}.csv`);toast('CSV 관리표를 저장했습니다. 사진은 JSON 백업에만 포함됩니다.');});
$('#importDiary').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>12*1024*1024){toast('12MB 이하 JSON 백업을 선택해 주세요.');return;}try{let incoming=JSON.parse(await file.text());if(incoming.version===1)incoming=fromOld(incoming);if(!validateRecord(incoming))throw new Error('올바른 v1/v2 백업 파일이 아닙니다.');if(!confirm('현재 모든 난과 기록을 백업 파일의 내용으로 덮어쓸까요?'))return;
 if(persist(incoming)){filterDay=null;resetEntryForm();render();toast('백업을 복원했습니다.');}}catch(err){toast('복원 실패: '+err.message)}});
$('#plantPhotoPreview').addEventListener('error',clearPlantPhoto);
$('#diaryPhotoPreview').addEventListener('error',clearEntryPhoto);
$('#diaryDate').value=today();
load();if(data.plants.length&&!data.plants.some(p=>p.id===data.activeId)){data.activeId=data.plants[0].id;persist(data)}
render();
})();
