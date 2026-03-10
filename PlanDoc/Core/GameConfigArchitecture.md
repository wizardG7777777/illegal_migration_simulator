# 游戏配置中心架构设计

## 1. 概述

本文档定义《去美国》游戏的统一配置中心架构，实现**数据驱动**的设计原则，将所有可调数值集中管理，便于开发测试和后期平衡性调整。

**核心设计目标**：
- **单一数据源**：所有平衡性数值集中在一个配置中心
- **热重载支持**：开发模式下修改配置无需重启
- **类型安全**：TypeScript 类型约束，避免配置错误
- **环境隔离**：开发/测试/生产环境使用不同配置
- **版本管理**：配置变更可追溯，支持A/B测试

---

## 2. 配置中心结构

### 2.1 目录结构

```
src/config/
├── index.ts                    # 配置中心统一出口
├── gameConfig.ts               # 主配置对象（只读导出）
├── types.ts                    # 配置类型定义
├── loaders/
│   ├── staticLoader.ts         # 静态配置加载（默认）
│   └── remoteLoader.ts         # 远程配置加载（预留）
├── sections/                   # 按系统分层的配置
│   ├── characterConfig.ts      # 角色系统配置
│   ├── eventConfig.ts          # 事件系统配置
│   ├── itemConfig.ts           # 物品系统配置
│   ├── sceneConfig.ts          # 场景系统配置
│   ├── debtConfig.ts           # 债务系统配置
│   └── economyConfig.ts        # 经济系统配置（通胀、生活成本）
└── overrides/                  # 环境特定覆盖（可选）
    ├── development.ts          # 开发环境覆盖
    ├── testing.ts              # 测试环境覆盖
    └── balanced/               # 平衡性测试配置
        ├── easyMode.ts
        ├── hardMode.ts
        └── extremeMode.ts
```

### 2.2 核心配置接口

