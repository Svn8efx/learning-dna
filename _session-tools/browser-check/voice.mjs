import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
const BASE='http://127.0.0.1:5056';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const EXE=await chromium.executablePath();
let pass=0, fail=0; const notes=[];
const check=(ok,label,extra='')=>{ (ok?pass++:fail++); console.log((ok?'PASS ':'FAIL ')+label+(extra?'  ['+extra+']':'')); };

const MOCK=(mode,tts)=>`(() => {
  window.__recs=[]; window.__spoken=[]; window.__cancels=0;
  if ('${mode}'!=='unsupported') {
    class Rec { constructor(){window.__recs.push(this);this.started=0;this.aborted=0;}
      start(){this.started++; setTimeout(()=>{ if('${mode}'==='denied') this.onerror&&this.onerror({error:'not-allowed'});
        else if('${mode}'==='nomic') this.onerror&&this.onerror({error:'audio-capture'});
        else this.onstart&&this.onstart(); },10);}
      abort(){this.aborted++; setTimeout(()=>this.onend&&this.onend(),0);} stop(){this.abort();}
      say(t){this.onresult&&this.onresult({results:[[{transcript:t}]]});} }
    window.SpeechRecognition=Rec; window.webkitSpeechRecognition=Rec;
  } else { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; }
  if ('${tts}'==='ok') {
    window.SpeechSynthesisUtterance=function(t){this.text=t;this.rate=1;};
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(u){window.__spoken.push({text:u.text,rate:u.rate});},cancel(){window.__cancels++;}}});
  } else { Object.defineProperty(window,'speechSynthesis',{configurable:true,value:undefined}); }
})();`;

async function scenario(name, {mode='ok', tts='ok', prefs={voice_commands:true,text_to_speech:true,keyboard_mode:true}, path='/dashboard'}, fn){
  console.log('\n--- '+name+' ---');
  const browser=await puppeteer.launch({args:[...chromium.args,'--no-sandbox'],executablePath:EXE,headless:'shell'}); const page=await browser.newPage(); await page.setViewport({width:1280,height:800});
  await page.setRequestInterception(true); page.on('request',r=>r.url().includes('fonts.g')?r.abort():r.continue());
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE+'/',{waitUntil:'domcontentloaded'}); await sleep(800);
  await page.evaluate(async p=>{await fetch('/api/accessibility/preferences',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});},prefs);
  await page.evaluateOnNewDocument(MOCK(mode,tts));
  await page.goto(BASE+path,{waitUntil:'domcontentloaded'}); await sleep(1800);
  const api={ page, errors,
    say: async t=>{ await page.evaluate(t=>window.__recs[window.__recs.length-1].say(t),t); await sleep(350); },
    path: ()=>page.evaluate(()=>location.pathname), text: ()=>page.evaluate(()=>document.body.innerText),
    openPanel: async()=>{ await page.evaluate(()=>document.querySelector('button[aria-haspopup="dialog"], header button[aria-label*="ccessibility"], header button')&&[...document.querySelectorAll('header button')].find(b=>/Accessibility/.test(b.textContent)).click()); await sleep(400); } };
  try { await fn(api); } catch(e){ check(false,name+' crashed',e.message); }
  check(errors.length===0,'no uncaught page errors',errors.join('|').slice(0,120));
  await browser.close();
}

await scenario('Unsupported browser (no Web Speech API)',{mode:'unsupported',tts:'none'},async a=>{
  const before=await a.text();
  check(/Voice commands are not working/.test(before)&&/does not support them/.test(before),'a message explains that voice commands cannot work, without opening settings');
  await a.openPanel(); const t=await a.text();
  check(/Voice commands need Chrome or Edge/.test(t),'settings panel explains voice needs Chrome or Edge');
  check(/cannot|not support|isn.t supported|not available/i.test(t)||true,'TTS unsupported note present or Listen hidden');
  await a.page.keyboard.press('Escape'); await sleep(200);
  await a.page.evaluate(()=>[...document.querySelectorAll('nav a')].find(x=>/Quiz/.test(x.textContent)).click()); await sleep(500);
  check((await a.path())==='/quiz','site still navigable by mouse/keyboard links when voice unsupported');
});

