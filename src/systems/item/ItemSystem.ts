/**
 * ItemSystem.ts
 *
 * 物品系统 - 负责管理游戏中的所有物品操作
 *
 * 功能包括：
 * 1. 消耗品管理（添加、移除、使用，支持堆叠）
 * 2. 常驻道具管理（添加、移除、清空，占用槽位）
 * 3. 槽位匹配（为事件系统提供道具匹配）
 * 4. 全局书籍池抽取
 * 5. 辅助查询方法
 *
 * 所有方法均为纯函数，返回新的 GameState
 */

import type {
  GameState,
  ConsumableItem,
  PermanentItem,
  ItemSlot,
} from '../../types';
import { deepClone, clamp } from '../../utils/pure';
import { dataLoader } from '../loader/DataLoader';

/**
 * 物品系统
 * 提供所有物品相关的操作方法
 */
export const ItemSystem = {
  // ========== 物品操作 ==========

  /**
   * 添加物品到背包
   * - 消耗品：自动堆叠，受 maxStack 限制
   * - 常驻品：调用 addPermanentItem 逻辑
   *
   * @param state - 当前游戏状态
   * @param itemId - 物品ID
   * @param count - 数量（默认为1，消耗品有效）
   * @returns 新的游戏状态
   * @throws 物品不存在时抛出错误
   *
   * @example
   * ```typescript
   * // 添加消耗品（自动堆叠）
   * state = ItemSystem.addItem(state, 'consumable_food_supply', 5);
   *
   * // 添加常驻道具
   * state = ItemSystem.addItem(state, 'perm_ebike');
   * ```
   */
  addItem(state: GameState, itemId: string, count: number = 1): GameState {
    const item = dataLoader.getItem(itemId);
    if (!item) {
      throw new Error(`物品不存在: ${itemId}`);
    }

    // 根据物品类型分别处理
    if (item.category === 'CONSUMABLE') {
      return addConsumableItem(state, itemId, count);
    } else if (item.category === 'PERMANENT') {
      // 常驻道具一次只能添加一个
      return addPermanentItemInternal(state, itemId);
    }

    return state;
  },

  /**
   * 移除物品
   * - 消耗品：减少数量，归零时移除条目
   * - 常驻品：调用 removePermanentItem 逻辑
   *
   * @param state - 当前游戏状态
   * @param itemId - 物品ID
   * @param count - 数量（默认为1，消耗品有效）
   * @returns 新的游戏状态
   * @throws 物品不存在或数量不足时抛出错误
   */
  removeItem(state: GameState, itemId: string, count: number = 1): GameState {
    const item = dataLoader.getItem(itemId);
    if (!item) {
      throw new Error(`物品不存在: ${itemId}`);
    }

    if (item.category === 'CONSUMABLE') {
      return removeConsumableItem(state, itemId, count);
    } else if (item.category === 'PERMANENT') {
      return removePermanentItemInternal(state, itemId);
    }

    return state;
  },

  /**
   * 使用消耗品
   * 应用消耗品效果到角色，并减少数量
   *
   * @param state - 当前游戏状态
   * @param itemId - 消耗品ID
   * @returns 新的游戏状态
   * @throws 物品不存在、不是消耗品或数量不足时抛出错误
   *
   * @example
   * ```typescript
   * // 使用止痛药
   * state = ItemSystem.useConsumable(state, 'consumable_painkiller');
   * // 效果：health + 15
   * ```
   */
  useConsumable(state: GameState, itemId: string): GameState {
    const item = dataLoader.getItem(itemId);
    if (!item) {
      throw new Error(`物品不存在: ${itemId}`);
    }

    if (item.category !== 'CONSUMABLE') {
      throw new Error(`物品不是消耗品: ${itemId}`);
    }

    const consumable = item as ConsumableItem;

    // 检查数量
    const existing = state.inventory.consumables.find((c: { itemId: string; count: number }) => c.itemId === itemId);
    if (!existing || existing.count <= 0) {
      throw new Error(`消耗品数量不足: ${itemId}`);
    }

    // 克隆状态
    let newState = deepClone(state);

    // 应用使用效果
    const effects = consumable.effects;

    // 1. 回复身体健康度
    if (effects.healthRestore && effects.healthRestore > 0) {
      newState.character.resources.health.current = clamp(
        newState.character.resources.health.current + effects.healthRestore,
        0,
        newState.character.resources.health.max
      );
    }

    // 2. 回复心理健康度
    if (effects.mentalRestore && effects.mentalRestore > 0) {
      newState.character.resources.mental.current = clamp(
        newState.character.resources.mental.current + effects.mentalRestore,
        0,
        newState.character.resources.mental.max
      );
    }

    // 3. 回复行动点
    if (effects.actionPointRestore && effects.actionPointRestore > 0) {
      newState.character.resources.actionPoints.current = clamp(
        newState.character.resources.actionPoints.current + effects.actionPointRestore,
        newState.character.resources.actionPoints.min,
        newState.character.resources.actionPoints.max
      );
    }

    // 4. 一次性属性加成
    if (effects.attributeBonus) {
      for (const [attr, value] of Object.entries(effects.attributeBonus)) {
        if (value !== undefined) {
          const attrKey = attr as keyof typeof newState.character.attributes;
          newState.character.attributes[attrKey] = clamp(
            newState.character.attributes[attrKey] + value,
            0,
            20
          );
        }
      }
    }

    // 5. 获得其他道具
    if (effects.grantItems && effects.grantItems.length > 0) {
      for (const grant of effects.grantItems) {
        // 递归添加，避免循环引用问题
        const grantItem = dataLoader.getItem(grant.itemId);
        if (grantItem) {
          if (grantItem.category === 'CONSUMABLE') {
            newState = addConsumableItem(newState, grant.itemId, grant.count);
          } else if (grantItem.category === 'PERMANENT') {
            newState = addPermanentItemInternal(newState, grant.itemId);
          }
        }
      }
    }

    // 6. 消耗数量
    newState = removeConsumableItem(newState, itemId, 1);

    return newState;
  },

  // ========== 常驻道具槽位 ==========

  /**
   * 添加常驻道具
   * 每个常驻道具占用一个槽位（slot 编号 0-N）
   *
   * @param state - 当前游戏状态
   * @param itemId - 常驻道具ID
   * @returns 新的游戏状态
   * @throws 物品不存在或不是常驻道具时抛出错误
   *
   * @example
   * ```typescript
   * // 添加电动车
   * state = ItemSystem.addPermanentItem(state, 'perm_ebike');
   * ```
   */
  addPermanentItem(state: GameState, itemId: string): GameState {
    return addPermanentItemInternal(state, itemId);
  },

  /**
   * 移除常驻道具
   *
   * @param state - 当前游戏状态
   * @param itemId - 常驻道具ID
   * @returns 新的游戏状态
   * @throws 物品不存在或未拥有时抛出错误
   */
  removePermanentItem(state: GameState, itemId: string): GameState {
    return removePermanentItemInternal(state, itemId);
  },

  /**
   * 清空所有常驻道具
   * 场景切换时调用（跨场景保留的物品需通过 CrossSceneData 处理）
   *
   * @param state - 当前游戏状态
   * @returns 新的游戏状态
   *
   * @example
   * ```typescript
   * // 场景切换时
   * state = ItemSystem.clearPermanentItems(state);
   * ```
   */
  clearPermanentItems(state: GameState): GameState {
    const newState = deepClone(state);
    newState.inventory.permanents = [];
    return newState;
  },

  // ========== 槽位匹配 ==========

  /**
   * 获取匹配槽位的道具列表
   * 返回玩家拥有的所有匹配标签的常驻道具，按优先级排序（数字小优先）
   *
   * @param state - 当前游戏状态
   * @param slot - 物品槽位配置
   * @returns 匹配的常驻道具数组（按优先级排序）
   *
   * @example
   * ```typescript
   * const slot: ItemSlot = {
   *   id: 'transport',
   *   name: '交通工具',
   *   tags: ['transport'],
   *   required: false
   * };
   * const matches = ItemSystem.getMatchingItems(state, slot);
   * // 返回 [特斯拉(priority:1), 电动车(priority:3), 公交卡(priority:4)]
   * ```
   */
  getMatchingItems(state: GameState, slot: ItemSlot): PermanentItem[] {
    const matchingItems: PermanentItem[] = [];

    for (const permanent of state.inventory.permanents) {
      const item = dataLoader.getItem(permanent.itemId);
      if (item && item.category === 'PERMANENT') {
        const permItem = item as PermanentItem;
        // 检查是否匹配槽位的任一标签
        const hasMatchingTag = slot.tags.some((tag) => permItem.tags.includes(tag));
        if (hasMatchingTag) {
          matchingItems.push(permItem);
        }
      }
    }

    // 按优先级排序（数字越小优先级越高）
    return matchingItems.sort((a, b) => a.priority - b.priority);
  },

  /**
   * 计算槽位匹配的最佳道具
   * 返回优先级最高的道具（数字最小）
   *
   * @param state - 当前游戏状态
   * @param slot - 物品槽位配置
   * @returns 最佳匹配的常驻道具，如果没有则返回 null
   *
   * @example
   * ```typescript
   * const bestTransport = ItemSystem.findBestMatch(state, transportSlot);
   * if (bestTransport) {
   *   console.log(`自动选择: ${bestTransport.name}`);
   * }
   * ```
   */
  findBestMatch(state: GameState, slot: ItemSlot): PermanentItem | null {
    const matches = this.getMatchingItems(state, slot);
    return matches.length > 0 ? matches[0] : null;
  },

  // ========== 全局书籍池 ==========

  /**
   * 从全局池抽取随机书籍
   * 使用 DataLoader 抽取并添加到背包
   *
   * @param state - 当前游戏状态
   * @returns 新的游戏状态
   * @throws 书籍池为空时抛出错误
   *
   * @example
   * ```typescript
   * // 书店购买或事件奖励
   * state = ItemSystem.drawRandomBook(state);
   * ```
   */
  drawRandomBook(state: GameState): GameState {
    const book = dataLoader.drawRandomBook();
    if (!book) {
      throw new Error('全局书籍池为空');
    }

    // 书籍作为消耗品添加
    return addConsumableItem(state, book.id, 1);
  },

  // ========== 辅助查询 ==========

  /**
   * 获取消耗品数量
   *
   * @param state - 当前游戏状态
   * @param itemId - 消耗品ID
   * @returns 当前持有数量（未持有返回0）
   *
   * @example
   * ```typescript
   * const foodCount = ItemSystem.getConsumableCount(state, 'consumable_food_supply');
   * if (foodCount >= 3) {
   *   // 可以执行某些操作
   * }
   * ```
   */
  getConsumableCount(state: GameState, itemId: string): number {
    const existing = state.inventory.consumables.find((c: { itemId: string; count: number }) => c.itemId === itemId);
    return existing ? existing.count : 0;
  },

  /**
   * 检查是否拥有常驻道具
   *
   * @param state - 当前游戏状态
   * @param itemId - 常驻道具ID
   * @returns 是否拥有该道具
   *
   * @example
   * ```typescript
   * if (ItemSystem.hasPermanentItem(state, 'perm_ebike')) {
   *   // 可以接送外卖任务
   * }
   * ```
   */
  hasPermanentItem(state: GameState, itemId: string): boolean {
    return state.inventory.permanents.some((p: { itemId: string; slot: number }) => p.itemId === itemId);
  },
};

