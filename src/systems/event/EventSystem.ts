/**
 * EventSystem.ts
 *
 * 事件系统 - 负责管理游戏中的所有事件操作
 *
 * 功能包括：
 * 1. 随机事件抽取（按权重）
 * 2. 事件可用性检查（次数、冷却、条件）
 * 3. 固定事件获取与执行
 * 4. 选项效果应用（资源、属性、道具、特殊效果）
 * 5. 链式事件调度与处理
 * 6. 事件触发/完成记录
 *
 * 所有方法均为纯函数，返回新的 GameState
 */

import type {
  GameState,
  GameEvent,
  EventChoice,
  ChainConfig,
  ActiveChain,
  ResourceEffect,
} from '../../types';
import { deepClone, weightedRandom, clamp } from '../../utils/pure';
import { dataLoader } from '../loader/DataLoader';
import { checkCondition, checkAllConditions } from './conditions';

// 动态导入 ItemSystem 以避免循环依赖
// ItemSystem 会调用 EventSystem，EventSystem 也会调用 ItemSystem
let ItemSystem: typeof import('../item/ItemSystem').ItemSystem | null = null;

function getItemSystem(): typeof import('../item/ItemSystem').ItemSystem {
  if (!ItemSystem) {
    ItemSystem = require('../item/ItemSystem').ItemSystem;
  }
  return ItemSystem!;
}

/**
 * 事件系统
 * 提供所有事件相关的操作方法
 */
