/**
 * 场景相关类型定义
 * 包含场景状态、环境Debuff、债务数据等
 */

/**
 * 场景ID
 */
export type SceneId = 'act1' | 'act2' | 'act3';

/**
 * 场景配置（用于初始化各场景）
 */
export interface SceneConfig {
  /** 场景货币类型 */
  currency: 'CNY' | 'USD';
  /** 启动物资配置 */
  starterKit: {
    /** 食物补给数量（统一消耗品） */
    foodSupply: number;
    /** 初始金钱（仅首次进入场景时使用） */
    initialMoney: number;
    /** 初始常驻道具ID列表 */
    permanents: string[];
  };
}

/**
 * 场景1：国内准备状态
 */
export interface Act1State {
  /** 灵光一闪触发标记（解锁旅游签证路径） */
  hasInsightTriggered: boolean;
  /** 【债务系统】场景1借贷状态 */
  hasTakenLoan: boolean;
  /** 借贷金额 */
  loanAmount: number;
}

/**
 * 场景2：跨境穿越状态
 */
export interface Act2State {
  /** 当前阶段标识 */
  currentPhase: 'rainforest' | 'border_town';
  /** 雨林进度（0-4步，第5步进入边境小镇） */
  progress: number;
  /** 物资储备 */
  supplyStatus: {
    /** 水量（天数） */
    water: number;
    /** 食物（天数） */
    food: number;
    /** 是否有遮蔽 */
    shelter: boolean;
  };
  /** 已选择的穿越方式（阶段2选择后记录，用于结局标记） */
  selectedCrossingMethod?: 'truck' | 'desert' | 'climb';
  /** 【债务系统】场景2紧急借贷状态 */
  hasTakenEmergencyLoan: boolean;
  /** 紧急借贷金额 */
  emergencyLoanAmount: number;
}

/**
 * 签证状态
 */
export interface VisaStatus {
  type: 'tourist' | 'student' | null;
  /** 剩余有效回合（-1表示已过期） */
  expiryTurns: number;
}

/**
 * 持续成本（学生签特有）
 */
export interface OngoingCost {
  /** 间隔回合 */
  interval: number;
  /** 金额 */
  amount: number;
  /** 剩余收费次数 */
  chargesRemaining: number;
}

/**
 * 生活成本分项
 */
export interface LivingExpenseItems {
  /** 食品成本 */
  food: number;
  /** 住宿成本 */
  lodging: number;
  /** 出行成本 */
  transport: number;
}

/**
 * 生活成本
 */
export interface LivingExpenses {
  /** 基础成本 */
  baseline: LivingExpenseItems;
  /** 当前成本（含通胀影响） */
  current: LivingExpenseItems & { total: number };
}

/**
 * 场景3：美国生存状态
 */
export interface Act3State {
  /** 签证相关（直飞路径进入场景3时设置） */
  visaStatus?: VisaStatus;
  /** 持续成本（学生签特有） */
  ongoingCost?: OngoingCost;
  /** 生活成本（道具驱动） */
  livingExpenses: LivingExpenses;
  /** 债务违约次数 */
  debtDefaultCount: number;
}

/**
 * 环境Debuff类型
 */
export type EnvironmentalDebuffType = 'pressure' | 'economic';

/**
 * 经济型Debuff子类型
 */
export type EconomicDebuffSubtype = 'usd_inflation';

/**
 * Pressure Debuff效果
 */
export interface PressureDebuffEffect {
  /** 突击检查概率增加（如0.15表示+15%） */
  raidChanceIncrease?: number;
  /** 打工难度增加（如10表示+10难度） */
  workDifficultyIncrease?: number;
  /** 每回合心理伤害（如2表示-2） */
  mentalDamagePerTurn?: number;
  /** 现金消耗倍率（1.0=无额外影响） */
  cashCostMultiplier?: number;
}

/**
 * 经济型Debuff效果
 */
export interface EconomicDebuffEffect {
  /** 食品成本倍率 */
  foodCostMultiplier: number;
  /** 住宿成本倍率 */
  lodgingCostMultiplier: number;
  /** 出行成本倍率 */
  transportCostMultiplier: number;
}

/**
 * 环境Debuff
 */
export interface EnvironmentalDebuff {
  /** Debuff唯一ID */
  id: string;
  /** Debuff显示名称 */
  name: string;
  /** Debuff类型 */
  type: EnvironmentalDebuffType;
  /** 强度等级 1-5（1=轻微，5=极端） */
  intensity: number;
  /** 持续回合数（-1表示永久） */
  duration: number;
  /** 来源描述 */
  source: string;
  /** 效果配置 */
  effects: PressureDebuffEffect | EconomicDebuffEffect;
  /** 经济型子类型（仅type='economic'时存在） */
  subtype?: EconomicDebuffSubtype;
}

/**
 * 债务数据
 */
export interface DebtData {
  /** 债务ID */
  id: string;
  /** 本金 */
  principal: number;
  /** 利率（如0.3表示30%） */
  interestRate: number;
  /** 总期数 */
  totalTurns: number;
  /** 已还期数 */
  paidTurns: number;
  /** 每期还款金额（含本金+利息） */
  paymentPerTurn: number;
  /** 债权人名称 */
  lenderName?: string;
  /** 债务来源场景 */
  sourceScene: SceneId;
}

/**
 * 分项基础成本（食品/住宿/出行）
 */
export interface BaselineCosts {
  /** 食品成本 */
  food: number;
  /** 住宿成本 */
  lodging: number;
  /** 出行成本 */
  transport: number;
  /** 总成本 */
  total: number;
}

/**
 * 累积的 Pressure 效果
 */
export interface PressureEffect {
  /** 突击检查概率增加（如0.15表示+15%） */
  raidChanceIncrease: number;
  /** 打工难度增加（如10表示+10难度） */
  workDifficultyIncrease: number;
  /** 每回合心理伤害 */
  mentalDamagePerTurn: number;
  /** 现金消耗倍率（1.0=无额外影响） */
  cashCostMultiplier: number;
}

/**
 * 跨场景数据（场景切换时临时保存）
 */
export interface CrossSceneData {
  /** 跨场景保留的书籍池（全局唯一） */
  bookPool: string[];
  /** 【新增】跨场景携带的金钱（场景切换时继承） */
  carriedMoney: {
    /** 场景1→2时携带的人民币 */
    cny: number;
    /** 场景2→3时携带的美元 */
    usd: number;
  };
  /** 场景2带入场景3的债务 */
  carriedDebt?: DebtData[];
}
