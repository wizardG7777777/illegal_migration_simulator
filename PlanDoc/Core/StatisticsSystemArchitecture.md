# 统计系统架构设计

## 1. 概述

本文档定义《去美国》游戏的核心统计系统架构，包含统计分类、数据收集机制、持久化存储、以及与其他系统的集成规范。

统计系统的主要职责：
- **数据收集**：在游戏过程中自动收集各类统计数据
- **结局支持**：为结局系统提供完整的游戏历程数据
- **多周目支持**：聚合跨游戏周期的累计统计，支持成就系统
- **性能优化**：最小化运行时开销，采用惰性统计策略

---

## 2. 统计分类体系

### 2.1 统计数据结构

```typescript
interface GameStatistics {
  // 元数据
  metadata: StatisticsMetadata;
  
  // 五大统计类别
  basic: BasicStatistics;        // 基础统计
  economy: EconomyStatistics;    // 经济统计
  events: EventStatistics;       // 事件统计
  endings: EndingStatistics;     // 结局统计
  character: CharacterStatistics; // 角色统计
}

interface StatisticsMetadata {
  version: number;               // 统计数据结构版本
  gameId: string;                // 游戏唯一ID
  startTime: number;             // 游戏开始时间戳
  lastUpdate: number;            // 最后更新时间
  saveSlot?: number;             // 存档槽位（如果有）
}
```

### 2.2 基础统计（Basic Statistics）

```typescript
interface BasicStatistics {
  // 回合统计
  turns: {
    total: number;               // 总回合数
    byScene: {                   // 分场景回合数
      act1: number;
      act2: number;
      act3: number;
    };
    longestScene: string;        // 耗时最长的场景
  };
  
  // 时间统计
  time: {
    totalPlayTime: number;       // 总游戏时长（秒）
    realTimeElapsed: number;     // 现实时间流逝（秒）
    sessionCount: number;        // 游戏会话次数
    lastSessionDuration: number; // 上次会话时长
  };
  
  // 场景经历
  scenes: {
    visited: string[];           // 经历过的场景列表
    transitions: SceneTransition[]; // 场景切换记录
  };
  
  // 存档统计
  saves: {
    manualSaveCount: number;     // 手动存档次数
    autoSaveCount: number;       // 自动存档次数
    loadCount: number;           // 读档次数
  };
}

interface SceneTransition {
  from: string;                  // 来源场景
  to: string;                    // 目标场景
  turn: number;                  // 切换时的总回合数
  timestamp: number;             // 切换时间戳
  method: 'NORMAL' | 'DEATH_SKIP' | 'EVENT_TRIGGER'; // 切换方式
}
```

### 2.3 经济统计（Economy Statistics）

```typescript
interface EconomyStatistics {
  // 人民币统计（场景1）
  cny: CurrencyStatistics;
  
  // 美元统计（场景2、3）
  usd: CurrencyStatistics;
  
  // 货币兑换
  exchange: {
    count: number;               // 兑换次数
    totalCNYToUSD: number;       // 累计兑换人民币
    totalUSDFromExchange: number; // 累计获得美元
    worstRate: number;           // 最差汇率
    bestRate: number;            // 最优汇率
  };
  
  // 通胀经历
  inflation: {
    experienced: boolean;        // 是否经历过通胀
    count: number;               // 通胀事件次数
    maxIntensity: number;        // 经历的最高强度
    byType: {                    // 分类型通胀
      food: number;              // 食品通胀次数
      lodging: number;           // 住宿通胀次数
      transport: number;         // 出行通胀次数
    };
    totalInflationRounds: number; // 处于通胀状态的总回合数
  };
  
  // 生活成本
  livingCost: {
    totalFoodCost: number;       // 累计食品支出
    totalLodgingCost: number;    // 累计住宿支出
    totalTransportCost: number;  // 累计出行支出
    highestMonthlyCost: number;  // 最高单月支出
  };
}

interface CurrencyStatistics {
  // 收入
  income: {
    total: number;               // 总收入
    bySource: Map<string, number>; // 按来源统计（事件ID → 金额）
    largestSingle: number;       // 最大单笔收入
    workCount: number;           // 打工次数
  };
  
  // 支出
  expense: {
    total: number;               // 总支出
    byCategory: {                // 按类别统计
      item: number;              // 购买道具
      service: number;           // 服务费用
      living: number;            // 生活成本
      penalty: number;           // 罚款/损失
      other: number;             // 其他
    };
    largestSingle: number;       // 最大单笔支出
  };
  
  // 资源极值
  extremes: {
    maxHeld: number;             // 持有过的最大值
    minHeld: number;             // 持有过的最小值（可为负）
    brokeCount: number;          // 归零次数
  };
  
  // 波动记录
  volatility: {
    incomeSpikeCount: number;    // 收入激增次数（+50%以上）
    expenseSpikeCount: number;   // 支出激增次数
  };
}
```

### 2.4 事件统计（Event Statistics）

```typescript
interface EventStatistics {
  // 事件完成统计
  completed: {
    total: number;               // 完成事件总数
    byCategory: {                // 按事件分类
      random: number;            // 随机事件
      fixed: number;             // 固定事件
      chain: number;             // 事件链节点
      policy: number;            // 政策压力事件
    };
    byScene: Map<string, number>; // 分场景统计
    uniqueEvents: string[];      // 完成过的独特事件ID列表
  };
  
  // 事件链统计
  chains: {
    started: number;             // 启动的事件链数
    completed: number;           // 完成的事件链数
    aborted: number;             // 放弃的事件链数
    byChainId: Map<string, ChainStats>; // 各链详细统计
  };
  
  // 死亡与重试
  deaths: {
    count: number;               // 死亡次数
    byCause: {                   // 按死因分类
      dying: number;             // 濒死终结
      breakdown: number;         // 崩溃终结
      destitution: number;       // 匮乏致死
      randomEvent: number;       // 随机事件致死
    };
    turnAtDeath: number[];       // 每次死亡时的回合数
  };
  
  // 重试统计
  retries: {
    retryCount: number;          // 重试次数
    sameSceneRetry: number;      // 同场景重试
    differentApproach: number;   // 改变策略重试
  };
  
  // 选择偏好
  choices: {
    safeChoiceCount: number;     // 安全选项选择次数
    riskyChoiceCount: number;    // 风险选项选择次数
    creativeChoiceCount: number; // 创造性选项选择次数
  };
}

interface ChainStats {
  chainId: string;
  started: boolean;
  completed: boolean;
  currentNode: string | null;
  completedNodes: string[];
  startTurn: number;
  endTurn: number | null;
}
```