```typescript
// src/config/types.ts

/**
 * 游戏完整配置接口
 * 所有平衡性数值的单一数据源
 */
export interface GameConfig {
  // 版本信息
  version: {
    major: number;
    minor: number;
    patch: number;
    configVersion: number;  // 配置格式版本，用于迁移
  };
  
  // 各系统配置
  character: CharacterConfig;
  event: EventConfig;
  item: ItemConfig;
  scene: SceneConfig;
  debt: DebtConfig;
  economy: EconomyConfig;
  
  // 全局开关
  features: FeatureFlags;
  
  // 调试选项
  debug: DebugConfig;
}

/**
 * 角色系统配置
 */
export interface CharacterConfig {
  // 属性限制
  attributes: {
    min: number;
    max: number;
    initialMin: number;
    initialMax: number;
    
    // 成长速率（用于测试快速升级）
    growthRate: number;  // 1.0 = 正常, 2.0 = 双倍速度
  };
  
  // 资源限制
  resources: {
    health: { min: number; max: number; base: number };
    mental: { min: number; max: number; base: number };
    actionPoints: { 
      min: number; 
      max: number; 
      base: number; 
      recovery: number;
    };
  };
  
  // 终结态配置
  terminalStates: {
    dying: {
      countdownFormula: string;  // "clamp(floor((physique + 6) / 7), 0, 3)"，确保在0-3范围内
      perTurnHealthLoss: number;
      perTurnMentalLoss: number;
      perTurnActionPointLoss: number;
    };
    breakdown: {
      countdownFormula: string;  // "clamp(3 - floor(intelligence / 10), 1, 3)"
                                 // 计算逻辑：智力0→3回合，智力10→2回合，智力20→1回合
      perTurnMentalLoss: number; // 每回合心理健康损失，建议值：3
    };
    destitution: {
      perTurnHealthLoss: number;
      perTurnMentalLoss: number;
    };
  };
}

/**
 * 事件系统配置
 */
export interface EventConfig {
  // 随机事件基础权重
  baseRandomWeight: number;
  
  // 冷却时间配置
  cooldowns: {
    default: number;
    policyEvent: number;      // 政策压力事件冷却
    debtWarning: number;      // 债务警告冷却
  };
  
  // 场景特定配置
  act2: {
    // 雨林阶段强制负面事件权重
    forcedEventWeights: {
      bandit: number;
      snake: number;
      storm: number;
      landslide: number;
      disease: number;
      lost: number;
    };
  };
}

/**
 * 物品系统配置
 */
export interface ItemConfig {
  // 道具栏容量
  inventory: {
    consumableMaxSlots: number;
    consumableMaxStack: number;
    permanentMaxSlots: number;
  };
  
  // 物品效果倍率（测试用）
  effectMultiplier: number;  // 1.0 = 正常, 1.5 = 效果增强50%
}

/**
 * 场景系统配置
 */
export interface SceneConfig {
  // 各场景基础配置
  act1: {
    expectedTurns: number;
    maxTurns: number;
    currency: 'CNY';
  };
  act2: {
    expectedTurns: number;
    currency: 'USD';
    // 雨林阶段配置
    rainforest: {
      totalSteps: number;
      guideCostPerTurn: number;
    };
  };
  act3: {
    expectedTurns: number;
    currency: 'USD';
    // 生活成本基准（月度）- 道具驱动
    livingCostBaseline: {
      food: number;                    // 食品固定基础值: 400
      lodging: {                      // 住宿由 lodging 标签道具决定
        noItem: number;                // 无道具（睡大街）: 0
        shelter: number;               // 收容所床位: 0
        sharedRoom: number;            // 合租房间: 600
        apartment: number;             // 公寓: 1200
        house: number;                 // House: 2500
      };
      transport: {                    // 出行由 transport 标签道具决定
        noItem: number;                // 无道具（步行/默认）: 150
        busPass: number;               // 公交卡: 100
        ebike: number;                 // 电动车: 50
        usedCar: number;               // 二手车: 350
        tesla: number;                 // 特斯拉: 600
      };
    };
  };
  
  // 场景切换配置
  transition: {
    // 汇率（人民币 -> 美元）
    exchangeRate: number;  // 7.2 = 1 USD = 7.2 CNY
    
    // 各路径现金保留比例
    cashRetention: {
      act1ToAct2: number;   // 场景1->2保留比例
      act2ToAct3Guide: { min: number; max: number };     // 向导路径
      act2ToAct3Gap: { min: number; max: number };       // 沙漠缺口
      act2ToAct3Climb: { min: number; max: number };     // 攀爬
      act1ToAct3Tourist: { min: number; max: number };   // 旅游签
      act1ToAct3Student: { min: number; max: number };   // 学生签
    };
  };
}

/**
 * 债务系统配置
 */
export interface DebtConfig {
  // 全局开关
  enabled: boolean;
  
  // 违约阈值（连续几回合无法还款触发违约）
  defaultThreshold: number;
  
  // 各场景债务配置
  act1: {
    loanShark: {
      small: DebtTerms;   // 小额借贷条款
      large: DebtTerms;   // 大额借贷条款
    };
  };
  
  act2: {
    emergencyLoan: {
      small: DebtTerms;
      large: DebtTerms;
    };
  };
  
  act3: {
    undergroundLoan: {
      small: DebtTerms;
      large: DebtTerms;
    };
  };
  
  // 违约惩罚配置
  penalties: {
    firstDefault: DefaultPenalty;
    secondDefault: DefaultPenalty;
    repeatDefault: DefaultPenalty;
  };
}

/**
 * 单条债务条款
 */
export interface DebtTerms {
  principal: number;           // 本金
  interestRate: number;        // 利率（0.3 = 30%）
  duration: number;            // 还款期数
  allowEarlyRepayment: boolean;
  earlyRepaymentPenalty: number;  // 提前还款违约金比例
  isWeekly?: boolean;          // true=每周，false=每回合
}

/**
 * 违约惩罚配置
 */
export interface DefaultPenalty {
  healthLoss: number;
  mentalLoss: number;
  confiscateItems: boolean;    // 是否没收道具
  addDebuff?: string;          // 添加的Debuff ID
  narrativeEvent: string;      // 触发的叙事事件ID
}

/**
 * 经济系统配置
 */
export interface EconomyConfig {
  // 通胀配置（场景3）
  inflation: {
    enabled: boolean;
    baseRate: number;           // 基础通胀率
    maxRate: number;            // 最大通胀率
    // 通胀影响分项
    categories: {
      food: { baseRate: number; volatility: number };
      lodging: { baseRate: number; volatility: number };
      transport: { baseRate: number; volatility: number };
    };
  };
  
  // 收入倍率（测试用）
  incomeMultiplier: number;     // 1.0 = 正常, 2.0 = 收入翻倍
  
  // 生活成本倍率
  costMultiplier: number;       // 1.0 = 正常, 0.5 = 成本减半
}

/**
 * 功能开关
 */
export interface FeatureFlags {
  debtSystem: boolean;
  inflationSystem: boolean;
  policyPressureEvents: boolean;
  cloudSave: boolean;           // 预留
  analytics: boolean;           // 预留
}

/**
 * 调试配置
 */
export interface DebugConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  showDebugPanel: boolean;      // 是否显示调试面板
  godMode: boolean;             // 无敌模式（测试用）
  fastForward: boolean;         // 快速回合（跳过动画）
}
```

