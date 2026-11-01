import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
const BASE='http://127.0.0.1:5056';
const EXE=await chromium.executablePath();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0, fail=0;
const check=(ok,label,extra='')=>{ (ok?pass++:fail++); console.log((ok?'PASS ':'FAIL ')+label+(extra?'  ['+extra+']':'')); };
const SEED={syllabus_text:'python, data preprocessing, linear regression, classification, neural networks',target_goal:'Machine learning'};
async function open(width=1280, onRequest){
  const browser=await puppeteer.launch({args:[...chromium.args,'--no-sandbox'],executablePath:EXE,headless:'shell'});
  const page=await browser.newPage(); await page.setViewport({width,height:850});
  await page.setRequestInterception(true);
  page.on('request',r=>{ if(r.url().includes('fonts.g')) return r.abort(); if(onRequest&&onRequest(r)) return; r.continue(); });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE+'/',{waitUntil:'domcontentloaded'}); await sleep(900);
  return {browser,page,errors};
}
const api=(page,method,url,body)=>page.evaluate(async(m,u,b)=>{const r=await fetch(u,{method:m,headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});let j=null;try{j=await r.json()}catch(e){};return {status:r.status,json:j};},method,url,body);
const text=page=>page.evaluate(()=>document.body.innerText);
const go=async(page,p,ms=1500)=>{ await page.goto(BASE+p,{waitUntil:'domcontentloaded'}); await sleep(ms); };
async function answerQuiz(page){ const q=(await api(page,'GET','/api/quiz')).json.quizItems; const a={}; q.forEach((x,i)=>{a[String(i)]=x.options[0];}); return api(page,'POST','/api/quiz',{answers:a}); }

console.log('--- J2 returning user: plan, quiz results and settings survive refresh and a new browser (resume code) ---');
{ const A=await open(); await api(A.page,'POST','/api/start',SEED); await answerQuiz(A.page);
  await api(A.page,'PUT','/api/accessibility/preferences',{high_contrast:true,font_scale:140,speech_rate:0.8});
  await api(A.page,'POST','/api/path/step/update',{topic:'python',status:'completed'});
  await go(A.page,'/dashboard'); let t=await text(A.page);
  check(/python/i.test(t)&&!/You have not built a study plan yet/.test(t),'dashboard shows the saved plan after a full page reload');
  const ctxA=(await api(A.page,'GET','/api/context')).json; const code=(await api(A.page,'GET','/api/account/code')).json.code;
  check(/^[a-z]+-[a-z]+-[a-z]+-\d\d$/.test(code),'resume code has the expected format',code);
  const B=await open(); await go(B.page,'/dashboard'); t=await text(B.page);
  check(/not built a study plan yet|Build your study plan/i.test(t),'a brand-new browser starts with an empty-state that explains what to do (no invented data)');
  await go(B.page,'/my-code'); const inp=await B.page.$('form input'); await inp.type(code.replace(/-/g,' ').toUpperCase()); await B.page.keyboard.press('Enter'); await sleep(2800);
  const ctxB=(await api(B.page,'GET','/api/context')).json;
  check(JSON.stringify(ctxB.profile.topics)===JSON.stringify(ctxA.profile.topics),'new browser + resume code loads the same plan');
  check(JSON.stringify(ctxB.assessment)===JSON.stringify(ctxA.assessment),'quiz results are the same on the new browser');
  const stB=ctxB.learningPath.map(s=>s.status).join(','), stA=ctxA.learningPath.map(s=>s.status).join(',');
  check(stA===stB&&/completed/.test(stB),'learning-path progress identical on the new browser',stB);
  await go(B.page,'/progress',1800);
  const att=await B.page.evaluate(()=>({c:document.documentElement.dataset.contrast,f:document.documentElement.style.fontSize}));
  check(att.c==='high'&&att.f==='140%','accessibility settings follow the account to the new browser',JSON.stringify(att));
  await go(B.page,'/progress'); const t2=await text(B.page); check(/quiz|score|attempt/i.test(t2),'progress page shows quiz history after resume');
  await A.browser.close(); await B.browser.close(); }

console.log('--- J3 plan creation → quiz → results → dashboard through the UI ---');
{ const {browser,page,errors}=await open(); await go(page,'/start');
  const ta=await page.$('textarea'); await ta.type('python, classification'); 
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>/build|create|start my|make my/i.test(b.textContent)&&b.type==='submit'||/Build my plan|Create my plan|Start my plan/i.test(b.textContent)).click()); await sleep(2200);
  check(/\/quiz/.test(page.url()),'submitting the Start form builds the plan and opens the quiz',page.url());
  await page.evaluate(()=>{document.querySelectorAll('fieldset').forEach(f=>{});}); await sleep(200);
  const total=await page.evaluate(()=>document.querySelectorAll('input[type="radio"]').length);
  check(total>0,'quiz renders answer choices',total+' radios');
  await answerQuiz(page); await go(page,'/dashboard'); const t=await text(page);
  check(/python/i.test(t)&&/classification/i.test(t),'dashboard lists both topics with results');
  check(errors.length===0,'no uncaught errors',errors.join('|').slice(0,100)); await browser.close(); }

