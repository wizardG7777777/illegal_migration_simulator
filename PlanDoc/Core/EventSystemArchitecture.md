# 事件系统架构设计

## 1. 概述

本文档定义《去美国》游戏的核心事件系统架构，包含事件分类、事件池管理、物品槽位匹配、事件链机制等核心模块的设计规范。

---

## 2. 事件分类体系

### 2.1 分类总览

| 分类 | 英文标识 | 触发方式 | 可重复性 | 典型示例 |
|-----|---------|---------|---------|---------|
| **随机事件** | `RANDOM` | 回合开始自动触发 | 否 | 暴雨、警察临检、捡到钱 |
| **固定事件** | `FIXED` | 玩家主动选择执行 | 是/否配置 | 打工、读书、购买物品 |
| **事件链** | `CHAIN` | 前置事件完成后触发 | 链内顺序执行 | 庇护申诉I→II→III |

### 2.2 随机事件（Random Event）

**定义**：每个回合开始时，由系统自动判定触发的事件。

**核心特征**：
- ❌ 玩家不能在行动阶段主动触发
- ❌ 玩家不能主动重新执行
- ✅ 可以有前置条件（属性要求、道具要求、场景状态）
- ✅ 可以有后续效果（状态改变、下一回合预设）
- ✅ 触发后进入事件队列，强制执行或选择执行

**数据结构**：
```typescript
interface RandomEvent {
  id: string;                    // 唯一标识
  category: 'RANDOM';
  name: string;                  // 显示名称
  description: string;           // 事件描述
  
  // 触发配置
  trigger: {
    phase: 'TURN_START';         // 固定回合开始阶段
    weight: number;              // 触发权重（概率基数）
    conditions?: Condition[];    // 前置条件
    cooldown?: number;           // 冷却回合（触发后N回合不再触发）
    maxTriggers?: number;        // 最大触发次数（整局游戏）
  };
  
  // 场景限定
  scenes: string[];              // 可触发的场景列表
  
  // 执行逻辑
  execute: (context: EventContext) => EventResult;
}
```

**示例**：
```yaml
# 场景2随机事件：暴雨袭击
id: rand2_storm
category: RANDOM
name: 暴雨袭击
trigger:
  phase: TURN_START
  weight: 20                    # 基础权重20
  conditions:
    - type: SCENE
      value: act2
    - type: WEATHER
      value: rainy_season
  cooldown: 3                   # 触发后3回合内不再触发
scenes: [act2]
execute: |
  身体健康度 -= 15
  行动点 -= 1
  如果 持有 sleeping_bag: 免疫()
```

### 2.3 固定事件（Fixed Event）

**定义**：玩家在行动阶段可以主动选择执行的事件。

**核心特征**：
- ✅ 玩家在行动列表中可见、可点击
- ✅ 可以配置为可重复或一次性
- ✅ 消耗行动点（通常）
- ✅ 可以有物品槽位要求
- ✅ 可以有属性检定

**数据结构**：
```typescript
interface FixedEvent {
  id: string;
  category: 'FIXED';
  name: string;
  description: string;
  
  // 执行配置
  execution: {
    repeatable: boolean;         // 是否可重复执行
    maxExecutions?: number;      // 最大执行次数（限次事件）
    actionPointCost: number;     // 基础行动点消耗
    moneyCost?: number;          // 金钱消耗
    moneyCurrency?: 'CNY' | 'USD'; // 货币类型
  };
  
  // 物品槽位要求
  slots?: EventSlot[];           // 物品槽位配置
  
  // 场景限定
  scenes: string[];
  
  // 执行逻辑
  execute: (context: EventContext, equippedSlots: EquippedSlots) => EventResult;
}
```

