import React, { useCallback, useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiFetch } from '../utils/api';

const SETTING_NAMES = {
  high_contrast: 'High contrast', text_to_speech: 'Listen controls', captions: 'Video captions',
  visual_alerts: 'On-screen alerts', large_targets: 'Large buttons', keyboard_mode: 'Keyboard shortcuts',
  reduce_motion: 'Reduce motion', voice_commands: 'Voice commands',
};

function Stat({ label, value }) {
  return (
    <div className="glass-card p-4">
      <dt className="text-xs text-slate-300">{label}</dt>
      <dd className="font-display font-bold text-2xl text-white">{value}</dd>
    </div>
  );
}

export default function ProgressPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    apiFetch('/api/monitor/summary').then((d) => setSummary(d.summary)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);      // refresh quietly every 15 seconds
    return () => clearInterval(timer);
  }, [load]);

  if (error) return <div className="max-w-5xl mx-auto px-6 py-10"><p role="alert" className="text-red-300">{error}</p></div>;
  if (!summary) return <div className="max-w-5xl mx-auto px-6 py-10 text-slate-300" role="status">Loading progress...</div>;

  const { engagement, accessibility_usage: usage, quiz_trend: trend, progress, personalisation_effect: effect, insights } = summary;
  const activeSettings = Object.entries(usage.current_settings).filter(([k, v]) => SETTING_NAMES[k] && v).map(([k]) => SETTING_NAMES[k]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <header>
        <h1 className="font-display font-bold text-3xl text-white mb-1">My progress</h1>
        <p className="text-slate-300 text-sm">Updates about every 15 seconds while this page is open.</p>
      </header>

      <section aria-labelledby="insights-title" className="glass-card p-5">
        <h2 id="insights-title" className="font-display font-semibold text-white text-lg mb-2">Suggestions for you</h2>
        <ul className="list-disc pl-5 text-slate-100 space-y-1">{insights.map((t) => <li key={t}>{t}</li>)}</ul>
      </section>

      <section aria-labelledby="engagement-title">
        <h2 id="engagement-title" className="font-display font-semibold text-white text-lg mb-3">Engagement</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Days active" value={engagement.active_days} />
          <Stat label="Lessons viewed" value={engagement.lessons_viewed} />
          <Stat label="Pages visited" value={engagement.page_views} />
          <Stat label="Learning score" value={progress.learning_score !== undefined ? `${progress.learning_score}%` : 'Not yet'} />
        </dl>
      </section>

      <section aria-labelledby="quiz-title">
        <h2 id="quiz-title" className="font-display font-semibold text-white text-lg mb-3">Quiz performance</h2>
        {trend.length === 0 ? <p className="text-slate-300">No quiz attempts yet.</p> : (
          <>
            <div className="glass-card p-4 mb-3" aria-hidden="true" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
                  <XAxis dataKey="attempt" stroke="#cbd5e1" label={{ value: 'Attempt', position: 'insideBottom', offset: -2, fill: '#cbd5e1' }} />
                  <YAxis domain={[0, 100]} stroke="#cbd5e1" />
                  <Tooltip />
                  <Line type="monotone" dataKey="avg_score" stroke="#2dd4bf" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <table className="text-sm text-slate-100 w-full">
              <caption className="text-left text-slate-300 mb-1">Quiz attempts (the same data as the chart)</caption>
              <thead><tr><th scope="col" className="text-left py-1">Attempt</th><th scope="col" className="text-left">Date</th><th scope="col" className="text-left">Average score</th><th scope="col" className="text-left">Accessibility settings on</th></tr></thead>
              <tbody>{trend.map((a) => (
                <tr key={a.attempt}><th scope="row" className="text-left font-normal py-1">{a.attempt}</th><td>{a.date}</td><td>{a.avg_score}%</td><td>{a.personalised ? 'Yes' : 'No'}</td></tr>
              ))}</tbody>
            </table>
          </>
        )}
      </section>

      <section aria-labelledby="a11y-usage-title">
        <h2 id="a11y-usage-title" className="font-display font-semibold text-white text-lg mb-3">How you use accessibility features</h2>
        <p className="text-slate-100 mb-3">
          Settings on now: {activeSettings.length ? activeSettings.join(', ') : 'none'}. Text size: {usage.current_settings.font_scale}%.
        </p>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Times you used Listen" value={usage.text_to_speech_uses} />
          <Stat label="Voice commands" value={usage.voice_commands_used} />
          <Stat label="Keyboard shortcuts" value={usage.keyboard_shortcuts_used} />
          <Stat label="Settings changes" value={Object.values(usage.setting_changes).reduce((a, b) => a + b, 0)} />
        </dl>
      </section>

      <section aria-labelledby="effect-title" className="glass-card p-5">
        <h2 id="effect-title" className="font-display font-semibold text-white text-lg mb-2">Does personalisation help you?</h2>
        {effect.status === 'available' ? (
          <p className="text-slate-100">
            With accessibility settings on your average quiz score was {effect.with_personalisation}%; without them it was {effect.without_personalisation}%
            (difference {effect.difference > 0 ? '+' : ''}{effect.difference} points). {effect.note}
          </p>
        ) : <p className="text-slate-100">{effect.note}</p>}
      </section>
    </div>
  );
}
