# 场景系统架构设计

## 1. 概述

本文档定义《去美国》游戏的核心场景系统架构，包含场景数据结构、单向场景切换机制、独立事件池管理、场景检定系统等核心模块的技术实现规范。

**核心设计原则**：
- **单向流动**：场景1 → 场景2 → 场景3，或 场景1 → 场景3（直飞），不可返回
- **完全独立**：每个场景拥有独立的事件池、道具栏和状态
- **从零开始**：场景切换时清空常驻道具栏，制造压迫感
- **唯一保留**：全局书籍池跨场景保留，作为整局游戏的战略资源
- **门槛与风险平衡**：走线门槛低但必须经历场景2高死亡率；直飞签证门槛高但跳过场景2
- **黑户非终局**：签证逾期或失效转为黑户后，持续扣除心理健康（压力），但不直接导致游戏结束，玩家仍可继续游戏寻找转机

---

## 2. 场景数据结构

### 2.1 场景定义

```typescript
// 场景枚举（单向流动）
type SceneId = 'act1' | 'act2' | 'act3';

// 场景配置（静态配置，游戏启动时加载）
interface SceneConfig {
  id: SceneId;
  name: string;                  // 场景显示名称
  description: string;           // 场景描述
  
  // 场景基础配置
  baseConfig: {
    initialTurn: number;         // 起始回合数（继承累计，不从0开始）
    actionPointRecovery: number; // 行动点每回合恢复量
    maxActionPoints: number;     // 行动点上限
  };
  
  // 货币类型
  currency: 'CNY' | 'USD';       // 场景1用人民币，场景2/3用美元
  
  // 环境Debuff配置
  environmentalDebuff: EnvironmentalDebuffConfig;
  
  // 启动物资（场景切换后给予玩家的基础物资）
  starterKit: StarterKitConfig;
}

// 场景运行时数据（随游戏进行变化）
interface SceneRuntimeData {
  sceneId: SceneId;
  
  // 回合计数（本场景内）
  turnCount: number;
  
  // 场景特有状态
  sceneState: SceneSpecificState;
  
  // 已触发事件记录（防止重复触发）
  triggeredEvents: Set<string>;
  
  // 已完成事件记录
  completedEvents: Set<string>;
  
  // 进行中的事件链
  activeChains: Map<string, ChainProgress>;
  
  // 场景切换检定进度
  transitionProgress: TransitionProgress;
  
  // 【债务系统】场景内已触发的借贷事件记录
  debtEventsTriggered: {
    loanEventIds: Set<string>;      // 已触发的借贷事件ID
    hasTakenLoan: boolean;          // 是否已借过贷（场景1）
    hasTakenEmergencyLoan: boolean; // 是否使用过紧急借贷（场景2）
  };
}

// 【债务系统】跨场景数据传输结构
// 注：Debt 类型定义详见 DebtSystemArchitecture.md
interface CrossSceneData {
  // 跨场景保留的书籍池
  bookPool: Book[];
  
  // 【新增】跨场景携带的金钱
  carriedMoney: {
    cny: number;
    usd: number;
  };
  
  // 进行中的跨场景事件链
  crossSceneChains: ChainProgress[];
  
  // 关键剧情道具
  keyItems: string[];
  
  // 累计统计
  accumulatedStats: AccumulatedStats;
  
  // 【债务系统】跨场景债务（仅场景2债务不清零）
  carriedDebt?: Debt[];  // 从场景2带入场景3的债务
}

// 累计统计结构
interface AccumulatedStats {
  totalTurns: number;
  moneySpent: number;
  eventsCompleted: number;
}
```

### 2.2 场景特定状态

每个场景拥有独特的状态数据：

```typescript
// 场景特定状态联合类型
type SceneSpecificState = Act1State | Act2State | Act3State;

// 场景1：国内准备阶段
interface Act1State {
  // 灵光一闪触发标记（解锁旅游签证路径）
  hasInsightTriggered: boolean;
  
  // 【债务系统】场景1借贷状态
  hasTakenLoan: boolean;         // 是否已借过贷
  loanAmount: number;            // 借贷总额（人民币）
}

type DepartureMethod = 'flight' | 'land_crossing' | 'student_visa' | 'tourist_visa' | 'asylum';

// 场景2：跨境穿越阶段
// 
// 【新设计】两阶段结构：
// - 阶段1（雨林）：进度 0-4 步，每回合强制负面事件，选择向导带路或独自穿越
// - 阶段2（边境小镇）：进度 = 5，进行小镇活动，选择穿越方式
//
// 【法律真空】环境压力：南美雨林与边境地区缺乏法律保障，每回合强制遭遇危险事件
interface Act2State {
  // 当前阶段标识
  currentPhase: 'rainforest' | 'border_town';
  
  // 雨林进度（0-4步，第5步进入边境小镇）
  // UI展示："第 X 步 / 共 5 步" + 进度条 + 足迹标记
  progress: number;
  
  // 物资储备（场景2起始时给予基础物资）
  supplyStatus: {
    water: number;               // 水量（天数）
    food: number;                // 食物（天数）
    shelter: boolean;            // 是否有遮蔽
  };
  
  // 边境墙缺口发现状态
  gapDiscovered: boolean;        // 是否已发现边境墙漏洞（解锁沙漠缺口穿越）
  
  // 已选择的穿越方式（阶段2选择后记录，用于结局标记）
  selectedCrossingMethod?: 'truck' | 'desert' | 'climb';
  
  // 遭遇记录（避免重复遭遇同一事件）
  encounteredDangers: Set<string>;
  
  // 【债务系统】场景2借贷状态
  hasTakenEmergencyLoan: boolean;  // 是否使用过紧急借贷
  emergencyLoanAmount: number;     // 紧急借贷金额（美元）
}

// 场景2核心机制说明（新设计）：
// 1. 【法律真空】环境压力：每回合强制触发负面事件（6种类型）
// 2. 向导带路 vs 独自穿越：
//    - 向导：每回合$50，自动前进1步，100%成功
//    - 独自：生存能力判定（≥4），成功前进1步，失败原地不动
// 3. 阶段2穿越方式：
//    - 货车偷渡：需hasBorderGuide（$200），自动成功
//    - 沙漠缺口：生存能力≥8判定，失败即死亡
//    - 攀爬边境墙：体魄≥12判定，失败即死亡
// 4. 预期回合：阶段1约5-10回合，阶段2约3-5回合，总计5-15回合

// 场景3：美国生存阶段
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
    currency: 'USD';
    lastPaid: number;            // 上次缴纳回合
    description: string;
  };
  
  // 生活成本（道具驱动）
  livingExpenses: {
    // 基础成本（由道具决定）
    baseline: {
      food: number;               // 食品固定基础值
      lodging: number;            // 住宿基础值（由 lodging 标签道具决定）
      transport: number;          // 出行基础值（由 transport 标签道具决定）
    };
    // 上月实际支出（考虑通胀后，用于展示）
    current: {
      food: number;
      lodging: number;
      transport: number;
      total: number;
    };
  };
  
  // 【债务系统】场景3债务追踪
  debtDefaultCount: number;          // 违约次数计数
  hasDebtWarningTriggered: boolean;  // 是否已触发第一次警告
}

interface AsylumProgress {
  stage: 'consultation' | 'preparation' | 'submitted' | 'interview_scheduled' | 'interview_done' | 'decision';
  lawyerQuality: 'none' | 'cheap' | 'good' | 'expert';
  evidenceStrength: number;      // 0-100
  credibilityScore: number;      // 0-100
}

type IncomeSource = 'under_table' | 'cash_only' | 'gig_economy' | 'informal' | 'legal_after_doc';
type HousingStatus = 'street' | 'shelter' | 'shared_room' | 'rented_room' | 'apartment';
```

---

## 3. 场景切换系统

### 3.1 单向切换流程

```
场景1 (act1) ──┬──[走线]──> 场景2 (act2) ──┬──[向导]──> 场景3 (act3)
               │                            ├──[漏洞]──> 【游戏结束/成功】
               │                            ├──[攀爬]──> 【游戏结束/成功】
               │                            └──[随机]──> 【游戏结束/成功】
               │
               ├──[旅游签]──> 场景3 (act3) 【直飞，合法入境】
               └──[学生签]──> 场景3 (act3) 【直飞，合法入境】
```

**关键约束**：
- 不能返回上一场景（无 `act2 -> act1` 或 `act3 -> act2` 路径）
- 场景1→2（走线）：极低门槛，但必须经历场景2的高死亡率
- 场景1→3（直飞）：高门槛（签证/学费），但跳过场景2直接开始场景3
- 场景2→3：向导路径失败可重试；无向导路径（漏洞/攀爬/随机）失败即游戏结束（死亡）

### 3.2 场景切换检定

