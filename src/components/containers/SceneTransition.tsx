/**
 * SceneTransition 容器组件
 * 场景切换动画，根据场景切换显示不同的过渡文本和动画
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { SceneId } from '../../types';

export interface SceneTransitionProps {
  /** 起始场景 */
  from: SceneId;
  /** 目标场景 */
  to: SceneId;
  /** 动画完成回调 */
  onComplete: () => void;
}

/**
 * 场景显示名称
 */
const SCENE_NAMES: Record<SceneId, string> = {
  act1: '国内准备',
  act2: '跨境穿越',
  act3: '美国生存',
};

/**
 * 场景切换文本
 */
const getTransitionText = (from: SceneId, to: SceneId): string => {
  // act1 -> act2
  if (from === 'act1' && to === 'act2') {
    return '你决定离开熟悉的一切，踏上未知的旅程...';
  }
  
  // act2 -> act3
  if (from === 'act2' && to === 'act3') {
    return '你终于到达了目的地，新的挑战才刚刚开始...';
  }
  
  // 其他情况（理论上不会发生，因为场景是单向流动）
  return `从 ${SCENE_NAMES[from]} 前往 ${SCENE_NAMES[to]}...`;
};

/**
 * 获取场景图标
 */
const getSceneIcon = (scene: SceneId): string => {
  switch (scene) {
    case 'act1':
      return '🏠';
    case 'act2':
      return '🌲';
    case 'act3':
      return '🗽';
    default:
      return '📍';
  }
};

/**
 * 场景切换动画组件
 */
export const SceneTransition = React.memo(function SceneTransition({
  from,
  to,
  onComplete,
}: SceneTransitionProps) {
  const [phase, setPhase] = useState<'fade-in' | 'hold' | 'fade-out'>('fade-in');
  const [progress, setProgress] = useState(0);

  // 动画时长配置（毫秒）
  const FADE_IN_DURATION = 800;
  const HOLD_DURATION = 2500;
  const FADE_OUT_DURATION = 600;

  useEffect(() => {
    let fadeInTimer: NodeJS.Timeout;
    let holdTimer: NodeJS.Timeout;
    let fadeOutTimer: NodeJS.Timeout;

    // 阶段1: 淡入
    fadeInTimer = setTimeout(() => {
      setPhase('hold');
      
      // 阶段2: 保持
      holdTimer = setTimeout(() => {
        setPhase('fade-out');
        
        // 阶段3: 淡出
        fadeOutTimer = setTimeout(() => {
          onComplete();
        }, FADE_OUT_DURATION);
      }, HOLD_DURATION);
    }, FADE_IN_DURATION);

    // 进度条动画
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 1;
        return next > 100 ? 100 : next;
      });
    }, (FADE_IN_DURATION + HOLD_DURATION + FADE_OUT_DURATION) / 100);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(holdTimer);
      clearTimeout(fadeOutTimer);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  // 处理点击跳过
  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // 计算透明度
  const getOpacity = () => {
    switch (phase) {
      case 'fade-in':
        return progress < 20 ? progress / 20 : 1;
      case 'hold':
        return 1;
      case 'fade-out':
        return progress > 80 ? (100 - progress) / 20 : 1;
      default:
        return 1;
    }
  };

  const transitionText = getTransitionText(from, to);
  const fromIcon = getSceneIcon(from);
  const toIcon = getSceneIcon(to);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950"
      style={{ opacity: getOpacity() }}
      onClick={handleSkip}
    >
      <div className="max-w-md w-full mx-4 text-center">
        {/* 场景图标动画 */}
        <div className="flex items-center justify-center gap-8 mb-8">
          {/* 起始场景 */}
          <div className="text-center">
            <div 
              className={`
                w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-600
                flex items-center justify-center text-4xl mb-2
                transition-all duration-500
                ${phase === 'fade-out' ? 'scale-75 opacity-50' : 'scale-100'}
              `}
            >
              {fromIcon}
            </div>
            <span className="text-sm text-slate-500">{SCENE_NAMES[from]}</span>
          </div>

          {/* 箭头动画 */}
          <div className="flex flex-col items-center">
            <div 
              className={`
                text-2xl text-slate-400 transition-all duration-500
                ${phase === 'hold' ? 'translate-x-2 text-blue-400' : ''}
              `}
            >
              →
            </div>
          </div>

          {/* 目标场景 */}
          <div className="text-center">
            <div 
              className={`
                w-20 h-20 rounded-full bg-slate-800 border-2 
                flex items-center justify-center text-4xl mb-2
                transition-all duration-500
                ${phase === 'fade-in' ? 'scale-90 border-slate-700' : ''}
                ${phase === 'hold' ? 'scale-105 border-blue-500 shadow-lg shadow-blue-500/20' : ''}
                ${phase === 'fade-out' ? 'scale-100 border-blue-400' : ''}
              `}
            >
              {toIcon}
            </div>
            <span className={`text-sm ${phase === 'hold' ? 'text-blue-400' : 'text-slate-500'}`}>
              {SCENE_NAMES[to]}
            </span>
          </div>
        </div>

        {/* 过渡文本 */}
        <div className="mb-8">
          <p 
            className={`
              text-lg text-slate-300 leading-relaxed
              transition-all duration-500
              ${phase === 'hold' ? 'text-xl text-slate-100' : ''}
            `}
          >
            {transitionText}
          </p>
        </div>

        {/* 进度条 */}
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 跳过提示 */}
        <p className="text-xs text-slate-600">
          点击任意处跳过
        </p>
      </div>

      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 星星/粒子效果 */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-slate-600 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: 0.3 + Math.random() * 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
});

export default SceneTransition;
