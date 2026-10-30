import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Lock, Circle, CircleDot, Check } from 'lucide-react';

/** Page title block: one clear h1, an optional one-sentence lead, and optional actions on the right. */
export function PageHeader({ title, lead, actions, eyebrow, id }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 id={id} className="page-title">{title}</h1>
        {lead && <p className="page-lead">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const NOTICE_ICONS = { info: Info, warning: AlertTriangle, danger: AlertCircle, success: CheckCircle2 };

/** Inline message. Errors use role="alert" so screen readers announce them straight away. */
export function Notice({ tone = 'info', title, children, className = '' }) {
  const Icon = NOTICE_ICONS[tone] || Info;
  return (
    <div className={`notice notice-${tone} ${className}`} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-0.5' : ''}>{children}</div>
      </div>
    </div>
  );
}

/** Empty state: says what is missing, why, and the one thing to do next. */
export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="panel panel-pad flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
      {Icon && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon size={20} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-ink">{title}</h2>
        {children && <p className="mt-1 text-sm text-muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}

/** Accessible progress bar with a text value next to it (never colour alone). */
export function Meter({ value = 0, label, tone, className = '' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      className={`meter ${tone ? `meter-${tone}` : ''} ${className}`}
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Learning-path step status. The label and the icon both carry the meaning. */
export const STATUS = {
  completed:     { label: 'Completed',   tone: 'success', icon: Check },
  'in-progress': { label: 'In progress', tone: 'warning', icon: CircleDot },
  recommended:   { label: 'Not started', tone: 'accent',  icon: Circle },
  locked:        { label: 'Locked',      tone: 'neutral', icon: Lock },
};

export function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.locked;
  const Icon = cfg.icon;
  return (
    <span className={`badge badge-${cfg.tone}`}>
      <Icon size={12} aria-hidden="true" /> {cfg.label}
    </span>
  );
}

/** Score band used for quiz results. The thresholds match the backend's weak (<45) and strong (>=75) rules. */
export function scoreBand(pct) {
  if (pct >= 75) return { label: 'Strong', tone: 'success' };
  if (pct >= 45) return { label: 'Developing', tone: 'warning' };
  return { label: 'Needs review', tone: 'danger' };
}

export function ScoreBadge({ pct }) {
  const band = scoreBand(pct);
  return <span className={`badge badge-${band.tone}`}>{band.label}</span>;
}

export function capitalize(text = '') {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}
