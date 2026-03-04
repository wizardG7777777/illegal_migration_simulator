/**
 * StatusBar 模块组件
 * 顶部状态栏，显示角色关键状态信息
 */

import React from 'react';
import { useGameStore } from '../../store';
import { SceneSystem } from '../../systems/scene/SceneSystem';
import { CharacterSystem } from '../../systems/character/CharacterSystem';
import type { SceneId, EnvironmentalDebuff } from '../../types';

const SCENE_NAMES: Record<SceneId, string> = {
  act1: '国内准备',
  act2: '跨境穿越',
  act3: '美国生存',
};

const SCENE_ICONS: Record<SceneId, string> = {
  act1: '🏠',
  act2: '🌲',
  act3: '🗽',
};

/**
 * 资源条组件
 */
const ResourceBar = React.memo(function ResourceBar({
  label,
  current,
  max,
  colorClass,
}: {
  label: string;
  current: number;
  max: number;
  colorClass: string;
}) {
  const percent = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-8">{label}</span>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-xs font-mono w-12 text-right ${
        percent < 20 ? 'text-red-400' : 'text-slate-400'
      }`}>
        {current}/{max}
      </span>
    </div>
  );
});

/**
 * Debuff标签组件
 */
const DebuffTag = React.memo(function DebuffTag({
  name,
  duration,
  type,
}: {
  name: string;
  duration: number;
  type: 'pressure' | 'economic';
}) {
  const typeStyles = {
    pressure: 'bg-red-500/10 text-red-400 border-red-500/30',
    economic: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  };

  return (
    <span className={`
      inline-flex items-center gap-1
      text-xs px-2 py-1 rounded border
      ${typeStyles[type]}
    `}>
      {name}
      <span className="opacity-60">({duration})</span>
    </span>
  );
});

/**
 * 状态栏主组件
 */
export const StatusBar = React.memo(function StatusBar() {
  const state = useGameStore(s => s.state);
  
  // 提取数据
  const { 
    currentScene, 
    turnCount, 
    activeDebuffs 
  } = state.scene;
  
  const { 
    resources 
  } = state.character;
  
  const { health, mental, money, actionPoints } = resources;

  // 计算生活成本（场景3）
  const livingCost = currentScene === 'act3' 
    ? SceneSystem.calculateLivingCost(state)
    : null;
  
  const currentMoney = currentScene === 'act3' ? money.usd : money.cny;
  const canAfford = livingCost !== null ? currentMoney >= livingCost : true;

  // 计算终结态
  const terminalStatus = CharacterSystem.checkTerminalState(state);
  const terminalInfo = terminalStatus.character.status.terminalState ? {
    type: terminalStatus.character.status.terminalState,
    countdown: terminalStatus.character.status.terminalCountdown,
  } : null;

  const healthPercent = Math.round((health.current / health.max) * 100);
  const mentalPercent = Math.round((mental.current / mental.max) * 100);

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      {/* 第一行：场景和回合 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{SCENE_ICONS[currentScene]}</span>
          <div>
            <span className="text-sm font-medium text-slate-200">
              {SCENE_NAMES[currentScene]}
            </span>
            <span className="text-xs text-slate-500 ml-2">
              回合 {turnCount}
            </span>
          </div>
        </div>
        
        {/* 行动点 */}
        <div className="flex items-center gap-2">
          <span className="text-sm">⚡</span>
          <span className={`text-sm font-bold ${
            actionPoints.current > 0 ? 'text-blue-400' : 'text-red-400'
          }`}>
            {actionPoints.current}
          </span>
          <span className="text-xs text-slate-500">/ {actionPoints.max} AP</span>
        </div>
      </div>

      {/* 第二行：资源 */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <ResourceBar
          label="健康"
          current={health.current}
          max={health.max}
          colorClass={healthPercent > 60 ? 'bg-green-500' : healthPercent > 30 ? 'bg-yellow-500' : 'bg-red-500'}
        />
        <ResourceBar
          label="心理"
          current={mental.current}
          max={mental.max}
          colorClass={mentalPercent > 60 ? 'bg-blue-500' : mentalPercent > 30 ? 'bg-yellow-500' : 'bg-red-500'}
        />
      </div>

      {/* 第三行：金钱和生活成本 */}
      <div className="flex items-center justify-between text-sm mb-3">
        <div className="flex items-center gap-4">
          <span className="text-slate-400">
            💰 ¥{money.cny.toLocaleString()}
          </span>
          <span className="text-slate-400">
            💵 ${money.usd.toLocaleString()}
          </span>
        </div>
        
        {livingCost !== null && (
          <div className={`text-xs ${canAfford ? 'text-slate-500' : 'text-red-400'}`}>
            月度成本: ${livingCost.toLocaleString()}
            {!canAfford && ' (不足)'}
          </div>
        )}
      </div>

      {/* 第四行：Debuffs */}
      {activeDebuffs.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-700">
          {activeDebuffs.map((debuff: EnvironmentalDebuff) => (
            <DebuffTag
              key={debuff.id}
              name={debuff.name}
              duration={debuff.duration}
              type={debuff.type}
            />
          ))}
        </div>
      )}

      {/* 终结态警告（紧凑版） */}
      {terminalInfo && (
        <div className={`
          mt-3 p-2 rounded text-xs flex items-center gap-2
          ${terminalInfo.type === 'DYING' ? 'bg-red-500/10 text-red-400' : ''}
          ${terminalInfo.type === 'BREAKDOWN' ? 'bg-purple-500/10 text-purple-400' : ''}
          ${terminalInfo.type === 'DESTITUTE' ? 'bg-amber-500/10 text-amber-400' : ''}
        `}>
          <span>
            {terminalInfo.type === 'DYING' && '☠️'}
            {terminalInfo.type === 'BREAKDOWN' && '😵'}
            {terminalInfo.type === 'DESTITUTE' && '💸'}
          </span>
          <span>
            {terminalInfo.type === 'DYING' && '濒死'}
            {terminalInfo.type === 'BREAKDOWN' && '崩溃'}
            {terminalInfo.type === 'DESTITUTE' && '匮乏'}
            {' '}
            {terminalInfo.countdown > 0 
              ? `剩余 ${terminalInfo.countdown} 回合` 
              : '危急！'}
          </span>
        </div>
      )}
    </div>
  );
});

export default StatusBar;
