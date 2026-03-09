/**
 * NPCManagerPanel.tsx
 * 
 * NPC管理面板
 * 
 * 功能：
 * - 查看所有NPC及其解锁状态
 * - 解锁/锁定NPC
 * - 查看聊天记录
 * - 清空聊天记录
 */

import React, { useState, useMemo } from 'react';
import { useGameStore } from '../../store';
import { dataLoader } from '../../systems/loader/DataLoader';
import { NPCSystem } from '../../systems/npc/NPCSystem';
import type { NPCConfig, ChatMessage } from '../../types';
import { Card, Button } from '../../components/primitives';

interface NPCWithState extends NPCConfig {
  unlocked: boolean;
  lastInteractionTurn: number;
  messageCount: number;
}

/**
 * NPC卡片组件
 */
function NPCCard({
  npc,
  onUnlock,
  onLock,
  onClearHistory,
  onViewHistory,
}: {
  npc: NPCWithState;
  onUnlock: (npcId: string) => void;
  onLock: (npcId: string) => void;
  onClearHistory: (npcId: string) => void;
  onViewHistory: (npcId: string) => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {/* 头像 */}
        <div className="text-3xl">{npc.avatar}</div>
        
        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-200">{npc.name}</h3>
            <span
              className={`px-2 py-0.5 text-xs rounded ${
                npc.unlocked
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {npc.unlocked ? '已解锁' : '未解锁'}
            </span>
          </div>
          
          <p className="text-xs text-slate-500 mb-2 font-mono">{npc.id}</p>
          
          <p className="text-sm text-slate-400 mb-3 line-clamp-2">
            {npc.greetingMessage}
          </p>
          
          {/* 标签 */}
          <div className="flex flex-wrap gap-1 mb-3">
            {npc.tags.map(tag => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-xs rounded"
              >
                {tag}
              </span>
            ))}
          </div>
          
          {/* 状态信息 */}
          {npc.unlocked && (
            <div className="text-xs text-slate-500 mb-3">
              <p>上次互动: {npc.lastInteractionTurn} 回合前</p>
              <p>聊天记录: {npc.messageCount} 条</p>
            </div>
          )}
          
          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            {!npc.unlocked ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onUnlock(npc.id)}
              >
                🔓 解锁
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onViewHistory(npc.id)}
                  disabled={npc.messageCount === 0}
                >
                  📜 查看对话 ({npc.messageCount})
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onClearHistory(npc.id)}
                  disabled={npc.messageCount === 0}
                >
                  🗑️ 清空记录
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onLock(npc.id)}
                >
                  🔒 锁定
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * 聊天记录弹窗
 */
function ChatHistoryModal({
  npcId,
  messages,
  onClose,
}: {
  npcId: string;
  messages: ChatMessage[];
  onClose: () => void;
}) {
  const npc = dataLoader.getNPC(npcId);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{npc?.avatar}</span>
            <div>
              <h3 className="font-semibold text-slate-200">
                与 {npc?.name} 的对话记录
              </h3>
              <p className="text-xs text-slate-500">共 {messages.length} 条消息</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
          >
            ×
          </button>
        </div>
        
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-slate-500 py-8">暂无聊天记录</p>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === 'player' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                    msg.sender === 'player'
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : 'bg-slate-700 text-slate-200 rounded-bl-sm'
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString('zh-CN')}
                    {msg.eventId && (
                      <span className="ml-2 font-mono">evt: {msg.eventId}</span>
                    )}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * NPC管理面板主组件
 */
export function NPCManagerPanel() {
  const store = useGameStore();
  const { state } = store;
  const [viewingNPC, setViewingNPC] = useState<string | null>(null);
  
  // 获取所有NPC及其状态
  const npcsWithState: NPCWithState[] = useMemo(() => {
    const allNPCs = dataLoader.getAllNPCs();
    return allNPCs.map(npc => {
      const npcState = state.npcSystem.npcs[npc.id];
      const chatHistory = NPCSystem.getNPCChatHistory(state, npc.id);
      
      return {
        ...npc,
        unlocked: npcState?.unlocked ?? false,
        lastInteractionTurn: npcState?.lastInteractionTurn ?? 0,
        messageCount: chatHistory.length,
      };
    });
  }, [state]);
  
  // 统计
  const stats = useMemo(() => {
    const unlocked = npcsWithState.filter(n => n.unlocked).length;
    const totalMessages = npcsWithState.reduce((sum, n) => sum + n.messageCount, 0);
    return { unlocked, total: npcsWithState.length, totalMessages };
  }, [npcsWithState]);
  
  // 解锁NPC
  const handleUnlock = (npcId: string) => {
    store.unlockNPC(npcId);
    alert(`已解锁NPC: ${dataLoader.getNPC(npcId)?.name || npcId}`);
  };
  
  // 锁定NPC
  const handleLock = (npcId: string) => {
    if (!confirm(`确定要锁定NPC "${dataLoader.getNPC(npcId)?.name}" 吗？\n这将删除所有聊天记录。`)) {
      return;
    }
    
    // 清空聊天记录
    store.clearChatHistory(npcId);
    
    // 设置锁定状态
    const newState = { ...state };
    if (newState.npcSystem.npcs[npcId]) {
      newState.npcSystem.npcs[npcId].unlocked = false;
    }
    // 使用loadGame加载新状态
    store.loadGame({
      version: newState.meta.version,
      savedAt: Date.now(),
      state: newState,
    });
    
    alert(`已锁定NPC: ${dataLoader.getNPC(npcId)?.name || npcId}`);
  };
  
  // 清空聊天记录
  const handleClearHistory = (npcId: string) => {
    if (!confirm(`确定要清空与 "${dataLoader.getNPC(npcId)?.name}" 的聊天记录吗？`)) {
      return;
    }
    store.clearChatHistory(npcId);
    alert(`已清空聊天记录`);
  };
  
  // 解锁所有NPC
  const handleUnlockAll = () => {
    const lockedNPCs = npcsWithState.filter(n => !n.unlocked);
    if (lockedNPCs.length === 0) {
      alert('所有NPC已解锁');
      return;
    }
    
    lockedNPCs.forEach(npc => {
      store.unlockNPC(npc.id);
    });
    alert(`已解锁 ${lockedNPCs.length} 个NPC`);
  };
  
  // 锁定所有NPC
  const handleLockAll = () => {
    const unlockedNPCs = npcsWithState.filter(n => n.unlocked);
    if (unlockedNPCs.length === 0) {
      alert('没有已解锁的NPC');
      return;
    }
    
    if (!confirm(`确定要锁定所有 ${unlockedNPCs.length} 个NPC吗？这将删除所有聊天记录。`)) {
      return;
    }
    
    store.clearChatHistory();
    const newState = { ...state };
    Object.keys(newState.npcSystem.npcs).forEach(npcId => {
      if (newState.npcSystem.npcs[npcId]) {
        newState.npcSystem.npcs[npcId].unlocked = false;
      }
    });
    // 使用loadGame加载新状态
    store.loadGame({
      version: newState.meta.version,
      savedAt: Date.now(),
      state: newState,
    });
    alert(`已锁定所有NPC`);
  };
  
  // 查看聊天记录
  const handleViewHistory = (npcId: string) => {
    setViewingNPC(npcId);
  };
  
  return (
    <div className="space-y-6">
      {/* 统计和操作 */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-200">{stats.total}</p>
              <p className="text-xs text-slate-500">NPC总数</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{stats.unlocked}</p>
              <p className="text-xs text-slate-500">已解锁</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{stats.totalMessages}</p>
              <p className="text-xs text-slate-500">对话记录</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleUnlockAll}>
              🔓 解锁全部
            </Button>
            <Button variant="danger" onClick={handleLockAll}>
              🔒 锁定全部
            </Button>
          </div>
        </div>
      </Card>
      
      {/* NPC列表 */}
      <div className="grid gap-4 md:grid-cols-2">
        {npcsWithState.map(npc => (
          <NPCCard
            key={npc.id}
            npc={npc}
            onUnlock={handleUnlock}
            onLock={handleLock}
            onClearHistory={handleClearHistory}
            onViewHistory={handleViewHistory}
          />
        ))}
      </div>
      
      {npcsWithState.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-slate-500">暂无NPC配置</p>
          <p className="text-xs text-slate-600 mt-1">
            请在 public/data/npcs/ 目录下添加NPC配置文件
          </p>
        </Card>
      )}
      
      {/* 聊天记录弹窗 */}
      {viewingNPC && (
        <ChatHistoryModal
          npcId={viewingNPC}
          messages={NPCSystem.getNPCChatHistory(state, viewingNPC)}
          onClose={() => setViewingNPC(null)}
        />
      )}
    </div>
  );
}