### 2.5 结局统计（Ending Statistics）

```typescript
interface EndingStatistics {
  // 本局结局
  current: {
    endingId: string | null;     // 当前结局ID
    endingType: EndingType | null; // 结局类型
    isFirstTime: boolean;        // 是否首次解锁
    turnReached: number;         // 达成回合
  };
  
  // 历史结局（跨存档聚合）
  history: {
    unlocked: string[];          // 已解锁结局ID列表
    unlockOrder: string[];       // 解锁顺序
    countByEnding: Map<string, number>; // 各结局达成次数
    mostCommon: string | null;   // 最常达成结局
    rarestUnlocked: string | null; // 最稀有已解锁结局
  };
  
  // 结局路径
  paths: {
    commonPath: string[];        // 最常走的路径（场景序列）
    fastestEnding: {             // 最快达成记录
      endingId: string;
      turns: number;
    } | null;
    slowestEnding: {             // 最慢达成记录
      endingId: string;
      turns: number;
    } | null;
  };
}

type EndingType = 
  | 'SUCCESS_GREEN_CARD'      // 成功获得绿卡
  | 'SUCCESS_ASYLUM'          // 庇护通过
  | 'DEATH'                   // 死亡
  | 'SUICIDE'                 // 自杀/崩溃
  | 'DEPORTATION'             // 遣返
  | 'GIVE_UP'                 // 主动放弃
  | 'NEUTRAL'                 // 中立结局
  | 'SECRET';                 // 隐藏结局
```

### 2.6 角色统计（Character Statistics）

```typescript
interface CharacterStatistics {
  // 属性统计
  attributes: {
    final: Attributes;           // 最终属性值
    maxReached: Attributes;      // 达到过的最高值
    minReached: Attributes;      // 达到过的最低值
    growth: {                    // 属性成长统计
      [K in keyof Attributes]: {
        gained: number;          // 总获得
        lost: number;            // 总失去
        netChange: number;       // 净变化
      }
    };
  };
  
  // 资源极值
  resources: {
    health: ResourceExtremes;
    mental: ResourceExtremes;
    moneyCNY: ResourceExtremes;
    moneyUSD: ResourceExtremes;
    actionPoints: ResourceExtremes;
  };
  
  // 终结态经历
  terminalStates: {
    dying: TerminalStateStats;
    breakdown: TerminalStateStats;
    destitution: TerminalStateStats;
  };
  
  // 里程碑
  milestones: {
    reached: string[];           // 达成的里程碑ID
    attributeMilestones: {       // 属性里程碑
      [K in keyof Attributes]: number[]; // 达到的值
    };
  };
}

interface ResourceExtremes {
  max: number;                   // 最大值
  min: number;                   // 最小值
  maxTurn: number;               // 最大值时的回合
  minTurn: number;               // 最小值时的回合
  zeroCount: number;             // 归零次数
}

interface TerminalStateStats {
  enteredCount: number;          // 进入次数
  escapedCount: number;          // 成功脱离次数
  deathByThis: number;           // 死于此终结态次数
  avgDuration: number;           // 平均持续回合
}
```

---

## 3. StatisticsManager 类设计

### 3.1 核心类定义

```typescript
class StatisticsManager {
  private statistics: GameStatistics;
  private sessionStartTime: number;
  private lastUpdateTime: number;
  private pendingUpdates: Map<string, any>; // 待写入的批量更新
  private isDirty: boolean;        // 是否有未保存的变更
  
  // 持久化回调
  private saveCallback: (stats: GameStatistics) => void;
  private loadCallback: () => GameStatistics | null;
  
  constructor(
    saveCallback: (stats: GameStatistics) => void,
    loadCallback: () => GameStatistics | null
  ) {
    this.saveCallback = saveCallback;
    this.loadCallback = loadCallback;
    this.sessionStartTime = Date.now();
    this.lastUpdateTime = this.sessionStartTime;
    this.pendingUpdates = new Map();
    this.isDirty = false;
  }
  
  /**
   * 初始化新游戏统计
   */
  initializeNewGame(gameId: string): void {
    const now = Date.now();
    this.statistics = {
      metadata: {
        version: 1,
        gameId,
        startTime: now,
        lastUpdate: now,
        sessionCount: 1
      },
      basic: this.createEmptyBasicStats(),
      economy: this.createEmptyEconomyStats(),
      events: this.createEmptyEventStats(),
      endings: this.createEmptyEndingStats(),
      character: this.createEmptyCharacterStats()
    };
    this.isDirty = true;
  }
  
  /**
   * 加载已有统计
   */
  loadStatistics(): boolean {
    const loaded = this.loadCallback();
    if (loaded) {
      this.statistics = loaded;
      this.statistics.metadata.sessionCount++;
      this.sessionStartTime = Date.now();
      this.isDirty = true;
      return true;
    }
    return false;
  }
  
  /**
   * 获取完整统计数据（用于结局展示）
   */
  getFullStatistics(): GameStatistics {
    this.flushTimeStats(); // 确保时间统计最新
    return { ...this.statistics };
  }
  
  /**
   * 保存统计到存储
   */
  save(): void {
    if (!this.isDirty) return;
    
    this.flushTimeStats();
    this.statistics.metadata.lastUpdate = Date.now();
    this.saveCallback(this.statistics);
    this.isDirty = false;
  }
  
  /**
   * 批量更新：标记待保存
   */
  private markDirty(): void {
    this.isDirty = true;
  }
}
```

### 3.2 统计收集方法

