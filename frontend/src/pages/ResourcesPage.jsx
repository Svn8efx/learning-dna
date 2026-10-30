import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FolderOpen, Play, Wrench } from 'lucide-react';
import { useFlaskData } from '../hooks/useFlaskData';
import LoadingScreen from '../components/LoadingScreen';
import { PageHeader, EmptyState, capitalize } from '../components/ui';

function youtubeEmbed(url) {
  if (!url) return '';
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : '';
}

const TYPE_LABEL = { video: 'Video', course: 'Course', dataset: 'Dataset search' };

/** One resource: a type label, a title that is a link, and the details that are actually known. */
function ResourceRow({ item }) {
  const [showEmbed, setShowEmbed] = useState(false);
  const embed = item.type === 'video' ? youtubeEmbed(item.url) : '';
  const details = [];
  if (item.type === 'video') {
    if (item.channel) details.push(item.channel);
    if (item.duration) details.push(item.duration);
    if (item.viewCount) details.push(`${item.viewCount} views`);
  } else if (item.type === 'course') {
    if (item.provider) details.push(item.provider);
    if (item.rating) details.push(`Rating ${item.rating}`);
    if (item.learners) details.push(`${item.learners} learners`);
    if (item.duration_hours) details.push(`${item.duration_hours} hours`);
  } else if (item.source) {
    details.push(item.source);
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{TYPE_LABEL[item.type]}</p>
          <a href={item.url} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-start gap-1.5 font-medium">
            <span>{item.title}</span>
            <ExternalLink size={14} aria-hidden="true" className="mt-1 shrink-0" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          {details.length > 0 && <p className="mt-0.5 text-sm text-muted">{details.join(' · ')}</p>}
          {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {item.type === 'course' && item.certificate && <span className="badge badge-neutral">Certificate</span>}
          {item.type === 'course' && item.verified && <span className="badge badge-success">Verified</span>}
          {embed && (
            <button type="button" className="btn btn-secondary btn-sm" aria-expanded={showEmbed} onClick={() => setShowEmbed((s) => !s)}>
              <Play size={14} aria-hidden="true" /> {showEmbed ? 'Hide player' : 'Watch here'}
            </button>
          )}
        </div>
      </div>
      {showEmbed && embed && (
        <div className="mt-3 aspect-video max-w-2xl overflow-hidden rounded-lg border border-line bg-black">
          <iframe src={embed} title={item.title} className="h-full w-full" allow="encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      )}
    </li>
  );
}

export default function ResourcesPage() {
  const { resources, loaded } = useFlaskData();
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');
  const [level, setLevel] = useState('all');
  const [type, setType] = useState('all');

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources
      .filter((r) => (topic === 'all' || r.topic === topic) && (level === 'all' || r.level === level))
      .map((r) => {
        const items = [
          ...(r.videos || []).map((x) => ({ ...x, type: 'video' })),
          ...(r.courses || []).map((x) => ({ ...x, type: 'course' })),
          ...(r.datasets || []).map((x) => ({ ...x, type: 'dataset' })),
        ].filter((i) => (type === 'all' || i.type === type)
          && (!q || [i.title, i.channel, i.provider, i.source, r.topic].filter(Boolean).join(' ').toLowerCase().includes(q)));
        return { ...r, items };
      })
      .filter((s) => s.items.length > 0);
  }, [resources, topic, level, type, query]);

  if (!loaded) return <LoadingScreen label="Loading resources" />;

  if (!resources.length) {
    return (
      <div className="page-narrow">
        <PageHeader title="Resources" lead="Videos, courses and datasets for the topics in your plan." />
        <EmptyState icon={FolderOpen} title="No resources yet" action={<Link to="/goals" className="btn btn-primary">Build your plan</Link>}>
          Resources are chosen for each topic in your study plan, so build your plan first.
        </EmptyState>
      </div>
    );
  }

  const total = sections.reduce((n, s) => n + s.items.length, 0);
  const filtered = query || topic !== 'all' || level !== 'all' || type !== 'all';
  const clear = () => { setQuery(''); setTopic('all'); setLevel('all'); setType('all'); };

  return (
    <div className="page">
      <PageHeader title="Resources" lead="Videos, courses and datasets for each topic in your plan. Links open on the original site." />

      <form role="search" aria-label="Filter resources" onSubmit={(e) => e.preventDefault()} className="grid gap-4 border-y border-line py-5 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <label htmlFor="res-q" className="label">Search</label>
          <input id="res-q" type="search" className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Title, channel or provider" />
        </div>
        <div>
          <label htmlFor="res-topic" className="label">Topic</label>
          <select id="res-topic" className="select" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="all">All topics</option>
            {resources.map((r) => <option key={r.topic} value={r.topic}>{capitalize(r.topic)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="res-type" className="label">Type</label>
          <select id="res-type" className="select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option>
            <option value="video">Videos</option>
            <option value="course">Courses</option>
            <option value="dataset">Dataset searches</option>
          </select>
        </div>
        <div>
          <label htmlFor="res-level" className="label">Level</label>
          <select id="res-level" className="select" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="all">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </form>

      <p className="mt-3 text-sm text-muted" role="status">{total} resource{total === 1 ? '' : 's'} in {sections.length} topic{sections.length === 1 ? '' : 's'}{filtered ? ' match your filters' : ''}.</p>

      {sections.length === 0 && (
        <div className="mt-6">
          <EmptyState icon={FolderOpen} title="Nothing matches those filters" action={<button type="button" className="btn btn-secondary" onClick={clear}>Clear filters</button>}>
            Try a different word, or show all topics, types and levels.
          </EmptyState>
        </div>
      )}

      <div className="mt-8 space-y-10">
        {sections.map((s) => (
          <section key={s.topic} aria-labelledby={`res-${s.topic.replace(/\s+/g, '-')}`}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id={`res-${s.topic.replace(/\s+/g, '-')}`} className="text-xl font-semibold tracking-tight">{capitalize(s.topic)}</h2>
              <span className="text-sm text-muted">Suggested level: {s.level}</span>
              <Link to={`/lesson/${encodeURIComponent(s.topic)}`} className="text-sm">Read the lesson</Link>
            </div>
            {s.project && (
              <p className="mt-2 flex items-start gap-2 text-sm text-muted"><Wrench size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" /><span><span className="font-medium text-ink">Mini project:</span> {s.project}</span></p>
            )}
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {s.items.map((item, i) => <ResourceRow key={`${item.type}-${i}`} item={item} />)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
