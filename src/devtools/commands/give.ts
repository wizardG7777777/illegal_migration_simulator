/**
 * /give 和 /remove 命令 - 道具管理
 * 
 * 用法：
 * /give food_supply 5
 * /give perm_vehicle_ebike
 * /remove food_supply 3
 * /remove perm_vehicle_ebike
 */

import type { ConsoleCommand, CommandContext, CommandResult } from '../commandRegistry';
import { ItemSystem } from '../../systems/item/ItemSystem';
import { dataLoader } from '../../systems/loader/DataLoader';

export const giveCommand: ConsoleCommand = {
  name: 'give',
  description: '添加道具到背包',
  usage: '/give <itemId> [count]',
  examples: ['/give food_supply 5', '/give perm_vehicle_ebike'],

  execute(args: string[], context: CommandContext): CommandResult {
    if (args.length < 1) {
      return {
        success: false,
        message: '',
        error: '参数不足。用法: /give <itemId> [count]',
      };
    }

    const itemId = args[0];
    const count = parseInt(args[1] || '1', 10);

    if (isNaN(count) || count < 1) {
      return {
        success: false,
        message: '',
        error: `无效数量: ${args[1]}`,
      };
    }

    const item = dataLoader.getItem(itemId);
    if (!item) {
      // 尝试查找相似的道具ID
      const allItems = dataLoader.getAllItems();
      const similarItems = allItems
        .filter(i => i.id.includes(itemId) || itemId.includes(i.id))
        .slice(0, 5)
        .map(i => i.id);

      let suggestion = '';
      if (similarItems.length > 0) {
        suggestion = `\n相似的道具ID: ${similarItems.join(', ')}`;
      }

      return {
        success: false,
        message: '',
        error: `道具不存在: ${itemId}${suggestion}`,
      };
    }

    try {
      // 根据道具类型决定添加方式
      if (item.category === 'CONSUMABLE') {
        context.store.devAddItem(itemId, count);
        return {
          success: true,
          message: `✓ 已添加 ${count} 个 ${item.name} (${itemId})`,
        };
      } else {
        // 常驻道具一次只能添加一个
        context.store.devAddItem(itemId, 1);
        return {
          success: true,
          message: `✓ 已获得 ${item.name} (${itemId})`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: '',
        error: `添加道具失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  getSuggestions(args: string[], argIndex: number, _context: CommandContext): string[] {
    if (argIndex === 0) {
      const allItems = dataLoader.getAllItems();
      if (args[0]) {
        return allItems
          .filter(i => i.id.includes(args[0]))
          .map(i => i.id)
          .slice(0, 10);
      }
      return allItems.slice(0, 10).map(i => i.id);
    }
    return [];
  },
};

export const removeCommand: ConsoleCommand = {
  name: 'remove',
  description: '从背包移除道具',
  usage: '/remove <itemId> [count]',
  examples: ['/remove food_supply 3', '/remove perm_vehicle_ebike'],

  execute(args: string[], context: CommandContext): CommandResult {
    if (args.length < 1) {
      return {
        success: false,
        message: '',
        error: '参数不足。用法: /remove <itemId> [count]',
      };
    }

    const itemId = args[0];
    const count = parseInt(args[1] || '1', 10);

    if (isNaN(count) || count < 1) {
      return {
        success: false,
        message: '',
        error: `无效数量: ${args[1]}`,
      };
    }

    const item = dataLoader.getItem(itemId);
    if (!item) {
      return {
        success: false,
        message: '',
        error: `道具不存在: ${itemId}`,
      };
    }

    const state = context.getState();

    // 检查是否拥有该道具
    if (item.category === 'CONSUMABLE') {
      const currentCount = ItemSystem.getConsumableCount(state, itemId);
      if (currentCount < count) {
        return {
          success: false,
          message: '',
          error: `道具数量不足: ${itemId} (拥有 ${currentCount}, 需要 ${count})`,
        };
      }
    } else {
      if (!ItemSystem.hasPermanentItem(state, itemId)) {
        return {
          success: false,
          message: '',
          error: `未持有该道具: ${itemId}`,
        };
      }
    }

    try {
      context.store.devRemoveItem(itemId, count);
      
      if (item.category === 'CONSUMABLE') {
        return {
          success: true,
          message: `✓ 已移除 ${count} 个 ${item.name} (${itemId})`,
        };
      } else {
        return {
          success: true,
          message: `✓ 已移除 ${item.name} (${itemId})`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: '',
        error: `移除道具失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  getSuggestions(args: string[], argIndex: number, context: CommandContext): string[] {
    if (argIndex === 0) {
      const state = context.getState();
      const items: string[] = [];
      
      // 添加消耗品
      state.inventory.consumables.forEach(c => items.push(c.itemId));
      // 添加常驻道具
      state.inventory.permanents.forEach(p => items.push(p.itemId));
      
      if (args[0]) {
        return items.filter(id => id.includes(args[0])).slice(0, 10);
      }
      return items.slice(0, 10);
    }
    return [];
  },
};
