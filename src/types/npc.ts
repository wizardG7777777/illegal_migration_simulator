/**
 * NPC系统类型定义
 * 包含NPC配置、运行时状态、聊天记录等
 */

import type { SceneId } from './scene';

/**
 * NPC基础配置（来自JSON）
 */
export interface NPCConfig {
  /** NPC唯一标识符 */
  id: string;
  /** NPC显示名称 */
  name: string;
  /** 头像（emoji或图片URL） */
  avatar: string;
  /** 问候语/初始对话 */
  greetingMessage: string;
  /** 标签列表，用于事件自动关联，如 ["truck", "driver", "smuggle"] */
  tags: string[];
  /** 解锁条件（可选） */
  unlockCondition?: {
    /** 需要处于特定场景 */
    scene?: SceneId;
    /** 最小场景回合数 */
    minSceneTurn?: number;
    /** 需要特定flag解锁 */
    flag?: string;
  };
}

/**
 * NPC运行时状态（存储在GameState中）
 */
export interface NPCState {
  /** 是否已解锁 */
  unlocked: boolean;
  /** 上次交互回合数 */
  lastInteractionTurn: number;
  /** 注意：没有关系度系统！ */
}

/**
 * 聊天消息（用于LLM记忆）
 */
export interface ChatMessage {
  /** 消息唯一标识符 */
  id: string;
  /** 关联的NPC ID */
  npcId: string;
  /** 发送者 */
  sender: 'player' | 'npc';
  /** 消息内容 */
  content: string;
  /** 时间戳 */
  timestamp: number;
  /** 关联的事件ID（可选） */
  eventId?: string;
  /** 玩家选择的选项ID（可选） */
  choiceId?: string;
}

/**
 * NPC系统整体状态
 */
export interface NPCSystemState {
  /** NPC状态映射表 npcId -> state */
  npcs: Record<string, NPCState>;
  /** 所有聊天记录，按时间排序 */
  chatHistory: ChatMessage[];
}

/**
 * NPC索引文件结构
 * _index.json 只包含NPC ID列表，实际配置在单独的JSON文件中
 */
export interface NPCsDataFile {
  /** 数据版本 */
  version: string;
  /** NPC ID列表 */
  npcs: string[];
}
