/**
 * AttributeBar 原子组件
 * 属性条组件，显示角色六维属性（0-20范围）
 */

import React from 'react';
import { ProgressBar } from './ProgressBar';
import type { Attributes } from '@/types';

export interface AttributeBarProps {
  name: string;
  value: number; // 0-20
  icon?: string;
  attributeKey?: keyof Attributes;
  showValue?: boolean;
}

// 属性颜色映射
const attributeColors: Record<keyof Attributes, 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange'> = {
  physique: 'red',      // 体魄 - 红色
  intelligence: 'blue', // 智力 - 蓝色
  english: 'green',     // 英语 - 绿色
  social: 'yellow',     // 社交 - 黄色
  riskAwareness: 'purple', // 风险意识 - 紫色
  survival: 'orange',   // 生存 - 橙色
};

// 属性名称映射
const attributeNames: Record<keyof Attributes, string> = {
  physique: '体魄',
  intelligence: '智力',
  english: '英语',
  social: '社交',
  riskAwareness: '风险意识',
  survival: '生存',
};

// 属性图标映射（使用 Unicode emoji，可替换为自定义图标）
const attributeIcons: Record<keyof Attributes, string> = {
  physique: '💪',
  intelligence: '🧠',
  english: '📚',
  social: '💬',
  riskAwareness: '⚠️',
  survival: '🏕️',
};

export const AttributeBar = React.memo(function AttributeBar({
  name,
  value,
  icon,
  attributeKey,
  showValue = true,
}: AttributeBarProps) {
  const displayValue = Math.max(0, Math.min(20, value));
  const color = attributeKey ? attributeColors[attributeKey] : 'blue';
  const displayName = attributeKey ? attributeNames[attributeKey] : name;
  const displayIcon = icon || (attributeKey ? attributeIcons[attributeKey] : '⚡');

  // 计算属性等级描述
  const getLevelDescription = (val: number): string => {
    if (val <= 5) return '薄弱';
    if (val <= 10) return '普通';
    if (val <= 15) return '良好';
    return '卓越';
  };

  return (
    <div className="flex items-center gap-3">
      <span 
        className="text-lg flex-shrink-0" 
        aria-hidden="true"
        title={displayName}
      >
        {displayIcon}
      </span>
      <div className="flex-1 min-w-0">
        <ProgressBar
          current={displayValue}
          max={20}
          color={color}
          label={displayName}
          showValue={showValue}
          size="sm"
        />
      </div>
      <span 
        className="text-xs text-slate-500 flex-shrink-0 w-10 text-right"
        aria-label={`${displayName}等级: ${getLevelDescription(displayValue)}`}
      >
        {getLevelDescription(displayValue)}
      </span>
    </div>
  );
});

export default AttributeBar;
