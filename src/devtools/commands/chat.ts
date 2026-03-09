/**
 * /chat 命令 - 管理聊天记录
 * 
 * 用法：
 * /chat history <npcId>         # 查看与某NPC的聊天记录
 * /chat clear [npcId]           # 清空聊天记录（不指定则清空全部）
 * /chat say <npcId> <message>   # 模拟NPC发送消息（测试用）
 * /chat export [npcId]          # 导出聊天记录（用于LLM调试）
 */

import type { ConsoleCommand, CommandContext, CommandResult } from '../commandRegistry';
import { NPCSystem } from '../../systems/npc/NPCSystem';
import { dataLoader } from '../../systems/loader/DataLoader';

export const chatCommand: ConsoleCommand = {
  name: 'chat',
  description: '管理聊天记录（查看、清空、模拟消息等）',
  usage: '/chat <history|clear|say|export> [args...]',
  examples: [
    '/chat history npc_john_driver',
    '/chat clear',
    '/chat say npc_zhang_lawyer "你好，我是测试消息"',
    '/chat export',
  ],

  execute(args: string[], context: CommandContext): CommandResult {
    if (args.length < 1) {
      return {
        success: false,
        message: '',
        error: '参数不足。用法: /chat <history|clear|say|export> [args...]',
      };
    }

    const subCommand = args[0].toLowerCase();
    const state = context.getState();
    const store = context.store;

    switch (subCommand) {
      case 'history':
      case 'log': {
        if (args.length < 2) {
          return {
            success: false,
            message: '',
            error: '请指定NPC ID。用法: /chat history <npcId>',
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

        const history = NPCSystem.getNPCChatHistory(state, npcId);
        
        if (history.length === 0) {
          return {
            success: true,
            message: `与 ${npcConfig.name} 的聊天记录为空`,
          };
        }

        const historyStr = history.map(msg => {
          const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN');
          const sender = msg.sender === 'player' ? '你' : npcConfig.name;
          return `[${time}] ${sender}: ${msg.content}`;
        }).join('\n');

        return {
          success: true,
          message: `与 ${npcConfig.name} 的聊天记录（共${history.length}条）:\n${historyStr}`,
        };
      }

      case 'clear': {
        const npcId = args[1];
        
        if (npcId) {
          const npcConfig = dataLoader.getNPC(npcId);
          if (!npcConfig) {
            return {
              success: false,
              message: '',
              error: `NPC不存在: ${npcId}`,
            };
          }
          
          store.clearChatHistory(npcId);
          
          return {
            success: true,
            message: `✓ 已清空与 ${npcConfig.name} 的聊天记录`,
          };
        } else {
          store.clearChatHistory();
          
          return {
            success: true,
            message: '✓ 已清空所有聊天记录',
          };
        }
      }

      case 'say': {
        if (args.length < 3) {
          return {
            success: false,
            message: '',
            error: '用法: /chat say <npcId> <message>',
          };
        }

        const npcId = args[1];
        const message = args.slice(2).join(' ');
        
        const npcConfig = dataLoader.getNPC(npcId);
        if (!npcConfig) {
          return {
            success: false,
            message: '',
            error: `NPC不存在: ${npcId}`,
          };
        }

        // 检查NPC是否已解锁
        if (!state.npcSystem.npcs[npcId]?.unlocked) {
          return {
            success: false,
            message: '',
            error: `NPC ${npcConfig.name} 未解锁，先使用 /npc unlock ${npcId}`,
          };
        }

        store.addChatMessage({
          npcId,
          sender: 'npc',
          content: message,
        });

        return {
          success: true,
          message: `✓ 已发送消息给NPC ${npcConfig.name}: "${message}"`,
        };
      }

      case 'export': {
        const npcId = args[1];
        
        if (npcId) {
          const npcConfig = dataLoader.getNPC(npcId);
          if (!npcConfig) {
            return {
              success: false,
              message: '',
              error: `NPC不存在: ${npcId}`,
            };
          }
          
          const history = NPCSystem.getNPCChatHistory(state, npcId);
          
          // 格式化为LLM友好的格式
          const exportData = {
            npc: {
              id: npcConfig.id,
              name: npcConfig.name,
            },
            messages: history.map(m => ({
              role: m.sender === 'player' ? 'user' : 'assistant',
              content: m.content,
            })),
          };
          
          return {
            success: true,
            message: `与 ${npcConfig.name} 的聊天记录（LLM格式）:\n\`\`\`json\n${JSON.stringify(exportData, null, 2)}\n\`\`\``, // Markdown code block
          };
        } else {
          // 导出所有聊天记录
          const allHistory = state.npcSystem.chatHistory;
          
          return {
            success: true,
            message: `所有聊天记录（共${allHistory.length}条）已准备导出`,
          };
        }
      }

      default:
        return {
          success: false,
          message: '',
          error: `未知子命令: ${subCommand}。可用: history, clear, say, export`,
        };
    }
  },

  getSuggestions(_args: string[], argIndex: number, context: CommandContext): string[] {
    if (argIndex === 0) {
      return ['history', 'clear', 'say', 'export'];
    }
    
    if (argIndex === 1) {
      // 对于需要npcId的命令，返回已解锁的NPC
      const state = context.getState();
      return dataLoader.getAllNPCs()
        .filter(n => state.npcSystem.npcs[n.id]?.unlocked)
        .map(n => n.id);
    }
    
    return [];
  },
};
