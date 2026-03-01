/**
 * Store 集成示例代码
 * 
 * 本文件展示如何在组件中使用 Zustand Store
 * 
 * 最佳实践：
 * 1. 使用精确的选择器优化性能，避免不必要的重渲染
 * 2. 业务逻辑委托给 System 层，组件只负责展示
 * 3. 使用 useCallback 缓存回调函数
 * 4. 使用 useMemo 缓存计算结果
 */

import React, { useCallback, useMemo } from 'react';
import { useGameStore } from '../store';
import { EventSystem } from '../systems/event/EventSystem';
import { SceneSystem } from '../systems/scene/SceneSystem';

// ============================================
// 示例1: 基础状态订阅
// ============================================

/**
 * 使用精确的选择器订阅特定状态
 * 只有当选择的数据变化时才会重渲染
 */
export function ExampleBasicSelectors() {
  // ✅ 推荐：使用函数选择器只订阅需要的字段
  const character = useGameStore(s => s.state.character);
  const actionPoints = useGameStore(s => s.state.character.resources.actionPoints);
  const currentScene = useGameStore(s => s.state.scene.currentScene);
  
  return (
    <div>
      <p>角色: {character.name}</p>
      <p>行动点: {actionPoints.current}/{actionPoints.max}</p>
      <p>场景: {currentScene}</p>
    </div>
  );
}

// ============================================
// 示例2: 使用 System 层获取派生数据
// ============================================

/**
 * 使用 System 层方法获取计算后的数据
 */
export function ExampleWithSystemLayer() {
  const state = useGameStore(s => s.state);
  
  // 使用 System 层获取可用事件
  const availableEvents = EventSystem.getAvailableFixedEvents(state);
  
  // 使用 System 层获取生活成本（场景3）
  const livingCost = state.scene.currentScene === 'act3'
    ? SceneSystem.calculateLivingCost(state)
    : null;
  
  return (
    <div>
      <p>可用事件数: {availableEvents.length}</p>
      {livingCost !== null && <p>月度生活成本: ${livingCost}</p>}
    </div>
  );
}

// ============================================
// 示例3: 结合 Actions 使用
// ============================================

/**
 * 同时获取状态和 Actions
 */
