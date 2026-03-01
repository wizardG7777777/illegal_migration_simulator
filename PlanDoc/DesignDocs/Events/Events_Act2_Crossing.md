# 场景2事件：跨境穿越阶段

> 主题：【生存与抉择】——极端环境下的求生与边境穿越

---

## 场景特征

| 属性 | 内容 |
|-----|------|
| **场景定位** | 高风险生存阶段 / 游戏死亡率最高阶段 |
| **预期回合** | 5-15回合（阶段1约5-10回合，阶段2约3-5回合） |
| **核心玩法** | 两阶段前进、强制负面事件、向导依赖、边境穿越 |
| **货币** | 美元（USD） |
| **环境压力** | 【法律真空】——南美雨林与边境地区缺乏法律保障，每回合强制遭遇危险事件 |
| **关键约束** | **只能前进，无退路** |

### 场景基调

场景2是游戏中最危险的阶段——**每回合强制触发负面事件**，死亡概率极高。这里没有安全的喘息空间，每一步都是在与死神擦肩而过。

**核心体验**：极端环境下的生存焦虑。你无法回头，只能硬着头皮向前。雨林中的毒蛇、劫匪的枪口、边境墙的阴影——你必须在有限的资源和信息下做出最优决策，否则就会倒在通往美国的路上，成为无人知晓的孤魂。

**黑色幽默点**：你终于"自由"了，但自由的代价是随时可能失去生命。而当你终于到达边境墙前，才发现真正的考验才刚刚开始。

---

## 1. 阶段1：南美雨林穿越（进度0-4步）

### 1.1 核心机制

**每回合流程**：

```
回合开始
    ↓
【强制】触发负面随机事件（从6种中按权重抽取）
    ↓
属性判定（门槛4-5，非极端但仍有死亡风险）
    ↓
判定通过：存活，扣除资源（健康/心理/现金）
判定失败：角色死亡，触发对应死亡结局
    ↓
选择前进方式（向导带路 / 独自穿越）
    ↓
回合结束
```

**进度系统**：

- 玩家明确看到自己"当前位于第X步"（0-4步）
- 第5步即到达边境小镇，进入阶段2
- 进度可视化：进度条 + 足迹标记

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌴 南美雨林穿越中  │  当前位置：第 3 步 / 共 5 步
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

进度条：[███░░] 60%

🦶 足迹标记：
起点 ●───●───●───◉───●───● 边境小镇
     0    1    2   【你】  4    5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**阶段提示**：
- 第0步："你刚刚踏入雨林，前路茫茫"
- 第1-2步："雨林深处，方向难辨"
- 第3-4步："前方隐约可见人烟，边境小镇就在不远处"
- 第5步："你到达了边境小镇，准备进入下一阶段"

---

### 1.2 前进方式

玩家每回合需选择前进方式，决定如何推进进度。

#### 方式对比

| 前进方式 | 成本 | 成功率 | 特点 |
|---------|------|--------|------|
| **向导带路** | 每回合-$50 | 100% | 自动前进1步，安全但费钱 |
| **独自穿越** | 无额外费用 | 生存能力判定（≥4） | 省钱但高风险，失败原地不动 |

#### act2_move_guide - 向导带路

```yaml
id: act2_move_guide
type: FIXED
trigger:
  condition: SCENE
  sceneId: act2
  stage: 1  # 阶段1
cost:
  cash: 50
effect:
  - type: MODIFY_PROGRESS
    value: 1
    description: "回合结束时自动前进1步"
ui:
  title: "向导带路"
  description: "雇佣当地向导为你带路，每回合自动前进1步"
  conditionText: "需要 $50"
```

**详细说明**：
- 每回合开始时自动扣除50美元向导费
- 无论是否遭遇负面事件，回合结束时自动前进1步
- 向导不保证事件安全，仅保证前进进度
- 现金不足时无法选择此方式

#### act2_move_solo - 独自穿越

```yaml
id: act2_move_solo
type: FIXED
trigger:
  condition: SCENE
  sceneId: act2
  stage: 1
cost:
  actionPoints: 2
checks:
  - attribute: survival
    threshold: 4
    operator: ">="
    success:
      - type: MODIFY_PROGRESS
        value: 1
        description: "成功穿越，前进1步"
    failure:
      - type: NONE
        description: "原地不动，但仍需承受负面事件后果"
effect:
  - type: MODIFY_ATTRIBUTE
    description: "根据判定结果决定是否前进"
ui:
  title: "独自穿越"
  description: "依靠自己的生存能力独自穿越雨林"
  conditionText: "生存能力≥4可前进，否则原地不动"
```

**详细说明**：
- 需进行生存能力判定（门槛：生存能力≥4）
- 成功：前进1步，但需承受负面事件后果
- 失败：原地不动，但仍需承受负面事件后果
- 适合现金紧张但生存能力强的玩家

---

### 1.3 负面事件系统（每回合强制触发）

每回合开始时**强制触发**一个负面事件，从6种事件中按权重随机抽取。

#### 事件配置总览

| 事件ID | 名称 | 判定属性 | 门槛 | 通过后果 | 失败后果 |
|--------|------|---------|------|---------|---------|
| rand2_bandit | 丛林劫匪 | 风险意识 | ≥5 | 损失$50-100，心理-10 | **死亡**（death_bandit）|
| rand2_snake | 毒蛇猛兽 | 体魄 | ≥5 | 健康-15，中毒Debuff | **死亡**（death_snake）|
| rand2_fall | 危险小径 | 风险意识 | ≥4 | 健康-10，心理-5 | **死亡**（death_fall）|
| rand2_swamp | 沼泽陷阱 | 生存能力 | ≥5 | 健康-20，行动点-1 | **死亡**（death_swamp）|
| rand2_insect | 毒虫袭击 | 体魄 | ≥4 | 健康-10，持续掉血3回合 | **死亡**（death_infection）|
| rand2_food | 可疑食物 | 智力 | ≥5 | 健康-5，心理-5 | **死亡**（death_poison）|

#### 事件触发权重

| 事件 | 权重 | 说明 |
|-----|------|------|
| 丛林劫匪 | 20% | 雨林中最常见的威胁 |
| 毒蛇猛兽 | 20% | 热带雨林的"特产" |
| 危险小径 | 20% | 地形本身的危险 |
| 沼泽陷阱 | 15% | 低洼地带常见 |
| 毒虫袭击 | 15% | 蚊虫肆虐的环境 |
| 可疑食物 | 10% | 误食腐烂或有毒食物 |