```typescript
// 场景切换检定配置
interface TransitionCheck {
  from: SceneId;
  to: SceneId;
  
  // 检定方式
  method: TransitionMethod;
  
  // 基础消耗
  baseCost: {
    actionPoints: number;
    money?: number;              // 人民币（场景1）或美元（场景2/3）
    health?: number;
    mental?: number;
  };
  
  // 检定要求
  requirements: TransitionRequirement[];
  
  // 失败后果
  failureConsequence: {
    moneyLoss: number;           // 金钱损失
    healthLoss: number;          // 身体健康度损失（999表示死亡/游戏结束）
    cooldown: number;            // 冷却回合（N回合后才能再次尝试）
    specialDebuff?: string;      // 特殊debuff（如签证黑名单）
    gameOver?: boolean;          // 是否游戏结束（场景2无向导穿越失败时）
    gameOverReason?: string;     // 游戏结束原因描述
  };
  
  // 持续成本（仅学生签）
  ongoingCost?: {
    interval: number;            // 间隔回合
    amount: number;              // 金额
    currency: 'CNY' | 'USD';
    failureResult: string;       // 不缴纳的后果
  };
}

// 切换方式
type TransitionMethod = 
  | 'direct_purchase'            // 直接购买（如机票）
  | 'attribute_check'            // 属性检定
  | 'chain_completion'           // 完成事件链
  | 'event_trigger';             // 特定事件触发

// 切换要求
interface TransitionRequirement {
  type: 'ATTRIBUTE' | 'ITEM' | 'MONEY' | 'CHAIN_COMPLETED' | 'EVENT_TRIGGERED';
  
  // 根据类型变化的配置
  config: {
    attribute?: keyof Attributes;
    minValue?: number;
    itemTag?: string;
    amount?: number;
    chainId?: string;
    eventId?: string;
  };
}

// 场景切换进度（记录玩家尝试历史）
interface TransitionProgress {
  attempts: number;              // 尝试次数
  lastAttemptTurn: number;       // 上次尝试回合
  cooldownRemaining: number;     // 剩余冷却回合
  
  // 累计惩罚（多次失败会增加难度）
  accumulatedPenalty: {
    moneyMultiplier: number;     // 金钱消耗倍率（失败会增加）
    difficultyModifier: number;  // 检定难度修正
  };
}
```

### 3.3 具体切换配置

```typescript
// 场景切换配置表
const SCENE_TRANSITIONS: Record<string, TransitionCheck> = {
  // 场景1 → 场景2：走线（最低门槛，但必须经历场景2的高死亡率）
  'act1_to_act2_walk': {
    from: 'act1',
    to: 'act2',
    method: 'direct_purchase',      // 直接付费，无检定
    baseCost: {
      actionPoints: 3,
      money: 15000,                 // 15000人民币起步
      health: 0,
      mental: 10
    },
    requirements: [
      { type: 'MONEY', config: { amount: 15000 } }  // 仅需有钱
    ],
    failureConsequence: {
      moneyLoss: 0,                 // 失败不退款
      healthLoss: 0,
      cooldown: 0                   // 可再次尝试（筹钱）
    }
  },
  
  // 场景1 → 场景3：旅游签证（通过【灵光一闪】解锁，高门槛，合法入境）
  // 
  // 【完整流程】：
  // 1. 触发灵光一闪（智力≥7）：解锁签证材料获取途径
  // 2. 收集三样必须物品：
  //    - 足额的资产证明（通过开具资产证明事件或中介）
  //    - 去美国的理由（通过刷抖音触发泰勒演唱会事件或中介）
  //    - 行程计划（通过DIY行程事件或中介）
  // 3. 大使馆面签（需要英语≥8，三样物品齐全）
  // 4. 面签成功后解锁此场景切换
  //
  // 【成本分析】：
  // - 资产证明：5000元（伪造）或30万存款
  // - 去美理由：5000元（中介）或免费（刷抖音概率触发）
  // - 行程计划：5000元（中介）或5行动点DIY
  // - 签证申请费：1600元
  // 总成本：至少15000人民币（如果全部用中介）
  //
  // 【风险】：使用虚假材料面签有30%概率被发现，导致永久黑名单
  //
  // 注意：具体的面签逻辑在固定事件 act1_visa_interview 中处理，
  // 此配置仅在面签成功后启用场景切换。
  'act1_to_act3_tourist': {
    from: 'act1',
    to: 'act3',
    method: 'event_unlocked',       // 由面签事件解锁
    baseCost: {
      actionPoints: 0,              // 面签时已支付费用
      money: 0,
      health: 0,
      mental: 0
    },
    requirements: [
      { 
        type: 'FLAG', 
        config: { flag: 'visa_interview_passed' }  // 必须通过面签
      },
      { 
        type: 'ATTRIBUTE', 
        config: { attribute: 'english', minValue: 8 }  // 英语≥8是硬性要求（更高门槛）
      }
    ],
    failureConsequence: {
      moneyLoss: 0,
      healthLoss: 0,
      cooldown: 0
    }
  },
  
  // 场景1 → 场景3：学生签证（灰色野鸡大学，社交≥5解锁，合法入境但需持续付费）
  //
  // 【触发条件】：社交≥5时解锁学生签证事件链
  //
  // 【事件链流程】：
  // 1. 联系中介（社交≥5解锁）
  // 2. 提交申请（支付定金20000人民币）
  // 3. 面试（100%获得通过，无需检定）
  // 4. 获得签证，准备离境（支付剩余10000人民币尾款，或无法支付则无法离境）
  //
  // 【成本分析】：
  // - 场景1阶段：20000人民币定金 + 10000人民币尾款（入境时支付，约$1389）
  // - 场景3阶段：共4期学费，每期$4000（每6回合1次）
  // 总成本：30000人民币 + $16000美元 ≈ 15.8万人民币（按7.2汇率）
  //
  // 【优势】：
  // - 100%通过面试，无失败风险
  // - 可以分期付款，减轻场景1资金压力
  // - 稳定合法入境，跳过危险的场景2
  //
  // 【劣势】：
  // - 总成本高于旅游签
  // - 场景3有持续学费压力
  // - 需要较高的社交能力才能解锁
  'act1_to_act3_student': {
    from: 'act1',
    to: 'act3',
    method: 'chain_completion',     // 完成事件链
    baseCost: {
      actionPoints: 2,
      money: 20000,                 // 场景1只需支付定金20000人民币
      health: 0,
      mental: 10
    },
    requirements: [
      { 
        type: 'ATTRIBUTE',
        config: { attribute: 'social', minValue: 5 }  // 社交≥5解锁学签事件链
      },
      { type: 'MONEY', config: { amount: 20000 } },   // 定金20000
      { 
        type: 'CHAIN_COMPLETED', 
        config: { chainId: 'act1_visa_student' }      // 完成学签申请链
      }
    ],
    failureConsequence: {
      moneyLoss: 0,
      healthLoss: 0,
      cooldown: 0
    },
    // 分期付款机制：场景1支付定金20000，尾款10000在场景3入境时支付
    installmentPayment: {
      act1Payment: 20000,           // 场景1已支付定金
      act3PaymentOnArrival: 10000,  // 场景3入境时立即支付尾款（美元换算约$1389，付给中介）
      currencyOnArrival: 'USD',
      failureOnArrival: '无法入学，转为旅游签倒计时或直接黑户'
    },
    // 特殊：学生签进入场景3后，总共需缴纳4期学费，每6回合收取一次
    // 第1-4期：每6回合收取$4000（标准学费），不缴纳则身份失效
    ongoingCost: {
      interval: 6,                  // 每6回合收取一次
      amount: 4000,                 // $4000
      currency: 'USD',
      maxCharges: 4,                // 总共收取4期学费
      totalChargesDescription: '学费总计4期，每6回合缴纳1期，每期$4000',
      failureResult: '身份失效转为黑户（持续扣除心理健康，不直接导致游戏结束）'
    }
  },
  
  // ============================================
  // 场景2 → 场景3：穿越边境墙（三种方式）
  // ============================================
  //
  // 【新设计】阶段2（边境小镇）选择穿越方式：
  // - 必须在小镇完成活动后才能选择
  // - 三种方式满足不同属性优势的玩家
  // - 无向导穿越失败即死亡
  
  // 方式A：货车偷渡（最安全，需提前准备）
  'act2_to_act3_truck': {
    from: 'act2',
    to: 'act3',
    method: 'direct_purchase',      // 直接购买，无需检定
    baseCost: {
      actionPoints: 2,
      money: 0,                     // 费用已在获取border_guide时支付（$200）
      health: 5,                    // 长时间蜷缩的身体不适
      mental: 10                    // 密闭空间的恐惧
    },
    requirements: [
      { 
        type: 'ITEM', 
        config: { itemId: 'border_guide' }  // 需要在小镇花费$200获得
      }
    ],
    failureConsequence: {
      moneyLoss: 0,
      healthLoss: 0,
      cooldown: 0                   // 不会失败
    },
    // 结果：成功进入场景3，保留大部分现金
    description: '向导带你来到货运停车场，你钻进货柜的隐藏空间。明天早上到洛杉矶卸货，你从里面出来就行。'
  },
  
  // 方式B：穿越沙漠缺口（极高风险，穷人最desperate的选择）
  'act2_to_act3_desert': {
    from: 'act2',
    to: 'act3',
    method: 'attribute_check',
    baseCost: {
      actionPoints: 3,
      money: 0,
      health: 10,
      mental: 15
    },
    requirements: [
      { 
        type: 'ATTRIBUTE', 
        config: { attribute: 'survival', minValue: 8 }  // 生存能力≥8
      }
    ],
    failureConsequence: {
      moneyLoss: 0,
      healthLoss: 999,              // 【游戏结束】死亡
      cooldown: 0,
      gameOver: true,
      gameOverReason: '第三天你倒在沙地上，喉咙像塞了一把烧红的刀子。最后的意识里，你听到风吹过边境墙的声音——那么近，又那么远。',
      endingId: 'death_desert_crossing'
    },
    // 成功结果：现金-20%（用于购买食物和水），进入场景3
    successResult: {
      moneyMultiplier: 0.8,         // 现金剩余80%
      description: '凭借求生本能和运气，你在沙漠中找到水源，艰难跋涉后抵达公路。被路过的好心人发现，送上通往加州的大巴。'
    }
  },
  
  // 方式C：攀爬边境墙（高体魄要求，失败即死）
  'act2_to_act3_climb': {
    from: 'act2',
    to: 'act3',
    method: 'attribute_check',
    baseCost: {
      actionPoints: 3,
      money: 0,
      health: 20,                   // 钢柱烫手灼伤+跳下时的磕碰伤
      mental: 10
    },
    requirements: [
      { 
        type: 'ATTRIBUTE', 
        config: { attribute: 'physique', minValue: 12 }  // 体魄≥12（原设计≥10，新设计≥12）
      }
    ],
    failureConsequence: {
      moneyLoss: 0,
      healthLoss: 999,              // 【游戏结束】死亡
      cooldown: 0,
      gameOver: true,
      gameOverReason: '你攀上了墙顶，但体力已经耗尽。手指一滑，身体向后仰去。视野迅速变黑，最后的意识是身下的温热——那是你自己的血。',
      endingId: 'death_wall_fall'
    }
  },
  
  // 场景2 → 场景3：随机奇迹事件（无向导，失败即死亡）
  'act2_to_act3_miracle': {
    from: 'act2',
    to: 'act3',
    method: 'event_trigger',        // 由随机事件触发
    baseCost: {
      actionPoints: 0,
      money: 0,
      health: 0,
      mental: 10
    },
    requirements: [
      { 
        type: 'EVENT_TRIGGERED', 
        config: { eventId: 'rand2_border_miracle' }  // 随机触发
      }
    ],
    failureConsequence: {
      moneyLoss: 0,
      healthLoss: 999,              // 【游戏结束】死亡
      cooldown: 0,
      gameOver: true,               // 标记为游戏结束
      gameOverReason: '被贩毒集团杀害，尸体永远找不到'
    }
  }
};
```

