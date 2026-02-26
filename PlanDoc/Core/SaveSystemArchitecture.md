# 存档系统架构设计

## 1. 概述

本文档定义《去美国》游戏的存档系统架构，包含存档数据结构、槽位管理、自动保存、版本迁移、存储适配器、React集成等核心模块的技术实现规范。

**核心设计原则**：
- **可靠性优先**：确保存档数据不丢失、不损坏
- **浏览器兼容**：考虑 localStorage 5MB 限制，支持压缩和分片存储
- **版本兼容**：支持存档版本迁移，确保游戏更新后旧存档可用
- **存储抽象**：通过适配器模式支持 localStorage/IndexedDB/云端切换
- **用户体验**：自动保存 + 手动存档槽位，导入/导出功能

---

## 2. 核心数据类型

### 2.1 存档数据接口

```typescript
/**
 * 完整存档数据（用于手动存档槽位）
 */
interface SaveData {
  // 存档元数据
  metadata: SaveMetadata;
  
  // 游戏状态数据
  gameState: GameState;
  
  // 统计数据（用于成就和回顾）
  statistics: GameStatistics;
}

/**
 * 存档元数据（用于UI展示和存档管理）
 */
interface SaveMetadata {
  // 基础信息
  id: string;                    // 存档唯一ID（UUID）
  slotIndex?: number;            // 槽位索引（手动存档时有效）
  isAutoSave: boolean;           // 是否为自动存档
  
  // 时间信息
  createdAt: number;             // 创建时间戳
  lastSavedAt: number;           // 最后保存时间戳
  totalPlayTime: number;         // 累计游戏时长（毫秒）
  
  // 游戏进度信息（用于UI预览）
  preview: SavePreview;
  
  // 版本信息
  version: SaveVersion;
}

/**
 * 存档预览信息（用于存档列表UI展示）
 */
interface SavePreview {
  // 角色信息
  characterName: string;         // 角色名
  
  // 进度信息
  currentScene: SceneId;         // 当前场景
  sceneDisplayName: string;      // 场景显示名称
  totalTurns: number;            // 总回合数
  sceneTurns: number;            // 当前场景回合数
  
  // 资源快照
  resources: {
    health: number;              // 身体健康度（0-100）
    mental: number;              // 心理健康度（0-100）
    money: number;               // 当前货币数量
    currency: 'CNY' | 'USD';     // 货币类型
  };
  
  // 关键状态
  keyStatus: {
    hasTerminalState: boolean;   // 是否处于终结态
    terminalStateType?: 'DYING' | 'BREAKDOWN' | 'DESTITUTION';
    activeChainCount: number;    // 进行中的事件链数量
  };
  
  // 缩略信息（用于快速识别）
  thumbnailText: string;         // 一句话描述（如"场景2第5回合，带伤前行"）
}

/**
 * 存档版本信息（用于兼容性检查）
 */
interface SaveVersion {
  dataVersion: number;           // 存档数据格式版本（当前为1）
  gameVersion: string;           // 游戏版本号（如"1.0.2"）
  migrationHistory: string[];    // 已应用的迁移脚本ID列表
}
```

### 2.2 游戏状态数据

```typescript
/**
 * 完整游戏状态（序列化后存储）
 */
interface GameState {
  // 角色核心数据
  character: CharacterSaveData;
  
  // 场景状态
  scene: SceneSaveData;
  
  // 物品系统状态
  inventory: InventorySaveData;
  
  // 事件系统状态
  events: EventSaveData;
  
  // 环境状态
  environment: EnvironmentSaveData;
}

/**
 * 角色存档数据（精简版，从 CharacterSystemArchitecture.md 导出）
 */
interface CharacterSaveData {
  id: string;
  name: string;
  creationTime: number;
  
  // 六大属性
  attributes: {
    physique: number;
    intelligence: number;
    english: number;
    social: number;
    riskAwareness: number;
    survival: number;
  };
  
  // 资源状态
  resources: {
    health: { current: number; max: number };
    mental: { current: number; max: number };
    money: { cny: number; usd: number };
    actionPoints: { current: number; max: number; baseRecovery: number };
  };
  
  // 状态
  status: {
    currentScene: SceneId;
    environmentalDebuffs: EnvironmentalDebuff[];
    temporaryEffects: TemporaryEffect[];
    persistentConditions: PersistentCondition[];
    turnCount: { total: number; inCurrentScene: number };
  };
  
  // 终结态
  terminalState: TerminalState | null;
  
  // 成长进度
  progression: {
    attributeGrowth: Record<string, AttributeGrowthRecord>;
    achievements: string[];
  };
}

/**
 * 场景存档数据
 */
interface SceneSaveData {
  currentScene: SceneId;
  sceneStates: Record<SceneId, SceneRuntimeSaveData>;
}

/**
 * 场景运行时数据（精简版）
 */
interface SceneRuntimeSaveData {
  sceneId: SceneId;
  turnCount: number;
  sceneState: any;                    // 场景特定状态（Act1State/Act2State/Act3State）
  triggeredEvents: string[];          // 已触发事件ID列表
  completedEvents: string[];          // 已完成事件ID列表
  activeChains: ChainProgress[];      // 进行中的事件链
  transitionProgress: Record<string, TransitionProgress>; // 场景切换进度
}

/**
 * 环境状态存档
 */
interface EnvironmentSaveData {
  // 环境Debuff列表
  debuffs: EnvironmentalDebuff[];
  
  // 通胀状态（场景3）
  inflationState?: {
    foodRate: number;
    lodgingRate: number;
    transportRate: number;
  };
  
  // 其他全局环境变量
  globalFlags: Record<string, boolean>;
}
```

### 2.3 存档槽位系统

```typescript
/**
 * 存档槽位配置
 */
interface SaveSlotConfig {
  // 手动存档槽位数量
  manualSlotCount: number;       // 默认 5
  
  // 自动存档配置
  autoSave: {
    enabled: boolean;            // 是否启用
    slotCount: number;           // 自动存档槽位数（建议 1-3）
    rotationStrategy: 'FIFO' | 'KEEP_LATEST';  // 轮换策略
  };
  
  // 云存档配置（预留）
  cloudSave?: {
    enabled: boolean;
    slotCount: number;
  };
}

/**
 * 存档槽位信息（存储在 localStorage 的索引中）
 */
interface SaveSlotInfo {
  slotIndex: number;             // 槽位索引（0-4为手动，5+为自动）
  slotType: 'MANUAL' | 'AUTO' | 'CLOUD';
  saveId: string | null;         // 关联的存档ID
  lastModified: number | null;   // 最后修改时间
  isEmpty: boolean;              // 是否为空槽位
}

/**
 * 存档索引（存储在单独的 localStorage key 中）
 */
interface SaveIndex {
  version: number;               // 索引格式版本
  lastSlotIndex: number;         // 上次使用的槽位
  slots: SaveSlotInfo[];         // 槽位列表
  quickSaveId?: string;          // 快速存档ID（如果有）
}
```

---

## 3. 存储适配器架构

