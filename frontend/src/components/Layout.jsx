import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Dna, Search, Bell, Github, Accessibility, Volume2, KeyRound } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import AccessibilityPanel from './AccessibilityPanel';
import LogoutButton from './LogoutButton';

// Dashboard first, then set-up steps, then learning, then tracking.
const NAV = [
  ['/dashboard', 'Dashboard'], ['/my-dna', 'My DNA'], ['/goals', 'Goals'], ['/start', 'Start'],
  ['/quiz', 'Quiz'], ['/path', 'Path'], ['/lessons', 'Lessons'], ['/resources', 'Resources'],
  ['/tutor', 'Tutor'], ['/progress', 'Progress'],
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

export default function Layout() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef(null);
  const settingsButtonRef = useRef(null);
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
    if (firstRender.current) { firstRender.current = false; return; }
    announce(`${base} page`);
    mainRef.current?.focus({ preventScroll: false });
    logEvent('page_view', location.pathname);
  }, [location.pathname, announce, logEvent]);

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

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setTimeout(() => settingsButtonRef.current?.focus(), 0);
  }, []);

  const runSearch = async (e) => {
    e?.preventDefault?.();
    if (!search.trim()) {
      setResults([]);
      setShowSearch(true);
      return;
    }
    try {
      const data = await apiFetch(`/api/search?q=${encodeURIComponent(search)}`);
      setResults(data.results || []);
    } catch {
      setResults([]);
    }
    setShowSearch(true);
  };

  return (
    <div className="min-h-screen flex flex-col text-white">
      <a href="#main-content" className="skip-link" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/10 bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <Link to="/" className="flex items-center gap-3 font-display font-bold text-lg"><Dna className="text-teal-400" size={22} />Learning DNA</Link>
          <nav aria-label="Main" className="flex flex-wrap items-stretch gap-1 text-sm order-3 w-full">
            {NAV.map(([to, label]) => (
              <NavLink
                key={to} to={to}
                className={({ isActive }) => `flex-1 min-w-[5.5rem] text-center px-3 py-2.5 rounded-lg font-medium transition-colors ${isActive ? 'bg-teal-400/15 text-teal-300' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <form onSubmit={runSearch} role="search" className="hidden md:flex items-center gap-2">
              <label htmlFor="site-search" className="sr-only">Search resources</label>
              <input id="site-search" className="cyber-input" style={{ minWidth: 200 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources" />
              <button className="btn-cyber" type="submit" aria-label="Search"><Search size={14} /></button>
            </form>
            {speechSupported && prefs.text_to_speech && (
              <button type="button" className="btn-cyber flex items-center gap-1" onClick={speaking ? stopSpeaking : readPage}>
                <Volume2 size={14} /> {speaking ? 'Stop' : 'Listen'}
              </button>
            )}
            <button ref={settingsButtonRef} type="button" className="btn-cyber flex items-center gap-1" onClick={() => setPanelOpen(true)} aria-haspopup="dialog">
              <Accessibility size={14} /> Accessibility
            </button>
            <Link to="/my-code" className="btn-cyber flex items-center gap-1"><KeyRound size={14} aria-hidden="true" /> My code</Link>
            <LogoutButton />
            <button type="button" className="btn-cyber" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications(s => !s)}><Bell size={14} /></button>
            <a className="btn-cyber" href="https://github.com/Svn8efx/learning-dna" target="_blank" rel="noopener noreferrer" aria-label="Learning DNA source code on GitHub (opens in a new tab)"><Github size={14} aria-hidden="true" /></a>
          </div>
        </div>
        {prefs.voice_commands && lastHeard && (
          <div className="max-w-7xl mx-auto px-6 pb-2 text-xs text-slate-300" role="status">{listening ? 'Listening. ' : ''}{lastHeard}</div>
        )}
      </header>

      <AccessibilityPanel open={panelOpen} onClose={closePanel} onReadPage={readPage} voiceListening={listening} voiceError={voiceError} onVoiceRetry={retryVoice} />

      {showNotifications && (
        <div className="w-full max-w-7xl mx-auto px-6 pt-4">
          <section aria-label="Notifications" className="glass-card p-4 space-y-2">
            <h2 className="font-display font-semibold text-white text-sm">Notifications</h2>
            {notifications.length ? notifications.map((n, i) => <div key={i} className="text-slate-300 text-sm"><span className="text-teal-400 font-medium">{n.title}:</span> {n.message}</div>) : <div className="text-slate-400 text-sm">No notifications yet.</div>}
          </section>
        </div>
      )}

      {showSearch && (
        <div className="w-full max-w-7xl mx-auto px-6 pt-4">
          <section aria-label="Search results" className="glass-card p-4 space-y-3">
            <h2 className="font-display font-semibold text-white text-sm">Search Results</h2>
            {results.length ? results.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noreferrer" className="block p-3 rounded-xl bg-white/5 hover:bg-white/10 transition">
                <div className="text-teal-400 text-xs uppercase">{r.kind} · {r.topic}</div>
                <div className="text-white text-sm">{r.title} <span className="sr-only">(opens in a new tab)</span></div>
                <div className="text-slate-400 text-xs">{r.provider}</div>
              </a>
            )) : <div className="text-slate-400 text-sm">No results found.</div>}
          </section>
        </div>
      )}

      <main id="main-content" ref={mainRef} tabIndex={-1} className="outline-none flex-1"><Outlet /></main>

      <footer className="w-full max-w-7xl mx-auto px-6 py-8 text-xs text-slate-400">
        Learning DNA - a community-service project of K.R. Mangalam University.
      </footer>
    </div>
  );
}