### 3.4 场景切换执行流程

```typescript
class SceneTransitionManager {
  private character: Character;
  private sceneManager: SceneManager;
  
  /**
   * 尝试场景切换
   * @param toScene 目标场景
   * @param transitionType 切换路径类型（如 'guide', 'gap', 'climb', 'tourist', 'student'）
   * @returns 切换结果
   */
  attemptTransition(toScene: SceneId, transitionType?: string): TransitionResult {
    const fromScene = this.character.status.currentScene;
    
    // 构建切换键（如 'act2_to_act3_guide' 或 'act1_to_act3_tourist'）
    let transitionKey = `${fromScene}_to_${toScene}`;
    if (transitionType) {
      transitionKey += `_${transitionType}`;
    }
    
    const transition = SCENE_TRANSITIONS[transitionKey];
    
    if (!transition) {
      return { success: false, reason: '无效的场景切换' };
    }
    
    // 检查冷却
    const progress = this.getTransitionProgress(transitionKey);
    if (progress.cooldownRemaining > 0) {
      return { 
        success: false, 
        reason: `冷却中，还需 ${progress.cooldownRemaining} 回合` 
      };
    }
    
    // 扣除基础消耗
    if (!this.deductBaseCost(transition.baseCost)) {
      return { success: false, reason: '资源不足以支付基础消耗' };
    }
    
    // 执行检定
    const checkResult = this.performTransitionCheck(transition);
    
    // 记录尝试
    progress.attempts++;
    progress.lastAttemptTurn = this.character.status.turnCount.total;
    
    if (checkResult.success) {
      // 切换成功，根据路径给予不同的起始包
      this.executeSceneTransition(fromScene, toScene, transitionType);
      return { success: true, scene: toScene };
    } else {
      // 切换失败，应用后果
      this.applyFailureConsequence(transition.failureConsequence, progress);
      progress.cooldownRemaining = transition.failureConsequence.cooldown;
      
      // 检查是否游戏结束（场景2无向导穿越失败时）
      if (transition.failureConsequence.gameOver) {
        this.triggerGameOver(transition.failureConsequence.gameOverReason);
        return {
          success: false,
          gameOver: true,
          reason: transition.failureConsequence.gameOverReason
        };
      }
      
      return { 
        success: false, 
        reason: checkResult.reason,
        consequences: transition.failureConsequence 
      };
    }
  }
  
  /**
   * 执行场景切换（核心方法）
   * @param from 源场景
   * @param to 目标场景
   * @param transitionType 切换路径类型（影响起始包）
   */
  private executeSceneTransition(from: SceneId, to: SceneId, transitionType?: string): void {
    // 1. 保存跨场景数据
    const crossSceneData = this.extractCrossSceneData();
    
    // 2. 保存场景历史（用于结局结算）
    this.archiveSceneHistory(from);
    
    // 3. 【核心】完全清空常驻道具栏
    this.character.inventory.permanents.clear();
    
    // 4. 【债务系统】处理债务跨场景逻辑
    this.handleDebtTransition(from, to, crossSceneData);
    
    // 5. 清空当前场景的事件池
    this.sceneManager.clearCurrentPool();
    
    // 6. 加载新场景
    this.sceneManager.loadScene(to);
    
    // 7. 初始化新场景状态
    this.initializeSceneState(to);
    
    // 8. 根据切换路径给予对应的启动物资（金钱从CrossSceneData继承，只给道具和食物）
    this.giveStarterKitByTransitionType(to, from, transitionType);
    
    // 9. 恢复跨场景数据
    this.restoreCrossSceneData(crossSceneData);
    
    // 10. 更新角色当前场景
    this.character.status.currentScene = to;
    
    // 11. 触发场景进入事件
    this.triggerSceneEntryEvent(to, transitionType);
  }
  
  /**
   * 【债务系统】处理场景切换时的债务逻辑
   * @param from 源场景
   * @param to 目标场景
   * @param crossSceneData 跨场景数据
   */
  private handleDebtTransition(from: SceneId, to: SceneId, crossSceneData: CrossSceneData): void {
    switch (from) {
      case 'act1':
        // 场景1→2：清空债务，显示叙事提示
        if (this.character.debtSystem.activeDebts.length > 0) {
          const debtAmount = this.character.debtSystem.activeDebts
            .reduce((sum, d) => sum + d.amount, 0);
          log(`你离开了中国，国内的债务问题暂时搁置。你欠下的${debtAmount}元债务成了遥远的回声。`);
          
          // 清空债务系统
          this.character.debtSystem.activeDebts = [];
          this.character.debtSystem.totalDebt = 0;
          
          // 清空违约历史和当前违约状态
          this.character.debtSystem.defaultHistory = { count: 0 };
          this.character.debtSystem.currentDefault = { isInDefault: false, consecutiveMissed: 0 };
          
          // 设置债务放弃标记
          this.character.flags.add('debts_abandoned_act1');
        }
        break;
        
      case 'act2':
        // 场景2→3：保留债务到跨场景数据，在恢复时加载
        if (this.character.debtSystem.activeDebts.length > 0) {
          const debtAmount = this.character.debtSystem.activeDebts
            .reduce((sum, d) => sum + d.amount, 0);
          log(`你带着${debtAmount}美元的债务进入了美国。蛇头的债，是跨国界的。`);
          
          // 债务已保存在 crossSceneData.carriedDebt 中
          // 将在 restoreCrossSceneData 中恢复
        }
        break;
        
      default:
        break;
    }
  }
  
  /**
   * 根据切换路径给予启动物资（金钱从CrossSceneData继承，只给道具和状态）
   */
  private giveStarterKitByTransitionType(to: SceneId, from: SceneId, transitionType?: string): void {
    if (to === 'act3') {
      // 根据路径给予不同的场景3起始包
      // 注意：金钱从CrossSceneData.carriedMoney继承，此处不设置
      switch (transitionType) {
        case 'tourist':
          // 旅游签直飞
          this.character.inventory.permanents.addItem(ItemDatabase.getPermanent('hotel_booking'));
          // 旅游签初始有6回合合法身份，之后转为黑户
          this.character.status.visaExpiry = 6;  // 6回合签证倒计时
          // 签证到期后转为黑户，不直接游戏结束，但持续扣除心理健康
          this.character.status.onVisaExpiry = {
            newIdentity: 'undocumented',           // 转为非法滞留
            mentalDecay: 3,                        // 每回合-3心理健康（黑户压力）
            gameOverOnExpiry: false                // 不直接导致游戏结束
          };
          break;
          
        case 'student':
          // 学生签直飞（野鸡大学）
          this.character.inventory.permanents.addItem(ItemDatabase.getPermanent('dorm_key'));
          
          // 检查是否有分期付款尾款（付给中介）
          if (this.character.flags.student_visa_installment) {
            const remainingUSD = Math.ceil(10000 / 7.2);  // 约$1389人民币换算
            if (this.character.resources.money.usd >= remainingUSD) {
              this.character.resources.money.usd -= remainingUSD;
              log("你支付了中介尾款$" + remainingUSD + "，成功注册入学。");
            } else {
              log("警告：你无法支付中介尾款，学校不允许你注册！");
              log("你的学生签证失效，转为非法滞留（黑户）。");
              // 转为黑户后持续扣除心理健康，但不直接游戏结束
              this.character.status.mentalDecay = 4;  // 黑户压力每回合-4
            }
          }
          
          // 学签持续学费：总共4期，每期$4000，每6回合收取1次
          this.character.status.ongoingCost = {
            interval: 6,                  // 每6回合
            amount: 4000,                 // $4000
            currency: 'USD',
            chargesRemaining: 4,          // 总共4期要交
            description: '野鸡大学学费（第1-4期，每期$4000，不缴纳则身份失效转为黑户）',
            onPaymentFailure: {
              newIdentity: 'undocumented',
              mentalDecay: 4,             // 不交学费变黑户，每回合-4心理健康
              gameOver: false             // 不直接导致游戏结束
            }
          };
          break;
          
        case 'truck':
          // 货车偷渡：无道具，金钱继承
          this.character.status.storyFlags.add('guided_crossing');
          break;
          
        case 'desert':
          // 沙漠缺口：起始地点加州，金钱继承
          this.character.status.startLocation = 'california';
          this.character.status.identityStatus = 'undocumented';
          break;
          
        case 'climb':
          // 攀爬边境墙：健康-20，金钱继承
          this.character.resources.health.current -= 20;
          this.character.status.identityStatus = 'undocumented';
          break;
          
        case 'miracle':
          // 随机奇迹：无道具，金钱继承（以神秘身份入境）
          break;
          
        default:
          // 默认起始包
          this.giveStarterKit(to);
      }
    } else if (to === 'act2') {
      // 场景2起始包（走线）：5份食物补给
      this.character.inventory.consumables.addItem('food_supply', 5);
      this.character.inventory.permanents.addItem(ItemDatabase.getPermanent('basic_compass'));
    } else {
      // 其他场景使用默认配置
      this.giveStarterKit(to);
    }
  }
  
  /**
   * 提取跨场景数据
   */
  private extractCrossSceneData(): CrossSceneData {
    return {
      // 书籍池（全局唯一，必须保留）
      bookPool: this.character.inventory.bookPool.getRemainingBooks(),
      
      // 进行中的跨场景事件链（如庇护申请链可能跨场景2和3）
      crossSceneChains: this.sceneManager.getCrossSceneChains(),
      
      // 关键剧情道具（如果有 cross_scene 标签）
      keyItems: this.character.inventory.permanents.items
        .filter(item => item.tags.includes('cross_scene'))
        .map(item => item.id),
      
      // 累计统计
      accumulatedStats: {
        totalTurns: this.character.status.turnCount.total,
        moneySpent: this.character.statistics.moneySpent,
        eventsCompleted: this.character.statistics.eventsCompleted
      },
      
      // 【债务系统】跨场景债务（仅场景2→3保留）
      carriedDebt: this.character.status.currentScene === 'act2' 
        ? this.character.debtSystem.activeDebts 
        : undefined
    };
  }
  
  /**
   * 恢复跨场景数据
   */
  private restoreCrossSceneData(data: CrossSceneData): void {
    // 恢复书籍池
    this.character.inventory.bookPool.setRemainingBooks(data.bookPool);
    
    // 恢复跨场景事件链
    this.sceneManager.restoreCrossSceneChains(data.crossSceneChains);
    
    // 恢复关键道具（如果有）
    for (const itemId of data.keyItems) {
      const itemData = ItemDatabase.getPermanent(itemId);
      if (itemData) {
        this.character.inventory.permanents.addItem(itemData);
      }
    }
    
    // 【债务系统】恢复场景2带入场景3的债务
    if (data.carriedDebt && data.carriedDebt.length > 0) {
      this.character.debtSystem.activeDebts = data.carriedDebt;
      this.character.debtSystem.totalDebt = data.carriedDebt
        .reduce((sum, d) => sum + d.amount, 0);
    }
  }
  
  /**
   * 给予启动物资
   */
  private giveStarterKit(scene: SceneId): void {
    const config = SCENE_CONFIGS[scene];
    const kit = config.starterKit;
    
    // 给予消耗品
    for (const item of kit.consumables) {
      this.character.inventory.consumables.addItem(item.id, item.count);
    }
    
    // 给予初始金钱
    if (kit.initialMoney > 0) {
      const currency = config.currency;
      this.character.resources.money[currency.toLowerCase() as 'cny' | 'usd'] = kit.initialMoney;
    }
    
    // 给予常驻道具（通常是剧情道具）
    for (const itemId of kit.permanents) {
      const item = ItemDatabase.getPermanent(itemId);
      if (item) {
        this.character.inventory.permanents.addItem(item);
      }
    }
  }
}
```

