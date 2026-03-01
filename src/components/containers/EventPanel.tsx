/**
 * EventPanel 容器组件
 * 显示可用固定事件列表，支持展开查看详情和执行
 */

import React, { useState, useCallback } from 'react';
import type { GameEvent, EventChoice, ItemSlot } from '../../types';
import { useGameStore } from '../../store';
import { EventSystem } from '../../systems/event/EventSystem';
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { ItemSystem } from '../../systems/item/ItemSystem';

export interface EventPanelProps {
  /** 可用事件列表 */
  availableEvents: GameEvent[];
  /** 执行事件回调 */
  onExecuteEvent: (
    eventId: string,
    choiceId: string,
    slotSelections?: Record<string, string>
  ) => void;
  /** 当前行动点 */
  actionPoints: number;
}

/**
 * 事件卡片组件
 */
const EventCard = React.memo(function EventCard({
  event,
  actionPoints,
  onExecute,
  isExpanded,
  onToggle,
  state,
}: {
  event: GameEvent;
  actionPoints: number;
  onExecute: (
    eventId: string,
    choiceId: string,
    slotSelections?: Record<string, string>
  ) => void;
  isExpanded: boolean;
  onToggle: () => void;
  state: ReturnType<typeof useGameStore>['state'];
}) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [slotSelections, setSlotSelections] = useState<Record<string, string>>({});

  // 获取事件的可用选项
  const choices = EventSystem.getAvailableChoices(state, event.id);
  
  // 计算事件消耗
  const apCost = event.execution?.actionPointCost ?? 0;
  const moneyCost = event.execution?.moneyCost ?? 0;
  const moneyCurrency = event.execution?.moneyCurrency ?? 'CNY';
  
  // 检查是否可执行
  const canExecute = actionPoints >= apCost;
  const hasSufficientMoney = moneyCost === 0 || (
    moneyCurrency === 'CNY' 
      ? state.character.resources.money.cny >= moneyCost
      : state.character.resources.money.usd >= moneyCost
  );
  const isExecutable = canExecute && hasSufficientMoney;

  // 获取槽位匹配的道具
  const getMatchingItems = useCallback((slot: ItemSlot) => {
    return ItemSystem.getMatchingItems(state, slot);
  }, [state]);

  // 处理槽位选择
  const handleSlotSelect = useCallback((slotId: string, itemId: string) => {
    setSlotSelections(prev => ({ ...prev, [slotId]: itemId }));
  }, []);

  // 处理执行
  const handleExecute = useCallback(() => {
    if (!selectedChoiceId) return;
    onExecute(event.id, selectedChoiceId, slotSelections);
    setSelectedChoiceId(null);
    setSlotSelections({});
  }, [event.id, selectedChoiceId, slotSelections, onExecute]);

  // 渲染槽位选择器
  const renderSlotSelector = (slot: ItemSlot) => {
    const matchingItems = getMatchingItems(slot);
    const selectedItemId = slotSelections[slot.id];
    
    return (
      <div key={slot.id} className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-slate-300">
            {slot.name}
            {slot.required && <span className="text-red-400 ml-1">*</span>}
          </span>
          {matchingItems.length === 0 && slot.required && (
            <span className="text-xs text-red-400">缺少所需道具</span>
          )}
        </div>
        {matchingItems.length > 0 ? (
          <select
            value={selectedItemId || ''}
            onChange={(e) => handleSlotSelect(slot.id, e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">{slot.required ? '选择道具...' : '不使用道具'}</option>
            {matchingItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-xs text-slate-500 bg-slate-900/50 rounded px-3 py-2">
            {slot.description || '无可用道具'}
          </div>
        )}
      </div>
    );
  };

  // 检查选项是否可用
  const isChoiceAvailable = (choice: EventChoice): boolean => {
    if (!choice.condition) return true;
    // 简化检查，实际需要根据条件类型判断
    return true;
  };

  return (
    <Card
      className={`mb-3 transition-all ${isExecutable ? '' : 'opacity-75'}`}
      header={
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={onToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onToggle()}
        >
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-200">{event.name}</span>
            {event.execution?.repeatable && (
              <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-400">
                可重复
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {apCost > 0 && (
              <span className={`text-xs ${canExecute ? 'text-blue-400' : 'text-red-400'}`}>
                AP: {apCost}
              </span>
            )}
            {moneyCost > 0 && (
              <span className={`text-xs ${hasSufficientMoney ? 'text-green-400' : 'text-red-400'}`}>
                {moneyCurrency === 'CNY' ? '¥' : '$'}{moneyCost}
              </span>
            )}
            <span className="text-slate-500 text-sm">
              {isExpanded ? '▼' : '▶'}
            </span>
          </div>
        </div>
      }
    >
      {isExpanded && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">
            {event.description}
          </p>

          {/* 槽位选择 */}
          {event.slots && event.slots.length > 0 && (
            <div className="mb-4 p-3 bg-slate-900/50 rounded">
              <h4 className="text-sm font-medium text-slate-300 mb-2">所需道具</h4>
              {event.slots.map(renderSlotSelector)}
            </div>
          )}

          {/* 选项列表 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-300 mb-2">选择行动</h4>
            {choices.map(choice => {
              const available = isChoiceAvailable(choice);
              const isSelected = selectedChoiceId === choice.id;
              
              return (
                <button
                  key={choice.id}
                  onClick={() => available && setSelectedChoiceId(choice.id)}
                  disabled={!available}
                  className={`
                    w-full text-left p-3 rounded border transition-all
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-slate-700 hover:border-slate-600 bg-slate-900/30'}
                    ${!available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isSelected ? 'text-blue-300' : 'text-slate-300'}`}>
                      {choice.name}
                    </span>
                    {isSelected && <span className="text-blue-500">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 执行按钮 */}
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleExecute}
              disabled={!isExecutable || !selectedChoiceId}
              variant="primary"
              size="sm"
            >
              {!isExecutable 
                ? !canExecute ? '行动点不足' : '资金不足'
                : !selectedChoiceId 
                  ? '请选择行动' 
                  : '执行'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
});

/**
 * 事件面板主组件
 */
export const EventPanel = React.memo(function EventPanel({
  availableEvents,
  onExecuteEvent,
  actionPoints,
}: EventPanelProps) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const state = useGameStore(s => s.state);

  const handleToggle = useCallback((eventId: string) => {
    setExpandedEventId(prev => prev === eventId ? null : eventId);
  }, []);

  // 分类事件
  const fixedEvents = availableEvents.filter(e => e.category === 'FIXED');
  const chainEvents = availableEvents.filter(e => e.category === 'CHAIN');

  return (
    <div className="h-full flex flex-col">
      {/* 头部信息 */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg font-semibold text-slate-200">可用行动</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">行动点:</span>
          <span className={`font-mono font-bold ${actionPoints > 0 ? 'text-blue-400' : 'text-red-400'}`}>
            {actionPoints}
          </span>
        </div>
      </div>

      {/* 事件列表 */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {availableEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>暂无可用行动</p>
            <p className="text-sm mt-1">结束回合以继续</p>
          </div>
        ) : (
          <>
            {/* 链式事件（优先级高） */}
            {chainEvents.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-2 px-1">
                  待办事项
                </h3>
                {chainEvents.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    actionPoints={actionPoints}
                    onExecute={onExecuteEvent}
                    isExpanded={expandedEventId === event.id}
                    onToggle={() => handleToggle(event.id)}
                    state={state}
                  />
                ))}
              </div>
            )}

            {/* 固定事件 */}
            {fixedEvents.length > 0 && (
              <div>
                {chainEvents.length > 0 && (
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">
                    常规行动
                  </h3>
                )}
                {fixedEvents.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    actionPoints={actionPoints}
                    onExecute={onExecuteEvent}
                    isExpanded={expandedEventId === event.id}
                    onToggle={() => handleToggle(event.id)}
                    state={state}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default EventPanel;
