/**
 * /flag 命令 - 状态标记管理
 * 
 * 用法：
 * /flag set gap_discovered      # 设置标记
 * /flag remove gap_discovered   # 移除标记
 * /flag show                    # 显示所有标记
 * /flag clear                   # 清除所有标记
 */

import type { ConsoleCommand, CommandContext, CommandResult } from '../commandRegistry';

export const flagCommand: ConsoleCommand = {
  name: 'flag',
  description: '管理状态标记',
  usage: '/flag <set|remove|show|clear> [flagName] [value]',
  examples: ['/flag set gap_discovered', '/flag remove gap_discovered', '/flag show'],

  execute(args: string[], context: CommandContext): CommandResult {
    if (args.length < 1) {
      return {
        success: false,
        message: '',
        error: '参数不足。用法: /flag <set|remove|show|clear> [flagName] [value]',
      };
    }

    const subCommand = args[0].toLowerCase();
    const state = context.getState();

    switch (subCommand) {
      case 'set': {
        if (args.length < 2) {
          return {
            success: false,
            message: '',
            error: '参数不足。用法: /flag set <flagName> [value]',
          };
        }

        const flagName = args[1];
        const value = args[2] !== undefined ? args[2] : true;

        const newState = { ...state };
        newState.character.status.flags[flagName] = value;
        context.setState(newState);

        return {
          success: true,
          message: `✓ 标记已设置: ${flagName} = ${JSON.stringify(value)}`,
        };
      }

      case 'remove':
      case 'delete': {
        if (args.length < 2) {
          return {
            success: false,
            message: '',
            error: '参数不足。用法: /flag remove <flagName>',
          };
        }

        const flagName = args[1];

        if (!(flagName in state.character.status.flags)) {
          return {
            success: false,
            message: '',
            error: `标记不存在: ${flagName}`,
          };
        }

        const newState = { ...state };
        delete newState.character.status.flags[flagName];
        context.setState(newState);

        return {
          success: true,
          message: `✓ 标记已移除: ${flagName}`,
        };
      }

      case 'show':
      case 'list': {
        const flags = state.character.status.flags;
        const flagEntries = Object.entries(flags);

        if (flagEntries.length === 0) {
          return {
            success: true,
            message: '当前没有状态标记',
          };
        }

        const flagList = flagEntries
          .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
          .join('\n');

        return {
          success: true,
          message: `当前状态标记:\n${flagList}`,
        };
      }

      case 'clear': {
        const newState = { ...state };
        newState.character.status.flags = {};
        context.setState(newState);

        return {
          success: true,
          message: '✓ 所有标记已清除',
        };
      }

      default:
        return {
          success: false,
          message: '',
          error: `未知子命令: ${subCommand}。可用: set, remove, show, clear`,
        };
    }
  },

  getSuggestions(args: string[], argIndex: number, context: CommandContext): string[] {
    if (argIndex === 0) {
      return ['set', 'remove', 'show', 'clear'];
    }
    
    if (argIndex === 1 && (args[0] === 'remove' || args[0] === 'delete')) {
      // 返回已有的标记名称
      const state = context.getState();
      return Object.keys(state.character.status.flags);
    }
    
    return [];
  },
};
