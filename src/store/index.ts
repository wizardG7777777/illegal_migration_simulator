/**
 * Zustand Store - 游戏状态管理层
 * 
 * 职责：
 * 1. 集中管理游戏状态（单一Store）
 * 2. 提供游戏流程Actions（开始游戏、结束回合、执行事件等）
 * 3. 开发工具Actions（仅在DEV模式可用）
 * 4. 持久化支持（保存/加载游戏）
 * 
 * 架构原则：
 * - Store只负责状态管理，业务逻辑委托给System层
 * - 所有状态变更都通过System层纯函数完成
 * - 使用devtools中间件集成Redux DevTools
 */

/// <reference types="vite/client" />
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  GameState,
  SceneId,
  SaveData,
} from '../types';
import { deepClone } from '../utils/pure';
import { generateSaveId } from '../utils/id';
import { CharacterSystem } from '../systems/character/CharacterSystem';
import { EventSystem } from '../systems/event/EventSystem';
import { SceneSystem } from '../systems/scene/SceneSystem';
import { ItemSystem } from '../systems/item/ItemSystem';

// ============================================
// 初始状态创建
// ============================================

/**
 * 创建初始游戏状态
 * 用于新游戏开始时的状态初始化
 */
function createInitialState(): GameState {
  const character = CharacterSystem.createNewCharacter('Player');

  return {
    meta: {
      version: '1.0.0',
      createdAt: Date.now(),
      lastSavedAt: Date.now(),
      totalPlayTime: 0,
      isGameOver: false,
    },
    character,
    scene: {
      currentScene: 'act1',
      turnCount: 0,
      sceneTurn: 0,
      act1: {
        hasInsightTriggered: false,
        hasTakenLoan: false,
        loanAmount: 0,
      },
      act2: null,
      act3: null,
      activeDebuffs: [],
    },
    inventory: {
      consumables: [],
      permanents: [],
      booksRead: [],
    },
    event: {
      triggeredEvents: {},
      lastTriggeredTurn: {},
      completedEvents: {},
      activeChains: [],
    },
    global: {
      bookPool: [],
      statistics: {
        totalTurns: 0,
        totalEventsTriggered: 0,
        totalWorkSessions: 0,
        deathCount: 0,
        completionCount: 0,
        unlockedEndings: [],
      },
    },
  };
}

// ============================================
// Store 类型定义
// ============================================

/**
 * GameStore 接口
 * 定义所有状态和Actions
 */
export interface GameStore {
  // ========== 状态 ==========
  state: GameState;

  // ========== 游戏流程 Actions ==========
  
  /**
   * 开始新游戏
   * @param characterName - 角色名称
   */
  startNewGame: (characterName: string) => void;

  /**
   * 结束当前回合
   * 执行完整的回合流程：恢复行动点、抽取随机事件、应用Debuff等
   */
  endTurn: () => void;

  /**
   * 执行事件
   * @param eventId - 事件ID
   * @param choiceId - 选择的选项ID
   * @param slotSelections - 槽位选择（槽位ID -> 道具ID）
   */
  executeEvent: (
    eventId: string,
    choiceId: string,
    slotSelections?: Record<string, string>
  ) => void;

  /**
   * 确认随机事件
   * 玩家确认随机事件后，清除pending标记并继续回合
   */
  confirmRandomEvent: () => void;

  /**
   * 使用消耗品
   * @param itemId - 消耗品ID
   */
  useConsumable: (itemId: string) => void;

  // ========== 开发工具 Actions（仅在 DEV 模式） ==========

  /**
   * 设置金钱（开发工具）
   * @param amount - 金额
   * @param currency - 货币类型
   */
  devSetMoney: (amount: number, currency?: 'CNY' | 'USD') => void;

  /**
   * 设置资源（开发工具）
   * @param resource - 资源类型
   * @param value - 值
   */
  devSetResource: (
    resource: 'health' | 'mental' | 'actionPoints',
    value: number
  ) => void;

  /**
   * 设置属性（开发工具）
   * @param attr - 属性名
   * @param value - 值
   */
  devSetAttribute: (
    attr: 'physique' | 'intelligence' | 'english' | 'social' | 'riskAwareness' | 'survival',
    value: number
  ) => void;

  /**
   * 切换场景（开发工具）
   * @param targetScene - 目标场景
   * @param method - 切换方式
   */
  devTransitionScene: (targetScene: SceneId, method?: string) => void;

  /**
   * 触发特定事件（开发工具）
   * @param eventId - 事件ID
   * @param choiceId - 选项ID（可选，默认第一个可用选项）
   */
  devTriggerEvent: (eventId: string, choiceId?: string) => void;

  /**
   * 添加道具（开发工具）
   * @param itemId - 道具ID
   * @param count - 数量
   */
  devAddItem: (itemId: string, count?: number) => void;

  /**
   * 移除道具（开发工具）
   * @param itemId - 道具ID
   * @param count - 数量
   */
  devRemoveItem: (itemId: string, count?: number) => void;

