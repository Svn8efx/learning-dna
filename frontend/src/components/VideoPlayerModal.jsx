import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

const YOUTUBE_ID_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([A-Za-z0-9_-]{11})/;

function parseYouTubeId(url) {
  if (!url) return null;
  const match = url.match(YOUTUBE_ID_REGEX);
  return match ? match[1] : null;
}

export default function VideoPlayerModal({ open, video, onClose, onWatchUpdate, topic }) {
  const [watchedPct, setWatchedPct] = useState(0);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const { prefs, logEvent } = useAccessibility();
  const videoId = parseYouTubeId(video?.url || '');

  useEffect(() => {
    if (!open) {
      setWatchedPct(0);
      return undefined;
    }
    closeRef.current?.focus();
    logEvent('video_start', topic || '');
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll('button, a[href], iframe');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open || !video) return null;

  const handleMarkWatch = (pct) => {
    // Only what the learner reports is sent. The page cannot see the real playback time, so it does not invent one.
    setWatchedPct(pct);
    onWatchUpdate({ watched_pct: pct, event: pct >= 80 ? 'complete' : 'progress' });
  };

  const captionParams = prefs.captions ? '&cc_load_policy=1&cc_lang_pref=en&hl=en' : '';

  return (
    <div className="a11y-backdrop" style={{ zIndex: 50 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="video-dialog-title" className="a11y-dialog" style={{ maxWidth: '56rem', padding: 0 }}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id="video-dialog-title" className="text-base font-semibold">Video player</h2>
            <p className="truncate text-sm text-muted">{video?.title}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="btn btn-secondary btn-sm"><X size={16} aria-hidden="true" /> Close</button>
        </div>

        <div className="p-5">
          {videoId ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-line bg-black">
              <iframe
                title={video.title}
                src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1${captionParams}`}
                allow="encrypted-media"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-line bg-sunken p-6 text-center">
              <p className="mb-3 text-sm text-muted">This video cannot be played inside the page.</p>
              <a href={video.url} target="_blank" rel="noreferrer" className="btn btn-secondary">Open on the original site <span className="sr-only">(opens in a new tab)</span></a>
            </div>
          )}

          <div className="mt-5">
            <p className="text-sm font-medium">Track your progress</p>
            <p className="hint mt-0.5">The page cannot see how much you watched, so tell it yourself.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button type="button" onClick={() => handleMarkWatch(40)} className="btn btn-secondary">Mark 40% watched</button>
              <button type="button" onClick={() => handleMarkWatch(80)} className="btn btn-secondary">Mark 80% watched</button>
              <button type="button" onClick={() => handleMarkWatch(100)} className="btn btn-primary">Mark completed</button>
            </div>
            {watchedPct > 0 && <p role="status" className="mt-2 text-sm text-success">Marked {watchedPct}% watched.</p>}
          </div>

          <div className="mt-5 space-y-1 text-sm text-muted">
            <p>
              {prefs.captions
                ? 'Captions are requested, but they only show if the video has them.'
                : 'Turn on "Video captions" in Accessibility settings to request captions.'}
            </p>
            <p>
              Prefer text? <Link to={topic ? `/lesson/${encodeURIComponent(topic)}` : '/lessons'} onClick={onClose}>Open the text lesson</Link>, which can also be read aloud.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
