// Resolve relocated references in the reader; stored original bytes/blocks stay unchanged.
const preservedSourceLinkTargets={"../../../../docs/project/presentation/originals/received-20261108/p31-vm-index-recovery-plan.md":"../../../../docs/rag-knowledge/p31-vm-index-recovery-plan.md","../../../../docs/project/presentation/originals/project/RAG-ARCHITECTURE.md":"../../../../docs/project/RAG-ARCHITECTURE.md","../../../../docs/project/presentation/originals/received-20261108/rag-architecture.md":"../../../../docs/rag-knowledge/rag-architecture.md","../../../../docs/project/presentation/originals/received-20261108/r03-final-handoff.md":"../../../../docs/rag-knowledge/r03-final-handoff.md","../../../../docs/project/presentation/originals/received-20261108/r03-evidence-review-20261107.md":"../../../../docs/rag-knowledge/r03-evidence-review-20261107.md","../../../../docs/project/presentation/PRESENTATION-PLAN.md":"../../../../docs/PRESENTATION-PLAN.md","../../../../docs/project/presentation/originals/EXECUTION-RESULT.md":"../../../../docs/project/EXECUTION-RESULT.md"};
function resolvePreservedSourceLink(href){const [file,...fragment]=href.split("#");return (preservedSourceLinkTargets[file]||file)+(fragment.length?"#"+fragment.join("#"):"");}
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slides=$$('.slide'),atlas=$('#atlas'),overlay=$('#overlay'),body=$('#overlay-body'),tools=$('#overlay-tools'),foot=$('#overlay-footer');
let current=0,view=null,viewStack=[],lastFocus=null,atlasData=null,speaker=null;
const sourceData=window.SOURCE_DATA,pdfData=window.PDF_DATA||[];
const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('dubakwi-'+window.PRESENTATION_PLAN.version):null;
const state={readerPages:[],sourceData,slides,overlay:()=>view,sourceBlocks:[],get current(){return current}};
window.PRESENTATION=state;
function notifySpeaker(){const message={type:'slide-state',deckVersion:window.PRESENTATION_PLAN.version,slideId:current+1,index:current,title:slides[current].dataset.title,seconds:Number(slides[current].dataset.seconds),next:slides[current+1]?.dataset.title||'질의응답',elapsedTarget:slides.slice(0,current).reduce((s,e)=>s+Number(e.dataset.seconds),0)};channel?.postMessage(message);speaker?.postMessage(message,'*')}
function pauseAtlas(){atlas.contentWindow?.postMessage({type:'deck-pause'},'*')}
function go(index,update=true){
 current=Math.min(slides.length-1,Math.max(0,index));slides.forEach((s,i)=>{s.classList.toggle('active',i===current);s.setAttribute('aria-hidden',String(i!==current))});
 $('#chapter').textContent=slides[current].dataset.chapter;$('#role-label').textContent=slides[current].dataset.role;$('#page-count').textContent=String(current+1).padStart(2,'0')+' / '+slides.length;
 $('#previous').disabled=current===0;$('#next-slide').disabled=current===slides.length-1;
 $$('#progress button').forEach((b,i)=>{b.classList.toggle('current',i===current);b.setAttribute('aria-current',i===current?'step':'false')});
 if(update)history.replaceState(null,'','#slide-'+(current+1));if(current!==3)pauseAtlas();notifySpeaker();$('#live-status').textContent=`${current+1}장 ${slides[current].dataset.title}`;positionAtlas();
}
slides.forEach((s,i)=>{const b=document.createElement('button');b.title=`${i+1}. ${s.dataset.title}`;b.setAttribute('aria-label',b.title);b.addEventListener('click',()=>go(i));$('#progress').append(b)});
$('#previous').onclick=()=>go(current-1);$('#next-slide').onclick=()=>go(current+1);$('.brand').onclick=e=>{e.preventDefault();go(0)};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{};};
document.addEventListener('fullscreenchange',()=>$('#fullscreen').textContent=document.fullscreenElement?'전체 화면 해제':'전체 화면');
window.addEventListener('hashchange',()=>{const n=location.hash.match(/^#slide-(\d+)$/);if(n)go(Number(n[1])-1,false)});
document.addEventListener('keydown',e=>{
 if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
 if(overlay.open){if(e.key==='Escape'){e.preventDefault();closeView()}else if(e.key==='PageDown'){e.preventDefault();pageView(1)}else if(e.key==='PageUp'){e.preventDefault();pageView(-1)}return}
 if(e.key==='PageDown'||(e.key==='ArrowRight'&&document.activeElement?.tagName!=='BUTTON')){e.preventDefault();go(current+1)}
 if(e.key==='PageUp'||(e.key==='ArrowLeft'&&document.activeElement?.tagName!=='BUTTON')){e.preventDefault();go(current-1)}
 if(e.key==='Home'){e.preventDefault();go(0)}if(e.key==='End'){e.preventDefault();go(slides.length-1)}
});
function positionAtlas(){
 const layer=$('#atlas-layer');let target=null;
 if(view?.kind==='atlas'){target=body;layer.style.zIndex='1001'}else if(!view&&current===3){target=$('#atlas-home');layer.style.zIndex='5'}
 if(!target){layer.style.display='none';return}
 const r=target.getBoundingClientRect();layer.style.display='block';Object.assign(layer.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
}
function restoreAtlas(){positionAtlas()}
function setBackgroundInert(inert){for(const element of [$('.topbar'),$('#stage'),$('.deck-footer')])element.inert=inert;$('#overlay-backdrop').hidden=!inert}
function openView(next){
 if(view)viewStack.push(view);else lastFocus=document.activeElement;
 view=next;if(!overlay.open)overlay.show();setBackgroundInert(true);renderView();$('#close-overlay').focus();
}
function closeView(){pauseAtlas();if(viewStack.length){view=viewStack.pop();renderView();$('#close-overlay').focus()}else{view=null;overlay.close();setBackgroundInert(false);positionAtlas();lastFocus?.focus()}}
$('#close-overlay').onclick=closeView;overlay.addEventListener('cancel',e=>{e.preventDefault();closeView()});
function clearView(){restoreAtlas();tools.replaceChildren();body.replaceChildren();foot.replaceChildren();$('#close-overlay').textContent=viewStack.length?'돌아가기 ←':'닫기 ×';body.className=''}
function renderView(){
 clearView();$('#overlay-title').textContent=view.title||'';
 if(view.kind==='reader')renderReader();if(view.kind==='gallery')renderGallery();if(view.kind==='library')renderLibrary();if(view.kind==='contents')renderContents();if(view.kind==='atlas')renderAtlas();
 positionAtlas();
}
function btn(text,action,attrs={}){const b=document.createElement('button');b.textContent=text;Object.entries(attrs).forEach(([k,v])=>b.setAttribute(k,v));b.onclick=action;return b}
function footerPages(page,count,onChange,href){
 const prev=btn('← 이전',()=>onChange(page-1),{'aria-label':'이전 상세 페이지'});prev.disabled=page<=0;
 const next=btn('다음 →',()=>onChange(page+1),{'aria-label':'다음 상세 페이지'});next.disabled=page>=count-1;
 foot.replaceChildren(prev,Object.assign(document.createElement('span'),{textContent:`${page+1} / ${count}`}),next);
 if(href){const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener';a.textContent='공개 정리 열기';const save=document.createElement('a');save.href=href;save.download=href.split('/').pop();save.className='source-save';save.textContent='공개 정리 저장';foot.append(a,save)}
}
function openDoc(id,find){const doc=sourceData.docs.find(d=>d.id===id);if(!doc)return;openView({kind:'reader',title:`${roleName(doc.role)} · ${doc.baseline==='current'?'최종 확인 기준 · ': /^r0[2-5]-/.test(id)?'공개 정리 · ':''}${doc.title}`,doc,blocks:doc.blocks.map(b=>b.html),source:doc.source,find,page:0})}
function toBlocks(html){
 const host=document.createElement('div');host.innerHTML=html;const result=[];
 function walk(e){
  if(/^(P|PRE|BLOCKQUOTE|H[1-6]|TABLE|SVG|IMG|FIGURE)$/.test(e.tagName)||!e.children.length){if(e.textContent.trim()||e.matches('svg,img'))result.push(e.outerHTML);return}
  if(['flow-item','detail-card','contract','outcome'].some(c=>e.classList.contains(c))){result.push(e.outerHTML);return}
  let inline=[];const flush=()=>{if(inline.join('').trim())result.push('<p>'+inline.join('')+'</p>');inline=[]};
  for(const n of e.childNodes){if(n.nodeType===1){flush();walk(n)}else if(n.nodeType===3)inline.push(esc(n.textContent))}flush();
 }
 walk(host);return result;
}
function splitOversize(html,height,measure){
 const host=document.createElement('div');host.innerHTML=html;const e=host.firstElementChild;
 if(!e)return [html];
 if(e.matches('svg,img,figure')||e.querySelector('svg,img')){e.style.maxHeight=(height-12)+'px';e.style.height=(height-12)+'px';e.style.width='100%';return[e.outerHTML]}
 if(e.tagName==='TABLE'){
  const head=e.querySelector('thead')?.outerHTML||'';const rows=Array.from(e.querySelectorAll('tbody tr'));
  if(rows.length>1)return rows.map(row=>'<table>'+head+'<tbody>'+row.outerHTML+'</tbody></table>');
  if(rows.length===1){const labels=Array.from(e.querySelectorAll('thead th')).map(x=>x.textContent);return Array.from(rows[0].children).map((td,i)=>'<p><b>'+esc(labels[i]||'')+'</b><br>'+td.innerHTML+'</p>')}
 }
 if(e.children.length>1&&!e.matches('p,pre,blockquote'))return Array.from(e.childNodes).filter(n=>n.nodeType===1||n.textContent.trim()).map(n=>n.outerHTML||'<p>'+esc(n.textContent)+'</p>');
 // Split long prose/code at word boundaries without dropping text.
 const words=e.textContent.match(/\S+\s*/g)||[];if(words.length>1){const half=Math.ceil(words.length/2),tag=e.tagName==='PRE'?'pre':'p';return['<'+tag+'>'+esc(words.slice(0,half).join(''))+'</'+tag+'>','<'+tag+'>'+esc(words.slice(half).join(''))+'</'+tag+'>']}
 return [html];
}
function paginate(blocks){
 const m=document.createElement('div');m.className='reader-page';m.style.position='absolute';m.style.visibility='hidden';m.style.width=body.clientWidth+'px';m.style.height=body.clientHeight+'px';body.append(m);
 const pages=[];let parts=[];const queue=[...blocks];let guard=0;
 while(queue.length){
  if(++guard>20000)throw Error('Pagination loop');const html=queue.shift();m.innerHTML=parts.join('')+html;
  if(m.scrollHeight<=m.clientHeight+1){parts.push(html);continue}
  if(parts.length){pages.push(parts.join(''));parts=[];queue.unshift(html);continue}
  const split=splitOversize(html,m.clientHeight,m);
  if(split.length===1&&split[0]===html){pages.push(html);continue}
  if(split.length===1){m.innerHTML=split[0];pages.push(split[0]);continue}
  queue.unshift(...split);
 }
 if(parts.length)pages.push(parts.join(''));m.remove();return pages.length?pages:['<p>내용 없음</p>'];
}
function renderReader(){
 const sourceLabel=document.createElement('span');sourceLabel.className='gallery-caption';sourceLabel.textContent=view.doc?'원문 내용 · 원본 작성 시점의 기록':'원문 상세';tools.append(sourceLabel);
 const select=document.createElement('select');select.setAttribute('aria-label','상세 페이지 선택');tools.append(select);
 let pages=paginate(view.blocks);state.readerPages=pages;state.sourceBlocks=view.blocks;
 if(view.find&&!view.findUsed){let idx=pages.findIndex(h=>{const d=document.createElement('div');d.innerHTML=h;return d.textContent.includes(view.find)});if(idx>=0)view.page=idx;view.findUsed=true}
 view.page=Math.min(view.page||0,pages.length-1);view.pages=pages;
 pages.forEach((h,i)=>{const d=document.createElement('div');d.innerHTML=h;const text=(d.querySelector('h1,h2,h3,h4')?.textContent||d.textContent).trim().replace(/\s+/g,' ').slice(0,34);select.add(new Option(`${i+1}. ${text}`,i))});
 const reader=document.createElement('article');reader.className='reader-page';body.append(reader);
 const draw=()=>{reader.innerHTML=pages[view.page];select.value=view.page;footerPages(view.page,pages.length,p=>{view.page=p;draw()},view.source);reader.querySelectorAll('a').forEach(a=>{a.setAttribute('href',resolvePreservedSourceLink(a.getAttribute('href')||''));a.target='_blank';a.rel='noopener'});reader.querySelectorAll('img,svg').forEach(img=>{img.style.cursor='zoom-in';img.onclick=()=>{const src=img.tagName.toLowerCase()==='svg'?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(img.outerHTML):img.getAttribute('src');openView({kind:'gallery',title:'원문 도표·증거 확대',items:[{src,title:'원문 전체 그림'}],index:0})}});};
 select.onchange=()=>{view.page=Number(select.value);draw()};draw();
}
function openGallery(id){const item=sourceData.visuals.find(v=>v.id===id);if(!item)return;const items=sourceData.visuals.filter(v=>v.doc===item.doc&&v.kind===item.kind);openView({kind:'gallery',title:item.kind==='diagram'?'R04 원본 도표':'R04 실행 증거',items,index:items.findIndex(v=>v.id===id),source:'sources/r04-slides.html'})}
function openPDF(id,page=1){const pdf=pdfData.find(p=>p.id===id);if(!pdf)return;openView({kind:"reader",title:pdf.title,blocks:pdf.blocks,source:pdf.source,find:"원자료 "+page+"쪽",page:0})}
function renderGallery(){
 view.index=Math.max(0,Math.min(view.items.length-1,view.index||0));let zoom=1,x=0,y=0;
 const select=document.createElement('select');select.setAttribute('aria-label','그림·PDF 페이지 선택');view.items.forEach((item,i)=>select.add(new Option(item.title||`${i+1}쪽`,i)));select.value=view.index;select.onchange=()=>{view.index=Number(select.value);renderView()};tools.append(select);
 const stage=document.createElement('div');stage.className='gallery-stage';const img=document.createElement('img');img.src=view.items[view.index].src;img.alt=view.items[view.index].title||'보존 원문';stage.append(img);body.append(stage);
 function transform(){const maxX=stage.clientWidth*(zoom-1)/2,maxY=stage.clientHeight*(zoom-1)/2;x=Math.max(-maxX,Math.min(maxX,x));y=Math.max(-maxY,Math.min(maxY,y));img.style.transform=`translate(${x}px,${y}px) scale(${zoom})`;zoomLabel.textContent=Math.round(zoom*100)+'%'}
 const zoomLabel=document.createElement('span');zoomLabel.textContent='100%';tools.append(btn('−',()=>{zoom=Math.max(1,zoom-.5);transform()},{'aria-label':'축소'}),zoomLabel,btn('+',()=>{zoom=Math.min(5,zoom+.5);transform()},{'aria-label':'확대'}),btn('맞춤',()=>{zoom=1;x=0;y=0;transform()}));
 for(const [label,dx,dy]of[['←',100,0],['→',-100,0],['↑',0,100],['↓',0,-100]])tools.append(btn(label,()=>{x+=dx;y+=dy;transform()},{'aria-label':'확대 그림 '+label+' 이동'}));
 if(view.pdf)tools.append(btn('텍스트로 읽기',()=>{const pdf=view.pdf;openView({kind:'reader',title:pdf.title+' · 텍스트',blocks:pdf.text.flatMap((text,i)=>['<h2>'+esc((i+1)+'쪽')+'</h2>',...text.split(/\n\s*\n/).filter(Boolean).map(t=>'<p>'+esc(t).replace(/\n/g,'<br>')+'</p>')]),page:0,find:(view.index+1)+'쪽',source:pdf.source})}));
 let drag=null;stage.onpointerdown=e=>{drag={px:e.clientX,py:e.clientY,x,y};stage.setPointerCapture(e.pointerId)};stage.onpointermove=e=>{if(!drag)return;x=drag.x+e.clientX-drag.px;y=drag.y+e.clientY-drag.py;transform()};stage.onpointerup=()=>drag=null;stage.onpointercancel=()=>drag=null;
 footerPages(view.index,view.items.length,p=>{view.index=p;renderView()},view.source);
 const item=view.items[view.index];if(item.id==='r04-slides-3')foot.prepend(Object.assign(document.createElement('span'),{className:'gallery-caption',textContent:'별도 Jira 자동화 실습 증거'}));if(item.id==='r04-slides-5')foot.prepend(Object.assign(document.createElement('span'),{className:'gallery-caption',textContent:'로컬 어댑터 22건 · VM 통합 시험과 별도'}));
}
const roleName=r=>({'R01':'통합·운영','R02':'흐름 설계','R03':'지식 검색','R04':'연동·기록','R05':'시험·검증','R02 · R03':'흐름·검색'}[r]||r);
function renderLibrary(){
 const roles=['전체','R01','R02','R03','R04','R05','후속 검증','가이드'];view.filter||='전체';view.page||=0;
 for(const role of roles)tools.append(btn(roleName(role),()=>{view.filter=role;view.page=0;renderView()},{'aria-pressed':String(view.filter===role),class:view.filter===role?'selected':''}));
 const entries=[{role:'R02',title:'시나리오 9개 · 재생·노드 상세',action:()=>openAtlas('S1')},...sourceData.docs.map(d=>({role:d.role,title:d.title,action:()=>openDoc(d.id)})),...pdfData.map(p=>({role:p.role,title:p.title+' · 텍스트',action:()=>openPDF(p.id)}))].filter(x=>view.filter==='전체'||x.role===view.filter);
 const pageSize=10,count=Math.max(1,Math.ceil(entries.length/pageSize));view.page=Math.min(view.page,count-1);const list=document.createElement('div');list.className='library-list';
 for(const item of entries.slice(view.page*pageSize,(view.page+1)*pageSize)){const b=btn('',item.action);b.innerHTML='<span>'+esc(roleName(item.role))+'</span><strong>'+esc(item.title)+'</strong>';list.append(b)}body.append(list);footerPages(view.page,count,p=>{view.page=p;renderView()});
}
function renderContents(){
 const list=document.createElement('div');list.className='contents-list';slides.forEach((s,i)=>{const sec=Number(s.dataset.seconds);const b=btn('',()=>{viewStack=[];view=null;overlay.close();setBackgroundInert(false);go(i)});b.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><strong>${esc(s.dataset.title)}</strong><small>${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}</small>`;list.append(b)});body.append(list);foot.textContent='본문·시연 20분 (시연 전환 여유 30초 포함) · 질의응답 5분';
}
function openAtlas(scenario='S1',node){openView({kind:'atlas',title:'시나리오와 실제 노드 · 원본 모의 재생',config:{scenario,node,view:node?'detail':'overview'},configured:false})}
function renderAtlas(){body.style.minHeight='0';foot.textContent='팀원 원본의 설계 모의 재생 · 실제 실행 증거와 기준 차이는 발표자 메모에서 확인합니다.';if(!view.configured){atlas.contentWindow?.postMessage({type:'deck-config',...view.config},'*');view.configured=true}}
function pageView(delta){if(view?.kind==='reader'){view.page=Math.max(0,Math.min(view.pages.length-1,view.page+delta));renderView()}else if(view?.kind==='gallery'){view.index=Math.max(0,Math.min(view.items.length-1,view.index+delta));renderView()}else if(view?.kind==='library'){view.page=Math.max(0,view.page+delta);renderView()}}
$('#contents').onclick=()=>openView({kind:'contents',title:'발표 순서 · '+slides.length+'장'});$('#library').onclick=()=>openView({kind:'library',title:'팀 자료 · 공개 정리와 상세',filter:'전체',page:0});$('#questions').onclick=()=>openView({kind:'library',title:'질의응답 · 팀 자료 전체',filter:'전체',page:0});$('#source-button').onclick=()=>openDoc(slides[current].dataset.source);
$('#notes').onclick=()=>{speaker=window.open('speaker.html#slide-'+(current+1),'dubakwi-speaker-'+window.PRESENTATION_PLAN.version,'width=1200,height=850');setTimeout(notifySpeaker,500)};
channel?.addEventListener('message',e=>{if(e.data?.type==='speaker-ready'&&e.data.deckVersion===window.PRESENTATION_PLAN.version)notifySpeaker()});
window.addEventListener('message',e=>{
 if(e.source===speaker&&e.data?.type==='speaker-ready'&&e.data.deckVersion===window.PRESENTATION_PLAN.version){notifySpeaker();return}
 if(e.source!==atlas.contentWindow)return;const d=e.data;
 if(d.type==='atlas-ready'||d.type==='atlas-data'){atlasData=d;renderPayload($('#stage [data-tab=payload].selected')?.dataset.panel||'example');return}
 if(d.type==='atlas-inspect'){openView({kind:'reader',title:'흐름 설계 · '+d.title,blocks:toBlocks(d.html),source:'sources/dubakwi-workflow.html',page:0});return}
 if(d.type==='atlas-zoom'){openView({kind:'gallery',title:'R02 · '+d.title,items:[{src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(d.svg),title:d.title}],index:0,source:'sources/dubakwi-workflow.html'});return}
 if(d.type==='atlas-navigate'){if(!overlay.open){go(current+d.delta);$('#stage').focus()}return}
});
function renderPayload(panel){
 if(!$('#payload-original'))return;
 const values={
 in:'<h2>SearchRequest · 필수 필드</h2><div class="payload-schema">request_id: string<br>enabled: boolean<br>query: string<br>access_levels: string[]<br>deadline_at: string</div><p class="payload-caption">별도 선택 필드 없음 · 권한·활성화는 서버 결정</p>',
 out:'<h2>SearchResult · 필수 필드</h2><div class="payload-schema">request_id: string<br>status: ok / empty / skipped / error<br>evidence: Evidence[]<br>error_code: string / null</div><p class="payload-caption">근거 선택: source_url · applies_to · source_checked_at<br>필수 필드 전체는 아래 상세에서 확인</p>',
 example:'<h2>HTTP 200 · 검색 응답 body</h2><pre>{request_id: "demo-empty-01",\n status: "empty", evidence: [],\n error_code: null}</pre><p class="payload-caption"><strong>B16</strong> 조회 skipped와 합류 → <strong>B17</strong> 요청·권한 확인</p><p class="payload-result">handoff · no_evidence</p>',
 rule:'<h2>B17 · 봉투와 근거 검증</h2><p>HTTP 상태·요청 ID·근거 필드·권한을 검사합니다.</p><p><strong>empty</strong> 검색했으나 근거 없음<br><strong>skipped</strong> 검색하지 않음<br><strong>error</strong> 실행 또는 계약 실패</p><p class="payload-caption">확인되지 않은 결과를 성공 답변으로 바꾸지 않습니다.</p>'
 };$('#payload-original').innerHTML=values[panel]||values.example;
}

document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.openDoc)openDoc(b.dataset.openDoc,b.dataset.find);
 if(b.dataset.gallery)openGallery(b.dataset.gallery);
 if(b.dataset.pdf)openPDF(b.dataset.pdf,Number(b.dataset.page)||1);
 if(b.dataset.atlas)openAtlas(b.dataset.atlas,b.dataset.node);
 if(b.dataset.tab){const group=b.dataset.tab;$$(`[data-tab="${group}"]`).forEach(t=>{const on=t===b;t.classList.toggle('selected',on);t.setAttribute('aria-selected',String(on))});$$(`[data-tabgroup="${group}"] > article`).forEach(p=>p.hidden=p.dataset.panel!==b.dataset.panel);if(group==='payload')renderPayload(b.dataset.panel)}
 if(b.dataset.demo){$$('[data-demo]').forEach(t=>{t.classList.toggle('selected',t===b);t.setAttribute('aria-selected',String(t===b))});renderDemo(b.dataset.demo)}
 if(b.dataset.flowFocus){const which=b.dataset.flowFocus;$$('[data-flow-focus]').forEach(t=>t.classList.toggle('selected',t===b));$('#flow-focus-image').src=which==='all'?'assets/r04-slides-diagram-8.svg':`assets/r04-flow-${which}.svg`;$('#flow-focus-image').alt=which==='all'?'R04 원본 전체 처리 순서도':which==='start'?'R04 원본 도표 1~3단계 확대':'R04 원본 도표 4~6단계 확대';$('#flow-focus-caption').textContent=which==='start'?'사용자를 확인하고 처리권을 기록한 뒤, Jira 티켓을 조회·생성합니다.':which==='finish'?'티켓 번호를 연결한 뒤 종료·이관을 수행하고, 실제 결과를 다시 확인해 기록합니다.':'Discord 접수부터 비공개 응답까지의 원본 전체 구조입니다. 그림을 눌러 확대할 수 있습니다.'}
});
function renderDemo(id){
 const content={
 normal:'<h2>0:00–1:00 · 근거를 보고 안내하기</h2><blockquote>“QR이 안 읽혀요.<br>자전거번호로 대여하는 방법을 알려주세요.”</blockquote><div class="demo-route"><b>시민 입력</b><span>→</span><b>답변·출처</b><span>→</span><b>처리 구조 설명</b></div>',
 supplement:'<h2>1:00–2:20 · 같은 문의의 3회차에서 담당자에게 연결</h2><blockquote>“반납했는데 앱에 아직 이용 중으로 나와요.”</blockquote><ol class="demo-attempts"><li><small>1회차</small><b>최초 문의</b><span>부족한 정보 질문</span></li><li><small>2회차</small><b>첫 추가 답변</b><span>정보가 부족하면 재질문</span></li><li><small>3회차</small><b>두 번째 추가 답변</b><span>보완 한도에 따라 이관</span></li></ol><p class="demo-footnote">최초 문의 포함 3회차 한도 · 같은 문의 연결값 사용</p>',
 fault:'<h2>2:20–3:00 · 근거가 없으면 담당자에게 연결하기</h2><blockquote>“따릉이를 해외 여행에 가져가서<br>한 달 동안 써도 되나요?”</blockquote><div class="demo-route"><b>검색 근거 없음</b><span>→</span><b>담당자 확인</b><span>→</span><b>접수번호 안내</b></div><p class="story-caption">답을 단정하지 않고, 이관 이유와 접수 결과를 기록합니다.</p>',
 handoff:'<h2>3:00–4:30 · 담당자가 문의를 검토하고 기록하기</h2><div class="demo-route"><b>요약·보완 정보 검토</b><span>→</span><b>담당자 확인</b><span>→</span><b>진행 중·내부 메모</b></div><p>Jira에서는 티켓 종료까지 관리할 수 있습니다.</p><p class="demo-footnote">이번 시연: 진행 중·메모 저장까지 · 티켓 종료는 11/08 검증<br>실제 환불·반납 변경은 구현 범위 밖입니다.</p>'
 };$('#demo-panel').innerHTML=content[id]||content.normal;
}
let resizeTimer;window.addEventListener('resize',()=>{positionAtlas();clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(view)renderView();positionAtlas()},180)});
go((Number(location.hash.match(/^#slide-(\d+)$/)?.[1])||1)-1);renderDemo('normal');renderPayload('example');
atlas.addEventListener('load',()=>atlas.contentWindow?.postMessage({type:'deck-data'},'*'));
atlas.contentWindow?.postMessage({type:'deck-data'},'*');
