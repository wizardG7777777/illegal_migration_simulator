/**
 * SplashNewsScreen 组件
 * 开屏新闻界面，用于显示随机事件和政策公告
 * 强制全屏显示，玩家必须确认后才能继续
 */

import React, { useEffect, useCallback, useState } from 'react';
import type { GameEvent } from '@/types';
import { Button } from '@/components/primitives/Button';

export interface SplashNewsScreenProps {
  /** 事件数据（null表示不显示） */
  event: GameEvent | null;
  /** 确认回调 */
  onConfirm: () => void;
}

/**
 * 获取事件类型配置
 */
const getEventConfig = (category: string) => {
  switch (category) {
    case 'POLICY_PRESSURE':
      return {
        icon: '📢',
        label: '突发新闻',
        theme: 'red',
        bgGradient: 'from-red-900/90 via-slate-900 to-slate-950',
        accentColor: 'text-red-400',
        borderColor: 'border-red-500/30',
      };
    case 'RANDOM':
      return {
        icon: '📰',
        label: '每日头条',
        theme: 'blue',
        bgGradient: 'from-blue-900/90 via-slate-900 to-slate-950',
        accentColor: 'text-blue-400',
        borderColor: 'border-blue-500/30',
      };
    default:
      return {
        icon: '📋',
        label: '重要通知',
        theme: 'slate',
        bgGradient: 'from-slate-800/90 via-slate-900 to-slate-950',
        accentColor: 'text-slate-400',
        borderColor: 'border-slate-500/30',
      };
  }
};

/**
 * 开屏新闻组件
 */
export const SplashNewsScreen = React.memo(function SplashNewsScreen({
  event,
  onConfirm,
}: SplashNewsScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // 进入动画
  useEffect(() => {
    if (event) {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 50);
    }
  }, [event]);

  // 处理确认
  const handleConfirm = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onConfirm();
    }, 300);
  }, [onConfirm]);

  // ESC键或Enter键确认
  useEffect(() => {
    if (!event) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [event, handleConfirm]);

  // 滑动手势支持（移动端）
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientY;
    if (diff > 50) { // 上滑超过50px
      handleConfirm();
    }
    setTouchStart(null);
  };

  if (!isVisible || !event) return null;

  const config = getEventConfig(event.category);
  const isPolicy = event.category === 'POLICY_PRESSURE';

  return (
    <div
      className={`
        fixed inset-0 z-50 
        bg-gradient-to-b ${config.bgGradient}
        flex flex-col
        transition-opacity duration-300
        ${isAnimating ? 'opacity-100' : 'opacity-0'}
      `}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 顶部状态栏模拟 */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-500">
        <span>{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
        <div className="flex items-center gap-1">
          <span>📶</span>
          <span>📡</span>
          <span>🔋</span>
        </div>
      </div>

      {/* 新闻来源标识 */}
      <div className="px-6 pt-4">
        <div className="flex items-center gap-2">
          <span className={`text-2xl ${config.accentColor}`}>{config.icon}</span>
          <span className={`text-sm font-bold uppercase tracking-wider ${config.accentColor}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        {/* 政策压力事件特殊展示 */}
        {isPolicy && event.content && (
          <div className={`
            mb-6 p-4 rounded-xl border ${config.borderColor} bg-black/20
            transform transition-all duration-500 delay-100
            ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
          `}>
            <p className={`text-lg font-bold ${config.accentColor} leading-relaxed`}>
              「{event.content.announcement}」
            </p>
          </div>
        )}

        {/* 事件标题 */}
        <h1 className={`
          text-3xl md:text-4xl font-bold text-white mb-4 leading-tight
          transform transition-all duration-500 delay-200
          ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        `}>
          {event.name}
        </h1>

        {/* 事件描述 */}
        <p className={`
          text-lg text-slate-300 leading-relaxed mb-8
          transform transition-all duration-500 delay-300
          ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        `}>
          {event.description}
        </p>

        {/* Debuff 效果展示 */}
        {event.debuff && (
          <div className={`
            p-4 rounded-xl border ${config.borderColor} bg-black/20 mb-6
            transform transition-all duration-500 delay-400
            ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
          `}>
            <div className="flex items-center gap-2 mb-3">
              <span className={config.accentColor}>⚠️</span>
              <span className={`font-bold ${config.accentColor}`}>
                受到影响: {event.debuff.name}
              </span>
            </div>
            <div className="text-sm text-slate-400 space-y-1">
              {event.debuff.effects.raidChanceIncrease !== undefined && (
                <p>突击检查概率 +{Math.round(event.debuff.effects.raidChanceIncrease * 100)}%</p>
              )}
              {event.debuff.effects.workDifficultyIncrease !== undefined && (
                <p>工作难度 +{event.debuff.effects.workDifficultyIncrease}</p>
              )}
              {event.debuff.effects.mentalDamagePerTurn !== undefined && (
                <p>每回合心理 -{event.debuff.effects.mentalDamagePerTurn}</p>
              )}
              {event.debuff.effects.cashCostMultiplier !== undefined && event.debuff.effects.cashCostMultiplier > 1 && (
                <p>现金消耗 ×{event.debuff.effects.cashCostMultiplier.toFixed(1)}</p>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              持续 {event.debuff.duration} 回合
            </p>
          </div>
        )}
      </div>

      {/* 底部操作区 */}
      <div className={`
        px-6 pb-8 pt-4
        transform transition-all duration-500 delay-500
        ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}>
        {/* 上滑提示（移动端） */}
        <div className="text-center mb-4 md:hidden">
          <div className="animate-bounce text-slate-500 text-sm">
            ↑ 上滑继续
          </div>
        </div>

        {/* 确认按钮 */}
        <Button
          onClick={handleConfirm}
          variant="primary"
          size="lg"
          className="w-full py-4 text-lg font-semibold"
        >
          我知道了
        </Button>

        {/* 点击或按空格继续（桌面端） */}
        <p className="text-center text-xs text-slate-500 mt-3 hidden md:block">
          按 Enter 或空格键继续
        </p>
      </div>
    </div>
  );
});

export default SplashNewsScreen;
