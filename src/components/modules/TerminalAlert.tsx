/**
 * TerminalAlert 模块组件
 * 终结态警告提示，当角色进入濒死/崩溃/匮乏状态时显示
 */

import React from 'react';
import { useGameStore } from '../../store';

/**
 * 终结态配置
 */
const TERMINAL_CONFIG = {
  DYING: {
    icon: '☠️',
    title: '濒死状态',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    description: '你的身体状况极度危险，需要立即治疗或休息',
    advice: '寻找医疗帮助，使用恢复健康的道具，或休息恢复',
  },
  BREAKDOWN: {
    icon: '😵',
    title: '精神崩溃',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    description: '你的心理状态濒临崩溃，需要放松和调整',
    advice: '寻找安静的地方休息，与友善的人交流，或使用恢复心理健康的道具',
  },
  DESTITUTE: {
    icon: '💸',
    title: '资金匮乏',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    description: '你几乎没有钱了，生活将变得更加困难',
    advice: '尽快找到工作赚取金钱，考虑出售不必要的物品',
  },
} as const;

/**
 * 终结态警告组件
 */
export const TerminalAlert = React.memo(function TerminalAlert() {
  const { status } = useGameStore(s => ({ 
    status: s.state.character.status 
  }));
  
  const { terminalState, terminalCountdown } = status;
  
  if (!terminalState) return null;

  const config = TERMINAL_CONFIG[terminalState];
  const isCritical = terminalCountdown <= 1;

  return (
    <div className={`
      ${config.bgColor} border ${config.borderColor} rounded-lg p-4
      ${isCritical ? 'animate-pulse' : ''}
    `}>
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <span className="text-3xl flex-shrink-0">{config.icon}</span>
        
        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {/* 标题和倒计时 */}
          <div className="flex items-center justify-between mb-1">
            <h3 className={`font-semibold ${config.color}`}>
              {config.title}
            </h3>
            <span className={`
              text-sm font-mono font-bold
              ${isCritical ? 'text-red-400 animate-pulse' : config.color}
            `}>
              {terminalCountdown === 0 
                ? '危急！' 
                : `剩余 ${terminalCountdown} 回合`}
            </span>
          </div>

          {/* 描述 */}
          <p className="text-sm text-slate-300 mb-2">
            {config.description}
          </p>

          {/* 建议 */}
          <p className="text-xs text-slate-500">
            💡 {config.advice}
          </p>
        </div>
      </div>

      {/* 紧急提示 */}
      {isCritical && (
        <div className="mt-3 pt-3 border-t border-red-500/20 text-center">
          <span className="text-sm text-red-400 font-medium">
            立即采取行动，否则游戏将结束！
          </span>
        </div>
      )}
    </div>
  );
});

export default TerminalAlert;
