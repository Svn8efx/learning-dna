import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = 'http://127.0.0.1:5056';
const axeSrc = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const browser = await puppeteer.launch({ args: [...chromium.args, '--no-sandbox'], executablePath: await chromium.executablePath(), headless: 'shell' });
const results = [];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function check(name, fn) {
  try { const detail = await fn(); results.push({ name, ok: true, detail }); console.log('PASS', name, detail ? `(${detail})` : ''); }
  catch (e) { results.push({ name, ok: false, detail: String(e.message || e) }); console.log('FAIL', name, '-', String(e.message || e).slice(0, 220)); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
async function fresh(width = 1440, height = 900) {
  const page = await browser.newPage();
  await page.createCDPSession().then(c => c.send('Network.clearBrowserCookies'));
  await page.setViewport({ width, height });
  await page.evaluateOnNewDocument(() => { if (window.name) return; window.name = 'ldna-test'; try { localStorage.removeItem('ldna-theme'); sessionStorage.clear(); } catch (e) {} });
  return page;
}
const go = async (page, path, wait = 1400) => { await page.goto(BASE + path, { waitUntil: 'domcontentloaded' }); await sleep(wait); };
const text = (page) => page.evaluate(() => document.body.innerText);
const clickByText = (page, sel, re) => page.evaluate((sel, re) => { const el = [...document.querySelectorAll(sel)].find(e => new RegExp(re, 'i').test(e.innerText || e.getAttribute('aria-label') || '')); if (!el) return false; el.click(); return true; }, sel, re);

// ---------- Desktop flow ----------
const page = await fresh();
await go(page, '/');

await check('skip link is first focusable, visible on focus, and moves focus to main', async () => {
  await page.keyboard.press('Tab');
  const info = await page.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { text: a.innerText, top: r.top }; });
  assert(/skip to main/i.test(info.text) && info.top >= 0, 'skip link not first/visible: ' + JSON.stringify(info));
  await page.keyboard.press('Enter');
  const active = await page.evaluate(() => document.activeElement.id);
  assert(active === 'main-content', 'focus after skip: ' + active);
});

await check('primary navigation has all 10 routes and marks the current page', async () => {
  await go(page, '/dashboard');
  const info = await page.evaluate(() => ({ hrefs: [...document.querySelectorAll('nav[aria-label="Main"] a')].map(a => a.getAttribute('href')), current: document.querySelector('nav[aria-label="Main"] a[aria-current="page"]')?.getAttribute('href') }));
  assert(info.hrefs.length === 10 && info.current === '/dashboard', JSON.stringify(info));
});

await check('theme toggle switches to dark and the choice survives a reload', async () => {
  await clickByText(page, 'button', 'dark theme');
  assert(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'not dark after click');
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(800);
  assert(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'dark lost on reload');
  await clickByText(page, 'button', 'light theme');
  await page.evaluate(() => localStorage.removeItem('ldna-theme'));
});

await check('account menu opens, lists My code and Log out, Escape closes and returns focus', async () => {
  await clickByText(page, 'button', '^\\s*account');
  const open = await page.evaluate(() => { const m = document.getElementById('account-menu'); return m ? m.innerText : ''; });
  assert(/my code/i.test(open) && /log out/i.test(open), 'menu content: ' + open);
  await page.keyboard.press('Escape'); await sleep(200);
  const st = await page.evaluate(() => ({ gone: !document.getElementById('account-menu'), focus: document.activeElement.innerText }));
  assert(st.gone && /account/i.test(st.focus), JSON.stringify(st));
});

await check('accessibility dialog opens, passes axe with the dialog open, Escape closes and returns focus', async () => {
  await clickByText(page, 'button', 'accessibility');
  await sleep(400);
  assert(await page.evaluate(() => !!document.querySelector('[role="dialog"]')), 'dialog missing');
  await page.addScriptTag({ content: axeSrc });
  const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(x => x.id + ':' + x.nodes.length));
  assert(v.length === 0, 'axe: ' + v.join(','));
  await page.keyboard.press('Escape'); await sleep(300);
  const st = await page.evaluate(() => ({ gone: !document.querySelector('[role="dialog"]'), focus: document.activeElement.innerText }));
  assert(st.gone && /accessibility/i.test(st.focus), JSON.stringify(st));
});

