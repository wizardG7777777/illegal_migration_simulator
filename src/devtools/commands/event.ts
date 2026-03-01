/**
 * /event 命令 - 触发特定事件
 * 
 * 用法：
 * /event act3_underground_loan
 * /event rand2_storm
 * /event list               # 列出当前可用事件
 */

import type { ConsoleCommand, CommandContext, CommandResult } from '../commandRegistry';
import { EventSystem } from '../../systems/event/EventSystem';
import { dataLoader } from '../../systems/loader/DataLoader';

export const eventCommand: ConsoleCommand = {
  name: 'event',
  description: '触发特定事件或列出可用事件',
  usage: '/event <eventId|list>',
  examples: ['/event act3_underground_loan', '/event list', '/event rand2_storm'],

  execute(args: string[], context: CommandContext): CommandResult {
    if (args.length < 1) {
      return {
        success: false,
        message: '',
        error: '参数不足。用法: /event <eventId|list>',
      };
    }

    const subCommand = args[0].toLowerCase();
    const state = context.getState();

    // 列出可用事件
    if (subCommand === 'list' || subCommand === 'ls') {
      const currentScene = state.scene.currentScene;
      const availableEvents = EventSystem.getAvailableFixedEvents(state);
      
      if (availableEvents.length === 0) {
        return {
          success: true,
          message: `场景 ${currentScene} 当前没有可用的事件`,
        };
      }

      const eventList = availableEvents
        .map(e => `  • ${e.id} - ${e.name}`)
        .join('\n');

      return {
        success: true,
        message: `场景 ${currentScene} 的可用事件:\n${eventList}`,
      };
    }

    // 触发特定事件
    const eventId = subCommand;
    const event = dataLoader.getEvent(eventId);

    if (!event) {
      // 尝试查找相似的事件ID
      const allEvents = dataLoader.getAllEvents();
      const similarEvents = allEvents
        .filter(e => e.id.includes(eventId) || eventId.includes(e.id))
        .slice(0, 5)
        .map(e => e.id);

      let suggestion = '';
      if (similarEvents.length > 0) {
        suggestion = `\n相似的事件ID: ${similarEvents.join(', ')}`;
      }

      return {
        success: false,
        message: '',
        error: `事件不存在: ${eventId}${suggestion}`,
      };
    }

    // 检查事件是否适用于当前场景
    if (!event.scenes.includes(state.scene.currentScene)) {
      return {
        success: false,
        message: '',
        error: `事件 ${eventId} 不适用于当前场景 ${state.scene.currentScene}。适用场景: ${event.scenes.join(', ')}`,
      };
    }

    try {
      // 使用 store 的 devTriggerEvent 方法
      context.store.devTriggerEvent(eventId);

      return {
        success: true,
        message: `✓ 事件已触发: ${eventId} - ${event.name}`,
      };
    } catch (error) {
      return {
        success: false,
        message: '',
        error: `触发事件失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  getSuggestions(args: string[], argIndex: number, context: CommandContext): string[] {
    if (argIndex === 0) {
      if (args[0]) {
        // 搜索匹配的事件ID
        const allEvents = dataLoader.getAllEvents();
        const currentScene = context.getState().scene.currentScene;
        return allEvents
          .filter(e => e.scenes.includes(currentScene) && e.id.includes(args[0]))
          .map(e => e.id)
          .slice(0, 10);
      }
      return ['list'];
    }
    return [];
  },
};