**示例**：
```yaml
# 场景1固定事件：连锁超市夜班
id: act1_work_supermarket
category: FIXED
name: 连锁超市夜班
execution:
  repeatable: true               # 可重复
  actionPointCost: 2
slots:
  - id: identity_slot
    tags: [identity]             # 需要身份标签道具
    required: false              # 非强制，但有则效果更好
    effects:
      actionPointCost: -1        # 减少1行动点消耗
scenes: [act1]
execute: |
  现金 += 80
  身体健康度 -= 5
  如果 槽位有道具: 现金 += 20
```

### 2.4 事件链（Event Chain）

**定义**：由多个节点事件组成的有序序列，节点之间存在依赖关系。

**核心特征**：
- ⛓️ 线性或分支结构
- 🔒 节点有前置依赖（必须完成前一节点）
- 🔄 链内事件通常不可重复（除非配置）
- 📍 可以跨场景（如场景1开始，场景3结束）
- 🎯 通常有最终奖励或结局

**数据结构**：
```typescript
interface EventChain {
  id: string;                    // 链ID
  name: string;                  // 链名称
  description: string;           // 链描述
  
  // 节点定义
  nodes: ChainNode[];
  
  // 链类型
  type: 'LINEAR' | 'BRANCHING' | 'LOOP';
  
  // 启动条件
  startCondition?: Condition[];  // 链的启动条件
  
  // 完成奖励
  completionReward?: Reward;
}

interface ChainNode {
  id: string;                    // 节点ID（对应FixedEvent.id）
  index: number;                 // 在链中的位置
  
  // 前置依赖
  prerequisites: {
    nodes: string[];             // 必须完成的前置节点
    condition: 'ALL' | 'ANY';    // 全部或任一
  };
  
  // 分支配置（BRANCHING类型时有效）
  branches?: {
    condition: Condition;        // 分支条件
    nextNode: string;            // 满足条件时的下一节点
    fallbackNode?: string;       // 不满足时的回退节点
  }[];
  
  // 节点属性
  skippable: boolean;            // 是否可跳过
  repeatable: boolean;           // 节点是否可重复
}
```

**示例**：庇护申诉事件链
```yaml
# 庇护申诉事件链
id: chain_asylum
name: 政治庇护申请
type: BRANCHING
nodes:
  - id: asylum_1_consult        # 节点1：咨询律师
    index: 0
    prerequisites: { nodes: [], condition: ANY }
    next: asylum_2_prepare
    
  - id: asylum_2_prepare        # 节点2：准备材料
    index: 1
    prerequisites: { nodes: [asylum_1_consult], condition: ALL }
    branches:
      - condition: 智力 >= 7
        nextNode: asylum_3_submit_strong   # 材料准备充分
      - condition: 智力 < 7
        nextNode: asylum_3_submit_weak     # 材料有瑕疵
        
  - id: asylum_3_submit_strong  # 节点3A：强势提交
    index: 2
    prerequisites: { nodes: [asylum_2_prepare], condition: ALL }
    next: asylum_4_result
    
  - id: asylum_3_submit_weak    # 节点3B：弱势提交
    index: 2
    prerequisites: { nodes: [asylum_2_prepare], condition: ALL }
    next: asylum_4_result
    
  - id: asylum_4_result         # 节点4：结果
    index: 3
    prerequisites: { nodes: [asylum_3_submit_strong, asylum_3_submit_weak], condition: ANY }
    branches:
      - condition: 前置为 asylum_3_submit_strong AND 运气检定通过
        nextNode: END_SUCCESS
      - condition: 前置为 asylum_3_submit_weak OR 运气检定失败
        nextNode: END_DEPORT

completionReward:
  END_SUCCESS: { 结局: '庇护通过，获得临时绿卡' }
  END_DEPORT: { 结局: '申请被拒，进入遣返程序' }
```

---

## 3. 事件池（Event Pool）

### 3.1 定义

**事件池**是每个场景下可触发/可执行事件的集合。不在事件池中的事件不能被触发或执行。

### 3.2 事件池类型

