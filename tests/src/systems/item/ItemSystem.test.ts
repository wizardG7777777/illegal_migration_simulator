import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ItemSystem } from '../../../../src/systems/item/ItemSystem';
import { dataLoader } from '../../../../src/systems/loader/DataLoader';
import type { GameState, ItemSlot, ConsumableItem, PermanentItem, BookItem } from '../../../../src/types';

// Mock DataLoader
vi.mock('../../../../src/systems/loader/DataLoader', () => ({
  dataLoader: {
    getItem: vi.fn(),
    drawRandomBook: vi.fn(),
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
    },
  },
  scene: {
    currentScene: 'act1',
    turnCount: 0,
    sceneTurn: 0,
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
});

describe('ItemSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addItem', () => {
    it('should add consumable item', () => {
      const state = createBaseState();
      const mockItem: ConsumableItem = {
        id: 'food',
        name: 'Food',
        description: 'A food item',
        category: 'CONSUMABLE',
        subCategory: 'food',
        maxStack: 10,
        useTarget: 'self',
        tags: [],
        priority: 0,
        effects: { healthRestore: 5 },
      };
      
      vi.mocked(dataLoader.getItem).mockReturnValue(mockItem);

      const newState = ItemSystem.addItem(state, 'food', 5);
      
      expect(newState.inventory.consumables).toHaveLength(1);
      expect(newState.inventory.consumables[0]).toEqual({ itemId: 'food', count: 5 });
    });

    it('should stack consumable item up to maxStack', () => {
      const state = createBaseState();
      state.inventory.consumables.push({ itemId: 'food', count: 8 });
      
      const mockItem: ConsumableItem = {
        id: 'food',
        name: 'Food',
        description: 'A food item',
        category: 'CONSUMABLE',
        subCategory: 'food',
        maxStack: 10, // Max stack is 10
        useTarget: 'self',
        tags: [],
        priority: 0,
        effects: {},
      };
      
      vi.mocked(dataLoader.getItem).mockReturnValue(mockItem);

      // Add 5 more, should cap at 10
      const newState = ItemSystem.addItem(state, 'food', 5);
      
      expect(newState.inventory.consumables[0].count).toBe(10);
    });

    it('should add permanent item', () => {
      const state = createBaseState();
      const mockItem: PermanentItem = {
        id: 'bike',
        name: 'Bike',
        description: 'A bike',
        category: 'PERMANENT',
        tags: ['transport'],
        priority: 1,
        canBeDeleted: true,
        slotEffects: {},
      };
      
      vi.mocked(dataLoader.getItem).mockReturnValue(mockItem);

      const newState = ItemSystem.addItem(state, 'bike');
      
      expect(newState.inventory.permanents).toHaveLength(1);
      expect(newState.inventory.permanents[0]).toEqual({ itemId: 'bike', slot: 0 });
    });

    it('should throw error if item not found', () => {
      const state = createBaseState();
      vi.mocked(dataLoader.getItem).mockReturnValue(undefined);
      
      expect(() => ItemSystem.addItem(state, 'unknown')).toThrow('物品不存在');
    });
  });

  describe('removeItem', () => {
    it('should remove consumable item', () => {
      const state = createBaseState();
      state.inventory.consumables.push({ itemId: 'food', count: 5 });
      
      const mockItem: ConsumableItem = {
        id: 'food',
        name: 'Food',
        description: 'A food item',
        category: 'CONSUMABLE',
        subCategory: 'food',
        maxStack: 10,
        useTarget: 'self',
        tags: [],
        priority: 0,
        effects: {},
      };
      
      vi.mocked(dataLoader.getItem).mockReturnValue(mockItem);

      const newState = ItemSystem.removeItem(state, 'food', 2);
      expect(newState.inventory.consumables[0].count).toBe(3);
    });

    it('should remove consumable item completely if count reaches 0', () => {
      const state = createBaseState();
      state.inventory.consumables.push({ itemId: 'food', count: 5 });
      
      const mockItem: ConsumableItem = {
        id: 'food',
        name: 'Food',
        description: 'A food item',
        category: 'CONSUMABLE',
        subCategory: 'food',
        maxStack: 10,
        useTarget: 'self',
        tags: [],
        priority: 0,
        effects: {},
      };
      
      vi.mocked(dataLoader.getItem).mockReturnValue(mockItem);

      const newState = ItemSystem.removeItem(state, 'food', 5);
      expect(newState.inventory.consumables).toHaveLength(0);
    });

    it('should throw error if not enough consumables', () => {
      const state = createBaseState();
      state.inventory.consumables.push({ itemId: 'food', count: 2 });
      
      const mockItem: ConsumableItem = {
        id: 'food',
        name: 'Food',
        description: 'A food item',
        category: 'CONSUMABLE',
        subCategory: 'food',
        maxStack: 10,
        useTarget: 'self',
        tags: [],
        priority: 0,
        effects: {},
      };
      
      vi.mocked(dataLoader.getItem).mockReturnValue(mockItem);

      expect(() => ItemSystem.removeItem(state, 'food', 5)).toThrow('数量不足');
    });
  });

  describe('useConsumable', () => {
    it('should apply effects and remove item', () => {
      const state = createBaseState();
      state.inventory.consumables.push({ itemId: 'painkiller', count: 1 });
      state.character.resources.health.current = 50;
      
      const mockItem: ConsumableItem = {
        id: 'painkiller',
        name: 'Painkiller',
        description: 'Painkiller',
        category: 'CONSUMABLE',
        subCategory: 'medical',
        maxStack: 10,
        useTarget: 'self',
        tags: [],
        priority: 0,
        effects: {
          healthRestore: 20,
          mentalRestore: 5,
        },
      };
      
      vi.mocked(dataLoader.getItem).mockReturnValue(mockItem);

      const newState = ItemSystem.useConsumable(state, 'painkiller');
      
      expect(newState.character.resources.health.current).toBe(70);
      expect(newState.character.resources.mental.current).toBe(100); // Clamped
      expect(newState.inventory.consumables).toHaveLength(0);
    });
  });

  describe('getMatchingItems', () => {
    it('should return matching items sorted by priority', () => {
      const state = createBaseState();
      state.inventory.permanents.push(
        { itemId: 'bike', slot: 0 },
        { itemId: 'car', slot: 1 }
      );
      
      const bike: PermanentItem = {
        id: 'bike',
        name: 'Bike',
        description: 'A bike',
        category: 'PERMANENT',
        tags: ['transport'],
        priority: 3,
        canBeDeleted: true,
        slotEffects: {},
      };
      
      const car: PermanentItem = {
        id: 'car',
        name: 'Car',
        description: 'A car',
        category: 'PERMANENT',
        tags: ['transport'],
        priority: 1, // Higher priority (lower number)
        canBeDeleted: true,
        slotEffects: {},
      };
      
      vi.mocked(dataLoader.getItem)
        .mockImplementation((id) => {
          if (id === 'bike') return bike;
          if (id === 'car') return car;
          return undefined;
        });

      const slot: ItemSlot = {
        id: 'transport',
        name: 'Transport',
        tags: ['transport'],
        required: false,
        description: 'Transport slot',
      };

      const matches = ItemSystem.getMatchingItems(state, slot);
      
      expect(matches).toHaveLength(2);
      expect(matches[0].id).toBe('car'); // Priority 1
      expect(matches[1].id).toBe('bike'); // Priority 3
    });
  });

  describe('drawRandomBook', () => {
    it('should draw a book and add it to inventory', () => {
      const state = createBaseState();
      
      const mockBook: BookItem = {
        id: 'book1',
        name: 'Book 1',
        description: 'A book',
        category: 'CONSUMABLE',
        subCategory: 'book',
        bookId: 'b1',
        rarity: 'COMMON',
        maxStack: 1,
        useTarget: 'event',
        tags: ['book'],
        priority: 5,
        effects: {},
      };
      
      vi.mocked(dataLoader.drawRandomBook).mockReturnValue(mockBook);
      vi.mocked(dataLoader.getItem).mockReturnValue(mockBook); // Need this for addItem internal check

      const newState = ItemSystem.drawRandomBook(state);
      
      expect(newState.inventory.consumables).toHaveLength(1);
      expect(newState.inventory.consumables[0].itemId).toBe('book1');
    });

    it('should throw error if book pool is empty', () => {
      const state = createBaseState();
      vi.mocked(dataLoader.drawRandomBook).mockReturnValue(null);
      
      expect(() => ItemSystem.drawRandomBook(state)).toThrow('全局书籍池为空');
    });
  });
});
