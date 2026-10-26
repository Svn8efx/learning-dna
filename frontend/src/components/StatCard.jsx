import React from 'react';

const glowMap = {
  cyan:   'stat-glow-blue  border-teal-400/20',
  purple: 'stat-glow-purple border-teal-400/20',
  green:  'stat-glow-green  border-emerald-400/20',
  pink:   'stat-glow-pink   border-pink-400/20',
  orange: 'border-orange-400/20',
};

const iconBgMap = {
  cyan:   'bg-teal-400/10 text-teal-400',
  purple: 'bg-teal-400/10 text-teal-400',
  green:  'bg-emerald-400/10 text-emerald-400',
  pink:   'bg-pink-400/10 text-pink-400',
  orange: 'bg-orange-400/10 text-orange-400',
};

/** Compact rectangular stat: icon on the left, value and label on the right. `trend` is optional and only shown when real data supplies it. */
export default function StatCard({ icon: Icon, label, value, sub, color = 'cyan', trend, className = '' }) {
  return (
    <div className={`glass-card p-4 border ${glowMap[color]} flex items-center gap-4 ${className}`}>
      <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${iconBgMap[color]}`}>
        <Icon size={20} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="font-display font-bold text-xl text-white leading-tight break-words">
          {value}
          {trend !== undefined && (
            <span className={`ml-2 align-middle text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        <div className="text-slate-300 text-sm">{label}</div>
        {sub && <div className="text-slate-300 text-xs mt-0.5 font-mono break-words">{sub}</div>}
      </div>
    </div>
  );
}
