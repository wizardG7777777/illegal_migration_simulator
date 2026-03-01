/**
 * DevToolsOverlay 组件
 * 
 * 游戏内 DevTools 悬浮窗
 * - 按 `~` 键切换显示/隐藏
 * - 显示当前状态摘要
 * - 快捷操作按钮
 * - 打开仪表盘的链接
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store';
import type { SceneId } from '../types/game';

/**
 * 快捷按钮组件
 */
function QuickButton({
  label,
  onClick,
  variant = 'default',
}: {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
}) {
  const baseClasses = 'px-2 py-1 text-xs rounded font-medium transition-colors';
  const variantClasses = {
    default: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
    danger: 'bg-red-600/80 hover:bg-red-500 text-white',
    success: 'bg-green-600/80 hover:bg-green-500 text-white',
  };

  return (
    <button onClick={onClick} className={`${baseClasses} ${variantClasses[variant]}`}>
      {label}
    </button>
  );
}

/**
 * DevTools 悬浮窗组件
 */
export function DevToolsOverlay() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const store = useGameStore();
  const { state } = store;

  // 仅在 DEV 模式显示
  if (import.meta.env.PROD) {
    return null;
  }

  // 监听 ~ 键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 快捷操作
  const addMoney = (amount: number) => {
    const currentScene = state.scene.currentScene;
    const currency = currentScene === 'act1' ? 'CNY' : 'USD';
    const current =
      currency === 'CNY'
        ? state.character.resources.money.cny
        : state.character.resources.money.usd;
    store.devSetMoney(current + amount, currency);
  };

  const setHealth = (value: number) => store.devSetResource('health', value);
  const setMental = (value: number) => store.devSetResource('mental', value);
  const setActionPoints = (value: number) => store.devSetResource('actionPoints', value);

  const switchScene = (scene: SceneId) => {
    store.devTransitionScene(scene);
  };

  const openDashboard = () => {
    navigate('/__devtools/dashboard');
  };

  // 如果不显示，只显示悬浮按钮
  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-full shadow-lg border border-slate-700 flex items-center justify-center transition-all"
          title="按 ~ 键打开 DevTools"
        >
          <span className="text-lg">🛠</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      {/* 主面板 */}
      <div className="bg-slate-900/95 backdrop-blur rounded-lg border border-slate-700 shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700">
          <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
            <span className="text-yellow-500">●</span>
            DevTools
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
              title={isExpanded ? '收起' : '展开'}
            >
              {isExpanded ? '−' : '+'}
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
              title="关闭 (按 ~ 键重新打开)"
            >
              ×
            </button>
          </div>
        </div>

        {/* 状态摘要 */}
        <div className="px-3 py-2 border-b border-slate-700">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">场景:</span>
              <span className="text-slate-300 font-mono">{state.scene.currentScene}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">回合:</span>
              <span className="text-slate-300 font-mono">{state.scene.turnCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">健康:</span>
              <span
                className={`font-mono ${
                  state.character.resources.health.current < 20 ? 'text-red-400' : 'text-green-400'
                }`}
              >
                {state.character.resources.health.current}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">心理:</span>
              <span
                className={`font-mono ${
                  state.character.resources.mental.current < 20 ? 'text-red-400' : 'text-blue-400'
                }`}
              >
                {state.character.resources.mental.current}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">人民币:</span>
              <span className="text-slate-300 font-mono">¥{state.character.resources.money.cny}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">美元:</span>
              <span className="text-slate-300 font-mono">${state.character.resources.money.usd}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">行动点:</span>
              <span className="text-slate-300 font-mono">
                {state.character.resources.actionPoints.current}/
                {state.character.resources.actionPoints.max}
              </span>
            </div>
          </div>
        </div>

        {/* 快捷操作 */}
        {isExpanded && (
          <div className="px-3 py-2 space-y-3 border-b border-slate-700">
            {/* 金钱操作 */}
            <div>
              <span className="text-xs text-slate-500 block mb-1">金钱</span>
              <div className="flex flex-wrap gap-1">
                <QuickButton label="+100" onClick={() => addMoney(100)} variant="success" />
                <QuickButton label="+500" onClick={() => addMoney(500)} variant="success" />
                <QuickButton label="+1000" onClick={() => addMoney(1000)} variant="success" />
                <QuickButton label="-500" onClick={() => addMoney(-500)} variant="danger" />
              </div>
            </div>

            {/* 健康操作 */}
            <div>
              <span className="text-xs text-slate-500 block mb-1">健康</span>
              <div className="flex flex-wrap gap-1">
                <QuickButton label="+20" onClick={() => setHealth(state.character.resources.health.current + 20)} />
                <QuickButton label="满值" onClick={() => setHealth(100)} variant="success" />
                <QuickButton label="濒死(10)" onClick={() => setHealth(10)} variant="danger" />
              </div>
            </div>

            {/* 心理操作 */}
            <div>
              <span className="text-xs text-slate-500 block mb-1">心理</span>
              <div className="flex flex-wrap gap-1">
                <QuickButton label="+20" onClick={() => setMental(state.character.resources.mental.current + 20)} />
                <QuickButton label="满值" onClick={() => setMental(100)} variant="success" />
                <QuickButton label="崩溃(10)" onClick={() => setMental(10)} variant="danger" />
              </div>
            </div>

            {/* 行动点 */}
            <div>
              <span className="text-xs text-slate-500 block mb-1">行动点</span>
              <div className="flex flex-wrap gap-1">
                <QuickButton label="+3" onClick={() => setActionPoints(state.character.resources.actionPoints.current + 3)} />
                <QuickButton label="满值" onClick={() => setActionPoints(5)} variant="success" />
              </div>
            </div>

            {/* 场景切换 */}
            <div>
              <span className="text-xs text-slate-500 block mb-1">切换场景</span>
              <div className="flex flex-wrap gap-1">
                <QuickButton label="场景1" onClick={() => switchScene('act1')} />
                <QuickButton label="场景2" onClick={() => switchScene('act2')} />
                <QuickButton label="场景3" onClick={() => switchScene('act3')} />
              </div>
            </div>
          </div>
        )}

        {/* 底部链接 */}
        <div className="px-3 py-2 bg-slate-800/30">
          <button
            onClick={openDashboard}
            className="w-full py-1.5 text-xs bg-blue-600/80 hover:bg-blue-500 text-white rounded font-medium transition-colors"
          >
            打开完整仪表盘 →
          </button>
        </div>
      </div>

      {/* 快捷键提示 */}
      <div className="mt-2 text-center">
        <span className="text-xs text-slate-600">按 ~ 键显示/隐藏</span>
      </div>
    </div>
  );
}

export default DevToolsOverlay;
