/**
 * TurnSystem.ts
 *
 * 回合系统 - 负责回合流程编排，协调各系统
 *
 * 功能包括：
 * 1. 回合阶段管理（开始、随机事件、玩家行动、月度结算、结束）
 * 2. 完整回合流程执行（用于自动推进或测试）
 * 3. 游戏结束条件检查
 * 4. 终结态倒计时管理
 *
 * 所有方法均为纯函数，返回新的 GameState
 */

import type { GameState } from '../../types';
import { deepClone } from '../../utils/pure';
import { CharacterSystem } from '../character/CharacterSystem';
import { EventSystem } from '../event/EventSystem';
import { SceneSystem } from '../scene/SceneSystem';

// ============================================
// 常量配置
// ============================================

/** 每月回合数（场景3月度结算用） */
const TURNS_PER_MONTH = 30;

/** 匮乏状态每回合惩罚 */
const DESTITUTE_PENALTY = {
  health: 5,
  mental: 5
};

// ============================================
// 玩家动作类型定义
// ============================================

/**
 * 执行事件动作数据
 */
export interface ExecuteEventAction {
  type: 'EXECUTE_EVENT';
  eventId: string;
  choiceId: string;
  slotSelections?: Record<string, string>;
}

/**
 * 回合动作联合类型
 */
export type TurnAction = ExecuteEventAction;

// ============================================
// TurnSystem 实现
// ============================================