#### 详细事件配置

##### rand2_bandit - 丛林劫匪

```yaml
id: rand2_bandit
type: RANDOM
trigger:
  condition: SCENE
  sceneId: act2
  stage: 1
  weight: 20
description: |
  雨林深处，三个男人从灌木丛中钻出来，为首的那个手里握着一把生锈的手枪。
  
  "钱，还有值钱的东西。"他的英语带着浓重的口音，但意思很清楚。
  
  你注意到另外两个人手里有砍刀。这不是第一次抢劫，他们很熟练。
checks:
  - attribute: riskAwareness
    threshold: 5
    operator: ">="
    success:
      effects:
        - type: MODIFY_CASH
          min: -100
          max: -50
          description: "损失部分现金"
        - type: MODIFY_RESOURCE
          resource: mentalHealth
          value: -10
          description: "受到惊吓"
      description: "你察觉到了危险信号，提前示弱并交出部分财物，避免了最坏的结果"
    failure:
      endingId: death_bandit
      description: "你没有察觉到危险，试图反抗或逃跑..."
ui:
  title: "丛林劫匪"
  icon: "🔫"
```

##### rand2_snake - 毒蛇猛兽

```yaml
id: rand2_snake
type: RANDOM
trigger:
  condition: SCENE
  sceneId: act2
  stage: 1
  weight: 20
description: |
  你正小心地跨过一根倒下的树干，突然感到小腿一阵剧痛。
  
  低头看去，一条色彩斑斓的蛇正从你的脚边溜走，它的头部呈现标志性的三角形。
  
  是矛头蝮——你在水群里看过照片，雨林里最致命的毒蛇之一。
checks:
  - attribute: physique
    threshold: 5
    operator: ">="
    success:
      effects:
        - type: MODIFY_RESOURCE
          resource: physicalHealth
          value: -15
          description: "被咬伤，毒素入体"
        - type: ADD_DEBUFF
          debuffId: debuff_poisoned
          duration: 3
          description: "【中毒】每回合额外损失5点健康"
      description: "你迅速用绑带扎紧伤口上方，减缓毒素扩散，但症状已经开始显现"
    failure:
      endingId: death_snake
      description: "毒素扩散太快，你的身体开始不听使唤..."
ui:
  title: "毒蛇猛兽"
  icon: "🐍"
```

**中毒Debuff配置**：

```yaml
id: debuff_poisoned
type: STATUS
category: negative
duration: 3
effect:
  - type: MODIFY_RESOURCE_PER_TURN
    resource: physicalHealth
    value: -5
    description: "每回合损失5点健康"
ui:
  name: "中毒"
  description: "蛇毒在体内蔓延，每回合持续损失健康"
  icon: "☠️"
```

##### rand2_fall - 危险小径

```yaml
id: rand2_fall
type: RANDOM
trigger:
  condition: SCENE
  sceneId: act2
  stage: 1
  weight: 20
description: |
  小径沿着山崖蜿蜒，宽度不到半米，一侧是岩壁，另一侧是十几米的陡坡。
  
  昨晚的雨水让石头变得湿滑，你不得不手脚并用地前进。
  
  前方有一块凸出的岩石，看起来是唯一的通道。
checks:
  - attribute: riskAwareness
    threshold: 4
    operator: ">="
    success:
      effects:
        - type: MODIFY_RESOURCE
          resource: physicalHealth
          value: -10
          description: "擦伤、磕碰"
        - type: MODIFY_RESOURCE
          resource: mentalHealth
          value: -5
          description: "心有余悸"
      description: "你小心翼翼地通过，虽然蹭破了几处皮，但好歹安全了"
    failure:
      endingId: death_fall
      description: "你踩到了一块松动的石头，身体失去平衡..."
ui:
  title: "危险小径"
  icon: "🪨"
```

##### rand2_swamp - 沼泽陷阱

```yaml
id: rand2_swamp
type: RANDOM
trigger:
  condition: SCENE
  sceneId: act2
  stage: 1
  weight: 15
description: |
  前方的路被一片积水覆盖，看起来并不深——水面只到脚踝。
  
  但当你踩下去时，脚并没有触到底部。泥水迅速吞没了你的小腿。
  
  是沼泽。而且你正在下沉。
checks:
  - attribute: survival
    threshold: 5
    operator: ">="
    success:
      effects:
        - type: MODIFY_RESOURCE
          resource: physicalHealth
          value: -20
          description: "挣扎脱力、泥水浸泡"
        - type: MODIFY_RESOURCE
          resource: actionPoints
          value: -1
          description: "耗费大量体力"
      description: "你冷静地仰面躺下，增大受力面积，慢慢蠕动着爬出了沼泽"
    failure:
      endingId: death_swamp
      description: "你越挣扎陷得越快，泥水已经没过腰部..."
ui:
  title: "沼泽陷阱"
  icon: "🌊"
```

##### rand2_insect - 毒虫袭击

```yaml
id: rand2_insect
type: RANDOM
trigger:
  condition: SCENE
  sceneId: act2
  stage: 1
  weight: 15
description: |
  你找到了一处相对干燥的地方准备休息，却没有注意到地面上密密麻麻的红褐色小点。
  
  那是火蚁的巢穴。当你坐下时，它们已经爬上了你的裤腿。
  
  剧痛随之而来——数十只火蚁同时叮咬，它们释放的毒液让你瞬间跳了起来。
checks:
  - attribute: physique
    threshold: 4
    operator: ">="
    success:
      effects:
        - type: MODIFY_RESOURCE
          resource: physicalHealth
          value: -10
          description: "多处蜇伤"
        - type: ADD_DEBUFF
          debuffId: debuff_bleeding
          duration: 3
          description: "【伤口感染】每回合损失5点健康"
      description: "你及时拍掉了大部分蚂蚁，但伤口开始红肿发炎"
    failure:
      endingId: death_infection
      description: "你对火蚁毒液过敏，呼吸开始困难，全身出现红疹..."
ui:
  title: "毒虫袭击"
  icon: "🦟"
```

**感染Debuff配置**：

