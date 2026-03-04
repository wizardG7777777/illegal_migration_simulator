import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataLoader } from '../../../../src/systems/loader/DataLoader';
import type { GameState } from '../../../../src/types/game';

describe('DataLoader System', () => {
  // Mock data
  const mockAct1Events = {
    version: '1.0',
    events: [
      {
        id: 'act1_work_test',
        name: 'Test Work',
        category: 'FIXED',
        scenes: ['act1'],
        tags: ['work'],
        description: 'A test work event',
        execution: { repeatable: true, actionPointCost: 1 }
      }
    ]
  };

  const mockRandomEvents = {
    version: '1.0',
    events: [
      {
        id: 'rand_storm',
        name: 'Storm',
        category: 'RANDOM',
        scenes: ['act1', 'act2'],
        tags: ['weather'],
        description: 'A storm is coming',
        trigger: { weight: 10 }
      }
    ]
  };

  const mockConsumables = {
    version: '1.0',
    items: [
      {
        id: 'food_bread',
        name: 'Bread',
        category: 'CONSUMABLE',
        subCategory: 'food',
        maxStack: 10,
        useTarget: 'self',
        tags: ['food'],
        priority: 5,
        effects: { healthRestore: 5 }
      }
    ]
  };

  const mockBooks = {
    version: '1.0',
    items: [
      {
        id: 'book_english',
        name: 'English Book',
        category: 'CONSUMABLE',
        subCategory: 'book',
        bookId: 'book_001',
        rarity: 'COMMON',
        maxStack: 1,
        useTarget: 'event',
        tags: ['book'],
        priority: 5
      },
      {
        id: 'book_rare',
        name: 'Rare Book',
        category: 'CONSUMABLE',
        subCategory: 'book',
        bookId: 'book_002',
        rarity: 'RARE',
        maxStack: 1,
        useTarget: 'event',
        tags: ['book'],
        priority: 5
      }
    ]
  };

  // Setup fetch mock
  const fetchMock = vi.fn();
  global.fetch = fetchMock;

  beforeEach(() => {
    // Reset singleton state
    DataLoader.getInstance().clearCache();
    fetchMock.mockReset();

    // Default mock implementation
    fetchMock.mockImplementation((url: string) => {
      let body = { version: '1.0', events: [], items: [] };
      
      if (url.includes('act1.json')) body = mockAct1Events as any;
      else if (url.includes('random.json')) body = mockRandomEvents as any;
      else if (url.includes('consumables.json')) body = mockConsumables as any;
      else if (url.includes('books.json')) body = mockBooks as any;
      
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(body)
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DataLoader.getInstance();
      const instance2 = DataLoader.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Data Loading', () => {
    it('should load all data successfully', async () => {
      const loader = DataLoader.getInstance();
      await loader.loadAll();

      expect(loader.isLoaded()).toBe(true);
      expect(loader.getEventCount()).toBeGreaterThan(0);
      expect(loader.getItemCount()).toBeGreaterThan(0);
      expect(loader.getBookCount()).toBeGreaterThan(0);
    });

    it('should handle 404 gracefully', async () => {
      fetchMock.mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        })
      );

      const loader = DataLoader.getInstance();
      // Should not throw, just log warning
      await expect(loader.loadAll()).resolves.not.toThrow();
    });

    it('should throw on network error', async () => {
      fetchMock.mockImplementationOnce(() => 
        Promise.reject(new Error('Network Error'))
      );

      const loader = DataLoader.getInstance();
      await expect(loader.loadAll()).rejects.toThrow('Network Error');
    });
  });

  describe('Event Retrieval', () => {
    let loader: DataLoader;

    beforeEach(async () => {
      loader = DataLoader.getInstance();
      await loader.loadAll();
    });

    it('should get event by ID', () => {
      const event = loader.getEvent('act1_work_test');
      expect(event).toBeDefined();
      expect(event?.name).toBe('Test Work');
    });

    it('should return undefined for non-existent event', () => {
      const event = loader.getEvent('non_existent');
      expect(event).toBeUndefined();
    });

    it('should get events by scene', () => {
      const act1Events = loader.getEventsByScene('act1');
      expect(act1Events.length).toBeGreaterThan(0);
      expect(act1Events.some(e => e.id === 'act1_work_test')).toBe(true);
      expect(act1Events.some(e => e.id === 'rand_storm')).toBe(true); // Shared scene
    });

    it('should get events by category', () => {
      const randomEvents = loader.getEventsByCategory('RANDOM');
      expect(randomEvents.length).toBe(1);
      expect(randomEvents[0].id).toBe('rand_storm');
    });

    it('should search events', () => {
      const results = loader.searchEvents('storm');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Storm');
    });
  });

  describe('Item Retrieval', () => {
    let loader: DataLoader;

    beforeEach(async () => {
      loader = DataLoader.getInstance();
      await loader.loadAll();
    });

    it('should get item by ID', () => {
      const item = loader.getItem('food_bread');
      expect(item).toBeDefined();
      expect(item?.name).toBe('Bread');
    });

    it('should get consumables', () => {
      const consumables = loader.getConsumables();
      expect(consumables.some(i => i.id === 'food_bread')).toBe(true);
    });

    it('should get items by tag', () => {
      const foodItems = loader.getItemsByCategory('CONSUMABLE').filter(i => i.tags.includes('food'));
      expect(foodItems.length).toBeGreaterThan(0);
    });
  });

  describe('Book System', () => {
    let loader: DataLoader;

    beforeEach(async () => {
      loader = DataLoader.getInstance();
      await loader.loadAll();
    });

    it('should get book pool', () => {
      const pool = loader.getBookPool();
      expect(pool.length).toBe(2);
    });

    it('should draw random book', () => {
      const book = loader.drawRandomBook();
      expect(book).toBeDefined();
      expect(['book_english', 'book_rare']).toContain(book?.id);
    });

    it('should draw book by rarity', () => {
      const rareBook = loader.drawBookByRarity('RARE');
      expect(rareBook).toBeDefined();
      expect(rareBook?.id).toBe('book_rare');
      expect(rareBook?.rarity).toBe('RARE');
    });

    it('should return null for non-existent rarity', () => {
      const epicBook = loader.drawBookByRarity('EPIC' as any); // Type cast for test
      expect(epicBook).toBeNull();
    });
  });
});