export const TurnSystem = {
  // ========== 回合阶段（每个都是纯函数） ==========

  /**
   * 阶段1：回合开始
   * 
   * 执行以下操作：
   * 1. 回合数+1
   * 2. 恢复行动点到最大值
   * 3. 处理待解锁的链式事件
   * 4. 应用 Debuff 效果（扣血/扣心理）
   * 5. 终结态的持续性惩罚（匮乏状态每回合扣身心）
   * 
   * @param state - 当前游戏状态
   * @returns 新的游戏状态
   */
  phaseTurnStart(state: GameState): GameState {
    let newState = deepClone(state);

    // 1. 回合数+1
    newState.scene.turnCount++;
    newState.scene.sceneTurn++;

    // 更新统计
    newState.global.statistics.totalTurns = newState.scene.turnCount;

    // 2. 恢复行动点到最大值
    newState = CharacterSystem.recoverActionPoints(newState);

    // 3. 处理待解锁的链式事件
    newState = EventSystem.processPendingChains(newState);

    // 4. 应用 Debuff 效果（扣血/扣心理）
    newState = SceneSystem.applyDebuffEffects(newState);

    // 5. 终结态的持续性惩罚（匮乏状态每回合扣身心）
    if (newState.character.status.terminalState === 'DESTITUTE') {
      newState.character.resources.health.current = Math.max(
        0,
        newState.character.resources.health.current - DESTITUTE_PENALTY.health
      );
      newState.character.resources.mental.current = Math.max(
        0,
        newState.character.resources.mental.current - DESTITUTE_PENALTY.mental
      );
    }

    return newState;
  },

  /**
   * 阶段2：随机事件判定
   * 
   * 抽取随机事件，如果有则记录到场景状态的 pendingRandomEvent 中
   * UI 层会读取并显示，玩家确认后进入效果应用
   * 
   * @param state - 当前游戏状态
   * @returns 新的游戏状态
   */
  phaseRandomEvent(state: GameState): GameState {
    let newState = deepClone(state);

    // 抽取随机事件
    const randomEvent = EventSystem.drawRandomEvent(newState);

    if (randomEvent) {
      // 记录到场景状态，UI 层会读取并显示
      newState.scene.pendingRandomEvent = randomEvent.id;
      // 标记事件已触发
      newState = EventSystem.markEventTriggered(newState, randomEvent.id);
    }

    return newState;
  },

  /**
   * 阶段3：玩家行动
   * 
   * 由 UI 触发，执行玩家选择的固定事件
   * 可执行多个事件，直到行动点耗尽或主动结束
   * 
   * @param state - 当前游戏状态
   * @param action - 玩家动作
   * @returns 新的游戏状态
   */
  phasePlayerAction(state: GameState, action: TurnAction): GameState {
    let newState = deepClone(state);

    if (action.type === 'EXECUTE_EVENT') {
      // 执行固定事件
      newState = EventSystem.executeEvent(
        newState,
        action.eventId,
        action.choiceId,
        action.slotSelections
      );
    }

    return newState;
  },

  /**
   * 阶段4：月度结算（仅场景3）
   * 
   * 如果是场景3且进入新月，扣除生活成本和债务还款
   * 
   * @param state - 当前游戏状态
   * @returns 新的游戏状态
   */
  phaseMonthlySettlement(state: GameState): GameState {
    let newState = deepClone(state);

    // 仅场景3需要月度结算
    if (newState.scene.currentScene !== 'act3') {
      return newState;
    }

    // 检查是否进入新月
    if (!this.isNewMonth(newState)) {
      return newState;
    }

    // 扣除生活成本
    newState = SceneSystem.applyLivingExpenses(newState);

    // TODO: 债务还款（如果实现了债务系统）
    // newState = DebtSystem.processMonthlyPayment(newState);

    // 处理学生签的持续成本
    if (newState.scene.act3?.ongoingCost) {
      const ongoingCost = newState.scene.act3.ongoingCost;
      if (ongoingCost.chargesRemaining > 0) {
        // 检查是否到达收费回合
        const turnsInScene = newState.scene.sceneTurn;
        if (turnsInScene % ongoingCost.interval === 0) {
          // 扣除费用
          newState.character.resources.money.usd = Math.max(
            0,
            newState.character.resources.money.usd - ongoingCost.amount
          );
          ongoingCost.chargesRemaining--;
        }
      }
    }

    return newState;
  },

  /**
   * 阶段5：回合结束
   * 
   * 执行以下操作：
   * 1. 更新 Debuff（持续时间-1，移除过期）
   * 2. 检查并进入终结态（健康/心理归零）
   * 3. 终结态倒计时递减
   * 4. 检查游戏结束
   * 5. 清除本回合的随机事件标记
   * 
   * @param state - 当前游戏状态
   * @returns 新的游戏状态
   */
  phaseTurnEnd(state: GameState): GameState {
    let newState = deepClone(state);

    // 1. 更新 Debuff（持续时间-1，移除过期）
    newState = SceneSystem.updateDebuffs(newState);

    // 2. 检查并进入终结态（健康/心理归零）
    newState = CharacterSystem.checkTerminalState(newState);

    // 3. 终结态倒计时递减
    newState = this.decrementTerminalCountdown(newState);

    // 4. 检查游戏结束
    const gameOver = this.checkGameOver(newState);
    if (gameOver.isOver) {
      newState.meta.isGameOver = true;
      newState.meta.endingId = gameOver.endingId;
    }

    // 5. 清除本回合的随机事件标记
    delete newState.scene.pendingRandomEvent;

    return newState;
  },

  // ========== 完整回合流程 ==========

  /**
   * 执行完整回合（用于自动推进或测试）
   * 
   * 按顺序执行所有回合阶段：
   * 1. 回合开始
   * 2. 随机事件
   * 3. 玩家行动（可选）
   * 4. 月度结算
   * 5. 回合结束
   * 
   * @param state - 当前游戏状态
   * @param playerAction - 玩家动作（可选）
   * @returns 新的游戏状态
   * 
   * @example
   * ```typescript
   * // 执行一个完整回合（无玩家行动）
   * state = TurnSystem.processTurn(state);
   * 
   * // 执行一个完整回合（带玩家行动）
   * state = TurnSystem.processTurn(state, {
   *   type: 'EXECUTE_EVENT',
   *   eventId: 'act1_work_warehouse',
   *   choiceId: 'work_normal'
   * });
   * ```
   */
  processTurn(state: GameState, playerAction?: TurnAction): GameState {
    // 阶段1：回合开始
    let newState = this.phaseTurnStart(state);

    // 阶段2：随机事件
    newState = this.phaseRandomEvent(newState);

    // 阶段3：玩家行动（如果有）
    if (playerAction) {
      newState = this.phasePlayerAction(newState, playerAction);
    }

    // 阶段4：月度结算
    newState = this.phaseMonthlySettlement(newState);

    // 阶段5：回合结束
    newState = this.phaseTurnEnd(newState);

    return newState;
  },

  // ========== 检查点 ==========

  /**
   * 检查是否进入新月份（场景3生活成本）
   * 
   * 假设每30回合为一个月
   * 
   * @param state - 当前游戏状态
   * @returns 是否进入新月
   */
  isNewMonth(state: GameState): boolean {
    // 只有场景3有月度结算
    if (state.scene.currentScene !== 'act3') {
      return false;
    }
    return state.scene.sceneTurn % TURNS_PER_MONTH === 0;
  },

  /**
   * 检查游戏是否结束
   * 
   * 游戏结束条件：
   * - 濒死状态且倒计时归零 → death 结局
   * - 崩溃状态且倒计时归零 → breakdown 结局
   * - 特殊结局（通过事件触发设置 isGameOver）
   * 
   * @param state - 当前游戏状态
   * @returns 游戏结束检查结果
   */
  checkGameOver(state: GameState): { isOver: boolean; endingId?: string } {
    const status = state.character.status;

    // 如果已经通过事件标记为游戏结束
    if (state.meta.isGameOver) {
      return { isOver: true, endingId: state.meta.endingId };
    }

    // 只有在终结态且倒计时归零时才算游戏结束
    if (status.terminalState === null) {
      return { isOver: false };
    }

    // 濒死状态倒计时归零 → 死亡结局
    if (status.terminalState === 'DYING' && status.terminalCountdown <= 0) {
      return { isOver: true, endingId: 'death' };
    }

    // 崩溃状态倒计时归零 → 崩溃结局
    if (status.terminalState === 'BREAKDOWN' && status.terminalCountdown <= 0) {
      return { isOver: true, endingId: 'breakdown' };
    }

    // 匮乏状态不会直接导致游戏结束，但会持续扣血扣心理
    // 当血或心理归零后会进入对应的终结态

    return { isOver: false };
  },

  /**
   * 终结态倒计时递减（回合结束时调用）
   * 
   * 濒死和崩溃状态才有倒计时，匮乏状态没有
   * 
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
    // DESTITUTE（匮乏）状态没有倒计时

    return newState;
  },
};

// 默认导出
export default TurnSystem;
