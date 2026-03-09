/**
 * 事件表现层类型定义
 * UI组件只关心这些类型，不直接依赖 GameEvent
 */

import type { EventTag } from '@/types/event';

/**
 * 统一的事件视图模型
 */
export interface EventViewModel {
  /** 唯一标识 */
  id: string;
  /** 显示标题 */
  title: string;
  /** 副标题/摘要 */
  subtitle?: string;
  /** 图标（emoji或URL） */
  icon: string;
  /** 分类标签 */
  tags: EventTag[];
  /** 优先级（用于排序，数字越小越优先） */
  priority: number;
  /** 是否可用（条件满足） */
  available: boolean;
  /** 不可用原因 */
  unavailableReason?: string;
  /** 成本信息 */
  cost?: {
    actionPoints?: number;
    money?: number;
    moneyCurrency?: 'CNY' | 'USD';
  };
  /** 元数据（供特定UI使用） */
  meta: EventMeta;
}

/** 事件元数据 - 扩展点 */
export interface EventMeta {
  /** 原始事件引用（UI层不应直接读取，仅供调试） */
  _rawEventId: string;
  /** 聊天模式专用 */
  chat?: ChatMeta;
  /** 小程序模式专用 */
  miniApp?: MiniAppMeta;
  /** 列表模式专用 */
  list?: ListMeta;
}

/** 聊天模式元数据 */
export interface ChatMeta {
  npcId: string;
  npcName: string;
  npcAvatar: string;
  greetingMessage: string;
  unread: boolean;
  relationship: number; // -100 ~ 100
}

/** 小程序模式元数据 */
export interface MiniAppMeta {
  appId: string;
  badge?: number;
  color: string;
  size: 'small' | 'medium' | 'large';
}

/** 列表模式元数据 */
export interface ListMeta {
  expandedByDefault: boolean;
  category: 'work' | 'study' | 'shop' | 'social' | 'story' | 'chain';
}

/** 聊天消息 */
export interface ChatMessage {
  id: string;
  sender: 'player' | 'npc';
  content: string;
  timestamp: number;
  eventId?: string;
  choiceId?: string;
}
