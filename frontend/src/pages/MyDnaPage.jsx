import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { useFlaskData } from '../hooks/useFlaskData';
import LoadingScreen from '../components/LoadingScreen';
import { PageHeader, Notice } from '../components/ui';

const LEVEL_OPTIONS = [['none', 'No difficulty'], ['some', 'Some difficulty'], ['high', 'A lot of difficulty']];
const LEVEL_LABEL = Object.fromEntries(LEVEL_OPTIONS);

const QUESTIONS = [
  ['vision', 'Seeing', 'How much difficulty do you have reading a screen?'],
  ['hearing', 'Hearing', 'How much difficulty do you have with sound or speech in videos?'],
  ['motor', 'Using a mouse or keyboard', 'How much difficulty do you have with hand movement or using a mouse?'],
];

const MODE_TITLES = { audio_first: 'Audio-first', captioned_visual: 'Captioned and visual', hands_free: 'Hands-free', balanced: 'Balanced' };

const EMPTY = { vision: 'none', hearing: 'none', motor: 'none', prefers_audio: false, prefers_captions: false, prefers_visuals: false, pace: 'normal' };

export default function MyDnaPage() {
  const { replacePrefs, announce } = useAccessibility();
  const { refresh } = useFlaskData();
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(null);          // the stored profile, if there is one
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const resultRef = useRef(null);

  useEffect(() => {
    apiFetch('/api/profile/learning-dna')
      .then((d) => {
        if (d.needProfile) { setSaved(d.needProfile); setForm({ ...EMPTY, ...d.needProfile.intake }); }
        else setEditing(true);
      })
      .catch(() => setEditing(true))
      .finally(() => setReady(true));
  }, []);

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
      setSaved(data.needProfile);
      setEditing(false);
      replacePrefs(data.preferences);
      refresh?.();
      announce(`Your settings were saved. Suggested style: ${MODE_TITLES[data.needProfile.mode]}.`);
      setTimeout(() => resultRef.current?.focus(), 0);
    } catch (err) {
      setError(err.message || 'Could not save your answers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    setForm({ ...EMPTY, ...saved.intake });
    setEditing(false);
    setError('');
  };

  if (!ready) return <LoadingScreen label="Loading your profile" />;

  return (
    <div className="page-narrow">
      <PageHeader
        title="My learning DNA"
        lead="Tell the site how you like to learn. Your answers suggest a learning style and set up accessibility settings for you. Everything is optional, it is your choice, and you can change any setting later. This is not a medical test."
      />

      {editing ? (
        <form onSubmit={submit} className="space-y-8">
          {QUESTIONS.map(([key, title, help]) => (
            <fieldset key={key}>
              <legend className="text-base font-semibold text-ink">{title}</legend>
              <p className="hint mt-1">{help}</p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {LEVEL_OPTIONS.map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2 text-ink">
                    <input type="radio" name={key} value={value} checked={form[key] === value} onChange={() => set(key, value)} className="check !rounded-full" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <fieldset>
            <legend className="text-base font-semibold text-ink">How do you like to learn?</legend>
            <p className="hint mt-1">Choose any that apply.</p>
            <div className="mt-3 space-y-2">
              {[['prefers_audio', 'I like to listen to lessons'], ['prefers_captions', 'I like captions and written transcripts'], ['prefers_visuals', 'I like diagrams and visuals']].map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-3 text-ink">
                  <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="check" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-base font-semibold text-ink">Pace</legend>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {[['slow', 'I prefer to go slowly'], ['normal', 'Normal pace is fine']].map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 text-ink">
                  <input type="radio" name="pace" value={value} checked={form.pace === value} onChange={() => set('pace', value)} className="check !rounded-full" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {error && <Notice tone="danger" title="Your answers were not saved">{error}</Notice>}
          <div className="flex flex-wrap gap-3 border-t border-line pt-6">
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : saved ? 'Save changes' : 'Save my answers'}</button>
            {saved && <button type="button" className="btn btn-secondary" onClick={cancel}>Cancel</button>}
          </div>
        </form>
      ) : saved && (
        <section aria-labelledby="result-title">
          <Notice tone="success" className="mb-6" title="Your answers are saved">The accessibility settings below are already on. Change them any time in Accessibility settings.</Notice>

          <h2 id="result-title" ref={resultRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">Suggested style: {MODE_TITLES[saved.mode]}</h2>
          <p className="mt-2 text-ink">{saved.mode_description}</p>
          <p className="mt-2 text-sm text-muted">A suggestion, not a diagnosis. If a setting does not suit you, change it.</p>

          {saved.reasons.length > 0 && (
            <div className="mt-6">
              <h3 className="text-base font-semibold">Settings we turned on</h3>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-ink">{saved.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          )}

          <div className="mt-8 border-t border-line pt-6">
            <h3 className="text-base font-semibold">Your answers</h3>
            <dl className="mt-3 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              {QUESTIONS.map(([key, title]) => (
                <div key={key}><dt className="text-muted">{title}</dt><dd className="font-medium text-ink">{LEVEL_LABEL[saved.intake[key]]}</dd></div>
              ))}
              <div><dt className="text-muted">Pace</dt><dd className="font-medium text-ink">{saved.intake.pace === 'slow' ? 'Slowly' : 'Normal'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-muted">Likes</dt><dd className="font-medium text-ink">
                {[saved.intake.prefers_audio && 'Listening to lessons', saved.intake.prefers_captions && 'Captions and transcripts', saved.intake.prefers_visuals && 'Diagrams and visuals'].filter(Boolean).join(', ') || 'No preference chosen'}
              </dd></div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>Edit my answers</button>
              <Link to="/lessons" className="btn btn-primary">Go to lessons</Link>
            </div>
          </div>

          <details className="mt-8 rounded-xl border border-line bg-surface p-5">
            <summary className="cursor-pointer font-medium text-ink">How the suggestion was made</summary>
            <div className="mt-3 space-y-3 text-sm text-muted">
              <p>A small model ({saved.model.backend}) compared your answers with example learners. It was trained on {saved.model.training_data}, not on real students, so treat the result as a starting point.</p>
              <p>How sure the model is: {Math.round(saved.confidence * 100)}%.</p>
              {saved.drivers.length > 0 && (
                <div>
                  <p className="font-medium text-ink">What mattered most</p>
                  <ul className="mt-1 list-disc space-y-1 pl-6">{saved.drivers.map((d) => <li key={d.feature}>Your {d.feature} pushed the suggestion {d.effect} this style.</li>)}</ul>
                </div>
              )}
              <table className="table max-w-sm">
                <caption className="sr-only">Model probability for each learning style</caption>
                <thead><tr><th scope="col">Style</th><th scope="col">Probability</th></tr></thead>
                <tbody>{Object.entries(saved.probabilities).map(([mode, p]) => (
                  <tr key={mode}><th scope="row" className="!font-normal">{MODE_TITLES[mode]}</th><td className="tabular-nums">{Math.round(p * 100)}%</td></tr>
                ))}</tbody>
              </table>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