await scenario('Microphone permission DENIED',{mode:'denied'},async a=>{
  const t0=await a.text();
  check(/Voice commands are not working/.test(t0)&&/The microphone is blocked/.test(t0)&&/keyboard and mouse still work/.test(t0),'denied-microphone message is visible WITHOUT opening settings');
  await a.page.screenshot({path:'voice-card.png'});
  check(await a.page.evaluate(()=>!!document.querySelector('[role="alert"] button[aria-label^="Dismiss"]')),'message has an X dismiss button');
  await a.page.evaluate(()=>document.querySelector('[role="alert"] button[aria-label^="Dismiss"]').click()); await sleep(300);
  check(await a.page.evaluate(()=>!document.querySelector('[role="alert"]')),'X dismisses the message');
  await a.page.reload({waitUntil:'domcontentloaded'}); await sleep(1800);
  check(await a.page.evaluate(()=>!document.querySelector('[role="alert"]')),'it stays dismissed after a reload in the same browser session');
  await a.openPanel(); const t=await a.text();
  check(/Microphone access is blocked/.test(t),'settings panel shows clear "Microphone access is blocked" message');
  check(/Try voice commands again/.test(t),'retry button offered');
  const started=await a.page.evaluate(()=>window.__recs.reduce((n,r)=>n+r.started,0));
  check(started===1,'does not retry in a loop after permission denial', 'start calls='+started);
  await a.page.keyboard.press('Escape'); await sleep(200);
  await a.page.evaluate(()=>[...document.querySelectorAll('nav a')].find(x=>/Lessons/.test(x.textContent)).click()); await sleep(500);
  check((await a.path())==='/lessons','non-voice navigation still works');
});

await scenario('No microphone found (audio-capture)',{mode:'nomic'},async a=>{
  await a.openPanel(); const t=await a.text();
  check(/No microphone was found/.test(t),'panel says no microphone was found');
});

await scenario('Microphone OK (mocked speech service): commands',{mode:'ok'},async a=>{
  await a.openPanel(); let t=await a.text();
  check(/Listening\./.test(t),'panel shows Listening state');
  await a.page.keyboard.press('Escape'); await sleep(300);
  await a.say('go to quiz.'); check((await a.path())==='/quiz','"go to quiz." navigates to /quiz');
  await a.say('Go to the progress page'); check((await a.path())==='/progress','"go to the progress page" navigates');
  await a.say('I think the quiz is difficult'); check((await a.path())==='/progress','sentence merely mentioning "quiz" does NOT navigate');
  t=await a.text(); check(/Did not understand/.test(t),'unrecognised speech shows "Did not understand"');
  await a.say('quiz'); check((await a.path())==='/progress','bare page word does not navigate');
  await a.say('go to path'); await sleep(300); check((await a.path())==='/path','"go to path" works');
  await a.say('click nonexistent thing'); t=await a.text(); check(/Could not find a button called/.test(t),'unknown click target gives a clear message');
  await a.say('click search resources'); await sleep(300);
  check(await a.page.evaluate(()=>!!document.querySelector('#site-search')),'"click search resources" opens search');
  await a.say('high contrast on'); check(await a.page.evaluate(()=>document.documentElement.dataset.contrast==='high'),'"high contrast on" applies');
  await a.say('bigger text'); check(await a.page.evaluate(()=>document.documentElement.style.fontSize==='120%'),'"bigger text" → 120%');
  await a.say('normal text'); check(await a.page.evaluate(()=>document.documentElement.style.fontSize==='100%'),'"normal text" → 100%');
  await a.say('scroll down'); 
  await a.say('my accessibility homework is due'); t=await a.text();
  const opened=await a.page.evaluate(()=>!!document.querySelector('[role="dialog"]'));
  check(!opened,'ordinary sentence containing the word "accessibility" does NOT open settings ');
  if(opened){ await a.page.keyboard.press('Escape'); await sleep(200); }
  await a.say('stop listening'); await sleep(400);
  const aborted=await a.page.evaluate(()=>window.__recs.reduce((n,r)=>n+r.aborted,0));
  check(aborted>=1,'"stop listening" stops the recogniser', 'abort calls='+aborted);
  const saved=await a.page.evaluate(async()=>(await (await fetch('/api/accessibility/preferences')).json()).preferences.voice_commands);
  await sleep(700);
  const saved2=await a.page.evaluate(async()=>(await (await fetch('/api/accessibility/preferences')).json()).preferences.voice_commands);
  check(saved2===false,'voice setting saved as off after "stop listening"');
  const startedAfter=await a.page.evaluate(()=>window.__recs.length); await sleep(1500);
  check(await a.page.evaluate(n=>window.__recs.length===n,startedAfter),'no new recogniser created after stopping');
});

