# 事件系统架构设计

## 1. 概述

本文档定义《去美国》游戏的核心事件系统架构，包含事件分类、事件池管理、物品槽位匹配、事件链机制等核心模块的设计规范。

---

## 2. 事件分类体系

### 2.1 分类总览

| 分类 | 英文标识 | 触发方式 | 可重复性 | 典型示例 | 场景限制 |
|-----|---------|---------|---------|---------|---------|
| **随机事件** | `RANDOM` | 回合开始自动触发 | 否 | 暴雨、警察临检、捡到钱 | 任意 |
| **固定事件** | `FIXED` | 玩家主动选择执行 | 是/否配置 | 打工、读书、购买物品 | 任意 |
| **事件链** | `CHAIN` | 前置事件完成后触发 | 链内顺序执行 | 庇护申诉I→II→III | 跨场景 |
| **政策压力事件** | `POLICY_PRESSURE` | 回合开始（场景回合限制） | 通常1次 | 特朗普政策公告 | **仅场景3** |

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
interface RandomEventTrigger {
  phase: 'TURN_START' | 'EVENT_DRIVEN';
  weight: number;
  conditions?: Condition[];
  cooldown?: number;
  maxTriggers?: number;
  
  // 新增字段：场景2特有配置
  forceTrigger?: boolean;  // 强制触发（场景2雨林阶段使用）
  act2ProgressCondition?: {  // 场景2进度条件
    min?: number;  // 最小进度
    max?: number;  // 最大进度
  };
}

interface RandomEvent {
  id: string;                    // 唯一标识
  category: 'RANDOM';
  name: string;                  // 显示名称
  description: string;           // 事件描述
  
  // 触发配置
  trigger: RandomEventTrigger;
  
  // 场景限定
  scenes: string[];              // 可触发的场景列表
  
  // 执行逻辑
  execute: (context: EventContext) => EventResult;
}
```

### 2.2.1 场景2强制负面事件

**定义**：场景2（雨林阶段）特有的强制负面事件系统，每回合开始时**强制触发**一个负面事件。

**核心特征**：
- ⚠️ **强制触发**：`forceTrigger: true`，每回合必定触发其一
- 📍 **进度限制**：通过 `act2ProgressCondition` 限制在雨林阶段（进度0-4）触发
- ☠️ **死亡判定**：判定失败直接导致游戏结束
- 🎲 **权重分配**：多个强制事件按权重随机选择

**场景2雨林阶段强制负面事件定义**：

```yaml
# 场景2雨林阶段强制负面事件（每回合触发其一）

id: rand2_bandit
category: RANDOM
name: 丛林劫匪
trigger:
  phase: TURN_START
  forceTrigger: true  # 强制触发
  act2ProgressCondition:
    min: 0
    max: 4  # 仅雨林阶段触发
weight: 20
scenes: [act2]
execute: |
  // 风险意识判定（门槛≥5）
  // 通过：损失50-100美元，心理-10
  // 失败：死亡（death_bandit）

id: rand2_snake
category: RANDOM
name: 毒蛇猛兽
trigger:
  phase: TURN_START
  forceTrigger: true
  act2ProgressCondition: { min: 0, max: 4 }
weight: 20
scenes: [act2]
execute: |
  // 体魄判定（门槛≥5）
  // 通过：健康-15，获得中毒Debuff
  // 失败：死亡（death_snake）

id: rand2_fall
category: RANDOM
name: 危险小径
trigger:
  phase: TURN_START
  forceTrigger: true
  act2ProgressCondition: { min: 0, max: 4 }
weight: 20
scenes: [act2]
execute: |
  // 风险意识判定（门槛≥4）
  // 通过：健康-10，心理-5
  // 失败：死亡（death_fall）

id: rand2_swamp
category: RANDOM
name: 沼泽陷阱
trigger:
  phase: TURN_START
  forceTrigger: true
  act2ProgressCondition: { min: 0, max: 4 }
weight: 15
scenes: [act2]
execute: |
  // 生存能力判定（门槛≥5）
  // 通过：健康-20，行动点-1
  // 失败：死亡（death_swamp）

id: rand2_insect
category: RANDOM
name: 毒虫袭击
trigger:
  phase: TURN_START
  forceTrigger: true
  act2ProgressCondition: { min: 0, max: 4 }
weight: 15
scenes: [act2]
execute: |
  // 体魄判定（门槛≥4）
  // 通过：健康-10，持续掉血3回合
  // 失败：死亡（death_infection）

id: rand2_food
category: RANDOM
name: 可疑食物
trigger:
  phase: TURN_START
  forceTrigger: true
  act2ProgressCondition: { min: 0, max: 4 }
weight: 10
scenes: [act2]
execute: |
  // 智力判定（门槛≥5）
  // 通过：健康-5，心理-5
  // 失败：死亡（death_poison）
```

**强制事件触发流程**：
```
回合开始
    ↓
检查是否在雨林阶段（progress 0-4）
    ↓
是 → 从强制事件池中按权重随机选择一个
    ↓
执行事件 → 属性判定 → 通过/失败 → 对应结果
    ↓
进入玩家行动阶段（选择前进方式）
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

