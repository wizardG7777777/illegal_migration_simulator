# 运行时状态管理设计

## 1. 概述

本文档定义《去美国》游戏的运行时状态管理架构，包括状态分层设计、状态更新流程、与存档系统的集成、状态订阅机制以及性能优化策略。

**设计目标**：
- 清晰的状态分层，降低复杂度
- 可预测的状态更新（单向数据流）
- 高效的存档持久化
- 实时的状态订阅与通知

---

## 2. 状态分层架构

### 2.1 分层概览

```
┌─────────────────────────────────────────────────────────┐
│                   全局状态 (Global State)                │
│  ┌─────────────────────────────────────────────────┐    │
│  │              GameContext                         │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│    │
│  │  │Character│ │  Scene  │ │ Events  │ │  Items  ││    │
│  │  │ State   │ │ State   │ │ State   │ │ State   ││    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘│    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   局部状态 (Local State)                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │   UI State   │ │  Form State  │ │AnimationState│     │
│  │  (useState)  │ │  (useState)  │ │  (useState)  │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 全局状态（GameContext）

全局状态包含游戏的核心数据，通过 `GameContext` 提供给整个应用。

```typescript
// 完整游戏状态接口
interface GameState {
  // ========== 角色状态 ==========
  character: {
    id: string;
    name: string;
    
    // 六大属性
    attributes: {
      physique: number;
      intelligence: number;
      english: number;
      social: number;
      riskAwareness: number;
      survival: number;
    };
    
    // 消耗资源
    resources: {
      health: { current: number; max: number };
      mental: { current: number; max: number };
      money: { cny: number; usd: number };
      actionPoints: { current: number; max: number };
    };
    
    // 角色状态
    status: {
      environmentalDebuffs: EnvironmentalDebuff[];
      temporaryEffects: TemporaryEffect[];
      persistentConditions: PersistentCondition[];
      turnCount: { total: number; inCurrentScene: number };
    };
    
    // 终结态
    terminalState: TerminalState | null;
    
    // 成长进度
    progression: {
      attributeGrowth: Record<string, AttributeGrowthRecord>;
      achievements: string[];
    };
  };
  
  // ========== 场景状态 ==========
  scene: {
    currentScene: SceneId;                    // 'act1' | 'act2' | 'act3'
    
    // 各场景运行时数据
    sceneStates: Record<SceneId, SceneRuntimeState>;
    
    // 环境 Debuff（跨场景累积）
    environmentalDebuffs: EnvironmentalDebuff[];
    
    // 全局标志
    globalFlags: Record<string, boolean>;
  };
  
  // ========== 事件系统状态 ==========
  events: {
    // 当前可用事件
    availableFixedEvents: FixedEvent[];
    
    // 当前触发的随机事件（如果有）
    currentRandomEvent: RandomEvent | null;
    
    // 进行中的事件
    currentExecutingEvent: string | null;
    
    // 事件历史
    eventHistory: EventHistoryEntry[];
    
    // 事件链进度
    activeChains: Map<string, ChainProgress>;
    
    // 事件池状态（冷却、次数限制等）
    poolState: EventPoolState;
  };
  
  // ========== 物品栏状态 ==========
  inventory: {
    // 消耗品道具栏
    consumables: Map<string, number>;         // itemId -> count
    
    // 常驻道具栏
    permanents: PermanentItem[];
    
    // 书籍池（全局唯一）
    bookPool: {
      remainingBookIds: string[];
    };
    
    // 容量限制
    limits: {
      consumableSlots: number;
      permanentSlots: number;
      maxStack: number;
    };
  };
  
  // ========== 游戏阶段 ==========
  gamePhase: 'MENU' | 'CHARACTER_CREATE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
  
  // ========== 回合状态 ==========
  turn: {
    currentTurn: number;                      // 总回合数
    sceneTurn: number;                        // 当前场景回合数
    phase: 'START' | 'RANDOM_EVENT' | 'ACTION' | 'END';
    remainingActionPoints: number;
  };
  
