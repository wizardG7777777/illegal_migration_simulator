/**
 * SceneSystem.ts
 *
 * 场景系统 - 负责场景切换、生活成本计算、Debuff 管理
 *
 * 功能包括：
 * 1. 场景切换逻辑（单向流动：act1 → act2 → act3）
 * 2. 生活成本计算（仅场景3）
 * 3. Debuff 管理（添加、更新、效果应用）
 * 4. 跨场景数据处理（书籍池、金钱、债务继承）
 *
 * 所有方法均为纯函数，返回新的 GameState
 */

import type {
  GameState,
  SceneId,
  SceneConfig,
  Act1State,
  Act2State,
  Act3State,
  EnvironmentalDebuff,
  CrossSceneData,
  BaselineCosts,
  PressureEffect,
  DebtData,
} from '../../types';
import { deepClone } from '../../utils/pure';
import { dataLoader } from '../loader/DataLoader';
import { ItemSystem } from '../item/ItemSystem';
import { CharacterSystem } from '../character/CharacterSystem';

// ============================================
// 常量配置
// ============================================

/** 汇率：1 CNY = 0.14 USD（约7:1） */
const EXCHANGE_RATE = 0.14;

/** 场景配置 */
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
      initialMoney: 0,         // 金钱从场景1继承（汇率兑换）
      permanents: ['basic_compass']  // 基础指南针
    }
  },
  act3: {
    currency: 'USD',
    starterKit: {
      foodSupply: 0,           // 食物继承自场景2
      initialMoney: 0,         // 金钱继承自场景2
      permanents: []           // 无初始常驻道具
    }
  }
};

/** 基础生活成本（美元/月） */
const BASELINE_COSTS = {
  food: 400,      // 食品固定
  lodging: 0,     // 由 lodging 标签道具决定
  transport: 0    // 由 transport 标签道具决定
};

/** 住宿成本映射（根据道具 ID） */
const LODGING_COSTS: Record<string, number> = {
  'lodging_shelter': 0,      // 收容所（免费但有debuff）
  'lodging_shared': 600,     // 合租
  'lodging_apartment': 1200, // 公寓
  'lodging_house': 2500      // House
};

/** 出行成本映射 */
const TRANSPORT_COSTS: Record<string, number> = {
  'transport_bus': 100,      // 公交卡
  'transport_ebike': 50,     // 电动车
  'transport_car_used': 350, // 二手车
  'transport_tesla': 600     // 特斯拉
};

// ============================================
// SceneSystem 实现
// ============================================

