/**
 * /scene 命令 - 切换场景
 * 
 * 用法：
 * /scene act1
 * /scene act2
 * /scene act3
 */

import type { ConsoleCommand, CommandContext, CommandResult } from '../commandRegistry';
import { SceneSystem } from '../../systems/scene/SceneSystem';
import type { SceneId } from '../../types';

const VALID_SCENES: SceneId[] = ['act1', 'act2', 'act3'];

const SCENE_NAMES: Record<SceneId, string> = {
  act1: '国内准备',
  act2: '跨境穿越',
  act3: '美国生存',
};

export const sceneCommand: ConsoleCommand = {
  name: 'scene',
  description: '切换场景',
  usage: '/scene <act1|act2|act3>',
  examples: ['/scene act3', '/scene act2'],

  execute(args: string[], context: CommandContext): CommandResult {
    if (args.length < 1) {
      const state = context.getState();
      const currentScene = state.scene.currentScene;
      return {
        success: true,
        message: `当前场景: ${currentScene} (${SCENE_NAMES[currentScene]})`,
      };
    }

    const targetScene = args[0].toLowerCase() as SceneId;

    if (!VALID_SCENES.includes(targetScene)) {
      return {
        success: false,
        message: '',
        error: `无效场景: ${targetScene}。可用场景: act1, act2, act3`,
      };
    }

    const state = context.getState();
    const currentScene = state.scene.currentScene;

    // 检查是否已经是当前场景
    if (currentScene === targetScene) {
      return {
        success: true,
        message: `已在场景 ${targetScene} (${SCENE_NAMES[targetScene]})`,
      };
    }

    // 检查场景切换是否合法
    if (!SceneSystem.isValidTransition(currentScene, targetScene)) {
      return {
        success: false,
        message: '',
        error: `非法的场景切换: ${currentScene} → ${targetScene}。只允许单向流动: act1 → act2 → act3`,
      };
    }

    try {
      // 执行场景切换
      context.store.devTransitionScene(targetScene, 'console');

      return {
        success: true,
        message: `✓ 场景已切换到 ${targetScene} (${SCENE_NAMES[targetScene]})`,
      };
    } catch (error) {
      return {
        success: false,
        message: '',
        error: `场景切换失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  getSuggestions(_args: string[], argIndex: number, _context: CommandContext): string[] {
    if (argIndex === 0) {
      return VALID_SCENES;
    }
    return [];
  },
};
