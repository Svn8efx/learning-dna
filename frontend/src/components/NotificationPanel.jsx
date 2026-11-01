import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck, Trash2, X } from 'lucide-react';

/** The floating notifications panel: open one, mark them all as read, or delete one. */
export default function NotificationPanel({ panelRef, items, unreadCount, onClose, onOpen, onReadAll, onDelete }) {
  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      aria-label="Notifications"
      className="absolute right-4 top-2 z-50 w-[min(26rem,calc(100vw-2rem))] rounded-lg border border-line-strong bg-surface p-3 shadow-lg outline-none sm:right-6 lg:right-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2 className="whitespace-nowrap text-sm font-semibold">Notifications</h2>
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-ghost btn-sm whitespace-nowrap" onClick={onReadAll} disabled={unreadCount === 0}>
            <CheckCheck size={16} aria-hidden="true" /> Mark all read
          </button>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close notifications">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      {unreadCount > 0 && <p className="-mt-1 text-xs text-muted">{unreadCount} unread</p>}

      {items.length ? (
        <ul className="mt-1 max-h-72 divide-y divide-line overflow-y-auto">
          {items.map((n) => {
            const body = (
              <>
                <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-accent'}`} />
                <span className="min-w-0">
                  {!n.read && <span className="sr-only">Unread. </span>}
                  <span className={`block ${n.read ? 'font-medium text-muted' : 'font-semibold text-ink'}`}>{n.title}</span>
                  <span className="block break-words text-muted">{n.message}</span>
                </span>
              </>
            );
            return (
              <li key={n.id} className="flex items-start gap-1 py-1 text-sm">
                {n.href ? (
                  <Link to={n.href} onClick={() => onOpen(n.id)} className="flex min-w-0 flex-1 gap-2 rounded-lg px-2 py-2 text-ink no-underline hover:bg-sunken">{body}</Link>
                ) : (
                  <div className="flex min-w-0 flex-1 gap-2 px-2 py-2">{body}</div>
                )}
                <button type="button" className="btn btn-ghost btn-icon shrink-0" onClick={() => onDelete(n.id)} aria-label={`Delete notification: ${n.title}`}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : <p className="mt-2 text-sm text-muted">You are all caught up. New notifications will appear here.</p>}
    </section>
  );
}
