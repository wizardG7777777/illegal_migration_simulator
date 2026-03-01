/**
 * 角色系统 (Character System)
 * 负责角色属性、资源管理和终结态计算
 * 所有方法均为纯函数，确保不可变性
 */

import { GameState, CharacterData, Attributes, TerminalState } from '../../types';
import { deepClone, clamp } from '../../utils/pure';
import { generateUUID } from '../../utils/id';

// ============================================
// 初始配置常量
// ============================================

/** 初始六维属性配置 */
const INITIAL_ATTRIBUTES: Attributes = {
  physique: 10,      // 体魄 10（普通人）
  intelligence: 10,  // 智力 10
  english: 5,        // 英语 5（较差）
  social: 8,         // 社交 8
  riskAwareness: 8,  // 风险意识 8
  survival: 6,       // 生存能力 6
};

/** 属性值范围 */
const ATTRIBUTE_MIN = 0;
const ATTRIBUTE_MAX = 20;

/** 资源值范围 */
const RESOURCE_MIN = 0;
const RESOURCE_HEALTH_MAX = 100;
const RESOURCE_MENTAL_MAX = 100;
const ACTION_POINTS_MIN = 0;
const ACTION_POINTS_MAX = 5;

/** 初始资源配置 */
const INITIAL_RESOURCES = {
  health: { current: 100, max: RESOURCE_HEALTH_MAX },
  mental: { current: 100, max: RESOURCE_MENTAL_MAX },
  money: { cny: 2000, usd: 0 },  // 场景1初始2000人民币
  actionPoints: { current: 5, max: ACTION_POINTS_MAX, min: ACTION_POINTS_MIN },
};

// ============================================
// 终结态倒计时计算算法
// ============================================

/**
 * 计算濒死倒计时
 * 体魄决定濒死窗口
 * - 体魄0-1: 0回合(立即死亡)
 * - 体魄2-8: 1回合
 * - 体魄9-15: 2回合
 * - 体魄16-20: 3回合
 * 公式：clamp(floor((physique + 6) / 7), 0, 3)
 */
function calculateDyingCountdown(physique: number): number {
  const clampedPhysique = clamp(physique, ATTRIBUTE_MIN, ATTRIBUTE_MAX);
  return clamp(Math.floor((clampedPhysique + 6) / 7), 0, 3);
}

/**
 * 计算崩溃倒计时
 * 智力决定崩溃窗口
 * - 智力0-9: 3回合
 * - 智力10-19: 2回合
 * - 智力20: 1回合
 * 公式：clamp(3 - floor(intelligence / 10), 1, 3)
 */
function calculateBreakdownCountdown(intelligence: number): number {
  const clampedIntelligence = clamp(intelligence, ATTRIBUTE_MIN, ATTRIBUTE_MAX);
  return clamp(3 - Math.floor(clampedIntelligence / 10), 1, 3);
}

// ============================================
// CharacterSystem 实现
// ============================================