```typescript
class StatisticsManager {
  // ==================== 回合统计 ====================
  
  /**
   * 回合结束统计
   */
  recordTurnEnd(sceneId: string, resources: Resources): void {
    this.statistics.basic.turns.total++;
    this.statistics.basic.turns.byScene[sceneId as keyof typeof this.statistics.basic.turns.byScene]++;
    
    // 记录资源极值
    this.updateResourceExtremes('health', resources.health.current);
    this.updateResourceExtremes('mental', resources.mental.current);
    this.updateResourceExtremes('moneyCNY', resources.money.cny);
    this.updateResourceExtremes('moneyUSD', resources.money.usd);
    
    this.markDirty();
  }
  
  /**
   * 场景切换统计
   */
  recordSceneTransition(
    fromScene: string,
    toScene: string,
    turn: number,
    method: SceneTransition['method']
  ): void {
    // 记录场景经历
    if (!this.statistics.basic.scenes.visited.includes(toScene)) {
      this.statistics.basic.scenes.visited.push(toScene);
    }
    
    // 记录切换
    this.statistics.basic.scenes.transitions.push({
      from: fromScene,
      to: toScene,
      turn,
      timestamp: Date.now(),
      method
    });
    
    this.markDirty();
  }
  
  // ==================== 经济统计 ====================
  
  /**
   * 记录收入
   */
  recordIncome(
    currency: 'CNY' | 'USD',
    amount: number,
    source: string
  ): void {
    const stats = currency === 'CNY' 
      ? this.statistics.economy.cny 
      : this.statistics.economy.usd;
    
    stats.income.total += amount;
    stats.income.workCount++;
    
    // 按来源统计
    const currentBySource = stats.income.bySource.get(source) || 0;
    stats.income.bySource.set(source, currentBySource + amount);
    
    // 极值更新
    if (amount > stats.income.largestSingle) {
      stats.income.largestSingle = amount;
    }
    
    this.markDirty();
  }
  
  /**
   * 记录支出
   */
  recordExpense(
    currency: 'CNY' | 'USD',
    amount: number,
    category: keyof CurrencyStatistics['expense']['byCategory']
  ): void {
    const stats = currency === 'CNY' 
      ? this.statistics.economy.cny 
      : this.statistics.economy.usd;
    
    stats.expense.total += amount;
    stats.expense.byCategory[category] += amount;
    
    if (amount > stats.expense.largestSingle) {
      stats.expense.largestSingle = amount;
    }
    
    this.markDirty();
  }
  
  /**
   * 记录生活成本支出
   */
  recordLivingCost(
    food: number,
    lodging: number,
    transport: number
  ): void {
    this.statistics.economy.livingCost.totalFoodCost += food;
    this.statistics.economy.livingCost.totalLodgingCost += lodging;
    this.statistics.economy.livingCost.totalTransportCost += transport;
    
    const monthlyTotal = food + lodging + transport;
    if (monthlyTotal > this.statistics.economy.livingCost.highestMonthlyCost) {
      this.statistics.economy.livingCost.highestMonthlyCost = monthlyTotal;
    }
    
    this.markDirty();
  }
  
  /**
   * 记录通胀事件
   */
  recordInflationEvent(
    intensity: number,
    type: 'food' | 'lodging' | 'transport'
  ): void {
    this.statistics.economy.inflation.experienced = true;
    this.statistics.economy.inflation.count++;
    this.statistics.economy.inflation.byType[type]++;
    
    if (intensity > this.statistics.economy.inflation.maxIntensity) {
      this.statistics.economy.inflation.maxIntensity = intensity;
    }
    
    this.markDirty();
  }
  
  // ==================== 事件统计 ====================
  
  /**
   * 记录事件完成
   */
  recordEventCompleted(
    eventId: string,
    category: 'random' | 'fixed' | 'chain' | 'policy',
    sceneId: string
  ): void {
    this.statistics.events.completed.total++;
    this.statistics.events.completed.byCategory[category]++;
    
    // 分场景统计
    const currentSceneCount = this.statistics.events.completed.byScene.get(sceneId) || 0;
    this.statistics.events.completed.byScene.set(sceneId, currentSceneCount + 1);
    
    // 独特事件
    if (!this.statistics.events.completed.uniqueEvents.includes(eventId)) {
      this.statistics.events.completed.uniqueEvents.push(eventId);
    }
    
    this.markDirty();
  }
  
  /**
   * 记录事件链进度
   */
  recordChainProgress(
    chainId: string,
    nodeId: string,
    action: 'START' | 'COMPLETE_NODE' | 'COMPLETE_CHAIN' | 'ABORT'
  ): void {
    let chainStats = this.statistics.events.chains.byChainId.get(chainId);
    
    if (!chainStats) {
      chainStats = {
        chainId,
        started: false,
        completed: false,
        currentNode: null,
        completedNodes: [],
        startTurn: 0,
        endTurn: null
      };
      this.statistics.events.chains.byChainId.set(chainId, chainStats);
    }
    
    switch (action) {
      case 'START':
        chainStats.started = true;
        chainStats.startTurn = this.statistics.basic.turns.total;
        this.statistics.events.chains.started++;
        break;
      case 'COMPLETE_NODE':
        chainStats.completedNodes.push(nodeId);
        chainStats.currentNode = nodeId;
        break;
      case 'COMPLETE_CHAIN':
        chainStats.completed = true;
        chainStats.endTurn = this.statistics.basic.turns.total;
        this.statistics.events.chains.completed++;
        break;
      case 'ABORT':
        this.statistics.events.chains.aborted++;
        break;
    }
    
    this.markDirty();
  }
  
  /**
   * 记录选择
   */
  recordChoice(choiceType: 'safe' | 'risky' | 'creative'): void {
    switch (choiceType) {
      case 'safe':
        this.statistics.events.choices.safeChoiceCount++;
        break;
      case 'risky':
        this.statistics.events.choices.riskyChoiceCount++;
        break;
      case 'creative':
        this.statistics.events.choices.creativeChoiceCount++;
        break;
    }
    this.markDirty();
  }
  
  // ==================== 结局统计 ====================
  
  /**
   * 记录结局达成
   */
  recordEnding(
    endingId: string,
    endingType: EndingType,
    isFirstTime: boolean,
    turn: number
  ): void {
    // 当前结局
    this.statistics.endings.current = {
      endingId,
      endingType,
      isFirstTime,
      turnReached: turn
    };
    
    // 历史记录
    if (!this.statistics.endings.history.unlocked.includes(endingId)) {
      this.statistics.endings.history.unlocked.push(endingId);
      this.statistics.endings.history.unlockOrder.push(endingId);
    }
    
    const currentCount = this.statistics.endings.history.countByEnding.get(endingId) || 0;
    this.statistics.endings.history.countByEnding.set(endingId, currentCount + 1);
    
    this.markDirty();
  }
  
  // ==================== 角色统计 ====================
  
  /**
   * 记录属性变化
   */
  recordAttributeChange(
    attr: keyof Attributes,
    oldValue: number,
    newValue: number
  ): void {
    const change = newValue - oldValue;
    
    if (change > 0) {
      this.statistics.character.attributes.growth[attr].gained += change;
    } else {
      this.statistics.character.attributes.growth[attr].lost += Math.abs(change);
    }
    this.statistics.character.attributes.growth[attr].netChange += change;
    
    // 极值更新
    if (newValue > this.statistics.character.attributes.maxReached[attr]) {
      this.statistics.character.attributes.maxReached[attr] = newValue;
    }
    if (newValue < this.statistics.character.attributes.minReached[attr]) {
      this.statistics.character.attributes.minReached[attr] = newValue;
    }
    
    this.markDirty();
  }
  
  /**
   * 记录终结态进入
   */
  recordTerminalStateEnter(type: 'dying' | 'breakdown' | 'destitution'): void {
    this.statistics.character.terminalStates[type].enteredCount++;
    this.markDirty();
  }
  
  /**
   * 记录终结态脱离
   */
  recordTerminalStateEscape(type: 'dying' | 'breakdown' | 'destitution'): void {
    this.statistics.character.terminalStates[type].escapedCount++;
    this.markDirty();
  }
  
  /**
   * 记录死亡
   */
  recordDeath(cause: keyof EventStatistics['deaths']['byCause'], turn: number): void {
    this.statistics.events.deaths.count++;
    this.statistics.events.deaths.byCause[cause]++;
    this.statistics.events.deaths.turnAtDeath.push(turn);
    this.markDirty();
  }
  
  // ==================== 存档统计 ====================
  
  recordManualSave(): void {
    this.statistics.basic.saves.manualSaveCount++;
    this.markDirty();
  }
  
  recordAutoSave(): void {
    this.statistics.basic.saves.autoSaveCount++;
    this.markDirty();
  }
  
  recordLoad(): void {
    this.statistics.basic.saves.loadCount++;
    this.markDirty();
  }
}
```

