import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../utils/api';

export const DEFAULT_PREFS = {
  font_scale: 100,
  high_contrast: false,
  reduce_motion: false,
  text_to_speech: false,
  speech_rate: 1.0,
  captions: false,
  visual_alerts: true,
  large_targets: false,
  keyboard_mode: false,
  voice_commands: false,
};

const LOCAL_KEY = 'learning_dna_a11y_v1';
const AccessibilityContext = createContext(null);

function loadLocal() {
  try {
    return { ...DEFAULT_PREFS, ...(JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function applyToDocument(prefs) {
  const root = document.documentElement;
  root.style.fontSize = `${prefs.font_scale}%`;
  root.dataset.contrast = prefs.high_contrast ? 'high' : 'normal';
  root.dataset.motion = prefs.reduce_motion ? 'reduce' : 'normal';
  root.dataset.targets = prefs.large_targets ? 'large' : 'normal';
  root.dataset.keyboard = prefs.keyboard_mode ? 'on' : 'off';
}

export function AccessibilityProvider({ children }) {
  const [prefs, setPrefs] = useState(loadLocal);
  const [speaking, setSpeaking] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [toast, setToast] = useState('');
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const saveTimer = useRef(null);

  const speechSupported = typeof window !== 'undefined' && Boolean(window.speechSynthesis);

  const logEvent = useCallback((type, topic = '', meta = {}) => {
    apiFetch('/api/monitor/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, topic, meta }),
    }).catch(() => {});
  }, []);

  // Apply settings to the page whenever they change
  useEffect(() => { applyToDocument(prefs); }, [prefs]);

  // Load the saved settings from the backend (the server copy wins once the student has saved any)
  useEffect(() => {
    apiFetch('/api/accessibility/preferences')
      .then((data) => {
        const merged = { ...DEFAULT_PREFS, ...data.preferences };
        setPrefs(merged);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
      })
      .catch(() => {});
  }, []);

  // Decorative icons should be ignored by screen readers
  useEffect(() => {
    const hideIcons = () => {
      document.querySelectorAll('svg.lucide:not([aria-hidden])').forEach((el) => {
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('focusable', 'false');
      });
    };
    hideIcons();
    const observer = new MutationObserver(hideIcons);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const savePrefs = useCallback((next) => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiFetch('/api/accessibility/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {});
    }, 400);
  }, []);

  const updatePrefs = useCallback((patch) => {
    const next = { ...prefsRef.current, ...patch };
    setPrefs(next);
    savePrefs(next);
  }, [savePrefs]);

  // Replace all settings (used after the intake form returns recommended settings)
  const replacePrefs = useCallback((serverPrefs) => {
    const next = { ...DEFAULT_PREFS, ...serverPrefs };
    setPrefs(next);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  }, []);

  const announce = useCallback((message) => {
    setAnnouncement('');
    setTimeout(() => setAnnouncement(message), 50);   // re-trigger the live region
    if (prefsRef.current.visual_alerts) {
      setToast(message);
      setTimeout(() => setToast(''), 4000);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (speechSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [speechSupported]);

  const speak = useCallback((text, topic = '') => {
    if (!speechSupported || !text) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = prefsRef.current.speech_rate;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
    logEvent('tts_used', topic);
    return true;
  }, [speechSupported, logEvent]);

  useEffect(() => () => { if (speechSupported) window.speechSynthesis.cancel(); }, [speechSupported]);

  const value = useMemo(() => ({
    prefs, updatePrefs, replacePrefs, speak, stopSpeaking, speaking, speechSupported, announce, logEvent,
  }), [prefs, updatePrefs, replacePrefs, speak, stopSpeaking, speaking, speechSupported, announce, logEvent]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      {/* Screen-reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">{announcement}</div>
      {/* Visible alert for people who cannot rely on sound */}
      {toast && (
        <div className="a11y-toast" role="presentation">{toast}</div>
      )}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used inside AccessibilityProvider');
  return ctx;
}
