import { useEffect, useRef, useState } from 'react';

const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export const voiceSupported = Boolean(SpeechRecognition);

export const PAGE_WORDS = {
  home: '/', goals: '/goals', start: '/start', quiz: '/quiz', dashboard: '/dashboard',
  path: '/path', resources: '/resources', tutor: '/tutor', lessons: '/lessons',
  profile: '/my-dna', 'my dna': '/my-dna', progress: '/progress',
};

/**
 * Listens for short spoken commands (Chrome and Edge only).
 * handlers: { navigate(path), readPage(), stopReading(), biggerText(), smallerText(), contrast(on), openSettings() }
 */
export function useVoiceCommands(enabled, handlers, onHeard) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const heardRef = useRef(onHeard);
  heardRef.current = onHeard;

  useEffect(() => {
    if (!enabled || !SpeechRecognition) return undefined;
    setError('');
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
    let stopped = false;

    recognition.onresult = (event) => {
      const phrase = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      const h = handlersRef.current;
      let matched = true;
      const pageMatch = phrase.match(/^(?:go to|open|show)\s+(?:the\s+)?(.+)$/);
      if (pageMatch && PAGE_WORDS[pageMatch[1]] !== undefined) h.navigate(PAGE_WORDS[pageMatch[1]]);
      else if (/^read (this )?page|^read aloud|^read this/.test(phrase)) h.readPage();
      else if (/^stop( reading)?$/.test(phrase)) h.stopReading();
      else if (/(bigger|larger|increase) text/.test(phrase)) h.biggerText();
      else if (/(smaller|decrease) text/.test(phrase)) h.smallerText();
      else if (/high contrast on|turn on high contrast/.test(phrase)) h.contrast(true);
      else if (/high contrast off|turn off high contrast/.test(phrase)) h.contrast(false);
      else if (/accessibility|settings/.test(phrase)) h.openSettings();
      else matched = false;
      heardRef.current?.(phrase, matched);
    };
    recognition.onstart = () => { setListening(true); setError(''); };
    recognition.onend = () => {
      setListening(false);
      if (!stopped) { try { recognition.start(); } catch { /* already started */ } }
    };
    recognition.onerror = (event) => {
      const code = event && event.error ? event.error : 'unknown';
      // 'no-speech' and 'aborted' are normal; everything else means listening cannot work.
      if (code === 'no-speech' || code === 'aborted') return;
      setError(code);
      if (['not-allowed', 'service-not-allowed', 'network', 'audio-capture', 'language-not-supported'].includes(code)) {
        stopped = true; // do not keep retrying forever
      }
    };
    try { recognition.start(); } catch { /* ignore */ }

    return () => { stopped = true; recognition.abort(); setListening(false); };
  }, [enabled]);

  return { listening, supported: voiceSupported, error };
}
