import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
const EXE=await chromium.executablePath(); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ROUTES=['/','/start','/goals','/quiz','/dashboard','/path','/resources','/tutor','/my-dna','/lessons','/lesson/python','/progress','/my-code'];
for (const [W,F] of [[320,100],[320,150],[320,200]]) {
  const browser=await puppeteer.launch({args:[...chromium.args,'--no-sandbox'],executablePath:EXE,headless:'shell'}); const page=await browser.newPage();
  await page.setRequestInterception(true); page.on('request',r=>r.url().includes('fonts.g')?r.abort():r.continue());
  await page.setViewport({width:W,height:800});
  await page.goto('http://127.0.0.1:5056/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>fetch('/api/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({syllabus_text:'python, data preprocessing, linear regression, classification, neural networks'})}));
  await page.evaluate(f=>localStorage.setItem('learning_dna_a11y_v1',JSON.stringify({font_scale:f})),F);
  const bad=[];
  for (const p of ROUTES) { await page.goto('http://127.0.0.1:5056'+p,{waitUntil:'domcontentloaded'}); await sleep(1100);
    const r=await page.evaluate(()=>{const vw=innerWidth; let worst=null; document.querySelectorAll('main *').forEach(e=>{const b=e.getBoundingClientRect(); if(b.right>vw+1&&b.width>0&&(!worst||b.right>worst.right)) worst={t:e.tagName,c:String(e.className).slice(0,40),txt:(e.textContent||'').trim().slice(0,30),right:Math.round(b.right)};}); return {sw:document.documentElement.scrollWidth,vw,worst};});
    if(r.sw>r.vw) bad.push(p+' sw='+r.sw+' '+JSON.stringify(r.worst)); }
  console.log(`${W}px @ ${F}% text:`, bad.length? 'OVERFLOW on '+bad.join(' ;; ') : 'no horizontal scroll on '+ROUTES.length+' pages');
  await browser.close();
}
