# 角色系统架构设计

## 1. 概述

本文档定义《去美国》游戏的核心角色系统架构，包含角色属性、资源管理、终结态机制、角色成长等核心模块的技术实现规范。

角色系统是**事件系统**和**物品系统**的交互核心：
- 事件对角色产生作用（消耗资源、改变属性）
- 物品通过角色生效（恢复资源、提升属性）
- 角色的状态决定可选事件范围

---

## 2. 角色数据结构

### 2.1 核心角色类

```typescript
interface Character {
  // 基础信息
  id: string;                    // 角色唯一ID
  name: string;                  // 角色名
  creationTime: number;          // 创建时间
  
  // 六大属性
  attributes: Attributes;
  
  // 消耗资源
  resources: Resources;
  
  // 状态
  status: CharacterStatus;
  
  // 终结态
  terminalState: TerminalState | null;
  
  // 场景进度
  progression: Progression;
  
  // 统计
  statistics: Statistics;
}
```

### 2.2 六大属性（Attributes）

**属性是角色的长期能力，影响事件检定和选项解锁。**

```typescript
interface Attributes {
  // 1. 体魄（Physique）
  // 影响：体力检定、身体健康度消耗、负重能力
  // 获取：体力劳动、训练、里程碑事件
  physique: number;              // 范围：0-20
  
  // 2. 智力（Intelligence）
  // 影响：信息理解、骗局识别、学习速度
  // 获取：学习、阅读、课程
  intelligence: number;          // 范围：0-20
  
  // 3. 英语技能（English）
  // 影响：场景3沟通、正规渠道成功率、信息获取
  // 获取：学习、沉浸式环境、实践
  english: number;               // 范围：0-20
  
  // 4. 社交（Social）
  // 影响：随机事件概率、信息获取、人脉网络
  // 获取：社交活动、帮助他人、建立关系
  social: number;                // 范围：0-20
  
  // 5. 风险意识（RiskAwareness）
  // 影响：危险预判、避坑能力、后果揭示
  // 获取：经验积累、险情幸存、学习
  riskAwareness: number;         // 范围：0-20
  
  // 6. 生存能力（Survival）
  // 影响：极端环境存活、躲避搜捕、灰区操作
  // 获取：场景2历练、灰色技巧、关键道具
  survival: number;              // 范围：0-20
}

// 属性常量定义
const ATTRIBUTE_LIMITS = {
  MIN: 0,
  MAX: 20,
  INITIAL_MIN: 1,                // 创建时最低值
  INITIAL_MAX: 5                 // 创建时最高值（需要平衡）
};

// 属性名称映射（用于UI显示）
const ATTRIBUTE_NAMES: Record<keyof Attributes, string> = {
  physique: '体魄',
  intelligence: '智力',
  english: '英语技能',
  social: '社交',
  riskAwareness: '风险意识',
  survival: '生存能力'
};
```

**属性成长规则**：
```typescript
interface AttributeGrowthRule {
  // 常规成长
  regularGain: number;           // 通常+1
  milestoneGain: number;         // 里程碑+2
  rareGain: number;              // 极少数+3
  
  // 负面事件
  injuryLoss: number;            // 受伤-1~-3
  stressLoss: number;            // 压力-1
  
  // 属性间的相互影响（可选）
  synergies?: {
    attribute: keyof Attributes;
    threshold: number;
    bonus: number;
  }[];
}

// 示例：体魄的成长规则
const PHYSIQUE_GROWTH: AttributeGrowthRule = {
  regularGain: 1,                // 常规体力劳动+1
  milestoneGain: 2,              // 长期坚持+2
  rareGain: 3,                   // 重大极限突破+3
  injuryLoss: -2,                // 严重受伤-2
  stressLoss: -1                 // 长期过劳-1
};
```

### 2.3 消耗资源（Resources）

**资源是短期消耗品，需要持续管理，波动剧烈。**

