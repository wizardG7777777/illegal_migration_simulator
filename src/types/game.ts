/**
 * 核心游戏状态类型定义
 * 包含 GameState 及其所有子状态
 */

import type { 
  Attributes, 
  Resources, 
  CharacterStatus,
  CharacterData 
} from './character';

import type { InventoryData } from './item';

import type { ActiveChain } from './event';

import type {
  SceneId,
  Act1State,
  Act2State,
  Act3State,
  EnvironmentalDebuff,
  CrossSceneData,
  SceneConfig,
} from './scene';

// 重新导出相关类型
export type { 
  CharacterData, 
  Attributes, 
  Resources, 
  CharacterStatus,
  InventoryData 
};
export type { ActiveChain };
export type {
  SceneId,
  Act1State,
  Act2State,
  Act3State,
  EnvironmentalDebuff,
  CrossSceneData,
  SceneConfig,
};

/**
 * 游戏元数据
 */
export interface GameMeta {
  /** 存档版本 */
  version: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 最后保存时间戳 */
  lastSavedAt: number;
  /** 总游戏时长（毫秒） */
  totalPlayTime: number;
  /** 是否游戏结束 */
  isGameOver: boolean;
  /** 结局ID（如果游戏结束） */
  endingId?: string;
}

/**
 * 角色数据（完整定义）
 */
export interface CharacterData {
  /** 角色ID */
  id: string;
  /** 角色名称 */
  name: string;
  /** 六维属性 */
  attributes: Attributes;
  /** 资源 */
  resources: Resources;
  /** 角色状态 */
  status: CharacterStatus;
}

/**
 * 场景状态
 */
export interface SceneState {
  /** 当前场景ID */
  currentScene: SceneId;
  /** 全局回合数 */
  turnCount: number;
  /** 当前场景内回合数 */
  sceneTurn: number;
  /** 场景1状态 */
  act1: Act1State | null;
  /** 场景2状态 */
  act2: Act2State | null;
  /** 场景3状态 */
  act3: Act3State | null;
  /** 当前场景的Debuff列表 */
  activeDebuffs: EnvironmentalDebuff[];
  /** 待处理的随机事件（本回合） */
  pendingRandomEvent?: string;
}

/**
 * 事件运行时数据
 */
export interface EventRuntimeData {
  /** 事件ID → 触发次数 */
  triggeredEvents: Record<string, number>;
  /** 事件ID → 上次触发回合 */
  lastTriggeredTurn: Record<string, number>;
  /** 事件ID → 完成次数 */
  completedEvents: Record<string, number>;
  /** 活跃的链式事件 */
  activeChains: ActiveChain[];
}

/**
 * 游戏统计
 */
export interface GameStatistics {
  /** 总回合数 */
  totalTurns: number;
  /** 触发的事件总数 */
  totalEventsTriggered: number;
  /** 完成的打工次数 */
  totalWorkSessions: number;
  /** 死亡次数 */
  deathCount: number;
  /** 通关次数 */
  completionCount: number;
  /** 获得的不同结局列表 */
  unlockedEndings: string[];
}

/**
 * 全局数据（跨场景保留）
 */
export interface GlobalData {
  /** 全局书籍池 */
  bookPool: string[];
  /** 游戏统计 */
  statistics: GameStatistics;
}

/**
 * 统一的游戏状态（唯一真相源）
 */
export interface GameState {
  /** 游戏元数据 */
  meta: GameMeta;
  /** 角色数据 */
  character: CharacterData;
  /** 场景数据 */
  scene: SceneState;
  /** 物品数据 */
  inventory: InventoryData;
  /** 事件运行时数据 */
  event: EventRuntimeData;
  /** 全局状态（跨场景保留） */
  global: GlobalData;
}

/**
 * 存档数据结构
 */
export interface SaveData {
  /** 存档版本 */
  version: string;
  /** 保存时间戳 */
  savedAt: number;
  /** 游戏状态 */
  state: GameState;
}

/**
 * 玩家动作类型
 */
export type PlayerActionType =
  | 'EXECUTE_EVENT' // 执行事件
  | 'USE_ITEM' // 使用物品
  | 'END_TURN' // 结束回合
  | 'SAVE_GAME' // 保存游戏
  | 'LOAD_GAME'; // 加载游戏

/**
 * 玩家动作
 */
export interface PlayerAction {
  /** 动作类型 */
  type: PlayerActionType;
  /** 动作数据 */
  payload?: Record<string, unknown>;
}
