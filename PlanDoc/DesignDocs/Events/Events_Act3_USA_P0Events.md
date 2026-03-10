# 场景3 P0级核心事件

> 本文档包含场景3（美国生存）的6个P0级阻塞事件。
> 这些事件是游戏核心循环的关键组件，缺失会导致玩法无法完整运行。

---

## P0事件索引

| 序号 | 事件ID | 名称 | 类型 | 功能 |
|------|--------|------|------|------|
| 001 | `act3_living_cost` | 每月生活成本扣除 | FIXED(系统) | 现金流压力核心机制 |
| 002 | `act3_inflation_trigger` | 通胀Debuff触发 | RANDOM | 渐进压力机制 |
| 003 | `rand3_ice_raid` | ICE突袭检查 | RANDOM | 盘查恐惧核心事件 |
| 004 | `act3_deportation_process` | 遣返流程链 | CHAIN | 被捕后完整流程 |
| 005 | `act3_visa_overstay` | 签证过期处理 | SYSTEM | 身份状态转换 |
| 006 | `act3_lodge_shelter` | 收容所床位 | FIXED | 基础住宿保障 |

---

## P0Event_Act3_001: act3_living_cost - 每月生活成本自动扣除

### 事件概览

| 属性 | 值 |
|-----|---|
| **事件ID** | `act3_living_cost` |
| **事件类型** | `FIXED`（系统强制触发） |
| **触发时机** | 每月1日（每30回合）自动触发 |
| **能否跳过** | 否 |

### 成本计算机制

**总生活成本 = 食品成本 + 住宿成本 + 出行成本**

#### 1. 食品成本（固定）
| 项目 | 成本 | 说明 |
|-----|------|------|
| 基础食品 | $400/月 | 人活着就要吃饭，不可减少 |

#### 2. 住宿成本（由`lodging`道具决定）
| 道具 | 成本/月 | 效果 | 风险 |
|-----|---------|------|------|
| 无住所 | $0 | 获得【露宿街头】Debuff | 被捕概率+20%，健康-10/回合 |
| `lodging_shelter` | $0 | 健康+2/回合，心理-3/回合 | ICE突袭概率+10% |
| `lodging_shared` | $600 | 健康+5/回合，心理+3/回合 | 基础风险 |
| `lodging_apartment` | $1,200 | 健康+8/回合，心理+5/回合 | 低风险 |
| `lodging_house` | $2,500 | 健康+10/回合，心理+8/回合 | 最低风险 |

#### 3. 出行成本（由`transport`道具决定）
| 道具 | 成本/月 | 效果 | 限制 |
|-----|---------|------|------|
| 无交通工具 | $0 | 只能找步行距离内的工作 | 工作选择-50% |
| `transport_bus` | $100 | 基础出行能力 | 无 |
| `transport_ebike` | $50 | 低成本出行 | 无 |
| `transport_used_car` | $350 | 解锁中距离工作 | 无 |
| `transport_tesla` | $600 | 解锁Uber升级选项，收入×1.3 | 无 |

### 文案描述

**你看到了什么**：
```
手机日历提醒你：又是月初了。

你打开银行App，看着余额，深吸一口气。

房租、电费、手机费、车费、保险费、食品杂货...

每个月这一天，钱就像流水一样消失。你甚至还没开始打工，就已经欠了一屁股债。

这就是在美国的生活——不管你挣多少，总有东西在等着把你的口袋掏空。
```

**账单弹窗**：
```
┌─────────────────────────────────────────┐
│ 📅 本月生活账单                          │
├─────────────────────────────────────────┤
│                                         │
│  🍞 食品开销                    -$400   │
│  🏠 住宿（合租房间）            -$600   │
│  🚌 出行（公交卡）              -$100   │
│                                         │
│  ─────────────────────────────────────  │
│  💸 本月总支出                 -$1,100  │
│                                         │
│  💰 剩余现金                    $XXX    │
│                                         │
└─────────────────────────────────────────┘
```

### 系统效果

| 条件 | 效果 |
|------|------|
| 现金充足 | 扣除总生活成本，显示账单弹窗 |
| 现金不足 | 扣除至$0，触发【匮乏】状态，下回合开始濒死/崩溃倒计时 |
| 有通胀Debuff | 成本 = 基础成本 × 通胀倍率 |