| 类型 | 说明 | 内容 |
|-----|------|------|
| **Random Pool** | 随机事件池 | 本场景所有可能触发的随机事件 |
| **Fixed Pool** | 固定事件池 | 本场景玩家可主动执行的事件 |
| **Chain Pool** | 事件链池 | 本场景可启动或进行中的事件链 |

### 3.3 事件池管理器

```typescript
interface EventPoolManager {
  // 当前场景
  currentScene: string;
  
  // 各场景的事件池
  pools: Map<string, SceneEventPool>;
  
  // 跨场景持久化的事件链状态
  persistentChains: Map<string, ChainProgress>;
  
  // 方法
  loadScene(sceneId: string): void;
  getRandomPool(): RandomEvent[];
  getFixedPool(): FixedEvent[];
  getActiveChains(): EventChain[];
  addEventToPool(event: GameEvent, sceneId?: string): void;
  removeEventFromPool(eventId: string, sceneId?: string): void;
}

interface SceneEventPool {
  sceneId: string;
  randomEvents: RandomEvent[];
  fixedEvents: FixedEvent[];
  chainStarters: EventChain[];    // 可在此场景启动的链
  activeChains: ChainProgress[];   // 进行中的链
}
```

### 3.4 场景切换时的池切换

**重要设计决策**：场景切换时**完全清空常驻道具栏**，制造"从零开始"的压迫感。

```typescript
function switchScene(fromScene: string, toScene: string) {
  // 1. 保存极少数跨场景数据（书籍池、事件链进度）
  const crossSceneData = {
    bookPool: inventory.bookPool.getRemainingBooks(),
    activeChains: poolManager.getCrossSceneChains()
  };
  
  // 2. 完全清空事件池，加载新场景实例
  poolManager.clearAllPools();
  poolManager.loadScenePools(toScene);
  
  // 3. 【核心】完全清空常驻道具栏（制造从零开始的感觉）
  inventory.permanents.clear();
  
  // 4. 给玩家新场景的"启动物资"（避免完全无法开始）
  giveStarterKit(toScene, method);
  
  // 5. 恢复跨场景数据
  inventory.bookPool.setRemainingBooks(crossSceneData.bookPool);
  poolManager.restoreCrossSceneChains(crossSceneData.activeChains);
  
  // 6. 更新当前场景
  poolManager.currentScene = toScene;
}

/**
 * 新场景启动物资
 * 避免玩家清空后完全无法开始游戏
 */
function giveStarterKit(scene: string, method: string) {
  switch(scene) {
    case 'act2':
      // 场景2：跨境生存的基础物资
      inventory.consumables.addItem('water', 3);
      inventory.consumables.addItem('biscuit', 2);
      break;
    case 'act3':
      // 场景3：入境时的少量美元
      character.resources.money.usd = 200;
      break;
  }
}
```

**设计理由**：
- **叙事契合**：非法移民跨境时通常会失去一切，从头开始
- **游戏性**：每个场景都是独立的生存挑战，而非累积优势
- **策略深度**：场景1的投资（买车、买卡）变成"沉没成本"，迫使玩家重新决策
- **Rogue-like体验**：每个场景类似独立的"Run"，上一场景积累的是"经验"而非"装备"

**例外情况**（如需保留极少数道具）：
```typescript
// 如果某些道具理应跨场景保留（如特殊剧情物品）
const crossSceneItems = inventory.permanents.items
  .filter(item => item.tags.includes('cross_scene'));  // 特殊标记

inventory.permanents.clear();
crossSceneItems.forEach(item => inventory.permanents.add(item));
```

---

## 4. 物品槽位系统

### 4.1 核心概念

事件可以通过**物品槽位**与玩家的常驻道具动态匹配，无需硬编码绑定具体道具ID。

### 4.2 槽位配置

