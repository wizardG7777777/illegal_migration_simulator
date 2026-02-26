# 结局系统架构设计

## 1. 概述

本文档定义《去美国》游戏的核心结局系统架构，包含结局类型定义、结局判定逻辑、结局展示流程、多周目历史记录等核心模块的技术实现规范。

### 1.1 设计意图

结局系统是游戏的**终极反馈机制**，承担以下核心职责：

- **统一结局管理**：所有游戏结束（死亡或通关）都通过结局系统处理
- **单一结局原则**：一个虚拟角色只能有一个结局，避免多结局共存
- **通关统计**：任何结局都视为一次"通关"，用于多周目统计
- **叙事闭环**：通过结局文本为角色旅程画上句号
- **多周目驱动**：结局解锁系统鼓励重复游玩

### 1.2 核心原则

| 原则 | 说明 |
|-----|------|
| **唯一性** | 每个角色实例只有一个结局，不可更改 |
| **终局性** | 结局触发后游戏立即结束，进入结算界面 |
| **全记录** | 所有结局（包括死亡）都计入通关统计 |
| **可追溯** | 结局时汇总完整游戏数据，便于回顾 |
| **可解锁** | 部分结局需要满足特定条件才会解锁 |

### 1.3 设计约束

根据项目设定，结局系统遵循以下**硬性约束**：

| 约束 | 说明 | 影响 |
|-----|------|------|
| **入狱即终局** | 主角一旦入狱，失去再次出狱的可能，无保释、无大赦 | 新增 `death_prison` 结局，移除 `success_amnesty` 大赦结局 |
| **场景3二元结局** | 进入场景3后，要么留在美国，要么被遣返回中国，无第三种选择 | 移除转第三国、加拿大、欧洲、失踪等结局 |
| **场景1可放弃** | 长时间停留在场景1会触发"放弃"结局 | 新增 `special_give_up` 结局，触发条件为场景1停留30+回合 |

---

## 2. 结局分类与定义

### 2.1 结局类型总览

```typescript
type EndingType = 'DEATH' | 'SUCCESS' | 'SPECIAL';

interface EndingTypeConfig {
  type: EndingType;
  name: string;                    // 类型显示名称
  description: string;             // 类型描述
  icon: string;                    // 图标标识
  color: string;                   // UI显示颜色
}

const ENDING_TYPE_CONFIGS: Record<EndingType, EndingTypeConfig> = {
  DEATH: {
    type: 'DEATH',
    name: '死亡结局',
    description: '角色在旅程中失去生命',
    icon: '💀',
    color: '#8B0000'               // 深红色
  },
  SUCCESS: {
    type: 'SUCCESS',
    name: '通关结局',
    description: '角色成功获得合法身份',
    icon: '🏆',
    color: '#FFD700'               // 金色
  },
  SPECIAL: {
    type: 'SPECIAL',
    name: '特殊结局',
    description: '角色遭遇特殊命运',
    icon: '🔮',
    color: '#9370DB'               // 紫色
  }
};
```

### 2.2 死亡结局（DEATH）

死亡结局由终结态倒计时归零或特定致命事件触发。

#### 2.2.1 死亡结局枚举

```typescript
type DeathEndingId = 
  | 'death_dying'                  // 濒死状态超时
  | 'death_breakdown'              // 崩溃状态超时（自杀/精神崩溃）
  | 'death_destitution'            // 长期匮乏致死（营养不良/疾病）
  | 'death_raid'                   // 突击检查中被击毙
  | 'death_accident'               // 意外事故（交通事故、工伤等）
  | 'death_violence'               // 暴力冲突（抢劫、斗殴等）
  | 'death_environment'            // 环境致死（极端天气、迷路等）
  | 'death_illness'                // 疾病不治
  | 'death_prison';                // 狱中终老（无保释、无大赦）

interface DeathEndingConfig {
  id: DeathEndingId;
  type: 'DEATH';
  name: string;                    // 结局名称
  description: string;             // 结局描述模板
  terminalState?: TerminalStateType; // 关联的终结态类型
  triggerEvent?: string;           // 触发事件的ID（如果有）
}

const DEATH_ENDINGS: Record<DeathEndingId, DeathEndingConfig> = {
  death_dying: {
    id: 'death_dying',
    type: 'DEATH',
    name: '体力耗尽',
    description: '你的身体终于支撑不住了。在异国他乡的某个角落，你停止了呼吸。',
    terminalState: 'DYING'
  },
  death_breakdown: {
    id: 'death_breakdown',
    type: 'DEATH',
    name: '精神崩溃',
    description: '无尽的绝望吞噬了你。在一个寂静的夜晚，你选择了结束这一切。',
    terminalState: 'BREAKDOWN'
  },
  death_destitution: {
    id: 'death_destitution',
    type: 'DEATH',
    name: '贫病交加',
    description: '长期的营养不良和恶劣环境终于击垮了你。你倒在街头，无人问津。',
    terminalState: 'DESTITUTION'
  },
  death_raid: {
    id: 'death_raid',
    type: 'DEATH',
    name: '执法冲突',
    description: '你在面对ICE的执法时选择对抗，但ICE特工直接将你击毙。',
    triggerEvent: 'rand3_raid_fatal'
  },
  death_prison: {
    id: 'death_prison',
    type: 'DEATH',
    name: '狱中终老',
    description: '你被关进了监狱。没有保释，没有大赦，你在铁窗后度过了余生。',
    triggerEvent: 'rand3_arrested_fatal'
  },
  death_accident: {
    id: 'death_accident',
    type: 'DEATH',
    name: '意外身亡',
    description: '一场意外夺走了你的生命。命运对你开了最后一个玩笑。',
    triggerEvent: 'rand3_accident_fatal'
  },
  death_violence: {
    id: 'death_violence',
    type: 'DEATH',
    name: '暴力殒命',
    description: '你倒在了血泊中。在这个弱肉强食的世界里，你成了牺牲品。',
    triggerEvent: 'rand3_robbery_fatal'
  },
  death_environment: {
    id: 'death_environment',
    type: 'DEATH',
    name: '环境致死',
    description: '恶劣的环境终于吞噬了你。你的尸体可能永远不会被发现。',
    triggerEvent: 'rand2_environment_fatal'
  },
  death_illness: {
    id: 'death_illness',
    type: 'DEATH',
    name: '疾病不治',
    description: '因为没有及时就医，小病拖成了大病。最终，你输给了死神。',
    triggerEvent: 'rand3_illness_fatal'
  }
};
```

