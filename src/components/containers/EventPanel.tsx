/**
 * EventPanel 容器组件（重构后）
 * 使用 Presenter 架构，支持多种表现模式
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useGameStore } from '@/store';
import { EventPresenterFactory, type PresenterMode } from '@/presenters';
import type { EventViewModel } from '@/presenters/types';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { EventSystem } from '@/systems/event/EventSystem';
import { ItemSystem } from '@/systems/item/ItemSystem';
import type { GameState, ItemSlot } from '@/types';

export interface EventPanelProps {
  /** 表现模式 */
  mode?: PresenterMode;
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
 * 事件卡片组件（使用 ViewModel）
 */
const EventCard = React.memo(function EventCard({
  viewModel,
  onExecute,
  isExpanded,
  onToggle,
  state,
}: {
  viewModel: EventViewModel;
  onExecute: (eventId: string, choiceId: string, slotSelections?: Record<string, string>) => void;
  isExpanded: boolean;
  onToggle: () => void;
  state: GameState;
}) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [slotSelections, setSlotSelections] = useState<Record<string, string>>({});

  // 获取事件的可用选项
  const choices = useMemo(() => {
    return EventSystem.getAvailableChoices(state, viewModel.meta._rawEventId);
  }, [state, viewModel.meta._rawEventId]);
  
  // 获取原始事件数据（用于槽位等完整信息）
  const fullEvent = useMemo(() => {
    // 从 availableEvents 中找到原始事件
    const allEvents = EventSystem.getAvailableFixedEvents(state);
    return allEvents.find(e => e.id === viewModel.meta._rawEventId);
  }, [state, viewModel.meta._rawEventId]);
  
  // 处理槽位选择
  const handleSlotSelect = useCallback((slotId: string, itemId: string) => {
    setSlotSelections(prev => ({ ...prev, [slotId]: itemId }));
  }, []);

  // 处理执行
  const handleExecute = useCallback(() => {
    if (!selectedChoiceId) return;
    onExecute(viewModel.meta._rawEventId, selectedChoiceId, slotSelections);
    setSelectedChoiceId(null);
    setSlotSelections({});
  }, [viewModel.meta._rawEventId, selectedChoiceId, slotSelections, onExecute]);

  // 渲染槽位选择器
  const renderSlotSelector = (slot: ItemSlot) => {
    const matchingItems = ItemSystem.getMatchingItems(state, slot);
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

  return (
    <Card
      className={`mb-3 transition-all ${viewModel.available ? '' : 'opacity-60'}`}
      header={
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={onToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onToggle()}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{viewModel.icon}</span>
            <div>
              <span className="font-medium text-slate-200">{viewModel.title}</span>
              {viewModel.meta.list?.category === 'chain' && (
                <span className="ml-2 text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                  待办
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {viewModel.cost?.actionPoints !== undefined && (
              <span className={`text-xs ${viewModel.available ? 'text-blue-400' : 'text-red-400'}`}>
                AP: {viewModel.cost.actionPoints}
              </span>
            )}
            {viewModel.cost?.money !== undefined && viewModel.cost.money > 0 && (
              <span className={`text-xs ${viewModel.available ? 'text-green-400' : 'text-red-400'}`}>
                {viewModel.cost.moneyCurrency === 'CNY' ? '¥' : '$'}{viewModel.cost.money}
              </span>
            )}
            {!viewModel.available && viewModel.unavailableReason && (
              <span className="text-xs text-red-400">{viewModel.unavailableReason}</span>
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
            {viewModel.subtitle}
          </p>

          {/* 槽位选择 */}
          {fullEvent?.slots && fullEvent.slots.length > 0 && (
            <div className="mb-4 p-3 bg-slate-900/50 rounded">
              <h4 className="text-sm font-medium text-slate-300 mb-2">所需道具</h4>
              {fullEvent.slots.map(renderSlotSelector)}
            </div>
          )}

          {/* 选项列表 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-300 mb-2">选择行动</h4>
            {choices.map(choice => {
              const isSelected = selectedChoiceId === choice.id;
              
              return (
                <button
                  key={choice.id}
                  onClick={() => viewModel.available && setSelectedChoiceId(choice.id)}
                  disabled={!viewModel.available}
                  className={`
                    w-full text-left p-3 rounded border transition-all
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-slate-700 hover:border-slate-600 bg-slate-900/30'}
                    ${!viewModel.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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
              disabled={!viewModel.available || !selectedChoiceId}
              variant="primary"
              size="sm"
            >
              {!viewModel.available 
                ? viewModel.unavailableReason || '不可用'
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
  mode = 'list',
  onExecuteEvent,
  actionPoints,
}: EventPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const state = useGameStore(s => s.state);

  // 使用 Presenter 获取 ViewModel
  const viewModels = useMemo(() => {
    const presenter = EventPresenterFactory.getPresenter(mode);
    return presenter.present(state);
  }, [state, mode]);

  const handleToggle = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  // 分类事件
  const chainEvents = viewModels.filter(vm => vm.meta.list?.category === 'chain');
  const normalEvents = viewModels.filter(vm => vm.meta.list?.category !== 'chain');

  return (
    <div className="h-full flex flex-col">
      {/* 头部信息 */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg font-semibold text-slate-200">可用行动</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">行动点:</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: actionPoints }, (_, i) => (
              <span key={i} className="text-sm">⚡️</span>
            ))}
            {actionPoints === 0 && (
              <span className="text-xs text-slate-500">无</span>
            )}
          </div>
        </div>
      </div>

      {/* 事件列表 */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {viewModels.length === 0 ? (
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
                  待办事项 ({chainEvents.length})
                </h3>
                {chainEvents.map(vm => (
                  <EventCard
                    key={vm.id}
                    viewModel={vm}
                    onExecute={onExecuteEvent}
                    isExpanded={expandedId === vm.id}
                    onToggle={() => handleToggle(vm.id)}
                    state={state}
                  />
                ))}
              </div>
            )}

            {/* 普通事件 */}
            {normalEvents.length > 0 && (
              <div>
                {chainEvents.length > 0 && (
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">
                    常规行动 ({normalEvents.length})
                  </h3>
                )}
                {normalEvents.map(vm => (
                  <EventCard
                    key={vm.id}
                    viewModel={vm}
                    onExecute={onExecuteEvent}
                    isExpanded={expandedId === vm.id}
                    onToggle={() => handleToggle(vm.id)}
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
