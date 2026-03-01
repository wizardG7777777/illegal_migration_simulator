/**
 * 物品相关类型定义
 * 包含消耗型道具、常驻型道具、书籍类道具的定义
 */

/**
 * 物品分类
 */
export type ItemCategory = 'CONSUMABLE' | 'PERMANENT';

/**
 * 消耗品子分类
 */
export type ConsumableSubCategory = 'medical' | 'food' | 'book' | 'other';

/**
 * 道具标签枚举
 */
export type ItemTag =
  | 'transport' // 交通工具
  | 'weapon' // 武器
  | 'medical' // 医疗物品
  | 'food' // 食物类
  | 'book' // 书籍类
  | 'identity' // 身份凭证
  | 'lodging' // 住宿场所
  | 'tool' // 工具类
  | 'contact' // 人脉/联系人
  | 'document' // 文件/证件
  | 'membership' // 会员资格
  | 'guide' // 向导服务
  | 'cross_scene'; // 跨场景保留标记

/**
 * 物品基础接口
 */
export interface Item {
  /** 唯一标识符 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 道具描述 */
  description: string;
  /** 物品分类 */
  category: ItemCategory;
  /** 属性标签列表 */
  tags: ItemTag[];
  /** 优先级 0-9，数字越小优先级越高，用于事件槽位匹配 */
  priority: number;
}

/**
 * 消耗型道具使用效果
 */
export interface ConsumableEffect {
  /** 回复身体健康度 */
  healthRestore?: number;
  /** 回复心理健康度 */
  mentalRestore?: number;
  /** 回复行动点 */
  actionPointRestore?: number;
  /** 一次性属性加成 */
  attributeBonus?: Partial<Record<keyof import('./character').Attributes, number>>;
  /** 使用后获得其他道具 */
  grantItems?: Array<{ itemId: string; count: number }>;
}

/**
 * 使用消耗
 */
export interface UseCost {
  /** 使用消耗行动点 */
  actionPoint?: number;
  /** 使用消耗金钱 */
  money?: number;
}

/**
 * 消耗型道具
 */
export interface ConsumableItem extends Item {
  category: 'CONSUMABLE';
  /** 细分品类 */
  subCategory: ConsumableSubCategory;
  /** 最大堆叠数量 */
  maxStack: number;
  /** 使用方式：self=直接点击使用, event=通过事件使用 */
  useTarget: 'self' | 'event';
  /** 使用效果 */
  effects: ConsumableEffect;
  /** 可选使用消耗 */
  useCost?: UseCost;
}

/**
 * 书籍类道具（消耗型的特殊子类）
 */
export interface BookItem extends Item {
  category: 'CONSUMABLE';
  subCategory: 'book';
  /** 书籍唯一ID（全局书籍池用） */
  bookId: string;
  /** 稀有度 */
  rarity: 'COMMON' | 'RARE' | 'EPIC';
  /** 通常为1 */
  maxStack: number;
  /** 固定为 event（通过读书事件使用） */
  useTarget: 'event';
  /** 使用效果（阅读后属性提升） */
  effects: ConsumableEffect;
}

/**
 * 槽位效果
 * 被事件匹配时生效
 */
export interface SlotEffect {
  /** 行动点消耗调整（如-1表示省1点） */
  actionPointCostModifier?: number;
  /** 金钱收益倍率（如1.3表示+30%） */
  moneyMultiplier?: number;
  /** 金钱基础值调整（如+50） */
  moneyBaseModifier?: number;
  /** 属性检定加成 */
  checkBonus?: Partial<Record<keyof import('./character').Attributes, number>>;
  /** 成功率调整（0-1） */
  successRateModifier?: number;
  /** 解锁的选项ID列表 */
  unlockOptions?: string[];
}

/**
 * 被动效果
 * 始终生效
 */
export interface PassiveEffect {
  perTurn?: {
    /** 每回合自动回复健康 */
    healthRestore?: number;
    /** 每回合自动回复心理 */
    mentalRestore?: number;
    /** 每回合自动金钱变化（负数为消耗） */
    moneyChange?: number;
  };
  /** 事件抗性（降低某类事件影响） */
  resistance?: Array<{
    eventType: string;
    reductionPercent: number;
  }>;
}

/**
 * 维护成本
 * 每回合固定消耗
 */
export interface UpkeepCost {
  /** 每回合金钱消耗 */
  moneyPerTurn: number;
  /** 每回合行动点消耗 */
  actionPointPerTurn?: number;
}

/**
 * 常驻型道具
 */
export interface PermanentItem extends Item {
  category: 'PERMANENT';
  /** 是否可被随机事件删除 */
  canBeDeleted: boolean;
  /** 槽位效果（配合相关事件时生效） */
  slotEffects?: SlotEffect;
  /** 被动效果（始终生效） */
  passiveEffects?: PassiveEffect;
  /** 维护成本（每回合） */
  upkeepCost?: UpkeepCost;
}

/**
 * 物品联合类型
 */
export type AnyItem = ConsumableItem | PermanentItem | BookItem;

/**
 * 物品数据（完整定义）
 * 用于GameState中的inventory字段
 */
export interface InventoryData {
  /** 消耗品列表 */
  consumables: Array<{ itemId: string; count: number }>;
  /** 常驻道具列表 */
  permanents: Array<{ itemId: string; slot: number }>;
  /** 已读书籍ID列表 */
  booksRead: string[];
}
