/**
 * EventGraphPanel 组件
 * 
 * 事件关系图谱面板
 * - 显示所有事件节点（按场景分色）
 * - 显示事件链连接（CHAIN -> nextEventId）
 * - 显示解锁条件
 * - 搜索高亮
 * - 点击节点查看详情
 */

import React, { useState, useMemo } from 'react';
import type { GameEvent, EventCategory } from '../../types/event';
import { Card } from '../../components/primitives';

/**
 * 事件图谱属性
 */
interface EventGraphPanelProps {
  /** 所有事件 */
  events: GameEvent[];
}

/**
 * 场景颜色映射
 */
const sceneColors: Record<string, string> = {
  act1: 'border-blue-500 bg-blue-500/10',
  act2: 'border-green-500 bg-green-500/10',
  act3: 'border-purple-500 bg-purple-500/10',
  random: 'border-yellow-500 bg-yellow-500/10',
};

/**
 * 事件类型颜色
 */
const categoryColors: Record<EventCategory, string> = {
  FIXED: '🟦',
  RANDOM: '🟨',
  CHAIN: '🟩',
  POLICY_PRESSURE: '🟥',
};

/**
 * 事件类型标签
 */
const categoryLabels: Record<EventCategory, string> = {
  FIXED: '固定',
  RANDOM: '随机',
  CHAIN: '链式',
  POLICY_PRESSURE: '政策',
};

/**
 * 获取事件的主场景
 */
function getPrimaryScene(event: GameEvent): string {
  if (event.scenes.length === 0) return 'random';
  return event.scenes[0];
}

/**
 * 事件节点详情弹窗
 */
