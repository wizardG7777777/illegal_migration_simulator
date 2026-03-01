/**
 * CharacterPanel 模块组件
 * 角色面板，显示角色名称、六维属性、资源
 */

import React from 'react';
import { Card } from '@/components/primitives/Card';
import { AttributeBar } from '@/components/primitives/AttributeBar';
import { ResourceBar } from '@/components/primitives/ResourceBar';
import { DualMoneyDisplay } from '@/components/primitives/MoneyDisplay';
import { Badge } from '@/components/primitives/Badge';
import type { CharacterData, TerminalState, SceneId } from '@/types';

export interface CharacterPanelProps {
  character: CharacterData;
  currentScene?: SceneId;
  className?: string;
}

// 终结态配置
const terminalConfig: Record<TerminalState, { label: string; variant: 'warning' | 'danger' | 'neutral'; icon: string }> = {
  DYING: { label: '濒死', variant: 'danger', icon: '💀' },
  BREAKDOWN: { label: '崩溃', variant: 'warning', icon: '😵' },
  DESTITUTE: { label: '匮乏', variant: 'neutral', icon: '💸' },
};

// 场景名称映射
const sceneNames: Record<SceneId, string> = {
  act1: '国内准备',
  act2: '跨境穿越',
  act3: '美国生存',
};

export const CharacterPanel = React.memo(function CharacterPanel({
  character,
  currentScene,
  className = '',
}: CharacterPanelProps) {
  const { name, attributes, resources, status } = character;
  const { health, mental, actionPoints, money } = resources;
  const hasTerminalState = status.terminalState !== null;

  return (
    <Card 
      className={`w-full ${className}`}
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👤</span>
            <div>
              <h2 className="text-lg font-bold text-slate-100">{name}</h2>
              {currentScene && (
                <span className="text-xs text-slate-400">{sceneNames[currentScene]}</span>
              )}
            </div>
          </div>
          {hasTerminalState && status.terminalState && (
            <Badge variant={terminalConfig[status.terminalState].variant} size="md">
              <span className="mr-1">{terminalConfig[status.terminalState].icon}</span>
              {terminalConfig[status.terminalState].label}
              {status.terminalCountdown > 0 && ` (${status.terminalCountdown}回合)`}
            </Badge>
          )}
        </div>
      }
    >
      {/* 资源条区域 */}
      <div className="mb-6 space-y-3">
        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
          资源状态
        </h3>
        <ResourceBar
          type="health"
          current={health.current}
          max={health.max}
        />
        <ResourceBar
          type="mental"
          current={mental.current}
          max={mental.max}
        />
        <ResourceBar
          type="actionPoints"
          current={actionPoints.current}
          max={actionPoints.max}
        />
        
        {/* 金钱显示 */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">资金</span>
            <DualMoneyDisplay cny={money.cny} usd={money.usd} size="md" />
          </div>
        </div>
      </div>

      {/* 属性条区域 */}
      <div>
        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
          角色属性
        </h3>
        <div className="space-y-2">
          <AttributeBar
            name="体魄"
            value={attributes.physique}
            attributeKey="physique"
          />
          <AttributeBar
            name="智力"
            value={attributes.intelligence}
            attributeKey="intelligence"
          />
          <AttributeBar
            name="英语"
            value={attributes.english}
            attributeKey="english"
          />
          <AttributeBar
            name="社交"
            value={attributes.social}
            attributeKey="social"
          />
          <AttributeBar
            name="风险意识"
            value={attributes.riskAwareness}
            attributeKey="riskAwareness"
          />
          <AttributeBar
            name="生存"
            value={attributes.survival}
            attributeKey="survival"
          />
        </div>
      </div>

      {/* 终结态警告 */}
      {hasTerminalState && status.terminalState && (
        <div className={`mt-4 p-3 rounded-lg border ${
          status.terminalState === 'DYING' ? 'bg-red-900/20 border-red-700/50' :
          status.terminalState === 'BREAKDOWN' ? 'bg-purple-900/20 border-purple-700/50' :
          'bg-yellow-900/20 border-yellow-700/50'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{terminalConfig[status.terminalState].icon}</span>
            <span className={`font-medium ${
              status.terminalState === 'DYING' ? 'text-red-400' :
              status.terminalState === 'BREAKDOWN' ? 'text-purple-400' :
              'text-yellow-400'
            }`}>
              处于{terminalConfig[status.terminalState].label}状态
            </span>
          </div>
          {status.terminalCountdown > 0 && (
            <p className="text-sm text-slate-400 mt-1">
              还剩 {status.terminalCountdown} 回合必须恢复，否则游戏结束
            </p>
          )}
        </div>
      )}
    </Card>
  );
});

export default CharacterPanel;