### 2.3 通关结局（SUCCESS）

通关结局表示角色成功获得了在美国的合法身份。

#### 2.3.1 通关结局枚举

```typescript
type SuccessEndingId =
  | 'success_green_card'           // 获得绿卡（EB系列、投资等）
  | 'success_asylum'               // 庇护获批
  | 'success_marriage'             // 婚姻移民
  | 'success_refugee'              // 难民身份
  | 'success_dv_lottery'           // 抽签移民（Diversity Visa）
  | 'success_talent'               // 杰出人才（EB-1A等）
  | 'success_company'              // 企业移民（EB-5等）
  | 'success_school'               // 学生签证转正
  | 'success_work'                 // 工作签证转正
  | 'success_special'              // 特殊人才（国家利益豁免等）
  | 'success_amnesty';             // 大赦（政策事件触发）

interface SuccessEndingConfig {
  id: SuccessEndingId;
  type: 'SUCCESS';
  name: string;                    // 结局名称
  description: string;             // 结局描述模板
  difficulty: 1 | 2 | 3 | 4 | 5;   // 难度等级（影响解锁奖励）
  requirements: EndingRequirement[]; // 解锁条件
  unlocksContent?: string[];       // 解锁的新内容（如新衣服、新场景）
}

const SUCCESS_ENDINGS: Record<SuccessEndingId, SuccessEndingConfig> = {
  success_green_card: {
    id: 'success_green_card',
    type: 'SUCCESS',
    name: '绿卡得主',
    description: '经过多年的奋斗，你终于拿到了绿卡。从今以后，你可以合法地在这片土地上生活了。',
    difficulty: 4,
    requirements: [
      { type: 'SCENE', scene: 'act3' },
      { type: 'ITEM', itemId: 'green_card' }
    ]
  },
  success_asylum: {
    id: 'success_asylum',
    type: 'SUCCESS',
    name: '庇护通过',
    description: '移民法官相信了你说的一切。庇护获批，你可以合法留在这里了。',
    difficulty: 3,
    requirements: [
      { type: 'SCENE', scene: 'act3' },
      { type: 'CHAIN_COMPLETED', chainId: 'chain_asylum' },
      { type: 'ATTRIBUTE', attribute: 'intelligence', value: 10, operator: '>=' }
    ]
  },
  success_marriage: {
    id: 'success_marriage',
    type: 'SUCCESS',
    name: '婚姻移民',
    description: '爱情没有国界。你与美国公民结婚，获得了绿卡。这是命运的安排，还是精心的算计？',
    difficulty: 2,
    requirements: [
      { type: 'SCENE', scene: 'act3' },
      { type: 'CHAIN_COMPLETED', chainId: 'chain_marriage' }
    ]
  },
  success_refugee: {
    id: 'success_refugee',
    type: 'SUCCESS',
    name: '难民身份',
    description: '联合国难民署认定了你的难民身份。虽然前路依然艰难，但至少你安全了。',
    difficulty: 3,
    requirements: [
      { type: 'SCENE', scene: 'act3' },
      { type: 'CHAIN_COMPLETED', chainId: 'chain_refugee' }
    ]
  },
  success_dv_lottery: {
    id: 'success_dv_lottery',
    type: 'SUCCESS',
    name: '天选之人',
    description: '你参加了多样性签证抽签，居然中奖了！数千万分之一的概率，命运之神终于眷顾了你。',
    difficulty: 5,                  // 最高难度，纯运气
    requirements: [
      { type: 'SCENE', scene: 'act3' },
      { type: 'EVENT_TRIGGERED', eventId: 'rand3_dv_lottery_win' }
    ],
    unlocksContent: ['avatar_lucky', 'title_lucky_devil']
  },
  success_talent: {
    id: 'success_talent',
    type: 'SUCCESS',
    name: '杰出人才',
    description: '你的才华终于被认可。EB-1A获批，你以杰出人才身份获得绿卡。',
    difficulty: 5,
    requirements: [
      { type: 'SCENE', scene: 'act3' },
      { type: 'ATTRIBUTE', attribute: 'intelligence', value: 18, operator: '>=' },
      { type: 'CHAIN_COMPLETED', chainId: 'chain_talent' }
    ],
    unlocksContent: ['title_genius']
  },
  success_company: {
    id: 'success_company',
    type: 'SUCCESS',
    name: '投资移民',
    description: '你创办的企业成功了。EB-5投资移民获批，你用实力证明了价值。',
    difficulty: 4,
    requirements: [
      { type: 'SCENE', scene: 'act3' },
      { type: 'MONEY', currency: 'USD', value: 500000, operator: '>=' },
      { type: 'CHAIN_COMPLETED', chainId: 'chain_business' }
    ]
  },
  success_work: {
    id: 'success_work',
    type: 'SUCCESS',
    name: '技术移民',
    description: '你的技能被一家大公司认可。H1B抽签成功，经过几年等待，你终于拿到了绿卡。',
    difficulty: 3,
    requirements: [
      { type: 'SCENE', scene: 'act3' },
      { type: 'ATTRIBUTE', attribute: 'intelligence', value: 10, operator: '>=' },
      { type: 'CHAIN_COMPLETED', chainId: 'chain_work_visa' }
    ]
  },
  // 注意：大赦结局已被移除。根据设定，主角一旦入狱则无保释、无大赦。
  // 场景3的成功结局只能通过合法途径（绿卡、庇护、婚姻等）达成。
};
```

### 2.4 特殊结局（SPECIAL）

特殊结局表示角色遭遇非死亡、非通关的特殊命运。

#### 2.4.1 特殊结局枚举

