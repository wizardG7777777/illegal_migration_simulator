/**
 * GamePage 页面组件
 * 游戏主页面，整合所有容器组件和模块组件
 * 
 * 布局（桌面端）：
 * ┌─────────────────────────────────────────────────────────┐
 * │  StatusBar（场景/回合/资源）                            │
 * ├─────────────────────────────────────────────────────────┤
 * │  TerminalAlert（如果有）                                │
 * ├─────────────────────────────────────────────────────────┤
 * │  ┌──────────────────┐  ┌─────────────────────────────┐ │
 * │  │ CharacterPanel   │  │                             │ │
 * │  ├──────────────────┤  │      EventPanel             │ │
 * │  │  结束回合按钮     │  │                             │ │
 * │  ├──────────────────┤  │                             │ │
 * │  │ InventoryPanel   │  │                             │ │
 * │  │ （消耗品+常驻）   │  │                             │ │
 * │  └──────────────────┘  └─────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────┘
 * 
 * 布局（移动端）：垂直堆叠
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store';
import { DataLoader } from '../../systems/loader/DataLoader';
import { EventSystem } from '../../systems/event/EventSystem';
import type { GameEvent, SceneId } from '../../types';
import { EventPanel, RandomEventModal, SceneTransition, BackpackModal } from '../containers';
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';

/**
 * 角色面板组件
 */
