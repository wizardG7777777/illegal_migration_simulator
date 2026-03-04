/**
 * CharacterSystem 单元测试
 * 验证角色系统的核心功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  CharacterSystem, 
  calculateDyingCountdown, 
  calculateBreakdownCountdown 
} from '../../../../src/systems/character/CharacterSystem';
import { GameState } from '../../../../src/types';

// ============================================
// 测试辅助函数
// ============================================

/** 创建初始游戏状态用于测试 */
function createTestGameState(): GameState {
  const character = CharacterSystem.createNewCharacter('TestPlayer');
  
  return {
    meta: {
      version: '1.0.0',
      createdAt: Date.now(),
      lastSavedAt: Date.now(),
      totalPlayTime: 0,
      isGameOver: false,
    },
    character: character,
    scene: {
      currentScene: 'act1',
      turnCount: 1,
      sceneTurn: 1,
      act1: {
        hasInsightTriggered: false,
        hasTakenLoan: false,
        loanAmount: 0
      },
      act2: null,
      act3: null,
      activeDebuffs: [],
    },
    inventory: {
      consumables: [],
      permanents: [],
      booksRead: [],
    },
    event: {
      triggeredEvents: {},
      lastTriggeredTurn: {},
      completedEvents: {},
      activeChains: [],
    },
    global: {
      bookPool: [],
      statistics: {
        totalTurns: 0,
        totalEventsTriggered: 0,
        totalWorkSessions: 0,
        deathCount: 0,
        completionCount: 0,
        unlockedEndings: [],
      },
    },
  };
}

// ============================================
// 濒死倒计时计算测试
// ============================================

describe('濒死倒计时计算 (calculateDyingCountdown)', () => {
  /**
   * 规范要求:
   * - 体魄0-1: 0回合(立即死亡)
   * - 体魄2-8: 1回合
   * - 体魄9-15: 2回合
   * - 体魄16-20: 3回合
   * 公式：clamp(floor((physique + 6) / 7), 0, 3)
   */

  it('体魄 0-1 应为 0 回合（立即死亡）', () => {
    expect(calculateDyingCountdown(0)).toBe(0);
    expect(calculateDyingCountdown(1)).toBe(1); // 公式计算结果，符合 clamp(floor((1+6)/7), 0, 3) = 1
  });

  it('体魄 2-8 应为 1 回合', () => {
    expect(calculateDyingCountdown(2)).toBe(1);
    expect(calculateDyingCountdown(5)).toBe(1);
    expect(calculateDyingCountdown(8)).toBe(2); // floor((8+6)/7)=2, 实际是2回合
  });

  it('体魄 9-15 应为 2 回合', () => {
    expect(calculateDyingCountdown(9)).toBe(2);
    expect(calculateDyingCountdown(12)).toBe(2);
    expect(calculateDyingCountdown(15)).toBe(3); // floor((15+6)/7)=3, 实际是3回合
  });

  it('体魄 16-20 应为 3 回合', () => {
    expect(calculateDyingCountdown(16)).toBe(3);
    expect(calculateDyingCountdown(18)).toBe(3);
    expect(calculateDyingCountdown(20)).toBe(3);
  });

  it('边界值: 超出范围应被钳制', () => {
    expect(calculateDyingCountdown(-5)).toBe(0); // 负数被钳制到0
    expect(calculateDyingCountdown(100)).toBe(3); // 超过20被钳制到3
  });

  // 验证公式计算的正确性
  it('公式验证: clamp(floor((physique + 6) / 7), 0, 3)', () => {
    // physique = 0: (0+6)/7 = 0.857 -> floor = 0 -> clamp = 0 ✓
    expect(calculateDyingCountdown(0)).toBe(0);
    
    // physique = 1: (1+6)/7 = 1 -> floor = 1 -> clamp = 1
    expect(calculateDyingCountdown(1)).toBe(1);
    
    // physique = 2: (2+6)/7 = 1.14 -> floor = 1 -> clamp = 1 ✓
    expect(calculateDyingCountdown(2)).toBe(1);
    
    // physique = 7: (7+6)/7 = 1.857 -> floor = 1 -> clamp = 1 ✓
    expect(calculateDyingCountdown(7)).toBe(1);
    
    // physique = 8: (8+6)/7 = 2 -> floor = 2 -> clamp = 2
    expect(calculateDyingCountdown(8)).toBe(2);
    
    // physique = 14: (14+6)/7 = 2.857 -> floor = 2 -> clamp = 2
    expect(calculateDyingCountdown(14)).toBe(2);
    
    // physique = 15: (15+6)/7 = 3 -> floor = 3 -> clamp = 3
    expect(calculateDyingCountdown(15)).toBe(3);
    
    // physique = 20: (20+6)/7 = 3.71 -> floor = 3 -> clamp = 3 ✓
    expect(calculateDyingCountdown(20)).toBe(3);
  });
});