```typescript
type SpecialEndingId =
  | 'special_deport'               // 被遣返回中国
  | 'special_deport_voluntary'     // 自愿离境回中国
  | 'special_surrender'            // 自首（后被遣返）
  | 'special_detention'            // 长期拘留（无法遣返的特殊情况）
  | 'special_underground'          // 彻底转入地下（仍在美国）
  | 'special_return_home'          // 主动回国（场景3）
  | 'special_give_up';             // 放弃梦想（场景1）

interface SpecialEndingConfig {
  id: SpecialEndingId;
  type: 'SPECIAL';
  name: string;                    // 结局名称
  description: string;             // 结局描述模板
  isGameOver: boolean;             // 是否结束游戏（有些特殊结局可继续）
  requirements: EndingRequirement[];
}

const SPECIAL_ENDINGS: Record<SpecialEndingId, SpecialEndingConfig> = {
  special_give_up: {
    id: 'special_give_up',
    type: 'SPECIAL',
    name: '放弃',
    description: '你放弃了前往美国的幻想，选择继续留在国内。生活还在继续，只是不再是那个梦想。',
    isGameOver: true,
    requirements: [
      { type: 'SCENE', scene: 'act1' },
      { type: 'TURN_COUNT', value: 30, operator: '>=' }  // 在场景1停留30回合以上
    ]
  },
  special_deport: {
    id: 'special_deport',
    type: 'SPECIAL',
    name: '被遣返',
    description: '移民局找到了你。经过漫长的拘留和审理，你被遣返回中国。一切归零。',
    isGameOver: true,
    requirements: [
      { type: 'SCENE', scene: 'act3' },
      { type: 'CHAIN_COMPLETED', chainId: 'chain_deportation' }
    ]
  },
  special_deport_voluntary: {
    id: 'special_deport_voluntary',
    type: 'SPECIAL',
    name: '自愿离境',
    description: '你选择了自愿离境回中国。虽然没有完成梦想，但至少保住了尊严。',
    isGameOver: true,
    requirements: [
      { type: 'SCENE', scene: 'act3' },
      { type: 'EVENT_TRIGGERED', eventId: 'act3_voluntary_departure' }
    ]
  },
  special_surrender: {
    id: 'special_surrender',
    type: 'SPECIAL',
    name: '投案自首',
    description: '你主动向移民局自首。经过审理，你最终被遣返回中国。',
    isGameOver: true,
    requirements: [
      { type: 'SCENE', scene: 'act3' },
      { type: 'EVENT_TRIGGERED', eventId: 'act3_surrender' }
    ]
  },
  special_detention: {
    id: 'special_detention',
    type: 'SPECIAL',
    name: '长期拘留',
    description: '你被关在移民拘留中心。由于各种原因无法遣返，日复一日，你的案件始终没有结果。',
    isGameOver: true,
    requirements: [
      { type: 'SCENE', scene: 'act3' },
      { type: 'CHAIN_COMPLETED', chainId: 'chain_detention' }
    ]
  },
  special_underground: {
    id: 'special_underground',
    type: 'SPECIAL',
    name: '彻底黑户',
    description: '你决定彻底转入地下，继续留在美国。从此你成了一个没有身份、没有记录、没有过去的人。',
    isGameOver: false,              // 可以继续游玩，但无法获得任何通关结局
    requirements: [
      { type: 'SCENE', scene: 'act3' },
      { type: 'ATTRIBUTE', attribute: 'survival', value: 15, operator: '>=' },
      { type: 'TURN_COUNT', value: 50, operator: '>=' }
    ]
  },
  special_return_home: {
    id: 'special_return_home',
    type: 'SPECIAL',
    name: '落叶归根',
    description: '你想通了，决定主动回中国。也许那里才是你真正的归属。',
    isGameOver: true,
    requirements: [
      { type: 'SCENE', scene: 'act3' },
      { type: 'EVENT_TRIGGERED', eventId: 'act3_return_home' }
    ]
  }
};
```

---

## 3. 结局判定系统

### 3.1 判定时机

结局判定在以下时机执行：

```typescript
enum EndingCheckPoint {
  TURN_START = 'TURN_START',       // 回合开始时（终结态检查）
  TURN_END = 'TURN_END',           // 回合结束时（终结态检查）
  EVENT_COMPLETE = 'EVENT_COMPLETE', // 事件完成后（特殊结局检查）
  CHAIN_COMPLETE = 'CHAIN_COMPLETE', // 事件链完成后（通关结局检查）
  SCENE_TRANSITION = 'SCENE_TRANSITION', // 场景切换时（特殊检查）
  MANUAL_TRIGGER = 'MANUAL_TRIGGER'    // 手动触发（如玩家主动自首）
}
```

### 3.2 判定优先级

```typescript
// 结局判定优先级（高优先级先检查）
const ENDING_CHECK_PRIORITY: EndingType[] = [
  'DEATH',                         // 死亡结局最高优先级
  'SUCCESS',                       // 通关结局次之
  'SPECIAL'                        // 特殊结局最后
];

// 同类型内优先级（ID越靠前越优先）
const DEATH_PRIORITY: DeathEndingId[] = [
  'death_dying',                   // 濒死状态最优先
  'death_breakdown',
  'death_destitution',
  'death_raid',
  'death_violence',
  'death_accident',
  'death_environment',
  'death_illness'
];
```

### 3.3 判定算法

