/**
 * Card 原子组件
 * 卡片容器组件，用于包裹内容
 */

import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card = React.memo(function Card({
  children,
  className = '',
  header,
  footer,
  padding = 'md',
  hover = false,
  onClick,
}: CardProps) {
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
      className={`
        bg-slate-800 rounded-lg border border-slate-700
        overflow-hidden
        ${hover ? 'hover:border-slate-600 transition-colors duration-200' : ''}
        ${isClickable ? 'cursor-pointer hover:bg-slate-750' : ''}
        ${className}
      `}
    >
      {header && (
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
          {header}
        </div>
      )}
      <div className={paddingStyles[padding]}>{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/50">
          {footer}
        </div>
      )}
    </div>
  );
});

export default Card;