### 代码配置

```yaml
id: act3_living_cost
category: FIXED
type: SYSTEM_MANDATORY
name: 每月生活成本扣除
trigger:
  type: TURN_BASED
  interval: 30                    # 每30回合触发
costCalculation:
  food:
    base: 400
    inflationAffected: true       # 受通胀影响
  lodging:
    tag: lodging
    mapping:
      null: { cost: 0, debuff: 'homeless' }
      lodging_shelter: { cost: 0, healthPerTurn: 2, mentalPerTurn: -3 }
      lodging_shared: { cost: 600, healthPerTurn: 5, mentalPerTurn: 3 }
      lodging_apartment: { cost: 1200, healthPerTurn: 8, mentalPerTurn: 5 }
      lodging_house: { cost: 2500, healthPerTurn: 10, mentalPerTurn: 8 }
  transport:
    tag: transport
    mapping:
      null: { cost: 0, workRestriction: 'walking_only' }
      transport_bus: { cost: 100 }
      transport_ebike: { cost: 50 }
      transport_used_car: { cost: 350 }
      transport_tesla: { cost: 600, unlockUberUpgrade: true, incomeMultiplier: 1.3 }
```

---

## P0Event_Act3_002: act3_inflation_trigger - 通胀Debuff触发事件

### 事件概览

| 属性 | 值 |
|-----|---|
| **事件ID** | `act3_inflation_trigger` |
| **事件类型** | `RANDOM` |
| **触发条件** | 场景3回合>20，每10回合20%概率触发 |
| **最大触发** | 3次（最多叠加3层） |

### 通胀层级效果

| 层级 | Debuff名称 | 生活成本 | 打工收入 | 心理消耗 |
|------|-----------|---------|---------|---------|
| 第1层 | 【物价上涨】 | +10% | 无 | 无 |
| 第2层 | 【通货膨胀】 | +20% | -10% | 无 |
| 第3层 | 【恶性通胀】 | +30% | -15% | -2/回合 |

### 文案描述

**第一层触发**：
```
你在华人超市买菜时，发现上周还$2.99的鸡蛋，现在变成了$3.29。

"又涨价了，"收银员无奈地说，"运费、人工，什么都涨。"

你默默把鸡蛋放回货架，拿了一包更便宜的泡面。
```

**第二层触发**：
```
新闻推送："美国通胀率创40年新高，美联储暗示继续加息。"

老乡群里炸了：
- "房租要涨15%，房东刚发的通知"
- "Uber抽成又提高了"
- "这日子还怎么过？"

你发现你的Uber收入真的少了——平台抽成从20%涨到了30%。
```

**第三层触发**：
```
你站在加油站前，看着油价显示屏上的数字跳到了$5.99。

加满一箱油要$80，而你送一天外卖才挣$60。

"这他妈是在抢钱..."你喃喃自语。

你开始理解为什么新闻里有人为了$5杀人。绝望是会传染的。
```

### 系统效果

```typescript
interface InflationDebuff {
  id: 'economic_inflation_1' | 'economic_inflation_2' | 'economic_inflation_3';
  type: 'economic';
  subtype: 'usd_inflation';
  layer: 1 | 2 | 3;
  effects: {
    foodCostMultiplier: number;      // 食品成本倍率
    lodgingCostMultiplier: number;   // 住宿成本倍率
    transportCostMultiplier: number; // 出行成本倍率
    workIncomeMultiplier: number;    // 打工收入倍率
    mentalDamagePerTurn?: number;    // 每回合心理伤害（仅第3层）
  };
  duration: -1;  // 永久，直到被降低或游戏结束
}
```

### Debuff叠加规则

| 当前层级 | 新触发层级 | 结果 |
|---------|-----------|------|
| 无 | 1 | 获得【物价上涨】（1层） |
| 1 | 1 | 延长1层持续时间（不叠加效果） |
| 1 | 2 | 移除1层，获得【通货膨胀】（2层） |
| 2 | 3 | 移除2层，获得【恶性通胀】（3层） |
| 3 | 任意 | 已最高级，不叠加 |