export const SceneSystem = {
  // ========== 场景切换 ==========

  /**
   * 场景切换主入口
   * 完整的场景切换流程，包括验证、数据保存/恢复、初始化等
   *
   * @param state - 当前游戏状态
   * @param targetScene - 目标场景ID
   * @param method - 切换方式（如 'tourist', 'student', 'truck' 等）
   * @returns 新的游戏状态
   * @throws 切换不合法时抛出错误
   *
   * @example
   * ```typescript
   * // 从场景1切换到场景2
   * state = SceneSystem.transitionScene(state, 'act2');
   *
   * // 从场景2通过旅游签切换到场景3
   * state = SceneSystem.transitionScene(state, 'act3', 'tourist');
   * ```
   */
  transitionScene(
    state: GameState,
    targetScene: SceneId,
    method?: string
  ): GameState {
    const currentScene = state.scene.currentScene;

    // 1. 验证切换合法性
    if (!this.isValidTransition(currentScene, targetScene)) {
      throw new Error(
        `非法的场景切换: ${currentScene} → ${targetScene}. ` +
        `只允许单向流动: act1 → act2 → act3`
      );
    }

    // 2. 保存跨场景数据
    const crossSceneData = this.extractCrossSceneData(state);

    // 3. 处理债务（在清空道具前处理）
    let newState = this.handleDebtTransition(state, currentScene, targetScene);

    // 4. 清空常驻道具栏
    newState = ItemSystem.clearPermanentItems(newState);

    // 5. 切换场景 ID，重置 sceneTurn
    newState = deepClone(newState);
    newState.scene.currentScene = targetScene;
    newState.scene.sceneTurn = 0;

    // 6. 初始化新场景状态
    newState = this.initializeSceneState(newState, targetScene, method);

    // 7. 根据切换方式给予启动物资
    newState = this.giveStarterKitByTransitionType(
      newState,
      targetScene,
      currentScene,
      method
    );

    // 8. 恢复跨场景数据
    newState = this.restoreCrossSceneData(newState, crossSceneData);

    // 9. 触发场景进入事件（调用 EventSystem.triggerSceneEntryEvent）
    // TODO: 在 EventSystem 实现后取消注释
    // newState = EventSystem.triggerSceneEntryEvent(newState, targetScene);

    return newState;
  },

  /**
   * 验证场景切换是否合法
   * 只能单向流动：act1 → act2 → act3
   *
   * @param from - 源场景ID
   * @param to - 目标场景ID
   * @returns 是否合法
   */
  isValidTransition(from: SceneId, to: SceneId): boolean {
    const validTransitions: Record<SceneId, SceneId[]> = {
      act1: ['act2'],
      act2: ['act3'],
      act3: []  // 场景3无法离开
    };
    return validTransitions[from]?.includes(to) || false;
  },

  /**
   * 提取跨场景数据（场景切换前调用）
   * 保存：书籍池、金钱、场景2债务
   *
   * @param state - 当前游戏状态
   * @returns 跨场景数据
   */
  extractCrossSceneData(state: GameState): CrossSceneData {
    const act3State = state.scene.act3;
    const debts: DebtData[] = [];

    // 如果有场景3债务，提取出来
    if (act3State && act3State.debtDefaultCount > 0) {
      // 注意：这里简化处理，实际债务数据结构可能更复杂
      // 在完整实现中，债务应该作为独立数组存储在 state 中
    }

    return {
      bookPool: [...state.global.bookPool],
      carriedMoney: {
        cny: state.character.resources.money.cny,
        usd: state.character.resources.money.usd
      },
      carriedDebt: debts.length > 0 ? debts : undefined
    };
  },

  /**
   * 恢复跨场景数据（场景切换后调用）
   * 恢复：书籍池、金钱（自动汇率兑换）、场景2债务
   *
   * @param state - 当前游戏状态
   * @param data - 跨场景数据
   * @returns 新的游戏状态
   */
  restoreCrossSceneData(state: GameState, data: CrossSceneData): GameState {
    const newState = deepClone(state);

    // 恢复书籍池
    newState.global.bookPool = [...data.bookPool];

    // 恢复金钱（场景1→2时汇率兑换，场景2→3时直接继承）
    if (newState.scene.currentScene === 'act2' && data.carriedMoney.cny > 0) {
      // CNY → USD 转换
      const convertedUsd = Math.floor(data.carriedMoney.cny * EXCHANGE_RATE);
      newState.character.resources.money.usd = convertedUsd;
      newState.character.resources.money.cny = 0;
    } else {
      // 直接继承
      newState.character.resources.money = { ...data.carriedMoney };
    }

    // 恢复债务（场景3）
    if (newState.scene.currentScene === 'act3' && data.carriedDebt && data.carriedDebt.length > 0) {
      // 债务在 handleDebtTransition 中已处理，这里不需要额外操作
      // 债务违约次数在 act3State 中维护
    }

    return newState;
  },

  // ========== 生活成本（仅场景3） ==========

  /**
   * 计算月度生活成本
   * 仅在场景3有效，其他场景返回0
   *
   * 计算公式：(食品基础 + 住宿道具成本 + 出行道具成本) × 通胀率
   *
   * @param state - 当前游戏状态
   * @returns 月度生活成本（美元）
   *
   * @example
   * ```typescript
   * const cost = SceneSystem.calculateLivingCost(state);
   * // 返回例如 1100（合租$600 + 公交$100 + 食品$400）
   * ```
   */
  calculateLivingCost(state: GameState): number {
    if (state.scene.currentScene !== 'act3') {
      return 0;
    }

    const baseline = this.calculateBaselineCosts(state);
    const inflationRate = calculateInflationRate(state);

    return Math.floor(baseline.total * inflationRate);
  },

  /**
   * 计算分项基础成本（食品/住宿/出行）
   * - 食品：固定 $400
   * - 住宿：由 lodging 标签道具决定
   * - 出行：由 transport 标签道具决定
   *
   * @param state - 当前游戏状态
   * @returns 分项成本详情
   *
   * @example
   * ```typescript
   * const costs = SceneSystem.calculateBaselineCosts(state);
   * // 返回 { food: 400, lodging: 600, transport: 100, total: 1100 }
   * ```
   */
  calculateBaselineCosts(state: GameState): BaselineCosts {
    // 食品固定
    const food = BASELINE_COSTS.food;

    // 住宿：查找 lodging 标签的常驻道具
    let lodging = 0;
    const lodgingItem = state.inventory.permanents.find((p: { itemId: string; slot: number }) => {
      const item = dataLoader.getItem(p.itemId);
      return item?.tags?.includes('lodging');
    });
    if (lodgingItem) {
      lodging = LODGING_COSTS[lodgingItem.itemId] ?? 0;
    }

    // 出行：查找 transport 标签的常驻道具
    let transport = 100; // 默认公交成本
    const transportItem = state.inventory.permanents.find((p: { itemId: string; slot: number }) => {
      const item = dataLoader.getItem(p.itemId);
      return item?.tags?.includes('transport');
    });
    if (transportItem) {
      transport = TRANSPORT_COSTS[transportItem.itemId] ?? 100;
    }

    return {
      food,
      lodging,
      transport,
      total: food + lodging + transport
    };
  },

  /**
   * 应用生活成本扣除
   * 仅在场景3有效，扣除美元资金
   * 如果资金不足，进入匮乏状态
   *
   * @param state - 当前游戏状态
   * @returns 新的游戏状态
   */
  applyLivingExpenses(state: GameState): GameState {
    if (state.scene.currentScene !== 'act3') {
      return state;
    }

    const cost = this.calculateLivingCost(state);
    let newState = deepClone(state);

    // 扣除美元
    const currentUsd = newState.character.resources.money.usd;
    newState.character.resources.money.usd = Math.max(0, currentUsd - cost);

    // 更新场景3的生活成本记录
    if (newState.scene.act3) {
      const baseline = this.calculateBaselineCosts(newState);
      newState.scene.act3.livingExpenses = {
        baseline: {
          food: baseline.food,
          lodging: baseline.lodging,
          transport: baseline.transport
        },
        current: {
          food: Math.floor(baseline.food * calculateInflationRate(newState)),
          lodging: Math.floor(baseline.lodging * calculateInflationRate(newState)),
          transport: Math.floor(baseline.transport * calculateInflationRate(newState)),
          total: cost
        }
      };
    }

    // 如果资金不足，进入匮乏状态
    if (currentUsd < cost) {
      newState = CharacterSystem.setDestituteState(newState, true);
    }

    return newState;
  },

  // ========== Debuff 管理 ==========

  /**
   * 添加 Debuff
   * 如果已有同ID的debuff，则叠加或取最大值
   *
   * @param state - 当前游戏状态
   * @param debuff - Debuff配置
   * @returns 新的游戏状态
   *
   * @example
   * ```typescript
   * const debuff: EnvironmentalDebuff = {
   *   id: 'debuff_policy_001',
   *   name: '移民搜捕升级',
   *   type: 'pressure',
   *   intensity: 2,
   *   duration: 10,
   *   source: '特朗普政策公告',
   *   effects: { raidChanceIncrease: 0.15, mentalDamagePerTurn: 2 }
   * };
   * state = SceneSystem.addDebuff(state, debuff);
   * ```
   */
  addDebuff(state: GameState, debuff: EnvironmentalDebuff): GameState {
    const newState = deepClone(state);

    // 检查是否已有同ID的debuff
    const existingIndex = newState.scene.activeDebuffs.findIndex(d => d.id === debuff.id);

    if (existingIndex >= 0) {
      // 已存在，叠加或取最大值
      const existing = newState.scene.activeDebuffs[existingIndex];
      existing.intensity = Math.max(existing.intensity, debuff.intensity);
      existing.duration = Math.max(existing.duration, debuff.duration);
    } else {
      // 新增debuff
      newState.scene.activeDebuffs.push({ ...debuff });
    }

    return newState;
  },

  /**
   * 更新 Debuff（回合结束调用）
   * 持续时间-1，移除过期的（duration <= 0 且不是永久debuff）
   * duration = -1 表示永久，不会过期
   *
   * @param state - 当前游戏状态
   * @returns 新的游戏状态
   */
  updateDebuffs(state: GameState): GameState {
    const newState = deepClone(state);

    // 持续时间-1，过滤掉过期的（duration <= 0 且不是永久）
    newState.scene.activeDebuffs = newState.scene.activeDebuffs
      .map(d => ({ ...d, duration: d.duration > 0 ? d.duration - 1 : d.duration }))
      .filter(d => d.duration > 0 || d.duration === -1);  // -1表示永久

    return newState;
  },

  /**
   * 应用 Debuff 效果（回合开始调用）
   * 根据debuff类型应用不同效果：
   * - pressure: 每回合扣心理
   * - economic: 在 calculateLivingCost 中处理
   * - weather: 扣健康
   *
   * @param state - 当前游戏状态
   * @returns 新的游戏状态
   */
  applyDebuffEffects(state: GameState): GameState {
    const newState = deepClone(state);

    for (const debuff of newState.scene.activeDebuffs) {
      if (debuff.type === 'pressure') {
        // 压力型debuff：每回合扣心理
        const mentalDamage = (debuff.effects as { mentalDamagePerTurn?: number }).mentalDamagePerTurn || 0;
        if (mentalDamage > 0) {
          newState.character.resources.mental.current = Math.max(
            0,
            newState.character.resources.mental.current - mentalDamage
          );
        }
      } else if (debuff.type === 'economic') {
        // 经济型debuff：在 calculateLivingCost 中处理，这里不做任何事
      } else if (debuff.type === 'weather') {
        // 天气型debuff：扣健康
        const healthDamage = (debuff.effects as { healthDamagePerTurn?: number }).healthDamagePerTurn || 0;
        if (healthDamage > 0) {
          newState.character.resources.health.current = Math.max(
            0,
            newState.character.resources.health.current - healthDamage
          );
        }
      }
    }

    return newState;
  },

  /**
   * 计算累积的 Pressure 效果
   * 汇总所有 pressure 类型debuff的效果
   *
   * @param state - 当前游戏状态
   * @returns 累积的pressure效果
   *
   * @example
   * ```typescript
   * const effects = SceneSystem.calculatePressureEffects(state);
   * // 返回 {
   * //   raidChanceIncrease: 0.35,      // 多个debuff累加
   * //   workDifficultyIncrease: 25,    // 多个debuff累加
   * //   mentalDamagePerTurn: 5,        // 多个debuff累加
   * //   cashCostMultiplier: 1.2        // 多个debuff相乘
   * // }
   * ```
   */
  calculatePressureEffects(state: GameState): PressureEffect {
    const pressureDebuffs = state.scene.activeDebuffs.filter(d => d.type === 'pressure');

    return {
      raidChanceIncrease: pressureDebuffs.reduce(
        (sum, d) => sum + ((d.effects as { raidChanceIncrease?: number }).raidChanceIncrease || 0),
        0
      ),
      workDifficultyIncrease: pressureDebuffs.reduce(
        (sum, d) => sum + ((d.effects as { workDifficultyIncrease?: number }).workDifficultyIncrease || 0),
        0
      ),
      mentalDamagePerTurn: pressureDebuffs.reduce(
        (sum, d) => sum + ((d.effects as { mentalDamagePerTurn?: number }).mentalDamagePerTurn || 0),
        0
      ),
      cashCostMultiplier: pressureDebuffs.reduce(
        (product, d) => product * ((d.effects as { cashCostMultiplier?: number }).cashCostMultiplier || 1),
        1
      )
    };
  },

  // ========== 内部辅助方法 ==========

  /**
   * 初始化新场景状态
   * 根据场景ID初始化对应的场景特定状态
   *
   * @param state - 当前游戏状态
   * @param sceneId - 场景ID
   * @param method - 切换方式
   * @returns 新的游戏状态
   */
  initializeSceneState(
    state: GameState,
    sceneId: SceneId,
    method?: string
  ): GameState {
    const newState = deepClone(state);

    switch (sceneId) {
      case 'act1':
        newState.scene.act1 = createInitialAct1State();
        newState.scene.act2 = null;
        newState.scene.act3 = null;
        break;

      case 'act2':
        newState.scene.act1 = null;
        newState.scene.act2 = createInitialAct2State();
        newState.scene.act3 = null;
        break;

      case 'act3':
        newState.scene.act1 = null;
        newState.scene.act2 = null;
        newState.scene.act3 = createInitialAct3State(method);
        break;
    }

    return newState;
  },

  /**
   * 处理债务跨场景逻辑
   * - act1→act2：债务清零（无法追讨）
   * - act2→act3：债务保留（带入美国，记录违约次数）
   *
   * @param state - 当前游戏状态
   * @param from - 源场景ID
   * @param to - 目标场景ID
   * @returns 新的游戏状态
   */
  handleDebtTransition(
    state: GameState,
    _from: SceneId,
    to: SceneId
  ): GameState {
    const newState = deepClone(state);

    if (_from === 'act1' && to === 'act2') {
      // 场景1债务清零（无法追讨）
      if (newState.scene.act1) {
        newState.scene.act1.hasTakenLoan = false;
        newState.scene.act1.loanAmount = 0;
      }
    } else if (_from === 'act2' && to === 'act3') {
      // 场景2债务带入场景3（记录违约次数）
      const act2State = newState.scene.act2;
      if (act2State && act2State.hasTakenEmergencyLoan) {
        // 初始化场景3状态，设置债务违约次数
        // 注意：这里简化处理，实际应根据债务还款情况计算
      }
    }

    return newState;
  },

  /**
   * 根据切换方式给予启动物资
   * 不同路径进入场景3有不同的初始道具
   *
   * @param state - 当前游戏状态
   * @param to - 目标场景ID
   * @param from - 源场景ID
   * @param transitionType - 切换类型
   * @returns 新的游戏状态
   */
  giveStarterKitByTransitionType(
    state: GameState,
    to: SceneId,
    from: SceneId,
    transitionType?: string
  ): GameState {
    let newState = deepClone(state);

    if (to === 'act2') {
      // 场景2：给予食物补给和基础道具
      newState = ItemSystem.addItem(newState, 'consumable_food_supply', 5);
      newState = ItemSystem.addPermanentItem(newState, 'basic_compass');
    } else if (to === 'act3') {
      // 场景3：根据切换类型给予特定道具
      switch (transitionType) {
        case 'tourist':
          // 旅游签路径：给予酒店预订
          newState = ItemSystem.addPermanentItem(newState, 'hotel_booking');
          newState = this.setVisaStatus(newState, 'tourist', 6);
          break;

        case 'student':
          // 学生签路径：给予宿舍钥匙
          newState = ItemSystem.addPermanentItem(newState, 'dorm_key');
          break;

        case 'truck':
        case 'desert':
        case 'climb':
        case 'miracle':
          // 走线路径：不给予额外道具，物资从场景2继承
          break;

        default:
          // 默认路径（可能是测试或特殊入口）
          break;
      }
    }

    return newState;
  },

  /**
   * 设置签证状态
   * 用于场景3的签证相关逻辑
   *
   * @param state - 当前游戏状态
   * @param type - 签证类型
   * @param expiryTurns - 有效回合数
   * @returns 新的游戏状态
   */
  setVisaStatus(
    state: GameState,
    type: 'tourist' | 'student' | null,
    expiryTurns: number
  ): GameState {
    const newState = deepClone(state);

    if (newState.scene.act3) {
      newState.scene.act3.visaStatus = {
        type,
        expiryTurns
      };
    }

    return newState;
  },

  /**
   * 检查是否有携带的金钱（用于判断是否给予初始资金）
   *
   * @param state - 当前游戏状态
   * @returns 是否有携带的金钱
   */
  hasCarriedMoney(state: GameState): boolean {
    return state.character.resources.money.cny > 0 ||
           state.character.resources.money.usd > 0;
  }
};