  // ========== 存档元数据 ==========
  meta: {
    saveId: string | null;
    lastSavedAt: number | null;
    totalPlayTime: number;
    createdAt: number;
  };
}
```

### 2.3 局部状态

局部状态由各组件自行管理，不纳入全局状态。

```typescript
// UI 状态示例
const EventCard: React.FC<EventCardProps> = ({ event }) => {
  // 局部 UI 状态
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedSlotItems, setSelectedSlotItems] = useState<Map<string, string>>(new Map());
  
  // 表单状态
  const [customAmount, setCustomAmount] = useState<string>('');
  
  // 动画状态
  const [showResult, setShowResult] = useState(false);
};
```

---

## 3. 状态更新流程

### 3.1 单向数据流

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────>│   Action    │────>│   Reducer   │────>│    State    │
│  Action     │     │   Creator   │     │             │     │   Update    │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                   │
                              ┌────────────────────────────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │   System    │
                       │   Layer     │
                       │  (Pure TS)  │
                       └─────────────┘
```

### 3.2 Action 定义

```typescript
// Action 类型枚举
type GameAction =
  // 角色相关
  | { type: 'CHARACTER_UPDATE_ATTRIBUTES'; payload: Partial<Attributes> }
  | { type: 'CHARACTER_UPDATE_RESOURCES'; payload: Partial<Resources> }
  | { type: 'CHARACTER_ENTER_TERMINAL_STATE'; payload: TerminalState }
  | { type: 'CHARACTER_EXIT_TERMINAL_STATE' }
  
  // 事件相关
  | { type: 'EVENT_TRIGGER_RANDOM' }
  | { type: 'EVENT_EXECUTE_FIXED'; payload: { eventId: string; slotOverrides?: Map<string, string> } }
  | { type: 'EVENT_COMPLETE'; payload: EventResult }
  | { type: 'EVENT_ADD_TO_HISTORY'; payload: EventHistoryEntry }
  
  // 场景相关
  | { type: 'SCENE_TRANSITION'; payload: { toScene: SceneId; transitionType?: string } }
  | { type: 'SCENE_UPDATE_TURN'; payload: { totalTurn: number; sceneTurn: number } }
  | { type: 'SCENE_ADD_DEBUFF'; payload: EnvironmentalDebuff }
  | { type: 'SCENE_REMOVE_DEBUFF'; payload: string }
  
  // 物品相关
  | { type: 'INVENTORY_ADD_CONSUMABLE'; payload: { itemId: string; count: number } }
  | { type: 'INVENTORY_REMOVE_CONSUMABLE'; payload: { itemId: string; count: number } }
  | { type: 'INVENTORY_ADD_PERMANENT'; payload: PermanentItem }
  | { type: 'INVENTORY_REMOVE_PERMANENT'; payload: string }
  
  // 回合相关
  | { type: 'TURN_START' }
  | { type: 'TURN_CONSUME_ACTION_POINT'; payload: number }
  | { type: 'TURN_END' }
  
  // 游戏阶段
  | { type: 'GAME_SET_PHASE'; payload: GamePhase }
  | { type: 'GAME_START_NEW' }
  | { type: 'GAME_LOAD_SAVE'; payload: SaveData }
  | { type: 'GAME_TRIGGER_ENDING'; payload: string };
```

### 3.3 Reducer 实现

```typescript
// 主 Reducer
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'CHARACTER_UPDATE_ATTRIBUTES':
      return {
        ...state,
        character: {
          ...state.character,
          attributes: {
            ...state.character.attributes,
            ...action.payload
          }
        }
      };
      
    case 'CHARACTER_UPDATE_RESOURCES': {
      const newResources = {
        ...state.character.resources,
        ...action.payload
      };
      
      // 检查是否进入终结态
      const terminalState = checkTerminalState(newResources);
      
      return {
        ...state,
        character: {
          ...state.character,
          resources: newResources,
          terminalState: terminalState || state.character.terminalState
        }
      };
    }
    
    case 'EVENT_EXECUTE_FIXED': {
      const { eventId, slotOverrides } = action.payload;
      
      // 调用 System 层执行事件
      const result = executeEvent(eventId, slotOverrides, state);
      
      return applyEventResult(state, result);
    }
    
    case 'SCENE_TRANSITION': {
      const { toScene, transitionType } = action.payload;
      
      // 调用 System 层处理场景切换
      const transitionResult = performSceneTransition(
        state.scene.currentScene,
        toScene,
        transitionType,
        state
      );
      
      if (!transitionResult.success) {
        return state; // 切换失败，保持原状态
      }
      
      return {
        ...state,
        scene: {
          ...state.scene,
          currentScene: toScene,
          sceneStates: {
            ...state.scene.sceneStates,
            [toScene]: transitionResult.newSceneState
          }
        },
        // 清空常驻道具栏（制造"从零开始"感）
        inventory: {
          ...state.inventory,
          permanents: transitionResult.starterKit.permanents,
          consumables: new Map([
            ...state.inventory.consumables,
            ...transitionResult.starterKit.consumables
          ])
        }
      };
    }
    
    case 'TURN_START':
      return processTurnStart(state);
      
    case 'TURN_END':
      return processTurnEnd(state);
    
    default:
      return state;
  }
}

// 辅助函数：应用事件结果
function applyEventResult(state: GameState, result: EventResult): GameState {
  if (!result.success) return state;
  
  const newState = { ...state };
  
  // 应用资源变化
  if (result.effects) {
    newState.character.resources = applyResourceChanges(
      state.character.resources,
      result.effects
    );
  }
  
  // 应用属性变化
  if (result.attributeChanges) {
    newState.character.attributes = {
      ...state.character.attributes,
      ...result.attributeChanges
    };
  }
  
  // 应用物品变化
  if (result.items) {
    newState.inventory = applyInventoryChanges(state.inventory, result.items);
  }
  
  // 应用 Debuff
  if (result.debuffsAdded) {
    newState.scene.environmentalDebuffs = [
      ...state.scene.environmentalDebuffs,
      ...result.debuffsAdded
    ];
  }
  
  // 应用状态效果
  if (result.statusEffects) {
    newState.character.status.temporaryEffects = [
      ...state.character.status.temporaryEffects,
      ...(result.statusEffects.added || [])
    ].filter(effect => 
      !(result.statusEffects?.removed?.includes(effect.id))
    );
  }
  
  // 检查特殊结果
  if (result.special?.sceneTransition) {
    // 触发场景切换 Action
  }
  
  if (result.special?.gameOver) {
    newState.gamePhase = 'GAME_OVER';
  }
  
  return newState;
}
```