export const CharacterSystem = {
  /**
   * 创建新角色
   * @param name - 角色名称
   * @returns 新角色的完整数据
   */
  createNewCharacter(name: string): CharacterData {
    return {
      id: generateUUID(),
      name: name,
      attributes: { ...INITIAL_ATTRIBUTES },
      resources: deepClone(INITIAL_RESOURCES),
      status: {
        terminalState: null,
        terminalCountdown: 0,
        flags: {},
      },
    };
  },

  /**
   * 修改属性值
   * @param state - 当前游戏状态
   * @param attr - 要修改的属性名
   * @param delta - 变化量（可为负）
   * @returns 新的游戏状态
   */
  modifyAttribute(
    state: GameState,
    attr: keyof Attributes,
    delta: number
  ): GameState {
    const newState = deepClone(state);
    const currentValue = newState.character.attributes[attr];
    const newValue = clamp(currentValue + delta, ATTRIBUTE_MIN, ATTRIBUTE_MAX);
    newState.character.attributes[attr] = newValue;
    return newState;
  },

  /**
   * 修改资源值（健康/心理/行动点）
   * @param state - 当前游戏状态
   * @param resource - 要修改的资源类型
   * @param delta - 变化量（可为负）
   * @returns 新的游戏状态
   */
  modifyResource(
    state: GameState,
    resource: 'health' | 'mental' | 'actionPoints',
    delta: number
  ): GameState {
    const newState = deepClone(state);
    const resourceData = newState.character.resources[resource];

    if (resource === 'actionPoints') {
      // 行动点有 min 和 max 限制
      resourceData.current = clamp(
        resourceData.current + delta,
        resourceData.min,
        resourceData.max
      );
    } else {
      // 健康和心理健康度只有 0-max 限制
      resourceData.current = clamp(
        resourceData.current + delta,
        RESOURCE_MIN,
        resourceData.max
      );
    }

    return newState;
  },

  /**
   * 修改金钱
   * @param state - 当前游戏状态
   * @param currency - 货币类型：'CNY' 人民币 或 'USD' 美元
   * @param delta - 变化量（可为负）
   * @returns 新的游戏状态
   */
  modifyMoney(
    state: GameState,
    currency: 'CNY' | 'USD',
    delta: number
  ): GameState {
    const newState = deepClone(state);
    const money = newState.character.resources.money;

    if (currency === 'CNY') {
      money.cny = Math.max(RESOURCE_MIN, money.cny + delta);
    } else {
      money.usd = Math.max(RESOURCE_MIN, money.usd + delta);
    }

    return newState;
  },

  /**
   * 恢复行动点（回合开始调用）
   * 将行动点恢复到最大值
   * @param state - 当前游戏状态
   * @returns 新的游戏状态
   */
  recoverActionPoints(state: GameState): GameState {
    const newState = deepClone(state);
    newState.character.resources.actionPoints.current = 
      newState.character.resources.actionPoints.max;
    return newState;
  },

  /**
   * 检查并进入终结态
   * 如果已经在终结态，不再重复检查
   * - 健康归零 → 进入濒死状态，设置倒计时
   * - 心理归零 → 进入崩溃状态，设置倒计时
   * @param state - 当前游戏状态
   * @returns 新的游戏状态
   */
  checkTerminalState(state: GameState): GameState {
    const newState = deepClone(state);
    const character = newState.character;
    const status = character.status;

    // 如果已经在终结态，不再重复检查
    if (status.terminalState !== null) {
      return newState;
    }

    const health = character.resources.health.current;
    const mental = character.resources.mental.current;

    // 健康归零 → 濒死状态
    if (health <= 0) {
      status.terminalState = 'DYING';
      status.terminalCountdown = calculateDyingCountdown(character.attributes.physique);
      return newState;
    }

    // 心理归零 → 崩溃状态
    if (mental <= 0) {
      status.terminalState = 'BREAKDOWN';
      status.terminalCountdown = calculateBreakdownCountdown(character.attributes.intelligence);
      return newState;
    }

    return newState;
  },

  /**
   * 计算终结态倒计时
   * 濒死由体魄决定，崩溃由智力决定
   * @param attributes - 角色属性
   * @param type - 终结态类型：'DYING' 濒死 或 'BREAKDOWN' 崩溃
   * @returns 倒计时回合数
   */
  calculateTerminalCountdown(
    attributes: Attributes,
    type: 'DYING' | 'BREAKDOWN'
  ): number {
    if (type === 'DYING') {
      return calculateDyingCountdown(attributes.physique);
    } else {
      return calculateBreakdownCountdown(attributes.intelligence);
    }
  },

  /**
   * 设置终结态（用于测试或特殊事件）
   * @param state - 当前游戏状态
   * @param terminalState - 终结态类型，null表示清除
   * @param countdown - 倒计时回合数（可选，默认自动计算）
   * @returns 新的游戏状态
   * @internal 主要用于测试
   */
  setTerminalState(
    state: GameState,
    terminalState: TerminalState | null,
    countdown?: number
  ): GameState {
    const newState = deepClone(state);
    const status = newState.character.status;

    status.terminalState = terminalState;

    if (terminalState === null) {
      status.terminalCountdown = 0;
    } else if (countdown !== undefined) {
      status.terminalCountdown = Math.max(0, countdown);
    } else {
      // 自动计算倒计时
      if (terminalState === 'DYING') {
        status.terminalCountdown = calculateDyingCountdown(
          newState.character.attributes.physique
        );
      } else if (terminalState === 'BREAKDOWN') {
        status.terminalCountdown = calculateBreakdownCountdown(
          newState.character.attributes.intelligence
        );
      } else {
        // DESTITUTE 没有倒计时
        status.terminalCountdown = 0;
      }
    }

    return newState;
  },

  /**
   * 递减终结态倒计时
   * 每回合结束时调用，如果倒计时归零则触发游戏结束
   * @param state - 当前游戏状态
   * @returns 新的游戏状态
   */
  decrementTerminalCountdown(state: GameState): GameState {
    const newState = deepClone(state);
    const status = newState.character.status;

    // 如果没有终结态，直接返回
    if (status.terminalState === null) {
      return newState;
    }

    // 濒死和崩溃状态才有倒计时
    if (status.terminalState === 'DYING' || status.terminalState === 'BREAKDOWN') {
      status.terminalCountdown = Math.max(0, status.terminalCountdown - 1);
    }

    return newState;
  },

  /**
   * 检查是否游戏结束（倒计时归零）
   * @param state - 当前游戏状态
   * @returns 是否游戏结束
   */
  isGameOver(state: GameState): boolean {
    const status = state.character.status;

    // 只有在终结态且倒计时归零时才算游戏结束
    if (status.terminalState === null) {
      return false;
    }

    // 濒死或崩溃状态倒计时归零则游戏结束
    if (
      (status.terminalState === 'DYING' || status.terminalState === 'BREAKDOWN') &&
      status.terminalCountdown <= 0
    ) {
      return true;
    }

    return false;
  },

  /**
   * 获取角色当前属性（只读）
   * @param state - 当前游戏状态
   * @returns 当前属性值
   */
  getAttributes(state: GameState): Readonly<Attributes> {
    return state.character.attributes;
  },

  /**
   * 获取角色当前资源（只读）
   * @param state - 当前游戏状态
   * @returns 当前资源值
   */
  getResources(state: GameState): Readonly<GameState['character']['resources']> {
    return state.character.resources;
  },

  /**
   * 获取角色状态（只读）
   * @param state - 当前游戏状态
   * @returns 当前角色状态
   */
  getStatus(state: GameState): Readonly<GameState['character']['status']> {
    return state.character.status;
  },

  /**
   * 设置匮乏状态（资金归零后的软性惩罚状态）
   * 注意：匮乏不会直接导致死亡，但每回合会扣除身心
   * @param state - 当前游戏状态
   * @param isDestitute - 是否处于匮乏状态
   * @returns 新的游戏状态
   */
  setDestituteState(state: GameState, isDestitute: boolean): GameState {
    const newState = deepClone(state);
    const status = newState.character.status;

    if (isDestitute) {
      // 如果已经在其他终结态，不覆盖
      if (status.terminalState === null) {
        status.terminalState = 'DESTITUTE';
        status.terminalCountdown = 0; // 匮乏没有倒计时
      }
    } else {
      // 只有当当前是匮乏状态时才清除
      if (status.terminalState === 'DESTITUTE') {
        status.terminalState = null;
        status.terminalCountdown = 0;
      }
    }

    return newState;
  },
};

// 导出内部计算函数供测试使用
export { calculateDyingCountdown, calculateBreakdownCountdown };