---

## 4. 独立事件池管理

### 4.1 场景独立事件池

```typescript
// 场景事件池（每个场景完全独立）
interface SceneEventPool {
  sceneId: SceneId;
  
  // 随机事件池
  randomPool: {
    available: RandomEvent[];      // 可用事件
    exhausted: Set<string>;        // 已耗尽（达到最大触发次数）
    cooldowns: Map<string, number>; // 事件ID -> 剩余冷却回合
  };
  
  // 固定事件池
  fixedPool: {
    available: FixedEvent[];       // 可用事件
    completed: Set<string>;        // 已完成（不可重复的事件）
    exhausted: Set<string>;        // 已耗尽次数（限次事件）
  };
  
  // 事件链池
  chainPool: {
    starters: EventChain[];        // 可在此场景启动的链
    active: Map<string, ChainProgress>; // 进行中的链
    completed: Set<string>;        // 已完成的链
  };
  
  // 终结态事件（根据角色状态动态添加）
  terminalEvents: TerminalEvent[];
  
  // 政策压力事件池（场景3特有）
  policyPool?: {
    available: PolicyPressureEvent[];  // 可用政策事件
    triggered: Set<string>;            // 已触发的事件ID
    cooldowns: Map<string, number>;    // 事件冷却
  };
}

// 事件池配置（用于初始化 SceneEventPool）
interface EventPoolConfig {
  randomEvents: RandomEvent[];       // 随机事件列表
  fixedEvents: FixedEvent[];         // 固定事件列表
  chainStarters: EventChain[];       // 事件链起始
  terminalEvents: TerminalEvent[];   // 终结态事件
  policyEvents: PolicyPressureEvent[]; // 政策压力事件（场景3特有，其他场景为空数组）
}

// 场景切换时的池操作
class ScenePoolManager {
  private pools: Map<SceneId, SceneEventPool> = new Map();
  private currentScene: SceneId;
  
  /**
   * 加载场景事件池（场景切换时调用）
   */
  loadScenePool(sceneId: SceneId): void {
    // 检查是否已有此场景的池
    if (!this.pools.has(sceneId)) {
      // 创建新的事件池（从配置初始化）
      const newPool = this.createPoolFromConfig(sceneId);
      this.pools.set(sceneId, newPool);
    }
    
    this.currentScene = sceneId;
  }
  
  /**
   * 清空当前事件池（场景切换前调用）
   */
  clearCurrentPool(): void {
    if (!this.currentScene) return;
    
    const currentPool = this.pools.get(this.currentScene);
    if (currentPool) {
      // 保存进行中的跨场景事件链
      this.preserveCrossSceneChains(currentPool);
      
      // 其他数据不保留，完全重置
    }
  }
  
  /**
   * 创建事件池（从配置初始化）
   */
  private createPoolFromConfig(sceneId: SceneId): SceneEventPool {
    const config = EVENT_POOL_CONFIG[sceneId];
    
    return {
      sceneId,
      randomPool: {
        available: [...config.randomEvents],
        exhausted: new Set(),
        cooldowns: new Map()
      },
      fixedPool: {
        available: [...config.fixedEvents],
        completed: new Set(),
        exhausted: new Set()
      },
      chainPool: {
        starters: [...config.chainStarters],
        active: new Map(),
        completed: new Set()
      },
      terminalEvents: [...config.terminalEvents],
          // 场景3特有：初始化政策压力事件池
      policyPool: sceneId === 'act3' ? {
        available: [...config.policyEvents],
        triggered: new Set(),
        cooldowns: new Map()
      } : undefined
    };
  }
}

// 事件池配置（静态配置）
const EVENT_POOL_CONFIG: Record<SceneId, EventPoolConfig> = {
  act1: {
    randomEvents: ACT1_RANDOM_EVENTS,      // 场景1专属随机事件
    fixedEvents: ACT1_FIXED_EVENTS,        // 场景1专属固定事件
    chainStarters: ACT1_CHAIN_STARTERS,    // 场景1可启动的事件链
    terminalEvents: ACT1_TERMINAL_EVENTS,  // 场景1终结态事件
    policyEvents: []                       // 场景1无政策事件
  },
  act2: {
    randomEvents: ACT2_RANDOM_EVENTS,      // 场景2专属随机事件
    fixedEvents: ACT2_FIXED_EVENTS,        // 场景2专属固定事件
    chainStarters: ACT2_CHAIN_STARTERS,
    terminalEvents: ACT2_TERMINAL_EVENTS,
    policyEvents: []                       // 场景2无政策事件
  },
  act3: {
    randomEvents: ACT3_RANDOM_EVENTS,      // 场景3专属随机事件（不含压力事件）
    fixedEvents: ACT3_FIXED_EVENTS,        // 场景3专属固定事件
    chainStarters: ACT3_CHAIN_STARTERS,
    terminalEvents: ACT3_TERMINAL_EVENTS,
    policyEvents: ACT3_POLICY_EVENTS       // 场景3特有：特朗普政策压力事件
  }
};
```

### 4.2 事件触发逻辑

