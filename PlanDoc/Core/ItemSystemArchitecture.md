# 物品系统架构设计

## 1. 概述

本文档定义《去美国》游戏的核心物品系统架构，包含物品分类、数据结构、道具栏管理、书籍池管理、物品与事件的交互机制等技术实现规范。

---

## 2. 物品分类体系

### 2.1 分类总览

| 分类 | 英文标识 | 特性 | 使用方式 | 存储位置 |
|-----|---------|------|---------|---------|
| **消耗型道具** | `CONSUMABLE` | 一次性使用，使用后删除 | 直接使用或通过事件使用 | 消耗品道具栏（可堆叠） |
| **常驻型道具** | `PERMANENT` | 长期持有，被动生效 | 通过事件槽位匹配使用 | 常驻道具栏（独立格子） |
| **书籍** | `BOOK` | 特殊消耗型，通过书籍池获取 | 通过读书事件使用 | 视为消耗型，统一存储 |

### 2.2 消耗型道具（Consumable）

**定义**：一次性使用的道具，使用后会从道具栏中删除或减少数量。

**核心特征**：
- ✅ 可堆叠（多个相同道具占用一个格子）
- ✅ 使用后消耗（次数归零后删除）
- ✅ 可直接使用或通过事件使用
- ✅ 通常提供即时效果（回血、回行动点等）

**数据结构**：
```typescript
interface ConsumableItem {
  // 基础信息
  id: string;                    // 唯一标识符（全局唯一）
  name: string;                  // 显示名称
  description: string;           // 道具描述
  category: 'CONSUMABLE';        // 固定分类
  
  // 品类细分（用于UI分类显示）
  subCategory: 'medical' | 'food' | 'book' | 'other';
  
  // 使用效果
  effects: ItemEffect;           // 使用后的效果
  
  // 堆叠配置
  maxStack: number;              // 最大堆叠数量（如 99）
  currentStack: number;          // 当前堆叠数量
  
  // 使用配置
  useTarget: 'self' | 'event';   // 使用目标：自己直接use / 通过事件use
  useCost?: {                    // 使用额外消耗（可选）
    actionPoint?: number;
    money?: number;
  };
}

interface ItemEffect {
  // 资源回复
  healthRestore?: number;        // 身体健康度回复
  mentalRestore?: number;        // 心理健康度回复
  actionPointRestore?: number;   // 行动点回复
  
  // 属性加成（一次性）
  attributeBonus?: Partial<Attributes>;
  
  // 状态改变
  statusEffects?: StatusEffect[];
  
  // 获得其他道具
  grantItems?: { itemId: string; count: number }[];
}
```

**存储结构**：
```typescript
interface ConsumableInventory {
  // 使用 Map 存储，key 为 itemId，value 为堆叠数量
  items: Map<string, number>;
  
  // 容量限制
  maxSlots: number;              // 最大格子数（如 20）
  maxStackPerSlot: number;       // 每格最大堆叠（如 99）
  
  // 方法
  addItem(itemId: string, count: number): boolean;
  removeItem(itemId: string, count: number): boolean;
  getItemCount(itemId: string): number;
  hasItem(itemId: string, count?: number): boolean;
}
```