```yaml
id: debuff_bleeding
type: STATUS
category: negative
duration: 3
effect:
  - type: MODIFY_RESOURCE_PER_TURN
    resource: physicalHealth
    value: -5
    description: "每回合损失5点健康"
ui:
  name: "伤口感染"
  description: "伤口未及时处理，开始发炎化脓"
  icon: "🩸"
```

##### rand2_food - 可疑食物

```yaml
id: rand2_food
type: RANDOM
trigger:
  condition: SCENE
  sceneId: act2
  stage: 1
  weight: 10
description: |
  你已经两天没吃东西了。就在这时，你发现了一棵结满果实的树。
  
  果实颜色鲜艳，散发着甜香，看起来和你在超市里见过的某种水果很像。
  
  你的胃在咆哮。但雨林里的规则是：颜色越鲜艳，越可能有毒。
checks:
  - attribute: intelligence
    threshold: 5
    operator: ">="
    success:
      effects:
        - type: MODIFY_RESOURCE
          resource: physicalHealth
          value: -5
          description: "轻微肠胃不适"
        - type: MODIFY_RESOURCE
          resource: mentalHealth
          value: -5
          description: "后悔吃了可疑食物"
      description: "你犹豫再三，只尝了一小口，果然味道发苦，赶紧吐了出来"
    failure:
      endingId: death_poison
      description: "你太饿了，狼吞虎咽地吃下果实..."
ui:
  title: "可疑食物"
  icon: "🍄"
```

---

## 2. 阶段2：边境小镇（进度=5）

### 2.1 小镇活动

你终于走出了雨林，来到了美墨边境的小镇。这里充斥着偷渡者、蛇头、走私贩子和不法分子。破败的街道上，每个人都在等待一个穿越边境墙的机会。

**核心目标**：寻找合适的时机和方式穿越边境墙，进入美国境内。

#### 活动事件总览

| 事件ID | 名称 | 消耗 | 效果 |
|--------|------|------|------|
| act2_town_contact_driver | 联系货车司机 | $200 + 2行动点 | 获得道具 `border_guide`，解锁货车偷渡 |
| act2_town_gather_info | 打探消息 | 1行动点 | 获取信息/触发随机事件 |
| act2_town_buy_supplies | 补充物资 | 现金 | 购买水、食物、基础医疗用品 |
| act2_town_wait | 等待时机 | 1行动点 | 降低穿越风险（如有风险机制）|

#### act2_town_contact_driver - 联系货车司机

```yaml
id: act2_town_contact_driver
type: FIXED
trigger:
  condition: SCENE
  sceneId: act2
  stage: 2
cost:
  cash: 200
  actionPoints: 2
effect:
  - type: ADD_ITEM
    itemId: border_guide
    quantity: 1
    description: "获得【边境向导】道具"
unlock:
  - eventId: act2_cross_truck
    description: "解锁货车偷渡选项"
description: |
  向导带你来到小镇边缘的一处货运停车场。夜色中，一个华人司机正在等待。
  
  "这是老陈，"向导介绍道，"他的货柜里有夹层，够你躺一晚上。明天早上到目的地卸货，你从里面出来就行。"
  
  你付给向导200美元作为介绍费。现在你可以联系老陈安排偷渡了。
ui:
  title: "联系货车司机"
  description: "通过向导联系可靠的货车司机，安排货柜偷渡"
  conditionText: "需要 $200"
```

**border_guide 道具配置**：

```yaml
id: border_guide
type: CONSUMABLE
category: contact
tags:
  - contact
  - guide
priority: 2
effect:
  - type: UNLOCK_EVENT
    eventId: act2_cross_truck
    description: "解锁货车偷渡选项"
  - type: AUTO_SUCCESS
    eventId: act2_cross_truck
    description: "货车偷渡自动成功"
description: "一位可靠的华人货车司机的联系方式，他愿意用货柜夹层帮你偷渡入境"
ui:
  name: "边境向导"
  description: "华人司机老陈的联系方式，可以安排货柜偷渡"
  icon: "📞"
```

#### act2_town_gather_info - 打探消息

```yaml
id: act2_town_gather_info
type: FIXED
trigger:
  condition: SCENE
  sceneId: act2
  stage: 2
cost:
  actionPoints: 1
effect:
  - type: RANDOM_EFFECT
    outcomes:
      - weight: 40
        effect:
          - type: MODIFY_ATTRIBUTE
            attribute: intelligence
            value: 1
            description: "获得有用情报"
      - weight: 30
        effect:
          - type: TRIGGER_EVENT
            eventId: rand2_info_gap
            description: "听说边境墙有缺口"
      - weight: 20
        effect:
          - type: MODIFY_CASH
            value: -20
            description: "被骗了点小钱"
      - weight: 10
        effect:
          - type: MODIFY_RESOURCE
            resource: mentalHealth
            value: -10
            description: "听到恐怖故事"
description: |
  你走进镇上唯一的一家酒吧，这里是消息最灵通的地方。
  
  酒保、蛇头、等待机会的偷渡者——每个人嘴里都有一些真假难辨的消息。
  
  "听说边境墙东边有个缺口..." "上周有人从那里成功过去了..." "别信那些，上上个月有三个人死在那边..."
ui:
  title: "打探消息"
  description: "在酒吧、旅馆打听边境墙漏洞情报"
```

**rand2_info_gap - 缺口情报事件**（打探消息可能触发）：

```yaml
id: rand2_info_gap
type: CHAIN
trigger:
  condition: CHAIN
  parentEvent: act2_town_gather_info
description: |
  一个喝得烂醉的老头凑过来，压低声音说：
  
  "听着，小子。边境墙往东南方向走两英里，有一段去年被暴雨冲塌了。缺口不大，但够一个人钻过去。"
  
  "但那边是沙漠，没人带路就是送死。上个月有三个人试过，只找到一具尸体。"
  
  你默默记下了位置。这可能是你的机会——也可能是你的坟墓。
effect:
  - type: MODIFY_ATTRIBUTE
    attribute: intelligence
    value: 2
    description: "获得边境墙缺口位置"
  - type: MODIFY_RESOURCE
    resource: mentalHealth
    value: -5
    description: "意识到穿越沙漠的危险"
ui:
  title: "边境墙缺口情报"
  icon: "🗺️"
```

#### act2_town_find_gap - 寻找边境墙漏洞

