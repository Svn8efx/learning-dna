import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFlaskData } from '../hooks/useFlaskData';
import { apiFetch } from '../utils/api';
import LoadingScreen from '../components/LoadingScreen';
import { PageHeader, Notice, StatusBadge, capitalize } from '../components/ui';

export default function LessonsPage() {
  const { learningPath, profile } = useFlaskData();
  const [lessons, setLessons] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    apiFetch('/api/content').then((d) => setLessons(d.lessons || [])).catch((e) => { setError(e.message); setLessons([]); });
  }, []);

  const statusOf = useMemo(() => Object.fromEntries(learningPath.map((s) => [s.topic, s.status])), [learningPath]);
  const planTopics = useMemo(() => profile?.topics || [], [profile]);

  const { mine, others } = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const matches = (l) => !q || l.title.toLowerCase().includes(q) || l.topic.toLowerCase().includes(q);
    const byTopic = Object.fromEntries((lessons || []).map((l) => [l.topic, l]));
    const mine = planTopics.map((t) => byTopic[t]).filter(Boolean).filter(matches);
    const others = (lessons || []).filter((l) => !planTopics.includes(l.topic)).filter(matches);
    return { mine, others };
  }, [lessons, planTopics, filter]);

  if (lessons === null) return <LoadingScreen label="Loading lessons" />;

  const row = (l, showStatus) => (
    <li key={l.topic}>
      <Link to={`/lesson/${encodeURIComponent(l.topic)}`} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-ink no-underline hover:bg-sunken">
        <span className="font-medium">{capitalize(l.title)}</span>
        {showStatus && statusOf[l.topic] && <StatusBadge status={statusOf[l.topic]} />}
      </Link>
    </li>
  );

  return (
    <div className="page">
      <PageHeader
        title="Lessons"
        lead="Short, plain-language lessons. Every lesson can be read, listened to with the Listen button, or downloaded as a transcript."
      />
      {error && <Notice tone="danger" className="mb-6" title="Could not load the lessons">{error}</Notice>}

      <div className="mb-8 max-w-md">
        <label htmlFor="lesson-filter" className="label">Find a lesson</label>
        <input id="lesson-filter" type="search" className="input" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="For example: neural networks" />
      </div>

      {planTopics.length > 0 && (
        <section aria-labelledby="mine-title" className="mb-10">
          <h2 id="mine-title" className="section-title">In your plan</h2>
          {mine.length ? <ul className="mt-2 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">{mine.map((l) => row(l, true))}</ul>
            : <p className="mt-2 text-muted">No lesson in your plan matches “{filter}”.</p>}
        </section>
      )}

      <section aria-labelledby="all-title">
        <h2 id="all-title" className="section-title">{planTopics.length ? 'Other lessons' : 'All lessons'}</h2>
        {others.length ? <ul className="mt-2 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">{others.map((l) => row(l, false))}</ul>
          : <p className="mt-2 text-muted">{filter ? `No lesson matches “${filter}”.` : 'No other lessons.'}</p>}
      </section>
    </div>
  );
}