```typescript
class EndingManager {
  private character: Character;
  private gameState: GameState;
  private hasEnded: boolean = false;  // 确保只有一个结局

  /**
   * 主判定入口
   * @returns 触发的结局，如无则返回null
   */
  checkEnding(checkPoint: EndingCheckPoint, context?: EndingContext): Ending | null {
    // 已结束则不再判定
    if (this.hasEnded || this.character.ending) {
      return null;
    }

    // 按优先级检查各类型结局
    for (const endingType of ENDING_CHECK_PRIORITY) {
      const ending = this.checkEndingByType(endingType, checkPoint, context);
      if (ending) {
        return this.triggerEnding(ending);
      }
    }

    return null;
  }

  /**
   * 按类型检查结局
   */
  private checkEndingByType(
    type: EndingType,
    checkPoint: EndingCheckPoint,
    context?: EndingContext
  ): Ending | null {
    switch (type) {
      case 'DEATH':
        return this.checkDeathEnding(checkPoint, context);
      case 'SUCCESS':
        return this.checkSuccessEnding(checkPoint, context);
      case 'SPECIAL':
        return this.checkSpecialEnding(checkPoint, context);
      default:
        return null;
    }
  }

  /**
   * 检查死亡结局
   */
  private checkDeathEnding(
    checkPoint: EndingCheckPoint,
    context?: EndingContext
  ): Ending | null {
    // 只在回合开始/结束时检查终结态
    if (checkPoint !== 'TURN_START' && checkPoint !== 'TURN_END') {
      return null;
    }

    const terminalState = this.character.terminalState;
    if (!terminalState) {
      return null;
    }

    // 检查终结态倒计时
    if (terminalState.countdown === 0) {
      // 根据终结态类型确定死亡结局
      const endingId = this.mapTerminalStateToDeathEnding(terminalState.type);
      return this.createEnding(endingId);
    }

    return null;
  }

  /**
   * 检查通关结局
   */
  private checkSuccessEnding(
    checkPoint: EndingCheckPoint,
    context?: EndingContext
  ): Ending | null {
    // 主要在事件链完成时检查
    if (checkPoint !== 'CHAIN_COMPLETE' && checkPoint !== 'EVENT_COMPLETE') {
      return null;
    }

    // 检查所有通关结局的条件
    for (const [endingId, config] of Object.entries(SUCCESS_ENDINGS)) {
      if (this.checkRequirements(config.requirements, context)) {
        return this.createEnding(endingId as SuccessEndingId);
      }
    }

    return null;
  }

  /**
   * 检查特殊结局
   */
  private checkSpecialEnding(
    checkPoint: EndingCheckPoint,
    context?: EndingContext
  ): Ending | null {
    // 检查所有特殊结局的条件
    for (const [endingId, config] of Object.entries(SPECIAL_ENDINGS)) {
      if (this.checkRequirements(config.requirements, context)) {
        return this.createEnding(endingId as SpecialEndingId);
      }
    }

    return null;
  }

  /**
   * 检查结局解锁条件
   */
  private checkRequirements(
    requirements: EndingRequirement[],
    context?: EndingContext
  ): boolean {
    return requirements.every(req => this.checkSingleRequirement(req, context));
  }

  /**
   * 检查单个条件
   */
  private checkSingleRequirement(
    req: EndingRequirement,
    context?: EndingContext
  ): boolean {
    switch (req.type) {
      case 'SCENE':
        return this.character.status.currentScene === req.scene;
      
      case 'ATTRIBUTE':
        const attrValue = this.character.attributes[req.attribute];
        return this.compareValue(attrValue, req.value, req.operator);
      
      case 'MONEY':
        const money = req.currency === 'CNY' 
          ? this.character.resources.money.cny 
          : this.character.resources.money.usd;
        return this.compareValue(money, req.value, req.operator);
      
      case 'ITEM':
        return this.character.inventory.hasItem(req.itemId, req.count || 1);
      
      case 'CHAIN_COMPLETED':
        return this.character.progression.completedChains.includes(req.chainId);
      
      case 'EVENT_TRIGGERED':
        return this.character.statistics.triggeredEvents.includes(req.eventId);
      
      case 'TURN_COUNT':
        return this.compareValue(
          this.character.status.turnCount.total,
          req.value,
          req.operator
        );
      
      case 'CUSTOM':
        return req.check(this.character, context);
      
      default:
        return false;
    }
  }

  /**
   * 数值比较
   */
  private compareValue(
    actual: number,
    expected: number,
    operator: '>=' | '<=' | '>' | '<' | '==' = '>='
  ): boolean {
    switch (operator) {
      case '>=': return actual >= expected;
      case '<=': return actual <= expected;
      case '>': return actual > expected;
      case '<': return actual < expected;
      case '==': return actual === expected;
      default: return false;
    }
  }

  /**
   * 终结态类型映射到死亡结局
   */
  private mapTerminalStateToDeathEnding(type: TerminalStateType): DeathEndingId {
    const mapping: Record<TerminalStateType, DeathEndingId> = {
      'DYING': 'death_dying',
      'BREAKDOWN': 'death_breakdown',
      'DESTITUTION': 'death_destitution'
    };
    return mapping[type];
  }
}
```

### 3.4 结局解锁条件类型

```typescript
type EndingRequirement =
  | SceneRequirement
  | AttributeRequirement
  | MoneyRequirement
  | ItemRequirement
  | ChainRequirement
  | EventRequirement
  | TurnCountRequirement
  | CustomRequirement;

interface SceneRequirement {
  type: 'SCENE';
  scene: SceneId;
}

interface AttributeRequirement {
  type: 'ATTRIBUTE';
  attribute: keyof Attributes;
  value: number;
  operator?: '>=' | '<=' | '>' | '<' | '==';
}

interface MoneyRequirement {
  type: 'MONEY';
  currency: 'CNY' | 'USD';
  value: number;
  operator?: '>=' | '<=' | '>' | '<' | '==';
}

interface ItemRequirement {
  type: 'ITEM';
  itemId: string;
  count?: number;
}

interface ChainRequirement {
  type: 'CHAIN_COMPLETED';
  chainId: string;
}

interface EventRequirement {
  type: 'EVENT_TRIGGERED';
  eventId: string;
}

interface TurnCountRequirement {
  type: 'TURN_COUNT';
  value: number;
  operator?: '>=' | '<=' | '>' | '<' | '==';
}

interface CustomRequirement {
  type: 'CUSTOM';
  check: (character: Character, context?: EndingContext) => boolean;
}
```

---

## 4. 结局展示系统

### 4.1 结局数据结构

```typescript
interface Ending {
  id: string;                      // 结局ID
  type: EndingType;                // 结局类型
  name: string;                    // 结局名称
  description: string;             // 结局描述文本
  
  // 触发信息
  triggeredAt: {
    turn: number;                  // 触发回合
    scene: SceneId;                // 触发场景
    timestamp: number;             // 时间戳
  };
  
  // 结算数据
  statistics: EndingStatistics;    // 结局时统计
  
  // 展示配置
  display: {
    background: string;            // 背景图/色
    music?: string;                // 结局BGM
    effects?: string[];            // 特效列表
  };
}

interface EndingStatistics {
  // 基础统计
  totalTurns: number;              // 总回合数
  totalDays: number;               // 总天数（换算）
  scenesVisited: SceneId[];        // 访问过的场景
  
  // 资源统计
  finalResources: Resources;       // 最终资源状态
  peakResources: {                 // 资源峰值
    health: number;
    mental: number;
    moneyCNY: number;
    moneyUSD: number;
  };
  
  // 属性统计
  finalAttributes: Attributes;     // 最终属性
  attributeGrowth: {               // 属性成长
    [K in keyof Attributes]: {
      initial: number;
      final: number;
      growth: number;
    }
  };
  
  // 事件统计
  eventsTriggered: number;         // 触发事件总数
  uniqueEvents: string[];          // 触发的不重复事件
  chainsCompleted: string[];       // 完成的事件链
  
  // 经济统计
  totalEarned: {                   // 总收入
    cny: number;
    usd: number;
  };
  totalSpent: {                    // 总支出
    cny: number;
    usd: number;
  };
  
  // 生存统计
  timesInTerminalState: number;    // 进入终结态次数
  closeCalls: number;              // 死里逃生次数（濒死/崩溃中恢复）
}
```

### 4.2 结局展示流程