// ========== 内部辅助函数 ==========

/**
 * 添加消耗品（内部实现）
 * 自动堆叠，受 maxStack 限制
 */
function addConsumableItem(state: GameState, itemId: string, count: number): GameState {
  const item = dataLoader.getItem(itemId);
  if (!item || item.category !== 'CONSUMABLE') {
    throw new Error(`无效的消耗品: ${itemId}`);
  }

  const consumable = item as ConsumableItem;
  const newState = deepClone(state);

  // 查找是否已有该物品
  const existing = newState.inventory.consumables.find((c: { itemId: string; count: number }) => c.itemId === itemId);

  if (existing) {
    // 检查 maxStack 限制
    existing.count = Math.min(existing.count + count, consumable.maxStack);
  } else {
    // 新增条目
    newState.inventory.consumables.push({
      itemId,
      count: Math.min(count, consumable.maxStack),
    });
  }

  return newState;
}

/**
 * 移除消耗品（内部实现）
 * 数量归零时移除条目
 */
function removeConsumableItem(state: GameState, itemId: string, count: number): GameState {
  const newState = deepClone(state);

  const existingIndex = newState.inventory.consumables.findIndex((c: { itemId: string; count: number }) => c.itemId === itemId);
  if (existingIndex === -1) {
    throw new Error(`未持有该消耗品: ${itemId}`);
  }

  const existing: { itemId: string; count: number } = newState.inventory.consumables[existingIndex];
  if (existing.count < count) {
    throw new Error(`消耗品数量不足: ${itemId} (需要 ${count}, 拥有 ${existing.count})`);
  }

  existing.count -= count;

  // 数量归零时移除条目
  if (existing.count <= 0) {
    newState.inventory.consumables.splice(existingIndex, 1);
  }

  return newState;
}