---

## 3. 配置实现示例

### 3.1 默认配置（生产环境）

```typescript
// src/config/sections/debtConfig.ts

import { DebtConfig } from '../types';

export const defaultDebtConfig: DebtConfig = {
  enabled: true,
  defaultThreshold: 2,
  
  act1: {
    loanShark: {
      small: {
        principal: 5000,
        interestRate: 0.30,      // 30%利率
        duration: 10,            // 10回合
        allowEarlyRepayment: true,
        earlyRepaymentPenalty: 0,
      },
      large: {
        principal: 10000,
        interestRate: 0.50,      // 50%利率
        duration: 10,
        allowEarlyRepayment: true,
        earlyRepaymentPenalty: 0,
      },
    },
  },
  
  act2: {
    emergencyLoan: {
      small: {
        principal: 200,
        interestRate: 0.50,      // 50%利率
        duration: 7,             // 7回合
        allowEarlyRepayment: true,
        earlyRepaymentPenalty: 0,
      },
      large: {
        principal: 500,
        interestRate: 1.00,      // 100%利率
        duration: 7,
        allowEarlyRepayment: true,
        earlyRepaymentPenalty: 0,
      },
    },
  },
  
  act3: {
    undergroundLoan: {
      small: {
        principal: 500,
        interestRate: 0.10,      // 10%利率
        duration: 10,
        isWeekly: true,
        allowEarlyRepayment: true,
        earlyRepaymentPenalty: 0,
      },
      large: {
        principal: 1000,
        interestRate: 0.30,      // 30%利率
        duration: 10,
        isWeekly: true,
        allowEarlyRepayment: true,
        earlyRepaymentPenalty: 0,
      },
    },
  },
  
  penalties: {
    firstDefault: {
      healthLoss: 20,
      mentalLoss: 15,
      confiscateItems: false,
      narrativeEvent: 'act3_debt_warning',
    },
    secondDefault: {
      healthLoss: 15,
      mentalLoss: 20,
      confiscateItems: true,
      addDebuff: 'homeless',
      narrativeEvent: 'act3_debt_seizure',
    },
    repeatDefault: {
      healthLoss: 15,
      mentalLoss: 20,
      confiscateItems: true,
      narrativeEvent: 'act3_debt_seizure',
    },
  },
};

// 计算每期还款额的辅助函数
export function calculateInstallment(
  principal: number,
  interestRate: number,
  duration: number
): number {
  const totalAmount = Math.floor(principal * (1 + interestRate));
  return Math.ceil(totalAmount / duration);
}

// 预计算的还款额（方便使用）
export const DebtCalculations = {
  act1: {
    smallInstallment: calculateInstallment(
      defaultDebtConfig.act1.loanShark.small.principal,
      defaultDebtConfig.act1.loanShark.small.interestRate,
      defaultDebtConfig.act1.loanShark.small.duration
    ),
    largeInstallment: calculateInstallment(
      defaultDebtConfig.act1.loanShark.large.principal,
      defaultDebtConfig.act1.loanShark.large.interestRate,
      defaultDebtConfig.act1.loanShark.large.duration
    ),
  },
  act2: {
    smallInstallment: calculateInstallment(
      defaultDebtConfig.act2.emergencyLoan.small.principal,
      defaultDebtConfig.act2.emergencyLoan.small.interestRate,
      defaultDebtConfig.act2.emergencyLoan.small.duration
    ),
    largeInstallment: calculateInstallment(
      defaultDebtConfig.act2.emergencyLoan.large.principal,
      defaultDebtConfig.act2.emergencyLoan.large.interestRate,
      defaultDebtConfig.act2.emergencyLoan.large.duration
    ),
  },
  act3: {
    smallInstallment: calculateInstallment(
      defaultDebtConfig.act3.undergroundLoan.small.principal,
      defaultDebtConfig.act3.undergroundLoan.small.interestRate,
      defaultDebtConfig.act3.undergroundLoan.small.duration
    ),
    largeInstallment: calculateInstallment(
      defaultDebtConfig.act3.undergroundLoan.large.principal,
      defaultDebtConfig.act3.undergroundLoan.large.interestRate,
      defaultDebtConfig.act3.undergroundLoan.large.duration
    ),
  },
};
```