### 3.4 Context Provider 实现

```typescript
// GameContext.tsx
interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [state, dispatch] = useReducer(gameReducer, createInitialState());
  
  // 自动保存钩子
  useAutoSave(state);
  
  // 终结态监听
  useTerminalStateWatcher(state, dispatch);
  
  // 场景切换监听
  useSceneTransitionWatcher(state, dispatch);
  
  const value = useMemo(() => ({ state, dispatch }), [state]);
  
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};

// 便捷 hooks
export const useCharacterState = () => useGame().state.character;
export const useSceneState = () => useGame().state.scene;
export const useEventState = () => useGame().state.events;
export const useInventoryState = () => useGame().state.inventory;
```

---

## 4. 与存档系统的关系

### 4.1 持久化时机

```typescript
// 自动保存 Hook
function useAutoSave(state: GameState) {
  const { saveManager } = useSaveManager();
  const lastSaveRef = useRef<number>(Date.now());
  
  // 定时保存（60秒）
  useEffect(() => {
    const interval = setInterval(() => {
      performAutoSave();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // 关键事件保存
  useEffect(() => {
    // 场景切换时保存
    if (state.scene.currentScene !== previousSceneRef.current) {
      performAutoSave('SCENE_TRANSITION');
      previousSceneRef.current = state.scene.currentScene;
    }
    
    // 进入终结态时紧急保存
    if (state.character.terminalState && !previousTerminalRef.current) {
      performAutoSave('TERMINAL_STATE', true);
      previousTerminalRef.current = true;
    }
  }, [state.scene.currentScene, state.character.terminalState]);
  
  const performAutoSave = async (
    trigger?: string,
    isEmergency: boolean = false
  ) => {
    // 检查最小间隔（紧急保存除外）
    if (!isEmergency && Date.now() - lastSaveRef.current < 30000) {
      return;
    }
    
    const saveData = serializeGameState(state);
    await saveManager.autoSave(saveData);
    
    lastSaveRef.current = Date.now();
  };
}
```

### 4.2 状态序列化