```typescript
class EndingDisplayManager {
  /**
   * 触发结局并进入展示流程
   */
  async showEnding(ending: Ending): Promise<void> {
    // 1. 暂停游戏
    this.gameState.pause();
    
    // 2. 生成结算数据
    const statistics = this.generateStatistics();
    ending.statistics = statistics;
    
    // 3. 保存结局到角色
    this.character.ending = ending;
    
    // 4. 保存到历史记录
    this.saveToHistory(ending);
    
    // 5. 播放结局动画
    await this.playEndingSequence(ending);
    
    // 6. 显示结局界面
    await this.showEndingScreen(ending);
    
    // 7. 解锁检查
    this.checkUnlocks(ending);
  }

  /**
   * 生成结局统计
   */
  private generateStatistics(): EndingStatistics {
    const stats = this.character.statistics;
    
    return {
      totalTurns: this.character.status.turnCount.total,
      totalDays: Math.ceil(this.character.status.turnCount.total / 3), // 假设每天3回合
      scenesVisited: stats.scenesVisited,
      
      finalResources: { ...this.character.resources },
      peakResources: { ...stats.peakResources },
      
      finalAttributes: { ...this.character.attributes },
      attributeGrowth: this.calculateAttributeGrowth(),
      
      eventsTriggered: stats.eventsTriggered,
      uniqueEvents: [...stats.uniqueEvents],
      chainsCompleted: [...this.character.progression.completedChains],
      
      totalEarned: { ...stats.totalEarned },
      totalSpent: { ...stats.totalSpent },
      
      timesInTerminalState: stats.timesInTerminalState,
      closeCalls: stats.closeCalls
    };
  }

  /**
   * 播放结局动画序列
   */
  private async playEndingSequence(ending: Ending): Promise<void> {
    const config = ENDING_TYPE_CONFIGS[ending.type];
    
    // 1. 淡出当前画面
    await this.screenTransition.fadeOut(1000);
    
    // 2. 设置结局背景
    this.setEndingBackground(ending.display.background);
    
    // 3. 播放音效/音乐
    if (ending.display.music) {
      this.audio.playBGM(ending.display.music);
    }
    
    // 4. 淡入
    await this.screenTransition.fadeIn(1000);
    
    // 5. 播放特效
    if (ending.display.effects) {
      for (const effect of ending.display.effects) {
        await this.playEffect(effect);
      }
    }
  }

  /**
   * 显示结局界面
   */
  private async showEndingScreen(ending: Ending): Promise<void> {
    const config = ENDING_TYPE_CONFIGS[ending.type];
    
    // 结局界面包含：
    // - 结局图标和名称
    // - 结局描述文本（打字机效果）
    // - 统计摘要（可展开）
    // - "查看详细"按钮
    // - "返回主菜单"按钮
    // - "重新开始"按钮
    
    this.ui.showEndingModal({
      icon: config.icon,
      title: ending.name,
      typeName: config.name,
      typeColor: config.color,
      description: ending.description,
      statistics: ending.statistics,
      onShowDetails: () => this.showDetailedStatistics(ending.statistics),
      onRestart: () => this.restartGame(),
      onMainMenu: () => this.returnToMainMenu()
    });
  }
}
```

### 4.3 结局界面结构

```typescript
interface EndingScreenProps {
  // 结局信息
  ending: Ending;
  typeConfig: EndingTypeConfig;
  
  // 统计摘要（默认显示）
  summary: {
    survivalTime: string;          // 存活时间（如"32天"）
    finalScene: string;            // 最终场景
    turnsInScene3: number;         // 在美国生存回合数
  };
  
  // 详细统计（可展开）
  detailedStats: EndingStatistics;
  
  // 解锁内容（如果有）
  unlocks?: {
    newEndings: string[];          // 新解锁的结局
    newItems: string[];            // 新解锁的物品
    newEvents: string[];           // 新解锁的事件
    achievements: string[];        // 获得的成就
  };
}
```

---

## 5. 结局历史与多周目

### 5.1 结局历史记录

```typescript
interface EndingHistory {
  // 元信息
  version: number;                 // 历史记录版本
  lastUpdated: number;             // 最后更新时间
  
  // 统计摘要
  summary: {
    totalPlaythroughs: number;     // 总通关次数
    totalDeaths: number;           // 死亡次数
    totalSuccesses: number;        // 通关次数
    totalSpecials: number;         // 特殊结局次数
    totalPlayTime: number;         // 总游戏时长（分钟）
  };
  
  // 各结局记录
  endings: EndingRecord[];
  
  // 解锁状态
  unlocks: UnlockState;
}

interface EndingRecord {
  id: string;                      // 记录ID
  characterId: string;             // 角色ID
  endingId: string;                // 结局ID
  endingType: EndingType;          // 结局类型
  
  // 时间信息
  createdAt: number;               // 角色创建时间
  endedAt: number;                 // 结局触发时间
  duration: number;                // 游戏时长（分钟）
  
  // 关键数据
  finalScene: SceneId;             // 最终场景
  totalTurns: number;              // 总回合数
  finalAttributes: Attributes;     // 最终属性
  
  // 标记
  isNew: boolean;                  // 是否新解锁的结局
  isFavorite: boolean;             // 是否收藏
}

interface UnlockState {
  // 已解锁的结局
  unlockedEndings: string[];       // 已解锁的结局ID列表
  
  // 首次解锁时间
  firstUnlockTime: Record<string, number>;
  
  // 各结局达成次数
  endingCounts: Record<string, number>;
  
  // 解锁的内容
  unlockedItems: string[];         // 新物品
  unlockedEvents: string[];        // 新事件
  unlockedScenes: string[];        // 新场景
  unlockedCharacters: string[];    // 新角色预设
}
```

### 5.2 历史记录管理