### 3.1 存储适配器接口

```typescript
/**
 * 存储适配器接口
 * 支持 localStorage、IndexedDB、云端存储等多种后端
 */
interface IStorageAdapter {
  readonly name: string;
  readonly isAvailable: boolean;
  
  /**
   * 保存存档数据
   * @returns 是否成功，失败时返回错误信息
   */
  save(key: string, data: SaveData): Promise<SaveResult>;
  
  /**
   * 读取存档数据
   */
  load(key: string): Promise<SaveData | null>;
  
  /**
   * 删除存档
   */
  delete(key: string): Promise<boolean>;
  
  /**
   * 列出所有存档键
   */
  list(): Promise<string[]>;
  
  /**
   * 获取存储空间使用情况
   */
  getStorageInfo(): Promise<StorageInfo>;
  
  /**
   * 检查是否存在
   */
  exists(key: string): Promise<boolean>;
}

/**
 * 保存结果
 */
interface SaveResult {
  success: boolean;
  error?: StorageError;
  bytesWritten?: number;
}

/**
 * 存储错误
 */
interface StorageError {
  code: 'QUOTA_EXCEEDED' | 'WRITE_FAILED' | 'READ_FAILED' | 'CORRUPTED_DATA' | 'NOT_FOUND';
  message: string;
  details?: any;
}

/**
 * 存储空间信息
 */
interface StorageInfo {
  used: number;                  // 已使用字节
  available: number;             // 可用字节（估算）
  total: number;                 // 总容量
}
```

### 3.2 LocalStorage 适配器

```typescript
/**
 * LocalStorage 适配器实现
 * 考虑 5MB 限制，支持压缩和分片存储
 */
class LocalStorageAdapter implements IStorageAdapter {
  readonly name = 'localStorage';
  private readonly KEY_PREFIX = 'go_usa_save_';
  private readonly INDEX_KEY = 'go_usa_save_index';
  private readonly MAX_CHUNK_SIZE = 1024 * 1024; // 1MB 每片（预留余量）
  
  get isAvailable(): boolean {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 保存存档数据（支持自动压缩和分片）
   */
  async save(key: string, data: SaveData): Promise<SaveResult> {
    try {
      // 1. 序列化
      const serialized = JSON.stringify(data);
      
      // 2. 压缩（如果数据较大）
      let dataToStore: string;
      let isCompressed = false;
      
      if (serialized.length > 100 * 1024) { // 超过100KB则压缩
        dataToStore = await this.compress(serialized);
        isCompressed = true;
      } else {
        dataToStore = serialized;
      }
      
      // 3. 检查是否需要分片
      if (dataToStore.length > this.MAX_CHUNK_SIZE) {
        return await this.saveChunked(key, dataToStore, isCompressed);
      }
      
      // 4. 直接存储
      const storageKey = this.KEY_PREFIX + key;
      const wrapped = JSON.stringify({
        version: 1,
        compressed: isCompressed,
        data: dataToStore,
        timestamp: Date.now()
      });
      
      localStorage.setItem(storageKey, wrapped);
      
      // 5. 更新索引
      await this.updateIndex(key, data.metadata);
      
      return { success: true, bytesWritten: wrapped.length };
      
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        return {
          success: false,
          error: { code: 'QUOTA_EXCEEDED', message: '存储空间已满', details: error }
        };
      }
      return {
        success: false,
        error: { code: 'WRITE_FAILED', message: '写入失败', details: error }
      };
    }
  }
  
  /**
   * 分片存储（大存档）
   */
  private async saveChunked(
    key: string, 
    data: string, 
    isCompressed: boolean
  ): Promise<SaveResult> {
    const chunks: string[] = [];
    for (let i = 0; i < data.length; i += this.MAX_CHUNK_SIZE) {
      chunks.push(data.slice(i, i + this.MAX_CHUNK_SIZE));
    }
    
    // 存储分片
    for (let i = 0; i < chunks.length; i++) {
      const chunkKey = `${this.KEY_PREFIX}${key}_chunk_${i}`;
      localStorage.setItem(chunkKey, chunks[i]);
    }
    
    // 存储元数据（包含分片信息）
    const metaKey = `${this.KEY_PREFIX}${key}`;
    const meta = JSON.stringify({
      version: 1,
      compressed: isCompressed,
      chunked: true,
      chunkCount: chunks.length,
      timestamp: Date.now()
    });
    localStorage.setItem(metaKey, meta);
    
    return { success: true, bytesWritten: data.length };
  }
  
  /**
   * 读取存档数据
   */
  async load(key: string): Promise<SaveData | null> {
    try {
      const storageKey = this.KEY_PREFIX + key;
      const wrapped = localStorage.getItem(storageKey);
      
      if (!wrapped) return null;
      
      const meta = JSON.parse(wrapped);
      
      let dataStr: string;
      
      if (meta.chunked) {
        // 读取分片
        const chunks: string[] = [];
        for (let i = 0; i < meta.chunkCount; i++) {
          const chunk = localStorage.getItem(`${storageKey}_chunk_${i}`);
          if (!chunk) throw new Error('分片丢失');
          chunks.push(chunk);
        }
        dataStr = chunks.join('');
      } else {
        dataStr = meta.data;
      }
      
      // 解压（如果需要）
      if (meta.compressed) {
        dataStr = await this.decompress(dataStr);
      }
      
      return JSON.parse(dataStr);
      
    } catch (error) {
      console.error('读取存档失败:', error);
      return null;
    }
  }
  
  /**
   * 删除存档（包括分片）
   */
  async delete(key: string): Promise<boolean> {
    try {
      const storageKey = this.KEY_PREFIX + key;
      const wrapped = localStorage.getItem(storageKey);
      
      if (!wrapped) return false;
      
      const meta = JSON.parse(wrapped);
      
      // 删除分片
      if (meta.chunked) {
        for (let i = 0; i < meta.chunkCount; i++) {
          localStorage.removeItem(`${storageKey}_chunk_${i}`);
        }
      }
      
      // 删除主记录
      localStorage.removeItem(storageKey);
      
      // 更新索引
      await this.removeFromIndex(key);
      
      return true;
      
    } catch {
      return false;
    }
  }
  
  /**
   * 压缩数据（使用 LZ-String 或类似库）
   */
  private async compress(data: string): Promise<string> {
    // 实际项目中使用 lz-string 库
    // return LZString.compressToUTF16(data);
    return data; // 占位实现
  }
  
  /**
   * 解压数据
   */
  private async decompress(data: string): Promise<string> {
    // return LZString.decompressFromUTF16(data);
    return data; // 占位实现
  }
  
  // ... 其他方法实现
  
  async list(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.KEY_PREFIX) && !key.includes('_chunk_')) {
        keys.push(key.slice(this.KEY_PREFIX.length));
      }
    }
    return keys;
  }
  
  async getStorageInfo(): Promise<StorageInfo> {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        used += localStorage.getItem(key)?.length || 0;
      }
    }
    
    // localStorage 通常为 5-10MB
    const total = 5 * 1024 * 1024;
    
    return {
      used,
      available: total - used,
      total
    };
  }
  
  async exists(key: string): Promise<boolean> {
    return localStorage.getItem(this.KEY_PREFIX + key) !== null;
  }
  
  private async updateIndex(saveId: string, metadata: SaveMetadata): Promise<void> {
    const index = await this.loadIndex();
    const slotInfo = index.slots.find(s => s.saveId === saveId);
    if (slotInfo) {
      slotInfo.lastModified = metadata.lastSavedAt;
      slotInfo.isEmpty = false;
    }
    localStorage.setItem(this.INDEX_KEY, JSON.stringify(index));
  }
  
  private async removeFromIndex(saveId: string): Promise<void> {
    const index = await this.loadIndex();
    const slotInfo = index.slots.find(s => s.saveId === saveId);
    if (slotInfo) {
      slotInfo.saveId = null;
      slotInfo.lastModified = null;
      slotInfo.isEmpty = true;
    }
    localStorage.setItem(this.INDEX_KEY, JSON.stringify(index));
  }
  
  private async loadIndex(): Promise<SaveIndex> {
    const raw = localStorage.getItem(this.INDEX_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    // 创建默认索引
    return this.createDefaultIndex();
  }
  
  private createDefaultIndex(): SaveIndex {
    const slots: SaveSlotInfo[] = [];
    // 5个手动槽位
    for (let i = 0; i < 5; i++) {
      slots.push({
        slotIndex: i,
        slotType: 'MANUAL',
        saveId: null,
        lastModified: null,
        isEmpty: true
      });
    }
    // 3个自动存档槽位
    for (let i = 5; i < 8; i++) {
      slots.push({
        slotIndex: i,
        slotType: 'AUTO',
        saveId: null,
        lastModified: null,
        isEmpty: true
      });
    }
    return { version: 1, lastSlotIndex: 0, slots };
  }
}
```

