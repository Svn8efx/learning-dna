import React, { useEffect, useState } from 'react';

/**
 * Centered loading state. Announced to screen readers, and honest about slow first loads:
 * the free server sleeps when nobody uses it, so the first visit can take up to a minute.
 */
export default function LoadingScreen({ label = 'Loading', slowAfterMs = 6000 }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), slowAfterMs);
    return () => clearTimeout(timer);
  }, [slowAfterMs]);

  return (
    <div className="flex min-h-[55vh] items-center justify-center px-6 py-10">
      <div className="max-w-sm text-center" role="status" aria-live="polite">
        <div className="spinner mx-auto mb-5" aria-hidden="true" />
        <p className="text-lg font-semibold text-ink">{label}</p>
        <p className="mt-2 text-sm text-muted">
          {slow
            ? 'This is taking longer than usual. The server may be waking up, which can take up to a minute on the first visit. Please keep this page open.'
            : 'Just a moment.'}
        </p>
      </div>
    </div>
  );
}