### 代码配置

```yaml
id: act3_inflation_trigger
category: RANDOM
name: 通胀Debuff触发事件
trigger:
  phase: TURN_START
  conditions:
    - type: SCENE
      value: act3
      minSceneTurn: 20              # 场景回合>20
  probability:
    base: 0.20                       # 20%基础概率
    checkInterval: 10               # 每10回合检查一次
  maxTriggers: 3                     # 最多触发3次
scenes: [act3]
execute: |
  const currentLayer = getInflationLayer();
  if (currentLayer >= 3) return;    // 已达最高层
  
  const newLayer = currentLayer + 1;
  applyInflationDebuff(newLayer);
  
  // 显示对应层级的叙事文本
  showInflationNarrative(newLayer);
```

---

## P0Event_Act3_003: rand3_ice_raid - ICE突袭完整流程

### 事件概览

| 属性 | 值 |
|-----|---|
| **事件ID** | `rand3_ice_raid` |
| **事件类型** | `RANDOM` |
| **触发条件** | 场景3随机触发（与身份状态无关） |

### 触发概率计算

```
基础概率 = 5%
+ (移民执法压力强度 × 3%)
+ (露宿街头 ? 8% : 0%)
```

**设计说明**：ICE突袭与身份状态无关——正如现实中ICE也会逮捕美国公民。

| 压力等级 | 基础概率 | 露宿街头时 | 说明 |
|---------|---------|-----------|------|
| 无 | 5% | 13% | 基础随机检查 |
| 强度1 | 8% | 16% | 政策收紧 |
| 强度2 | 11% | 19% | 搜捕升级 |
| 强度3 | 14% | 22% | 风声鹤唳 |
| 强度4 | 17% | 25% | 全城搜捕 |
| 强度5 | 20% | 28% | 红色警戒 |

### 阶段1：突袭发生

**触发条件**：场景3随机触发，**与身份状态无关**——ICE不看证件，任何人都有被突袭的可能。

**你看到了什么**：
```
凌晨五点，砸门声。

"ICE! OPEN UP!"

你从床上弹起来，心脏狂跳。门外传来沉重的脚步声和无线电的杂音。

他们来了。
```

### 阶段2：玩家选择

#### 选项1：躲藏

| 条件 | 生存能力≥10 |
|-----|------------|
| **成功效果** | 躲过搜查，心理-10，获得【惊魂未定】（1回合行动点-1） |
| **失败效果** | 被发现，进入被捕状态 |
| **成功判定** | 生存能力 + 风险意识 vs 难度(18) |

**躲藏成功文案**：
```
你屏住呼吸，蜷缩在衣柜后面的缝隙里。

沉重的脚步声在房间里回荡。你听到他们在翻你的东西，用英语交谈。

"Clear." "Next room."

脚步声渐渐远去。你又在黑暗中等了三十分钟，才敢出来。

你的腿已经麻了，但你还活着。
```

#### 选项2：假装住户

| 条件 | 社交≥12 + 持有`fake_lease` |
|-----|--------------------------|
| **成功效果** | 蒙混过关，心理-5 |
| **失败效果** | 证件被识破，进入被捕状态，失去`fake_lease` |
| **成功判定** | 社交 + 英语技能 vs 难度(20) |

**假装成功文案**：
```
你深吸一口气，打开门，装作刚睡醒的样子。

"What's going on?"你用英语问，声音里带着恰到好处的困惑。

ICE探员看着你的租房合同，又看了看你的脸。

"Tenant?"他问。

"Yeah, I rent this room."你递上假的合同，"Is there a problem?"

探员皱了皱眉，把合同还给你："Stay inside."

门关上的那一刻，你几乎瘫倒在地。
```

#### 选项3：逃跑

| 条件 | 风险意识≥8 + 有后路（提前知晓逃生路线） |
|-----|--------------------------------------|
| **成功效果** | 逃脱，失去当前住所道具，心理-15 |
| **失败效果** | 被捕，健康-10（摔伤/搏斗） |
| **成功判定** | 风险意识 + 体魄 vs 难度(16) |