**堆叠算法示例**：
```typescript
class ConsumableInventory {
  private items: Map<string, number> = new Map();
  private maxSlots = 20;
  private maxStack = 99;
  
  /**
   * 添加物品到道具栏
   * @returns 实际添加数量（可能因容量不足而部分添加）
   */
  addItem(itemId: string, count: number): number {
    const currentCount = this.items.get(itemId) || 0;
    const maxCanAdd = this.maxStack - currentCount;
    const actualAdd = Math.min(count, maxCanAdd);
    
    if (actualAdd > 0) {
      this.items.set(itemId, currentCount + actualAdd);
    }
    
    return actualAdd;
  }
  
  /**
   * 从道具栏移除物品
   * @returns 是否成功移除指定数量
   */
  removeItem(itemId: string, count: number): boolean {
    const currentCount = this.items.get(itemId) || 0;
    
    if (currentCount < count) {
      return false;  // 数量不足
    }
    
    const newCount = currentCount - count;
    if (newCount > 0) {
      this.items.set(itemId, newCount);
    } else {
      this.items.delete(itemId);  // 数量为0时删除键
    }
    
    return true;
  }
  
  /**
   * 获取已使用的格子数
   */
  getUsedSlots(): number {
    return this.items.size;
  }
  
  /**
   * 是否还有空格子
   */
  hasEmptySlot(): boolean {
    return this.getUsedSlots() < this.maxSlots;
  }
}
```

### 2.3 常驻型道具（Permanent）

**定义**：长期持有的道具，通过物品槽位与事件动态匹配，提供被动效果或槽位加成。

**核心特征**：
- ❌ 不可堆叠（每个道具独立占用一个格子）
- ✅ 长期持有（直到被删除或移除）
- ✅ 通过**属性标签**与**事件槽位**匹配
- ✅ 有**优先级**（0-9，数字越小越优先）
- ✅ 提供**槽位效果**（当被事件匹配时生效）
- ✅ 可能有**被动效果**（始终生效）
- ⚠️ **场景切换时清空**（见下文【重要设计决策】）

**【重要设计决策】场景切换时清空常驻道具栏**

为了制造强烈的"从零开始"压迫感和生存挑战，**场景切换时会完全清空常驻道具栏**：

```typescript
// 场景切换时调用
inventory.permanents.clear();
```

**设计理由**：
1. **叙事契合**：非法移民跨境时通常会失去一切装备和关系网
2. **游戏性**：每个场景都是独立的生存挑战，而非累积优势
3. **策略深度**：迫使玩家在每个场景重新思考和规划
4. **Rogue-like体验**：上一场景是"经验积累"，新场景是"全新开始"

**给玩家的补偿**（避免完全无法开始）：
- 场景2启动：基础生存物资（水、食物）
- 场景3启动：少量美元现金
- 全局书籍池：跨场景保留（整局游戏唯一）

**例外**（如需保留极少数道具）：
```typescript
// 特殊标记 cross_scene 的道具可保留
const crossSceneItems = inventory.permanents.items
  .filter(item => item.tags.includes('cross_scene'));

inventory.permanents.clear();
crossSceneItems.forEach(item => inventory.permanents.add(item));
```

**数据结构**：
```typescript
interface PermanentItem {
  // 基础信息
  id: string;                    // 唯一标识符
  name: string;                  // 显示名称
  description: string;           // 道具描述
  category: 'PERMANENT';         // 固定分类
  
  // 标签系统（核心）
  tags: string[];                // 属性标签列表（如 ['transport', 'vehicle']）
  priority: number;              // 优先级 0-9，数字越小越优先
  
  // 槽位效果（当被事件匹配时生效）
  slotEffects: SlotEffect;
  
  // 被动效果（始终生效，可选）
  passiveEffects?: PassiveEffect;
  
  // 耐久与删除
  durability?: {                 // 耐久度系统（可选）
    current: number;
    max: number;
  };
  canBeDeleted: boolean;         // 是否可能被随机事件删除
  deleteTriggers?: string[];     // 触发删除的事件/条件
  
  // 固定消耗（某些道具每回合消耗资源）
  upkeepCost?: {
    moneyPerTurn?: number;
    actionPointPerTurn?: number;
  };
}

interface SlotEffect {
  // 基础修改
  actionPointCostModifier?: number;    // 行动点消耗调整（如 -1）
  moneyMultiplier?: number;            // 金钱收益倍率（如 1.3）
  moneyBaseModifier?: number;          // 金钱基础值调整
  
  // 检定修改
  checkBonus?: Partial<Attributes>;    // 属性检定加成
  successRateModifier?: number;        // 成功率调整
  
  // 解锁功能
  unlockOptions?: string[];            // 解锁的事件选项ID
  unlockEvents?: string[];             // 解锁的事件ID
  
  // 免疫效果
  immunityTo?: string[];               // 免疫的随机事件ID
}

interface PassiveEffect {
  // 每回合自动生效的效果
  perTurn?: {
    healthRestore?: number;
    mentalRestore?: number;
    actionPointRestore?: number;
    moneyChange?: number;
    attributeChange?: Partial<Attributes>;
  };
  
  // 状态抗性
  resistance?: {
    eventType: string;
    reductionPercent: number;
  }[];
  
  // 信息获取
  infoAccess?: string[];               // 可获取的信息类型
}
```

