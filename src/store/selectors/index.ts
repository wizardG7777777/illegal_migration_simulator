/**
 * 派生状态选择器
 * 
 * 提供计算后的派生状态，用于UI组件
 * 所有选择器都是纯函数，接收GameState返回派生值
 * 
 * 使用方式：
 * ```typescript
 * // 在React组件中
 * const terminalStatus = useGameStore(selectTerminalStatus);
 * 
 * // 或使用选择器函数
 * const { state } = useGameStore();
 * const availableEvents = selectAvailableFixedEvents(state);
 * ```
 */

import type {
  GameState,
  GameEvent,
  EventChoice,
  TerminalState,
  EnvironmentalDebuff,
  SceneId,
} from '../../types';
import { EventSystem } from '../../systems/event/EventSystem';
import { SceneSystem } from '../../systems/scene/SceneSystem';
import { CharacterSystem } from '../../systems/character/CharacterSystem';
import { ItemSystem } from '../../systems/item/ItemSystem';

// ============================================
// 基础选择器（直接返回状态字段）
// ============================================

/**
 * 选择角色数据
 */
export const selectCharacter = (state: GameState) => state.character;

/**
 * 选择角色属性
 */
export const selectAttributes = (state: GameState) => state.character.attributes;

/**
 * 选择角色资源
 */
export const selectResources = (state: GameState) => state.character.resources;

/**
 * 选择场景状态
 */
export const selectScene = (state: GameState) => state.scene;

/**
 * 选择当前场景ID
 */
export const selectCurrentScene = (state: GameState) => state.scene.currentScene;

/**
 * 选择物品栏
 */
export const selectInventory = (state: GameState) => state.inventory;

/**
 * 选择事件运行时数据
 */
export const selectEventData = (state: GameState) => state.event;

/**
 * 选择游戏元数据
 */
export const selectMeta = (state: GameState) => state.meta;

/**
 * 选择是否游戏结束
 */
export const selectIsGameOver = (state: GameState) => state.meta.isGameOver;

/**
 * 选择结局ID
 */
export const selectEndingId = (state: GameState) => state.meta.endingId;

/**
 * 选择当前回合数
 */
export const selectTurnCount = (state: GameState) => state.scene.turnCount;

/**
 * 选择当前场景内回合数
 */
export const selectSceneTurn = (state: GameState) => state.scene.sceneTurn;

// ============================================
// 派生选择器（计算后的状态）
// ============================================

/**
 * 终结态状态
 */
export interface TerminalStatus {
  /** 终结态类型 */
  type: TerminalState;
  /** 倒计时回合数 */
  countdown: number;
  /** 是否危急（倒计时<=1） */
  isCritical: boolean;
}

/**
 * 选择终结态状态
 * @returns null 表示未进入终结态
 */
export const selectTerminalStatus = (state: GameState): TerminalStatus | null => {
  const { terminalState, terminalCountdown } = state.character.status;
  
  if (!terminalState) {
    return null;
  }
  
  return {
    type: terminalState,
    countdown: terminalCountdown,
    isCritical: terminalCountdown <= 1,
  };
};

/**
 * 可用的固定事件列表
 * 包含FIXED类型和已解锁的CHAIN类型事件
 */
export const selectAvailableFixedEvents = (state: GameState): GameEvent[] => {
  return EventSystem.getAvailableFixedEvents(state);
};

/**
 * 可执行的固定事件列表
 * 过滤掉资源不足（行动点/金钱）的事件
 */
export const selectExecutableFixedEvents = (state: GameState): GameEvent[] => {
  const availableEvents = EventSystem.getAvailableFixedEvents(state);
  return availableEvents.filter(event => 
    EventSystem.canExecuteFixedEvent(state, event)
  );
};

/**
 * 检查事件是否可执行
 */
export const selectCanExecuteEvent = (
  state: GameState,
  eventId: string
): boolean => {
  const event = EventSystem.getAvailableFixedEvents(state).find(e => e.id === eventId);
  if (!event) return false;
  return EventSystem.canExecuteFixedEvent(state, event);
};

/**
 * 生活成本预览（仅场景3有效）
 */
export interface LivingCostPreview {
  /** 总生活成本 */
  cost: number;
  /** 是否能负担 */
  canAfford: boolean;
  /** 分项成本 */
  breakdown: {
    food: number;
    lodging: number;
    transport: number;
  };
  /** 通胀率 */
  inflationRate: number;
}

