/**
 * 工具命令 - help 和 clear
 * 
 * /help [command]    # 显示帮助
 * /clear             # 清屏
 */

import type { ConsoleCommand, CommandContext, CommandResult } from '../commandRegistry';
import { commandRegistry } from '../commandRegistry';

export const helpCommand: ConsoleCommand = {
  name: 'help',
  description: '显示帮助信息',
  usage: '/help [command]',
  examples: ['/help', '/help set'],

  execute(args: string[], _context: CommandContext): CommandResult {
    // 显示特定命令的帮助
    if (args.length > 0) {
      const commandName = args[0].toLowerCase();
      const command = commandRegistry.getCommand(commandName);

      if (!command) {
        return {
          success: false,
          message: '',
          error: `未知命令: ${commandName}。输入 /help 查看可用命令。`,
        };
      }

      const lines: string[] = [];
      lines.push('╔══════════════════════════════════════════╗');
      lines.push(`║  ${command.name.padEnd(38)} ║`);
      lines.push('╠══════════════════════════════════════════╣');
      lines.push(`║ 描述: ${command.description.padEnd(31)} ║`);
      lines.push(`║ 用法: ${command.usage.padEnd(31)} ║`);
      
      if (command.examples.length > 0) {
        lines.push('║ 示例:                                    ║');
        for (const example of command.examples) {
          const ex = example.length > 36 ? example.slice(0, 33) + '...' : example;
          lines.push(`║   ${ex.padEnd(38)} ║`);
        }
      }
      
      lines.push('╚══════════════════════════════════════════╝');

      return {
        success: true,
        message: lines.join('\n'),
      };
    }

    // 显示所有命令的帮助
    const commands = commandRegistry.getCommands();
    const lines: string[] = [];
    
    lines.push('╔══════════════════════════════════════════╗');
    lines.push('║           开发者控制台命令               ║');
    lines.push('╠══════════════════════════════════════════╣');
    lines.push('║ 命令              描述                   ║');
    lines.push('╠══════════════════════════════════════════╣');

    for (const cmd of commands.sort((a, b) => a.name.localeCompare(b.name))) {
      const name = cmd.name.padEnd(17);
      const desc = cmd.description.slice(0, 20).padEnd(20);
      lines.push(`║ ${name}${desc} ║`);
    }

    lines.push('╠══════════════════════════════════════════╣');
    lines.push('║ 快捷键:                                  ║');
    lines.push('║   ↑ / ↓     历史命令切换                 ║');
    lines.push('║   Tab       自动补全                     ║');
    lines.push('║   Ctrl+L    清屏                         ║');
    lines.push('║   Enter     执行命令                     ║');
    lines.push('╠══════════════════════════════════════════╣');
    lines.push('║ 提示: 输入 /help <command> 查看详细帮助  ║');
    lines.push('╚══════════════════════════════════════════╝');

    return {
      success: true,
      message: lines.join('\n'),
    };
  },

  getSuggestions(_args: string[], argIndex: number, _context: CommandContext): string[] {
    if (argIndex === 0) {
      return commandRegistry.getCommands().map(c => c.name);
    }
    return [];
  },
};

export const clearCommand: ConsoleCommand = {
  name: 'clear',
  description: '清屏',
  usage: '/clear',
  examples: ['/clear', 'Ctrl+L'],

  execute(_args: string[], _context: CommandContext): CommandResult {
    // clear 命令本身不需要做什么，Console 组件会处理
    return {
      success: true,
      message: '__CLEAR__',
    };
  },
};
