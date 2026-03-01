/**
 * /save 和 /load 命令 - 检查点管理
 * 
 * 用法：
 * /save checkpoint1       # 保存检查点
 * /load checkpoint1       # 加载检查点
 * /save list              # 列出所有检查点
 * /save delete checkpoint1 # 删除检查点
 */

import type { ConsoleCommand, CommandContext, CommandResult } from '../commandRegistry';
import { deepClone } from '../../utils/pure';
import type { SaveData } from '../../types';

const DEV_SAVE_PREFIX = 'dev_save_';

export const saveCommand: ConsoleCommand = {
  name: 'save',
  description: '保存检查点',
  usage: '/save <checkpointName|list|delete>',
  examples: ['/save before_test', '/save list'],

  execute(args: string[], context: CommandContext): CommandResult {
    if (args.length < 1) {
      return {
        success: false,
        message: '',
        error: '参数不足。用法: /save <checkpointName|list|delete>',
      };
    }

    const subCommand = args[0].toLowerCase();

    switch (subCommand) {
      case 'list': {
        const saves: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(DEV_SAVE_PREFIX)) {
            const saveName = key.slice(DEV_SAVE_PREFIX.length);
            const saveData = localStorage.getItem(key);
            if (saveData) {
              try {
                const data: SaveData = JSON.parse(saveData);
                const date = new Date(data.savedAt).toLocaleString();
                saves.push(`  ${saveName} - ${date}`);
              } catch {
                saves.push(`  ${saveName} - (无法解析)`);
              }
            }
          }
        }

        if (saves.length === 0) {
          return {
            success: true,
            message: '没有保存的检查点',
          };
        }

        return {
          success: true,
          message: `已保存的检查点:\n${saves.join('\n')}`,
        };
      }

      case 'delete': {
        if (args.length < 2) {
          return {
            success: false,
            message: '',
            error: '参数不足。用法: /save delete <checkpointName>',
          };
        }

        const saveName = args[1];
        const key = `${DEV_SAVE_PREFIX}${saveName}`;

        if (!localStorage.getItem(key)) {
          return {
            success: false,
            message: '',
            error: `检查点不存在: ${saveName}`,
          };
        }

        localStorage.removeItem(key);

        return {
          success: true,
          message: `✓ 检查点已删除: ${saveName}`,
        };
      }

      default: {
        // 保存检查点
        const saveName = subCommand;
        const key = `${DEV_SAVE_PREFIX}${saveName}`;
        
        const state = context.getState();
        const saveData: SaveData = {
          version: state.meta.version,
          savedAt: Date.now(),
          state: deepClone(state),
        };

        try {
          localStorage.setItem(key, JSON.stringify(saveData));

          return {
            success: true,
            message: `✓ 检查点已保存: ${saveName}`,
          };
        } catch (error) {
          return {
            success: false,
            message: '',
            error: `保存失败: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }
    }
  },

  getSuggestions(args: string[], argIndex: number, _context: CommandContext): string[] {
    if (argIndex === 0) {
      return ['list', 'delete'];
    }
    
    if (argIndex === 1 && args[0] === 'delete') {
      // 返回已有的检查点名称
      const saves: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(DEV_SAVE_PREFIX)) {
          saves.push(key.slice(DEV_SAVE_PREFIX.length));
        }
      }
      return saves;
    }
    
    return [];
  },
};

export const loadCommand: ConsoleCommand = {
  name: 'load',
  description: '加载检查点',
  usage: '/load <checkpointName>',
  examples: ['/load before_test'],

  execute(args: string[], context: CommandContext): CommandResult {
    if (args.length < 1) {
      return {
        success: false,
        message: '',
        error: '参数不足。用法: /load <checkpointName>',
      };
    }

    const saveName = args[0];
    const key = `${DEV_SAVE_PREFIX}${saveName}`;

    const saveJson = localStorage.getItem(key);
    if (!saveJson) {
      return {
        success: false,
        message: '',
        error: `检查点不存在: ${saveName}`,
      };
    }

    try {
      const saveData: SaveData = JSON.parse(saveJson);
      
      // 版本检查
      if (saveData.version !== '1.0.0') {
        console.warn(`存档版本不匹配: ${saveData.version} vs 1.0.0`);
      }

      context.setState(deepClone(saveData.state));

      return {
        success: true,
        message: `✓ 检查点已加载: ${saveName}`,
      };
    } catch (error) {
      return {
        success: false,
        message: '',
        error: `加载失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  getSuggestions(_args: string[], argIndex: number, _context: CommandContext): string[] {
    if (argIndex === 0) {
      // 返回已有的检查点名称
      const saves: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(DEV_SAVE_PREFIX)) {
          saves.push(key.slice(DEV_SAVE_PREFIX.length));
        }
      }
      return saves;
    }
    return [];
  },
};