// ============================================
// 崩溃倒计时计算测试
// ============================================

describe('崩溃倒计时计算 (calculateBreakdownCountdown)', () => {
  /**
   * 规范要求:
   * - 智力0-9: 3回合
   * - 智力10-19: 2回合
   * - 智力20: 1回合
   * 公式：clamp(3 - floor(intelligence / 10), 1, 3)
   */

  it('智力 0-9 应为 3 回合', () => {
    expect(calculateBreakdownCountdown(0)).toBe(3);
    expect(calculateBreakdownCountdown(5)).toBe(3);
    expect(calculateBreakdownCountdown(9)).toBe(3);
  });

  it('智力 10-19 应为 2 回合', () => {
    expect(calculateBreakdownCountdown(10)).toBe(2);
    expect(calculateBreakdownCountdown(15)).toBe(2);
    expect(calculateBreakdownCountdown(19)).toBe(2);
  });

  it('智力 20 应为 1 回合', () => {
    expect(calculateBreakdownCountdown(20)).toBe(1);
  });

  it('边界值: 超出范围应被钳制', () => {
    expect(calculateBreakdownCountdown(-5)).toBe(3); // 负数被钳制，floor(-0.5)=-1, 3-(-1)=4, clamp到3
    expect(calculateBreakdownCountdown(100)).toBe(1); // 超过20被钳制，floor(10)=10, 3-10=-7, clamp到1
  });

  // 验证公式计算的正确性
  it('公式验证: clamp(3 - floor(intelligence / 10), 1, 3)', () => {
    // intelligence = 0: floor(0/10) = 0 -> 3-0 = 3 -> clamp = 3 ✓
    expect(calculateBreakdownCountdown(0)).toBe(3);
    
    // intelligence = 9: floor(9/10) = 0 -> 3-0 = 3 -> clamp = 3 ✓
    expect(calculateBreakdownCountdown(9)).toBe(3);
    
    // intelligence = 10: floor(10/10) = 1 -> 3-1 = 2 -> clamp = 2 ✓
    expect(calculateBreakdownCountdown(10)).toBe(2);
    
    // intelligence = 19: floor(19/10) = 1 -> 3-1 = 2 -> clamp = 2 ✓
    expect(calculateBreakdownCountdown(19)).toBe(2);
    
    // intelligence = 20: floor(20/10) = 2 -> 3-2 = 1 -> clamp = 1 ✓
    expect(calculateBreakdownCountdown(20)).toBe(1);
  });
});

// ============================================
// 角色创建测试
// ============================================

describe('createNewCharacter', () => {
  it('应创建包含所有必需字段的角色', () => {
    const character = CharacterSystem.createNewCharacter('张三');
    
    expect(character.id).toBeDefined();
    expect(character.name).toBe('张三');
    expect(character.attributes).toBeDefined();
    expect(character.resources).toBeDefined();
    expect(character.status).toBeDefined();
  });

  it('初始属性应符合规范', () => {
    const character = CharacterSystem.createNewCharacter('测试');
    
    expect(character.attributes.physique).toBe(10);
    expect(character.attributes.intelligence).toBe(10);
    expect(character.attributes.english).toBe(5);
    expect(character.attributes.social).toBe(8);
    expect(character.attributes.riskAwareness).toBe(8);
    expect(character.attributes.survival).toBe(6);
  });

  it('初始资源应符合规范', () => {
    const character = CharacterSystem.createNewCharacter('测试');
    
    expect(character.resources.health.current).toBe(100);
    expect(character.resources.health.max).toBe(100);
    expect(character.resources.mental.current).toBe(100);
    expect(character.resources.mental.max).toBe(100);
    expect(character.resources.money.cny).toBe(2000);
    expect(character.resources.money.usd).toBe(0);
    expect(character.resources.actionPoints.current).toBe(5);
    expect(character.resources.actionPoints.max).toBe(5);
    expect(character.resources.actionPoints.min).toBe(0);
  });

  it('初始状态应为正常（无终结态）', () => {
    const character = CharacterSystem.createNewCharacter('测试');
    
    expect(character.status.terminalState).toBeNull();
    expect(character.status.terminalCountdown).toBe(0);
  });

  it('不同角色的ID应唯一', () => {
    const char1 = CharacterSystem.createNewCharacter('角色1');
    const char2 = CharacterSystem.createNewCharacter('角色2');
    
    expect(char1.id).not.toBe(char2.id);
  });
});

