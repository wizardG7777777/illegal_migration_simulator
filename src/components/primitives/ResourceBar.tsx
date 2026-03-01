/**
 * ResourceBar 原子组件
 * 资源条组件，显示健康/心理/行动点资源
 */

import React from 'react';
import { ProgressBar } from './ProgressBar';

export interface ResourceBarProps {
  type: 'health' | 'mental' | 'actionPoints';
  current: number;
  max: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// 资源配置
const resourceConfig = {
  health: {
    name: '身体健康',
    icon: '❤️',
    color: 'red' as const,
    lowThreshold: 30,
    criticalThreshold: 10,
  },
  mental: {
    name: '心理健康',
    icon: '🧘',
    color: 'blue' as const,
    lowThreshold: 30,
    criticalThreshold: 10,
  },
  actionPoints: {
    name: '行动点',
    icon: '⚡',
    color: 'yellow' as const,
    lowThreshold: 2,
    criticalThreshold: 1,
  },
};

export const ResourceBar = React.memo(function ResourceBar({
  type,
  current,
  max,
  showValue = true,
  size = 'md',
}: ResourceBarProps) {
  const config = resourceConfig[type];
  const percentage = (current / max) * 100;
  
  // 根据数值确定颜色状态
  let color = config.color;
  if (percentage <= 20) {
    color = 'red'; // 极低值显示红色警告
  }

  // 获取状态描述
  const getStatusText = (): string => {
    if (current <= 0) return '危险';
    if (percentage <= 20) return '极低';
    if (percentage <= 50) return '偏低';
    return '正常';
  };

  const statusColor = percentage <= 20 ? 'text-red-400' : 
                      percentage <= 50 ? 'text-yellow-400' : 'text-slate-400';

  return (
    <div className="flex items-center gap-3">
      <span 
        className="text-lg flex-shrink-0"
        aria-hidden="true"
        title={config.name}
      >
        {config.icon}
      </span>
      <div className="flex-1 min-w-0">
        <ProgressBar
          current={current}
          max={max}
          color={color}
          label={config.name}
          showValue={showValue}
          size={size}
        />
      </div>
      <span 
        className={`text-xs flex-shrink-0 w-10 text-right ${statusColor}`}
        aria-label={`${config.name}状态: ${getStatusText()}`}
      >
        {getStatusText()}
      </span>
    </div>
  );
});

export default ResourceBar;
