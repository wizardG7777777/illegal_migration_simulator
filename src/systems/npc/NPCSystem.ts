/**
 * NPCSystem.ts
 *
 * NPC系统 - 负责管理游戏中的所有NPC相关操作
 *
 * 功能包括：
 * 1. NPC解锁管理
 * 2. NPC与事件关联
 * 3. 聊天记录管理
 * 4. NPC状态查询
 *
 * 所有方法均为纯函数，返回新的 GameState 或查询结果
 */

import type { GameState, GameEvent, NPCConfig, ChatMessage, NPCState } from '@/types';
import { dataLoader } from '../loader/DataLoader';
import { deepClone } from '@/utils/pure';

/**
 * NPC系统
 * 提供所有NPC相关的操作方法
 */
export const NPCSystem = {
  // ========== NPC解锁管理 ==========

  /**
   * 获取所有已解锁的NPC ID列表
   * @param state - 当前游戏状态
   * @returns 已解锁的NPC ID数组
   */
  getUnlockedNPCs(state: GameState): string[] {
    const npcSystem = state.npcSystem;
    return Object.entries(npcSystem.npcs)
      .filter(([, npcState]) => npcState.unlocked)
      .map(([npcId]) => npcId);
  },

  /**
   * 检查NPC是否已解锁
   * @param state - 当前游戏状态
   * @param npcId - NPC ID
   * @returns 是否已解锁
   */
  isNPCUnlocked(state: GameState, npcId: string): boolean {
    return state.npcSystem.npcs[npcId]?.unlocked ?? false;
  },

  /**
   * 解锁NPC
   * @param state - 当前游戏状态
   * @param npcId - 要解锁的NPC ID
   * @returns 新的游戏状态
   */
  unlockNPC(state: GameState, npcId: string): GameState {
    const newState = deepClone(state);
    const npcConfig = dataLoader.getNPC(npcId);
    
    if (!newState.npcSystem.npcs[npcId]) {
      newState.npcSystem.npcs[npcId] = {
        unlocked: true,
        lastInteractionTurn: state.scene.turnCount,
      };
    } else {
      newState.npcSystem.npcs[npcId].unlocked = true;
      newState.npcSystem.npcs[npcId].lastInteractionTurn = state.scene.turnCount;
    }

    // 添加系统消息：已添加联系人
    if (npcConfig) {
      newState.npcSystem.chatHistory.push({
        id: `system_unlock_${npcId}_${Date.now()}`,
        npcId: npcId,
        sender: 'npc',
        content: `你已添加 ${npcConfig.name} 为联系人`,
        timestamp: Date.now(),
      });
    }

    return newState;
  },

  /**
   * 检查并自动解锁符合条件的NPC
   * 根据当前场景、回合数等条件检查所有未解锁的NPC
   * @param state - 当前游戏状态
   * @returns 新的游戏状态（可能包含新解锁的NPC）
   */
  checkAndUnlockNPCs(state: GameState): GameState {
    let newState = deepClone(state);
    const currentScene = state.scene.currentScene;
    const sceneTurn = state.scene.sceneTurn;
    const flags = state.character.status.flags;

    // 获取所有NPC配置
    const allNPCs = dataLoader.getAllNPCs();

    for (const npc of allNPCs) {
      // 已解锁的跳过
      if (this.isNPCUnlocked(state, npc.id)) continue;

      // 检查解锁条件
      const condition = npc.unlockCondition;
      if (!condition) {
        // 没有解锁条件的默认不解锁（需要特定事件触发）
        continue;
      }

      let shouldUnlock = true;

      // 检查场景条件
      if (condition.scene && condition.scene !== currentScene) {
        shouldUnlock = false;
      }

      // 检查最小场景回合数
      if (condition.minSceneTurn !== undefined && sceneTurn < condition.minSceneTurn) {
        shouldUnlock = false;
      }

      // 检查flag条件
      if (condition.flag && !flags[condition.flag]) {
        shouldUnlock = false;
      }

      if (shouldUnlock) {
        newState = this.unlockNPC(newState, npc.id);
      }
    }

    return newState;
  },

  // ========== NPC事件关联 ==========

  /**
   * 获取与特定NPC关联的所有事件
   * 根据事件ID、名称、标签与NPC标签的匹配来确定关联
   * @param state - 当前游戏状态
   * @param npcId - NPC ID
   * @param availableEvents - 当前可用的事件列表（可选，不传则自动获取）
   * @returns 关联的事件数组
   */
  getNPCEvents(
    state: GameState,
    npcId: string,
    availableEvents?: GameEvent[]
  ): GameEvent[] {
    const npc = dataLoader.getNPC(npcId);
    if (!npc) return [];

    // 如果没有提供事件列表，获取当前所有可用事件
    const eventsToFilter = availableEvents || this._getCurrentAvailableEvents(state);

    // 根据NPC标签匹配事件
    return eventsToFilter.filter(event => this.isEventRelatedToNPC(event, npc));
  },

  /**
   * 检查事件是否与NPC相关
   * 通过匹配事件ID、名称、标签与NPC标签
   * @param event - 事件
   * @param npc - NPC配置
   * @returns 是否相关
   */
  isEventRelatedToNPC(event: GameEvent, npc: NPCConfig): boolean {
    const eventId = event.id.toLowerCase();
    const eventName = event.name.toLowerCase();
    const eventTags = event.tags?.map(t => t.toLowerCase()) || [];
    const npcTags = npc.tags.map(t => t.toLowerCase());

    // 检查事件ID是否包含NPC标签
    for (const tag of npcTags) {
      if (eventId.includes(tag)) return true;
    }

    // 检查事件名称是否包含NPC标签
    for (const tag of npcTags) {
      if (eventName.includes(tag)) return true;
    }

    // 检查事件标签是否与NPC标签匹配
    for (const tag of npcTags) {
      if (eventTags.includes(tag)) return true;
    }

    // 检查特殊命名模式
    // 例如：npc_john_driver 匹配 john 或 driver
    const npcIdParts = npc.id.toLowerCase().split('_');
    for (const part of npcIdParts) {
      if (part.startsWith('npc')) continue; // 跳过 'npc' 前缀
      if (eventId.includes(part)) return true;
      if (eventName.includes(part)) return true;
    }

    return false;
  },

  /**
   * 获取当前所有可用事件（内部辅助方法）
   * @param state - 当前游戏状态
   * @returns 可用事件数组
   * @internal
   */
  _getCurrentAvailableEvents(_state: GameState): GameEvent[] {
    // 这里需要导入 EventSystem，但为了解耦，直接返回空数组
    // 实际使用时应该通过参数传入 availableEvents
    return [];
  },

  // ========== 聊天记录管理 ==========

  /**
   * 获取特定NPC的聊天记录
   * @param state - 当前游戏状态
   * @param npcId - NPC ID
   * @returns 该NPC的聊天记录数组（按时间排序）
   */
  getNPCChatHistory(state: GameState, npcId: string): ChatMessage[] {
    return state.npcSystem.chatHistory.filter(msg => msg.npcId === npcId);
  },

  /**
   * 添加聊天消息
   * @param state - 当前游戏状态
   * @param npcId - NPC ID
   * @param sender - 发送者 ('player' 或 'npc')
   * @param content - 消息内容
   * @param options - 可选参数（eventId, choiceId）
   * @returns 新的游戏状态
   */
  addChatMessage(
    state: GameState,
    npcId: string,
    sender: 'player' | 'npc',
    content: string,
    options?: { eventId?: string; choiceId?: string }
  ): GameState {
    const newState = deepClone(state);
    
    const message: ChatMessage = {
      id: `msg_${npcId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      npcId,
      sender,
      content,
      timestamp: Date.now(),
      eventId: options?.eventId,
      choiceId: options?.choiceId,
    };

    newState.npcSystem.chatHistory.push(message);

    // 更新最后交互回合
    if (newState.npcSystem.npcs[npcId]) {
      newState.npcSystem.npcs[npcId].lastInteractionTurn = state.scene.turnCount;
    }

    return newState;
  },

  /**
   * 获取NPC最后一条消息
   * @param state - 当前游戏状态
   * @param npcId - NPC ID
   * @returns 最后一条消息或 undefined
   */
  getLastMessage(state: GameState, npcId: string): ChatMessage | undefined {
    const history = this.getNPCChatHistory(state, npcId);
    return history[history.length - 1];
  },

  // ========== NPC状态查询 ==========

  /**
   * 获取NPC状态
   * @param state - 当前游戏状态
   * @param npcId - NPC ID
   * @returns NPC状态或 undefined
   */
  getNPCState(state: GameState, npcId: string): NPCState | undefined {
    return state.npcSystem.npcs[npcId];
  },

  /**
   * 获取NPC最后交互回合
   * @param state - 当前游戏状态
   * @param npcId - NPC ID
   * @returns 最后交互回合数，如果没有则返回 -1
   */
  getLastInteractionTurn(state: GameState, npcId: string): number {
    return state.npcSystem.npcs[npcId]?.lastInteractionTurn ?? -1;
  },

  /**
   * 初始化NPC系统状态
   * 用于创建新游戏时初始化
   * @returns 初始化的NPC系统状态
   */
  initializeNPCSystemState() {
    return {
      npcs: {},
      chatHistory: [],
    };
  },
};

export default NPCSystem;