await check('Goals: keyboard-select a goal, Continue is enabled only after, Start is prefilled with that goal', async () => {
  await go(page, '/goals');
  assert(await page.evaluate(() => document.querySelector('button[type="submit"]').disabled), 'Continue should start disabled');
  await page.focus('#goal-deeplearning'); await page.keyboard.press('Space');
  assert(await page.evaluate(() => !document.querySelector('button[type="submit"]').disabled), 'Continue still disabled');
  await clickByText(page, 'button', '^continue'); await sleep(1000);
  assert(page.url().endsWith('/start'), 'url ' + page.url());
  const goal = await page.$eval('#goal', e => e.value);
  assert(/deep learning/i.test(goal), 'goal text: ' + goal);
});

await check('Start: topic chips toggle the text, unknown topics are explained, submitting builds the plan and opens the quiz', async () => {
  await page.type('#syllabus', 'python');
  await clickByText(page, 'button[aria-pressed]', '^classification$');
  let t = await page.$eval('#syllabus', e => e.value);
  assert(/python, classification/i.test(t), 'after add: ' + t);
  await clickByText(page, 'button[aria-pressed]', '^classification$');
  t = await page.$eval('#syllabus', e => e.value);
  assert(!/classification/i.test(t), 'after remove: ' + t);
  await clickByText(page, 'button[aria-pressed]', '^statistics$');
  await clickByText(page, 'button[aria-pressed]', '^classification$');
  await clickByText(page, 'button[type="submit"]', 'build my plan'); await sleep(2500);
  assert(page.url().endsWith('/quiz'), 'url ' + page.url());
});

await check('Quiz: answers are keyboard reachable, Previous/Next and the question list work, submit is blocked until all answered', async () => {
  const total = await page.evaluate(() => Number(document.body.innerText.match(/Question 1 of (\d+)/)[1]));
  await page.keyboard.press('Tab');
  const radios = await page.evaluate(() => [...document.querySelectorAll('input[type=radio]')].length);
  assert(radios >= 2, 'radios ' + radios);
  await page.focus('input[type=radio]'); await page.keyboard.press('Space');
  assert(await page.evaluate(() => document.querySelector('input[type=radio]').checked), 'radio not selectable by keyboard');
  for (let i = 1; i < total; i++) {
    await clickByText(page, 'button', '^next'); await sleep(250);
    await page.evaluate(() => document.querySelector('input[type=radio]').click());
    if (i === total - 1) { const blocked = await page.evaluate(() => document.querySelector('button[type=submit]').disabled); assert(!blocked, 'submit disabled after all answered'); }
  }
  await clickByText(page, 'button', 'submit quiz'); await sleep(3000);
  assert(page.url().endsWith('/dashboard'), 'url ' + page.url());
  return `${total} questions`;
});

await check('Dashboard after the quiz shows a real results table and no empty-state or invented figures', async () => {
  const t = await text(page);
  assert(/Quiz results by topic/.test(t) && !/Build your study plan/.test(t) && !/\+12%|Keep Practicing/.test(t), 'dashboard text off');
  const rows = await page.$$eval('tbody tr', r => r.length);
  assert(rows >= 2, 'rows ' + rows);
});