```yaml
id: act2_town_find_gap
type: FIXED
trigger:
  condition: SCENE
  sceneId: act2
  stage: 2
cost:
  actionPoints: 2
effect:
  - type: MODIFY_RESOURCE
    resource: mentalHealth
    value: -3
    description: "奔波的疲惫和不确定性"
  - type: CHANCE_BASED
    probability: 0.2
    success:
      effects:
        - type: SET_FLAG
          flag: gap_discovered
          value: true
          description: "你发现了边境墙的缺口！在东南方向约两英里处，有一段墙体因暴雨冲刷而倒塌，足以让一个人钻过去。"
        - type: MODIFY_RESOURCE
          resource: mentalHealth
          value: 5
          description: "发现缺口的兴奋"
      description: "经过数小时的搜索，你在一处偏僻地段发现了边境墙的破损缺口"
    failure:
      effects:
        - type: MODIFY_RESOURCE
          resource: mentalHealth
          value: -5
          description: "一无所获的沮丧"
      description: "你找遍了小镇周围，但没有发现任何可以利用的缺口"
description: |
  你在小镇里东奔西走，逢人就问边境墙的情况。
  
  有人说墙固若金汤，有人说曾经听说有缺口，还有人说那是骗钱的陷阱。
  
  你决定亲自去找找看。
ui:
  title: "寻找边境墙漏洞"
  description: "在小镇周围寻找边境墙的破损缺口（20%成功率）"
```

#### act2_town_buy_supplies - 补充物资

```yaml
id: act2_town_buy_supplies
type: FIXED
trigger:
  condition: SCENE
  sceneId: act2
  stage: 2
cost:
  actionPoints: 1
itemSlots:
  - id: supply_purchase
    requiredTags: ["consumable"]
    isMandatory: false
    effect:
      type: PURCHASE
      description: "购买生存物资"
availableItems:
  - itemId: water_bottle
    price: 10
    description: "瓶装水，维持 hydration"
  - itemId: canned_food
    price: 15
    description: "罐头食品，补充体力"
  - itemId: first_aid_kit
    price: 50
    description: "急救包，恢复20点健康"
description: |
  小镇的杂货店货源有限，但比雨林里强多了。
  
  店主是个满脸横肉的墨西哥人，看你的眼神像是在看一头待宰的猪。
  
  "水，10美元一瓶。罐头，15美元。急救包50美元，不讲价。"
  
  物价是正常水平的五倍，但你没有讨价还价的筹码。
ui:
  title: "补充物资"
  description: "购买水、食物、基础医疗用品"
```

#### act2_town_wait - 等待时机

```yaml
id: act2_town_wait
type: FIXED
trigger:
  condition: SCENE
  sceneId: act2
  stage: 2
cost:
  actionPoints: 1
effect:
  - type: MODIFY_RESOURCE
    resource: mentalHealth
    value: 5
    description: "稍作休整，恢复心理"
  - type: RANDOM_EFFECT
    outcomes:
      - weight: 50
        effect:
          - type: NONE
            description: "无事发生，平静的一天"
      - weight: 30
        effect:
          - type: MODIFY_RESOURCE
            resource: physicalHealth
            value: 10
            description: "休息充足，恢复一些健康"
      - weight: 20
        effect:
          - type: TRIGGER_EVENT
            eventId: rand2_raided
            description: "巡逻队突击检查！"
description: |
  有时候，等待是最好的选择。
  
  你找了个角落蜷缩起来，观察着边境墙的巡逻规律，等待合适的时机。
  
  小镇的喧嚣在你耳边回荡，但你强迫自己休息。你需要为最后的冲刺保存体力。
ui:
  title: "等待时机"
  description: "等待巡逻队换班或天气变化，降低穿越风险"
```

**rand2_raided - 巡逻突击事件**（等待时可能触发）：

```yaml
id: rand2_raided
type: RANDOM
trigger:
  condition: CHAIN
  parentEvent: act2_town_wait
description: |
  你刚闭上眼睛，就被一阵骚动惊醒。
  
  美国边境巡逻队的车辆开进了小镇，探照灯的光束扫过每一条街道。有人开始逃跑，有人躲进阴影。
  
  "移民局！所有人不许动！"
checks:
  - attribute: riskAwareness
    threshold: 6
    operator: ">="
    success:
      effects:
        - type: MODIFY_RESOURCE
          resource: mentalHealth
          value: -15
          description: "惊险逃脱"
      description: "你提前察觉到了异常，在巡逻队到来之前溜进了阴影"
    failure:
      effects:
        - type: MODIFY_RESOURCE
          resource: physicalHealth
          value: -20
          description: "被粗暴对待"
        - type: MODIFY_CASH
          value: -100
          description: "贿赂或罚款"
      description: "你被巡逻队抓住了，经过一番"询问"后才被释放"
ui:
  title: "巡逻突击"
  icon: "🚨"
```

---

### 2.2 穿越方式

当你准备好后，选择以下方式之一穿越边境墙：

#### 方式对比

| 穿越方式 | 前提条件 | 消耗 | 检定 | 成功结果 | 失败结果 |
|---------|---------|------|------|---------|---------|
| 货车偷渡 | 持有 `border_guide` | 3行动点 | 自动成功 | 健康-5，心理-10，进入场景3 | - |
| 沙漠缺口 | 无 | 4行动点 | 生存能力≥8 | 现金-20%，进入场景3 | **死亡**（death_desert_crossing）|
| 攀爬边境墙 | 无 | 4行动点 | 体魄≥12 | 健康-20，进入场景3 | **死亡**（death_wall_fall）|

#### act2_cross_truck - 货车偷渡（最安全）

```yaml
id: act2_cross_truck
type: FIXED
trigger:
  condition: SCENE
  sceneId: act2
  stage: 2
  requiredItems:
    - itemId: border_guide
      consume: true
cost:
  actionPoints: 3
checks: []  # 自动成功
effect:
  - type: MODIFY_RESOURCE
    resource: physicalHealth
    value: -5
    description: "长时间蜷缩的身体不适"
  - type: MODIFY_RESOURCE
    resource: mentalHealth
    value: -10
    description: "密闭空间的恐惧和不确定感"
  - type: TRANSITION_SCENE
    targetScene: act3
    description: "成功进入场景3"
description: |
  向导带你来到边境小镇边缘的一处货运停车场。夜色中，一辆半挂货车正在等待。
  
  "这是老陈，"向导指了指司机，"他的货柜里有夹层，够你躺一晚上。明天早上到目的地卸货，你从里面出来就行。"
  
  你被引导到货柜后部，司机移开一堆纸箱，露出一个隐藏空间——刚好够一个人蜷缩着躺下。空气里弥漫着纸箱和柴油的味道。
  
  "别出声，"向导最后叮嘱，"无论听到什么动静，都别出声。"
  
  你钻进货柜，司机把纸箱复原。黑暗吞没了你，只剩下发动机的震动和轮胎碾过路面的声音。
ui:
  title: "货车偷渡"
  description: "藏在货车货柜夹层中穿越边境（最安全的方式）"
  conditionText: "需要道具【边境向导】"
```