```typescript
class EndingHistoryManager {
  private history: EndingHistory;
  private storage: Storage;         // localStorage or similar

  constructor() {
    this.storage = window.localStorage;
    this.history = this.loadHistory();
  }

  /**
   * 保存结局到历史
   */
  saveEnding(ending: Ending, character: Character): EndingRecord {
    const record: EndingRecord = {
      id: generateUUID(),
      characterId: character.id,
      endingId: ending.id,
      endingType: ending.type,
      createdAt: character.creationTime,
      endedAt: Date.now(),
      duration: (Date.now() - character.creationTime) / 60000, // 转换为分钟
      finalScene: character.status.currentScene,
      totalTurns: character.status.turnCount.total,
      finalAttributes: { ...character.attributes },
      isNew: !this.history.unlocks.unlockedEndings.includes(ending.id),
      isFavorite: false
    };

    // 添加到历史
    this.history.endings.unshift(record);  // 新记录在前
    
    // 限制历史记录数量（保留最近100条）
    if (this.history.endings.length > 100) {
      this.history.endings = this.history.endings.slice(0, 100);
    }

    // 更新统计
    this.updateSummary(record);
    
    // 更新解锁状态
    this.updateUnlocks(ending, record.isNew);
    
    // 保存
    this.saveHistory();

    return record;
  }

  /**
   * 更新统计摘要
   */
  private updateSummary(record: EndingRecord): void {
    this.history.summary.totalPlaythroughs++;
    this.history.summary.totalPlayTime += record.duration;
    
    switch (record.endingType) {
      case 'DEATH':
        this.history.summary.totalDeaths++;
        break;
      case 'SUCCESS':
        this.history.summary.totalSuccesses++;
        break;
      case 'SPECIAL':
        this.history.summary.totalSpecials++;
        break;
    }
  }

  /**
   * 更新解锁状态
   */
  private updateUnlocks(ending: Ending, isNew: boolean): void {
    // 记录结局达成次数
    const currentCount = this.history.unlocks.endingCounts[ending.id] || 0;
    this.history.unlocks.endingCounts[ending.id] = currentCount + 1;

    // 如果是新解锁的结局
    if (isNew) {
      this.history.unlocks.unlockedEndings.push(ending.id);
      this.history.unlocks.firstUnlockTime[ending.id] = Date.now();
      
      // 检查是否解锁新内容
      this.checkContentUnlocks(ending);
    }
  }

  /**
   * 检查内容解锁
   */
  private checkContentUnlocks(ending: Ending): void {
    const config = this.getEndingConfig(ending.id);
    
    // 解锁关联内容
    if (config?.unlocksContent) {
      for (const contentId of config.unlocksContent) {
        if (contentId.startsWith('item_')) {
          this.history.unlocks.unlockedItems.push(contentId);
        } else if (contentId.startsWith('event_')) {
          this.history.unlocks.unlockedEvents.push(contentId);
        } else if (contentId.startsWith('avatar_')) {
          this.history.unlocks.unlockedCharacters.push(contentId);
        }
      }
    }
  }

  /**
   * 获取解锁进度
   */
  getUnlockProgress(): {
    totalEndings: number;
    unlockedEndings: number;
    completionRate: number;
    typeBreakdown: Record<EndingType, { total: number; unlocked: number }>;
  } {
    const deathTotal = Object.keys(DEATH_ENDINGS).length;
    const successTotal = Object.keys(SUCCESS_ENDINGS).length;
    const specialTotal = Object.keys(SPECIAL_ENDINGS).length;
    const total = deathTotal + successTotal + specialTotal;

    const unlockedDeaths = this.countUnlockedByType('DEATH');
    const unlockedSuccesses = this.countUnlockedByType('SUCCESS');
    const unlockedSpecials = this.countUnlockedByType('SPECIAL');

    return {
      totalEndings: total,
      unlockedEndings: this.history.unlocks.unlockedEndings.length,
      completionRate: this.history.unlocks.unlockedEndings.length / total,
      typeBreakdown: {
        DEATH: { total: deathTotal, unlocked: unlockedDeaths },
        SUCCESS: { total: successTotal, unlocked: unlockedSuccesses },
        SPECIAL: { total: specialTotal, unlocked: unlockedSpecials }
      }
    };
  }

  /**
   * 持久化历史记录
   */
  private saveHistory(): void {
    this.storage.setItem('ending_history', JSON.stringify(this.history));
  }

  /**
   * 加载历史记录
   */
  private loadHistory(): EndingHistory {
    const data = this.storage.getItem('ending_history');
    if (data) {
      return JSON.parse(data);
    }
    
    // 初始化空历史
    return {
      version: 1,
      lastUpdated: Date.now(),
      summary: {
        totalPlaythroughs: 0,
        totalDeaths: 0,
        totalSuccesses: 0,
        totalSpecials: 0,
        totalPlayTime: 0
      },
      endings: [],
      unlocks: {
        unlockedEndings: [],
        firstUnlockTime: {},
        endingCounts: {},
        unlockedItems: [],
        unlockedEvents: [],
        unlockedScenes: [],
        unlockedCharacters: []
      }
    };
  }
}
```

### 5.3 多周目加成

```typescript
interface NewGamePlusBonus {
  // 基于历史解锁的加成
  startingAttributeBonus: Partial<Attributes>;  // 初始属性加成
  startingMoneyBonus: {                         // 初始金钱加成
    cny: number;
    usd: number;
  };
  unlockedItems: string[];                      // 可用的新物品
  unlockedEvents: string[];                     // 可能出现的新事件
  hintUnlocked: boolean;                        // 是否解锁提示系统
}

class NewGamePlusManager {
  /**
   * 计算多周目加成
   */
  calculateBonus(history: EndingHistory): NewGamePlusBonus {
    const bonus: NewGamePlusBonus = {
      startingAttributeBonus: {},
      startingMoneyBonus: { cny: 0, usd: 0 },
      unlockedItems: [],
      unlockedEvents: [],
      hintUnlocked: false
    };

    // 根据通关次数给予加成
    const successCount = history.summary.totalSuccesses;
    
    if (successCount >= 1) {
      // 首次通关：解锁提示系统
      bonus.hintUnlocked = true;
      bonus.startingMoneyBonus.cny = 500;
    }
    
    if (successCount >= 3) {
      // 3次通关：初始属性+1
      bonus.startingAttributeBonus = {
        physique: 1,
        intelligence: 1,
        social: 1
      };
      bonus.startingMoneyBonus.cny = 1000;
    }
    
    if (successCount >= 5) {
      // 5次通关：解锁新物品
      bonus.unlockedItems = history.unlocks.unlockedItems;
      bonus.startingMoneyBonus.usd = 100;
    }

    // 解锁基于结局历史的事件
    if (history.unlocks.unlockedEndings.includes('success_marriage')) {
      bonus.unlockedEvents.push('act1_meet_spouse_early');
    }
    
    if (history.unlocks.unlockedEndings.includes('success_company')) {
      bonus.unlockedEvents.push('act1_business_idea');
    }

    return bonus;
  }
}
```

---

## 6. 数据结构（TypeScript 接口）

### 6.1 完整类型定义

