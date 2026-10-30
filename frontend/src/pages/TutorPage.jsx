import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Database, Send, Video } from 'lucide-react';
import { apiFetch } from '../utils/api';
import RichText from '../components/RichText';
import { PageHeader, Notice, capitalize } from '../components/ui';

export default function TutorPage() {
  const [questions, setQuestions] = useState({ general: [], topics: [], plan_topics: [] });
  const [topic, setTopic] = useState('');
  const [typed, setTyped] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState(null);
  const [loadError, setLoadError] = useState('');
  const inputRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    apiFetch('/api/tutor/questions')
      .then((data) => {
        setQuestions(data);
        setTopic(data.plan_topics[0] || data.topics[0] || '');
      })
      .catch((e) => setLoadError(e.message || 'Could not load the tutor questions.'));
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView?.({ block: "nearest" }); }, [messages, loading]);

  // Send a button question ({id, text}) or typed text ({text})
  const ask = async ({ id, text }) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setTyped('');
    setLoading(true);
    try {
      const data = await apiFetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { question_id: id } : { question: text }),
      });
      setMeta({ mode: data.mode, topic: data.topic, related: data.related_resources || {} });
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer, suggestions: data.suggestions || [] }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', error: true, text: err.message || 'Something went wrong. Please try again.', suggestions: [] }]);
    } finally {
      setLoading(false);
    }
  };

  const topicButtons = topic ? [
    { id: `explain:${topic}`, text: `Explain ${topic} in simple words` },
    { id: `before:${topic}`, text: `What should I know before ${topic}?` },
    { id: `practice:${topic}`, text: `Give me a practice idea for ${topic}` },
  ] : [];

  return (
    <div className="page">
      <PageHeader
        title="Guided tutor"
        lead="Choose a question or type a topic. Answers are pre-written from the lessons and from your own plan and quiz results. This is not a live AI, so it can only answer what it offers."
      />
      {loadError && <Notice tone="danger" className="mb-6" title="The tutor is not available right now">{loadError}</Notice>}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section aria-label="Conversation" className="min-w-0">
          <div className="panel flex min-h-[26rem] flex-col">
            <div role="log" aria-live="polite" aria-label="Conversation with the tutor" className="flex-1 space-y-4 overflow-y-auto p-5" style={{ maxHeight: '32rem' }}>
              {messages.length === 0 && <p className="text-muted">No messages yet. Pick a question below to begin.</p>}
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex' : 'flex flex-col'}>
                  <div className={`bubble ${m.role === 'user' ? 'bubble-user' : m.error ? 'bubble-tutor !border-danger' : 'bubble-tutor'}`}>
                    <span className="sr-only">{m.role === 'user' ? 'You asked: ' : 'Tutor: '}</span>
                    {m.role === 'user' ? m.text : <RichText text={m.text} />}
                  </div>
                  {m.suggestions?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.suggestions.map((s) => <button key={s.id} type="button" className="btn btn-secondary btn-sm" disabled={loading} onClick={() => ask({ id: s.id, text: s.text })}>{s.text}</button>)}
                    </div>
                  )}
                </div>
              ))}
              {loading && <p className="text-sm text-muted" role="status">Finding the answer...</p>}
              <div ref={endRef} />
            </div>

            <div className="border-t border-line p-4">
              <form onSubmit={(e) => { e.preventDefault(); ask({ text: typed }); inputRef.current?.focus(); }} className="flex gap-2">
                <label htmlFor="tutor-input" className="sr-only">Type a topic or question</label>
                <input id="tutor-input" ref={inputRef} className="input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type a topic or question, for example: neural networks" />
                <button className="btn btn-primary" disabled={loading || !typed.trim()}><Send size={16} aria-hidden="true" /> Send</button>
              </form>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold">Quick questions</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {questions.general.map((q) => <button key={q.id} type="button" className="btn btn-secondary btn-sm text-left" disabled={loading} onClick={() => ask({ id: q.id, text: q.text })}>{q.text}</button>)}
                {!questions.general.length && !loadError && <p className="text-sm text-muted">Loading questions...</p>}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold">Ask about a topic</h2>
              <label htmlFor="tutor-topic" className="sr-only">Topic</label>
              <select id="tutor-topic" className="select mt-2" value={topic} onChange={(e) => setTopic(e.target.value)}>
                {questions.topics.map((t) => <option key={t} value={t}>{capitalize(t)}</option>)}
              </select>
              <div className="mt-2 flex flex-wrap gap-2">
                {topicButtons.map((b) => <button key={b.id} type="button" className="btn btn-secondary btn-sm text-left" disabled={loading} onClick={() => ask(b)}>{b.text}</button>)}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6" aria-label="About this answer">
          <div>
            <h2 className="text-sm font-semibold">How this tutor answers</h2>
            <p className="mt-1 text-sm text-muted">{meta?.mode || 'Pre-written answers'}{meta?.topic ? <> · Topic: <span className="capitalize text-ink">{meta.topic}</span></> : null}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Related resources</h2>
            {!meta?.topic && <p className="mt-1 text-sm text-muted">Ask about a topic to see a video, a course, a dataset and a project idea.</p>}
            <ul className="mt-2 space-y-2 text-sm">
              {meta?.related?.videos?.[0] && <li><a href={meta.related.videos[0].url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-2"><Video size={15} aria-hidden="true" className="mt-0.5 shrink-0" />{meta.related.videos[0].title}<span className="sr-only"> (opens in a new tab)</span></a></li>}
              {meta?.related?.courses?.[0] && <li><a href={meta.related.courses[0].url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-2"><BookOpen size={15} aria-hidden="true" className="mt-0.5 shrink-0" />{meta.related.courses[0].title}<span className="sr-only"> (opens in a new tab)</span></a></li>}
              {meta?.related?.datasets?.[0] && <li><a href={meta.related.datasets[0].url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-2"><Database size={15} aria-hidden="true" className="mt-0.5 shrink-0" />{meta.related.datasets[0].title}<span className="sr-only"> (opens in a new tab)</span></a></li>}
            </ul>
            {meta?.related?.project && <p className="mt-3 text-sm text-muted"><span className="font-medium text-ink">Project idea:</span> {meta.related.project}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
