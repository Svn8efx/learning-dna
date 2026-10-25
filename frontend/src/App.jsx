import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import StartPage from './pages/StartPage';
import QuizPage from './pages/QuizPage';
import DashboardPage from './pages/DashboardPage';
import LearningPathPage from './pages/LearningPathPage';
import ResourcesPage from './pages/ResourcesPage';
import GoalSelectionPage from './pages/GoalSelectionPage';
import TutorPage from './pages/TutorPage';
import MyDnaPage from './pages/MyDnaPage';
import LessonsPage from './pages/LessonsPage';
import LessonPage from './pages/LessonPage';
import ProgressPage from './pages/ProgressPage';
import MyCodePage from './pages/MyCodePage';
import { AccessibilityProvider } from './context/AccessibilityContext';

export default function App() {
  return (
    <AccessibilityProvider>
    <Router>
      <div className="min-h-screen bg-mesh grid-bg">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="start" element={<StartPage />} />
            <Route path="goals" element={<GoalSelectionPage />} />
            <Route path="quiz" element={<QuizPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="path" element={<LearningPathPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="tutor" element={<TutorPage />} />
            <Route path="my-dna" element={<MyDnaPage />} />
            <Route path="lessons" element={<LessonsPage />} />
            <Route path="lesson/:topic" element={<LessonPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="my-code" element={<MyCodePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </div>
    </Router>
    </AccessibilityProvider>
  );
}
