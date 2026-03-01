/**
 * Scene Slice
 * 
 * 场景状态切片
 * 包含场景切换、Debuff管理、事件执行等
 * 
 * 注意：这个文件用于组织代码结构，实际Store使用index.ts中的完整实现
 */

import type { GameState, SceneId } from '../../types';

/**
 * Scene Slice Actions 部分
 */
export interface SceneSliceActions {
  /**
   * 执行事件
   */
  executeEvent: (
    eventId: string,
    choiceId: string,
    slotSelections?: Record<string, string>
  ) => void;

  // ========== 开发工具 Actions ==========

  /**
   * 切换场景（开发工具）
   */
  devTransitionScene: (targetScene: SceneId, method?: string) => void;

  /**
   * 触发特定事件（开发工具）
   */
  devTriggerEvent: (eventId: string, choiceId?: string) => void;

  /**
   * 添加Debuff（开发工具）
   */
  devAddDebuff: (debuff: GameState['scene']['activeDebuffs'][number]) => void;

  /**
   * 清除所有Debuff（开发工具）
   */
  devClearDebuffs: () => void;

  /**
   * 设置游戏结束状态（开发工具）
   */
  devSetGameOver: (isGameOver: boolean, endingId?: string) => void;
}

/**
 * Scene Slice 完整类型
 */
export type SceneSlice = SceneSliceActions;

// ============================================
// 默认导出（类型）
// ============================================

export default {};