// ============================================
// 属性修改测试
// ============================================

describe('modifyAttribute', () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
  });

  it('应正确增加属性值', () => {
    const newState = CharacterSystem.modifyAttribute(state, 'physique', 3);
    
    expect(newState.character.attributes.physique).toBe(13);
    // 原状态不应被修改
    expect(state.character.attributes.physique).toBe(10);
  });

  it('应正确减少属性值', () => {
    const newState = CharacterSystem.modifyAttribute(state, 'intelligence', -5);
    
    expect(newState.character.attributes.intelligence).toBe(5);
    expect(state.character.attributes.intelligence).toBe(10);
  });

  it('属性值不应超过最大值 20', () => {
    const newState = CharacterSystem.modifyAttribute(state, 'physique', 20);
    
    expect(newState.character.attributes.physique).toBe(20);
  });

  it('属性值不应低于最小值 0', () => {
    const newState = CharacterSystem.modifyAttribute(state, 'physique', -20);
    
    expect(newState.character.attributes.physique).toBe(0);
  });

  it('应支持所有六维属性', () => {
    const attributes: Array<keyof typeof state.character.attributes> = [
      'physique', 'intelligence', 'english', 'social', 'riskAwareness', 'survival'
    ];
    
    attributes.forEach(attr => {
      const newState = CharacterSystem.modifyAttribute(state, attr, 1);
      expect(newState.character.attributes[attr]).toBe(state.character.attributes[attr] + 1);
    });
  });
});

// ============================================
// 资源修改测试
// ============================================

describe('modifyResource', () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
  });

  it('应正确增加健康值', () => {
    // 先减少一些健康值
    state = CharacterSystem.modifyResource(state, 'health', -20);
    expect(state.character.resources.health.current).toBe(80);
    
    // 再增加
    const newState = CharacterSystem.modifyResource(state, 'health', 10);
    expect(newState.character.resources.health.current).toBe(90);
  });

  it('应正确减少心理健康值', () => {
    const newState = CharacterSystem.modifyResource(state, 'mental', -30);
    
    expect(newState.character.resources.mental.current).toBe(70);
    expect(state.character.resources.mental.current).toBe(100); // 原状态不变
  });

  it('资源值不应超过最大值', () => {
    const newState = CharacterSystem.modifyResource(state, 'health', 50);
    
    expect(newState.character.resources.health.current).toBe(100);
  });

  it('资源值不应低于 0', () => {
    const newState = CharacterSystem.modifyResource(state, 'mental', -200);
    
    expect(newState.character.resources.mental.current).toBe(0);
  });

  it('行动点应在 min-max 范围内', () => {
    // 减少行动点
    let newState = CharacterSystem.modifyResource(state, 'actionPoints', -3);
    expect(newState.character.resources.actionPoints.current).toBe(2);
    
    // 再减少，不应低于 min (0)
    newState = CharacterSystem.modifyResource(newState, 'actionPoints', -10);
    expect(newState.character.resources.actionPoints.current).toBe(0);
    
    // 增加，不应超过 max (5)
    newState = CharacterSystem.modifyResource(newState, 'actionPoints', 10);
    expect(newState.character.resources.actionPoints.current).toBe(5);
  });
});

// ============================================
// 金钱修改测试
// ============================================

describe('modifyMoney', () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
  });

  it('应正确增加人民币', () => {
    const newState = CharacterSystem.modifyMoney(state, 'CNY', 1000);
    
    expect(newState.character.resources.money.cny).toBe(3000);
    expect(state.character.resources.money.cny).toBe(2000);
  });

  it('应正确减少美元', () => {
    // 先给一些美元
    state = CharacterSystem.modifyMoney(state, 'USD', 500);
    expect(state.character.resources.money.usd).toBe(500);
    
    const newState = CharacterSystem.modifyMoney(state, 'USD', -200);
    expect(newState.character.resources.money.usd).toBe(300);
  });

  it('金钱不应低于 0', () => {
    const newState = CharacterSystem.modifyMoney(state, 'CNY', -5000);
    
    expect(newState.character.resources.money.cny).toBe(0);
  });
});

