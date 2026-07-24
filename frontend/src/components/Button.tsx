/**
 * Button Component
 * Reusable styled button component
 */

import React from 'react';
import './Button.css';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn btn-${variant} ${fullWidth ? 'btn-full-width' : ''}`}
    >
      {loading ? 'Loading...' : label}
    </button>
  );
};

export default Button;