**存储结构**：
```typescript
interface PermanentInventory {
  // 使用数组存储（不可堆叠，每个道具独立）
  items: PermanentItem[];
  
  // 容量限制
  maxSlots: number;              // 最大格子数（如 6-8）
  
  // 方法
  addItem(item: PermanentItem): boolean;
  removeItem(itemId: string): PermanentItem | null;
  findItem(itemId: string): PermanentItem | null;
  findByTag(tag: string): PermanentItem[];
  hasItem(itemId: string): boolean;
  isFull(): boolean;
  
  // 回合开始时的维护
  processUpkeepCosts(): { paid: string[]; unpaid: string[] };
  processPassiveEffects(): void;
}
```

**标签匹配算法**（与事件系统交互）：
```typescript
class PermanentInventory {
  private items: PermanentItem[] = [];
  private maxSlots = 8;
  
  /**
   * 查找匹配指定标签的道具
   * 按优先级排序（数字小的优先）
   */
  findByTags(tags: string[]): PermanentItem[] {
    return this.items
      .filter(item => item.tags.some(tag => tags.includes(tag)))
      .sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * 查找匹配指定标签的最高优先级道具
   */
  findBestMatch(tags: string[]): PermanentItem | null {
    const matches = this.findByTags(tags);
    return matches.length > 0 ? matches[0] : null;
  }
  
  /**
   * 获取所有可能的槽位匹配（用于UI显示可选项）
   */
  getSlotOptions(slotTags: string[]): {
    bestMatch: PermanentItem | null;
    allMatches: PermanentItem[];
  } {
    const allMatches = this.findByTags(slotTags);
    return {
      bestMatch: allMatches[0] || null,
      allMatches
    };
  }
  
  /**
   * 添加道具
   */
  addItem(item: PermanentItem): boolean {
    if (this.items.length >= this.maxSlots) {
      return false;  // 道具栏已满
    }
    
    // 检查是否已存在（通常不可重复获得）
    if (this.items.some(i => i.id === item.id)) {
      return false;
    }
    
    this.items.push(item);
    return true;
  }
  
  /**
   * 移除道具
   */
  removeItem(itemId: string): PermanentItem | null {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index === -1) return null;
    
    const removed = this.items[index];
    this.items.splice(index, 1);
    return removed;
  }
  
  /**
   * 清空道具栏
   * 【场景切换时调用】制造"从零开始"的压迫感
   */
  clear(): void {
    this.items = [];
    this.tagCache.clear();  // 清空缓存
  }
  
  /**
   * 处理固定消耗（每回合调用）
   */
  processUpkeepCosts(player: Player): {
    paid: string[];
    unpaid: string[];
    removed: string[];
  } {
    const result = { paid: [], unpaid: [], removed: [] };
    
    for (const item of this.items) {
      if (!item.upkeepCost) continue;
      
      const cost = item.upkeepCost.moneyPerTurn || 0;
      
      if (player.money >= cost) {
        player.money -= cost;
        result.paid.push(item.id);
      } else {
        result.unpaid.push(item.id);
        
        // 无法支付维护费，道具可能被移除或失效
        if (item.canBeDeleted) {
          this.removeItem(item.id);
          result.removed.push(item.id);
        }
      }
    }
    
    return result;
  }
}
```