#### act2_cross_desert - 穿越沙漠缺口（极高风险）

```yaml
id: act2_cross_desert
type: FIXED
trigger:
  condition: SCENE
  sceneId: act2
  stage: 2
  requiredFlags:
    - flag: gap_discovered
      value: true
cost:
  actionPoints: 4
checks:
  - attribute: survival
    threshold: 8
    operator: ">="
    success:
      effects:
        - type: MODIFY_CASH_PERCENT
          percent: -20
          description: "用于购买食物和水"
        - type: TRANSITION_SCENE
          targetScene: act3
          description: "成功穿越沙漠，进入场景3"
      description: "凭借求生本能和运气，你在沙漠中找到水源，艰难跋涉后抵达公路"
    failure:
      endingId: death_desert_crossing
      description: "第三天你倒在沙地上，喉咙像塞了一把烧红的刀子..."
description: |
  你已经找到了边境墙的缺口——几根钢筋扭曲着指向天空，混凝土碎块散落在沙地上。
  
  现在你必须做出选择：是冒险穿过缺口后的沙漠，还是寻找其他方式？
  
  你在小镇的酒吧里听到了这个传闻——边境墙有一段因年久失修而倒塌，形成一个足以容人通过的缺口。但穿过那堵墙后，等待你的是一片广袤的沙漠。
  
  "那边没有人巡逻，"酒保压低声音说，"但也没人能从那片沙漠里活着走出来。上个月有三个人试过，只找到一个脱水而死的。"
  
  你来到传闻中的位置。确实，边境墙在这里有一个缺口——几根钢筋扭曲着指向天空，混凝土碎块散落在沙地上。但墙的另一侧只有无尽的黄沙，热浪在远处扭曲成诡异的形状。
  
  这是一个疯狂的选择。没有向导、没有补给、没有退路。要么穿越沙漠，要么死在里面。
ui:
  title: "穿越沙漠缺口"
  description: "穿过边境墙缺口，独自穿越沙漠（极高风险）"
  conditionText: "需要生存能力≥8"
```

#### act2_cross_climb - 攀爬边境墙（高体魄要求）

```yaml
id: act2_cross_climb
type: FIXED
trigger:
  condition: SCENE
  sceneId: act2
  stage: 2
cost:
  actionPoints: 4
checks:
  - attribute: physique
    threshold: 12
    operator: ">="
    success:
      effects:
        - type: MODIFY_RESOURCE
          resource: physicalHealth
          value: -20
          description: "钢柱烫手灼伤+跳下时的磕碰伤"
        - type: TRANSITION_SCENE
          targetScene: act3
          description: "成功翻越边境墙，进入场景3"
      description: "你成功攀上了边境墙，纵身一跃落在美国的土地上"
    failure:
      endingId: death_wall_fall
      description: "你攀上了墙顶，但体力已经耗尽。手指一滑..."
description: |
  边境墙高耸入云，但你注意到一处相对低矮的区段。没有铁丝网，只有光滑的钢柱和混凝土。这是你唯一的机会。
  
  白天，钢柱被晒得滚烫。夜晚，表面结露变得湿滑。无论什么时候攀爬，都是对体魄的极限考验。
  
  墙的另一侧，就是美国。但也可能是你的葬身之地。
ui:
  title: "攀爬边境墙"
  description: "直接攀爬边境墙进入美国（高体魄要求，失败即死）"
  conditionText: "需要体魄≥12"
```

---

## 3. P1新增随机事件

### 3.1 遇到其他偷渡者 (ID: `rand2_meet_migrant`) ⭐P1新增

| 属性 | 值 |
|-----|---|
| 名称 | 遇到其他偷渡者 |
| 事件类型 | RANDOM |
| 触发阶段 | 阶段1或阶段2 |
| 触发概率 | 15% |

**你看到了什么**：
```
雨林的泥泞小道上，你遇到了另一群人。

他们也是偷渡者，来自另一个省份，说着你听不太懂的方言。

"一起走吧，"他们的领头人说，"人多安全点。"
```

| 系统效果 |
| 社交: +2 |
| 可能获得情报（降低后续负面事件概率5%） |
| 可能获得物资（水、食物） |
| 备注 | 分享信息、互相鼓励 |

---

### 3.2 向导临时涨价 (ID: `rand2_guide_raising_price`) ⭐P1新增

| 属性 | 值 |
|-----|---|
| 名称 | 向导临时涨价 |
| 事件类型 | RANDOM |
| 触发条件 | 雇佣向导后 |
| 触发概率 | 20% |

**你看到了什么**：
```
向导停下脚步，转过身来。

"前面路更难走了，"他说，"还有巡逻队。"

"加钱。从这周开始，每天$80。不接受就另请高明。"

他的眼神里没有商量余地。
```

**可选行动**：
| 选项 | 效果 |
|------|------|
| 接受涨价 | 向导费从$50/回合提升至$80/回合 |
| 拒绝 | 向导离开，需独自穿越 |
| 讲价（社交≥8） | 50%概率维持原价，50%概率向导直接离开 |

| 备注 | 向导以各种理由要求加价 |

---

### 3.3 恶劣天气 (ID: `rand2_weather_storm`) ⭐P1新增

| 属性 | 值 |
|-----|---|
| 名称 | 恶劣天气 |
| 事件类型 | RANDOM |
| 触发阶段 | 阶段1 |
| 触发概率 | 15% |

**你看到了什么**：
```
天空突然暗了下来。

乌云翻滚，雷声轰鸣。暴雨倾盆而下，瞬间将小路变成泥河。

你躲在树下，但树叶根本挡不住这样的雨势。
```

| 系统效果 |
| 本回合无法前进 |
| 健康: -10 |
| 有`shelter`道具时健康消耗减半 |
| 备注 | 暴雨、洪水、无法通行 |

