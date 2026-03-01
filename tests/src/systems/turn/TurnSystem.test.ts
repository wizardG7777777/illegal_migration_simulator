import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TurnSystem } from '../../../../src/systems/turn/TurnSystem';
import { CharacterSystem } from '../../../../src/systems/character/CharacterSystem';
import { EventSystem } from '../../../../src/systems/event/EventSystem';
import { SceneSystem } from '../../../../src/systems/scene/SceneSystem';
import type { GameState, GameEvent } from '../../../../src/types';

// Mock dependencies
vi.mock('../../../../src/systems/character/CharacterSystem', () => ({
  CharacterSystem: {
    recoverActionPoints: vi.fn((state) => state),
    checkTerminalState: vi.fn((state) => state),
    decrementTerminalCountdown: vi.fn((state) => state),
    isGameOver: vi.fn(() => ({ isOver: false })),
  },
}));

vi.mock('../../../../src/systems/event/EventSystem', () => ({
  EventSystem: {
    processPendingChains: vi.fn((state) => state),
    drawRandomEvent: vi.fn(() => null),
    markEventTriggered: vi.fn((state) => state),
    executeEvent: vi.fn((state) => state),
  },
}));

vi.mock('../../../../src/systems/scene/SceneSystem', () => ({
  SceneSystem: {
    applyDebuffEffects: vi.fn((state) => state),
    updateDebuffs: vi.fn((state) => state),
    applyLivingExpenses: vi.fn((state) => state),
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
    },
  },
  scene: {
    currentScene: 'act1',
    turnCount: 0,
    sceneTurn: 0,
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

describe('TurnSystem', () => {
  let state: GameState;

  beforeEach(() => {
    state = createBaseState();
    vi.clearAllMocks();
  });

  describe('phaseTurnStart', () => {
    it('should increment turn counts', () => {
      const newState = TurnSystem.phaseTurnStart(state);
      expect(newState.scene.turnCount).toBe(1);
      expect(newState.scene.sceneTurn).toBe(1);
      expect(newState.global.statistics.totalTurns).toBe(1);
    });

    it('should call recovery and effect functions', () => {
      TurnSystem.phaseTurnStart(state);
      expect(CharacterSystem.recoverActionPoints).toHaveBeenCalled();
      expect(EventSystem.processPendingChains).toHaveBeenCalled();
      expect(SceneSystem.applyDebuffEffects).toHaveBeenCalled();
    });

    it('should apply destitute penalty', () => {
      state.character.status.terminalState = 'DESTITUTE';
      const newState = TurnSystem.phaseTurnStart(state);
      
      // Expect health and mental to decrease by 5 (DESTITUTE_PENALTY)
      expect(newState.character.resources.health.current).toBe(95);
      expect(newState.character.resources.mental.current).toBe(95);
    });
  });

  describe('phaseRandomEvent', () => {
    it('should set pending event if drawn', () => {
      const mockEvent: GameEvent = {
        id: 'random_1',
        name: 'Random',
        category: 'RANDOM',
        scenes: ['act1'],
        description: 'Test',
      };
      
      vi.mocked(EventSystem.drawRandomEvent).mockReturnValue(mockEvent);
      
      const newState = TurnSystem.phaseRandomEvent(state);
      
      expect(newState.scene.pendingRandomEvent).toBe('random_1');
      expect(EventSystem.markEventTriggered).toHaveBeenCalledWith(expect.anything(), 'random_1');
    });

    it('should do nothing if no event drawn', () => {
      vi.mocked(EventSystem.drawRandomEvent).mockReturnValue(null);
      const newState = TurnSystem.phaseRandomEvent(state);
      expect(newState.scene.pendingRandomEvent).toBeUndefined();
    });
  });

  describe('phasePlayerAction', () => {
    it('should execute event action', () => {
      const action = {
        type: 'EXECUTE_EVENT' as const,
        eventId: 'work',
        choiceId: 'opt1',
      };
      
      TurnSystem.phasePlayerAction(state, action);
      
      expect(EventSystem.executeEvent).toHaveBeenCalledWith(
        expect.anything(),
        'work',
        'opt1',
        undefined
      );
    });
  });

  describe('phaseMonthlySettlement', () => {
    it('should only run in Act 3', () => {
      state.scene.currentScene = 'act1';
      TurnSystem.phaseMonthlySettlement(state);
      expect(SceneSystem.applyLivingExpenses).not.toHaveBeenCalled();
    });

    it('should run settlement every 30 turns in Act 3', () => {
      state.scene.currentScene = 'act3';
      state.scene.sceneTurn = 30;
      
      TurnSystem.phaseMonthlySettlement(state);
      expect(SceneSystem.applyLivingExpenses).toHaveBeenCalled();
    });

    it('should not run settlement if not 30th turn', () => {
      state.scene.currentScene = 'act3';
      state.scene.sceneTurn = 15;
      
      TurnSystem.phaseMonthlySettlement(state);
      expect(SceneSystem.applyLivingExpenses).not.toHaveBeenCalled();
    });
  });

  describe('phaseTurnEnd', () => {
    it('should cleanup and check game over', () => {
      state.scene.pendingRandomEvent = 'evt_1';
      
      const newState = TurnSystem.phaseTurnEnd(state);
      
      expect(SceneSystem.updateDebuffs).toHaveBeenCalled();
      expect(CharacterSystem.checkTerminalState).toHaveBeenCalled();
      // TurnSystem calls this.decrementTerminalCountdown which calls CharacterSystem.decrementTerminalCountdown?
      // No, TurnSystem has its own decrementTerminalCountdown implementation!
      // Let's check TurnSystem.ts again.
      // TurnSystem.decrementTerminalCountdown calls deepClone and modifies state.
      // It DOES NOT call CharacterSystem.decrementTerminalCountdown.
      
      // So we should NOT expect CharacterSystem.decrementTerminalCountdown to be called.
      // expect(CharacterSystem.decrementTerminalCountdown).toHaveBeenCalled();
      
      expect(newState.scene.pendingRandomEvent).toBeUndefined();
    });

    it('should set game over state if check returns true', () => {
      vi.mocked(CharacterSystem.isGameOver).mockReturnValue(true);
      
      // Mock checkGameOver logic in TurnSystem to return true when isGameOver returns true
      // Since TurnSystem.checkGameOver calls CharacterSystem.isGameOver internally
      // But wait, TurnSystem.checkGameOver implementation:
      /*
        if (state.meta.isGameOver) return { isOver: true ... }
        if (status.terminalState === null) return { isOver: false }
        if (DYING && count <= 0) return { isOver: true, endingId: 'death' }
        if (BREAKDOWN && count <= 0) return { isOver: true, endingId: 'breakdown' }
        return { isOver: false }
      */
      
      // So simply mocking CharacterSystem.isGameOver might not be enough if TurnSystem.checkGameOver 
      // has its own logic that doesn't fully rely on CharacterSystem.isGameOver return value 
      // or if it relies on state properties.
      
      // Let's look at TurnSystem.ts again.
      // phaseTurnEnd calls this.checkGameOver(newState)
      // checkGameOver implementation in TurnSystem.ts:
      // It checks terminalState and terminalCountdown manually!
      // It does NOT seem to call CharacterSystem.isGameOver directly?
      // Wait, let me check TurnSystem.ts content again from previous turn.
      
      // TurnSystem.ts:
      // checkGameOver(state) { ... logic ... }
      
      // phaseTurnEnd(state) {
      //   ...
      //   const gameOver = this.checkGameOver(newState);
      //   if (gameOver.isOver) { ... }
      // }
      
      // So mocking CharacterSystem.isGameOver is IRRELEVANT for TurnSystem.phaseTurnEnd 
      // unless TurnSystem.checkGameOver calls it.
      
      // Let's set the state to satisfy TurnSystem.checkGameOver logic.
      state.character.status.terminalState = 'DYING';
      state.character.status.terminalCountdown = 0;
      
      const newState = TurnSystem.phaseTurnEnd(state);
      
      expect(newState.meta.isGameOver).toBe(true);
      expect(newState.meta.endingId).toBe('death');
    });
  });

  describe('processTurn', () => {
    it('should execute full turn sequence', () => {
      const spyStart = vi.spyOn(TurnSystem, 'phaseTurnStart');
      const spyRandom = vi.spyOn(TurnSystem, 'phaseRandomEvent');
      const spyAction = vi.spyOn(TurnSystem, 'phasePlayerAction');
      const spySettlement = vi.spyOn(TurnSystem, 'phaseMonthlySettlement');
      const spyEnd = vi.spyOn(TurnSystem, 'phaseTurnEnd');

      const action = {
        type: 'EXECUTE_EVENT' as const,
        eventId: 'work',
        choiceId: 'opt1',
      };

      TurnSystem.processTurn(state, action);

      expect(spyStart).toHaveBeenCalled();
      expect(spyRandom).toHaveBeenCalled();
      expect(spyAction).toHaveBeenCalled();
      expect(spySettlement).toHaveBeenCalled();
      expect(spyEnd).toHaveBeenCalled();
    });
  });
});
