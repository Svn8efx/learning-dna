import { useCallback, useEffect, useMemo, useState } from 'react';

// Which notifications this browser has seen, read or deleted. The server builds the list; this only remembers choices.
const KEY = 'learning_dna_notifications_v1';
const LIMIT = 200;

const clean = (list) => (Array.isArray(list) ? list.filter((id) => typeof id === 'string').slice(-LIMIT) : []);
const withIds = (state, ids) => [...state, ...ids.filter((id) => !state.includes(id))].slice(-LIMIT);

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return { seen: clean(saved && saved.seen), read: clean(saved && saved.read), dismissed: clean(saved && saved.dismissed) };
  } catch {
    return { seen: [], read: [], dismissed: [] };
  }
}

export function useNotificationState(incoming) {
  const [state, setState] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: choices last until the tab closes */ }
  }, [state]);

  const items = useMemo(() => incoming
    .map((n) => ({ ...n, id: n.id || `${n.title}|${n.message}` }))
    .filter((n) => !state.dismissed.includes(n.id))
    .map((n) => ({ ...n, read: state.read.includes(n.id), seen: state.seen.includes(n.id) })), [incoming, state]);

  const newCount = items.filter((n) => !n.seen && !n.read).length;   // the number on the bell: not looked at yet
  const unreadCount = items.filter((n) => !n.read).length;            // not opened and not marked as read

  const markSeen = useCallback(() => setState((s) => {
    const ids = items.map((n) => n.id).filter((id) => !s.seen.includes(id));
    return ids.length ? { ...s, seen: withIds(s.seen, ids) } : s;
  }), [items]);

  const markRead = useCallback((id) => setState((s) => ({ ...s, seen: withIds(s.seen, [id]), read: withIds(s.read, [id]) })), []);

  const markAllRead = useCallback(() => setState((s) => {
    const ids = items.map((n) => n.id);
    return { ...s, seen: withIds(s.seen, ids), read: withIds(s.read, ids) };
  }), [items]);

  const dismiss = useCallback((id) => setState((s) => ({ ...s, dismissed: withIds(s.dismissed, [id]) })), []);

  return { items, newCount, unreadCount, markSeen, markRead, markAllRead, dismiss };
}