### 3.3 IndexedDB 适配器（预留）

```typescript
/**
 * IndexedDB 适配器
 * 用于更大容量的存档存储
 */
class IndexedDBAdapter implements IStorageAdapter {
  readonly name = 'indexedDB';
  private readonly DB_NAME = 'GoUSASaves';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'saves';
  
  private db: IDBDatabase | null = null;
  
  get isAvailable(): boolean {
    return 'indexedDB' in window;
  }
  
  async init(): Promise<void> {
    if (!this.isAvailable) throw new Error('IndexedDB not available');
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }
  
  async save(key: string, data: SaveData): Promise<SaveResult> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      // IndexedDB 可以存储对象，无需序列化
      const request = store.put({
        id: key,
        data,
        timestamp: Date.now()
      });
      
      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => reject(request.error);
    });
  }
  
  async load(key: string): Promise<SaveData | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  // ... 其他方法实现
  async delete(key: string): Promise<boolean> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  
  async list(): Promise<string[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAllKeys();
      
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getStorageInfo(): Promise<StorageInfo> {
    // IndexedDB 不强制限制大小，取决于设备
    const estimate = await navigator.storage?.estimate?.() || {};
    
    return {
      used: estimate.usage || 0,
      available: (estimate.quota || 0) - (estimate.usage || 0),
      total: estimate.quota || 0
    };
  }
  
  async exists(key: string): Promise<boolean> {
    const result = await this.load(key);
    return result !== null;
  }
}
```

### 3.4 存储适配器工厂

```typescript
/**
 * 存储适配器工厂
 */
class StorageAdapterFactory {
  private static adapters: Map<string, IStorageAdapter> = new Map();
  
  /**
   * 注册适配器
   */
  static register(name: string, adapter: IStorageAdapter): void {
    this.adapters.set(name, adapter);
  }
  
  /**
   * 获取适配器
   */
  static get(name: string): IStorageAdapter | undefined {
    return this.adapters.get(name);
  }
  
  /**
   * 获取默认适配器（优先 IndexedDB，降级到 localStorage）
   */
  static getDefault(): IStorageAdapter {
    const indexedDB = this.get('indexedDB');
    if (indexedDB?.isAvailable) {
      return indexedDB;
    }
    
    const localStorage = this.get('localStorage');
    if (localStorage?.isAvailable) {
      return localStorage;
    }
    
    throw new Error('No storage adapter available');
  }
  
  /**
   * 获取所有可用适配器
   */
  static getAvailableAdapters(): IStorageAdapter[] {
    return Array.from(this.adapters.values()).filter(a => a.isAvailable);
  }
}

// 注册默认适配器
StorageAdapterFactory.register('localStorage', new LocalStorageAdapter());
StorageAdapterFactory.register('indexedDB', new IndexedDBAdapter());
```

---

## 4. 存档管理器

### 4.1 核心存档管理器

