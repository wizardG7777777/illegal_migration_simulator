/**
 * 事件相关类型定义
 * 包含事件分类、选项、效果、触发条件等
 */

import type { ItemTag } from './item';
import type { SceneId, EnvironmentalDebuff } from './scene';

/**
 * 事件标签 - 用于分类和筛选事件
 */
export type EventTag = 
  | 'work'           // 打工事件
  | 'study'          // 学习/提升事件
  | 'shop'           // 购物/交易事件
  | 'social'         // 社交事件
  | 'travel'         // 移动/旅行事件
  | 'danger'         // 危险事件
  | 'opportunity'    // 机会事件
  | 'story'          // 剧情事件
  | 'random';        // 随机事件

/**
 * 事件分类
 * - RANDOM: 回合开始自动触发，有冷却/次数限制
 * - FIXED: 玩家主动选择
 * - CHAIN: 前置事件完成后延迟解锁，变为FIXED后玩家自主选择
 * - POLICY_PRESSURE: 场景3回合开始触发（特朗普政策公告）
 */
export type EventCategory = 'RANDOM' | 'FIXED' | 'CHAIN' | 'POLICY_PRESSURE';

/**
 * 事件条件类型
 */
export type EventConditionType =
  | 'SCENE' // 场景条件
  | 'ATTRIBUTE' // 属性条件
  | 'ITEM' // 道具条件
  | 'FLAG' // 状态标记条件
  | 'CHAIN_UNLOCKED'; // 链式事件解锁条件

/**
 * 属性比较操作符
 */
export type AttributeOperator = '>' | '<' | '>=' | '<=' | '==';

/**
 * 基础事件条件
 */
export interface BaseEventCondition {
  type: EventConditionType;
}

/**
 * 场景条件
 */
export interface SceneCondition extends BaseEventCondition {
  type: 'SCENE';
  /** 场景ID */
  value: SceneId;
  /** 最小场景回合数 */
  minSceneTurn?: number;
  /** 最大场景回合数 */
  maxSceneTurn?: number;
}

/**
 * 属性条件
 */
export interface AttributeCondition extends BaseEventCondition {
  type: 'ATTRIBUTE';
  /** 属性名 */
  attribute: keyof import('./character').Attributes;
  /** 操作符 */
  operator: AttributeOperator;
  /** 比较值 */
  value: number;
}

/**
 * 道具条件
 */
export interface ItemCondition extends BaseEventCondition {
  type: 'ITEM';
  /** 特定道具ID（可选，与tag二选一） */
  itemId?: string;
  /** 道具标签（可选，与itemId二选一） */
  tag?: ItemTag;
  /** 数量要求 */
  count?: number;
}

/**
 * 状态标记条件
 */
export interface FlagCondition extends BaseEventCondition {
  type: 'FLAG';
  /** 状态标记名 */
  flag: string;
  /** 是否存在该标记 */
  value: boolean;
}

/**
 * 链式事件解锁条件
 */
export interface ChainUnlockedCondition extends BaseEventCondition {
  type: 'CHAIN_UNLOCKED';
  /** 链ID */
  chainId: string;
  /** 步骤索引 */
  stepIndex: number;
}

/**
 * 事件条件联合类型
 */
export type EventCondition =
  | SceneCondition
  | AttributeCondition
  | ItemCondition
  | FlagCondition
  | ChainUnlockedCondition;

/**
 * 触发配置
 */
export interface TriggerConfig {
  /** 触发权重（相对概率，仅RANDOM类型使用） */
  weight?: number;
  /** 触发后冷却回合数 */
  cooldown?: number;
  /** 最大触发次数（整局游戏） */
  maxTriggers?: number;
  /** 触发条件数组 */
  conditions?: EventCondition[];
  /** 最早触发回合（仅POLICY_PRESSURE类型使用） */
  minSceneTurn?: number;
  /** 最晚触发回合（可选） */
  maxSceneTurn?: number;
}

/**
 * 执行配置
 */
export interface ExecutionConfig {
  /** 是否可重复执行 */
  repeatable: boolean;
  /** 最大执行次数 */
  maxExecutions?: number;
  /** 基础行动点消耗 */
  actionPointCost: number;
  /** 金钱消耗 */
  moneyCost?: number;
  /** 货币类型 */
  moneyCurrency?: 'CNY' | 'USD';
}

/**
 * 物品槽位
 */
export interface ItemSlot {
  /** 槽位ID */
  id: string;
  /** 槽位显示名称 */
  name: string;
  /** 匹配道具的标签 */
  tags: ItemTag[];
  /** 是否强制要求 */
  required: boolean;
  /** 槽位描述 */
  description?: string;
}

/**
 * 资源变化效果
 */
export interface ResourceEffect {
  /** 身体健康度变化 */
  health?: number;
  /** 心理健康度变化 */
  mental?: number;
  /** 金钱变化 */
  money?: number;
  /** 货币类型 */
  moneyCurrency?: 'CNY' | 'USD';
  /** 行动点消耗 */
  actionPoints?: number;
}

