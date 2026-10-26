import React, { useEffect, useState } from 'react';

/**
 * Centered loading state. Announced to screen readers, honest about slow first loads
 * (the free server sleeps when nobody uses it, so the first visit can take up to a minute).
 */
export default function LoadingScreen({ label = 'Loading', slowAfterMs = 6000 }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), slowAfterMs);
    return () => clearTimeout(timer);
  }, [slowAfterMs]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-10">
      <div className="text-center max-w-sm" role="status" aria-live="polite">
        <div className="dna-spinner mx-auto mb-5" aria-hidden="true" />
        <p className="font-display font-semibold text-white text-lg">{label}</p>
        <p className="text-slate-300 text-sm mt-2">
          {slow
            ? 'This is taking a little longer than usual. The server may be waking up, which can take up to a minute on the first visit. Please keep this page open.'
            : 'Just a moment.'}
        </p>
      </div>
    </div>
  );
}