### 2.4 书籍（Book）

**定义**：特殊的消耗型道具，通过全局书籍池获取，具有唯一性。

**核心特征**：
- ✅ 属于消耗型（阅读后删除）
- ✅ 通过**全局书籍池**获取（每局游戏固定10本）
- ✅ 每本书**全局唯一**（被购买后从池中移除）
- ✅ 使用`book`标签匹配`read_book`事件

**数据结构**：
```typescript
// 书籍继承自 ConsumableItem，但有一些特殊字段
interface BookItem extends ConsumableItem {
  subCategory: 'book';           // 固定为book
  
  // 书籍特有
  bookId: string;                // 书籍唯一ID（如 book_001）
  rarity: 'COMMON' | 'RARE' | 'EPIC';  // 稀有度
  
  // 标签固定包含 'book'
  // 优先级用于事件槽位匹配（同一本书优先级固定）
}

// 全局书籍池
interface GlobalBookPool {
  // 使用数组存储剩余的书籍
  availableBooks: BookItem[];
  
  // 初始配置（每局游戏重置）
  initialBooks: BookItem[];
  
  // 方法
  reset(): void;                  // 重置池子（新游戏时调用）
  drawRandom(): BookItem | null;  // 随机抽取一本书
  isEmpty(): boolean;
  getRemainingCount(): number;
}
```

**书籍池实现**：
```typescript
class GlobalBookPool {
  private initialBooks: BookItem[] = [];
  private availableBooks: BookItem[] = [];
  
  constructor(books: BookItem[]) {
    this.initialBooks = [...books];
    this.reset();
  }
  
  /**
   * 重置书籍池（新游戏时调用）
   */
  reset(): void {
    this.availableBooks = [...this.initialBooks];
  }
  
  /**
   * 随机抽取一本书
   * @returns 抽到的书，池空时返回null
   */
  drawRandom(): BookItem | null {
    if (this.availableBooks.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * this.availableBooks.length);
    const drawnBook = this.availableBooks[randomIndex];
    
    // 从池中移除（splice返回数组，取第一个元素）
    this.availableBooks.splice(randomIndex, 1);
    
    return drawnBook;
  }
  
  /**
   * 查看剩余书籍（调试用）
   */
  getRemainingBooks(): BookItem[] {
    return [...this.availableBooks];
  }
  
  isEmpty(): boolean {
    return this.availableBooks.length === 0;
  }
  
  getRemainingCount(): number {
    return this.availableBooks.length;
  }
}

// 初始化书籍池（游戏启动时创建）
const initialBooks: BookItem[] = [
  {
    id: 'book_001',
    name: '轻松英语',
    category: 'CONSUMABLE',
    subCategory: 'book',
    bookId: 'book_001',
    rarity: 'COMMON',
    description: '基础英语学习材料',
    effects: {
      attributeBonus: { english: 1 }
    },
    maxStack: 1,
    currentStack: 1,
    useTarget: 'event',
    tags: ['book'],
    priority: 5
  },
  // ... 其他9本书
];

const globalBookPool = new GlobalBookPool(initialBooks);
```

---

## 3. 道具栏管理器

### 3.1 统一管理器

```typescript
interface InventoryManager {
  // 两个独立的道具栏
  consumables: ConsumableInventory;
  permanents: PermanentInventory;
  
  // 书籍池（全局）
  bookPool: GlobalBookPool;
  
  // 快捷方法
  hasItem(itemId: string): boolean;                    // 检查是否有某物品（两种栏都查）
  getItemType(itemId: string): 'CONSUMABLE' | 'PERMANENT' | null;
  
  // 物品移动（某些游戏机制可能需要）
  moveToConsumable(itemId: string): boolean;           // 常驻转消耗（罕见）
  
  // 事件槽位匹配（与事件系统交互的核心）
  matchSlotRequirements(slots: EventSlot[]): SlotMatchResult;
}
```