```typescript
interface Resources {
  // 1. 身体健康度（Health）
  // 归零 → 进入【濒死】终结态
  health: {
    current: number;
    max: number;                 // 通常为100，可通过体魄提升
  };
  
  // 2. 心理健康度（Mental）
  // 归零 → 进入【崩溃】终结态
  mental: {
    current: number;
    max: number;                 // 通常为100
  };
  
  // 3. 金钱资源（Money）
  // 归零 → 进入【匮乏】终结态
  money: {
    cny: number;                 // 人民币（场景1使用）
    usd: number;                 // 美元（场景2、3使用）
  };
  
  // 4. 行动点（Action Points）
  // 每回合恢复，限制每回合可执行事件数量
  actionPoints: {
    current: number;
    max: number;                 // 基础3-5点，可通过道具提升
    baseRecovery: number;        // 每回合基础恢复量
  };
}

// 资源限制
const RESOURCE_LIMITS = {
  health: { min: 0, max: 100, base: 100 },
  mental: { min: 0, max: 100, base: 100 },
  actionPoints: { min: 0, max: 10, base: 3, recovery: 3 }
};
```

**资源恢复规则**：
```typescript
interface ResourceRecovery {
  // 每回合自动恢复
  perTurn: {
    health?: number;             // 通常不回，除非休息
    mental: number;              // 基础+2（睡眠）
    actionPoints: number;        // 恢复到max
  };
  
  // 事件恢复
  fromEvents: {
    rest: { health: 5, mental: 10 };
    sleep: { health: 10, mental: 15 };
    entertainment: { mental: 10 };
  };
  
  // 道具恢复
  fromItems: {
    // 见物品系统文档
  };
}
```

---

## 3. 角色状态系统

### 3.1 状态分类

```typescript
interface CharacterStatus {
  // 场景位置
  currentScene: 'act1' | 'act2' | 'act3';
  
  // 环境Debuff（每回合自动生效）
  environmentalDebuffs: EnvironmentalDebuff[];
  
  // 临时状态效果
  temporaryEffects: TemporaryEffect[];
  
  // 持久状态（需要特定条件解除）
  persistentConditions: PersistentCondition[];
  
  // 回合计数
  turnCount: {
    total: number;               // 总回合数
    inCurrentScene: number;      // 当前场景回合数
  };
}
```

### 3.2 环境Debuff

每个场景有独特的环境压力：

```typescript
interface EnvironmentalDebuff {
  id: string;
  name: string;
  description: string;
  
  // 触发条件
  condition: {
    scene: string;
    minTurn?: number;            // 第N回合开始生效
  };
  
  // 每回合效果
  perTurnEffect: {
    healthChange?: number;
    mentalChange?: number;
    moneyChange?: { amount: number; currency: 'CNY' | 'USD' };
    actionPointMaxChange?: number;
  };
  
  // 可抵消方式
  countermeasures: {
    itemId?: string;             // 特定道具可抵消
    attribute?: keyof Attributes; // 某属性达标可减轻
    threshold: number;
  }[];
}

// 场景1 Debuff：坐吃山空
const DEBUFF_ACT1_SITTING_DUCK: EnvironmentalDebuff = {
  id: 'debuff_act1_sitting_duck',
  name: '坐吃山空',
  description: '每回合现金消耗递增，心理健康度自动扣除',
  condition: { scene: 'act1', minTurn: 5 },
  perTurnEffect: {
    moneyChange: { amount: -10, currency: 'CNY' },  // 每回合+10元通胀
    mentalChange: -2                               // 对未来的恐惧
  },
  countermeasures: [
    { attribute: 'riskAwareness', threshold: 8 }    // 高风险管理可减轻
  ]
};

// 场景2 Debuff：环境恶化
const DEBUFF_ACT2_ENVIRONMENT: EnvironmentalDebuff = {
  id: 'debuff_act2_environment',
  name: '环境恶化',
  description: '身体健康度大幅扣除，物资快速消耗',
  condition: { scene: 'act2' },
  perTurnEffect: {
    healthChange: -5                              // 恶劣环境持续扣血
  },
  countermeasures: [
    { itemId: 'sleeping_bag' },                   // 睡袋可减轻
    { itemId: 'waterskin' }                       // 水袋可减轻
  ]
};

// 场景3 Debuff：搜捕升级 + 大通胀
const DEBUFF_ACT3_CRACKDOWN: EnvironmentalDebuff = {
  id: 'debuff_act3_crackdown',
  name: '搜捕升级',
  description: '移民局查得越严，生存空间被压缩',
  condition: { scene: 'act3', minTurn: 3 },
  perTurnEffect: {
    moneyChange: { amount: -15, currency: 'USD' }, // 通胀
    mentalChange: -3                              // 被查恐惧
  },
  countermeasures: [
    { attribute: 'survival', threshold: 8 },      // 高生存能力可隐藏更好
    { itemId: 'fake_lease' }                      // 有住址证明可减轻
  ]
};
```