describe('GameState Type Integrity', () => {
  it('should allow creating a valid GameState object', () => {
    // This test mainly checks if the GameState interface can be satisfied
    // It serves as documentation and a sanity check for the type definition
    const validState: GameState = {
      meta: {
        version: '1.0.0',
        createdAt: Date.now(),
        lastSavedAt: Date.now(),
        totalPlayTime: 0,
        isGameOver: false
      },
      character: {
        id: 'char_1',
        name: 'Test Character',
        attributes: {
          physique: 10,
          intelligence: 10,
          english: 5,
          social: 5,
          riskAwareness: 5,
          survival: 5
        },
        resources: {
          health: { current: 100, max: 100 },
          mental: { current: 100, max: 100 },
          money: { cny: 1000, usd: 0 },
          actionPoints: { current: 3, max: 5, min: 0 }
        },
        status: {
          terminalState: null,
          terminalCountdown: 0,
          flags: {}
        }
      },
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
        activeDebuffs: []
      },
      inventory: {
        consumables: [],
        permanents: [],
        booksRead: []
      },
      event: {
        triggeredEvents: {},
        lastTriggeredTurn: {},
        completedEvents: {},
        activeChains: []
      },
      global: {
        bookPool: [],
        statistics: {
          totalTurns: 0,
          totalEventsTriggered: 0,
          totalWorkSessions: 0,
          deathCount: 0,
          completionCount: 0,
          unlockedEndings: []
        }
      }
    };

    expect(validState).toBeDefined();
    expect(validState.meta.version).toBe('1.0.0');
  });
});