### 3.2 槽位匹配结果

```typescript
interface SlotMatchResult {
  canExecute: boolean;               // 是否可以执行事件
  reason?: string;                   // 不能执行的原因
  
  // 每个槽位的匹配情况
  slotResults: Map<string, SlotResult>;
  
  // 累积效果
  totalEffects: {
    actionPointCostModifier: number;
    moneyMultiplier: number;
    moneyBaseModifier: number;
    checkBonus: Partial<Attributes>;
    unlockOptions: string[];
  };
}

interface SlotResult {
  slot: EventSlot;
  matched: boolean;                  // 是否找到匹配
  selectedItem: PermanentItem | null; // 选中的道具（优先级最高）
  alternatives: PermanentItem[];      // 其他可选项
  effects: SlotEffect;               // 该槽位提供的效果
}
```

### 3.3 完整匹配流程

```typescript
class InventoryManager {
  consumables = new ConsumableInventory();
  permanents = new PermanentInventory();
  bookPool: GlobalBookPool;
  
  /**
   * 核心方法：匹配事件的槽位要求
   */
  matchSlotRequirements(eventSlots: EventSlot[]): SlotMatchResult {
    const result: SlotMatchResult = {
      canExecute: true,
      slotResults: new Map(),
      totalEffects: {
        actionPointCostModifier: 0,
        moneyMultiplier: 1.0,
        moneyBaseModifier: 0,
        checkBonus: {},
        unlockOptions: []
      }
    };
    
    for (const slot of eventSlots) {
      const slotResult = this.matchSingleSlot(slot);
      result.slotResults.set(slot.id, slotResult);
      
      // 检查强制槽位
      if (slot.required && !slotResult.matched) {
        result.canExecute = false;
        result.reason = `缺少必需的槽位: ${slot.id}`;
      }
      
      // 累积效果
      if (slotResult.matched && slotResult.effects) {
        this.accumulateEffects(result.totalEffects, slotResult.effects);
      }
    }
    
    return result;
  }
  
  private matchSingleSlot(slot: EventSlot): SlotResult {
    // 从常驻道具栏查找匹配
    const matches = this.permanents.findByTags(slot.tags);
    
    if (matches.length === 0) {
      return {
        slot,
        matched: false,
        selectedItem: null,
        alternatives: [],
        effects: {}
      };
    }
    
    const selected = matches[0];  // 优先级最高的
    
    return {
      slot,
      matched: true,
      selectedItem: selected,
      alternatives: matches.slice(1),
      effects: selected.slotEffects || {}
    };
  }
  
  private accumulateEffects(total: any, slotEffect: SlotEffect): void {
    if (slotEffect.actionPointCostModifier) {
      total.actionPointCostModifier += slotEffect.actionPointCostModifier;
    }
    if (slotEffect.moneyMultiplier) {
      total.moneyMultiplier *= slotEffect.moneyMultiplier;
    }
    if (slotEffect.moneyBaseModifier) {
      total.moneyBaseModifier += slotEffect.moneyBaseModifier;
    }
    if (slotEffect.checkBonus) {
      Object.assign(total.checkBonus, slotEffect.checkBonus);
    }
    if (slotEffect.unlockOptions) {
      total.unlockOptions.push(...slotEffect.unlockOptions);
    }
  }
}
```

---

## 4. 与事件系统的交互

### 4.1 事件执行时的物品处理

