import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { apiFetch } from '../utils/api';

/** Logs out after showing the student their code, so they can always come back. */
export default function LogoutButton({ className = 'btn btn-secondary' }) {
  const [busy, setBusy] = useState(false);

  const logOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let code;
      try {
        code = (await apiFetch('/api/account/code')).code;
      } catch (err) {
        window.alert('We could not get your code, so you were not logged out. Please try again in a moment.');
        return;
      }
      const ok = window.confirm(
        `Your code is: ${code}\n\nWrite it down or copy it. You need it to continue later.\n\nLog out now?`
      );
      if (!ok) return;
      await apiFetch('/api/account/logout', { method: 'POST' });
      sessionStorage.clear();
      window.location.assign('/');
    } catch (err) {
      window.alert(err.message || 'Could not log out. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className={className} onClick={logOut} disabled={busy}>
      <LogOut size={16} aria-hidden="true" /> Log out
    </button>
  );
}
