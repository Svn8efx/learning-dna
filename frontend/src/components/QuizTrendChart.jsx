import React from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useThemeColors } from '../hooks/useThemeColors';

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="font-semibold">Attempt {p.attempt}</div>
      <div>{p.avg_score}% average</div>
      {p.date && <div className="text-muted">{p.date}</div>}
    </div>
  );
}

/** Average quiz score for each attempt. The same numbers are always shown in a table next to it. */
export default function QuizTrendChart({ trend, height = 240 }) {
  const c = useThemeColors();
  return (
    <div style={{ height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid stroke={c.line} strokeDasharray="3 3" />
          <XAxis dataKey="attempt" stroke={c.muted} tick={{ fill: c.muted, fontSize: 12 }} allowDecimals={false}
            label={{ value: 'Quiz attempt', position: 'insideBottom', offset: -12, fill: c.muted, fontSize: 12 }} />
          <YAxis domain={[0, 100]} stroke={c.muted} tick={{ fill: c.muted, fontSize: 12 }} width={44}
            label={{ value: 'Average score (%)', angle: -90, position: 'insideLeft', offset: 8, fill: c.muted, fontSize: 12, style: { textAnchor: 'middle' } }} />
          <Tooltip content={<TrendTooltip />} />
          <Line type="monotone" dataKey="avg_score" stroke={c.accent} strokeWidth={2.5} dot={{ r: 4, fill: c.accent }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