---

## 4. 紧急借贷事件（TERMINAL）

### 概述

这是场景2为新手玩家提供的**补偿机制**——当玩家因准备不足、负面事件损失或向导费用消耗导致现金短缺时，可以通过向导进行紧急借贷，以继续游戏进程。但债务将**不清零**，会带入场景3并产生严重后果。

**设计目的**：
- 避免新手玩家因现金管理失误而被迫重开
- 提供"以债换命"的艰难选择
- 在场景3增加债务追偿的压力机制

**触发条件**：
- 现金 < $50
- 每局游戏只能触发一次
- 强制触发（无其他选择时弹出）

---

### act2_emergency_loan - 向导的"好意"

```yaml
id: act2_emergency_loan
type: TERMINAL
trigger:
  condition: SCENE
  sceneId: act2
  customCheck: "cash < 50"
  maxTriggers: 1  # 每局游戏只能触发一次
oncePerGame: true
description: |
  你的钱包空空如也。向导看着你，眼神变得危险。
  
  "我可以先借你，"他说，"但到了美国，你要连本带利还给我。"
  
  "蛇头在那边有联络人，你跑不掉的。"
choices:
  - id: borrow_200
    title: "借 $200"
    description: "借$200（利息50%，分7回合还清，每回合自动扣除约$43）"
    condition: null
    effects:
      - type: MODIFY_CASH
        value: 200
        description: "获得现金 +$200"
      - type: ADD_DEBT
        debtId: debt_snakehead_200
        principal: 200
        interestRate: 0.5
        totalAmount: 300
        installmentTurns: 7
        installmentAmount: 43
        description: "债务：分7回合还清，每回合自动扣除约$43，可随时提前还款"
    narrative: "向导点点头，递给你几张皱巴巴的钞票。"
    
  - id: borrow_500
    title: "借 $500"
    description: "借$500（利息100%，分7回合还清，每回合自动扣除约$143）"
    condition: null
    effects:
      - type: MODIFY_CASH
        value: 500
        description: "获得现金 +$500"
      - type: ADD_DEBT
        debtId: debt_snakehead_500
        principal: 500
        interestRate: 1.0
        totalAmount: 1000
        installmentTurns: 7
        installmentAmount: 143
        description: "债务：分7回合还清，每回合自动扣除约$143，可随时提前还款"
    narrative: "向导的笑容让你不寒而栗。"
    
  - id: refuse
    title: "拒绝"
    description: "拒绝借贷，尝试另寻出路"
    condition: null
    checks:
      - attribute: riskAwareness
        threshold: 6
        operator: ">="
        success:
          effects:
            - type: NONE
              description: "向导冷哼一声离开"
          narrative: "你看出他眼中的贪婪，转身离开。向导冷哼一声，没有再追上来。你另寻出路，勉强维持。"
        failure:
          endingId: death_abandoned
          narrative: "向导脸色骤变，一把推开了你..."
    narrative: null
ui:
  title: "紧急借贷"
  icon: "💰"
  alertLevel: "warning"
```

**债务机制说明**：
- 债务带入场景3，不清零
- 每回合开始时自动从现金中扣除当期还款额
- 现金不足时记为逾期，连续2回合逾期触发违约事件
- 可随时选择提前还清剩余款项（无违约金）

**选项对比**：

| 选项 | 获得现金 | 还款方式 | 总成本 |
|------|---------|---------|-------|
| 借$200 | +$200 | 7回合，每回合约$43 | $300 |
| 借$500 | +$500 | 7回合，每回合约$143 | $1000 |
| 拒绝 | - | - | 可能死亡 |

#### 选项1：借 $200
- **获得现金**：+$200 USD
- **债务详情**：
  - 本金：$200
  - 利息：50%
  - 分期：7回合
  - 每期还款：约$43
  - 总还款额：$300
- **风险**：相对可控，但若场景3开局不顺仍可能违约

#### 选项2：借 $500
- **获得现金**：+$500 USD
- **债务详情**：
  - 本金：$500
  - 利息：100%
  - 分期：7回合
  - 每期还款：约$143
  - 总还款额：$1000
- **风险**：高额债务，场景3前期压力巨大，违约概率高

#### 选项3：拒绝
- **风险意识 ≥ 6**：成功识破危险，另寻出路，无立即惩罚
- **风险意识 < 6**：向导翻脸，触发死亡结局 `death_abandoned`

---

### 债务系统配置

#### debt_snakehead_200 - 蛇头债务（$200本金）

```yaml
id: debt_snakehead_200
type: DEBT
category: snakehead
principal: 200
interestRate: 0.5
totalAmount: 300  # 本金+利息总额
installmentTurns: 7  # 分期7回合
installmentAmount: 43  # 每期约$43（300/7≈42.86，向上取整）
remainingTurns: 7  # 剩余还款回合
carryOver: true  # 不清零，带入场景3
repayment:
  type: PER_TURN  # 每回合自动扣除
  trigger: TURN_START  # 回合开始时
  allowEarlyRepayment: true  # 允许提前还款
  earlyRepaymentPenalty: 0  # 无违约金
  latePayment:
    gracePeriod: 1  # 宽限期1回合
    maxConsecutiveMissed: 2  # 连续2回合逾期触发违约
    consequence: TRIGGER_EVENT
    eventId: act3_debt_default
effects:
  - type: MODIFY_CASH_PER_TURN
    value: -43
    description: "每回合自动扣除还款$43"
ui:
  name: "蛇头债务"
  description: "欠向导的借款，本金$200，分7回合还清，每回合约$43"
  icon: "💀"
```

#### debt_snakehead_500 - 蛇头债务（$500本金）

```yaml
id: debt_snakehead_500
type: DEBT
category: snakehead
principal: 500
interestRate: 1.0
totalAmount: 1000  # 本金+利息总额
installmentTurns: 7  # 分期7回合
installmentAmount: 143  # 每期约$143（1000/7≈142.86，向上取整）
remainingTurns: 7  # 剩余还款回合
carryOver: true  # 不清零，带入场景3
repayment:
  type: PER_TURN  # 每回合自动扣除
  trigger: TURN_START  # 回合开始时
  allowEarlyRepayment: true  # 允许提前还款
  earlyRepaymentPenalty: 0  # 无违约金
  latePayment:
    gracePeriod: 1  # 宽限期1回合
    maxConsecutiveMissed: 2  # 连续2回合逾期触发违约
    consequence: TRIGGER_EVENT
    eventId: act3_debt_default
effects:
  - type: MODIFY_CASH_PER_TURN
    value: -143
    description: "每回合自动扣除还款$143"
ui:
  name: "蛇头债务（大额）"
  description: "欠向导的借款，本金$500，分7回合还清，每回合约$143"
  icon: "💀"
  alertLevel: "critical"
```