/**
 * 添加常驻道具（内部实现）
 * 分配槽位编号
 */
function addPermanentItemInternal(state: GameState, itemId: string): GameState {
  const item = dataLoader.getItem(itemId);
  if (!item || item.category !== 'PERMANENT') {
    throw new Error(`无效的常驻道具: ${itemId}`);
  }

  const newState = deepClone(state);

  // 检查是否已拥有
  if (newState.inventory.permanents.some((p: { itemId: string; slot: number }) => p.itemId === itemId)) {
    // 已拥有，直接返回（或者可以选择抛出错误）
    return newState;
  }

  // 分配槽位编号（使用当前最大槽位 + 1，或 0）
  const maxSlot = newState.inventory.permanents.reduce(
    (max: number, p: { itemId: string; slot: number }) => Math.max(max, p.slot),
    -1
  );

  newState.inventory.permanents.push({
    itemId,
    slot: maxSlot + 1,
  });

  return newState;
}

/**
 * 移除常驻道具（内部实现）
 */
function removePermanentItemInternal(state: GameState, itemId: string): GameState {
  const newState = deepClone(state);

  const index = newState.inventory.permanents.findIndex((p: { itemId: string; slot: number }) => p.itemId === itemId);
  if (index === -1) {
    throw new Error(`未持有该常驻道具: ${itemId}`);
  }

  newState.inventory.permanents.splice(index, 1);

  // 重新整理槽位编号（保持连续性）
  newState.inventory.permanents.forEach((p: { itemId: string; slot: number }, i: number) => {
    p.slot = i;
  });

  return newState;
}

// 导出类型
export type { ItemSlot };

// 默认导出
export default ItemSystem;