### 3.3 临时状态效果

```typescript
interface TemporaryEffect {
  id: string;
  name: string;
  
  // 效果类型
  type: 'BUFF' | 'DEBUFF';
  
  // 效果内容
  effects: Partial<Attributes> | Partial<Resources>;
  
  // 持续时间
  duration: {
    type: 'TURN' | 'EVENT' | 'SCENE';
    value: number;               // 持续N回合/事件/场景
  };
  
  // 来源（用于日志和调试）
  source: string;
}

// 示例：生病Debuff
const TEMP_ILLNESS: TemporaryEffect = {
  id: 'temp_illness',
  name: '生病',
  type: 'DEBUFF',
  effects: {
    health: -5,                  // 每回合额外扣5健康
    actionPoints: { max: -1 }    // 行动点上限-1
  },
  duration: { type: 'TURN', value: 3 },
  source: '随机事件：淋雨'
};
```

---

## 4. 终结态系统（Terminal States）

当资源归零时，角色进入终结态，面临严重后果。

### 4.1 终结态类型

```typescript
type TerminalStateType = 'DYING' | 'BREAKDOWN' | 'DESTITUTION';

interface TerminalState {
  type: TerminalStateType;
  enteredAt: number;             // 进入时间（回合数）
  countdown: number;             // 倒计时（回合数）
  maxCountdown: number;          // 最大倒计时（由属性决定）
  
  // 每回合强制执行的效果
  perTurnEffect: {
    healthChange?: number;
    mentalChange?: number;
    actionPointChange?: number;
  };
  
  // 脱离条件
  escapeCondition: {
    resource: keyof Resources;
    threshold: number;           // 资源恢复到此值可脱离
  };
  
  // 倒计时归零后果
  timeoutConsequence: {
    gameOver: boolean;
    endingType?: string;         // 游戏结束结局类型
  };
}
```

### 4.2 濒死状态（DYING）

```typescript
// 触发条件：health <= 0
const TERMINAL_DYING: TerminalState = {
  type: 'DYING',
  countdown: 0,                  // 动态计算
  maxCountdown: 0,               // 由体魄决定：clamp(floor((physique + 6) / 7), 0, 3)
  
  perTurnEffect: {
    healthChange: -5,            // 持续恶化
    mentalChange: -5,            // 恐惧
    actionPointChange: -1        // 行动能力衰退
  },
  
  escapeCondition: {
    resource: 'health',
    threshold: 1                 // 健康度恢复到>0
  },
  
  timeoutConsequence: {
    gameOver: true,
    endingType: 'DEATH'          // 死亡结局
  }
};

// 倒计时计算公式
function calculateDyingCountdown(physique: number): number {
  return Math.min(Math.max(Math.floor((physique + 6) / 7), 0), 3);
}
// 体魄0→0回合（立即死）
// 体魄8→2回合
// 体魄15→3回合
// 体魄20→3回合（上限）
```

### 4.3 崩溃状态（BREAKDOWN）

```typescript
// 触发条件：mental <= 0
const TERMINAL_BREAKDOWN: TerminalState = {
  type: 'BREAKDOWN',
  countdown: 0,                  // 动态计算
  maxCountdown: 0,               // 由智力决定：clamp(3 - floor(intelligence / 10), 1, 3)
  
  perTurnEffect: {
    mentalChange: -3,            // 精神持续恶化
    // 每回合开始时强制触发"崩溃冲击"事件
  },
  
  escapeCondition: {
    resource: 'mental',
    threshold: 1
  },
  
  timeoutConsequence: {
    gameOver: true,
    endingType: 'SUICIDE'        // 自杀/精神崩溃结局
  }
};

// 倒计时计算公式（智力越高窗口越短）
function calculateBreakdownCountdown(intelligence: number): number {
  return Math.min(Math.max(3 - Math.floor(intelligence / 10), 1), 3);
}
// 智力0→3回合
// 智力10→2回合
// 智力20→1回合
```

### 4.4 匮乏状态（DESTITUTION）