```yaml
# 场景1随机事件：灵光一闪（解锁旅游签证途径）
id: rand1_insight_tourist_visa
category: RANDOM
name: 灵光一闪
description: |
  夜深人静，你盯着天花板发呆。突然，一个念头如闪电般划过脑海——
  
  「等等...为什么非要走线呢？旅游签证！只要我能说服大使馆的官员，
  拿到签证合法入境，不就能直接跳过危险的边境穿越了吗？」
  
  你越想越觉得这个主意可行。虽然面签可能会很难，但只要准备充分，
  撑过那一关...也许这就是你的出路。
  
  【解锁新途径：旅游签证直飞】
  
  你需要准备三样东西才能面签：
  1. 足额的资产证明（或5000元伪造）
  2. 去美国的正当理由（或5000元中介购买）
  3. 详细的行程计划（或5000元中介购买）
  
  全部通过中介办理至少需要15000人民币。
  
  ⚠️ 警告：旅游签面签要求英语≥8，且使用虚假材料有30%概率被永久黑名单！
  
  相比之下，学生签只需要社交≥5，面试100%通过，还可以分期付款...
  也许你应该考虑那条路？
trigger:
  phase: TURN_START
  weight: 30                    # 基础权重30（较高，确保能触发）
  conditions:
    - type: SCENE
      value: act1
    - type: ATTRIBUTE
      attribute: intelligence
      minValue: 7                # 智力≥7才能灵光一闪
    - type: FLAG
      flag: insight_triggered
      value: false               # 只能触发一次
  maxTriggers: 1                # 整局游戏只触发一次
scenes: [act1]
execute: |
  // 设置灵光一闪标记
  setFlag('insight_triggered', true)
  // 解锁旅游签证离境方式
  addToDiscoveredMethods('tourist_visa')
  // 心理健康度略微恢复（找到新希望）
  心理健康度 += 5
  // 解锁签证材料获取途径
  unlockFixedEvent('act1_prepare_bank_statement')   // 开具资产证明
  unlockFixedEvent('act1_diy_itinerary')            // 自行DIY行程
  unlockFixedEvent('act1_hire_visa_agent')          // 请求中介帮忙
  // 刷抖音时可能触发泰勒·斯威夫特演唱会事件（去美国的理由）
  addRandomEventToPool('rand1_taylor_swift_concert')
  
  // 如果社交≥5，同时解锁学生签证途径（更稳定的选择）
  if (attributes.social >= 5) {
    unlockFixedEvent('student_1_contact_agent')
    log("你突然想到：既然有这么多钱，也许可以找中介办个学生签证？")
    log("听说野鸡大学的学生签更容易过，而且不需要很高的英语...")
  }
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
# 场景2固定事件：向导带路（阶段1）
id: act2_move_guide
category: FIXED
name: 向导带路（阶段1）
description: 雇佣向导带领你穿越雨林，每回合自动前进1步
execution:
  repeatable: true
  actionPointCost: 0  # 不消耗行动点，自动前进
  moneyCost: 50
  moneyCurrency: USD
scenes: [act2]
conditions:
  - type: SCENE_STATE
    field: currentPhase
    value: rainforest
execute: |
  progress += 1
  // 回合结束时自动前进

id: act2_move_solo
category: FIXED
name: 独自穿越（阶段1）
description: 独自尝试穿越雨林，需进行生存能力判定
execution:
  repeatable: true
  actionPointCost: 2
scenes: [act2]
conditions:
  - type: SCENE_STATE
    field: currentPhase
    value: rainforest
execute: |
  // 生存能力判定（门槛≥4）
  // 成功：progress += 1
  // 失败：原地不动

id: act2_town_contact_driver
category: FIXED
name: 联系货车司机
description: 通过向导联系可靠的货车司机，安排货柜偷渡
execution:
  repeatable: false
  actionPointCost: 2
  moneyCost: 200
  moneyCurrency: USD
scenes: [act2]
conditions:
  - type: SCENE_STATE
    field: currentPhase
    value: border_town
execute: |
  grantPermanentItem('border_guide')
  // 解锁货车偷渡穿越方式

id: act2_cross_truck
category: FIXED
name: 货车偷渡穿越
description: 藏身在货车货柜中穿越边境
execution:
  repeatable: false
  actionPointCost: 3
scenes: [act2]
slots:
  - id: guide_slot
    requiredTags: [border_guide]
    isMandatory: true
execute: |
  // 自动成功
  health -= 5
  mental -= 10
  // 进入场景3

id: act2_cross_desert
category: FIXED
name: 穿越沙漠缺口
description: 穿越边境墙缺口后的沙漠地带
execution:
  repeatable: false
  actionPointCost: 4
scenes: [act2]
execute: |
  // 生存能力判定（门槛≥8）
  // 成功：进入场景3，现金-20%
  // 失败：死亡（death_desert_crossing）

id: act2_cross_climb
category: FIXED
name: 攀爬边境墙
description: 徒手攀爬边境墙进入美国
execution:
  repeatable: false
  actionPointCost: 4
scenes: [act2]
execute: |
  // 体魄判定（门槛≥12）
  // 成功：进入场景3，健康-20
  // 失败：死亡（death_wall_fall）
```

```yaml
# 场景1固定事件：送外卖（强制槽位示例）
id: act1_work_delivery
category: FIXED
name: 送外卖
execution:
  repeatable: true               # 可重复
  actionPointCost: 2
slots:
  - id: transport_slot
    requiredTags: [transport]    # 需要交通工具（AGENTS.md规范字段名）
    isMandatory: true            # 强制要求！无匹配道具时事件灰色（AGENTS.md规范字段名）
    effects:
      actionPointCost: -1        # 有交通工具时行动点-1
      moneyMultiplier: 1.5       # 收入增加50%
scenes: [act1]
execute: |
  现金 += 100~180（随机）
  身体健康度 -= 8
  心理健康度 -= 2
```

```yaml
# 场景1&3固定事件：刷抖音（日常心理健康恢复）
# 场景1版本
id: act1_scroll_douyin
category: FIXED
name: 刷抖音
description: |
  你躺在床上，手指机械地滑动着屏幕。
  搞笑视频、美食探店、萌宠日常...暂时忘掉现实的烦恼吧。
execution:
  repeatable: true               # 可重复，日常消遣
  actionPointCost: 1
  moneyCost: 0
scenes: [act1]
execute: |
  心理健康度 += 8
  // 如果已经触发灵光一闪但未获得去美国的理由，有概率触发泰勒演唱会事件
  if (getFlag('insight_triggered') && !hasItem('visa_purpose')) {
    if (randomChance(0.3)) {      // 30%概率
      triggerRandomEvent('rand1_taylor_swift_concert')
    }
  }
```

```yaml
# 场景3版本
id: act3_scroll_douyin
category: FIXED
name: 刷抖音
description: |
  躲在狭小的出租屋里，你只能靠短视频来慰藉思乡之情。
  国内的繁华、家人的笑脸...滑动手指，暂时逃离这个陌生的国度。
execution:
  repeatable: true
  actionPointCost: 1
  moneyCost: 0
scenes: [act3]
execute: |
  心理健康度 += 6                  # 场景3压力大，恢复效果略低
  // 可能看到国内朋友的动态，增加思乡之情
  if (randomChance(0.2)) {
    log("看到老家朋友聚会的视频，你感到一阵心酸...")
    心理健康度 -= 3
  }
```