### 3.1.2 场景配置

```typescript
// src/config/sections/sceneConfig.ts

import { SceneConfig } from '../types';

export const defaultSceneConfig: SceneConfig = {
  act1: {
    expectedTurns: 25,
    maxTurns: 50,
    currency: 'CNY',
  },
  act2: {
    expectedTurns: 10,
    currency: 'USD',
    rainforest: {
      totalSteps: 15,
      guideCostPerTurn: 50,  // 向导费用 $50/回合
    },
  },
  act3: {
    expectedTurns: 60,
    currency: 'USD',
    // 生活成本基准（月度）- 道具驱动
    // 对应 SceneSystemArchitecture.md 中的生活成本系统
    livingCostBaseline: {
      food: 400,              // 食品固定基础值
      lodging: {              // 住宿成本（由 lodging 标签道具决定）
        noItem: 0,            // 无道具（睡大街）
        shelter: 0,           // 收容所床位
        sharedRoom: 600,      // 合租房间
        apartment: 1200,      // 公寓
        house: 2500,          // House
      },
      transport: {            // 出行成本（由 transport 标签道具决定）
        noItem: 150,          // 无道具（步行/默认）
        busPass: 100,         // 公交卡
        ebike: 50,            // 电动车
        usedCar: 350,         // 二手车
        tesla: 600,           // 特斯拉
      },
    },
  },
  transition: {
    // 汇率（人民币 -> 美元）
    exchangeRate: 7.2,  // 1 USD = 7.2 CNY
    
    // 各路径现金保留比例
    cashRetention: {
      act1ToAct2: 0.0,           // 场景1->2：需换汇，无现金保留
      act2ToAct3Guide: { min: 0.8, max: 0.9 },     // 向导路径
      act2ToAct3Gap: { min: 0.3, max: 0.6 },       // 沙漠缺口
      act2ToAct3Climb: { min: 0.1, max: 0.3 },     // 攀爬
      act1ToAct3Tourist: { min: 0.9, max: 1.0 },   // 旅游签
      act1ToAct3Student: { min: 0.8, max: 0.95 },  // 学生签
    },
  },
};

/**
 * 计算场景3月度生活成本
 * 根据玩家持有的道具计算实际生活成本
 */
export function calculateMonthlyLivingCost(
  inventory: Inventory,
  inflationRates: { food: number; lodging: number; transport: number }
): number {
  const baseline = defaultSceneConfig.act3.livingCostBaseline;
  
  // 食品成本（固定，受通胀影响）
  const foodCost = baseline.food * inflationRates.food;
  
  // 住宿成本（由 lodging 标签道具决定）
  const lodgingItem = inventory.findPermanentByTag('lodging');
  const lodgingCost = lodgingItem 
    ? baseline.lodging[getLodgingTier(lodgingItem.id)] * inflationRates.lodging
    : baseline.lodging.noItem;
  
  // 出行成本（由 transport 标签道具决定）
  const transportItem = inventory.findPermanentByTag('transport');
  const transportCost = transportItem
    ? baseline.transport[getTransportTier(transportItem.id)] * inflationRates.transport
    : baseline.transport.noItem;
  
  return Math.floor(foodCost + lodgingCost + transportCost);
}

// 道具ID到住宿等级的映射
function getLodgingTier(itemId: string): keyof typeof defaultSceneConfig.act3.livingCostBaseline.lodging {
  const tierMap: Record<string, keyof typeof defaultSceneConfig.act3.livingCostBaseline.lodging> = {
    'perm_shelter_bed': 'shelter',
    'perm_shared_room': 'sharedRoom',
    'perm_apartment': 'apartment',
    'perm_house': 'house',
  };
  return tierMap[itemId] || 'noItem';
}

// 道具ID到出行等级的映射
function getTransportTier(itemId: string): keyof typeof defaultSceneConfig.act3.livingCostBaseline.transport {
  const tierMap: Record<string, keyof typeof defaultSceneConfig.act3.livingCostBaseline.transport> = {
    'perm_bus_pass': 'busPass',
    'perm_ebike': 'ebike',
    'perm_used_car': 'usedCar',
    'perm_tesla': 'tesla',
  };
  return tierMap[itemId] || 'noItem';
}
```

