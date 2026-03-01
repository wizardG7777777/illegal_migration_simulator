/**
 * EventCard 模块组件
 * 事件卡片，显示事件名称、描述、选项列表
 */

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import type { GameEvent, ItemSlot, EventChoice } from '@/types';

export interface EventCardProps {
  event: GameEvent;
  inventoryItems: Array<{ itemId: string; name: string; tags: string[]; priority: number }>;
  characterAttributes: Record<string, number>;
  onExecute: (choiceId: string, slotSelections?: Record<string, string>) => void;
  disabled?: boolean;
}

// 事件类型标签映射
const eventTypeLabels: Record<GameEvent['category'], { text: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  RANDOM: { text: '随机事件', variant: 'info' },
  FIXED: { text: '固定事件', variant: 'default' },
  CHAIN: { text: '链式事件', variant: 'warning' },
  POLICY_PRESSURE: { text: '政策压力', variant: 'danger' },
};

export const EventCard = React.memo(function EventCard({
  event,
  inventoryItems,
  characterAttributes,
  onExecute,
  disabled = false,
}: EventCardProps) {
  const [slotSelections, setSlotSelections] = useState<Record<string, string>>({});

  // 处理槽位选择
  const handleSlotSelection = useCallback((slotId: string, itemId: string) => {
    setSlotSelections(prev => ({ ...prev, [slotId]: itemId }));
  }, []);

  // 检查选项是否可用
  const isChoiceAvailable = (choice: EventChoice): boolean => {
    if (!choice.condition) return true;
    
    const { type } = choice.condition;
    
    if (type === 'ATTRIBUTE') {
      const { attribute, operator, value } = choice.condition;
      const attrValue = characterAttributes[attribute] || 0;
      switch (operator) {
        case '>': return attrValue > value;
        case '<': return attrValue < value;
        case '>=': return attrValue >= value;
        case '<=': return attrValue <= value;
        case '==': return attrValue === value;
        default: return true;
      }
    }
    
    // 其他条件类型简化处理
    return true;
  };

  // 获取匹配槽位的物品
  const getMatchingItems = (slot: ItemSlot) => {
    return inventoryItems.filter(item => 
      slot.tags.some(tag => item.tags.includes(tag as any))
    ).sort((a, b) => a.priority - b.priority);
  };

  // 检查所有必需槽位是否已选择
  const areRequiredSlotsFilled = (): boolean => {
    if (!event.slots) return true;
    return event.slots
      .filter(slot => slot.required)
      .every(slot => slotSelections[slot.id]);
  };

  const typeLabel = eventTypeLabels[event.category];

  return (
    <Card className="w-full max-w-2xl" hover={false}>
      {/* 头部：事件名称和类型 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">{event.name}</h3>
          <Badge variant={typeLabel.variant} size="sm">{typeLabel.text}</Badge>
        </div>
        {event.execution && (
          <div className="text-right text-sm text-slate-400">
            <div>消耗: {event.execution.actionPointCost} 行动点</div>
            {event.execution.moneyCost && (
              <div>
                {event.execution.moneyCurrency === 'CNY' ? '¥' : '$'}
                {event.execution.moneyCost}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 事件描述 */}
      <p className="text-slate-300 mb-6 leading-relaxed">
        {event.description}
      </p>

      {/* 物品槽位选择 */}
      {event.slots && event.slots.length > 0 && (
        <div className="mb-6 space-y-3">
          <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            所需物品
          </h4>
          {event.slots.map(slot => {
            const matchingItems = getMatchingItems(slot);
            const selectedItem = slotSelections[slot.id];
            
            return (
              <div 
                key={slot.id}
                className="bg-slate-900/50 rounded-lg p-3 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-300">
                    {slot.name}
                    {slot.required && <span className="text-red-400 ml-1">*</span>}
                  </span>
                  <span className="text-xs text-slate-500">{slot.description}</span>
                </div>
                
                {matchingItems.length > 0 ? (
                  <select
                    value={selectedItem || ''}
                    onChange={(e) => handleSlotSelection(slot.id, e.target.value)}
                    disabled={disabled}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">
                      {slot.required ? '请选择物品...' : '不使用物品'}
                    </option>
                    {matchingItems.map(item => (
                      <option key={item.itemId} value={item.itemId}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-red-400">
                    {slot.required ? '没有符合条件的物品' : '无可用物品'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 选项列表 */}
      {event.choices && event.choices.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            选择行动
          </h4>
          {event.choices.map(choice => {
            const available = isChoiceAvailable(choice);
            return (
              <Button
                key={choice.id}
                variant={available ? 'secondary' : 'ghost'}
                size="md"
                disabled={disabled || !available || !areRequiredSlotsFilled()}
                onClick={() => onExecute(choice.id, slotSelections)}
                className="w-full justify-start text-left"
              >
                <div className="flex flex-col items-start">
                  <span className={available ? '' : 'text-slate-500'}>
                    {choice.name}
                  </span>
                  {!available && choice.condition?.type === 'ATTRIBUTE' && (
                    <span className="text-xs text-red-400">
                      需要 {choice.condition.attribute} {choice.condition.operator} {choice.condition.value}
                    </span>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      )}
    </Card>
  );
});

export default EventCard;