**逃跑成功文案**：
```
你早就准备好了——后门、消防梯、小巷。

你抓起钱包和手机，从窗户翻出去。消防梯的金属在脚下吱呀作响。

"Hey! STOP!"

你没有回头，拼命奔跑。穿过小巷，翻过围栏，钻进地铁入口。

当你终于停下来时，发现自己站在一个陌生的街区，身无分文，没有住处。

但至少，你是自由的。
```

### 阶段3：被捕后

**被捕即触发**：`act3_deportation_process` 遣返流程链

**被捕文案**：
```
冰冷的手铐扣上你的手腕。

"You have the right to remain silent..."探员用程式化的语气说。

你被推上警车，看着窗外的街景越来越远。

一切都结束了？还是刚刚开始？
```

### 系统效果

```typescript
interface IceRaidEvent {
  id: 'rand3_ice_raid';
  category: 'RANDOM';
  
  trigger: {
    // 【重要】ICE突袭与身份状态无关，所有场景3玩家都可能被突袭
    scene: 'act3';                    // 仅在场景3触发
    baseProbability: 0.05;            // 基础概率5%
    probabilityModifiers: {
      perPressureLevel: 0.03;         // 每级压力+3%
      homelessBonus: 0.08;            // 露宿街头+8%（更易被发现）
    };
  };
  
  phases: {
    phase1: 'raid_occurs';            // 突袭发生
    phase2: 'player_choice';          // 玩家选择（躲藏/假装/逃跑）
    phase3: 'outcome';                // 结果判定
  };
  
  choices: {
    hide: {
      requirements: { survival: 10 };
      check: 'survival + riskAwareness vs 18';
      success: { escape: true, mental: -10, debuff: 'shaken' };
      failure: { arrested: true };
    };
    pretend: {
      requirements: { social: 12, item: 'fake_lease' };
      check: 'social + english vs 20';
      success: { escape: true, mental: -5 };
      failure: { arrested: true, removeItem: 'fake_lease' };
    };
    flee: {
      requirements: { riskAwareness: 8, hasEscapeRoute: true };
      check: 'riskAwareness + physique vs 16';
      success: { escape: true, removeLodging: true, mental: -15 };
      failure: { arrested: true, health: -10 };
    };
  };
  
  arrestedOutcome: {
    status: 'detained';
    bail: 2000;                       // 保释金$2000
    triggerChain: 'act3_deportation_process';
  };
}
```

---

## P0Event_Act3_004: act3_deportation_process - 遣返流程

### 事件概览

| 属性 | 值 |
|-----|---|
| **事件ID** | `act3_deportation_process` |
| **事件类型** | `CHAIN` |
| **触发条件** | ICE突袭失败被捕 |
| **链长度** | 3个节点 |

### 链节点1：拘留中心

**持续时间**：3-5回合

**你看到了什么**：
```
拘留中心的灯光24小时不灭。

你躺在硬板床上，听着周围人的呻吟和哭泣。有人已经在这里待了三个月。

"下一个就是你。"看守说，"准备好见法官了吗？"

你不知道该祈祷快点还是慢点。
```

**每回合效果**：
| 效果 | 数值 |
|-----|------|
| 心理健康度 | -10/回合 |
| 无法执行任何打工事件 | - |
| 无法执行任何社交事件 | - |

**可选行动**：

| 选项 | 条件 | 效果 |
|------|------|------|
| 联系律师 | 现金≥$1000 | 进入节点2时有律师辩护 |
| 等待 | 无 | 无额外效果 |
| 认罪求轻判 | 无 | 50%概率直接遣返，50%概率暂缓 |

### 链节点2：移民法庭

**触发条件**：拘留中心回合结束

**你看到了什么**：
```
法庭很小，法官坐在高高的桌子后面，你坐在被告席，像只待宰的羔羊。

"你有什么要说的吗？"法官问。
```

**有律师的情况**（联系过律师）：
| 结果 | 概率 | 效果 |
|-----|------|------|
| 暂缓遣返 | 50% | 获得临时保护身份，继续游戏 |
| 直接遣返 | 50% | 进入节点3-遣返 |

