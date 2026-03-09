/**
 * GameStatusBar 组件
 * 安卓风格的状态栏，显示用户核心状态信息
 */

import React from 'react';
import { useGameStore } from '@/store';
import type { SceneId, TerminalState } from '@/types';

// 场景映射
const SCENE_INFO: Record<SceneId, { name: string; icon: string; color: string }> = {
  act1: { name: '国内', icon: '🏠', color: 'text-green-400' },
  act2: { name: '途中', icon: '🌲', color: 'text-amber-400' },
  act3: { name: '美国', icon: '🗽', color: 'text-blue-400' },
};

// 终结态配置
const TERMINAL_CONFIG: Record<TerminalState, { icon: string; label: string; color: string; bgColor: string }> = {
  DYING: { icon: '☠️', label: '濒死', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  BREAKDOWN: { icon: '😵', label: '崩溃', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  DESTITUTE: { icon: '💸', label: '匮乏', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
};

/**
 * 状态栏组件
 */
export const GameStatusBar = React.memo(function GameStatusBar() {
  const state = useGameStore(s => s.state);
  const { scene, character } = state;
  const { currentScene, turnCount, activeDebuffs } = scene;
  const { resources, status } = character;
  const { health, mental, money, actionPoints } = resources;

  // 计算百分比
  const healthPercent = Math.round((health.current / health.max) * 100);
  const mentalPercent = Math.round((mental.current / mental.max) * 100);

  // 获取当前场景信息
  const sceneInfo = SCENE_INFO[currentScene];

  // 判断是否有紧急状态
  const hasEmergency = healthPercent < 30 || mentalPercent < 30 || status.terminalState !== null;

  // 资源颜色
  const getResourceColor = (percent: number) => {
    if (percent > 60) return 'bg-green-500';
    if (percent > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // 电池图标显示
  const BatteryIcon = ({ percent, color }: { percent: number; color: string }) => (
    <div className="flex items-center gap-0.5">
      <div className="w-5 h-2.5 border border-slate-500 rounded-sm p-0.5">
        <div className={`h-full ${color} rounded-sm transition-all`} style={{ width: `${percent}%` }} />
      </div>
      <div className="w-0.5 h-1.5 bg-slate-500 rounded-r-sm" />
    </div>
  );

  return (
    <div className="bg-slate-900 border-b border-slate-800">
      {/* 第一行：系统状态栏（类似安卓顶部） */}
      <div className="flex items-center justify-between px-3 py-1.5 text-xs">
        <div className="flex items-center gap-3">
          {/* 场景标识 */}
          <span className={`${sceneInfo.color} font-medium`}>
            {sceneInfo.icon} {sceneInfo.name}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">回合 {turnCount}</span>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          {/* 信号强度（隐喻社交/信息状态） */}
          <div className="flex items-end gap-0.5 h-3">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={`w-0.5 rounded-sm ${i <= 3 ? 'bg-slate-400' : 'bg-slate-700'}`}
                style={{ height: `${i * 4}px` }}
              />
            ))}
          </div>
          
          {/* WiFi图标 */}
          <span>📡</span>
          
          {/* 电池（隐喻健康状态） */}
          <BatteryIcon 
            percent={healthPercent} 
            color={getResourceColor(healthPercent)} 
          />
        </div>
      </div>

      {/* 第二行：核心资源（大字体突出显示） */}
      <div className="flex items-center justify-around px-4 py-3">
        {/* 现金 */}
        <div className="text-center">
          <div className="text-xs text-slate-500 mb-0.5">现金</div>
          <div className="flex flex-col items-center">
            {money.usd > 0 && (
              <span className="text-lg font-bold text-green-400">
                ${money.usd.toLocaleString()}
              </span>
            )}
            {money.cny > 0 && (
              <span className="text-sm text-slate-400">
                ¥{money.cny.toLocaleString()}
              </span>
            )}
            {money.usd === 0 && money.cny === 0 && (
              <span className="text-lg font-bold text-red-400">$0</span>
            )}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-10 bg-slate-800" />

        {/* 健康 */}
        <div className="text-center flex-1 max-w-[120px]">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-xs text-slate-500">健康</span>
            {healthPercent < 30 && <span className="text-red-500 text-xs animate-pulse">!</span>}
          </div>
          <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getResourceColor(healthPercent)} transition-all duration-300`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
          <div className={`text-xs mt-0.5 ${healthPercent < 30 ? 'text-red-400' : 'text-slate-500'}`}>
            {health.current}/{health.max}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-10 bg-slate-800" />

        {/* 心理 */}
        <div className="text-center flex-1 max-w-[120px]">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-xs text-slate-500">心理</span>
            {mentalPercent < 30 && <span className="text-purple-500 text-xs animate-pulse">!</span>}
          </div>
          <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getResourceColor(mentalPercent)} transition-all duration-300`}
              style={{ width: `${mentalPercent}%` }}
            />
          </div>
          <div className={`text-xs mt-0.5 ${mentalPercent < 30 ? 'text-purple-400' : 'text-slate-500'}`}>
            {mental.current}/{mental.max}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-10 bg-slate-800" />

        {/* 行动点 */}
        <div className="text-center">
          <div className="text-xs text-slate-500 mb-0.5">行动点</div>
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: actionPoints.max }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-4 rounded-sm ${
                  i < actionPoints.current ? 'bg-blue-500' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
          <div className={`text-xs mt-0.5 ${actionPoints.current === 0 ? 'text-red-400' : 'text-blue-400'}`}>
            {actionPoints.current}/{actionPoints.max}
          </div>
        </div>
      </div>

      {/* 第三行：紧急状态和Debuff（如果有） */}
      {(hasEmergency || activeDebuffs.length > 0) && (
        <div className="px-4 pb-3 space-y-2">
          {/* 终结态警告 */}
          {status.terminalState && (
            <div className={`
              flex items-center gap-2 p-2 rounded-lg
              ${TERMINAL_CONFIG[status.terminalState].bgColor}
            `}>
              <span className="text-lg">{TERMINAL_CONFIG[status.terminalState].icon}</span>
              <div className="flex-1">
                <span className={`font-bold ${TERMINAL_CONFIG[status.terminalState].color}`}>
                  {TERMINAL_CONFIG[status.terminalState].label}
                </span>
                <span className="text-slate-400 text-xs ml-2">
                  剩余 {status.terminalCountdown} 回合
                </span>
              </div>
            </div>
          )}

          {/* 低健康/心理警告（非终结态） */}
          {!status.terminalState && (healthPercent < 30 || mentalPercent < 30) && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
              <span className="text-red-400">⚠️</span>
              <span className="text-sm text-red-400">
                {healthPercent < 30 ? '健康状况危急' : '心理压力过大'}
              </span>
            </div>
          )}

          {/* Debuff 列表 */}
          {activeDebuffs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeDebuffs.map(debuff => (
                <span
                  key={debuff.id}
                  className={`
                    text-xs px-2 py-1 rounded-full
                    ${debuff.type === 'pressure' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : ''}
                    ${debuff.type === 'economic' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : ''}
                    ${!debuff.type ? 'bg-slate-700/50 text-slate-400 border border-slate-600' : ''}
                  `}
                >
                  {debuff.name}
                  {debuff.duration > 0 && ` ${debuff.duration}回`}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default GameStatusBar;
