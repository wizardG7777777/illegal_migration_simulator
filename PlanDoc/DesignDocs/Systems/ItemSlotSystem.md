# 物品槽位系统（Item Slot System）

## 概述

物品槽位系统是《去美国》的核心道具交互机制。道具通过**属性标签**与**事件槽位**动态匹配，实现灵活的道具-事件联动。

---

## 设计意图

### 解决的问题
传统硬编码方式的痛点：
- 新增道具需要修改所有相关事件代码
- 道具效果分散在各事件文件中，难以维护
- 无法实现"同类道具通用"的逻辑

### 新系统的优势
| 场景 | 旧系统 | 新系统 |
|-----|-------|-------|
| 新增一辆新车 | 修改N个事件代码 | 只需添加一个道具配置 |
| 新增一个打工事件 | 复制粘贴判断逻辑 | 只需声明槽位配置 |
| 修改道具效果 | 全局搜索替换 | 只改道具自己的配置 |

**代码量减少约 70%，维护成本大幅降低。**

---

## 核心概念

### 三个核心要素

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   事件 (Event)   │────▶│   槽位 (Slot)    │◀────│   道具 (Item)    │
│                 │     │                 │     │                 │
│ - 打工          │     │ - 标签要求       │     │ - 属性标签       │
│ - 读书          │     │ - 是否强制       │     │ - 优先级         │
│ - 移动          │     │ - 槽位效果       │     │ - 槽位效果       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 属性标签（Item Tags）

道具的"身份标识"，用于匹配槽位：

| 标签 | 说明 | 典型道具 |
|-----|------|---------|
| `transport` | 交通工具 | 电动车、二手车、特斯拉 |
| `weapon` | 武器 | 砍刀、防狼喷雾 |
| `medical` | 医疗物品 | 止痛药、绷带、强化剂 |
| `book` | 书籍类 | 各类技能书 |
| `identity` | 身份凭证 | 假SSN、工牌 |
| `lodging` | 住宿场所 | 公寓钥匙、家庭旅馆钥匙 |
| `tool` | 工具类 | 指南针、手机 |
| `contact` | 人脉/联系人 | 蛇头名片、同乡会臂章 |
| `document` | 文件/证件 | 假毕业证、租房合同 |
| `membership` | 会员资格 | 健身卡 |
| `food` | 食物 | 咖啡、能量饮料 |
| `survival_gear` | 生存装备 | 睡袋、水袋 |
| `guide` | 向导 | 胡安、阿米尔 |
| `payment` | 支付工具 | 借记卡 |

### 槽位类型（Slot Types）

#### 强制槽位（Required = true）
- 无匹配道具时，事件**灰色不可点击**
- 强制玩家获取特定类型道具才能执行

```yaml
示例：健身房训练
槽位:
  - id: membership_slot
    tags: [membership]
    required: true  # 没有健身卡就不能训练
```

#### 可选槽位（Required = false）
- 无匹配道具时，事件**可执行但效果降低**
- 提供奖励空间，鼓励玩家收集道具

```yaml
示例：送外卖
槽位:
  - id: transport_slot
    tags: [transport]
    required: true   # 必须有交通工具
  - id: identity_slot
    tags: [identity]
    required: false  # 有证件收入更高，没有也能干
```

---

## 数据结构

### 事件配置（声明式）

```typescript
interface FixedEvent {
  id: string;
  name: string;
  
  // 槽位配置
  slots: ItemSlot[];
  
  // 基础数值
  baseApCost: number;
  baseIncome?: number;
}

interface ItemSlot {
  id: string;              // 槽位唯一标识
  tags: string[];          // 接受的标签列表（满足其一即可）
  required: boolean;       // 是否强制
  
  // UI 显示
  name?: string;           // 槽位名称（如"交通工具"）
  hint?: string;           // 空槽位时的提示（如"你需要一辆车"）
}
```