```typescript
// 随机事件抽取（场景独立）
function drawRandomEvent(pool: SceneEventPool): RandomEvent | null {
  // 1. 过滤可用事件
  const available = pool.randomPool.available.filter(event => {
    // 检查是否已耗尽
    if (pool.randomPool.exhausted.has(event.id)) return false;
    
    // 检查冷却
    const cooldown = pool.randomPool.cooldowns.get(event.id);
    if (cooldown && cooldown > 0) return false;
    
    // 检查触发条件
    return checkEventConditions(event);
  });
  
  if (available.length === 0) return null;
  
  // 2. 按权重随机抽取
  const totalWeight = available.reduce((sum, e) => sum + e.trigger.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const event of available) {
    random -= event.trigger.weight;
    if (random <= 0) {
      // 3. 更新事件状态
      if (event.trigger.maxTriggers) {
        const triggered = pool.randomPool.cooldowns.get(event.id + '_count') || 0;
        if (triggered + 1 >= event.trigger.maxTriggers) {
          pool.randomPool.exhausted.add(event.id);
        }
      }
      
      // 设置冷却
      if (event.trigger.cooldown) {
        pool.randomPool.cooldowns.set(event.id, event.trigger.cooldown);
      }
      
      return event;
    }
  }
  
  return available[available.length - 1];
}

// 固定事件列表（场景独立）
function getAvailableFixedEvents(pool: SceneEventPool): FixedEvent[] {
  return pool.fixedPool.available.filter(event => {
    // 检查是否已完成（不可重复）
    if (!event.execution.repeatable && pool.fixedPool.completed.has(event.id)) {
      return false;
    }
    
    // 检查次数限制
    if (event.execution.maxExecutions) {
      const executed = pool.fixedPool.exhausted.has(event.id) ? 1 : 0; // 简化处理
      if (executed >= event.execution.maxExecutions) return false;
    }
    
    // 检查前置条件
    return checkEventConditions(event);
  });
}
```

---

## 4.5 场景3特有：特朗普政策压力事件

### 4.5.1 设计原则

**压力数值仅在场景3生效**，通过专门的"特朗普政策事件"触发：

```typescript
// 注意：PolicyPressureEvent 和 SceneTurnCondition 定义在 EventSystemArchitecture.md 中
// 这里展示的是场景3特有的 Debuff 结构

// 政策压力产生的环境 Debuff（添加到 environmentalDebuffs 数组）
interface EnforcementDebuff {
  id: string;                      // debuff ID，格式: debuff_{政策事件ID}
  name: string;                    // 显示名称（如"移民搜捕升级"）
  type: 'pressure';                // 类型标识
  intensity: 1 | 2 | 3 | 4 | 5;    // 强度等级（1=轻微，5=极端）
  source: string;                  // 来源描述（政策公告内容）
  duration: number;                // 持续回合（-1表示永久）
  effects: {
    raidChanceIncrease?: number;   // 突击检查概率增加
    workDifficultyIncrease?: number; // 打工难度增加
    mentalDamagePerTurn?: number;  // 每回合心理伤害
    cashCostMultiplier?: number;   // 现金消耗倍率
  };
}
```

> **类型引用**：`PolicyPressureEvent` 和 `SceneTurnCondition` 的完整定义见 `EventSystemArchitecture.md` 第2.5节和9.3节。

### 4.5.2 Debuff 叠加规则

同一类型的压力 Debuff 叠加时：
- **强度**：取最大值（多个政策不会叠加强度，只取最严重的）
- **持续时间**：延长（新政策的持续时间累加到现有 Debuff）
- **效果**：根据最终强度计算

### 4.5.2 事件示例

```typescript
const ACT3_POLICY_EVENTS: PolicyPressureEvent[] = [
  {
    id: 'act3_policy_001',
    category: 'POLICY_PRESSURE',
    name: '加强边境安全',
    description: '唐纳德总统宣布加强边境安全和国家执法行动',
    trigger: {
      phase: 'TURN_START',
      weight: 15,
      maxTriggers: 1,
      cooldown: 5,
      conditions: [
        { type: 'SCENE', value: 'act3', minSceneTurn: 3 }  // 场景3第3回合后才触发
      ]
    },
    scenes: ['act3'],
    content: {
      announcement: "加强边境安全和国家执法行动",
      displayText: "唐纳德总统宣布加强边境安全和国家执法行动，这下移民局的搜查力度更大了。"
    },
    // 产生环境 Debuff，而非增加压力值
    debuff: {
      id: 'debuff_act3_policy_001',
      name: '移民搜捕升级',
      type: 'pressure',
      intensity: 2,                // 强度等级 2（共5级）
      duration: 3,                 // 持续3回合
      effects: {
        raidChanceIncrease: 0.15,
        workDifficultyIncrease: 10,
        mentalDamagePerTurn: 2
      }
    },
    execute: (context) => { 
      // 执行逻辑：将 debuff 添加到 environmentalDebuffs 数组
      return { 
        success: true,
        statusEffects: {
          added: [{
            id: 'debuff_act3_policy_001',
            name: '移民搜捕升级',
            type: 'pressure',
            intensity: 2,
            source: '唐纳德总统宣布加强边境安全和国家执法行动',
            duration: 3,
            effects: {
              raidChanceIncrease: 0.15,
              workDifficultyIncrease: 10,
              mentalDamagePerTurn: 2
            }
          }]
        }
      }; 
    }
  },
  {
    id: 'act3_policy_002',
    category: 'POLICY_PRESSURE',
    name: '大规模驱逐计划',
    description: '唐纳德总统宣布大规模驱逐非法移民计划',
    trigger: {
      phase: 'TURN_START',
      weight: 12,
      maxTriggers: 1,
      cooldown: 5,
      conditions: [
        { type: 'SCENE', value: 'act3', minSceneTurn: 5 }  // 场景3第5回合后才触发
      ]
    },
    scenes: ['act3'],
    content: {
      announcement: "大规模驱逐非法移民计划",
      displayText: "唐纳德总统宣布大规模驱逐非法移民计划，这下移民局的搜查力度更大了。"
    },
    debuff: {
      id: 'debuff_act3_policy_002',
      name: '全国大搜捕',
      type: 'pressure',
      intensity: 4,                // 强度等级 4（严重）
      duration: 5,
      effects: {
        raidChanceIncrease: 0.30,
        workDifficultyIncrease: 20,
        mentalDamagePerTurn: 4,
        cashCostMultiplier: 1.2    // 现金消耗增加20%
      }
    },
    execute: (context) => { /* 类似上面 */ return { success: true }; }
  },
  {
    id: 'act3_policy_003',
    category: 'POLICY_PRESSURE',
    name: '暂停庇护审理',
    description: '唐纳德总统宣布暂停所有庇护申请审理',
    trigger: {
      phase: 'TURN_START',
      weight: 10,
      maxTriggers: 1,
      cooldown: 5,
      conditions: [
        { type: 'SCENE', value: 'act3', minSceneTurn: 8 }  // 场景3第8回合后才触发
      ]
    },
    scenes: ['act3'],
    content: {
      announcement: "暂停所有庇护申请审理",
      displayText: "唐纳德总统宣布暂停所有庇护申请审理，这下移民局的搜查力度更大了。"
    },
    debuff: {
      id: 'debuff_act3_policy_003',
      name: '庇护通道关闭',
      type: 'pressure',
      intensity: 3,
      duration: 6,
      effects: {
        raidChanceIncrease: 0.20,
        workDifficultyIncrease: 15,
        mentalDamagePerTurn: 3
        // 注意：庇护申请暂停需要额外逻辑处理
      }
    },
    execute: (context) => { /* 类似上面 */ return { success: true }; }
  }
];
```

### 4.5.3 压力 Debuff 效果表

压力型 Debuff 根据 **intensity（强度等级 1-5）** 产生不同效果：

| 强度 | 状态名称 | 突击检查 | 打工难度 | 心理消耗/回合 | 其他 |
|-----|---------|---------|---------|--------------|-----|
| 1 | 【轻微关注】 | +5% | +5 | -1 | 无 |
| 2 | 【搜捕升级】 | +15% | +10 | -2 | 无 |
| 3 | 【风声鹤唳】 | +20% | +15 | -3 | 现金消耗+10% |
| 4 | 【全城搜捕】 | +30% | +20 | -4 | 现金消耗+20%，庇护暂停 |
| 5 | 【红色警戒】 | +50% | +30 | -6 | 现金消耗+30%，无法稳定打工 |

**多个压力 Debuff 叠加规则**：
- 同类型（pressure）Debuff 同时存在时，效果**叠加计算**
- 例如：强度2（+15%检查）+ 强度3（+20%检查）= 总检查概率 +35%
- 但 UI 显示保留多个 Debuff，玩家清楚看到压力来源

### 4.5.4 Debuff 衰减机制

```typescript
// 回合结束时更新所有环境 Debuff
function updateEnvironmentalDebuffs(sceneState: SceneSpecificState): void {
  const debuffs = sceneState.environmentalDebuffs;
  
  for (let i = debuffs.length - 1; i >= 0; i--) {
    const debuff = debuffs[i];
    
    // 减少剩余回合
    if (debuff.duration > 0) {
      debuff.duration--;
    }
    
    // 持续时间归零时移除
    if (debuff.duration === 0) {
      debuffs.splice(i, 1);
      // 可以触发事件："移民局的搜捕力度似乎有所放松"
    }
  }
}
```

**关键约束**：
- 压力 Debuff 随时间自然衰减（duration 归零即消失）
- 新的政策事件可以添加同类型 Debuff，按叠加规则处理
- 所有外部压力统一通过 environmentalDebuffs 管理
- 场景切换时，Debuff 随场景状态清空（符合单向流动设计）

