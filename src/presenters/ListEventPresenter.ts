/**
 * 列表模式表现器
 * 适配传统的列表式UI
 */

import { BaseEventPresenter } from './EventPresenter';
import { EventSystem } from '@/systems/event/EventSystem';
import type { GameState, GameEvent } from '@/types';
import type { EventViewModel, ListMeta } from './types';

/**
 * 分类图标映射
 */
const CATEGORY_ICONS: Record<string, string> = {
  FIXED: '📋',
  CHAIN: '⛓️',
  RANDOM: '🎲',
  POLICY_PRESSURE: '📢',
  work: '💼',
  study: '📚',
  shop: '🛒',
  social: '👥',
  travel: '✈️',
  danger: '⚠️',
  opportunity: '💎',
  story: '📖',
};

/**
 * 列表模式表现器
 */
export class ListEventPresenter extends BaseEventPresenter {
  present(state: GameState): EventViewModel[] {
    const events = EventSystem.getAvailableFixedEvents(state);
    const viewModels = events.map(event => this.toViewModel(event, state));
    return this.sort(viewModels);
  }
  
  /**
   * 将 GameEvent 转换为 EventViewModel
   */
  private toViewModel(event: GameEvent, state: GameState): EventViewModel {
    const apCost = event.execution?.actionPointCost ?? 0;
    const currentAP = state.character.resources.actionPoints.current;
    const canExecute = this.canExecute(event, state, currentAP, apCost);
    
    return {
      id: event.id,
      title: event.name,
      subtitle: this.truncate(event.description, 60),
      icon: this.getIcon(event),
      tags: event.tags || [],
      priority: this.calculatePriority(event),
      available: canExecute,
      unavailableReason: this.getUnavailableReason(event, state, currentAP, apCost),
      cost: {
        actionPoints: apCost > 0 ? apCost : undefined,
        money: event.execution?.moneyCost,
        moneyCurrency: event.execution?.moneyCurrency,
      },
      meta: {
        _rawEventId: event.id,
        list: {
          category: this.categorize(event),
          expandedByDefault: event.category === 'CHAIN',
        },
      },
    };
  }
  
  /**
   * 检查事件是否可以执行
   */
  private canExecute(
    event: GameEvent, 
    state: GameState, 
    currentAP: number,
    requiredAP: number
  ): boolean {
    // 检查事件系统层面的可用性
    const systemAvailable = EventSystem.canExecuteFixedEvent(state, event);
    if (!systemAvailable) return false;
    
    // 检查行动点
    if (currentAP < requiredAP) return false;
    
    // 检查金钱（如果有消耗）
    const moneyCost = event.execution?.moneyCost ?? 0;
    if (moneyCost > 0) {
      const currency = event.execution?.moneyCurrency ?? 'CNY';
      const currentMoney = currency === 'CNY' 
        ? state.character.resources.money.cny
        : state.character.resources.money.usd;
      if (currentMoney < moneyCost) return false;
    }
    
    return true;
  }
  
  /**
   * 获取图标
   */
  private getIcon(event: GameEvent): string {
    // 优先使用第一个tag对应的图标
    if (event.tags && event.tags.length > 0) {
      const tagIcon = CATEGORY_ICONS[event.tags[0]];
      if (tagIcon) return tagIcon;
    }
    // 使用分类图标
    return CATEGORY_ICONS[event.category] || '📄';
  }
  
  /**
   * 分类事件
   */
  private categorize(event: GameEvent): ListMeta['category'] {
    if (event.category === 'CHAIN') return 'chain';
    if (event.tags?.includes('work')) return 'work';
    if (event.tags?.includes('study')) return 'study';
    if (event.tags?.includes('shop')) return 'shop';
    if (event.tags?.includes('social')) return 'social';
    return 'story';
  }
  
  /**
   * 计算优先级
   */
  private calculatePriority(event: GameEvent): number {
    // CHAIN 事件优先级最高（紧急任务）
    if (event.category === 'CHAIN') return 0;
    // 工作事件次之（生存需要）
    if (event.tags?.includes('work')) return 1;
    // 故事/剧情事件
    if (event.tags?.includes('story')) return 2;
    // 购物/社交
    if (event.tags?.includes('shop') || event.tags?.includes('social')) return 3;
    // 其他最低
    return 4;
  }
  
  /**
   * 获取不可用原因
   */
  private getUnavailableReason(
    event: GameEvent, 
    state: GameState, 
    currentAP: number,
    requiredAP: number
  ): string | undefined {
    // 检查行动点
    if (currentAP < requiredAP) {
      return `需要 ${requiredAP} 行动点`;
    }
    
    // 检查金钱
    const moneyCost = event.execution?.moneyCost ?? 0;
    if (moneyCost > 0) {
      const currency = event.execution?.moneyCurrency ?? 'CNY';
      const currentMoney = currency === 'CNY' 
        ? state.character.resources.money.cny
        : state.character.resources.money.usd;
      if (currentMoney < moneyCost) {
        return `${currency === 'CNY' ? '¥' : '$'}${moneyCost} 资金不足`;
      }
    }
    
    // 检查条件
    if (!EventSystem.canExecuteFixedEvent(state, event)) {
      return '条件未满足';
    }
    
    return undefined;
  }
  
  /**
   * 重写排序：按类别分组后排序
   */
  sort(viewModels: EventViewModel[]): EventViewModel[] {
    // 首先按可用性和优先级排序
    const sorted = [...viewModels].sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.title.localeCompare(b.title);
    });
    
    return sorted;
  }
}
