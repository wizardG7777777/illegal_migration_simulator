# 债务系统架构设计

## 1. 概述

本文档定义《去美国》游戏的债务系统架构，包含债务数据结构、分期还款机制、提前还款功能、违约惩罚机制、场景间债务处理规则、以及债务相关事件的技术实现规范。

**核心设计原则**：
- **场景特定性**：债务与场景绑定，场景1债务进入场景2时清零，场景2债务带入场景3不清零
- **分期还款**：每回合自动扣除固定还款额，类似分期付款
- **独立利率**：债务利率为固定独立数值，不与通胀挂钩
- **渐进惩罚**：违约不直接导致死亡，但通过没收道具等手段逼迫玩家走向终局
- **统一管理**：信用卡、网贷、黑社会贷款统一纳入债务系统管理
- **例外排除**：学签学费和庇护律师费**不纳入**债务系统（保持原设计）

---

## 2. 核心数据接口

### 2.1 债务记录接口

```typescript
// 单笔债务记录
interface DebtRecord {
  // 基础信息
  id: string;                    // 债务唯一标识（如 debt_001）
  source: DebtSource;            // 债务来源
  
  // 金额信息
  principal: number;             // 本金
  interestRate: number;          // 利率（小数形式，如 0.30 表示30%）
  totalAmount: number;           // 应还总额（本金+利息）
  remainingAmount: number;       // 剩余应还金额
  
  // 分期还款信息
  repaymentPerTurn: number;      // 每回合固定还款额
  remainingTurns: number;        // 剩余还款回合数
  originalTurns: number;         // 原始还款总回合数
  
  // 借款时间
  borrowedAt: number;            // 借款回合数
  
  // 逾期相关
  isOverdue: boolean;            // 是否已逾期
  overdueTurns: number;          // 逾期回合数
  consecutiveMissedPayments: number;  // 连续未支付次数
  
  // 提前还款配置
  allowEarlyRepayment: boolean;  // 是否允许提前还款（默认为true）
  earlyRepaymentPenalty: number; // 提前还款违约金比例（0表示无违约金，如0.05表示5%）
  
  // 债务来源详细信息
  sourceDetails: {
    lenderName?: string;         // 放贷方名称（如"张哥"、"速贷宝"）
    loanType: 'credit_card' | 'online_loan' | 'loan_shark' | 'emergency';
    isIllegal: boolean;          // 是否非法借贷（影响追债手段）
  };
}

// 债务来源类型
type DebtSource = 
  | 'CREDIT_CARD'        // 信用卡透支
  | 'ONLINE_LOAN'        // 网贷
  | 'LOAN_SHARK'         // 黑社会贷款
  | 'EMERGENCY_LOAN';    // 紧急借贷（场景2）

// 债务记录集合（存储在角色状态中）
interface DebtCollection {
  debts: DebtRecord[];           // 所有活跃债务
  
  // 违约历史
  defaultHistory: {
    count: number;               // 累计违约次数
    firstDefaultAt?: number;     // 第一次违约回合
    lastDefaultAt?: number;      // 最后一次违约回合
  };
  
  // 当前违约状态
  currentDefault: {
    isInDefault: boolean;        // 是否正处于违约状态
    defaultStartTurn?: number;   // 本次违约开始回合
    consecutiveMissed: number;   // 连续错过还款次数
  };
}
```

### 2.2 债务系统管理器接口

```typescript
// 债务系统管理器
interface DebtSystem {
  // 债务集合
  debts: DebtCollection;
  
  // 方法：借入新债务
  borrow(
    source: DebtSource,
    principal: number,
    interestRate: number,
    repaymentTurns: number,       // 还款期限（回合数）
    sourceDetails: DebtRecord['sourceDetails'],
    earlyRepaymentConfig?: {      // 可选的提前还款配置
      allowEarlyRepayment?: boolean;
      earlyRepaymentPenalty?: number;
    }
  ): DebtRecord;
  
  // 方法：正常还款（每回合自动调用）
  processTurnPayment(): TurnPaymentResult;
  
  // 方法：提前偿还单笔债务
  earlyRepayDebt(debtId: string): EarlyRepaymentResult;
  
  // 方法：一次性还清所有债务
  earlyRepayAllDebt(): EarlyRepaymentResult;
  
  // 方法：计算应还总额
  calculateTotalOwed(): number;
  
  // 方法：获取当期应还款总额
  calculateCurrentPayment(): number;
  
  // 方法：处理违约后果
  processDefaultConsequence(defaultCount: number): DefaultConsequence;
  
  // 方法：场景切换时处理债务
  handleSceneTransition(fromScene: SceneId, toScene: SceneId): SceneTransitionDebtResult;
  
  // 方法：获取债务摘要（用于UI显示）
  getDebtSummary(): DebtSummary;
}

// 每回合还款结果
interface TurnPaymentResult {
  success: boolean;
  totalDue: number;              // 当期应还总额
  totalPaid: number;             // 实际支付总额
  payments: {
    debtId: string;
    amountDue: number;           // 该债务当期应还
    amountPaid: number;          // 实际支付
    fullyPaid: boolean;          // 是否已完全清偿
  }[];
  shortfall: number;             // 不足金额（现金不够时）
  newDefaults: string[];         // 新违约的债务ID列表
}

// 提前还款结果
interface EarlyRepaymentResult {
  success: boolean;
  amountPaid: number;            // 实际支付金额（本金+违约金）
  penaltyAmount: number;         // 违约金金额
  principalReturned: number;     // 节省的利息金额
  debtsCleared: string[];        // 已清偿的债务ID列表
  remainingDebts: DebtRecord[];  // 剩余债务列表
}

// 违约后果
interface DefaultConsequence {
  type: 'WARNING' | 'SEIZURE' | 'REPEATED_SEIZURE';
  description: string;
  effects: {
    itemsSeized?: string[];      // 被没收的道具ID列表
    healthLoss?: number;
    mentalLoss?: number;
    specialEvents?: string[];    // 触发的事件ID
  };
}

// 债务摘要（UI用）
interface DebtSummary {
  totalDebt: number;             // 总剩余债务
  totalPrincipal: number;        // 总本金
  totalInterest: number;         // 总利息
  currentPaymentPerTurn: number; // 每回合应还款额
  activeDebtCount: number;       // 活跃债务数量
  overdueCount: number;          // 逾期债务数量
  defaultCount: number;          // 历史违约次数
  isInDefault: boolean;          // 是否正处于违约状态
}
```

### 2.3 债务惩罚配置接口

