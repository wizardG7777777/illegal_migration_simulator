/**
 * DebuffIcon 模块组件
 * Debuff图标组件，显示环境效果图标和提示
 */

import React, { useState } from 'react';
import type { EnvironmentalDebuff, EnvironmentalDebuffType, EconomicDebuffSubtype } from '@/types';

export interface DebuffIconProps {
  debuff: EnvironmentalDebuff;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Debuff类型图标映射
const debuffIcons: Record<EnvironmentalDebuffType, string> = {
  pressure: '🚨',
  economic: '📈',
};

// 经济型子类型图标
const economicSubtypeIcons: Record<EconomicDebuffSubtype, string> = {
  usd_inflation: '💵',
};

// 强度颜色映射
const intensityColors = {
  1: 'text-green-400 border-green-600/50 bg-green-900/20',
  2: 'text-yellow-400 border-yellow-600/50 bg-yellow-900/20',
  3: 'text-orange-400 border-orange-600/50 bg-orange-900/20',
  4: 'text-red-400 border-red-600/50 bg-red-900/20',
  5: 'text-red-500 border-red-500/50 bg-red-900/40',
};

// 强度标签
const intensityLabels: Record<number, string> = {
  1: '轻微',
  2: '中等',
  3: '严重',
  4: '危险',
  5: '极端',
};

const sizeStyles = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

// 格式化效果描述
const formatEffects = (debuff: EnvironmentalDebuff): string[] => {
  const effects: string[] = [];
  
  if (debuff.type === 'pressure') {
    const pressureEffects = debuff.effects as {
      raidChanceIncrease?: number;
      workDifficultyIncrease?: number;
      mentalDamagePerTurn?: number;
      cashCostMultiplier?: number;
    };
    
    if (pressureEffects.raidChanceIncrease) {
      effects.push(`突击检查 +${(pressureEffects.raidChanceIncrease * 100).toFixed(0)}%`);
    }
    if (pressureEffects.workDifficultyIncrease) {
      effects.push(`打工难度 +${pressureEffects.workDifficultyIncrease}`);
    }
    if (pressureEffects.mentalDamagePerTurn) {
      effects.push(`心理伤害 -${pressureEffects.mentalDamagePerTurn}/回合`);
    }
    if (pressureEffects.cashCostMultiplier && pressureEffects.cashCostMultiplier > 1) {
      effects.push(`现金消耗 ×${pressureEffects.cashCostMultiplier.toFixed(1)}`);
    }
  } else if (debuff.type === 'economic') {
    const economicEffects = debuff.effects as {
      foodCostMultiplier?: number;
      lodgingCostMultiplier?: number;
      transportCostMultiplier?: number;
    };
    
    if (economicEffects.foodCostMultiplier && economicEffects.foodCostMultiplier !== 1) {
      effects.push(`食品成本 ×${economicEffects.foodCostMultiplier.toFixed(2)}`);
    }
    if (economicEffects.lodgingCostMultiplier && economicEffects.lodgingCostMultiplier !== 1) {
      effects.push(`住宿成本 ×${economicEffects.lodgingCostMultiplier.toFixed(2)}`);
    }
    if (economicEffects.transportCostMultiplier && economicEffects.transportCostMultiplier !== 1) {
      effects.push(`出行成本 ×${economicEffects.transportCostMultiplier.toFixed(2)}`);
    }
  }
  
  return effects;
};

export const DebuffIcon = React.memo(function DebuffIcon({
  debuff,
  showTooltip = true,
  size = 'md',
  className = '',
}: DebuffIconProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const icon = debuff.type === 'economic' && debuff.subtype
    ? economicSubtypeIcons[debuff.subtype]
    : debuffIcons[debuff.type];
  
  const colorClass = intensityColors[debuff.intensity as 1|2|3|4|5] || intensityColors[1];
  const effects = formatEffects(debuff);
  const isPermanent = debuff.duration === -1;

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 图标 */}
      <div
        className={`
          ${sizeStyles[size]}
          ${colorClass}
          rounded-full border-2
          flex items-center justify-center
          cursor-help
          transition-transform duration-200
          hover:scale-110
        `}
        title={debuff.name}
      >
        <span>{icon}</span>
      </div>

      {/* 强度指示器（小圆点） */}
      {debuff.intensity >= 4 && (
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
      )}

      {/* Tooltip */}
      {showTooltip && isHovered && (
        <div className="
          absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
          w-64 p-3 rounded-lg
          bg-slate-800 border border-slate-600
          shadow-xl
        ">
          {/* 箭头 */}
          <div className="
            absolute top-full left-1/2 -translate-x-1/2
            w-0 h-0
            border-l-4 border-r-4 border-t-4
            border-l-transparent border-r-transparent border-t-slate-600
          " />
          
          {/* 内容 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-200">{debuff.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${colorClass}`}>
                {intensityLabels[debuff.intensity]}
              </span>
            </div>
            
            <p className="text-xs text-slate-400 mb-2">
              来源: {debuff.source}
            </p>
            
            {effects.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-slate-500">效果:</span>
                {effects.map((effect, idx) => (
                  <div key={idx} className="text-xs text-slate-300">
                    • {effect}
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-2 pt-2 border-t border-slate-700">
              <span className="text-xs text-slate-500">
                {isPermanent 
                  ? '永久持续' 
                  : `剩余 ${debuff.duration} 回合`
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// 简化版Debadge（仅显示图标和数字）
export interface DebuffBadgeProps {
  count: number;
  className?: string;
}

export const DebuffBadge = React.memo(function DebuffBadge({
  count,
  className = '',
}: DebuffBadgeProps) {
  if (count === 0) return null;

  return (
    <div className={`
      inline-flex items-center gap-1.5
      px-2 py-1 rounded-full
      bg-yellow-900/30 border border-yellow-700/50
      text-yellow-400 text-sm
      ${className}
    `}>
      <span>⚠️</span>
      <span>{count} 个Debuff</span>
    </div>
  );
});

export default DebuffIcon;
