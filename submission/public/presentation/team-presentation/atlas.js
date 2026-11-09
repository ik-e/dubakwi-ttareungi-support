// Adapt the original R02 rendering to presentation pages; original data and actions stay intact.
let atlasMap='route';
const originalGraph=renderGraph;
const toolsRow=document.createElement('div');toolsRow.className='atlas-options';toolsRow.innerHTML='<button data-map="route" class="active">선택 경로</button><button data-map="original">원본 전체도</button><button id="zoom-graph">도표 확대</button><button id="inspect-current">단계 상세</button>';
document.querySelector('.segmented').before(toolsRow);
const pageLabel=document.createElement('div');pageLabel.className='atlas-page-label';document.querySelector('.board').append(pageLabel);
renderGraph=function(){
 document.body.classList.toggle('original-map',atlasMap==='original');
 if(atlasMap==='original'){originalGraph();for(const label of $('#graph').querySelectorAll('.lane-title'))label.textContent=label.textContent.replace('B14 · B15는 병렬 실행','B14 · B15 분기·합류 (동시 실행 실측 아님)');pageLabel.style.display='block';pageLabel.textContent='원본 전체도 · 도표 확대 / 노드 상세';return}
 const svg=$('#graph');svg.replaceChildren();const groups=steps();const pageSize=8;const first=Math.floor(step/pageSize)*pageSize;const local=groups.slice(first,first+pageSize);const cols=4;const w=260;const h=view==='overview'?95:105;const gap=30;const rowGap=22;const rows=Math.ceil(local.length/cols);const vw=cols*(w+gap)+10;const vh=rows*(h+rowGap)+12;
 svg.setAttribute('viewBox',`0 0 ${vw} ${vh}`);svg.style.maxHeight='100%';
 const defs=el('defs'),marker=el('marker',{id:'arrow',viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'});marker.append(el('path',{d:'M 0 1 L 9 5 L 0 9',fill:'none',stroke:'#789562','stroke-width':1.5}));defs.append(marker);svg.append(defs);
 const positions=local.map((g,i)=>({g,x:15+(i%cols)*(w+gap),y:15+Math.floor(i/cols)*(h+rowGap)}));
 for(let i=0;i<positions.length-1;i++){
  const a=positions[i],b=positions[i+1];const d=i%cols===cols-1?`M${a.x+w/2},${a.y+h} L${a.x+w/2},${a.y+h+20} L${b.x+w/2},${a.y+h+20} L${b.x+w/2},${b.y}`:`M${a.x+w},${a.y+h/2} L${b.x},${b.y+h/2}`;
  makeEdge(svg,d,true,first+i<step,first+i===step,`${first+i}-${first+i+1}`);
 }
 for(const [i,p]of positions.entries()){
  const ids=Array.isArray(p.g)?p.g:[p.g];
  ids.forEach((id,j)=>{
   const node=view==='overview'?stages[id]:EXACT_NODES[id];
   drawNode(svg,id,node,p.x,p.y+(ids.length>1?j*55-4:0),w,ids.length>1?49:h,ids.length>1,first+i);
   const g=svg.lastChild;
   if(view==='overview'){
    g.querySelector('.node-title').setAttribute('x','12');g.querySelector('.node-title').setAttribute('y','56');
    g.querySelector('.node-sub').setAttribute('x','12');g.querySelector('.node-sub').setAttribute('y','80');
    g.querySelector('.node-code').setAttribute('x','48');g.querySelector('.node-code').setAttribute('y','28');
    g.querySelector('.node-status').setAttribute('cy','82');
   }else{
    g.querySelector('.node-title').setAttribute('y',ids.length>1?'38':'63');
    g.querySelector('.node-code').setAttribute('y','20');
    g.querySelector('.node-code').textContent=id+' · '+(node.kind||'').replace('Execute Sub-workflow','Sub').replace('Basic LLM Chain','LLM').replace('HTTP Request','HTTP');
    g.querySelector('.node-code').style.fontSize='14px';
    const title=g.querySelector('.node-title');title.style.fontSize=ids.length>1?'22px':'24px';
    if(ids.length===1&&title.getComputedTextLength()>w-24){
     const value=title.textContent;title.textContent='';let line='',lines=[];
     for(const char of value){title.textContent=line+char;if(title.getComputedTextLength()>w-24&&line){lines.push(line);line=char}else line+=char}if(line)lines.push(line);
     title.replaceChildren();const start=lines.length>2?43:52;for(const [li,text]of lines.entries())title.append(el('tspan',{x:12,y:start+li*25},text));
    }
   }
  });
 }
 const travels=svg.querySelectorAll('.edge.travel');travels.forEach((_,i)=>{svg.append(el('circle',{'data-halo':i,r:9,fill:'#d5eaa6',opacity:.55,'pointer-events':'none'}));svg.append(el('circle',{'data-packet':i,r:4,fill:'#648b3d','pointer-events':'none'}))});updatePacket(progress);
 pageLabel.style.display=view==='detail'?'block':'none';pageLabel.textContent=view==='detail'?`노드 ${first+1}–${Math.min(first+pageSize,groups.length)} / ${groups.length} · 다음 단계 또는 타임라인으로 이동`:'';
};
toolsRow.querySelectorAll('[data-map]').forEach(b=>b.addEventListener('click',()=>{atlasMap=b.dataset.map;toolsRow.querySelectorAll('[data-map]').forEach(t=>t.classList.toggle('active',t===b));renderGraph()}));
function sendDetail(){
 pause();const html=$('#inspector').innerHTML;
 if(parent!==window)parent.postMessage({type:'atlas-inspect',html,title:$('#inspector h2')?.textContent||'단계 상세'},'*');
 else {const d=document.createElement('dialog');d.className='atlas-self-dialog';d.innerHTML='<button onclick="this.parentElement.close()">닫기</button>'+html;document.body.append(d);d.showModal();d.addEventListener('close',()=>d.remove())}
}
$('#inspect-current').addEventListener('click',sendDetail);
$('#zoom-graph').addEventListener('click',()=>{
 pause();const clone=$('#graph').cloneNode(true),source=$('#graph').querySelectorAll('*'),copies=clone.querySelectorAll('*');
 source.forEach((s,i)=>{const cs=getComputedStyle(s);for(const key of ['fill','stroke','stroke-width','stroke-dasharray','font-size','font-family','font-weight','text-anchor','opacity'])copies[i].style.setProperty(key,cs.getPropertyValue(key))});
 clone.setAttribute('xmlns',NS);clone.style.width='100%';clone.style.height='100%';
 parent.postMessage({type:'atlas-zoom',svg:clone.outerHTML,title:scenario.id+' · '+scenario.name+' · '+(view==='detail'?'n8n 노드':'업무 흐름')},'*');
});
$('#graph').addEventListener('click',e=>{if(e.target.closest('.node'))sendDetail()});
$('#graph').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.node'))sendDetail()});
window.addEventListener('message',e=>{
 if(e.source!==parent||!e.data?.type?.startsWith('deck-'))return;
 const d=e.data;
 if(d.type==='deck-pause'){pause();return}
 if(d.type==='deck-config'){
  pause();if(d.scenario)choose(scenarios.find(s=>s.id===d.scenario)||scenario);
  if(d.view){view=d.view;step=0;selected=null;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-pressed',String(b.dataset.view===view))})}
  if(d.node){view='detail';step=Math.max(0,steps().findIndex(s=>Array.isArray(s)?s.includes(d.node):s===d.node));selected=d.node;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='detail'))}
  atlasMap='route';sync();if(d.inspect)sendDetail();
 }
 if(d.type==='deck-data')parent.postMessage({type:'atlas-data',nodes:EXACT_NODES,stages,scenarios},'*');
});
document.addEventListener('keydown',e=>{if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();parent.postMessage({type:'atlas-navigate',delta:e.key==='PageDown'?1:-1},'*')}});
window.ATLAS={getState:()=>({scenario:scenario.id,view,step,playing,speed,selected,map:atlasMap}),getData:()=>({scenarios,stages,nodes:EXACT_NODES})};
pause();parent.postMessage({type:'atlas-ready',nodes:EXACT_NODES,stages,scenarios},'*');