```typescript
// 债务惩罚配置
interface DebtPenaltyConfig {
  // 各阶段惩罚定义
  penalties: {
    // 第一次违约：警告事件（连续2回合未支付触发）
    first: {
      type: 'WARNING';
      eventId: string;           // 触发的事件ID
      description: string;
      effects: {
        healthLoss: number;
        mentalLoss: number;
        infoLeak: boolean;       // 是否泄露信息
      };
    };
    
    // 第二次违约：没收所有道具
    second: {
      type: 'SEIZURE';
      eventId: string;
      description: string;
      effects: {
        seizeAllItems: boolean;  // 没收所有道具
        seizeHousing: boolean;   // 特别没收住房（导致流落街头）
        healthLoss: number;
        mentalLoss: number;
      };
    };
    
    // 第三次及以后：重复没收道具
    thirdPlus: {
      type: 'REPEATED_SEIZURE';
      eventId: string;
      description: string;
      effects: {
        seizeAllItems: boolean;
        healthLoss: number;
        mentalLoss: number;
      };
    };
  };
  
  // 触发违约的连续未支付次数阈值
  defaultThreshold: number;      // 默认为2回合
  
  // 追债事件触发间隔（回合）
  collectionEventInterval: number;
}

// 默认惩罚配置
const DEFAULT_PENALTY_CONFIG: DebtPenaltyConfig = {
  penalties: {
    first: {
      type: 'WARNING',
      eventId: 'act3_debt_warning',
      description: '追债公司找到你，殴打并威胁，银行卡密码泄露',
      effects: {
        healthLoss: 10,
        mentalLoss: 15,
        infoLeak: true
      }
    },
    second: {
      type: 'SEIZURE',
      eventId: 'act3_debt_seizure',
      description: '没收所有道具，包括房子钥匙，导致流落街头',
      effects: {
        seizeAllItems: true,
        seizeHousing: true,
        healthLoss: 5,
        mentalLoss: 20
      }
    },
    thirdPlus: {
      type: 'REPEATED_SEIZURE',
      eventId: 'act3_debt_seizure',
      description: '再次没收所有道具，逼迫至终局',
      effects: {
        seizeAllItems: true,
        healthLoss: 5,
        mentalLoss: 15
      }
    }
  },
  defaultThreshold: 2,           // 连续2回合未支付触发违约
  collectionEventInterval: 5     // 每5回合触发一次追债事件
};
```

---

## 3. 分期还款机制

### 3.1 还款计算逻辑

```typescript
class DebtSystemManager implements DebtSystem {
  private config: DebtPenaltyConfig = DEFAULT_PENALTY_CONFIG;
  private character: Character;
  
  /**
   * 创建新债务（分期还款方式）
   * 
   * 示例计算：
   * 借款5000元，利息30%，期限10回合
   * 应还总额 = 5000 * 1.3 = 6500
   * 每回合还款 = 6500 / 10 = 650元
   */
  borrow(
    source: DebtSource,
    principal: number,
    interestRate: number,
    repaymentTurns: number,
    sourceDetails: DebtRecord['sourceDetails'],
    earlyRepaymentConfig?: { allowEarlyRepayment?: boolean; earlyRepaymentPenalty?: number }
  ): DebtRecord {
    // 计算应还总额（本金+利息）
    const totalAmount = Math.floor(principal * (1 + interestRate));
    
    // 计算每回合固定还款额
    const repaymentPerTurn = Math.floor(totalAmount / repaymentTurns);
    
    const debt: DebtRecord = {
      id: generateId('debt'),
      source,
      principal,
      interestRate,              // 固定利率，不与通胀挂钩
      totalAmount,
      remainingAmount: totalAmount,
      repaymentPerTurn,
      remainingTurns: repaymentTurns,
      originalTurns: repaymentTurns,
      borrowedAt: this.character.status.turnCount.total,
      isOverdue: false,
      overdueTurns: 0,
      consecutiveMissedPayments: 0,
      allowEarlyRepayment: earlyRepaymentConfig?.allowEarlyRepayment ?? true,
      earlyRepaymentPenalty: earlyRepaymentConfig?.earlyRepaymentPenalty ?? 0,
      sourceDetails
    };
    
    this.character.debts.debts.push(debt);
    
    return debt;
  }
  
  /**
   * 处理每回合自动还款
   * 在回合开始时自动调用
   */
  processTurnPayment(): TurnPaymentResult {
    const result: TurnPaymentResult = {
      success: true,
      totalDue: 0,
      totalPaid: 0,
      payments: [],
      shortfall: 0,
      newDefaults: []
    };
    
    for (const debt of this.character.debts.debts) {
      if (debt.remainingTurns <= 0 || debt.remainingAmount <= 0) {
        continue;  // 已还清的债务跳过
      }
      
      // 计算当期应还金额
      const amountDue = Math.min(debt.repaymentPerTurn, debt.remainingAmount);
      result.totalDue += amountDue;
      
      // 尝试扣款
      const cash = this.character.resources.money.usd;
      const canAfford = cash >= amountDue;
      
      let amountPaid = 0;
      
      if (canAfford) {
        // 现金充足，全额扣款
        amountPaid = amountDue;
        this.character.resources.money.usd -= amountPaid;
        debt.remainingAmount -= amountPaid;
        debt.remainingTurns--;
        debt.consecutiveMissedPayments = 0;  // 重置连续未支付计数
        
        if (debt.isOverdue) {
          debt.isOverdue = false;
          debt.overdueTurns = 0;
        }
      } else if (cash > 0) {
        // 现金不足但有钱，支付部分
        amountPaid = cash;
        this.character.resources.money.usd = 0;
        debt.remainingAmount -= amountPaid;
        debt.consecutiveMissedPayments++;
      } else {
        // 完全没钱
        debt.consecutiveMissedPayments++;
      }
      
      result.totalPaid += amountPaid;
      
      // 检查是否完全清偿
      const fullyPaid = debt.remainingAmount <= 0;
      if (fullyPaid) {
        debt.remainingTurns = 0;
      }
      
      result.payments.push({
        debtId: debt.id,
        amountDue,
        amountPaid,
        fullyPaid
      });
      
      // 检查是否触发违约（连续2回合未支付）
      if (debt.consecutiveMissedPayments >= this.config.defaultThreshold) {
        if (!debt.isOverdue) {
          debt.isOverdue = true;
          debt.overdueTurns = 1;
          result.newDefaults.push(debt.id);
        } else {
          debt.overdueTurns++;
        }
      }
    }
    
    // 计算不足金额
    result.shortfall = result.totalDue - result.totalPaid;
    result.success = result.shortfall === 0;
    
    // 如果有新违约，处理违约后果
    if (result.newDefaults.length > 0) {
      this.handleNewDefaults();
    }
    
    return result;
  }
  
  /**
   * 处理新违约
   */
  private handleNewDefaults(): void {
    const defaultCount = ++this.character.debts.defaultHistory.count;
    this.character.debts.defaultHistory.lastDefaultAt = this.character.status.turnCount.total;
    
    if (defaultCount === 1) {
      this.character.debts.defaultHistory.firstDefaultAt = this.character.status.turnCount.total;
    }
    
    this.character.debts.currentDefault.isInDefault = true;
    this.character.debts.currentDefault.defaultStartTurn = this.character.status.turnCount.total;
    this.character.debts.currentDefault.consecutiveMissed++;
    
    // 触发违约后果
    const consequence = this.processDefaultConsequence(defaultCount);
    triggerEvent(consequence.effects.specialEvents![0]);
  }
  
  /**
   * 计算当期应还款总额
   */
  calculateCurrentPayment(): number {
    return this.character.debts.debts.reduce((total, debt) => {
      if (debt.remainingTurns > 0 && debt.remainingAmount > 0) {
        return total + Math.min(debt.repaymentPerTurn, debt.remainingAmount);
      }
      return total;
    }, 0);
  }
}
```

