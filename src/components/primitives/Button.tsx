/**
 * Button 原子组件
 * 通用按钮组件，支持多种变体和尺寸
 */

import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
}

const variantStyles = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white disabled:bg-slate-600',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-100 disabled:bg-slate-800 disabled:text-slate-500',
  danger: 'bg-red-600 hover:bg-red-500 text-white disabled:bg-slate-600',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white disabled:text-slate-600',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button = React.memo(function Button({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ariaLabel,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      className={`
        inline-flex items-center justify-center
        font-medium rounded-md
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
        ${variant === 'primary' ? 'focus:ring-blue-500' : ''}
        ${variant === 'secondary' ? 'focus:ring-slate-500' : ''}
        ${variant === 'danger' ? 'focus:ring-red-500' : ''}
        ${variant === 'ghost' ? 'focus:ring-slate-400' : ''}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-95'}
        ${className}
      `}
    >
      {children}
    </button>
  );
});

export default Button;
