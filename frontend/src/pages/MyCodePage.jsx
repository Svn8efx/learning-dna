import React, { useEffect, useRef, useState } from 'react';
import { Copy, Download, LogIn, RotateCcw, Volume2 } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAccessibility } from '../context/AccessibilityContext';
import LogoutButton from '../components/LogoutButton';
import { PageHeader, Notice } from '../components/ui';

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
      setMessage({ kind: 'error', text: 'Copy did not work in this browser. Select the code and copy it by hand.' });
    }
  };

  const download = () => {
    const text = `Learning DNA resume code\n\n${code}\n\nGo to ${window.location.origin}/my-code and type this code under "Continue with a code".\nAnyone who has this code can open your progress, so keep it private.\n`;
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
    <div className="page-narrow">
      <PageHeader
        title="My code"
        lead="There is no password. Your code brings back your progress on any phone or computer. Keep it somewhere safe: anyone who has it can open your progress."
      />

      <section aria-labelledby="your-code" className="border-b border-line pb-8">
        <h2 id="your-code" className="section-title">Your code</h2>
        {loadError && <Notice tone="danger" className="mt-3" title="Your code could not be loaded">{loadError}</Notice>}
        {!code && !loadError && <p className="mt-3 text-muted" role="status">Loading your code...</p>}
        {code && (
          <>
            <p className="mt-3 break-words rounded-lg border border-line-strong bg-surface px-4 py-3 font-mono text-2xl tracking-tight sm:text-3xl" data-testid="resume-code">{code}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary btn-sm" onClick={copy}><Copy size={14} aria-hidden="true" /> {copied ? 'Copied' : 'Copy code'}</button>
              {speechSupported && <button type="button" className="btn btn-secondary btn-sm" onClick={readAloud}><Volume2 size={14} aria-hidden="true" /> Read code aloud</button>}
              <button type="button" className="btn btn-secondary btn-sm" onClick={download}><Download size={14} aria-hidden="true" /> Download as text file</button>
            </div>
            <p className="hint">It has three words and a number. Type it with hyphens or with spaces.</p>
          </>
        )}
      </section>

      <section aria-labelledby="continue-code" className="border-b border-line py-8">
        <h2 id="continue-code" className="section-title">Continue with a code</h2>
        <form onSubmit={resume} className="mt-3 max-w-md">
          <label htmlFor="code-input" className="label">Your code</label>
          <input
            id="code-input" ref={inputRef} className="input" value={typed} onChange={(e) => setTyped(e.target.value)}
            autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="code-help" placeholder="maple-river-tiger-42"
          />
          <p id="code-help" className="hint">Type the three words and the number. Capital letters and spaces are fine.</p>
          <button type="submit" className="btn btn-primary mt-4" disabled={busy || !typed.trim()}>
            <LogIn size={16} aria-hidden="true" /> {busy ? 'Checking...' : 'Continue'}
          </button>
        </form>
        <p className="hint">Continuing replaces the progress shown on this browser with the progress that belongs to the code.</p>
        {message.text && (
          <div className="mt-3"><Notice tone={message.kind === 'error' ? 'danger' : 'success'}>{message.text}</Notice></div>
        )}
      </section>

      <section aria-labelledby="restart-title" className="border-b border-line py-8">
        <h2 id="restart-title" className="section-title">Start a new study plan</h2>
        <p className="mt-2 text-muted">This clears your current plan and quiz so you can begin again. Your accessibility settings and your code are kept.</p>
        <button type="button" className="btn btn-secondary mt-4" onClick={startOver}><RotateCcw size={16} aria-hidden="true" /> Start a new study plan</button>
      </section>

      <section aria-labelledby="logout-title" className="pt-8">
        <h2 id="logout-title" className="section-title">Using a shared computer?</h2>
        <p className="mt-2 text-muted">Log out when you finish so the next person does not see your progress. Your progress stays saved under your code.</p>
        <div className="mt-4"><LogoutButton className="btn btn-secondary" /></div>
      </section>
    </div>
  );
}
