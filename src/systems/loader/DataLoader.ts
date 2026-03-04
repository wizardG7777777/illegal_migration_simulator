/**
 * DataLoader.ts
 * 
 * 数据加载系统 - 负责加载和管理游戏数据（事件和道具）
 * 
 * 使用单例模式确保整个应用只有一个 DataLoader 实例
 * 应用启动时调用 loadAll() 加载所有 JSON 数据
 * 提供各种 getter 方法供其他系统访问数据
 */

import type {
  GameEvent,
  EventCategory,
} from '../../types/event';

import type {
  AnyItem as Item,
  ConsumableItem,
  PermanentItem,
  BookItem,
  ItemCategory,
  ItemTag,
} from '../../types/item';

/** 事件数据文件结构 */
interface EventsDataFile {
  version: string;
  events: GameEvent[];
}

/** 道具数据文件结构 */
interface ItemsDataFile {
  version: string;
  items: Item[];
}

/**
 * DataLoader 类
 * 
 * 单例模式实现的数据加载器，负责：
 * 1. 从 public/data 目录加载所有 JSON 数据文件
 * 2. 缓存加载的数据到内存中
 * 3. 提供各种查询方法供其他系统使用
 * 
 * @example
 * ```typescript
 * // 应用启动时（如 main.tsx）
 * const loader = DataLoader.getInstance();
 * await loader.loadAll();
 * 
 * // 使用时
 * const event = loader.getEvent('act1_work_warehouse');
 * const act1Events = loader.getEventsByScene('act1');
 * ```
 */
export class DataLoader {
  private static instance: DataLoader;
  
  // 数据缓存 - 使用 Map 实现 O(1) 查找
  private events: Map<string, GameEvent> = new Map();
  private items: Map<string, Item> = new Map();
  private books: Map<string, BookItem> = new Map();
  
  // 加载状态
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;
  
  // 数据文件路径配置（相对于 public 目录）
  private readonly eventFiles = [
    '/data/events/act1.json',
    '/data/events/act2.json',
    '/data/events/act3.json',
    '/data/events/random.json',
  ];
  
  private readonly itemFiles = [
    '/data/items/consumables.json',
    '/data/items/permanents.json',
    '/data/items/books.json',
  ];

  /**
   * 私有构造函数 - 防止外部直接实例化
   * 请使用 DataLoader.getInstance() 获取单例
   */
  private constructor() {}

  /**
   * 获取 DataLoader 单例实例
   * @returns DataLoader 实例
   */
  public static getInstance(): DataLoader {
    if (!DataLoader.instance) {
      DataLoader.instance = new DataLoader();
    }
    return DataLoader.instance;
  }

  /**
   * 加载所有数据文件
   * 
   * 应用启动时调用一次。此方法会：
   * 1. 并行加载所有事件文件
   * 2. 并行加载所有道具文件
   * 3. 将数据缓存到内存中
   * 
   * @returns Promise<void>
   * @throws Error 当加载失败时抛出错误
   * 
   * @example
   * ```typescript
   * // 在应用入口处
   * try {
   *   await DataLoader.getInstance().loadAll();
   *   console.log('游戏数据加载完成');
   * } catch (error) {
   *   console.error('数据加载失败:', error);
   * }
   * ```
   */
  public async loadAll(): Promise<void> {
    // 如果已经在加载中，返回现有的 Promise（防止重复加载）
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // 如果已经加载完成，直接返回
    if (this.loaded) {
      return;
    }

    this.loadingPromise = this.doLoadAll();
    return this.loadingPromise;
  }