### 道具配置（标签化）

```typescript
interface PermanentItem {
  id: string;
  name: string;
  tags: string[];          // 属性标签
  priority: number;        // 0-9，数字越小优先级越高
  
  // 槽位效果（应用到不同槽位时的效果）
  slotEffects: {
    apCost?: number;       // 行动点消耗修正
    incomeMultiplier?: number;  // 收入倍率
    extraEffects?: Effect[];    // 额外效果
  };
}
```

---

## 匹配流程

```
1. 玩家点击事件
        │
        ▼
2. 系统检查事件的槽位配置
   ├── 对每个槽位：
   │   └── 筛选玩家道具中 tags 匹配的物品
   │   └── 按 priority 排序（数字小的在前）
   │
3. 验证强制槽位
   ├── 有未匹配的 required=true 槽位？
   │   └── 事件灰色，显示"缺少 XX"
   │
4. 默认选中优先级最高的道具
   └── 玩家可手动更换
   
5. 计算最终数值
   ├── 基础值 + 所有槽位效果
   └── 显示给玩家确认
   
6. 执行事件
```

### 匹配算法伪代码

```javascript
// 获取匹配槽位的所有道具
function getMatchingItems(player, slot) {
  return player.permanentItems
    .filter(item => item.tags.some(tag => slot.tags.includes(tag)))
    .sort((a, b) => a.priority - b.priority);
}

// 计算事件最终属性
function calculateEventStats(event, player) {
  let finalApCost = event.baseApCost;
  let finalIncome = event.baseIncome || 0;
  const equippedSlots = {};
  
  for (const slot of event.slots) {
    const matches = getMatchingItems(player, slot);
    
    if (matches.length === 0) {
      if (slot.required) {
        return { canExecute: false, reason: `缺少必需槽位: ${slot.name}` };
      }
      continue;
    }
    
    // 默认选中优先级最高的
    const selected = matches[0];
    equippedSlots[slot.id] = selected;
    
    // 应用槽位效果
    if (selected.slotEffects) {
      finalApCost += selected.slotEffects.apCost || 0;
      finalIncome *= selected.slotEffects.incomeMultiplier || 1;
    }
  }
  
  return { 
    canExecute: true, 
    apCost: finalApCost, 
    income: Math.floor(finalIncome),
    equippedSlots 
  };
}
```

---

## 优先级设计

优先级范围 0-9，**数字越小越优先**。

### 优先级分配原则

| 优先级 | 说明 | 示例 |
|-------|------|------|
| 0 | 传奇/顶级道具 | 特斯拉 Model S、走私客阿米尔 |
| 1 | 高级道具 | 二手车、军用手电筒 |
| 2 | 中级道具 | 电动车、普通指南针 |
| 3 | 基础道具 | 水袋、睡袋 |
| 4-5 | 普通道具 | 瓶装咖啡、止痛药 |
| 6-9 | 临时/低价值 | 一次性道具 |

### 优先级的作用

1. **默认选中**：系统推荐最好的道具
2. **玩家决策空间**：可以手动降级使用（如保留好车体力，用破车应付简单任务）
3. **稀有度暗示**：玩家能直观感受道具价值

---

## 各场景槽位配置示例

### 场景1：国内准备

```yaml
# 快递分拣临时工
act1_work_delivery:
  slots:
    - id: transport_slot
      tags: [transport]
      required: false
      hint: "有代步工具可以更快完成"
  baseApCost: 3
  baseIncome: 80

# 健身房训练
act1_train_gym:
  slots:
    - id: membership_slot
      tags: [membership]
      required: true
      hint: "需要健身房会员卡"
  baseApCost: 2

# 读书学习
act1_read_book:
  slots:
    - id: book_slot
      tags: [book]
      required: true
      hint: "你需要一本书"
  baseApCost: 2
```

### 场景2：跨境穿越

