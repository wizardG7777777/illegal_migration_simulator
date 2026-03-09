import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventSystem } from '../../../../src/systems/event/EventSystem';
import { dataLoader } from '../../../../src/systems/loader/DataLoader';
import type { GameState, GameEvent } from '../../../../src/types';

// Mock DataLoader
vi.mock('../../../../src/systems/loader/DataLoader', () => ({
  dataLoader: {
    getEventsByCategory: vi.fn(),
    getEvent: vi.fn(),
    getItem: vi.fn(),
  },
}));

// Mock ItemSystem (which is dynamically imported in EventSystem)
vi.mock('../../../../src/systems/item/ItemSystem', () => ({
  ItemSystem: {
    addItem: vi.fn((state) => state),
    removeItem: vi.fn((state) => state),
    addPermanentItem: vi.fn((state) => state),
    removePermanentItem: vi.fn((state) => state),
    findBestMatch: vi.fn(() => ({ itemId: 'test_item', priority: 0 })),
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
    turnCount: 1,
    sceneTurn: 1,
    act1: null,
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
  npcSystem: {
    npcs: {},
    chatHistory: [],
  },
});

describe('EventSystem', () => {
  let state: GameState;

  beforeEach(() => {
    state = createBaseState();
    vi.clearAllMocks();
  });

  describe('drawRandomEvent', () => {
    it('should return a random event based on weights', () => {
      const mockEvents: GameEvent[] = [
        {
          id: 'event1',
          name: 'Event 1',
          category: 'RANDOM',
          scenes: ['act1'],
          trigger: { weight: 100 },
          description: 'Test Event 1',
        },
      ];

      vi.mocked(dataLoader.getEventsByCategory).mockReturnValue(mockEvents);

      const event = EventSystem.drawRandomEvent(state);
      expect(event).toEqual(mockEvents[0]);
    });

    it('should return null if no events are available', () => {
      vi.mocked(dataLoader.getEventsByCategory).mockReturnValue([]);
      const event = EventSystem.drawRandomEvent(state);
      expect(event).toBeNull();
    });

    it('should filter out events not in current scene', () => {
      const mockEvents: GameEvent[] = [
        {
          id: 'event2',
          name: 'Event 2',
          category: 'RANDOM',
          scenes: ['act2'], // Different scene
          trigger: { weight: 100 },
          description: 'Test Event 2',
        },
      ];

      vi.mocked(dataLoader.getEventsByCategory).mockReturnValue(mockEvents);
      const event = EventSystem.drawRandomEvent(state);
      expect(event).toBeNull();
    });
  });

  describe('isEventAvailable', () => {
    it('should return true for event without trigger conditions', () => {
      const event: GameEvent = {
        id: 'test',
        name: 'Test',
        category: 'FIXED',
        scenes: ['act1'],
        description: 'Test',
      };
      expect(EventSystem.isEventAvailable(state, event)).toBe(true);
    });

    it('should check max triggers', () => {
      const event: GameEvent = {
        id: 'test',
        name: 'Test',
        category: 'RANDOM',
        scenes: ['act1'],
        description: 'Test',
        trigger: { maxTriggers: 1, weight: 10 },
      };

      state.event.triggeredEvents['test'] = 1;
      expect(EventSystem.isEventAvailable(state, event)).toBe(false);

      state.event.triggeredEvents['test'] = 0;
      expect(EventSystem.isEventAvailable(state, event)).toBe(true);
    });

    it('should check cooldown', () => {
      const event: GameEvent = {
        id: 'test',
        name: 'Test',
        category: 'RANDOM',
        scenes: ['act1'],
        description: 'Test',
        trigger: { cooldown: 2, weight: 10 },
      };

      state.scene.turnCount = 5;
      state.event.lastTriggeredTurn['test'] = 4; // 1 turn ago
      expect(EventSystem.isEventAvailable(state, event)).toBe(false);

      state.event.lastTriggeredTurn['test'] = 2; // 3 turns ago
      expect(EventSystem.isEventAvailable(state, event)).toBe(true);
    });

    it('should check scene turn limits', () => {
      const event: GameEvent = {
        id: 'test',
        name: 'Test',
        category: 'RANDOM',
        scenes: ['act1'],
        description: 'Test',
        trigger: { minSceneTurn: 3, maxSceneTurn: 5, weight: 10 },
      };

      state.scene.sceneTurn = 2;
      expect(EventSystem.isEventAvailable(state, event)).toBe(false);

      state.scene.sceneTurn = 4;
      expect(EventSystem.isEventAvailable(state, event)).toBe(true);

      state.scene.sceneTurn = 6;
      expect(EventSystem.isEventAvailable(state, event)).toBe(false);
    });
  });

  describe('executeEvent', () => {
    it('should execute event and apply costs', () => {
      const event: GameEvent = {
        id: 'work',
        name: 'Work',
        category: 'FIXED',
        scenes: ['act1'],
        description: 'Work',
        execution: { actionPointCost: 2, moneyCost: 100, repeatable: true },
        choices: [
          {
            id: 'opt1',
            name: 'Option 1',
            effects: { resources: { health: -5 } },
          },
        ],
      };

      vi.mocked(dataLoader.getEvent).mockReturnValue(event);

      const newState = EventSystem.executeEvent(state, 'work', 'opt1');

      expect(newState.character.resources.actionPoints.current).toBe(3); // 5 - 2
      expect(newState.character.resources.money.cny).toBe(1900); // 2000 - 100
      expect(newState.character.resources.health.current).toBe(95); // 100 - 5
      expect(newState.global.statistics.totalEventsTriggered).toBe(1);
    });

    it('should schedule chain event', () => {
      const event: GameEvent = {
        id: 'chain_start',
        name: 'Chain Start',
        category: 'CHAIN',
        scenes: ['act1'],
        description: 'Start',
        execution: { actionPointCost: 0, repeatable: false },
        chain: {
          chainId: 'test_chain',
          stepIndex: 0,
          nextEventId: 'chain_next',
          unlockDelay: 2,
        },
        choices: [{ id: 'opt1', name: 'Ok', effects: {} }],
      };

      vi.mocked(dataLoader.getEvent).mockReturnValue(event);

      const newState = EventSystem.executeEvent(state, 'chain_start', 'opt1');

      expect(newState.event.activeChains).toHaveLength(1);
      expect(newState.event.activeChains[0]).toEqual({
        chainId: 'test_chain',
        currentStep: 1,
        unlockEventId: 'chain_next',
        unlockDelay: 2,
        unlockTurn: 3, // 1 + 2
      });
    });
  });

  describe('Conditions', () => {
    it('should validate attribute condition', () => {
      const event: GameEvent = {
        id: 'cond_test',
        name: 'Cond Test',
        category: 'RANDOM',
        scenes: ['act1'],
        description: 'Test',
        trigger: {
          weight: 10,
          conditions: [
            { type: 'ATTRIBUTE', attribute: 'physique', operator: '>=', value: 12 },
          ],
        },
      };

      state.character.attributes.physique = 10;
      expect(EventSystem.isEventAvailable(state, event)).toBe(false);

      state.character.attributes.physique = 12;
      expect(EventSystem.isEventAvailable(state, event)).toBe(true);
    });
    
    it('should validate flag condition', () => {
        const event: GameEvent = {
          id: 'flag_test',
          name: 'Flag Test',
          category: 'RANDOM',
          scenes: ['act1'],
          description: 'Test',
          trigger: {
            weight: 10,
            conditions: [
              { type: 'FLAG', flag: 'met_guide', value: true },
            ],
          },
        };

        expect(EventSystem.isEventAvailable(state, event)).toBe(false);

        state.character.status.flags['met_guide'] = true;
        expect(EventSystem.isEventAvailable(state, event)).toBe(true);
    });
  });
});