---

## 4. 统计收集触发点

### 4.1 触发点总览

```typescript
interface StatisticsTriggerPoints {
  // 回合相关
  turn: {
    onTurnStart: string[];       // 回合开始
    onTurnEnd: string[];         // 回合结束
  };
  
  // 事件相关
  event: {
    onEventStart: string[];      // 事件开始
    onEventComplete: string[];   // 事件完成
    onEventFailed: string[];     // 事件失败
  };
  
  // 场景相关
  scene: {
    onSceneEnter: string[];      // 进入场景
    onSceneExit: string[];       // 离开场景
  };
  
  // 结局相关
  ending: {
    onEndingTriggered: string[]; // 结局触发
    onEndingShown: string[];     // 结局展示
  };
  
  // 资源相关
  resource: {
    onMoneyChange: string[];     // 金钱变化
    onHealthChange: string[];    // 健康变化
    onMentalChange: string[];    // 心理变化
  };
  
  // 存档相关
  save: {
    onManualSave: string[];      // 手动存档
    onAutoSave: string[];        // 自动存档
    onLoad: string[];            // 读档
  };
}
```

### 4.2 游戏循环集成

```typescript
class GameLoop {
  private statisticsManager: StatisticsManager;
  
  constructor(statsManager: StatisticsManager) {
    this.statisticsManager = statsManager;
  }
  
  /**
   * 回合结束处理
   */
  async endTurn(): Promise<void> {
    const currentScene = this.getCurrentScene();
    const resources = this.getCurrentResources();
    
    // 统计收集
    this.statisticsManager.recordTurnEnd(currentScene, resources);
    
    // 检查终结态
    const terminalState = this.checkTerminalState();
    if (terminalState) {
      this.statisticsManager.recordTerminalStateEnter(
        this.mapTerminalType(terminalState.type)
      );
    }
    
    // 自动保存时包含统计
    if (this.shouldAutoSave()) {
      this.statisticsManager.recordAutoSave();
      this.saveGame();
    }
  }
  
  /**
   * 场景切换
   */
  transitionScene(fromScene: string, toScene: string): void {
    const turn = this.getCurrentTurn();
    
    this.statisticsManager.recordSceneTransition(
      fromScene,
      toScene,
      turn,
      'NORMAL'
    );
    
    // 保存统计
    this.statisticsManager.save();
  }
  
  /**
   * 事件完成
   */
  completeEvent(event: GameEvent, result: EventResult): void {
    // 记录事件完成
    this.statisticsManager.recordEventCompleted(
      event.id,
      this.mapEventCategory(event.category),
      this.getCurrentScene()
    );
    
    // 记录经济变化
    if (result.effects?.money) {
      if (result.effects.money.usd && result.effects.money.usd > 0) {
        this.statisticsManager.recordIncome('USD', result.effects.money.usd, event.id);
      }
      if (result.effects.money.cny && result.effects.money.cny > 0) {
        this.statisticsManager.recordIncome('CNY', result.effects.money.cny, event.id);
      }
    }
    
    // 记录选择偏好
    if (result.choiceType) {
      this.statisticsManager.recordChoice(result.choiceType);
    }
  }
  
  /**
   * 结局触发
   */
  triggerEnding(endingId: string, endingType: EndingType): void {
    const turn = this.getCurrentTurn();
    const isFirstTime = !this.hasUnlockedEnding(endingId);
    
    this.statisticsManager.recordEnding(endingId, endingType, isFirstTime, turn);
    
    // 生成结局统计报告
    const stats = this.statisticsManager.getFullStatistics();
    const report = this.generateEndingReport(stats);
    
    this.showEndingScreen(endingId, report);
  }
}
```