### 3.2 提前还款机制

```typescript
class DebtSystemManager implements DebtSystem {
  
  /**
   * 提前偿还单笔债务
   * @param debtId 债务ID
   * @returns 提前还款结果
   */
  earlyRepayDebt(debtId: string): EarlyRepaymentResult {
    const debt = this.character.debts.debts.find(d => d.id === debtId);
    
    if (!debt) {
      return {
        success: false,
        amountPaid: 0,
        penaltyAmount: 0,
        principalReturned: 0,
        debtsCleared: [],
        remainingDebts: this.character.debts.debts
      };
    }
    
    // 检查是否允许提前还款
    if (!debt.allowEarlyRepayment) {
      return {
        success: false,
        amountPaid: 0,
        penaltyAmount: 0,
        principalReturned: 0,
        debtsCleared: [],
        remainingDebts: this.character.debts.debts
      };
    }
    
    // 计算剩余本金（按比例）
    const remainingPrincipal = Math.floor(
      debt.principal * (debt.remainingTurns / debt.originalTurns)
    );
    
    // 计算违约金
    const penaltyAmount = Math.floor(remainingPrincipal * debt.earlyRepaymentPenalty);
    
    // 计算实际应支付金额
    const amountToPay = remainingPrincipal + penaltyAmount;
    
    // 检查现金是否充足
    if (this.character.resources.money.usd < amountToPay) {
      return {
        success: false,
        amountPaid: 0,
        penaltyAmount: 0,
        principalReturned: 0,
        debtsCleared: [],
        remainingDebts: this.character.debts.debts
      };
    }
    
    // 扣款并清除债务
    this.character.resources.money.usd -= amountToPay;
    
    // 计算节省的利息
    const interestSaved = debt.remainingAmount - remainingPrincipal;
    
    // 从债务列表中移除
    this.character.debts.debts = this.character.debts.debts.filter(d => d.id !== debtId);
    
    return {
      success: true,
      amountPaid: amountToPay,
      penaltyAmount,
      principalReturned: interestSaved,
      debtsCleared: [debtId],
      remainingDebts: this.character.debts.debts
    };
  }
  
  /**
   * 一次性还清所有债务
   * @returns 提前还款结果
   */
  earlyRepayAllDebt(): EarlyRepaymentResult {
    const result: EarlyRepaymentResult = {
      success: true,
      amountPaid: 0,
      penaltyAmount: 0,
      principalReturned: 0,
      debtsCleared: [],
      remainingDebts: []
    };
    
    // 计算总金额
    let totalToPay = 0;
    const debtPayments: { debt: DebtRecord; amount: number; principal: number }[] = [];
    
    for (const debt of this.character.debts.debts) {
      if (!debt.allowEarlyRepayment) {
        // 有不允许提前还款的债务，不能一次性还清
        continue;
      }
      
      const remainingPrincipal = Math.floor(
        debt.principal * (debt.remainingTurns / debt.originalTurns)
      );
      const penalty = Math.floor(remainingPrincipal * debt.earlyRepaymentPenalty);
      const amount = remainingPrincipal + penalty;
      
      totalToPay += amount;
      debtPayments.push({ debt, amount, principal: remainingPrincipal });
    }
    
    // 检查现金
    if (this.character.resources.money.usd < totalToPay) {
      return {
        success: false,
        amountPaid: 0,
        penaltyAmount: 0,
        principalReturned: 0,
        debtsCleared: [],
        remainingDebts: this.character.debts.debts
      };
    }
    
    // 执行还款
    this.character.resources.money.usd -= totalToPay;
    
    for (const payment of debtPayments) {
      result.amountPaid += payment.amount;
      result.penaltyAmount += payment.amount - payment.principal;
      result.principalReturned += payment.debt.remainingAmount - payment.principal;
      result.debtsCleared.push(payment.debt.id);
    }
    
    // 移除已还清的债务
    const clearedIds = new Set(result.debtsCleared);
    this.character.debts.debts = this.character.debts.debts.filter(d => !clearedIds.has(d.id));
    result.remainingDebts = this.character.debts.debts;
    
    return result;
  }
}
```

---

## 4. 债务惩罚机制

### 4.1 渐进式惩罚流程

```
回合开始
    ↓
自动扣除当期还款
    ↓
检查是否支付成功
    ↓
┌─────────────┬─────────────┐
│   支付成功   │  支付失败   │
└──────┬──────┴──────┬──────┘
       ↓             ↓
  重置未支付计数   增加未支付计数
       ↓             ↓
                  检查连续未支付次数
                       ↓
              ┌─────────────────┐
              │  是否 >= 2回合  │
              └────────┬────────┘
                       ↓
              ┌────────┴────────┐
              │      是        │ 否
              ↓                 ↓
         触发违约         记录但未违约
              ↓
    ┌─────────────────────────────────┐
    │          违约次数判定            │
    └─────────────────────────────────┘
         ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐
│   第1次违约   │  │   第2次违约   │  │     第3次及以后       │
│  WARNING     │  │   SEIZURE    │  │   REPEATED_SEIZURE   │
└──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘
       ↓                 ↓                     ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐
│act3_debt_    │  │act3_debt_    │  │   act3_debt_seizure  │
│warning       │  │seizure       │  │   (重复触发)         │
│              │  │              │  │                      │
│• 被殴打      │  │• 没收道具    │  │• 再次没收道具        │
│• 信息泄露    │  │• 流落街头    │  │• 持续施压            │
│• 警告威胁    │  │• 无家可归    │  │• 逼迫终局            │
└──────────────┘  └──────────────┘  └──────────────────────┘
```