```typescript
interface EventSlot {
  id: string;                    // 槽位ID（如 transport_slot）
  tags: string[];                // 要求的属性标签
  required: boolean;             // 是否强制要求
  description?: string;          // 槽位说明
  
  // 槽位效果（匹配的道具提供的效果）
  effects?: SlotEffect;
}

interface SlotEffect {
  actionPointCost?: number;      // 行动点消耗调整
  moneyMultiplier?: number;      // 金钱收益倍率
  successRateModifier?: number;  // 成功率调整
  attributeBonus?: AttributeSet; // 属性检定加成
  unlockOptions?: string[];      // 解锁的选项ID
}
```

### 4.3 道具标签与优先级

```typescript
interface PermanentItem {
  id: string;
  name: string;
  
  // 标签系统
  tags: string[];                // 属性标签（如 ['transport', 'luxury']）
  priority: number;              // 优先级 0-9，数字越小越优先
  
  // 槽位效果（当被事件匹配时生效）
  slotEffects: SlotEffect;
  
  // 被动效果（常驻生效）
  passiveEffects?: PassiveEffect;
}
```

### 4.4 匹配算法

```typescript
function matchItemsToSlots(
  playerItems: PermanentItem[],
  eventSlots: EventSlot[]
): SlotMatchResult {
  const result: SlotMatchResult = {
    canExecute: true,
    equippedSlots: {},
    totalEffects: {},
    missingRequiredSlots: []
  };
  
  for (const slot of eventSlots) {
    // 1. 筛选匹配道具
    const matches = playerItems.filter(item => 
      item.tags.some(tag => slot.tags.includes(tag))
    );
    
    // 2. 按优先级排序
    matches.sort((a, b) => a.priority - b.priority);
    
    if (matches.length === 0) {
      if (slot.required) {
        result.canExecute = false;
        result.missingRequiredSlots.push(slot.id);
      }
      continue;
    }
    
    // 3. 默认选中优先级最高的
    const selected = matches[0];
    result.equippedSlots[slot.id] = {
      slot: slot,
      item: selected,
      alternatives: matches.slice(1)  // 其他可选项
    };
    
    // 4. 累积效果
    mergeEffects(result.totalEffects, selected.slotEffects);
  }
  
  return result;
}
```

---

## 5. 系统交互流程

### 5.1 回合流程

```
┌─────────────────────────────────────────────────────────┐
│                      回合开始                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              1. 随机事件判定阶段                         │
│  - 从 Random Pool 中按权重抽取事件                       │
│  - 检查条件、冷却、最大次数                               │
│  - 触发符合条件的事件                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              2. 事件执行阶段（如果是强制）                │
│  - 执行随机事件                                          │
│  - 更新状态                                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              3. 玩家行动阶段                             │
│  - 显示 Fixed Pool 中的可用事件                          │
│  - 检查物品槽位匹配，计算最终消耗                        │
│  - 玩家选择事件执行                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              4. 事件链检查                               │
│  - 检查是否有链节点变为可用                              │
│  - 更新链进度                                            │
│  - 检查链完成条件                                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              5. 回合结束                                 │
│  - 应用持续效果                                          │
│  - 更新冷却计时器                                        │
│  - 检查终结态                                            │
└─────────────────────────────────────────────────────────┘
```

### 5.2 事件执行流程

```
玩家点击固定事件
      │
      ▼
获取事件的槽位配置
      │
      ▼
匹配玩家道具 ▶ 按优先级排序 ▶ 默认选中最高优先级
      │
      ▼
显示事件详情界面
  - 基础消耗
  - 匹配的道具及效果
  - 可手动更换道具（其他匹配项）
      │
      ▼
玩家确认 / 更换道具 / 取消
      │
      ▼
计算最终效果
  基础值 + 槽位效果 = 最终结果
      │
      ▼
执行事件 ▶ 更新状态 ▶ 消耗道具（如果是消耗型）
      │
      ▼
检查事件链触发
      │
      ▼
返回行动列表
```

---

## 6. 配置示例

### 6.1 完整事件配置