**无律师的情况**：
| 结果 | 概率 | 效果 |
|-----|------|------|
| 暂缓遣返 | 10% | 获得临时保护身份，继续游戏 |
| 直接遣返 | 90% | 进入节点3-遣返 |

**庇护申请中的特殊情况**：
- 若已启动庇护申请事件链，可进入庇护法庭流程
- 庇护法庭成功率取决于庇护准备进度

### 链节点3：结局分支

#### 分支A：遣返回国

**触发条件**：法庭判决遣返

**文案**：
```
你最后一次回望这片你拼了命想要留下的土地。

洛杉矶的天还是那样蓝， palm trees 在风中摇曳。而你，要回家了——以一种你最不想的方式。

飞机起飞时，你想起那些花掉的钱、受过的苦、做过的梦。

一切都结束了。
```

**结局ID**：`ending_deported`
**结局名称**：**【折戟】· 遣返**

---

#### 分支B：暂缓遣返

**触发条件**：法庭判决暂缓

**文案**：
```
"Your removal is stayed pending further review."

法官的话你听不懂，但律师的表情告诉你：你暂时安全了。

"这不是绿卡，"律师说，"只是暂缓。他们随时可能重启程序。"

但至少，你还能呼吸自由的空气——哪怕只是暂时的。
```

**获得效果**：
| 效果 | 说明 |
|-----|------|
| 身份变为 `temporary_protected` | 临时保护 |
| 获得【遣返风险】标记 | ICE突袭概率额外+10% |
| 释放回社会 | 继续游戏，但压力倍增 |

---

#### 分支C：庇护法庭（特殊路径）

**触发条件**：庇护申请进行中

**流程**：
1. 进入庇护法庭子链
2. 根据庇护准备进度判定结果
3. 成功 → 获得庇护身份
4. 失败 → 返回遣返流程

### 系统配置

```yaml
id: act3_deportation_process
category: CHAIN
name: 遣返流程链
nodes:
  - id: node1_detention
    name: 拘留中心
    duration: { min: 3, max: 5 }      # 3-5回合
    perTurnEffects:
      mental: -10
      restrictedEvents: [work, social]
    choices:
      - id: hire_lawyer
        condition: { money: '>= 1000' }
        cost: { money: 1000 }
        effect: { hasLawyer: true }
      - id: wait
        effect: {}
      - id: plead_guilty
        effect: { randomOutcome: ['deport_50%', 'stay_50%'] }
        
  - id: node2_court
    name: 移民法庭
    prerequisites: [node1_detention]
    outcomes:
      withLawyer:
        stay: 0.50                     # 50%暂缓
        deport: 0.50                   # 50%遣返
      withoutLawyer:
        stay: 0.10                     # 10%暂缓
        deport: 0.90                   # 90%遣返
      asylumPending:
        goto: asylum_court_chain       # 进入庇护法庭
        
  - id: node3_outcome
    name: 结局分支
    prerequisites: [node2_court]
    branches:
      - condition: { outcome: 'deport' }
        result: { ending: 'ending_deported' }
      - condition: { outcome: 'stay' }
        result: 
          identity: 'temporary_protected'
          flags: ['deportation_risk']
          continueGame: true
```

---

## P0Event_Act3_005: act3_visa_overstay - 学签/旅游签过期事件

### 事件概览

| 属性 | 值 |
|-----|---|
| **事件ID** | `act3_visa_overstay` |
| **事件类型** | `SYSTEM`（状态管理） |
| **触发方式** | 签证倒计时归零时自动触发 |

### 旅游签过期流程

#### 倒计时系统

| 剩余回合 | 事件 | 效果 |
|---------|------|------|
| 第6回合 | 初始状态 | 身份：`tourist_visa`，倒计时：6 |
| 第2回合 | 警告事件 | 触发警告，心理-5 |
| 第1回合 | 最后警告 | 触发紧急警告，心理-10 |
| 第0回合 | 自动过期 | 身份转为`undocumented` |

#### 警告事件文案

**第2回合警告**：
```
你看着护照上的入境章——你的旅游签快到期了。

"续签？"你问自己。但你没有合法理由，也没有钱请律师。

日子一天天过去，你感到一阵焦虑——如果签证过期了，你该怎么办？
```