### 4.2 惩罚实现代码

```typescript
class DebtSystemManager implements DebtSystem {
  private config: DebtPenaltyConfig = DEFAULT_PENALTY_CONFIG;
  private character: Character;
  
  /**
   * 处理违约后果
   * @param defaultCount 累计违约次数（本次违约后）
   * @returns 违约后果详情
   */
  processDefaultConsequence(defaultCount: number): DefaultConsequence {
    const { penalties } = this.config;
    
    if (defaultCount === 1) {
      // 第一次违约：警告事件
      return this.applyFirstDefault(penalties.first);
    } else if (defaultCount === 2) {
      // 第二次违约：没收所有道具
      return this.applySecondDefault(penalties.second);
    } else {
      // 第三次及以后：重复没收
      return this.applyThirdPlusDefault(penalties.thirdPlus);
    }
  }
  
  private applyFirstDefault(penalty: typeof DEFAULT_PENALTY_CONFIG.penalties.first): DefaultConsequence {
    // 触发警告事件
    triggerEvent(penalty.eventId);
    
    // 应用数值惩罚
    this.character.resources.health.current -= penalty.effects.healthLoss;
    this.character.resources.mental.current -= penalty.effects.mentalLoss;
    
    // 信息泄露：可能导致后续问题
    if (penalty.effects.infoLeak) {
      this.character.flags.bankInfoLeaked = true;
      // 银行账户可能被监控或冻结
      this.applyBankAccountRisk();
    }
    
    return {
      type: 'WARNING',
      description: penalty.description,
      effects: {
        healthLoss: penalty.effects.healthLoss,
        mentalLoss: penalty.effects.mentalLoss,
        specialEvents: [penalty.eventId]
      }
    };
  }
  
  private applySecondDefault(penalty: typeof DEFAULT_PENALTY_CONFIG.penalties.second): DefaultConsequence {
    const seizedItems: string[] = [];
    
    // 触发没收事件
    triggerEvent(penalty.eventId);
    
    // 没收所有常驻道具
    if (penalty.effects.seizeAllItems) {
      const allItems = [...this.character.inventory.permanents.items];
      for (const item of allItems) {
        this.character.inventory.permanents.removeItem(item.id);
        seizedItems.push(item.id);
      }
    }
    
    // 特别处理住房道具（流落街头）
    if (penalty.effects.seizeHousing) {
      this.character.status.isHomeless = true;
      this.applyHomelessDebuff();
    }
    
    // 应用数值惩罚
    this.character.resources.health.current -= penalty.effects.healthLoss;
    this.character.resources.mental.current -= penalty.effects.mentalLoss;
    
    return {
      type: 'SEIZURE',
      description: penalty.description,
      effects: {
        itemsSeized: seizedItems,
        healthLoss: penalty.effects.healthLoss,
        mentalLoss: penalty.effects.mentalLoss,
        specialEvents: [penalty.eventId]
      }
    };
  }
  
  private applyThirdPlusDefault(penalty: typeof DEFAULT_PENALTY_CONFIG.penalties.thirdPlus): DefaultConsequence {
    const seizedItems: string[] = [];
    
    // 触发重复没收事件
    triggerEvent(penalty.eventId);
    
    // 再次没收所有道具（玩家可能在期间重新获得了道具）
    if (penalty.effects.seizeAllItems) {
      const allItems = [...this.character.inventory.permanents.items];
      for (const item of allItems) {
        this.character.inventory.permanents.removeItem(item.id);
        seizedItems.push(item.id);
      }
    }
    
    // 应用数值惩罚
    this.character.resources.health.current -= penalty.effects.healthLoss;
    this.character.resources.mental.current -= penalty.effects.mentalLoss;
    
    // 持续施压：增加心理负担
    this.applyPressureDebuff();
    
    return {
      type: 'REPEATED_SEIZURE',
      description: penalty.description,
      effects: {
        itemsSeized: seizedItems,
        healthLoss: penalty.effects.healthLoss,
        mentalLoss: penalty.effects.mentalLoss,
        specialEvents: [penalty.eventId]
      }
    };
  }
  
  private applyHomelessDebuff(): void {
    // 应用【露宿街头】Debuff
    const homelessDebuff: EnvironmentalDebuff = {
      id: 'debuff_homeless',
      type: 'environmental',
      name: '露宿街头',
      description: '无家可归，每晚都在寻找下一个栖身之处',
      effects: {
        healthPerTurn: -5,         // 每回合健康-5
        mentalPerTurn: -8,         // 每回合心理-8
        actionPointModifier: -1    // 行动点-1
      },
      duration: -1                 // 永久持续，直到获得住房
    };
    
    this.character.status.activeDebuffs.push(homelessDebuff);
  }
  
  private applyBankAccountRisk(): void {
    // 银行账户被监控：随机冻结风险
    this.character.status.bankAccountRisk = true;
  }
  
  private applyPressureDebuff(): void {
    // 持续压力Debuff
    const pressureDebuff: EnvironmentalDebuff = {
      id: 'debt_pressure',
      type: 'environmental',
      name: '债务压力',
      description: '追债人的阴影笼罩着你',
      effects: {
        mentalPerTurn: -3
      },
      duration: -1
    };
    
    this.character.status.activeDebuffs.push(pressureDebuff);
  }
}
```

---

## 5. 各场景债务事件

### 5.1 场景1：统一借贷事件