### 3.2 开发环境覆盖

```typescript
// src/config/overrides/development.ts

import { GameConfig } from '../types';
import { defaultGameConfig } from '../gameConfig';

/**
 * 开发环境配置覆盖
 * 用于本地开发和快速测试
 */
export const developmentOverride: Partial<GameConfig> = {
  character: {
    ...defaultGameConfig.character,
    attributes: {
      ...defaultGameConfig.character.attributes,
      growthRate: 3.0,  // 3倍成长速度，方便测试
    },
    resources: {
      ...defaultGameConfig.character.resources,
      actionPoints: {
        ...defaultGameConfig.character.resources.actionPoints,
        base: 10,       // 10点行动点
        recovery: 10,   // 每回合恢复10点
      },
    },
  },
  
  debt: {
    ...defaultGameConfig.debt,
    // 开发环境：所有债务利率设为0，方便测试
    act1: {
      loanShark: {
        small: { ...defaultGameConfig.debt.act1.loanShark.small, interestRate: 0 },
        large: { ...defaultGameConfig.debt.act1.loanShark.large, interestRate: 0 },
      },
    },
    act2: {
      emergencyLoan: {
        small: { ...defaultGameConfig.debt.act2.emergencyLoan.small, interestRate: 0 },
        large: { ...defaultGameConfig.debt.act2.emergencyLoan.large, interestRate: 0 },
      },
    },
    penalties: {
      ...defaultGameConfig.debt.penalties,
      // 开发环境：违约不扣健康值
      firstDefault: { ...defaultGameConfig.debt.penalties.firstDefault, healthLoss: 0 },
      secondDefault: { ...defaultGameConfig.debt.penalties.secondDefault, healthLoss: 0 },
    },
  },
  
  economy: {
    ...defaultGameConfig.economy,
    incomeMultiplier: 2.0,   // 收入翻倍
    costMultiplier: 0.5,     // 成本减半
  },
  
  debug: {
    enabled: true,
    logLevel: 'debug',
    showDebugPanel: true,
    godMode: false,          // 可手动开启无敌模式
    fastForward: true,
  },
};
```

### 3.3 主配置合并