**过期时文案**：
```
今天，你的旅游签正式过期了。

从法律意义上，你不再是一个"游客"。你是一个"非法滞留者"。

这个标签像烙印一样贴在你身上。从此，每一次出门都可能是最后一次。
```

#### 过期后效果

| 效果 | 说明 |
|-----|------|
| 身份变为 `undocumented` | 非法滞留 |
| 获得【逾期滞留】标记 | ICE突袭概率+5% |
| 心理-15 | 身份焦虑 |
| 持续心理压力 | 每回合心理-2（黑户压力） |

---

### 学签过期流程

#### 学费支付系统

| 期数 | 间隔回合 | 金额 | 说明 |
|-----|---------|------|------|
| 第1期 | 入境时 | ~$1,389 | 分期付款尾款（如适用） |
| 第2期 | 第6回合 | $4,000 | 第1学期学费 |
| 第3期 | 第12回合 | $4,000 | 第2学期学费 |
| 第4期 | 第18回合 | $4,000 | 第3学期学费 |
| 总计 | - | ~$15,000 | 4期合计 |

#### 支付前警告

**提前2回合**：
```
学校发来邮件：学费缴纳截止日期临近。未按时缴纳将被取消学生身份。

你开始计算——房租、吃饭、生活费，再加上这笔学费...

钱从哪里来？
```

#### 未支付后果

**逾期未支付**：
```
你的学生账户被冻结了。

学校邮件："由于未缴纳学费，您的学生身份已被终止。请立即联系国际学生办公室。"

你知道这意味着什么。你不再是"学生"。你是"黑户"了。
```

**后果**：
| 效果 | 说明 |
|-----|------|
| 身份变为 `undocumented` | 学生签证失效 |
| 失去`dorm_key`道具 | 无法继续住宿舍 |
| 心理-20 | 身份崩溃 |
| 持续心理压力 | 每回合心理-3（黑户压力） |

#### 支付成功

```
你数了数剩下的钱——刚好够付这期学费。

按下支付键的那一刻，你松了口气。至少，你还能在这个国家多待几个月。

但下一期呢？你不敢想。
```

### 系统配置

```yaml
id: act3_visa_overstay
category: SYSTEM
name: 签证过期管理系统

# 旅游签配置
touristVisa:
  initialDuration: 6                   # 6回合有效期
  warnings:
    - atTurn: 2                        # 第2回合警告
      mentalPenalty: -5
      text: 'visa_warning'
    - atTurn: 1                        # 第1回合最后警告
      mentalPenalty: -10
      text: 'visa_urgent_warning'
  onExpiry:
    newIdentity: 'undocumented'
    flags: ['overstay_record']
    mentalPenalty: -15
    ongoingMentalDrain: -2             # 每回合心理-2

# 学签配置
studentVisa:
  tuitionPayments:
    - trigger: 'on_arrival'            # 入境时
      amount: 1389                     # 分期尾款（人民币换算）
      condition: 'installment_enabled'
    - trigger: { every: 6, max: 3 }    # 每6回合，共3次
      amount: 4000
      currency: 'USD'
  warningBeforePayment: 2               # 提前2回合警告
  onPaymentFailure:
    newIdentity: 'undocumented'
    removeItems: ['dorm_key']
    mentalPenalty: -20
    ongoingMentalDrain: -3             # 每回合心理-3
  onPaymentSuccess:
    extendIdentity: { turns: 6 }
```

---

## P0Event_Act3_006: act3_lodge_shelter - 收容所床位

### 事件概览

| 属性 | 值 |
|-----|---|
| **事件ID** | `act3_lodge_shelter` |
| **事件类型** | `FIXED` |
| **触发条件** | 现金<$50，无住所 |
| **物品槽位** | 无 |

### 收容所机制

#### 基本效果

| 属性 | 数值 |
|-----|------|
| 获得道具 | `lodging_shelter` |
| 成本 | $0 |
| 健康恢复 | +2/回合 |
| 心理消耗 | -3/回合 |
| ICE突袭概率加成 | +10% |

#### 续期机制

