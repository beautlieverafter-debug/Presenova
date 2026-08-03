/**
 * Login Page (Phase 1)
 * User authentication interface for signing in and creating accounts
 *
 * Features:
 * - Login and signup forms with tab switching
 * - Real-time validation
 * - Error handling with user feedback
 * - Automatic redirect on successful login
 * - Integration with AuthContext
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { login, signup } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Login.css';

type FormTab = 'login' | 'signup';

// ===== ICONS (inline SVG, no extra dependency) =====
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="spinner-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// ===== ANIMATION VARIANTS =====
const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const brandingVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.1, delayChildren: 0.15 } },
};

const Login: React.FC = () => {
  // ===== NAVIGATION AND AUTH =====
  const navigate = useNavigate();
  const { login: loginContext, isAuthenticated } = useAuth();

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/analytics');
    }
  }, [isAuthenticated, navigate]);

  // ===== STATE MANAGEMENT =====
  const [activeTab, setActiveTab] = useState<FormTab>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // ===== PASSWORD VISIBILITY (UI-only, no logic impact) =====
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);

  // ===== LOGIN FORM STATE =====
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  // ===== SIGNUP FORM STATE =====
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // ===== LOGIN HANDLER (unchanged) =====
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      if (!loginForm.email || !loginForm.password) {
        setError('Please fill in all fields');
        setIsLoading(false);
        return;
      }

      const response = await login(loginForm.email, loginForm.password);
      loginContext(response.user, response.access_token);
      setMessage('Login successful! Redirecting...');

      setTimeout(() => {
        navigate('/analytics');
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== SIGNUP HANDLER (unchanged) =====
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      if (!signupForm.name || !signupForm.email || !signupForm.password) {
        setError('Please fill in all fields');
        setIsLoading(false);
        return;
      }

      if (signupForm.password !== signupForm.confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      if (signupForm.password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsLoading(false);
        return;
      }

      const response = await signup(signupForm.name, signupForm.email, signupForm.password);
      loginContext(response.user, response.access_token);
      setMessage('Account created successfully! Redirecting...');

      setTimeout(() => {
        navigate('/analytics');
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    'Real-time AI delivery coaching with live camera feedback',
    'Document-grounded viva question generation',
    'Instant speech, posture & confidence analysis',
    'AI-powered presentation rewriting',
  ];

  return (
    <div className="login-page">
      {/* Ambient background blobs */}
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />

      {/* Left: Branding panel */}
      <motion.div
        className="login-branding"
        initial="hidden"
        animate="visible"
        variants={brandingVariants}
      >
        <motion.div className="brand-mark" variants={itemVariants}>Presenova</motion.div>
        <motion.h2 className="brand-heading" variants={itemVariants}>
          Ace every presentation.<br />Ace every viva.
        </motion.h2>
        <motion.p className="brand-subtext" variants={itemVariants}>
          Your AI-powered coach for confident, well-prepared presentations.
        </motion.p>
        <motion.ul className="feature-list" variants={itemVariants}>
          {features.map((f) => (
            <li key={f}>
              <span className="feature-check"><CheckIcon /></span>
              <span>{f}</span>
            </li>
          ))}
        </motion.ul>
      </motion.div>

      {/* Right: Form panel */}
      <div className="login-form-panel">
        <motion.div
          className="login-card"
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          {/* Header */}
          <motion.div className="login-header" variants={itemVariants}>
            <h1 className="mobile-brand">Presenova</h1>
            <p>{activeTab === 'login' ? 'Welcome back — sign in to continue' : 'Create your account to get started'}</p>
          </motion.div>

          {/* Tabs */}
          <motion.div className="login-tabs" variants={itemVariants}>
            <button
              className={`tab-button ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('login');
                setError(null);
                setMessage(null);
              }}
              disabled={isLoading}
            >
              Login
            </button>
            <button
              className={`tab-button ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('signup');
                setError(null);
                setMessage(null);
              }}
              disabled={isLoading}
            >
              Sign Up
            </button>
          </motion.div>

          {/* Messages */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error-msg"
                className="message message-error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0, x: [0, -6, 6, -6, 6, 0] }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
              >
                {error}
              </motion.div>
            )}
            {message && (
              <motion.div
                key="success-msg"
                className="message message-success"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="login-form">
              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="your@email.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </motion.div>

              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="login-password">Password</label>
                <div className="input-with-icon">
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="icon-toggle"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showLoginPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </motion.div>

              <motion.button
                type="submit"
                className="login-button"
                disabled={isLoading}
                variants={itemVariants}
                whileHover={!isLoading ? { scale: 1.015 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
              >
                {isLoading ? (
                  <span className="btn-loading"><SpinnerIcon /> Logging in...</span>
                ) : (
                  'Login'
                )}
              </motion.button>
            </form>
          )}

          {/* Signup Form */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignup} className="login-form">
              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="signup-name">Full Name</label>
                <input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </motion.div>

              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="signup-email">Email</label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </motion.div>

              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="signup-password">Password</label>
                <div className="input-with-icon">
                  <input
                    id="signup-password"
                    type={showSignupPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="icon-toggle"
                    onClick={() => setShowSignupPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showSignupPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </motion.div>

              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="signup-confirm">Confirm Password</label>
                <div className="input-with-icon">
                  <input
                    id="signup-confirm"
                    type={showSignupConfirm ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="icon-toggle"
                    onClick={() => setShowSignupConfirm((v) => !v)}
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showSignupConfirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </motion.div>

              <motion.button
                type="submit"
                className="login-button"
                disabled={isLoading}
                variants={itemVariants}
                whileHover={!isLoading ? { scale: 1.015 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
              >
                {isLoading ? (
                  <span className="btn-loading"><SpinnerIcon /> Creating account...</span>
                ) : (
                  'Sign Up'
                )}
              </motion.button>
            </form>
          )}

          {/* Footer */}
          <motion.div className="login-footer" variants={itemVariants}>
            <p>Secure authentication powered by JWT tokens</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;