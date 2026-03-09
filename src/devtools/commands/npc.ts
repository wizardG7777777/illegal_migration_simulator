/**
 * /npc 命令 - 管理NPC系统
 * 
 * 用法：
 * /npc list                    # 列出所有NPC及状态
 * /npc unlock <npcId>          # 解锁指定NPC
 * /npc lock <npcId>            # 锁定指定NPC（删除解锁状态）
 * /npc info <npcId>            # 查看NPC详细信息
 */

import type { ConsoleCommand, CommandContext, CommandResult } from '../commandRegistry';
import { NPCSystem } from '../../systems/npc/NPCSystem';
import { dataLoader } from '../../systems/loader/DataLoader';

export const npcCommand: ConsoleCommand = {
  name: 'npc',
  description: '管理NPC系统（解锁、查看状态等）',
  usage: '/npc <list|unlock|lock|info> [npcId]',
  examples: [
    '/npc list',
    '/npc unlock npc_john_driver',
    '/npc info npc_zhang_lawyer',
  ],

  execute(args: string[], context: CommandContext): CommandResult {
    if (args.length < 1) {
      return {
        success: false,
        message: '',
        error: '参数不足。用法: /npc <list|unlock|lock|info> [npcId]',
      };
    }

    const subCommand = args[0].toLowerCase();
    const state = context.getState();

    switch (subCommand) {
      case 'list':
      case 'ls': {
        const allNPCs = dataLoader.getAllNPCs();
        if (allNPCs.length === 0) {
          return {
            success: true,
            message: '没有配置任何NPC',
          };
        }

        const npcList = allNPCs.map(npc => {
          const npcState = state.npcSystem.npcs[npc.id];
          const isUnlocked = npcState?.unlocked || false;
          const lastInteract = npcState?.lastInteractionTurn || 0;
          const turnsAgo = state.scene.turnCount - lastInteract;
          
          return `  ${isUnlocked ? '✓' : '○'} ${npc.name} (${npc.id})
    状态: ${isUnlocked ? '已解锁' : '未解锁'}
    上次互动: ${isUnlocked ? `${turnsAgo}回合前` : 'N/A'}
    配置标签: ${npc.tags.join(', ')}`;
        }).join('\n');

        return {
          success: true,
          message: `NPC列表:\n${npcList}`,
        };
      }

      case 'unlock': {
        if (args.length < 2) {
          return {
            success: false,
            message: '',
            error: '请指定NPC ID。用法: /npc unlock <npcId>',
          };
        }

        const npcId = args[1];
        const npcConfig = dataLoader.getNPC(npcId);
        
        if (!npcConfig) {
          // 查找相似的NPC ID
          const allNPCs = dataLoader.getAllNPCs();
          const similar = allNPCs
            .filter(n => n.id.includes(npcId) || npcId.includes(n.id))
            .slice(0, 3)
            .map(n => n.id);
          
          let suggestion = '';
          if (similar.length > 0) {
            suggestion = `\n相似的NPC: ${similar.join(', ')}`;
          }
          
          return {
            success: false,
            message: '',
            error: `NPC不存在: ${npcId}${suggestion}`,
          };
        }

        // 检查是否已解锁
        if (state.npcSystem.npcs[npcId]?.unlocked) {
          return {
            success: true,
            message: `NPC ${npcConfig.name} 已经是解锁状态`,
          };
        }

        try {
          const newState = NPCSystem.unlockNPC(state, npcId);
          context.setState(newState);

          return {
            success: true,
            message: `✓ 已解锁NPC: ${npcConfig.name} (${npcId})`,
          };
        } catch (error) {
          return {
            success: false,
            message: '',
            error: `解锁NPC失败: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }

      case 'lock': {
        if (args.length < 2) {
          return {
            success: false,
            message: '',
            error: '请指定NPC ID。用法: /npc lock <npcId>',
          };
        }

        const npcId = args[1];
        
        if (!state.npcSystem.npcs[npcId]?.unlocked) {
          return {
            success: true,
            message: `NPC ${npcId} 已经是锁定状态`,
          };
        }

        // 创建新状态，删除该NPC的解锁状态
        const newState = {
          ...state,
          npcSystem: {
            ...state.npcSystem,
            npcs: {
              ...state.npcSystem.npcs,
              [npcId]: {
                ...state.npcSystem.npcs[npcId],
                unlocked: false,
              },
            },
          },
        };
        
        context.setState(newState);

        return {
          success: true,
          message: `✓ 已锁定NPC: ${npcId}`,
        };
      }

      case 'info': {
        if (args.length < 2) {
          return {
            success: false,
            message: '',
            error: '请指定NPC ID。用法: /npc info <npcId>',
          };
        }

        const npcId = args[1];
        const npcConfig = dataLoader.getNPC(npcId);
        
        if (!npcConfig) {
          return {
            success: false,
            message: '',
            error: `NPC不存在: ${npcId}`,
          };
        }

        const npcState = state.npcSystem.npcs[npcId];
        const chatHistory = NPCSystem.getNPCChatHistory(state, npcId);
        
        const info = `NPC详情: ${npcConfig.name}
─────────────────
ID: ${npcConfig.id}
头像: ${npcConfig.avatar}
状态: ${npcState?.unlocked ? '✓ 已解锁' : '○ 未解锁'}
标签: ${npcConfig.tags.join(', ')}
解锁条件: ${npcConfig.unlockCondition 
  ? `场景${npcConfig.unlockCondition.scene || '任意'}, 回合${npcConfig.unlockCondition.minSceneTurn || '任意'}`
  : '无'}
问候语: ${npcConfig.greetingMessage}
聊天记录数: ${chatHistory.length}条
${npcState?.unlocked ? `上次互动: ${state.scene.turnCount - npcState.lastInteractionTurn}回合前` : ''}`;

        return {
          success: true,
          message: info,
        };
      }

      default:
        return {
          success: false,
          message: '',
          error: `未知子命令: ${subCommand}。可用: list, unlock, lock, info`,
        };
    }
  },

  getSuggestions(args: string[], argIndex: number, _context: CommandContext): string[] {
    if (argIndex === 0) {
      return ['list', 'unlock', 'lock', 'info'];
    }
    
    if (argIndex === 1 && ['unlock', 'lock', 'info'].includes(args[0])) {
      // 返回所有NPC ID
      return dataLoader.getAllNPCs().map(n => n.id);
    }
    
    return [];
  },
};
