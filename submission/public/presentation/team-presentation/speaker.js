'use strict';
const plan=window.PRESENTATION_PLAN,notesSlides=plan.slides;
const q=s=>document.querySelector(s),qa=s=>Array.from(document.querySelectorAll(s));
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const duration=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
let active=0,tab='script',lastAudience=null,elapsed=0,started=0,running=false;
const ch=typeof BroadcastChannel==='function'?new BroadcastChannel('dubakwi-'+window.PRESENTATION_PLAN.version):null;
for(const [i,s]of notesSlides.entries()){const b=document.createElement('button');b.innerHTML='<span>'+String(i+1).padStart(2,'0')+'</span>'+safe(s.title);b.dataset.slide=i;b.onclick=()=>{q('#follow').checked=false;show(i);connection()};q('#slide-nav').append(b)}
function connection(){q('#connection').textContent=q('#follow').checked?(lastAudience===null?'독립 열람 · 청중 화면 연결 대기':'청중 '+(lastAudience+1)+'장과 연결됨'):'메모 독립 탐색 · 청중 화면은 그대로 유지'}
function show(i){if(!Number.isInteger(i)||i<0||i>=notesSlides.length)return;active=i;const s=notesSlides[i];q('#slide-number').textContent=String(i+1).padStart(2,'0');q('#title').textContent=s.title;q('#budget').textContent='배정 '+duration(s.seconds);q('#message').textContent=s.message;q('#transition').textContent=s.transition;q('#next').textContent='다음: '+(notesSlides[i+1]?.title||'질의응답 5분')+' · 누적 배정 '+duration(notesSlides.slice(0,i+1).reduce((sum,x)=>sum+x.seconds,0));qa('#slide-nav button').forEach((b,n)=>b.setAttribute('aria-current',n===i?'step':'false'));history.replaceState(null,'','#slide-'+(i+1));render()}
function render(){const s=notesSlides[active];let html='';
 if(tab==='script')html=s.script.map(p=>'<p>'+safe(p)+'</p>').join('');
 if(tab==='actions')html='<h2>화면 조작과 시간 배분</h2><ol>'+s.actions.map(p=>'<li>'+safe(p)+'</li>').join('')+'</ol><p class="note-empty">시간은 발표 편성값입니다. 실제 시연·리허설 소요 시간과 구분합니다.</p>';
 if(tab==='concepts')html='<h2>필수 산출물과 이 장의 대응</h2>'+s.deliverables.map(d=>{const a=plan.deliverables[d.key];return '<h3><a class="artifact-link" href="'+safe(a.path)+'" target="_blank" rel="noopener">'+safe(a.name)+'</a></h3><p>'+safe(d.concepts)+'</p>'}).join('')+'<h2>발표자가 알아둘 개념</h2>'+(s.terms.length?'<dl>'+s.terms.map(t=>'<dt>'+safe(t.term)+'</dt><dd>'+safe(t.meaning)+'</dd>').join('')+'</dl>':'<p class="note-empty">이 장에서는 목적과 맥락을 설명합니다. 별도 기술 용어 설명은 필요하지 않습니다.</p>');
 if(tab==='evidence')html='<h2>설명 범위·주의사항</h2><ul class="limit-list">'+s.limits.map(p=>'<li>'+safe(p)+'</li>').join('')+'</ul><h2>근거와 보존 자료</h2><ul class="source-list">'+s.sources.map(s=>'<li><a href="'+safe(s.path)+'" target="_blank" rel="noopener">'+safe(s.label)+'</a></li>').join('')+'</ul>';
 q('#note-panel').innerHTML=html;q('#note-panel').setAttribute('aria-labelledby','tab-'+tab);qa('[data-note-tab]').forEach(b=>{const on=b.dataset.noteTab===tab;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1})}
qa('[data-note-tab]').forEach((b,i)=>{b.onclick=()=>{tab=b.dataset.noteTab;render()};b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const bs=qa('[data-note-tab]');const n=e.key==='Home'?0:e.key==='End'?bs.length-1:(i+(e.key==='ArrowRight'?1:-1)+bs.length)%bs.length;bs[n].click();bs[n].focus()}});
function receive(e){const m=e.data;if(m?.type!=='slide-state'||m.deckVersion!==plan.version||!Number.isInteger(m.index)||m.index<0||m.index>=notesSlides.length)return;lastAudience=m.index;if(q('#follow').checked)show(m.index);connection()}
window.addEventListener('message',e=>{if(e.source===window.opener)receive(e)});ch?.addEventListener('message',receive);
q('#follow').onchange=()=>{if(q('#follow').checked&&lastAudience!==null)show(lastAudience);connection();if(q('#follow').checked)announce()};
function announce(){const m={type:'speaker-ready',deckVersion:plan.version};ch?.postMessage(m);window.opener?.postMessage(m,'*')}
q('#start').onclick=()=>{if(running){elapsed+=Date.now()-started;running=false}else{started=Date.now();running=true}q('#start').textContent=running?'시간 멈춤':'시간 시작'};
q('#reset').onclick=()=>{elapsed=0;started=Date.now();q('#clock').textContent='00:00'};
setInterval(()=>{const t=Math.floor((elapsed+(running?Date.now()-started:0))/1000);q('#clock').textContent=duration(t).padStart(5,'0')},500);
show(Math.min(notesSlides.length-1,Math.max(0,(Number(location.hash.match(/^#slide-(\d+)$/)?.[1])||1)-1)));connection();announce();
window.SPEAKER_STATE={get active(){return active},get tab(){return tab},get lastAudience(){return lastAudience}};
