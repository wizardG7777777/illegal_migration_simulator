/**
 * InventoryGrid 模块组件
 * 物品网格，显示消耗品和常驻道具
 */

import React, { useState } from 'react';
import { Card } from '@/components/primitives/Card';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import type { AnyItem, ConsumableItem, PermanentItem } from '@/types';



export interface InventoryGridProps {
  consumables: Array<{ item: ConsumableItem; count: number }>;
  permanents: Array<{ item: PermanentItem; slot: number }>;
  onUseItem?: (itemId: string) => void;
  onViewItem?: (item: AnyItem) => void;
  className?: string;
}

// 物品标签映射
const tagLabels: Record<string, string> = {
  transport: '交通',
  weapon: '武器',
  medical: '医疗',
  food: '食物',
  book: '书籍',
  identity: '身份',
  lodging: '住宿',
  tool: '工具',
  contact: '人脉',
  document: '文件',
  membership: '会员',
  guide: '向导',
  cross_scene: '跨场景',
};



export const InventoryGrid = React.memo(function InventoryGrid({
  consumables,
  permanents,
  onUseItem,
  onViewItem,
  className = '',
}: InventoryGridProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'consumable' | 'permanent'>('all');

  const hasItems = consumables.length > 0 || permanents.length > 0;

  // 分类显示的物品
  const filteredItems = () => {
    switch (activeTab) {
      case 'consumable':
        return { consumables, permanents: [] };
      case 'permanent':
        return { consumables: [], permanents };
      default:
        return { consumables, permanents };
    }
  };

  const { consumables: showConsumables, permanents: showPermanents } = filteredItems();

  return (
    <Card className={`w-full ${className}`}>
      {/* 标签切换 */}
      <div className="flex items-center gap-2 mb-4">
        {(['all', 'consumable', 'permanent'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${activeTab === tab 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }
            `}
          >
            {tab === 'all' && `全部 (${consumables.length + permanents.length})`}
            {tab === 'consumable' && `消耗品 (${consumables.length})`}
            {tab === 'permanent' && `常驻 (${permanents.length})`}
          </button>
        ))}
      </div>

      {/* 空状态 */}
      {!hasItems && (
        <div className="text-center py-8 text-slate-500">
          <span className="text-4xl block mb-2">📦</span>
          <p>背包空空如也</p>
        </div>
      )}

      {/* 消耗品列表 */}
      {showConsumables.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            消耗品
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {showConsumables.map(({ item, count }) => (
              <div
                key={item.id}
                onClick={() => onViewItem?.(item)}
                className="
                  bg-slate-700/50 rounded-lg p-3
                  border border-slate-600 hover:border-slate-500
                  cursor-pointer transition-all
                "
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-slate-200 text-sm">{item.name}</span>
                  {count > 1 && (
                    <Badge variant="neutral" size="sm">
                      x{count}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                  {item.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-xs text-slate-500">
                      {tagLabels[tag] || tag}
                    </span>
                  ))}
                </div>
                {item.useTarget === 'self' && onUseItem && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full mt-2"
                    onClick={() => {
                      onUseItem(item.id);
                    }}
                  >
                    使用
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 常驻道具列表 */}
      {showPermanents.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            常驻道具
          </h4>
          <div className="space-y-2">
            {showPermanents.map(({ item, slot }) => (
              <div
                key={item.id}
                onClick={() => onViewItem?.(item)}
                className="
                  flex items-center gap-3
                  bg-slate-700/30 rounded-lg p-3
                  border border-slate-600 hover:border-slate-500
                  cursor-pointer transition-all
                "
              >
                {/* 槽位编号 */}
                <div className="
                  w-8 h-8 rounded-full bg-slate-700
                  flex items-center justify-center
                  text-sm font-bold text-slate-400
                ">
                  {slot + 1}
                </div>

                {/* 物品信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-200">{item.name}</span>
                    {item.upkeepCost && item.upkeepCost.moneyPerTurn > 0 && (
                      <Badge variant="warning" size="sm">
                        ${item.upkeepCost.moneyPerTurn}/回合
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {item.description}
                  </p>
                </div>

                {/* 标签 */}
                <div className="flex flex-wrap gap-1 justify-end">
                  {item.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">
                      {tagLabels[tag] || tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
});

export default InventoryGrid;
