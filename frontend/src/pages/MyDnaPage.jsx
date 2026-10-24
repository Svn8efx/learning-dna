import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { useFlaskData } from '../hooks/useFlaskData';

const LEVEL_OPTIONS = [['none', 'No difficulty'], ['some', 'Some difficulty'], ['high', 'A lot of difficulty']];

const QUESTIONS = [
  ['vision', 'Seeing', 'How much difficulty do you have reading a screen?'],
  ['hearing', 'Hearing', 'How much difficulty do you have with sound or speech in videos?'],
  ['motor', 'Using a mouse or keyboard', 'How much difficulty do you have with hand movement or using a mouse?'],
];

const MODE_TITLES = {
  audio_first: 'Audio-first', captioned_visual: 'Captioned and visual', hands_free: 'Hands-free', balanced: 'Balanced',
};

export default function MyDnaPage() {
  const { replacePrefs, announce } = useAccessibility();
  const { refresh } = useFlaskData();
  const [form, setForm] = useState({
    vision: 'none', hearing: 'none', motor: 'none',
    prefers_audio: false, prefers_captions: false, prefers_visuals: false, pace: 'normal',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/profile/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setResult(data.needProfile);
      replacePrefs(data.preferences);
      refresh?.();
      announce(`Your settings were updated. Suggested style: ${MODE_TITLES[data.needProfile.mode]}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display font-bold text-3xl text-white mb-2">My Learning DNA</h1>
      <p className="text-slate-300 mb-6">
        Tell us how you like to learn. We use your answers to suggest a learning style and to set up the site for you.
        Everything is optional, it stays your choice, and you can change any setting later in Accessibility settings.
        This is not a medical test.
      </p>

      <form onSubmit={submit} className="space-y-6">
        {QUESTIONS.map(([key, title, help]) => (
          <fieldset key={key} className="glass-card p-5">
            <legend className="font-display font-semibold text-white px-1">{title}</legend>
            <p className="text-sm text-slate-300 mb-3">{help}</p>
            <div className="flex flex-wrap gap-4">
              {LEVEL_OPTIONS.map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm text-white cursor-pointer">
                  <input type="radio" name={key} value={value} checked={form[key] === value} onChange={() => set(key, value)} className="a11y-check" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <fieldset className="glass-card p-5">
          <legend className="font-display font-semibold text-white px-1">How do you like to learn?</legend>
          <div className="space-y-3 mt-2">
            {[['prefers_audio', 'I like to listen to lessons'], ['prefers_captions', 'I like captions and written transcripts'], ['prefers_visuals', 'I like diagrams and visuals']].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 text-sm text-white cursor-pointer">
                <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="a11y-check" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="glass-card p-5">
          <legend className="font-display font-semibold text-white px-1">Pace</legend>
          <div className="flex flex-wrap gap-4 mt-2">
            {[['slow', 'I prefer to go slowly'], ['normal', 'Normal pace is fine']].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="radio" name="pace" value={value} checked={form.pace === value} onChange={() => set('pace', value)} className="a11y-check" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {error && <div role="alert" className="text-red-300 text-sm">{error}</div>}
        <button type="submit" disabled={loading} className="btn-cyber-solid">{loading ? 'Working...' : 'Set up my learning style'}</button>
      </form>

      {result && (
        <section aria-labelledby="result-title" className="glass-card p-6 mt-8" tabIndex={-1}>
          <h2 id="result-title" className="font-display font-bold text-xl text-white mb-2">
            Suggested style: {MODE_TITLES[result.mode]}
          </h2>
          <p className="text-slate-200 mb-3">{result.mode_description}</p>
          <p className="text-sm text-slate-300 mb-4">
            Model confidence: {Math.round(result.confidence * 100)}%.
            {' '}It is a suggestion, so change any setting that does not suit you.
          </p>

          {result.reasons.length > 0 && (
            <>
              <h3 className="font-semibold text-white text-sm mb-1">Settings we turned on</h3>
              <ul className="list-disc pl-5 text-sm text-slate-200 space-y-1 mb-4">
                {result.reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </>
          )}

          {result.drivers.length > 0 && (
            <>
              <h3 className="font-semibold text-white text-sm mb-1">What the model looked at most</h3>
              <ul className="list-disc pl-5 text-sm text-slate-200 space-y-1 mb-4">
                {result.drivers.map((d) => <li key={d.feature}>Your {d.feature} pushed the suggestion {d.effect} this style.</li>)}
              </ul>
            </>
          )}

          <h3 className="font-semibold text-white text-sm mb-1">How likely each style is</h3>
          <table className="text-sm text-slate-200 mb-4">
            <caption className="sr-only">Model probability for each learning style</caption>
            <thead><tr><th scope="col" className="text-left pr-6 font-semibold">Style</th><th scope="col" className="text-left font-semibold">Probability</th></tr></thead>
            <tbody>
              {Object.entries(result.probabilities).map(([mode, p]) => (
                <tr key={mode}><th scope="row" className="text-left pr-6 font-normal">{MODE_TITLES[mode]}</th><td>{Math.round(p * 100)}%</td></tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs text-slate-400 mb-4">
            Model: {result.model.backend}, trained on {result.model.training_data}.
          </p>
          <Link to="/lessons" className="btn-cyber-solid inline-block">Go to accessible lessons</Link>
        </section>
      )}
    </div>
  );
}