```yaml
# 场景1随机事件：刷抖音发现泰勒·斯威夫特演唱会（去美国的理由）
id: rand1_taylor_swift_concert
category: RANDOM
name: 刷到泰勒·斯威夫特演唱会视频
description: |
  你正在刷抖音，突然一条视频吸引了你的注意——
  
  "泰勒·斯威夫特时代巡回演唱会美国站即将开始！"
  
  视频中，万人合唱《Love Story》的震撼场面让你心跳加速。
  你盯着屏幕，一个念头闪过：
  
  「我可以去看演唱会啊！这是去美国的完美理由！」
  
  【获得：去美国的正当理由】
  【解锁物品：演唱会门票预订单（签证材料）】
trigger:
  phase: EVENT_DRIVEN            # 由刷抖音事件触发，非自动触发
  weight: 0                      # 不加入随机池，只由刷抖音触发
  maxTriggers: 1
scenes: [act1]
execute: |
  // 获得去美国的理由物品
  grantPermanentItem('visa_purpose')
  log("你保存了演唱会信息，这是一个去美国的完美理由！")
  心理健康度 += 5
  // 检查是否已集齐三件材料，是则解锁面签
  checkVisaMaterialsAndUnlockInterview()
```

```yaml
# 场景1固定事件：开具足额的资产证明
id: act1_prepare_bank_statement
category: FIXED
name: 开具足额的资产证明
description: |
  你需要向签证官证明你有足够的经济能力负担美国之行。
  大使馆要求提供30万人民币的银行存款证明。
  
  你有两个选择：
  1. 如果存款足够，找银行开具真实证明
  2. 找"特殊渠道"伪造一份（有风险但省钱）
execution:
  repeatable: false              # 一次性，获取后即持有
  actionPointCost: 2
  moneyCost: 0                   # 基础成本为0，执行时判断
scenes: [act1]
execute: |
  if (现金 >= 300000) {
    // 存款足够，直接开具
    grantPermanentItem('visa_bank_statement')
    log("你成功开具了真实的银行存款证明。")
    心理健康度 += 3
  } else {
    // 存款不足，需要伪造
    cost = 5000                   // 伪造费用
    if (现金 >= cost) {
      现金 -= cost
      grantPermanentItem('visa_bank_statement')
      log("你花了5000元通过特殊渠道弄到了一份存款证明...希望不会被查出来。")
      // 添加风险：面签时可能被发现造假
      setFlag('visa_document_risk', true)
    } else {
      log("你连伪造证明的钱都不够...先去打工吧。")
    }
  }
  // 检查是否已集齐三件材料
  checkVisaMaterialsAndUnlockInterview()
```

```yaml
# 场景1固定事件：自行DIY行程计划
id: act1_diy_itinerary
category: FIXED
name: 自行DIY行程计划
description: |
  你需要制作一份详细的美国行程计划，包括：
  - 入境和离境日期
  - 要去的城市（洛杉矶、纽约、拉斯维加斯...）
  - 住宿安排（酒店预订）
  - 交通方式（国内航班、租车等）
  
  这需要大量的研究和规划工作。
execution:
  repeatable: false
  actionPointCost: 5              # 巨额行动点消耗
  moneyCost: 0
scenes: [act1]
execute: |
  // 智力检定决定行程质量
  result = attributeCheck('intelligence', 5)
  
  if (result.success) {
    grantPermanentItem('visa_itinerary')
    log("你花了一整天时间，制定了一份详尽可信的行程计划。")
    心理健康度 += 5
    // 高质量行程，面签加分
    setFlag('itinerary_quality', 'high')
  } else {
    // 即使失败也获得物品，但质量较差
    grantPermanentItem('visa_itinerary')
    log("你勉强拼凑了一份行程计划，但有些地方看起来不太合理...")
    心理健康度 -= 2
    setFlag('itinerary_quality', 'low')
  }
  // 检查是否已集齐三件材料
  checkVisaMaterialsAndUnlockInterview()
```

```yaml
# 场景1固定事件：请求中介帮忙（获取缺失的签证材料）
id: act1_hire_visa_agent
category: FIXED
name: 请求中介帮忙
description: |
  你联系了一个专门办理签证的中介。只要你付得起钱，
  他们可以帮你搞定所有材料：资产证明、行程计划、甚至是"正当理由"。
  
  每项材料收费5000元，按顺序提供你缺少的物品。
execution:
  repeatable: true                # 可重复，直到三件材料齐全
  actionPointCost: 2
  moneyCost: 5000                 # 每项材料5000
  moneyCurrency: CNY
scenes: [act1]
execute: |
  missingItems = []
  
  if (!hasItem('visa_bank_statement')) {
    missingItems.push('visa_bank_statement')
  }
  if (!hasItem('visa_itinerary')) {
    missingItems.push('visa_itinerary')
  }
  if (!hasItem('visa_purpose')) {
    missingItems.push('visa_purpose')
  }
  
  if (missingItems.length == 0) {
    log("你已经有了所有材料，不需要中介了。")
    // 从事件池中移除此事件
    removeFixedEventFromPool('act1_hire_visa_agent')
  } else {
    // 按顺序提供一个缺失的物品
    itemToGrant = missingItems[0]
    grantPermanentItem(itemToGrant)
    log("中介帮你搞定了：" + getItemName(itemToGrant))
    
    // 中介提供的材料带有风险标记
    if (itemToGrant == 'visa_bank_statement') {
      setFlag('visa_document_risk', true)
    }
    
    // 检查是否已集齐三件材料
    if (missingItems.length == 1) {
      log("材料已齐全！你可以预约面签了。")
      removeFixedEventFromPool('act1_hire_visa_agent')
    }
    checkVisaMaterialsAndUnlockInterview()
  }
```