---

## 5. 与 SaveSystem 的集成

### 5.1 存档数据结构

```typescript
interface SaveData {
  version: number;
  slotId: number;
  timestamp: number;
  
  // 核心游戏数据
  character: CharacterSaveData;
  gameState: GameState;
  eventPool: EventPoolSaveData;
  
  // 统计数据（与游戏数据一起保存）
  statistics: GameStatistics;
}

interface GlobalSaveData {
  version: number;
  
  // 跨存档聚合统计
  aggregate: AggregateStatistics;
  
  // 各槽位存档的统计摘要
  slotSummaries: Map<number, SlotStatisticsSummary>;
  
  // 设置
  settings: {
    autoSaveEnabled: boolean;
    autoSaveInterval: number;
  };
}
```

### 5.2 SaveSystem 集成实现

```typescript
class SaveSystem {
  private statisticsManager: StatisticsManager;
  private storage: StorageAdapter;
  
  constructor(statsManager: StatisticsManager, storage: StorageAdapter) {
    this.statisticsManager = statsManager;
    this.storage = storage;
  }
  
  /**
   * 保存游戏（包含统计）
   */
  async saveGame(slotId: number): Promise<void> {
    // 1. 确保统计最新
    this.statisticsManager.save();
    
    // 2. 构建存档数据
    const saveData: SaveData = {
      version: 1,
      slotId,
      timestamp: Date.now(),
      character: this.serializeCharacter(),
      gameState: this.serializeGameState(),
      eventPool: this.serializeEventPool(),
      statistics: this.statisticsManager.getFullStatistics()
    };
    
    // 3. 保存到存储
    await this.storage.save(`save_${slotId}`, saveData);
    
    // 4. 更新全局统计
    await this.updateGlobalStatistics(slotId, saveData.statistics);
  }
  
  /**
   * 加载游戏（恢复统计）
   */
  async loadGame(slotId: number): Promise<boolean> {
    const saveData = await this.storage.load<SaveData>(`save_${slotId}`);
    
    if (!saveData) {
      return false;
    }
    
    // 1. 恢复游戏状态
    this.deserializeCharacter(saveData.character);
    this.deserializeGameState(saveData.gameState);
    this.deserializeEventPool(saveData.eventPool);
    
    // 2. 恢复统计
    this.statisticsManager.loadFromData(saveData.statistics);
    this.statisticsManager.recordLoad();
    
    return true;
  }
  
  /**
   * 更新全局聚合统计
   */
  private async updateGlobalStatistics(
    slotId: number,
    stats: GameStatistics
  ): Promise<void> {
    const global = await this.loadGlobalData();
    
    // 更新槽位摘要
    global.slotSummaries.set(slotId, this.createSlotSummary(stats));
    
    // 聚合到全局统计
    this.aggregateStatistics(global.aggregate, stats);
    
    await this.storage.save('global', global);
  }
  
  /**
   * 聚合统计
   */
  private aggregateStatistics(
    aggregate: AggregateStatistics,
    stats: GameStatistics
  ): void {
    // 总游戏次数
    aggregate.totalGames++;
    
    // 累计游戏时间
    aggregate.totalPlayTime += stats.basic.time.totalPlayTime;
    
    // 结局统计
    if (stats.endings.current.endingId) {
      const currentCount = aggregate.endingCounts.get(stats.endings.current.endingId) || 0;
      aggregate.endingCounts.set(stats.endings.current.endingId, currentCount + 1);
    }
    
    // 死亡统计
    aggregate.totalDeaths += stats.events.deaths.count;
    
    // 解锁结局合并
    for (const endingId of stats.endings.history.unlocked) {
      if (!aggregate.unlockedEndings.includes(endingId)) {
        aggregate.unlockedEndings.push(endingId);
      }
    }
    
    // 更新最常达成结局
    this.updateMostCommonEnding(aggregate);
  }
}
```

### 5.3 跨周目聚合统计

```typescript
interface AggregateStatistics {
  // 基础聚合
  totalGames: number;            // 总游戏次数
  totalPlayTime: number;         // 累计游戏时间
  totalDeaths: number;           // 累计死亡次数
  
  // 结局聚合
  endingCounts: Map<string, number>; // 各结局达成次数
  unlockedEndings: string[];     // 所有已解锁结局
  mostCommonEnding: string | null; // 最常达成结局
  rarestEndingUnlocked: string | null; // 最稀有已解锁结局
  
  // 最佳记录
  records: {
    fastestWin: {                // 最快通关
      endingId: string;
      turns: number;
      timestamp: number;
    } | null;
    maxMoneyUSD: number;         // 最高美元持有
    maxMoneyCNY: number;         // 最高人民币持有
    longestRun: number;          // 最长回合数
  };
  
  // 成就进度
  achievements: {
    unlocked: string[];          // 已解锁成就
    progress: Map<string, number>; // 成就进度
  };
}

class AggregateManager {
  private aggregate: AggregateStatistics;
  
  /**
   * 检查并解锁成就
   */
  checkAchievements(stats: GameStatistics): string[] {
    const newlyUnlocked: string[] = [];
    
    // 结局类成就
    if (stats.endings.current.endingType === 'SUCCESS_GREEN_CARD') {
      this.unlockAchievement('first_green_card', newlyUnlocked);
    }
    
    // 收集类成就
    if (stats.endings.history.unlocked.length >= 5) {
      this.unlockAchievement('ending_collector_5', newlyUnlocked);
    }
    
    // 挑战类成就
    if (stats.endings.current.endingId && stats.basic.turns.total <= 20) {
      this.unlockAchievement('speed_runner', newlyUnlocked);
    }
    
    // 生存类成就
    if (stats.events.deaths.count === 0 && stats.basic.turns.total >= 50) {
      this.unlockAchievement('survivor', newlyUnlocked);
    }
    
    return newlyUnlocked;
  }
  
  private unlockAchievement(id: string, list: string[]): void {
    if (!this.aggregate.achievements.unlocked.includes(id)) {
      this.aggregate.achievements.unlocked.push(id);
      list.push(id);
    }
  }
}
```

