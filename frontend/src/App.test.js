import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import { AccessibilityProvider } from './context/AccessibilityContext';
import MyDnaPage from './pages/MyDnaPage';
import ProgressPage from './pages/ProgressPage';
import LessonPage from './pages/LessonPage';
import DashboardPage from './pages/DashboardPage';
import LearningPathPage from './pages/LearningPathPage';
import Layout from './components/Layout';

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
  expect(c.querySelector('table caption').textContent).toMatch(/same numbers as a table/i);
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


// ---- Redesign: honest states, structure and navigation --------------------------------------

const withContext = (ctx) => {
  const base = global.fetch;
  global.fetch = jest.fn((url, opts) => {
    if (url.includes('/api/context')) {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ ok: true, ...ctx })) });
    }
    return base(url, opts);
  });
};

const PLAN = {
  profile: { topics: ['python', 'classification', 'neural networks'], target_goal: 'Learn ML', activity: { quiz_attempts: 1 } },
  learningPath: [
    { topic: 'python', order: 1, status: 'completed', level: 'beginner', prerequisites: [] },
    { topic: 'classification', order: 2, status: 'recommended', level: 'beginner', prerequisites: ['python'] },
    { topic: 'neural networks', order: 3, status: 'locked', level: 'beginner', prerequisites: ['python', 'classification'] },
  ],
};

test('dashboard without a plan sends the learner to build one and shows no invented numbers', async () => {
  sessionStorage.clear();
  withContext({ profile: {}, assessment: [], learningPath: [], resources: [] });
  const c = await mount(<AccessibilityProvider><MemoryRouter><DashboardPage /></MemoryRouter></AccessibilityProvider>);
  expect(c.textContent).toMatch(/Build your study plan/);
  expect(c.textContent).not.toMatch(/\+12%|Keep Practicing|Great job/);
  expect(c.textContent).toMatch(/What you will see here/);
  expect(c.textContent).not.toMatch(/Quiz attempts|Average quiz score|Topics completed/);
});

test('dashboard with results shows a real table with a text result for every topic', async () => {
  sessionStorage.clear();
  withContext({ ...PLAN, assessment: [{ topic: 'python', score_pct: 90, correct: 9, total: 10 }, { topic: 'classification', score_pct: 30, correct: 3, total: 10 }], avgScore: 60 });
  const c = await mount(<AccessibilityProvider><MemoryRouter><DashboardPage /></MemoryRouter></AccessibilityProvider>);
  const rows = c.querySelectorAll('tbody tr');
  expect(rows.length).toBeGreaterThanOrEqual(2);
  expect(c.textContent).toMatch(/Strong/);
  expect(c.textContent).toMatch(/Needs review/);
  expect(c.textContent).toMatch(/Topics completed/);
});

test('learning path is an ordered list with status text and real prerequisites', async () => {
  sessionStorage.clear();
  withContext({ ...PLAN, assessment: [] });
  const c = await mount(<AccessibilityProvider><MemoryRouter><LearningPathPage /></MemoryRouter></AccessibilityProvider>);
  const items = c.querySelectorAll('ol.timeline > li');
  expect(items.length).toBe(3);
  expect(c.textContent).toMatch(/Completed/);
  expect(c.textContent).toMatch(/Locked/);
  expect(c.textContent).toMatch(/Needs: python, classification/);
});

test('layout groups the navigation, keeps every route, and the theme toggle works', async () => {
  const c = await mount(
    <AccessibilityProvider><MemoryRouter initialEntries={['/dashboard']}>
      <Routes><Route element={<Layout />}><Route path="dashboard" element={<p>x</p>} /></Route></Routes>
    </MemoryRouter></AccessibilityProvider>
  );
  const hrefs = Array.from(c.querySelectorAll('nav[aria-label="Main"] a')).map((a) => a.getAttribute('href'));
  ['/dashboard', '/my-dna', '/goals', '/start', '/quiz', '/path', '/lessons', '/resources', '/tutor', '/progress'].forEach((h) => expect(hrefs).toContain(h));
  expect(c.querySelector('nav a[aria-current="page"]').getAttribute('href')).toBe('/dashboard');
  document.documentElement.dataset.theme = 'light';
  const toggle = Array.from(c.querySelectorAll('button')).find((b) => /dark theme/i.test(b.getAttribute('aria-label') || ''));
  await act(async () => { toggle.click(); });
  expect(document.documentElement.dataset.theme).toBe('dark');
  document.documentElement.dataset.theme = 'light';
});