```yaml
# 场景1固定事件：大使馆面签（三样物品齐全后解锁）
id: act1_visa_interview
category: FIXED
name: 大使馆面签
description: |
  你站在美国大使馆外，手里攥着精心准备的材料：
  - 足额的资产证明
  - 去美国的正当理由（泰勒演唱会）
  - 详细的行程计划
  
  成败在此一举。签证官会用英语问你几个问题，
  你需要用英语回答，证明你确实只是去旅游的。
  
  ⚠️ 注意：如果材料是伪造的，面签时有可能被发现！
execution:
  repeatable: false              # 一次性事件（失败后需冷却10回合）
  actionPointCost: 3
  moneyCost: 1600                # 签证申请费
  moneyCurrency: CNY
scenes: [act1]
slots:
  - id: bank_statement_slot
    requiredTags: [visa_bank_statement]   # 必须：资产证明（AGENTS.md规范：requiredTags）
    isMandatory: true                     # AGENTS.md规范：isMandatory
  - id: purpose_slot
    requiredTags: [visa_purpose]          # 必须：去美国的理由（AGENTS.md规范：requiredTags）
    isMandatory: true
  - id: itinerary_slot
    requiredTags: [visa_itinerary]       # 必须：行程计划（AGENTS.md规范：requiredTags）
    isMandatory: true
execute: |
  // 首先检查英语能力（必须≥8）- 旅游签对英语要求更高
  if (attributes.english < 8) {
    log("签证官看着你：'Sorry, your English is not sufficient for this interview.'")
    log("你的英语还不够好，无法通过旅游签面签。先去学英语吧。")
    log("提示：旅游签要求英语≥8，学生签只需社交≥5且面试100%通过")
    心理健康度 -= 10
    applyDebuff('签证拒签记录', 10)
    return
  }
  
  // 基础成功率由英语能力决定（英语8起步）
  baseSuccessRate = 30 + (attributes.english - 8) * 15  // 英语8=30%，每级+15%
  
  // 行程质量影响成功率
  if (getFlag('itinerary_quality') == 'high') {
    baseSuccessRate += 15
  } else if (getFlag('itinerary_quality') == 'low') {
    baseSuccessRate -= 10
  }
  
  // 检查伪造材料风险
  if (getFlag('visa_document_risk')) {
    log("签证官仔细端详着你的材料，眉头微皱...")
    if (randomChance(0.3)) {      // 30%被发现
      log("'这些材料看起来有些问题。'签证官按响了警报。")
      log("你被请进了小黑屋，签证申请被标记为可疑。")
      心理健康度 -= 20
      applyDebuff('签证黑名单', 999)  // 永久无法申请
      return
    }
  }
  
  // 进行最终检定
  if (randomChance(baseSuccessRate / 100)) {
    // 面签成功
    log("签证官在你的护照上盖下了章。'Enjoy your trip to the US.'")
    log("你拿到了！旅游签证！")
    unlockSceneTransition('act1_to_act3_tourist')
    心理健康度 += 25
    removeAllVisaItems()          // 消耗掉所有签证材料
  } else {
    // 面签失败
    log("签证官合上你的材料：'I'm sorry, I cannot approve your visa at this time.'")
    log("你被拒签了。")
    心理健康度 -= 15
    applyDebuff('签证拒签记录', 10)
    
    // 拒签后可以再次尝试（冷却10回合后）
    unlockFixedEvent('act1_visa_interview_retry')
  }
```

```yaml
# ============================================
# 学生签证事件链 - 固定事件节点
# ============================================

```yaml
# 场景1固定事件：联系学签中介（学签事件链节点1）
id: student_1_contact_agent
category: FIXED
name: 联系野鸡大学中介
description: |
  你通过一个老乡介绍，联系上了一个专门办理"留学"业务的中介。
  对方信誓旦旦地保证："只要钱到位，签证百分百过。我们合作的学校
  都是正规注册的，签证官根本看不出来问题。"
  
  中介告诉你流程：先交定金申请，面试走过场，拿到签证后
  再付尾款。听起来很靠谱。
  
  【开启学签申请事件链】
execution:
  repeatable: false              # 一次性事件
  actionPointCost: 2
  moneyCost: 0                   # 本步骤不收费
scenes: [act1]
execute: |
  log("中介递给你一份学校介绍：'硅谷技术学院，位于加州，")
  log("计算机专业全美排名前200，非常适合您这样的技术人才！'")
  log("你看着宣传册上金光闪闪的校园照片，心里明白这都是包装，")
  log("但只要能拿到签证，管他什么学校呢。")
  
  // 启动学签事件链
  startEventChain('act1_visa_student')
  // 解锁下一个节点
  unlockFixedEvent('student_2_submit_app')
  
  心理健康度 += 3
```

```yaml
# 场景1固定事件：提交申请并支付定金（学签事件链节点2）
id: student_2_submit_app
category: FIXED
name: 提交申请并支付定金
description: |
  中介帮你准备好了所有申请材料：
  - 假高中毕业证（中介声称"绝对查不出来"）
  - 伪造的托福成绩单
  - 银行存款证明（中介垫付，包含在费用里）
  - 个人陈述（代写，充满对"学术"的热情）
  
  现在需要支付20000人民币定金，中介才会提交申请。
execution:
  repeatable: false
  actionPointCost: 2
  moneyCost: 20000               # 定金20000人民币
  moneyCurrency: CNY
scenes: [act1]
execute: |
  if (现金 < 20000) {
    log("你的钱不够支付定金。中介面无表情地说：")
    log("'先生，这是规矩，没钱办不了事。'")
    心理健康度 -= 5
    return
  }
  
  log("你把20000元现金交给中介，对方数了数，露出满意的笑容：")
  log("'放心吧，两周后面试，走个过场就过了。'")
  
  // 推进事件链
  completeChainNode('student_2_submit_app')
  // 解锁面试节点
  unlockFixedEvent('student_3_interview')
  
  心理健康度 += 5
  log("【等待面试通知...】")
```

```yaml
# 场景1固定事件：参加签证面试（学签事件链节点3）
id: student_3_interview
category: FIXED
name: 参加学生签证面试
description: |
  两周后，你按中介的指示来到大使馆。
  中介早就打点好了一切——这场面试只是走个过场，
  签证官会问几个基本问题，你只要如实回答（按照中介教的）就能过。
  
  与旅游签不同，学生签的面试几乎没有失败风险。
execution:
  repeatable: false
  actionPointCost: 3
  moneyCost: 1000                 # 签证申请费
  moneyCurrency: CNY
