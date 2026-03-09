/**
 * ChatView 容器组件
 * 微信式聊天界面，显示NPC联系人列表和聊天详情
 * 聊天记录从GameState读取（持久化）
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useGameStore } from '@/store';
import { EventPresenterFactory } from '@/presenters';
import { ChatEventPresenter } from '@/presenters/ChatEventPresenter';
import type { EventViewModel } from '@/presenters/types';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { EventSystem } from '@/systems/event/EventSystem';
import type { EventChoice } from '@/types';

export interface ChatViewProps {
  /** 执行事件回调 */
  onExecuteEvent: (
    eventId: string,
    choiceId: string,
    slotSelections?: Record<string, string>
  ) => void;
}

/**
 * 联系人列表项
 */
const ContactItem = React.memo(function ContactItem({
  viewModel,
  isSelected,
  onClick,
}: {
  viewModel: EventViewModel;
  isSelected: boolean;
  onClick: () => void;
}) {
  const chatMeta = viewModel.meta.chat;
  const hasUnread = chatMeta?.unread;
  
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 p-3 cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-500/10 border-l-2 border-blue-500' : 'hover:bg-slate-800/50 border-l-2 border-transparent'}
      `}
    >
      {/* 头像 */}
      <div className="relative">
        <span className="text-3xl">{viewModel.icon}</span>
        {hasUnread && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
        )}
      </div>
      
      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-200 truncate">{viewModel.title}</span>
        </div>
        <p className="text-sm text-slate-400 truncate">{viewModel.subtitle}</p>
      </div>
    </div>
  );
});

/**
 * 聊天消息气泡
 */
const ChatBubble = React.memo(function ChatBubble({
  content,
  isPlayer,
  timestamp,
}: {
  content: string;
  isPlayer: boolean;
  timestamp: number;
}) {
  const timeStr = new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  return (
    <div className={`flex ${isPlayer ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isPlayer ? 'items-end' : 'items-start'}`}>
        <div
          className={`
            px-4 py-2 rounded-2xl text-sm
            ${isPlayer 
              ? 'bg-blue-500 text-white rounded-br-sm' 
              : 'bg-slate-700 text-slate-200 rounded-bl-sm'}
          `}
        >
          {content}
        </div>
        <span className="text-xs text-slate-500 mt-1">{timeStr}</span>
      </div>
    </div>
  );
});

/**
 * 选项按钮
 */
const ChoiceButton = React.memo(function ChoiceButton({
  choice,
  onClick,
  disabled,
}: {
  choice: EventChoice;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full text-left p-3 rounded-lg border transition-all
        ${disabled 
          ? 'opacity-50 cursor-not-allowed border-slate-700 bg-slate-800/30' 
          : 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer'}
      `}
    >
      <span className="text-sm text-blue-300">{choice.name}</span>
    </button>
  );
});

/**
 * 聊天详情面板 - 使用持久化聊天记录
 */
