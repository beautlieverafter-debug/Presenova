/**
 * Dashboard Page
 * Welcome screen with quick overview and navigation options
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { healthCheck } from '../services/api';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    const checkBackend = async () => {
      const isConnected = await healthCheck();
      setBackendStatus(isConnected ? 'connected' : 'disconnected');
    };

    checkBackend();
  }, []);

  return (
    <div className="dashboard">
      {/* Hero Section */}
      <section className="hero">
        <h1>AI-Powered Presentation & Document Analyzer</h1>
        <p>Elevate your content with intelligent analysis and real-time feedback</p>
      </section>

      {/* Status Banner */}
      <section className="status-banner">
        <div className={`status-indicator status-${backendStatus}`}>
          <span className="status-dot"></span>
          Backend Status: <strong>{backendStatus === 'connected' ? 'Connected' : 'Disconnected'}</strong>
        </div>
      </section>

      {/* Features Overview */}
      <section className="features-grid">
        <article className="feature-card">
          <h3>Document Analyzer</h3>
          <p>Upload documents and receive AI-driven insights on structure, clarity, and adherence to the 7Cs of communication.</p>
          <Link to="/analyzer" className="feature-link">
            Go to Document Analyzer
          </Link>
        </article>

        <article className="feature-card">
          <h3>Speech Analyzer</h3>
          <p>Analyze your speech transcripts for word count, filler words, speech speed, sentiment, and actionable feedback.</p>
          <Link to="/speech" className="feature-link">
            Go to Speech Analyzer
          </Link>
        </article>

        <article className="feature-card">
          <h3>AI Coach</h3>
          <p>Practice your presentation with an intelligent AI coach that provides real-time feedback and coaching.</p>
          <Link to="/practice" className="feature-link">
            Go to AI Coach
          </Link>
        </article>

        <article className="feature-card">
          <h3>Progress Analytics</h3>
          <p>View detailed charts, track pacing speed improvements, and follow your history of document & speech scores.</p>
          <Link to="/analytics" className="feature-link">
            Go to Analytics
          </Link>
        </article>
      </section>

      {/* Quick Start Guide */}
      <section className="quick-start">
        <h2>Quick Start Guide</h2>
        <ol>
          <li>
            <strong>Upload a Document:</strong> Start with the Document Analyzer to get insights on your content structure and quality.
          </li>
          <li>
            <strong>Analyze Your Speech:</strong> Submit your speech transcript to the Speech Analyzer for detailed metrics and feedback.
          </li>
          <li>
            <strong>Practice with AI Coach:</strong> Engage with the AI Coach for personalized coaching and improvement suggestions.
          </li>
        </ol>
      </section>

      {/* Project Info */}
      <section className="project-info">
        <h3>About This Project</h3>
        <p>
          This is an AI-powered Presentation and Document Analyzer built as a Final Year Project (FYP). It leverages
          machine learning and natural language processing to provide comprehensive feedback on presentations and documents.
        </p>
      </section>
    </div>
  );
};

export default Dashboard;