---

## 6. 与 EndingSystem 的集成

### 6.1 结局统计报告

```typescript
interface EndingReport {
  // 本局核心数据
  thisRun: {
    ending: {
      id: string;
      name: string;
      type: EndingType;
      isFirstTime: boolean;
    };
    turns: number;
    playTime: number;
    scenesVisited: string[];
  };
  
  // 统计亮点
  highlights: StatHighlight[];
  
  // 对比数据
  comparison: {
    vsAverage: RunComparison;    // 与平均数据对比
    vsBest: RunComparison;       // 与最佳记录对比
  };
  
  // 历程回顾
  journey: JourneyMilestone[];
  
  // 解锁内容
  unlocks: {
    newEndings: string[];
    newAchievements: string[];
  };
}

interface StatHighlight {
  type: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'RARE';
  title: string;
  description: string;
  value?: string;
  icon: string;
}

interface RunComparison {
  turns: { value: number; better: boolean };
  money: { value: number; better: boolean };
  events: { value: number; better: boolean };
}

interface JourneyMilestone {
  turn: number;
  type: 'SCENE' | 'EVENT' | 'ATTRIBUTE' | 'RESOURCE';
  description: string;
}
```

### 6.2 EndingSystem 集成实现

```typescript
class EndingSystem {
  private statisticsManager: StatisticsManager;
  private aggregateManager: AggregateManager;
  
  constructor(statsManager: StatisticsManager, aggregateManager: AggregateManager) {
    this.statisticsManager = statsManager;
    this.aggregateManager = aggregateManager;
  }
  
  /**
   * 触发结局
   */
  async triggerEnding(endingId: string): Promise<void> {
    const endingConfig = this.getEndingConfig(endingId);
    const endingType = endingConfig.type;
    const turn = this.getCurrentTurn();
    const isFirstTime = !this.hasUnlockedEndingBefore(endingId);
    
    // 1. 记录结局到统计系统
    this.statisticsManager.recordEnding(endingId, endingType, isFirstTime, turn);
    this.statisticsManager.save();
    
    // 2. 生成结局报告
    const stats = this.statisticsManager.getFullStatistics();
    const report = this.generateEndingReport(stats, endingConfig);
    
    // 3. 检查成就
    const newAchievements = this.aggregateManager.checkAchievements(stats);
    report.unlocks.newAchievements = newAchievements;
    
    // 4. 保存聚合统计
    await this.saveAggregateStatistics();
    
    // 5. 展示结局
    this.showEndingScreen(report);
  }
  
  /**
   * 生成结局报告
   */
  private generateEndingReport(
    stats: GameStatistics,
    endingConfig: EndingConfig
  ): EndingReport {
    return {
      thisRun: {
        ending: {
          id: endingConfig.id,
          name: endingConfig.name,
          type: endingConfig.type,
          isFirstTime: stats.endings.current.isFirstTime
        },
        turns: stats.basic.turns.total,
        playTime: stats.basic.time.totalPlayTime,
        scenesVisited: stats.basic.scenes.visited
      },
      
      highlights: this.generateHighlights(stats),
      
      comparison: this.generateComparison(stats),
      
      journey: this.generateJourneyTimeline(stats),
      
      unlocks: {
        newEndings: stats.endings.current.isFirstTime ? [endingConfig.id] : [],
        newAchievements: []
      }
    };
  }
  
  /**
   * 生成统计亮点
   */
  private generateHighlights(stats: GameStatistics): StatHighlight[] {
    const highlights: StatHighlight[] = [];
    
    // 经济亮点
    if (stats.economy.usd.income.total > 5000) {
      highlights.push({
        type: 'POSITIVE',
        title: '打工皇帝',
        description: '累计收入超过5000美元',
        value: `$${stats.economy.usd.income.total}`,
        icon: '💰'
      });
    }
    
    // 生存亮点
    if (stats.events.deaths.count === 0 && stats.basic.turns.total > 30) {
      highlights.push({
        type: 'POSITIVE',
        title: '命硬',
        description: '30回合以上无死亡',
        icon: '🛡️'
      });
    }
    
    // 探索亮点
    const uniqueEvents = stats.events.completed.uniqueEvents.length;
    if (uniqueEvents > 20) {
      highlights.push({
        type: 'POSITIVE',
        title: '事件猎人',
        description: `经历了${uniqueEvents}种独特事件`,
        value: `${uniqueEvents}`,
        icon: '🔍'
      });
    }
    
    // 通胀经历
    if (stats.economy.inflation.maxIntensity >= 4) {
      highlights.push({
        type: 'NEGATIVE',
        title: '大通胀幸存者',
        description: `经历了强度${stats.economy.inflation.maxIntensity}的通胀`,
        icon: '📉'
      });
    }
    
    // 终结态经历
    const totalTerminalEnters = 
      stats.character.terminalStates.dying.enteredCount +
      stats.character.terminalStates.breakdown.enteredCount +
      stats.character.terminalStates.destitution.enteredCount;
    
    if (totalTerminalEnters >= 5) {
      highlights.push({
        type: 'NEGATIVE',
        title: '九命猫',
        description: `进入终结态${totalTerminalEnters}次但存活`,
        value: `${totalTerminalEnters}`,
        icon: '🐱'
      });
    }
    
    return highlights;
  }
  
  /**
   * 生成历程时间线
   */
  private generateJourneyTimeline(stats: GameStatistics): JourneyMilestone[] {
    const milestones: JourneyMilestone[] = [];
    
    // 场景切换里程碑
    for (const transition of stats.basic.scenes.transitions) {
      milestones.push({
        turn: transition.turn,
        type: 'SCENE',
        description: `从${this.getSceneName(transition.from)}抵达${this.getSceneName(transition.to)}`
      });
    }
    
    // 属性里程碑
    for (const [attr, values] of Object.entries(stats.character.milestones.attributeMilestones)) {
      for (const value of values) {
        if (value >= 10) {
          milestones.push({
            turn: this.findAttributeTurn(stats, attr as keyof Attributes, value),
            type: 'ATTRIBUTE',
            description: `${this.getAttributeName(attr)}达到${value}`
          });
        }
      }
    }
    
    // 按回合排序
    return milestones.sort((a, b) => a.turn - b.turn);
  }
}
```