  /**
   * 添加Debuff（开发工具）
   * @param debuff - Debuff配置
   */
  devAddDebuff: (debuff: GameState['scene']['activeDebuffs'][number]) => void;

  /**
   * 清除所有Debuff（开发工具）
   */
  devClearDebuffs: () => void;

  /**
   * 设置游戏结束状态（开发工具）
   * @param isGameOver - 是否结束
   * @param endingId - 结局ID
   */
  devSetGameOver: (isGameOver: boolean, endingId?: string) => void;

  // ========== 持久化 ==========

  /**
   * 保存游戏
   * @returns 存档ID
   */
  saveGame: () => string;

  /**
   * 加载游戏
   * @param saveData - 存档数据
   */
  loadGame: (saveData: SaveData) => void;

  /**
   * 从localStorage加载存档
   * @param saveId - 存档ID
   * @returns 是否成功加载
   */
  loadFromStorage: (saveId: string) => boolean;

  /**
   * 获取所有存档列表
   * @returns 存档ID列表
   */
  getSaveList: () => string[];

  /**
   * 删除存档
   * @param saveId - 存档ID
   */
  deleteSave: (saveId: string) => void;
}

// ============================================
// Store 实现
// ============================================

/**
 * 创建GameStore
 */
// 创建 Zustand store（React 标准方式）
export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => ({
    // 初始状态
    state: createInitialState(),

    // ========== 游戏流程 Actions ==========

    startNewGame: (characterName: string) => {
      const newState = createInitialState();
      newState.character.name = characterName;
      
      set({ state: newState });
    },

    endTurn: () => {
      const { state } = get();
      let newState = deepClone(state);

      // 1. 回合数增加
      newState.scene.turnCount++;
      newState.scene.sceneTurn++;
      newState.global.statistics.totalTurns++;

      // 2. 恢复行动点
      newState = CharacterSystem.recoverActionPoints(newState);

      // 3. 应用Debuff效果（回合开始）
      newState = SceneSystem.applyDebuffEffects(newState);

      // 4. 抽取随机事件
      const randomEvent = EventSystem.drawRandomEvent(newState);
      if (randomEvent) {
        newState.scene.pendingRandomEvent = randomEvent.id;
        newState = EventSystem.markEventTriggered(newState, randomEvent.id);
      }

      // 5. 处理链式事件解锁
      newState = EventSystem.processPendingChains(newState);

      // 6. 场景3月度结算（每30回合）
      if (newState.scene.currentScene === 'act3' && newState.scene.turnCount % 30 === 0) {
        newState = SceneSystem.applyLivingExpenses(newState);
      }

      // 7. 更新Debuff（持续时间-1）
      newState = SceneSystem.updateDebuffs(newState);

      // 8. 检查终结态
      newState = CharacterSystem.checkTerminalState(newState);

      // 9. 递减终结态倒计时
      newState = CharacterSystem.decrementTerminalCountdown(newState);

      // 10. 检查游戏结束
      if (CharacterSystem.isGameOver(newState)) {
        newState.meta.isGameOver = true;
      }

      // 11. 更新时间戳
      newState.meta.lastSavedAt = Date.now();

      set({ state: newState });
    },

    executeEvent: (
      eventId: string,
      choiceId: string,
      slotSelections?: Record<string, string>
    ) => {
      const { state } = get();
      
      try {
        const newState = EventSystem.executeEvent(
          state,
          eventId,
          choiceId,
          slotSelections
        );
        
        set({ state: newState });
      } catch (error) {
        console.error('执行事件失败:', error);
        // 可以选择在这里触发错误通知
      }
    },

    confirmRandomEvent: () => {
      const { state } = get();
      
      if (state.scene.pendingRandomEvent) {
        const newState = deepClone(state);
        delete newState.scene.pendingRandomEvent;
        
        set({ state: newState });
      }
    },

    useConsumable: (itemId: string) => {
      const { state } = get();
      
      try {
        const newState = ItemSystem.useConsumable(state, itemId);
        set({ state: newState });
      } catch (error) {
        console.error('使用消耗品失败:', error);
      }
    },

    // ========== 开发工具 Actions ==========

    devSetMoney: (amount: number, currency: 'CNY' | 'USD' = 'USD') => {
      if (import.meta.env.PROD) return;
      
      const { state } = get();
      const currentAmount =
        currency === 'CNY'
          ? state.character.resources.money.cny
          : state.character.resources.money.usd;
      const delta = amount - currentAmount;
      
      const newState = CharacterSystem.modifyMoney(state, currency, delta);
      
      set({ state: newState });
    },

    devSetResource: (
      resource: 'health' | 'mental' | 'actionPoints',
      value: number
    ) => {
      if (import.meta.env.PROD) return;
      
      const { state } = get();
      const currentValue =
        resource === 'health'
          ? state.character.resources.health.current
          : resource === 'mental'
          ? state.character.resources.mental.current
          : state.character.resources.actionPoints.current;
      const delta = value - currentValue;
      
      const newState = CharacterSystem.modifyResource(state, resource, delta);
      
      set({ state: newState });
    },

    devSetAttribute: (
      attr: 'physique' | 'intelligence' | 'english' | 'social' | 'riskAwareness' | 'survival',
      value: number
    ) => {
      if (import.meta.env.PROD) return;
      
      const { state } = get();
      const currentValue = state.character.attributes[attr];
      const delta = value - currentValue;
      
      const newState = CharacterSystem.modifyAttribute(state, attr, delta);
      
      set({ state: newState });
    },

    devTransitionScene: (targetScene: SceneId, method?: string) => {
      if (import.meta.env.PROD) return;
      
      const { state } = get();
      
      try {
        const newState = SceneSystem.transitionScene(state, targetScene, method);
        set({ state: newState });
      } catch (error) {
        console.error('场景切换失败:', error);
      }
    },

    devTriggerEvent: (eventId: string, choiceId?: string) => {
      if (import.meta.env.PROD) return;
      
      const { state, executeEvent } = get();
      
      // 如果没有指定选项，尝试使用第一个可用选项
      let targetChoiceId = choiceId;
      if (!targetChoiceId) {
        const availableChoices = EventSystem.getAvailableChoices(state, eventId);
        if (availableChoices.length > 0) {
          targetChoiceId = availableChoices[0].id;
        } else {
          console.warn(`事件 ${eventId} 没有可用选项`);
          return;
        }
      }
      
      executeEvent(eventId, targetChoiceId);
    },

    devAddItem: (itemId: string, count: number = 1) => {
      if (import.meta.env.PROD) return;
      
      const { state } = get();
      
      try {
        const newState = ItemSystem.addItem(state, itemId, count);
        set({ state: newState });
      } catch (error) {
        console.error('添加道具失败:', error);
      }
    },

    devRemoveItem: (itemId: string, count: number = 1) => {
      if (import.meta.env.PROD) return;
      
      const { state } = get();
      
      try {
        const newState = ItemSystem.removeItem(state, itemId, count);
        set({ state: newState });
      } catch (error) {
        console.error('移除道具失败:', error);
      }
    },

    devAddDebuff: (debuff: GameState['scene']['activeDebuffs'][number]) => {
      if (import.meta.env.PROD) return;
      
      const { state } = get();
      const newState = SceneSystem.addDebuff(state, debuff);
      
      set({ state: newState });
    },

    devClearDebuffs: () => {
      if (import.meta.env.PROD) return;
      
      const { state } = get();
      const newState = deepClone(state);
      newState.scene.activeDebuffs = [];
      
      set({ state: newState });
    },

    devSetGameOver: (isGameOver: boolean, endingId?: string) => {
      if (import.meta.env.PROD) return;
      
      const { state } = get();
      const newState = deepClone(state);
      newState.meta.isGameOver = isGameOver;
      if (endingId) {
        newState.meta.endingId = endingId;
      }
      
      set({ state: newState });
    },

    // ========== 持久化 ==========

    saveGame: () => {
      const { state } = get();
      const saveId = generateSaveId();
      
      const saveData: SaveData = {
        version: state.meta.version,
        savedAt: Date.now(),
        state: deepClone(state),
      };
      
      try {
        localStorage.setItem(saveId, JSON.stringify(saveData));
        return saveId;
      } catch (error) {
        console.error('保存游戏失败:', error);
        throw new Error('保存游戏失败');
      }
    },

    loadGame: (saveData: SaveData) => {
      // 版本检查（未来可以添加迁移逻辑）
      if (saveData.version !== '1.0.0') {
        console.warn(`存档版本不匹配: ${saveData.version} vs 1.0.0`);
      }
      
      set({ state: deepClone(saveData.state) });
    },

    loadFromStorage: (saveId: string): boolean => {
      try {
        const saveJson = localStorage.getItem(saveId);
        if (!saveJson) {
          console.warn(`存档不存在: ${saveId}`);
          return false;
        }
        
        const saveData: SaveData = JSON.parse(saveJson);
        get().loadGame(saveData);
        return true;
      } catch (error) {
        console.error('加载存档失败:', error);
        return false;
      }
    },

    getSaveList: () => {
      const saves: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('save_')) {
          saves.push(key);
        }
      }
      return saves.sort();
    },

    deleteSave: (saveId: string) => {
      try {
        localStorage.removeItem(saveId);
      } catch (error) {
        console.error('删除存档失败:', error);
      }
    },
  }),
  {
    name: 'GameStore',
    enabled: import.meta.env.DEV,
  }
));

// 导出 store 实例供测试和非 React 代码使用
export const gameStore = useGameStore;

// 便捷方法
export const getCurrentState = (): GameState => useGameStore.getState().state;

export const setState = (partial: Partial<GameStore>, actionName?: string): void => {
  useGameStore.setState(partial, false, actionName);
};

// 默认导出
export default useGameStore;