| 项目 | 说明 |
|-----|------|
| 有效期 | 7回合 |
| 续期条件 | 社交检定≥5 |
| 续期失败 | 失去`lodging_shelter`，转为露宿街头 |

### 文案描述

**申请收容所**：
```
华人社区中心的收容所位于一栋老旧公寓的地下室。

你填写了表格，领到了一张床位卡——上下铺的架子床，一间屋子住12个人。

"晚餐6点，早餐7点，"工作人员说，"11点熄灯。不要喧哗，不要打架。"

你找到自己的床位——下铺，靠近厕所，散发着消毒水和霉味混合的气息。

但至少，今晚你不会淋雨了。
```

**收容所生活**：
```
收容所的夜晚很长。

上铺的人在打呼噜，隔壁床的大叔在喃喃自语。有人半夜起来上厕所，铁架子床吱呀作响。

你躺在黑暗中，听着这些声音。

这里的人各有故事——破产的留学生、被赶出来的打工仔、精神有问题的独居老人...

你们唯一的共同点，就是都没地方可去。
```

**续期申请**：
```
"你的床位这周到期了，"工作人员说，"要继续住的话，需要证明你在积极找工作。"

你赶紧掏出手机，给他看那些求职邮件的截图。

他点点头："下周再来填表。"

你又多了一周的喘息时间。
```

### 续期检定

| 条件 | 成功率 |
|-----|--------|
| 社交≥8 | 100% |
| 社交5-7 | 70% |
| 社交<5 | 40% |

**续期失败文案**：
```
"不好意思，床位紧张，"工作人员说，"你下周再来吧。"

你知道"再来"是什么意思——你可能要睡大街了。
```

### 系统配置

```yaml
id: act3_lodge_shelter
category: FIXED
name: 收容所床位
trigger:
  conditions:
    - type: MONEY
      operator: '<'
      value: 50
    - type: LACKS_ITEM_TAG
      tag: lodging
actionPointCost: 1
effects:
  grantItem: 'lodging_shelter'
  healthPerTurn: 2
  mentalPerTurn: -3
  raidChanceBonus: 0.10              # ICE突袭概率+10%
  
renewal:
  interval: 7                         # 每7回合需续期
  check: { attribute: 'social', difficulty: 5 }
  success: { extendDuration: 7 }
  failure: 
    removeItem: 'lodging_shelter'
    applyDebuff: 'homeless'
    
itemDefinition:
  id: lodging_shelter
  name: 收容所床位
  category: PERMANENT
  tags: [lodging]
  priority: 3                         # 优先级低于其他住宿
  duration: 7                         # 7回合有效期
  passiveEffects:
    perTurn:
      healthRestore: 2
      mentalRestore: -3
```

---

## 系统联动说明

### 事件间关联

```
act3_living_cost ───────┐
        │               │
        ▼               ▼
act3_inflation_trigger ──────── 生活成本系统
        │
        ▼
rand3_ice_raid ──────────────── 被捕风险系统
        │
        ▼
act3_deportation_process ────── 遣返结局系统
        │
        ▼
  遣返结局 / 继续游戏
```

### 身份状态流转

```
┌──────────────┐     过期      ┌──────────────┐
│ tourist_visa │ ────────────> │undocumented  │
│  (6回合)     │               │  (黑户)      │
└──────────────┘               └──────────────┘
                                      ▲
┌──────────────┐     欠费      ┌─────┘
│student_visa  │ ────────────> │
│  (15回合)    │               │
└──────────────┘               │
                                      │
                              ICE突袭被捕
                                      │
                              ┌───────┘
                              ▼
                       ┌──────────────┐
                       │   detained   │
                       │   (被拘留)   │
                       └──────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ court_outcome│
                       │  (法庭判决)  │
                       └──────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │   deported   │   │ temporary_   │   │   asylum_    │
   │   (遣返)     │   │ protected    │   │   granted    │
   └──────────────┘   │  (暂缓)      │   │  (庇护获批)  │
                      └──────────────┘   └──────────────┘
```

---

**文档版本**: v1.0  
**创建日期**: 2026-02-28  
**状态**: 已完成P0级事件设计