```typescript
interface EventExecutionContext {
  // 事件信息
  event: GameEvent;
  
  // 槽位匹配结果（由InventoryManager提供）
  slotMatch: SlotMatchResult;
  
  // 玩家选择（如果有多个选项）
  selectedOption?: string;
  
  // 手动更换的槽位道具（玩家可能更换了默认选择）
  manualSlotOverrides?: Map<string, string>; // slotId -> itemId
}

/**
 * 事件执行流程中的物品相关步骤
 */
function executeEventWithItems(context: EventExecutionContext): EventResult {
  const { event, slotMatch, manualSlotOverrides } = context;
  
  // 1. 应用手动更换的道具
  const finalSlots = applyManualOverrides(slotMatch, manualSlotOverrides);
  
  // 2. 计算最终消耗和收益
  const finalCost = calculateFinalCost(event, finalSlots.totalEffects);
  const finalReward = calculateFinalReward(event, finalSlots.totalEffects);
  
  // 3. 检查消耗型道具需求
  if (event.consumableRequirements) {
    for (const req of event.consumableRequirements) {
      if (!inventory.consumables.hasItem(req.itemId, req.count)) {
        return { success: false, reason: `缺少消耗品: ${req.itemId}` };
      }
    }
  }
  
  // 4. 扣除消耗
  // 4.1 扣除行动点和金钱
  player.actionPoints -= finalCost.actionPoints;
  player.money -= finalCost.money;
  
  // 4.2 扣除消耗型道具
  if (event.consumableRequirements) {
    for (const req of event.consumableRequirements) {
      inventory.consumables.removeItem(req.itemId, req.count);
    }
  }
  
  // 4.3 处理常驻道具的固定消耗（某些道具每回合消耗）
  for (const [slotId, slotResult] of finalSlots.slotResults) {
    if (slotResult.selectedItem?.upkeepCost) {
      // 固定消耗在回合开始时统一处理
    }
  }
  
  // 5. 应用效果
  applyEffects(finalReward);
  
  // 6. 处理道具删除（如果被标记）
  // ...
  
  return { success: true };
}
```

### 4.2 UI层的数据需求

```typescript
interface ItemUIData {
  // 消耗品道具栏UI数据
  consumableUI: {
    items: {
      itemId: string;
      name: string;
      description: string;
      icon: string;
      count: number;
      maxStack: number;
      usable: boolean;           // 是否可以使用
    }[];
    usedSlots: number;
    maxSlots: number;
  };
  
  // 常驻道具栏UI数据
  permanentUI: {
    items: {
      itemId: string;
      name: string;
      description: string;
      icon: string;
      tags: string[];
      priority: number;
      passiveEffectsDescription: string;
      upkeepCostDescription?: string;
    }[];
    usedSlots: number;
    maxSlots: number;
  };
  
  // 事件槽位UI数据（执行事件时）
  eventSlotUI: {
    eventId: string;
    slots: {
      slotId: string;
      name: string;
      required: boolean;
      matched: boolean;
      selectedItem: {
        itemId: string;
        name: string;
        icon: string;
        effectsDescription: string;
      } | null;
      alternatives: {
        itemId: string;
        name: string;
        icon: string;
        effectsDescription: string;
      }[];
    }[];
    totalEffectsDescription: string;
  };
}
```

---

## 5. 数据持久化

### 5.1 存档数据结构

