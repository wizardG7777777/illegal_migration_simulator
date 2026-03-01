/**
 * EventSandbox 组件
 * 
 * 事件沙盒测试器
 * - 状态预设（新手/中期/濒死/自定义）
 * - 选择事件和选项
 * - 运行模拟
 * - 显示状态变化对比（Before/After）
 * - 警告提示（可能导致死亡的事件）
 */

import React, { useState, useMemo } from 'react';
import type { GameEvent, EventChoice } from '../../types/event';
import type { GameState, SceneId } from '../../types/game';
import { Card, Button } from '../../components/primitives';
import { useGameStore } from '../../store';
import { deepClone } from '../../utils/pure';

/**
 * 沙盒属性
 */
interface EventSandboxProps {
  /** 所有事件 */
  events: GameEvent[];
}

/**
 * 状态预设
 */
interface StatePreset {
  name: string;
  description: string;
  state: Record<string, unknown>;
}

/**
 * 生成状态预设
 */
function generatePresets(): StatePreset[] {
  const baseCharacter = {
    id: 'test',
    name: '测试角色',
    attributes: {
      physique: 10,
      intelligence: 10,
      english: 10,
      social: 10,
      riskAwareness: 10,
      survival: 10,
    },
    resources: {
      health: { current: 100, max: 100 },
      mental: { current: 100, max: 100 },
      money: { cny: 1000, usd: 0 },
      actionPoints: { current: 5, max: 5, min: 0 },
    },
    status: {
      terminalState: null,
      terminalCountdown: 0,
      flags: {},
    },
  };

  return [
    {
      name: '新手状态',
      description: '健康的初学者状态',
      state: {
        character: deepClone({
          ...baseCharacter,
          resources: {
            ...baseCharacter.resources,
            health: { current: 100, max: 100 },
            mental: { current: 100, max: 100 },
            money: { cny: 2000, usd: 0 },
            actionPoints: { current: 5, max: 5, min: 0 },
          },
        }),
        scene: {
          currentScene: 'act1' as SceneId,
          turnCount: 0,
          sceneTurn: 0,
          act1: { hasInsightTriggered: false, hasTakenLoan: false, loanAmount: 0 },
          act2: null,
          act3: null,
          activeDebuffs: [],
        },
      },
    },
    {
      name: '中期状态',
      description: '场景2进行中',
      state: {
        character: deepClone({
          ...baseCharacter,
          resources: {
            ...baseCharacter.resources,
            health: { current: 70, max: 100 },
            mental: { current: 60, max: 100 },
            money: { cny: 0, usd: 500 },
            actionPoints: { current: 4, max: 5, min: 0 },
          },
        }),
        scene: {
          currentScene: 'act2' as SceneId,
          turnCount: 20,
          sceneTurn: 5,
          act1: null,
          act2: {
            currentPhase: 'rainforest',
            progress: 2,
            supplyStatus: { water: 3, food: 2, shelter: false },
          },
          act3: null,
          activeDebuffs: [],
        },
      },
    },
    {
      name: '濒死状态',
      description: '低健康/心理，测试边界情况',
      state: {
        character: deepClone({
          ...baseCharacter,
          resources: {
            ...baseCharacter.resources,
            health: { current: 10, max: 100 },
            mental: { current: 15, max: 100 },
            money: { cny: 0, usd: 50 },
            actionPoints: { current: 2, max: 5, min: 0 },
          },
        }),
        scene: {
          currentScene: 'act3' as SceneId,
          turnCount: 60,
          sceneTurn: 15,
          act1: null,
          act2: null,
          act3: {
            livingExpenses: {
              baseline: { food: 400, lodging: 600, transport: 100 },
              current: { food: 400, lodging: 600, transport: 100, total: 1100 },
            },
            debtDefaultCount: 0,
          },
          activeDebuffs: [],
        },
      },
    },
    {
      name: '高压力状态',
      description: '有债务和debuff',
      state: {
        character: deepClone({
          ...baseCharacter,
          resources: {
            ...baseCharacter.resources,
            health: { current: 50, max: 100 },
            mental: { current: 40, max: 100 },
            money: { cny: 0, usd: 200 },
            actionPoints: { current: 3, max: 5, min: 0 },
          },
        }),
        scene: {
          currentScene: 'act3' as SceneId,
          turnCount: 45,
          sceneTurn: 10,
          act1: null,
          act2: null,
          act3: {
            livingExpenses: {
              baseline: { food: 400, lodging: 600, transport: 100 },
              current: { food: 400, lodging: 600, transport: 100, total: 1100 },
            },
            debtDefaultCount: 1,
          },
          activeDebuffs: [
            {
              id: 'pressure_test',
              name: '移民搜捕升级',
              type: 'pressure',
              intensity: 3,
              remainingTurns: 5,
            },
          ],
        },
      },
    },
  ];
}

/**
 * 状态差异对比
 */
