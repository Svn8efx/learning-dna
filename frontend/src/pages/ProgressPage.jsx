import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import LoadingScreen from '../components/LoadingScreen';
import QuizTrendChart from '../components/QuizTrendChart';
import { PageHeader, Notice } from '../components/ui';

const SETTING_NAMES = {
  high_contrast: 'High contrast', text_to_speech: 'Listen controls', captions: 'Video captions',
  visual_alerts: 'On-screen alerts', large_targets: 'Large buttons', keyboard_mode: 'Keyboard shortcuts',
  reduce_motion: 'Reduce motion', voice_commands: 'Voice commands',
};

function Fact({ label, value, note }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
      {note && <dd className="mt-1 text-sm text-muted">{note}</dd>}
    </div>
  );
}

export default function ProgressPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    apiFetch('/api/monitor/summary').then((d) => { setSummary(d.summary); setError(''); }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);      // refresh quietly every 15 seconds
    return () => clearInterval(timer);
  }, [load]);

  if (error && !summary) {
    return (
      <div className="page-narrow">
        <PageHeader title="Progress" />
        <Notice tone="danger" title="Your progress could not be loaded">{error}</Notice>
        <button type="button" className="btn btn-secondary mt-4" onClick={() => { setError(''); load(); }}>Try again</button>
      </div>
    );
  }
  if (!summary) return <LoadingScreen label="Loading your progress" />;

  const { engagement, accessibility_usage: usage, quiz_trend: trend, progress, personalisation_effect: effect, insights } = summary;
  const activeSettings = Object.entries(usage.current_settings).filter(([k, v]) => SETTING_NAMES[k] && v).map(([k]) => SETTING_NAMES[k]);
  const changes = Object.values(usage.setting_changes).reduce((a, b) => a + b, 0);

  return (
    <div className="page">
      <PageHeader title="Progress" lead="What you have done and how your quiz scores are changing. This page updates about every 15 seconds while it is open." />

      {insights?.length > 0 && (
        <section aria-labelledby="insights-title" className="mb-10 rounded-xl border border-line bg-surface p-5">
          <h2 id="insights-title" className="section-title">Suggestions for you</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-ink">{insights.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      )}

      <section aria-labelledby="quiz-title" className="mb-12">
        <h2 id="quiz-title" className="section-title">Quiz performance</h2>
        {trend.length === 0 ? (
          <p className="mt-3 text-muted">No quiz attempts yet. <Link to="/quiz">Take the quiz</Link> and your results will appear here.</p>
        ) : (
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              {trend.length >= 2
                ? <QuizTrendChart trend={trend} />
                : <p className="rounded-lg border border-line bg-sunken p-4 text-sm text-muted">One attempt so far. A chart needs at least two attempts, so take a new quiz after some study to see how you are changing.</p>}
              <p className="mt-2 text-sm text-muted">Each point is the average score across all topics in one quiz attempt, from 0% to 100%.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <caption className="mb-2 text-left text-sm text-muted">The same numbers as a table</caption>
                <thead><tr><th scope="col">Attempt</th><th scope="col">Date</th><th scope="col">Average score</th><th scope="col">Settings on</th></tr></thead>
                <tbody>{trend.map((a) => (
                  <tr key={a.attempt}>
                    <th scope="row">{a.attempt}</th>
                    <td>{a.date}</td><td className="tabular-nums">{a.avg_score}%</td><td>{a.personalised ? 'Yes' : 'No'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="engagement-title" className="mb-12">
        <h2 id="engagement-title" className="section-title">Your activity</h2>
        <dl className="mt-4 grid grid-cols-2 gap-8 md:grid-cols-4">
          <Fact label="Days active" value={engagement.active_days} />
          <Fact label="Lessons viewed" value={engagement.lessons_viewed} />
          <Fact label="Pages visited" value={engagement.page_views} />
          <Fact label="Learning score" value={progress.learning_score !== undefined ? `${progress.learning_score}%` : 'Not yet'} />
        </dl>
        <p className="mt-4 max-w-2xl text-sm text-muted">
          The learning score combines your quiz average (60%), your progress along the path (30%), and small bonuses for finishing steps and taking more quiz attempts. It is capped at 100%.
        </p>
      </section>

      <section aria-labelledby="a11y-usage-title" className="mb-12">
        <h2 id="a11y-usage-title" className="section-title">How you use the accessibility features</h2>
        <p className="mt-2 text-ink">
          Settings on now: {activeSettings.length ? activeSettings.join(', ') : 'none'}. Text size: {usage.current_settings.font_scale}%.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-8 md:grid-cols-4">
          <Fact label="Times you used Listen" value={usage.text_to_speech_uses} />
          <Fact label="Voice commands" value={usage.voice_commands_used} />
          <Fact label="Keyboard shortcuts" value={usage.keyboard_shortcuts_used} />
          <Fact label="Settings changes" value={changes} />
        </dl>
      </section>

      <section aria-labelledby="effect-title" className="rounded-xl border border-line bg-surface p-5">
        <h2 id="effect-title" className="section-title">Do your settings help?</h2>
        {effect.status === 'available' ? (
          <p className="mt-2 text-ink">
            With accessibility settings on, your average quiz score was {effect.with_personalisation}%. Without them it was {effect.without_personalisation}%
            (a difference of {effect.difference > 0 ? '+' : ''}{effect.difference} points). {effect.note}
          </p>
        ) : <p className="mt-2 text-ink">{effect.note}</p>}
      </section>
    </div>
  );
}