```typescript
// GameState -> SaveData
function serializeGameState(state: GameState): SaveData {
  return {
    metadata: {
      id: state.meta.saveId || generateSaveId(),
      isAutoSave: false,
      createdAt: state.meta.createdAt,
      lastSavedAt: Date.now(),
      totalPlayTime: state.meta.totalPlayTime,
      preview: createSavePreview(state),
      version: {
        dataVersion: 1,
        gameVersion: '1.0.0',
        migrationHistory: []
      }
    },
    
    gameState: {
      character: serializeCharacter(state.character),
      scene: serializeScene(state.scene),
      inventory: serializeInventory(state.inventory),
      events: serializeEvents(state.events),
      environment: {
        debuffs: state.scene.environmentalDebuffs,
        globalFlags: state.scene.globalFlags
      }
    },
    
    statistics: calculateStatistics(state)
  };
}

// SaveData -> GameState
function deserializeGameState(saveData: SaveData): GameState {
  return {
    character: deserializeCharacter(saveData.gameState.character),
    scene: deserializeScene(saveData.gameState.scene),
    inventory: deserializeInventory(saveData.gameState.inventory),
    events: deserializeEvents(saveData.gameState.events),
    gamePhase: 'PLAYING',
    turn: {
      currentTurn: saveData.gameState.character.status.turnCount.total,
      sceneTurn: saveData.gameState.scene.sceneStates[saveData.gameState.scene.currentScene].turnCount,
      phase: 'START',
      remainingActionPoints: saveData.gameState.character.resources.actionPoints.current
    },
    meta: {
      saveId: saveData.metadata.id,
      lastSavedAt: saveData.metadata.lastSavedAt,
      totalPlayTime: saveData.metadata.totalPlayTime,
      createdAt: saveData.metadata.createdAt
    }
  };
}
```

### 4.3 状态恢复流程

```typescript
// 加载存档
async function loadSave(saveId: string): Promise<GameState> {
  const saveManager = new SaveManager();
  
  // 1. 从存储加载
  const saveData = await saveManager.load(saveId);
  if (!saveData) {
    throw new Error('存档不存在或已损坏');
  }
  
  // 2. 版本迁移（如需要）
  const migratedData = await migrateSaveData(saveData);
  
  // 3. 反序列化为 GameState
  const gameState = deserializeGameState(migratedData);
  
  // 4. 恢复 System 层状态
  restoreSystemState(gameState);
  
  return gameState;
}

// 恢复 System 层状态
function restoreSystemState(state: GameState): void {
  // 恢复事件池
  EventPoolManager.loadPool(
    state.scene.currentScene,
    state.events.poolState
  );
  
  // 恢复书籍池
  BookPool.restore(state.inventory.bookPool.remainingBookIds);
  
  // 恢复事件链
  ChainManager.restoreActiveChains(state.events.activeChains);
}
```

---

## 5. 状态订阅与通知

### 5.1 终结态监听

```typescript
// 终结态监听 Hook
function useTerminalStateWatcher(
  state: GameState,
  dispatch: React.Dispatch<GameAction>
) {
  const prevTerminalRef = useRef<TerminalState | null>(null);
  
  useEffect(() => {
    const currentTerminal = state.character.terminalState;
    const prevTerminal = prevTerminalRef.current;
    
    // 进入新的终结态
    if (currentTerminal && !prevTerminal) {
      // 触发进入终结态事件
      dispatch({
        type: 'EVENT_TRIGGER_RANDOM',
        payload: { terminalState: currentTerminal.type }
      });
      
      // 显示警告UI
      showTerminalStateWarning(currentTerminal);
    }
    
    // 终结态倒计时更新
    if (currentTerminal?.countdown !== prevTerminal?.countdown) {
      if (currentTerminal && currentTerminal.countdown <= 1) {
        showCriticalWarning(currentTerminal);
      }
    }
    
    // 脱离终结态
    if (!currentTerminal && prevTerminal) {
      showRecoveryNotification();
    }
    
    prevTerminalRef.current = currentTerminal;
  }, [state.character.terminalState]);
}
```

### 5.2 场景切换监听

```typescript
// 场景切换监听 Hook
function useSceneTransitionWatcher(
  state: GameState,
  dispatch: React.Dispatch<GameAction>
) {
  const prevSceneRef = useRef<SceneId>(state.scene.currentScene);
  
  useEffect(() => {
    const currentScene = state.scene.currentScene;
    const prevScene = prevSceneRef.current;
    
    if (currentScene !== prevScene) {
      // 触发场景进入事件
      dispatch({
        type: 'EVENT_TRIGGER_RANDOM',
        payload: { sceneEntry: currentScene }
      });
      
      // 显示场景介绍
      showSceneIntroduction(currentScene);
      
      // 更新事件池
      EventPoolManager.switchToScene(currentScene);
      
      prevSceneRef.current = currentScene;
    }
  }, [state.scene.currentScene]);
}
```

### 5.3 选择性订阅（Selector Pattern）