```typescript
/**
 * 存档管理器
 * 统一管理存档的创建、读取、保存、删除
 */
class SaveManager {
  private storage: IStorageAdapter;
  private config: SaveSlotConfig;
  private currentSaveId: string | null = null;
  private autoSaveInterval: number | null = null;
  private sessionStartTime: number = Date.now();
  private totalPlayTime: number = 0;
  
  constructor(
    storage: IStorageAdapter,
    config: SaveSlotConfig = DEFAULT_SAVE_CONFIG
  ) {
    this.storage = storage;
    this.config = config;
  }
  
  /**
   * 创建新存档
   */
  async createNewSave(
    gameState: GameState,
    slotIndex?: number
  ): Promise<SaveResult> {
    const saveId = this.generateSaveId();
    const metadata = this.createMetadata(saveId, slotIndex);
    const statistics = this.createEmptyStatistics();
    
    const saveData: SaveData = {
      metadata,
      gameState,
      statistics
    };
    
    const result = await this.storage.save(saveId, saveData);
    
    if (result.success) {
      this.currentSaveId = saveId;
      if (slotIndex !== undefined) {
        await this.assignSlot(slotIndex, saveId);
      }
    }
    
    return result;
  }
  
  /**
   * 保存当前游戏进度
   */
  async save(
    gameState: GameState,
    slotIndex?: number,
    isAutoSave: boolean = false
  ): Promise<SaveResult> {
    const saveId = this.currentSaveId || this.generateSaveId();
    
    // 获取现有存档以继承统计
    const existingSave = await this.storage.load(saveId);
    
    // 计算游戏时长
    const sessionTime = Date.now() - this.sessionStartTime;
    const totalPlayTime = (existingSave?.metadata.totalPlayTime || 0) + sessionTime;
    
    const metadata: SaveMetadata = {
      ...this.createMetadata(saveId, slotIndex, isAutoSave),
      lastSavedAt: Date.now(),
      totalPlayTime
    };
    
    const statistics = existingSave?.statistics 
      ? this.updateStatistics(existingSave.statistics, gameState)
      : this.createEmptyStatistics();
    
    const saveData: SaveData = {
      metadata,
      gameState,
      statistics
    };
    
    const result = await this.storage.save(saveId, saveData);
    
    if (result.success) {
      this.currentSaveId = saveId;
      this.sessionStartTime = Date.now(); // 重置会话计时
      
      if (slotIndex !== undefined) {
        await this.assignSlot(slotIndex, saveId);
      }
    }
    
    return result;
  }
  
  /**
   * 快速保存（覆盖当前存档）
   */
  async quickSave(gameState: GameState): Promise<SaveResult> {
    return this.save(gameState, undefined, false);
  }
  
  /**
   * 自动保存
   */
  async autoSave(gameState: GameState): Promise<SaveResult> {
    if (!this.config.autoSave.enabled) {
      return { success: false };
    }
    
    // 找到下一个自动存档槽位
    const slotIndex = await this.getNextAutoSaveSlot();
    
    return this.save(gameState, slotIndex, true);
  }
  
  /**
   * 加载存档
   */
  async load(saveId: string): Promise<SaveData | null> {
    const saveData = await this.storage.load(saveId);
    
    if (saveData) {
      // 版本检查和迁移
      const migrated = await this.migrateIfNeeded(saveData);
      
      this.currentSaveId = saveId;
      this.sessionStartTime = Date.now();
      this.totalPlayTime = migrated.metadata.totalPlayTime;
      
      return migrated;
    }
    
    return null;
  }
  
  /**
   * 从槽位加载
   */
  async loadFromSlot(slotIndex: number): Promise<SaveData | null> {
    const slot = await this.getSlotInfo(slotIndex);
    if (slot?.saveId) {
      return this.load(slot.saveId);
    }
    return null;
  }
  
  /**
   * 删除存档
   */
  async delete(saveId: string): Promise<boolean> {
    // 从槽位中解除关联
    await this.unassignSlot(saveId);
    
    if (this.currentSaveId === saveId) {
      this.currentSaveId = null;
    }
    
    return this.storage.delete(saveId);
  }
  
  /**
   * 删除槽位存档
   */
  async deleteSlot(slotIndex: number): Promise<boolean> {
    const slot = await this.getSlotInfo(slotIndex);
    if (slot?.saveId) {
      return this.delete(slot.saveId);
    }
    return false;
  }
  
  /**
   * 获取存档列表（用于UI展示）
   */
  async getSaveList(): Promise<SaveMetadata[]> {
    const keys = await this.storage.list();
    const saves: SaveMetadata[] = [];
    
    for (const key of keys) {
      const save = await this.storage.load(key);
      if (save) {
        saves.push(save.metadata);
      }
    }
    
    // 按时间倒序
    return saves.sort((a, b) => b.lastSavedAt - a.lastSavedAt);
  }
  
  /**
   * 获取槽位列表
   */
  async getSlotList(): Promise<(SaveSlotInfo & { metadata?: SaveMetadata })[]> {
    // 从 localStorage 读取索引
    const indexStr = localStorage.getItem('go_usa_save_index');
    const index: SaveIndex = indexStr 
      ? JSON.parse(indexStr) 
      : this.createDefaultIndex();
    
    const result = [];
    for (const slot of index.slots) {
      if (slot.saveId) {
        const save = await this.storage.load(slot.saveId);
        result.push({ ...slot, metadata: save?.metadata });
      } else {
        result.push(slot);
      }
    }
    
    return result;
  }
  
  /**
   * 导出存档为 JSON 文件
   */
  async exportSave(saveId: string): Promise<string> {
    const saveData = await this.storage.load(saveId);
    if (!saveData) {
      throw new Error('Save not found');
    }
    
    // 添加导出标记
    const exportData = {
      ...saveData,
      _export: {
        exportedAt: Date.now(),
        platform: 'web'
      }
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * 导入存档
   */
  async importSave(jsonData: string, slotIndex?: number): Promise<SaveResult> {
    try {
      const data = JSON.parse(jsonData) as SaveData;
      
      // 验证数据格式
      if (!this.validateSaveData(data)) {
        return {
          success: false,
          error: { code: 'CORRUPTED_DATA', message: 'Invalid save data format' }
        };
      }
      
      // 生成新ID避免冲突
      const newSaveId = this.generateSaveId();
      data.metadata.id = newSaveId;
      data.metadata.lastSavedAt = Date.now();
      data.metadata.isAutoSave = false;
      if (slotIndex !== undefined) {
        data.metadata.slotIndex = slotIndex;
      }
      
      const result = await this.storage.save(newSaveId, data);
      
      if (result.success && slotIndex !== undefined) {
        await this.assignSlot(slotIndex, newSaveId);
      }
      
      return result;
      
    } catch (error) {
      return {
        success: false,
        error: { code: 'CORRUPTED_DATA', message: 'Failed to parse save data', details: error }
      };
    }
  }
  
  /**
   * 配置自动保存
   */
  setupAutoSave(
    getGameState: () => GameState,
    intervalMs: number = 60000 // 默认60秒
  ): void {
    this.clearAutoSave();
    
    if (!this.config.autoSave.enabled) return;
    
    this.autoSaveInterval = window.setInterval(async () => {
      const state = getGameState();
      await this.autoSave(state);
    }, intervalMs);
  }
  
  /**
   * 清除自动保存
   */
  clearAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }
  
  // ===== 私有方法 =====
  
  private generateSaveId(): string {
    return `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private createMetadata(
    id: string, 
    slotIndex?: number,
    isAutoSave: boolean = false
  ): SaveMetadata {
    return {
      id,
      slotIndex,
      isAutoSave,
      createdAt: Date.now(),
      lastSavedAt: Date.now(),
      totalPlayTime: 0,
      preview: this.createEmptyPreview(),
      version: {
        dataVersion: 1,
        gameVersion: '1.0.0',
        migrationHistory: []
      }
    };
  }
  
  private createEmptyPreview(): SavePreview {
    return {
      characterName: '',
      currentScene: 'act1',
      sceneDisplayName: '',
      totalTurns: 0,
      sceneTurns: 0,
      resources: {
        health: 100,
        mental: 100,
        money: 0,
        currency: 'CNY'
      },
      keyStatus: {
        hasTerminalState: false,
        activeChainCount: 0
      },
      thumbnailText: ''
    };
  }
  
  private createEmptyStatistics(): GameStatistics {
    return {
      totalPlayTime: 0,
      eventsCompleted: 0,
      moneySpent: { cny: 0, usd: 0 },
      moneyEarned: { cny: 0, usd: 0 },
      turnsSurvived: 0,
      achievements: [],
      endingsSeen: [],
      choicesMade: []
    };
  }
  
  private updateStatistics(
    existing: GameStatistics,
    gameState: GameState
  ): GameStatistics {
    // 合并统计数据
    return {
      ...existing,
      // 从 gameState 计算新的统计数据
    };
  }
  
  private async migrateIfNeeded(saveData: SaveData): Promise<SaveData> {
    const currentVersion = 1; // 当前数据版本
    const saveVersion = saveData.metadata.version.dataVersion;
    
    if (saveVersion >= currentVersion) {
      return saveData;
    }
    
    // 执行版本迁移
    const migrator = new SaveMigrator();
    const migrated = await migrator.migrate(saveData, saveVersion, currentVersion);
    
    // 更新迁移历史
    migrated.metadata.version.migrationHistory.push(
      `v${saveVersion}_to_v${currentVersion}`
    );
    migrated.metadata.version.dataVersion = currentVersion;
    
    return migrated;
  }
  
  private async getNextAutoSaveSlot(): Promise<number> {
    const slots = await this.getSlotList();
    const autoSlots = slots.filter(s => s.slotType === 'AUTO');
    
    if (this.config.autoSave.rotationStrategy === 'FIFO') {
      // 找最老的自动存档槽位
      const oldest = autoSlots
        .filter(s => !s.isEmpty)
        .sort((a, b) => (a.lastModified || 0) - (b.lastModified || 0))[0];
      
      return oldest?.slotIndex ?? autoSlots[0]?.slotIndex ?? 5;
    } else {
      // 找最新的槽位后面的槽位（循环）
      const usedSlots = autoSlots.filter(s => !s.isEmpty);
      if (usedSlots.length < autoSlots.length) {
        // 还有空槽位
        return autoSlots.find(s => s.isEmpty)?.slotIndex ?? 5;
      }
      // 找最早使用的
      return usedSlots.sort((a, b) => (a.lastModified || 0) - (b.lastModified || 0))[0].slotIndex;
    }
  }
  
  private validateSaveData(data: any): boolean {
    return (
      data &&
      typeof data.metadata === 'object' &&
      typeof data.gameState === 'object' &&
      typeof data.statistics === 'object'
    );
  }
  
  private async assignSlot(slotIndex: number, saveId: string): Promise<void> {
    const index = await this.loadIndex();
    const slot = index.slots.find(s => s.slotIndex === slotIndex);
    if (slot) {
      slot.saveId = saveId;
      slot.lastModified = Date.now();
      slot.isEmpty = false;
      await this.saveIndex(index);
    }
  }
  
  private async unassignSlot(saveId: string): Promise<void> {
    const index = await this.loadIndex();
    const slot = index.slots.find(s => s.saveId === saveId);
    if (slot) {
      slot.saveId = null;
      slot.lastModified = null;
      slot.isEmpty = true;
      await this.saveIndex(index);
    }
  }
  
  private async getSlotInfo(slotIndex: number): Promise<SaveSlotInfo | null> {
    const index = await this.loadIndex();
    return index.slots.find(s => s.slotIndex === slotIndex) || null;
  }
  
  private async loadIndex(): Promise<SaveIndex> {
    const raw = localStorage.getItem('go_usa_save_index');
    if (raw) return JSON.parse(raw);
    return this.createDefaultIndex();
  }
  
  private async saveIndex(index: SaveIndex): Promise<void> {
    localStorage.setItem('go_usa_save_index', JSON.stringify(index));
  }
  
  private createDefaultIndex(): SaveIndex {
    const slots: SaveSlotInfo[] = [];
    // 5个手动槽位
    for (let i = 0; i < this.config.manualSlotCount; i++) {
      slots.push({
        slotIndex: i,
        slotType: 'MANUAL',
        saveId: null,
        lastModified: null,
        isEmpty: true
      });
    }
    // 自动存档槽位
    for (let i = 0; i < this.config.autoSave.slotCount; i++) {
      slots.push({
        slotIndex: this.config.manualSlotCount + i,
        slotType: 'AUTO',
        saveId: null,
        lastModified: null,
        isEmpty: true
      });
    }
    return { version: 1, lastSlotIndex: 0, slots };
  }
}

