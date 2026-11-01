import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const BASE = 'http://127.0.0.1:5056';
const [,, widthsArg, mode = 'seeded', theme = 'light', pagesArg = 'all', tag = ''] = process.argv;
const widths = widthsArg.split(',').map(Number);
const ROUTES = {
  home: '/', dashboard: '/dashboard', goals: '/goals', start: '/start', quiz: '/quiz', path: '/path', lessons: '/lessons',
  lesson: '/lesson/python', resources: '/resources', tutor: '/tutor', mydna: '/my-dna', progress: '/progress', mycode: '/my-code',
};
const wanted = pagesArg === 'all' ? Object.keys(ROUTES) : pagesArg.split(',');
const axeSrc = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const exe = await chromium.executablePath();
const browser = await puppeteer.launch({ args: [...chromium.args, '--no-sandbox'], executablePath: exe, headless: 'shell' });
const report = [];

async function seed(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(async (vision) => {
    const j = (u, o) => fetch(u, o).then(r => r.json());
    const post = (u, b) => j(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    const start = await post('/api/start', { syllabus_text: 'python, data preprocessing, linear regression, classification, neural networks, clustering', target_goal: 'ML for placement prep at top tech companies' });
    const answer = (items, pick) => Object.fromEntries(items.map((q, i) => [`${q.topic}_${q.index}`, q.options[pick(i)]]));
    await post('/api/quiz', { answers: answer(start.quizItems, (i) => i % 3 === 0 ? 0 : 1) });
    const again = await j('/api/quiz?refresh=1');
    await post('/api/quiz', { answers: answer(again.quizItems, (i) => i % 2 === 0 ? 0 : 1) });
    const ctx = await j('/api/context');
    const rec = (ctx.learningPath || []).find(s => s.status === 'recommended');
    if (rec) await post('/api/path/step/update', { topic: rec.topic, status: 'in-progress' });
    await post('/api/profile/intake', { vision, hearing: 'none', motor: 'none', prefers_audio: false, prefers_captions: false, prefers_visuals: true, pace: 'normal' });
    await j('/api/account/code');
    await post('/api/tutor', { question_id: 'explain:python' });
  }, process.env.VISION || 'none');
}

for (const w of widths) {
  const h = w >= 1024 ? 900 : 1000;
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();
  await cdp.send('Network.clearBrowserCookies');
  await page.setViewport({ width: w, height: h });
  await page.evaluateOnNewDocument((t) => { try { localStorage.setItem('ldna-theme', t); } catch (e) {} }, theme);
  const logs = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_NAME_NOT_RESOLVED')) logs.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + String(e).slice(0, 200)));
  page.on('requestfailed', r => { if (!r.url().includes('fonts.g')) logs.push('REQFAILED ' + r.url().slice(0, 100)); });
  page.on('response', r => { if (r.status() >= 400 && !r.url().includes('fonts.g') && !r.url().includes('/api/')) logs.push(`HTTP ${r.status()} ${r.url().slice(0, 100)}`); });
  if (mode === 'hc') { await page.evaluateOnNewDocument(() => { try { localStorage.setItem('learning_dna_a11y_v1', JSON.stringify({ high_contrast: true, font_scale: 150, large_targets: true, reduce_motion: true })); } catch (e) {} }); }
  if (mode === 'seeded' || mode === 'hc') await seed(page);
  const dir = `out/${tag || mode}-${theme}-${w}`;
  fs.mkdirSync(dir, { recursive: true });
  for (const name of wanted) {
    logs.length = 0;
    await page.goto(BASE + ROUTES[name], { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));
    const overflow = await page.evaluate(() => {
      const de = document.documentElement; const vw = de.clientWidth; const bad = [];
      document.querySelectorAll('body *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.right > vw + 1 && !el.parentElement?.closest('[style*="overflow"], .overflow-x-auto, pre')) bad.push((el.tagName + '.' + (el.className || '').toString().slice(0, 40)) + ' right=' + Math.round(r.right)); });
      const all=[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>vw+1).map(el=>el.tagName+'.'+(el.className&&el.className.baseVal!==undefined?el.className.baseVal:(el.className||'')).toString().slice(0,50)+' r='+Math.round(el.getBoundingClientRect().right)).slice(0,6); bad.push(...all.map(a=>'ANY '+a)); const ov=[...document.querySelectorAll('body, body *')].filter(el=>{const cs=getComputedStyle(el);return el.scrollWidth>el.clientWidth+1 && cs.overflowX==='visible' && el.clientWidth>0}).map(el=>el.tagName+'.'+(typeof el.className==='string'?el.className:'').slice(0,40)+' sw='+el.scrollWidth+' cw='+el.clientWidth).slice(0,6); bad.push(...ov.map(a=>'OVF '+a)); bad.push('docSW='+de.scrollWidth);
      return { scrollWidth: de.scrollWidth, clientWidth: vw, horizontalScroll: de.scrollWidth > vw + 1, offenders: bad.slice(0, 14) };
    });
    await page.addScriptTag({ content: axeSrc });
    const axe = await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      return r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: (v.nodes[0]?.target || []).join(' ').slice(0, 90), msg: (v.nodes[0]?.failureSummary || '').split('\n')[1]?.slice(0, 140) }));
    });
    await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
    report.push({ mode, theme, width: w, page: name, horizontalScroll: overflow.horizontalScroll, offenders: overflow.offenders, axe, logs: [...logs] });
  }
  await page.close();
}
await browser.close();
const outFile = `out/report-${tag || mode}-${theme}-${widthsArg.replace(/,/g, '_')}.json`;
fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
for (const r of report) {
  const bad = r.axe.length || r.horizontalScroll || r.logs.length;
  console.log(`${bad ? 'XX' : 'ok'} ${String(r.width).padStart(4)} ${r.page.padEnd(10)} hscroll=${r.horizontalScroll} axe=${r.axe.map(a => a.id + '×' + a.nodes).join(',') || '-'} logs=${r.logs.length}`);
}
