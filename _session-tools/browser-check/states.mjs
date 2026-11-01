import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE='http://127.0.0.1:5056';
const axeSrc=fs.readFileSync('node_modules/axe-core/axe.min.js','utf8');
const browser=await puppeteer.launch({args:[...chromium.args,'--no-sandbox'],executablePath:await chromium.executablePath(),headless:'shell'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function scan(page,label){
  await page.addScriptTag({content:axeSrc}).catch(()=>{});
  const v=await page.evaluate(async()=>{const r=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return r.violations.map(x=>x.id+'x'+x.nodes.length+' '+(x.nodes[0]?.target||[]).join(' ').slice(0,80));});
  const hs=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
  console.log((v.length||hs?'XX':'ok'),label,'hscroll='+hs,v.join(' | ')||'-');
}
const click=(page,fn)=>page.evaluate(fn);
for (const theme of ['light','dark']) for (const w of [1280,1000,390]) {
  const page=await browser.newPage(); await page.setViewport({width:w,height:800});
  await page.evaluateOnNewDocument(t=>{try{localStorage.setItem('ldna-theme',t)}catch(e){}},theme);
  await page.setRequestInterception(true);
  page.on('request',r=>{const u=r.url(); if(u.includes('/api/notifications')) return r.respond({status:200,contentType:'application/json',body:JSON.stringify({notifications:[{title:'Plan ready',message:'3 syllabus topics were mapped into your study plan.'},{title:'Quiz saved',message:'Your last quiz score was added to Progress.'}]})}); if(u.includes('fonts.g')) return r.abort(); r.continue();});
  await page.goto(BASE+'/dashboard',{waitUntil:'domcontentloaded'}); await sleep(1800);
  const tag=`${theme} ${w}`;
  const wide=w>=1000;
  if(!wide){ await click(page,()=>[...document.querySelectorAll('header button')].find(b=>/menu/i.test(b.textContent)).click()); await sleep(300); await scan(page,tag+' mobile-menu'); }
  // notifications
  await click(page,()=>[...document.querySelectorAll('button[data-notif-toggle]')].find(b=>b.offsetParent!==null).click()); await sleep(400);
  await scan(page,tag+' notifications-open');
  await page.keyboard.press('Escape'); await sleep(200);
  const closed=await page.evaluate(()=>!document.querySelector('section[aria-label="Notifications"]'));
  console.log(closed?'ok':'XX',tag,'Escape closes notifications');
  if(wide){
    await click(page,()=>[...document.querySelectorAll('header button')].find(b=>/Account/.test(b.textContent)).click()); await sleep(300); await scan(page,tag+' account-menu-open');
    await page.keyboard.press('Escape'); await sleep(200);
  }
  // search
  await click(page,()=>document.querySelector('button[aria-label="Search resources"]').click()); await sleep(400); await scan(page,tag+' search-open');
  await page.close();
}
await browser.close();
