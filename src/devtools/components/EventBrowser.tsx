/**
 * EventBrowser 组件
 * 
 * 事件索引浏览器
 * - 搜索（ID、名称）
 * - 筛选（场景、类型、标签）
 * - 查看JSON源码
 * - 验证事件数据
 */

import React, { useState, useMemo } from 'react';
import type { GameEvent, EventCategory } from '../../types/event';
import type { AnyItem as Item } from '../../types/item';
import { Card } from '../../components/primitives';

/**
 * 事件浏览器属性
 */
interface EventBrowserProps {
  /** 所有事件 */
  events: GameEvent[];
  /** 所有道具 */
  items: Item[];
}

/**
 * 验证结果
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 验证事件
 */
function validateEvent(event: GameEvent): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 必填字段检查
  if (!event.id) {
    errors.push('缺少事件ID');
  } else if (!/^[a-z0-9_]+$/.test(event.id)) {
    warnings.push('事件ID建议使用小写字母、数字和下划线');
  }

  if (!event.name) {
    errors.push('缺少事件名称');
  }

  if (!event.description) {
    errors.push('缺少事件描述');
  } else if (event.description.length < 10) {
    warnings.push('事件描述过短（建议50-100字）');
  } else if (event.description.length > 200) {
    warnings.push('事件描述过长（建议50-100字）');
  }

  if (!event.category) {
    errors.push('缺少事件类型');
  }

  if (!event.scenes || event.scenes.length === 0) {
    warnings.push('未指定触发场景');
  }

  // 类型特定检查
  if (event.category === 'RANDOM' || event.category === 'POLICY_PRESSURE') {
    if (!event.trigger) {
      errors.push('RANDOM/POLICY_PRESSURE 类型必须配置 trigger');
    }
  }

  if (event.category === 'FIXED' || event.category === 'CHAIN') {
    if (!event.execution) {
      errors.push('FIXED/CHAIN 类型必须配置 execution');
    } else {
      if (event.execution.actionPointCost === undefined) {
        errors.push('缺少 actionPointCost 配置');
      }
      if (event.execution.repeatable === undefined) {
        warnings.push('建议明确指定 repeatable');
      }
    }

    if (!event.choices || event.choices.length === 0) {
      warnings.push('建议至少配置一个选项');
    }
  }

  if (event.category === 'CHAIN') {
    if (!event.chain) {
      errors.push('CHAIN 类型必须配置 chain');
    } else {
      if (!event.chain.chainId) {
        errors.push('CHAIN 类型必须配置 chain.chainId');
      }
      if (!event.chain.nextEventId) {
        errors.push('CHAIN 类型必须配置 chain.nextEventId');
      }
    }
  }

  // 选项检查
  if (event.choices) {
    event.choices.forEach((choice, idx) => {
      if (!choice.id) {
        errors.push(`选项 ${idx + 1} 缺少ID`);
      }
      if (!choice.name) {
        errors.push(`选项 ${idx + 1} 缺少名称`);
      }
      if (!choice.effects) {
        errors.push(`选项 ${idx + 1} 缺少效果配置`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * JSON查看器弹窗
 */
function JsonViewerModal({
  event,
  onClose,
  validation,
}: {
  event: GameEvent;
  onClose: () => void;
  validation: ValidationResult;
}) {
  const json = JSON.stringify(event, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(json);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-100">
            JSON 源码 - {event.name}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-200 transition-colors"
            >
              复制
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-xl leading-none px-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* 验证结果 */}
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="p-4 border-b border-slate-700 space-y-2">
            {validation.errors.length > 0 && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-red-400">错误 ({validation.errors.length}):</div>
                <ul className="text-sm text-red-300 space-y-0.5">
                  {validation.errors.map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-yellow-400">警告 ({validation.warnings.length}):</div>
                <ul className="text-sm text-yellow-300 space-y-0.5">
                  {validation.warnings.map((warn, idx) => (
                    <li key={idx}>• {warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* JSON 内容 */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
            {json}
          </pre>
        </div>
      </div>
    </div>
  );
}

/**
 * 事件浏览器组件
 */
export function EventBrowser({ events, items: _items }: EventBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<EventCategory | 'all'>('all');
  const [filterScene, setFilterScene] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null);

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

  // 统计
  const stats = useMemo(() => {
    const total = events.length;
    const byCategory = {
      FIXED: events.filter(e => e.category === 'FIXED').length,
      RANDOM: events.filter(e => e.category === 'RANDOM').length,
      CHAIN: events.filter(e => e.category === 'CHAIN').length,
      POLICY_PRESSURE: events.filter(e => e.category === 'POLICY_PRESSURE').length,
    };
    return { total, byCategory };
  }, [events]);

  // 验证选中事件
  const validation = useMemo(() => {
    if (!selectedEvent) return null;
    return validateEvent(selectedEvent);
  }, [selectedEvent]);

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="text-xs text-slate-500">总计</div>
          <div className="text-xl font-semibold text-slate-200">{stats.total}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500">固定</div>
          <div className="text-xl font-semibold text-blue-400">{stats.byCategory.FIXED}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500">随机</div>
          <div className="text-xl font-semibold text-yellow-400">{stats.byCategory.RANDOM}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500">链式</div>
          <div className="text-xl font-semibold text-green-400">{stats.byCategory.CHAIN}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500">政策</div>
          <div className="text-xl font-semibold text-red-400">{stats.byCategory.POLICY_PRESSURE}</div>
        </Card>
      </div>

      {/* 过滤工具栏 */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          {/* 搜索 */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-slate-400 mb-1">搜索</label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ID 或名称..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 类型过滤 */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">类型</label>
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
      </Card>

      {/* 事件列表 */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">状态</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">ID</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">名称</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium">类型</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium">场景</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium">选项</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map(event => {
                const validation = validateEvent(event);

                return (
                  <tr
                    key={event.id}
                    className="border-b border-slate-800 hover:bg-slate-800/50"
                  >
                    <td className="py-3 px-4">
                      {validation.errors.length > 0 ? (
                        <span className="text-red-500" title={validation.errors.join(', ')}>✗</span>
                      ) : validation.warnings.length > 0 ? (
                        <span className="text-yellow-500" title={validation.warnings.join(', ')}>⚠</span>
                      ) : (
                        <span className="text-green-500">✓</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs text-slate-500">{event.id}</code>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-300">{event.name}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[200px]">
                        {event.description.slice(0, 50)}...
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          event.category === 'FIXED'
                            ? 'bg-blue-500/20 text-blue-400'
                            : event.category === 'RANDOM'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : event.category === 'CHAIN'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {event.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex gap-1 justify-center">
                        {event.scenes.map(scene => (
                          <span
                            key={scene}
                            className="text-xs px-1.5 py-0.5 bg-slate-900 rounded text-slate-500"
                          >
                            {scene}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400">
                      {event.choices?.length || 0}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 transition-colors"
                      >
                        查看JSON
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredEvents.length === 0 && (
          <div className="py-8 text-center text-slate-500">没有找到匹配的事件</div>
        )}
      </Card>

      {/* 结果统计 */}
      <div className="text-sm text-slate-500 text-center py-2">
        显示 {filteredEvents.length} / {events.length} 个事件
        {searchQuery && ` (搜索: "${searchQuery}")`}
      </div>

      {/* JSON查看器 */}
      {selectedEvent && validation && (
        <JsonViewerModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          validation={validation}
        />
      )}
    </div>
  );
}

export default EventBrowser;