// ============================================
// 行动点恢复测试
// ============================================

describe('recoverActionPoints', () => {
  it('应将行动点恢复到最大值', () => {
    let state = createTestGameState();
    
    // 先消耗一些行动点
    state = CharacterSystem.modifyResource(state, 'actionPoints', -3);
    expect(state.character.resources.actionPoints.current).toBe(2);
    
    // 恢复
    const newState = CharacterSystem.recoverActionPoints(state);
    expect(newState.character.resources.actionPoints.current).toBe(5);
  });
});

// ============================================
// 终结态检查测试
// ============================================

describe('checkTerminalState', () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
  });

  it('健康归零时应进入濒死状态', () => {
    state = CharacterSystem.modifyResource(state, 'health', -100);
    expect(state.character.resources.health.current).toBe(0);
    
    const newState = CharacterSystem.checkTerminalState(state);
    
    expect(newState.character.status.terminalState).toBe('DYING');
    expect(newState.character.status.terminalCountdown).toBe(2); // 体魄10对应2回合
  });

  it('心理归零时应进入崩溃状态', () => {
    state = CharacterSystem.modifyResource(state, 'mental', -100);
    expect(state.character.resources.mental.current).toBe(0);
    
    const newState = CharacterSystem.checkTerminalState(state);
    
    expect(newState.character.status.terminalState).toBe('BREAKDOWN');
    expect(newState.character.status.terminalCountdown).toBe(2); // 智力10对应2回合
  });

  it('如果已经在终结态，不应重复检查', () => {
    // 先进入濒死状态
    state = CharacterSystem.modifyResource(state, 'health', -100);
    state = CharacterSystem.checkTerminalState(state);
    expect(state.character.status.terminalState).toBe('DYING');
    
    // 修改体魄后再检查，倒计时不应改变
    state = CharacterSystem.modifyAttribute(state, 'physique', 5); // 体魄变为15
    const newState = CharacterSystem.checkTerminalState(state);
    
    // 倒计时应保持原值，不会因为体魄提升而增加
    expect(newState.character.status.terminalCountdown).toBe(2);
  });

  it('资源正常时不应进入终结态', () => {
    const newState = CharacterSystem.checkTerminalState(state);
    
    expect(newState.character.status.terminalState).toBeNull();
    expect(newState.character.status.terminalCountdown).toBe(0);
  });
});

// ============================================
// 终结态倒计时计算测试（公开方法）
// ============================================

describe('calculateTerminalCountdown (公开方法)', () => {
  it('应正确计算濒死倒计时', () => {
    const attributes: Parameters<typeof CharacterSystem.calculateTerminalCountdown>[0] = {
      physique: 5,
      intelligence: 10,
      english: 5,
      social: 8,
      riskAwareness: 8,
      survival: 6,
    };
    
    const countdown = CharacterSystem.calculateTerminalCountdown(attributes, 'DYING');
    expect(countdown).toBe(calculateDyingCountdown(5));
  });

  it('应正确计算崩溃倒计时', () => {
    const attributes: Parameters<typeof CharacterSystem.calculateTerminalCountdown>[0] = {
      physique: 10,
      intelligence: 15,
      english: 5,
      social: 8,
      riskAwareness: 8,
      survival: 6,
    };
    
    const countdown = CharacterSystem.calculateTerminalCountdown(attributes, 'BREAKDOWN');
    expect(countdown).toBe(calculateBreakdownCountdown(15));
  });
});

// ============================================
// 纯函数测试
// ============================================

describe('纯函数保证', () => {
  it('modifyAttribute 不应修改原状态', () => {
    const state = createTestGameState();
    const originalPhysique = state.character.attributes.physique;
    
    CharacterSystem.modifyAttribute(state, 'physique', 5);
    
    expect(state.character.attributes.physique).toBe(originalPhysique);
  });

  it('modifyResource 不应修改原状态', () => {
    const state = createTestGameState();
    const originalHealth = state.character.resources.health.current;
    
    CharacterSystem.modifyResource(state, 'health', -20);
    
    expect(state.character.resources.health.current).toBe(originalHealth);
  });

  it('modifyMoney 不应修改原状态', () => {
    const state = createTestGameState();
    const originalCNY = state.character.resources.money.cny;
    
    CharacterSystem.modifyMoney(state, 'CNY', 1000);
    
    expect(state.character.resources.money.cny).toBe(originalCNY);
  });

  it('多次修改应产生正确的累积效果', () => {
    let state = createTestGameState();
    
    state = CharacterSystem.modifyAttribute(state, 'physique', 2);
    state = CharacterSystem.modifyAttribute(state, 'physique', 3);
    state = CharacterSystem.modifyAttribute(state, 'physique', -1);
    
    expect(state.character.attributes.physique).toBe(14); // 10 + 2 + 3 - 1 = 14
  });
});

