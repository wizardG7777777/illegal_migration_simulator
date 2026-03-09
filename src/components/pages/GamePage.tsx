/**
 * GamePage 页面组件（重构版）
 * 
 * 整合新组件：
 * - SplashNewsScreen: 开屏新闻显示随机事件
 * - GameStatusBar: 安卓风格状态栏
 * - EventPanel: 列表模式事件面板
 * - ChatView: 聊天模式事件面板
 * 
 * 支持UI模式切换：列表模式 / 聊天模式
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store';
import { DataLoader } from '@/systems/loader/DataLoader';

import type { GameEvent, SceneId } from '@/types';
import {
  EventPanel,
  RandomEventModal,
  SceneTransition,
  BackpackModal,
  SplashNewsScreen,
  GameStatusBar,
  ChatView,
} from '@/components/containers';
import { Card, Button } from '@/components/primitives';

/**
 * UI模式切换按钮
 */
const ModeSwitchButton = React.memo(function ModeSwitchButton({
  currentMode,
  onSwitch,
}: {
  currentMode: 'list' | 'chat';
  onSwitch: (mode: 'list' | 'chat') => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg">
      <button
        onClick={() => onSwitch('list')}
        className={`
          px-3 py-1.5 rounded text-sm font-medium transition-colors
          ${currentMode === 'list' 
            ? 'bg-slate-700 text-slate-200' 
            : 'text-slate-500 hover:text-slate-300'}
        `}
        title="列表模式"
      >
        📋 列表
      </button>
      <button
        onClick={() => onSwitch('chat')}
        className={`
          px-3 py-1.5 rounded text-sm font-medium transition-colors
          ${currentMode === 'chat' 
            ? 'bg-slate-700 text-slate-200' 
            : 'text-slate-500 hover:text-slate-300'}
        `}
        title="聊天模式"
      >
        💬 聊天
      </button>
    </div>
  );
});

/**
 * 角色面板组件
 */
