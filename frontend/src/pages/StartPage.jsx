import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useFlaskData } from '../hooks/useFlaskData';
import { apiFetch } from '../utils/api';
import { PageHeader, Notice, capitalize } from '../components/ui';
import { GOAL_TEXT } from './GoalSelectionPage';

const PRESETS = [
  { label: 'ML basics', text: 'Python, data preprocessing, statistics, linear regression, classification, decision trees' },
  { label: 'Deep learning', text: 'Python, neural networks, computer vision, NLP, transformers, LLM, generative AI' },
  { label: 'Full ML stack', text: 'Python, statistics, probability, data preprocessing, feature engineering, linear regression, classification, decision trees, model evaluation, clustering, AutoML, model deployment' },
];

const tokens = (text) => text.split(/[,\n]/).map((t) => t.trim()).filter(Boolean);

export default function StartPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { savePartial, profile, availableTopics, loaded } = useFlaskData();
  const goalId = location.state?.goal;

  const [syllabusText, setSyllabusText] = useState('');
  const [targetGoal, setTargetGoal] = useState(GOAL_TEXT[goalId] || '');
  const [prefilled, setPrefilled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasPlan = loaded && profile?.topics?.length > 0;

  // When the learner already has a plan, start from it instead of an empty form
  useEffect(() => {
    if (prefilled || !loaded) return;
    setPrefilled(true);
    if (profile?.syllabus_text && !syllabusText) setSyllabusText(profile.syllabus_text);
    if (!targetGoal && profile?.target_goal) setTargetGoal(profile.target_goal);
  }, [loaded, profile]);

  const supported = useMemo(() => (availableTopics?.length ? availableTopics : []), [availableTopics]);
  const chosen = useMemo(() => new Set(tokens(syllabusText).map((t) => t.toLowerCase())), [syllabusText]);

  const toggleTopic = (topic) => {
    const list = tokens(syllabusText);
    const exists = list.some((t) => t.toLowerCase() === topic.toLowerCase());
    setSyllabusText((exists ? list.filter((t) => t.toLowerCase() !== topic.toLowerCase()) : [...list, topic]).join(', '));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!syllabusText.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syllabus_text: syllabusText, target_goal: targetGoal }),
      });
      savePartial({ profile: data.profile, quizItems: data.quizItems, assessment: [], learningPath: [], resources: [] });
      navigate('/quiz');
    } catch (err) {
      setError(err.message || 'Something went wrong while building your plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-narrow">
      <PageHeader
        eyebrow="Step 2 of 3"
        title={hasPlan ? 'Edit your study plan' : 'Build your study plan'}
        lead="List the topics you need to study. Learning DNA orders them using their prerequisites and builds a quiz from them."
      />

      {hasPlan && (
        <Notice tone="info" className="mb-6" title={`Your plan has ${profile.topics.length} topic${profile.topics.length === 1 ? '' : 's'}`}>
          <span className="capitalize">{profile.topics.join(', ')}</span>.{' '}
          <Link to="/dashboard">Go to the dashboard</Link> or <Link to="/quiz">take the quiz</Link>. Changing the list below and saving replaces your plan and creates a new quiz.
        </Notice>
      )}

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        <div>
          <label htmlFor="syllabus" className="label">Your topics</label>
          <textarea
            id="syllabus" className="textarea" rows={5} value={syllabusText} onChange={(e) => setSyllabusText(e.target.value)}
            placeholder="Python, data preprocessing, linear regression, decision trees" aria-describedby="syllabus-hint"
          />
          <p id="syllabus-hint" className="hint">Type topics separated by commas, or paste a syllabus. Only the topics Learning DNA knows are used; anything else is ignored.</p>

          <div className="mt-4">
            <p className="text-sm font-medium text-ink">Start from a preset</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p.label} type="button" className="btn btn-secondary btn-sm" onClick={() => setSyllabusText(p.text)}>{p.label}</button>
              ))}
            </div>
          </div>

          {supported.length > 0 && (
            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-ink">Or choose from the {supported.length} supported topics</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {supported.map((t) => {
                  const on = chosen.has(t.toLowerCase());
                  return (
                    <button
                      key={t} type="button" aria-pressed={on} onClick={() => toggleTopic(t)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-sm capitalize transition-colors ${on ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong bg-surface text-ink hover:bg-sunken'}`}
                    >
                      {on && <Check size={14} aria-hidden="true" />}{t}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>

        <div>
          <label htmlFor="goal" className="label">Your goal <span className="font-normal text-muted">(optional)</span></label>
          <input id="goal" className="input" value={targetGoal} onChange={(e) => setTargetGoal(e.target.value)} aria-describedby="goal-hint"
            placeholder="For example: learn ML for placements and build real projects" />
          <p id="goal-hint" className="hint">
            {goalId ? <>From your goal choice: {capitalize(goalId === 'deeplearning' ? 'deep learning' : goalId)}. You can edit the wording. </> : null}
            It is shown on your dashboard.
          </p>
        </div>

        {error && <Notice tone="danger" title="Could not build your plan">{error}</Notice>}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="text-sm text-muted">{syllabusText.trim() ? `${tokens(syllabusText).length} item${tokens(syllabusText).length === 1 ? '' : 's'} entered` : 'Enter at least one topic to continue.'}</p>
          <button type="submit" className="btn btn-primary" disabled={!syllabusText.trim() || loading}>
            {loading ? 'Building your quiz...' : hasPlan ? 'Save plan and make a new quiz' : 'Build my plan and quiz'}
            {!loading && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </div>
      </form>
    </div>
  );
}
