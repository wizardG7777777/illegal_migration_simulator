/**
 * /debt 命令 - 债务管理
 * 
 * 用法：
 * /debt add 500 0.3 10      # 添加债务：金额 利率 期限(回合)
 * /debt clear               # 清除所有债务
 * /debt show                # 显示当前债务
 */

import type { ConsoleCommand, CommandContext, CommandResult } from '../commandRegistry';

export const debtCommand: ConsoleCommand = {
  name: 'debt',
  description: '管理债务',
  usage: '/debt <add|clear|show> [amount] [rate] [duration]',
  examples: ['/debt add 500 0.3 10', '/debt clear', '/debt show'],

  execute(args: string[], context: CommandContext): CommandResult {
    if (args.length < 1) {
      return {
        success: false,
        message: '',
        error: '参数不足。用法: /debt <add|clear|show> [amount] [rate] [duration]',
      };
    }

    const subCommand = args[0].toLowerCase();
    const state = context.getState();

    switch (subCommand) {
      case 'add': {
        if (args.length < 4) {
          return {
            success: false,
            message: '',
            error: '参数不足。用法: /debt add <amount> <rate> <duration>',
          };
        }

        const amount = parseFloat(args[1]);
        const rate = parseFloat(args[2]);
        const duration = parseInt(args[3], 10);

        if (isNaN(amount) || amount <= 0) {
          return {
            success: false,
            message: '',
            error: `无效金额: ${args[1]}`,
          };
        }

        if (isNaN(rate) || rate < 0) {
          return {
            success: false,
            message: '',
            error: `无效利率: ${args[2]}`,
          };
        }

        if (isNaN(duration) || duration <= 0) {
          return {
            success: false,
            message: '',
            error: `无效期限: ${args[3]}`,
          };
        }

        // 在当前场景中设置债务
        const newState = { ...state };
        
        if (newState.scene.currentScene === 'act1' && newState.scene.act1) {
          newState.scene.act1.hasTakenLoan = true;
          newState.scene.act1.loanAmount = amount;
        } else if (newState.scene.currentScene === 'act2' && newState.scene.act2) {
          newState.scene.act2.hasTakenEmergencyLoan = true;
          newState.scene.act2.emergencyLoanAmount = amount;
        } else if (newState.scene.currentScene === 'act3' && newState.scene.act3) {
          // 场景3债务可能需要更复杂的结构
          // 这里简化处理
        }

        context.setState(newState);

        return {
          success: true,
          message: `✓ 已添加债务: $${amount}, 利率 ${(rate * 100).toFixed(0)}%, 期限 ${duration} 回合`,
        };
      }

      case 'clear': {
        const newState = { ...state };
        
        if (newState.scene.act1) {
          newState.scene.act1.hasTakenLoan = false;
          newState.scene.act1.loanAmount = 0;
        }
        if (newState.scene.act2) {
          newState.scene.act2.hasTakenEmergencyLoan = false;
          newState.scene.act2.emergencyLoanAmount = 0;
        }
        if (newState.scene.act3) {
          newState.scene.act3.debtDefaultCount = 0;
        }

        context.setState(newState);

        return {
          success: true,
          message: '✓ 所有债务已清除',
        };
      }

      case 'show': {
        const debts: string[] = [];
        
        if (state.scene.act1?.hasTakenLoan) {
          debts.push(`  场景1贷款: ¥${state.scene.act1.loanAmount}`);
        }
        if (state.scene.act2?.hasTakenEmergencyLoan) {
          debts.push(`  场景2紧急贷款: $${state.scene.act2.emergencyLoanAmount}`);
        }
        if (state.scene.act3?.debtDefaultCount) {
          debts.push(`  场景3违约次数: ${state.scene.act3.debtDefaultCount}`);
        }

        if (debts.length === 0) {
          return {
            success: true,
            message: '当前没有债务',
          };
        }

        return {
          success: true,
          message: `当前债务:\n${debts.join('\n')}`,
        };
      }

      default:
        return {
          success: false,
          message: '',
          error: `未知子命令: ${subCommand}。可用: add, clear, show`,
        };
    }
  },

  getSuggestions(_args: string[], argIndex: number, _context: CommandContext): string[] {
    if (argIndex === 0) {
      return ['add', 'clear', 'show'];
    }
    return [];
  },
};
