/**
 * RandomEventModal 容器组件
 * 模态框显示随机事件，只有确认按钮，事件效果已自动应用
 */

import React, { useEffect, useCallback } from 'react';
import type { GameEvent } from '../../types';
import { Button } from '../primitives/Button';

export interface RandomEventModalProps {
  /** 随机事件（null表示不显示） */
  event: GameEvent | null;
  /** 确认回调 */
  onConfirm: () => void;
}

/**
 * 获取事件类型图标
 */
const getEventTypeIcon = (category: string): string => {
  switch (category) {
    case 'RANDOM':
      return '🎲';
    case 'POLICY_PRESSURE':
      return '📢';
    default:
      return '📋';
  }
};

/**
 * 获取事件类型标签
 */
const getEventTypeLabel = (category: string): string => {
  switch (category) {
    case 'RANDOM':
      return '随机事件';
    case 'POLICY_PRESSURE':
      return '政策公告';
    default:
      return '事件';
  }
};

/**
 * 获取事件类型颜色
 */
const getEventTypeColor = (category: string): string => {
  switch (category) {
    case 'RANDOM':
      return 'text-blue-400 bg-blue-400/10';
    case 'POLICY_PRESSURE':
      return 'text-red-400 bg-red-400/10';
    default:
      return 'text-slate-400 bg-slate-400/10';
  }
};

/**
 * 随机事件模态框组件
 */
export const RandomEventModal = React.memo(function RandomEventModal({
  event,
  onConfirm,
}: RandomEventModalProps) {
  // ESC键关闭
  useEffect(() => {
    if (!event) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [event, onConfirm]);

  // 处理确认
  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  if (!event) return null;

  const typeIcon = getEventTypeIcon(event.category);
  const typeLabel = getEventTypeLabel(event.category);
  const typeColorClass = getEventTypeColor(event.category);

  // 政策压力事件特殊渲染
  const isPolicyPressure = event.category === 'POLICY_PRESSURE';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={handleConfirm}
      role="dialog"
      aria-modal="true"
      aria-labelledby="random-event-title"
    >
      <div 
        className="w-full max-w-lg bg-slate-800 rounded-xl border border-slate-700 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">{typeIcon}</span>
            <div>
              <span className={`inline-block px-2 py-0.5 text-xs rounded ${typeColorClass} mb-1`}>
                {typeLabel}
              </span>
              <h2 
                id="random-event-title" 
                className="text-xl font-semibold text-slate-100"
              >
                {event.name}
              </h2>
            </div>
          </div>
        </div>

        {/* 内容 */}
        <div className="px-6 py-5">
          {/* 政策压力事件特殊展示 */}
          {isPolicyPressure && event.content && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300 font-medium">
                {event.content.announcement}
              </p>
            </div>
          )}

          {/* 事件描述 */}
          <p className="text-slate-300 leading-relaxed">
            {event.description}
          </p>

          {/* 效果提示 */}
          {event.debuff && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-400">⚠️</span>
                <span className="text-sm font-medium text-amber-400">
                  获得状态: {event.debuff.name}
                </span>
              </div>
              <div className="text-xs text-amber-300/80 space-y-1">
                {event.debuff.effects.raidChanceIncrease && (
                  <p>突击检查概率 +{Math.round(event.debuff.effects.raidChanceIncrease * 100)}%</p>
                )}
                {event.debuff.effects.workDifficultyIncrease && (
                  <p>打工难度 +{event.debuff.effects.workDifficultyIncrease}</p>
                )}
                {event.debuff.effects.mentalDamagePerTurn && (
                  <p>每回合心理 -{event.debuff.effects.mentalDamagePerTurn}</p>
                )}
                {event.debuff.effects.cashCostMultiplier && event.debuff.effects.cashCostMultiplier > 1 && (
                  <p>现金消耗 ×{event.debuff.effects.cashCostMultiplier.toFixed(1)}</p>
                )}
              </div>
              <p className="text-xs text-amber-500/60 mt-2">
                持续 {event.debuff.duration} 回合
              </p>
            </div>
          )}

          {/* 随机事件选项（如果有） */}
          {event.choices && event.choices.length > 0 && !isPolicyPressure && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-slate-500">事件影响:</p>
              {event.choices.map((choice, index) => (
                <div 
                  key={choice.id} 
                  className="p-3 bg-slate-900/50 rounded text-sm text-slate-400"
                >
                  {choice.effects.narrative || `结果 ${index + 1}`}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end">
          <Button 
            onClick={handleConfirm}
            variant="primary"
            size="md"
            ariaLabel="确认事件"
          >
            确认
          </Button>
        </div>
      </div>
    </div>
  );
});

export default RandomEventModal;
