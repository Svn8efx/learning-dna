import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, CircleDot, Circle, ExternalLink, Layers, Lock, Play, Target, Video } from 'lucide-react';
import { useFlaskData } from '../hooks/useFlaskData';
import { apiFetch } from '../utils/api';
import VideoPlayerModal from '../components/VideoPlayerModal';
import LoadingScreen from '../components/LoadingScreen';
import { PageHeader, Notice, EmptyState, Meter, StatusBadge, STATUS, capitalize } from '../components/ui';

const DOT_ICON = { completed: Check, 'in-progress': CircleDot, recommended: Circle, locked: Lock };

export default function LearningPathPage() {
  const { learningPath, profile, refresh, loaded } = useFlaskData();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [saving, setSaving] = useState(false);
  const [topicResources, setTopicResources] = useState(null);
  const [videoModal, setVideoModal] = useState({ open: false, video: null });
  const [errorMessage, setErrorMessage] = useState('');
  const detailRef = useRef(null);

  const selected = learningPath.find((s) => s.topic === selectedTopic) || null;
  const inPlan = new Set(learningPath.map((s) => s.topic));

  // Open the next useful step first
  useEffect(() => {
    if (selectedTopic) return;
    const rec = learningPath.find((s) => s.status === 'in-progress') || learningPath.find((s) => s.status === 'recommended');
    if (rec) setSelectedTopic(rec.topic);
  }, [learningPath]);

  useEffect(() => {
    if (!selected) { setTopicResources(null); return; }
    setTopicResources(null);
    apiFetch(`/api/path/resources?topic=${encodeURIComponent(selected.topic)}`)
      .then((data) => setTopicResources(data.resources || null))
      .catch(() => setTopicResources(null));
  }, [selectedTopic]);

  const updateStatus = async (topic, status) => {
    setSaving(true);
    setErrorMessage('');
    try {
      await apiFetch('/api/path/step/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, status }),
      });
      await refresh();
    } catch (err) {
      setErrorMessage(err.message || 'Unable to update the step right now.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenVideo = async (video) => {
    setErrorMessage('');
    setVideoModal({ open: true, video });
    if (!video) return;
    try {
      await apiFetch('/api/path/video/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selected.topic, url: video.url, event: 'start' }),
      });
      await refresh();
    } catch (err) {
      setErrorMessage(err.message || 'Unable to start video tracking.');
    }
  };

  const handleTrackVideo = async ({ watched_pct, event }) => {
    if (!selected || !videoModal.video) return;
    try {
      await apiFetch('/api/path/video/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selected.topic, url: videoModal.video.url, watched_pct, event }),
      });
      await refresh();
    } catch (err) {
      setErrorMessage(err.message || 'Unable to track video progress.');
    }
  };

  const handleCourseAction = async (course, action) => {
    if (!selected) return;
    try {
      await apiFetch('/api/path/course/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selected.topic, url: course.url, action }),
      });
      await refresh();
    } catch (err) {
      setErrorMessage(err.message || 'Unable to track course action.');
    }
  };

  if (!loaded) return <LoadingScreen label="Loading your learning path" />;

  if (!learningPath.length) {
    return (
      <div className="page-narrow">
        <PageHeader title="Learning path" lead="Your topics, in the order they unlock." />
        <EmptyState title="You do not have a path yet" action={<Link to="/goals" className="btn btn-primary">Build your plan</Link>}>
          The path is made from the topics in your study plan, so build your plan first.
        </EmptyState>
      </div>
    );
  }

  const counts = Object.keys(STATUS).map((key) => ({ key, n: learningPath.filter((s) => s.status === key).length }));
  const completed = learningPath.filter((s) => s.status === 'completed').length;
  const pct = Math.round((completed / learningPath.length) * 100);
  const resources = topicResources || selected;
  const previous = selected ? learningPath.find((s) => s.order === selected.order - 1) : null;
  const leadsTo = selected ? learningPath.filter((s) => s.prerequisites?.includes(selected.topic)) : [];
  const select = (topic) => setSelectedTopic(selectedTopic === topic ? null : topic);

  return (
    <div className="page">
      <PageHeader title="Learning path" lead="Your topics, in the order they unlock. Open a topic to see what it needs, what comes after it, and what to study." />

      <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
        <ol className="timeline order-2 lg:order-1" aria-label="Your learning path, step by step">
          {learningPath.map((step) => {
            const Dot = DOT_ICON[step.status] || Lock;
            const open = selected?.topic === step.topic;
            const needs = step.prerequisites || [];
            return (
              <li key={step.topic}>
                <span className="timeline-dot" data-status={step.status} aria-hidden="true"><Dot size={16} /></span>
                <button
                  type="button" onClick={() => select(step.topic)} aria-expanded={open} aria-controls={`step-${step.order}`}
                  className={`w-full rounded-xl border p-3.5 text-left transition-colors ${open ? 'border-accent bg-surface' : 'border-line bg-surface hover:border-line-strong'}`}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-base font-semibold text-ink"><span className="mr-1.5 text-muted">{step.order}.</span>{capitalize(step.topic)}</span>
                    <StatusBadge status={step.status} />
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {needs.length ? <>Needs: <span className="capitalize">{needs.join(', ')}</span></> : 'No prerequisites'}
                    {step.level ? <> · Suggested level: {step.level}</> : null}
                  </span>
                </button>

                {open && (
                  <div id={`step-${step.order}`} ref={detailRef} className="mt-2 rounded-xl border border-accent/40 bg-surface p-5">
                    <div className="space-y-5">
                      {step.status === 'locked' && (
                        <Notice tone="info" title="This topic is locked">
                          {previous ? <>It opens after you complete <span className="font-medium capitalize">{previous.topic}</span>.</> : 'It opens after the earlier topics are completed.'} You can still read its lesson.
                        </Notice>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Link to={`/lesson/${encodeURIComponent(step.topic)}`} className="btn btn-primary btn-sm">Open the lesson</Link>
                        <button type="button" disabled={saving || step.status === 'locked' || step.status === 'completed'} onClick={() => updateStatus(step.topic, 'in-progress')} className="btn btn-secondary btn-sm">Mark in progress</button>
                        <button type="button" disabled={saving || step.status === 'locked' || step.status === 'completed'} onClick={() => updateStatus(step.topic, 'completed')} className="btn btn-secondary btn-sm">Mark completed</button>
                      </div>
                      <p className="-mt-2 text-sm text-muted">
                        {step.status === 'completed' ? 'This topic is completed.' : 'Marking a topic completed unlocks the next one. A quiz score of 75% or more also counts as completed.'}
                      </p>
                      {errorMessage && <Notice tone="danger">{errorMessage}</Notice>}

                      <dl className="grid gap-4 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="font-medium text-ink">Before this</dt>
                          <dd className="mt-1 text-muted">
                            {needs.length ? needs.map((p, i) => (
                              <span key={p}>{i > 0 && ', '}<span className="capitalize">{p}</span>{inPlan.has(p) ? '' : ' (not in your plan)'}</span>
                            )) : 'Nothing. You can start here.'}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-ink">Leads to</dt>
                          <dd className="mt-1 text-muted">{leadsTo.length ? <span className="capitalize">{leadsTo.map((s) => s.topic).join(', ')}</span> : 'No other topic in your plan depends on this one.'}</dd>
                        </div>
                      </dl>

                      {step.project && (
                        <div>
                          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Target size={15} aria-hidden="true" className="text-accent" /> Mini project</h3>
                          <p className="mt-1 text-sm text-muted">{step.project}</p>
                        </div>
                      )}

                      {resources?.videos?.length > 0 && (
                        <div>
                          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Video size={15} aria-hidden="true" className="text-accent" /> Videos</h3>
                          <ul className="mt-2 space-y-1.5">
                            {resources.videos.map((v, i) => (
                              <li key={i}>
                                <button type="button" onClick={() => handleOpenVideo(v)} className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-sunken">
                                  <Play size={14} aria-hidden="true" className="mt-1 shrink-0 text-accent" />
                                  <span className="min-w-0 text-sm"><span className="block font-medium text-ink">{v.title}</span><span className="text-muted">{v.channel}{v.duration ? ` · ${v.duration}` : ''}</span></span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {resources?.courses?.length > 0 && (
                        <div>
                          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><BookOpen size={15} aria-hidden="true" className="text-accent" /> Courses</h3>
                          <ul className="mt-2 space-y-1.5">
                            {resources.courses.map((c, i) => (
                              <li key={i}>
                                <button type="button" onClick={() => { handleCourseAction(c, 'click'); window.open(c.url, '_blank', 'noopener'); }} className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-sunken">
                                  <ExternalLink size={14} aria-hidden="true" className="mt-1 shrink-0 text-accent" />
                                  <span className="min-w-0 text-sm"><span className="block font-medium text-ink">{c.title}<span className="sr-only"> (opens in a new tab)</span></span><span className="text-muted">{c.provider}{c.rating ? ` · Rating ${c.rating}` : ''}{c.certificate ? ' · Certificate' : ''}</span></span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {resources?.datasets?.length > 0 && (
                        <div>
                          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Layers size={15} aria-hidden="true" className="text-accent" /> Datasets</h3>
                          <ul className="mt-2 space-y-1.5">
                            {resources.datasets.map((ds, i) => (
                              <li key={i}>
                                <a href={ds.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 rounded-lg px-2 py-1.5 no-underline hover:bg-sunken">
                                  <ExternalLink size={14} aria-hidden="true" className="mt-1 shrink-0 text-accent" />
                                  <span className="min-w-0 text-sm"><span className="block font-medium text-ink">{ds.title}<span className="sr-only"> (opens in a new tab)</span></span><span className="text-muted">{ds.source || 'Dataset'}</span></span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        <aside className="order-1 lg:order-2 lg:sticky lg:top-36 lg:self-start" aria-label="Path summary">
          <h2 className="section-title">Progress</h2>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{completed} of {learningPath.length} <span className="text-base font-normal text-muted">completed</span></p>
          <Meter className="mt-3" value={pct} tone="success" label={`${completed} of ${learningPath.length} topics completed`} />
          <ul className="mt-5 space-y-2 text-sm">
            {counts.map(({ key, n }) => (
              <li key={key} className="flex items-center justify-between"><StatusBadge status={key} /><span className="tabular-nums text-muted">{n}</span></li>
            ))}
          </ul>
          <div className="divider mt-5 pt-4 text-sm text-muted">
            <p className="font-medium text-ink">How the path works</p>
            <p className="mt-1">Topics are ordered so that prerequisites come first. The first topic you have not completed is open, and the next ones unlock as you finish the earlier ones. A topic where your quiz score was below 45% is opened early so you can review it. Your plan covers {profile?.topics?.length || learningPath.length} topics.</p>
          </div>
        </aside>
      </div>

      <VideoPlayerModal
        topic={selected?.topic}
        open={videoModal.open}
        video={videoModal.video}
        onClose={() => setVideoModal({ open: false, video: null })}
        onWatchUpdate={handleTrackVideo}
      />
    </div>
  );
}