```typescript
// 使用 selector 避免不必要重渲染
const useHealth = () => {
  const { state } = useGame();
  return state.character.resources.health.current;
};

// 或使用 useMemo
const useCanAfford = (cost: number) => {
  const { state } = useGame();
  const currentMoney = state.character.resources.money.usd;
  
  return useMemo(() => currentMoney >= cost, [currentMoney, cost]);
};

// 复杂 selector
const useExecutableEvents = () => {
  const { state } = useGame();
  
  return useMemo(() => {
    return state.events.availableFixedEvents.filter(event => {
      // 检查资源
      if (event.execution.actionPointCost > state.turn.remainingActionPoints) {
        return false;
      }
      
      // 检查终结态
      if (state.character.terminalState && !event.allowInTerminalState) {
        return false;
      }
      
      // 检查槽位匹配
      const matchResult = InventoryManager.matchSlotRequirements(event.slots || []);
      return matchResult.canExecute;
    });
  }, [
    state.events.availableFixedEvents,
    state.turn.remainingActionPoints,
    state.character.terminalState,
    state.inventory.permanents
  ]);
};
```

---

## 6. 调试工具

### 6.1 开发环境状态查看器

```typescript
// 仅在开发环境启用
const StateInspector: React.FC = () => {
  if (process.env.NODE_ENV === 'production') return null;
  
  const { state, dispatch } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="state-inspector">
      <button onClick={() => setIsOpen(!isOpen)}>
        🔍 状态查看器
      </button>
      
      {isOpen && (
        <div className="state-inspector-panel">
          <h3>游戏状态</h3>
          <pre>{JSON.stringify(state, null, 2)}</pre>
          
          <h4>快捷操作</h4>
          <button onClick={() => dispatch({ type: 'TURN_START' })}>
            开始新回合
          </button>
          <button onClick={() => dispatch({
            type: 'CHARACTER_UPDATE_RESOURCES',
            payload: { health: { current: 100, max: 100 } }
          })}>
            回满健康
          </button>
        </div>
      )}
    </div>
  );
};
```

### 6.2 时间旅行（撤销/重做）

```typescript
// 时间旅行 Hook
function useTimeTravel(maxHistory: number = 50) {
  const [history, setHistory] = useState<GameState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  
  const pushState = useCallback((state: GameState) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(state);
      
      // 限制历史长度
      if (newHistory.length > maxHistory) {
        newHistory.shift();
      }
      
      return newHistory;
    });
    setCurrentIndex(prev => Math.min(prev + 1, maxHistory - 1));
  }, [currentIndex, maxHistory]);
  
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [currentIndex, history]);
  
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [currentIndex, history]);
  
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  
  return { pushState, undo, redo, canUndo, canRedo };
}
```

---

## 7. 性能考虑

### 7.1 批量更新

```typescript
// 批量更新 Action
interface BatchUpdatePayload {
  actions: GameAction[];
}

type GameAction = 
  | { type: 'BATCH_UPDATE'; payload: BatchUpdatePayload }
  | // ... 其他 action

// Reducer 处理批量更新
case 'BATCH_UPDATE': {
  return action.payload.actions.reduce(
    (state, action) => gameReducer(state, action),
    state
  );
}

// 使用示例
const executeEventWithChain = (eventId: string) => {
  const result = executeEvent(eventId);
  
  dispatch({
    type: 'BATCH_UPDATE',
    payload: {
      actions: [
        { type: 'EVENT_COMPLETE', payload: result },
        { type: 'EVENT_ADD_TO_HISTORY', payload: createHistoryEntry(result) },
        { type: 'TURN_CONSUME_ACTION_POINT', payload: result.cost.actionPoints },
        ...result.chainTrigger ? [{
          type: 'CHAIN_ADVANCE',
          payload: { chainId: result.chainTrigger }
        }] : []
      ]
    }
  });
};
```

### 7.2 状态拆分策略

```typescript
// 将大 Context 拆分为多个小 Context
// 避免一个状态变化导致所有订阅组件重渲染

const CharacterContext = createContext<CharacterState>(null!);
const EventContext = createContext<EventState>(null!);
const SceneContext = createContext<SceneState>(null!);
const InventoryContext = createContext<InventoryState>(null!);

// 各 Context 独立更新
const CharacterProvider: React.FC = ({ children }) => {
  const [state, dispatch] = useReducer(characterReducer, initialCharacter);
  
  // 只监听角色相关状态变化
  const value = useMemo(() => state, [
    state.attributes,
    state.resources,
    state.status
  ]);
  
  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  );
};
```

### 7.3 记忆化计算