function EventDetailModal({
  event,
  onClose,
  allEvents,
}: {
  event: GameEvent;
  onClose: () => void;
  allEvents: GameEvent[];
}) {
  // 查找链式事件的前置和后置
  const chainSource = useMemo(() => {
    return allEvents.find(
      e => e.chain?.nextEventId === event.id
    );
  }, [event.id, allEvents]);

  const chainTarget = useMemo(() => {
    if (!event.chain?.nextEventId) return null;
    return allEvents.find(e => e.id === event.chain!.nextEventId);
  }, [event, allEvents]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-100">{event.name}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">ID:</span>
              <code className="ml-2 text-slate-300">{event.id}</code>
            </div>
            <div>
              <span className="text-slate-500">类型:</span>
              <span className="ml-2">{categoryLabels[event.category]}</span>
            </div>
            <div>
              <span className="text-slate-500">场景:</span>
              <span className="ml-2">{event.scenes.join(', ')}</span>
            </div>
            {event.execution && (
              <>
                <div>
                  <span className="text-slate-500">行动点消耗:</span>
                  <span className="ml-2">{event.execution.actionPointCost}</span>
                </div>
                <div>
                  <span className="text-slate-500">可重复:</span>
                  <span className="ml-2">{event.execution.repeatable ? '是' : '否'}</span>
                </div>
              </>
            )}
          </div>

          {/* 描述 */}
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-1">描述</h4>
            <p className="text-sm text-slate-300">{event.description}</p>
          </div>

          {/* 链式事件关系 */}
          {(chainSource || chainTarget) && (
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">链式事件关系</h4>
              {chainSource && (
                <div className="text-sm mb-1">
                  <span className="text-slate-500">前置事件:</span>
                  <span className="ml-2 text-green-400">{chainSource.name}</span>
                </div>
              )}
              {chainTarget && (
                <div className="text-sm">
                  <span className="text-slate-500">后续事件:</span>
                  <span className="ml-2 text-blue-400">{chainTarget.name}</span>
                </div>
              )}
            </div>
          )}

          {/* 触发配置 */}
          {event.trigger && (
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">触发配置</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {event.trigger.weight !== undefined && (
                  <div>
                    <span className="text-slate-500">权重:</span>
                    <span className="ml-2">{event.trigger.weight}</span>
                  </div>
                )}
                {event.trigger.cooldown !== undefined && (
                  <div>
                    <span className="text-slate-500">冷却:</span>
                    <span className="ml-2">{event.trigger.cooldown}回合</span>
                  </div>
                )}
                {event.trigger.maxTriggers !== undefined && (
                  <div>
                    <span className="text-slate-500">最大次数:</span>
                    <span className="ml-2">{event.trigger.maxTriggers}</span>
                  </div>
                )}
                {event.trigger.minSceneTurn !== undefined && (
                  <div>
                    <span className="text-slate-500">最早回合:</span>
                    <span className="ml-2">{event.trigger.minSceneTurn}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 选项 */}
          {event.choices && event.choices.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">
                选项 ({event.choices.length})
              </h4>
              <div className="space-y-2">
                {event.choices.map((choice, idx) => (
                  <div
                    key={choice.id}
                    className="p-2 bg-slate-900 rounded text-sm"
                  >
                    <div className="font-medium text-slate-300">
                      {idx + 1}. {choice.name}
                    </div>
                    {choice.condition && (
                      <div className="text-xs text-slate-500 mt-1">
                        条件: {choice.condition.type}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 事件图谱面板
 */
export function EventGraphPanel({ events }: EventGraphPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null);
  const [filterCategory, setFilterCategory] = useState<EventCategory | 'all'>('all');
  const [filterScene, setFilterScene] = useState<string>('all');

  // 获取所有场景
  const scenes = useMemo(() => {
    const sceneSet = new Set<string>();
    events.forEach(e => e.scenes.forEach(s => sceneSet.add(s)));
    return Array.from(sceneSet).sort();
  }, [events]);

  // 过滤事件
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchId = event.id.toLowerCase().includes(query);
        const matchName = event.name.toLowerCase().includes(query);
        if (!matchId && !matchName) return false;
      }

      // 类型过滤
      if (filterCategory !== 'all' && event.category !== filterCategory) {
        return false;
      }

      // 场景过滤
      if (filterScene !== 'all' && !event.scenes.includes(filterScene as any)) {
        return false;
      }

      return true;
    });
  }, [events, searchQuery, filterCategory, filterScene]);

  // 构建链式事件映射
  const chainMap = useMemo(() => {
    const map = new Map<string, string[]>(); // eventId -> nextEventIds
    events.forEach(event => {
      if (event.chain?.nextEventId) {
        const sources = map.get(event.chain.nextEventId) || [];
        sources.push(event.id);
        map.set(event.chain.nextEventId, sources);
      }
    });
    return map;
  }, [events]);

  return (
    <div className="space-y-4">
      {/* 过滤工具栏 */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          {/* 搜索 */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-slate-400 mb-1">搜索事件</label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="输入ID或名称..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 类型过滤 */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">事件类型</label>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as EventCategory | 'all')}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">全部</option>
              <option value="FIXED">固定</option>
              <option value="RANDOM">随机</option>
              <option value="CHAIN">链式</option>
              <option value="POLICY_PRESSURE">政策压力</option>
            </select>
          </div>

          {/* 场景过滤 */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">场景</label>
            <select
              value={filterScene}
              onChange={e => setFilterScene(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">全部</option>
              {scenes.map(scene => (
                <option key={scene} value={scene}>
                  {scene}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 图例 */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-700">
          <span className="text-sm text-slate-400">图例:</span>
          <span className="text-sm">🟦 固定</span>
          <span className="text-sm">🟨 随机</span>
          <span className="text-sm">🟩 链式</span>
          <span className="text-sm">🟥 政策压力</span>
          <span className="ml-4 text-sm text-slate-500">|</span>
          <span className="text-sm text-blue-400">场景1</span>
          <span className="text-sm text-green-400">场景2</span>
          <span className="text-sm text-purple-400">场景3</span>
        </div>
      </Card>

      {/* 事件列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredEvents.map(event => {
          const primaryScene = getPrimaryScene(event);
          const borderColor = sceneColors[primaryScene] || sceneColors.random;
          const hasChainSource = chainMap.has(event.id);
          const hasChainTarget = !!event.chain?.nextEventId;

          return (
            <Card
              key={event.id}
              className={`cursor-pointer transition-all hover:scale-[1.02] border-l-4 ${borderColor}`}
              onClick={() => setSelectedEvent(event)}
              padding="sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{categoryColors[event.category]}</span>
                    <span className="font-medium text-slate-200 truncate">
                      {event.name}
                    </span>
                  </div>
                  <code className="text-xs text-slate-500 block mt-1 truncate">
                    {event.id}
                  </code>
                </div>
                {(hasChainSource || hasChainTarget) && (
                  <span className="text-xs text-green-400">🔗</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                {event.description}
              </p>
              {event.scenes.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {event.scenes.map(scene => (
                    <span
                      key={scene}
                      className="text-xs px-1.5 py-0.5 bg-slate-900 rounded text-slate-500"
                    >
                      {scene}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* 统计 */}
      <div className="text-sm text-slate-500 text-center py-4">
        共 {filteredEvents.length} / {events.length} 个事件
        {searchQuery && ` (搜索: "${searchQuery}")`}
      </div>

      {/* 详情弹窗 */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          allEvents={events}
        />
      )}
    </div>
  );
}

export default EventGraphPanel;
