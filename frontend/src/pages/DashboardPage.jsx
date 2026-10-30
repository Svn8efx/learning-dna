import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, ClipboardCheck, Compass, Target } from 'lucide-react';
import { useFlaskData } from '../hooks/useFlaskData';
import { apiFetch } from '../utils/api';
import LoadingScreen from '../components/LoadingScreen';
import QuizTrendChart from '../components/QuizTrendChart';
import { PageHeader, Meter, StatusBadge, ScoreBadge, scoreBand, capitalize } from '../components/ui';

/** Decide the one most useful next step from the learner's real state. */
function nextAction({ hasPlan, hasResults, learningPath, weakTopics }) {
  if (!hasPlan) {
    return { icon: Compass, title: 'Build your study plan', why: 'Choose a goal and list the topics you need to study. Learning DNA orders them and builds your quiz.', to: '/goals', cta: 'Choose a goal' };
  }
  if (!hasResults) {
    return { icon: ClipboardCheck, title: 'Take your quiz', why: 'The quiz shows which topics in your plan are strong and which need review. It takes a few minutes.', to: '/quiz', cta: 'Start the quiz' };
  }
  const current = learningPath.find((s) => s.status === 'in-progress') || learningPath.find((s) => s.status === 'recommended');
  if (current) {
    const weak = weakTopics.includes(current.topic);
    return {
      icon: BookOpen,
      title: `${current.status === 'in-progress' ? 'Continue with' : 'Start'} ${capitalize(current.topic)}`,
      why: weak
        ? 'This is the next unlocked topic in your path, and your quiz result shows it needs review.'
        : 'This is the next unlocked topic in your path. Earlier topics it depends on are done.',
      to: `/lesson/${encodeURIComponent(current.topic)}`, cta: 'Open the lesson', secondary: { to: '/path', label: 'See your path' },
    };
  }
  if (weakTopics.length) {
    return { icon: BookOpen, title: `Review ${capitalize(weakTopics[0])}`, why: 'Your quiz result for this topic was below 45%.', to: `/lesson/${encodeURIComponent(weakTopics[0])}`, cta: 'Open the lesson' };
  }
  return { icon: Target, title: 'Your plan is complete', why: 'Every topic in your path is marked completed. Add new topics to keep going.', to: '/start', cta: 'Edit your plan', secondary: { to: '/resources', label: 'Browse resources' } };
}