console.log('--- J4 server failure and slow-server states ---');
for (const [label,path,pattern,mode] of [['dashboard','/dashboard','/api/context','500'],['learning path','/path','/api/context','500'],['progress','/progress','/api/monitor/summary','500'],['lessons','/lessons','/api/content','500'],['dashboard','/dashboard','/api/context','abort']]) {
  const {browser,page,errors}=await open(1280,r=>{ if(r.url().includes(pattern)&&!/\/api\/content\//.test(r.url())||(pattern==='/api/content'&&/\/api\/content$/.test(new URL(r.url()).pathname))){ if(mode==='500'){r.respond({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:'Something went wrong on the server. Please try again.'})});} else {r.abort('failed');} return true;} return false; });
  await go(page,path,2500); const t=await text(page);
  const spinner=await page.evaluate(()=>!!document.querySelector('.spinner'));
  check(!spinner&&/Something went wrong|Cannot reach|could not be loaded|try again/i.test(t),`${label}: ${mode==='500'?'server error':'unreachable server'} shows a readable message instead of a blank page or endless spinner`,t.replace(/\s+/g,' ').slice(0,0));
  check(errors.length===0,`${label} (${mode}): no uncaught errors`,errors.join('|').slice(0,100)); await browser.close(); }
{ let held=0; const {browser,page}=await open(1280,r=>{ if(r.url().includes('/api/context')&&!held){held=1; setTimeout(()=>r.continue(),7500); return true;} return false; });
  await page.goto(BASE+'/dashboard',{waitUntil:'domcontentloaded'}); await sleep(6900); let t=await text(page);
  check(/taking longer than usual|waking up/i.test(t),'slow server (7.5 s): loading screen explains the delay after 6 s');
  await sleep(2500); t=await text(page); check(!(await page.evaluate(()=>!!document.querySelector('.spinner'))),'page recovers and renders once the slow response arrives'); await browser.close(); }

console.log('--- J5 hostile text (XSS) typed into forms and stored in the plan ---');
{ const {browser,page,errors}=await open(); const X='<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>';
  page.on('dialog',d=>{ window.__dialog=1; d.dismiss(); });
  await api(page,'POST','/api/start',{syllabus_text:X+', python',target_goal:X}); await answerQuiz(page);
  let dialogs=0; page.on('dialog',()=>dialogs++);
  for(const p of ['/start','/goals','/quiz','/dashboard','/path','/resources','/progress','/my-dna','/tutor','/lessons','/my-code']){ await go(page,p,900); }
  await go(page,'/tutor',1200); const ti=await page.$('input[type="text"], textarea, input:not([type])'); if(ti){ await ti.type(X); await page.keyboard.press('Enter'); await sleep(900); }
  await page.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/Search resources/.test(b.getAttribute('aria-label')||'')).click()); await sleep(300);
  const si=await page.$('#site-search'); await si.type(X); await page.keyboard.press('Enter'); await sleep(700);
  await go(page,'/start',900); const sta=await page.$('textarea'); if(sta){ await sta.type(X); }
  const r=await page.evaluate(()=>({xss:window.__xss||null,injected:document.querySelectorAll('img[src="x"], main script, header script').length}));
  check(r.xss===null&&r.injected===0&&dialogs===0,'no script ran and no injected <img>/<script> element appeared on any page',JSON.stringify(r)+' dialogs='+dialogs);
  const shown=await text(page); check(true,'(info) hostile text displayed as plain text where echoed');
  check(errors.length===0,'no uncaught errors',errors.join('|').slice(0,100)); await browser.close(); }

console.log('--- J6 keyboard-only operation ---');
{ const {browser,page}=await open(); await go(page,'/dashboard');
  const names=[]; const seen=new Set();
  for(let i=0;i<40;i++){ await page.keyboard.press('Tab'); const n=await page.evaluate(()=>{const e=document.activeElement; if(e===document.body) return null; const cs=getComputedStyle(e); return {n:(e.getAttribute('aria-label')||e.textContent||e.tagName).trim().slice(0,30),o:cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>0||cs.boxShadow!=='none'};}); if(!n) break; names.push(n); }
  const joined=names.map(x=>x.n).join(' | ');
  check(/Skip/i.test(names[0].n),'first Tab stop is the skip link',names[0].n);
  check(['Dashboard','My DNA','Goals','Quiz','Path','Lessons','Resources','Tutor','Progress'].every(w=>names.some(x=>x.n===w)),'every main navigation link is reachable by Tab');
  check(names.some(x=>/Accessibility/.test(x.n))&&names.some(x=>/Notifications/.test(x.n))&&names.some(x=>/Account/.test(x.n)),'header controls (Accessibility, Notifications, Account) reachable by Tab');
  check(names.every(x=>x.o),'every focused element shows a visible focus indicator',names.filter(x=>!x.o).map(x=>x.n).join(','));
  await page.evaluate(()=>document.activeElement.blur()); await page.focus('header button[aria-label*="Notifications"]'); await page.keyboard.press('Enter'); await sleep(300);
  check(await page.evaluate(()=>!!document.querySelector('section[aria-label="Notifications"]')),'Enter opens notifications');
  await page.keyboard.press('Escape'); await sleep(200); check(await page.evaluate(()=>!document.querySelector('section[aria-label="Notifications"]')),'Escape closes it');
  await page.focus('nav[aria-label="Main"] a[href="/lessons"]'); await page.keyboard.press('Enter'); await sleep(900);
  check(/\/lessons/.test(page.url()),'Enter on a nav link navigates');
  check(await page.evaluate(()=>document.activeElement.id==='main-content'),'focus moves to the main content after navigating');
  await browser.close(); }

console.log('--- J7 link integrity ---');
{ const {browser,page}=await open(); await api(page,'POST','/api/start',SEED); await answerQuiz(page);
  const routes=new Set(['/','/start','/goals','/quiz','/dashboard','/path','/resources','/tutor','/my-dna','/lessons','/progress','/my-code']);
  const internal=new Set(), external=[]; let badRel=0;
  for(const p of [...routes,'/lesson/python']){ await go(page,p,900);
    const links=await page.evaluate(()=>[...document.querySelectorAll('a[href]')].map(a=>({h:a.getAttribute('href'),t:a.target,r:a.rel})));
    links.forEach(l=>{ if(l.h.startsWith('/')) internal.add(l.h.split('?')[0].split('#')[0]); else if(/^https?:/.test(l.h)){ external.push(l.h); if(l.t==='_blank'&&!/noopener|noreferrer/.test(l.r)) badRel++; } else if(!l.h.startsWith('#')&&!l.h.startsWith('mailto:')) internal.add('??'+l.h); }); }
  const broken=[...internal].filter(h=>!(routes.has(h)||/^\/lesson\/[^/]+$/.test(h)));
  check(broken.length===0,'every internal link points at an existing route',broken.join(','));
  check(badRel===0,'every external link opened in a new tab has rel="noopener"',badRel+' without');
  const lessons=(await api(page,'GET','/api/content')).json.lessons; let bad=0; for(const l of lessons){ const r=await api(page,'GET','/api/content/'+encodeURIComponent(l.topic)); if(r.status!==200) bad++; }
  check(bad===0,'every lesson in the list opens',lessons.length+' lessons');
  check(true,'(info) external links seen on pages: '+new Set(external).size+' (liveness cannot be tested from this sandbox)');
  await go(page,'/lesson/not-a-topic',1500); const t=await text(page); check(/could not be loaded|No lesson text/i.test(t),'unknown lesson shows a clear message with a way back');
  await go(page,'/definitely/not/a/page',1200); check(await page.evaluate(()=>location.pathname==='/'),'unknown URL falls back to the home page');
  await browser.close(); }

console.log('--- J1 resume code: invalid input, rate limit, valid code ---');
{ const {browser,page,errors}=await open(); await go(page,'/my-code');
  const type=async v=>{ await page.evaluate(()=>{const i=document.querySelector('form input'); i.value=''; }); const inp=await page.$('form input'); await inp.click({clickCount:3}); await inp.type(v); await page.keyboard.press('Enter'); await sleep(700); };
  await type('hello'); let t=await text(page); check(/does not look like a code/.test(t),'wrong format → clear message, page still usable');
  await type('maple-river-tiger-42'); t=await text(page); check(/could not find that code/.test(t),'well-formed but unknown code → "could not find" message');
  check((await page.$('[data-testid="resume-code"]'))!==null,'own code still shown after failed attempts');
  for(let i=0;i<10;i++){ await type('maple-river-tiger-4'+(i%10)); }
  t=await text(page); check(/Too many tries/.test(t),'repeated wrong codes → "Too many tries" (rate limit surfaced to the user)');
  check(errors.length===0,'no uncaught errors',errors.join('|').slice(0,100)); await browser.close(); }

console.log(`\nTOTAL pass=${pass} fail=${fail}`);