```yaml
# 场景3：送外卖事件（完整配置）
event:
  id: act3_work_delivery
  category: FIXED
  name: 送外卖
  description: 骑上你的车，开始送外卖。有证件收入更高。
  
  scenes: [act3]
  
  execution:
    repeatable: true
    actionPointCost: 2
    
  slots:
    - id: transport_slot
      tags: [transport]
      required: true
      description: "需要交通工具"
      
    - id: identity_slot
      tags: [identity]
      required: false
      description: "有证件收入更高"
      
  baseEffects:
    money: 40                    # 无证件基础收入
    health: -3
    
  slotEffectsModifers:
    transport_slot:
      vehicle_tesla:
        actionPointCost: -1
        moneyMultiplier: 1.3
      vehicle_scooter:
        actionPointCost: -1
        moneyMultiplier: 1.0
      vehicle_ebike:
        moneyMultiplier: 0.9
        
    identity_slot:
      fake_ssn:
        moneyBase: 60            # 有证件基础收入提升至60
      uber_driver:
        moneyBase: 60
        unlockOptions: [uber_upgrade]
        
  options:
    - id: normal_delivery
      name: 正常送单
      effect: { money: BASE, health: -3 }
      
    - id: rush_delivery
      name: 抢时间送单
      condition: 体魄 >= 6
      effect: { money: BASE * 1.2, health: -8 }
      
    - id: uber_upgrade
      name: 转为Uber司机（需要uber_driver）
      condition: 槽位有 uber_driver
      redirectEvent: act3_work_uber
```

---

## 7. 扩展性设计

### 7.1 添加新事件类型

如需添加新的事件类型（如`TIMED_EVENT`定时事件）：

1. 在 `EventCategory` 枚举中添加类型
2. 创建对应的 `TimedEvent` 接口继承 `BaseEvent`
3. 在 `EventPoolManager` 中添加处理逻辑
4. 在游戏循环中添加触发检查

### 7.2 添加新的槽位效果类型

如需添加新的槽位效果（如`timeModifier`时间调整）：

1. 在 `SlotEffect` 接口中添加字段
2. 在 `matchItemsToSlots` 中累计算法
3. 在事件执行时应用效果

---

## 8. 附录

### 8.1 属性标签列表

| 标签 | 说明 | 典型道具 |
|-----|------|---------|
| `transport` | 交通工具 | 二手车、特斯拉、电动车 |
| `lodging` | 住宿场所 | 公寓钥匙、旅馆钥匙 |
| `identity` | 身份凭证 | 假SSN、工牌、驾照 |
| `weapon` | 武器 | 砍刀 |
| `tool` | 工具 | 指南针、手机、地图 |
| `guide` | 向导服务 | 墨西哥向导、走私客 |
| `medical` | 医疗物品 | 止痛药、抗生素 |
| `book` | 书籍 | 各类书籍 |
| `food` | 食物 | 能量饮料、咖啡 |
| `document` | 文件证件 | 假学历、推荐信 |
| `payment` | 支付工具 | 借记卡 |
| `contact` | 人脉关系 | 蛇头名片、同乡臂章 |
| `membership` | 会员资格 | 健身月卡 |
| `survival_gear` | 生存装备 | 睡袋、水袋 |

### 8.2 事件ID命名规范

| 类型 | 前缀 | 示例 |
|-----|------|------|
| 场景1固定事件 | `act1_` | `act1_work_supermarket` |
| 场景2固定事件 | `act2_` | `act2_move_guide` |
| 场景3固定事件 | `act3_` | `act3_work_delivery` |
| 场景1随机事件 | `rand1_` | `rand1_police_visit` |
| 场景2随机事件 | `rand2_` | `rand2_storm` |
| 场景3随机事件 | `rand3_` | `rand3_account_banned` |
| 通用随机事件 | `rand_` | `rand_lucky_money` |
| 事件链 | `chain_` | `chain_asylum` |
| 链节点 | `{链ID}_{节点}` | `asylum_1_consult` |
| 终结态事件 | `term1/2/3_` | `term3_emergency` |

---

**文档版本**: v1.0
**最后更新**: 2026-02-25
**状态**: 设计定稿
