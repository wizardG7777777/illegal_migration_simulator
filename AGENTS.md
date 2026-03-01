# AGENTS.md - 《去美国》文字冒险游戏

> 本文档用于指导 AI 助手理解项目结构、遵循设计规范并辅助文档撰写。

---

## 1. 项目概述

### 1.1 基本信息

| 属性 | 内容 |
|-----|------|
| **项目名称** | 《去美国》 |
| **类型** | 文字冒险 + 轻量肉鸽数值 |
| **题材** | 非法移民（虚构化处理） |
| **技术栈** | 静态网页 + 后期引入 LLM 交互 |
| **核心体验** | "梗游戏式"的短回合高情绪强度 |

### 1.2 核心设计哲学

- **《酒保行动》式叙事**：把"选择"藏进行为里，但是本游戏倾向于将世界观分散在通知和事件描述中
- **《大厂模拟器》式数值拉扯**：把现实焦虑做成数值博弈，文本层给足情绪与讽刺
- **黑色幽默 + 现实映射**：用"现金流、断联、盘查、走线"等现实术语构建可传播的金句

### 1.3 开发阶段

| 阶段 | 状态 | 说明 |
|-----|------|------|
| **阶段一** | 进行中 | 静态网页版本，三个场景的叙事架构与事件系统 |
| **阶段二** | 规划中 | 引入 LLM 交互增强叙事趣味性 |

---

## 2. 文档体系架构

```
PlanDoc/
├── Core/                    # 系统架构文档（技术实现规范）
│   ├── CharacterSystemArchitecture.md    # 角色系统架构
│   ├── EventSystemArchitecture.md        # 事件系统架构
│   ├── ItemSystemArchitecture.md         # 物品系统架构
│   ├── SceneSystemArchitecture.md        # 场景系统架构（含特朗普政策压力事件）
│   ├── SaveSystemArchitecture.md         # 存档/读档系统
│   ├── EndingSystemArchitecture.md       # 结局系统
│   └── StatisticsSystemArchitecture.md   # 统计系统
│
├── DesignDocs/              # 游戏设计文档（玩法机制）
│   ├── DesignPrinciples.md               # 核心设计原则（顶层约束）
│   ├── Character/           # 角色模板与属性定义
│   ├── Events/              # 事件机制设计
│   │   ├── EventPool.md              # 事件总库索引
│   │   ├── Events_Act1_Prep.md       # 场景1：国内准备
│   │   ├── Events_Act2_Crossing.md   # 场景2：跨境穿越
│   │   ├── Events_Act3_USA.md        # 场景3：美国生存
│   │   └── Events_Random.md          # 通用随机事件
│   ├── Items/               # 物品设计
│   │   ├── Consumables.md           # 消耗型道具
│   │   └── Permanents.md            # 常驻型道具
│   ├── World/               # 场景与世界设定
│   └── Systems/             # 玩法机制说明
│       ├── TerminalStates.md        # 终结态机制
│       ├── ItemSlotSystem.md        # 物品槽位系统
│       ├── EconomySystem.md         # 经济系统
│       ├── TurnFlow.md              # 回合流程
│       ├── SceneTransition.md       # 场景切换机制
│       ├── UISystem.md              # UI/UX设计
│       └── NarrativeSystem.md       # 叙事系统
│
├── NarrativeDocs/           # 叙事文档（待建设）
│   ├── StoryOutline/        # 整体剧情大纲
│   ├── CharacterStories/    # 角色背景故事
│   ├── Dialogues/           # 对话文本库
│   └── Lore/                # 碎片化信息内容
│
├── ProjectDocs/             # 项目文档（待建设）
│   └── [开发排期、任务分配等]
│
└── TechDocs/                # 技术实现文档
    └── CloudDeploy.md       # 部署方案
```

### 2.1 文档撰写原则

