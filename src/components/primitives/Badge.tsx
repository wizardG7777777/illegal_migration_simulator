/**
 * Badge 原子组件
 * 徽章/标签组件，用于显示状态、标签等信息
 */

import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

const variantStyles = {
  default: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  success: 'bg-green-600/20 text-green-400 border-green-600/30',
  warning: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  danger: 'bg-red-600/20 text-red-400 border-red-600/30',
  info: 'bg-cyan-600/20 text-cyan-400 border-cyan-600/30',
  neutral: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export const Badge = React.memo(function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  icon,
  onClick,
}: BadgeProps) {
  const isClickable = !!onClick;

  return (
    <span
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
      className={`
        inline-flex items-center gap-1.5
        font-medium rounded-full border
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${isClickable ? 'cursor-pointer hover:opacity-80 active:scale-95 transition-all' : ''}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
});

// 状态徽章变体
export interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'error' | 'success';
  text?: string;
  className?: string;
}

const statusConfig = {
  active: { variant: 'success' as const, text: '进行中', icon: '●' },
  inactive: { variant: 'neutral' as const, text: '未激活', icon: '○' },
  pending: { variant: 'warning' as const, text: '待处理', icon: '◐' },
  error: { variant: 'danger' as const, text: '异常', icon: '✕' },
  success: { variant: 'success' as const, text: '完成', icon: '✓' },
};

export const StatusBadge = React.memo(function StatusBadge({
  status,
  text,
  className = '',
}: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge
      variant={config.variant}
      size="sm"
      className={className}
      icon={<span className="text-xs">{config.icon}</span>}
    >
      {text || config.text}
    </Badge>
  );
});

export default Badge;
