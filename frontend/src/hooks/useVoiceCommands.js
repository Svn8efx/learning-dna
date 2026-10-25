import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export const voiceSupported = Boolean(SpeechRecognition);

export const PAGE_WORDS = {
  home: '/', goals: '/goals', goal: '/goals', start: '/start', quiz: '/quiz',
  dashboard: '/dashboard', 'dash board': '/dashboard',
  path: '/path', 'learning path': '/path',
  resources: '/resources', resource: '/resources',
  tutor: '/tutor', 'guided tutor': '/tutor',
  lessons: '/lessons', lesson: '/lessons',
  profile: '/my-dna', 'my profile': '/my-dna', 'my dna': '/my-dna', 'my d n a': '/my-dna',
  progress: '/progress',
};

/** Lower-case, drop punctuation (Edge adds full stops) and squash spaces. */
export function normalizePhrase(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NAV = /^(?:please )?(?:go to|goto|open|show me|show|take me to|navigate to|visit)\s+(?:the )?(.+?)(?: page| section| screen)?$/;

/**
 * Turns what the browser heard into an action, or null if it is not a command.
 * Returns { action, to?, on? }.
 */
export function parseVoiceCommand(raw) {
  const phrase = normalizePhrase(raw);
  if (!phrase) return null;
  const nav = phrase.match(NAV);
  if (nav && PAGE_WORDS[nav[1]] !== undefined) return { action: 'navigate', to: PAGE_WORDS[nav[1]] };
  if (/^(?:please )?read (?:the |this )?page|^read aloud|^read this/.test(phrase)) return { action: 'readPage' };
  if (/^stop(?: reading)?$/.test(phrase)) return { action: 'stopReading' };
  if (/(?:bigger|larger|increase) text/.test(phrase)) return { action: 'biggerText' };
  if (/(?:smaller|decrease) text/.test(phrase)) return { action: 'smallerText' };
  if (/high contrast on|turn on high contrast/.test(phrase)) return { action: 'contrast', on: true };
  if (/high contrast off|turn off high contrast/.test(phrase)) return { action: 'contrast', on: false };
  if (/accessibility|settings/.test(phrase)) return { action: 'openSettings' };
  return null;
}

const FATAL_ERRORS = ['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'];
const MAX_NETWORK_FAILURES = 3;

/**
 * Listens for short spoken commands (needs a browser with the Web Speech service: Chrome or Edge).
 * handlers: { navigate(path), readPage(), stopReading(), biggerText(), smallerText(), contrast(on), openSettings() }
 * Returns { listening, supported, error, retry }.
 */
export function useVoiceCommands(enabled, handlers, onHeard) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const heardRef = useRef(onHeard);
  heardRef.current = onHeard;

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    if (!enabled || !SpeechRecognition) return undefined;
    setError('');
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
    let stopped = false;
    let failures = 0;
    let timer = null;

    recognition.onresult = (event) => {
      failures = 0;
      const heard = event.results[event.results.length - 1][0].transcript.trim();
      const command = parseVoiceCommand(heard);
      const h = handlersRef.current;
      if (command) {
        if (command.action === 'navigate') h.navigate(command.to);
        else if (command.action === 'contrast') h.contrast(command.on);
        else h[command.action]();
      }
      heardRef.current?.(heard.toLowerCase(), Boolean(command));
    };
    recognition.onstart = () => setListening(true);
    recognition.onerror = (event) => {
      const code = event && event.error ? event.error : 'unknown';
      if (code === 'no-speech' || code === 'aborted') return; // normal
      if (FATAL_ERRORS.includes(code)) { stopped = true; setError(code); return; }
      if (code === 'network') {
        failures += 1; // may be a short connection drop: retry quietly a few times first
        if (failures >= MAX_NETWORK_FAILURES) { stopped = true; setError('network'); }
        return;
      }
      failures += 1;
      if (failures >= MAX_NETWORK_FAILURES) { stopped = true; setError(code); }
    };
    recognition.onend = () => {
      setListening(false);
      if (stopped) return;
      const delay = failures ? Math.min(1000 * failures, 4000) : 250;
      timer = setTimeout(() => {
        if (stopped) return;
        try { recognition.start(); } catch { /* already started */ }
      }, delay);
    };
    try { recognition.start(); } catch { /* ignore */ }

    return () => {
      stopped = true;
      clearTimeout(timer);
      recognition.abort();
      setListening(false);
    };
  }, [enabled, attempt]);

  return { listening, supported: voiceSupported, error, retry };
}