---

## 4.6 生活成本系统（道具驱动）

### 4.6.1 设计原则

场景3的生活成本由三项组成：**食品**、**住宿**、**出行**，采用**道具驱动**的计算方式：
- **食品**：固定基础值（人活着就要吃饭，不依赖道具）
- **住宿**：由 `lodging` 标签道具决定基础值，无道具则睡大街（$0 但有 Debuff）
- **出行**：由 `transport` 标签道具决定基础值，无道具则为公交基础费

### 4.6.2 基础成本配置

```typescript
// 场景3基础配置
const SCENE3_BASELINE = {
  food: 400,        // 食品固定基础值（美元/月）
  lodging: 0,       // 无住宿道具时的默认值（睡大街）
  transport: 150    // 无出行道具时的默认值（公交/步行）
};

// 道具配置示例
const LODGING_ITEMS = [
  {
    id: 'key_shelter',
    name: '收容所床位',
    tags: ['lodging'],
    livingExpense: { baselineLodging: 0 },  // 免费
    passiveEffects: {
      mentalPerTurn: -3,
      raidRiskIncrease: 0.1
    }
  },
  {
    id: 'key_shared_room',
    name: '合租房间钥匙',
    tags: ['lodging'],
    livingExpense: { baselineLodging: 600 }
  },
  {
    id: 'key_apartment',
    name: '公寓钥匙',
    tags: ['lodging'],
    livingExpense: { baselineLodging: 1200 }
  },
  {
    id: 'key_house',
    name: 'House钥匙',
    tags: ['lodging'],
    livingExpense: { baselineLodging: 2500 }
  }
];

const TRANSPORT_ITEMS = [
  {
    id: 'pass_bus',
    name: '月票公交卡',
    tags: ['transport'],
    livingExpense: { baselineTransport: 100 }
  },
  {
    id: 'vehicle_ebike',
    name: '二手电动车',
    tags: ['transport'],
    livingExpense: { baselineTransport: 50 },
    priority: 5
  },
  {
    id: 'vehicle_used_car',
    name: '二手车',
    tags: ['transport'],
    livingExpense: { baselineTransport: 350 },
    priority: 3
  },
  {
    id: 'vehicle_tesla',
    name: '特斯拉',
    tags: ['transport'],
    livingExpense: { baselineTransport: 600 },
    priority: 1
  }
];
```

### 4.6.3 成本计算流程

```typescript
/**
 * 计算基础生活成本（由道具决定）
 */
function calculateBaselineCosts(character: Character): BaselineCosts {
  const inventory = character.inventory.permanents;
  
  return {
    // 食品：固定值，不由道具决定
    food: SCENE3_BASELINE.food,
    
    // 住宿：找 lodging 标签道具中优先级最高的
    lodging: inventory
      .filter(item => item.tags.includes('lodging'))
      .sort((a, b) => a.priority - b.priority)[0]
      ?.livingExpense?.baselineLodging 
      ?? SCENE3_BASELINE.lodging,
    
    // 出行：找 transport 标签道具中优先级最高的
    transport: inventory
      .filter(item => item.tags.includes('transport'))
      .sort((a, b) => a.priority - b.priority)[0]
      ?.livingExpense?.baselineTransport 
      ?? SCENE3_BASELINE.transport
  };
}

/**
 * 应用生活成本（回合结束时调用）
 */
function applyLivingExpenses(): void {
  const act3State = this.character.status.sceneState as Act3State;
  
  // 1. 获取基础成本（由道具决定）
  const baseline = calculateBaselineCosts(this.character);
  act3State.livingExpenses.baseline = baseline;
  
  // 2. 获取通胀率（economic 类型 Debuff）
  const inflationDebuff = act3State.environmentalDebuffs.find(
    d => d.type === 'economic' && d.subtype === 'usd_inflation'
  );
  
  const inflation = inflationDebuff?.details || {
    food: { rate: 1.0 },
    lodging: { rate: 1.0 },
    transport: { rate: 1.0 }
  };
  
  // 3. 分项计算（基础 × 通胀）
  const costs = {
    food: Math.floor(baseline.food * inflation.food.rate),
    lodging: Math.floor(baseline.lodging * inflation.lodging.rate),
    transport: Math.floor(baseline.transport * inflation.transport.rate)
  };
  
  const total = costs.food + costs.lodging + costs.transport;
  
  // 4. 更新当前成本
  act3State.livingExpenses.current = { ...costs, total };
  
  // 5. 扣除费用
  this.character.resources.money.usd -= total;
  
  // 6. 检查无道具惩罚
  this.checkNoLodgingPenalty(baseline.lodging);
}

/**
 * 无住宿道具惩罚
 */
function checkNoLodgingPenalty(lodgingCost: number): void {
  if (lodgingCost === 0) {
    // 睡大街的惩罚
    const debuff: EnvironmentalDebuff = {
      id: 'debuff_homeless',
      name: '露宿街头',
      type: 'social',
      intensity: 3,
      duration: -1,  // 永久，直到有住宿
      effects: {
        mentalDamagePerTurn: 5,
        raidChanceIncrease: 0.2,
        cannotRest: true  // 无法恢复行动点
      }
    };
    this.addEnvironmentalDebuff(debuff);
  }
}
```

### 4.6.4 UI 展示示例

**结算界面**：
```
┌─────────────────────────────────────────┐
│ 本月生活开支                    -$1,930  │
├─────────────────────────────────────────┤
│ 🍞 食品    $400 × 1.30    = $520        │
│ 🏠 住宿    $1200 × 1.20   = $1,440      │  ← 来自【公寓钥匙】
│ 🚗 出行    $350 × 1.50    = $525        │  ← 来自【二手车】
├─────────────────────────────────────────┤
│ 通胀影响：+$455                         │
│ 若无通胀应为 $1,475                     │
└─────────────────────────────────────────┘
```

**无住宿时**：
```
┌─────────────────────────────────────────┐
│ 🏠 住宿    $0（睡大街）                  │
│ ⚠️ 获得 Debuff：【露宿街头】             │
│    心理健康 -5/回合，被抢劫风险 +20%     │
└─────────────────────────────────────────┘
```

### 4.6.5 升级路径

```
收容所(免费但debuff) 
    ↓ 攒钱
合租($600)
    ↓ 攒钱  
公寓($1200)
    ↓ 攒钱
House($2500但安全)

公交卡($100) → 电动车($50) → 二手车($350) → 特斯拉($600)
```

---

## 5. 场景主循环

### 5.1 回合流程