```typescript
// 场景1债务事件配置
const ACT1_DEBT_EVENTS = {
  // 统一借贷事件：现金不足时触发
  act1_loan_shark: {
    id: 'act1_loan_shark',
    category: 'FIXED',
    name: '地下借贷',
    description: |
      你站在昏暗的小巷口，手里攥着一张皱巴巴的名片。
      上面的字迹已经模糊，但"快速放款"四个字依然刺眼。
      
      你的积蓄已经见底，但离出发去美国还差那么一点...
      
      【地下钱庄】
      - 可借金额：5000-20000 人民币
      - 利率：固定30%（不与通胀挂钩）
      - 还款方式：分期还款，每回合自动扣除
      - 期限：5-10回合
      - 进入场景2时债务清零（你跑路了）
    ,
    trigger: {
      type: 'CONDITION',
      conditions: [
        { type: 'CASH_LT', value: 1000, currency: 'CNY' }  // 现金<1000触发
      ]
    },
    execution: {
      repeatable: true,           // 可多次借贷
      actionPointCost: 1,
      moneyCost: 0
    },
    scenes: ['act1'],
    execute: (character: Character) => {
      // 显示借贷选项
      const options = [
        { amount: 5000, interest: 0.30, turns: 5 },   // 每期还1300
        { amount: 10000, interest: 0.30, turns: 8 },  // 每期还1625
        { amount: 20000, interest: 0.30, turns: 10 }  // 每期还2600
      ];
      
      const choice = prompt('选择借款金额：', options.map(o => 
        `${o.amount}元（利率${o.interest*100}%，${o.turns}期，每期${Math.floor(o.amount * 1.3 / o.turns)}元）`
      ));
      
      if (choice) {
        const selected = options[choice.index];
        
        // 创建债务记录（分期还款）
        const debt = debtSystem.borrow(
          'LOAN_SHARK',
          selected.amount,
          selected.interest,       // 固定利率，不与通胀挂钩
          selected.turns,          // 还款期限
          {
            lenderName: '张哥',
            loanType: 'loan_shark',
            isIllegal: true
          },
          {
            allowEarlyRepayment: true,
            earlyRepaymentPenalty: 0.05  // 5%提前还款违约金
          }
        );
        
        // 获得现金
        character.resources.money.cny += selected.amount;
        
        log(`你从张哥那里借了 ${selected.amount} 人民币。`);
        log(`利率 ${selected.interest*100}%，分${selected.turns}期还款，每期${debt.repaymentPerTurn}元`);
        log('每回合将自动从现金中扣除还款金额。');
        
        // 设置标记：有黑道债务
        character.flags.hasLoanSharkDebt = true;
        
        return { success: true, debtId: debt.id };
      }
      
      return { success: false, reason: '取消借贷' };
    }
  }
};
```

### 5.2 场景2：紧急借贷事件

```typescript
// 场景2债务事件配置
const ACT2_DEBT_EVENTS = {
  // 紧急借贷事件：现金严重不足时触发
  act2_emergency_loan: {
    id: 'act2_emergency_loan',
    category: 'RANDOM',           // 随机事件触发
    name: '紧急借贷',
    description: |
      雨林里的向导不耐烦地敲着手表。
      
      "兄弟，明天就要穿越边境了，你的向导费还没付清。
      要不要我跟那边的'朋友'说一声，先借你点应急？"
      
      【紧急借贷】
      - 可借金额：$50-$200
      - 利率：固定20%（不与通胀挂钩）
      - 还款方式：分期还款，每回合自动扣除
      - 期限：3-5回合
      - ⚠️ 此债务会**带入场景3**不清零！
    ,
    trigger: {
      phase: 'TURN_START',
      weight: 30,
      conditions: [
        { type: 'CASH_LT', value: 50, currency: 'USD' },  // 现金<$50
        { type: 'SCENE', value: 'act2' }
      ],
      maxTriggers: 2              // 最多触发2次
    },
    scenes: ['act2'],
    execute: (character: Character) => {
      const options = [
        { amount: 50, interest: 0.20, turns: 3 },   // 每期还20
        { amount: 100, interest: 0.20, turns: 4 },  // 每期还30
        { amount: 200, interest: 0.20, turns: 5 }   // 每期还48
      ];
      
      const choice = prompt('选择借款金额（会带入场景3）：', 
        options.map(o => `$${o.amount}（利率${o.interest*100}%，${o.turns}期，每期$${Math.floor(o.amount * 1.2 / o.turns)}）`));
      
      if (choice) {
        const selected = options[choice.index];
        
        // 创建债务记录（会带入场景3）
        const debt = debtSystem.borrow(
          'EMERGENCY_LOAN',
          selected.amount,
          selected.interest,       // 固定利率
          selected.turns,          // 还款期限
          {
            lenderName: '向导的朋友',
            loanType: 'emergency',
            isIllegal: true
          },
          {
            allowEarlyRepayment: false  // 不允许提前还款
          }
        );
        
        character.resources.money.usd += selected.amount;
        
        log(`你借了 $${selected.amount}。`);
        log(`分${selected.turns}期还款，每期$${debt.repaymentPerTurn}`);
        log(`⚠️ 警告：这笔债务会跟随你到场景3！`);
        
        return { success: true, debtId: debt.id };
      }
      
      return { success: false };
    }
  }
};
```

### 5.3 场景3：债务管理与追债事件