```yaml
# 独自穿越雨林
act2_move_jungle:
  slots:
    - id: tool_slot
      tags: [tool]
      required: false
      hint: "指南针可以降低迷路风险"
    - id: weapon_slot
      tags: [weapon]
      required: false
      hint: "武器可以应对危险"
  baseApCost: 4

# 向导带路
act2_move_guide:
  slots:
    - id: guide_slot
      tags: [guide]
      required: true
      hint: "你需要一个向导"
  baseApCost: 3
```

### 场景3：美国生存

```yaml
# 送外卖
act3_work_delivery:
  slots:
    - id: transport_slot
      tags: [transport]
      required: true
      hint: "你需要一辆交通工具"
    - id: identity_slot
      tags: [identity]
      required: false
      hint: "有证件可以获得更高收入"
  baseApCost: 2
  baseIncome: 40

# Uber司机
act3_work_uber:
  slots:
    - id: transport_slot
      tags: [transport]
      required: true
    - id: identity_slot
      tags: [identity]
      required: true
      hint: "Uber需要身份验证"
  baseApCost: 2
  baseIncome: 120
```

---

## 道具槽位效果表

### 交通工具类

| 道具ID | 名称 | 优先级 | transport_slot 效果 |
|-------|------|-------|---------------------|
| `vehicle_tesla` | 特斯拉 Model S | 0 | 行动点-1，收入×1.3 |
| `vehicle_scooter` | 二手代步车 | 1 | 行动点-1，收入×1.0 |
| `vehicle_ebike` | 电动车 | 2 | 行动点+0，收入×0.9 |

### 身份类

| 道具ID | 名称 | 优先级 | identity_slot 效果 |
|-------|------|-------|-------------------|
| `badge_warehouse` | 仓库工牌 | 2 | 行动点-1，基础收入+70 |
| `fake_ssn` | 假SSN | 1 | 基础收入+50%，60%过检查 |
| `uber_driver` | Uber司机账号 | 1 | 解锁Uber，收入+120，有封号风险 |

### 向导类

| 道具ID | 名称 | 优先级 | guide_slot 效果 |
|-------|------|-------|----------------|
| `smuggler_amir` | 走私客阿米尔 | 0 | 成功率+30%，封锁随机事件 |
| `guide_juan` | 向导胡安 | 1 | 成功率+20% |

---

## UI 交互设计

### 事件卡片展示

```
┌─────────────────────────────┐
│ [图标] 送外卖                │
├─────────────────────────────┤
│ 给中餐馆送外卖，收入稳定     │
├─────────────────────────────┤
│ 必需槽位:                   │
│ 🚗 交通工具: [特斯拉 ▼]     │  ← 下拉选择其他车辆
│    行动点-1，收入×1.3       │
├─────────────────────────────┤
│ 可选槽位:                   │
│ 🆔 证件: [假SSN ▼]          │  ← 未装备时显示"无"
│    收入+50%                 │
├─────────────────────────────┤
│ 预计收益: 行动点-1，收入+$60 │
│ [执行]                      │
└─────────────────────────────┘
```

### 强制槽位未满足时

```
┌─────────────────────────────┐
│ [图标] 健身房训练            │
├─────────────────────────────┤
│ 系统性提升体能               │
├─────────────────────────────┤
│ ❌ 缺少: 健身房会员卡       │  ← 红色提示
│    你需要先获得会员卡        │
├─────────────────────────────┤
│ [灰色不可点击]              │
└─────────────────────────────┘
```

---

## 设计原则总结

1. **强制槽位用于门槛**：确保玩家必须拥有某类道具才能做某事
2. **可选槽位用于奖励**：鼓励但不强迫玩家收集道具
3. **优先级创造选择**：玩家可以策略性地分配道具使用
4. **标签保持简洁**：一个道具可以有多个标签，但每个标签要有明确含义
5. **效果公式透明**：玩家应该能直观理解道具带来的收益