```typescript
// 游戏主循环中的场景相关流程
class SceneGameLoop {
  private character: Character;
  private sceneManager: SceneManager;
  private poolManager: ScenePoolManager;
  
  /**
   * 执行一个完整回合
   */
  executeTurn(): TurnResult {
    const currentScene = this.character.status.currentScene;
    const pool = this.poolManager.getPool(currentScene);
    const result: TurnResult = {
      turnNumber: this.character.status.turnCount.total,
      scene: currentScene,
      events: [],
      stateChanges: []
    };
    
    // 1. 回合开始：应用环境Debuff
    this.applyEnvironmentalDebuff(currentScene);
    
    // 2. 更新冷却计时器
    this.updateCooldowns(pool);
    
    // 3. 检查终结态
    const terminalState = this.checkTerminalState();
    if (terminalState) {
      // 终结态回合
      this.processTerminalTurn(terminalState, result);
      return result;
    }
    
    // 4. 触发随机事件
    const randomEvent = drawRandomEvent(pool);
    if (randomEvent) {
      const eventResult = this.executeRandomEvent(randomEvent);
      result.events.push({ type: 'random', event: randomEvent, result: eventResult });
    }
    
    // 4.5 场景3特有：尝试触发特朗普政策压力事件
    if (currentScene === 'act3') {
      const policyEvent = this.drawPolicyEvent(pool);
      if (policyEvent) {
        const policyResult = this.executePolicyEvent(policyEvent);
        result.events.push({ type: 'policy', event: policyEvent, result: policyResult });
      }
    }
    
    // 5. 恢复行动点
    this.recoverActionPoints();
    
    // 6. 处理固定消耗（道具维护费等）
    this.processUpkeepCosts();
    
    // 7. 回合结束检查
    this.endTurnChecks(result);
    
    // 8. 更新所有环境 Debuff（包括压力 Debuff 的持续时间递减）
    this.updateEnvironmentalDebuffs();
    
    return result;
  }
  
  /**
   * 玩家执行主动事件
   */
  executePlayerEvent(eventId: string, slotOverrides?: Map<string, string>): EventResult {
    const currentScene = this.character.status.currentScene;
    const pool = this.poolManager.getPool(currentScene);
    
    // 查找事件
    const event = pool.fixedPool.available.find(e => e.id === eventId);
    if (!event) {
      return { success: false, reason: '事件不存在或不可用' };
    }
    
    // 检查执行条件
    const canExecute = this.sceneManager.canExecuteEvent(event);
    if (!canExecute.canExecute) {
      return { success: false, reason: canExecute.reason };
    }
    
    // 匹配物品槽位
    const slotMatch = this.character.inventory.matchSlotRequirements(event.slots || []);
    if (slotOverrides) {
      this.applySlotOverrides(slotMatch, slotOverrides);
    }
    
    // 计算最终消耗和效果
    const finalCost = this.calculateFinalCost(event, slotMatch);
    const finalReward = this.calculateFinalReward(event, slotMatch);
    
    // 扣除消耗
    if (!this.deductCost(finalCost)) {
      return { success: false, reason: '资源不足' };
    }
    
    // 应用效果
    this.applyEventEffects(finalReward);
    
    // 更新事件状态
    if (!event.execution.repeatable) {
      pool.fixedPool.completed.add(event.id);
    }
    
    // 检查事件链
    this.checkChainProgression(eventId);
    
    // 检查场景切换检定进度
    this.checkTransitionProgress(event);
    
    return { success: true, effects: finalReward };
  }
  
  /**
   * 应用环境Debuff（场景特有）
   */
  private applyEnvironmentalDebuff(scene: SceneId): void {
    const debuff = SCENE_CONFIGS[scene].environmentalDebuff;
    const turnCount = this.sceneManager.getSceneTurnCount(scene);
    
    // 检查Debuff是否已生效
    if (debuff.condition.minTurn && turnCount < debuff.condition.minTurn) {
      return;
    }
    
    // 应用效果
    const effects = debuff.perTurnEffect;
    if (effects.healthChange) {
      this.character.resources.health.current += effects.healthChange;
    }
    if (effects.mentalChange) {
      this.character.resources.mental.current += effects.mentalChange;
    }
    if (effects.moneyChange) {
      const currency = effects.moneyChange.currency.toLowerCase() as 'cny' | 'usd';
      this.character.resources.money[currency] += effects.moneyChange.amount;
    }
  }
  
  /**
   * 更新所有环境 Debuff（回合结束时调用）
   * 包括压力 Debuff 的持续时间递减
   */
  private updateEnvironmentalDebuffs(): void {
    const currentScene = this.character.status.currentScene;
    const sceneState = this.character.status.sceneState;
    
    const debuffs = sceneState.environmentalDebuffs;
    
    for (let i = debuffs.length - 1; i >= 0; i--) {
      const debuff = debuffs[i];
      
      // 减少剩余回合
      if (debuff.duration > 0) {
        debuff.duration--;
      }
      
      // 持续时间归零时移除
      if (debuff.duration === 0) {
        const removedDebuff = debuffs.splice(i, 1)[0];
        // 触发 Debuff 消失事件
        this.triggerDebuffExpiredEvent(removedDebuff);
      }
    }
  }
  
  /**
   * 抽取特朗普政策压力事件（场景3特有）
   */
  private drawPolicyEvent(pool: SceneEventPool): PolicyPressureEvent | null {
    if (!pool.policyPool || pool.policyPool.available.length === 0) {
      return null;
    }
    
    // 获取场景回合数（方案B：仅使用场景回合限制）
    const sceneTurnCount = this.character.status.turnCount.inCurrentScene;
    
    // 过滤可用事件
    const available = pool.policyPool.available.filter(event => {
      // 检查是否已触发过
      if (pool.policyPool!.triggered.has(event.id)) return false;
      
      // 检查冷却
      const cooldown = pool.policyPool!.cooldowns.get(event.id);
      if (cooldown && cooldown > 0) return false;
      
      // 检查场景回合条件（方案B）
      const sceneCondition = event.trigger.conditions?.find(
        c => c.type === 'SCENE' && c.value === 'act3'
      );
      if (sceneCondition) {
        // 检查最小场景回合
        if (sceneCondition.minSceneTurn !== undefined && 
            sceneTurnCount < sceneCondition.minSceneTurn) {
          return false;
        }
        // 检查最大场景回合
        if (sceneCondition.maxSceneTurn !== undefined && 
            sceneTurnCount > sceneCondition.maxSceneTurn) {
          return false;
        }
      }
      
      return true;
    });
    
    if (available.length === 0) return null;
    
    // 按权重随机抽取
    const totalWeight = available.reduce((sum, e) => sum + e.trigger.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const event of available) {
      random -= event.trigger.weight;
      if (random <= 0) {
        return event;
      }
    }
    
    return available[available.length - 1];
  }
  
  /**
   * 执行特朗普政策压力事件
   * 添加压力型 Debuff 到 environmentalDebuffs
   */
  private executePolicyEvent(event: PolicyPressureEvent): PolicyEventResult {
    const sceneState = this.character.status.sceneState;
    
    // 1. 构建 Debuff 数据
    const debuffData = {
      id: event.debuff.id,
      name: event.debuff.name,
      type: 'pressure' as const,
      intensity: event.debuff.intensity,
      source: `唐纳德总统宣布${event.content.announcement}`,
      duration: event.debuff.duration,
      effects: event.debuff.effects
    };
    
    // 2. 检查是否已有同类型 Debuff
    const existingDebuffIndex = sceneState.environmentalDebuffs.findIndex(
      d => d.type === 'pressure' && d.id === debuffData.id
    );
    
    if (existingDebuffIndex >= 0) {
      // 同类型 Debuff 已存在，按叠加规则处理
      const existing = sceneState.environmentalDebuffs[existingDebuffIndex];
      // 取最大强度
      existing.intensity = Math.max(existing.intensity, debuffData.intensity);
      // 延长持续时间
      existing.duration += debuffData.duration;
      // 更新效果（基于新强度）
      existing.effects = this.calculatePressureEffects(existing.intensity);
    } else {
      // 添加新 Debuff
      sceneState.environmentalDebuffs.push(debuffData);
    }
    
    // 3. 应用立即生效的心理伤害（如果有）
    if (event.debuff.effects.mentalDamagePerTurn) {
      // 立即造成一次伤害，之后每回合在 applyEnvironmentalDebuff 中继续扣
      this.character.resources.mental.current -= event.debuff.effects.mentalDamagePerTurn;
    }
    
    // 4. 更新事件状态
    const pool = this.poolManager.getPool('act3');
    if (pool.policyPool) {
      pool.policyPool.triggered.add(event.id);
      
      // 设置冷却
      if (event.trigger.cooldown) {
        pool.policyPool.cooldowns.set(event.id, event.trigger.cooldown);
      }
    }
    
    return {
      success: true,
      debuffAdded: debuffData,
      intensity: debuffData.intensity,
      duration: debuffData.duration
    };
  }
  
  /**
   * 根据强度计算压力效果
   */
  private calculatePressureEffects(intensity: number): PressureEffect {
    const effects: PressureEffect = {
      raidChanceIncrease: 0,
      workDifficultyIncrease: 0,
      mentalDamagePerTurn: 0
    };
    
    switch (intensity) {
      case 1:
        effects.raidChanceIncrease = 0.05;
        effects.workDifficultyIncrease = 5;
        effects.mentalDamagePerTurn = 1;
        break;
      case 2:
        effects.raidChanceIncrease = 0.15;
        effects.workDifficultyIncrease = 10;
        effects.mentalDamagePerTurn = 2;
        break;
      case 3:
        effects.raidChanceIncrease = 0.20;
        effects.workDifficultyIncrease = 15;
        effects.mentalDamagePerTurn = 3;
        break;
      case 4:
        effects.raidChanceIncrease = 0.30;
        effects.workDifficultyIncrease = 20;
        effects.mentalDamagePerTurn = 4;
        break;
      case 5:
        effects.raidChanceIncrease = 0.50;
        effects.workDifficultyIncrease = 30;
        effects.mentalDamagePerTurn = 6;
        break;
    }
    
    return effects;
  }
}
```

---

## 6. 存档与恢复

### 6.1 场景数据序列化

```typescript
interface SceneSaveData {
  version: number;
  
  // 当前场景
  currentScene: SceneId;
  
  // 各场景的运行时数据
  sceneData: {
    [K in SceneId]?: {
      turnCount: number;
      state: SceneSpecificState;
      triggeredEvents: string[];
      completedEvents: string[];
      activeChains: [string, ChainProgress][];
      transitionProgress: TransitionProgress;
    }
  };
  
  // 跨场景数据
  crossScene: {
    bookPoolRemaining: string[];
    accumulatedStats: {
      totalTurns: number;
      moneySpent: number;
      eventsCompleted: number;
    };
    sceneHistories: SceneHistory[];  // 用于结局结算
  };
}

// 场景历史（用于结局结算时的"关键转折点"提取）
interface SceneHistory {
  scene: SceneId;
  startTurn: number;
  endTurn: number;
  keyEvents: {
    turn: number;
    eventId: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral' | 'critical';
  }[];
  finalResources: Resources;
  finalAttributes: Attributes;
}

// 序列化
function serializeSceneData(manager: SceneManager): SceneSaveData {
  const data: SceneSaveData = {
    version: 1,
    currentScene: manager.currentScene,
    sceneData: {},
    crossScene: {
      bookPoolRemaining: manager.crossSceneData.bookPool.map(b => b.id),
      accumulatedStats: manager.crossSceneData.accumulatedStats,
      sceneHistories: manager.sceneHistories
    }
  };
  
  // 序列化每个场景的数据
  for (const [sceneId, runtimeData] of manager.sceneData) {
    data.sceneData[sceneId] = {
      turnCount: runtimeData.turnCount,
      state: runtimeData.sceneState,
      triggeredEvents: Array.from(runtimeData.triggeredEvents),
      completedEvents: Array.from(runtimeData.completedEvents),
      activeChains: Array.from(runtimeData.activeChains.entries()),
      transitionProgress: runtimeData.transitionProgress
    };
  }
  
  return data;
}
```

---

## 7. 系统交互图

