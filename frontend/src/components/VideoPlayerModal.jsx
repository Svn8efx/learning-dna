import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccessibility } from '../context/AccessibilityContext';

const YOUTUBE_ID_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([A-Za-z0-9_-]{11})/;

function parseYouTubeId(url) {
  if (!url) return null;
  const match = url.match(YOUTUBE_ID_REGEX);
  return match ? match[1] : null;
}

export default function VideoPlayerModal({ open, video, onClose, onWatchUpdate, topic }) {
  const [watchedPct, setWatchedPct] = useState(0);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const closeRef = useRef(null);
  const { prefs, logEvent } = useAccessibility();
  const videoId = parseYouTubeId(video?.url || '');

  useEffect(() => {
    if (!open) {
      setWatchedPct(0);
      setWatchedSeconds(0);
      return undefined;
    }
    closeRef.current?.focus();
    logEvent('video_start', topic || '');
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open || !video) {
    return null;
  }

  const handleMarkWatch = (pct) => {
    const seconds = Math.max(watchedSeconds, Math.round((pct / 100) * 240));
    setWatchedPct(pct);
    setWatchedSeconds(seconds);
    onWatchUpdate({ watched_seconds: seconds, watched_pct: pct, event: pct >= 80 ? 'complete' : 'progress' });
  };

  const captionParams = prefs.captions ? '&cc_load_policy=1&cc_lang_pref=en&hl=en' : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
      <div role="dialog" aria-modal="true" aria-labelledby="video-dialog-title" className="w-full max-w-4xl rounded-3xl bg-slate-950 border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 id="video-dialog-title" className="text-sm font-semibold text-white">Video player</h2>
            <div className="text-xs text-slate-300">{video?.title}</div>
          </div>
          <button ref={closeRef} onClick={onClose} className="btn-cyber">Close</button>
        </div>
        <div className="bg-black/95 p-4">
          {videoId ? (
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10">
              <iframe
                title={video.title}
                src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1${captionParams}`}
                allow="encrypted-media"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 text-center text-slate-300">
              <div className="mb-3 text-sm">This video cannot be embedded inside the player.</div>
              <a href={video.url} target="_blank" rel="noreferrer" className="btn-cyber">Open on external site <span className="sr-only">(opens in a new tab)</span></a>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 border-t border-white/10">
          <button onClick={() => handleMarkWatch(40)} className="btn-cyber">Mark 40% watched</button>
          <button onClick={() => handleMarkWatch(80)} className="btn-cyber-solid">Mark 80% watched</button>
          <button onClick={() => handleMarkWatch(100)} className="btn-cyber">Mark Completed</button>
        </div>
        <div className="px-5 pb-5 text-xs text-slate-300 space-y-1">
          <p>
            {prefs.captions
              ? 'Captions are requested, but they only show if the video has them.'
              : 'Turn on "Video captions" in Accessibility settings to request captions.'}
          </p>
          <p>
            Prefer text? <Link to={topic ? `/lesson/${encodeURIComponent(topic)}` : '/lessons'} onClick={onClose} className="underline text-teal-300">Open the text lesson</Link>, which can also be read aloud.
          </p>
          {watchedPct > 0 && <p role="status">Marked {watchedPct}% watched.</p>}
        </div>
      </div>
    </div>
  );
}
