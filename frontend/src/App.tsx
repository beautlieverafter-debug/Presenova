/**
 * App Component
 * Main routing configuration using react-router-dom
 * All routes are wrapped inside the Layout component for consistent navigation
 *
 * Key Features:
 * - AuthProvider for global authentication state
 * - ThemeProvider for global light/dark theme state
 * - Protected routes based on authentication status
 * - Public Landing page for unauthenticated visitors at "/"
 * - Centralized routing configuration
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import DocumentAnalyzer from './pages/DocumentAnalyzer';
import SpeechAnalyzer from './pages/SpeechAnalyzer';
import PracticeMode from './pages/PracticeMode';
import Analytics from './pages/Analytics';
import LiveCoach from './pages/LiveCoach';
import Login from './pages/Login';
import Landing from './pages/Landing';
import PresentationRewriter from './pages/PresentationRewriter';
import './App.css';

/**
 * HomeRoute
 * Decides what to show at "/" based on auth status:
 * - Logged in  -> redirect to /analytics
 * - Logged out -> show public Landing page
 */
const HomeRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/analytics" replace /> : <Landing />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>

            {/* Public Landing Route */}
            <Route path="/" element={<HomeRoute />} />

            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route element={<Layout />}>

              {/* Document Analyzer */}
              <Route path="/analyzer" element={<DocumentAnalyzer />} />

              {/* Speech Analyzer */}
              <Route path="/speech" element={<SpeechAnalyzer />} />

              {/* Live Coach */}
              <Route path="/live-coach" element={<LiveCoach />} />

              {/* AI Coach */}
              <Route path="/practice" element={<PracticeMode />} />

              {/* Presentation Rewriter */}
              <Route
                path="/presentation-rewriter"
                element={<PresentationRewriter />}
              />

              {/* Analytics */}
              <Route path="/analytics" element={<Analytics />} />

            </Route>

          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;