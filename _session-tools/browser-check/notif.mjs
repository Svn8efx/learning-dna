import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const EXE=await chromium.executablePath(); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const axeSrc=fs.readFileSync('node_modules/axe-core/axe.min.js','utf8');
let pass=0, fail=0; const check=(ok,l,x='')=>{(ok?pass++:fail++);console.log((ok?'PASS ':'FAIL ')+l+(x?'  ['+x+']':''));};
const browser=await puppeteer.launch({args:[...chromium.args,'--no-sandbox'],executablePath:EXE,headless:'shell'}); const page=await browser.newPage(); await page.setViewport({width:1280,height:520});
await page.setRequestInterception(true); page.on('request',r=>r.url().includes('fonts.g')?r.abort():r.continue());
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5056/',{waitUntil:'domcontentloaded'});
await page.evaluate(async()=>{await fetch('/api/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({syllabus_text:'python, classification, neural networks'})});
  const q=(await (await fetch('/api/quiz')).json()).quizItems; const a={}; q.forEach((x,i)=>{a[String(i)]=x.options[0];}); await fetch('/api/quiz',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers:a})});});
await page.goto('http://127.0.0.1:5056/dashboard',{waitUntil:'domcontentloaded'}); await sleep(1800);
const badge=()=>page.evaluate(()=>{const b=document.querySelector('button[data-notif-toggle][aria-expanded]'); const s=[...b.querySelectorAll('span')].find(x=>x.getAttribute('aria-hidden')==='true'); return s?s.textContent:'';});
const n0=await badge(); check(/^\d+$/.test(n0)&&+n0>=1,'bell shows how many new notifications there are',n0);
await page.evaluate(()=>document.querySelector('button[data-notif-toggle][aria-expanded]').click()); await sleep(500);
check((await badge())==='','opening the panel clears the number on the bell');
const info=await page.evaluate(()=>{const p=document.querySelector('section[aria-label="Notifications"]'); return {items:p.querySelectorAll('li').length,links:[...p.querySelectorAll('li a')].map(a=>a.getAttribute('href')),dels:p.querySelectorAll('button[aria-label^="Delete notification"]').length,text:p.innerText.replace(/\s+/g,' ')};});
check(info.items>=2&&info.links.length===info.items&&info.dels===info.items,'every notification is a link and has a delete button',JSON.stringify(info.links));
check(/unread/.test(info.text)&&/Mark all read/.test(info.text),'panel shows the unread count and Mark all read');
await page.screenshot({path:'notif-open.png'});
await page.addScriptTag({content:axeSrc});
const v=await page.evaluate(async()=>{const r=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return r.violations.map(x=>x.id+'x'+x.nodes.length);});
check(v.length===0,'axe: no violations with the panel open',v.join(','));
// mark all read
await page.evaluate(()=>[...document.querySelectorAll('section[aria-label="Notifications"] button')].find(b=>/Mark all read/.test(b.textContent)).click()); await sleep(300);
check(await page.evaluate(()=>![...document.querySelectorAll('section[aria-label="Notifications"] button')].find(b=>/Mark all read/.test(b.textContent)).disabled===false),'Mark all read is disabled once nothing is unread');
// delete the first
const before=info.items;
await page.evaluate(()=>document.querySelector('section[aria-label="Notifications"] button[aria-label^="Delete notification"]').click()); await sleep(300);
const after=await page.evaluate(()=>document.querySelectorAll('section[aria-label="Notifications"] li').length);
check(after===before-1,'delete removes one notification',before+' -> '+after);
check(await page.evaluate(()=>document.activeElement===document.querySelector('section[aria-label="Notifications"]')),'focus stays inside the panel after deleting');
// reload keeps the choice
await page.reload({waitUntil:'domcontentloaded'}); await sleep(1800);
await page.evaluate(()=>document.querySelector('button[data-notif-toggle][aria-expanded]').click()); await sleep(400);
check(await page.evaluate(n=>document.querySelectorAll('section[aria-label="Notifications"] li').length===n,after),'the deleted notification stays deleted after a reload');
// click one navigates
const href=await page.evaluate(()=>document.querySelector('section[aria-label="Notifications"] li a').getAttribute('href'));
await page.evaluate(()=>document.querySelector('section[aria-label="Notifications"] li a').click()); await sleep(900);
check(new URL(page.url()).pathname===href&&await page.evaluate(()=>!document.querySelector('section[aria-label="Notifications"]')),'clicking a notification opens its page and closes the panel',href);
// a new plan produces a new notification without reloading
await page.evaluate(async()=>{await fetch('/api/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({syllabus_text:'python, data preprocessing'})});});
await page.evaluate(()=>[...document.querySelectorAll('nav a')].find(a=>/Goals/.test(a.textContent)).click()); await sleep(1200);
const n1=await badge(); check(/^\d+$/.test(n1),'a new plan shows up on the bell after changing page, without reloading',n1);
check(errors.length===0,'no uncaught errors',errors.join('|').slice(0,100));
console.log(`TOTAL pass=${pass} fail=${fail}`); await browser.close();