scenes: [act1]
execute: |
  log("签证官翻看着你的材料：'硅谷技术学院？计算机专业？'")
  log("你按照中介教的回答：'是的，我一直对编程很感兴趣，")
  log("希望能去硅谷学习最先进的技术。'")
  log("")
  log("签证官点点头，在键盘上敲了几下：'好的，你的签证通过了。'")
  log("'请在30天内入境，入学后记得按时注册课程。'")
  
  // 100%通过，无需检定
  completeChainNode('student_3_interview')
  // 解锁最后一步
  unlockFixedEvent('student_4_get_visa')
  
  log("【面试通过！】")
  心理健康度 += 10
```

```yaml
# 场景1固定事件：获得签证并准备离境（学签事件链节点4）
id: student_4_get_visa
category: FIXED
name: 获得签证并准备离境
description: |
  你的护照上多了一页学生签证。
  中介告诉你：现在需要决定如何支付剩余的30000人民币学费尾款。
  
  【选项1】：现在一次性付清，安心入境
  【选项2】：分期付款，先付10000，剩余20000到场景3后再付
  
  ⚠️ 注意：如果到场景3后付不起尾款，将无法入学，签证失效！
execution:
  repeatable: false
  actionPointCost: 2
  moneyCost: 0                   # 动态决定
scenes: [act1]
execute: |
  log("中介把护照还给你：'恭喜！现在需要支付剩余学费。'")
  log("'全款30000，或者先付10000分期，到美国后再付20000。'")
  
  // 给玩家选择
  choice = prompt("选择支付方式：", ["全款30000", "分期（先付10000）"])
  
  if (choice == "全款30000") {
    if (现金 >= 30000) {
      现金 -= 30000
      setFlag('student_visa_paid_full', true)
      setFlag('student_visa_installment', false)
      log("你一次性付清了所有费用。现在可以安心去美国了。")
    } else {
      log("你的钱不够全款。只能选择分期付款。")
      choice = "分期（先付10000）"
    }
  }
  
  if (choice == "分期（先付10000）") {
    if (现金 >= 10000) {
      现金 -= 10000
      setFlag('student_visa_paid_full', false)
      setFlag('student_visa_installment', true)
      // 记录场景3需要支付的尾款
      setFlag('student_visa_remaining_payment', 20000)  // 人民币，到场景3换算
      
      // ⚠️ 明确警告玩家风险
      log("═══════════════════════════════════════════")
      log("⚠️ 警告：你选择了分期付款！")
      log("═══════════════════════════════════════════")
      log("入境美国时，你需要立即支付剩余学费约$2778美元。")
      log("如果到时付不起，你的学生签证将立即失效，转为黑户！")
      log("")
      log("此外，入学后每6回合需缴纳$4000学费，共3次（总计$12000）。")
      log("全部4期学费合计约$15000美元（含入境时尾款）")
      log("═══════════════════════════════════════════")
      log("建议：确保到达美国后至少有$3000-4000美元再选择分期！")
      log("═══════════════════════════════════════════")
      
      // 弹出确认对话框
      confirm = prompt("确定选择分期付款吗？请确认你已理解风险。", ["确定", "取消"])
      if (confirm == "取消") {
        log("你决定再考虑一下...")
        现金 += 10000  // 退款
        return
      }
    } else {
      log("你连分期的首付都付不起...先去打工吧。")
      心理健康度 -= 10
      return
    }
  }
  
  // 完成事件链
  completeChainNode('student_4_get_visa')
  
  log("【学生签证申请完成！】")
  log("你现在可以随时选择前往美国（场景3）。")
  
  // 解锁场景切换
  unlockSceneTransition('act1_to_act3_student')
  
  心理健康度 += 15
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

```yaml
# 学生签证申请事件链（场景1→场景3：野鸡大学路径）
id: act1_visa_student
name: 野鸡大学学生签证申请
description: |
  通过灰色中介申请美国野鸡大学，以F1学生签证合法入境。
  流程简单，100%通过，但需要持续缴纳学费维持身份。
  
  【触发条件】：社交≥5
  【优势】：稳定合法入境，跳过危险的场景2
  【劣势】：总成本高，场景3有持续学费压力

type: LINEAR                      # 线性事件链，无分支

startCondition:
  - type: ATTRIBUTE
    attribute: social
    minValue: 5                   # 社交≥5才能联系到靠谱中介

nodes:
  - id: student_1_contact_agent   # 节点1：联系中介
    index: 0
    prerequisites: { nodes: [], condition: ANY }
    skippable: false
    repeatable: false
    
  - id: student_2_submit_app      # 节点2：提交申请
    index: 1
    prerequisites: { nodes: [student_1_contact_agent], condition: ALL }
    skippable: false
    repeatable: false
    
  - id: student_3_interview       # 节点3：面试（100%通过）
    index: 2
    prerequisites: { nodes: [student_2_submit_app], condition: ALL }
    skippable: false
    repeatable: false
    
  - id: student_4_get_visa        # 节点4：获得签证，准备离境
    index: 3
    prerequisites: { nodes: [student_3_interview], condition: ALL }
    skippable: false
    repeatable: false

completionReward:
  # 完成事件链后解锁场景切换
  unlockSceneTransition: 'act1_to_act3_student'
  # 给予学生签证物品
  grantItems: ['student_visa_document']
```

### 2.5 政策压力事件（Policy Pressure Event）

**定义**：**仅场景3存在**的特殊随机事件，模拟特朗普政府的移民政策变化，增加游戏压力。

**核心特征**：
- 🏛️ **场景专属**：仅在美国生存阶段（场景3）触发
- 📅 **回合限制**：通过 `minSceneTurn` 控制最早触发时机（新手保护）
- 📢 **固定格式**："唐纳德总统宣布XXX，这下移民局的搜查力度更大了"
- 📈 **压力累积**：添加 `pressure` 类型的环境 Debuff（强度1-5）
- ⏳ **自动衰减**：Debuff 持续时间归零后自动消失，新政策可添加新 Debuff