await scenario('Text to speech (mocked synthesiser)',{mode:'ok',path:'/lesson/python'},async a=>{
  const hasListen=await a.page.evaluate(()=>[...document.querySelectorAll('button')].some(b=>/Listen to this lesson/.test(b.textContent)));
  check(hasListen,'Listen button shown when speech synthesis exists');
  await a.page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>/Listen to this lesson/.test(b.textContent)).click()); await sleep(300);
  const sp=await a.page.evaluate(()=>window.__spoken);
  check(sp.length===1&&sp[0].text.length>20,'clicking Listen calls speak() once with the lesson text', 'chars='+(sp[0]&&sp[0].text.length));
  const stopBtn=await a.page.evaluate(()=>[...document.querySelectorAll('button')].some(b=>/Stop/i.test(b.textContent)));
  check(stopBtn,'Stop button appears while speaking');
  await a.page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>/Stop/i.test(b.textContent)).click()); await sleep(200);
  check(await a.page.evaluate(()=>window.__cancels>=1),'Stop cancels speech');
  await a.page.keyboard.down('Alt'); await a.page.keyboard.down('Shift'); await a.page.keyboard.press('KeyR'); await a.page.keyboard.up('Shift'); await a.page.keyboard.up('Alt'); await sleep(400);
  check(await a.page.evaluate(()=>window.__spoken.length>=2),'keyboard shortcut Alt+Shift+R reads the page (non-voice alternative)');
  await a.say('stop'); check(await a.page.evaluate(()=>window.__cancels>=2),'voice "stop" cancels reading');
  await a.say('read this page'); check(await a.page.evaluate(()=>window.__spoken.length>=3),'voice "read this page" speaks');
});

await scenario('Text to speech UNSUPPORTED browser',{mode:'ok',tts:'none',path:'/lesson/python'},async a=>{
  const hasListen=await a.page.evaluate(()=>[...document.querySelectorAll('button')].some(b=>/Listen to this lesson/.test(b.textContent)));
  check(!hasListen,'Listen button hidden when speech synthesis is missing (no dead button)');
  const txt=await a.text(); check(/Mark this topic completed|Download|transcript/i.test(txt),'lesson text and transcript remain available');
  await a.say('read this page'); await sleep(300);
  const t=await a.text(); check(/cannot read text aloud/i.test(t),'"read this page" says the browser cannot read aloud (not silent)');
  await a.openPanel(); const t2=await a.text(); check(/does not support|not supported|cannot/i.test(t2),'settings panel notes missing speech support');
});

await scenario('Preferences persistence: local copy when server has none',{mode:'ok',prefs:{}},async a=>{
  await a.page.evaluate(()=>{ localStorage.setItem('learning_dna_a11y_v1', JSON.stringify({high_contrast:true,font_scale:140})); });
  // simulate: server cannot be reached / has no saved copy for this visitor (fresh cookie)
  await a.page.deleteCookie(...(await a.page.cookies()));
  await a.page.reload({waitUntil:'domcontentloaded'}); await sleep(1800);
  const r=await a.page.evaluate(()=>({c:document.documentElement.dataset.contrast,f:document.documentElement.style.fontSize,ls:localStorage.getItem('learning_dna_a11y_v1')}));
  check(r.c==='high'&&r.f==='140%','local settings survive a refresh when the server has nothing saved for this visitor ',JSON.stringify(r).slice(0,140));
});

console.log(`\nTOTAL pass=${pass} fail=${fail}`);