/**
 * 选项效果
 */
export interface EventEffect {
  /** 资源变化（用文案包装，不直接显示数字） */
  resources?: ResourceEffect;
  /** 属性变化（可选） */
  attributes?: Partial<Record<keyof import('./character').Attributes, number>>;
  /** 获得道具（可选） */
  addItems?: Array<{ itemId: string; count: number }>;
  /** 失去道具（可选） */
  removeItems?: Array<{ itemId: string; count: number }>;
  /** 获得常驻道具（可选） */
  addPermanents?: string[];
  /** 失去常驻道具（可选） */
  removePermanents?: string[];
  /** 解锁NPC（NPC ID） */
  unlockNPC?: string;
  /** 添加Debuff（startTurn由系统执行时自动设置） */
  addDebuff?: Omit<EnvironmentalDebuff, 'startTurn'>;
  /** 移除Debuff（通过Debuff ID） */
  removeDebuff?: string;
  /** 设置状态标记（可选） */
  setFlags?: Record<string, boolean | number | string>;
  /** 移除状态标记（可选） */
  removeFlags?: string[];
  /** 叙事文案 */
  narrative?: string;
  /** 是否以主角回复结束对话（不触发NPC回复） */
  endWithPlayer?: boolean;
  /** 特殊结果 */
  special?: {
    /** 是否游戏结束 */
    gameOver?: boolean;
    /** 结局ID */
    endingId?: string;
    /** 场景切换 */
    sceneTransition?: {
      to: SceneId;
      method?: string;
    };
    /** 触发链式事件 */
    triggerChain?: ChainConfig;
  };
}

/**
 * 事件选项
 */
export interface EventChoice {
  /** 选项ID */
  id: string;
  /** 选项显示文本 */
  name: string;
  /** 可用条件（可选） */
  condition?: EventCondition;
  /** 选项效果 */
  effects: EventEffect;
}

/**
 * 链式事件配置
 */
export interface ChainConfig {
  /** 链的唯一ID */
  chainId: string;
  /** 当前事件在链中的步骤索引 */
  stepIndex: number;
  /** 下一步要解锁的事件ID */
  nextEventId: string;
  /** 解锁延迟回合数（默认0） */
  unlockDelay?: number;
}

/**
 * 政策压力事件内容
 */
export interface PolicyPressureContent {
  /** 特朗普公告原文 */
  announcement: string;
  /** 游戏内显示文本 */
  displayText: string;
}

/**
 * Debuff配置（仅POLICY_PRESSURE类型使用）
 */
export interface DebuffConfig {
  /** Debuff唯一ID */
  id: string;
  /** Debuff显示名称 */
  name: string;
  /** Debuff类型，固定为pressure */
  type: 'pressure';
  /** 强度等级 1-5 */
  intensity: number;
  /** 持续回合数 */
  duration: number;
  /** 效果配置 */
  effects: {
    raidChanceIncrease?: number;
    workDifficultyIncrease?: number;
    mentalDamagePerTurn?: number;
    cashCostMultiplier?: number;
  };
}

/**
 * 聊天触发配置
 */
export interface ChatTriggerConfig {
  /** 关联的NPC ID */
  npcId: string;
  /** 是否长期显示在聊天列表中（可选，默认false） */
  isPersistent?: boolean;
}

/**
 * 游戏事件基础接口
 */
export interface GameEvent {
  /** 全局唯一标识符 */
  id: string;
  /** 事件类型 */
  category: EventCategory;
  /** 事件显示名称 */
  name: string;
  /** 事件描述文本（50-100字，冷静旁观者视角） */
  description: string;
  /** 可触发场景列表 */
  scenes: SceneId[];
  /** 事件标签（可选，用于分类和筛选） */
  tags?: EventTag[];
  /** 触发配置（RANDOM/POLICY_PRESSURE特有） */
  trigger?: TriggerConfig;
  /** 执行配置（FIXED/CHAIN特有） */
  execution?: ExecutionConfig;
  /** 物品槽位配置（FIXED类型可选） */
  slots?: ItemSlot[];
  /** 事件选项（FIXED/CHAIN/RANDOM使用） */
  choices?: EventChoice[];
  /** 链式事件配置（CHAIN类型特有） */
  chain?: ChainConfig;
  /** 政策公告内容（POLICY_PRESSURE类型特有） */
  content?: PolicyPressureContent;
  /** Debuff配置（POLICY_PRESSURE类型特有） */
  debuff?: DebuffConfig;
  /** 聊天触发配置（可选，用于关联NPC） */
  chatTrigger?: ChatTriggerConfig;
}

/**
 * 链式事件运行时状态
 */
export interface ActiveChain {
  /** 链的唯一ID */
  chainId: string;
  /** 当前完成的步骤索引 */
  currentStep: number;
  /** 要解锁的下一个事件ID */
  unlockEventId: string;
  /** 解锁延迟回合数 */
  unlockDelay: number;
  /** 计划解锁的回合数 */
  unlockTurn: number;
}
