/**
 * Layout Component
 * Global wrapper containing Navigation Bar and main content area
 */

import React from 'react';
import { Outlet, Link, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LogoMark from '../components/LogoMark';
import './Layout.css';

const Layout: React.FC = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading user session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="layout">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-logo-link">
            <LogoMark size={28} />
            <span className="landing-logo">Presenova</span>
          </Link>

          <ul className="nav-links">
            <li className="nav-item">
              <NavLink to="/analyzer" className="nav-link">
                Document Analyzer
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to="/speech" className="nav-link">
                Speech Analyzer
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to="/live-coach" className="nav-link">
                Live Coach
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to="/practice" className="nav-link">
                AI Coach
              </NavLink>
            </li>

            {/* NEW FEATURE */}
            <li className="nav-item">
              <NavLink to="/presentation-rewriter" className="nav-link">
                Presentation Rewriter
              </NavLink>
            </li>

            <li className="nav-item user-info-item">
              <Link to="/analytics" className="user-name">
                {user?.name}
              </Link>
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
              <button onClick={logout} className="logout-btn">
                Logout
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-top-line" />
        <div className="footer-content">
          <p className="footer-brand-line">
            &copy; 2026 <span className="landing-logo footer-logo-text">Presenova</span> | AI Presentation Analyzer & Coach — FYP Project
          </p>
          <nav className="footer-quick-links">
            <Link to="/analyzer">Document Analyzer</Link>
            <span className="footer-dot">·</span>
            <Link to="/speech">Speech Analyzer</Link>
            <span className="footer-dot">·</span>
            <Link to="/live-coach">Live Coach</Link>
            <span className="footer-dot">·</span>
            <Link to="/practice">AI Coach</Link>
            <span className="footer-dot">·</span>
            <Link to="/presentation-rewriter">Rewriter</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Layout;