- **Core/**：面向开发者，包含 TypeScript 接口定义、数据结构和算法逻辑
- **DesignDocs/**：面向设计师，包含事件机制、数值平衡、槽位配置
- **NarrativeDocs/**：面向文案，包含故事线、角色弧光、对话文本（待建设）
- **ProjectDocs/**：面向项目管理（待建设）

---

## 3. 核心系统规范

### 3.1 角色系统

#### 属性（长期能力，0-20）

| 属性 | 英文 | 主要作用 |
|-----|------|---------|
| 体魄 | `physique` | 高强度行动、极端环境、濒死窗口计算 |
| 智力 | `intelligence` | 信息处理、骗局识别、崩溃窗口计算 |
| 英语技能 | `english` | 正规渠道沟通、选项解锁、失败代价降级 |
| 社交 | `social` | 随机事件概率、信息获取、人脉分支 |
| 风险意识 | `riskAwareness` | 后果揭示、避坑、暴死事件降级 |
| 生存能力 | `survival` | 极端环境存活、灰区操作、保命路径 |

#### 资源（短期消耗，可波动）

| 资源 | 归零后果 |
|-----|---------|
| 身体健康度 | 进入【濒死】终结态 |
| 心理健康度 | 进入【崩溃】终结态 |
| 现金（人民币/美元） | 进入【匮乏】状态，每回合扣身心 |
| 行动点 | 回合结束 |
| 物资补给 | 持续扣除身心健康 |

#### 终结态机制

- **濒死**：体魄决定喘息窗口（0-3回合），每回合额外扣行动点
- **崩溃**：智力决定窗口（1-3回合），倒计时归零则游戏结束
- **匮乏**：资金归零后的软性惩罚，不会直接致死

### 3.2 事件系统

#### 事件分类

| 分类 | 触发时机 | 可重复性 | 示例 |
|-----|---------|---------|------|
| `RANDOM` | 回合开始自动触发 | 有冷却/次数限制 | 暴雨、警察临检 |
| `FIXED` | 玩家主动选择 | 可配置 | 打工、读书、购买 |
| `CHAIN` | 前置事件完成后延迟解锁 | 链内顺序，变为FIXED后玩家自主选择 | 庇护申诉I→II→III |
| `POLICY_PRESSURE` | 场景3回合开始（场景回合限制） | 通常1次 | 特朗普政策公告 |

#### 物品槽位系统

```typescript
// 固定事件可配置槽位
interface ItemSlot {
  id: string;           // 槽位ID
  requiredTags: string[];  // 匹配道具的标签
  isMandatory: boolean;    // 是否强制要求
  effect: SlotEffect;      // 槽位效果（减行动点/解锁选项等）
}
```

- **强制槽位**：无匹配道具时事件灰色不可点击
- **可选槽位**：无匹配时事件可执行，但效果降低
- **匹配规则**：按道具优先级（0-9）排序，默认选中优先级最高的

#### 环境压力（Debuff）

| 场景 | Debuff名称 | 效果 |
|-----|-----------|------|
| 场景1 | 【就业冰河期】 | 经济下行，打工收入下降，就业困难 |
| 场景2 | 【环境恶化】 | 每回合身体健康大幅扣除，物资损耗加快 |
| 场景3 | 【大通胀时代】 | 现金消耗递增、基础心理消耗 |

#### 场景3特有：移民执法压力（环境 Debuff）

**仅场景3存在**，通过 `POLICY_PRESSURE` 类型事件触发，产生 **pressure** 类型的环境 Debuff：

- **触发格式**："唐纳德总统宣布XXX，这下移民局的搜查力度更大了"
- **触发条件**：使用 `SCENE` 条件的 `minSceneTurn` 限制（如第3回合后才触发）
- **Debuff 类型**：`EnvironmentalDebuff`，`type: 'pressure'`
- **强度等级**：1-5（替代原有的 0-100 压力值）
- **持续时间**：固定回合数，随时间自然衰减

**强度等级效果**：
| 强度 | 状态 | 突击检查 | 打工难度 | 心理/回合 | 其他 |
|-----|------|---------|---------|----------|-----|
| 1 | 轻微关注 | +5% | +5 | -1 | 无 |
| 2 | 搜捕升级 | +15% | +10 | -2 | 无 |
| 3 | 风声鹤唳 | +20% | +15 | -3 | 现金+10% |
| 4 | 全城搜捕 | +30% | +20 | -4 | 现金+20%，庇护暂停 |
| 5 | 红色警戒 | +50% | +30 | -6 | 现金+30%，无法打工 |

**Debuff 叠加规则**：
- 多个压力 Debuff 效果**累加**（如强度2+强度3=检查+35%）
- UI 保留多个 Debuff 显示，玩家清楚看到压力来源
- 同 ID Debuff 叠加时取最大强度并延长持续时间

#### 场景3特有：通货膨胀（经济型 Debuff）

通过 `RANDOM` 类型事件触发，产生 `economic` 类型 Debuff，**分项影响生活成本**：

- **Debuff 类型**：`EnvironmentalDebuff`，`type: 'economic'`，`subtype: 'usd_inflation'`
- **影响范围**：食品、住宿、出行三项生活成本
- **计算方式**：每月生活成本 = 基础成本 × 分项通胀率
- **展示方式**：Debuff 图标显示统一图标，悬停显示三项分项详情

**示例**：油价危机事件
```
┌─────────────────────────────────────────┐
│ 📈 出行成本飙升（经济型 Debuff）        │
├─────────────────────────────────────────┤
│ 对生活成本的影响：                      │
│ 🍞 食品    × 1.00 = 正常               │
│ 🏠 住宿    × 1.00 = 正常               │
│ 🚗 出行    × 1.40 = +40% ⚠️            │
├─────────────────────────────────────────┤
│ 来源：油价暴涨，加满一箱油多花$50       │
└─────────────────────────────────────────┘
```

**道具与生活成本的关系**：

| 道具类型 | 示例 | 基础成本 | 无道具惩罚 |
|---------|------|---------|-----------|
| 住宿 | 收容所床位 | $0 | 获得【露宿街头】Debuff |
| 住宿 | 合租房间 | $600 | - |
| 住宿 | 公寓 | $1,200 | - |
| 住宿 | House | $2,500 | - |
| 出行 | 公交卡 | $100 | 只能找附近工作 |
| 出行 | 电动车 | $50 | - |
| 出行 | 二手车 | $350 | - |
| 出行 | 特斯拉 | $600 | Uber升级选项 |

**通胀可逆性**：
- 经济型 Debuff 不会随时间自动衰减（duration = -1 表示永久）
- 需要通过特定事件降低（如"政府价格管制"事件可降低分项通胀率）
- 或寻找降低生活成本的道具（如从公寓搬到合租）

### 3.3 物品系统

#### 分类

| 分类 | 特性 | 使用方式 |
|-----|------|---------|
| `CONSUMABLE` | 一次性使用，可堆叠 | 直接使用或通过事件使用 |
| `PERMANENT` | 长期持有，被动生效 | 通过事件槽位匹配使用 |
| `BOOK` | 特殊消耗型 | 通过读书事件使用 |

#### 属性标签（用于槽位匹配）

```
transport    - 交通工具
weapon       - 武器
medical      - 医疗物品
book         - 书籍类
identity     - 身份凭证
lodging      - 住宿场所
tool         - 工具类
contact      - 人脉/联系人
document     - 文件/证件
membership   - 会员资格
```

---

## 4. 三幕结构

### 4.1 场景1：国内准备（Act1 - Prep）

- **关键词**：打工攒钱、与过去告别、能力提升、寻找出路
- **货币**：人民币（可兑换美元）
- **核心玩法**：资源积累、属性提升、准备离境
- **时间限制**：约50回合（软限制），预期25回合
- **特殊机制**：
  - 部分随机事件可直接跳至场景3（签证路径）
  - **"放弃"结局**：场景1停留30+回合后触发特殊事件，可选择放弃前往美国的幻想，留在国内
  - **死亡复用**：场景1本身不会导致死亡，若死亡则复用场景3死亡结局文案

### 4.2 场景2：跨境穿越（Act2 - Crossing）

- **关键词**：极端环境、迷路与分歧、同伴变量、武装抢劫、风险意识
- **货币**：美元
- **核心玩法**：生存挑战、路线选择、同伴管理
- **高风险**：死亡概率最高的场景
- **单向流动**：**只能前进，无退路**，无法返回场景1
- **死亡类型**：随机环境致命事件（摔下山崖、鳄鱼袭击、迷路等）
- **场景过渡死亡**：场景2→3穿越失败有特定死亡描述（倒在沙漠、摔下边境墙等）

### 4.3 场景3：美国生存（Act3 - USA）

- **关键词**：现金流断裂、盘查恐惧、关系网搭建、长期压力与崩溃
- **货币**：美元
- **核心玩法**：身份获取、长期生存、多结局触发
- **通关条件**：获得绿卡（多种途径：庇护、人才、投资等）
- **没有退路**：一旦进入了场景3，就没有办法返回之前的场景，只能在场景3中停留直到通关或死亡
- **结构性压迫**：与场景2的"随机致命"不同，场景3是慢性消耗（现金流恶性循环）
- **特有机制**：
  - **移民执法压力**：通过特朗普政策事件触发，产生 `pressure` 类型 Debuff
  - **生活成本系统（道具驱动）**：
    - 每月固定扣除生活费（食品+住宿+出行）
    - **食品**：固定成本（人活着就要吃饭）
    - **住宿**：由 `lodging` 标签道具决定（收容所/合租/公寓/House）
    - **出行**：由 `transport` 标签道具决定（公交/电动车/二手车/特斯拉）
    - **通胀影响**：`economic` 类型 Debuff 可分项影响三类成本
  - **Debuff 衰减**：持续时间归零后自动消失，新政策可添加新的 Debuff
  - **入狱即终局**：一旦入狱则无保释、无大赦，狱中终老或长期拘留

---

## 5. 文案风格指南

### 5.1 叙事语气

- **基调**：冷静克制的旁观者视角，带黑色幽默
- **视角**：以第三人称为主，以主角的名字代替"你"
- **人称**：避免直接说教，让事件本身说话

### 5.2 事件描述格式

```markdown
### 事件名称 (ID: `event_id`)

**你看到了什么**（场景描写，50-100字）

**可选行动**：
1. **选项A**（条件：属性≥X）→ 结果描述 + 数值变化
2. **选项B** → 结果描述 + 数值变化
3. **选项C**（需道具：xxx）→ 结果描述 + 数值变化
```

### 5.3 数值表达规范

- **在非主要部分显示数字**：主要部分显示“感觉好多了”这样的文字描述，而在非主要部分显示“心理健康度+5”这样的数值变化
- **保留数值反馈的方向/幅度**：用“略微/明显/大幅”+感受描写（如发冷、心慌、松一口气）暗示变化趋势，避免用表情符号作为主要信息载体
- **例外**：结算界面可以显示具体数值

### 5.4 梗与金句原则

- **来源**：推特/现实中的电子宠物事迹、论坛黑话
- **呈现**：藏在事件描述或选项文本中，不直接解释
- **传播性**：单句可截图，有共鸣感

---

## 6. LLM 集成规划

### 6.1 接入时机

- **当前阶段**：不引入 LLM，优先完成静态叙事架构
- **未来接入点**：三个场景主轴完成后，用于增强：
  - NPC 对话的多样性
  - 玩家自定义角色背景的解析
  - 结局文本的个性化生成

### 6.2 技术方案（已定）

- **前端**：OSS 静态网站托管
- **后端**：阿里云函数计算（FC）提供 `POST /api/chat`
- **模型**：SiliconFlow API（通过 FC 代理，密钥不下发浏览器）
- **约束**：最多 5 轮对话，强制 max_tokens 上限

---

## 7. 辅助文档撰写指南

### 7.1 撰写新事件时

#### 7.1.1 前置检查清单

1. **对照 DesignPrinciples.md**：确保符合核心设计约束（场景特性、结局规则等）
2. **在 EventPool.md 中登记**：更新索引表格
3. **检查平衡性**：与现有事件对比数值
4. **确保 ID 唯一**：使用 `场景_类型_描述` 格式

#### 7.1.2 事件基础字段（所有事件必需）

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `id` | string | 全局唯一标识 | `act1_work_supermarket` |
| `category` | Enum | 事件类型：`RANDOM`/`FIXED`/`CHAIN`/`POLICY_PRESSURE` | `FIXED` |
| `name` | string | 事件显示名称 | 超市理货员 |
| `description` | string | 事件描述文本（50-100字，冷静旁观者视角） | 张浩看到超市门口贴着招聘启事... |
| `scenes` | string[] | 可触发场景列表 | `['act1']` |

#### 7.1.3 随机事件（RANDOM）特有字段

| 字段 | 类型 | 必需 | 说明 | 示例 |
|-----|------|------|------|------|
| `trigger.weight` | number | ✅ | 触发权重（相对概率） | `10` |
| `trigger.cooldown` | number | ❌ | 触发后冷却回合数 | `3` |
| `trigger.maxTriggers` | number | ❌ | 最大触发次数（整局游戏） | `5` |
| `trigger.conditions` | Condition[] | ❌ | 触发条件数组 | 见下方条件格式 |

**场景回合条件格式**：
```yaml
conditions:
  - type: SCENE
    value: act3
    minSceneTurn: 3    # 场景3第3回合后才触发
    maxSceneTurn: 20   # 超过20回合不再触发（可选）
```

#### 7.1.4 固定事件（FIXED）特有字段

| 字段 | 类型 | 必需 | 说明 | 示例 |
|-----|------|------|------|------|
| `execution.repeatable` | boolean | ✅ | 是否可重复执行 | `true` |
| `execution.maxExecutions` | number | ❌ | 最大执行次数 | `10` |
| `execution.actionPointCost` | number | ✅ | 基础行动点消耗 | `2` |
| `execution.moneyCost` | number | ❌ | 金钱消耗 | `50` |
| `execution.moneyCurrency` | string | ❌ | 货币类型：`CNY`/`USD` | `CNY` |
| `slots` | ItemSlot[] | ❌ | 物品槽位配置 | 见下方槽位格式 |

**槽位配置格式**：
```yaml
slots:
  - id: transport        # 槽位ID
    name: 交通工具       # 槽位显示名称
    tags: [transport]    # 匹配道具的标签
    required: false      # 是否强制要求
    description: 选择交通工具可提高移动效率
```

#### 7.1.5 链式事件（CHAIN）特有字段

链式事件用于实现多步骤任务流程。完成链中的当前事件后，经过指定延迟，下一个事件以 `FIXED` 类型解锁，玩家可自主选择何时执行。

| 字段 | 类型 | 必需 | 说明 | 示例 |
|-----|------|------|------|------|
| `chain.chainId` | string | ✅ | 链的唯一标识 | `chain_asylum_application` |
| `chain.stepIndex` | number | ✅ | 当前事件在链中的步骤索引 | `0` 表示第一步 |
| `chain.nextEventId` | string | ✅ | 下一步要解锁的事件ID | `act3_asylum_step2` |
| `chain.unlockDelay` | number | ❌ | 解锁延迟回合数（默认0） | `3` 表示3回合后解锁 |

**链式事件工作原理**：
```
玩家执行链事件A（step 0）
    ↓
系统记录到 activeChains：
  - unlockEventId: 事件B
  - unlockDelay: 3
  - unlockTurn: 当前回合 + 3
    ↓
每回合开始检查 unlockTurn
    ↓
到达指定回合：事件B以FIXED类型出现在可选列表
    ↓
玩家自主选择执行事件B的时机（或选择不执行）
```

**完整示例**：
```yaml
id: act3_asylum_step1
category: CHAIN
name: 提交庇护申请
chain:
  chainId: asylum_application
  stepIndex: 0
  nextEventId: act3_asylum_step2
  unlockDelay: 5          # 5回合后解锁下一步
effect:
  - type: MODIFY_RESOURCE
    resource: mentalHealth
    value: -5
    description: "提交申请的紧张感"

---

id: act3_asylum_step2
category: FIXED          # 解锁后变为FIXED类型
name: 补交材料通知
trigger:
  condition: CHAIN_UNLOCKED
  chainId: asylum_application
  stepIndex: 1
```

#### 7.1.6 事件选项（Choices）字段

每个选项需要定义：

| 字段 | 类型 | 必需 | 说明 | 示例 |
|-----|------|------|------|------|
| `id` | string | ✅ | 选项ID | `option_work_hard` |
| `name` | string | ✅ | 选项显示文本 | 拼命干活 |
| `condition` | Condition | ❌ | 可用条件（属性/道具/状态） | `physique >= 12` |
| `effect` | Effect | ✅ | 选项效果 | 见下方效果格式 |

**选项效果格式**：
```yaml
effect:
  # 资源变化（用文案包装，不直接显示数字）
  description: 你感到腰酸背痛，但钱包鼓了一些
  
  # 实际数值变化（后台计算用）
  health: -3           # 身体健康度
  mental: -2           # 心理健康度
  money: 150           # 现金变化（正数增加）
  moneyCurrency: CNY   # 货币类型
  actionPoints: -2     # 行动点消耗
  
  # 属性变化（可选）
  attributes:
    physique: 0.1      # 体魄小幅提升（0.1为微量）
  
  # 获得/失去道具（可选）
  items:
    add: [{id: consumable_bread, count: 1}]
    remove: []
  
  # 触发特殊结果（可选）
  special:
    gameOver: false
    endingId: null
    sceneTransition: null
```

#### 7.1.7 政策压力事件（POLICY_PRESSURE）特有字段（仅场景3）

| 字段 | 类型 | 必需 | 说明 | 示例 |
|-----|------|------|------|------|
| `trigger.minSceneTurn` | number | ✅ | 最早触发回合 | `3` |
| `content.announcement` | string | ✅ | 特朗普公告原文 | 唐纳德总统宣布... |
| `content.displayText` | string | ✅ | 游戏内显示文本 | 移民局的搜查力度更大了 |
| `debuff.id` | string | ✅ | Debuff唯一ID | `debuff_policy_001` |
| `debuff.name` | string | ✅ | Debuff显示名称 | 移民搜捕升级 |
| `debuff.type` | string | ✅ | 固定为 `pressure` | `pressure` |
| `debuff.intensity` | number | ✅ | 强度等级 1-5 | `2` |
| `debuff.duration` | number | ✅ | 持续回合数 | `10` |
| `debuff.effects` | object | ✅ | 具体效果配置 | 见下方 |

**pressure Debuff效果字段**：
```yaml
effects:
  raidChanceIncrease: 0.15      # 突击检查概率 +15%
  workDifficultyIncrease: 10    # 打工难度 +10
  mentalDamagePerTurn: 2        # 每回合心理伤害 -2
  cashCostMultiplier: 1.0       # 现金消耗倍率（1.0=无额外影响）
```

#### 7.1.7 事件触发条件（Condition）类型汇总

```yaml
# 场景条件
type: SCENE
value: act3
minSceneTurn: 3
maxSceneTurn: 20

# 属性条件
type: ATTRIBUTE
attribute: physique      # 或 intelligence/english/social/riskAwareness/survival
operator: ">="          # 支持: >, <, >=, <=, ==
value: 12

# 道具条件
type: ITEM
itemId: perm_backpack   # 特定道具ID（可选）
tag: transport          # 道具标签（可选）
count: 1                # 数量要求（默认1）

# 状态标记条件
type: FLAG
flag: has_met_guide     # 状态标记名
value: true             # 是否存在该标记
```

---

### 7.2 撰写新道具时

#### 7.2.1 前置检查清单

1. **选择正确分类**：Consumable / Permanent / Book
2. **确定使用方式**：直接使用（self）/ 通过事件使用（event）
3. **在物品清单中登记**：更新对应分类文件

#### 7.2.2 消耗型道具（CONSUMABLE）字段

**基础字段（所有消耗型共有）**：

| 字段 | 类型 | 必需 | 说明 | 示例 |
|-----|------|------|------|------|
| `id` | string | ✅ | 唯一标识符 | `consumable_painkiller` |
| `name` | string | ✅ | 显示名称 | 止痛药 |
| `description` | string | ✅ | 道具描述 | 可以缓解轻度疼痛... |
| `category` | string | ✅ | 固定为 `CONSUMABLE` | `CONSUMABLE` |
| `subCategory` | string | ✅ | 细分品类：`medical`/`food`/`book`/`other` | `medical` |
| `maxStack` | number | ✅ | 最大堆叠数量 | `10` |
| `useTarget` | string | ✅ | 使用方式：`self`直接点击使用 / `event`通过事件使用 | `self` |
| `tags` | string[] | ❌ | 属性标签（书籍必须有`book`） | `[medical]` |
| `priority` | number | ❌ | 优先级 0-9（用于事件槽位匹配） | `5` |

**使用效果字段（effects）**：

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `healthRestore` | number | 回复身体健康度 | `15` |
| `mentalRestore` | number | 回复心理健康度 | `5` |
| `actionPointRestore` | number | 回复行动点 | `0` |
| `attributeBonus` | object | 一次性属性加成 | `{physique: 1}` |
| `grantItems` | array | 使用后获得其他道具 | `[{itemId: x, count: 1}]` |

**可选字段（useCost）**：

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `useCost.actionPoint` | number | 使用消耗行动点 | `1` |
| `useCost.money` | number | 使用消耗金钱 | `50` |

**完整示例**：
```yaml
id: consumable_painkiller
name: 止痛药
description: 白色小药片，可以缓解轻度疼痛
category: CONSUMABLE
subCategory: medical
maxStack: 10
useTarget: self
tags: [medical]
priority: 5

effects:
  healthRestore: 15
  mentalRestore: 0
  actionPointRestore: 0

useCost:
  actionPoint: 0
  money: 0
```

#### 标准消耗品：食物补给

**物品ID**: `consumable_food_supply`

**基础字段**：
```yaml
id: consumable_food_supply
name: 食物补给
description: 维持生命的基本物资，面包、罐头、压缩饼干的统称。可以缓解饥饿并略微恢复身体健康。
category: CONSUMABLE
subCategory: food
maxStack: 10
useTarget: self
tags: [food]
priority: 5

effects:
  healthRestore: 5      # 回复5点身体健康度
  mentalRestore: 0
  actionPointRestore: 0

useCost:
  actionPoint: 0
  money: 0
```

**设计说明**：
- 所有场景中的消耗品统一为"食物补给"
- 不再区分水、饼干、止痛药等不同物品
- 获取途径：购买、事件奖励、起始包
- 回复量固定为5点健康值（可通过事件效果调整）

#### 7.2.3 常驻型道具（PERMANENT）字段

**基础字段**：

| 字段 | 类型 | 必需 | 说明 | 示例 |
|-----|------|------|------|------|
| `id` | string | ✅ | 唯一标识符 | `perm_backpack` |
| `name` | string | ✅ | 显示名称 | 登山背包 |
| `description` | string | ✅ | 道具描述 | 容量大，适合长途跋涉 |
| `category` | string | ✅ | 固定为 `PERMANENT` | `PERMANENT` |
| `tags` | string[] | ✅ | 属性标签列表（核心匹配字段） | `[tool, survival_gear]` |
| `priority` | number | ✅ | 优先级 0-9，**数字越小越优先** | `3` |
| `canBeDeleted` | boolean | ✅ | 是否可被随机事件删除 | `false` |

**槽位效果字段（slotEffects）** - 被事件匹配时生效：

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `actionPointCostModifier` | number | 行动点消耗调整（如`-1`表示省1点） | `-1` |
| `moneyMultiplier` | number | 金钱收益倍率（如`1.3`表示+30%） | `1.0` |
| `moneyBaseModifier` | number | 金钱基础值调整（如`+50`） | `0` |
| `checkBonus` | object | 属性检定加成 | `{survival: 2}` |
| `successRateModifier` | number | 成功率调整（0-1） | `0.1` |
| `unlockOptions` | string[] | 解锁的选项ID列表 | `[option_shortcut]` |

**被动效果字段（passiveEffects）** - 始终生效（可选）：

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `perTurn.healthRestore` | number | 每回合自动回复健康 | `0` |
| `perTurn.mentalRestore` | number | 每回合自动回复心理 | `1` |
| `perTurn.moneyChange` | number | 每回合自动金钱变化（负数为消耗） | `-50` |
| `resistance` | array | 事件抗性（降低某类事件影响） | `[{eventType: weather, reductionPercent: 0.3}]` |

**维护成本字段（upkeepCost）** - 每回合固定消耗（可选）：

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `moneyPerTurn` | number | 每回合金钱消耗 | `50` |
| `actionPointPerTurn` | number | 每回合行动点消耗 | `0` |

**完整示例**：
```yaml
id: perm_ebike
name: 二手电动车
description: 充满电能跑40公里，送外卖的好帮手
category: PERMANENT
tags: [transport]
priority: 3
canBeDeleted: true

# 槽位效果（配合相关事件时生效）
slotEffects:
  actionPointCostModifier: -1
  moneyMultiplier: 1.2
  checkBonus:
    physique: 1

# 被动效果（始终生效）
passiveEffects:
  perTurn:
    mentalRestore: 0.5    # 送外卖的自由感让心情略好

# 维护成本（每回合）
upkeepCost:
  moneyPerTurn: 5         # 充电费用
```

#### 7.2.4 书籍类道具（BOOK）字段

书籍是消耗型的特殊子类，**全局唯一**（整局游戏固定数量）：

| 字段 | 类型 | 必需 | 说明 | 示例 |
|-----|------|------|------|------|
| `id` | string | ✅ | 唯一标识符 | `book_english_basic` |
| `name` | string | ✅ | 显示名称 | 《英语900句》 |
| `description` | string | ✅ | 道具描述 | 封面泛黄，内页有前任主人的笔记 |
| `category` | string | ✅ | 固定为 `CONSUMABLE` | `CONSUMABLE` |
| `subCategory` | string | ✅ | 固定为 `book` | `book` |
| `bookId` | string | ✅ | 书籍唯一ID（全局书籍池用） | `book_001` |
| `rarity` | string | ✅ | 稀有度：`COMMON`/`RARE`/`EPIC` | `COMMON` |
| `maxStack` | number | ✅ | 通常为1 | `1` |
| `useTarget` | string | ✅ | 固定为 `event`（通过读书事件使用） | `event` |
| `tags` | string[] | ✅ | 必须包含 `book` | `[book, english]` |
| `priority` | number | ✅ | 用于读书事件槽位匹配 | `5` |

**书籍效果示例**：
```yaml
id: book_english_basic
name: 《英语900句》
description: 封面泛黄，内页有前任主人的笔记
category: CONSUMABLE
subCategory: book
bookId: book_001
rarity: COMMON
maxStack: 1
useTarget: event
tags: [book, english]
priority: 5

effects:
  # 阅读后属性提升
  attributeBonus:
    english: 1          # 英语技能+1
  mentalRestore: 3      # 学到知识的满足感
```

#### 7.2.5 标准道具标签（tags）参考

| 标签 | 用途 | 典型道具 |
|-----|------|---------|
| `transport` | 交通工具事件 | 电动车、二手车、公交卡 |
| `lodging` | 住宿场所（场景3生活成本） | 合租房间、公寓 |
| `medical` | 医疗事件 | 止痛药、绷带、抗生素 |
| `food` | 食物补给（统一消耗品） | 食物补给 |
| `book` | 读书事件（书籍必须有） | 《英语900句》 |
| `tool` | 工具类事件 | 扳手、螺丝刀 |
| `weapon` | 战斗/防御事件 | 匕首、辣椒喷雾 |
| `identity` | 身份验证事件 | 假护照、工卡 |
| `document` | 文件/签证事件 | 银行流水、行程单 |
| `contact` | 人脉关系事件 | 蛇头联系方式、律师名片 |
| `guide` | 向导服务 | 雨林向导 |
| `cross_scene` | 跨场景保留标记 | 重要证件 |

#### 7.2.6 道具优先级（priority）设置指南

优先级范围 0-9，**数字越小优先级越高**，用于事件槽位自动匹配时选择默认道具：

| 优先级 | 适用情况 | 示例 |
|-------|---------|------|
| 0-1 | 任务关键道具、高品质道具 | 特斯拉（vs 二手车） |
| 2-3 | 常用优质道具 | 公寓（vs 合租） |
| 4-5 | 普通道具 | 电动车、超市购物袋 |
| 5 | 普通消耗品 | 食物补给 |
| 6-7 | 临时/劣质道具 | 收容所床位 |
| 8-9 | 消耗品、备选道具 | 一次性雨衣 |

**规则**：当多个道具匹配同一槽位时，自动选中优先级最高的（数字最小的）。

### 7.3 修改系统架构时

1. **同步更新 Core/**：保持架构文档最新
2. **检查 DesignDocs/**：确保设计文档与架构一致
3. **评估影响范围**：事件、物品、角色是否都需要调整

---

## 8. 开发工具使用指南

> **注意**：本章节的工具仅在开发模式下可用，详情见 `ARCHITECTURE.md` 第7章。

### 8.1 Web 仪表盘（Dev Dashboard）

开发仪表盘是辅助事件设计和数值平衡的可视化工具，**不应在生产环境中使用**。

#### 8.1.1 访问方式

```
开发服务器: http://localhost:5173/__devtools/dashboard
游戏内快捷键: 按 `~` 键调出 DevTools 悬浮窗
```

#### 8.1.2 使用场景

| 开发阶段 | 推荐工具 | 解决的问题 |
|---------|---------|-----------|
| **设计事件链** | 事件图谱 | 验证事件链完整性，发现断链或循环依赖 |
| **数值调整** | 数值平衡面板 | 对比同类事件收益，确保性价比合理 |
| **测试边界** | 事件沙盒 | 模拟极端状态，测试事件是否会导致意外死亡 |
| **查找参考** | 事件索引 | 按标签/场景筛选，避免设计重复事件 |

#### 8.1.3 开发规范

**使用事件图谱检查事件链时**：
```
1. 搜索新设计的事件ID
2. 检查上游事件是否正确设置 unlockEventId
3. 检查下游事件是否有正确的触发条件
4. 确保没有循环依赖（A→B→C→A）
```

**使用数值平衡面板时**：
```
1. 关注被标记为 ⚠️ 的异常值事件
2. 确保同类打工事件的 收入/AP 差异不超过30%
3. 高风险工作（健康消耗大）应有明显更高的收益
4. 对比场景1/2/3的收入增长曲线是否合理
```

**使用事件沙盒测试时**：
```
1. 使用"濒死状态"预设测试事件
2. 检查事件效果是否会导致立即死亡
3. 验证文案是否正确显示（没有 {{variable}} 未替换）
4. 测试选项条件是否正确生效（如 physique >= 12）
```

#### 8.1.4 开发流程集成

推荐的工作流程：
```
1. 在 JSON 中编写/修改事件
2. 保存文件，开发服务器自动热重载
3. 打开仪表盘 → 事件图谱，验证事件链
4. 打开仪表盘 → 事件沙盒，测试具体效果
5. 如有数值调整，使用数值平衡面板对比
6. 一切正常后提交代码
```

### 8.2 JSON Schema 验证

项目已配置 JSON Schema 用于实时验证，编辑事件文件时请确保：

- 使用 VS Code 打开项目（已配置 `.vscode/settings.json`）
- 保存文件时自动验证
- 错误会显示在问题面板（Ctrl+Shift+M）

常见验证错误：
| 错误 | 原因 | 修复方法 |
|-----|------|---------|
| `id` 包含非法字符 | 使用了中文或空格 | 使用小写字母、数字、下划线 |
| `trigger.condition` 无效 | 使用了未定义的触发类型 | 检查是否是 RANDOM/FIXED/CHAIN/POLICY_PRESSURE |
| `effect.money` 类型错误 | 写了字符串而非数字 | 去掉引号，如 `"money": 100` → `"money": 100` |
| 必填字段缺失 | 漏写了必需字段 | 根据 schema 补全 |

### 8.3 开发者控制台（Dev Console）

轻量级命令行工具，用于快速修改状态和触发事件。与仪表盘互补，适合需要速度而非可视化的场景。

#### 8.3.1 访问方式

```
游戏内按 `~` 键 → 切换到"控制台"标签
或直接访问: http://localhost:5173/__devtools/console
```

#### 8.3.2 常用指令速查表

| 指令 | 功能 | 示例 |
|-----|------|------|
| `/set` | 修改资源/属性 | `/set money 1000`, `/set health +20` |
| `/scene` | 切换场景 | `/scene act3` |
| `/event` | 触发事件 | `/event act3_underground_loan` |
| `/give` | 添加道具 | `/give food_supply 5` |
| `/remove` | 移除道具 | `/remove perm_vehicle_ebike` |
| `/debt` | 管理债务 | `/debt add 500 0.3 10` |
| `/flag` | 设置标记 | `/flag set gap_discovered` |
| `/save` | 保存检查点 | `/save before_test` |
| `/load` | 加载检查点 | `/load before_test` |
| `/status` | 查看状态 | `/status --full` |
| `/help` | 查看帮助 | `/help set` |

#### 8.3.3 典型使用场景

**场景1：快速测试濒死状态**
```
> /save normal_state
> /set health 5
> /set mental 5
> /event rand3_terminal_warning
[观察终结态事件触发]
> /load normal_state  [恢复测试前状态]
```

**场景2：测试事件链完整性**
```
> /flag set insight_triggered
> /flag set visa_materials_ready
> /event act1_visa_interview
[验证签证事件是否能正常触发]
```

**场景3：快速对比不同配置的收益**
```
> /save base_state
> /scene act3
> /event act3_work_dishwasher
[记录收益]
> /load base_state
> /event act3_work_delivery
[对比收益差异]
```

**场景4：模拟高债务压力**
```
> /debt add 2000 0.5 10  [添加高利率债务]
> /set money 100         [现金不足]
> /status
[观察月度结算时的违约情况]
```

#### 8.3.4 控制台 vs 仪表盘选择指南

| 你的需求 | 推荐工具 | 原因 |
|---------|---------|------|
| "我想快速把钱调到1000测试" | **控制台** | `/set money 1000` 一步完成 |
| "我想看看事件链有没有断" | **仪表盘** | 可视化图谱更直观 |
| "我想测试事件在濒死时的表现" | **控制台** | `/set health 5` 秒切状态 |
| "我想对比所有打工事件的收益" | **仪表盘** | 表格对比更清晰 |
| "我想触发特定事件看看文案" | **控制台** | `/event` 直达，无需找入口 |
| "我想检查数值是否平衡" | **仪表盘** | 异常值高亮功能 |

#### 8.3.5 效率技巧

**使用历史指令**：
- 按 `↑` 键快速调用上一条指令
- 连续按 `↑` 浏览历史记录

**使用自动补全**：
- 输入 `/set m` 后按 `Tab` 自动补全为 `/set money`
- 输入 `/scene a` 后按 `Tab` 循环补全 `act1` `act2` `act3`

**使用检查点管理测试状态**：
```
> /save initial        # 保存初始状态
[进行一系列测试后]
> /load initial        # 秒回初始状态，无需重启游戏
```

**批量指令**：
```
> /set money 0; /set health 10; /set mental 10
[用分号分隔，一次执行多条]
```

---

## 9. 常见陷阱提醒

### ❌ 避免

1. **直接呈现数值**：不要把"心理健康度-5"直接给玩家看
2. **无限循环事件**：确保事件有合理的冷却或次数限制
3. **过早优化 LLM**：先完成静态版本，再考虑 AI 增强
4. **文档与代码脱节**：修改设计时同步更新文档
5. **违反设计约束**：如给场景3添加"转往加拿大"结局，或给入狱添加保释机制

### ✅ 推荐

1. **用文案包装数值**："你感到一阵眩晕"比"HP-10"更好
2. **保持事件多样性**：每个场景应有打工/提升/随机/链式事件
3. **预留扩展空间**：事件 ID、道具标签设计要有余量
4. **版本化重要决策**：重大机制变更保留决策记录

---

## 9. 快速参考

### 9.1 文件命名规范

```
事件文件：Events_Act{N}_{描述}.md
系统文件：{系统名}SystemArchitecture.md
道具文件：{分类}s.md  (Consumables.md, Permanents.md)
```

### 9.2 ID 命名规范

```
事件：act{N}_{类型}_{描述}      例：act1_work_supermarket
随机：rand{N}_{描述}            例：rand2_storm
政策：act{N}_policy_{编号}      例：act3_policy_001（场景3特朗普政策）
道具：{分类}_{描述}             例：consumable_painkiller, perm_backpack
```

### 9.3 关键数值范围

```
属性：0-20（10为普通人水平）
资源：0-100（可临时超出，但会衰减）
行动点：每回合 3-5 点
道具优先级：0-9（0最高）
终结窗口：0-3 回合
环境 Debuff 强度：1-5（1=轻微，5=极端）
场景回合限制：minSceneTurn / maxSceneTurn（用于控制事件触发时机）
```

**场景回合预期**：
```
场景1：约25回合（50回合上限，30回合触发"放弃"结局）
场景2：5-15回合
场景3：60+回合
```

**核心设计约束**：
```
- 场景1很难死亡，死亡复用场景3文案
- 场景2只能前进，无退路
- 场景3结局：获得绿卡（通关）或长期黑户生存
- 入狱即终局：无保释、无大赦
```

**场景3生活成本基准值（美元/月）**：
```
食品固定：$400（不受道具影响）
住宿道具：
  - 收容所床位：$0（但有debuff）
  - 合租房间：$600
  - 公寓：$1,200
  - House：$2,500
出行道具：
  - 公交卡：$100
  - 电动车：$50
  - 二手车：$350
  - 特斯拉：$600
```

**通胀率**：
```
基础值：1.0（无通胀）
正常范围：1.0 - 2.0（+0% 到 +100%）
严重通胀：2.0 - 3.0（+100% 到 +200%）
恶性通胀：>3.0（生存危机）
```

---

## 10. 相关资源

- **1页草案**：`/1page_draft.md` - 项目最初的概念文档
- **核心设计原则**：`/PlanDoc/DesignDocs/DesignPrinciples.md` - 设计约束与哲学（必读）
- **事件总库**：`/PlanDoc/DesignDocs/Events/EventPool.md` - 所有事件的索引
- **部署方案**：`/PlanDoc/TechDocs/CloudDeploy.md` - 技术架构详情

---

> **维护提示**：本文档随项目演进更新。重大变更请同步修改本文件。