```typescript
interface InventorySaveData {
  version: number;               // 存档版本（兼容性）
  
  // 消耗品道具栏（只需要存ID和数量）
  consumables: {
    itemId: string;
    count: number;
  }[];
  
  // 常驻道具栏（需要存完整ID列表）
  permanents: string[];          // 只存ID，具体数据从配置表读取
  
  // 书籍池状态（需要存剩余的书籍ID）
  bookPool: {
    remainingBookIds: string[];
  };
  
  // 跨场景持久化的特殊状态
  crossSceneState?: {
    // 某些道具的跨场景状态（如健身月卡的剩余回合）
    [itemId: string]: any;
  };
}

/**
 * 序列化（存档时调用）
 */
function serializeInventory(manager: InventoryManager): InventorySaveData {
  return {
    version: 1,
    consumables: Array.from(manager.consumables.items.entries()).map(
      ([itemId, count]) => ({ itemId, count })
    ),
    permanents: manager.permanents.items.map(item => item.id),
    bookPool: {
      remainingBookIds: manager.bookPool.getRemainingBooks().map(b => b.id)
    }
  };
}

/**
 * 反序列化（读档时调用）
 */
function deserializeInventory(
  data: InventorySaveData,
  itemDatabase: ItemDatabase
): InventoryManager {
  const manager = new InventoryManager();
  
  // 恢复消耗品
  for (const { itemId, count } of data.consumables) {
    manager.consumables.addItem(itemId, count);
  }
  
  // 恢复常驻道具（从数据库读取完整数据）
  for (const itemId of data.permanents) {
    const itemData = itemDatabase.getPermanent(itemId);
    if (itemData) {
      manager.permanents.addItem(itemData);
    }
  }
  
  // 恢复书籍池
  const remainingBooks = data.bookPool.remainingBookIds.map(
    id => itemDatabase.getBook(id)
  ).filter(Boolean);
  manager.bookPool.setRemainingBooks(remainingBooks);
  
  return manager;
}
```

---

## 6. 配置表设计

### 6.1 物品配置表结构

```typescript
// 消耗型道具配置表（可热更新）
interface ConsumableItemConfig {
  [itemId: string]: Omit<ConsumableItem, 'currentStack'>;
}

// 常驻型道具配置表
interface PermanentItemConfig {
  [itemId: string]: PermanentItem;
}

// 书籍配置（也是消耗型的一种）
interface BookItemConfig {
  [bookId: string]: BookItem;
}

// 配置表示例（YAML格式便于策划配置）
```

### 6.2 YAML配置示例

```yaml
# consumables.yml
painkiller:
  id: painkiller
  name: 止痛药
  description: 缓解疼痛，让你暂时忘记伤势
  category: CONSUMABLE
  subCategory: medical
  effects:
    healthRestore: 10
    mentalRestore: 5
  maxStack: 99
  useTarget: self

book_001:
  id: book_001
  name: 轻松英语
  category: CONSUMABLE
  subCategory: book
  bookId: book_001
  rarity: COMMON
  effects:
    attributeBonus:
      english: 1
  maxStack: 1
  useTarget: event
  tags: [book]
  priority: 5

---
# permanents.yml
vehicle_scooter:
  id: vehicle_scooter
  name: 破旧的二手代步车
  description: 一辆二手丰田车...
  category: PERMANENT
  tags: [transport]
  priority: 1
  slotEffects:
    actionPointCostModifier: -1
    moneyMultiplier: 1.0
  upkeepCost:
    moneyPerTurn: 30
  canBeDeleted: true

vehicle_tesla:
  id: vehicle_tesla
  name: 特斯拉 Model S
  description: 中产阶级左派的最爱...
  category: PERMANENT
  tags: [transport]
  priority: 0
  slotEffects:
    actionPointCostModifier: -1
    moneyMultiplier: 1.3
  upkeepCost:
    moneyPerTurn: 60
  canBeDeleted: true
```

---

## 7. 性能优化

### 7.1 缓存策略

```typescript
class InventoryManager {
  // 缓存标签查询结果（常驻道具变更时清空）
  private tagCache: Map<string, PermanentItem[]> = new Map();
  
  findByTags(tags: string[]): PermanentItem[] {
    const cacheKey = tags.sort().join(',');
    
    if (this.tagCache.has(cacheKey)) {
      return this.tagCache.get(cacheKey)!;
    }
    
    const result = this.permanents.items
      .filter(item => item.tags.some(tag => tags.includes(tag)))
      .sort((a, b) => a.priority - b.priority);
    
    this.tagCache.set(cacheKey, result);
    return result;
  }
  
  // 常驻道具变更时清空缓存
  private clearTagCache(): void {
    this.tagCache.clear();
  }
  
  addPermanentItem(item: PermanentItem): boolean {
    const success = this.permanents.addItem(item);
    if (success) this.clearTagCache();
    return success;
  }
}
```