```typescript
// src/config/gameConfig.ts

import { GameConfig } from './types';
import { defaultCharacterConfig } from './sections/characterConfig';
import { defaultEventConfig } from './sections/eventConfig';
import { defaultItemConfig } from './sections/itemConfig';
import { defaultSceneConfig } from './sections/sceneConfig';
import { defaultDebtConfig } from './sections/debtConfig';
import { defaultEconomyConfig } from './sections/economyConfig';

/**
 * 默认生产环境配置
 */
export const defaultGameConfig: GameConfig = {
  version: {
    major: 1,
    minor: 0,
    patch: 0,
    configVersion: 1,
  },
  
  character: defaultCharacterConfig,
  event: defaultEventConfig,
  item: defaultItemConfig,
  scene: defaultSceneConfig,
  debt: defaultDebtConfig,
  economy: defaultEconomyConfig,
  
  features: {
    debtSystem: true,
    inflationSystem: true,
    policyPressureEvents: true,
    cloudSave: false,
    analytics: false,
  },
  
  debug: {
    enabled: process.env.NODE_ENV === 'development',
    logLevel: 'info',
    showDebugPanel: false,
    godMode: false,
    fastForward: false,
  },
};

/**
 * 获取当前环境配置
 * 根据环境变量合并覆盖配置
 */
export function getGameConfig(): GameConfig {
  const env = process.env.REACT_APP_GAME_ENV || process.env.NODE_ENV || 'production';
  
  switch (env) {
    case 'development':
      return mergeConfig(defaultGameConfig, developmentOverride);
    case 'testing':
      return mergeConfig(defaultGameConfig, testingOverride);
    case 'balanced':
      // 平衡性测试模式，从URL参数读取
      const mode = new URLSearchParams(window.location.search).get('mode');
      return mergeConfig(defaultGameConfig, getBalancedOverride(mode));
    default:
      return defaultGameConfig;
  }
}

/**
 * 深度合并配置对象
 */
function mergeConfig(base: GameConfig, override: Partial<GameConfig>): GameConfig {
  return deepMerge(base, override) as GameConfig;
}

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}
```

---

## 4. 运行时配置修改

### 4.1 开发调试面板

```typescript
// src/components/debug/ConfigDebugPanel.tsx

import { useState, useCallback } from 'react';
import { gameConfig, updateConfig, resetConfig } from '../../config';

export function ConfigDebugPanel() {
  const [localConfig, setLocalConfig] = useState(gameConfig);
  
  // 修改债务利率
  const updateDebtRate = useCallback((
    scene: 'act1' | 'act2' | 'act3',
    size: 'small' | 'large',
    newRate: number
  ) => {
    const path = `debt.${scene}.${scene === 'act1' ? 'loanShark' : scene === 'act2' ? 'emergencyLoan' : 'undergroundLoan'}.${size}.interestRate`;
    
    updateConfig(path, newRate);
    setLocalConfig({ ...gameConfig });
    
    console.log(`[Config] Updated ${path} to ${newRate * 100}%`);
  }, []);
  
  // 一键测试配置
  const applyTestPreset = useCallback((preset: string) => {
    switch (preset) {
      case 'zeroInterest':
        // 所有债务利率设为0
        updateConfig('debt.act1.loanShark.small.interestRate', 0);
        updateConfig('debt.act1.loanShark.large.interestRate', 0);
        updateConfig('debt.act2.emergencyLoan.small.interestRate', 0);
        updateConfig('debt.act2.emergencyLoan.large.interestRate', 0);
        updateConfig('debt.act3.undergroundLoan.small.interestRate', 0);
        updateConfig('debt.act3.undergroundLoan.large.interestRate', 0);
        break;
        
      case 'highInterest':
        // 高利贷模式
        updateConfig('debt.act1.loanShark.small.interestRate', 1.00);
        updateConfig('debt.act1.loanShark.large.interestRate', 2.00);
        updateConfig('debt.act2.emergencyLoan.small.interestRate', 1.50);
        updateConfig('debt.act2.emergencyLoan.large.interestRate', 3.00);
        break;
        
      case 'easyMode':
        // 简单模式
        updateConfig('economy.incomeMultiplier', 2.0);
        updateConfig('economy.costMultiplier', 0.5);
        updateConfig('character.attributes.growthRate', 2.0);
        break;
    }
    
    setLocalConfig({ ...gameConfig });
  }, []);
  
  if (!gameConfig.debug.showDebugPanel) return null;
  
  return (
    <div className="config-debug-panel">
      <h3>配置调试面板</h3>
      
      <section>
        <h4>债务利率调整</h4>
        <div className="rate-control">
          <label>场景1小额利率:</label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={localConfig.debt.act1.loanShark.small.interestRate}
            onChange={(e) => updateDebtRate('act1', 'small', parseFloat(e.target.value))}
          />
          <span>{(localConfig.debt.act1.loanShark.small.interestRate * 100).toFixed(0)}%</span>
        </div>
        {/* 其他利率控件... */}
      </section>
      
      <section>
        <h4>快速预设</h4>
        <button onClick={() => applyTestPreset('zeroInterest')}>零利率</button>
        <button onClick={() => applyTestPreset('highInterest')}>高利贷</button>
        <button onClick={() => applyTestPreset('easyMode')}>简单模式</button>
        <button onClick={() => { resetConfig(); setLocalConfig({ ...gameConfig }); }}>
          重置默认
        </button>
      </section>
      
      <section>
        <h4>当前配置JSON</h4>
        <pre>{JSON.stringify(localConfig.debt, null, 2)}</pre>
      </section>
    </div>
  );
}
```

