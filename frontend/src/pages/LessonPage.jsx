import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAccessibility } from '../context/AccessibilityContext';

export default function LessonPage() {
  const { topic } = useParams();
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState('');
  const { speak, stopSpeaking, speaking, speechSupported, announce } = useAccessibility();

  useEffect(() => {
    setLesson(null);
    setError('');
    apiFetch(`/api/content/${encodeURIComponent(topic)}`)
      .then((d) => setLesson(d.lesson))
      .catch((e) => setError(e.message));
    return stopSpeaking;
  }, [topic]);

  const downloadTranscript = () => {
    const blob = new Blob([lesson.transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lesson.topic.replace(/\s+/g, '-')}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
    announce('Transcript downloaded');
  };

  if (error) return <div className="max-w-3xl mx-auto px-6 py-10"><p role="alert" className="text-red-300">{error}</p><Link to="/lessons" className="btn-cyber mt-4 inline-block">Back to lessons</Link></div>;
  if (!lesson) return <div className="max-w-3xl mx-auto px-6 py-10 text-slate-300" role="status">Loading lesson...</div>;

  return (
    <article className="max-w-3xl mx-auto px-6 py-10">
      <Link to="/lessons" className="text-sm text-teal-300 underline">All lessons</Link>
      <h1 className="font-display font-bold text-3xl text-white mt-2 mb-1">{lesson.title}</h1>
      <p className="text-sm text-slate-300 mb-5">About {lesson.reading_minutes} minute{lesson.reading_minutes > 1 ? 's' : ''} to read or listen.</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {speechSupported && (speaking
          ? <button type="button" className="btn-cyber flex items-center gap-2" onClick={stopSpeaking}><VolumeX size={16} /> Stop listening</button>
          : <button type="button" className="btn-cyber-solid flex items-center gap-2" onClick={() => speak(lesson.transcript, lesson.topic)}><Volume2 size={16} /> Listen to this lesson</button>)}
        <button type="button" className="btn-cyber" onClick={downloadTranscript}>Download transcript</button>
        <Link to="/path" className="btn-cyber">Back to my path</Link>
      </div>

      {lesson.sections.map((s) => (
        <section key={s.heading} className="glass-card p-5 mb-4">
          <h2 className="font-display font-semibold text-white text-lg mb-2">{s.heading}</h2>
          {s.text && <p className="text-slate-100 leading-relaxed">{s.text}</p>}
          {s.items && <ol className="list-decimal pl-5 text-slate-100 space-y-2 leading-relaxed">{s.items.map((i) => <li key={i}>{i}</li>)}</ol>}
        </section>
      ))}
    </article>
  );
}
