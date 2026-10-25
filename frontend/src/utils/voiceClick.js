import { normalizePhrase } from './speechText';

const CLICKABLE = [
  'a[href]', 'button', '[role="button"]', '[role="link"]', '[role="tab"]', '[role="radio"]',
  'summary', 'input[type="submit"]', 'input[type="button"]', 'input[type="radio"]', 'input[type="checkbox"]',
].join(',');

function isUsable(el) {
  if (el.disabled || el.getAttribute('aria-disabled') === 'true' || el.getAttribute('aria-hidden') === 'true') return false;
  if (el.closest('[hidden], [aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

/** The words a screen-reader user would hear for this control. */
export function accessibleName(el) {
  const aria = el.getAttribute('aria-label');
  if (aria) return aria;
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy.split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || '').join(' ').trim();
    if (text) return text;
  }
  if (el.labels && el.labels.length) return Array.from(el.labels).map((l) => l.textContent).join(' ');
  if (el.tagName === 'INPUT' && (el.type === 'submit' || el.type === 'button')) return el.value || '';
  return el.textContent || el.getAttribute('title') || '';
}

function score(want, name) {
  if (!name) return 0;
  if (name === want) return 100;
  if (name.includes(want)) return 80 - Math.min(30, (name.length - want.length) * 0.5);
  if (want.length >= 4 && want.includes(name) && name.length >= 3) return 60;
  const a = want.split(' ');
  const b = name.split(' ');
  const shared = a.filter((w) => b.includes(w)).length;
  const ratio = shared / Math.max(a.length, b.length);
  return ratio >= 0.6 ? 50 + ratio * 10 : 0;
}

/** Finds the best visible button, link, tab or choice whose name matches what was said. */
export function findClickable(label, root = document) {
  const want = normalizePhrase(label);
  if (!want) return null;
  let best = null;
  let bestScore = 0;
  root.querySelectorAll(CLICKABLE).forEach((el) => {
    if (!isUsable(el)) return;
    const name = normalizePhrase(accessibleName(el));
    const s = score(want, name);
    if (s > bestScore) { best = el; bestScore = s; }
  });
  return bestScore >= 50 ? best : null;
}

/** Clicks the matching control. Returns its name, or '' if nothing matched. */
export function clickByVoice(label) {
  const el = findClickable(label);
  if (!el) return '';
  const name = accessibleName(el).replace(/\s+/g, ' ').trim();
  if (el.scrollIntoView) el.scrollIntoView({ block: 'center' });
  el.click();
  return name || label;
}