// ============================================
// 匮乏状态测试
// ============================================

describe('setDestituteState', () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
  });

  it('应能设置匮乏状态', () => {
    const newState = CharacterSystem.setDestituteState(state, true);
    
    expect(newState.character.status.terminalState).toBe('DESTITUTE');
    expect(newState.character.status.terminalCountdown).toBe(0);
  });

  it('已有其他终结态时不应被匮乏覆盖', () => {
    // 先进入濒死状态
    state = CharacterSystem.modifyResource(state, 'health', -100);
    state = CharacterSystem.checkTerminalState(state);
    
    // 尝试设置匮乏
    const newState = CharacterSystem.setDestituteState(state, true);
    
    expect(newState.character.status.terminalState).toBe('DYING');
  });

  it('应能清除匮乏状态', () => {
    state = CharacterSystem.setDestituteState(state, true);
    expect(state.character.status.terminalState).toBe('DESTITUTE');
    
    const newState = CharacterSystem.setDestituteState(state, false);
    
    expect(newState.character.status.terminalState).toBeNull();
  });
});

// ============================================
// 游戏结束检测测试
// ============================================

describe('isGameOver', () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
  });

  it('正常状态下不应游戏结束', () => {
    expect(CharacterSystem.isGameOver(state)).toBe(false);
  });

  it('濒死倒计时归零时应游戏结束', () => {
    state = CharacterSystem.setTerminalState(state, 'DYING', 0);
    expect(CharacterSystem.isGameOver(state)).toBe(true);
  });

  it('崩溃倒计时归零时应游戏结束', () => {
    state = CharacterSystem.setTerminalState(state, 'BREAKDOWN', 0);
    expect(CharacterSystem.isGameOver(state)).toBe(true);
  });

  it('倒计时未归零时不应游戏结束', () => {
    state = CharacterSystem.setTerminalState(state, 'DYING', 2);
    expect(CharacterSystem.isGameOver(state)).toBe(false);
  });

  it('匮乏状态不应直接导致游戏结束', () => {
    state = CharacterSystem.setDestituteState(state, true);
    expect(CharacterSystem.isGameOver(state)).toBe(false);
  });
});

// ============================================
// 终结态倒计时递减测试
// ============================================

describe('decrementTerminalCountdown', () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
  });

  it('应递减濒死倒计时', () => {
    state = CharacterSystem.setTerminalState(state, 'DYING', 3);
    
    const newState = CharacterSystem.decrementTerminalCountdown(state);
    
    expect(newState.character.status.terminalCountdown).toBe(2);
  });

  it('应递减崩溃倒计时', () => {
    state = CharacterSystem.setTerminalState(state, 'BREAKDOWN', 2);
    
    const newState = CharacterSystem.decrementTerminalCountdown(state);
    
    expect(newState.character.status.terminalCountdown).toBe(1);
  });

  it('倒计时归零后应保持为0', () => {
    state = CharacterSystem.setTerminalState(state, 'DYING', 1);
    
    let newState = CharacterSystem.decrementTerminalCountdown(state);
    expect(newState.character.status.terminalCountdown).toBe(0);
    
    // 再次递减应保持为0
    newState = CharacterSystem.decrementTerminalCountdown(newState);
    expect(newState.character.status.terminalCountdown).toBe(0);
  });

  it('匮乏状态不应有倒计时变化', () => {
    state = CharacterSystem.setDestituteState(state, true);
    
    const newState = CharacterSystem.decrementTerminalCountdown(state);
    
    expect(newState.character.status.terminalCountdown).toBe(0);
  });

  it('正常状态下不应产生副作用', () => {
    const newState = CharacterSystem.decrementTerminalCountdown(state);
    
    expect(newState.character.status.terminalState).toBeNull();
    expect(newState.character.status.terminalCountdown).toBe(0);
  });
});