**数据结构**：
```typescript
interface PolicyPressureEvent {
  id: string;                      // 格式: act3_policy_{编号}
  category: 'POLICY_PRESSURE';
  name: string;
  description: string;
  
  trigger: {
    phase: 'TURN_START';
    weight: number;                // 触发权重
    maxTriggers: number;           // 通常设为1
    cooldown: number;              // 触发后冷却回合
    conditions?: SceneTurnCondition[];  // 场景回合限制
  };
  
  scenes: ['act3'];                // 严格限定场景3
  
  content: {
    announcement: string;          // 宣布内容（XXX部分）
    displayText: string;           // 完整显示文本
  };
  
  // 产生的环境 Debuff（替代原有的 pressureIncrease）
  debuff: {
    id: string;                    // Debuff ID
    name: string;                  // Debuff 显示名称
    type: 'pressure' | 'economic'; // Debuff 类型（压力或经济）
    subtype?: string;              // 子类型（如 'usd_inflation'）
    intensity: 1 | 2 | 3 | 4 | 5;  // 强度等级（1=轻微，5=极端）
    duration: number;              // 持续回合数
    effects: PressureDebuffEffect; // 具体效果
    details?: InflationDetails;    // 经济型：分项通胀详情
  };
  
  execute: (context: EventContext) => EventResult;
}

// 压力 Debuff 效果
interface PressureDebuffEffect {
  raidChanceIncrease?: number;      // 突击检查概率增加（0-1）
  workDifficultyIncrease?: number;  // 打工难度增加值
  mentalDamagePerTurn?: number;     // 每回合心理伤害
  cashCostMultiplier?: number;      // 现金消耗倍率（如1.2表示+20%）
  
  // 经济型效果：分项通胀率
  foodInflationRate?: number;       // 食品通胀率
  lodgingInflationRate?: number;    // 住宿通胀率
  transportInflationRate?: number;  // 出行通胀率
}

// 场景回合条件（仅用于 POLICY_PRESSURE）
interface SceneTurnCondition {
  type: 'SCENE';
  value: 'act3';
  minSceneTurn?: number;           // 场景最小回合（如第3回合后触发）
  maxSceneTurn?: number;           // 场景最大回合（如前2回合触发）
}
```

**示例**：
```yaml
# 场景3政策压力事件：加强边境安全
id: act3_policy_001
category: POLICY_PRESSURE
name: 加强边境安全
description: 唐纳德总统宣布加强边境安全和国家执法行动

trigger:
  phase: TURN_START
  weight: 15
  maxTriggers: 1
  cooldown: 5
  conditions:
    - type: SCENE
      value: act3
      minSceneTurn: 3              # 第3回合后才可能触发（新手保护）

scenes: [act3]

content:
  announcement: "加强边境安全和国家执法行动"
  displayText: "唐纳德总统宣布加强边境安全和国家执法行动，这下移民局的搜查力度更大了。"

# 产生的环境 Debuff
debuff:
  id: "debuff_act3_policy_001"
  name: "移民搜捕升级"
  type: "pressure"
  intensity: 2                     # 强度等级 2（共5级）
  duration: 3                      # 持续3回合
  effects:
    raidChanceIncrease: 0.15       # 突击检查+15%
    workDifficultyIncrease: 10     # 打工难度+10
    mentalDamagePerTurn: 2         # 每回合心理-2
```

**经济型 Debuff 示例**（分项通胀）：
```yaml
# 场景3通胀事件：油价危机
id: rand3_oil_crisis
category: RANDOM
name: 油价危机
description: 中东局势紧张导致油价飙升

trigger:
  phase: TURN_START
  weight: 10
  conditions:
    - type: SCENE
      value: act3

scenes: [act3]

content:
  displayText: "加油站排起长队，油价一夜之间涨了40%。"

# 产生的经济型 Debuff
debuff:
  id: "debuff_usd_inflation_transport"
  name: "出行成本飙升"
  type: "economic"
  subtype: "usd_inflation"
  intensity: 3
  duration: -1                    # 永久（直到被调控事件降低）
  effects:
    transportInflationRate: 1.4   # 出行通胀+40%
  # 分项详情（用于UI展示）
  details:
    food:
      rate: 1.0                   # 食品不受影响
      description: "食品价格稳定"
    lodging:
      rate: 1.0                   # 住宿暂时不受影响
      description: "房租合同未到期"
    transport:
      rate: 1.4                   # 出行+40%
      description: "油价暴涨，加满一箱油要多花$50"
```

**压力 Debuff 效果表**（基于 intensity 等级）：

| 强度 | 状态名称 | 突击检查 | 打工难度 | 心理/回合 | 其他 |
|-----|---------|---------|---------|----------|-----|
| 1 | 【轻微关注】 | +5% | +5 | -1 | 无 |
| 2 | 【搜捕升级】 | +15% | +10 | -2 | 无 |
| 3 | 【风声鹤唳】 | +20% | +15 | -3 | 现金+10% |
| 4 | 【全城搜捕】 | +30% | +20 | -4 | 现金+20%，庇护暂停 |
| 5 | 【红色警戒】 | +50% | +30 | -6 | 现金+30%，无法稳定打工 |

**Debuff 叠加规则**：
- 多个压力 Debuff 同时存在时，效果**累加计算**
- 例如：强度2（+15%检查）+ 强度3（+20%检查）= 总检查概率 +35%
- UI 显示保留多个 Debuff，玩家清楚看到不同压力来源

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

### 3.5 场景特有事件配置

#### 场景2强制负面事件（【法律真空】机制）

**机制说明**：场景2（雨林阶段）特有的**【法律真空】**机制——在墨西哥雨林地区，不存在法律与秩序的保护，每回合必须面对随机出现的致命威胁。这模拟了非法移民路线的极度危险性，是场景2高死亡率的来源。

**核心规则**：
- ⚠️ **强制触发**：`force: true`，每回合开始时必定触发其中一个负面事件
- 📍 **阶段限制**：仅在雨林阶段（`act2Progress: 0-4`）触发，进入边境小镇后解除
- 🎲 **随机选择**：6种负面事件按权重随机选择其一
- ☠️ **生死判定**：属性判定失败直接导致游戏结束
- 📊 **难度梯度**：不同事件考验不同属性，要求玩家均衡发展或承担风险

