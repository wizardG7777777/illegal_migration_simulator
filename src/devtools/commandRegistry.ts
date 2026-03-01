/**
 * 命令注册中心 (Command Registry)
 * 
 * 负责管理所有开发者控制台命令的注册和执行
 * 提供命令解析、参数处理和结果返回功能
 */

import type { GameState } from '../types';
import type { GameStore } from '../store';

/**
 * 命令执行上下文
 */
export interface CommandContext {
  /** 获取当前游戏状态 */
  getState: () => GameState;
  /** 设置游戏状态 */
  setState: (state: GameState) => void;
  /** 访问完整的 GameStore */
  store: GameStore;
}

/**
 * 命令执行结果
 */
export interface CommandResult {
  /** 是否执行成功 */
  success: boolean;
  /** 结果消息 */
  message: string;
  /** 错误信息（可选） */
  error?: string;
}

/**
 * 控制台命令接口
 */
export interface ConsoleCommand {
  /** 命令名称 */
  name: string;
  /** 命令描述 */
  description: string;
  /** 使用说明 */
  usage: string;
  /** 示例 */
  examples: string[];
  /** 执行命令 */
  execute: (args: string[], context: CommandContext) => CommandResult;
  /** 
   * 获取自动补全建议
   * @param args 当前已输入的参数
   * @param argIndex 当前正在编辑的参数索引
   * @returns 建议列表
   */
  getSuggestions?: (args: string[], argIndex: number, context: CommandContext) => string[];
}

/**
 * 命令注册中心类
 */
export class CommandRegistry {
  private commands: Map<string, ConsoleCommand> = new Map();
  private aliases: Map<string, string> = new Map();

  /**
   * 注册命令
   * @param command 命令对象
   */
  register(command: ConsoleCommand): void {
    this.commands.set(command.name.toLowerCase(), command);
  }

  /**
   * 注册命令别名
   * @param alias 别名
   * @param targetName 目标命令名称
   */
  registerAlias(alias: string, targetName: string): void {
    this.aliases.set(alias.toLowerCase(), targetName.toLowerCase());
  }

  /**
   * 执行命令
   * @param input 完整命令输入
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(input: string, context: CommandContext): CommandResult {
    // 去除首尾空格
    const trimmed = input.trim();
    if (!trimmed) {
      return { success: false, message: '', error: '' };
    }

    // 解析命令和参数
    const { commandName, args } = this.parseInput(trimmed);

    // 查找命令（包括别名）
    let targetCommand = this.commands.get(commandName);
    if (!targetCommand) {
      const aliasedName = this.aliases.get(commandName);
      if (aliasedName) {
        targetCommand = this.commands.get(aliasedName);
      }
    }

    if (!targetCommand) {
      return {
        success: false,
        message: '',
        error: `未知命令: ${commandName}。输入 /help 查看可用命令。`,
      };
    }

    // 执行命令
    try {
      return targetCommand.execute(args, context);
    } catch (error) {
      return {
        success: false,
        message: '',
        error: `命令执行错误: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 解析命令输入
   * @param input 输入字符串
   * @returns 解析结果
   */
  private parseInput(input: string): { commandName: string; args: string[] } {
    // 去除开头的 /
    const withoutSlash = input.startsWith('/') ? input.slice(1) : input;
    
    // 使用正则表达式解析参数（支持引号）
    const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
    const tokens: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(withoutSlash)) !== null) {
      // 匹配到的内容在 group 1（双引号）、2（单引号）或 3（无引号）中
      const token = match[1] ?? match[2] ?? match[3];
      if (token !== undefined) {
        tokens.push(token);
      }
    }

    if (tokens.length === 0) {
      return { commandName: '', args: [] };
    }

    return {
      commandName: tokens[0].toLowerCase(),
      args: tokens.slice(1),
    };
  }

  /**
   * 获取所有已注册命令
   * @returns 命令列表
   */
  getCommands(): ConsoleCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * 获取特定命令
   * @param name 命令名称
   * @returns 命令对象或 undefined
   */
  getCommand(name: string): ConsoleCommand | undefined {
    return this.commands.get(name.toLowerCase());
  }

  /**
   * 获取命令建议（用于Tab补全）
   * @param partial 部分输入
   * @returns 匹配的建议列表
   */
  getCommandSuggestions(partial: string): string[] {
    const lowerPartial = partial.toLowerCase();
    const suggestions: string[] = [];

    // 添加匹配的命令名
    for (const name of this.commands.keys()) {
      if (name.startsWith(lowerPartial)) {
        suggestions.push(name);
      }
    }

    // 添加匹配的别名（格式：alias (target)）
    for (const [alias, target] of this.aliases.entries()) {
      if (alias.startsWith(lowerPartial)) {
        // 如果别名本身没有以输入开头，或者别名和命令名相同，则跳过
        if (alias === target) continue;
        
        // 格式为 "alias (target)"，让用户知道这是别名
        const displayName = `${alias} (${target})`;
        if (!suggestions.includes(displayName)) {
          suggestions.push(displayName);
        }
      }
    }

    return suggestions.sort();
  }

  /**
   * 获取特定命令的参数建议
   * @param input 当前输入
   * @param context 执行上下文
   * @returns 建议列表
   */
  getArgumentSuggestions(input: string, context: CommandContext): string[] {
    const trimmed = input.trim();
    if (!trimmed || trimmed === '/') {
      return this.getCommandSuggestions('');
    }

    // 解析当前输入
    const withoutSlash = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
    const parts = withoutSlash.split(/\s+/);
    const commandName = parts[0].toLowerCase();

    // 查找命令
    let command = this.commands.get(commandName);
    if (!command) {
      const aliasedName = this.aliases.get(commandName);
      if (aliasedName) {
        command = this.commands.get(aliasedName);
      }
    }

    if (!command || !command.getSuggestions) {
      // 如果没有找到命令，提供命令补全
      if (parts.length === 1) {
        return this.getCommandSuggestions(commandName).map(c => `/${c}`);
      }
      return [];
    }

    // 获取参数建议
    const args = parts.slice(1);
    const argIndex = args.length - 1;
    const suggestions = command.getSuggestions(args, argIndex, context);

    return suggestions;
  }
}

// 单例导出
export const commandRegistry = new CommandRegistry();