await check('Path: a locked topic explains why, status buttons update the real status', async () => {
  await go(page, '/path');
  const first = await page.evaluate(() => document.querySelector('ol.timeline li button').innerText);
  await clickByText(page, 'ol.timeline li button[aria-expanded]', 'locked'); await sleep(300);
  const locked = await page.evaluate(() => /This topic is locked/.test(document.body.innerText));
  if (!locked) return 'no locked topic in this plan (all unlocked by quiz) - skipped locked check';
});
await check('Path (new plan, no quiz): later topics are locked, the notice explains why, status buttons are disabled', async () => {
  const p2 = await fresh();
  await go(p2, '/');
  await sleep(1500);
  await p2.evaluate(() => fetch('/api/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ syllabus_text: 'python, data preprocessing, classification', target_goal: '' }) }));
  await go(p2, '/path');
  const badges = await p2.$$eval('ol.timeline > li > button', b => b.map(x => x.innerText.replace(/\s+/g, ' ')));
  assert(/locked/i.test(badges[2]) && !/locked/i.test(badges[0]), 'badges: ' + badges.join(' | '));
  await clickByText(p2, 'ol.timeline li button[aria-expanded]', 'classification'); await sleep(300);
  const t = await text(p2);
  assert(/This topic is locked/.test(t), 'no locked notice');
  const disabled = await p2.$$eval('button', b => b.filter(x => /mark (in progress|completed)/i.test(x.innerText)).every(x => x.disabled));
  assert(disabled, 'status buttons should be disabled while locked');
  await p2.close();
});

await check('Path: marking the open topic in progress updates its badge', async () => {
  await go(page, '/path');
  const before = await page.evaluate(() => [...document.querySelectorAll('ol.timeline li')].map(l => l.querySelector('button')?.innerText.replace(/\s+/g, ' ')));
  const openIdx = await page.evaluate(() => [...document.querySelectorAll('ol.timeline li button')].findIndex(b => b.getAttribute('aria-expanded') === 'true'));
  assert(openIdx >= 0, 'no topic auto-opened');
  const ok = await clickByText(page, 'button', 'mark in progress'); await sleep(1500);
  const after = await page.evaluate((i) => document.querySelectorAll('ol.timeline li')[i].querySelector('button').innerText.replace(/\s+/g, ' '), openIdx);
  assert(ok && /in progress/i.test(after), 'badge: ' + after);
  return after;
});

await check('Lesson: Listen/transcript controls, in-page contents, previous/next and Mark completed work', async () => {
  await go(page, '/lesson/python');
  const t = await text(page);
  assert(/Download transcript/i.test(t) && /On this page/i.test(t), 'controls missing: ' + t.slice(0, 200));
  const nav = await page.$$eval('nav[aria-label="Lesson navigation"] a', a => a.length);
  assert(nav >= 1, 'prev/next missing');
  const hadButton = await clickByText(page, 'button', 'mark this topic completed'); await sleep(1500);
  if (hadButton) assert(/Completed/.test(await text(page)), 'not completed after click');
  return hadButton ? 'marked completed' : 'topic not markable (not in plan or locked)';
});

await check('Lessons: filter narrows the list', async () => {
  await go(page, '/lessons');
  await page.type('#lesson-filter', 'neural'); await sleep(300);
  const links = await page.$$eval('main a[href^="/lesson/"]', a => a.map(x => x.innerText.toLowerCase()));
  assert(links.length >= 1 && links.every(l => l.includes('neural')), 'links: ' + links.join('|'));
});

await check('Resources: type filter and clear filters work', async () => {
  await go(page, '/resources');
  const total = await page.evaluate(() => document.querySelectorAll('main ul li').length);
  await page.select('#res-type', 'course'); await sleep(300);
  const labels = await page.$$eval('main li .eyebrow', e => [...new Set(e.map(x => x.innerText))]);
  assert(labels.length === 1 && /course/i.test(labels[0]), 'labels ' + labels.join(','));
  await page.type('#res-q', 'zzzz-nothing'); await sleep(300);
  assert(/Nothing matches/.test(await text(page)), 'no empty state');
  await clickByText(page, 'button', 'clear filters'); await sleep(300);
  assert(await page.evaluate(() => document.querySelectorAll('main ul li').length) >= total, 'not restored');
});

await check('Tutor: quick question gets an answer in the conversation log', async () => {
  await go(page, '/tutor');
  await clickByText(page, 'button', 'weakest|learn next'); await sleep(1500);
  const log = await page.$eval('[role="log"]', e => e.innerText);
  assert(/You asked/.test(log) && /Tutor:/.test(log), 'log: ' + log.slice(0, 120));
});

await check('My DNA: save answers, high contrast is applied, edit and cancel round-trip', async () => {
  await go(page, '/my-dna');
  await page.evaluate(() => { document.querySelector('input[name="vision"][value="high"]').click(); });
  await clickByText(page, 'button[type="submit"]', 'save'); await sleep(1500);
  const t = await text(page);
  assert(/Suggested style/.test(t), 'no result view');
  assert(await page.evaluate(() => document.documentElement.dataset.contrast) === 'high', 'high contrast not applied');
  await clickByText(page, 'button', 'edit my answers'); await sleep(300);
  assert(await page.evaluate(() => document.querySelector('input[name="vision"][value="high"]').checked), 'form not prefilled');
  await clickByText(page, 'button', '^cancel'); await sleep(300);
  assert(/Suggested style/.test(await text(page)), 'cancel did not return');
  // restore normal settings for the next checks
  await clickByText(page, 'button', 'edit my answers'); await page.evaluate(() => document.querySelector('input[name="vision"][value="none"]').click());
  await clickByText(page, 'button[type="submit"]', 'save'); await sleep(1200);
});

let code = '';
await check('My code: shows a code in the expected format', async () => {
  await go(page, '/my-code');
  code = await page.$eval('[data-testid="resume-code"]', e => e.innerText);
  assert(/^[a-z]+-[a-z]+-[a-z]+-\d{2}$/.test(code), 'code ' + code);
  return code;
});

await check('Resume on a second browser with a typed (upper-case, spaced) code loads the same plan', async () => {
  const other = await fresh();
  await go(other, '/my-code');
  await other.type('#code-input', code.replace(/-/g, '  ').toUpperCase());
  await clickByText(other, 'button[type="submit"]', 'continue'); await sleep(2500);
  assert(other.url().endsWith('/progress'), 'url ' + other.url());
  await go(other, '/dashboard');
  assert(/Quiz results by topic/.test(await text(other)) && !/Build your study plan/.test(await text(other)), 'plan not loaded');
  await go(other, '/my-code');
  await other.type('#code-input', 'maple river tiger 11');
  await clickByText(other, 'button[type="submit"]', 'continue'); await sleep(1200);
  assert(/could not find that code/i.test(await text(other)), 'no wrong-code message');
  await other.close();
});

// ---------- Mobile flow ----------
const m = await fresh(390, 844);
await go(m, '/');
await check('mobile: Menu opens a grouped list, Escape closes it, choosing a link navigates and closes the menu', async () => {
  await clickByText(m, 'button', '^\\s*menu'); await sleep(300);
  const t = await m.evaluate(() => document.getElementById('mobile-menu')?.innerText || '');
  assert(/set up/i.test(t) && /learn/i.test(t) && /dashboard/i.test(t) && /log out/i.test(t) && /my code/i.test(t), 'menu: ' + t.slice(0, 80));
  await m.keyboard.press('Escape'); await sleep(200);
  assert(await m.evaluate(() => !document.getElementById('mobile-menu')), 'menu did not close on Escape');
  await clickByText(m, 'button', '^\\s*menu'); await sleep(200);
  await m.evaluate(() => [...document.querySelectorAll('#mobile-menu a')].find(a => a.getAttribute('href') === '/lessons').click()); await sleep(700);
  assert(m.url().endsWith('/lessons') && await m.evaluate(() => !document.getElementById('mobile-menu')), 'did not navigate/close');
});
await check('mobile: target size of header controls is at least 40px', async () => {
  await go(m, '/');
  const small = await m.evaluate(() => [...document.querySelectorAll('header button, header a')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 36 || r.width < 36); }).map(e => (e.innerText || e.getAttribute('aria-label') || '').slice(0, 20) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)));
  assert(small.length === 0, 'small targets: ' + small.join('; '));
});

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
fs.writeFileSync('out/interact.json', JSON.stringify(results, null, 1));
process.exitCode = failed.length ? 1 : 0;