export function ExampleWithActions() {
  // 订阅状态
  const { state, executeEvent, endTurn, useConsumable, saveGame } = useGameStore();
  
  // 使用 useCallback 缓存回调
  const handleEndTurn = useCallback(() => {
    endTurn();
  }, [endTurn]);
  
  const handleUseItem = useCallback((itemId: string) => {
    useConsumable(itemId);
  }, [useConsumable]);
  
  const handleSave = useCallback(() => {
    const saveId = saveGame();
    console.log('游戏已保存:', saveId);
  }, [saveGame]);
  
  return (
    <div>
      <button onClick={handleEndTurn}>结束回合</button>
      <button onClick={handleSave}>保存游戏</button>
      
      <div>
        {state.inventory.consumables.map(item => (
          <button 
            key={item.itemId}
            onClick={() => handleUseItem(item.itemId)}
          >
            使用 {item.itemId} (x{item.count})
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// 示例4: 场景特定数据
// ============================================

/**
 * 场景3特有的生活成本预览
 */
export function ExampleLivingCost() {
  const currentScene = useGameStore(s => s.state.scene.currentScene);
  const state = useGameStore(s => s.state);
  
  // 只在场景3显示生活成本
  if (currentScene !== 'act3') {
    return <div>当前场景无生活成本</div>;
  }
  
  const cost = SceneSystem.calculateLivingCost(state);
  const baseline = SceneSystem.calculateBaselineCosts(state);
  const currentMoney = state.character.resources.money.usd;
  const inflationRate = cost / (baseline.total || 1);
  
  return (
    <div>
      <h3>月度生活成本</h3>
      <p>总成本: ${cost}</p>
      <p>食品: ${baseline.food}</p>
      <p>住宿: ${baseline.lodging}</p>
      <p>出行: ${baseline.transport}</p>
      <p>通胀率: {(inflationRate * 100).toFixed(0)}%</p>
      <p>是否负担得起: {currentMoney >= cost ? '是' : '否'}</p>
    </div>
  );
}

// ============================================
// 示例5: 使用 useMemo 缓存计算
// ============================================

/**
 * 缓存昂贵的计算
 */
export function ExampleWithMemo() {
  const state = useGameStore(s => s.state);
  const availableEvents = EventSystem.getAvailableFixedEvents(state);
  
  // 使用 useMemo 缓存分类结果
  const { fixedEvents, chainEvents } = useMemo(() => {
    const fixed = availableEvents.filter(e => e.category === 'FIXED');
    const chain = availableEvents.filter(e => e.category === 'CHAIN');
    
    return {
      fixedEvents: fixed,
      chainEvents: chain,
    };
  }, [availableEvents]);
  
  return (
    <div>
      <p>固定事件: {fixedEvents.length}</p>
      <p>链式事件: {chainEvents.length}</p>
    </div>
  );
}

// ============================================
// 示例6: 开发工具使用
// ============================================

/**
 * 开发模式下的调试面板
 */
export function ExampleDevTools() {
  const { 
    devSetMoney, 
    devSetResource, 
    devSetAttribute,
    devTransitionScene,
    devAddItem,
  } = useGameStore();
  
  // 只在开发模式渲染
  if (import.meta.env.PROD) {
    return null;
  }
  
  return (
    <div className="dev-tools-panel">
      <h3>开发者工具</h3>
      
      <div>
        <button onClick={() => devSetMoney(1000, 'USD')}>
          设置金钱 $1000
        </button>
        <button onClick={() => devSetResource('health', 100)}>
          设置健康 100
        </button>
        <button onClick={() => devSetAttribute('physique', 20)}>
          设置体魄 20
        </button>
        <button onClick={() => devTransitionScene('act3')}>
          切换到场景3
        </button>
        <button onClick={() => devAddItem('food_supply', 5)}>
          添加食物 x5
        </button>
      </div>
    </div>
  );
}

// ============================================
// 示例7: 条件渲染优化
// ============================================

/**
 * 根据状态条件渲染
 */
export function ExampleConditionalRendering() {
  const isGameOver = useGameStore(s => s.state.meta.isGameOver);
  const endingId = useGameStore(s => s.state.meta.endingId);
  const hasPendingRandomEvent = useGameStore(s => !!s.state.scene.pendingRandomEvent);
  
  // 游戏结束显示结局
  if (isGameOver) {
    return <div>游戏结束 - 结局: {endingId}</div>;
  }
  
  // 有待处理随机事件时显示遮罩
  if (hasPendingRandomEvent) {
    return (
      <div className="modal-overlay">
        <p>有待处理的事件，请先确认</p>
      </div>
    );
  }
  
  return <div>正常游戏界面</div>;
}

// ============================================
// 完整的 GamePage 简化示例
// ============================================

/**
 * 简化的 GamePage 展示完整的 Store 集成模式
 */
export function ExampleCompleteGamePage() {
  // 订阅状态
  const { state, executeEvent, endTurn, useConsumable } = useGameStore();
  
  const availableEvents = EventSystem.getAvailableFixedEvents(state);
  const actionPoints = state.character.resources.actionPoints.current;
  const inventory = state.inventory;
  const terminalState = state.character.status.terminalState;
  const terminalCountdown = state.character.status.terminalCountdown;
  
  // 缓存回调
  const handleExecuteEvent = useCallback((
    eventId: string, 
    choiceId: string,
    slotSelections?: Record<string, string>
  ) => {
    executeEvent(eventId, choiceId, slotSelections);
  }, [executeEvent]);
  
  const handleUseItem = useCallback((itemId: string) => {
    useConsumable(itemId);
  }, [useConsumable]);
  
  const handleEndTurn = useCallback(() => {
    endTurn();
  }, [endTurn]);
  
  return (
    <div className="game-page">
      {/* 终结态警告 */}
      {terminalState && (
        <div className={`alert alert-${terminalState.toLowerCase()}`}>
          {terminalState}: {terminalCountdown} 回合
        </div>
      )}
      
      {/* 事件面板 */}
      <div className="event-panel">
        <h2>可用行动 (AP: {actionPoints})</h2>
        {availableEvents.map(event => (
          <div key={event.id} className="event-card">
            <h3>{event.name}</h3>
            <p>{event.description}</p>
            {event.choices?.map(choice => (
              <button
                key={choice.id}
                onClick={() => handleExecuteEvent(event.id, choice.id)}
              >
                {choice.name}
              </button>
            ))}
          </div>
        ))}
      </div>
      
      {/* 物品面板 */}
      <div className="inventory-panel">
        <h2>物品栏</h2>
        {inventory.consumables.map(item => (
          <div key={item.itemId}>
            <span>{item.itemId} x{item.count}</span>
            <button onClick={() => handleUseItem(item.itemId)}>
              使用
            </button>
          </div>
        ))}
      </div>
      
      {/* 操作按钮 */}
      <button onClick={handleEndTurn}>结束回合</button>
    </div>
  );
}

// ============================================
// 总结：Store 集成最佳实践
// ============================================

/**
 * 1. 性能优化
 *    - 使用函数式选择器精确订阅需要的状态
 *    - 避免订阅整个 state 对象
 *    - 使用 useCallback 缓存事件处理函数
 *    - 使用 useMemo 缓存昂贵的计算
 * 
 * 2. 状态获取
 *    - 直接访问: useGameStore(s => s.state.xxx)
 *    - System 层: EventSystem.getAvailableFixedEvents(state)
 *    - 派生数据: SceneSystem.calculateLivingCost(state)
 * 
 * 3. Actions 使用
 *    - executeEvent: 执行事件
 *    - endTurn: 结束回合
 *    - useConsumable: 使用消耗品
 *    - startNewGame: 开始新游戏
 *    - saveGame/loadGame: 保存/加载游戏
 *    - devSetMoney, devSetResource 等: 开发工具
 * 
 * 4. 避免常见错误
 *    - ❌ 不要直接修改 store 中的状态
 *    - ❌ 不要在 render 中调用 actions
 *    - ✅ 使用 useCallback 包装 action 调用
 *    - ✅ 使用精确的选择器函数
 */
