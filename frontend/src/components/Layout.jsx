import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Dna, Search, Bell, Github, Accessibility, Volume2, VolumeX, KeyRound, Sun, Moon, Menu, X, ChevronDown } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import AccessibilityPanel from './AccessibilityPanel';
import LogoutButton from './LogoutButton';

const REPO_URL = 'https://github.com/Svn8efx/learning-dna';

// Grouped by what the student is doing: look, set up, learn, track.
const NAV_GROUPS = [
  { label: 'Overview', items: [['/dashboard', 'Dashboard']] },
  { label: 'Set up', items: [['/my-dna', 'My DNA'], ['/goals', 'Goals'], ['/start', 'Start']] },
  { label: 'Learn', items: [['/quiz', 'Quiz'], ['/path', 'Path'], ['/lessons', 'Lessons'], ['/resources', 'Resources'], ['/tutor', 'Tutor']] },
  { label: 'Track', items: [['/progress', 'Progress']] },
];

const PAGE_TITLES = {
  '/': 'Home', '/goals': 'Goals', '/start': 'Start', '/quiz': 'Quiz', '/dashboard': 'Dashboard',
  '/path': 'Learning path', '/lessons': 'Lessons', '/resources': 'Resources', '/tutor': 'Tutor',
  '/my-dna': 'My Learning DNA', '/progress': 'Progress', '/my-code': 'My code',
};

const SHORTCUT_TARGETS = {
  h: '/', g: '/goals', s: '/start', q: '/quiz', d: '/dashboard', p: '/path',
  l: '/lessons', m: '/my-dna', o: '/progress',
};

const iconBtn = 'btn btn-ghost btn-icon relative';