```typescript
// 场景3债务事件配置
const ACT3_DEBT_EVENTS = {
  // 每回合自动还款检查（回合开始时自动触发）
  act3_debt_auto_payment: {
    id: 'act3_debt_auto_payment',
    category: 'RANDOM',
    name: '债务自动还款',
    description: '每回合自动扣除当期还款',
    trigger: {
      phase: 'TURN_START',
      weight: 100,                // 高权重，确保触发
      conditions: [
        { type: 'HAS_DEBT' },
        { type: 'SCENE', value: 'act3' }
      ]
    },
    scenes: ['act3'],
    execute: (character: Character) => {
      // 执行自动还款
      const result = debtSystem.processTurnPayment();
      
      if (result.totalDue > 0) {
        log(`【债务还款】当期应还: $${result.totalDue}，实际支付: $${result.totalPaid}`);
        
        // 显示各债务还款情况
        for (const payment of result.payments) {
          const debt = character.debts.debts.find(d => d.id === payment.debtId);
          if (debt) {
            if (payment.fullyPaid) {
              log(`✓ ${debt.sourceDetails.lenderName} 的债务已清偿！`);
            } else {
              log(`- ${debt.sourceDetails.lenderName}: 还$${payment.amountPaid}，剩余$${debt.remainingAmount}`);
            }
          }
        }
        
        // 处理不足情况
        if (result.shortfall > 0) {
          log(`⚠️ 现金不足！缺少 $${result.shortfall}，连续2回合将触发违约。`);
        }
      }
      
      // 处理新违约
      if (result.newDefaults.length > 0) {
        const defaultCount = character.debts.defaultHistory.count;
        log(`⚠️ 违约警告：这是你第 ${defaultCount} 次违约！`);
      }
      
      return { success: true, result };
    }
  },
  
  // 第一次违约：警告事件
  act3_debt_warning: {
    id: 'act3_debt_warning',
    category: 'FIXED',
    name: '追债上门',
    description: |
      你刚走出出租屋，三个壮汉就堵住了巷口。
      
      "张哥让我们来看看你。"领头的男子活动着手腕，
      "听说你最近手头紧？没关系，我们可以'帮'你想办法。"
      
      拳头落下的瞬间，你意识到他们不只是来聊天的。
      
      【后果】
      - 身体健康 -10
      - 心理健康 -15
      - 银行卡密码被泄露
      - 获得Debuff【被监控】
    ,
    execution: {
      repeatable: false,
      actionPointCost: 0,
      forced: true               // 强制触发，无法拒绝
    },
    scenes: ['act3'],
    execute: (character: Character) => {
      // 数值惩罚
      character.resources.health.current -= 10;
      character.resources.mental.current -= 15;
      
      // 信息泄露后果
      character.flags.bankInfoLeaked = true;
      
      // 应用被监控Debuff
      applyDebuff(character, 'debt_monitored', -1);
      
      log("你被狠狠地'教育'了一顿。");
      log("他们临走前说：'下次就没这么客气了。'");
      
      return { success: true };
    }
  },
  
  // 第二次违约：没收道具
  act3_debt_seizure: {
    id: 'act3_debt_seizure',
    category: 'FIXED',
    name: '财产查封',
    description: |
      凌晨四点，砸门声把你从梦中惊醒。
      
      你透过猫眼看到十几个黑影，还有电钻的嗡嗡声。
      "开门！债务清算！"
      
      当你颤抖着打开门，他们像蝗虫一样涌入——
      冰箱、电视、你的背包...
      
      "这个也带走。"一个人从你的口袋里抢走了公寓钥匙。
      
      天亮时，你站在空无一物的房间里，意识到：
      你不仅破产了，你还无家可归了。
      
      【后果】
      - 没收所有道具
      - 失去住房（获得【露宿街头】Debuff）
      - 身体健康 -5
      - 心理健康 -20
    ,
    execution: {
      repeatable: false,
      actionPointCost: 0,
      forced: true
    },
    scenes: ['act3'],
    execute: (character: Character) => {
      // 没收所有常驻道具
      const seizedItems = [...character.inventory.permanents.items];
      character.inventory.permanents.clear();
      
      // 失去住房
      character.status.isHomeless = true;
      applyDebuff(character, 'homeless', -1);
      
      // 数值惩罚
      character.resources.health.current -= 5;
      character.resources.mental.current -= 20;
      
      log("你的所有财产被洗劫一空。");
      log("你现在无家可归。");
      
      return { 
        success: true, 
        seizedItems: seizedItems.map(i => i.id)
      };
    }
  },
  
  // 主动还款/提前还款事件
  act3_repay_debt: {
    id: 'act3_repay_debt',
    category: 'FIXED',
    name: '偿还债务',
    description: '偿还部分或全部债务（支持提前还款）',
    execution: {
      repeatable: true,
      actionPointCost: 1,
      moneyCost: 0                // 动态决定
    },
    scenes: ['act3'],
    execute: (character: Character) => {
      const summary = debtSystem.getDebtSummary();
      
      if (summary.totalDebt === 0) {
        log("你没有债务需要偿还。");
        return { success: false, reason: '无债务' };
      }
      
      // 显示债务列表
      const debts = character.debts.debts;
      const options = debts.map(d => {
        const remainingPrincipal = Math.floor(d.principal * (d.remainingTurns / d.originalTurns));
        const penalty = d.allowEarlyRepayment 
          ? Math.floor(remainingPrincipal * d.earlyRepaymentPenalty) 
          : 0;
        const earlyPayAmount = remainingPrincipal + penalty;
        
        return {
          debtId: d.id,
          label: `${d.sourceDetails.lenderName}: $${d.remainingAmount} (每期$${d.repaymentPerTurn})`,
          earlyPayAmount,
          canEarlyRepay: d.allowEarlyRepayment
        };
      });
      
      options.push({ 
        debtId: 'ALL', 
        label: `一次性还清所有可提前还款债务`,
        earlyPayAmount: 0,
        canEarlyRepay: true
      });
      
      const choice = prompt('选择要偿还的债务：', options.map(o => o.label));
      
      if (choice) {
        const selected = options[choice.index];
        
        if (selected.debtId === 'ALL') {
          // 全部提前还清
          const result = debtSystem.earlyRepayAllDebt();
          if (result.success) {
            log(`你还清了所有债务！`);
            log(`支付总额: $${result.amountPaid} (含违约金 $${result.penaltyAmount})`);
            log(`节省利息: $${result.principalReturned}`);
            // 清除部分负面状态
            removeDebuff(character, 'debt_monitored');
          } else {
            log(`现金不足，无法还清所有债务。`);
          }
          return result;
        } else {
          const debt = debts.find(d => d.id === selected.debtId);
          
          if (!debt!.allowEarlyRepayment) {
            log('此债务不允许提前还款，请等待分期扣款。');
            return { success: false, reason: '不允许提前还款' };
          }
          
          // 提前还款确认
          const confirmMsg = `提前还款需支付 $${selected.earlyPayAmount}（含违约金），确认吗？`;
          if (confirm(confirmMsg)) {
            const result = debtSystem.earlyRepayDebt(selected.debtId);
            if (result.success) {
              log(`你已提前还清 ${debt!.sourceDetails.lenderName} 的债务！`);
              log(`支付: $${result.amountPaid} (违约金: $${result.penaltyAmount})`);
              log(`节省利息: $${result.principalReturned}`);
            } else {
              log(`现金不足，无法提前还款。`);
            }
            return result;
          }
        }
      }
      
      return { success: false, reason: '取消还款' };
    }
  }
};
```

---

## 6. 债务与场景切换的交互

### 6.1 场景切换债务处理流程