### 7.2 内存优化

```typescript
// 使用享元模式共享配置数据
class ItemDatabase {
  private configs: Map<string, any> = new Map();
  
  // 运行时只存ID和可变状态，配置数据共享
  createRuntimeItem(itemId: string): RuntimeItem {
    const config = this.configs.get(itemId);
    return {
      id: itemId,
      config: config,  // 共享引用
      // 运行时状态
      stackCount: 1,
      durability: config.maxDurability
    };
  }
}
```

---

## 8. 附录

### 8.1 完整类图

```
┌─────────────────────────────────────────────────────────────┐
│                    InventoryManager                          │
├─────────────────────────────────────────────────────────────┤
│  - consumables: ConsumableInventory                          │
│  - permanents: PermanentInventory                            │
│  - bookPool: GlobalBookPool                                  │
├─────────────────────────────────────────────────────────────┤
│  + matchSlotRequirements(slots): SlotMatchResult             │
│  + hasItem(itemId): boolean                                  │
│  + serialize(): InventorySaveData                            │
└────────────────────┬────────────────────────────────────────┘
                     │ uses
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Consumable   │ │  Permanent   │ │ GlobalBook   │
│ Inventory    │ │  Inventory   │ │ Pool         │
├──────────────┤ ├──────────────┤ ├──────────────┤
│ Map<id,count>│ │ Item[]       │ │ BookItem[]   │
├──────────────┤ ├──────────────┤ ├──────────────┤
│+add/remove   │ │+add/remove   │ │+drawRandom() │
│+hasItem()    │ │+findByTags() │ │+reset()      │
└──────────────┘ └──────────────┘ └──────────────┘
        │            │            │
        └────────────┴────────────┘
                     │ contains
                     ▼
            ┌──────────────────┐
            │   ConsumableItem │
            │   PermanentItem  │
            │   BookItem       │
            └──────────────────┘
```

### 8.2 错误处理规范

| 错误场景 | 处理方式 | 返回值 |
|---------|---------|-------|
| 道具栏已满 | 拒绝添加，提示玩家 | `false` |
| 物品不存在 | 记录日志，忽略操作 | `null` |
| 数量不足 | 拒绝消耗，提示玩家 | `false` |
| 槽位不匹配 | 事件不可执行 | `{ canExecute: false, reason }` |
| 书籍池已空 | 购买事件返回提示 | `null` |

### 8.3 调试工具

```typescript
// 调试用工具函数
namespace ItemDebug {
  // 打印道具栏状态
  export function printInventory(manager: InventoryManager): void {
    console.log('=== 消耗品道具栏 ===');
    console.log(`格子: ${manager.consumables.getUsedSlots()}/${manager.consumables.maxSlots}`);
    for (const [id, count] of manager.consumables.items) {
      console.log(`  ${id}: ${count}`);
    }
    
    console.log('=== 常驻道具栏 ===');
    console.log(`格子: ${manager.permanents.items.length}/${manager.permanents.maxSlots}`);
    for (const item of manager.permanents.items) {
      console.log(`  [${item.priority}] ${item.id} | tags: ${item.tags.join(',')}`);
    }
    
    console.log('=== 书籍池 ===');
    console.log(`剩余: ${manager.bookPool.getRemainingCount()}`);
  }
  
  // 模拟槽位匹配
  export function testSlotMatch(
    manager: InventoryManager,
    slotTags: string[]
  ): void {
    const matches = manager.permanents.findByTags(slotTags);
    console.log(`标签 ${slotTags.join(',')} 匹配结果:`);
    for (const item of matches) {
      console.log(`  [P${item.priority}] ${item.name}`);
    }
  }
}
```

---

**文档版本**: v1.0
**最后更新**: 2026-02-25
**状态**: 设计定稿