// ============================================
// 内部辅助函数
// ============================================

/**
 * 创建初始场景1状态
 */
function createInitialAct1State(): Act1State {
  return {
    hasInsightTriggered: false,
    hasTakenLoan: false,
    loanAmount: 0
  };
}

/**
 * 创建初始场景2状态
 */
function createInitialAct2State(): Act2State {
  return {
    currentPhase: 'rainforest',
    progress: 0,
    supplyStatus: {
      water: 5,
      food: 5,
      shelter: false
    },
    hasTakenEmergencyLoan: false,
    emergencyLoanAmount: 0
  };
}

/**
 * 创建初始场景3状态
 */
function createInitialAct3State(method?: string): Act3State {
  const state: Act3State = {
    livingExpenses: {
      baseline: {
        food: BASELINE_COSTS.food,
        lodging: 0,
        transport: 100
      },
      current: {
        food: BASELINE_COSTS.food,
        lodging: 0,
        transport: 100,
        total: BASELINE_COSTS.food + 100
      }
    },
    debtDefaultCount: 0
  };

  // 学生签路径：设置持续成本
  if (method === 'student') {
    state.ongoingCost = {
      interval: 12,  // 每12回合
      amount: 5000,  // $5000
      chargesRemaining: 10  // 剩余10次
    };
  }

  return state;
}

