import { useCallback, useEffect, useRef, useState } from 'react';
import { clickByVoice } from '../utils/voiceClick';
import { normalizePhrase } from '../utils/speechText';

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

export const HELP_TEXT = 'You can say: go to quiz, scroll down, scroll up, scroll to top, click and then a button name, go back, read this page, stop, bigger text, smaller text, normal text, high contrast on, high contrast off, open settings, close settings, or stop listening.';

export { normalizePhrase };

// Words that are not part of a page name. The speech service often mishears "go to" as "do", "go 2", "to".
const LEADING = new Set(['please', 'go', 'goto', 'to', 'too', 'two', '2', 'do', 'open', 'show', 'me', 'take', 'navigate', 'visit', 'the', 'a', 'click', 'on', 'press', 'tap']);
const TRAILING = new Set(['page', 'section', 'screen', 'button', 'link', 'tab']);

/** Returns the route for a spoken page name, or undefined. Needs at least one "go to"-style word before it. */
export function pageForPhrase(raw) {
  const words = normalizePhrase(raw).split(' ').filter(Boolean);
  let start = 0;
  while (start < words.length && LEADING.has(words[start])) start += 1;
  let end = words.length;
  while (end > start && TRAILING.has(words[end - 1])) end -= 1;
  if (start === 0 || start >= end) return undefined;
  return PAGE_WORDS[words.slice(start, end).join(' ')];
}

const CLICK = /^(?:please )?(?:click|press|tap|select|choose|hit|push)(?: on)?(?: the)? (.+?)(?: button| link| tab)?$/;

/**
 * Turns what the browser heard into an action, or null if it is not a command.
 * Returns { action, to?, on?, label?, fallbackTo? }.
 */
export function parseVoiceCommand(raw) {
  const phrase = normalizePhrase(raw);
  if (!phrase) return null;

  const click = phrase.match(CLICK);
  if (click) return { action: 'click', label: click[1], fallbackTo: pageForPhrase(`go to ${click[1]}`) };

  if (/^(?:scroll|go|jump|back) (?:to )?(?:the )?top(?: of (?:the )?page)?$|^top of (?:the )?page$|^back to top$/.test(phrase)) return { action: 'scrollTop' };
  if (/^(?:scroll|go|jump) (?:to )?(?:the )?(?:bottom|end)(?: of (?:the )?page)?$|^bottom of (?:the )?page$/.test(phrase)) return { action: 'scrollBottom' };
  if (/^(?:scroll|page) down\b/.test(phrase)) return { action: 'scrollDown' };
  if (/^(?:scroll|page) up\b/.test(phrase)) return { action: 'scrollUp' };

  if (/^(?:go )?back$|^previous page$/.test(phrase)) return { action: 'goBack' };
  if (/^(?:go )?forward$|^next page$/.test(phrase)) return { action: 'goForward' };
  if (/^(?:help|voice help|what can i say|show commands|list commands)$/.test(phrase)) return { action: 'help' };
  if (/^close(?: the)?(?: accessibility)?(?: settings| panel| menu)?$/.test(phrase)) return { action: 'closeSettings' };
  if (/^stop listening$|^turn off voice(?: commands)?$|^voice off$/.test(phrase)) return { action: 'stopListening' };

  const to = pageForPhrase(phrase);
  if (to !== undefined) return { action: 'navigate', to };

  if (/^(?:please )?read (?:the |this )?page|^read aloud|^read this/.test(phrase)) return { action: 'readPage' };
  if (/^stop(?: reading)?$/.test(phrase)) return { action: 'stopReading' };
  if (/(?:bigger|larger|increase) text/.test(phrase)) return { action: 'biggerText' };
  if (/(?:smaller|decrease) text/.test(phrase)) return { action: 'smallerText' };
  if (/(?:normal|default|reset) text/.test(phrase)) return { action: 'normalText' };
  if (/high contrast on|turn on high contrast/.test(phrase)) return { action: 'contrast', on: true };
  if (/high contrast off|turn off high contrast/.test(phrase)) return { action: 'contrast', on: false };
  if (/accessibility|settings/.test(phrase)) return { action: 'openSettings' };
  return null;
}

function scrollPage(action) {
  const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior = reduce ? 'auto' : 'smooth';
  const step = Math.round(window.innerHeight * 0.8);
  if (action === 'scrollDown') window.scrollBy({ top: step, behavior });
  else if (action === 'scrollUp') window.scrollBy({ top: -step, behavior });
  else if (action === 'scrollTop') window.scrollTo({ top: 0, behavior });
  else window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
}

const FATAL_ERRORS = ['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'];
const MAX_FAILURES = 3;

/**
 * Listens for short spoken commands (needs a browser with the Web Speech service: Chrome or Edge).
 * handlers: { navigate, goBack, goForward, readPage, stopReading, biggerText, smallerText, normalText,
 *             contrast(on), openSettings, closeSettings, stopListening }
 * onHeard(phrase, matched, message) is called after every phrase; message is set when there is something specific to show.
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

    const run = (command) => {
      const h = handlersRef.current;
      switch (command.action) {
        case 'click': {
          const name = clickByVoice(command.label);
          if (name) return { matched: true, message: `Clicked "${name}"` };
          if (command.fallbackTo) { h.navigate(command.fallbackTo); return { matched: true }; }
          return { matched: false, message: `Could not find a button called "${command.label}"` };
        }
        case 'scrollUp': case 'scrollDown': case 'scrollTop': case 'scrollBottom':
          scrollPage(command.action); return { matched: true };
        case 'navigate': h.navigate(command.to); return { matched: true };
        case 'contrast': h.contrast(command.on); return { matched: true };
        case 'help': return { matched: true, message: HELP_TEXT };
        default:
          if (typeof h[command.action] === 'function') { h[command.action](); return { matched: true }; }
          return { matched: false };
      }
    };

    recognition.onresult = (event) => {
      failures = 0;
      const heard = event.results[event.results.length - 1][0].transcript.trim();
      const command = parseVoiceCommand(heard);
      const result = command ? run(command) : { matched: false };
      heardRef.current?.(heard.toLowerCase(), result.matched, result.message);
    };
    recognition.onstart = () => setListening(true);
    recognition.onerror = (event) => {
      const code = event && event.error ? event.error : 'unknown';
      if (code === 'no-speech' || code === 'aborted') return; // normal
      if (FATAL_ERRORS.includes(code)) { stopped = true; setError(code); return; }
      failures += 1; // e.g. a short network drop: retry quietly a few times before telling the user
      if (failures >= MAX_FAILURES) { stopped = true; setError(code); }
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