```typescript
// ============================================
// 基础类型
// ============================================

type EndingType = 'DEATH' | 'SUCCESS' | 'SPECIAL';
type DeathEndingId = keyof typeof DEATH_ENDINGS;
type SuccessEndingId = keyof typeof SUCCESS_ENDINGS;
type SpecialEndingId = keyof typeof SPECIAL_ENDINGS;
type EndingId = DeathEndingId | SuccessEndingId | SpecialEndingId;

// ============================================
// 结局配置
// ============================================

interface BaseEndingConfig {
  id: string;
  type: EndingType;
  name: string;
  description: string;
  requirements: EndingRequirement[];
}

interface DeathEndingConfig extends BaseEndingConfig {
  type: 'DEATH';
  terminalState?: TerminalStateType;
  triggerEvent?: string;
}

interface SuccessEndingConfig extends BaseEndingConfig {
  type: 'SUCCESS';
  difficulty: 1 | 2 | 3 | 4 | 5;
  unlocksContent?: string[];
}

interface SpecialEndingConfig extends BaseEndingConfig {
  type: 'SPECIAL';
  isGameOver: boolean;
}

type EndingConfig = DeathEndingConfig | SuccessEndingConfig | SpecialEndingConfig;

// ============================================
// 结局实例
// ============================================

interface Ending {
  id: EndingId;
  type: EndingType;
  name: string;
  description: string;
  triggeredAt: {
    turn: number;
    scene: SceneId;
    timestamp: number;
  };
  statistics: EndingStatistics;
  display: {
    background: string;
    music?: string;
    effects?: string[];
  };
}

// ============================================
// 解锁条件
// ============================================

type EndingRequirement =
  | { type: 'SCENE'; scene: SceneId }
  | { type: 'ATTRIBUTE'; attribute: keyof Attributes; value: number; operator?: ComparisonOperator }
  | { type: 'MONEY'; currency: 'CNY' | 'USD'; value: number; operator?: ComparisonOperator }
  | { type: 'ITEM'; itemId: string; count?: number }
  | { type: 'CHAIN_COMPLETED'; chainId: string }
  | { type: 'EVENT_TRIGGERED'; eventId: string }
  | { type: 'TURN_COUNT'; value: number; operator?: ComparisonOperator }
  | { type: 'CUSTOM'; check: (character: Character, context?: EndingContext) => boolean };

type ComparisonOperator = '>=' | '<=' | '>' | '<' | '==';

// ============================================
// 结局上下文
// ============================================

interface EndingContext {
  checkPoint: EndingCheckPoint;
  triggerEvent?: GameEvent;        // 触发结局的事件（如果有）
  triggerChain?: EventChain;       // 触发结局的事件链（如果有）
  previousScene?: SceneId;         // 上一个场景（场景切换时）
}

enum EndingCheckPoint {
  TURN_START = 'TURN_START',
  TURN_END = 'TURN_END',
  EVENT_COMPLETE = 'EVENT_COMPLETE',
  CHAIN_COMPLETE = 'CHAIN_COMPLETE',
  SCENE_TRANSITION = 'SCENE_TRANSITION',
  MANUAL_TRIGGER = 'MANUAL_TRIGGER'
}

// ============================================
// 统计
// ============================================

interface EndingStatistics {
  totalTurns: number;
  totalDays: number;
  scenesVisited: SceneId[];
  finalResources: Resources;
  peakResources: {
    health: number;
    mental: number;
    moneyCNY: number;
    moneyUSD: number;
  };
  finalAttributes: Attributes;
  attributeGrowth: AttributeGrowthRecord;
  eventsTriggered: number;
  uniqueEvents: string[];
  chainsCompleted: string[];
  totalEarned: { cny: number; usd: number };
  totalSpent: { cny: number; usd: number };
  timesInTerminalState: number;
  closeCalls: number;
}

interface AttributeGrowthRecord {
  [key: string]: {
    initial: number;
    final: number;
    growth: number;
  };
}

// ============================================
// 角色扩展（增加结局字段）
// ============================================

interface Character {
  // ... 原有字段 ...
  
  // 结局（游戏结束时设置）
  ending?: Ending;
}
```

---

## 7. 与 SceneTransition 的集成

### 7.1 场景切换时的死亡检查

场景2（跨境穿越）是死亡概率最高的场景，需要在场景切换时进行特殊处理。

```typescript
interface SceneTransitionResult {
  success: boolean;
  ending?: Ending;                 // 如果切换失败导致死亡
  message?: string;                // 失败原因
}

class SceneTransitionManager {
  private endingManager: EndingManager;

  /**
   * 执行场景切换
   */
  async transitionTo(
    targetScene: SceneId,
    method: TransitionMethod
  ): Promise<SceneTransitionResult> {
    // 1. 检查切换条件
    const checkResult = this.checkTransitionRequirements(targetScene, method);
    if (!checkResult.canTransition) {
      return {
        success: false,
        message: checkResult.reason
      };
    }

    // 2. 执行切换前事件（可能触发死亡结局）
    const preResult = await this.executePreTransitionEvents(targetScene, method);
    if (preResult.ending) {
      return {
        success: false,
        ending: preResult.ending
      };
    }

    // 3. 执行场景切换
    await this.performTransition(targetScene, method);

    // 4. 执行切换后事件（可能触发结局）
    const postResult = await this.executePostTransitionEvents(targetScene, method);
    if (postResult.ending) {
      return {
        success: false,
        ending: postResult.ending
      };
    }

    // 5. 检查是否触发通关结局（如场景3切换成功且满足条件）
    const ending = this.endingManager.checkEnding('SCENE_TRANSITION', {
      previousScene: this.currentScene,
      checkPoint: 'SCENE_TRANSITION'
    });

    if (ending) {
      return {
        success: false,
        ending
      };
    }

    return { success: true };
  }

  /**
   * 场景2的特殊死亡检查
   */
  private async executePreTransitionEvents(
    targetScene: SceneId,
    method: TransitionMethod
  ): Promise<{ ending?: Ending }> {
    // 场景2到场景3的穿越特别危险
    if (this.currentScene === 'act2' && targetScene === 'act3') {
      // 检查穿越方式的风险
      const riskLevel = this.calculateCrossingRisk(method);
      
      // 高风险可能导致死亡
      if (riskLevel >= 0.8) {
        const deathCheck = Math.random();
        if (deathCheck < riskLevel - 0.5) {
          // 触发死亡结局
          const ending = this.endingManager.createEnding('death_environment');
          return { ending };
        }
      }
    }

    return {};
  }

  /**
   * 计算穿越风险
   */
  private calculateCrossingRisk(method: TransitionMethod): number {
    const baseRisk: Record<TransitionMethod, number> = {
      'desert_crossing': 0.6,
      'river_crossing': 0.7,
      'border_tunnel': 0.4,
      'visa_overstay': 0.1,
      'asylum_request': 0.2
    };

    let risk = baseRisk[method] || 0.5;

    // 属性影响
    const survival = this.character.attributes.survival;
    risk -= survival * 0.02;  // 生存能力每点降低2%风险

    // 道具影响
    if (this.character.inventory.hasItem('guide_experienced')) {
      risk -= 0.1;
    }

    return Math.max(0, Math.min(1, risk));
  }
}

type TransitionMethod = 
  | 'desert_crossing'              // 沙漠穿越
  | 'river_crossing'               // 河流穿越
  | 'border_tunnel'                // 边境隧道
  | 'visa_overstay'                // 签证逾期
  | 'asylum_request';              // 申请庇护入境
```