/**
 * 选择生活成本预览
 * @returns null 如果在非场景3
 */
export const selectLivingCostPreview = (state: GameState): LivingCostPreview | null => {
  if (state.scene.currentScene !== 'act3') {
    return null;
  }
  
  const cost = SceneSystem.calculateLivingCost(state);
  const baseline = SceneSystem.calculateBaselineCosts(state);
  const currentMoney = state.character.resources.money.usd;
  
  // 计算通胀率
  const inflationRate = cost / (baseline.total || 1);
  
  return {
    cost,
    canAfford: currentMoney >= cost,
    breakdown: {
      food: baseline.food,
      lodging: baseline.lodging,
      transport: baseline.transport,
    },
    inflationRate,
  };
};

/**
 * Pressure效果汇总
 */
export const selectPressureEffects = (state: GameState) => {
  return SceneSystem.calculatePressureEffects(state);
};

/**
 * 当前Debuff列表
 */
export const selectActiveDebuffs = (state: GameState): EnvironmentalDebuff[] => {
  return state.scene.activeDebuffs;
};

/**
 * 是否有待处理的随机事件
 */
export const selectHasPendingRandomEvent = (state: GameState): boolean => {
  return !!state.scene.pendingRandomEvent;
};

/**
 * 待处理的随机事件ID
 */
export const selectPendingRandomEventId = (state: GameState): string | null => {
  return state.scene.pendingRandomEvent ?? null;
};

/**
 * 当前行动点
 */
export const selectActionPoints = (state: GameState) => {
  return state.character.resources.actionPoints;
};

/**
 * 当前金钱
 */
export const selectMoney = (state: GameState) => {
  return state.character.resources.money;
};

/**
 * 当前健康值
 */
export const selectHealth = (state: GameState) => {
  return state.character.resources.health;
};

/**
 * 当前心理健康值
 */
export const selectMental = (state: GameState) => {
  return state.character.resources.mental;
};

// ============================================
// 场景特定选择器
// ============================================

/**
 * 场景1状态
 */
export const selectAct1State = (state: GameState) => state.scene.act1;

/**
 * 场景2状态
 */
export const selectAct2State = (state: GameState) => state.scene.act2;

/**
 * 场景3状态
 */
export const selectAct3State = (state: GameState) => state.scene.act3;

/**
 * 是否已触发灵光一闪（场景1）
 */
export const selectHasInsightTriggered = (state: GameState): boolean => {
  return state.scene.act1?.hasInsightTriggered ?? false;
};

/**
 * 签证状态（场景3）
 */
export const selectVisaStatus = (state: GameState) => {
  return state.scene.act3?.visaStatus ?? null;
};

/**
 * 签证剩余回合（场景3）
 * @returns -1 表示已过期，null 表示无签证
 */
export const selectVisaExpiryTurns = (state: GameState): number | null => {
  return state.scene.act3?.visaStatus?.expiryTurns ?? null;
};

// ============================================
// 物品选择器
// ============================================

/**
 * 消耗品列表
 */
export const selectConsumables = (state: GameState) => {
  return state.inventory.consumables;
};

/**
 * 常驻道具列表
 */
export const selectPermanents = (state: GameState) => {
  return state.inventory.permanents;
};

/**
 * 获取消耗品数量
 */
export const selectConsumableCount = (
  state: GameState,
  itemId: string
): number => {
  return ItemSystem.getConsumableCount(state, itemId);
};

/**
 * 检查是否拥有常驻道具
 */
export const selectHasPermanentItem = (
  state: GameState,
  itemId: string
): boolean => {
  return ItemSystem.hasPermanentItem(state, itemId);
};

// ============================================
// 事件相关选择器
// ============================================

/**
 * 事件的可用选项
 */
export const selectEventChoices = (
  state: GameState,
  eventId: string
): EventChoice[] => {
  return EventSystem.getAvailableChoices(state, eventId);
};

/**
 * 活跃的链式事件
 */
export const selectActiveChains = (state: GameState) => {
  return state.event.activeChains;
};

/**
 * 事件触发次数
 */
export const selectEventTriggerCount = (
  state: GameState,
  eventId: string
): number => {
  return EventSystem.getEventTriggerCount(state, eventId);
};

/**
 * 事件完成次数
 */