```typescript
// 触发条件：金钱<=0（场景1人民币，场景2/3美元）
const TERMINAL_DESTITUTION: TerminalState = {
  type: 'DESTITUTION',
  countdown: Infinity,           // 无倒计时，不会直接游戏结束
  
  perTurnEffect: {
    healthChange: -3,            // 营养不良
    mentalChange: -5             // 绝望
  },
  
  escapeCondition: {
    resource: 'money',           // 任意货币>0
    threshold: 1
  },
  
  timeoutConsequence: {
    gameOver: false              // 不会直接结束，但持续扣血扣心理
  }
};
```

### 4.5 终结态管理器

```typescript
class TerminalStateManager {
  private character: Character;
  
  /**
   * 每回合开始时检查是否进入终结态
   */
  checkTerminalState(): TerminalState | null {
    const { resources, attributes, terminalState } = this.character;
    
    // 已在终结态，检查是否脱离
    if (terminalState) {
      const { escapeCondition } = terminalState;
      const currentValue = this.getResourceValue(escapeCondition.resource);
      
      if (currentValue > escapeCondition.threshold) {
        this.exitTerminalState();
        return null;
      }
      
      return terminalState;  // 继续终结态
    }
    
    // 检查是否进入新终结态（优先级：濒死 > 崩溃 > 匮乏）
    if (resources.health.current <= 0) {
      return this.enterTerminalState('DYING', attributes.physique);
    }
    
    if (resources.mental.current <= 0) {
      return this.enterTerminalState('BREAKDOWN', attributes.intelligence);
    }
    
    const money = this.getCurrentSceneMoney();
    if (money <= 0) {
      return this.enterTerminalState('DESTITUTION');
    }
    
    return null;
  }
  
  /**
   * 进入终结态
   */
  enterTerminalState(
    type: TerminalStateType,
    attributeValue?: number
  ): TerminalState {
    let countdown = 0;
    
    switch (type) {
      case 'DYING':
        countdown = calculateDyingCountdown(attributeValue || 0);
        break;
      case 'BREAKDOWN':
        countdown = calculateBreakdownCountdown(attributeValue || 0);
        break;
      case 'DESTITUTION':
        countdown = Infinity;
        break;
    }
    
    const state: TerminalState = {
      type,
      enteredAt: this.character.status.turnCount.total,
      countdown,
      maxCountdown: countdown,
      ...this.getTerminalStateConfig(type)
    };
    
    this.character.terminalState = state;
    
    // 触发进入终结态事件
    this.triggerTerminalEntryEvent(type);
    
    return state;
  }
  
  /**
   * 每回合执行终结态效果
   */
  processTerminalEffects(): void {
    const state = this.character.terminalState;
    if (!state) return;
    
    // 应用每回合效果
    const { perTurnEffect } = state;
    if (perTurnEffect.healthChange) {
      this.character.resources.health.current += perTurnEffect.healthChange;
    }
    if (perTurnEffect.mentalChange) {
      this.character.resources.mental.current += perTurnEffect.mentalChange;
    }
    
    // 倒计时-1
    if (state.countdown !== Infinity && state.countdown > 0) {
      state.countdown--;
    }
    
    // 检查倒计时归零
    if (state.countdown === 0) {
      this.handleTimeout(state);
    }
  }
  
  private handleTimeout(state: TerminalState): void {
    const { timeoutConsequence } = state;
    
    if (timeoutConsequence.gameOver) {
      this.triggerGameOver(timeoutConsequence.endingType);
    }
  }
}
```

---

## 5. 角色成长系统

### 5.1 经验与里程碑

```typescript
interface CharacterProgression {
  // 属性成长记录
  attributeGrowth: {
    [K in keyof Attributes]: {
      current: number;
      milestonesReached: number[];  // 已达成的里程碑值
      history: {                     // 成长历史
        turn: number;
        source: string;             // 来源事件/道具
        amount: number;
      }[];
    }
  };
  
  // 技能熟练度（细化属性）
  skillMastery: {
    [skillId: string]: {
      level: number;
      experience: number;
      maxLevel: number;
    }
  };
  
  // 成就/里程碑
  achievements: string[];          // 已达成成就ID列表
}
```

### 5.2 属性成长算法

