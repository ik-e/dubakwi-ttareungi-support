// Offline publication checks. No browser, service request, or actual rehearsal.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),cp=require('child_process');
const args=process.argv.slice(2),option=k=>args.includes(k)?args[args.indexOf(k)+1]:null;
const root=path.resolve(option('--root')||path.join(__dirname,'../..')),dir=path.join(root,'submission/public'),deck=path.join(dir,'presentation/team-presentation');
const read=p=>fs.readFileSync(p,'utf8'),errors=[],checks=[];
const verify=(name,test)=>{try{test();checks.push({name,pass:true})}catch(e){checks.push({name,pass:false});errors.push({name,error:e.message})}};
const assert=(value,message)=>{if(!value)throw Error(message)};
const manifest=JSON.parse(read(path.join(dir,'publication-manifest.json')));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const allowed=new Set([...manifest.files.map(f=>f.path),'publication-manifest.json']);
const publicNames=new Set(cp.execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean));
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const anchors=text=>new Set([...text.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]));
const refs=new Set(),externals=new Set();
function reference(from,url){
  if(!url)return;
  assert(!/^(?:javascript|data|file):/i.test(url),'Disallowed URL scheme in '+path.relative(dir,from));
  if(/^[a-z][\w+.-]*:/i.test(url)){externals.add(url);return;}
  assert(!url.startsWith('/'),'Absolute path in '+path.relative(dir,from));
  const [raw,fragment]=url.replaceAll('&amp;','&').split('#');const part=decodeURIComponent(raw.split('?')[0]);
  const target=part?path.resolve(path.dirname(from),part):from,rel=path.relative(root,target).replace(/\\/g,'/');
  assert(target.startsWith(root+path.sep)&&publicNames.has(rel),'Non-public reference '+path.relative(dir,from)+' -> '+url);
  assert(fs.existsSync(target)&&fs.statSync(target).isFile(),'Missing reference '+url);refs.add(rel);
  const route=/^slide-(?:[1-9]|1[0-2])$/.test(fragment||'')&&['index.html','speaker.html'].includes(path.basename(target));
  if(fragment&&/\.html$/.test(target)&&!route)assert(anchors(read(target)).has(decodeURIComponent(fragment)),'Missing HTML anchor '+url);
}
function htmlRefs(from,text){for(const m of text.matchAll(/\b(?:src|href)=["']([^"']+)["']/g))reference(from,m[1]);}
const dangerous=[['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['token',/\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{24,}|ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16})\b/],['email',/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],['account-id',/\b\d{17,20}\b/],['private-service',/(?:discord\.com\/(?:channels|api\/webhooks)\/|[a-z0-9-]+\.atlassian\.net|[a-z0-9-]+\.n8n\.cloud)/i],['profile-path',/[A-Z]:[\\/](?:Users|phase4)/i],['address',/\b(?:\d{1,3}\.){3}\d{1,3}\b/]];
for(const f of walk(dir))verify('public file '+path.relative(dir,f),()=>{
 const rel=path.relative(dir,f).replace(/\\/g,'/');assert(allowed.has(rel),'Unlisted publication file');assert(!fs.lstatSync(f).isSymbolicLink(),'Symlink');assert(/\.(?:md|html|css|js|svg|json)$/.test(f),'Opaque attachment');
 const body=read(f);for(const [name,re]of dangerous)assert(!re.test(body),name+' pattern');
 const entry=manifest.files.find(x=>x.path===rel);if(entry)assert(hash(body.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n'))===entry.sha256_lf,'Manifest normalized SHA256 differs');
 if(f.endsWith('.md'))for(const m of body.replace(/^```[\s\S]*?^```/gm,'').matchAll(/!?\[[^\]\n]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g))reference(f,m[1]||m[2]);
 if(/\.(html|svg)$/.test(f)){htmlRefs(f,body);for(const m of body.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1],{filename:rel});}
 if(f.endsWith('.js'))new vm.Script(body,{filename:rel});
 if(f.endsWith('.css'))for(const m of body.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g))reference(f,m[1]);
});
const c={window:{}};for(const f of ['assets/source-data.js','assets/pdf-data.js','notes.js'])vm.runInNewContext(read(path.join(deck,f)),c);
const data=c.window.SOURCE_DATA,pdfs=c.window.PDF_DATA,plan=c.window.PRESENTATION_PLAN;
verify('12 slides, 20-minute plan, 9 scenario interactions',()=>{const html=read(path.join(deck,'index.html'));assert([...html.matchAll(/class="slide(?:\s|"|$)/g)].length===12,'Slide count');assert(plan.slides.length===12&&plan.slides.reduce((n,s)=>n+s.seconds,0)===1200,'Plan timing');const atlas=read(path.join(deck,'r02-atlas.html'));const scenarios=atlas.match(/const scenarios=\[([\s\S]*?)\];/);assert(scenarios&&[...scenarios[1].matchAll(/\{id:'/g)].length===9,'R02 scenario count');assert(data.files.length===0,'Raw originals published');assert(pdfs.reduce((n,p)=>n+p.text.length,0)===29,'Text page count');assert(pdfs.every(p=>p.publicTextOnly&&!p.pages),'PDF images published');});
verify('all notes and data references are available without local originals',()=>{
 for(const d of Object.values(plan.deliverables))reference(path.join(deck,'index.html'),d.path);
 reference(path.join(deck,'index.html'),plan.demoRunbookSource);
 for(const s of plan.slides){for(const k of ['script','actions','deliverables','sources','limits'])assert(s[k]?.length,'Missing '+k);for(const item of s.sources)reference(path.join(deck,'index.html'),item.path);}
 for(const d of data.docs){reference(path.join(deck,'index.html'),d.source);for(const b of d.blocks){assert(!('text' in b)&&!('heading' in b),'Unreviewed source text metadata retained');htmlRefs(path.join(deck,'index.html'),b.html);}}
 for(const p of pdfs){reference(path.join(deck,'index.html'),p.source);for(const b of p.blocks)htmlRefs(path.join(deck,'index.html'),b);}
 for(const v of data.visuals)reference(path.join(deck,'index.html'),v.src);
 const story=read(path.join(deck,'story.js'));for(const m of story.matchAll(/source:'([^']+)'/g))reference(path.join(deck,'index.html'),m[1]);
});
verify('main UI actions resolve',()=>{const html=read(path.join(deck,'index.html'));for(const m of html.matchAll(/data-(?:open-doc|source)="([^"]+)"/g))assert(data.docs.some(d=>d.id===m[1]),'Document '+m[1]);for(const m of html.matchAll(/data-pdf="([^"]+)"/g))assert(pdfs.some(d=>d.id===m[1]),'Text viewer '+m[1]);for(const m of html.matchAll(/data-gallery="([^"]+)"/g))assert(data.visuals.some(d=>d.id===m[1]),'Diagram '+m[1]);});
const report={scope:'Public final artifacts: file allowlist, normalized hashes, privacy patterns, local references, JS syntax, plan/data integrity. No visual/browser/service testing or complete PII/license guarantee.',checked_at:new Date().toISOString(),files:allowed.size,checks:checks.length,passed:checks.filter(x=>x.pass).length,local_reference_targets:refs.size,external_hosts:[...new Set([...externals].map(u=>new URL(u).hostname))],errors};
const output=option('--output');if(output){const p=path.resolve(output);assert(!fs.existsSync(p),'Preserve old report; choose a new output');fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));if(errors.length)process.exitCode=1;
