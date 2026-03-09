/**
 * 事件表现器工厂
 */

import type { IEventPresenter } from './EventPresenter';
import { ListEventPresenter } from './ListEventPresenter';
import { ChatEventPresenter } from './ChatEventPresenter';

export type PresenterMode = 'list' | 'chat' | 'grid' | 'waterfall';

export class EventPresenterFactory {
  private static instances: Map<PresenterMode, IEventPresenter> = new Map();
  
  static getPresenter(mode: PresenterMode): IEventPresenter {
    if (!this.instances.has(mode)) {
      const presenter = this.createPresenter(mode);
      this.instances.set(mode, presenter);
    }
    return this.instances.get(mode)!;
  }
  
  private static createPresenter(mode: PresenterMode): IEventPresenter {
    switch (mode) {
      case 'list':
        return new ListEventPresenter();
      case 'chat':
        return new ChatEventPresenter();
      default:
        throw new Error(`未知的Presenter模式: ${mode}`);
    }
  }
  
  static clearCache(): void {
    this.instances.clear();
  }
}