export default function DashboardPage() {
  const { assessment, profile, learningPath, avgScore, weakTopics, strengths, modelName, modelScores, dataInfo, loaded } = useFlaskData();
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    apiFetch('/api/monitor/summary').then((d) => setTrend(d.summary?.quiz_trend || [])).catch(() => setTrend([]));
  }, []);

  if (!loaded) return <LoadingScreen label="Loading your dashboard" />;

  const hasPlan = Boolean(profile?.topics?.length);
  const hasResults = assessment.length > 0;
  const completed = learningPath.filter((s) => s.status === 'completed').length;
  const action = nextAction({ hasPlan, hasResults, learningPath, weakTopics });
  const ActionIcon = action.icon;
  const pathPct = learningPath.length ? Math.round((completed / learningPath.length) * 100) : 0;
  const attempts = profile?.activity?.quiz_attempts || 0;

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        lead={hasPlan ? <>Your goal: <span className="font-medium text-ink">{profile.target_goal || 'not set'}</span></> : 'You have not built a study plan yet.'}
        actions={hasPlan && <Link to="/start" className="btn btn-secondary btn-sm">Edit plan</Link>}
      />

      {/* The one thing to do next */}
      <section aria-labelledby="next-title" className="rounded-2xl border border-accent/30 bg-accent-soft p-6 sm:p-8">
        <p className="eyebrow !text-accent">Next step</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <h2 id="next-title" className="flex items-center gap-2 text-2xl font-semibold text-ink"><ActionIcon size={22} aria-hidden="true" className="text-accent" />{action.title}</h2>
            <p className="mt-2 text-ink/80">{action.why}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to={action.to} className="btn btn-primary">{action.cta} <ArrowRight size={16} aria-hidden="true" /></Link>
            {action.secondary && <Link to={action.secondary.to} className="btn btn-secondary">{action.secondary.label}</Link>}
          </div>
        </div>
      </section>

      {!hasPlan ? (
        <section aria-labelledby="preview-title" className="mt-10 max-w-2xl">
          <h2 id="preview-title" className="section-title">What you will see here</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
            <li>Your next step, chosen from your own plan and results.</li>
            <li>How many topics you have completed, and your quiz score for each topic.</li>
            <li>How your quiz scores change from one attempt to the next.</li>
          </ul>
        </section>
      ) : (
        <>
      {/* Progress in plain terms */}
      <section aria-labelledby="progress-title" className="mt-10">
        <h2 id="progress-title" className="section-title">Where you are</h2>
        <dl className="mt-4 grid gap-8 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-muted">Topics completed</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight">{hasPlan ? `${completed} of ${learningPath.length}` : 'No plan yet'}</dd>
            {hasPlan && <dd className="mt-3"><Meter value={pathPct} label={`${completed} of ${learningPath.length} topics completed`} tone="success" /></dd>}
            <dd className="mt-2 text-sm text-muted">Marked on your <Link to="/path">learning path</Link>.</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Average quiz score</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight">{hasResults ? `${Math.round(avgScore)}%` : 'Not taken'}</dd>
            <dd className="mt-2 text-sm text-muted">{hasResults ? `Across ${assessment.length} topic${assessment.length === 1 ? '' : 's'}. Each score is the share of questions you answered correctly.` : 'Take the quiz to get your first score.'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Quiz attempts</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight">{attempts}</dd>
            <dd className="mt-2 text-sm text-muted">{attempts > 1 ? 'See how your scores changed below.' : 'Your history appears here after more than one attempt.'}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-10">
          {/* Results by topic */}
          <section aria-labelledby="results-title">
            <h2 id="results-title" className="section-title">Quiz results by topic</h2>
            {!hasResults ? (
              <p className="mt-3 text-muted">{hasPlan ? <>No results yet. <Link to="/quiz">Take the quiz</Link> to see how you did in each topic.</> : 'Results appear here after you build a plan and take the quiz.'}</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="table">
                  <caption className="sr-only">Quiz score for each topic in your plan</caption>
                  <thead>
                    <tr><th scope="col">Topic</th><th scope="col">Score</th><th scope="col">Result</th></tr>
                  </thead>
                  <tbody>
                    {assessment.map((r) => (
                      <tr key={r.topic}>
                        <th scope="row"><Link to={`/lesson/${encodeURIComponent(r.topic)}`} className="capitalize text-ink">{r.topic}<span className="sr-only">, open the lesson</span></Link></th>
                        <td className="min-w-[8rem]">
                          <div className="flex items-center gap-3">
                            <Meter className="w-20" value={r.score_pct} label={`${r.topic} score`} tone={scoreBand(r.score_pct).tone === 'danger' ? 'warning' : scoreBand(r.score_pct).tone === 'success' ? 'success' : undefined} />
                            <span className="tabular-nums">{r.score_pct}%</span>
                          </div>
                        </td>
                        <td><ScoreBadge pct={r.score_pct} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {hasResults && (
              <p className="mt-3 text-sm text-muted">
                {weakTopics.length ? <>Needs review: <span className="capitalize text-ink">{weakTopics.join(', ')}</span>. </> : 'No topic scored below 45%. '}
                {strengths.length ? <>Strong: <span className="capitalize text-ink">{strengths.join(', ')}</span>.</> : 'No topic is at 75% or above yet.'}
              </p>
            )}
          </section>

          {/* Real history, or an honest empty state */}
          <section aria-labelledby="history-title">
            <h2 id="history-title" className="section-title">How your scores are changing</h2>
            {trend === null ? <p className="mt-3 text-muted" role="status">Loading your history...</p>
              : trend.length < 2 ? (
                <p className="mt-3 text-muted">
                  {trend.length === 0 ? 'No quiz attempts yet.' : 'You have one attempt so far.'} A chart needs at least two attempts. Take a new quiz after some study to see your trend.
                </p>
              ) : (
                <div className="mt-3">
                  <QuizTrendChart trend={trend} />
                  <p className="mt-2 text-sm text-muted">Average score across all topics in each quiz attempt. <Link to="/progress">See the full table on the Progress page.</Link></p>
                </div>
              )}
          </section>
        </div>

        {/* The plan at a glance */}
        <aside aria-labelledby="plan-title" className="min-w-0">
          <h2 id="plan-title" className="section-title">Your plan</h2>
          {!hasPlan ? (
            <p className="mt-3 text-muted">No topics yet. <Link to="/goals">Build your plan</Link>.</p>
          ) : (
            <>
              <ol className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
                {learningPath.map((s) => (
                  <li key={s.topic} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <Link to={`/lesson/${encodeURIComponent(s.topic)}`} className="font-medium capitalize text-ink no-underline hover:text-accent hover:underline"><span className="mr-2 text-muted">{s.order}.</span>{s.topic}</Link>
                    </div>
                    <StatusBadge status={s.status} />
                  </li>
                ))}
              </ol>
              <Link to="/path" className="btn btn-secondary btn-sm mt-3">Open the full path <ArrowRight size={14} aria-hidden="true" /></Link>
            </>
          )}
        </aside>
      </div>

      {/* Technical detail lives here, labelled, and out of the way */}
      <details className="mt-12 rounded-xl border border-line bg-surface p-5">
        <summary className="cursor-pointer font-medium text-ink">How these numbers are made</summary>
        <div className="mt-4 max-w-3xl space-y-3 text-sm text-muted">
          <p><span className="font-medium text-ink">Quiz score.</span> The share of questions you answered correctly in that topic. Results: Strong is 75% or more, Developing is 45% to 74%, Needs review is below 45%.</p>
          <p><span className="font-medium text-ink">Topic level.</span> The labels beginner, intermediate and advanced on your path and resources come from a small model ({modelName || 'not loaded'}) that was trained on a generated example dataset of {dataInfo?.rows || 0} rows. {dataInfo?.real_data_used ? 'Some real data was also used.' : 'It was not trained on real students.'} Treat these labels as suggestions.</p>
          {modelScores && Object.keys(modelScores).length > 0 && (
            <div>
              <p className="font-medium text-ink">Models compared on that example data</p>
              <table className="table mt-2 max-w-md">
                <caption className="sr-only">Accuracy of each model on the generated example dataset</caption>
                <thead><tr><th scope="col">Model</th><th scope="col">Accuracy on example data</th></tr></thead>
                <tbody>
                  {Object.entries(modelScores).sort((a, b) => b[1] - a[1]).map(([name, score]) => (
                    <tr key={name}><th scope="row" className="!font-normal">{name}</th><td className="tabular-nums">{typeof score === 'number' ? `${(score * 100).toFixed(1)}%` : score}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2">These scores say how well each model learned the generated example data. They do not show how well it would predict real learners.</p>
            </div>
          )}
        </div>
      </details>
        </>
      )}
    </div>
  );
}