function StateDiff({
  before,
  after,
}: {
  before: GameState | null;
  after: GameState | null;
}) {
  if (!before || !after) return null;

  const diffs = [];

  // 健康变化
  const healthDiff = after.character.resources.health.current - before.character.resources.health.current;
  if (healthDiff !== 0) {
    diffs.push({
      label: '健康度',
      before: before.character.resources.health.current,
      after: after.character.resources.health.current,
      diff: healthDiff,
      color: healthDiff < 0 ? 'text-red-400' : 'text-green-400',
    });
  }

  // 心理变化
  const mentalDiff = after.character.resources.mental.current - before.character.resources.mental.current;
  if (mentalDiff !== 0) {
    diffs.push({
      label: '心理度',
      before: before.character.resources.mental.current,
      after: after.character.resources.mental.current,
      diff: mentalDiff,
      color: mentalDiff < 0 ? 'text-red-400' : 'text-green-400',
    });
  }

  // 金钱变化（USD）
  const usdDiff = after.character.resources.money.usd - before.character.resources.money.usd;
  if (usdDiff !== 0) {
    diffs.push({
      label: '美元',
      before: before.character.resources.money.usd,
      after: after.character.resources.money.usd,
      diff: usdDiff,
      color: usdDiff < 0 ? 'text-red-400' : 'text-green-400',
    });
  }

  // 金钱变化（CNY）
  const cnyDiff = after.character.resources.money.cny - before.character.resources.money.cny;
  if (cnyDiff !== 0) {
    diffs.push({
      label: '人民币',
      before: before.character.resources.money.cny,
      after: after.character.resources.money.cny,
      diff: cnyDiff,
      color: cnyDiff < 0 ? 'text-red-400' : 'text-green-400',
    });
  }

  // 行动点变化
  const apDiff = after.character.resources.actionPoints.current - before.character.resources.actionPoints.current;
  if (apDiff !== 0) {
    diffs.push({
      label: '行动点',
      before: before.character.resources.actionPoints.current,
      after: after.character.resources.actionPoints.current,
      diff: apDiff,
      color: apDiff < 0 ? 'text-orange-400' : 'text-blue-400',
    });
  }

  if (diffs.length === 0) {
    return <div className="text-slate-500">无变化</div>;
  }

  return (
    <div className="space-y-2">
      {diffs.map(item => (
        <div key={item.label} className="flex items-center gap-4 text-sm">
          <span className="w-16 text-slate-400">{item.label}:</span>
          <span className="text-slate-500">{item.before}</span>
          <span className="text-slate-600">→</span>
          <span className={item.color}>{item.after}</span>
          <span className={`text-xs ${item.color}`}>
            ({item.diff > 0 ? '+' : ''}{item.diff})
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * 事件沙盒组件
 */
export function EventSandbox({ events }: EventSandboxProps) {
  const store = useGameStore();
  const presets = useMemo(() => generatePresets(), []);

  const [selectedPreset, setSelectedPreset] = useState<StatePreset>(presets[0]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>('');
  const [beforeState, setBeforeState] = useState<GameState | null>(null);
  const [afterState, setAfterState] = useState<GameState | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // 选择的事件
  const selectedEvent = useMemo(() => {
    return events.find(e => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  // 检查警告
  const checkWarning = (_event: GameEvent, choice: EventChoice): string | null => {
    if (!beforeState) return null;

    const healthCost = Math.abs(choice.effects?.resources?.health || 0);
    const currentHealth = beforeState.character.resources.health.current;

    if (healthCost >= currentHealth) {
      return '⚠️ 警告：此选项可能导致角色死亡！';
    }
    if (healthCost >= currentHealth * 0.5) {
      return '⚠️ 注意：此选项将造成大量健康损失';
    }

    const mentalCost = Math.abs(choice.effects?.resources?.mental || 0);
    const currentMental = beforeState.character.resources.mental.current;

    if (mentalCost >= currentMental) {
      return '⚠️ 警告：此选项可能导致心理崩溃！';
    }

    return null;
  };

  // 应用预设
  const applyPreset = () => {
    const currentState = store.state;
    const newState = deepClone(currentState);

    // 合并预设状态
    if (selectedPreset.state.character) {
      Object.assign(newState.character, selectedPreset.state.character);
    }
    if (selectedPreset.state.scene) {
      Object.assign(newState.scene, selectedPreset.state.scene);
    }

    // 通过 store 更新状态
    store.devSetResource('health', newState.character.resources.health.current);
    store.devSetResource('mental', newState.character.resources.mental.current);
    store.devSetMoney(newState.character.resources.money.usd, 'USD');
    store.devSetMoney(newState.character.resources.money.cny, 'CNY');

    setBeforeState(newState);
    setAfterState(null);
    setWarning(null);
  };

  // 运行模拟
  const runSimulation = () => {
    if (!selectedEvent || !selectedChoiceId) return;

    const currentState = store.state;
    const testState = deepClone(currentState);

    // 应用预设
    if (selectedPreset.state.character) {
      Object.assign(testState.character, selectedPreset.state.character);
    }
    if (selectedPreset.state.scene) {
      Object.assign(testState.scene, selectedPreset.state.scene);
    }

    setBeforeState(testState);

    // 模拟执行事件
    try {
      const choice = selectedEvent.choices?.find(c => c.id === selectedChoiceId);
      if (choice) {
        // 计算新状态（简化版）
        const newState = deepClone(testState);
        const resources = choice.effects?.resources;

        if (resources) {
          if (resources.health) {
            newState.character.resources.health.current = Math.max(
              0,
              newState.character.resources.health.current + resources.health
            );
          }
          if (resources.mental) {
            newState.character.resources.mental.current = Math.max(
              0,
              newState.character.resources.mental.current + resources.mental
            );
          }
          if (resources.money) {
            const currency = resources.moneyCurrency || 'CNY';
            newState.character.resources.money[currency.toLowerCase() as 'cny' | 'usd'] += resources.money;
          }
          if (resources.actionPoints) {
            newState.character.resources.actionPoints.current = Math.max(
              0,
              newState.character.resources.actionPoints.current + resources.actionPoints
            );
          }
        }

        setAfterState(newState);
        setWarning(checkWarning(selectedEvent, choice));
      }
    } catch (error) {
      console.error('模拟失败:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* 状态预设选择 */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">1. 选择状态预设</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {presets.map(preset => (
            <button
              key={preset.name}
              onClick={() => {
                setSelectedPreset(preset);
                setBeforeState(null);
                setAfterState(null);
              }}
              className={`p-3 rounded border text-left transition-all ${
                selectedPreset.name === preset.name
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="font-medium text-slate-200 text-sm">{preset.name}</div>
              <div className="text-xs text-slate-500 mt-1">{preset.description}</div>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Button size="sm" onClick={applyPreset}>
            应用预设到当前状态
          </Button>
        </div>
      </Card>

      {/* 事件选择 */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">2. 选择事件和选项</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">事件</label>
            <select
              value={selectedEventId}
              onChange={e => {
                setSelectedEventId(e.target.value);
                setSelectedChoiceId('');
                setWarning(null);
              }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">请选择事件...</option>
              {events
                .filter(e => e.choices && e.choices.length > 0)
                .map(event => (
                  <option key={event.id} value={event.id}>
                    [{event.category}] {event.name}
                  </option>
                ))}
            </select>
          </div>

          {selectedEvent && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">选项</label>
              <div className="space-y-2">
                {selectedEvent.choices?.map(choice => (
                  <button
                    key={choice.id}
                    onClick={() => {
                      setSelectedChoiceId(choice.id);
                      if (beforeState) {
                        setWarning(checkWarning(selectedEvent, choice));
                      }
                    }}
                    className={`w-full p-3 rounded border text-left transition-all ${
                      selectedChoiceId === choice.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-medium text-slate-200 text-sm">{choice.name}</div>
                    {choice.condition && (
                      <div className="text-xs text-slate-500 mt-1">
                        需要条件: {choice.condition.type}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedEvent && selectedChoiceId && (
            <div>
              <Button onClick={runSimulation} disabled={!selectedEvent || !selectedChoiceId}>
                🚀 运行模拟
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* 警告 */}
      {warning && (
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded text-red-400 text-sm">
          {warning}
        </div>
      )}

      {/* 结果对比 */}
      {(beforeState || afterState) && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">3. 状态变化对比</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-900 rounded">
              <div className="text-xs text-slate-500 mb-2">执行前</div>
              {beforeState && (
                <div className="text-sm space-y-1">
                  <div>健康: {beforeState.character.resources.health.current}</div>
                  <div>心理: {beforeState.character.resources.mental.current}</div>
                  <div>美元: ${beforeState.character.resources.money.usd}</div>
                  <div>人民币: ¥{beforeState.character.resources.money.cny}</div>
                  <div>行动点: {beforeState.character.resources.actionPoints.current}</div>
                </div>
              )}
            </div>
            <div className="p-3 bg-slate-900 rounded">
              <div className="text-xs text-slate-500 mb-2">执行后</div>
              {afterState ? (
                <div className="text-sm space-y-1">
                  <div>健康: {afterState.character.resources.health.current}</div>
                  <div>心理: {afterState.character.resources.mental.current}</div>
                  <div>美元: ${afterState.character.resources.money.usd}</div>
                  <div>人民币: ¥{afterState.character.resources.money.cny}</div>
                  <div>行动点: {afterState.character.resources.actionPoints.current}</div>
                </div>
              ) : (
                <div className="text-slate-500 text-sm">点击"运行模拟"查看结果</div>
              )}
            </div>
          </div>
          {afterState && (
            <div className="mt-4 p-3 bg-slate-900 rounded">
              <div className="text-xs text-slate-500 mb-2">变化详情</div>
              <StateDiff before={beforeState} after={afterState} />
            </div>
          )}
        </Card>
      )}

      {/* 提示 */}
      <div className="text-xs text-slate-500 p-4 bg-slate-900/50 rounded">
        <p>💡 使用说明：</p>
        <p>1. 选择一个状态预设来模拟不同游戏阶段</p>
        <p>2. 选择要测试的事件和选项</p>
        <p>3. 点击"运行模拟"查看状态变化</p>
        <p>4. 注意观察警告提示，避免设计导致意外死亡的事件</p>
      </div>
    </div>
  );
}

export default EventSandbox;
