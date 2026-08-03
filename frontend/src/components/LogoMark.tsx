import React from 'react';
import './LogoMark.css';

interface LogoMarkProps {
  size?: number;
}

const LogoMark: React.FC<LogoMarkProps> = ({ size = 34 }) => {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      {/* Outer rounded frame (monitor) */}
      <rect
        x="4" y="10" width="40" height="26" rx="6"
        stroke="url(#logoGradient)" strokeWidth="2.5" fill="none"
        className="logo-mark-frame"
      />

      {/* Open book shape inside */}
      <path
        d="M24 16 L24 30 C21 27 16 26 12 27 L12 15 C16 14 21 15 24 16Z"
        fill="url(#logoGradient)" opacity="0.9"
        className="logo-mark-page logo-mark-page-left"
      />
      <path
        d="M24 16 L24 30 C27 27 32 26 36 27 L36 15 C32 14 27 15 24 16Z"
        fill="url(#logoGradient)" opacity="0.6"
        className="logo-mark-page logo-mark-page-right"
      />

      {/* Sparkle dots (AI accent) */}
      <circle cx="39" cy="7" r="1.6" fill="#a78bfa" className="logo-mark-dot dot-1" />
      <circle cx="43" cy="9" r="1" fill="#38bdf8" className="logo-mark-dot dot-2" />
      <circle cx="41" cy="12" r="1.2" fill="#818cf8" className="logo-mark-dot dot-3" />

      {/* Stand */}
      <ellipse cx="24" cy="39" rx="7" ry="1.6" fill="url(#logoGradient)" opacity="0.4" />
    </svg>
  );
};

export default LogoMark;