```typescript
class AttributeGrowthSystem {
  /**
   * 增加属性值
   */
  addAttribute(
    attr: keyof Attributes,
    amount: number,
    source: string
  ): boolean {
    const current = this.character.attributes[attr];
    const newValue = Math.min(current + amount, ATTRIBUTE_LIMITS.MAX);
    
    if (newValue === current) return false;  // 已达上限
    
    this.character.attributes[attr] = newValue;
    
    // 记录历史
    this.character.progression.attributeGrowth[attr].history.push({
      turn: this.character.status.turnCount.total,
      source,
      amount
    });
    
    // 检查里程碑
    this.checkMilestones(attr, newValue);
    
    return true;
  }
  
  /**
   * 检查是否达到里程碑
   */
  private checkMilestones(attr: keyof Attributes, value: number): void {
    const milestones = [5, 10, 15, 20];  // 里程碑值
    
    for (const milestone of milestones) {
      if (value >= milestone && 
          !this.character.progression.attributeGrowth[attr].milestonesReached.includes(milestone)) {
        
        this.character.progression.attributeGrowth[attr].milestonesReached.push(milestone);
        
        // 触发里程碑奖励
        this.triggerMilestoneReward(attr, milestone);
      }
    }
  }
  
  private triggerMilestoneReward(attr: keyof Attributes, milestone: number): void {
    // 例如：体魄达到10，解锁"铁人"称号，濒死倒计时+1
    // 智力达到15，解锁"智者"称号，崩溃窗口-1但获得额外信息
  }
}
```

---

## 6. 角色与系统的交互

### 6.1 与事件系统的交互

```typescript
interface CharacterEventInteraction {
  /**
   * 检查事件是否可执行
   */
  canExecuteEvent(event: GameEvent): {
    canExecute: boolean;
    reason?: string;
    missingRequirements?: string[];
  };
  
  /**
   * 执行事件前检查
   */
  preEventCheck(event: GameEvent): {
    // 检查资源是否足够
    sufficientResources: boolean;
    // 检查属性是否满足
    sufficientAttributes: boolean;
    // 预测执行后状态
    predictedState: {
      resources: Resources;
      willEnterTerminalState: boolean;
    }
  };
  
  /**
   * 应用事件效果
   */
  applyEventEffects(effects: EventEffect): void;
}

class CharacterEventHandler implements CharacterEventInteraction {
  private character: Character;
  private inventory: InventoryManager;
  
  canExecuteEvent(event: GameEvent) {
    // 1. 检查是否在终结态（某些事件禁止）
    if (this.character.terminalState && !event.allowInTerminalState) {
      return { canExecute: false, reason: '处于终结态，无法执行此事件' };
    }
    
    // 2. 检查资源
    const resourceCheck = this.checkResourceRequirements(event);
    if (!resourceCheck.sufficient) {
      return { 
        canExecute: false, 
        reason: '资源不足',
        missingRequirements: resourceCheck.missing 
      };
    }
    
    // 3. 检查属性
    const attrCheck = this.checkAttributeRequirements(event);
    if (!attrCheck.sufficient) {
      return { 
        canExecute: false, 
        reason: '属性不足',
        missingRequirements: attrCheck.missing 
      };
    }
    
    return { canExecute: true };
  }
  
  applyEventEffects(effects: EventEffect): void {
    // 应用资源变化
    if (effects.resourceChanges) {
      for (const [resource, change] of Object.entries(effects.resourceChanges)) {
        this.modifyResource(resource as keyof Resources, change);
      }
    }
    
    // 应用属性变化
    if (effects.attributeChanges) {
      for (const [attr, change] of Object.entries(effects.attributeChanges)) {
        this.growthSystem.addAttribute(attr as keyof Attributes, change, '事件');
      }
    }
    
    // 应用临时效果
    if (effects.temporaryEffects) {
      this.character.status.temporaryEffects.push(...effects.temporaryEffects);
    }
    
    // 检查终结态
    this.terminalManager.checkTerminalState();
  }
}
```

### 6.2 与物品系统的交互