### 7.2 事件中的死亡触发

```typescript
// 在 EventResult 中支持触发结局
interface EventResult {
  // ... 原有字段 ...
  
  special?: {
    gameOver?: boolean;
    endingId?: EndingId;           // 直接指定结局
    endingType?: EndingType;       // 或让系统自动选择
    sceneTransition?: SceneId;
    redirectEvent?: string;
  };
}

// 在事件执行器中处理结局触发
class EventExecutor {
  private endingManager: EndingManager;

  async executeEvent(event: GameEvent): Promise<EventResult> {
    // 执行事件逻辑
    const result = await this.runEventLogic(event);

    // 检查结果是否触发结局
    if (result.special?.endingId) {
      const ending = this.endingManager.createEnding(result.special.endingId);
      await this.endingManager.triggerEnding(ending);
    } else if (result.special?.gameOver) {
      // 让系统自动判定结局
      const ending = this.endingManager.checkEnding('EVENT_COMPLETE', {
        triggerEvent: event,
        checkPoint: 'EVENT_COMPLETE'
      });
      
      if (ending) {
        await this.endingManager.triggerEnding(ending);
      }
    }

    return result;
  }
}
```

---

## 8. 附录

### 8.1 结局ID命名规范

| 类型 | 前缀 | 示例 |
|-----|------|------|
| 死亡结局 | `death_` | `death_dying`, `death_raid`, `death_prison` |
| 通关结局 | `success_` | `success_green_card`, `success_asylum` |
| 特殊结局 | `special_` | `special_deport`, `special_give_up` |

### 8.1.1 场景3结局约束

根据设计设定，**场景3的结局只有两种可能**：
1. **留在美国**：通关结局（绿卡/庇护/婚姻等）或彻底黑户
2. **回中国**：被遣返、自愿离境、自首后遣返、主动回国、长期拘留

**已移除的结局类型**（不符合设定）：
- ❌ 转往第三国（`special_third_country`）
- ❌ 转往加拿大（`special_canada`）
- ❌ 转往欧洲（`special_europe`）
- ❌ 失踪/下落不明（`special_missing`）
- ❌ 大赦受益人（`success_amnesty`）- 入狱后无大赦

### 8.1.2 入狱相关约束

根据设定，**一旦入狱则无法出狱**：
- 无保释机制
- 无大赦机制
- 狱中结局为 `death_prison`（狱中终老）或 `special_detention`（长期拘留）

### 8.2 结局配置示例

```yaml
# 死亡结局配置示例
ending:
  id: death_dying
  type: DEATH
  name: 体力耗尽
  description: 你的身体终于支撑不住了。在异国他乡的某个角落，你停止了呼吸。
  terminalState: DYING

# 通关结局配置示例
ending:
  id: success_asylum
  type: SUCCESS
  name: 庇护通过
  description: 移民法官相信了你说的一切。庇护获批，你可以合法留在这里了。
  difficulty: 3
  requirements:
    - type: SCENE
      scene: act3
    - type: CHAIN_COMPLETED
      chainId: chain_asylum
    - type: ATTRIBUTE
      attribute: intelligence
      value: 10
      operator: ">="
  unlocksContent:
    - title_asylum_seeker

# 特殊结局配置示例 - 场景1放弃
ending:
  id: special_give_up
  type: SPECIAL
  name: 放弃
  description: 你放弃了前往美国的幻想，选择继续留在国内。生活还在继续，只是不再是那个梦想。
  isGameOver: true
  requirements:
    - type: SCENE
      scene: act1
    - type: TURN_COUNT
      value: 30
      operator: ">="

# 特殊结局配置示例 - 被遣返
ending:
  id: special_deport
  type: SPECIAL
  name: 被遣返
  description: 移民局找到了你。经过漫长的拘留和审理，你被遣返回中国。一切归零。
  isGameOver: true
  requirements:
    - type: SCENE
      scene: act3
    - type: CHAIN_COMPLETED
      chainId: chain_deportation
```

### 8.3 结局触发示例代码

```typescript
// 在终结态管理器中触发死亡结局
class TerminalStateManager {
  private handleTimeout(state: TerminalState): void {
    const { timeoutConsequence } = state;
    
    if (timeoutConsequence.gameOver) {
      // 创建对应的死亡结局
      const endingId = this.mapTerminalStateToDeathEnding(state.type);
      const ending = this.endingManager.createEnding(endingId);
      
      // 触发结局
      this.endingManager.triggerEnding(ending);
    }
  }
}

// 在事件链中触发通关结局
class EventChainManager {
  private completeChain(chain: EventChain, finalNode: ChainNode): void {
    // 标记链完成
    this.character.progression.completedChains.push(chain.id);
    
    // 检查是否触发通关结局
    const ending = this.endingManager.checkEnding('CHAIN_COMPLETE', {
      triggerChain: chain,
      checkPoint: 'CHAIN_COMPLETE'
    });
    
    if (ending) {
      this.endingManager.triggerEnding(ending);
    }
  }
}
```

---

> **维护提示**：本文档随项目演进更新。新增结局类型时需同步更新本文档，并在 `EndingHistoryManager` 中添加相应的解锁检查逻辑。
> 
> **设计约束提醒**：
> - 场景3的结局只能是在美国（通关/黑户）或回中国（各种遣返/回国），**禁止添加转往其他国家的结局**
> - 入狱相关结局必须是终局，**禁止添加保释、越狱、大赦等可逆结局**
> - 场景1的"放弃"结局是固定设计，**触发条件不可更改**（30回合+场景1）
