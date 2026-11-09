// Build a reviewed public derivative; never modify submission/final or team originals.
// Run with Node.js from the repository root. Full local final materials are required.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),cp=require('child_process');
const root=path.resolve(__dirname,'../..'),input=path.join(root,'submission/final'),out=path.join(root,'submission/public');
const deckRel='presentation/team-presentation',src=path.join(input,deckRel),dst=path.join(out,deckRel);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const tracked=new Set(cp.execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean));
const read=p=>fs.readFileSync(p,'utf8');
const termArg=process.argv.indexOf('--private-terms-file');
if(termArg<0)throw Error('Supply --private-terms-file with the locally reviewed exclusion terms; never commit that file.');
const privateTerms=JSON.parse(read(path.resolve(process.argv[termArg+1])));
if(!Array.isArray(privateTerms)||privateTerms.some(x=>typeof x!=='string'||!x))throw Error('Expected a nonempty-string array of private terms');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
if(!fs.existsSync(src))throw Error('Local final presentation required; use the published files to view without originals.');
const inputs=walk(input).map(p=>({path:path.relative(root,p).replace(/\\/g,'/'),sha256:sha(fs.readFileSync(p))}));
const c={window:{}};vm.createContext(c);for(const f of ['assets/source-data.js','assets/pdf-data.js','notes.js'])vm.runInContext(read(path.join(src,f)),c);
const source=c.window.SOURCE_DATA,pdfs=c.window.PDF_DATA,plan=c.window.PRESENTATION_PLAN;
for(const f of source.files){const p=path.resolve(root,f.source);if(sha(fs.readFileSync(p))!==f.sha256)throw Error('Preserved team original changed');inputs.push({path:f.source,sha256:f.sha256});}
fs.mkdirSync(path.join(root,'tmp'),{recursive:true});fs.writeFileSync(path.join(root,'tmp/public-submission-input-hashes.json'),JSON.stringify(inputs,null,2)+'\n');
const findings={},links=[],outputs=new Map();
const record=(type,n=1)=>findings[type]=(findings[type]||0)+n;
function mask(s){
  const rules=[
    ['ip',/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,'[서버 주소 제외]'],
    ['email',/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[메일 주소 제외]'],
    ['discord-address',/https?:\/\/(?:discord\.com|discordapp\.com)\/(?:channels|api\/webhooks)\/[^\s"'<>]+/g,'[내부 Discord 주소 제외]'],
    ['tenant-address',/https?:\/\/[^\s"'<>/]+\.(?:atlassian\.net|n8n\.cloud)[^\s"'<>]*/g,'[내부 서비스 주소 제외]'],
    ['local-profile',/[A-Z]:[\\/](?:Users|phase4)[^\s"'<>]*/g,'[개인 PC 경로 제외]'],
    ['account-id',/\b\d{17,20}\b/g,'[계정 식별자 제외]']
  ];
  for(const[k,re,replacement]of rules)s=s.replace(re,()=>{record(k);return replacement});
  for(const term of privateTerms)s=s.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),()=>{record('private-term');return '역할 담당자'});
  return s.replace(/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com[^;]+;/g,'');
}
const aliases=JSON.parse(read(path.join(src,'checks/source-link-relocations.json'))).aliases;
const mapping=new Map();
for(const d of source.docs){mapping.set(d.source,'sources/'+d.id+'.html');mapping.set(mask(d.source),'sources/'+d.id+'.html');}
for(const p of pdfs)mapping.set(p.source,'sources/pdf-'+p.id+'.html');
mapping.set('sources/dubakwi-workflow.html','r02-atlas.html');mapping.set('dubakwi-workflow.html','r02-atlas.html');
mapping.set('sources/workflow-design.md','../../docs/WORKFLOW-DESIGN.html');
const excluded='../../README.md#공개에서-제외한-자료';
function publicWording(s){return s.replaceAll('과거 실행 PDF','과거 실행 기록 · 공개 텍스트').replaceAll('보존 실행 결과 PDF','실행 결과 · 공개 텍스트').replaceAll('보존 PDF를','과거 기록을').replaceAll('리허설 보존 화면을 사용한다.','공개 리허설 기록과 당시 판정을 설명한다. 원문 화면은 로컬 보존본에 있다.').replaceAll('원 PDF 13쪽 화면','원자료 13쪽 공개 텍스트').replaceAll('원 PDF 14쪽 화면','원자료 14쪽 공개 텍스트').replaceAll('두 이미지는 팀원이 제공한 가린 PDF의 보존 페이지이며 이번에 실행한 캡처가 아니다.','원문 PDF와 화면 이미지는 공개에서 제외하고 텍스트 기록을 제공합니다. 이번에 실행한 캡처가 아닙니다.');}
function resolveHref(href){
  if(!href||/^(?:[a-z][\w+.-]*:|#|\/)/i.test(href))return href;
  const [raw,...hash]=href.replaceAll('&amp;','&').split('#');let file;try{file=decodeURIComponent(raw)}catch{file=raw}
  const tail=hash.length?'#'+hash.join('#'):'';
  file=aliases[file]||file;
  let mapped=mapping.get(file);
  if(!mapped&&/\.\.\/\.\.\/\.\.\/\.\.\/knowledge\/(public|restricted)\/?$/.test(file))mapped='../../../../knowledge/manifest.json';
  if(!mapped&&file.includes('/docs/guideline/'))mapped='sources/guide.html';
  if(!mapped&&file.startsWith('sources/')){
    const base=path.basename(file).replace(/-202611\d\d.*$/,'');
    const d=source.docs.find(x=>x.id===base||path.basename(x.source).replace(/-202611\d\d.*$/,'')===base);
    if(d)mapped='sources/'+d.id+'.html';
    else if(/WORKFLOW-DESIGN/i.test(file))mapped='../../docs/WORKFLOW-DESIGN.html';
    else if(/RAG-ARCHITECTURE/i.test(file))mapped='../../docs/RAG-ARCHITECTURE.html';
    else if(/EXECUTION-RESULT/i.test(file))mapped='../../docs/EXECUTION-RESULT.html';
  }
  if(!mapped&&/r05-execution-page(?:13|14)\.jpg$/.test(file))mapped='sources/pdf-execution.html';
  if(!mapped&&file.includes('/images/'))mapped=excluded;
  if(!mapped&&/\.(?:pdf|png|jpe?g)$/i.test(file))mapped=excluded;
  if(!mapped){
    const absolute=path.resolve(src,file),rel=path.relative(root,absolute).replace(/\\/g,'/');
    const local=path.relative(input,absolute).replace(/\\/g,'/');
    if(tracked.has(rel)||/^docs\/(?:WORKFLOW-DESIGN|RAG-ARCHITECTURE|EXECUTION-RESULT|README)\.(?:md|html)$/.test(local)||local==='index.html'||['demo-runbook.md','guide-coverage.md','payload-example.md','presenter-notes.md'].includes(file))mapped=file;
    else if(absolute.startsWith(src+path.sep)&&fs.existsSync(absolute)&&/\.(?:css|js|svg|html)$/.test(file)&&!file.startsWith('sources/'))mapped=file;
    else mapped=excluded;
  }
  if(mapped!==file)links.push({from:mask(file),to:mapped});
  // Generated readers have different headings; do not retain obsolete source anchors.
  return mapped+(mapped===file?tail:'');
}
function cleanHtml(html){
  html=publicWording(mask(html)).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  html=html.replace(/<button\b[^>]*data-gallery=["']r04-slides-[1-5]["'][^>]*>[\s\S]*?<\/button>/gi,'<p>실행 화면은 공개본에서 제외했습니다. 판정과 조건은 공개 실행 결과서를 참조하세요.</p>');
  html=html.replace(/<img\b[^>]*>/gi,tag=>/\.svg["']/.test(tag)?tag:'<p class="public-exclusion">화면 캡처·원문 이미지는 로컬 보존본에 있습니다.</p>');
  return html.replace(/\b(href|src)=(["'])([^"']+)\2/g,(_,a,q,h)=>a+'='+q+resolveHref(h)+q);
}
function put(rel,value){if(rel.endsWith('.svg')||rel.includes('/sources/'))value=value.replace(/^[ \t]+$/gm,'');outputs.set(rel,Buffer.from(value));}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css='body{max-width:1120px;margin:36px auto;padding:0 24px 64px;font:17px/1.75 system-ui,"Malgun Gothic",sans-serif;color:#183128;background:#f6f8f4}a{color:#245f39}h1{line-height:1.3}h2{margin-top:2em}table{border-collapse:collapse;display:block;overflow:auto}td,th{border:1px solid #b6c7b8;padding:8px 12px;text-align:left;vertical-align:top}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#e8eee5;padding:20px}svg,img{max-width:100%;height:auto}.public-note{padding:14px 20px;border-left:4px solid #587442;background:#e7efdf}nav{display:flex;gap:24px;margin-bottom:24px}article{background:white;padding:24px;border:1px solid #d5dfd0}';
function page(title,body,back='../index.html') {return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>'+css+'</style></head><body><nav><a href="'+back+'">발표로 돌아가기</a></nav><h1>'+esc(title)+'</h1>'+body+'</body></html>\n'}
const publicNote='<p class="public-note">공개용 정리본입니다. 계정·접속 정보와 원문 화면은 제외했으며, 팀원 원본과 제출용 전체 자료는 로컬에서 보존합니다. 과거 결과는 기록 당시 조건으로 읽어 주세요.</p>';
const guideBlocks=[
  '<h2>발표 구성과 시간</h2><p>업무·역할 3분, 워크플로우 5분, RAG 4분, 시연 5분, 결과·결론 3분으로 본문 20분을 편성했습니다. 질의응답 5분은 별도입니다. 실제 연속 발표 시간은 미측정입니다.</p>',
  '<h2>필수산출물 대응</h2><p>워크플로우 설계서는 업무·역할·노드·분기·도구·페이로드·오류를 설명합니다. RAG 설계서는 원본·청킹·임베딩·검색 권한·복구를 설명합니다. 실행 결과서는 시험 조건·기대와 실제·실패·재시험·한계를 설명합니다.</p>',
  '<h2>시연 순서</h2><p>QR 근거 안내 → 같은 반납 문의의 보완과 세 번째 이관 → 무근거 이관 → Jira All에서 담당자 검토·진행 중·내부 메모를 보여줍니다. 실제 환불·반납 변경 기능은 포함하지 않습니다.</p>',
  '<h2>발표 자료의 근거</h2><p>각 장의 발표자 메모에서 대본·필수산출물·원본 보고서를 연결합니다. 검색 평가, 대표 종단 요청, 과거 반복 시험을 서로 다른 조건으로 설명합니다. 가이드 원문 자체는 공개 재배포하지 않고 이 프로젝트의 적용 결과만 제공합니다.</p>'
];
for(const d of source.docs){
  const old=d.source;d.source='sources/'+d.id+'.html';delete d.file;
  if(['guide','current-requirements'].includes(d.id)){d.title='발표 요구사항 적용 요약';d.blocks=guideBlocks.map((html,i)=>({html,index:i}));}
  else d.blocks=d.blocks.map(b=>({html:cleanHtml(b.html)}));
  d.title=mask(d.title).replaceAll('원문','공개 정리');d.baseline=d.baseline||'reviewed-public';
  const body=d.blocks.map(b=>b.html).join('\n').replace(/\b(href|src)=(["'])([^"']+)\2/g,(_,a,q,h)=>a+'='+q+(/^(?:[a-z][\w+.-]*:|#|\/)/i.test(h)?h:'../'+h)+q);
  put(deckRel+'/'+d.source,page(d.title,publicNote+body));
}
source.visuals=source.visuals.filter(v=>v.kind==='diagram');source.files=[];
source.publication={version:'public-20261109',local_original_files:11,raw_attachments_included:false};
source.currentBaseline={...source.currentBaseline,documentCommit:'df684f30764ffb6286ab23d325773dfcc31e76b3',publication:'reviewed-public-derivative'};
for(const p of pdfs){
  p.text=p.text.map(t=>mask(t));p.source='sources/pdf-'+p.id+'.html';delete p.file;delete p.pages;
  p.title=mask(p.title)+' · 공개 텍스트';p.publicTextOnly=true;
  p.blocks=[publicNote,...p.text.flatMap((t,i)=>['<h2>원자료 '+(i+1)+'쪽 · 공개 텍스트</h2>',...t.split(/\n\s*\n/).filter(Boolean).map(s=>'<p>'+esc(s).replaceAll('\n','<br>')+'</p>')])];
  put(deckRel+'/'+p.source,page(p.title,p.blocks.join('\n')));
}
for(const file of ['index.html','presentation.css','story.css','speaker.html','speaker.css','speaker.js','atlas.css','atlas.js','atlas-story.css','atlas-story.js','r02-atlas.html']){
  let text=mask(read(path.join(src,file)));
  if(file==='index.html')text=text.replaceAll('보존 실행 화면','과거 실행 기록').replaceAll('과거 실행 증거','과거 실행 기록').replaceAll('원본 반복 시험·측정값','반복 시험·측정값').replaceAll('실패·수정·재시험 원문','실패·수정·재시험 기록').replace('data-gallery="r04-slides-4">보존 Discord 화면','data-open-doc="presentation-demo">Discord 리허설 기록').replace('data-gallery="r04-slides-2">보존 Jira 화면','data-open-doc="latest-jira">Jira 처리 기록');
  if(file==='r02-atlas.html')text=text.replace('href="dubakwi-workflow.html"','href="r02-atlas.html"');
  put(deckRel+'/'+file,text);
}
for(const file of fs.readdirSync(path.join(src,'assets')).filter(f=>f.endsWith('.svg')))put(deckRel+'/assets/'+file,mask(read(path.join(src,'assets',file))));
function mapStrings(obj,fn){if(typeof obj==='string')return fn(obj);if(Array.isArray(obj))return obj.map(x=>mapStrings(x,fn));if(obj&&typeof obj==='object')return Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,mapStrings(v,fn)]));return obj;}
let notes=mapStrings(plan,s=>publicWording(mask(s)));notes.version='story12-public-20261109';notes.demoRunbookSource='demo-runbook.md';
for(const s of notes.slides){s.sources=s.sources.map(x=>({...x,path:resolveHref(x.path)}));s.limits.push('공개본은 계정·접속 정보와 원문 PDF/화면을 제외했습니다. 공개 텍스트와 보고서로 근거를 확인합니다.');s.actions=s.actions.map(x=>x.replace(/보존 실행 화면|과거 실행 증거/g,'과거 실행 기록').replace(/PDF\s*13\s*[~–-]\s*14쪽/g,'공개 텍스트의 원자료 13~14쪽'));}
put(deckRel+'/notes.js','window.PRESENTATION_PLAN='+JSON.stringify(notes,null,2)+';\n');
put(deckRel+'/assets/source-data.js','window.SOURCE_DATA='+JSON.stringify(source,null,2)+';\n');
put(deckRel+'/assets/pdf-data.js','window.PDF_DATA='+JSON.stringify(pdfs,null,2)+';\n');
let js=mask(read(path.join(src,'presentation.js')));
js=js.replace(/function openPDF\(id,page=1\)\{[^\n]+\}/,'function openPDF(id,page=1){const pdf=pdfData.find(p=>p.id===id);if(!pdf)return;openView({kind:"reader",title:pdf.title,blocks:pdf.blocks,source:pdf.source,find:"원자료 "+page+"쪽",page:0})}');
js=js.replaceAll("'보존 원본 열기'","'공개 정리 열기'").replaceAll("'원본 저장'","'공개 정리 저장'").replaceAll("'보존 원문 · '","'공개 정리 · '").replaceAll("' · PDF'","' · 텍스트'").replaceAll('팀 자료 전체 · 원문과 상세','팀 자료 · 공개 정리와 상세').replaceAll("source:'sources/r04.html'","source:'sources/r04-slides.html'");
put(deckRel+'/presentation.js',js);
let story=mask(read(path.join(src,'story.js'))).replace(/source:'([^']+)'/g,(_,h)=>"source:'"+resolveHref(h)+"'");put(deckRel+'/story.js',story);
for(const file of ['demo-runbook.md','demo-runbook.html','presenter-notes.md','guide-coverage.md','payload-example.md']){
 let s=publicWording(mask(read(path.join(src,file))));
 s=s.replace(/PDF\s*13\s*[~–-]\s*14쪽/g,'공개 텍스트의 원자료 13~14쪽').replace(/PDF 13쪽/g,'공개 텍스트의 원자료 13쪽').replace(/보존 실행 화면|과거 실행 증거/g,'과거 실행 기록');
 s=s.replace(/\b(href|src)=(["'])([^"']+)\2/g,(_,a,q,h)=>a+'='+q+resolveHref(h)+q);
 s=s.replace(/(!?\[[^\]\n]*\])\(([^\s)]+)\)/g,(_,label,h)=>label+'('+resolveHref(h)+')');
 put(deckRel+'/'+file,s);
}
const screenLink='../presentation/team-presentation/sources/pdf-execution.html';
for(const file of ['WORKFLOW-DESIGN.md','RAG-ARCHITECTURE.md','EXECUTION-RESULT.md','README.md','WORKFLOW-DESIGN.html','RAG-ARCHITECTURE.html','EXECUTION-RESULT.html','README.html']){
 let s=mask(read(path.join(input,'docs',file)));
 s=s.replace(/\.\.\/\.\.\/\.\.\/knowledge\/(?:public|restricted)\//g,'../../../knowledge/manifest.json');
 s=s.replace(/\.\.\/images\/r05-execution-page(?:13|14)\.jpg/g,screenLink).replaceAll('원 PDF 13쪽 화면','원자료 13쪽 공개 텍스트').replaceAll('원 PDF 14쪽 화면','원자료 14쪽 공개 텍스트').replace('두 이미지는 팀원이 제공한 가린 PDF의 보존 페이지이며 이번에 실행한 캡처가 아니다.','원문 PDF와 화면 이미지는 공개에서 제외하고 텍스트 기록을 제공합니다. 이번에 실행한 캡처가 아닙니다.');
 if(file.endsWith('.md'))s=s.replace(/^(# .+)$/m,'$1\n\n> 공개용 최종본 · 계정/접속 정보와 원문 화면은 제외했습니다. 원본은 로컬 보존하며 검증 수치·미실행 판정은 유지합니다.');
 else s=s.replace('<article>','<article>'+publicNote);
 put('docs/'+file,s);
}
const readme=`# 두바퀴 · 공개용 최종산출물과 발표

2026-11-09 · R01 취합 · 본문 12장 / 편성 20분 / 질의응답 5분 별도

## 열기

GitHub에서 문서는 아래 Markdown 링크로 읽습니다. HTML 발표는 GitHub 저장소를 Clone하거나 **Code → Download ZIP**으로 받은 뒤 압축을 풀고 [시작 페이지](index.html)를 브라우저에서 여세요. GitHub 파일 화면에서는 HTML 코드가 표시되며 발표가 직접 실행되지는 않습니다. 별도 서버·설치·로그인 없이 설명용 슬라이드와 상호작용이 동작합니다. 실제 서비스 시연에는 별도로 인계받은 등록 계정이 필요합니다.

- [워크플로우 설계서](docs/WORKFLOW-DESIGN.md) · [읽기용 HTML](docs/WORKFLOW-DESIGN.html)
- [RAG 아키텍처 설계서](docs/RAG-ARCHITECTURE.md) · [읽기용 HTML](docs/RAG-ARCHITECTURE.html)
- [실행 결과서](docs/EXECUTION-RESULT.md) · [읽기용 HTML](docs/EXECUTION-RESULT.html)
- [발표 시작](presentation/team-presentation/index.html) · [발표자 메모](presentation/team-presentation/speaker.html)
- [발표 대본](presentation/team-presentation/presenter-notes.md) · [시연 절차](presentation/team-presentation/demo-runbook.md)
- [공개 범위·검증 기록](../../runs/public/20261109-124900-local-public-submission/report.md)

화살표 / PageUp·PageDown으로 장을 이동합니다. 발표자 메모에서 각 장의 대본·조작·필수산출물 대응을 확인합니다. R02의 9개 시나리오 재생·노드 상세, n8n↔Jira 단계 전환, 시연 탭, 자료 읽기·검색·도표 확대를 유지했습니다. 브라우저의 로컬 파일 창 간 통신 정책에 따라 메모 자동 따라가기가 제한되면 독립 탐색을 사용하세요.

## 공개에서 제외한 자료

실제 접속 주소·개인 계정·연락처, 원문 PDF·화면 캡처·원문 이미지, 강의 가이드 전문, 원시 실행 로그·서버 자료, 내부 전달 ZIP과 백업은 공개하지 않습니다. 팀원 원본 11개와 내부 제출본은 기존 로컬 위치에 그대로 보존합니다. 공개용 사본에는 검토한 설명·도표·코드·텍스트 기록만 담았으며 화면을 새로 실행한 증거처럼 대체하지 않았습니다.

원문 PDF의 29쪽은 공개 텍스트로 열립니다. 원문 화면이 필요한 확인은 로컬 보존본을 사용합니다. 강의 가이드 원문 링크는 본 프로젝트의 적용 요약으로 연결합니다. 이 공개 요청은 제3자 원문의 재배포 허가나 새로운 라이선스 선택을 뜻하지 않습니다.

## 범위와 남은 확인

기능 판정은 실행 결과서를 따릅니다. D10/TC15 미실행, recovery action 범위 밖, VM 전체 소스 동일성 미확인은 유지합니다. 공개 자료의 정적 링크·구문·DOM 조작 검사와 실제 브라우저 시각 검수·전체 발표 시간 실측은 구분합니다. 실제 제출·발표 수행은 별도입니다.
`;
put('README.md',readme);
put('index.html',page('두바퀴 · 최종산출물과 발표',`<p>12장 발표 · 20분 편성 · 공개용 최종본</p><article><h2>필수산출물</h2><ul><li><a href="docs/WORKFLOW-DESIGN.html">워크플로우 설계서</a></li><li><a href="docs/RAG-ARCHITECTURE.html">RAG 아키텍처 설계서</a></li><li><a href="docs/EXECUTION-RESULT.html">실행 결과서</a></li></ul><h2>발표와 메모</h2><p><a href="presentation/team-presentation/index.html">발표 시작</a> · <a href="presentation/team-presentation/speaker.html">발표자 메모</a> · <a href="presentation/team-presentation/demo-runbook.html">시연 절차</a></p></article>${publicNote}<p><a href="README.md">공개 범위와 사용 안내</a></p>`,'../../README.md'));
// Refuse accidentally adding opaque attachments or secrets to this generated tree.
const secret=/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{24,}|ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16})\b/;
for(const [rel,bytes]of outputs){if(!/\.(?:md|html|css|js|svg)$/.test(rel))throw Error('Unexpected output type');if(secret.test(bytes.toString()))throw Error('Secret pattern in '+rel);if(privateTerms.some(t=>bytes.toString().toLowerCase().includes(t.toLowerCase())))throw Error('Private term remains in '+rel);const file=path.resolve(out,rel);if(!file.startsWith(out+path.sep))throw Error('Output path escaped');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);}
for(const f of inputs)if(sha(fs.readFileSync(path.join(root,f.path)))!==f.sha256)throw Error('Input preservation failed');
const manifest={version:'public-20261109',source_commit:'df684f30764ffb6286ab23d325773dfcc31e76b3',deck_version:notes.version,slides:12,scheduled_seconds:1200,team_originals_preserved:11,original_input_files_unchanged:inputs.length,original_input_digest_sha256:sha(JSON.stringify(inputs)),public_pdf_text_pages:pdfs.reduce((n,p)=>n+p.text.length,0),raw_attachments_included:false,exclusions:['private access/account information','raw PDF/screenshots/images','course-guide full text','raw logs/backups/internal ZIP'],mask_counts:findings,relocated_references:[...new Map(links.map(x=>[JSON.stringify(x),x])).values()],files:[...outputs].map(([p,b])=>({path:p,bytes:b.length,sha256:sha(b),sha256_lf:sha(b.toString().replace(/^\uFEFF/,'').replace(/\r\n/g,'\n'))}))};
fs.writeFileSync(path.join(out,'publication-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({files:outputs.size+1,slides:12,seconds:1200,originalsUnchanged:inputs.length,maskCounts:findings,relocated:manifest.relocated_references.length}));
