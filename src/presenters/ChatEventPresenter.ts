/**
 * 聊天模式表现器
 * 从GameState读取NPC和聊天记录，适配聊天界面
 */

import { BaseEventPresenter } from './EventPresenter';
import { NPCSystem } from '@/systems/npc/NPCSystem';
import { EventSystem } from '@/systems/event/EventSystem';
import { dataLoader } from '@/systems/loader/DataLoader';
import type { GameState, GameEvent, NPCConfig } from '@/types';
import type { EventViewModel, ChatMessage } from './types';

/**
 * 聊天模式表现器
 */
export class ChatEventPresenter extends BaseEventPresenter {
  present(state: GameState): EventViewModel[] {
    // 获取所有已解锁的NPC
    const unlockedNPCIds = NPCSystem.getUnlockedNPCs(state);
    
    // 获取当前可用事件
    const availableEvents = EventSystem.getAvailableFixedEvents(state);
    
    // 为每个解锁的NPC创建聊天入口
    const viewModels: EventViewModel[] = [];
    
    for (const npcId of unlockedNPCIds) {
      const npcConfig = dataLoader.getNPC(npcId);
      if (!npcConfig) continue;
      
      // 获取该NPC关联的所有事件
      const npcEvents = NPCSystem.getNPCEvents(state, npcId, availableEvents);
      
      // 创建ViewModel
      viewModels.push(this.toChatViewModel(npcConfig, npcEvents, state));
    }
    
    return this.sort(viewModels);
  }
  
  /**
   * 将NPC转换为聊天ViewModel
   */
  private toChatViewModel(
    npcConfig: NPCConfig,
    events: GameEvent[],
    state: GameState
  ): EventViewModel {
    // 获取该NPC的聊天记录
    const chatHistory = NPCSystem.getNPCChatHistory(state, npcConfig.id);
    
    // 确定主事件（优先级最高的）
    const primaryEvent = events.length > 0 
      ? events.sort((a, b) => this.calculateEventPriority(a) - this.calculateEventPriority(b))[0]
      : null;
    
    // 是否有未读CHAIN事件（最紧急的）
    const hasUrgentChain = events.some(e => e.category === 'CHAIN');
    
    // 获取最后一条消息用于副标题
    const lastMessage = chatHistory[chatHistory.length - 1];
    
    return {
      id: `chat_${npcConfig.id}`,
      title: npcConfig.name,
      subtitle: this.generateSubtitle(events, lastMessage),
      icon: npcConfig.avatar,
      tags: primaryEvent?.tags || [],
      priority: this.calculatePriority(hasUrgentChain, events.length),
      available: true,
      cost: undefined,
      meta: {
        _rawEventId: primaryEvent?.id || '',
        chat: {
          npcId: npcConfig.id,
          npcName: npcConfig.name,
          npcAvatar: npcConfig.avatar,
          greetingMessage: npcConfig.greetingMessage,
          unread: hasUrgentChain,  // CHAIN事件标记为未读
          // 注意：没有关系度！
          relationship: 0,  // 保留字段兼容，但始终为0
        },
      },
    };
  }
  
  /**
   * 计算事件优先级（数字越小越优先）
   */
  private calculateEventPriority(event: GameEvent): number {
    if (event.category === 'CHAIN') return 0;  // 链式事件最优先
    if (event.tags?.includes('story')) return 1;
    if (event.tags?.includes('work')) return 2;
    return 3;
  }
  
  /**
   * 计算聊天入口优先级
   */
  private calculatePriority(hasUrgentChain: boolean, eventCount: number): number {
    if (hasUrgentChain) return -1;  // 有紧急事件最优先
    if (eventCount > 0) return 0;   // 有事件次优先
    return 1;  // 普通聊天
  }
  
  /**
   * 生成副标题
   */
  private generateSubtitle(
    events: GameEvent[],
    lastMessage?: ChatMessage
  ): string {
    // 如果有CHAIN事件，显示最紧急的
    const chainEvent = events.find(e => e.category === 'CHAIN');
    if (chainEvent) {
      return `[待办] ${chainEvent.name}`;
    }
    
    // 如果有走私/特殊事件
    const specialEvent = events.find(e => 
      e.tags?.includes('danger') || e.id.toLowerCase().includes('smuggl')
    );
    if (specialEvent) {
      return `[重要] ${specialEvent.name}`;
    }
    
    // 如果有工作机会
    const workEvent = events.find(e => e.tags?.includes('work'));
    if (workEvent) {
      return `[工作] ${workEvent.name}`;
    }
    
    // 显示最后一条消息预览
    if (lastMessage) {
      const preview = lastMessage.content.slice(0, 30);
      const suffix = lastMessage.content.length > 30 ? '...' : '';
      return `${preview}${suffix}`;
    }
    
    // 默认显示NPC问候语
    return '';
  }
  
  /**
   * 获取特定NPC的所有事件
   */
  getNPCEvents(npcId: string, state: GameState): GameEvent[] {
    const availableEvents = EventSystem.getAvailableFixedEvents(state);
    return NPCSystem.getNPCEvents(state, npcId, availableEvents);
  }
  
  /**
   * 获取聊天历史
   */
  getChatHistory(npcId: string, state: GameState): ChatMessage[] {
    return NPCSystem.getNPCChatHistory(state, npcId);
  }
  
  /**
   * 排序：未读优先，然后有事件，最后按名称
   */
  sort(viewModels: EventViewModel[]): EventViewModel[] {
    return [...viewModels].sort((a, b) => {
      const chatA = a.meta.chat;
      const chatB = b.meta.chat;
      
      if (!chatA || !chatB) return 0;
      
      // 未读优先
      if (chatA.unread !== chatB.unread) {
        return chatA.unread ? -1 : 1;
      }
      
      // 优先级
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // 最后按名称
      return a.title.localeCompare(b.title);
    });
  }
}
