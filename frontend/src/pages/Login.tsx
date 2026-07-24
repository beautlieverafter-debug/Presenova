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
import { login, signup } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Login.css';

type FormTab = 'login' | 'signup';

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

  // ===== LOGIN HANDLER =====
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      // Validate form
      if (!loginForm.email || !loginForm.password) {
        setError('Please fill in all fields');
        setIsLoading(false);
        return;
      }

      // ===== SEND LOGIN REQUEST TO BACKEND =====
      const response = await login(loginForm.email, loginForm.password);

      // ===== SAVE AUTH STATE =====
      loginContext(response.user, response.access_token);

      setMessage('Login successful! Redirecting...');

      // ===== REDIRECT TO DASHBOARD =====
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

  // ===== SIGNUP HANDLER =====
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      // ===== VALIDATION =====
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

      // ===== SEND SIGNUP REQUEST TO BACKEND =====
      const response = await signup(
        signupForm.name,
        signupForm.email,
        signupForm.password
      );

      // ===== SAVE AUTH STATE =====
      loginContext(response.user, response.access_token);

      setMessage('Account created successfully! Redirecting...');

      // ===== REDIRECT TO DASHBOARD =====
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

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <h1>Presenova</h1>
            <p>Presentation Analysis & AI Coach</p>
          </div>

          {/* Tabs */}
          <div className="login-tabs">
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
          </div>

          {/* Messages */}
          {error && <div className="message message-error">{error}</div>}
          {message && <div className="message message-success">{message}</div>}

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
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
              </div>

              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          )}

          {/* Signup Form */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignup} className="login-form">
              <div className="form-group">
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
              </div>

              <div className="form-group">
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
              </div>

              <div className="form-group">
                <label htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="signup-confirm">Confirm Password</label>
                <input
                  id="signup-confirm"
                  type="password"
                  placeholder="Confirm your password"
                  value={signupForm.confirmPassword}
                  onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="login-footer">
            <p>Secure authentication powered by JWT tokens</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