// 默认配置
const DEFAULT_SAVE_CONFIG: SaveSlotConfig = {
  manualSlotCount: 5,
  autoSave: {
    enabled: true,
    slotCount: 3,
    rotationStrategy: 'FIFO'
  }
};
```

### 4.2 存档版本迁移器

```typescript
/**
 * 存档版本迁移器
 * 处理不同版本存档之间的兼容性问题
 */
class SaveMigrator {
  private migrations: Map<string, MigrationScript> = new Map();
  
  constructor() {
    this.registerDefaultMigrations();
  }
  
  /**
   * 执行迁移
   */
  async migrate(
    saveData: SaveData,
    fromVersion: number,
    toVersion: number
  ): Promise<SaveData> {
    let currentData = saveData;
    let currentVersion = fromVersion;
    
    while (currentVersion < toVersion) {
      const nextVersion = currentVersion + 1;
      const migrationKey = `v${currentVersion}_to_v${nextVersion}`;
      const migration = this.migrations.get(migrationKey);
      
      if (migration) {
        currentData = await migration(currentData);
        currentVersion = nextVersion;
      } else {
        // 没有特定迁移脚本，直接更新版本号
        console.warn(`No migration script found for ${migrationKey}`);
        currentVersion = nextVersion;
      }
    }
    
    return currentData;
  }
  
  /**
   * 注册迁移脚本
   */
  registerMigration(
    fromVersion: number,
    toVersion: number,
    script: MigrationScript
  ): void {
    const key = `v${fromVersion}_to_v${toVersion}`;
    this.migrations.set(key, script);
  }
  
  private registerDefaultMigrations(): void {
    // 示例：从 v1 迁移到 v2（假设未来需要）
    // this.registerMigration(1, 2, async (data) => {
    //   // 执行 v1 到 v2 的数据结构调整
    //   return data;
    // });
  }
}

type MigrationScript = (data: SaveData) => Promise<SaveData>;
```

---

## 5. React Context 与 Hooks

### 5.1 存档上下文

```typescript
/**
 * 存档上下文类型
 */
interface SaveContextType {
  // 当前状态
  currentSaveId: string | null;
  isSaving: boolean;
  lastSaveTime: number | null;
  
  // 操作方法
  save: (slotIndex?: number) => Promise<SaveResult>;
  load: (saveId: string) => Promise<SaveData | null>;
  loadFromSlot: (slotIndex: number) => Promise<SaveData | null>;
  delete: (saveId: string) => Promise<boolean>;
  deleteSlot: (slotIndex: number) => Promise<boolean>;
  quickSave: () => Promise<SaveResult>;
  
  // 导入/导出
  exportSave: (saveId: string) => Promise<string>;
  importSave: (jsonData: string, slotIndex?: number) => Promise<SaveResult>;
  downloadSaveFile: (saveId: string, filename?: string) => Promise<void>;
  uploadSaveFile: (file: File, slotIndex?: number) => Promise<SaveResult>;
  
  // 查询
  getSaveList: () => Promise<SaveMetadata[]>;
  getSlotList: () => Promise<(SaveSlotInfo & { metadata?: SaveMetadata })[]>;
  
  // 自动保存
  setupAutoSave: (intervalMs?: number) => void;
  clearAutoSave: () => void;
}

// 创建上下文
const SaveContext = React.createContext<SaveContextType | null>(null);

/**
 * 存档上下文 Provider
 */
interface SaveProviderProps {
  children: React.ReactNode;
  gameState: GameState;
  onLoadSave?: (saveData: SaveData) => void;
  storageAdapter?: IStorageAdapter;
  config?: SaveSlotConfig;
}