export const EventSystem = {
  // ========== 随机事件 ==========

  /**
   * 抽取随机事件
   * 按权重从可用的 RANDOM 类型事件中随机选择一个
   *
   * @param state - 当前游戏状态
   * @returns 选中的事件或 null（如果没有可用事件）
   *
   * @example
   * ```typescript
   * const randomEvent = EventSystem.drawRandomEvent(state);
   * if (randomEvent) {
   *   console.log(`触发了随机事件: ${randomEvent.name}`);
   * }
   * ```
   */
  drawRandomEvent(state: GameState): GameEvent | null {
    const currentScene = state.scene.currentScene;

    // 1. 获取当前场景所有 RANDOM 类型事件
    const allEvents = dataLoader.getEventsByCategory('RANDOM');
    const sceneEvents = allEvents.filter((event) =>
      event.scenes.includes(currentScene)
    );

    // 2. 过滤掉不可用的事件（冷却、次数、条件）
    const availableEvents = sceneEvents.filter((event) =>
      this.isEventAvailable(state, event)
    );

    if (availableEvents.length === 0) {
      return null;
    }

    // 3. 计算总权重，按权重随机抽取
    const weights = availableEvents.map(
      (event) => event.trigger?.weight ?? 10 // 默认权重 10
    );

    const selectedEvent = weightedRandom(availableEvents, weights);

    // 4. 更新触发记录（在返回前标记为已触发）
    // 注意：实际的状态更新由调用方负责

    return selectedEvent;
  },

  /**
   * 抽取政策压力事件（仅场景3使用）
   * 用于 POLICY_PRESSURE 类型事件的触发
   *
   * @param state - 当前游戏状态
   * @returns 选中的政策压力事件或 null
   */
  drawPolicyPressureEvent(state: GameState): GameEvent | null {
    const currentScene = state.scene.currentScene;

    // 只获取 POLICY_PRESSURE 类型事件
    const allEvents = dataLoader.getEventsByCategory('POLICY_PRESSURE');
    const sceneEvents = allEvents.filter((event) =>
      event.scenes.includes(currentScene)
    );

    // 过滤掉不可用的事件
    const availableEvents = sceneEvents.filter((event) =>
      this.isEventAvailable(state, event)
    );

    if (availableEvents.length === 0) {
      return null;
    }

    // 政策压力事件使用触发配置中的权重，如果没有则默认权重 5
    const weights = availableEvents.map(
      (event) => event.trigger?.weight ?? 5
    );

    return weightedRandom(availableEvents, weights);
  },

  // ========== 事件可用性 ==========

  /**
   * 检查事件是否可用
   * 综合考虑：触发次数、冷却、场景限制、场景回合限制、自定义条件
   *
   * @param state - 当前游戏状态
   * @param event - 要检查的事件
   * @returns 事件是否可用
   */
  isEventAvailable(state: GameState, event: GameEvent): boolean {
    const trigger = event.trigger;
    if (!trigger) {
      // FIXED 和 CHAIN 类型通常没有 trigger，默认可用（另有检查逻辑）
      return true;
    }

    const currentTurn = state.scene.turnCount;
    const eventData = state.event;

    // 检查最大触发次数
    if (trigger.maxTriggers !== undefined) {
      const triggeredCount = eventData.triggeredEvents[event.id] ?? 0;
      if (triggeredCount >= trigger.maxTriggers) {
        return false;
      }
    }

    // 检查冷却
    if (trigger.cooldown !== undefined && trigger.cooldown > 0) {
      const lastTriggered = eventData.lastTriggeredTurn[event.id];
      if (lastTriggered !== undefined) {
        const turnsSinceLast = currentTurn - lastTriggered;
        if (turnsSinceLast < trigger.cooldown) {
          return false;
        }
      }
    }

    // 检查场景回合限制（针对 POLICY_PRESSURE 等）
    const sceneTurn = state.scene.sceneTurn;
    if (trigger.minSceneTurn !== undefined && sceneTurn < trigger.minSceneTurn) {
      return false;
    }
    if (trigger.maxSceneTurn !== undefined && sceneTurn > trigger.maxSceneTurn) {
      return false;
    }

    // 检查自定义条件数组
    if (trigger.conditions && trigger.conditions.length > 0) {
      const conditionsMet = checkAllConditions(state, trigger.conditions);
      if (!conditionsMet) {
        return false;
      }
    }

    return true;
  },

  /**
   * 获取当前可用的固定事件列表
   * 返回 FIXED 和已解锁的 CHAIN 类型事件
   *
   * @param state - 当前游戏状态
   * @returns 可用的事件数组
   */
  getAvailableFixedEvents(state: GameState): GameEvent[] {
    const currentScene = state.scene.currentScene;

    // 获取 FIXED 类型事件
    const fixedEvents = dataLoader
      .getEventsByCategory('FIXED')
      .filter((event) => event.scenes.includes(currentScene));

    // 获取已解锁的 CHAIN 类型事件
    const chainEvents = this.getUnlockedChainEvents(state);

    // 合并并过滤掉不可用的
    const allEvents = [...fixedEvents, ...chainEvents];

    return allEvents.filter((event) => {
      // 检查次数限制
      const execution = event.execution;
      if (execution?.maxExecutions !== undefined) {
        const completedCount = state.event.completedEvents[event.id] ?? 0;
        if (completedCount >= execution.maxExecutions) {
          return false;
        }
      }

      // 检查条件
      if (event.trigger?.conditions) {
        return checkAllConditions(state, event.trigger.conditions);
      }

      return true;
    });
  },

  /**
   * 获取已解锁的链式事件
   * 从 activeChains 中查找已满足解锁条件的事件
   */
  getUnlockedChainEvents(state: GameState): GameEvent[] {
    const currentTurn = state.scene.turnCount;
    const currentScene = state.scene.currentScene;

    const unlockedEvents: GameEvent[] = [];

    for (const chain of state.event.activeChains) {
      // 检查是否到达解锁回合
      if (currentTurn >= chain.unlockTurn) {
        const event = dataLoader.getEvent(chain.unlockEventId);
        if (event && event.scenes.includes(currentScene)) {
          unlockedEvents.push(event);
        }
      }
    }

    return unlockedEvents;
  },

  /**
   * 检查是否可以执行固定事件
   * 检查行动点、金钱、强制槽位等
   *
   * @param state - 当前游戏状态
   * @param event - 要执行的事件
   * @returns 是否可以执行
   */
  canExecuteFixedEvent(state: GameState, event: GameEvent): boolean {
    const execution = event.execution;
    if (!execution) {
      // RANDOM 类型没有 execution，但不能主动执行
      return false;
    }

    // 检查行动点
    const currentAP = state.character.resources.actionPoints.current;
    if (currentAP < execution.actionPointCost) {
      return false;
    }

    // 检查金钱
    if (execution.moneyCost && execution.moneyCost > 0) {
      const currency = execution.moneyCurrency ?? 'CNY';
      const key = currency.toLowerCase() as 'cny' | 'usd';
      const currentMoney = state.character.resources.money[key] ?? 0;
      if (currentMoney < execution.moneyCost) {
        return false;
      }
    }

    // 检查强制槽位
    if (event.slots) {
      const ItemSys = getItemSystem();
      for (const slot of event.slots) {
        if (slot.required) {
          const bestMatch = ItemSys.findBestMatch(state, slot);
          if (!bestMatch) {
            return false;
          }
        }
      }
    }

    // 检查次数限制
    if (execution.maxExecutions !== undefined) {
      const completedCount = state.event.completedEvents[event.id] ?? 0;
      if (completedCount >= execution.maxExecutions) {
        return false;
      }
    }

    return true;
  },

  // ========== 事件执行 ==========

  /**
   * 执行事件
   * 应用行动点消耗、金钱消耗、选项效果，并更新事件记录
   *
   * @param state - 当前游戏状态
   * @param eventId - 事件ID
   * @param choiceId - 选项ID
   * @param slotSelections - 槽位选择（槽位ID -> 道具ID）
   * @returns 新的游戏状态
   *
   * @example
   * ```typescript
   * state = EventSystem.executeEvent(
   *   state,
   *   'act1_work_warehouse',
   *   'option_work_hard',
   *   { transport: 'perm_ebike' }
   * );
   * ```
   */
  executeEvent(
    state: GameState,
    eventId: string,
    choiceId: string,
    slotSelections?: Record<string, string>
  ): GameState {
    const event = dataLoader.getEvent(eventId);
    if (!event) {
      throw new Error(`事件不存在: ${eventId}`);
    }

    const choice = event.choices?.find((c) => c.id === choiceId);
    if (!choice) {
      throw new Error(`选项不存在: ${choiceId} (事件: ${eventId})`);
    }

    let newState = deepClone(state);

    // 1. 扣除行动点
    const execution = event.execution;
    if (execution) {
      newState.character.resources.actionPoints.current -= execution.actionPointCost;
    }

    // 2. 扣除金钱
    if (execution?.moneyCost && execution.moneyCost > 0) {
      const currency = execution.moneyCurrency ?? 'CNY';
      const key = currency.toLowerCase() as 'cny' | 'usd';
      newState.character.resources.money[key] -= execution.moneyCost;
    }

    // 3. 应用槽位效果（如果有）
    if (slotSelections && event.slots) {
      newState = this.applySlotEffects(newState, event, slotSelections);
    }

    // 4. 应用选项效果
    newState = this.applyChoiceEffects(newState, choice);

    // 5. 记录事件完成
    newState = this.markEventCompleted(newState, eventId);

    // 6. 如果是 CHAIN 类型事件，调度下一步
    if (event.category === 'CHAIN' && event.chain) {
      newState = this.scheduleChainEvent(newState, event.chain);
    }

    // 7. 更新统计
    newState.global.statistics.totalEventsTriggered++;

    return newState;
  },

  /**
   * 应用槽位效果
   * 根据选择的道具调整效果
   */
  applySlotEffects(
    state: GameState,
    _event: GameEvent,
    _slotSelections: Record<string, string>
  ): GameState {
    // 槽位效果的具体实现依赖于事件配置
    // 这里可以扩展槽位效果的处理逻辑
    // 例如：根据道具优先级提供额外加成等
    return state;
  },

  /**
   * 应用选项效果
   * 处理资源变化、属性变化、道具变化、特殊效果
   *
   * @param state - 当前游戏状态
   * @param choice - 事件选项
   * @returns 新的游戏状态
   */
  applyChoiceEffects(state: GameState, choice: EventChoice): GameState {
    let newState = deepClone(state);
    const effects = choice.effects;

    if (!effects) {
      return newState;
    }

    // 1. 资源变化
    if (effects.resources) {
      newState = this.applyResourceEffects(newState, effects.resources);
    }

    // 2. 属性变化（0-20范围）
    if (effects.attributes) {
      for (const [attr, delta] of Object.entries(effects.attributes)) {
        if (delta !== undefined) {
          const attrKey = attr as keyof typeof newState.character.attributes;
          newState.character.attributes[attrKey] = clamp(
            newState.character.attributes[attrKey] + delta,
            0,
            20
          );
        }
      }
    }

    // 3. 获得道具
    if (effects.addItems && effects.addItems.length > 0) {
      const ItemSys = getItemSystem();
      for (const itemData of effects.addItems) {
        newState = ItemSys.addItem(newState, itemData.itemId, itemData.count);
      }
    }

    // 4. 失去道具
    if (effects.removeItems && effects.removeItems.length > 0) {
      const ItemSys = getItemSystem();
      for (const itemData of effects.removeItems) {
        newState = ItemSys.removeItem(newState, itemData.itemId, itemData.count);
      }
    }

    // 5. 获得常驻道具
    if (effects.addPermanents && effects.addPermanents.length > 0) {
      const ItemSys = getItemSystem();
      for (const itemId of effects.addPermanents) {
        newState = ItemSys.addPermanentItem(newState, itemId);
      }
    }

    // 6. 失去常驻道具
    if (effects.removePermanents && effects.removePermanents.length > 0) {
      const ItemSys = getItemSystem();
      for (const itemId of effects.removePermanents) {
        newState = ItemSys.removePermanentItem(newState, itemId);
      }
    }

    // 7. 设置状态标记
    if (effects.setFlags) {
      for (const [flag, value] of Object.entries(effects.setFlags)) {
        newState.character.status.flags[flag] = value;
      }
    }

    // 8. 移除状态标记
    if (effects.removeFlags) {
      for (const flag of effects.removeFlags) {
        delete newState.character.status.flags[flag];
      }
    }

    // 9. 特殊效果（场景切换、游戏结束、链式事件）
    if (effects.special) {
      // 游戏结束
      if (effects.special.gameOver) {
        newState.meta.isGameOver = true;
        if (effects.special.endingId) {
          newState.meta.endingId = effects.special.endingId;
        }
      }

      // 场景切换
      if (effects.special.sceneTransition) {
        newState.scene.currentScene = effects.special.sceneTransition.to;
        // 场景切换时可以在这里处理跨场景数据
      }

      // 触发链式事件
      if (effects.special.triggerChain) {
        newState = this.scheduleChainEvent(newState, effects.special.triggerChain);
      }
    }

    return newState;
  },

  /**
   * 应用资源效果
   * 处理健康、心理、金钱、行动点的变化
   */
  applyResourceEffects(state: GameState, resources: ResourceEffect): GameState {
    const newState = deepClone(state);

    // 身体健康度
    if (resources.health !== undefined) {
      newState.character.resources.health.current = clamp(
        newState.character.resources.health.current + resources.health,
        0,
        newState.character.resources.health.max
      );
    }

    // 心理健康度
    if (resources.mental !== undefined) {
      newState.character.resources.mental.current = clamp(
        newState.character.resources.mental.current + resources.mental,
        0,
        newState.character.resources.mental.max
      );
    }

    // 金钱变化
    if (resources.money !== undefined) {
      const currency = resources.moneyCurrency ?? 'CNY';
      const key = currency.toLowerCase() as 'cny' | 'usd';
      
      newState.character.resources.money[key] += resources.money;
      // 确保金钱不低于 0
      if (newState.character.resources.money[key] < 0) {
        newState.character.resources.money[key] = 0;
      }
    }

    // 行动点（通常是消耗，所以是负数）
    if (resources.actionPoints !== undefined) {
      newState.character.resources.actionPoints.current = clamp(
        newState.character.resources.actionPoints.current + resources.actionPoints,
        newState.character.resources.actionPoints.min,
        newState.character.resources.actionPoints.max
      );
    }

    return newState;
  },

  // ========== 链式事件 ==========

  /**
   * 调度链式事件
   * 将链式事件的下一步加入活跃链列表，设置解锁时间
   *
   * @param state - 当前游戏状态
   * @param chainConfig - 链式事件配置
   * @returns 新的游戏状态
   *
   * @example
   * ```typescript
   * state = EventSystem.scheduleChainEvent(state, {
   *   chainId: 'asylum_application',
   *   stepIndex: 0,
   *   nextEventId: 'act3_asylum_step2',
   *   unlockDelay: 5
   * });
   * ```
   */
  scheduleChainEvent(state: GameState, chainConfig: ChainConfig): GameState {
    const newState = deepClone(state);
    const currentTurn = state.scene.turnCount;

    // 计算解锁回合
    const unlockDelay = chainConfig.unlockDelay ?? 0;
    const unlockTurn = currentTurn + unlockDelay;

    // 创建活跃链记录
    const activeChain: ActiveChain = {
      chainId: chainConfig.chainId,
      currentStep: chainConfig.stepIndex + 1, // 下一步
      unlockEventId: chainConfig.nextEventId,
      unlockDelay: unlockDelay,
      unlockTurn: unlockTurn,
    };

    // 移除同一链的旧记录（如果存在）
    newState.event.activeChains = newState.event.activeChains.filter(
      (chain) => chain.chainId !== chainConfig.chainId
    );

    // 添加新的活跃链
    newState.event.activeChains.push(activeChain);

    return newState;
  },

  /**
   * 处理待处理的链式事件
   * 在回合开始时调用，将已到解锁时间的链式事件转为 FIXED 类型显示
   *
   * @param state - 当前游戏状态
   * @returns 新的游戏状态（已移除已解锁的链）
   */
  processPendingChains(state: GameState): GameState {
    const newState = deepClone(state);
    const currentTurn = state.scene.turnCount;

    // 检查已解锁的链
    const unlockedChains: ActiveChain[] = [];
    const remainingChains: ActiveChain[] = [];

    for (const chain of newState.event.activeChains) {
      if (currentTurn >= chain.unlockTurn) {
        unlockedChains.push(chain);
      } else {
        remainingChains.push(chain);
      }
    }

    // 更新活跃链列表（保留未解锁的）
    newState.event.activeChains = remainingChains;

    // 可以在这里触发解锁通知或其他逻辑
    // 解锁的事件会在 getAvailableFixedEvents 中返回

    return newState;
  },

  /**
   * 检查是否有活跃的链式事件
   * @param state - 当前游戏状态
   * @returns 是否有活跃的链
   */
  hasActiveChains(state: GameState): boolean {
    return state.event.activeChains.length > 0;
  },

  /**
   * 获取特定链的状态
   * @param state - 当前游戏状态
   * @param chainId - 链ID
   * @returns 活跃链状态或 undefined
   */
  getChainState(state: GameState, chainId: string): ActiveChain | undefined {
    return state.event.activeChains.find((chain) => chain.chainId === chainId);
  },

  // ========== 事件记录 ==========

  /**
   * 标记事件已触发
   * 更新触发次数和上次触发回合
   *
   * @param state - 当前游戏状态
   * @param eventId - 事件ID
   * @returns 新的游戏状态
   */
  markEventTriggered(state: GameState, eventId: string): GameState {
    const newState = deepClone(state);
    const currentTurn = state.scene.turnCount;

    // 更新触发次数
    const currentCount = newState.event.triggeredEvents[eventId] ?? 0;
    newState.event.triggeredEvents[eventId] = currentCount + 1;

    // 更新上次触发回合
    newState.event.lastTriggeredTurn[eventId] = currentTurn;

    return newState;
  },

  /**
   * 标记事件已完成
   * 更新完成次数
   *
   * @param state - 当前游戏状态
   * @param eventId - 事件ID
   * @returns 新的游戏状态
   */
  markEventCompleted(state: GameState, eventId: string): GameState {
    const newState = deepClone(state);

    const currentCount = newState.event.completedEvents[eventId] ?? 0;
    newState.event.completedEvents[eventId] = currentCount + 1;

    return newState;
  },

  /**
   * 获取事件触发次数
   * @param state - 当前游戏状态
   * @param eventId - 事件ID
   * @returns 触发次数
   */
  getEventTriggerCount(state: GameState, eventId: string): number {
    return state.event.triggeredEvents[eventId] ?? 0;
  },

  /**
   * 获取事件完成次数
   * @param state - 当前游戏状态
   * @param eventId - 事件ID
   * @returns 完成次数
   */
  getEventCompletionCount(state: GameState, eventId: string): number {
    return state.event.completedEvents[eventId] ?? 0;
  },

  /**
   * 获取上次触发回合
   * @param state - 当前游戏状态
   * @param eventId - 事件ID
   * @returns 上次触发回合，如果未触发过返回 undefined
   */
  getLastTriggeredTurn(state: GameState, eventId: string): number | undefined {
    return state.event.lastTriggeredTurn[eventId];
  },

  // ========== 辅助方法 ==========

  /**
   * 检查选项是否可用
   * @param state - 当前游戏状态
   * @param choice - 事件选项
   * @returns 选项是否可用
   */
  isChoiceAvailable(state: GameState, choice: EventChoice): boolean {
    if (!choice.condition) {
      return true;
    }
    return checkCondition(state, choice.condition);
  },

  /**
   * 获取事件的所有可用选项
   * @param state - 当前游戏状态
   * @param eventId - 事件ID
   * @returns 可用选项数组
   */
  getAvailableChoices(state: GameState, eventId: string): EventChoice[] {
    const event = dataLoader.getEvent(eventId);
    if (!event || !event.choices) {
      return [];
    }

    return event.choices.filter((choice) => this.isChoiceAvailable(state, choice));
  },
};

export default EventSystem;