export default function Layout() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [drawer, setDrawer] = useState(null);            // null | 'search' | 'notifications'
  const [menuOpen, setMenuOpen] = useState(false);       // small-screen navigation
  const [accountOpen, setAccountOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);     // accessibility settings dialog
  const [lastHeard, setLastHeard] = useState('');
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const accountRef = useRef(null);
  const notifRef = useRef(null);
  const firstRender = useRef(true);
  const { prefs, updatePrefs, speak, stopSpeaking, speaking, speechSupported, announce, logEvent } = useAccessibility();

  useEffect(() => {
    apiFetch('/api/notifications')
      .then(data => setNotifications(data.notifications || []))
      .catch(() => setNotifications([]));
  }, []);

  // On every page change: set the page title, tell screen readers, move focus to the main content
  useEffect(() => {
    const base = PAGE_TITLES[location.pathname] || (location.pathname.startsWith('/lesson/') ? 'Lesson' : 'Learning DNA');
    document.title = `${base} - Learning DNA`;
    setMenuOpen(false);
    setAccountOpen(false);
    setDrawer(null);
    if (firstRender.current) { firstRender.current = false; return; }
    announce(`${base} page`);
    mainRef.current?.focus({ preventScroll: false });
    logEvent('page_view', location.pathname);
  }, [location.pathname, announce, logEvent]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('ldna-theme', next); } catch { /* private mode: the choice just will not persist */ }
    setTheme(next);
    announce(`${next === 'dark' ? 'Dark' : 'Light'} theme`);
  };

  // Close the account menu on outside click or Escape
  useEffect(() => {
    if (!accountOpen) return undefined;
    const onDown = (e) => { if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setAccountOpen(false); accountRef.current?.querySelector('button')?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [accountOpen]);

  // Notifications float under the bell: close on a click outside (the bell buttons toggle it themselves)
  useEffect(() => {
    if (drawer !== 'notifications') return undefined;
    const onDown = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target) && !e.target.closest('[data-notif-toggle]')) setDrawer(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [drawer]);

  // Escape closes the search or notifications panel, or the small-screen menu
  useEffect(() => {
    if (!drawer && !menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setDrawer(null); setMenuOpen(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer, menuOpen]);

  const readPage = useCallback(() => {
    const text = mainRef.current?.innerText || '';
    if (!text.trim()) return;
    if (!speak(text.slice(0, 6000), location.pathname)) announce('Your browser cannot read text aloud.');
  }, [speak, announce, location.pathname]);

  const changeScale = useCallback((delta) => {
    const next = Math.max(100, Math.min(200, prefs.font_scale + delta));
    updatePrefs({ font_scale: next });
    announce(`Text size ${next} percent`);
  }, [prefs.font_scale, updatePrefs, announce]);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setTimeout(() => settingsButtonRef.current?.focus(), 0);
  }, []);

  const { listening, error: voiceError, retry: retryVoice } = useVoiceCommands(prefs.voice_commands, {
    navigate: (to) => { logEvent('voice_command', to); navigate(to); },
    goBack: () => { logEvent('voice_command', 'back'); navigate(-1); },
    goForward: () => { logEvent('voice_command', 'forward'); navigate(1); },
    normalText: () => { logEvent('voice_command', 'normal'); updatePrefs({ font_scale: 100 }); announce('Text size 100 percent'); },
    closeSettings: () => closePanel(),
    stopListening: () => { announce('Voice commands off'); updatePrefs({ voice_commands: false }); },
    readPage: () => { logEvent('voice_command', 'read'); readPage(); },
    stopReading: stopSpeaking,
    biggerText: () => { logEvent('voice_command', 'bigger'); changeScale(20); },
    smallerText: () => { logEvent('voice_command', 'smaller'); changeScale(-20); },
    contrast: (on) => { logEvent('voice_command', 'contrast'); updatePrefs({ high_contrast: on }); },
    openSettings: () => setPanelOpen(true),
  }, (phrase, matched, message) => {
    setLastHeard(message || (matched ? `Heard: "${phrase}"` : `Did not understand: "${phrase}"`));
  });

  // Keyboard shortcuts: Alt + Shift + letter
  useEffect(() => {
    if (!prefs.keyboard_mode) return undefined;
    const onKey = (e) => {
      if (!(e.altKey && e.shiftKey)) return;
      const key = e.key.toLowerCase();
      if (SHORTCUT_TARGETS[key]) { e.preventDefault(); logEvent('keyboard_shortcut', key); navigate(SHORTCUT_TARGETS[key]); }
      else if (key === 'a') { e.preventDefault(); logEvent('keyboard_shortcut', key); setPanelOpen(true); }
      else if (key === 'r') { e.preventDefault(); logEvent('keyboard_shortcut', key); speaking ? stopSpeaking() : readPage(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [prefs.keyboard_mode, navigate, readPage, speaking, stopSpeaking, logEvent]);

  const runSearch = async (e) => {
    e?.preventDefault?.();
    if (!search.trim()) { setResults([]); setSearched(false); return; }
    try {
      const data = await apiFetch(`/api/search?q=${encodeURIComponent(search)}`);
      setResults(data.results || []);
    } catch {
      setResults([]);
    }
    setSearched(true);
  };

  const navLinkClass = ({ isActive }) =>
    `-mb-px inline-flex h-11 items-center border-b-2 px-3 text-sm font-medium no-underline transition-colors ${
      isActive ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'}`;
  const mobileLinkClass = ({ isActive }) =>
    `block rounded-lg px-3 py-2.5 text-base font-medium no-underline ${isActive ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-sunken'}`;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        {/* Row 1: brand and utility actions */}
        <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-2 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="mr-2 flex min-h-[2.5rem] items-center gap-2 text-base font-semibold text-ink no-underline">
            <Dna size={22} className="text-accent" aria-hidden="true" /> Learning DNA
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <button type="button" className={iconBtn} aria-label="Search resources" aria-expanded={drawer === 'search'} onClick={() => setDrawer(drawer === 'search' ? null : 'search')}>
              <Search size={18} aria-hidden="true" />
            </button>
            {speechSupported && prefs.text_to_speech && (
              <button type="button" className="btn btn-ghost btn-sm hidden sm:inline-flex" onClick={speaking ? stopSpeaking : readPage}>
                {speaking ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />} {speaking ? 'Stop' : 'Listen'}
              </button>
            )}
            <button ref={settingsButtonRef} type="button" className="btn btn-secondary btn-sm" onClick={() => setPanelOpen(true)} aria-haspopup="dialog">
              <Accessibility size={16} aria-hidden="true" /> <span className="hidden sm:inline">Accessibility</span><span className="sr-only sm:hidden">Accessibility settings</span>
            </button>

            <div className="hidden items-center gap-1 min-[1000px]:flex">
              <button type="button" className={iconBtn} aria-label={notifications.length ? `Notifications, ${notifications.length}` : 'Notifications'} aria-expanded={drawer === 'notifications'} data-notif-toggle onClick={() => setDrawer(drawer === 'notifications' ? null : 'notifications')}>
                <Bell size={18} aria-hidden="true" />
                {notifications.length > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-ink" aria-hidden="true">{notifications.length}</span>}
              </button>
              <button type="button" className={iconBtn} onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
                {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
              </button>
              <div className="relative" ref={accountRef}>
                <button type="button" className="btn btn-ghost btn-sm" aria-expanded={accountOpen} aria-controls="account-menu" onClick={() => setAccountOpen(o => !o)}>
                  <KeyRound size={16} aria-hidden="true" /> Account <ChevronDown size={14} aria-hidden="true" />
                </button>
                {accountOpen && (
                  <div id="account-menu" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
                    <Link to="/my-code" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink no-underline hover:bg-sunken">
                      <KeyRound size={16} aria-hidden="true" /> My code
                    </Link>
                    <LogoutButton className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-sunken" />
                  </div>
                )}
              </div>
            </div>

            <button type="button" className="btn btn-secondary btn-sm min-[1000px]:hidden" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />} Menu
            </button>
          </div>
        </div>

        {/* Row 2: primary navigation (wide screens) */}
        <div className="hidden border-t border-line min-[1000px]:block">
          <nav aria-label="Main" className="mx-auto flex max-w-[90rem] items-center justify-between px-4 sm:px-6 lg:px-8">
            {NAV_GROUPS.map((group, gi) => (
              <React.Fragment key={group.label}>
                {gi > 0 && <span aria-hidden="true" className="h-5 w-px bg-line" />}
                {group.items.map(([to, label]) => <NavLink key={to} to={to} className={navLinkClass}>{label}</NavLink>)}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Small screens: grouped menu */}
        {menuOpen && (
          <div id="mobile-menu" className="max-h-[75vh] overflow-y-auto border-t border-line px-4 pb-4 pt-2 min-[1000px]:hidden">
            <nav aria-label="Main">
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="py-2">
                  <p className="eyebrow px-3 pb-1">{group.label}</p>
                  {group.items.map(([to, label]) => <NavLink key={to} to={to} className={mobileLinkClass}>{label}</NavLink>)}
                </div>
              ))}
            </nav>
            <div className="divider mt-2 pt-3">
              <p className="eyebrow px-3 pb-1">Tools</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn btn-secondary btn-sm" data-notif-toggle onClick={() => { setDrawer(drawer === 'notifications' ? null : 'notifications'); setMenuOpen(false); }}>
                  <Bell size={16} aria-hidden="true" /> Notifications{notifications.length ? ` (${notifications.length})` : ''}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />} {theme === 'dark' ? 'Light theme' : 'Dark theme'}
                </button>
                <Link to="/my-code" className="btn btn-secondary btn-sm"><KeyRound size={16} aria-hidden="true" /> My code</Link>
                <LogoutButton className="btn btn-secondary btn-sm" />
                {speechSupported && prefs.text_to_speech && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={speaking ? stopSpeaking : readPage}>
                    {speaking ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />} {speaking ? 'Stop' : 'Listen'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search and notifications open as a panel under the header */}
        {drawer === 'search' && (
          <div className="border-t border-line bg-sunken">
            <div className="mx-auto max-w-[90rem] px-4 py-4 sm:px-6 lg:px-8">
              <form onSubmit={runSearch} role="search" className="flex gap-2">
                <label htmlFor="site-search" className="sr-only">Search resources</label>
                <input id="site-search" className="input" autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search videos, courses and datasets" />
                <button className="btn btn-primary" type="submit">Search</button>
                <button className="btn btn-ghost btn-icon" type="button" onClick={() => setDrawer(null)} aria-label="Close search"><X size={18} aria-hidden="true" /></button>
              </form>
              {searched && (
                <section aria-label="Search results" className="mt-3">
                  {results.length ? (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {results.map((r, i) => (
                        <li key={i}>
                          <a href={r.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-line bg-surface p-3 no-underline hover:border-line-strong">
                            <span className="eyebrow">{r.kind} · {r.topic}</span>
                            <span className="mt-1 block text-sm font-medium text-ink">{r.title} <span className="sr-only">(opens in a new tab)</span></span>
                            <span className="block text-xs text-muted">{r.provider}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-muted">No results found.</p>}
                </section>
              )}
            </div>
          </div>
        )}

        {drawer === 'notifications' && (
          <div className="relative mx-auto max-w-[90rem]">
            <section
              ref={notifRef}
              aria-label="Notifications"
              className="absolute right-4 top-2 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-line-strong bg-surface p-3 shadow-lg sm:right-6 lg:right-8"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Notifications</h2>
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => setDrawer(null)} aria-label="Close notifications">
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              {notifications.length ? (
                <ul className="mt-1 max-h-64 divide-y divide-line overflow-y-auto">
                  {notifications.map((n, i) => (
                    <li key={i} className="py-2 text-sm first:pt-1 last:pb-0">
                      <span className="block font-medium text-ink">{n.title}</span>
                      <span className="block text-muted">{n.message}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-1 text-sm text-muted">No notifications yet.</p>}
            </section>
          </div>
        )}

        {prefs.voice_commands && lastHeard && (
          <div className="border-t border-line bg-sunken" role="status">
            <p className="mx-auto max-w-[90rem] px-4 py-1.5 text-sm text-muted sm:px-6 lg:px-8">{listening ? 'Listening. ' : ''}{lastHeard}</p>
          </div>
        )}
      </header>

      <AccessibilityPanel open={panelOpen} onClose={closePanel} onReadPage={readPage} voiceListening={listening} voiceError={voiceError} onVoiceRetry={retryVoice} />

      <main id="main-content" ref={mainRef} tabIndex={-1} className="flex-1 outline-none"><Outlet /></main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6 lg:px-8">
          <p>Learning DNA is a community-service project of K.R. Mangalam University.</p>
          <p className="flex items-center gap-4">
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted underline hover:text-ink">
              <Github size={14} aria-hidden="true" /> Source code <span className="sr-only">(opens in a new tab)</span>
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