export const SaveProvider: React.FC<SaveProviderProps> = ({
  children,
  gameState,
  onLoadSave,
  storageAdapter,
  config
}) => {
  const saveManagerRef = useRef<SaveManager | null>(null);
  const [currentSaveId, setCurrentSaveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  
  // 初始化 SaveManager
  useEffect(() => {
    const storage = storageAdapter || StorageAdapterFactory.getDefault();
    saveManagerRef.current = new SaveManager(storage, config);
    
    return () => {
      saveManagerRef.current?.clearAutoSave();
    };
  }, [storageAdapter, config]);
  
  // 保存方法
  const save = useCallback(async (slotIndex?: number): Promise<SaveResult> => {
    if (!saveManagerRef.current) return { success: false };
    
    setIsSaving(true);
    try {
      const result = await saveManagerRef.current.save(gameState, slotIndex);
      if (result.success) {
        setCurrentSaveId(saveManagerRef.current['currentSaveId']);
        setLastSaveTime(Date.now());
      }
      return result;
    } finally {
      setIsSaving(false);
    }
  }, [gameState]);
  
  // 快速保存
  const quickSave = useCallback(async (): Promise<SaveResult> => {
    return save();
  }, [save]);
  
  // 加载方法
  const load = useCallback(async (saveId: string): Promise<SaveData | null> => {
    if (!saveManagerRef.current) return null;
    
    const saveData = await saveManagerRef.current.load(saveId);
    if (saveData) {
      setCurrentSaveId(saveId);
      onLoadSave?.(saveData);
    }
    return saveData;
  }, [onLoadSave]);
  
  // 从槽位加载
  const loadFromSlot = useCallback(async (slotIndex: number): Promise<SaveData | null> => {
    if (!saveManagerRef.current) return null;
    
    const saveData = await saveManagerRef.current.loadFromSlot(slotIndex);
    if (saveData) {
      setCurrentSaveId(saveData.metadata.id);
      onLoadSave?.(saveData);
    }
    return saveData;
  }, [onLoadSave]);
  
  // 删除方法
  const deleteSave = useCallback(async (saveId: string): Promise<boolean> => {
    if (!saveManagerRef.current) return false;
    
    const result = await saveManagerRef.current.delete(saveId);
    if (result && currentSaveId === saveId) {
      setCurrentSaveId(null);
    }
    return result;
  }, [currentSaveId]);
  
  // 删除槽位
  const deleteSlot = useCallback(async (slotIndex: number): Promise<boolean> => {
    if (!saveManagerRef.current) return false;
    return saveManagerRef.current.deleteSlot(slotIndex);
  }, []);
  
  // 获取存档列表
  const getSaveList = useCallback(async (): Promise<SaveMetadata[]> => {
    if (!saveManagerRef.current) return [];
    return saveManagerRef.current.getSaveList();
  }, []);
  
  // 获取槽位列表
  const getSlotList = useCallback(async () => {
    if (!saveManagerRef.current) return [];
    return saveManagerRef.current.getSlotList();
  }, []);
  
  // 导出存档
  const exportSave = useCallback(async (saveId: string): Promise<string> => {
    if (!saveManagerRef.current) throw new Error('Save manager not initialized');
    return saveManagerRef.current.exportSave(saveId);
  }, []);
  
  // 导入存档
  const importSave = useCallback(async (
    jsonData: string, 
    slotIndex?: number
  ): Promise<SaveResult> => {
    if (!saveManagerRef.current) return { success: false };
    return saveManagerRef.current.importSave(jsonData, slotIndex);
  }, []);
  
  // 下载存档文件
  const downloadSaveFile = useCallback(async (
    saveId: string, 
    filename?: string
  ): Promise<void> => {
    const jsonData = await exportSave(saveId);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `go_usa_save_${saveId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }, [exportSave]);
  
  // 上传存档文件
  const uploadSaveFile = useCallback(async (
    file: File, 
    slotIndex?: number
  ): Promise<SaveResult> => {
    const text = await file.text();
    return importSave(text, slotIndex);
  }, [importSave]);
  
  // 配置自动保存
  const setupAutoSave = useCallback((intervalMs?: number): void => {
    if (!saveManagerRef.current) return;
    saveManagerRef.current.setupAutoSave(() => gameState, intervalMs);
  }, [gameState]);
  
  // 清除自动保存
  const clearAutoSave = useCallback((): void => {
    saveManagerRef.current?.clearAutoSave();
  }, []);
  
  const contextValue: SaveContextType = {
    currentSaveId,
    isSaving,
    lastSaveTime,
    save,
    load,
    loadFromSlot,
    delete: deleteSave,
    deleteSlot,
    quickSave,
    exportSave,
    importSave,
    downloadSaveFile,
    uploadSaveFile,
    getSaveList,
    getSlotList,
    setupAutoSave,
    clearAutoSave
  };
  
  return (
    <SaveContext.Provider value={contextValue}>
      {children}
    </SaveContext.Provider>
  );
};

/**
 * 使用存档上下文的 Hook
 */
export const useSave = (): SaveContextType => {
  const context = useContext(SaveContext);
  if (!context) {
    throw new Error('useSave must be used within a SaveProvider');
  }
  return context;
};

/**
 * 便捷 Hook：存档列表
 */
export const useSaveList = () => {
  const { getSlotList } = useSave();
  const [slots, setSlots] = useState<(SaveSlotInfo & { metadata?: SaveMetadata })[]>([]);
  const [loading, setLoading] = useState(true);
  
  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await getSlotList();
    setSlots(list);
    setLoading(false);
  }, [getSlotList]);
  
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  return { slots, loading, refresh };
};

/**
 * 便捷 Hook：自动保存提示
 */
export const useAutoSaveIndicator = () => {
  const { lastSaveTime, isSaving } = useSave();
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    if (isSaving) {
      setDisplayText('保存中...');
      return;
    }
    
    if (!lastSaveTime) {
      setDisplayText('');
      return;
    }
    
    const updateText = () => {
      const diff = Date.now() - lastSaveTime;
      if (diff < 60000) {
        setDisplayText('已保存');
      } else if (diff < 3600000) {
        setDisplayText(`上次保存 ${Math.floor(diff / 60000)} 分钟前`);
      } else {
        setDisplayText('');
      }
    };
    
    updateText();
    const timer = setInterval(updateText, 60000);
    return () => clearInterval(timer);
  }, [lastSaveTime, isSaving]);
  
  return displayText;
};
```

### 5.2 使用示例

```typescript
// 在 App 中包裹 SaveProvider
function App() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  
  const handleLoadSave = useCallback((saveData: SaveData) => {
    setGameState(saveData.gameState);
  }, []);
  
  return (
    <SaveProvider 
      gameState={gameState} 
      onLoadSave={handleLoadSave}
      config={{
        manualSlotCount: 5,
        autoSave: { enabled: true, slotCount: 3, rotationStrategy: 'FIFO' }
      }}
    >
      <Game />
    </SaveProvider>
  );
}

// 在游戏组件中使用
function Game() {
  const { 
    save, 
    loadFromSlot, 
    quickSave,
    setupAutoSave,
    downloadSaveFile,
    uploadSaveFile
  } = useSave();
  
  // 设置自动保存（每60秒）
  useEffect(() => {
    setupAutoSave(60000);
    return () => {};
  }, [setupAutoSave]);
  
  const handleManualSave = async (slotIndex: number) => {
    const result = await save(slotIndex);
    if (result.success) {
      alert('保存成功！');
    } else {
      alert(`保存失败: ${result.error?.message}`);
    }
  };
  
  const handleLoad = async (slotIndex: number) => {
    const saveData = await loadFromSlot(slotIndex);
    if (saveData) {
      alert(`加载成功: ${saveData.metadata.preview.thumbnailText}`);
    }
  };
  
  return (
    <div>
      <SaveMenu 
        onSave={handleManualSave}
        onLoad={handleLoad}
        onQuickSave={quickSave}
        onExport={downloadSaveFile}
        onImport={uploadSaveFile}
      />
      <AutoSaveIndicator />
    </div>
  );
}

// 存档列表组件
function SaveMenu({ onSave, onLoad }: SaveMenuProps) {
  const { slots, loading, refresh } = useSaveList();
  
  if (loading) return <div>加载中...</div>;
  
  return (
    <div className="save-menu">
      <h3>存档管理</h3>
      
      <div className="manual-slots">
        <h4>手动存档</h4>
        {slots.filter(s => s.slotType === 'MANUAL').map(slot => (
          <SaveSlotItem
            key={slot.slotIndex}
            slot={slot}
            onSave={() => onSave(slot.slotIndex)}
            onLoad={() => onLoad(slot.slotIndex)}
          />
        ))}
      </div>
      
      <div className="auto-slots">
        <h4>自动存档</h4>
        {slots.filter(s => s.slotType === 'AUTO').map(slot => (
          <SaveSlotItem
            key={slot.slotIndex}
            slot={slot}
            onLoad={() => onLoad(slot.slotIndex)}
          />
        ))}
      </div>
    </div>
  );
}

// 自动保存指示器
function AutoSaveIndicator() {
  const text = useAutoSaveIndicator();
  return text ? <span className="auto-save-indicator">{text}</span> : null;
}
```

---

## 6. 自动保存机制

### 6.1 触发时机

```typescript
/**
 * 自动保存触发条件配置
 */
interface AutoSaveTriggerConfig {
  // 时间触发
  interval: number;              // 间隔毫秒（默认 60000 = 1分钟）
  
  // 事件触发（在 SaveManager 中注册）
  onEvents: {
    eventId: string;             // 触发自动保存的事件ID
    condition?: 'AFTER' | 'BEFORE'; // 事件前还是事件后
  }[];
  
  // 场景触发
  onSceneTransition: boolean;    // 场景切换时
  onSceneEntry: boolean;         // 进入新场景时
  
  // 状态触发
  onTerminalState: boolean;      // 进入终结态时（紧急保存）
  onResourceCritical: boolean;   // 资源危急时
  
  // 防重复
  minIntervalBetweenSaves: number; // 两次自动保存的最小间隔（毫秒）
}

// 默认触发配置
const DEFAULT_AUTO_SAVE_TRIGGERS: AutoSaveTriggerConfig = {
  interval: 60000,
  onEvents: [
    { eventId: 'scene_transition', condition: 'AFTER' },
    { eventId: 'chain_complete', condition: 'AFTER' }
  ],
  onSceneTransition: true,
  onSceneEntry: true,
  onTerminalState: true,
  onResourceCritical: true,
  minIntervalBetweenSaves: 30000
};
```

### 6.2 自动保存执行流程

```typescript
/**
 * 自动保存执行流程
 */
class AutoSaveManager {
  private saveManager: SaveManager;
  private config: AutoSaveTriggerConfig;
  private lastAutoSaveTime: number = 0;
  private intervalId: number | null = null;
  
  constructor(saveManager: SaveManager, config: AutoSaveTriggerConfig) {
    this.saveManager = saveManager;
    this.config = config;
  }
  
  /**
   * 启动自动保存
   */
  start(getGameState: () => GameState): void {
    // 定时保存
    if (this.config.interval > 0) {
      this.intervalId = window.setInterval(async () => {
        await this.performAutoSave(getGameState(), 'INTERVAL');
      }, this.config.interval);
    }
    
    // 注册事件监听器
    this.registerEventListeners(getGameState);
  }
  
  /**
   * 停止自动保存
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.unregisterEventListeners();
  }
  
  /**
   * 执行自动保存
   */
  private async performAutoSave(
    gameState: GameState, 
    trigger: string
  ): Promise<void> {
    // 检查最小间隔
    const now = Date.now();
    if (now - this.lastAutoSaveTime < this.config.minIntervalBetweenSaves) {
      return;
    }
    
    console.log(`[AutoSave] Triggered by: ${trigger}`);
    
    const result = await this.saveManager.autoSave(gameState);
    
    if (result.success) {
      this.lastAutoSaveTime = now;
      console.log('[AutoSave] Success');
    } else {
      console.error('[AutoSave] Failed:', result.error);
    }
  }
  
  /**
   * 紧急保存（不检查间隔）
   */
  async emergencySave(gameState: GameState): Promise<SaveResult> {
    console.log('[AutoSave] Emergency save triggered');
    const result = await this.saveManager.autoSave(gameState);
    if (result.success) {
      this.lastAutoSaveTime = Date.now();
    }
    return result;
  }
  
  private registerEventListeners(getGameState: () => GameState): void {
    // 监听游戏事件
    // 实际实现通过游戏事件总线订阅
  }
  
  private unregisterEventListeners(): void {
    // 取消订阅
  }
}
```

---

## 7. 存档导入/导出

### 7.1 导出格式

```typescript
/**
 * 导出的存档文件格式
 */
interface ExportedSaveFile {
  // 存档数据
  metadata: SaveMetadata;
  gameState: GameState;
  statistics: GameStatistics;
  
  // 导出信息
  _export: {
    exportedAt: number;
    platform: string;
    version: string;
  };
}

/**
 * 导出存档为文件
 */
async function exportSaveToFile(
  saveManager: SaveManager,
  saveId: string,
  filename?: string
): Promise<void> {
  const jsonData = await saveManager.exportSave(saveId);
  
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `去美国_存档_${new Date().toLocaleDateString()}.json`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * 从文件导入存档
 */
async function importSaveFromFile(
  saveManager: SaveManager,
  file: File,
  targetSlotIndex?: number
): Promise<SaveResult> {
  try {
    const text = await file.text();
    return await saveManager.importSave(text, targetSlotIndex);
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'READ_FAILED',
        message: '无法读取文件',
        details: error
      }
    };
  }
}
```

### 7.2 二维码分享（可选扩展）

```typescript
/**
 * 存档分享数据（用于二维码等）
 * 数据量大时需要压缩和分片
 */
interface SaveShareData {
  // 存档ID（如果是云端存档）
  saveId?: string;
  
  // 或者完整数据（base64编码）
  data?: string;
  
  // 校验和
  checksum: string;
}

/**
 * 生成分享数据（用于二维码）
 */
async function generateShareData(
  saveData: SaveData,
  maxLength: number = 2000 // 二维码容量限制
): Promise<SaveShareData> {
  const jsonStr = JSON.stringify(saveData);
  const compressed = await compressString(jsonStr);
  
  // 如果太大，返回云端存档ID（需要后端支持）
  if (compressed.length > maxLength) {
    // const cloudId = await uploadToCloud(saveData);
    // return { saveId: cloudId, checksum: computeChecksum(saveData) };
    throw new Error('Save data too large for QR code');
  }
  
  return {
    data: btoa(compressed),
    checksum: computeChecksum(saveData)
  };
}
```

---

## 8. 统计系统集成

### 8.1 存档时统计更新

```typescript
/**
 * 游戏统计数据
 */
interface GameStatistics {
  // 时间统计
  totalPlayTime: number;         // 总游戏时长（毫秒）
  sessionCount: number;          // 游戏会话次数
  
  // 进度统计
  eventsCompleted: number;       // 完成事件数
  uniqueEventsCompleted: string[]; // 完成的事件ID列表
  scenesVisited: SceneId[];      // 访问过的场景
  turnsSurvived: number;         // 存活回合数
  
  // 资源统计
  moneySpent: { cny: number; usd: number };
  moneyEarned: { cny: number; usd: number };
  itemsUsed: number;
  itemsAcquired: number;
  
  // 结局统计
  endingsSeen: string[];         // 已观看的结局ID
  bestEnding?: string;           // 最佳结局
  
  // 选择统计
  choicesMade: {
    eventId: string;
    choiceId: string;
    turn: number;
  }[];
  
  // 成就
  achievements: string[];
  
  // 死亡统计
  deathCount: number;
  deathReasons: string[];
}

/**
 * 从游戏状态计算统计数据
 */
function calculateStatistics(
  currentStats: GameStatistics,
  gameState: GameState
): GameStatistics {
  return {
    ...currentStats,
    // 基于 gameState 更新统计
    eventsCompleted: gameState.events.completedEventIds.length,
    uniqueEventsCompleted: Array.from(new Set([
      ...currentStats.uniqueEventsCompleted,
      ...gameState.events.completedEventIds
    ])),
    turnsSurvived: gameState.character.status.turnCount.total,
    moneySpent: {
      cny: currentStats.moneySpent.cny + gameState.statistics.sessionMoneySpent.cny,
      usd: currentStats.moneySpent.usd + gameState.statistics.sessionMoneySpent.usd
    }
  };
}
```

---

## 9. 错误处理

### 9.1 存储错误处理

```typescript
/**
 * 存档错误处理器
 */
class SaveErrorHandler {
  /**
   * 处理存储错误
   */
  static handleError(error: StorageError, context: string): void {
    console.error(`[SaveError] ${context}:`, error);
    
    switch (error.code) {
      case 'QUOTA_EXCEEDED':
        this.handleQuotaExceeded();
        break;
      case 'WRITE_FAILED':
        this.handleWriteFailed(error);
        break;
      case 'READ_FAILED':
        this.handleReadFailed(error);
        break;
      case 'CORRUPTED_DATA':
        this.handleCorruptedData(error);
        break;
    }
  }
  
  /**
   * 存储空间不足处理
   */
  private static handleQuotaExceeded(): void {
    // 提示用户清理旧存档
    const message = '存储空间不足，请删除一些旧存档后再试。';
    alert(message);
    
    // 可以自动清理最旧的自动存档
    // this.cleanupOldAutoSaves();
  }
  
  /**
   * 写入失败处理
   */
  private static handleWriteFailed(error: StorageError): void {
    alert(`存档失败: ${error.message}。请检查浏览器存储权限。`);
  }
  
  /**
   * 读取失败处理
   */
  private static handleReadFailed(error: StorageError): void {
    alert(`读档失败: ${error.message}。存档可能已损坏。`);
  }
  
  /**
   * 数据损坏处理
   */
  private static handleCorruptedData(error: StorageError): void {
    alert(`存档数据已损坏，无法加载。${error.message}`);
  }
}
```

### 9.2 存档验证

```typescript
/**
 * 存档数据验证器
 */
class SaveValidator {
  /**
   * 验证存档数据完整性
   */
  static validate(saveData: SaveData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // 验证元数据
    if (!saveData.metadata) {
      errors.push('Missing metadata');
    } else {
      if (!saveData.metadata.id) errors.push('Missing save ID');
      if (!saveData.metadata.version) errors.push('Missing version info');
    }
    
    // 验证游戏状态
    if (!saveData.gameState) {
      errors.push('Missing game state');
    } else {
      if (!saveData.gameState.character) errors.push('Missing character data');
      if (!saveData.gameState.scene) errors.push('Missing scene data');
    }
    
    // 验证统计数据
    if (!saveData.statistics) {
      errors.push('Missing statistics');
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * 计算存档校验和（用于完整性验证）
   */
  static computeChecksum(saveData: SaveData): string {
    // 简单的校验和实现
    const str = JSON.stringify({
      character: saveData.gameState.character?.id,
      scene: saveData.gameState.scene?.currentScene,
      turns: saveData.gameState.character?.status?.turnCount?.total,
      timestamp: saveData.metadata?.lastSavedAt
    });
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}
```

---

## 10. 附录

### 10.1 存储空间估算

| 数据类型 | 估算大小 | 说明 |
|---------|---------|------|
| 角色数据 | 2-3 KB | 属性、资源、状态 |
| 物品数据 | 1-2 KB | 消耗品、常驻道具、书籍池 |
| 场景状态 | 2-4 KB | 事件记录、事件链进度 |
| 环境状态 | 1-2 KB | Debuff、通胀状态 |
| 统计数据 | 2-3 KB | 成就、历史记录 |
| 元数据 | 1 KB | 预览信息、版本 |
| **总计** | **10-15 KB** | 未压缩 |
| **压缩后** | **3-5 KB** | 使用 LZ-String 压缩 |

**存储上限分析**：
- localStorage 约 5MB
- 可存储存档数：约 1000-1500 个（压缩后）
- 建议限制手动存档 5 个 + 自动存档 3 个 = 8 个，占用约 40KB

### 10.2 相关文件

- `CharacterSystemArchitecture.md` - 角色数据结构
- `EventSystemArchitecture.md` - 事件系统状态
- `ItemSystemArchitecture.md` - 物品系统状态
- `SceneSystemArchitecture.md` - 场景系统状态

### 10.3 依赖库建议

```json
{
  "dependencies": {
    "lz-string": "^1.5.0"  // 用于存档压缩（可选）
  }
}
```

### 10.4 版本历史

| 版本 | 日期 | 变更 |
|-----|------|-----|
| 1.0 | 2024-XX-XX | 初始版本 |