  /**
   * 实际执行加载逻辑
   * @private
   */
  private async doLoadAll(): Promise<void> {
    try {
      console.log('[DataLoader] 开始加载游戏数据...');

      // 并行加载所有数据文件以提高性能
      await Promise.all([
        this.loadAllEvents(),
        this.loadAllItems(),
      ]);

      this.loaded = true;
      console.log(
        `[DataLoader] 数据加载完成: ${this.events.size} 个事件, ` +
        `${this.items.size} 个道具（含 ${this.books.size} 本书籍）`
      );
    } catch (error) {
      console.error('[DataLoader] 数据加载失败:', error);
      throw new Error(
        `数据加载失败: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      this.loadingPromise = null;
    }
  }

  /**
   * 加载所有事件文件
   * @private
   */
  private async loadAllEvents(): Promise<void> {
    const loadPromises = this.eventFiles.map(filePath => 
      this.loadEventFile(filePath)
    );
    await Promise.all(loadPromises);
  }

  /**
   * 加载单个事件文件
   * @private
   * @param filePath 文件路径
   */
  private async loadEventFile(filePath: string): Promise<void> {
    try {
      const response = await fetch(filePath);
      
      if (!response.ok) {
        if (response.status === 404) {
          // 文件不存在时不报错，仅记录警告（某些文件可能暂未创建）
          console.warn(`[DataLoader] 事件文件不存在: ${filePath}`);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: EventsDataFile = await response.json();
      
      if (!data.events || !Array.isArray(data.events)) {
        console.warn(`[DataLoader] 事件文件格式错误（缺少 events 数组）: ${filePath}`);
        return;
      }

      // 将事件添加到缓存
      for (const event of data.events) {
        if (this.events.has(event.id)) {
          console.warn(
            `[DataLoader] 事件 ID 重复: ${event.id} (来自 ${filePath})，将被覆盖`
          );
        }
        this.events.set(event.id, event);
      }

      console.log(`[DataLoader] 已加载 ${data.events.length} 个事件: ${filePath}`);
    } catch (error) {
      console.error(`[DataLoader] 加载事件文件失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 加载所有道具文件
   * @private
   */
  private async loadAllItems(): Promise<void> {
    const loadPromises = this.itemFiles.map(filePath => 
      this.loadItemFile(filePath)
    );
    await Promise.all(loadPromises);
  }

  /**
   * 加载单个道具文件
   * @private
   * @param filePath 文件路径
   */
  private async loadItemFile(filePath: string): Promise<void> {
    try {
      const response = await fetch(filePath);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`[DataLoader] 道具文件不存在: ${filePath}`);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ItemsDataFile = await response.json();
      
      if (!data.items || !Array.isArray(data.items)) {
        console.warn(`[DataLoader] 道具文件格式错误（缺少 items 数组）: ${filePath}`);
        return;
      }

      // 将道具添加到缓存
      for (const item of data.items) {
        if (this.items.has(item.id)) {
          console.warn(
            `[DataLoader] 道具 ID 重复: ${item.id} (来自 ${filePath})，将被覆盖`
          );
        }
        this.items.set(item.id, item);

        // 如果是书籍，同时添加到书籍池
        if (item.category === 'CONSUMABLE' && 'subCategory' in item && item.subCategory === 'book') {
          this.books.set(item.id, item as BookItem);
        }
      }

      console.log(`[DataLoader] 已加载 ${data.items.length} 个道具: ${filePath}`);
    } catch (error) {
      console.error(`[DataLoader] 加载道具文件失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 检查是否已加载数据
   * @private
   * @throws Error 如果数据尚未加载
   */
  private ensureLoaded(): void {
    if (!this.loaded) {
      throw new Error(
        'DataLoader 尚未加载数据。请在应用启动时调用 loadAll()，' +
        '并等待其完成后再访问数据。'
      );
    }
  }

  // ============================================================
  // 事件数据访问方法
  // ============================================================

  /**
   * 获取单个事件
   * @param id 事件 ID
   * @returns 事件对象，如果不存在则返回 undefined
   * 
   * @example
   * ```typescript
   * const event = loader.getEvent('act1_work_warehouse');
   * if (event) {
   *   console.log(event.name); // "快递分拣夜班"
   * }
   * ```
   */
  public getEvent(id: string): GameEvent | undefined {
    this.ensureLoaded();
    return this.events.get(id);
  }

  /**
   * 获取所有事件
   * @returns 所有事件的数组
   */
  public getAllEvents(): GameEvent[] {
    this.ensureLoaded();
    return Array.from(this.events.values());
  }

  /**
   * 按场景获取事件
   * @param sceneId 场景 ID（如 'act1', 'act2', 'act3'）
   * @returns 该场景的事件数组
   * 
   * @example
   * ```typescript
   * const act1Events = loader.getEventsByScene('act1');
   * const workEvents = act1Events.filter(e => e.tags?.includes('work'));
   * ```
   */
  public getEventsByScene(sceneId: string): GameEvent[] {
    this.ensureLoaded();
    return this.getAllEvents().filter(event => 
      event.scenes.includes(sceneId as any)
    );
  }

  /**
   * 按分类获取事件
   * @param category 事件分类（RANDOM / FIXED / CHAIN / POLICY_PRESSURE）
   * @returns 该分类的事件数组
   */
  public getEventsByCategory(category: EventCategory): GameEvent[] {
    this.ensureLoaded();
    return this.getAllEvents().filter(event => event.category === category);
  }

  /**
   * 按标签获取事件
   * @param tag 事件标签
   * @returns 包含该标签的事件数组
   */
  public getEventsByTag(tag: string): GameEvent[] {
    this.ensureLoaded();
    return this.getAllEvents().filter(
      event => event.tags && event.tags.includes(tag as unknown as import('../../types/event').EventTag)
    );
  }

  /**
   * 搜索事件
   * 按 ID 或名称进行模糊匹配搜索（不区分大小写）
   * @param query 搜索关键词
   * @returns 匹配的事件数组
   * 
   * @example
   * ```typescript
   * // 搜索所有包含 "work" 的事件
   * const workEvents = loader.searchEvents('work');
   * 
   * // 搜索名称包含 "快递" 的事件
   * const kuaidiEvents = loader.searchEvents('快递');
   * ```
   */
  public searchEvents(query: string): GameEvent[] {
    this.ensureLoaded();
    const lowerQuery = query.toLowerCase();
    return this.getAllEvents().filter(
      event =>
        event.id.toLowerCase().includes(lowerQuery) ||
        event.name.toLowerCase().includes(lowerQuery)
    );
  }

  // ============================================================
  // 道具数据访问方法
  // ============================================================

  /**
   * 获取单个道具
   * @param id 道具 ID
   * @returns 道具对象，如果不存在则返回 undefined
   */
  public getItem(id: string): Item | undefined {
    this.ensureLoaded();
    return this.items.get(id);
  }

  /**
   * 获取所有道具
   * @returns 所有道具的数组
   */
  public getAllItems(): Item[] {
    this.ensureLoaded();
    return Array.from(this.items.values());
  }

  /**
   * 按标签获取常驻型道具
   * 主要用于事件槽位匹配，返回结果按优先级排序（数字越小越优先）
   * @param tag 道具标签
   * @returns 匹配该标签的常驻型道具数组（按优先级排序）
   * 
   * @example
   * ```typescript
   * // 获取所有交通工具
   * const vehicles = loader.getItemsByTag('transport');
   * // 优先级最高（数字最小）的道具排在第一位
   * const bestVehicle = vehicles[0];
   * ```
   */
  public getItemsByTag(tag: string): PermanentItem[] {
    this.ensureLoaded();
    const items = this.getAllItems().filter(
      (item): item is PermanentItem =>
        item.category === 'PERMANENT' && item.tags.includes(tag as ItemTag)
    );
    // 按优先级排序（数字越小优先级越高）
    return items.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 按分类获取道具
   * @param category 道具分类（CONSUMABLE / PERMANENT）
   * @returns 该分类的道具数组
   */
  public getItemsByCategory(category: ItemCategory): Item[] {
    this.ensureLoaded();
    return this.getAllItems().filter(item => item.category === category);
  }

  /**
   * 获取消耗品道具
   * @returns 所有消耗品道具
   */
  public getConsumables(): ConsumableItem[] {
    this.ensureLoaded();
    return this.getAllItems().filter(
      (item): item is ConsumableItem => item.category === 'CONSUMABLE'
    );
  }

  /**
   * 获取常驻型道具
   * @returns 所有常驻型道具
   */
  public getPermanents(): PermanentItem[] {
    this.ensureLoaded();
    return this.getAllItems().filter(
      (item): item is PermanentItem => item.category === 'PERMANENT'
    );
  }

  // ============================================================
  // 书籍池方法
  // ============================================================

  /**
   * 获取全局书籍池（场景间共享）
   * @returns 所有可用书籍的数组
   * 
   * @example
   * ```typescript
   * const allBooks = loader.getBookPool();
   * const englishBooks = allBooks.filter(b => b.tags.includes('english'));
   * ```
   */
  public getBookPool(): BookItem[] {
    this.ensureLoaded();
    return Array.from(this.books.values());
  }

  /**
   * 从池中随机抽取一本书
   * @returns 随机抽取的书籍，如果池为空则返回 null
   * 
   * @example
   * ```typescript
   * const randomBook = loader.drawRandomBook();
   * if (randomBook) {
   *   console.log(`你获得了一本书：${randomBook.name}`);
   * }
   * ```
   */
  public drawRandomBook(): BookItem | null {
    this.ensureLoaded();
    const books = this.getBookPool();
    if (books.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * books.length);
    return books[randomIndex];
  }

  /**
   * 根据稀有度抽取书籍
   * @param rarity 目标稀有度（COMMON / RARE / EPIC）
   * @returns 符合条件的随机书籍，如果没有则返回 null
   * 
   * @example
   * ```typescript
   * const rareBook = loader.drawBookByRarity('RARE');
   * const epicBook = loader.drawBookByRarity('EPIC');
   * ```
   */
  public drawBookByRarity(rarity: BookItem['rarity']): BookItem | null {
    this.ensureLoaded();
    const books = this.getBookPool().filter(book => book.rarity === rarity);
    if (books.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * books.length);
    return books[randomIndex];
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /**
   * 检查数据是否已加载
   * @returns 是否已加载完成
   */
  public isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * 获取已加载的事件数量
   * @returns 事件数量
   */
  public getEventCount(): number {
    return this.events.size;
  }

  /**
   * 获取已加载的道具数量
   * @returns 道具数量
   */
  public getItemCount(): number {
    return this.items.size;
  }

  /**
   * 获取已加载的书籍数量
   * @returns 书籍数量
   */
  public getBookCount(): number {
    return this.books.size;
  }

  /**
   * 清空所有缓存的数据
   * 主要用于测试或需要重新加载数据的场景
   */
  public clearCache(): void {
    this.events.clear();
    this.items.clear();
    this.books.clear();
    this.loaded = false;
    console.log('[DataLoader] 缓存已清空');
  }

  /**
   * 重新加载所有数据
   * 清空缓存后重新加载，可用于热重载
   * 
   * @example
   * ```typescript
   * // 在开发工具中用于热重载
   * await loader.reload();
   * console.log('数据已重新加载');
   * ```
   */
  public async reload(): Promise<void> {
    this.clearCache();
    await this.loadAll();
  }
}

// ============================================================
// 便捷导出 - 单例实例
// ============================================================

/**
 * DataLoader 单例实例
 * 用于直接访问，但请先调用 loadAll()
 * 
 * @example
 * ```typescript
 * import { dataLoader } from './DataLoader';
 * 
 * // 应用启动时
 * await dataLoader.loadAll();
 * 
 * // 使用时
 * const event = dataLoader.getEvent('act1_work_warehouse');
 * const allItems = dataLoader.getAllItems();
 * ```
 */
export const dataLoader = DataLoader.getInstance();

export default DataLoader;