/**
 * 计算当前通胀率
 * 基于经济型debuff计算总通胀率
 *
 * @param state - 当前游戏状态
 * @returns 通胀率倍率（1.0 = 无通胀）
 */
function calculateInflationRate(state: GameState): number {
  // 获取所有经济型debuff
  const economicDebuffs = state.scene.activeDebuffs.filter(
    d => d.type === 'economic'
  );

  if (economicDebuffs.length === 0) {
    return 1.0;  // 无通胀
  }

  // 分别计算各项的通胀率，取最大值
  let foodRate = 1.0;
  let lodgingRate = 1.0;
  let transportRate = 1.0;

  for (const debuff of economicDebuffs) {
    const effects = debuff.effects as {
      foodCostMultiplier?: number;
      lodgingCostMultiplier?: number;
      transportCostMultiplier?: number;
    };

    if (effects.foodCostMultiplier) {
      foodRate = Math.max(foodRate, effects.foodCostMultiplier);
    }
    if (effects.lodgingCostMultiplier) {
      lodgingRate = Math.max(lodgingRate, effects.lodgingCostMultiplier);
    }
    if (effects.transportCostMultiplier) {
      transportRate = Math.max(transportRate, effects.transportCostMultiplier);
    }
  }

  // 计算加权平均通胀率
  const baseline = calculateBaselineCostsForInflation(state);
  const totalBase = baseline.total;

  if (totalBase === 0) {
    return 1.0;
  }

  const weightedRate =
    (baseline.food * foodRate +
     baseline.lodging * lodgingRate +
     baseline.transport * transportRate) / totalBase;

  return weightedRate;
}

// ============================================
// 类型导出
// ============================================

// 辅助函数：计算用于通胀计算的基础成本
function calculateBaselineCostsForInflation(state: GameState): BaselineCosts {
  return SceneSystem.calculateBaselineCosts(state);
}

export type { BaselineCosts, PressureEffect, CrossSceneData };

// 默认导出
export default SceneSystem;