### 4.2 配置热重载

```typescript
// src/config/index.ts

import { GameConfig } from './types';
import { defaultGameConfig, getGameConfig } from './gameConfig';

// 当前运行时配置（可变）
let runtimeConfig: GameConfig = getGameConfig();

/**
 * 获取当前配置（只读）
 * 业务代码通过此函数读取配置
 */
export function getConfig(): Readonly<GameConfig> {
  return runtimeConfig;
}

/**
 * 更新配置（仅开发环境）
 * @param path 配置路径，如 'debt.act1.loanShark.small.interestRate'
 * @param value 新值
 */
export function updateConfig(path: string, value: any): void {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Config update only allowed in development mode');
    return;
  }
  
  const keys = path.split('.');
  let current: any = runtimeConfig;
  
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
  
  // 触发配置变更事件
  window.dispatchEvent(new CustomEvent('configChanged', { detail: { path, value } }));
}

/**
 * 重置配置到默认
 */
export function resetConfig(): void {
  runtimeConfig = getGameConfig();
  window.dispatchEvent(new CustomEvent('configReset'));
}

/**
 * 订阅配置变更（用于组件响应配置变化）
 */
export function subscribeConfigChange(
  callback: (e: CustomEvent) => void
): () => void {
  const handler = (e: Event) => callback(e as CustomEvent);
  window.addEventListener('configChanged', handler);
  return () => window.removeEventListener('configChanged', handler);
}

// 导出类型和默认配置
export * from './types';
export { defaultGameConfig };

// 导出各系统配置（方便直接导入）
export { defaultDebtConfig, DebtCalculations, calculateInstallment } from './sections/debtConfig';
```

---

## 5. 使用示例

### 5.1 在系统中使用配置

```typescript
// 业务代码中使用配置示例

import { getConfig } from '../config';

class DebtSystem {
  private config = getConfig().debt;
  
  createDebt(type: 'act1_small' | 'act1_large'): DebtRecord {
    const terms = type === 'act1_small' 
      ? this.config.act1.loanShark.small
      : this.config.act1.loanShark.large;
    
    return {
      principal: terms.principal,
      interestRate: terms.interestRate,  // 从配置读取
      repaymentPerTurn: this.calculateInstallment(terms),
      // ...
    };
  }
  
  private calculateInstallment(terms: DebtTerms): number {
    const total = Math.floor(terms.principal * (1 + terms.interestRate));
    return Math.ceil(total / terms.duration);
  }
  
  checkDefault(debt: DebtRecord, missedTurns: number): boolean {
    // 使用配置的违约阈值
    return missedTurns >= this.config.defaultThreshold;
  }
}
```

### 5.2 测试中使用不同配置