```typescript
// 场景切换时的债务处理
interface SceneTransitionDebtResult {
  clearedDebts: string[];        // 被清零的债务ID
  carriedDebts: string[];        // 被带入新场景的债务ID
  narrativeMessage: string;      // 叙事提示
  specialEffects?: {
    flags?: string[];            // 需要设置的标记
    debuffs?: string[];          // 需要应用的Debuff
  };
}

class DebtSceneTransitionHandler {
  /**
   * 处理场景切换时的债务
   * @param fromScene 源场景
   * @param toScene 目标场景
   * @param debts 当前债务集合
   * @returns 场景切换债务处理结果
   */
  handleTransition(
    fromScene: SceneId,
    toScene: SceneId,
    debts: DebtCollection
  ): SceneTransitionDebtResult {
    const transitionKey = `${fromScene}_to_${toScene}`;
    
    switch (transitionKey) {
      case 'act1_to_act2':
        return this.handleAct1ToAct2(debts);
      case 'act2_to_act3':
        return this.handleAct2ToAct3(debts);
      default:
        // 其他切换（如直飞）保持债务不变
        return {
          clearedDebts: [],
          carriedDebts: debts.debts.map(d => d.id),
          narrativeMessage: ''
        };
    }
  }
  
  /**
   * 场景1 → 场景2：债务清零
   */
  private handleAct1ToAct2(debts: DebtCollection): SceneTransitionDebtResult {
    const allDebtIds = debts.debts.map(d => d.id);
    
    // 清空所有债务
    debts.debts = [];
    debts.defaultHistory = { count: 0 };
    debts.currentDefault = { isInDefault: false, consecutiveMissed: 0 };
    
    return {
      clearedDebts: allDebtIds,
      carriedDebts: [],
      narrativeMessage: this.getAct1ToAct2Narrative(allDebtIds.length > 0),
      specialEffects: {
        flags: ['debts_abandoned_act1']
      }
    };
  }
  
  /**
   * 场景2 → 场景3：保留债务
   */
  private handleAct2ToAct3(debts: DebtCollection): SceneTransitionDebtResult {
    const carriedIds = debts.debts.map(d => d.id);
    
    return {
      clearedDebts: [],
      carriedDebts: carriedIds,
      narrativeMessage: this.getAct2ToAct3Narrative(carriedIds.length > 0, debts),
      specialEffects: {
        flags: ['debt_check_pending']  // 标记场景3第1回合需要检查债务
      }
    };
  }
  
  private getAct1ToAct2Narrative(hadDebts: boolean): string {
    if (hadDebts) {
      return `
        当你踏上去往边境的飞机，身后的债务也随之烟消云散。
        
        张哥和那些放贷的？他们再也找不到你了。
        这算不算另一种"自由"？
        
        【场景1债务已清零】
      `;
    }
    return '';
  }
  
  private getAct2ToAct3Narrative(hasDebts: boolean, debts: DebtCollection): string {
    if (hasDebts) {
      const totalRemaining = debts.debts.reduce((sum, d) => sum + d.remainingAmount, 0);
      const perTurnPayment = debts.debts.reduce((sum, d) => sum + d.repaymentPerTurn, 0);
      return `
        你终于踏上了美国的土地，但债务的阴影依然笼罩着你。
        
        "向导的朋友"可不管你在哪个国家——
        他们的"业务"遍布各地。
        
        【带入场景3的债务】
        剩余欠款：$${totalRemaining.toFixed(2)}
        每期还款：$${perTurnPayment.toFixed(2)}
        记得确保现金充足，连续2回合未支付将触发违约...
      `;
    }
    return '';
  }
}
```

### 6.2 场景切换执行代码

```typescript
// 在场景切换管理器中集成债务处理
class SceneTransitionManager {
  private debtHandler = new DebtSceneTransitionHandler();
  
  private executeSceneTransition(from: SceneId, to: SceneId, transitionType?: string): void {
    // 1. 处理债务场景切换
    const debtResult = this.debtHandler.handleTransition(
      from,
      to,
      this.character.debts
    );
    
    // 2. 显示叙事提示
    if (debtResult.narrativeMessage) {
      showNarrative(debtResult.narrativeMessage);
    }
    
    // 3. 应用特殊效果
    if (debtResult.specialEffects) {
      for (const flag of debtResult.specialEffects.flags || []) {
        this.character.flags[flag] = true;
      }
      for (const debuff of debtResult.specialEffects.debuffs || []) {
        applyDebuff(this.character, debuff, -1);
      }
    }
    
    // 4. 继续其他场景切换逻辑...
    // ...
  }
}

// 场景3第1回合债务检查
class Act3TurnStartHandler {
  handleFirstTurn(character: Character): void {
    // 检查是否有待处理的债务检查
    if (character.flags.debt_check_pending) {
      // 立即执行自动还款
      const result = debtSystem.processTurnPayment();
      
      if (result.newDefaults.length > 0) {
        // 刚进入场景3就违约
        triggerEvent('act3_debt_immediate_default');
      }
      
      // 清除标记
      delete character.flags.debt_check_pending;
    }
  }
}
```

---

## 7. 违约后果事件链详细定义

### 7.1 事件链流程图

```
回合开始
    ↓
自动扣除当期还款
    ↓
检查是否支付成功
    ↓
┌─────────────┬─────────────┐
│   支付成功   │  支付失败   │
└──────┬──────┴──────┬──────┘
       ↓             ↓
  重置未支付计数   增加未支付计数
       ↓             ↓
                  检查连续未支付次数
                       ↓
              ┌─────────────────┐
              │  是否 >= 2回合  │
              └────────┬────────┘
                       ↓
              ┌────────┴────────┐
              │      是        │ 否
              ↓                 ↓
         触发违约         记录但未违约
              ↓
┌─────────────────────────────────────────────────────────────┐
│                      违约次数判定                           │
└─────────────────────────────────────────────────────────────┘
    ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐
│   第1次违约   │  │   第2次违约   │  │     第3次及以后       │
│  WARNING     │  │   SEIZURE    │  │   REPEATED_SEIZURE   │
└──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘
       ↓                 ↓                     ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐
│act3_debt_    │  │act3_debt_    │  │   act3_debt_seizure  │
│warning       │  │seizure       │  │   (重复触发)         │
│              │  │              │  │                      │
│• 被殴打      │  │• 没收道具    │  │• 再次没收道具        │
│• 信息泄露    │  │• 流落街头    │  │• 持续施压            │
│• 警告威胁    │  │• 无家可归    │  │• 逼迫终局            │
└──────────────┘  └──────────────┘  └──────────────────────┘
```

### 7.2 详细事件定义