```typescript
interface CharacterItemInteraction {
  /**
   * 使用消耗品
   */
  useConsumable(itemId: string, count?: number): boolean;
  
  /**
   * 装备/获得常驻道具
   */
  equipPermanent(item: PermanentItem): boolean;
  
  /**
   * 获取槽位匹配结果（供事件系统使用）
   */
  getSlotMatchResult(slots: EventSlot[]): SlotMatchResult;
}

class CharacterItemHandler implements CharacterItemInteraction {
  private character: Character;
  private inventory: InventoryManager;
  
  useConsumable(itemId: string, count: number = 1): boolean {
    // 1. 检查是否拥有
    if (!this.inventory.consumables.hasItem(itemId, count)) {
      return false;
    }
    
    // 2. 获取物品配置
    const itemConfig = ItemDatabase.getConsumable(itemId);
    
    // 3. 应用效果
    if (itemConfig.effects.healthRestore) {
      this.character.resources.health.current = Math.min(
        this.character.resources.health.current + itemConfig.effects.healthRestore,
        this.character.resources.health.max
      );
    }
    if (itemConfig.effects.mentalRestore) {
      this.character.resources.mental.current = Math.min(
        this.character.resources.mental.current + itemConfig.effects.mentalRestore,
        this.character.resources.mental.max
      );
    }
    if (itemConfig.effects.attributeBonus) {
      for (const [attr, bonus] of Object.entries(itemConfig.effects.attributeBonus)) {
        this.character.attributes[attr as keyof Attributes] += bonus;
      }
    }
    
    // 4. 消耗物品
    this.inventory.consumables.removeItem(itemId, count);
    
    return true;
  }
  
  getSlotMatchResult(slots: EventSlot[]): SlotMatchResult {
    return this.inventory.matchSlotRequirements(slots);
  }
}
```

---

## 7. 角色创建与存档

### 7.1 角色创建

```typescript
interface CharacterCreationOptions {
  // 预设角色
  preset?: string;
  
  // 自定义描述（用于LLM生成属性）
  customDescription?: string;
  
  // 手动分配属性点
  manualAttributes?: Partial<Attributes>;
}

class CharacterFactory {
  /**
   * 创建新角色
   */
  static create(options: CharacterCreationOptions): Character {
    const character: Character = {
      id: generateUUID(),
      name: '',
      creationTime: Date.now(),
      
      attributes: this.generateAttributes(options),
      resources: this.initializeResources(),
      status: this.initializeStatus(),
      terminalState: null,
      progression: this.initializeProgression(),
      statistics: this.initializeStatistics()
    };
    
    return character;
  }
  
  private static generateAttributes(options: CharacterCreationOptions): Attributes {
    if (options.manualAttributes) {
      return {
        physique: 5,
        intelligence: 5,
        english: 1,
        social: 5,
        riskAwareness: 3,
        survival: 1,
        ...options.manualAttributes
      };
    }
    
    if (options.customDescription) {
      // 调用LLM根据描述生成属性
      return LLMService.generateAttributes(options.customDescription);
    }
    
    // 默认属性
    return {
      physique: 5,
      intelligence: 5,
      english: 1,
      social: 5,
      riskAwareness: 3,
      survival: 1
    };
  }
  
  private static initializeResources(): Resources {
    return {
      health: { current: 100, max: 100 },
      mental: { current: 100, max: 100 },
      money: { cny: 2000, usd: 0 },  // 初始2000人民币
      actionPoints: { current: 3, max: 3, baseRecovery: 3 }
    };
  }
}
```

### 7.2 存档数据结构

```typescript
interface CharacterSaveData {
  version: number;               // 存档版本
  
  // 基础信息
  id: string;
  name: string;
  creationTime: number;
  lastSaveTime: number;
  
  // 核心数据
  attributes: Attributes;
  resources: Resources;
  status: CharacterStatus;
  terminalState: TerminalState | null;
  progression: Progression;
  
  // 关联系统数据
  inventory: InventorySaveData;  // 见物品系统文档
  currentEvent?: string;         // 当前进行中的事件（如果有）
  activeChains: ChainProgress[]; // 进行中的事件链
  
  // 场景状态
  sceneStates: {
    [sceneId: string]: {
      turnCount: number;
      completedEvents: string[];
      triggeredRandomEvents: string[];
    }
  };
}

/**
 * 序列化
 */
function serializeCharacter(character: Character): CharacterSaveData {
  return {
    version: 1,
    id: character.id,
    name: character.name,
    creationTime: character.creationTime,
    lastSaveTime: Date.now(),
    attributes: character.attributes,
    resources: character.resources,
    status: character.status,
    terminalState: character.terminalState,
    progression: character.progression,
    inventory: serializeInventory(character.inventory),
    activeChains: character.activeChains,
    sceneStates: character.sceneStates
  };
}

/**
 * 反序列化
 */
function deserializeCharacter(data: CharacterSaveData): Character {
  // 验证版本
  if (data.version !== 1) {
    throw new Error(`不支持的存档版本: ${data.version}`);
  }
  
  // 恢复角色对象
  const character: Character = {
    ...data,
    inventory: deserializeInventory(data.inventory)
  };
  
  return character;
}
```

