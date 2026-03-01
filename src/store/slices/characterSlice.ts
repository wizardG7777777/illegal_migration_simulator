/**
 * Character Slice
 * 
 * 角色状态切片
 * 包含角色属性、资源修改等Actions
 * 
 * 注意：这个文件用于组织代码结构，实际Store使用index.ts中的完整实现
 */

import type { GameState } from '../../types';

/**
 * Character Slice Actions 部分
 */
export interface CharacterSliceActions {
  /**
   * 使用消耗品
   */
  useConsumable: (itemId: string) => void;

  // ========== 开发工具 Actions ==========

  /**
   * 设置金钱（开发工具）
   */
  devSetMoney: (amount: number, currency?: 'CNY' | 'USD') => void;

  /**
   * 设置资源（开发工具）
   */
  devSetResource: (
    resource: 'health' | 'mental' | 'actionPoints',
    value: number
  ) => void;

  /**
   * 设置属性（开发工具）
   */
  devSetAttribute: (
    attr: keyof GameState['character']['attributes'],
    value: number
  ) => void;

  /**
   * 添加道具（开发工具）
   */
  devAddItem: (itemId: string, count?: number) => void;

  /**
   * 移除道具（开发工具）
   */
  devRemoveItem: (itemId: string, count?: number) => void;
}

/**
 * Character Slice 完整类型
 */
export type CharacterSlice = CharacterSliceActions;

// ============================================
// 默认导出（类型）
// ============================================

export default {};