```typescript
// 使用 useMemo 缓存复杂计算
const useLivingExpenses = () => {
  const { state } = useGame();
  
  return useMemo(() => {
    const debuffs = state.scene.environmentalDebuffs;
    const baseline = state.scene.sceneStates.act3?.livingExpenses?.baseline;
    
    if (!baseline) return null;
    
    // 计算通胀影响
    const inflationRates = debuffs.reduce((acc, debuff) => ({
      food: acc.food * (debuff.effects.foodInflationRate || 1),
      lodging: acc.lodging * (debuff.effects.lodgingInflationRate || 1),
      transport: acc.transport * (debuff.effects.transportInflationRate || 1)
    }), { food: 1, lodging: 1, transport: 1 });
    
    return {
      food: baseline.food * inflationRates.food,
      lodging: baseline.lodging * inflationRates.lodging,
      transport: baseline.transport * inflationRates.transport,
      total: baseline.food * inflationRates.food +
             baseline.lodging * inflationRates.lodging +
             baseline.transport * inflationRates.transport
    };
  }, [
    state.scene.environmentalDebuffs,
    state.scene.sceneStates.act3?.livingExpenses?.baseline
  ]);
};
```

---

## 8. 状态初始化

### 8.1 初始状态创建

```typescript
function createInitialState(): GameState {
  return {
    character: {
      id: generateUUID(),
      name: '',
      attributes: {
        physique: 5,
        intelligence: 5,
        english: 1,
        social: 5,
        riskAwareness: 3,
        survival: 1
      },
      resources: {
        health: { current: 100, max: 100 },
        mental: { current: 100, max: 100 },
        money: { cny: 2000, usd: 0 },
        actionPoints: { current: 3, max: 3 }
      },
      status: {
        environmentalDebuffs: [],
        temporaryEffects: [],
        persistentConditions: [],
        turnCount: { total: 0, inCurrentScene: 0 }
      },
      terminalState: null,
      progression: {
        attributeGrowth: {},
        achievements: []
      }
    },
    
    scene: {
      currentScene: 'act1',
      sceneStates: {
        act1: createInitialSceneState('act1'),
        act2: createInitialSceneState('act2'),
        act3: createInitialSceneState('act3')
      },
      environmentalDebuffs: [],
      globalFlags: {}
    },
    
    events: {
      availableFixedEvents: [],
      currentRandomEvent: null,
      currentExecutingEvent: null,
      eventHistory: [],
      activeChains: new Map(),
      poolState: createInitialPoolState('act1')
    },
    
    inventory: {
      consumables: new Map(),
      permanents: [],
      bookPool: { remainingBookIds: getAllBookIds() },
      limits: {
        consumableSlots: 20,
        permanentSlots: 8,
        maxStack: 99
      }
    },
    
    gamePhase: 'CHARACTER_CREATE',
    
    turn: {
      currentTurn: 0,
      sceneTurn: 0,
      phase: 'START',
      remainingActionPoints: 3
    },
    
    meta: {
      saveId: null,
      lastSavedAt: null,
      totalPlayTime: 0,
      createdAt: Date.now()
    }
  };
}
```

---

## 9. 附录

### 9.1 与 Core 架构的对应关系

| Core 概念 | 状态管理实现 | 对应文件 |
|----------|-------------|---------|
| `Character` | `state.character` | `CharacterSystemArchitecture.md` |
| `Resources` | `state.character.resources` | 第 2.3 节 |
| `TerminalState` | `state.character.terminalState` | 第 4 节 |
| `EnvironmentalDebuff` | `state.scene.environmentalDebuffs` | 第 3.2 节 |
| `EventPool` | `state.events.poolState` | `EventSystemArchitecture.md` |
| `InventoryManager` | `state.inventory` | `ItemSystemArchitecture.md` |
| `SceneRuntimeData` | `state.scene.sceneStates` | `SceneSystemArchitecture.md` |

### 9.2 状态变化流程图

```
用户操作
    │
    ▼
┌─────────────┐
│  Action 触发 │
└──────┬──────┘
       │
       ▼
┌─────────────┐    ┌─────────────┐
│  Reducer    │───>│ System 层   │
│  处理       │    │ 执行逻辑    │
└──────┬──────┘    └─────────────┘
       │
       ▼
┌─────────────┐    ┌─────────────┐
│  新 State   │───>│  持久化     │
│  生成       │    │  (自动保存) │
└──────┬──────┘    └─────────────┘
       │
       ▼
┌─────────────┐
│  订阅者通知  │
│  (UI 更新)  │
└─────────────┘
```

---

**文档版本**: v1.0
**最后更新**: 2026-02-27
**状态**: P0 - 待实现
