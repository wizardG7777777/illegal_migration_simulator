/**
 * /status 命令 - 查看当前状态
 * 
 * 用法：
 * /status
 * /status --full
 */

import type { ConsoleCommand, CommandContext, CommandResult } from '../commandRegistry';

export const statusCommand: ConsoleCommand = {
  name: 'status',
  description: '查看当前状态',
  usage: '/status [--full]',
  examples: ['/status', '/status --full'],

  execute(args: string[], context: CommandContext): CommandResult {
    const isFull = args.includes('--full') || args.includes('-f');
    const state = context.getState();
    const character = state.character;
    const scene = state.scene;

    // 基础信息
    const lines: string[] = [];
    lines.push('╔══════════════════════════════════════╗');
    lines.push('║          当前游戏状态                ║');
    lines.push('╠══════════════════════════════════════╣');

    // 场景信息
    const sceneNames: Record<string, string> = {
      act1: '国内准备',
      act2: '跨境穿越',
      act3: '美国生存',
    };
    lines.push(`║ 场景: ${scene.currentScene.padEnd(8)} (${sceneNames[scene.currentScene]})  ║`);
    lines.push(`║ 回合: ${String(scene.turnCount).padEnd(5)} (场景内: ${scene.sceneTurn})      ║`);

    // 资源信息
    lines.push('╠══════════════════════════════════════╣');
    lines.push('║ 资源状态:                            ║');
    const hp = character.resources.health.current;
    const hpMax = character.resources.health.max;
    const mp = character.resources.mental.current;
    const mpMax = character.resources.mental.max;
    const ap = character.resources.actionPoints.current;
    const apMax = character.resources.actionPoints.max;
    
    lines.push(`║  健康: ${String(hp).padStart(3)}/${hpMax}  心理: ${String(mp).padStart(3)}/${mpMax}        ║`);
    lines.push(`║  行动点: ${String(ap).padStart(1)}/${apMax}                          ║`);

    // 金钱
    const cny = character.resources.money.cny;
    const usd = character.resources.money.usd;
    lines.push(`║  人民币: ¥${String(cny).padEnd(6)} 美元: $${String(usd).padEnd(6)} ║`);

    // 属性信息
    lines.push('╠══════════════════════════════════════╣');
    lines.push('║ 角色属性:                            ║');
    const attrs = character.attributes;
    lines.push(`║  体魄:${String(attrs.physique).padStart(3)}  智力:${String(attrs.intelligence).padStart(3)}  英语:${String(attrs.english).padStart(3)}        ║`);
    lines.push(`║  社交:${String(attrs.social).padStart(3)}  风险:${String(attrs.riskAwareness).padStart(3)}  生存:${String(attrs.survival).padStart(3)}        ║`);

    // 终结态信息
    if (character.status.terminalState) {
      lines.push('╠══════════════════════════════════════╣');
      const terminalNames: Record<string, string> = {
        DYING: '濒死',
        BREAKDOWN: '崩溃',
        DESTITUTE: '匮乏',
      };
      const terminalName = terminalNames[character.status.terminalState] || character.status.terminalState;
      const countdown = character.status.terminalCountdown;
      lines.push(`║ ⚠️ 终结态: ${terminalName.padEnd(8)} 倒计时: ${countdown}       ║`);
    }

    // 详细信息
    if (isFull) {
      // 物品信息
      lines.push('╠══════════════════════════════════════╣');
      lines.push('║ 背包物品:                            ║');
      
      // 消耗品
      if (state.inventory.consumables.length > 0) {
        lines.push('║  [消耗品]                            ║');
        for (const item of state.inventory.consumables) {
          const itemName = item.itemId.length > 15 ? item.itemId.slice(0, 12) + '...' : item.itemId;
          lines.push(`║    ${itemName.padEnd(18)} x${String(item.count).padEnd(3)} ║`);
        }
      } else {
        lines.push('║  [消耗品] 无                         ║');
      }

      // 常驻道具
      if (state.inventory.permanents.length > 0) {
        lines.push('║  [常驻道具]                          ║');
        for (const item of state.inventory.permanents) {
          const itemName = item.itemId.length > 18 ? item.itemId.slice(0, 15) + '...' : item.itemId;
          lines.push(`║    [${String(item.slot).padStart(2)}] ${itemName.padEnd(18)} ║`);
        }
      } else {
        lines.push('║  [常驻道具] 无                       ║');
      }

      // Debuff
      if (scene.activeDebuffs.length > 0) {
        lines.push('╠══════════════════════════════════════╣');
        lines.push('║ 环境Debuff:                          ║');
        for (const debuff of scene.activeDebuffs) {
          const debuffName = debuff.name.length > 12 ? debuff.name.slice(0, 9) + '...' : debuff.name;
          const durationStr = debuff.duration === -1 ? '永久' : `${debuff.duration}回合`;
          lines.push(`║  ${debuffName.padEnd(12)} 强度${debuff.intensity}  ${durationStr.padEnd(6)} ║`);
        }
      }

      // 状态标记
      const flags = Object.entries(character.status.flags);
      if (flags.length > 0) {
        lines.push('╠══════════════════════════════════════╣');
        lines.push('║ 状态标记:                            ║');
        for (const [key, value] of flags.slice(0, 5)) {
          const flagStr = `${key}: ${JSON.stringify(value)}`;
          const displayStr = flagStr.length > 28 ? flagStr.slice(0, 25) + '...' : flagStr;
          lines.push(`║  ${displayStr.padEnd(32)} ║`);
        }
        if (flags.length > 5) {
          lines.push(`║  ... 还有 ${flags.length - 5} 个标记              ║`);
        }
      }

      // 活跃链式事件
      if (state.event.activeChains.length > 0) {
        lines.push('╠══════════════════════════════════════╣');
        lines.push('║ 活跃链式事件:                        ║');
        for (const chain of state.event.activeChains) {
          const remainingTurns = chain.unlockTurn - scene.turnCount;
          const chainId = chain.chainId.length > 12 ? chain.chainId.slice(0, 9) + '...' : chain.chainId;
          lines.push(`║  ${chainId.padEnd(12)} 步:${chain.currentStep} ${remainingTurns}回合后解锁 ║`);
        }
      }
    }

    lines.push('╚══════════════════════════════════════╝');

    return {
      success: true,
      message: lines.join('\n'),
    };
  },

  getSuggestions(_args: string[], argIndex: number, _context: CommandContext): string[] {
    if (argIndex === 0) {
      return ['--full', '-f'];
    }
    return [];
  },
};
