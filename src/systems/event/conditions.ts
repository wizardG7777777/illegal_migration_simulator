/**
 * conditions.ts
 *
 * 事件条件检查模块
 * 提供统一的条件检查函数，用于判断事件或选项是否可用
 */

import type {
  GameState,
  EventCondition,
  SceneCondition,
  AttributeCondition,
  ItemCondition,
  FlagCondition,
  ChainUnlockedCondition,
} from '../../types';
import { dataLoader } from '../loader/DataLoader';

/**
 * 检查事件条件是否满足
 * @param state - 当前游戏状态
 * @param condition - 事件条件
 * @returns 条件是否满足
 *
 * @example
 * ```typescript
 * // 检查属性条件
 * const condition: AttributeCondition = {
 *   type: 'ATTRIBUTE',
 *   attribute: 'physique',
 *   operator: '>=',
 *   value: 12
 * };
 * const canPass = checkCondition(state, condition);
 *
 * // 检查道具条件
 * const condition: ItemCondition = {
 *   type: 'ITEM',
 *   tag: 'transport'
 * };
 * const hasTransport = checkCondition(state, condition);
 * ```
 */
export function checkCondition(state: GameState, condition: EventCondition): boolean {
  switch (condition.type) {
    case 'SCENE':
      return checkSceneCondition(state, condition as SceneCondition);
    case 'ATTRIBUTE':
      return checkAttributeCondition(state, condition as AttributeCondition);
    case 'ITEM':
      return checkItemCondition(state, condition as ItemCondition);
    case 'FLAG':
      return checkFlagCondition(state, condition as FlagCondition);
    case 'CHAIN_UNLOCKED':
      return checkChainUnlockedCondition(state, condition as ChainUnlockedCondition);
    default:
      // 未知条件类型，默认返回 true（不阻止事件触发）
      console.warn(`[checkCondition] 未知的条件类型: ${(condition as EventCondition).type}`);
      return true;
  }
}

/**
 * 检查场景条件
 * 检查当前场景是否匹配，以及场景回合数是否在范围内
 */
function checkSceneCondition(state: GameState, condition: SceneCondition): boolean {
  const { currentScene, sceneTurn } = state.scene;

  // 检查场景是否匹配
  if (currentScene !== condition.value) {
    return false;
  }

  // 检查最小场景回合数
  if (condition.minSceneTurn !== undefined && sceneTurn < condition.minSceneTurn) {
    return false;
  }

  // 检查最大场景回合数
  if (condition.maxSceneTurn !== undefined && sceneTurn > condition.maxSceneTurn) {
    return false;
  }

  return true;
}

/**
 * 检查属性条件
 * 使用操作符比较属性值
 */
function checkAttributeCondition(state: GameState, condition: AttributeCondition): boolean {
  const currentValue = state.character.attributes[condition.attribute];
  const targetValue = condition.value;

  switch (condition.operator) {
    case '>':
      return currentValue > targetValue;
    case '<':
      return currentValue < targetValue;
    case '>=':
      return currentValue >= targetValue;
    case '<=':
      return currentValue <= targetValue;
    case '==':
      return currentValue === targetValue;
    default:
      console.warn(`[checkAttributeCondition] 未知的操作符: ${condition.operator}`);
      return true;
  }
}

/**
 * 检查道具条件
 * 检查是否拥有特定道具或某类标签的道具
 */
function checkItemCondition(state: GameState, condition: ItemCondition): boolean {
  const requiredCount = condition.count ?? 1;

  // 如果指定了道具ID，检查是否拥有该道具
  if (condition.itemId) {
    const item = dataLoader.getItem(condition.itemId);
    if (!item) {
      return false;
    }

    if (item.category === 'CONSUMABLE') {
      // 检查消耗品数量
      const existing = state.inventory.consumables.find((c) => c.itemId === condition.itemId);
      return (existing?.count ?? 0) >= requiredCount;
    } else if (item.category === 'PERMANENT') {
      // 检查是否拥有常驻道具
      return state.inventory.permanents.some((p) => p.itemId === condition.itemId);
    }
    return false;
  }

  // 如果指定了标签，检查是否拥有该标签的道具
  if (condition.tag) {
    // 检查消耗品
    const consumableMatch = state.inventory.consumables.some((c) => {
      const item = dataLoader.getItem(c.itemId);
      return item?.category === 'CONSUMABLE' && (item as any).tags?.includes(condition.tag);
    });

    if (consumableMatch) {
      return true;
    }

    // 检查常驻道具
    const permanentMatch = state.inventory.permanents.some((p) => {
      const item = dataLoader.getItem(p.itemId);
      return item?.category === 'PERMANENT' && (item as any).tags?.includes(condition.tag);
    });

    return permanentMatch;
  }

  // 既没有指定 itemId 也没有指定 tag，返回 false
  return false;
}

/**
 * 检查状态标记条件
 * 检查是否设置了特定的状态标记
 */
function checkFlagCondition(state: GameState, condition: FlagCondition): boolean {
  const flagValue = state.character.status.flags[condition.flag];
  
  // 如果标记不存在，将其视为 false
  if (flagValue === undefined) {
    return condition.value === false;
  }

  // 标记存在，比较值
  // 支持 boolean/number/string 类型
  return flagValue === condition.value;
}

/**
 * 检查链式事件解锁条件
 * 检查链式事件是否已经解锁（由链式事件系统管理）
 */
function checkChainUnlockedCondition(
  state: GameState,
  condition: ChainUnlockedCondition
): boolean {
  // 检查是否有匹配的活跃链式事件，且当前步骤匹配
  const activeChain = state.event.activeChains.find(
    (chain) =>
      chain.chainId === condition.chainId && chain.currentStep === condition.stepIndex
  );

  // 只有当活跃链存在且当前回合 >= 计划解锁回合时才认为已解锁
  if (activeChain) {
    return state.scene.turnCount >= activeChain.unlockTurn;
  }

  return false;
}

/**
 * 检查多个条件（AND 逻辑）
 * 所有条件都必须满足才返回 true
 * @param state - 当前游戏状态
 * @param conditions - 条件数组
 * @returns 是否所有条件都满足
 */
export function checkAllConditions(
  state: GameState,
  conditions: EventCondition[]
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }
  return conditions.every((condition) => checkCondition(state, condition));
}

/**
 * 检查多个条件（OR 逻辑）
 * 任意一个条件满足就返回 true
 * @param state - 当前游戏状态
 * @param conditions - 条件数组
 * @returns 是否有任意条件满足
 */
export function checkAnyCondition(
  state: GameState,
  conditions: EventCondition[]
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }
  return conditions.some((condition) => checkCondition(state, condition));
}

export default checkCondition;