const CharacterPanel = React.memo(function CharacterPanel({ 
  onOpenBackpack, 
  onEndTurn, 
  inventoryCount, 
  hasPendingRandomEvent,
  inventory,
  onUseItem
}: { 
  onOpenBackpack: () => void;
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

  // 处理背包按钮点击 - 切换显示状态
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
            <div className="space-y-2">
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
      
      {/* 按钮移动到角色面板内部 */}
      <div className="mt-4 space-y-3">
        {/* 背包按钮 - 现在用于切换显示 */}
        <Button
          onClick={handleBackpackClick}
          variant="secondary"
          className="w-full py-3 text-base font-semibold flex items-center justify-center gap-2"
        >
          <span>🎒</span>
          <span>{showInventory ? '显示属性' : '打开背包'}</span>
          <span className="text-xs opacity-60">
            ({inventoryCount} 件)
          </span>
        </Button>
        
        {/* 结束回合按钮 */}
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
  
  // 使用多个独立的 selector 调用，避免对象引用变化导致重渲染
  const state = useGameStore(s => s.state);
  const availableEvents = useMemo(() => EventSystem.getAvailableFixedEvents(state), [state]);
  const actionPoints = state.character.resources.actionPoints.current;
  const inventory = state.inventory;
  const hasPendingRandomEvent = !!state.scene.pendingRandomEvent;
  const pendingRandomEventId = state.scene.pendingRandomEvent;
  const isGameOver = state.meta.isGameOver;
  const endingId = state.meta.endingId;
  const currentScene = state.scene.currentScene;

  // 获取 actions
  const executeEvent = useGameStore(s => s.executeEvent);
  const confirmRandomEvent = useGameStore(s => s.confirmRandomEvent);
  const useConsumable = useGameStore(s => s.useConsumable);
  const endTurn = useGameStore(s => s.endTurn);
  const devTransitionScene = useGameStore(s => s.devTransitionScene);

  // 随机事件
  const [randomEvent, setRandomEvent] = useState<GameEvent | undefined>(undefined);
  
  // 场景切换
  const [sceneTransition, setSceneTransition] = useState<{from: SceneId; to: SceneId} | null>(null);
  
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
  
  // 处理打开背包
  const handleOpenBackpack = useCallback(() => {
    // 现在背包功能直接在角色面板中，不需要打开模态框
    // 保留这个函数用于兼容性
  }, []);
  
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
    <div className="min-h-screen bg-slate-950 p-4">
      {/* 场景切换动画 */}
      {sceneTransition && (
        <SceneTransition
          from={sceneTransition.from}
          to={sceneTransition.to}
          onComplete={handleSceneTransitionComplete}
        />
      )}

      {/* 随机事件模态框 */}
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

      <div className="max-w-7xl mx-auto">
        {/* 状态栏 */}
        <GameStatusBar />

        {/* 终结态警告 */}
        <GameTerminalAlert />

        {/* 主内容区 - 桌面端左右分栏 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 左侧面板：角色信息 + 物品栏 */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* 角色面板 - 现在包含按钮和切换功能 */}
            <CharacterPanel 
              onOpenBackpack={handleOpenBackpack}
              onEndTurn={handleEndTurn}
              inventoryCount={inventory.consumables.reduce((s, c) => s + c.count, 0) + inventory.permanents.length}
              hasPendingRandomEvent={hasPendingRandomEvent}
              inventory={[...inventory.consumables.map(c => ({ itemId: c.itemId, count: c.count, type: 'consumable' as const })), ...inventory.permanents.map(p => ({ itemId: p.itemId, slot: p.slot, type: 'permanent' as const }))]}
              onUseItem={handleUseItem}
            />

            {/* 物品栏功能已集成到角色面板中 */}

            {/* 开发工具：场景切换（仅开发模式） */}
            {import.meta.env.DEV && (
              <Card>
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 uppercase">Dev Tools</p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleDevSceneSwitch('act1')}
                      variant="ghost" 
                      size="sm"
                      className="flex-1"
                    >
                      Act1
                    </Button>
                    <Button 
                      onClick={() => handleDevSceneSwitch('act2')}
                      variant="ghost" 
                      size="sm"
                      className="flex-1"
                    >
                      Act2
                    </Button>
                    <Button 
                      onClick={() => handleDevSceneSwitch('act3')}
                      variant="ghost" 
                      size="sm"
                      className="flex-1"
                    >
                      Act3
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* 右侧面板：事件列表 */}
          <div className="lg:col-span-8 xl:col-span-9">
            <Card className="h-full min-h-[500px]">
              <EventPanel
                availableEvents={availableEvents}
                onExecuteEvent={handleExecuteEvent}
                actionPoints={actionPoints}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * 内联状态栏组件
 */
const GameStatusBar = React.memo(function GameStatusBar() {
  const scene = useGameStore(s => s.state.scene);
  const resources = useGameStore(s => s.state.character.resources);
  
  const { currentScene, turnCount, sceneTurn, activeDebuffs } = scene;
  const { health, mental, money, actionPoints } = resources;
  
  const sceneNames: Record<SceneId, string> = {
    act1: '国内准备',
    act2: '跨境穿越',
    act3: '美国生存',
  };
  
  const sceneIcons: Record<SceneId, string> = {
    act1: '🏠',
    act2: '🌲',
    act3: '🗽',
  };
  
  const healthPercent = Math.round((health.current / health.max) * 100);
  const mentalPercent = Math.round((mental.current / mental.max) * 100);
  
  const getResourceColor = (percent: number): string => {
    if (percent > 60) return 'bg-green-500';
    if (percent > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="mb-4">
      {/* 第一行：核心信息 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
        {/* 场景信息 */}
        <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
          <span className="text-2xl">{sceneIcons[currentScene]}</span>
          <div>
            <p className="text-xs text-slate-500">当前场景</p>
            <p className="text-sm font-semibold text-slate-200">{sceneNames[currentScene]}</p>
          </div>
        </div>

        {/* 回合信息 */}
        <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
          <span className="text-2xl">📅</span>
          <div>
            <p className="text-xs text-slate-500">回合</p>
            <p className="text-sm font-semibold text-slate-200">{turnCount} <span className="text-slate-500">/ 场景{sceneTurn}</span></p>
          </div>
        </div>

        {/* 金钱 */}
        <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
          <span className="text-2xl">💰</span>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">现金</p>
            <p className="text-sm font-semibold text-slate-200 truncate">
              ¥{money.cny.toLocaleString()}
            </p>
            <p className="text-xs font-semibold text-green-400">
              ${money.usd.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 行动点 */}
        <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="text-xs text-slate-500">行动点</p>
            <p className={`text-lg font-bold ${actionPoints.current > 0 ? 'text-blue-400' : 'text-red-400'}`}>
              {actionPoints.current}<span className="text-sm text-slate-500">/{actionPoints.max}</span>
            </p>
          </div>
        </div>

        {/* Debuffs 快速预览 */}
        <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
          {activeDebuffs.length > 0 ? (
            <span className="text-2xl">⚠️</span>
          ) : (
            <span className="text-2xl">✅</span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">状态</p>
            {activeDebuffs.length > 0 ? (
              <p className="text-sm font-semibold text-amber-400">
                {activeDebuffs.length} 个负面
              </p>
            ) : (
              <p className="text-sm text-slate-400">正常</p>
            )}
          </div>
        </div>
      </div>

      {/* 第二行：资源条 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        {/* 健康 */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-8">健康</span>
          <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getResourceColor(healthPercent)} transition-all duration-300`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
          <span className={`text-xs font-medium w-12 text-right ${healthPercent < 30 ? 'text-red-400' : 'text-slate-400'}`}>
            {health.current}/{health.max}
          </span>
        </div>

        {/* 心理 */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-8">心理</span>
          <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getResourceColor(mentalPercent)} transition-all duration-300`}
              style={{ width: `${mentalPercent}%` }}
            />
          </div>
          <span className={`text-xs font-medium w-12 text-right ${mentalPercent < 30 ? 'text-red-400' : 'text-slate-400'}`}>
            {mental.current}/{mental.max}
          </span>
        </div>
      </div>

      {/* 第三行：Debuffs 详情 */}
      {activeDebuffs.length > 0 && (
        <div className="pt-3 border-t border-slate-700/50">
          <div className="flex flex-wrap gap-2">
            {activeDebuffs.map(debuff => (
              <span 
                key={debuff.id}
                className={`
                  text-xs px-2 py-1 rounded-md border
                  ${debuff.type === 'pressure' ? 'bg-red-500/10 text-red-400 border-red-500/30' : ''}
                  ${debuff.type === 'economic' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : ''}
                  ${!debuff.type ? 'bg-slate-700/50 text-slate-400 border-slate-600' : ''}
                `}
                title={debuff.source}
              >
                {debuff.name} {debuff.duration > 0 && `(${debuff.duration}回合)`}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
});

/**
 * 内联终结态警告组件
 */
const GameTerminalAlert = React.memo(function GameTerminalAlert() {
  const terminalState = useGameStore(s => s.state.character.status.terminalState);
  const terminalCountdown = useGameStore(s => s.state.character.status.terminalCountdown);
  
  if (!terminalState) return null;

  const typeConfig = {
    DYING: {
      icon: '☠️',
      title: '濒死状态',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      description: '你的身体状况极度危险，需要立即治疗',
    },
    BREAKDOWN: {
      icon: '😵',
      title: '精神崩溃',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      description: '持续的压力和焦虑最终击垮了你的精神',
    },
    DESTITUTE: {
      icon: '💸',
      title: '资金匮乏',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      description: '你几乎没有钱了，生活将变得更加困难',
    },
  };

  const config = typeConfig[terminalState];
  const isCritical = terminalCountdown <= 1;

  return (
    <div className={`mb-4 p-4 ${config.bgColor} border ${config.borderColor} rounded-lg`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold ${config.color}`}>{config.title}</h3>
            <span className={`text-sm font-mono font-bold ${isCritical ? 'text-red-400 animate-pulse' : config.color}`}>
              {terminalCountdown === 0 ? '危急！' : `剩余 ${terminalCountdown} 回合`}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">{config.description}</p>
        </div>
      </div>
    </div>
  );
});

export default GamePage;
