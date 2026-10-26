import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import { AccessibilityProvider } from './context/AccessibilityContext';
import MyDnaPage from './pages/MyDnaPage';
import ProgressPage from './pages/ProgressPage';
import LessonPage from './pages/LessonPage';

const SUMMARY = {
  engagement: { total_events: 3, active_days: 1, last_active: '2026-10-22', lessons_viewed: 1, page_views: 2 },
  accessibility_usage: { current_settings: { font_scale: 140, high_contrast: true }, setting_changes: {}, text_to_speech_uses: 0, voice_commands_used: 0, keyboard_shortcuts_used: 0, caption_toggles: 0 },
  quiz_trend: [{ attempt: 1, date: '2026-10-22', avg_score: 60, personalised: false }],
  progress: { learning_score: 42 },
  personalisation_effect: { status: 'not_enough_data', note: 'Take more quizzes.' },
  insights: ['Take the adaptive quiz to start tracking your progress.'],
};

const LESSON = { topic: 'python', title: 'Python', reading_minutes: 1, transcript: 'Python.', sections: [{ heading: 'Overview', text: 'Intro text.' }] };

const mounted = [];
afterEach(() => { mounted.splice(0).forEach((c) => { ReactDOM.unmountComponentAtNode(c); c.remove(); }); });

beforeEach(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };   // jsdom lacks it; browsers have it
  global.fetch = jest.fn((url) => {
    let body = { ok: true };
    if (url.includes('/api/monitor/summary')) body = { ok: true, summary: SUMMARY };
    if (url.includes('/api/content/')) body = { ok: true, lesson: LESSON };
    if (url.includes('/api/accessibility/preferences')) body = { ok: true, preferences: { font_scale: 150, high_contrast: true } };
    if (url.includes('/api/notifications')) body = { notifications: [] };
    return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) });
  });
  window.speechSynthesis = undefined;
});

async function mount(element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  mounted.push(container);
  await act(async () => { ReactDOM.render(element, container); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  return container;
}

test('app shell has skip link, landmarks and accessibility button', async () => {
  const c = await mount(<App />);
  expect(c.querySelector('a.skip-link').textContent).toMatch(/skip to main/i);
  expect(c.querySelector('nav[aria-label="Main"]')).not.toBeNull();
  expect(c.querySelector('main#main-content')).not.toBeNull();
  expect(c.textContent).toMatch(/Accessibility/);
  expect(c.textContent).toMatch(/Learning DNA/);
});

test('settings are applied to the document', async () => {
  await mount(<App />);                                  // the mocked backend returns saved settings
  expect(document.documentElement.dataset.contrast).toBe('high');
  expect(document.documentElement.style.fontSize).toBe('150%');
});

test('My Learning DNA form uses fieldsets and legends', async () => {
  const c = await mount(<AccessibilityProvider><MemoryRouter><MyDnaPage /></MemoryRouter></AccessibilityProvider>);
  expect(c.querySelectorAll('fieldset legend').length).toBeGreaterThanOrEqual(5);
  expect(c.querySelectorAll('input[type="radio"]').length).toBeGreaterThanOrEqual(11);
});

test('Progress page shows chart data as a table', async () => {
  const c = await mount(<AccessibilityProvider><MemoryRouter><ProgressPage /></MemoryRouter></AccessibilityProvider>);
  expect(c.querySelector('table caption').textContent).toMatch(/Quiz attempts/);
  expect(c.textContent).toMatch(/42%/);
});

test('Lesson page renders lesson text', async () => {
  const c = await mount(
    <AccessibilityProvider><MemoryRouter initialEntries={['/lesson/python']}>
      <Routes><Route path="/lesson/:topic" element={<LessonPage />} /></Routes>
    </MemoryRouter></AccessibilityProvider>
  );
  expect(c.querySelector('h1').textContent).toBe('Python');
  expect(c.textContent).toMatch(/Intro text/);
});

test('Tutor page offers quick questions and a live conversation log', async () => {
  global.fetch = jest.fn((url) => {
    let body = { ok: true };
    if (url.includes('/api/tutor/questions')) body = { ok: true, general: [{ id: 'next', text: 'What should I learn next?' }], topics: ['python'], plan_topics: [] };
    if (url.includes('/api/accessibility/preferences')) body = { ok: true, preferences: {} };
    return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) });
  });
  const TutorPage = require('./pages/TutorPage').default;
  const c = await mount(<AccessibilityProvider><MemoryRouter><TutorPage /></MemoryRouter></AccessibilityProvider>);
  expect(c.textContent).toMatch(/What should I learn next\?/);
  expect(c.querySelector('[role="log"]')).not.toBeNull();
  expect(c.querySelector('label[for="tutor-input"]')).not.toBeNull();
  expect(c.textContent).toMatch(/not a live AI/);
});

test('My code page shows the code and a labelled form to continue with a code', async () => {
  global.fetch = jest.fn((url) => {
    let body = { ok: true };
    if (url.includes('/api/account/code')) body = { ok: true, code: 'maple-river-tiger-42' };
    if (url.includes('/api/accessibility/preferences')) body = { ok: true, preferences: {} };
    return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) });
  });
  const MyCodePage = require('./pages/MyCodePage').default;
  const c = await mount(<AccessibilityProvider><MemoryRouter><MyCodePage /></MemoryRouter></AccessibilityProvider>);
  expect(c.querySelector('[data-testid="resume-code"]').textContent).toBe('maple-river-tiger-42');
  expect(c.querySelector('label[for="code-input"]')).not.toBeNull();
  expect(Array.from(c.querySelectorAll('button')).some((b) => /log out/i.test(b.textContent))).toBe(true);
});

test('loading screen is announced and explains slow first loads', async () => {
  const LoadingScreen = require('./components/LoadingScreen').default;
  const c = await mount(<LoadingScreen label="Loading your progress" slowAfterMs={50} />);
  expect(c.querySelector('[role="status"]').textContent).toContain('Loading your progress');
  expect(c.textContent).not.toContain('waking up');
  await act(async () => { await new Promise((r) => setTimeout(r, 120)); });
  expect(c.textContent).toContain('waking up');
});