---

### 新增死亡结局：被遗弃荒野

#### death_abandoned - 向导的背叛

```yaml
id: death_abandoned
type: ENDING
endingType: DEATH
trigger:
  eventId: act2_emergency_loan
  condition: "choice == 'refuse' AND riskAwareness < 6"
description: |
  向导脸色骤变。
  
  "你以为这是慈善？"他冷笑一声，一把将你推向旁边的灌木丛。
  
  你踉跄着后退，脚下踩空——身后是一个陡坡。你试图抓住什么，但只抓到了一把枯叶。
  
  然后你在坠落。
  
  你最后看到的，是向导冷漠的背影消失在树冠之上，以及头顶那一线渐渐变暗的天空。
  
  没有人会来找你。在这片雨林的某个角落，你将慢慢腐烂，成为无数无人知晓的孤魂之一。
  
  你的家人永远不会知道你在哪里死去。几年后，他们或许会以为你已经在"美国"开始了新生活。
ui:
  title: "被遗弃在荒野"
  icon: "☠️"
```

---

## 5. 场景2死亡结局

场景2共有**8个**特定死亡结局：

| 结局ID | 名称 | 触发事件 | 触发条件 | 阶段 |
|--------|------|---------|---------|------|
| death_bandit | 劫匪枪杀 | rand2_bandit | 风险意识判定失败（<5） | 阶段1 |
| death_snake | 毒蛇毒发 | rand2_snake | 体魄判定失败（<5） | 阶段1 |
| death_fall | 摔下山崖 | rand2_fall | 风险意识判定失败（<4） | 阶段1 |
| death_swamp | 陷入沼泽 | rand2_swamp | 生存能力判定失败（<5） | 阶段1 |
| death_infection | 感染败血症 | rand2_insect | 体魄判定失败（<4） | 阶段1 |
| death_poison | 食物中毒 | rand2_food | 智力判定失败（<5） | 阶段1 |
| death_desert_crossing | 沙漠渴死 | act2_cross_desert | 生存能力判定失败（<8） | 阶段2→3 |
| death_wall_fall | 坠墙身亡 | act2_cross_climb | 体魄判定失败（<12） | 阶段2→3 |

### 死亡结局文案

#### death_bandit - 劫匪枪杀

那个男人的枪比你想象中更旧，但抵在额头上的感觉是一样的冰冷。

"钱。"他只说了这一个字。

你颤抖着掏出所有现金。他数了数，皱起眉头。"就这些？"

你想解释，但枪声已经响了。

你的尸体被拖进灌木丛，钱被拿走，没有人会为你收尸。

---

#### death_snake - 毒蛇毒发

剧痛从小腿传来时，你低头看到了那条色彩斑斓的蛇——它正从你的脚边溜走。

你知道这种蛇。你在水群里看过照片，有人说"被咬了基本没救"。

你试图用嘴吸出毒液，但舌头很快开始发麻。视野边缘出现黑点，呼吸变得困难。

你倒在雨林深处，成为这片土地的养分。

---

#### death_fall - 摔下山崖

你踩到了一块松动的石头，身体失去平衡。你试图抓住什么，但只抓到了一把藤蔓。

藤蔓断了。

然后你在坠落。

最后看到的，是茂密的树冠和一线天空。

你的身体会在几周后被发现，或者被野兽吃掉，或者就这样腐烂。

---

#### death_swamp - 陷入沼泽

你以为是普通的积水，一脚踩下去才知道是沼泽。

泥水迅速没过膝盖，然后是腰部。你拼命挣扎，但越挣扎陷得越快。

"救命！"你喊了几声，但雨林里只有你的回音。

泥水没过胸口时，你开始后悔。后悔离开家，后悔走这条路，后悔没有听那个老人说的"别独自进雨林"。

泥水没过头顶。一切归于寂静。

---

#### death_infection - 感染败血症

起初只是一个小伤口，被某种虫子咬的。你简单处理了一下，继续前进。

三天后，伤口开始流脓，你发起高烧。你没有抗生素，也没有足够的净水清洗伤口。

你倒在一棵大树下，浑身滚烫又发冷。意识模糊中，你想起母亲塞给你的红包。

你没有机会报平安了。

---

#### death_poison - 食物中毒

你太饿了。那堆野果看起来可以吃——颜色鲜艳，散发着甜香。

你吃了。然后你开始剧烈呕吐、腹泻、痉挛。

雨林里没有医院，没有救护车。你蜷缩在树根旁，脱水、虚脱，直到心脏停止跳动。

后来的人也许会发现你的尸体，看到你手中还攥着的半个毒果。

---

#### death_desert_crossing - 沙漠渴死

第三天你倒在沙地上，喉咙像塞了一把烧红的刀子。你试图爬，但沙子烫得像是熔炉。

最后的意识里，你听到风吹过边境墙的声音——那么近，又那么远。

---

#### death_wall_fall - 坠墙身亡

你攀上了墙顶，但体力已经耗尽。手指一滑，身体向后仰去。

你甚至没来得及喊叫，就重重摔在水泥地上。视野迅速变黑，最后的意识是身下的温热——那是你自己的血。

---

## 6. 数值参考

### 资源初始状态

| 资源 | 初始值 | 说明 |
|-----|-------|------|
| 现金 | $500-1000 | 场景1剩余人民币兑换 |
| 起始物资 | 基础指南针、少量水和饼干 | 系统赠送 |
| 身体健康度 | 可能因场景1有所下降 | 视场景1状态继承 |

### 判定门槛汇总

