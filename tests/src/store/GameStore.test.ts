import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gameStore } from '@/store';
import type { GameStore } from '@/store';

// 在测试中使用 vanilla store
const useGameStore = gameStore;
import { CharacterSystem } from '@/systems/character/CharacterSystem';
import { EventSystem } from '@/systems/event/EventSystem';
import { SceneSystem } from '@/systems/scene/SceneSystem';
import { ItemSystem } from '@/systems/item/ItemSystem';
import { deepClone } from '@/utils/pure';
import type { GameState } from '@/types';

// Mock Systems
vi.mock('@/systems/character/CharacterSystem', () => ({
  CharacterSystem: {
    createNewCharacter: vi.fn(() => ({
      id: 'mock-char-id',
      name: 'Player',
      attributes: { physique: 10 },
      resources: { 
        health: { current: 100 }, 
        money: { cny: 2000, usd: 0 },
        actionPoints: { current: 5, max: 5 }
      },
      status: { terminalState: null }
    })),
    recoverActionPoints: vi.fn((state) => ({ ...state, character: { ...state.character, resources: { ...state.character.resources, actionPoints: { current: 5 } } } })),
    checkTerminalState: vi.fn((state) => state),
    decrementTerminalCountdown: vi.fn((state) => state),
    isGameOver: vi.fn(() => false),
    modifyMoney: vi.fn((state, currency, delta) => {
      const newState = deepClone(state);
      const key = currency.toLowerCase();
      newState.character.resources.money[key] += delta;
      return newState;
    }),
    modifyResource: vi.fn((state, resource, delta) => {
      const newState = deepClone(state);
      newState.character.resources[resource].current += delta;
      return newState;
    }),
    modifyAttribute: vi.fn((state, attr, delta) => {
      const newState = deepClone(state);
      newState.character.attributes[attr] += delta;
      return newState;
    }),
  },
}));

vi.mock('@/systems/event/EventSystem', () => ({
  EventSystem: {
    drawRandomEvent: vi.fn(() => null),
    processPendingChains: vi.fn((state) => state),
    markEventTriggered: vi.fn((state) => state),
    executeEvent: vi.fn((state) => state),
    getAvailableChoices: vi.fn(() => [{ id: 'opt1' }]),
  },
}));

vi.mock('@/systems/scene/SceneSystem', () => ({
  SceneSystem: {
    applyDebuffEffects: vi.fn((state) => state),
    updateDebuffs: vi.fn((state) => state),
    applyLivingExpenses: vi.fn((state) => state),
    transitionScene: vi.fn((state, sceneId) => ({ ...state, scene: { ...state.scene, currentScene: sceneId } })),
    addDebuff: vi.fn((state, debuff) => ({ ...state, scene: { ...state.scene, activeDebuffs: [...state.scene.activeDebuffs, debuff] } })),
  },
}));

vi.mock('@/systems/item/ItemSystem', () => ({
  ItemSystem: {
    addItem: vi.fn((state) => state),
    removeItem: vi.fn((state) => state),
    useConsumable: vi.fn((state) => state),
  },
}));