export const selectEventCompletionCount = (
  state: GameState,
  eventId: string
): number => {
  return EventSystem.getEventCompletionCount(state, eventId);
};

// ============================================
// 统计选择器
// ============================================

/**
 * 游戏统计
 */
export const selectStatistics = (state: GameState) => {
  return state.global.statistics;
};

/**
 * 总游戏时长（毫秒）
 */
export const selectTotalPlayTime = (state: GameState): number => {
  return state.meta.totalPlayTime + (Date.now() - state.meta.createdAt);
};

// ============================================
// 复合选择器（用于特定UI组件）

// ============================================

/**
 * 角色面板数据
 * 整合角色所有相关数据
 */
export const selectCharacterPanelData = (state: GameState) => {
  const { character, scene } = state;
  const terminalStatus = selectTerminalStatus(state);
  
  return {
    name: character.name,
    attributes: character.attributes,
    resources: character.resources,
    terminalStatus,
    currentScene: scene.currentScene,
    sceneTurn: scene.sceneTurn,
    turnCount: scene.turnCount,
  };
};

/**
 * 回合面板数据
 * 用于回合结束时的状态显示
 */
export const selectTurnPanelData = (state: GameState) => {
  const { scene, character } = state;
  
  return {
    turnCount: scene.turnCount,
    sceneTurn: scene.sceneTurn,
    currentScene: scene.currentScene,
    actionPoints: character.resources.actionPoints,
    hasPendingRandomEvent: !!scene.pendingRandomEvent,
    pendingRandomEventId: scene.pendingRandomEvent,
    activeDebuffs: scene.activeDebuffs,
  };
};

/**
 * 事件面板数据
 * 用于事件选择界面
 */
export const selectEventPanelData = (state: GameState) => {
  const availableEvents = selectAvailableFixedEvents(state);
  const executableEvents = selectExecutableFixedEvents(state);
  
  return {
    availableEvents,
    executableEvents,
    actionPoints: state.character.resources.actionPoints,
    hasPendingRandomEvent: !!state.scene.pendingRandomEvent,
    pendingRandomEventId: state.scene.pendingRandomEvent,
  };
};

/**
 * 状态栏数据
 * 用于顶部状态栏显示
 */
export const selectStatusBarData = (state: GameState) => {
  const { character, scene } = state;
  const terminalStatus = selectTerminalStatus(state);
  const livingCost = scene.currentScene === 'act3' 
    ? SceneSystem.calculateLivingCost(state)
    : null;
  
  return {
    name: character.name,
    currentScene: scene.currentScene,
    sceneTurn: scene.sceneTurn,
    turnCount: scene.turnCount,
    health: character.resources.health,
    mental: character.resources.mental,
    money: character.resources.money,
    actionPoints: character.resources.actionPoints,
    terminalStatus,
    livingCost,
    isGameOver: state.meta.isGameOver,
  };
};

// ============================================
// 默认导出
// ============================================

export default {
  // 基础选择器
  selectCharacter,
  selectAttributes,
  selectResources,
  selectScene,
  selectCurrentScene,
  selectInventory,
  selectEventData,
  selectMeta,
  selectIsGameOver,
  selectEndingId,
  selectTurnCount,
  selectSceneTurn,
  
  // 派生选择器
  selectTerminalStatus,
  selectAvailableFixedEvents,
  selectExecutableFixedEvents,
  selectLivingCostPreview,
  selectPressureEffects,
  selectActiveDebuffs,
  selectHasPendingRandomEvent,
  selectPendingRandomEventId,
  selectActionPoints,
  selectMoney,
  selectHealth,
  selectMental,
  
  // 场景选择器
  selectAct1State,
  selectAct2State,
  selectAct3State,
  selectHasInsightTriggered,
  selectVisaStatus,
  selectVisaExpiryTurns,
  
  // 物品选择器
  selectConsumables,
  selectPermanents,
  selectConsumableCount,
  selectHasPermanentItem,
  
  // 事件选择器
  selectEventChoices,
  selectActiveChains,
  selectEventTriggerCount,
  selectEventCompletionCount,
  
  // 统计选择器
  selectStatistics,
  selectTotalPlayTime,
  
  // 复合选择器
  selectCharacterPanelData,
  selectTurnPanelData,
  selectEventPanelData,
  selectStatusBarData,
};