```yaml
# ============================================
# 违约后果事件链 - YAML配置
# ============================================

# 第一次违约：警告事件（连续2回合未支付触发）
act3_debt_warning:
  id: act3_debt_warning
  category: RANDOM
  name: 追债上门
  trigger:
    phase: EVENT_DRIVEN        # 由债务系统触发，非随机
    condition: ON_FIRST_DEFAULT
  scenes: [act3]
  narrative:
    title: "巷口的'问候'"
    description: |
      你刚走出出租屋，三个壮汉就堵住了巷口。
      
      "张哥让我们来看看你。"领头的男子活动着手腕，
      "听说你最近手头紧？没关系，我们可以'帮'你想办法。"
      
      他们把你拖进旁边的小巷。拳头落下的瞬间，
      你意识到他们不只是来聊天的。
      
      "密码。"一个人掏出你的银行卡。
      
      当你颤抖着说出六位数字时，你知道——
      这只是开始。
  effects:
    health: -10
    mental: -15
    flags:
      - bank_info_leaked        # 银行信息泄露
    debuffs:
      - id: debt_monitored
        name: "被监控"
        description: "你的银行账户已被监控，随时可能被冻结"
        duration: -1
  
# 第二次违约：没收道具
act3_debt_seizure:
  id: act3_debt_seizure
  category: RANDOM
  name: 财产查封
  trigger:
    phase: EVENT_DRIVEN
    condition: ON_SECOND_DEFAULT
  scenes: [act3]
  narrative:
    title: "凌晨的'清算'"
    description: |
      凌晨四点，砸门声把你从梦中惊醒。
      
      你透过猫眼看到十几个黑影，还有电钻的嗡嗡声。
      "开门！债务清算！"
      
      当你颤抖着打开门，他们像蝗虫一样涌入——
      冰箱、电视、你的背包、鞋子...
      任何能换钱的东西都被搬空。
      
      "这个也带走。"一个人从你的口袋里抢走了公寓钥匙。
      "房子？不，现在不是'你的'了。"
      
      天亮时，你站在空无一物的房间里，意识到：
      你不仅破产了，你还无家可归了。
      
      【获得Debuff：露宿街头】
  effects:
    health: -5
    mental: -20
    actions:
      - type: CLEAR_ALL_PERMANENT_ITEMS    # 没收所有道具
      - type: REMOVE_HOUSING               # 移除住房
    flags:
      - is_homeless
    debuffs:
      - id: homeless
        name: "露宿街头"
        description: "无家可归，每晚都在寻找下一个栖身之处"
        effects:
          healthPerTurn: -5
          mentalPerTurn: -8
          actionPointModifier: -1
        duration: -1                        # 永久，直到获得新住房
  
# 第三次及以后违约：重复没收
act3_debt_repeated_pressure:
  id: act3_debt_repeated_pressure
  category: RANDOM
  name: 持续施压
  trigger:
    phase: EVENT_DRIVEN
    condition: ON_THIRD_PLUS_DEFAULT
  scenes: [act3]
  narrative:
    title: "无处可逃"
    description: |
      他们又找到了你。
      
      不管你在哪里——公园长椅、收容所、甚至公共厕所——
      追债人的影子总是如影随形。
      
      "张哥说了，"领头的蹲在你面前，
      "钱可以慢慢还，但利息要按时付。"
      
      他看了看你的背包——里面刚买的面包。
      "这个，也'抵'了吧。"
      
      你再次一无所有。
  effects:
    health: -5
    mental: -15
    actions:
      - type: CLEAR_ALL_PERMANENT_ITEMS    # 再次没收所有道具
    debuffs:
      - id: crushing_pressure
        name: " crushing pressure"
        description: "债务的重压让你喘不过气"
        effects:
          mentalPerTurn: -3
        duration: -1
```

---

## 8. 与存档系统的集成

### 8.1 存档数据结构

```typescript
interface DebtSaveData {
  version: number;
  
  // 债务列表
  debts: {
    id: string;
    source: DebtSource;
    principal: number;
    interestRate: number;
    totalAmount: number;
    remainingAmount: number;
    repaymentPerTurn: number;
    remainingTurns: number;
    originalTurns: number;
    borrowedAt: number;
    isOverdue: boolean;
    overdueTurns: number;
    consecutiveMissedPayments: number;
    allowEarlyRepayment: boolean;
    earlyRepaymentPenalty: number;
    sourceDetails: DebtRecord['sourceDetails'];
  }[];
  
  // 违约历史
  defaultHistory: {
    count: number;
    firstDefaultAt?: number;
    lastDefaultAt?: number;
  };
  
  // 当前违约状态
  currentDefault: {
    isInDefault: boolean;
    defaultStartTurn?: number;
    consecutiveMissed: number;
  };
}

// 序列化
function serializeDebts(debtSystem: DebtSystem): DebtSaveData {
  return {
    version: 1,
    debts: debtSystem.debts.debts.map(d => ({
      id: d.id,
      source: d.source,
      principal: d.principal,
      interestRate: d.interestRate,
      totalAmount: d.totalAmount,
      remainingAmount: d.remainingAmount,
      repaymentPerTurn: d.repaymentPerTurn,
      remainingTurns: d.remainingTurns,
      originalTurns: d.originalTurns,
      borrowedAt: d.borrowedAt,
      isOverdue: d.isOverdue,
      overdueTurns: d.overdueTurns,
      consecutiveMissedPayments: d.consecutiveMissedPayments,
      allowEarlyRepayment: d.allowEarlyRepayment,
      earlyRepaymentPenalty: d.earlyRepaymentPenalty,
      sourceDetails: d.sourceDetails
    })),
    defaultHistory: { ...debtSystem.debts.defaultHistory },
    currentDefault: { ...debtSystem.debts.currentDefault }
  };
}

// 反序列化
function deserializeDebts(data: DebtSaveData): DebtCollection {
  return {
    debts: data.debts.map(d => ({ ...d })),
    defaultHistory: { ...data.defaultHistory },
    currentDefault: { ...data.currentDefault }
  };
}
```

---

## 9. UI 集成建议

### 9.1 债务面板

```typescript
interface DebtPanelData {
  // 债务总览
  summary: {
    totalDebt: number;              // 总剩余债务
    currentPaymentPerTurn: number;  // 每回合应还款额
    overdueCount: number;           // 逾期债务数量
    defaultCount: number;           // 历史违约次数
  };
  
  // 债务列表
  debtList: {
    id: string;
    lenderName: string;
    remainingAmount: number;        // 剩余应还
    repaymentPerTurn: number;       // 每期还款
    remainingTurns: number;         // 剩余期数
    isOverdue: boolean;
    allowEarlyRepayment: boolean;   // 是否可提前还款
    earlyPayAmount?: number;        // 提前还款金额
  }[];
  
  // 违约警告
  defaultWarning?: {
    currentCount: number;
    consecutiveMissed: number;      // 当前连续未支付次数
    nextConsequence: string;        // 下次违约后果描述
  };
}
```

### 9.2 UI 显示示例

```
┌─────────────────────────────────────────┐
│ 💰 债务面板                             │
├─────────────────────────────────────────┤
│ 总欠款: $3,450                          │
│ 每期还款: $650                          │
├─────────────────────────────────────────┤
│ 债务明细:                               │
│ • 张哥: $2,000 (每期$400，剩余5期) ⚠️   │
│   └─ 可提前还款: $1,200 (违约金$60)     │
│ • 速贷宝: $1,450 (每期$250，剩余6期)    │
│   └─ 不支持提前还款                     │
├─────────────────────────────────────────┤
│ ⚠️ 违约警告                             │
│ 连续1回合未支付，再1回合将触发违约！    │
│ 下次违约后果：警告+殴打+信息泄露        │
└─────────────────────────────────────────┘
```

---

## 10. 相关文档

- [角色系统架构](./CharacterSystemArchitecture.md) - 角色属性与资源
- [事件系统架构](./EventSystemArchitecture.md) - 事件触发与执行
- [场景系统架构](./SceneSystemArchitecture.md) - 场景切换机制
- [物品系统架构](./ItemSystemArchitecture.md) - 道具没收逻辑

---

> **维护提示**：本文档随债务系统实现更新。如有调整违约机制或场景切换规则，请同步更新本文档。