| 事件 | 判定属性 | 门槛 | 难度评价 |
|-----|---------|------|---------|
| rand2_bandit | 风险意识 | ≥5 | 中等 |
| rand2_snake | 体魄 | ≥5 | 中等 |
| rand2_fall | 风险意识 | ≥4 | 较低 |
| rand2_swamp | 生存能力 | ≥5 | 中等 |
| rand2_insect | 体魄 | ≥4 | 较低 |
| rand2_food | 智力 | ≥5 | 中等 |
| act2_move_solo | 生存能力 | ≥4 | 较低 |
| act2_cross_desert | 生存能力 | ≥8 | 较高 |
| act2_cross_climb | 体魄 | ≥12 | 极高 |

### 效果数值汇总

| 事件 | 通过效果 | 失败效果 |
|-----|---------|---------|
| rand2_bandit | 现金-$50~$100，心理-10 | 死亡 |
| rand2_snake | 健康-15，中毒Debuff(3回合，每回合-5健康) | 死亡 |
| rand2_fall | 健康-10，心理-5 | 死亡 |
| rand2_swamp | 健康-20，行动点-1 | 死亡 |
| rand2_insect | 健康-10，感染Debuff(3回合，每回合-5健康) | 死亡 |
| rand2_food | 健康-5，心理-5 | 死亡 |
| act2_cross_truck | 健康-5，心理-10，进入场景3 | - |
| act2_cross_desert | 现金-20%，进入场景3 | 死亡 |
| act2_cross_climb | 健康-20，进入场景3 | 死亡 |

### 经济系统

| 项目 | 费用 |
|-----|------|
| 向导带路（每回合） | $50 |
| 联系货车司机 | $200 |
| 瓶装水 | $10 |
| 罐头食品 | $15 |
| 急救包 | $50 |

---

## 7. 事件ID汇总

### 固定事件（FIXED）

| 事件ID | 类型 | 说明 |
|--------|------|------|
| act2_move_guide | 阶段1前进 | 向导带路 |
| act2_move_solo | 阶段1前进 | 独自穿越 |
| act2_town_contact_driver | 阶段2活动 | 联系货车司机 |
| act2_town_gather_info | 阶段2活动 | 打探消息 |
| act2_town_find_gap | 阶段2活动 | 寻找边境墙漏洞 |
| act2_town_buy_supplies | 阶段2活动 | 补充物资 |
| act2_town_wait | 阶段2活动 | 等待时机 |
| act2_cross_truck | 阶段2穿越 | 货车偷渡 |
| act2_cross_desert | 阶段2穿越 | 穿越沙漠缺口 |
| act2_cross_climb | 阶段2穿越 | 攀爬边境墙 |

### 随机事件（RANDOM）

| 事件ID | 类型 | 说明 | 权重 |
|--------|------|------|------|
| rand2_bandit | 阶段1负面 | 丛林劫匪 | 20% |
| rand2_snake | 阶段1负面 | 毒蛇猛兽 | 20% |
| rand2_fall | 阶段1负面 | 危险小径 | 20% |
| rand2_swamp | 阶段1负面 | 沼泽陷阱 | 15% |
| rand2_insect | 阶段1负面 | 毒虫袭击 | 15% |
| rand2_food | 阶段1负面 | 可疑食物 | 10% |
| rand2_meet_migrant | P1新增 | 遇到其他偷渡者 | 15% |
| rand2_guide_raising_price | P1新增 | 向导临时涨价 | 20% |
| rand2_weather_storm | P1新增 | 恶劣天气 | 15% |
| rand2_info_gap | 连锁事件 | 缺口情报 | - |
| rand2_raided | 连锁事件 | 巡逻突击 | - |

### 连锁事件（CHAIN）

| 事件ID | 父事件 | 说明 |
|--------|--------|------|
| rand2_info_gap | act2_town_gather_info | 打探消息获得的情报 |
| rand2_raided | act2_town_wait | 等待时遭遇巡逻突击 |

### 终结态事件（TERMINAL）

| 事件ID | 类型 | 说明 | 触发条件 |
|--------|------|------|---------|
| act2_emergency_loan | TERMINAL | 紧急借贷 | 现金<$50，每局1次 |

### 死亡结局

| 结局ID | 触发事件 | 说明 |
|--------|---------|------|
| death_bandit | rand2_bandit | 劫匪枪杀 |
| death_snake | rand2_snake | 毒蛇毒发 |
| death_fall | rand2_fall | 摔下山崖 |
| death_swamp | rand2_swamp | 陷入沼泽 |
| death_infection | rand2_insect | 感染败血症 |
| death_poison | rand2_food | 食物中毒 |
| death_desert_crossing | act2_cross_desert | 沙漠渴死 |
| death_wall_fall | act2_cross_climb | 坠墙身亡 |
| death_abandoned | act2_emergency_loan | 被遗弃在荒野（拒绝借贷失败）|

### Debuff/Status

| ID | 类型 | 说明 |
|-----|------|------|
| debuff_poisoned | 状态 | 中毒（每回合-5健康，持续3回合）|
| debuff_bleeding | 状态 | 伤口感染（每回合-5健康，持续3回合）|

### 债务

| ID | 类型 | 说明 |
|-----|------|------|
| debt_snakehead_200 | 债务 | 蛇头债务，本金$200，分7回合还清，每回合约$43 |
| debt_snakehead_500 | 债务 | 蛇头债务（大额），本金$500，分7回合还清，每回合约$143 |

### 道具

| ID | 类型 | 说明 |
|-----|------|------|
| border_guide | 消耗型 | 边境向导，解锁货车偷渡 |

---

## 附录：设计检查清单

- [x] 符合"场景2只能前进，无退路"的设计原则
- [x] 【法律真空】压力体现为每回合强制负面事件
- [x] 两阶段结构清晰（雨林0-4步 → 边境小镇第5步）
- [x] 进度可视化明确（玩家知道自己在第几步）
- [x] 每回合强制负面事件，营造紧张感
- [x] 负面事件判定门槛适中（4-5），非极端但仍有死亡风险
- [x] 向导带路 vs 独自穿越 形成明显的风险/成本权衡
- [x] 阶段2提供三种穿越方式，满足不同属性优势的玩家
- [x] 死亡结局多样化，符合场景2高死亡率的设定
- [x] 情绪曲线符合"绝望→坚韧→孤注一掷"的设计
- [x] 阶段2→3的过渡死亡有特定描述文案
- [x] 阶段1预期回合5-10，阶段2预期3-5，总体符合5-15回合设计
- [x] 紧急借贷事件作为现金不足的补偿机制，债务带入场景3
- [x] 拒绝借贷的风险意识检定，失败即死亡，增加决策压力