```typescript
// 场景2强制负面事件配置（每回合随机触发一种）
const ACT2_FORCED_NEGATIVE_EVENTS: RandomEventConfig[] = [
  {
    id: 'rand2_bandit',
    name: '丛林劫匪',
    trigger: { phase: 'TURN_START', force: true },  // force: true 表示强制触发
    condition: { 
      scene: 'act2',
      act2Progress: { min: 0, max: 4 },  // 仅阶段1（雨林）触发
      currentPhase: 'rainforest'
    },
    check: { attribute: 'riskAwareness', minValue: 5 },
    success: { moneyLoss: [50, 100], mental: -10 },
    failure: { deathEnding: 'death_bandit' }
  },
  {
    id: 'rand2_snake',
    name: '毒蛇猛兽',
    trigger: { phase: 'TURN_START', force: true },
    condition: { 
      scene: 'act2',
      act2Progress: { min: 0, max: 4 },
      currentPhase: 'rainforest'
    },
    check: { attribute: 'physique', minValue: 5 },
    success: { health: -15, debuff: 'poisoned' },
    failure: { deathEnding: 'death_snake' }
  },
  {
    id: 'rand2_fall',
    name: '危险小径',
    trigger: { phase: 'TURN_START', force: true },
    condition: { 
      scene: 'act2',
      act2Progress: { min: 0, max: 4 },
      currentPhase: 'rainforest'
    },
    check: { attribute: 'riskAwareness', minValue: 4 },
    success: { health: -10, mental: -5 },
    failure: { deathEnding: 'death_fall' }
  },
  {
    id: 'rand2_swamp',
    name: '沼泽陷阱',
    trigger: { phase: 'TURN_START', force: true },
    condition: { 
      scene: 'act2',
      act2Progress: { min: 0, max: 4 },
      currentPhase: 'rainforest'
    },
    check: { attribute: 'survival', minValue: 5 },
    success: { health: -20, actionPoints: -1 },
    failure: { deathEnding: 'death_swamp' }
  },
  {
    id: 'rand2_insect',
    name: '毒虫袭击',
    trigger: { phase: 'TURN_START', force: true },
    condition: { 
      scene: 'act2',
      act2Progress: { min: 0, max: 4 },
      currentPhase: 'rainforest'
    },
    check: { attribute: 'physique', minValue: 4 },
    success: { health: -10, debuff: 'infected_wound' },
    failure: { deathEnding: 'death_infection' }
  },
  {
    id: 'rand2_food',
    name: '可疑食物',
    trigger: { phase: 'TURN_START', force: true },
    condition: { 
      scene: 'act2',
      act2Progress: { min: 0, max: 4 },
      currentPhase: 'rainforest'
    },
    check: { attribute: 'intelligence', minValue: 5 },
    success: { health: -5, mental: -5 },
    failure: { deathEnding: 'death_poison' }
  }
];
```

**事件触发权重分配**：

| 事件ID | 名称 | 权重 | 判定属性 | 门槛 | 失败结局 |
|--------|------|------|----------|------|----------|
| rand2_bandit | 丛林劫匪 | 20 | 风险意识 | ≥5 | death_bandit（被劫匪杀害） |
| rand2_snake | 毒蛇猛兽 | 20 | 体魄 | ≥5 | death_snake（蛇毒致死） |
| rand2_fall | 危险小径 | 20 | 风险意识 | ≥4 | death_fall（摔死） |
| rand2_swamp | 沼泽陷阱 | 15 | 生存能力 | ≥5 | death_swamp（溺毙沼泽） |
| rand2_insect | 毒虫袭击 | 15 | 体魄 | ≥4 | death_infection（感染致死） |
| rand2_food | 可疑食物 | 10 | 智力 | ≥5 | death_poison（食物中毒） |

**设计理念**：
1. **高惩罚高回报**：雨林阶段生存压力极大，但成功穿越后进入相对安全的边境小镇
2. **属性平衡**：6种事件分布在4种不同属性，鼓励玩家均衡发展或专精某条生存路线
3. **可控风险**：判定门槛适中（4-5），场景1合理准备（属性+道具）可大幅降低死亡率
4. **叙事契合**：每个事件都有具体的死亡场景描述，强化场景2的残酷氛围

---

## 4. 物品槽位系统

### 4.1 核心概念

事件可以通过**物品槽位**与玩家的常驻道具动态匹配，无需硬编码绑定具体道具ID。

### 4.2 槽位配置

```typescript
interface EventSlot {
  id: string;                    // 槽位ID（如 transport_slot）
  requiredTags: string[];        // 要求的属性标签（AGENTS.md规范字段名）
  isMandatory: boolean;          // 是否强制要求（AGENTS.md规范字段名）
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
  tags: string[];                // 道具属性标签（如 ['transport', 'luxury']），用于匹配槽位的 requiredTags
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
      item.tags.some(tag => slot.requiredTags.includes(tag))
    );
    
    // 2. 按优先级排序
    matches.sort((a, b) => a.priority - b.priority);
    
    if (matches.length === 0) {
      if (slot.isMandatory) {
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
      requiredTags: [transport]
      isMandatory: true
      description: "需要交通工具"
      
    - id: identity_slot
      requiredTags: [identity]
      isMandatory: false
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

## 9. 附录

### 9.1 属性标签列表

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

### 9.2 事件ID命名规范

| 类型 | 前缀 | 示例 |
|-----|------|------|
| 场景1固定事件 | `act1_` | `act1_work_supermarket` |
| 场景2固定事件 | `act2_` | `act2_move_guide` |
| 场景3固定事件 | `act3_` | `act3_work_delivery` |
| 场景1随机事件 | `rand1_` | `rand1_police_visit` |
| 场景2随机事件 | `rand2_` | `rand2_storm` |
| 场景3随机事件 | `rand3_` | `rand3_account_banned` |
| 通用随机事件 | `rand_` | `rand_lucky_money` |
| 政策压力事件 | `act3_policy_` | `act3_policy_001` |
| 事件链 | `chain_` | `chain_asylum` |
| 链节点 | `{链ID}_{节点}` | `asylum_1_consult` |
| 终结态事件 | `term1/2/3_` | `term3_emergency` |

### 9.3 基础类型定义

#### 9.3.1 事件分类枚举

```typescript
type EventCategory = 
  | 'RANDOM'           // 随机事件
  | 'FIXED'            // 固定事件
  | 'CHAIN'            // 事件链
  | 'POLICY_PRESSURE'  // 政策压力事件（仅场景3）
  | 'TERMINAL';        // 终结态补偿事件（用于濒死/崩溃/匮乏时的特殊处理）
```

#### 9.3.2 条件类型

```typescript
type Condition = SceneCondition | AttributeCondition | ItemCondition;

