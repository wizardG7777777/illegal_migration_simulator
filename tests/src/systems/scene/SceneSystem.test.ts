import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SceneSystem } from '../../../../src/systems/scene/SceneSystem';
import { ItemSystem } from '../../../../src/systems/item/ItemSystem';
import { CharacterSystem } from '../../../../src/systems/character/CharacterSystem';
import { dataLoader } from '../../../../src/systems/loader/DataLoader';
import type { GameState, EnvironmentalDebuff, EconomicDebuffEffect } from '../../../../src/types';

// Mock dependencies
vi.mock('../../../../src/systems/item/ItemSystem', () => ({
  ItemSystem: {
    clearPermanentItems: vi.fn((state) => state),
    addItem: vi.fn((state) => state),
    addPermanentItem: vi.fn((state) => state),
  },
}));

vi.mock('../../../../src/systems/character/CharacterSystem', () => ({
  CharacterSystem: {
    setDestituteState: vi.fn((state) => state),
  },
}));

vi.mock('../../../../src/systems/loader/DataLoader', () => ({
  dataLoader: {
    getItem: vi.fn(),
  },
}));

// Helper to create a base state
const createBaseState = (): GameState => ({
  meta: {
    version: '1.0',
    createdAt: Date.now(),
    lastSavedAt: Date.now(),
    totalPlayTime: 0,
    isGameOver: false,
  },
  character: {
    id: 'test-char',
    name: 'Test',
    attributes: {
      physique: 10,
      intelligence: 10,
      english: 5,
      social: 8,
      riskAwareness: 8,
      survival: 6,
    },
    resources: {
      health: { current: 100, max: 100 },
      mental: { current: 100, max: 100 },
      money: { cny: 2000, usd: 0 },
      actionPoints: { current: 5, max: 5, min: 0 },
    },
    status: {
      terminalState: null,
      terminalCountdown: 0,
      flags: {},
      buffs: [],
      debuffs: [],
      isDead: false,
      isCrazy: false,
      isBroke: false,
      isArrested: false
    },
  },
  scene: {
    currentScene: 'act1',
    turnCount: 1,
    sceneTurn: 1,
    act1: {
      hasInsightTriggered: false,
      hasTakenLoan: false,
      loanAmount: 0,
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
});

describe('SceneSystem', () => {
  let state: GameState;

  beforeEach(() => {
    state = createBaseState();
    vi.clearAllMocks();
  });

  describe('transitionScene', () => {
    it('should allow valid transition act1 -> act2', () => {
      const newState = SceneSystem.transitionScene(state, 'act2');
      expect(newState.scene.currentScene).toBe('act2');
      expect(newState.scene.sceneTurn).toBe(0);
      expect(newState.scene.act2).toBeDefined();
    });

    it('should throw error for invalid transition act1 -> act3', () => {
      expect(() => SceneSystem.transitionScene(state, 'act3')).toThrow('非法的场景切换');
    });

    it('should convert CNY to USD when transitioning act1 -> act2', () => {
      state.character.resources.money.cny = 1000;
      state.character.resources.money.usd = 0;
      
      const newState = SceneSystem.transitionScene(state, 'act2');
      
      // 1000 * 0.14 = 140
      expect(newState.character.resources.money.usd).toBe(140);
      expect(newState.character.resources.money.cny).toBe(0);
    });

    it('should clear permanent items on transition', () => {
      SceneSystem.transitionScene(state, 'act2');
      expect(ItemSystem.clearPermanentItems).toHaveBeenCalled();
    });

    it('should give starter kit for act2', () => {
      SceneSystem.transitionScene(state, 'act2');
      expect(ItemSystem.addItem).toHaveBeenCalledWith(expect.anything(), 'consumable_food_supply', 5);
      expect(ItemSystem.addPermanentItem).toHaveBeenCalledWith(expect.anything(), 'basic_compass');
    });
  });

  describe('calculateLivingCost (Act 3)', () => {
    beforeEach(() => {
      state.scene.currentScene = 'act3';
      state.scene.act3 = {
        livingExpenses: {
            baseline: { food: 400, lodging: 0, transport: 100, total: 500 },
            current: { food: 400, lodging: 0, transport: 100, total: 500 }
        },
        debtDefaultCount: 0
      };
    });

    it('should return 0 if not in act3', () => {
      state.scene.currentScene = 'act1';
      expect(SceneSystem.calculateLivingCost(state)).toBe(0);
    });

    it('should calculate baseline cost correctly', () => {
      // Mock no items -> default transport (bus $100) + food ($400) = $500
      expect(SceneSystem.calculateLivingCost(state)).toBe(500);
    });

    it('should apply inflation from economic debuffs', () => {
      const effects: EconomicDebuffEffect = {
        foodCostMultiplier: 1.5,
        lodgingCostMultiplier: 1.0,
        transportCostMultiplier: 1.0,
      };

      const debuff: EnvironmentalDebuff = {
        id: 'inflation',
        name: 'Inflation',
        type: 'economic',
        intensity: 1,
        duration: 10,
        source: 'Test',
        effects: effects,
      };
      state.scene.activeDebuffs.push(debuff);

      // Total = 600 (Food) + 100 (Transport) = 700
      expect(SceneSystem.calculateLivingCost(state)).toBe(700);
    });
  });

  describe('Debuff Management', () => {
    it('should add new debuff', () => {
      const debuff: EnvironmentalDebuff = {
        id: 'test_debuff',
        name: 'Test',
        type: 'pressure',
        intensity: 1,
        duration: 5,
        source: 'Test',
        effects: {},
      };

      const newState = SceneSystem.addDebuff(state, debuff);
      expect(newState.scene.activeDebuffs).toHaveLength(1);
      expect(newState.scene.activeDebuffs[0].id).toBe('test_debuff');
    });

    it('should update existing debuff (max intensity/duration)', () => {
      const debuff1: EnvironmentalDebuff = {
        id: 'test_debuff',
        name: 'Test',
        type: 'pressure',
        intensity: 1,
        duration: 5,
        source: 'Test',
        effects: {},
      };
      
      let newState = SceneSystem.addDebuff(state, debuff1);
      
      const debuff2: EnvironmentalDebuff = {
        id: 'test_debuff',
        name: 'Test',
        type: 'pressure',
        intensity: 2, // Higher intensity
        duration: 3,  // Lower duration
        source: 'Test',
        effects: {},
      };

      newState = SceneSystem.addDebuff(newState, debuff2);
      
      expect(newState.scene.activeDebuffs[0].intensity).toBe(2);
      expect(newState.scene.activeDebuffs[0].duration).toBe(5); // Keep max duration
    });

    it('should decrement duration and remove expired debuffs', () => {
      state.scene.activeDebuffs.push({
        id: 'test',
        name: 'Test',
        type: 'pressure',
        intensity: 1,
        duration: 1,
        source: 'Test',
        effects: {},
      });

      const newState = SceneSystem.updateDebuffs(state);
      expect(newState.scene.activeDebuffs).toHaveLength(0); // 1 - 1 = 0, removed
    });

    it('should keep permanent debuffs (duration -1)', () => {
      const effects: EconomicDebuffEffect = {
        foodCostMultiplier: 1.0,
        lodgingCostMultiplier: 1.0,
        transportCostMultiplier: 1.0,
      };

      state.scene.activeDebuffs.push({
        id: 'perm',
        name: 'Perm',
        type: 'economic',
        intensity: 1,
        duration: -1,
        source: 'Test',
        effects: effects,
      });

      const newState = SceneSystem.updateDebuffs(state);
      expect(newState.scene.activeDebuffs).toHaveLength(1);
      expect(newState.scene.activeDebuffs[0].duration).toBe(-1);
    });

    it('should apply pressure effects', () => {
      state.scene.activeDebuffs.push({
        id: 'pressure1',
        name: 'Pressure 1',
        type: 'pressure',
        intensity: 1,
        duration: 5,
        source: 'Test',
        effects: { mentalDamagePerTurn: 2 },
      });

      const newState = SceneSystem.applyDebuffEffects(state);
      expect(newState.character.resources.mental.current).toBe(98); // 100 - 2
    });
  });
});