const CharacterPanel = React.memo(function CharacterPanel({
  onEndTurn,
  inventoryCount,
  hasPendingRandomEvent,
  inventory,
  onUseItem,
}: {
  onEndTurn: () => void;
  inventoryCount: number;
  hasPendingRandomEvent: boolean;
  inventory: Array<{ itemId: string; count: number; type: 'consumable' } | { itemId: string; slot: number; type: 'permanent' }>;
  onUseItem: (itemId: string) => void;
}) {
  const character = useGameStore(s => s.state.character);
  const attrs = character.attributes;
  const [showInventory, setShowInventory] = useState(false);

  const attributeLabels: Record<string, string> = {
    physique: '体魄',
    intelligence: '智力',
    english: '英语',
    social: '社交',
    riskAwareness: '风险意识',
    survival: '生存',
  };

  const attributeIcons: Record<string, string> = {
    physique: '💪',
    intelligence: '🧠',
    english: '🗣️',
    social: '👥',
    riskAwareness: '⚠️',
    survival: '🏕️',
  };

  const handleBackpackClick = () => {
    setShowInventory(!showInventory);
  };

  return (
    <Card
      className="h-full"
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">👤</span>
            <span className="font-semibold text-slate-200">{character.name}</span>
          </div>
        </div>
      }
    >
      {/* 六维属性显示 */}
      {!showInventory && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            六维属性
          </h3>
          {Object.entries(attrs).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{attributeIcons[key]}</span>
                <span className="text-sm text-slate-400">{attributeLabels[key]}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      value >= 15 ? 'bg-green-500' :
                      value >= 10 ? 'bg-blue-500' :
                      value >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(value / 20) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-mono text-slate-300 w-6 text-right">{value}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 物品栏显示 */}
      {showInventory && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            物品栏
          </h3>
          {inventory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">背包空空如也</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {inventory.map((item) => {
                const itemData = DataLoader.getInstance().getItem(item.itemId);
                if (!itemData) return null;

                return (
                  <div key={item.itemId} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📦</span>
                      <div>
                        <p className="text-sm text-slate-200">{itemData.name}</p>
                        <p className="text-xs text-slate-400">{itemData.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {'count' in item && (
                        <span className="text-xs text-slate-400">x{item.count}</span>
                      )}
                      {item.type === 'consumable' && (
                        <Button
                          onClick={() => onUseItem(item.itemId)}
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                        >
                          使用
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 按钮区 */}
      <div className="mt-4 space-y-3">
        <Button
          onClick={handleBackpackClick}
          variant="secondary"
          className="w-full py-3 text-base font-semibold flex items-center justify-center gap-2"
        >
          <span>🎒</span>
          <span>{showInventory ? '显示属性' : '打开背包'}</span>
          <span className="text-xs opacity-60">({inventoryCount} 件)</span>
        </Button>

        <Button
          onClick={onEndTurn}
          variant="primary"
          className="w-full py-3 text-base font-semibold"
          disabled={hasPendingRandomEvent}
        >
          {hasPendingRandomEvent ? '请确认事件' : '⚡ 结束回合'}
        </Button>
      </div>
    </Card>
  );
});

/**
 * 游戏页面主组件
 */
export const GamePage = React.memo(function GamePage() {
  const navigate = useNavigate();

  // 状态
  const state = useGameStore(s => s.state);
  const actionPoints = state.character.resources.actionPoints.current;
  const inventory = state.inventory;
  const hasPendingRandomEvent = !!state.scene.pendingRandomEvent;
  const pendingRandomEventId = state.scene.pendingRandomEvent;
  const isGameOver = state.meta.isGameOver;
  const endingId = state.meta.endingId;
  const currentScene = state.scene.currentScene;

  // UI模式状态
  const [uiMode, setUiMode] = useState<'list' | 'chat'>('list');

  // 获取 actions
  const executeEvent = useGameStore(s => s.executeEvent);
  const confirmRandomEvent = useGameStore(s => s.confirmRandomEvent);
  const useConsumable = useGameStore(s => s.useConsumable);
  const endTurn = useGameStore(s => s.endTurn);
  const devTransitionScene = useGameStore(s => s.devTransitionScene);

  // 随机事件
  const [randomEvent, setRandomEvent] = useState<GameEvent | undefined>(undefined);

  // 场景切换
  const [sceneTransition, setSceneTransition] = useState<{ from: SceneId; to: SceneId } | null>(null);

  // 背包模态框
  const [isBackpackOpen, setIsBackpackOpen] = useState(false);

  // 加载随机事件
  useEffect(() => {
    if (hasPendingRandomEvent && pendingRandomEventId) {
      const event = DataLoader.getInstance().getEvent(pendingRandomEventId);
      setRandomEvent(event);
    } else {
      setRandomEvent(undefined);
    }
  }, [hasPendingRandomEvent, pendingRandomEventId]);

  // 检查游戏结束
  useEffect(() => {
    if (isGameOver) {
      navigate('/ending', { state: { endingId } });
    }
  }, [isGameOver, endingId, navigate]);

  // 处理执行事件
  const handleExecuteEvent = useCallback((
    eventId: string,
    choiceId: string,
    slotSelections?: Record<string, string>
  ) => {
    executeEvent(eventId, choiceId, slotSelections);

    // 检查是否触发了场景切换
    const event = DataLoader.getInstance().getEvent(eventId);
    if (event) {
      const choice = event.choices?.find(c => c.id === choiceId);
      if (choice?.effects.special?.sceneTransition) {
        const { to } = choice.effects.special.sceneTransition;
        setSceneTransition({ from: currentScene, to });
      }
    }
  }, [executeEvent, currentScene]);

  // 处理确认随机事件
  const handleConfirmRandomEvent = useCallback(() => {
    confirmRandomEvent();
    setRandomEvent(undefined);
  }, [confirmRandomEvent]);

  // 处理使用消耗品
  const handleUseItem = useCallback((itemId: string) => {
    useConsumable(itemId);
  }, [useConsumable]);

  // 处理关闭背包
  const handleCloseBackpack = useCallback(() => {
    setIsBackpackOpen(false);
  }, []);

  // 处理结束回合
  const handleEndTurn = useCallback(() => {
    endTurn();
  }, [endTurn]);

  // 处理场景切换完成
  const handleSceneTransitionComplete = useCallback(() => {
    setSceneTransition(null);
  }, []);

  // 开发工具：快速切换场景
  const handleDevSceneSwitch = useCallback((scene: SceneId) => {
    devTransitionScene(scene);
  }, [devTransitionScene]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* 开屏新闻（新的随机事件展示） */}
      <SplashNewsScreen
        event={randomEvent || null}
        onConfirm={handleConfirmRandomEvent}
      />

      {/* 场景切换动画 */}
      {sceneTransition && (
        <SceneTransition
          from={sceneTransition.from}
          to={sceneTransition.to}
          onComplete={handleSceneTransitionComplete}
        />
      )}

      {/* 随机事件模态框（作为开屏新闻的后备） */}
      <RandomEventModal
        event={randomEvent || null}
        onConfirm={handleConfirmRandomEvent}
      />

      {/* 背包模态框 */}
      <BackpackModal
        isOpen={isBackpackOpen}
        onClose={handleCloseBackpack}
        inventory={inventory}
        onUseItem={handleUseItem}
      />

      {/* 安卓风格状态栏 */}
      <GameStatusBar />

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto p-4">
        {/* 桌面端左右分栏布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 左侧面板：角色信息 */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            <CharacterPanel
              onEndTurn={handleEndTurn}
              inventoryCount={inventory.consumables.reduce((s, c) => s + c.count, 0) + inventory.permanents.length}
              hasPendingRandomEvent={hasPendingRandomEvent}
              inventory={[...inventory.consumables.map(c => ({ itemId: c.itemId, count: c.count, type: 'consumable' as const })), ...inventory.permanents.map(p => ({ itemId: p.itemId, slot: p.slot, type: 'permanent' as const }))]}
              onUseItem={handleUseItem}
            />

            {/* 开发工具：场景切换（仅开发模式） */}
            {import.meta.env.DEV && (
              <Card>
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 uppercase">Dev Tools</p>
                  <div className="flex gap-2">
                    <Button onClick={() => handleDevSceneSwitch('act1')} variant="ghost" size="sm" className="flex-1">
                      Act1
                    </Button>
                    <Button onClick={() => handleDevSceneSwitch('act2')} variant="ghost" size="sm" className="flex-1">
                      Act2
                    </Button>
                    <Button onClick={() => handleDevSceneSwitch('act3')} variant="ghost" size="sm" className="flex-1">
                      Act3
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* 右侧面板：事件区域 */}
          <div className="lg:col-span-8 xl:col-span-9">
            <Card className="h-full min-h-[500px]">
              {/* 模式切换头部 */}
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <h2 className="text-lg font-semibold text-slate-200">
                  {uiMode === 'list' ? '可用行动' : '联系人'}
                </h2>
                <ModeSwitchButton currentMode={uiMode} onSwitch={setUiMode} />
              </div>

              {/* 内容区域 */}
              <div className="p-4">
                {uiMode === 'list' ? (
                  <EventPanel
                    mode="list"
                    onExecuteEvent={handleExecuteEvent}
                    actionPoints={actionPoints}
                  />
                ) : (
                  <ChatView onExecuteEvent={handleExecuteEvent} />
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
});

export default GamePage;
