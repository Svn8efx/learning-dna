import React, { useEffect, useRef, useState } from 'react';
import { KeyRound, Copy, Download, Volume2, LogIn, RotateCcw } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAccessibility } from '../context/AccessibilityContext';
import LogoutButton from '../components/LogoutButton';

export default function MyCodePage() {
  const { speak, speechSupported, announce } = useAccessibility();
  const [code, setCode] = useState('');
  const [loadError, setLoadError] = useState('');
  const [copied, setCopied] = useState(false);
  const [typed, setTyped] = useState('');
  const [message, setMessage] = useState({ kind: '', text: '' });
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    apiFetch('/api/account/code')
      .then((data) => setCode(data.code))
      .catch((err) => setLoadError(err.message || 'Could not load your code.'));
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      announce('Code copied');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage({ kind: 'error', text: 'Copy did not work in this browser. Please select the code and copy it by hand.' });
    }
  };

  const download = () => {
    const text = `Learning DNA resume code\n\n${code}\n\nGo to https://learning-dna.vercel.app/my-code and type this code under "Continue with a code".\nAnyone who has this code can open your progress, so keep it private.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'learning-dna-code.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const readAloud = () => {
    if (!speak(`Your code is ${code.split('-').join(', ')}.`, 'my-code')) announce('Your browser cannot read text aloud.');
  };

  const startOver = async () => {
    if (!window.confirm('Start a new study plan? Your accessibility settings and your code are kept.')) return;
    try {
      await apiFetch('/api/reset', { method: 'POST' });
      sessionStorage.clear();
      window.location.assign('/');
    } catch (err) {
      setMessage({ kind: 'error', text: err.message || 'Could not start a new plan. Please try again.' });
    }
  };

  const resume = async (e) => {
    e.preventDefault();
    if (!typed.trim() || busy) return;
    setBusy(true);
    setMessage({ kind: '', text: '' });
    try {
      const data = await apiFetch('/api/account/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: typed }),
      });
      setMessage({ kind: 'ok', text: data.message || 'Welcome back. Loading your progress.' });
      sessionStorage.clear();
      setTimeout(() => window.location.assign('/progress'), 600);
    } catch (err) {
      setMessage({ kind: 'error', text: err.message || 'Something went wrong. Please try again.' });
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <KeyRound size={18} className="text-teal-400" />
          <h1 className="font-display font-bold text-2xl text-white">My code</h1>
        </div>
        <p className="text-slate-300 text-sm">
          There is no password. Your code is how you come back to your progress on any phone or computer.
          Keep it somewhere safe. Anyone who has your code can open your progress, so do not share it.
        </p>
      </div>

      <section aria-labelledby="your-code" className="glass-card p-6 space-y-4">
        <h2 id="your-code" className="font-display font-semibold text-white">Your code</h2>
        {loadError && <p role="alert" className="text-sm text-amber-300">{loadError}</p>}
        {!code && !loadError && <p className="text-slate-300 text-sm" role="status">Loading your code…</p>}
        {code && (
          <>
            <p className="font-mono text-3xl text-teal-300 break-words" data-testid="resume-code">{code}</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn-cyber flex items-center gap-1" onClick={copy}>
                <Copy size={14} aria-hidden="true" /> {copied ? 'Copied' : 'Copy code'}
              </button>
              {speechSupported && (
                <button type="button" className="btn-cyber flex items-center gap-1" onClick={readAloud}>
                  <Volume2 size={14} aria-hidden="true" /> Read code aloud
                </button>
              )}
              <button type="button" className="btn-cyber flex items-center gap-1" onClick={download}>
                <Download size={14} aria-hidden="true" /> Download as text file
              </button>
            </div>
            <p className="text-slate-300 text-xs">
              It has three words and a number. You can type it with hyphens or with spaces.
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="continue-code" className="glass-card p-6 space-y-4">
        <h2 id="continue-code" className="font-display font-semibold text-white">Continue with a code</h2>
        <form onSubmit={resume} className="space-y-3">
          <div>
            <label htmlFor="code-input" className="block text-sm text-white mb-1">Your code</label>
            <input
              id="code-input" ref={inputRef} className="cyber-input w-full" value={typed}
              onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false}
              aria-describedby="code-help" placeholder="maple-river-tiger-42"
            />
            <p id="code-help" className="text-slate-300 text-xs mt-1">
              Type the three words and the number. Capital letters and spaces are fine.
            </p>
          </div>
          <button type="submit" className="btn-cyber-solid flex items-center gap-1" disabled={busy}>
            <LogIn size={14} aria-hidden="true" /> {busy ? 'Checking…' : 'Continue'}
          </button>
        </form>
        <p className="text-slate-300 text-xs">
          Continuing replaces the progress shown on this browser with the progress that belongs to the code.
        </p>
        {message.text && (
          <p role={message.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${message.kind === 'error' ? 'text-amber-300' : 'text-teal-300'}`}>
            {message.text}
          </p>
        )}
      </section>

      <section aria-labelledby="restart-title" className="glass-card p-6 space-y-3">
        <h2 id="restart-title" className="font-display font-semibold text-white">Start a new study plan</h2>
        <p className="text-slate-300 text-sm">
          This clears your current plan and quiz so you can begin again. Your accessibility settings and your code are kept.
        </p>
        <button type="button" className="btn-cyber flex items-center gap-1" onClick={startOver}>
          <RotateCcw size={14} aria-hidden="true" /> Start a new study plan
        </button>
      </section>

      <section aria-labelledby="logout-title" className="glass-card p-6 space-y-3">
        <h2 id="logout-title" className="font-display font-semibold text-white">Using a shared computer?</h2>
        <p className="text-slate-300 text-sm">
          Log out when you finish so the next person does not see your progress. Your progress stays saved under your code.
        </p>
        <LogoutButton />
      </section>
    </div>
  );
}
