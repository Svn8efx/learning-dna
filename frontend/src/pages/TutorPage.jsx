import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Brain, BookOpen, Video, Database } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function TutorPage() {
  const [questions, setQuestions] = useState({ general: [], topics: [], plan_topics: [] });
  const [topic, setTopic] = useState('');
  const [typed, setTyped] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    apiFetch('/api/tutor/questions')
      .then((data) => {
        setQuestions(data);
        setTopic(data.plan_topics[0] || data.topics[0] || '');
      })
      .catch(() => {});
  }, []);

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
      setMessages((prev) => [...prev, { role: 'assistant', text: err.message || 'Something went wrong. Please try again.', suggestions: [] }]);
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
    <div className="px-6 py-8 max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={18} className="text-teal-400" />
          <h1 className="font-display font-bold text-2xl text-white">Guided Tutor</h1>
        </div>
        <p className="text-slate-300 text-sm">
          Choose a question below, or type a topic or question. Answers are pre-written from our lessons and your own plan and
          quiz results. This is not a live AI, so it can only answer the questions it offers.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="glass-card p-5">
          <h2 className="font-display font-semibold text-white text-sm mb-2">Quick questions</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {questions.general.map((q) => (
              <button key={q.id} type="button" className="btn-cyber text-left" disabled={loading} onClick={() => ask({ id: q.id, text: q.text })}>
                {q.text}
              </button>
            ))}
          </div>

          <h2 className="font-display font-semibold text-white text-sm mb-2">Ask about a topic</h2>
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <label htmlFor="tutor-topic" className="text-sm text-slate-200">Topic</label>
            <select id="tutor-topic" className="cyber-select" value={topic} onChange={(e) => setTopic(e.target.value)}>
              {questions.topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {topicButtons.map((b) => (
              <button key={b.id} type="button" className="btn-cyber" disabled={loading} onClick={() => ask(b)}>{b.text}</button>
            ))}
          </div>

          <h2 className="font-display font-semibold text-white text-sm mb-2">Conversation</h2>
          <div role="log" aria-live="polite" aria-label="Conversation with the tutor" className="space-y-3 mb-4 min-h-[200px]">
            {messages.length === 0 && <p className="text-slate-300 text-sm">No messages yet. Pick a question above.</p>}
            {messages.map((m, i) => (
              <div key={i} className={`p-3 rounded-xl whitespace-pre-line ${m.role === 'user' ? 'bg-teal-400/10 text-teal-200 ml-10' : 'bg-white/5 text-slate-100 mr-10'}`}>
                <span className="sr-only">{m.role === 'user' ? 'You asked: ' : 'Tutor: '}</span>
                {m.text}
                {m.suggestions?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {m.suggestions.map((s) => (
                      <button key={s.id} type="button" className="btn-cyber" disabled={loading} onClick={() => ask({ id: s.id, text: s.text })}>{s.text}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && <p className="text-slate-300 text-sm" role="status">Finding the answer...</p>}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); ask({ text: typed }); inputRef.current?.focus(); }} className="flex gap-3">
            <label htmlFor="tutor-input" className="sr-only">Type a topic or question</label>
            <input id="tutor-input" ref={inputRef} className="cyber-input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type a topic or question, for example: neural networks" />
            <button className="btn-cyber-solid" disabled={loading} aria-label="Send question"><Send size={14} /></button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="text-xs text-slate-300 mb-2">How this tutor answers</div>
            <div className="flex items-center gap-2 text-white"><Brain size={16} className="text-teal-400" />{meta?.mode || 'Pre-written answers'}</div>
            {meta?.topic && <div className="text-xs text-slate-300 mt-2">Topic: <span className="text-teal-300 capitalize">{meta.topic}</span></div>}
          </div>

          <div className="glass-card p-4 space-y-3">
            <div className="text-xs text-slate-300">Related resources</div>
            {!meta?.topic && <p className="text-slate-300 text-sm">Ask about a topic to see videos, courses and a project idea.</p>}
            {meta?.related?.videos?.[0] && <a href={meta.related.videos[0].url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-slate-100 hover:text-teal-300"><Video size={14} /> {meta.related.videos[0].title} <span className="sr-only">(opens in a new tab)</span></a>}
            {meta?.related?.courses?.[0] && <a href={meta.related.courses[0].url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-slate-100 hover:text-teal-300"><BookOpen size={14} /> {meta.related.courses[0].title} <span className="sr-only">(opens in a new tab)</span></a>}
            {meta?.related?.datasets?.[0] && <a href={meta.related.datasets[0].url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-slate-100 hover:text-teal-300"><Database size={14} /> {meta.related.datasets[0].title} <span className="sr-only">(opens in a new tab)</span></a>}
            {meta?.related?.project && <div className="text-xs text-slate-300 border-t border-white/10 pt-2">Project idea: <span className="text-slate-100">{meta.related.project}</span></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
