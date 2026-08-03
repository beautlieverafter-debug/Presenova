/**
 * Landing Page
 * Public marketing homepage shown to unauthenticated visitors
 *
 * Features:
 * - Branded navbar with Login/Get Started CTAs
 * - Hero section with product value proposition
 * - Feature showcase grid (5 core Presenova features)
 * - Footer consistent with authenticated Layout
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import LogoMark from '../components/LogoMark';
import { useTheme } from '../context/ThemeContext';
import './Landing.css';

// ===== ICONS (inline SVG, no extra dependency) =====
const DocumentIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const CoachIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const VivaIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const SpeechIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const RewriteIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
  </svg>
);

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const features = [
    {
      icon: <DocumentIcon />,
      title: 'Document & Presentation Analyzer',
      description: 'Upload your slides or documents and get instant, structured feedback on content quality, clarity, and academic rigor.',
    },
    {
      icon: <CoachIcon />,
      title: 'Live AI Coach',
      description: 'Real-time delivery coaching using your camera — eye contact, posture, confidence, and emotion tracked as you present.',
    },
    {
      icon: <VivaIcon />,
      title: 'Viva Question Generator',
      description: 'Document-grounded viva questions generated from your own content, so you prepare for the exact panel you\'ll face.',
    },
    {
      icon: <SpeechIcon />,
      title: 'Speech & Audio Analyzer',
      description: 'Detailed breakdown of filler words, pacing, and clarity from your recorded practice sessions.',
    },
    {
      icon: <RewriteIcon />,
      title: 'AI Presentation Rewriter',
      description: 'Automatically rewrites weak slides based on your analysis results — not generic polish, targeted fixes.',
    },
  ];

  return (
    <div className="landing-page">
      {/* Ambient background blobs */}
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />

      {/* Navbar */}
      <nav className="landing-navbar">
        <div className="landing-navbar-container">
          <Link to="/" className="landing-logo-link">
            <LogoMark size={30} />
            <span className="landing-logo">Presenova</span>
          </Link>
          <div className="landing-nav-actions">
            <a href="#features" className="landing-nav-link">Features</a>

            <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle Light/Dark Theme">
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                </svg>
              )}
            </button>

            <button className="nav-btn-secondary" onClick={() => navigate('/login')}>
              Login
            </button>
            <button className="nav-btn-primary" onClick={() => navigate('/login')}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <motion.section
        className="hero-section"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.div className="hero-badge" variants={fadeUp}>
          AI Presentation & Document Analyzer with Live Coach
        </motion.div>
        <motion.h1 className="hero-heading" variants={fadeUp}>
          Present with confidence.<br />Defend with clarity.
        </motion.h1>
        <motion.p className="hero-subtext" variants={fadeUp}>
          Presenova combines real-time delivery coaching with document-grounded viva
          preparation — so you're ready for every slide and every question.
        </motion.p>
        <motion.div className="hero-cta-row" variants={fadeUp}>
          <button className="cta-primary" onClick={() => navigate('/login')}>
            Get Started Free
          </button>
          <a href="#features" className="cta-secondary">
            Explore Features
          </a>
        </motion.div>
      </motion.section>

      {/* Features */}
      <section id="features" className="features-section">
        <motion.div
          className="features-header"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <h2>Everything you need, in one place</h2>
          <p>Five focused tools built around a single goal: helping you present and defend your work with confidence.</p>
        </motion.div>

        <motion.div
          className="features-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
        >
          {features.map((f) => (
            <motion.div className="feature-card" key={f.title} variants={fadeUp}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Closing CTA */}
      <motion.section
        className="closing-cta"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        variants={fadeUp}
      >
        <h2>Ready to present your best work?</h2>
        <button className="cta-primary" onClick={() => navigate('/login')}>
          Create Free Account
        </button>
      </motion.section>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-top-line" />
        <div className="footer-content">
          <p className="footer-brand-line">
            &copy; 2026 <span className="landing-logo footer-logo-text">Presenova</span> | AI Presentation Analyzer & Coach — FYP Project
          </p>
          <nav className="footer-quick-links">
            <a href="#features" onClick={() => navigate('/login')}>Document Analyzer</a>
            <span className="footer-dot">·</span>
            <a href="#features" onClick={() => navigate('/login')}>Speech Analyzer</a>
            <span className="footer-dot">·</span>
            <a href="#features" onClick={() => navigate('/login')}>Live Coach</a>
            <span className="footer-dot">·</span>
            <a href="#features" onClick={() => navigate('/login')}>AI Coach</a>
            <span className="footer-dot">·</span>
            <a href="#features" onClick={() => navigate('/login')}>Rewriter</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Landing;