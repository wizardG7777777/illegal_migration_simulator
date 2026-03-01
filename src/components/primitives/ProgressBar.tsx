/**
 * ProgressBar 原子组件
 * 通用进度条组件，支持多种颜色
 */

import React from 'react';

export interface ProgressBarProps {
  current: number;
  max: number;
  color?: 'green' | 'red' | 'blue' | 'yellow' | 'purple' | 'orange';
  showValue?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const colorStyles = {
  green: 'bg-green-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
};

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export const ProgressBar = React.memo(function ProgressBar({
  current,
  max,
  color = 'blue',
  showValue = false,
  label,
  size = 'md',
  animated = true,
}: ProgressBarProps) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const displayValue = Math.round(current);
  const displayMax = Math.round(max);

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && (
            <span className="text-sm text-slate-300 font-medium">{label}</span>
          )}
          {showValue && (
            <span className="text-sm text-slate-400 tabular-nums">
              {displayValue}/{displayMax}
            </span>
          )}
        </div>
      )}
      <div
        className={`
          w-full bg-slate-700 rounded-full overflow-hidden
          ${sizeStyles[size]}
        `}
        role="progressbar"
        aria-valuenow={displayValue}
        aria-valuemin={0}
        aria-valuemax={displayMax}
        aria-label={label || '进度'}
      >
        <div
          className={`
            ${colorStyles[color]} rounded-full
            ${animated ? 'transition-all duration-500 ease-out' : ''}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});

export default ProgressBar;