// 场景条件（支持场景回合限制）
interface SceneCondition {
  type: 'SCENE';
  value: SceneId;                   // 'act1' | 'act2' | 'act3'
  minSceneTurn?: number;            // 场景最小回合（可选）
  maxSceneTurn?: number;            // 场景最大回合（可选）
}

// 属性条件
interface AttributeCondition {
  type: 'ATTRIBUTE';
  attribute: keyof Attributes;      // 如 'physique', 'intelligence'
  operator: '>=' | '<=' | '>' | '<' | '==';
  value: number;
}

// 物品条件
interface ItemCondition {
  type: 'ITEM';
  itemId?: string;                  // 特定物品ID
  tag?: string;                     // 或物品标签
  count?: number;                   // 数量要求（默认1）
}
```

#### 9.3.3 事件上下文

```typescript
interface EventContext {
  // 角色数据
  character: Character;
  
  // 当前场景
  currentScene: SceneId;
  
  // 当前回合
  currentTurn: number;
  sceneTurn: number;                // 当前场景回合
  
  // 事件池引用
  eventPool: SceneEventPool;
  
  // 已匹配的槽位（仅FIXED事件）
  equippedSlots?: EquippedSlots;
  
  // 场景3环境 Debuff 列表（用于POLICY_PRESSURE等事件读取/修改）
  environmentalDebuffs?: EnvironmentalDebuff[];
}
```

#### 9.3.4 事件结果

```typescript
interface EventResult {
  success: boolean;                 // 是否成功执行
  
  // 资源变化
  effects?: {
    health?: number;
    mental?: number;
    money?: { cny?: number; usd?: number };
    actionPoints?: number;
  };
  
  // 属性变化
  attributeChanges?: Partial<Attributes>;
  
  // 获得/失去物品
  items?: {
    gained?: { itemId: string; count: number }[];
    lost?: { itemId: string; count: number }[];
  };
  
  // 状态效果
  statusEffects?: {
    added?: TemporaryEffect[];
    removed?: string[];             // 效果ID列表
  };
  
  // 新增的环境 Debuff（政策事件等添加）
  debuffsAdded?: EnvironmentalDebuff[];
  
  // 特殊结果
  special?: {
    gameOver?: boolean;             // 是否触发游戏结束
    endingId?: string;              // 结局ID
    sceneTransition?: SceneId;      // 场景切换
    redirectEvent?: string;         // 重定向到另一事件
  };
  
  // 失败原因（success为false时）
  failureReason?: string;
}
```

#### 9.3.5 环境 Debuff 定义

```typescript
// 环境 Debuff（外部压力统一使用此结构）
interface EnvironmentalDebuff {
  id: string;                       // Debuff 唯一标识
  name: string;                     // 显示名称（如"移民搜捕升级"）
  type: 'pressure' | 'economic' | 'weather' | 'social';  // Debuff 类型
  subtype?: string;                 // 子类型（如 'cny_inflation', 'usd_inflation'）
  intensity: 1 | 2 | 3 | 4 | 5;     // 强度等级（1=轻微，5=极端）
  source: string;                   // 来源描述（如政策公告内容）
  duration: number;                 // 剩余持续回合（0=即将消失，-1=永久）
  effects: DebuffEffects;           // 具体效果
  details?: InflationDetails;       // 经济型Debuff的分项详情（可选）
}

// 通胀详情（经济型Debuff使用）
interface InflationDetails {
  food: { rate: number; description: string; };      // 食品通胀率
  lodging: { rate: number; description: string; };   // 住宿通胀率
  transport: { rate: number; description: string; }; // 出行通胀率
}

// Debuff 效果（根据类型不同，效果字段不同）
interface DebuffEffects {
  // 压力型 Debuff 效果
  raidChanceIncrease?: number;      // 突击检查概率增加（0-1）
  workDifficultyIncrease?: number;  // 打工难度增加值
  mentalDamagePerTurn?: number;     // 每回合心理伤害
  
  // 经济型 Debuff 效果（分项通胀，用于生活成本计算）
  cashCostMultiplier?: number;      // 统一现金消耗倍率（旧版兼容）
  
  // 经济型：分项通胀率（推荐）
  foodInflationRate?: number;       // 食品通胀率（如1.3 = +30%）
  lodgingInflationRate?: number;    // 住宿通胀率
  transportInflationRate?: number;  // 出行通胀率
  
  incomeMultiplier?: number;        // 收入倍率
  
  // 天气型 Debuff 效果
  healthDamagePerTurn?: number;     // 每回合健康伤害
  actionPointReduction?: number;    // 行动点减少
  
  // 社交型 Debuff 效果
  socialEventWeightModifier?: number; // 社交事件权重调整
}
```

#### 9.3.6 槽位匹配结果

```typescript
interface EquippedSlots {
  [slotId: string]: {
    slot: EventSlot;                // 槽位定义
    item: PermanentItem;            // 选中的道具
    alternatives: PermanentItem[];  // 其他可选道具
  };
}

interface SlotMatchResult {
  canExecute: boolean;              // 是否满足强制槽位要求
  equippedSlots: EquippedSlots;     // 已匹配的槽位
  totalEffects: SlotEffect;         // 累积的槽位效果
  missingRequiredSlots: string[];   // 缺失的强制槽位ID
}
```

---

**文档版本**: v1.1
**最后更新**: 2026-02-27
**状态**: 设计定稿

---

## 修改记录

### v1.2 (2026-02-27)
- **添加 3.5 场景特有事件配置**：新增场景2强制负面事件详细配置（TypeScript格式）
- **引入【法律真空】机制说明**：阐述场景2雨林阶段每回合强制触发负面事件的设计理念
- **添加事件权重分配表**：汇总6种负面事件的权重、判定属性及失败结局

### v1.1 (2026-02-27)
- **扩展 RandomEvent 触发配置**：添加 `forceTrigger` 和 `act2ProgressCondition` 字段，支持场景2强制负面事件系统
- **添加 2.2.1 场景2强制负面事件**：定义雨林阶段6种强制触发负面事件（丛林劫匪、毒蛇猛兽、危险小径、沼泽陷阱、毒虫袭击、可疑食物）
- **添加场景2固定事件**：
  - 阶段1前进事件：向导带路、独自穿越
  - 阶段2小镇活动：联系货车司机
  - 穿越方式事件：货车偷渡、穿越沙漠缺口、攀爬边境墙
