import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, RefreshCcw } from 'lucide-react';
import LoadingScreen from '../components/LoadingScreen';
import { useFlaskData } from '../hooks/useFlaskData';
import { apiFetch } from '../utils/api';
import { PageHeader, Notice, Meter, EmptyState } from '../components/ui';

const DIFFICULTY = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

export default function QuizPage() {
  const navigate = useNavigate();
  const { quizItems, savePartial, refresh, profile, loaded } = useFlaskData();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const questionRef = useRef(null);

  const loadQuiz = async (forceNew = false) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/api/quiz${forceNew ? '?refresh=1' : ''}`);
      savePartial({ quizItems: data.quizItems });
      setAnswers({});
      setCurrentQ(0);
    } catch (err) {
      setError(err.message || 'Unable to load the quiz.');
    } finally {
      setLoading(false);
    }
  };

  // Only ask for a quiz when there is a plan to build it from
  const hasPlan = Boolean(profile?.topics?.length);
  useEffect(() => {
    if (loaded && hasPlan && !quizItems?.length) loadQuiz(false);
  }, [loaded, hasPlan]);

  const total = quizItems?.length || 0;
  const answered = Object.keys(answers).length;
  const answeredAll = total > 0 && answered === total;
  const item = quizItems?.[currentQ];
  const qKey = item ? `${item.topic}_${item.index}` : '';

  // Move keyboard and screen-reader focus to the new question when it changes
  const goTo = (index) => {
    setCurrentQ(index);
    setTimeout(() => questionRef.current?.focus(), 0);
  };

  const newQuiz = () => {
    if (answered > 0 && !window.confirm('Make a new quiz? The answers you have given so far will be cleared.')) return;
    loadQuiz(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answeredAll) return;
    setSubmitted(true);
    setError('');
    try {
      const data = await apiFetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      savePartial(data);
      await refresh();
      navigate('/dashboard');
    } catch (err) {
      setSubmitted(false);
      setError(err.message || 'Quiz submission failed. Your answers are still here, so you can try again.');
    }
  };

  if (!loaded || (loading && !total)) return <LoadingScreen label="Preparing your quiz" />;

  if (!total) {
    return (
      <div className="page-narrow">
        <PageHeader title="Quiz" />
        {error && <Notice tone="danger" className="mb-4" title="Could not load the quiz">{error}</Notice>}
        <EmptyState title="There is no quiz yet" action={<button type="button" onClick={() => navigate('/start')} className="btn btn-primary">Build your plan</button>}>
          The quiz is made from the topics in your study plan, so build your plan first.
        </EmptyState>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="page-narrow">
        <div className="panel panel-pad text-center" role="status">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success"><Check size={24} aria-hidden="true" /></span>
          <h1 className="mt-4 text-xl font-semibold">Quiz submitted</h1>
          <p className="mt-1 text-muted">Opening your dashboard with the results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-narrow">
      <PageHeader
        eyebrow="Step 3 of 3"
        title="Knowledge quiz"
        lead="Questions come from the topics in your plan. Answer all of them, then submit to see your results by topic."
        actions={<button type="button" onClick={newQuiz} className="btn btn-secondary btn-sm"><RefreshCcw size={14} aria-hidden="true" /> New quiz</button>}
      />

      <div className="mb-6">
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="font-medium text-ink">Question {currentQ + 1} of {total}</span>
          <span className="text-muted">{answered} of {total} answered</span>
        </div>
        <Meter value={(answered / total) * 100} label={`${answered} of ${total} questions answered`} />
      </div>

      <form onSubmit={handleSubmit}>
        <fieldset className="panel panel-pad">
          <legend className="sr-only">Question {currentQ + 1} of {total}</legend>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="badge badge-neutral capitalize">{item.topic}</span>
            <span>{DIFFICULTY[item.difficulty || 'beginner']} level</span>
          </div>
          <h2 ref={questionRef} tabIndex={-1} className="mt-3 text-xl font-semibold leading-snug outline-none">{item.q}</h2>

          <div className="mt-5 space-y-3" role="radiogroup" aria-label={item.q}>
            {item.options.map((opt, oi) => {
              const id = `${qKey}_${oi}`;
              const checked = answers[qKey] === opt;
              return (
                <div key={id} className="flex">
                  <input type="radio" name={qKey} id={id} value={opt} className="choice-input" checked={checked} onChange={() => setAnswers((a) => ({ ...a, [qKey]: opt }))} />
                  <label htmlFor={id} className="choice w-full items-start" data-selected={checked}>
                    <span className="choice-mark" aria-hidden="true">{checked && <Check size={12} strokeWidth={3} />}</span>
                    <span className="text-[1.0625rem]"><span className="mr-2 font-mono text-sm text-muted">{String.fromCharCode(65 + oi)}</span>{opt}</span>
                  </label>
                </div>
              );
            })}
          </div>
        </fieldset>

        {error && <Notice tone="danger" className="mt-4" title="Something went wrong">{error}</Notice>}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={() => goTo(Math.max(0, currentQ - 1))} disabled={currentQ === 0} className="btn btn-secondary">
            <ArrowLeft size={16} aria-hidden="true" /> Previous
          </button>
          {currentQ < total - 1 ? (
            <button type="button" onClick={() => goTo(currentQ + 1)} className="btn btn-primary">Next <ArrowRight size={16} aria-hidden="true" /></button>
          ) : (
            <button type="submit" disabled={!answeredAll} className="btn btn-primary">Submit quiz</button>
          )}
        </div>
        {currentQ === total - 1 && !answeredAll && (
          <p className="mt-3 text-right text-sm text-warning" role="status">{total - answered} question{total - answered === 1 ? '' : 's'} still unanswered. Answer all to submit.</p>
        )}

        <nav aria-label="Jump to a question" className="mt-8 border-t border-line pt-5">
          <p className="mb-2 text-sm font-medium text-ink">All questions</p>
          <ul className="flex flex-wrap gap-2">
            {quizItems.map((q, i) => {
              const done = Boolean(answers[`${q.topic}_${q.index}`]);
              return (
                <li key={i}>
                  <button
                    type="button" onClick={() => goTo(i)} aria-current={i === currentQ ? 'step' : undefined}
                    aria-label={`Question ${i + 1}, ${done ? 'answered' : 'not answered'}`}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium ${
                      i === currentQ ? 'border-accent bg-accent text-accent-ink' : done ? 'border-success bg-success-soft text-success' : 'border-line-strong bg-surface text-ink hover:bg-sunken'}`}
                  >
                    {done && i !== currentQ ? <Check size={16} aria-hidden="true" /> : i + 1}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </form>
    </div>
  );
}
