/**
 * 事件表现器基类
 */

import type { GameState } from '@/types';
import type { EventViewModel } from './types';

/**
 * 事件表现器接口
 * 将 GameEvent 转换为特定UI形态的 ViewModel
 */
export interface IEventPresenter {
  /** 转换所有可用事件 */
  present(state: GameState): EventViewModel[];
  
  /** 获取特定事件的 ViewModel */
  presentOne(state: GameState, eventId: string): EventViewModel | null;
  
  /** 排序策略 */
  sort(viewModels: EventViewModel[]): EventViewModel[];
}

/**
 * 基础表现器（抽象类）
 */
export abstract class BaseEventPresenter implements IEventPresenter {
  abstract present(state: GameState): EventViewModel[];
  
  presentOne(state: GameState, eventId: string): EventViewModel | null {
    const all = this.present(state);
    return all.find(vm => vm.id === eventId) || null;
  }
  
  sort(viewModels: EventViewModel[]): EventViewModel[] {
    // 默认排序：可用性 > 优先级 > 标题
    return [...viewModels].sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.title.localeCompare(b.title);
    });
  }
  
  /**
   * 工具方法：截断文本
   */
  protected truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }
}