---

## 7. 性能优化

### 7.1 惰性统计策略

```typescript
class StatisticsManager {
  // 实时统计 vs 惰性统计配置
  private config: {
    realTimeStats: Set<string>;    // 需要实时更新的统计
    lazyStats: Set<string>;        // 可以惰性计算的统计
    flushInterval: number;         // 批量写入间隔（ms）
  };
  
  private flushTimer: number | null = null;
  
  constructor() {
    this.config = {
      // 需要实时更新的关键统计
      realTimeStats: new Set([
        'basic.turns.total',
        'basic.time.totalPlayTime',
        'character.resources.health',
        'character.resources.mental'
      ]),
      // 可以批量延迟更新的统计
      lazyStats: new Set([
        'events.completed.byScene',
        'economy.income.bySource',
        'character.attributes.growth'
      ]),
      flushInterval: 5000 // 5秒批量写入一次
    };
  }
  
  /**
   * 延迟更新（用于非关键统计）
   */
  private lazyUpdate(key: string, updater: () => void): void {
    if (this.config.realTimeStats.has(key)) {
      // 实时更新
      updater();
      this.markDirty();
    } else {
      // 加入待处理队列
      this.pendingUpdates.set(key, updater);
      this.scheduleFlush();
    }
  }
  
  /**
   * 调度批量写入
   */
  private scheduleFlush(): void {
    if (this.flushTimer) return;
    
    this.flushTimer = window.setTimeout(() => {
      this.flushPendingUpdates();
      this.flushTimer = null;
    }, this.config.flushInterval);
  }
  
  /**
   * 执行批量更新
   */
  private flushPendingUpdates(): void {
    for (const [key, updater] of this.pendingUpdates) {
      updater();
    }
    this.pendingUpdates.clear();
    
    if (this.isDirty) {
      this.save();
    }
  }
  
  /**
   * 游戏暂停时强制刷新
   */
  onGamePause(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushPendingUpdates();
  }
}
```

### 7.2 内存优化

```typescript
class MemoryOptimizedStatistics {
  // 使用环形缓冲区存储时间序列数据
  private turnHistory: CircularBuffer<TurnSnapshot>;
  private readonly MAX_HISTORY_SIZE = 100;
  
  constructor() {
    this.turnHistory = new CircularBuffer<TurnSnapshot>(this.MAX_HISTORY_SIZE);
  }
  
  /**
   * 添加回合快照（只保留最近100回合详情）
   */
  addTurnSnapshot(snapshot: TurnSnapshot): void {
    this.turnHistory.push(snapshot);
  }
  
  /**
   * 压缩历史数据
   */
  compressHistory(): void {
    // 超过100回合后，只保留聚合数据
    const oldSnapshots = this.turnHistory.getEvictedItems();
    
    for (const snapshot of oldSnapshots) {
      this.aggregateToLongTermStats(snapshot);
    }
  }
  
  /**
   * 只记录必要的事件详情
   */
  private recordEventDetail(eventId: string, importance: 'HIGH' | 'MEDIUM' | 'LOW'): void {
    if (importance === 'HIGH') {
      // 详细记录
      this.detailedEvents.push({ eventId, fullData: this.captureFullEventData() });
    } else if (importance === 'MEDIUM') {
      // 中等记录
      this.detailedEvents.push({ eventId, summary: this.captureEventSummary() });
    } else {
      // 只记录ID和回合
      this.eventIds.push({ eventId, turn: this.currentTurn });
    }
  }
}

/**
 * 环形缓冲区实现
 */
class CircularBuffer<T> {
  private buffer: T[];
  private maxSize: number;
  private start = 0;
  private count = 0;
  private evicted: T[] = [];
  
  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.buffer = new Array(maxSize);
  }
  
  push(item: T): void {
    if (this.count === this.maxSize) {
      // 缓冲区已满，驱逐最旧项
      this.evicted.push(this.buffer[this.start]);
      this.buffer[this.start] = item;
      this.start = (this.start + 1) % this.maxSize;
    } else {
      this.buffer[(this.start + this.count) % this.maxSize] = item;
      this.count++;
    }
  }
  
  getEvictedItems(): T[] {
    const items = [...this.evicted];
    this.evicted = [];
    return items;
  }
}
```

---

## 8. 版本兼容性

### 8.1 统计版本管理

```typescript
const STATISTICS_VERSION = 1;

interface VersionMigration {
  fromVersion: number;
  toVersion: number;
  migrate: (data: any) => any;
}

class StatisticsVersionManager {
  private migrations: VersionMigration[] = [
    // 示例：从版本1升级到版本2
    // {
    //   fromVersion: 1,
    //   toVersion: 2,
    //   migrate: (data) => {
    //     // 添加新字段的默认值
    //     data.newField = 'default';
    //     return data;
    //   }
    // }
  ];
  
  /**
   * 升级统计数据到最新版本
   */
  migrateToLatest(data: any): GameStatistics {
    let currentVersion = data.metadata?.version || 0;
    
    for (const migration of this.migrations) {
      if (currentVersion === migration.fromVersion) {
        data = migration.migrate(data);
        currentVersion = migration.toVersion;
      }
    }
    
    data.metadata.version = STATISTICS_VERSION;
    return data as GameStatistics;
  }
  
  /**
   * 验证数据结构完整性
   */
  validateIntegrity(data: any): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // 检查必需字段
    const requiredFields = [
      'metadata',
      'basic',
      'economy',
      'events',
      'endings',
      'character'
    ];
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        issues.push(`缺少必需字段: ${field}`);
      }
    }
    
    // 尝试用默认值修复
    if (issues.length > 0) {
      data = this.applyDefaultValues(data, issues);
    }
    
    return { valid: issues.length === 0, issues };
  }
  
  private applyDefaultValues(data: any, issues: string[]): any {
    const defaults = {
      metadata: { version: 1, gameId: 'unknown', startTime: Date.now() },
      basic: this.createEmptyBasicStats(),
      economy: this.createEmptyEconomyStats(),
      events: this.createEmptyEventStats(),
      endings: this.createEmptyEndingStats(),
      character: this.createEmptyCharacterStats()
    };
    
    for (const issue of issues) {
      const field = issue.replace('缺少必需字段: ', '');
      if (field in defaults) {
        data[field] = defaults[field as keyof typeof defaults];
      }
    }
    
    return data;
  }
}
```