```typescript
// 测试代码中使用特定配置

import { getConfig, updateConfig, resetConfig } from '../config';

describe('DebtSystem', () => {
  afterEach(() => {
    resetConfig();  // 每个测试后重置配置
  });
  
  it('should handle zero interest', () => {
    // 临时设置零利率
    updateConfig('debt.act1.loanShark.small.interestRate', 0);
    
    const debt = debtSystem.createDebt('act1_small');
    expect(debt.repaymentPerTurn).toBe(500);  // 5000/10=500，无利息
  });
  
  it('should handle high interest', () => {
    updateConfig('debt.act1.loanShark.small.interestRate', 1.0);  // 100%利率
    
    const debt = debtSystem.createDebt('act1_small');
    expect(debt.repaymentPerTurn).toBe(1000);  // 5000*2/10=1000
  });
  
  it('should trigger default after threshold', () => {
    updateConfig('debt.defaultThreshold', 3);  // 3回合才违约
    
    expect(debtSystem.checkDefault(debt, 2)).toBe(false);
    expect(debtSystem.checkDefault(debt, 3)).toBe(true);
  });
});
```

---

## 6. 与现有文档的关联

| 本文档章节 | 对应的现有文档 | 说明 |
|-----------|--------------|------|
| `CharacterConfig` | `CharacterSystemArchitecture.md` | 替代原 `ATTRIBUTE_LIMITS` 等常量 |
| `DebtConfig` | `DebtSystemArchitecture.md` | 本文档中已详细定义 |
| `SceneConfig` | `SceneSystemArchitecture.md` | 替代原场景切换硬编码数值 |
| `EconomyConfig` | `SceneSystemArchitecture.md` | 生活成本、通胀配置 |
| `EventConfig` | `EventSystemArchitecture.md` | 事件权重、冷却配置 |
| `ItemConfig` | `ItemSystemArchitecture.md` | 道具栏容量、效果倍率 |

**注意**：现有文档中的硬编码数值应逐步迁移到配置中心，但接口定义和数据结构保持不变。

---

## 7. 设计检查清单

- [x] 所有债务利率可配置
- [x] 所有债务本金可配置
- [x] 所有债务期数可配置
- [x] 违约阈值可配置
- [x] 违约惩罚数值可配置
- [x] 支持开发环境覆盖
- [x] 支持运行时修改（仅开发模式）
- [x] 支持一键预设（零利率、高利贷、简单模式等）
- [x] TypeScript 类型安全
- [x] 配置变更可订阅响应

---

## 8. 快速调整指南

| 调整需求 | 修改位置 | 示例 |
|---------|---------|------|
| 调整场景1小额利率 | `debtConfig.ts` 第14行 | `interestRate: 0.30` → `0.50` |
| 调整还款期数 | `debtConfig.ts` 第16行 | `duration: 10` → `15` |
| 调整违约阈值 | `debtConfig.ts` 第7行 | `defaultThreshold: 2` → `3` |
| 开发环境零利率 | `development.ts` 第20行 | 已设置为0 |
| 临时测试极端利率 | 调试面板 | 拖动滑块或点击"高利贷"预设 |
| 收入倍率调整 | `development.ts` 第35行 | `incomeMultiplier: 2.0` |
��设（零利率、高利贷、简单模式等）
- [x] TypeScript 类型安全
- [x] 配置变更可订阅响应

---

## 8. 快速调整指南

| 调整需求 | 修改位置 | 示例 |
|---------|---------|------|
| 调整场景1小额利率 | `debtConfig.ts` 第14行 | `interestRate: 0.30` → `0.50` |
| 调整还款期数 | `debtConfig.ts` 第16行 | `duration: 10` → `15` |
| 调整违约阈值 | `debtConfig.ts` 第7行 | `defaultThreshold: 2` → `3` |
| 开发环境零利率 | `development.ts` 第20行 | 已设置为0 |
| 临时测试极端利率 | 调试面板 | 拖动滑块或点击"高利贷"预设 |
| 收入倍率调整 | `development.ts` 第35行 | `incomeMultiplier: 2.0` |
