import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Briefcase, Cpu, Network, Check } from 'lucide-react';
import { useFlaskData } from '../hooks/useFlaskData';
import { PageHeader, Notice } from '../components/ui';

// The goal text sent to the backend is built from these ids on the Start page.
export const GOAL_TEXT = {
  placement: 'ML for placement prep at top tech companies',
  project: 'Build a production AI project with deployment',
  deeplearning: 'Master deep learning and neural networks',
};

// Starter topics are real topics from the app's own catalog, so every one of them can be used in a plan.
const GOALS = [
  {
    id: 'placement', icon: Briefcase, title: 'ML for placement', subtitle: 'Interview-ready fundamentals',
    desc: 'Cover the machine learning ideas that come up most often in interviews: core algorithms, evaluation, and how to explain your choices.',
    topics: ['python', 'statistics', 'linear regression', 'classification', 'decision trees', 'svm', 'ensemble methods', 'model evaluation'],
  },
  {
    id: 'project', icon: Cpu, title: 'AI for a project', subtitle: 'From data to a working model',
    desc: 'Plan a project from messy data to a deployed model: preparing data, picking features, tuning, and shipping.',
    topics: ['python', 'data preprocessing', 'feature engineering', 'classification', 'model evaluation', 'hyperparameter tuning', 'automl', 'model deployment'],
  },
  {
    id: 'deeplearning', icon: Network, title: 'Deep learning', subtitle: 'Neural networks and language models',
    desc: 'Build up from regression to neural networks, then move on to vision, language, transformers and generative AI.',
    topics: ['python', 'linear regression', 'neural networks', 'computer vision', 'nlp', 'transformers', 'llm', 'generative ai'],
  },
];

const KEY = 'ldna-goal';

export default function GoalSelectionPage() {
  const navigate = useNavigate();
  const { profile, loaded } = useFlaskData();
  const [selected, setSelected] = useState(() => { try { return sessionStorage.getItem(KEY); } catch { return null; } });

  // If the learner already has a plan, show the goal it was built for
  const currentGoalId = Object.keys(GOAL_TEXT).find((id) => GOAL_TEXT[id] === profile?.target_goal);
  useEffect(() => {
    if (!selected && currentGoalId) setSelected(currentGoalId);
  }, [currentGoalId, selected]);

  const choose = (id) => {
    setSelected(id);
    try { sessionStorage.setItem(KEY, id); } catch { /* storage unavailable: the choice still travels with the navigation */ }
  };

  const goal = GOALS.find((g) => g.id === selected);
  const hasPlan = loaded && profile?.topics?.length > 0;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Step 1 of 3"
        title="What do you want to work towards?"
        lead="Pick the track closest to your goal. It labels your plan and suggests starting topics. You choose the exact topics on the next step."
      />

      {hasPlan && (
        <Notice tone="info" className="mb-6" title="You already have a study plan">
          It has {profile.topics.length} topic{profile.topics.length === 1 ? '' : 's'}. Choosing a goal here and continuing lets you rebuild it; you can also keep it and go straight to the dashboard.
        </Notice>
      )}

      <form onSubmit={(e) => { e.preventDefault(); if (selected) navigate('/start', { state: { goal: selected } }); }}>
        <fieldset>
          <legend className="sr-only">Learning goal</legend>
          <div className="grid gap-4 lg:grid-cols-3">
            {GOALS.map((g) => {
              const Icon = g.icon;
              const isSelected = selected === g.id;
              return (
                <div key={g.id} className="flex">
                  <input type="radio" name="goal" id={`goal-${g.id}`} className="choice-input" checked={isSelected} onChange={() => choose(g.id)} />
                  <label htmlFor={`goal-${g.id}`} className="choice w-full flex-col !gap-0" data-selected={isSelected}>
                    <span className="flex items-start justify-between gap-3">
                      <span className="flex items-center gap-2 text-ink"><Icon size={18} aria-hidden="true" className="text-accent" /><span className="text-lg font-semibold">{g.title}</span></span>
                      <span className="choice-mark" aria-hidden="true">{isSelected && <Check size={12} strokeWidth={3} />}</span>
                    </span>
                    <span className="mt-1 text-sm font-medium text-muted">{g.subtitle}</span>
                    <span className="mt-3 text-[0.9375rem] text-ink">{g.desc}</span>
                    <span className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Starter topics</span>
                    <span className="mt-1.5 text-sm capitalize text-muted">{g.topics.join(', ')}</span>
                    {isSelected && <span className="sr-only"> (selected)</span>}
                  </label>
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p id="goal-status" className="text-sm text-muted" aria-live="polite">
            {goal ? <>Selected: <span className="font-medium text-ink">{goal.title}</span></> : 'Select a goal to continue.'}
          </p>
          <div className="flex flex-wrap gap-3">
            {hasPlan && <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Keep my plan</button>}
            <button type="submit" className="btn btn-primary" disabled={!selected} aria-describedby="goal-status">
              Continue <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