### 8.2 存档兼容性

```typescript
class SaveCompatibility {
  /**
   * 加载存档时检查统计兼容性
   */
  static checkSaveCompatibility(saveData: SaveData): {
    compatible: boolean;
    needsMigration: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let needsMigration = false;
    
    // 检查统计版本
    const statsVersion = saveData.statistics?.metadata?.version || 0;
    if (statsVersion < STATISTICS_VERSION) {
      needsMigration = true;
      warnings.push(`统计数据版本过旧 (${statsVersion} < ${STATISTICS_VERSION})，将自动升级`);
    }
    
    // 检查游戏版本（如果有）
    if (saveData.version !== 1) {
      warnings.push(`存档版本 ${saveData.version} 可能不兼容当前游戏版本`);
    }
    
    return {
      compatible: warnings.length === 0 || needsMigration,
      needsMigration,
      warnings
    };
  }
  
  /**
   * 兼容模式：加载旧版本存档
   */
  static loadLegacySave(saveData: any): SaveData {
    // 为旧存档创建默认统计数据
    if (!saveData.statistics) {
      saveData.statistics = createDefaultStatistics();
      
      // 尝试从旧存档数据重建部分统计
      if (saveData.character) {
        this.reconstructStatsFromLegacy(saveData);
      }
    }
    
    return saveData as SaveData;
  }
  
  private static reconstructStatsFromLegacy(saveData: any): void {
    const stats = saveData.statistics;
    const character = saveData.character;
    
    // 重建角色统计
    if (character.attributes) {
      stats.character.attributes.final = character.attributes;
    }
    
    if (character.resources) {
      stats.character.resources.health.max = character.resources.health?.max || 100;
      stats.character.resources.mental.max = character.resources.mental?.max || 100;
    }
    
    // 重建基础统计
    if (character.status?.turnCount) {
      stats.basic.turns.total = character.status.turnCount.total || 0;
    }
  }
}
```

---

## 9. 使用示例

### 9.1 初始化与基础使用

```typescript
// 初始化统计系统
const statsManager = new StatisticsManager(
  (stats) => localStorage.setItem('current_stats', JSON.stringify(stats)),
  () => JSON.parse(localStorage.getItem('current_stats') || 'null')
);

// 新游戏
statsManager.initializeNewGame('game_' + Date.now());

// 游戏过程中记录数据
statsManager.recordTurnEnd('act3', character.resources);
statsManager.recordIncome('USD', 120, 'act3_work_delivery');
statsManager.recordExpense('USD', 600, 'item');
```

### 9.2 结局展示

```typescript
// 结局时获取完整报告
const stats = statsManager.getFullStatistics();

// 展示统计
console.log(`游戏时长: ${formatTime(stats.basic.time.totalPlayTime)}`);
console.log(`总回合数: ${stats.basic.turns.total}`);
console.log(`经历事件: ${stats.events.completed.total}`);
console.log(`独特事件: ${stats.events.completed.uniqueEvents.length}`);
console.log(`总收入: $${stats.economy.usd.income.total}`);
```

### 9.3 跨周目成就检查

```typescript
// 检查总解锁结局数
const aggregate = await loadAggregateStatistics();
console.log(`已解锁结局: ${aggregate.unlockedEndings.length}/${TOTAL_ENDINGS}`);

// 检查成就
if (aggregate.totalGames >= 10) {
  unlockAchievement('veteran_traveler');
}
```

---

## 10. 附录

### 10.1 统计ID命名规范

| 类别 | 前缀 | 示例 |
|-----|------|------|
| 基础统计 | `basic.` | `basic.turns.total` |
| 经济统计 | `economy.` | `economy.usd.income.total` |
| 事件统计 | `events.` | `events.completed.total` |
| 结局统计 | `endings.` | `endings.history.unlocked` |
| 角色统计 | `character.` | `character.attributes.final` |

### 10.2 关键数值范围

```typescript
const STATISTICS_LIMITS = {
  // 回合
  MAX_TURNS: 9999,
  
  // 时间（秒）
  MAX_PLAYTIME: 86400 * 30, // 30天
  
  // 经济
  MAX_MONEY: 999999,
  
  // 事件
  MAX_EVENTS: 9999,
  MAX_UNIQUE_EVENTS: 500,
  
  // 存档
  MAX_SAVES: 99,
  MAX_LOADS: 999
};
```

### 10.3 相关系统接口

```typescript
// 提供给其他系统的接口
interface IStatisticsProvider {
  // 获取当前回合数
  getCurrentTurn(): number;
  
  // 获取本局游戏时长
  getCurrentPlayTime(): number;
  
  // 获取已解锁结局列表
  getUnlockedEndings(): string[];
  
  // 检查是否首次达成某结局
  isFirstTimeEnding(endingId: string): boolean;
  
  // 获取属性极值
  getAttributeExtremes(attr: keyof Attributes): { max: number; min: number };
  
  // 获取经济统计
  getEconomySummary(): {
    totalIncomeUSD: number;
    totalExpenseUSD: number;
    netWorth: number;
  };
}
```

---

> **维护提示**：本文档随统计系统功能扩展更新。添加新统计类别时需同步更新本文档。
