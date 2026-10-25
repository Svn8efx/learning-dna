import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Brain, TrendingUp, Map, BookOpen, MessageSquare, ArrowRight, Star, Users, Award } from 'lucide-react';

const FEATURES = [
  { icon: Brain, title: 'Adaptive Assessment', desc: 'Quizzes that measure your knowledge level topic by topic and adjust to you.', color: 'cyan' },
  { icon: TrendingUp, title: 'Progress Analytics', desc: 'Visual heatmaps and accuracy trends to track your learning journey.', color: 'purple' },
  { icon: Map, title: 'Personal Learning Path', desc: 'A topic map with prerequisites, so you always know what to study next.', color: 'green' },
  { icon: MessageSquare, title: 'Guided Tutor', desc: 'Pick a question or type a topic to get simple explanations, project ideas, and guidance based on your own plan and quiz results.', color: 'pink' },
  { icon: BookOpen, title: 'Curated Resources', desc: 'YouTube videos, verified courses, Kaggle datasets, and mini projects.', color: 'orange' },
  { icon: Award, title: 'Certificate Paths', desc: 'Structured programs for placements, projects, and deep learning goals.', color: 'cyan' },
];

const STATS = [
  { value: '30', label: 'Topics Covered', icon: BookOpen },
  { value: 'Courses + Videos', label: 'Curated Resources', icon: Star },
  { value: '3', label: 'Goal Tracks', icon: Award },
];

const colorMap = {
  cyan: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
  purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  green: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  pink: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  orange: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
};

export default function HomePage() {
  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden mb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-purple-500/10 to-transparent" />
        <div className="absolute inset-0 grid-bg opacity-50" />

        {/* Floating orbs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-teal-400/5 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-purple-500/8 blur-3xl" />

        <div className="relative p-10 lg:p-14">
          <div className="flex items-center gap-2 mb-6">
            <span className="px-3 py-1 rounded-full bg-teal-400/10 border border-teal-400/20 text-teal-400 text-xs font-mono font-semibold tracking-wider">
              ✦ LEARNING THAT ADAPTS TO YOU
            </span>
          </div>

          <h1 className="font-display font-bold text-4xl lg:text-5xl text-white leading-tight mb-6 max-w-3xl">
            Every learner has a{' '}
            <span className="neon-text-blue">unique DNA</span>.{' '}
            Learning should fit it.
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mb-8">
            Learning DNA builds a personalized path for students with disabilities. Share your topics,
            take an adaptive quiz, and get resources matched to your level and the way you learn best.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to="/goals" className="btn-cyber-solid">
              <Zap size={16} />
              Start Learning Journey
            </Link>
            <Link to="/my-dna" className="btn-cyber">
              <Brain size={16} />
              Set up my learning style
            </Link>
            <Link to="/dashboard" className="btn-cyber">
              <TrendingUp size={16} />
              View Dashboard
            </Link>
          </div>
          <p className="text-slate-300 text-sm mt-5">
            Already started on another device? <Link to="/my-code" className="text-teal-300 underline">Continue with your code</Link>.
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap gap-6 mt-10 pt-8 border-t border-white/10">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <Icon size={14} className="text-teal-400" />
                </div>
                <div>
                  <div className="font-display font-bold text-white text-xl leading-none">{value}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-5 bg-teal-400 rounded-full" />
          <h2 className="font-display font-semibold text-white text-xl">How It Works</h2>
        </div>
        <p className="text-slate-500 text-sm mb-6 ml-3">Four steps to a path that fits you</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: '01', title: 'Set Your Goal', desc: 'Choose ML Placement, AI Project, or Deep Learning track.', icon: Target, to: '/goals' },
            { step: '02', title: 'Paste Syllabus', desc: 'Enter your topics or full syllabus for smart parsing.', icon: BookOpen, to: '/start' },
            { step: '03', title: 'Take Quiz', desc: 'Adaptive questions gauge your real knowledge per topic.', icon: Brain, to: '/quiz' },
            { step: '04', title: 'Learn & Track', desc: 'Follow your path with ranked resources and track progress.', icon: TrendingUp, to: '/dashboard' },
          ].map(({ step, title, desc, icon: Icon, to }, i) => (
            <Link key={step} to={to} className="glass-card p-5 group hover:border-teal-400/20 transition-all hover:-translate-y-1 duration-300 block">
              <div className="flex items-start justify-between mb-4">
                <span className="font-mono text-3xl font-bold text-white/10 group-hover:text-teal-400/20 transition-colors">{step}</span>
                <div className="w-9 h-9 rounded-xl bg-teal-400/10 flex items-center justify-center">
                  <Icon size={16} className="text-teal-400" />
                </div>
              </div>
              <h3 className="font-display font-semibold text-white text-sm mb-1">{title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
              <div className="mt-3 flex items-center gap-1 text-teal-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Go</span><ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-5 bg-purple-400 rounded-full" />
          <h2 className="font-display font-semibold text-white text-xl">Platform Features</h2>
        </div>
        <p className="text-slate-500 text-sm mb-6 ml-3">Tools built around how you learn</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className={`glass-card p-5 group hover:-translate-y-1 transition-all duration-300`}>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${colorMap[color]}`}>
                <Icon size={18} />
              </div>
              <h3 className="font-display font-semibold text-white text-sm mb-2">{title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Target(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  );
}
