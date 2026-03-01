/**
 * MoneyDisplay 原子组件
 * 金钱显示组件，支持人民币和美元
 */

import React from 'react';

export interface MoneyDisplayProps {
  amount: number;
  currency: 'CNY' | 'USD';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const currencyConfig = {
  CNY: {
    symbol: '¥',
    name: '人民币',
    icon: '🇨🇳',
    color: 'text-red-400',
  },
  USD: {
    symbol: '$',
    name: '美元',
    icon: '🇺🇸',
    color: 'text-green-400',
  },
};

const sizeStyles = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl font-bold',
};

export const MoneyDisplay = React.memo(function MoneyDisplay({
  amount,
  currency,
  size = 'md',
  showIcon = true,
  className = '',
}: MoneyDisplayProps) {
  const config = currencyConfig[currency];
  const isNegative = amount < 0;
  const displayAmount = Math.abs(amount).toLocaleString('zh-CN');

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-mono
        ${config.color}
        ${sizeStyles[size]}
        ${isNegative ? 'text-red-500' : ''}
        ${className}
      `}
      title={`${config.name}: ${amount.toLocaleString('zh-CN')}`}
      aria-label={`${config.name}${isNegative ? '负债' : ''}: ${Math.abs(amount)}`}
    >
      {showIcon && (
        <span className="text-base" aria-hidden="true">
          {config.icon}
        </span>
      )}
      <span className="font-medium">
        {isNegative ? '-' : ''}{config.symbol}{displayAmount}
      </span>
    </span>
  );
});

// 复合金钱显示（同时显示两种货币）
export interface DualMoneyDisplayProps {
  cny: number;
  usd: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DualMoneyDisplay = React.memo(function DualMoneyDisplay({
  cny,
  usd,
  size = 'md',
  className = '',
}: DualMoneyDisplayProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <MoneyDisplay amount={cny} currency="CNY" size={size} />
      <span className="text-slate-600" aria-hidden="true">|</span>
      <MoneyDisplay amount={usd} currency="USD" size={size} />
    </div>
  );
});

export default MoneyDisplay;