describe('GameStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.setState(useGameStore.getInitialState ? useGameStore.getInitialState() : {
      state: {
        meta: { version: '1.0.0' },
        character: {
          name: 'Player',
          resources: { money: { cny: 2000, usd: 0 }, health: { current: 100 }, mental: { current: 100 }, actionPoints: { current: 5 } },
          attributes: { physique: 10 }
        },
        scene: { currentScene: 'act1', turnCount: 0, sceneTurn: 0, activeDebuffs: [] },
        global: { statistics: { totalTurns: 0 } }
      }
    } as any);
  });

  describe('Game Flow Actions', () => {
    it('startNewGame should reset state', () => {
      const store = useGameStore.getState();
      store.startNewGame('NewPlayer');
      
      const state = useGameStore.getState().state;
      expect(state.character.name).toBe('NewPlayer');
      // The implementation calls CharacterSystem.createNewCharacter('Player') during createInitialState()
      // Then it sets character.name to 'NewPlayer'
      // So CharacterSystem.createNewCharacter is called with 'Player', not 'NewPlayer'
      expect(CharacterSystem.createNewCharacter).toHaveBeenCalledWith('Player');
    });

    it('endTurn should execute turn phases', () => {
      const store = useGameStore.getState();
      store.endTurn();
      
      expect(CharacterSystem.recoverActionPoints).toHaveBeenCalled();
      expect(SceneSystem.applyDebuffEffects).toHaveBeenCalled();
      expect(EventSystem.drawRandomEvent).toHaveBeenCalled();
      expect(SceneSystem.updateDebuffs).toHaveBeenCalled();
      expect(CharacterSystem.checkTerminalState).toHaveBeenCalled();
      expect(CharacterSystem.decrementTerminalCountdown).toHaveBeenCalled();
    });

    it('executeEvent should call System logic', () => {
      const store = useGameStore.getState();
      store.executeEvent('evt1', 'opt1');
      expect(EventSystem.executeEvent).toHaveBeenCalled();
    });

    it('confirmRandomEvent should clear pending event', () => {
      useGameStore.setState((prev: GameStore) => ({
        state: { ...prev.state, scene: { ...prev.state.scene, pendingRandomEvent: 'evt1' } }
      }));
      
      const store = useGameStore.getState();
      store.confirmRandomEvent();
      
      expect(useGameStore.getState().state.scene.pendingRandomEvent).toBeUndefined();
    });

    it('useConsumable should call System logic', () => {
      const store = useGameStore.getState();
      store.useConsumable('item1');
      expect(ItemSystem.useConsumable).toHaveBeenCalled();
    });
  });

  describe('Dev Tools Actions', () => {
    // Note: These tests assume we are not in PROD environment
    // Vitest runs in NODE_ENV='test', which is not PROD

    it('devSetMoney should modify money', () => {
      const store = useGameStore.getState();
      store.devSetMoney(5000, 'CNY');
      expect(CharacterSystem.modifyMoney).toHaveBeenCalledWith(expect.anything(), 'CNY', 3000); // 5000 - 2000 = 3000
    });

    it('devSetResource should modify resource', () => {
      const store = useGameStore.getState();
      store.devSetResource('health', 50);
      expect(CharacterSystem.modifyResource).toHaveBeenCalledWith(expect.anything(), 'health', -50); // 50 - 100 = -50
    });

    it('devSetAttribute should modify attribute', () => {
      const store = useGameStore.getState();
      store.devSetAttribute('physique', 15);
      expect(CharacterSystem.modifyAttribute).toHaveBeenCalledWith(expect.anything(), 'physique', 5); // 15 - 10 = 5
    });

    it('devTransitionScene should transition scene', () => {
      const store = useGameStore.getState();
      store.devTransitionScene('act2');
      expect(SceneSystem.transitionScene).toHaveBeenCalledWith(expect.anything(), 'act2', undefined);
    });

    it('devTriggerEvent should execute event', () => {
      const store = useGameStore.getState();
      
      // Need to mock getAvailableChoices if choiceId is not provided
      // But implementation calls EventSystem.getAvailableChoices(state, eventId)
      // We already mocked EventSystem.getAvailableChoices to return [{id: 'opt1'}]
      
      store.devTriggerEvent('evt1');
      // The implementation calls executeEvent internal action, which calls EventSystem.executeEvent
      // check if EventSystem.executeEvent was called
      expect(EventSystem.executeEvent).toHaveBeenCalledWith(
        expect.anything(), 
        'evt1', 
        'opt1', 
        undefined
      );
    });

    it('devAddItem should add item', () => {
      const store = useGameStore.getState();
      // Implementation uses count: number = 1 in arguments, but calls ItemSystem.addItem with count
      store.devAddItem('item1', 5);
      expect(ItemSystem.addItem).toHaveBeenCalledWith(expect.anything(), 'item1', 5);
    });

    it('devRemoveItem should remove item', () => {
      const store = useGameStore.getState();
      store.devRemoveItem('item1', 1);
      expect(ItemSystem.removeItem).toHaveBeenCalledWith(expect.anything(), 'item1', 1);
    });

    it('devAddDebuff should add debuff', () => {
      const store = useGameStore.getState();
      const debuff = { id: 'd1' } as any;
      store.devAddDebuff(debuff);
      expect(SceneSystem.addDebuff).toHaveBeenCalled();
    });

    it('devClearDebuffs should clear debuffs', () => {
      useGameStore.setState((prev: GameStore) => ({
        state: { ...prev.state, scene: { ...prev.state.scene, activeDebuffs: [{ id: 'd1' } as any] } }
      }));
      
      const store = useGameStore.getState();
      store.devClearDebuffs();
      
      expect(useGameStore.getState().state.scene.activeDebuffs).toHaveLength(0);
    });

    it('devSetGameOver should set game over', () => {
      const store = useGameStore.getState();
      store.devSetGameOver(true, 'ending1');
      
      const state = useGameStore.getState().state;
      expect(state.meta.isGameOver).toBe(true);
      expect(state.meta.endingId).toBe('ending1');
    });
  });

  describe('Persistence', () => {
    beforeEach(() => {
      localStorage.clear();
      vi.spyOn(Storage.prototype, 'setItem');
      vi.spyOn(Storage.prototype, 'getItem');
      vi.spyOn(Storage.prototype, 'removeItem');
    });

    it('saveGame should save to localStorage', () => {
      const store = useGameStore.getState();
      const saveId = store.saveGame();
      
      expect(saveId).toBeDefined();
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('loadGame should load state', () => {
      const store = useGameStore.getState();
      const saveData = {
        version: '1.0.0',
        savedAt: Date.now(),
        state: {
          ...store.state,
          character: { ...store.state.character, name: 'LoadedName' }
        }
      };
      
      store.loadGame(saveData as any);
      expect(useGameStore.getState().state.character.name).toBe('LoadedName');
    });

    it('loadFromStorage should load from localStorage', () => {
      const saveData = {
        version: '1.0.0',
        savedAt: Date.now(),
        state: createBaseState()
      };
      localStorage.setItem('save_123', JSON.stringify(saveData));
      
      const store = useGameStore.getState();
      const success = store.loadFromStorage('save_123');
      
      expect(success).toBe(true);
      expect(localStorage.getItem).toHaveBeenCalledWith('save_123');
    });

    it('getSaveList should return save keys', () => {
      localStorage.setItem('save_1', '{}');
      localStorage.setItem('save_2', '{}');
      localStorage.setItem('other_key', '{}');
      
      const store = useGameStore.getState();
      const list = store.getSaveList();
      
      expect(list).toContain('save_1');
      expect(list).toContain('save_2');
      expect(list).not.toContain('other_key');
    });

    it('deleteSave should remove from localStorage', () => {
      localStorage.setItem('save_1', '{}');
      const store = useGameStore.getState();
      store.deleteSave('save_1');
      expect(localStorage.removeItem).toHaveBeenCalledWith('save_1');
    });
  });
});

// Helper for persistence test
const createBaseState = () => ({
  meta: { version: '1.0.0' },
  character: { name: 'Test' }
});