---

## 8. 附录

### 8.1 属性检定算法

```typescript
/**
 * 属性检定
 * @param attribute 检定的属性
 * @param difficulty 难度值（通常8-20）
 * @param modifiers 修正值（来自道具、临时效果等）
 * @returns 是否成功，以及检定结果详情
 */
function attributeCheck(
  character: Character,
  attribute: keyof Attributes,
  difficulty: number,
  modifiers: number = 0
): { success: boolean; roll: number; total: number } {
  // 基础值 = 属性值
  const baseValue = character.attributes[attribute];
  
  // 随机骰子（1-20）
  const roll = Math.floor(Math.random() * 20) + 1;
  
  // 总值 = 基础 + 骰子 + 修正
  const total = baseValue + roll + modifiers;
  
  // 成功判定
  const success = total >= difficulty;
  
  return { success, roll, total };
}

// 使用示例：体魄检定（难度12）
const checkResult = attributeCheck(character, 'physique', 12);
if (checkResult.success) {
  // 检定成功
} else {
  // 检定失败
}
```

### 8.2 完整类图

```
┌─────────────────────────────────────────────────────────────┐
│                       Character                              │
├─────────────────────────────────────────────────────────────┤
│  id, name, creationTime                                      │
│  attributes: Attributes                                      │
│  resources: Resources                                        │
│  status: CharacterStatus                                     │
│  terminalState: TerminalState | null                         │
│  progression: Progression                                    │
├─────────────────────────────────────────────────────────────┤
│  + canExecuteEvent(event): boolean                           │
│  + applyEventEffects(effects): void                          │
│  + useConsumable(itemId): boolean                            │
│  + getSlotMatchResult(slots): SlotMatchResult                │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Attributes  │ │  Resources   │ │  Status      │
│  六大属性     │ │  四种资源     │ │  状态系统     │
├──────────────┤ ├──────────────┤ ├──────────────┤
│ physique     │ │ health       │ │ currentScene │
│ intelligence │ │ mental       │ │ debuffs      │
│ english      │ │ money        │ │ tempEffects  │
│ social       │ │ actionPoints │ │ turnCount    │
│ riskAwareness│ └──────────────┘ └──────────────┘
│ survival     │
└──────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  uses: InventoryManager (from ItemSystem)                    │
│  uses: EventPoolManager (from EventSystem)                   │
│  uses: TerminalStateManager                                  │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 调试工具

```typescript
namespace CharacterDebug {
  // 打印角色状态
  export function printStatus(character: Character): void {
    console.log('=== 角色状态 ===');
    console.log(`场景: ${character.status.currentScene}`);
    console.log(`回合: ${character.status.turnCount.total}`);
    
    console.log('\n--- 属性 ---');
    for (const [key, value] of Object.entries(character.attributes)) {
      console.log(`  ${key}: ${value}`);
    }
    
    console.log('\n--- 资源 ---');
    console.log(`  健康: ${character.resources.health.current}/${character.resources.health.max}`);
    console.log(`  心理: ${character.resources.mental.current}/${character.resources.mental.max}`);
    console.log(`  人民币: ${character.resources.money.cny}`);
    console.log(`  美元: ${character.resources.money.usd}`);
    console.log(`  行动点: ${character.resources.actionPoints.current}/${character.resources.actionPoints.max}`);
    
    if (character.terminalState) {
      console.log('\n--- 终结态 ---');
      console.log(`  类型: ${character.terminalState.type}`);
      console.log(`  倒计时: ${character.terminalState.countdown}`);
    }
  }
  
  // 模拟属性检定
  export function testAttributeCheck(
    character: Character,
    attribute: keyof Attributes,
    difficulty: number,
    trials: number = 100
  ): void {
    let successes = 0;
    
    for (let i = 0; i < trials; i++) {
      const result = attributeCheck(character, attribute, difficulty);
      if (result.success) successes++;
    }
    
    console.log(`检定 ${attribute} 难度${difficulty} ${trials}次:`);
    console.log(`  成功率: ${(successes / trials * 100).toFixed(1)}%`);
  }
}
```

---

**文档版本**: v1.0
**最后更新**: 2026-02-25
**状态**: 设计定稿
