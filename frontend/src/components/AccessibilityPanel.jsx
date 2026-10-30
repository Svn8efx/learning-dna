import React, { useEffect, useRef } from 'react';
import { X, Mic } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { voiceSupported } from '../hooks/useVoiceCommands';

const TOGGLES = [
  ['high_contrast', 'High contrast', 'Black background with bright text and strong borders.'],
  ['text_to_speech', 'Listen controls', 'Show Listen buttons on lessons and let the page be read aloud.'],
  ['captions', 'Video captions', 'Turn on captions in embedded YouTube videos, where the video has them.'],
  ['visual_alerts', 'On-screen alerts', 'Show messages on screen as well as announcing them.'],
  ['large_targets', 'Large buttons', 'Bigger buttons and links, easier to hit.'],
  ['keyboard_mode', 'Keyboard shortcuts', 'Thicker focus outline and shortcuts (see the list below).'],
  ['reduce_motion', 'Reduce motion', 'Stop animations and transitions.'],
  ['voice_commands', 'Voice commands', 'Control the site by speaking. Works in Chrome and Edge.'],
];

export const SHORTCUTS = [
  ['Alt + Shift + H', 'Home'], ['Alt + Shift + G', 'Goals'], ['Alt + Shift + S', 'Start'],
  ['Alt + Shift + Q', 'Quiz'], ['Alt + Shift + D', 'Dashboard'], ['Alt + Shift + P', 'Learning path'],
  ['Alt + Shift + L', 'Lessons'], ['Alt + Shift + M', 'My Learning DNA'], ['Alt + Shift + O', 'Progress'],
  ['Alt + Shift + A', 'Open accessibility settings'], ['Alt + Shift + R', 'Read the page aloud'],
];

const VOICE_ERRORS = {
  'not-allowed': 'Microphone access is blocked. Click the lock icon in the address bar, allow the microphone, then turn voice commands off and on again.',
  'service-not-allowed': 'This browser blocks the speech service. Please open the site in Google Chrome or Microsoft Edge.',
  network: 'The speech service could not be reached. Check your internet connection. In Microsoft Edge, also make sure Windows Settings > Privacy & security > Speech > Online speech recognition is turned on. Brave blocks this service completely, so use Google Chrome or Edge.',
  'audio-capture': 'No microphone was found. Plug in or enable a microphone and try again.',
  'language-not-supported': 'This browser does not support the speech language we use. Please try Google Chrome or Microsoft Edge.',
};

export default function AccessibilityPanel({ open, onClose, onReadPage, voiceListening, voiceError, onVoiceRetry }) {
  const { prefs, updatePrefs, speaking, stopSpeaking, speechSupported } = useAccessibility();
  const dialogRef = useRef(null);
  const headingRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    headingRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll('button, input, a[href], select, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="a11y-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="a11y-title" className="a11y-dialog">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 id="a11y-title" ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-ink">
            Accessibility settings
          </h2>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close accessibility settings">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p className="mb-5 text-sm text-muted">Changes apply straight away and are saved for your next visit.</p>

        <div className="mb-5">
          <label htmlFor="font-scale" className="label">
            Text size: {prefs.font_scale}%
          </label>
          <input id="font-scale" type="range" min="100" max="200" step="10" value={prefs.font_scale}
            onChange={(e) => updatePrefs({ font_scale: Number(e.target.value) })} className="w-full accent-[rgb(var(--c-accent))]" />
        </div>

        <div className="mb-5">
          <label htmlFor="speech-rate" className="label">
            Speaking speed: {prefs.speech_rate.toFixed(2)}x
          </label>
          <input id="speech-rate" type="range" min="0.5" max="1.5" step="0.05" value={prefs.speech_rate}
            onChange={(e) => updatePrefs({ speech_rate: Number(e.target.value) })} className="w-full accent-[rgb(var(--c-accent))]" />
        </div>

        <fieldset className="mb-5">
          <legend className="label">Display and interaction</legend>
          <div className="space-y-3">
            {TOGGLES.map(([key, label, help]) => (
              <div key={key} className="flex items-start gap-3">
                <input id={`pref-${key}`} type="checkbox" className="a11y-check" checked={Boolean(prefs[key])}
                  aria-describedby={`pref-${key}-help`} onChange={(e) => updatePrefs({ [key]: e.target.checked })} />
                <label htmlFor={`pref-${key}`} className="text-sm text-ink">
                  <span className="font-semibold">{label}</span>
                  <span id={`pref-${key}-help`} className="mt-0.5 block text-sm text-muted">{help}</span>
                </label>
              </div>
            ))}
          </div>
          {prefs.voice_commands && !voiceSupported && (
            <p role="alert" className="notice notice-warning mt-3">Voice commands need Chrome or Edge. Your browser does not support them.</p>
          )}
          {prefs.voice_commands && voiceSupported && voiceError && (
            <p role="alert" className="notice notice-warning mt-3">{VOICE_ERRORS[voiceError] || `Voice commands stopped (${voiceError}). Please try Google Chrome or Microsoft Edge.`}</p>
          )}
          {prefs.voice_commands && voiceSupported && voiceError && onVoiceRetry && (
            <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={onVoiceRetry}>Try voice commands again</button>
          )}
          {prefs.voice_commands && voiceSupported && !voiceError && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
              <Mic size={14} aria-hidden="true" /> {voiceListening ? 'Listening. Try "go to quiz", "scroll down", "click" and a button name, "read page", or "help".' : 'Starting the microphone. Allow access if your browser asks.'}
            </p>
          )}
        </fieldset>

        <div className="mb-5 flex flex-wrap gap-2">
          {speechSupported ? (
            speaking
              ? <button type="button" className="btn btn-secondary btn-sm" onClick={stopSpeaking}>Stop reading</button>
              : <button type="button" className="btn btn-primary btn-sm" onClick={() => { onReadPage(); onClose(); }}>Read this page aloud</button>
          ) : <p className="text-sm text-warning">Your browser cannot read text aloud.</p>}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => updatePrefs({
            font_scale: 100, high_contrast: false, reduce_motion: false, text_to_speech: false, speech_rate: 1,
            captions: false, visual_alerts: true, large_targets: false, keyboard_mode: false, voice_commands: false })}>
            Reset to defaults
          </button>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-ink">Keyboard shortcuts</summary>
          <p className="my-2 text-sm text-muted">Active when "Keyboard shortcuts" is on.</p>
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
            {SHORTCUTS.map(([keys, action]) => (
              <React.Fragment key={keys}><dt className="font-mono text-xs text-accent">{keys}</dt><dd>{action}</dd></React.Fragment>
            ))}
          </dl>
        </details>
      </div>
    </div>
  );
}
