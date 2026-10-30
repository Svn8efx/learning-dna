import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const STEPS = [
  { to: '/goals', title: 'Choose a goal', text: 'Placement, a project, or deep learning. This sets the direction of your plan.' },
  { to: '/start', title: 'List your topics', text: 'Paste a syllabus or pick topics. The quiz is built from those topics only.' },
  { to: '/quiz', title: 'Take the quiz', text: 'Your answers show which topics are strong and which need review.' },
  { to: '/dashboard', title: 'Follow your path', text: 'See what to do next, read or listen to lessons, and track your progress.' },
];

const FEATURES = [
  { to: '/lessons', title: 'Lessons you can read or listen to', text: 'Short plain-language lessons for 30 topics, with a Listen button and a downloadable transcript.' },
  { to: '/path', title: 'A path with prerequisites', text: 'Your topics are put in order using real prerequisites, and later topics unlock as you finish earlier ones.' },
  { to: '/resources', title: 'Videos, courses and datasets', text: 'Resources for each topic in your plan. Dataset links are searches, not hand-picked picks.' },
  { to: '/tutor', title: 'A guided tutor', text: 'Pre-written answers drawn from the lessons and your own results. It is not a live AI.' },
  { to: '/my-dna', title: 'Settings that fit you', text: 'Answer a few optional questions and the site suggests accessibility settings: text size, captions, voice, keyboard.' },
  { to: '/progress', title: 'Progress over time', text: 'Your quiz results and activity, with a table that works without the chart.' },
];

export default function HomePage() {
  return (
    <div>
      <section className="border-b border-line">
        <div className="page grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="eyebrow mb-3">A community-service project for students with disabilities</p>
            <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">A study plan that fits how you learn.</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Tell Learning DNA which topics you need to study. It builds a quiz, orders your topics into a learning path,
              and gives you lessons you can read, listen to, or use with the keyboard or your voice.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/goals" className="btn btn-primary">Start your plan <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link to="/my-dna" className="btn btn-secondary">Set up my learning style</Link>
            </div>
            <p className="mt-5 text-sm text-muted">
              Already started on another device? <Link to="/my-code">Continue with your code</Link>.
            </p>
          </div>

          <div className="panel panel-pad">
            <h2 className="section-title">How it works</h2>
            <ol className="mt-4 space-y-5">
              {STEPS.map((s, i) => (
                <li key={s.to} className="flex gap-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent" aria-hidden="true">{i + 1}</span>
                  <div>
                    <Link to={s.to} className="font-medium text-ink no-underline hover:underline">{s.title}<span className="sr-only">, step {i + 1} of 4</span></Link>
                    <p className="mt-0.5 text-sm text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="page">
        <h2 className="section-title">What is inside</h2>
        <p className="mt-1 max-w-2xl text-muted">Everything below works today. Where something is simple or limited, it says so.</p>
        <ul className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.to}>
              <Link to={f.to} className="font-medium text-ink no-underline hover:text-accent hover:underline">{f.title}</Link>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line bg-sunken">
        <div className="page">
          <h2 className="section-title">Good to know</h2>
          <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-muted">
            <li>This is a college project and a prototype. It has been checked with automated tools, not yet with a full audit by screen reader users.</li>
            <li>The model that suggests your learning style, and the one that estimates a topic level, were trained on generated example data, not on real students.</li>
            <li>There are no accounts or passwords. Your progress is saved under a resume code that you can use on any device.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