```
┌─────────────────────────────────────────────────────────────────┐
│                      SceneManager                                │
├─────────────────────────────────────────────────────────────────┤
│  - currentScene: SceneId                                        │
│  - sceneData: Map<SceneId, SceneRuntimeData>                    │
│  - poolManager: ScenePoolManager                                │
│  - transitionManager: SceneTransitionManager                    │
├─────────────────────────────────────────────────────────────────┤
│  + loadScene(sceneId): void                                     │
│  + attemptTransition(toScene): TransitionResult                 │
│  + executeTurn(): TurnResult                                    │
│  + executePlayerEvent(eventId): EventResult                     │
│  + getAvailableEvents(): FixedEvent[]                           │
│  + serialize(): SceneSaveData                                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬────────────┐
        ▼            ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Act1State  │ │   Act2State  │ │   Act3State  │ │ SceneEvent   │
│   场景1状态   │ │   场景2状态   │ │   场景3状态   │ │   Pool       │
├──────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────┤
│departure     │ │routeStage    │ │identityStatus│ │randomPool    │
│readiness     │ │currentPhase  │ │applications  │ │fixedPool     │
│network       │ │routeChoice   │ │incomeSources │ │chainPool     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
        │            │            │            │
        └────────────┴────────────┴────────────┘
                     │ uses
                     ▼
        ┌────────────────────────────────┐
        │      SceneTransitionManager     │
        ├────────────────────────────────┤
        │  + attemptTransition()          │
        │  + executeSceneTransition()     │
        │  - giveStarterKit()             │
        │  - extractCrossSceneData()      │
        └────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │    uses: InventoryManager       │
        │    uses: CharacterSystem        │
        └────────────────────────────────┘
```

---

## 8. 附录

### 8.1 场景配置默认值

```typescript
const SCENE_CONFIGS: Record<SceneId, SceneConfig> = {
  act1: {
    id: 'act1',
    name: '国内准备',
    description: '位于国内，准备出发。打工攒钱，寻找离境方案。',
    baseConfig: {
      initialTurn: 0,
      actionPointRecovery: 3,
      maxActionPoints: 5
    },
    currency: 'CNY',
    environmentalDebuff: DEBUFF_ACT1_SITTING_DUCK,
    starterKit: {
      foodSupply: 0,               // 食物补给数量（统一消耗品，回复身体健康）
      initialMoney: 2000,          // 初始金钱（仅首次进入场景时使用）
      permanents: []               // 初始常驻道具ID列表
    }
  },
  
  act2: {
    id: 'act2',
    name: '跨境穿越',
    description: '位于灰色地带，准备穿越。面对极端环境，存活是唯一目的。',
    baseConfig: {
      initialTurn: 0,              // 实际继承累计回合
      actionPointRecovery: 3,
      maxActionPoints: 4           // 场景2行动点上限较低（压力大）
    },
    currency: 'USD',
    environmentalDebuff: DEBUFF_ACT2_ENVIRONMENT,
    starterKit: {
      foodSupply: 5,               // 5份食物补给
      initialMoney: 0,             // 场景2启动不给钱
      permanents: ['basic_compass'] // 初始常驻道具：基础指南针
    }
  },
  
  act3: {
    id: 'act3',
    name: '美国生存',
    description: '位于美国境内，准备获取绿卡。现金流断裂，盘查恐惧。',
    baseConfig: {
      initialTurn: 0,
      actionPointRecovery: 3,
      maxActionPoints: 5
    },
    currency: 'USD',
    environmentalDebuff: DEBUFF_ACT3_CRACKDOWN,
    // 场景3起始包根据切换路径不同而变化（金钱从CrossSceneData继承）：
    // - 走线+货车偷渡: 无道具, 非法入境（最安全）
    // - 走线+沙漠缺口: 无道具, 非法入境, 起始地点加州（高风险，靠生存能力）
    // - 走线+攀爬边境墙: 无道具, 非法入境, 健康-20（钢柱灼伤+磕碰伤）
    // - 旅游签直飞: 旅馆预订, 合法6回合,逾期转黑户(-3SAN/回合)
    // - 学生签直飞: 宿舍钥匙, 合法入学(4期学费每6回合$4000,逾期转黑户(-4SAN/回合)
    // - 随机奇迹: 无道具, 神秘身份
    starterKit: {
      foodSupply: 0,               // 场景3不给予食物补给
      initialMoney: 0,             // 金钱从CrossSceneData继承
      permanents: []               // 根据切换路径给予不同道具
    }
  }
};
```

### 8.2 错误处理

| 错误场景 | 处理方式 | 用户反馈 |
|---------|---------|---------|
| 尝试返回上一场景 | 拒绝操作 | "你无法回到过去" |
| 场景切换检定冷却中 | 拒绝操作，显示剩余回合 | "需要等待X回合后才能再次尝试" |
| 场景切换资源不足 | 拒绝操作，显示所需资源 | "需要XXX金钱/属性" |
| 事件池为空 | 记录日志，返回空事件 | 静默处理（极低概率） |
| 场景切换失败（游戏结束） | 触发游戏结束流程 | 【死亡结局】显示结局文案 |

### 8.3 结局处理（死亡作为结局的一种）

**设计原则**：死亡是结局的一种，与通关结局（获得绿卡）共用同一套**结局结算系统**。

```typescript
// 结局类型统一接口
interface GameEnding {
  type: 'death' | 'success' | 'surrender' | 'deportation';
  reason?: string;               // 死亡/结局原因
  location: SceneId;             // 发生场景
  turnCount: number;             // 总回合数
  finalStats: CharacterStats;    // 最终状态
  storyFlags: string[];          // 故事标记
}

/**
 * 统一的结局处理入口
 */
private showEnding(ending: GameEnding): void {
  // 1. 根据结局类型和原因选择文案
  const endingText = this.getEndingText(ending);
  
  // 2. 计算统计和成就
  const statistics = this.calculateFinalStats(ending);
  const achievements = this.checkAchievements(ending);
  
  // 3. 显示结局界面（共用UI）
  this.renderEndingScreen({
    title: ending.type === 'death' ? '游戏结束' : '通关',
    text: endingText,
    statistics: statistics,
    achievements: achievements,
    type: ending.type
  });
  
  // 4. 保存到结局历史
  this.saveToEndingHistory(ending);
  
  // 5. 解锁要素（多周目、图鉴等）
  this.unlockNewGamePlusElements(ending);
}
```

#### 死亡结局文案配置

```typescript
const DEATH_ENDINGS: Record<string, EndingConfig> = {
  'border_shot': {
    title: '边境枪声',
    text: '你听到枪声，然后一切都安静了。\n\n在生命的最后时刻，你想起了出发那天的阳光。',
    location: 'act2'
  },
  'wall_fall': {
    title: '坠墙而亡',
    text: '你挂在墙顶，风很大。\n\n然后你滑了下去，血染红了沙漠。',
    location: 'act2'
  },
  'trap_bled': {
    title: '失血而亡',
    text: '铁丝网割破了你的动脉。\n\n你试图按住伤口，但血还是不停地流。',
    location: 'act2'
  },
  'cartel_killed': {
    title: '人间蒸发',
    text: '那个穿制服的男人微笑着。\n\n你再也没有醒来。',
    location: 'act2'
  }
};
```

#### 场景切换失败触发死亡结局

```typescript
// 在 attemptTransition 中
if (transition.failureConsequence.gameOver) {
  this.showEnding({
    type: 'death',
    reason: transition.failureConsequence.gameOverReason,
    location: this.character.status.currentScene,
    turnCount: this.character.status.turnCount.total,
    finalStats: this.captureFinalStats(),
    storyFlags: Array.from(this.character.status.storyFlags)
  });
  return { success: false, ending: 'death' };
}
```

#### 结局统计示例

无论死亡还是通关，都统计以下数据：
- 总回合数
- 经历场景
- 触发事件数
- 最终资源状态
- 关键剧情选择记录
- 死亡地点/通关方式

### 8.4 调试工具

```typescript
namespace SceneDebug {
  // 打印当前场景状态
  export function printSceneStatus(manager: SceneManager): void {
    const current = manager.currentScene;
    const data = manager.getSceneData(current);
    
    console.log(`=== 当前场景: ${current} ===`);
    console.log(`本场景回合: ${data.turnCount}`);
    console.log(`已触发事件: ${data.triggeredEvents.size} 个`);
    console.log(`已完成事件: ${data.completedEvents.size} 个`);
    console.log(`进行中事件链: ${data.activeChains.size} 条`);
    console.log(`切换检定尝试: ${data.transitionProgress.attempts} 次`);
    
    if (data.transitionProgress.cooldownRemaining > 0) {
      console.log(`切换冷却剩余: ${data.transitionProgress.cooldownRemaining} 回合`);
    }
  }
  
  // 强制场景切换（调试用）
  export function forceTransition(manager: SceneManager, toScene: SceneId): void {
    manager.transitionManager.executeSceneTransition(manager.currentScene, toScene);
    console.log(`已强制切换到场景: ${toScene}`);
  }
}
```

---

**文档版本**: v1.1
**最后更新**: 2026-02-26
**状态**: 已根据场景切换机制讨论更新

### 更新记录

| 版本 | 日期 | 更新内容 |
|-----|------|---------|
| v1.1 | 2026-02-26 | 添加场景1→3直飞路径、场景2→3多路径（向导/漏洞/攀爬/随机）、游戏结束机制、野鸡大学持续成本 |
| v1.0 | 2026-02-26 | 初始版本 |
�持续成本 |
| v1.0 | 2026-02-26 | 初始版本 |
