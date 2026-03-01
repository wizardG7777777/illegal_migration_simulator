/**
 * Game Slice
 * 
 * 游戏核心状态切片
 * 包含游戏元数据、回合流程、存档管理等
 * 
 * 注意：这个文件用于组织代码结构，实际Store使用index.ts中的完整实现
 * 可以通过拆分Store逻辑来优化性能，如果Store变得过大
 */

import type { GameState, SaveData } from '../../types';

/**
 * Game Slice 状态部分
 */
export interface GameSliceState {
  state: GameState;
}

/**
 * Game Slice Actions 部分
 */
export interface GameSliceActions {
  /**
   * 开始新游戏
   */
  startNewGame: (characterName: string) => void;

  /**
   * 结束当前回合
   */
  endTurn: () => void;

  /**
   * 确认随机事件
   */
  confirmRandomEvent: () => void;

  /**
   * 保存游戏
   * @returns 存档ID
   */
  saveGame: () => string;

  /**
   * 加载游戏
   */
  loadGame: (saveData: SaveData) => void;

  /**
   * 从localStorage加载存档
   */
  loadFromStorage: (saveId: string) => boolean;

  /**
   * 获取所有存档列表
   */
  getSaveList: () => string[];

  /**
   * 删除存档
   */
  deleteSave: (saveId: string) => void;
}

/**
 * Game Slice 完整类型
 */
export type GameSlice = GameSliceState & GameSliceActions;

// ============================================
// 默认导出（类型）
// ============================================

export default {};
