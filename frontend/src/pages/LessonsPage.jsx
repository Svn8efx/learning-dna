import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';

export default function LessonsPage() {
  const [lessons, setLessons] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/content').then((d) => setLessons(d.lessons || [])).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-display font-bold text-3xl text-white mb-2">Accessible lessons</h1>
      <p className="text-slate-300 mb-6">
        Short text lessons that work with screen readers and the Listen button. Each one can also be used
        as a transcript alongside a video.
      </p>
      {error && <div role="alert" className="text-red-300 text-sm mb-4">{error}</div>}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {lessons.map((l) => (
          <li key={l.topic}>
            <Link to={`/lesson/${encodeURIComponent(l.topic)}`} className="glass-card p-4 block hover:border-teal-400/40 transition">
              <span className="font-display font-semibold text-white">{l.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
