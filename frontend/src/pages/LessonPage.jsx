import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Download, Volume2, VolumeX } from 'lucide-react';
import LoadingScreen from '../components/LoadingScreen';
import RichText from '../components/RichText';
import { apiFetch } from '../utils/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { useFlaskData } from '../hooks/useFlaskData';
import { Notice, StatusBadge, capitalize } from '../components/ui';

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function LessonPage() {
  const { topic } = useParams();
  const [lesson, setLesson] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { speak, stopSpeaking, speaking, speechSupported, announce } = useAccessibility();
  const { learningPath, profile, refresh } = useFlaskData();

  useEffect(() => {
    setLesson(null);
    setError('');
    setSaveError('');
    apiFetch(`/api/content/${encodeURIComponent(topic)}`)
      .then((d) => setLesson(d.lesson))
      .catch((e) => setError(e.message));
    return stopSpeaking;
  }, [topic]);

  useEffect(() => {
    apiFetch('/api/content').then((d) => setLessons(d.lessons || [])).catch(() => setLessons([]));
  }, []);

  // Previous and next follow the learner's plan order when the topic is in the plan, otherwise the full lesson list
  const { prev, next } = useMemo(() => {
    const planTopics = profile?.topics || [];
    const list = planTopics.includes(topic) ? planTopics.map((t) => lessons.find((l) => l.topic === t)).filter(Boolean) : lessons;
    const i = list.findIndex((l) => l.topic === topic);
    return { prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null };
  }, [lessons, profile, topic]);

  const step = learningPath.find((s) => s.topic === topic);

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

  const markCompleted = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await apiFetch('/api/path/step/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, status: 'completed' }),
      });
      await refresh();
      announce(`${capitalize(topic)} marked as completed`);
    } catch (err) {
      setSaveError(err.message || 'Could not update your path.');
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="page-narrow">
        <Notice tone="danger" title="This lesson could not be loaded">{error}</Notice>
        <Link to="/lessons" className="btn btn-secondary mt-4">Back to lessons</Link>
      </div>
    );
  }
  if (!lesson) return <LoadingScreen label="Loading the lesson" />;

  return (
    <article className="page grid gap-10 lg:grid-cols-[1fr_15rem]">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link to="/lessons">Lessons</Link> <span aria-hidden="true">/</span> <span aria-current="page">{lesson.title}</span>
        </nav>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{lesson.title}</h1>
        <p className="mt-2 text-muted">About {lesson.reading_minutes} minute{lesson.reading_minutes > 1 ? 's' : ''} to read or listen to.</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {speechSupported && (speaking
            ? <button type="button" className="btn btn-secondary" onClick={stopSpeaking}><VolumeX size={16} aria-hidden="true" /> Stop listening</button>
            : <button type="button" className="btn btn-primary" onClick={() => speak(lesson.transcript, lesson.topic)}><Volume2 size={16} aria-hidden="true" /> Listen to this lesson</button>)}
          <button type="button" className="btn btn-secondary" onClick={downloadTranscript}><Download size={16} aria-hidden="true" /> Download transcript</button>
        </div>

        <div className="mt-10 space-y-10">
          {lesson.sections.map((s) => (
            <section key={s.heading} id={slug(s.heading)} aria-labelledby={`h-${slug(s.heading)}`} className="scroll-mt-40">
              <h2 id={`h-${slug(s.heading)}`} className="text-xl font-semibold tracking-tight">{s.heading}</h2>
              <div className="reading mt-3">
                {s.text && <RichText text={s.text} />}
                {s.items && <ol className="list-decimal space-y-3 pl-6">{s.items.map((i) => <li key={i}>{i}</li>)}</ol>}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 border-t border-line pt-6">
          {step ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink">Your progress on this topic</p>
                <p className="mt-1"><StatusBadge status={step.status} /></p>
              </div>
              {step.status === 'completed' ? (
                <p className="flex items-center gap-1.5 text-success"><Check size={16} aria-hidden="true" /> Completed</p>
              ) : step.status === 'locked' ? (
                <p className="max-w-xs text-sm text-muted">This topic is still locked on your <Link to="/path">learning path</Link>. Complete the topic before it first.</p>
              ) : (
                <button type="button" className="btn btn-primary" onClick={markCompleted} disabled={saving}>{saving ? 'Saving...' : 'Mark this topic completed'}</button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">This topic is not in your study plan. <Link to="/start">Add it to your plan</Link> to track it.</p>
          )}
          {saveError && <Notice tone="danger" className="mt-3">{saveError}</Notice>}
        </div>

        <nav aria-label="Lesson navigation" className="mt-8 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link to={`/lesson/${encodeURIComponent(prev.topic)}`} className="btn btn-secondary justify-start"><ArrowLeft size={16} aria-hidden="true" /><span><span className="block text-xs text-muted">Previous</span>{capitalize(prev.title)}</span></Link>
          ) : <span />}
          {next ? (
            <Link to={`/lesson/${encodeURIComponent(next.topic)}`} className="btn btn-secondary justify-end text-right"><span><span className="block text-xs text-muted">Next</span>{capitalize(next.title)}</span><ArrowRight size={16} aria-hidden="true" /></Link>
          ) : <span />}
        </nav>
      </div>

      <aside aria-label="On this page" className="hidden lg:block">
        <div className="sticky top-36">
          <p className="eyebrow">On this page</p>
          <ul className="mt-3 space-y-2 border-l border-line pl-4 text-sm">
            {lesson.sections.map((s) => <li key={s.heading}><a href={`#${slug(s.heading)}`} className="text-muted no-underline hover:text-ink hover:underline">{s.heading}</a></li>)}
          </ul>
          <Link to="/path" className="mt-6 inline-block text-sm">Back to my path</Link>
        </div>
      </aside>
    </article>
  );
}
