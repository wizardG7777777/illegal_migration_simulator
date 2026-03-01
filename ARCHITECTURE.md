# 《去美国》游戏 - 架构设计文档

> 本文档描述重写后的游戏架构设计，供审核确认后分模块实施。

---

## 目录

1. [设计原则](#1-设计原则)
2. [系统分层架构](#2-系统分层架构)
3. [核心数据结构](#3-核心数据结构)
4. [系统层详细设计](#4-系统层详细设计)
5. [数据加载机制](#5-数据加载机制)
6. [模块划分与交付计划](#6-模块划分与交付计划)
7. [关键设计决策](#7-关键设计决策)

---

## 1. 设计原则

| 原则 | 说明 |
|------|------|
| **数据驱动** | 所有游戏内容（事件、物品、场景）通过 JSON 配置定义 |
| **纯函数优先** | 游戏逻辑使用纯函数实现，输入 State 返回 NewState |
| **单向数据流** | UI → Action → System → 更新 State → UI |
| **类型安全** | 100% TypeScript 类型覆盖，零 `any` |
| **模块化** | 系统间通过明确定义的接口交互，无循环依赖 |
| **JSON 冷加载** | 数据文件在应用启动时一次性加载，无需运行时增删 |

---

## 2. 系统分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI Layer                                │
│  React Components (Pages → Containers → Modules → Primitives)   │
├─────────────────────────────────────────────────────────────────┤
│                      State Layer                                │
│  Zustand Store (单一 Store，多 Slice，细粒度订阅)                │
├─────────────────────────────────────────────────────────────────┤
│                     System Layer                                │
│  各系统纯函数 (CharacterSys, EventSys, ItemSys, SceneSys...)    │
├─────────────────────────────────────────────────────────────────┤
│                      Data Layer                                 │
│  JSON 配置文件 (events/, items/) + DataLoader 冷加载            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 核心数据结构

### 3.1 统一的游戏状态 (GameState)

```typescript
// 唯一真相源，所有系统都基于此状态工作
interface GameState {
  // 游戏元数据
  meta: {
    version: string;
    createdAt: number;
    lastSavedAt: number;
    totalPlayTime: number;
    isGameOver: boolean;
    endingId?: string;
  };
  
  // 角色数据（纯数据，无 Class 实例）
  character: CharacterData;
  
  // 场景数据
  scene: SceneState;
  
  // 物品数据
  inventory: InventoryData;
  
  // 事件运行时数据
  event: EventRuntimeData;
  
  // 全局状态（跨场景保留）
  global: GlobalData;
}

// 角色数据
interface CharacterData {
  id: string;
  name: string;
  attributes: {
    physique: number;        // 0-20
    intelligence: number;    // 0-20
    english: number;         // 0-20
    social: number;          // 0-20
    riskAwareness: number;   // 0-20
    survival: number;        // 0-20
  };
  resources: {
    health: { current: number; max: number };   // 0-100
    mental: { current: number; max: number };   // 0-100
    money: { cny: number; usd: number };
    actionPoints: { current: number; max: number; min: number };
  };
  status: {
    // 关于角色的濒死状态，回合倒计时结束则角色死亡，游戏终结
    terminalState: TerminalState | null;
    terminalCountdown: number;
  };
}

// 场景状态
interface SceneState {
  currentScene: 'act1' | 'act2' | 'act3';
  turnCount: number;           // 全局回合数
  sceneTurn: number;           // 当前场景内回合数
  
  // 场景特定状态
  act1: Act1State | null;
  act2: Act2State | null;
  act3: Act3State | null;
  
  // 当前场景的 Debuff 列表
  activeDebuffs: EnvironmentalDebuff[];
  
  // 待处理的随机事件（本回合）
  pendingRandomEvent?: string;
}

// 场景配置（用于初始化各场景）
interface SceneConfig {
  currency: 'CNY' | 'USD';
  starterKit: {
    foodSupply: number;        // 食物补给数量（统一消耗品）
    initialMoney: number;      // 初始金钱（仅首次进入场景时使用）
    permanents: string[];      // 初始常驻道具ID列表
  };
}

// 物品数据
interface InventoryData {
  consumables: Array<{ itemId: string; count: number }>;
  permanents: Array<{ itemId: string; slot: number }>;
  booksRead: string[];
}

// 事件运行时数据
interface EventRuntimeData {
  triggeredEvents: Record<string, number>;   // 事件ID → 触发次数
  lastTriggeredTurn: Record<string, number>; // 事件ID → 上次触发回合
  completedEvents: Record<string, number>;   // 事件ID → 完成次数
  activeChains: Array<{
    chainId: string;           // 链的唯一ID
    currentStep: number;       // 当前完成的步骤索引
    unlockEventId: string;     // 要解锁的下一个事件ID（变为FIXED类型可用）
    unlockDelay: number;       // 解锁延迟回合数（0表示立即解锁）
    unlockTurn: number;        // 计划解锁的回合数（当前回合 + unlockDelay）
  }>;
}

// 全局数据（跨场景保留）
interface GlobalData {
  bookPool: string[];
  statistics: GameStatistics;
}

// 跨场景数据（场景切换时临时保存）
interface CrossSceneData {
  // 跨场景保留的书籍池（全局唯一）
  bookPool: string[];
  
  // 【新增】跨场景携带的金钱（场景切换时继承）
  carriedMoney: {
    cny: number;  // 场景1→2时携带的人民币
    usd: number;  // 场景2→3时携带的美元
  };
  
  // 场景2带入场景3的债务
  carriedDebt?: DebtData[];
}
```

### 3.2 场景特定状态

```typescript
// 场景1：国内准备
interface Act1State {
  // 灵光一闪触发标记（解锁旅游签证路径）
  hasInsightTriggered: boolean;
  
  // 【债务系统】场景1借贷状态
  hasTakenLoan: boolean;
  loanAmount: number;
}

// 场景2：跨境穿越
interface Act2State {
  // 当前阶段标识
  currentPhase: 'rainforest' | 'border_town';
  
  // 雨林进度（0-4步，第5步进入边境小镇）
  progress: number;
  
  // 物资储备（场景2起始时给予基础物资）
  supplyStatus: {
    water: number;               // 水量（天数）
    food: number;                // 食物（天数）
    shelter: boolean;            // 是否有遮蔽
  };
  
  // 已选择的穿越方式（阶段2选择后记录，用于结局标记）
  selectedCrossingMethod?: 'truck' | 'desert' | 'climb';
  
  // 【债务系统】场景2紧急借贷状态
  hasTakenEmergencyLoan: boolean;
  emergencyLoanAmount: number;
}

// 场景3：美国生存
interface Act3State {
  // 签证相关（直飞路径进入场景3时设置）
  visaStatus?: {
    type: 'tourist' | 'student' | null;
    expiryTurns: number;         // 剩余有效回合（-1表示已过期）
  };
  
  // 持续成本（学生签特有）
  ongoingCost?: {
    interval: number;            // 间隔回合
    amount: number;              // 金额
    chargesRemaining: number;
  };
  
  // 生活成本（道具驱动）
  livingExpenses: {
    baseline: { food: number; lodging: number; transport: number };
    current: { food: number; lodging: number; transport: number; total: number };
  };
  
  debtDefaultCount: number;
}
```

---

## 4. 系统层详细设计

### 4.1 角色系统 (CharacterSystem)

**职责**：角色属性、资源管理、终结态计算

```typescript
export class CharacterSystem {
  // 创建新角色
  static createNewCharacter(name: string): CharacterData;
  
  // 修改属性
  static modifyAttribute(
    state: GameState,
    attr: keyof Attributes,
    delta: number
  ): GameState;
  
  // 修改资源
  static modifyResource(
    state: GameState,
    resource: keyof Resources,
    delta: number
  ): GameState;
  
  // 修改金钱
  static modifyMoney(
    state: GameState,
    currency: 'CNY' | 'USD',
    delta: number
  ): GameState;
  
  // 恢复行动点（回合开始）
  static recoverActionPoints(state: GameState): GameState;
  
  // 检查并进入终结态
  static checkTerminalState(state: GameState): GameState;
  
  // 计算濒死/崩溃倒计时
  static calculateTerminalCountdown(
    attributes: Attributes,
    type: 'DYING' | 'BREAKDOWN'
  ): number;
}
```

**关键算法**：

```typescript
// 濒死倒计时 = clamp(floor((体魄 + 6) / 7), 0, 3)
// 体魄0-1: 0回合(立即死), 体魄2-8: 1回合, 体魄9-15: 2回合, 体魄16-20: 3回合

// 崩溃倒计时 = clamp(3 - floor(智力 / 10), 1, 3)
// 智力0-9: 3回合, 智力10-19: 2回合, 智力20: 1回合
```

### 4.2 事件系统 (EventSystem)

**职责**：
- 随机事件触发判定
- 固定事件可用性检查
- 事件执行（选项效果应用）
- 链式事件调度

```typescript
export class EventSystem {
  // ========== 随机事件触发 ==========
  
  // 抽取随机事件（回合开始时调用）
  static drawRandomEvent(state: GameState): GameEvent | null;
  
  // 检查事件是否可用（冷却、次数、条件）
  private static isEventAvailable(state: GameState, event: GameEvent): boolean;
  
  // ========== 固定事件 ==========
  
  // 获取当前可用的固定事件列表
  static getAvailableFixedEvents(state: GameState): GameEvent[];
  
  // 检查固定事件是否可执行
  static canExecuteFixedEvent(state: GameState, event: GameEvent): boolean;
  
  // ========== 事件执行 ==========
  
  // 执行事件（玩家选择后调用）
  static executeEvent(
    state: GameState,
    eventId: string,
    choiceId: string,
    slotSelections?: Record<string, string>
  ): GameState;
  
  // 应用选项效果
  private static applyChoiceEffects(state: GameState, choice: EventChoice): GameState;
  
  // 应用槽位效果
  private static applySlotEffects(
    state: GameState,
    event: GameEvent,
    slotSelections: Record<string, string>
  ): GameState;
  
  // ========== 链式事件（延迟解锁） ==========
  
  // 调度链式事件（延迟解锁下一个事件）
  // 将下一个事件加入解锁队列，延迟指定回合后变为FIXED类型可用
  static scheduleChainEvent(state: GameState, chainConfig: ChainConfig): GameState;
  
  // 处理待解锁的链式事件（回合开始时检查）
  // 检查 unlockTurn 是否到达，到达则将对应事件加入可用FIXED事件列表
  static processPendingChains(state: GameState): GameState;
  
  // ========== 工具方法 ==========
  
  // 标记事件已触发
  static markEventTriggered(state: GameState, eventId: string): GameState;
  
  // 标记事件已完成
  static markEventCompleted(state: GameState, eventId: string): GameState;
  
  // 触发场景进入事件
  static triggerSceneEntryEvent(state: GameState, sceneId: string): GameState;
}
```

**随机事件触发流程**：

```
1. 获取当前场景所有 RANDOM 事件
2. 过滤掉：冷却中、已达次数上限、条件不满足的事件
3. 计算剩余事件的总权重
4. 按权重随机抽取一个事件
5. 更新触发记录（次数+1，记录回合数）
6. 返回事件（或 null）
```

### 4.3 物品系统 (ItemSystem)

**职责**：物品管理、槽位匹配、使用效果应用

```typescript
export class ItemSystem {
  // ========== 物品操作 ==========
  
  // 添加物品
  static addItem(state: GameState, itemId: string, count?: number): GameState;
  
  // 移除物品
  static removeItem(state: GameState, itemId: string, count?: number): GameState;
  
  // 使用消耗品
  static useConsumable(state: GameState, itemId: string): GameState;
  
  // ========== 槽位匹配 ==========
  
  // 获取匹配槽位的道具列表（按优先级排序）
  static getMatchingItems(state: GameState, slot: ItemSlot): PermanentItem[];
  
  // 计算槽位匹配的最佳道具
  static findBestMatch(state: GameState, slot: ItemSlot): PermanentItem | null;
  
  // ========== 全局书籍池 ==========
  
  // 从全局池抽取随机书籍
  static drawRandomBook(state: GameState): GameState;
  
  // ========== 场景切换处理 ==========
  
  // 清空常驻道具栏（场景切换时）
  static clearPermanentItems(state: GameState): GameState;
}
```

### 4.4 场景系统 (SceneSystem)

**职责**：
- 场景切换逻辑
- 生活成本计算
- Debuff 管理

```typescript
export class SceneSystem {
  // ========== 场景切换 ==========
  
  // 场景切换主入口
  static transitionScene(
    state: GameState,
    targetScene: SceneId,
    method?: string
  ): GameState;
  
  // 验证切换是否合法
  private static isValidTransition(from: SceneId, to: SceneId): boolean;
  
  // 提取跨场景数据（场景切换前）
  // 保存：书籍池、金钱（自动汇率兑换）、场景2债务
  private static extractCrossSceneData(state: GameState): CrossSceneData;
  
  // 初始化新场景状态
  private static initializeSceneState(
    state: GameState,
    sceneId: SceneId,
    method?: string
  ): GameState;
  
  // 给予启动物资
  private static giveStarterKit(
    state: GameState,
    sceneId: SceneId,
    method?: string
  ): GameState;
  
  // 恢复跨场景数据（场景切换后）
  // 恢复：书籍池、金钱、场景2债务
  private static restoreCrossSceneData(
    state: GameState,
    data: CrossSceneData
  ): GameState;
  
  // 处理债务跨场景逻辑
  private static handleDebtTransition(
    state: GameState,
    from: SceneId,
    to: SceneId
  ): GameState;
  
  // ========== 生活成本（仅场景3） ==========
  
  // 计算月度生活成本
  static calculateLivingCost(state: GameState): number;
  
  // 计算分项成本（食品/住宿/出行）
  static calculateBaselineCosts(state: GameState): BaselineCosts;
  
  // 应用生活成本扣除
  static applyLivingExpenses(state: GameState): GameState;
  
  // ========== Debuff 管理 ==========
  
  // 添加 Debuff
  static addDebuff(state: GameState, debuff: EnvironmentalDebuff): GameState;
  
  // 更新 Debuff（回合结束，持续时间-1）
  static updateDebuffs(state: GameState): GameState;
  
  // 应用 Debuff 效果（回合开始，扣血/扣心理）
  static applyDebuffEffects(state: GameState): GameState;
  
  // 计算累积的 Pressure 效果
  static calculatePressureEffects(state: GameState): PressureEffect;
}

**SceneSystem 实现示例**：

```typescript
// 场景配置
const SCENE_CONFIGS: Record<SceneId, SceneConfig> = {
  act1: {
    currency: 'CNY',
    starterKit: {
      foodSupply: 0,           // 场景1不提供初始食物
      initialMoney: 2000,      // 人民币初始资金
      permanents: []           // 无初始常驻道具
    }
  },
  act2: {
    currency: 'USD',
    starterKit: {
      foodSupply: 5,           // 5份食物补给
      initialMoney: 0,         // 金钱从场景1继承
      permanents: ['basic_compass']  // 基础指南针
    }
  },
  act3: {
    currency: 'USD',
    starterKit: {
      foodSupply: 0,           // 食物继承自场景2
      initialMoney: 0,         // 金钱继承自场景2（自动汇率兑换）
      permanents: []           // 无初始常驻道具（各路径单独处理）
    }
  }
};

// 给予启动物资（简化版）
private static giveStarterKit(
  state: GameState,
  sceneId: SceneId,
  method?: string
): GameState {
  const config = SCENE_CONFIGS[sceneId];
  const kit = config.starterKit;
  
  // 【修改】给予食物补给（统一消耗品）
  if (kit.foodSupply > 0) {
    state = ItemSystem.addItem(state, 'food_supply', kit.foodSupply);
  }
  
  // 给予初始金钱（仅在首次进入场景时，后续切换时金钱从CrossSceneData恢复）
  if (kit.initialMoney > 0 && !this.hasCarriedMoney(state)) {
    const currency = config.currency;
    state = CharacterSystem.modifyMoney(state, currency, kit.initialMoney);
  }
  
  // 给予常驻道具
  for (const itemId of kit.permanents) {
    state = ItemSystem.addPermanentItem(state, itemId);
  }
  
  return state;
}

// 根据切换类型给予特定起始包（场景3各路径差异处理）
private static giveStarterKitByTransitionType(
  state: GameState,
  to: SceneId,
  from: SceneId,
  transitionType?: string
): GameState {
  if (to === 'act3') {
    switch (transitionType) {
      case 'tourist':
        // 移除金钱设置，金钱从CrossSceneData继承
        state = ItemSystem.addPermanentItem(state, 'hotel_booking');
        state = this.setVisaStatus(state, 'tourist', 6);
        break;
        
      case 'student':
        // 移除金钱设置
        state = ItemSystem.addPermanentItem(state, 'dorm_key');
        break;
        
      case 'truck':
      case 'desert':
      case 'climb':
      case 'miracle':
        // 这些路径都不设置金钱，统一继承
        // 场景2→3的走线路径，物资和金钱都从场景2继承
        break;
    }
  } else if (to === 'act2') {
    // 场景2只给食物补给和基础道具，金钱继承自场景1
    state = ItemSystem.addItem(state, 'food_supply', 5);  // 5份食物
    state = ItemSystem.addPermanentItem(state, 'basic_compass');
  }
  
  return state;
}
```

**场景切换规则**：

```
1. 验证切换合法性（单向流动：act1→act2→act3）
2. 保存跨场景数据（书籍池、金钱、场景2债务）
3. 【关键】清空常驻道具栏
4. 处理债务：
   - act1→act2：债务清零
   - act2→act3：债务保留
5. 切换场景 ID，重置 sceneTurn
6. 初始化新场景状态
7. 根据切换方式给予启动物资
8. 恢复跨场景数据（恢复书籍池、金钱、债务）
9. 触发场景进入事件
```

**生活成本计算**：

```typescript
// 月度成本 = (食品基础 + 住宿道具成本 + 出行道具成本) × 通胀率
// 
// 住宿成本由 lodging 标签道具决定：
//   - 无道具：$0（但会获得【露宿街头】Debuff）
//   - 家庭旅馆床位：$500
//   - 合租房间：$1600
//   - 公寓：$3,200
//
// 出行成本由 transport 标签道具决定：
//   - 无道具/公交卡：$50
//   - 以下代步道具仅场景1可用
//   - 电动车：$50
//   - 以下代步道具仅场景3可用
//   - 二手车：$350
//   - 特斯拉：$600
```

### 4.5 回合系统 (TurnSystem)

**职责**：回合流程编排，协调各系统

```typescript
export class TurnSystem {
  // 执行完整回合（用于自动推进或测试）
  static processTurn(state: GameState, playerAction?: PlayerAction): GameState;
  
  // ========== 回合阶段（每个都是纯函数） ==========
  
  // 阶段1：回合开始
  static phaseTurnStart(state: GameState): GameState;
  
  // 阶段2：随机事件判定
  static phaseRandomEvent(state: GameState): GameState;
  
  // 阶段3：玩家行动（由 UI 触发）
  static phasePlayerAction(
    state: GameState,
    action: PlayerAction
  ): GameState;
  
  // 阶段4：月度结算（场景3）
  static phaseMonthlySettlement(state: GameState): GameState;
  
  // 阶段5：回合结束
  static phaseTurnEnd(state: GameState): GameState;
  
  // ========== 检查点 ==========
  
  // 检查是否进入新月份（场景3生活成本）
  static isNewMonth(state: GameState): boolean;
  
  // 检查游戏是否结束
  static checkGameOver(state: GameState): GameState;
}
```

**回合流程**：

```
回合开始
  ├─ [阶段1] 恢复行动点
  ├─ [阶段1] Debuff 效果结算（每回合扣血/扣心理）
  ├─ [阶段2] 随机事件抽取（可能为 null）
  │     └─ 如果有随机事件，UI 显示，玩家确认后进入效果应用
  ├─ [阶段3] 玩家执行固定事件（消耗行动点）
  │     └─ 可执行多个事件，直到行动点耗尽或主动结束
  ├─ [阶段4] 月度结算（如果是场景3且进入新月）
  │     └─ 扣除生活成本、债务还款
  ├─ [阶段5] Debuff 持续时间-1，移除过期 Debuff
  ├─ [阶段5] 检查终结态（濒死/崩溃/匮乏）
  └─ [阶段5] 检查游戏结束条件
```

---

## 5. 数据加载机制

### 5.1 目录结构

```
public/
├── data/
│   ├── events/
│   │   ├── act1.json         # 场景1所有事件
│   │   ├── act2.json         # 场景2所有事件
│   │   ├── act3.json         # 场景3所有事件
│   │   └── random.json       # 通用随机事件
│   └── items/
│       ├── consumables.json  # 消耗型道具
│       ├── permanents.json   # 常驻型道具
│       └── books.json        # 书籍（全局池）
```

### 5.2 JSON 文件格式

**事件文件示例**：

```json
{
  "version": "1.0.0",
  "events": [
    {
      "id": "act1_work_warehouse",
      "category": "FIXED",
      "name": "快递分拣夜班",
      "description": "你看到一个物流中心在招临时工，时薪20元，夜班补贴10元...",
      "scenes": ["act1"],
      "execution": {
        "repeatable": true,
        "maxExecutions": 10,
        "actionPointCost": 3
      },
      "choices": [
        {
          "id": "work_normal",
          "name": "正常干活",
          "effects": {
            "resources": {
              "health": -5,
              "mental": -3,
              "money": 150,
              "moneyCurrency": "CNY"
            },
            "narrative": "你感到腰酸背痛，但钱包鼓了一些"
          }
        },
        {
          "id": "work_hard",
          "name": "拼命干",
          "condition": {
            "type": "ATTRIBUTE",
            "attribute": "physique",
            "operator": ">=",
            "value": 8
          },
          "effects": {
            "resources": {
              "health": -8,
              "mental": -5,
              "money": 220,
              "moneyCurrency": "CNY"
            },
            "attributes": {
              "physique": 0.1
            },
            "narrative": "身体快散架了，但学到了提高效率的技巧"
          }
        }
      ]
    }
  ]
}
```

**道具文件示例**：

```json
{
  "version": "1.0.0",
  "items": [
    {
      "id": "vehicle_tesla",
      "name": "特斯拉 Model 3",
      "description": "充满电能跑400公里，做Uber的好选择",
      "category": "PERMANENT",
      "tags": ["transport"],
      "priority": 1,
      "canBeDeleted": true,
      "slotEffects": {
        "actionPointCostModifier": -1,
        "moneyMultiplier": 1.3,
        "unlockOptions": ["option_premium_delivery"]
      },
      "upkeepCost": {
        "moneyPerTurn": 60
      }
    },
    {
      "id": "key_apartment",
      "name": "公寓钥匙",
      "description": "月租$1200的单间公寓",
      "category": "PERMANENT",
      "tags": ["lodging"],
      "priority": 2,
      "canBeDeleted": false,
      "passiveEffects": {
        "perTurn": {
          "mentalRestore": 2
        }
      }
    }
  ]
}
```

### 5.3 数据加载器

```typescript
// systems/loader/DataLoader.ts
export class DataLoader {
  private static instance: DataLoader;
  private events: Map<string, GameEvent> = new Map();
  private items: Map<string, Item> = new Map();
  private loaded = false;

  static getInstance(): DataLoader;

  // 应用启动时调用（main.tsx）
  async loadAll(): Promise<void>;

  // Getters
  getEvent(id: string): GameEvent | undefined;
  getAllEvents(): GameEvent[];
  getEventsByScene(sceneId: string): GameEvent[];
  getItem(id: string): Item | undefined;
  getItemsByTag(tag: string): PermanentItem[];
}
```

### 5.4 添加新内容的 Workflow

**添加新事件**：

```bash
# 1. 编辑对应场景的 JSON 文件
vim public/data/events/act1.json

# 2. 在 events 数组中添加新事件对象
# 3. 保存文件
# 4. 刷新浏览器，新事件自动加载
```

**添加新道具**：

```bash
# 1. 编辑对应类型的 JSON 文件
vim public/data/items/permanents.json

# 2. 在 items 数组中添加新道具对象
# 3. 保存文件
# 4. 刷新浏览器，新道具自动加载
```

---

## 6. 模块划分与交付计划

### 6.1 模块划分

| 模块 | 内容 | 预估时间 | 依赖 |
|------|------|---------|------|
| **模块1** | 类型定义 + 工具函数 | 0.5天 | 无 |
| **模块2** | 数据加载系统 + 初始 JSON 数据 | 0.5天 | 模块1 |
| **模块3** | 角色系统 + 物品系统 | 1天 | 模块1, 2 |
| **模块4** | 事件系统 | 1天 | 模块1, 2, 3 |
| **模块5** | 场景系统 + 回合系统 | 1天 | 模块1, 2, 3, 4 |
| **模块6** | Zustand 状态层 | 0.5天 | 模块3, 4, 5 |
| **模块7** | UI 组件 | 1天 | 模块6 |
| **模块8** | 集成测试 | 0.5天 | 全部 |

### 6.2 各模块详细内容

**模块1：类型定义 + 工具函数**

```
src/
├── types/
│   ├── index.ts           # 核心类型导出
│   ├── game.ts            # GameState 相关
│   ├── character.ts       # 角色相关
│   ├── event.ts           # 事件相关
│   ├── item.ts            # 物品相关
│   └── scene.ts           # 场景相关
└── utils/
    ├── pure.ts            # 纯函数工具
    ├── id.ts              # ID 生成
    └── validation.ts      # 运行时验证
```

**模块2：数据加载系统 + 初始数据**

```
src/
└── systems/
    └── loader/
        └── DataLoader.ts

public/
└── data/
    ├── events/
    │   ├── act1.json      # 包含场景1核心事件
    │   ├── act2.json
    │   ├── act3.json
    │   └── random.json
    └── items/
        ├── consumables.json
        ├── permanents.json
        └── books.json
```

**模块3：角色系统 + 物品系统**

```
src/
└── systems/
    ├── character/
    │   └── CharacterSystem.ts
    └── item/
        └── ItemSystem.ts
```

**模块4：事件系统**

```
src/
└── systems/
    └── event/
        ├── EventSystem.ts
        └── conditions.ts    # 条件判断逻辑
```

**模块5：场景系统 + 回合系统**

```
src/
└── systems/
    ├── scene/
    │   └── SceneSystem.ts
    └── turn/
        └── TurnSystem.ts
```

**模块6：Zustand 状态层**

```
src/
└── store/
    ├── index.ts             # Store 定义
    ├── slices/
    │   ├── gameSlice.ts
    │   ├── characterSlice.ts
    │   └── sceneSlice.ts
    └── selectors/
        └── index.ts
```

**模块7：UI 组件**

```
src/
└── components/
    ├── primitives/          # Button, Card, ProgressBar...
    ├── modules/             # EventCard, AttributePanel...
    ├── containers/          # EventPanel, CharacterPanel...
    └── pages/               # StartPage, GamePage, EndingPage...
```

### 6.3 接口契约（模块间交互）

**模块3（角色/物品系统）输出**：

```typescript
// CharacterSystem 提供的接口
interface CharacterAPI {
  createNewCharacter: (name: string) => CharacterData;
  modifyAttribute: (state: GameState, attr: string, delta: number) => GameState;
  modifyResource: (state: GameState, resource: string, delta: number) => GameState;
  checkTerminalState: (state: GameState) => GameState;
}

// ItemSystem 提供的接口
interface ItemAPI {
  addItem: (state: GameState, itemId: string, count?: number) => GameState;
  removeItem: (state: GameState, itemId: string, count?: number) => GameState;
  getMatchingItems: (state: GameState, slot: ItemSlot) => PermanentItem[];
}
```

**模块4（事件系统）输出**：

```typescript
interface EventAPI {
  drawRandomEvent: (state: GameState) => GameEvent | null;
  getAvailableFixedEvents: (state: GameState) => GameEvent[];
  executeEvent: (
    state: GameState,
    eventId: string,
    choiceId: string,
    slotSelections?: Record<string, string>
  ) => GameState;
}
```

**模块5（场景/回合系统）输出**：

```typescript
interface SceneAPI {
  transitionScene: (state: GameState, target: SceneId, method?: string) => GameState;
  calculateLivingCost: (state: GameState) => number;
  addDebuff: (state: GameState, debuff: EnvironmentalDebuff) => GameState;
  updateDebuffs: (state: GameState) => GameState;
}

interface TurnAPI {
  phaseTurnStart: (state: GameState) => GameState;
  phaseTurnEnd: (state: GameState) => GameState;
}
```

---

## 7. 关键设计决策

### 7.1 为什么选择 Zustand 而非 Context

| Context 问题 | Zustand 方案 |
|-------------|--------------|
| 多 Context 导致重渲染 | 单一 Store，细粒度订阅 |
| value 引用变化引发不必要更新 | Selector 模式，只订阅需要的字段 |
| 异步逻辑分散在各组件 | 集中在 Store actions 中 |
| 调试困难 | 内置 DevTools 支持 |

### 7.2 为什么是 JSON 冷加载而非运行时编辑

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| JSON 冷加载 | 简单、无运行时开销、版本控制友好 | 需刷新生效 | ✅ 选中 |
| 运行时编辑 + 持久化 | 即时生效、可游戏内修改 | 复杂、需验证和迁移逻辑 | ❌ 暂不 |
| TypeScript 硬编码 | 类型安全、编译时检查 | 需重新构建、非技术用户难修改 | ❌ 不选 |

### 7.3 为什么系统层用 Class 而非纯函数对象

实际设计是 **Namespace 下的纯函数**，非 Class 实例：

```typescript
// 实际实现（纯函数）
export const CharacterSystem = {
  createNewCharacter(name: string): CharacterData { ... },
  modifyAttribute(state: GameState, ...): GameState { ... },
};

// 非 Class 实例（避免 new 和 this 问题）
// 这样所有函数都是纯函数，无副作用，易于测试
```

### 7.4 状态变更的可追溯性

所有状态变更都通过 System 函数完成，可添加中间件记录日志：

```typescript
// 可添加的中间件
const logMiddleware = (fn: Function) => (state: GameState, ...args: any[]) => {
  console.log('Before:', state);
  const newState = fn(state, ...args);
  console.log('After:', newState);
  return newState;
};
```

### 7.5 存档结构

```typescript
interface SaveData {
  version: string;
  savedAt: number;
  state: GameState;  // 直接序列化整个 GameState
}

// 保存：JSON.stringify(saveData)
// 加载：JSON.parse(data) + 版本迁移（如有需要）
```

---

## 7. 开发工具（DevTools）

> **重要**：本章节的工具仅在开发模式下可用（`import.meta.env.DEV === true`），不会打包到生产环境。

### 7.1 Web 仪表盘（Event Dashboard）

为简化事件数据的可视化管理和调试，需要开发一个开发专用的 Web 仪表盘。

#### 7.1.1 访问方式

```
开发服务器启动后：
http://localhost:5173/__devtools/dashboard

或在游戏内按 `~` 键（反引号）调出 DevTools 悬浮窗，点击"打开仪表盘"
```

#### 7.1.2 核心功能模块

**模块1：事件关系图谱（Event Graph）**

```typescript
interface EventGraphProps {
  // 功能要求
  features: {
    showChainConnections: boolean;    // 显示事件链连接（CHAIN -> nextEventId）
    showUnlockConditions: boolean;    // 显示解锁条件（requiredFlags）
    showSceneBoundaries: boolean;     // 按场景分色显示
    filterByCategory: EventCategory[]; // 按类型筛选
    searchById: string;               // 按ID搜索高亮
  };
  
  // 交互
  interactions: {
    clickToViewDetails: boolean;      // 点击查看事件详情
    dragToPan: boolean;               // 拖拽平移画布
    scrollToZoom: boolean;            // 滚轮缩放
    doubleClickToOpenJson: boolean;   // 双击打开对应 JSON 文件
  };
}
```

展示效果示例：
```
┌──────────────────────────────────────────────────────────┐
│  [🔍 搜索事件...]  [场景: 全部 ▼]  [类型: 全部 ▼]          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│    ┌──────────┐         ┌──────────┐                    │
│    │act1_work_│────────▶│act1_train│                    │
│    │warehouse │ unlocks │ _gym     │                    │
│    │ (FIXED)  │         │ (FIXED)  │                    │
│    └──────────┘         └──────────┘                    │
│          │                                              │
│          │ triggers (cooldown: 3)                       │
│          ▼                                              │
│    ┌──────────┐                                         │
│    │rand1_    │ (RANDOM)                                │
│    │back_pain │                                         │
│    └──────────┘                                         │
│                                                          │
│  图例: 🟦 FIXED  🟨 RANDOM  🟩 CHAIN  🟥 POLICY_PRESSURE │
└──────────────────────────────────────────────────────────┘
```

**模块2：数值平衡面板（Balance Panel）**

```typescript
interface BalancePanelProps {
  // 对比维度
  comparisons: {
    workEvents: {                     // 打工事件对比
      showIncomePerActionPoint: boolean;
      showHealthCostPerIncome: boolean;
      showMentalCostPerIncome: boolean;
      highlightOutliers: boolean;     // 高亮异常值（偏离均值>30%）
    };
    
    livingCosts: {                    // 生活成本对比
      showByLodgingType: boolean;     // 按住宿类型分组
      showByTransportType: boolean;   // 按出行类型分组
      inflationImpact: boolean;       // 模拟通胀影响
    };
    
    debtOptions: {                    // 借贷选项对比
      showTotalCost: boolean;         // 显示总成本（本金+利息）
      showPerTurnBurden: boolean;     // 显示每期负担
      compareAcrossScenes: boolean;   // 跨场景对比
    };
  };
}
```

展示效果示例：
```
┌──────────────────────────────────────────────────────────┐
│              场景3打工事件性价比分析                      │
├──────────────┬────────┬────────┬────────┬───────────────┤
│ 事件          │ 时薪   │ 健康/AP│ 心理/AP│ 评级          │
├──────────────┼────────┼────────┼────────┼───────────────┤
│ 洗碗工        │ $20    │ -4     │ -2     │ ★★★☆          │
│ 装修队        │ $50 ⚠️ │ -5     │ -3     │ ★★☆☆ (高风险)  │
│ 送外卖        │ $27    │ -2.5   │ -1.5   │ ★★★★ ✓ 推荐    │
│ 开Uber       │ $40    │ -1.5   │ -1     │ ★★★★★ 最优     │
└──────────────┴────────┴────────┴────────┴───────────────┘

┌──────────────────────────────────────────────────────────┐
│              生活成本压力测试                             │
├──────────────┬────────┬────────┬────────┬───────────────┤
│ 配置          │ 食品   │ 住宿   │ 出行   │ 总计/月       │
├──────────────┼────────┼────────┼────────┼───────────────┤
│ 基础配置      │ $400   │ $600   │ $100   │ $1,100        │
│ +20%通胀      │ $480   │ $720   │ $120   │ $1,320 ⚠️     │
│ 最差(收容所)  │ $400   │ $0     │ $50    │ $450 +露宿惩罚│
└──────────────┴────────┴────────┴────────┴───────────────┘
```

**模块3：事件沙盒测试器（Event Sandbox）**

```typescript
interface EventSandboxProps {
  // 状态设置
  initialState: {
    editable: boolean;
    presets: GameStatePreset[];       // 预设状态（新手/中期/濒死等）
    customValues: {                   // 可自定义的数值
      money: number;
      health: number;
      mental: number;
      actionPoints: number;
      attributes: Attributes;
      inventory: string[];            // 道具ID列表
      flags: string[];                // 状态标记
    };
  };
  
  // 测试执行
  execution: {
    selectEvent: string;              // 选择要测试的事件ID
    selectChoice: string;             // 选择选项（可选）
    runSimulation: () => SimulationResult;
    showStepByStep: boolean;          // 逐步显示效果
    compareBeforeAfter: boolean;      // 对比执行前后状态
  };
  
  // 结果展示
  results: {
    stateChanges: StateDiff;          // 状态变化对比
    triggeredEvents: string[];        // 触发的后续事件
    narrativePreview: string;         // 文案预览
    warnings: string[];               // 警告（如可能导致死亡）
  };
}
```

展示效果示例：
```
┌──────────────────────────────────────────────────────────┐
│  [选择事件: act3_underground_loan ▼]  [🚀 运行测试]        │
├──────────────────────────────────────────────────────────┤
│  初始状态 (可编辑):                                       │
│  现金: [$200]  健康: [80]  心理: [70]  行动点: [5]         │
│  已有债务: [0]  标记: []                                  │
├──────────────────────────────────────────────────────────┤
│  执行结果:                                                │
│  ─────────────────────────────────────────────────────  │
│  你看到了什么:                                            │
│  "老乡介绍的财务公司位于一栋老旧写字楼的地下室..."          │
│                                                           │
│  可选行动:                                                │
│  1. 借$500  → 现金+500, 新增债务(每期$55)                 │
│  2. 借$1000 → 现金+1000, 新增债务(每期$130)               │
│  3. 算了    → 无变化                                      │
│                                                           │
│  [选择选项1] [查看状态变化]                                │
├──────────────────────────────────────────────────────────┤
│  状态变化对比:                                            │
│  现金: $200 → $700 (+$500) ✓                              │
│  债务: 0 → 1 (每期还款$55，共10期)                        │
│  风险: 若收入<$1100/月，可能违约                           │
└──────────────────────────────────────────────────────────┘
```

**模块4：事件索引浏览器（Event Browser）**

```typescript
interface EventBrowserProps {
  // 数据源
  dataSource: {
    events: GameEvent[];              // 所有事件
    items: Item[];                    // 所有道具
    scenes: SceneConfig[];            // 场景配置
  };
  
  // 搜索筛选
  filters: {
    searchById: string;
    searchByName: string;
    filterByScene: SceneId[];
    filterByCategory: EventCategory[];
    filterByTags: string[];
  };
  
  // 快速操作
  actions: {
    viewJson: (eventId: string) => void;      // 查看原始JSON
    editInVSCode: (eventId: string) => void;  // 在VS Code中打开
    copyToClipboard: (eventId: string) => void;
    validateEvent: (eventId: string) => ValidationResult;
  };
}
```

#### 7.1.3 技术实现要求

```typescript
// 开发工具入口组件
// src/devtools/Dashboard.tsx

export function DevDashboard() {
  // 仅在开发模式渲染
  if (import.meta.env.PROD) {
    return <Navigate to="/" />;
  }
  
  return (
    <div className="dev-dashboard">
      <header>
        <h1>《去美国》开发仪表盘</h1>
        <span className="badge">DEV MODE ONLY</span>
      </header>
      
      <nav>
        <Tab id="graph" label="事件图谱" />
        <Tab id="balance" label="数值平衡" />
        <Tab id="sandbox" label="事件沙盒" />
        <Tab id="browser" label="事件索引" />
      </nav>
      
      <main>
        <EventGraphPanel />
        <BalancePanel />
        <EventSandbox />
        <EventBrowser />
      </main>
    </div>
  );
}
```

**路由配置**：
```typescript
// src/router.tsx
import { DevDashboard } from './devtools/Dashboard';

// 开发模式路由
const devRoutes = import.meta.env.DEV ? [
  { path: '/__devtools/dashboard', component: DevDashboard },
] : [];
```

**数据加载**：
```typescript
// 直接读取 public/data 下的 JSON 文件
// 使用 fetch 热重载，无需重启服务器

async function loadEvents(): Promise<GameEvent[]> {
  const response = await fetch('/data/events/act1.json');
  const data = await response.json();
  return data.events;
}
```

#### 7.1.4 使用场景

| 场景 | 使用工具 | 操作 |
|------|---------|------|
| 设计新事件链 | 事件图谱 | 验证链的完整性，检查是否有断链 |
| 调整数值平衡 | 数值平衡面板 | 对比同类事件，确保收益/风险比例合理 |
| 测试极端情况 | 事件沙盒 | 模拟濒死/贫困状态，测试事件是否会导致意外死亡 |
| 查找相似事件 | 事件索引 | 按标签/场景筛选，避免重复设计 |
| 验证 JSON 语法 | 事件索引 | 自动验证并提示错误位置和原因 |

---

### 7.2 开发者控制台（Dev Console）

轻量级命令行工具，用于快速修改游戏状态和触发事件，作为 Web 仪表盘的补充。

#### 7.2.1 访问方式

```
方式1：游戏内按 `~` 键调出 DevTools 悬浮窗，切换到"控制台"标签
方式2：直接访问 http://localhost:5173/__devtools/console
```

#### 7.2.2 指令系统

**指令格式**：`/command [subcommand] [arguments]`

##### 资源修改指令

```typescript
// 修改基础资源
/set <resource> <value>

// 示例
/set money 1000           // 设置现金为 $1000
/set money +500           // 增加 $500
/set money -200           // 减少 $200
/set health 80            // 设置健康度为 80
/set mental 60            // 设置心理度为 60
/set actionPoints 5       // 设置行动点为 5

// 修改属性（0-20范围）
/set attribute physique 12    // 设置体魄为 12
/set attribute english 8      // 设置英语为 8
```

##### 场景切换指令

```typescript
// 快速切换场景
/scene <sceneId>

// 示例
/scene act1       // 切换到场景1（重置场景状态）
/scene act2       // 切换到场景2
/scene act3       // 切换到场景3

// 带继承的切换（保留当前资源）
/scene act3 --carry-over
```

##### 事件触发指令

```typescript
// 触发特定事件
/event <eventId> [choiceId]

// 示例
/event act3_underground_loan           // 触发地下钱庄事件
/event act3_underground_loan choice_1  // 直接选择选项1
/event rand2_storm                     // 触发随机事件（无视条件）

// 触发带预设状态的事件（用于测试边界）
/event act3_underground_loan --preset bankrupt
```

##### 道具管理指令

```typescript
// 添加道具
/give <itemId> [count]

// 示例
/give food_supply 5           // 添加5份食物补给
/give perm_vehicle_ebike      // 添加电动车
/give all                     // 添加所有道具（调试用）

// 移除道具
/remove <itemId> [count]

// 示例
/remove perm_vehicle_ebike    // 移除电动车
/remove all                   // 移除所有道具

// 列出所有道具
/list items
/list items --tag transport   // 列出交通工具类道具
```

##### 债务管理指令

```typescript
// 添加债务
/debt add <principal> <interestRate> <turns> [lenderName]

// 示例
/debt add 500 0.3 10          // 借$500，利率30%，10期还清
/debt add 1000 0.5 5 "张哥"    // 借$1000，利率50%，5期，债主张哥

// 清偿债务
/debt clear                   // 清除所有债务
/debt clear <debtId>          // 清除特定债务

// 查看债务
/debt list                    // 列出所有债务
```

##### 状态标记指令

```typescript
// 设置标记
/flag set <flagName> [value]

// 示例
/flag set gap_discovered true           // 设置缺口已发现
/flag set visa_expired                  // 设置签证过期（布尔值默认真）
/flag set debt_default_count 2          // 设置违约次数为2

// 移除标记
/flag remove <flagName>

// 示例
/flag remove gap_discovered

// 列出所有标记
/flag list
```

##### 检查点指令

```typescript
// 保存检查点
/save <checkpointName>

// 示例
/save before_test             // 保存当前状态为"before_test"
/save initial_state           // 保存初始状态

// 加载检查点
/load <checkpointName>

// 示例
/load before_test             // 恢复到"before_test"状态

// 列出所有检查点
/checkpoints

// 删除检查点
/delete <checkpointName>
```

##### 信息查询指令

```typescript
// 查看当前状态
/status                       // 显示所有资源、属性、标记概要
/status --full                // 显示完整状态（包括债务、道具详情）

// 查看事件信息
/info event <eventId>         // 显示事件详情
/info event --all             // 列出所有事件ID

// 查看可用指令帮助
/help                         // 显示所有指令
/help set                     // 显示 /set 指令详细说明
```

#### 7.2.3 控制台界面

```
┌──────────────────────────────────────────────────────────┐
│  🛠️ DevTools                                    [—] [×]  │
├──────────────────────────────────────────────────────────┤
│  [仪表盘] [控制台] [日志] [状态]                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  > set money 1000                                       │
│  ✓ 现金已设置为 $1000                                    │
│                                                          │
│  > scene act3                                           │
│  ✓ 场景已切换到 act3                                     │
│  ⚠ 警告：场景切换清空了常驻道具栏                         │
│                                                          │
│  > event act3_underground_loan                          │
│  ✓ 事件已触发：地下钱庄借款                              │
│  可用选项：                                              │
│    1. 借$500 (每期$55)                                   │
│    2. 借$1000 (每期$130)                                 │
│    3. 算了                                               │
│                                                          │
│  > debt add 500 0.3 10                                  │
│  ✓ 已添加债务：本金$500，利率30%，10期，每期$65           │
│                                                          │
│  > status                                               │
│  📊 当前状态：                                           │
│    现金: $1000 | 健康: 80 | 心理: 70 | 行动点: 3/5      │
│    场景: act3 | 回合: 15                                │
│    债务: 1笔 (每期$65)                                   │
│    标记: gap_discovered, visa_expired                   │
│                                                          │
│  > _                                                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### 7.2.4 技术实现

```typescript
// src/devtools/Console.tsx

interface ConsoleCommand {
  name: string;
  description: string;
  usage: string;
  examples: string[];
  execute: (args: string[]) => CommandResult;
}

// 指令注册中心
class ConsoleCommandRegistry {
  private commands: Map<string, ConsoleCommand> = new Map();
  
  register(command: ConsoleCommand) {
    this.commands.set(command.name, command);
  }
  
  execute(input: string): CommandResult {
    const [cmd, ...args] = input.trim().split(/\s+/);
    
    if (!cmd.startsWith('/')) {
      return { success: false, error: '指令必须以 / 开头' };
    }
    
    const commandName = cmd.slice(1); // 去掉开头的 /
    const command = this.commands.get(commandName);
    
    if (!command) {
      return { success: false, error: `未知指令: ${commandName}，输入 /help 查看可用指令` };
    }
    
    return command.execute(args);
  }
}

// 使用示例
const console = new ConsoleCommandRegistry();

console.register({
  name: 'set',
  description: '修改游戏资源或属性',
  usage: '/set <resource> <value>',
  examples: ['/set money 1000', '/set health +20'],
  execute: (args) => {
    const [resource, value] = args;
    // 修改游戏状态...
    return { success: true, message: `${resource} 已设置为 ${value}` };
  }
});
```

**快捷键支持**：
```typescript
// 上下箭头切换历史指令
// Tab 自动补全
// Ctrl+L 清屏
// Ctrl+C 取消当前输入
```

#### 7.2.5 与仪表盘的协作

| 操作 | 推荐工具 | 原因 |
|------|---------|------|
| 快速修改资源 | **控制台** | 输入 `/set money 1000` 比打开面板点击更快 |
| 查看事件关系 | **仪表盘** | 可视化图谱比指令列表更直观 |
| 测试极端状态 | **控制台** | `/save` `/load` 检查点比手动重置高效 |
| 对比数值平衡 | **仪表盘** | 表格对比比指令输出更易读 |
| 触发特定事件 | **控制台** | `/event` 一步直达，仪表盘需要多步操作 |

---

## 附录：待确认事项

1. **自定义角色创建**：是否需要属性点分配界面？还是固定初始值？
2. **事件编辑器**：未来是否需要游戏内编辑器，还是手动编辑 JSON 足够？
3. **存档版本迁移**：当数据格式升级时，是否需要自动迁移旧存档？
4. **多语言支持**：是否需要预留 i18n 架构？

---

*文档版本：v1.0*
*最后更新：2026-02-28*