const ChatDetail = React.memo(function ChatDetail({
  viewModel,
  onExecuteEvent,
  onBack,
}: {
  viewModel: EventViewModel;
  onExecuteEvent: (eventId: string, choiceId: string) => void;
  onBack: () => void;
}) {
  const state = useGameStore(s => s.state);
  const addChatMessage = useGameStore(s => s.addChatMessage);
  const chatMeta = viewModel.meta.chat;
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  
  const presenter = useMemo(() => new ChatEventPresenter(), []);
  
  // 从GameState获取聊天记录（持久化）
  const messages = useMemo(() => {
    if (!chatMeta) return [];
    return presenter.getChatHistory(chatMeta.npcId, state);
  }, [chatMeta, presenter, state]);
  
  // 获取该NPC的所有事件
  const npcEvents = useMemo(() => {
    if (!chatMeta) return [];
    return presenter.getNPCEvents(chatMeta.npcId, state);
  }, [chatMeta, presenter, state]);
  
  // 当前选中的事件
  const currentEvent = useMemo(() => {
    if (activeEventId) {
      return npcEvents.find(e => e.id === activeEventId) || npcEvents[0];
    }
    return npcEvents[0];
  }, [activeEventId, npcEvents]);
  
  // 获取选项
  const choices = useMemo(() => {
    if (!currentEvent) return [];
    return EventSystem.getAvailableChoices(state, currentEvent.id);
  }, [currentEvent, state]);
  
  // 初始化：如果没有聊天记录，添加NPC问候语
  useEffect(() => {
    if (!chatMeta || messages.length > 0) return;
    
    // 第一次打开，添加问候语
    addChatMessage({
      npcId: chatMeta.npcId,
      sender: 'npc',
      content: chatMeta.greetingMessage,
    });
  }, [chatMeta, messages.length, addChatMessage]);
  
  // 处理选择 - 添加消息到持久化存储
  const handleChoice = useCallback((choiceId: string) => {
    if (!currentEvent || !chatMeta) return;
    
    const choice = choices.find(c => c.id === choiceId);
    
    // 添加玩家消息到持久化存储
    addChatMessage({
      npcId: chatMeta.npcId,
      sender: 'player',
      content: choice?.name || '选择了选项',
      eventId: currentEvent.id,
      choiceId,
    });
    
    // 执行事件（这会触发store的executeEvent）
    onExecuteEvent(currentEvent.id, choiceId);
    
    // 事件的叙事效果作为NPC回复添加到聊天记录
    // 如果设置了endWithPlayer，则不添加NPC回复（对话以主角结尾）
    const endWithPlayer = choice?.effects?.endWithPlayer;
    const narrative = choice?.effects?.narrative;
    
    if (!endWithPlayer && narrative) {
      // 延迟添加，等待事件执行完成
      setTimeout(() => {
        addChatMessage({
          npcId: chatMeta.npcId,
          sender: 'npc',
          content: narrative,
          eventId: currentEvent.id,
        });
      }, 300);
    }
  }, [currentEvent, chatMeta, choices, addChatMessage, onExecuteEvent]);

  // 如果没有可用事件，显示问候语和聊天记录（不移除已有功能）
  const hasNoEvents = !currentEvent;

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-700">
        <Button variant="ghost" size="sm" onClick={onBack} className="lg:hidden">
          ← 返回
        </Button>
        <span className="text-2xl">{viewModel.icon}</span>
        <div className="flex-1">
          <span className="font-medium text-slate-200">{viewModel.title}</span>
          {npcEvents.length > 1 && (
            <span className="ml-2 text-xs text-slate-500">{npcEvents.length} 个话题</span>
          )}
        </div>
      </div>
      
      {/* 消息区域 - 直接使用从GameState获取的messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map(msg => (
          <ChatBubble
            key={msg.id}
            content={msg.content}
            isPlayer={msg.sender === 'player'}
            timestamp={msg.timestamp}
          />
        ))}
      </div>
      
      {/* 选项区域 */}
      {choices.length > 0 ? (
        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <p className="text-xs text-slate-500 mb-3">选择回复:</p>
          <div className="space-y-2">
            {choices.map(choice => (
              <ChoiceButton
                key={choice.id}
                choice={choice}
                onClick={() => handleChoice(choice.id)}
              />
            ))}
          </div>
        </div>
      ) : hasNoEvents ? (
        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <p className="text-xs text-slate-500 mb-2">当前场景暂无可用对话话题</p>
          <p className="text-xs text-slate-600">切换到其他场景可能会解锁更多对话</p>
        </div>
      ) : null}
      
      {/* 事件切换（如果有多个） */}
      {npcEvents.length > 1 && (
        <div className="p-3 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 mb-2">其他话题:</p>
          <div className="flex gap-2 overflow-x-auto">
            {npcEvents.map(evt => (
              <button
                key={evt.id}
                onClick={() => setActiveEventId(evt.id)}
                className={`
                  px-3 py-1 rounded-full text-xs whitespace-nowrap
                  ${evt.id === currentEvent?.id 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
                `}
              >
                {evt.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * ChatView 主组件
 */
export const ChatView = React.memo(function ChatView({
  onExecuteEvent,
}: ChatViewProps) {
  const state = useGameStore(s => s.state);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  
  // 获取所有聊天联系人
  const contacts = useMemo(() => {
    const presenter = EventPresenterFactory.getPresenter('chat');
    return presenter.present(state);
  }, [state]);
  
  // 选中的联系人
  const selectedContact = useMemo(() => {
    return contacts.find(c => c.id === selectedContactId) || contacts[0] || null;
  }, [contacts, selectedContactId]);
  
  // 处理返回
  const handleBack = useCallback(() => {
    setSelectedContactId(null);
  }, []);

  // 如果没有联系人
  if (contacts.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-slate-500">
          <p className="text-4xl mb-4">💬</p>
          <p>暂无联系人</p>
          <p className="text-sm mt-2">继续游戏以解锁更多对话</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="h-full flex">
      {/* 左侧：联系人列表 */}
      <div className={`
        ${selectedContactId ? 'hidden lg:flex' : 'flex'} 
        w-full lg:w-80 flex-col border-r border-slate-700
      `}>
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-200">联系人</h2>
          <p className="text-xs text-slate-500 mt-1">{contacts.length} 位联系人</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.map(contact => (
            <ContactItem
              key={contact.id}
              viewModel={contact}
              isSelected={selectedContactId === contact.id}
              onClick={() => setSelectedContactId(contact.id)}
            />
          ))}
        </div>
      </div>
      
      {/* 右侧：聊天详情 */}
      <div className={`
        ${selectedContactId ? 'flex' : 'hidden lg:flex'} 
        flex-1 flex-col
      `}>
        {selectedContact ? (
          <ChatDetail
            viewModel={selectedContact}
            onExecuteEvent={onExecuteEvent}
            onBack={handleBack}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <p className="text-4xl mb-4">👋</p>
              <p>选择一个联系人开始对话</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default ChatView;
