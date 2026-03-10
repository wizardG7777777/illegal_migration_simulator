# 事件总库索引

本文档汇总所有游戏事件，提供快速检索和状态概览。

---

## 文档结构

```
PlanDoc/DesignDocs/Events/
├── EventPool.md              # 本文档：事件总览和索引
├── Events_Act1_Prep.md       # 场景1事件：国内准备
├── Events_Act2_Crossing.md   # 场景2事件：跨境穿越
├── Events_Act3_USA.md        # 场景3事件：美国生存
├── Events_Act3_Shopping.md   # 场景3购物App事件
├── Events_Random.md          # 通用随机事件
├── Events_RaidPressure.md    # 非法移民搜查压力事件（增加全局压力）
├── Events_GreenCard_Paths.md # 绿卡路径事件（三条通关路径）
├── Events_Terminal.md        # 终结态事件
├── Events_Milestones.md      # 里程碑/关键转折点
├── Events_Todo_P0.md         # P0级别缺失事件清单（阻塞开发）⭐重要
└── Events_Todo_P1.md         # P1级别缺失事件清单（锦上添花）
```

---

## 事件统计概览

| 场景/类型 | 主动事件 | 随机事件 | 终结态事件 | 压力事件 | 事件链 | 总计 |
|----------|---------|---------|-----------|---------|--------|-----|
| 场景1 | 15 | 16 | 6 | 3 | 0 | 40 |
| 场景2 | 12 | 17 | 8 | 3 | 0 | 40 |
| 场景3 | 29 | 25 | 8 | 6 | 6 | 74 |
| 通用随机 | - | 20 | - | 6 | 0 | 26 |
| **总计** | **55** | **68** | **22** | **18** | **6** | **169** |

> **注**: 统计数据包含P0和P1事件，实际实现时可分阶段完成。

---

## 场景1事件索引（国内准备）

### 主动事件（新槽位系统）
| ID | 名称 | 类型 | 物品槽位 | 属性影响 |
|---|-----|-----|---------|---------|
| `act1_work_warehouse` | 快递分拣临时工 | 打工 | `transport`(可选) | 体魄+ |
| `act1_work_delivery` | 送外卖 | 打工 | `transport`(强制) | 资金++ |
| `act1_work_construction` | 工地高薪短包 | 打工 | 无(体魄≥8) | 体魄+, 资金++ |
| `act1_exchange_usd` | 人民币兑换美元 | 资金 | 无(回合≥10) | 现金→美元 |
| `act1_meet_snakehead` | 认识蛇头 | 社交/过渡 | 无(社交≥5+水群) | 获得道具, 解锁走线 |
| `act1_train_gym` | 健身房训练 | 提升 | `membership`(强制) | 体魄+ |
| `act1_buy_book` | 购买书籍 | 购买 | 无 | 随机获得书籍 |
| `act1_read_book` | 读书学习 | 提升 | `book`(强制) | 获得属性 |
| `act1_social_online` | 水群 | 社交/信息 | 无 | 社交+, 概率增益 |
| `act1_borrow_money` | 借钱 | 特殊 | 多渠道 | 大额资金, 心理-/债务 |
| `act1_loan_shark` | 借高利贷 | 资金/债务 | 无 | 现金+5000/+10000, 债务(场景2清零) |
| `act1_transition` | 寻找离境机会 | 过渡 | `contact`(可选) | - |
| `act1_apply_college` | 野鸡大学申请 | 过渡 | `document`(强制) | 社交+ |

**槽位说明：**
- **强制槽位**：无匹配道具时事件灰色不可点击
- **可选槽位**：无匹配时事件可执行，但效果降低
- **匹配规则**：系统按优先级(0-9)排序，默认选中优先级最高的道具，玩家可手动更换 |

### 随机事件（部分）
| ID | 名称 | 正/负 | 触发条件 |
|---|-----|------|---------|
| `act1_give_up` | 放弃幻想 | 特殊 | 场景1回合≥30，10%/回合，最多1次 |
| `rand1_blackmarket_usd` | 发现低价美元渠道 | 正面 | 社交≥5时概率增加 |
| `rand1_gym_meet` | 健身房偶遇贵人 | 正面 | 持有`gym_membership` |
| `rand1_landlord_discount` | 房东降租 | 正面 | 12%概率，场景回合≥5，冷却5回合，最多2次 |
| `rand1_rent_raise` | 房东涨租 | 负面 | 15%概率 |
| `rand1_online_scam` | 水群遇到骗子 | 负面 | 风险意识<5时概率增加 |
| `rand1_police_visit` | 警察上门调查 | 负面 | 持有`fake_diploma`时概率增加 |
| `rand1_exchange_rate_change` ⭐P1 | 汇率波动 | 中性 | 10%概率，±0.2~0.5 |
| `rand1_friend_farewell` ⭐P1 | 朋友送别 | 正面 | 回合>15，心理±5 |
| `rand1_family_conflict` ⭐P1 | 家庭冲突 | 负面 | 回合>10，心理-10 |
| `rand1_visa_lottery` ⭐P1 | 签证抽签中奖 | 特殊 | 1%概率，跳转场景3 |

---

## 场景2事件索引（跨境穿越）

### 主动事件（阶段1：雨林）

| ID | 名称 | 类型 | 说明 |
|---|-----|------|------|
| `act2_move_guide` | 向导带路 | 前进 | 每回合-$50，自动前进1步 |
| `act2_move_solo` | 独自穿越 | 前进 | 生存能力≥4判定 |

> **旧事件标记**：
> - `act2_guide_forward` → 【已重命名为 `act2_move_guide`】
> - `act2_move_alone` → 【已重命名为 `act2_move_solo`】
> - `act2_cross_guide` → 【已重命名为 `act2_cross_truck`】
> - `act2_cross_gap` → 【已重命名为 `act2_cross_desert`】

### 主动事件（阶段2：边境小镇）

| ID | 名称 | 类型 | 说明 |
|---|-----|------|------|
| `act2_town_contact_driver` | 联系货车司机 | 准备 | 花费$200获得border_guide |
| `act2_town_gather_info` | 打探消息 | 信息 | 获取边境墙情报 |
| `act2_town_buy_supplies` | 补充物资 | 购买 | 购买消耗品 |
| `act2_town_wait` | 等待时机 | 准备 | 降低穿越风险 |
| `act2_cross_truck` | 货车偷渡 | 穿越 | 需border_guide，体魄判定 |
| `act2_cross_desert` | 穿越沙漠缺口 | 穿越 | 体魄≥5，失败即死 |
| `act2_cross_climb` | 攀爬边境墙 | 穿越 | 体魄≥10，失败即死 |

### 场景过渡事件（阶段2→3）

| ID | 名称 | 类型 | 触发条件 | 结果 |
|---|-----|------|---------|------|
| `act2_transition_snakehead` | 蛇头带领穿越 | CHAIN | 持有`card_snakehead` | 进入场景3，消耗$2000 |
| `act2_transition_visa` | 签证入境 | CHAIN | 持有`fake_diploma`+录取信 | 进入场景3，身份student |

> **说明**：场景2→3的过渡事件由玩家在阶段2主动触发，根据持有的道具类型决定入境方式。

#### 场景2→3过渡道具来源

| 道具ID | 道具名称 | 获取场景 | 获取事件 | 用途 |
|-------|---------|---------|---------|------|
| `card_snakehead` | 蛇头联系方式 | 场景1 | `act1_meet_snakehead` | 解锁`act2_transition_snakehead` |
| `fake_diploma` | 野鸡大学文凭 | 场景1 | `act1_apply_college` | 解锁`act2_transition_visa` |
| `enrollment_letter` | 录取通知书 | 场景1 | `act1_apply_college` | `act2_transition_visa`必需 |

### 随机事件（阶段1：每回合强制触发其一）

| ID | 名称 | 判定属性 | 门槛 | 失败后果 |
|---|-----|---------|------|---------|
| `rand2_bandit` | 丛林劫匪 | 风险意识 | ≥5 | 死亡（death_bandit）|
| `rand2_snake` | 毒蛇猛兽 | 体魄 | ≥5 | 死亡（death_snake）|
| `rand2_fall` | 危险小径 | 风险意识 | ≥4 | 死亡（death_fall）|
| `rand2_swamp` | 沼泽陷阱 | 生存能力 | ≥5 | 死亡（death_swamp）|
| `rand2_insect` | 毒虫袭击 | 体魄 | ≥4 | 死亡（death_infection）|
| `rand2_food` | 可疑食物 | 智力 | ≥5 | 死亡（death_poison）|

**触发权重**：劫匪20%、毒蛇20%、小径20%、沼泽15%、毒虫15%、食物10%

**P1新增随机事件**：
| ID | 名称 | 触发阶段 | 触发概率 | 效果 |
|---|-----|---------|---------|------|
| `rand2_meet_migrant` ⭐P1 | 遇到其他偷渡者 | 阶段1/2 | 15% | 社交+2，可能获得情报 |
| `rand2_guide_raising_price` ⭐P1 | 向导临时涨价 | 阶段1 | 20% | 向导费$50→$80/回合 |
| `rand2_weather_storm` ⭐P1 | 恶劣天气 | 阶段1 | 15% | 本回合无法前进，健康-10 |

**阶段2随机事件**：
| ID | 名称 | 触发条件 | 效果 |
|---|-----|---------|------|
| `rand2_border_patrol` | 边境巡逻 | 穿越方式触发 | 根据方式不同判定 |
| `rand2_vehicle_search` | 车辆检查 | 货车偷渡时触发 | 智力判定，失败即被捕 |

> **废弃事件标记**：
> - `rand2_storm`（恶劣天气）→ 【已删除，新设计无此事件】
> - `rand2_disease`（瘴气/疾病）→ 【已删除，由 `rand2_insect` 替代】
> - `rand2_bandits` → 【已重命名为 `rand2_bandit`（单数形式）】
> - `rand2_wildlife` → 【已拆分为 `rand2_snake` 和独立死亡事件】
> - `rand2_dangerous_path` → 【已重命名为 `rand2_fall`】

### 死亡结局

| ID | 名称 | 触发场景 |
|---|-----|---------|
| `death_bandit` | 劫匪枪杀 | 阶段1 |
| `death_snake` | 毒蛇毒发 | 阶段1 |
| `death_fall` | 摔下山崖 | 阶段1 |
| `death_swamp` | 陷入沼泽 | 阶段1 |
| `death_infection` | 感染败血症 | 阶段1 |
| `death_poison` | 食物中毒 | 阶段1 |
| `death_desert_crossing` | 沙漠渴死 | 阶段2→3 |
| `death_wall_fall` | 坠墙身亡 | 阶段2→3 |

> **旧ID标记**：
> - `death_bandits` → 【已重命名为 `death_bandit`（单数形式）】

---

## 场景3生活成本基准值表

> **配置说明**：以下数值为基准值，实际游戏中可通过通胀Debuff进行动态调整。
> **数值来源**：AGENTS.md 第773-786行

### 生活成本计算公式

```typescript
// 每月生活成本 = 食品 + 住宿 + 出行
const monthlyLivingCost = 
  LIVING_COST_BASE.food +                           // 固定
  LIVING_COST_BASE.lodging[player.lodgingType] +   // 由道具决定
  LIVING_COST_BASE.transport[player.transportType]; // 由道具决定

// 通胀影响（economic类型Debuff）
const adjustedCost = monthlyLivingCost * 
  inflationRate.food * 
  inflationRate.lodging * 
  inflationRate.transport;
```

### 场景3生活成本基准值（可配置）

| 类别 | 道具 | 基础成本 | 备注 |
|-----|------|---------|------|
| 食品 | - | $400/月 | 固定，不受道具影响 |
| 住宿 | 无/lodging_none | $0 | 获得【露宿街头】Debuff |
| 住宿 | lodging_shelter | $0 | 需每7天续期，ICE突袭概率+10% |
| 住宿 | lodging_shared | $600/月 | 基础住宿 |
| 住宿 | lodging_apartment | $1,200/月 | 中等住宿 |
| 住宿 | lodging_house | $2,500/月 | 高端住宿 |
| 出行 | 无/transport_none | $0 | 限制工作选择 |
| 出行 | transport_bus | $100/月 | 公交卡 |
| 出行 | transport_ebike | $50/月 | 电动车 |
| 出行 | transport_car_used | $350/月 | 二手车 |
| 出行 | transport_car_new | $600/月 | 特斯拉 |

### 基准值配置表（详细版）

| 类别 | 选项 | 基准值（美元/月） | 道具标签 | 备注 |
|-----|------|----------------|---------|------|
| **食品** | 固定成本 | `$400` | - | 不受道具影响，人活着就要吃饭 |
| **住宿** | 收容所床位 | `$0` | `lodging` | 免费但获得【露宿街头】Debuff |
| **住宿** | 合租房间 | `$650` | `lodging` | 基础住宿，心理+2/晚 |
| **住宿** | 公寓 | `$1,200` | `lodging` | 正规住宿，心理+4/晚，生存能力+1 |
| **住宿** | House | `$2,500` | `lodging` | 高端住宿，心理+6/晚，生存能力+2 |
| **出行** | 公交卡 | `$100` | `transport` | 只能找附近工作 |
| **出行** | 电动车 | `$50` | `transport` | 基础出行 |
| **出行** | 二手车 | `$350` | `transport` | 标准出行 |
| **出行** | 特斯拉 | `$600` | `transport` | 解锁Uber升级选项，收入×1.3 |

### TypeScript配置常量

```typescript
// ============================================================
// 场景3生活成本基准值配置
// 来源：AGENTS.md / EventPool.md
// 修改此配置即可全局调整生活成本
// ============================================================

export const LIVING_COST_BASE = {
  // 食品：固定成本，不受道具影响
  food: 400,
  
  // 住宿：由持有的lodging标签道具决定
  lodging: {
    shelter: 0,      // 收容所床位
    shared: 650,     // 合租房间
    apartment: 1200, // 公寓
    house: 2500,     // House
  },
  
  // 出行：由持有的transport标签道具决定
  transport: {
    bus: 100,        // 公交卡
    ebike: 50,       // 电动车
    used_car: 350,   // 二手车
    tesla: 600,      // 特斯拉
  },
} as const;

// 通胀率基准值（1.0 = 无通胀）
export const INFLATION_BASE = {
  food: 1.0,
  lodging: 1.0,
  transport: 1.0,
} as const;

// 通胀等级定义
export const INFLATION_LEVELS = {
  normal: { max: 1.3, label: '正常' },      // 0% ~ +30%
  high: { max: 2.0, label: '严重通胀' },    // +30% ~ +100%
  hyper: { max: 3.0, label: '恶性通胀' },   // +100% ~ +200%
  crisis: { max: Infinity, label: '生存危机' }, // >200%
} as const;

// 生活压力等级（用于UI显示）
export const LIVING_COST_TIERS = {
  minimal: { max: 500, label: '极简', color: '#4CAF50' },      // 收容所+公交
  basic: { max: 1000, label: '基础', color: '#8BC34A' },       // 收容所+二手车
  standard: { max: 1800, label: '标准', color: '#FFC107' },    // 合租+二手车
  comfortable: { max: 3000, label: '舒适', color: '#FF9800' }, // 公寓+二手车
  luxury: { max: Infinity, label: '奢侈', color: '#F44336' },  // House+特斯拉
} as const;
```

### 生活成本示例计算

| 住宿选择 | 出行选择 | 基础成本 | 通胀30% | 通胀100% |
|---------|---------|---------|--------|---------|
| 收容所($0) | 公交($100) | `$500` | `$650` | `$1,000` |
| 收容所($0) | 二手车($350) | `$750` | `$975` | `$1,500` |
| 合租($650) | 公交($100) | `$1,150` | `$1,495` | `$2,300` |
| 合租($650) | 二手车($350) | `$1,400` | `$1,820` | `$2,800` |
| 公寓($1,200) | 二手车($350) | `$1,950` | `$2,535` | `$3,900` |
| House($2,500) | 特斯拉($600) | `$3,500` | `$4,550` | `$7,000` |

---

## 场景3事件索引（美国生存）

### 主动事件
| ID | 名称 | 类型 | 关键道具 | 属性影响 |
|---|-----|-----|---------|---------|
| `act3_work_delivery` | 送外卖 | 打工 | `transport`(强制), `identity`(可选) | 英语+ |
| `act3_work_uber` | Uber司机 | 打工 | `transport`(强制), `identity`(强制) | 英语+, 社交+ |
| `act3_work_kitchen` | 餐厅后厨帮工 | 打工 | 无 | 体魄- |
| `act3_work_supermarket` | 连锁超市打工 | 打工 | `identity`(强制) | - |
| `act3_work_construction` ⭐P1 | 装修队打工 | 打工 | 体魄≥10 | 高收入高风险 |
| `act3_lodge_blackhotel` | 家庭旅馆住宿 | 居住 | `key_blackhotel` | - |
| `act3_lodge_apartment` | 正规租房 | 居住 | `fake_lease`, `key_apartment` | 生存能力+ |
| `act3_identity_fake` | 办理假证件 | 身份 | 社交≥5 | - |
| `act3_identity_rent_uber` | 租用Uber账号 | 身份 | **无**`fake_ssn` | 收入减半，无证件替代方案 |
| `act3_identity_asylum` | 申请政治庇护（旧版） | 通关 | 现金≥1000 | **已废弃** - 请使用新版事件链 |
| `act3_social_church` | 参加华人教会活动 | 社交 | - | 社交+, 心理健康+ |
| `act3_social_chat` | 水群 | 社交/信息 | 无 | 社交+, 心理健康+, 水群计数+1 |
| `act3_social_info` | 获取信息（水群衍生） | RANDOM | 执行水群时20%触发 | 解锁工作/租房/购物优惠 |
| `act3_living_cost` ⭐P0 | 每月生活成本扣除 | FIXED(系统) | 每30回合自动触发 | 食品$400+住宿+出行 |
| `act3_inflation_trigger` ⭐P0 | 通胀Debuff触发 | RANDOM | 回合>20, 每10回合20% | 最多叠加3层 |
| `act3_lodge_shelter` ⭐P0 | 收容所床位 | FIXED | 现金<$50, 无住所 | 获得`lodging_shelter`道具 |
| `act3_visa_overstay` ⭐P0 | 签证过期处理 | SYSTEM | 旅游签6回/学签15回 | 到期转undocumented |

### P0级核心事件详细说明 ⭐重要

| ID | 名称 | 类型 | 触发条件 | 关键机制 |
|---|-----|------|---------|---------|
| `act3_living_cost` | 每月生活成本扣除 | FIXED(系统) | 每月1日(每30回合)自动 | 食品$400+住宿+出行 |
| `act3_inflation_trigger` | 通胀Debuff触发 | RANDOM | 回合>20, 每10回合20%概率 | 最多3层, 成本+30% |
| `rand3_ice_raid` | ICE突袭检查 | RANDOM | 场景3随机触发（与身份状态无关） | 躲藏/假装/逃跑选择 |
| ~~`act3_deportation_process`~~ | ~~遣返流程链~~ 【已废弃】 | ~~CHAIN~~ | ~~ICE突袭失败被捕~~ | ~~拘留→法庭→遣返/暂缓~~ |
| `ending_arrested` | 被捕入狱终局 | SYSTEM | ICE突袭失败被捕 | 入狱即终局（无保释/遣返） |
| `act3_visa_overstay` | 签证过期处理 | SYSTEM | 签证倒计时归零 | 旅游签6回/学签15回+学费 |
| `act3_lodge_shelter` | 收容所床位 | FIXED | 现金<$50, 无住所 | 免费但心理-3/回, 需续期 |

### 购物App事件

详见 [`Events_Act3_Shopping.md`](./Events_Act3_Shopping.md)

所有购物通过手机App完成，无行动点消耗，即时到账。

| App | 事件ID | 商品类别 | 价格范围 |
|-----|--------|---------|---------|
| CarGo购车平台 | `act3_shop_car_app` | 二手车/电动车/自行车 | $150-$3000 |
| PillNow快药到家 | `act3_shop_drug_app` | 止疼片/大麻/功能饮料/安眠药 | $10-$50 |
| FreshAsia华人生鲜 | `act3_shop_food_app` | 方便面/速冻食品/零食/生鲜 | $20-$60 |
| ID Helper办证中介 | `act3_shop_id_app` | 假SSN/假驾照/假租房合同 | $300-$800 |
| ReadBase知识付费 | `act3_shop_book_app` | 英语书/编程书/历史书/移民法指南 | $15-$80 |
| UniBuy万能购 | `act3_shop_general_app` | 手机/电脑/床/电暖器 | $80-$600 |
| 话费充值 | `act3_phone_topup` | 手机话费 | $20 |

### 绿卡路径事件（通关事件链）

详见 [`Events_GreenCard_Paths.md`](./Events_GreenCard_Paths.md)

#### 路径A：唐纳德总统金卡
| ID | 名称 | 类型 | 关键条件 | 结果 |
|---|-----|------|----------|------|
| `act3_hear_gold_card` | 听闻金卡计划 | RANDOM | 现金>=$500,000 | 解锁购买事件 |
| `act3_buy_gold_card` | 购买金卡 | FIXED | 现金>=$1,000,000 | 结局【黄金门票】|

#### 路径B：政治庇护（事件链）
| ID | 名称 | 类型 | 关键条件 | 成功率 | 结果 |
|---|-----|------|----------|--------|------|
| `chain_asylum_start` | 启动庇护申请 | CHAIN | 回合>=20, 现金>=$200 | 100% | 启动链式事件 |
| `chain_asylum_1` | 阶段1：材料准备 | CHAIN | 间隔5回合 | 50%-80% | 进入阶段2或重试 |
| `chain_asylum_2` | 阶段2：记忆训练 | CHAIN | 阶段1成功 | 50%-75% | 进入阶段3或返回 |
| `chain_asylum_3` | 阶段3：移民法官面试 | CHAIN | 阶段2成功 | 20%-70% | 绿卡或遣返 |

**总成本**：$2000+ | **总时间**：15回合 | **属性惩罚**：社交-6（永久）

#### 路径C：U签证（受害者滞留签证）
| ID | 名称 | 类型 | 关键条件 | 结果 |
|---|-----|------|----------|------|
| `proof_of_victimization` | 被害的证明（道具） | PERMANENT | 通过受害事件获得 | 申请必需 |
| `act3_apply_u_visa` | 申请U签证 | FIXED | 持有证明, 现金>=$1000 | 结局【受害者的证词】|

**总成本**：$1000+
| `act3_social_douyin` | 刷抖音/小红书 | 信息 | `phone_old` | 智力+ |
| `act3_social_lawyer` | 找律师咨询 | 信息 | 现金≥300 | 智力+ |
| `act3_crisis_police` | 应对警察临检 | 危机 | `fake_ssn`, `debit_card` | - |
| `act3_crisis_raid` | 应对移民局突袭 | 危机 | `fake_lease` | - |

### 随机事件（部分）
| ID | 名称 | 正/负 | 触发条件 |
|---|-----|------|---------|
| `rand3_highpay_job` | 老乡介绍高薪工作 | 正面 | 社交≥7时概率增加 |
| `rand3_food_bank` | 教会食物银行 | 正面 | 15%概率 |
| `rand3_account_banned` | 账号被封 | 负面 | 执行Uber工作时触发 |
| `rand3_fake_exposed` | 假证件被识破 | 负面 | `fake_ssn`时概率 |
| `rand3_eviction` | 房东涨租/驱赶 | 负面 | `fake_lease`时概率增加 |
| `rand3_robbery` | 被抢劫 | 负面 | `debit_card`减少概率 |
| `rand3_lucky_find` ⭐P1 | 捡到钱/物品 | 正面 | 5%概率，+$50~$200 |
| `rand3_charity_help` ⭐P1 | 教会帮助 | 正面 | 心理<30或健康<30时25% |
| `rand3_seasonal_winter` ⭐P1 | 冬季寒冷 | 负面 | 回合>60，持续Debuff |
| `rand3_holiday_lonely` ⭐P1 | 节日孤独 | 负面 | 特定节日回合，心理-15 |

### 生病/受伤随机事件
| ID | 名称 | 触发条件 | 健康影响 | 特殊效果 |
|---|-----|---------|---------|---------|
| `rand3_illness_cold` | 感冒发烧 | 基础15%，健康<60时25% | -15健康 | 获得【感冒】状态，工作收入-30% |
| `rand3_injury_work` | 工伤 | 执行装修小工时10%触发 | -25健康 | 获得【腿部受伤】状态，6回合内无法执行体力劳动 |
| `rand3_injury_car` | 交通事故 | 送外卖/Uber时5%触发 | -10健康 | 默认-$500私了，获得【车辆损坏】状态 |
| `rand3_illness_chronic` | 慢性病发作 | 回合>40，累计高消耗工作>20回合 | 无即时伤害 | 获得永久【慢性腰痛】状态 |
| `rand3_illness_mental` | 抑郁发作 | 心理<40时10%/回合 | 无 | 获得【抑郁】状态，3回合无法工作，不处理进入【崩溃】终结态 |

### P1新增主动事件
| ID | 名称 | 类型 | 触发条件 | 效果 |
|---|-----|------|---------|------|
| `act3_work_construction` ⭐P1 | 装修队打工 | FIXED | 体魄≥10 | $120/回合，健康-15，10%工伤 |

---

## 通用随机事件索引

### 正面事件
| ID | 名称 | 触发概率 | 关键属性/道具 |
|---|-----|---------|-------------|
| `rand_lucky_money` | 捡到钱 | 5% | - |
| `rand_lucky_mentor` | 遇到贵人指点 | 3~8% | 社交≥5 |
| `rand_info_policy` | 听说新政策 | 8~15% | 智力≥6 |
| `rand_info_opportunity` | 被推荐好工作 | 6~12% | 社交≥6 |

### 负面事件
| ID | 名称 | 触发概率 | 关键属性/道具 |
|---|-----|---------|-------------|
| `rand_bad_repair` | 东西坏了需要修理 | 12% | 常驻道具增加概率 |
| `rand_bad_insomnia` | 失眠 | 15~25% | 心理健康度<60 |
| `rand_bad_minor_illness` | 小病小痛 | 15~25% | 身体健康度<60 |
| `rand_bad_gossip` | 被背后议论 | 8~15% | 社交≥6 |

### 危机事件
| ID | 名称 | 触发概率 | 关键属性/道具 |
|---|-----|---------|-------------|
| `rand_crisis_followed` | 被跟踪/监视 | 5~10% | 场景3概率最高 |
| `rand_crisis_natural_disaster` | 自然灾害 | 3% | - |
| `rand_crisis_mistake` | 重大误判 | 4~8% | 智力<5时概率增加 |

### 属性专属事件
| ID | 名称 | 触发条件 | 效果 |
|---|-----|---------|-----|
| `rand_strong_recruited` | 体力活被赏识 | 体魄≥8 | 高薪工作机会 |
| `rand_smart_loophole` | 发现系统漏洞 | 智力≥8 | 解锁捷径 |
| `rand_english_mistaken` | 被误认为是本地人 | 英语≥8 | 社交+, 盘查概率降低 |
| `rand_social_circle` | 被邀请加入圈子 | 社交≥8 | 获得组织支持 |
| `rand_risk_forewarned` | 提前发现危险 | 风险意识≥8 | 免疫负面事件 |
| `rand_survival_miracle` | 绝境求生成功 | 生存能力≥8, 终结态 | 脱离危险, 属性+ |

---

## 终结态事件索引

### 濒死状态事件
| ID | 名称 | 触发场景 | 关键道具 | 效果 |
|---|-----|---------|---------|-----|
| `term1_clinic` | 黑诊所急救 | 场景1 | 现金 | 健康+30, 脱离濒死 |
| `term1_self_heal` | 自我包扎 | 场景1 | 止痛药/绷带 | 健康+15, 50%脱离 |
| `term2_wilderness_survival` | 荒野求生 | 场景2 | 生存能力 | 回复10~20健康 |
| `term2_abandoned` | 被同伴抛弃 | 场景2 | 社交<4 | 倒计时-1 |
| `term3_emergency` | 急诊室 | 场景3 | 现金-800 | 健康+50, 脱离濒死 |
| `term3_black_doctor` | 黑市医生 | 场景3 | 现金-300, 社交≥5 | 健康+30, 有副作用 |

### 崩溃状态事件
| ID | 名称 | 触发场景 | 关键道具 | 效果 |
|---|-----|---------|---------|-----|
| `term1_breakdown_cry` | 深夜痛哭 | 场景1 | - | 心理+5, 行动-2 |
| `term1_call_home` | 给老家打电话 | 场景1 | `phone_old` | 心理+20, 脱离崩溃 |
| `term2_hallucination` | 幻觉 | 场景2 | - | 可能走向危险 |
| `term2_give_up` | 想要放弃 | 场景2 | - | 选择坚持或游戏结束 |
| `term3_depression` | 抑郁发作 | 场景3 | - | 行动点归零 |
| `term3_surrender` | 想要自首回国 | 场景3 | - | 选择遣返或坚持 |

### 匮乏状态事件
| ID | 名称 | 触发场景 | 关键属性 | 效果 |
|---|-----|---------|---------|-----|
| `term1_loan_shark` | 借高利贷 | 场景1 | - | 现金+500, 债务陷阱 |
| `term1_beg` | 街头乞讨 | 场景1 | - | 现金+20~80, 社交-2 |
| `term2_desperation` | 出卖身体/尊严 | 场景2 | - | 现金+100, 心理-30 |
| `term2_steal` | 偷窃其他偷渡者 | 场景2 | 生存能力 | 可能被抓 |
| `term3_homeless` | 睡车里/街头 | 场景3 | - | 健康-10/回合, 风险被捕 |
| `term3_dumpster` | 吃垃圾桶食物 | 场景3 | - | 健康-10, 心理-20 |

---

## 道具-事件联动表

### 场景1关键道具槽位匹配（新系统）

**系统说明**：道具通过**属性标签**与**事件槽位**动态匹配，不再硬编码绑定。

**匹配流程**：
1. 玩家点击事件
2. 系统检查事件的物品槽位配置（标签要求、是否强制）
3. 从玩家道具栏筛选带有所需标签的道具
4. 按优先级(0-9)排序，数字小的优先
5. 默认选中优先级最高的（玩家可手动更换）
6. 应用槽位效果，计算最终属性

**场景1道具标签表**：

| 道具ID | 属性标签 | 优先级 | 可匹配槽位 | 槽位效果 |
|-------|---------|-------|-----------|---------|
| `badge_warehouse` | `identity` | 2 | identity_slot | 行动点-1 |
| `vehicle_scooter` | `transport` | 1 | transport_slot | 行动点-1, 收入×1.0 |
| `vehicle_tesla` | `transport` | 0 | transport_slot | 行动点-1, 收入×1.3 |
| `vehicle_ebike` | `transport` | 2 | transport_slot | 行动点+0, 收入×0.9 |
| `gym_membership` | `membership` | 0 | membership_slot | 解锁健身选项 |
| `book_001~010` | `book` | 1-5 | book_slot | 获得对应属性 |
| `phone_old` | `tool` | 5 | tool_slot | 解锁手机相关 |
| `fake_diploma` | `document` | 1 | document_slot | 解锁留学申请 |
| `networking_letter` | `document` | 0 | document_slot | 解锁留学申请 |
| `card_snakehead` | `contact` | 0 | contact_slot | 成功率+20%，成本+50% |

### 场景1书籍系统机制（简化版）

**核心设计**：
- **全局唯一书籍池**：整局游戏只有10本书，固定不变
- **随机购买**：玩家无法选择，点击「购买书籍」后随机获得一本
- **移除机制**：获得的书从池中永久移除，每局游戏最多获得10本不同的书
- **固定消耗**：150现金 + 2行动点/本

**流程**：
1. **购买书籍**（`act1_buy_book`）：支付150元+2行动点 → 随机获得一本书
2. **读书学习**（`act1_read_book`）：消耗2行动点 → 阅读 → 获得属性 → 书被删除

**10本书籍池**：

| 编号 | 书名 | 道具ID | 效果 | 稀有度 |
|-----|------|-------|-----|-------|
| 1 | 轻松英语 | `book_001` | 英语+1 | 普通 |
| 2 | 雅思备考指南 | `book_002` | 英语+2, 智力+1, 心理-5 | 稀有 |
| 3 | 风险评估手册 | `book_003` | 风险意识+2, 生存+1, 心理-3 | 稀有 |
| 4 | 社交话术指南 | `book_004` | 社交+2 | 普通 |
| 5 | 美国生活指南 | `book_005` | 智力+1, 生存+1 | 普通 |
| 6 | 街头智慧 | `book_006` | 生存+2, 风险意识+1 | 稀有 |
| 7 | 心理学入门 | `book_007` | 心理+15, 智力+1 | 普通 |
| 8 | 体能训练手册 | `book_008` | 体魄+2, 健康+10 | 普通 |
| 9 | 移民法律常识 | `book_009` | 智力+2, 解锁场景3提示 | 史诗 |
| 10 | 前走私犯回忆录 | `book_010` | 风险意识+3, 生存+2, 心理-10 | 史诗 |

**代码实现简化**：
```javascript
// 全局书籍池（整局游戏唯一）
const globalBookPool = [
  { id: 'book_001', name: '轻松英语', effect: { english: 1 } },
  // ... 共10本
];

// 购买书籍事件
function buyBook() {
  if (globalBookPool.length === 0) return '已售空';
  const randomIndex = Math.floor(Math.random() * globalBookPool.length);
  const book = globalBookPool.splice(randomIndex, 1)[0];
  player.inventory.push(book);
  return book;
}
```

---

## 新物品槽位系统代码示例

### 事件配置（声明式）
```javascript
// 事件只声明需要什么槽位，不绑定具体道具ID
const eventWorkDelivery = {
  id: 'act3_work_delivery',
  name: '送外卖',
  slots: [
    { 
      id: 'transport_slot', 
      tags: ['transport'], 
      required: true  // 强制槽位
    },
    { 
      id: 'identity_slot', 
      tags: ['identity'], 
      required: false // 可选槽位
    }
  ],
  baseIncome: 40,
  baseApCost: 2
};
```

### 道具配置（标签化）
```javascript
// 道具只声明自己的标签和优先级
const itemVehicleTesla = {
  id: 'vehicle_tesla',
  name: '特斯拉 Model S',
  tags: ['transport'],
  priority: 0,  // 数字越小优先级越高
  slotEffects: {
    apCost: -1,
    incomeMultiplier: 1.3
  }
};

const itemVehicleScooter = {
  id: 'vehicle_scooter',
  name: '破旧的二手代步车',
  tags: ['transport'],
  priority: 1,  // 优先级低于特斯拉
  slotEffects: {
    apCost: -1,
    incomeMultiplier: 1.0
  }
};
```

### 核心匹配逻辑（只需写一次）
```javascript
// 获取玩家道具中匹配槽位要求的所有道具
function getMatchingItems(player, slot) {
  return player.permanentItems
    .filter(item => item.tags.some(tag => slot.tags.includes(tag)))
    .sort((a, b) => a.priority - b.priority); // 按优先级排序
}

// 计算事件最终属性
function calculateEventStats(event, player) {
  let finalApCost = event.baseApCost;
  let finalIncome = event.baseIncome;
  const equippedSlots = {};
  
  for (const slot of event.slots) {
    const matches = getMatchingItems(player, slot);
    
    if (matches.length === 0) {
      if (slot.required) {
        return { canExecute: false, reason: `缺少必需槽位: ${slot.id}` };
      }
      continue; // 可选槽位无匹配，跳过
    }
    
    // 默认选中优先级最高的（玩家可手动更换）
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
    income: finalIncome,
    equippedSlots 
  };
}
```

### 对比：新系统 vs 旧系统

| 场景 | 旧系统代码 | 新系统代码 |
|-----|-----------|-----------|
| 新增一辆新车 | 修改N个事件代码 | 只需添加一个道具配置 |
| 新增一个打工事件 | 复制粘贴判断逻辑 | 只需声明槽位配置 |
| 修改道具效果 | 全局搜索替换 | 只改道具自己的配置 |

**代码量减少约70%，维护成本大幅降低！**

### 场景2关键道具槽位匹配

| 道具ID | 属性标签 | 优先级 | 可匹配槽位 | 槽位效果 | 来源事件 |
|-------|---------|-------|-----------|---------|---------|
| `compass_military` | `tool` | 2 | tool_slot | 风险意识+2, 迷路-30% | `act2_town_buy_supplies` |
| `machete` | `weapon` | 0 | weapon_slot | 解锁硬闯选项, 反击+40% | `act2_town_buy_supplies` |
| `waterskin` | `survival_gear` | 4 | gear_slot | 健康消耗-2, 免疫脱水 | `act2_town_buy_supplies` |
| `first_aid_kit` | `medical` | 1 | medical_slot | 健康+20, 解毒/止血 | `act2_town_buy_supplies` |
| `sleeping_bag` | `survival_gear` | 3 | gear_slot | 健康消耗-3, 免疫极端天气 | `act2_town_buy_supplies` |
| `guide_juan` | `guide` | 1 | guide_slot | 成功率+20% | `act2_move_guide` |
| `smuggler_amir` | `guide` | 0 | guide_slot | 成功率+30%, 封锁随机事件 | `act2_town_contact_driver` |
| `route_map` | `tool` | 1 | tool_slot | 巡逻概率-20%, 免检定通过 | `act2_town_gather_info` |
| `armband_mutual_aid` | `contact` | 2 | contact_slot | 免疫背叛+50% | `rand2_meet_migrant` |
| `card_snakehead` | `contact` | 0 | transition_slot | 解锁`act2_transition_snakehead` | `act1_meet_snakehead` |

### 场景3关键道具槽位匹配

| 道具ID | 属性标签 | 优先级 | 可匹配槽位 | 槽位效果 |
|-------|---------|-------|-----------|---------|
| `fake_ssn` | `identity` | 1 | identity_slot | 基础收入+50%, 60%过检查 |
| `uber_driver` | `identity` | 1 | identity_slot | 自己注册Uber, 收入+120, 被封删fake_ssn |
| `uber_rented` | `identity` | 2 | identity_slot | 租用Uber账号, 收入+60, 被封无收入 |
| `badge_warehouse` | `identity` | 2 | identity_slot | 行动点-1, 基础收入+70 |
| `lodging_shelter` | `lodging` | 5 | lodging_slot | 免费住宿, ICE突袭风险+20% | `act3_lodge_shelter` |
| `fake_lease` | `document`/`lodging` | 1 | lodging_slot | 生存能力+2, 解锁正规租房 |
| `key_apartment` | `lodging` | 0 | lodging_slot | 心理+5/晚, 生存能力+1 |
| `key_blackhotel` | `lodging` | 1 | lodging_slot | 心理+3/晚 |
| `debit_card` | `payment` | 1 | payment_slot | 现金上限+1000, 抢劫损失-50% |
| `vehicle_tesla` | `transport` | 0 | transport_slot | 行动点-1, 收入×1.3 |
| `vehicle_scooter` | `transport` | 1 | transport_slot | 行动点-1, 收入×1.0 |
| `phone_old` | `tool` | 5 | tool_slot | 随机事件+1, 行动点恢复+1 |

---

---

## 非法移民搜查压力事件索引

详见 [Events_RaidPressure.md](./Events_RaidPressure.md)

### 压力增长设计

| 压力等级 | 范围 | 描述 | 典型事件 |
|---------|------|------|---------|
| LOW | 0-30 | 风声不紧 | `raid_community_notice`, `raid_digital_trace` |
| MEDIUM | 31-60 | 开始关注 | `raid_landlord_inquiry`, `raid_workplace_inspection` |
| HIGH | 61-80 | 严查阶段 | `raid_identity_check`, `raid_sudden_inspection` |
| CRITICAL | 81-100 | 大规模搜捕 | `raid_mass_operation`, `raid_betrayed` |

### 场景特有压力事件

| 场景 | 事件ID | 压力增加 | 说明 |
|------|--------|---------|------|
| act1 | `raid_police_tea` | +15 | 派出所约谈 |
| act2 | `raid_guide_captured` | +20 | 向导被捕 |
| act2 | `raid_border_patrol` | +15 | 边境巡逻加强 |
| act3 | `raid_ice_raid` | +18 | ICE突袭工作场所 |
| act3 | `raid_tipline` | +12 | 匿名举报威胁 |

### 压力系统规则

- **全局生效**：所有场景共享同一压力值
- **单向增长**：只增不减，玩家无法主动降低
- **自动增长**：每回合基础 +2，每20回合额外 +1
- **事件触发**：特定随机事件额外增加压力
- **难度缩放**：高压力时负面事件权重增加，正面事件权重降低

---

## P1级别事件索引（锦上添花）

> 以下为建议补充的非阻塞级事件，详见 [Events_Todo_P1.md](./Events_Todo_P1.md)

### 场景1 - P1事件

| ID | 名称 | 类型 | 触发条件 | 效果 |
|---|-----|------|---------|------|
| `rand1_exchange_rate_change` | 汇率波动 | RANDOM | 10%概率 | 汇率±0.2~0.5 |
| `rand1_friend_farewell` | 朋友送别 | RANDOM | 回合>15 | 心理±5, 可能获得礼物 |
| `rand1_family_conflict` | 家庭冲突 | RANDOM | 回合>10 | 心理-10, 选择安抚/坚持 |
| `rand1_visa_lottery` | 签证抽签中奖 | RANDOM | 1%概率 | 直接跳至场景3 |
| `act1_rent_room` | 租房道具获取 | FIXED | 回合>5 | 获得`lodging_rental` |
| `rand1_loan_shark_pressure` | 高利贷催收 | RANDOM | 有债务且逾期 | 心理-10, 暴力威胁 |

### 场景2 - P1事件

| ID | 名称 | 类型 | 触发条件 | 效果 |
|---|-----|------|---------|------|
| `rand2_meet_migrant` | 遇到其他偷渡者 | RANDOM | 15%概率 | 社交+2, 可能获得情报 |
| `rand2_guide_raising_price` | 向导临时涨价 | RANDOM | 雇佣向导后20% | 向导费+$30/回合 |
| `rand2_weather_storm` | 恶劣天气 | RANDOM | 15%概率 | 本回合无法前进, 健康-10 |
| `act2_town_npc_bartender` | 小镇酒保对话 | FIXED | 阶段2可选 | -$20, 获得情报, 心理+3 |
| `act2_town_npc_migrant` | 其他偷渡者交流 | FIXED | 阶段2可选 | 获得路线建议 |

### 场景3 - P1事件

| ID | 名称 | 类型 | 触发条件 | 效果 |
|---|-----|------|---------|------|
| `act3_work_construction` | 装修队打工 | FIXED | 体魄≥10 | $120/回合, 健康-15, 10%工伤 |
| `rand3_lucky_find` | 捡到钱/物品 | RANDOM | 5%概率 | +$50~$200 或 道具 |
| `rand3_seasonal_winter` | 冬季寒冷 | RANDOM | 回合>60 | 无暖气时健康-5/回合 |
| `rand3_holiday_lonely` | 节日孤独 | RANDOM | 特定回合 | 心理-15, 可选择聚会 |
| ~~`act3_marriage_green_card`~~ | ~~假结婚绿卡路径~~ 【已废弃/未实现】 | ~~CHAIN~~ | ~~社交≥12, 现金≥$5000~~ | ~~暂不实现~~ |
| `rand3_charity_help` | 教会帮助 | RANDOM | 心理<30或健康<30 | 食物, 心理+10 |

---

## 待补充事件清单

- [ ] **Events_Terminal.md** - 终结态事件的完整补充
- [ ] **Events_Milestones.md** - 里程碑/关键转折点事件
- [ ] **场景过渡事件** - 场景1→2, 2→3的特殊过渡剧情
- [ ] **结局事件扩展** - 更多结局变体（成功/失败/灰色）
- [ ] **多周目事件** - 继承要素和新游戏+专属事件

---

## 修改记录

### 2024-XX-XX P0级事件实现（场景1）

**变更摘要**：实现6个P0级阻塞事件，修复ID冲突。

**新增事件**：

| 事件ID | 名称 | 类型 | 说明 |
|--------|------|------|------|
| `act1_work_construction` | 工地高薪短包 | FIXED | 体魄≥8，高风险高回报打工 |
| `act1_exchange_usd` | 人民币兑换美元 | FIXED | 回合≥10，固定汇率7.2 |
| `act1_meet_snakehead` | 认识蛇头 | FIXED | 社交≥5+水群，获得走线道具 |
| `act1_give_up` | 放弃幻想 | RANDOM | 回合≥30，10%概率，特殊结局 |

**ID修复**：
- `act1_work_delivery`（快递分拣）→ `act1_work_warehouse`（保留送外卖为`act1_work_delivery`）

**新增道具**：
- `card_snakehead`（蛇头联系方式）- 用于解锁场景2走线选项

**依赖关系**：
- `act1_meet_snakehead` → 产生 `card_snakehead` → 解锁 `act1_transition` 走线选项
- `act1_exchange_usd` → 产生 USD → 场景2起始资金

---

### 2024-XX-XX P0级事件实现（场景3）

**变更摘要**：实现6个P0级阻塞事件，完成核心循环。

**新增事件**：

| 事件ID | 名称 | 类型 | 说明 |
|--------|------|------|------|
| `act3_living_cost` | 每月生活成本扣除 | 系统 | 每月1日自动扣除 |
| `act3_inflation_trigger` | 通胀Debuff触发 | RANDOM | 回合>20，最多3层 |
| `rand3_ice_raid` | ICE突袭 | RANDOM | 场景3随机触发（与身份状态无关） |
| ~~`act3_deportation_process`~~ | ~~遣返流程~~ 【已废弃/未实现】 | ~~CHAIN~~ | ~~场景3采用入狱即终局，无遣返流程~~ |
| `act3_visa_overstay` | 签证过期处理 | RANDOM | 旅游签/学签到期触发 |
| `act3_lodge_shelter` | 收容所床位 | FIXED | 现金<$50时可用 |

**新增道具**：
- `lodging_shelter`（收容所床位）- 免费住宿但有ICE突袭风险

**废弃事件**：
- `act3_identity_asylum`（旧版单次检定）→ 请使用新版`chain_asylum_*`事件链

---

### 2024-XX-XX P1级事件索引补充

**变更摘要**：添加19个P1级别非阻塞事件到索引。

详见文档 [P1事件索引](#p1级别事件索引锦上添花) 部分。

---

### 2024-XX-XX 场景2事件重构

**变更摘要**：根据 `Act2_Outline.md` 的剧情设计，重构场景2事件系统。

**事件ID变更**：

| 旧ID | 新ID | 变更类型 |
|-----|-----|---------|
| `act2_guide_forward` | `act2_move_guide` | 重命名 |
| `act2_move_alone` | `act2_move_solo` | 重命名 |
| `rand2_bandits` | `rand2_bandit` | 重命名（单数形式） |
| `rand2_wildlife` | `rand2_snake` | 重命名/拆分 |
| `rand2_dangerous_path` | `rand2_fall` | 重命名 |
| `rand2_storm` | - | 删除 |
| `rand2_disease` | `rand2_insect` | 替换 |
| `death_bandits` | `death_bandit` | 重命名（单数形式） |

**新增事件**：
- `rand2_swamp` / `death_swamp` - 沼泽陷阱相关
- `rand2_insect` / `death_infection` - 毒虫袭击/败血症
- `rand2_food` / `death_poison` - 可疑食物/中毒
- `act2_town_contact_driver` - 联系货车司机
- `act2_town_gather_info` - 打探消息
- `act2_town_buy_supplies` - 补充物资
- `act2_town_wait` - 等待时机
- `act2_cross_truck` - 货车偷渡
- `act2_cross_desert` - 穿越沙漠缺口

**参考文档**：
- [场景2剧情大纲](../../NarrativeDocs/StoryOutline/Act2_Outline.md)
- [场景2死亡事件](Act2_DeathEvents.md)

---

### 2026-02-28 事件索引修复（P1-1 / P1-6）

**修复摘要**：补充缺失的P0事件索引、生活成本表细节、道具-事件联动表，并标记废弃事件。

#### 1. P0事件索引确认（已存在，统一格式）

**场景1 P0事件**（共5个）：

| 事件ID | 名称 | 类型 | 触发条件 | 状态 |
|--------|------|------|---------|------|
| `act1_work_construction` | 工地短包打工 | FIXED | 体魄≥8 | ✅ 已索引 |
| `act1_work_warehouse` | 快递分拣临时工 | FIXED | 无 | ✅ 已索引 |
| `act1_exchange_usd` | 人民币兑换美元 | FIXED | 回合≥10 | ✅ 已索引 |
| `act1_give_up` | 放弃幻想 | RANDOM | 回合≥30，10%/回合 | ✅ 已索引 |
| `act1_meet_snakehead` | 认识蛇头 | FIXED | 社交≥5，执行过水群 | ✅ 已索引 |

**场景2/3 P0事件**（共7个）：

| 事件ID | 名称 | 类型 | 触发条件 | 状态 |
|--------|------|------|---------|------|
| `act2_transition_snakehead` | 走线过渡 | CHAIN | 持有`card_snakehead` | ✅ 已索引 |
| `act2_transition_visa` | 签证过渡 | CHAIN | 持有`fake_diploma` | ✅ 已索引 |
| `act3_living_cost` | 每月生活成本 | FIXED | 每月1日系统触发 | ✅ 已索引 |
| `act3_inflation_trigger` | 通胀触发 | RANDOM | 回合>20，20%/10回合 | ✅ 已索引 |
| `rand3_ice_raid` | ICE突袭 | RANDOM | 场景3随机触发 | ✅ 已索引 |
| `act3_visa_overstay` | 签证过期 | SYSTEM | 签证倒计时 | ✅ 已索引 |
| `act3_lodge_shelter` | 收容所床位 | FIXED | 现金<$50 | ✅ 已索引 |

#### 2. 生活成本表更新

**修改内容**：
- `lodging_shelter`备注：补充"ICE突袭概率+10%"

#### 3. 道具-事件联动表更新

**新增道具记录**：

| 道具ID | 属性标签 | 来源事件 | 用途 |
|-------|---------|---------|------|
| `card_snakehead` | `contact` | `act1_meet_snakehead` | 场景2→3走线过渡 |
| `waterskin` | `survival_gear` | `act2_town_buy_supplies` | 场景2生存道具 |
| `machete` | `weapon` | `act2_town_buy_supplies` | 场景2战斗道具 |
| `compass_military` | `tool` | `act2_town_buy_supplies` | 场景2导航道具 |
| `first_aid_kit` | `medical` | `act2_town_buy_supplies` | 场景2医疗道具 |
| `lodging_shelter` | `lodging` | `act3_lodge_shelter` | 场景3免费住宿 |

**新增场景2→3过渡道具来源表**：记录`card_snakehead`和`fake_diploma`的获取途径

#### 4. 废弃事件标记

| 事件ID | 废弃原因 | 标记位置 |
|-------|---------|---------|
| `act3_deportation_process` | 场景3采用入狱即终局，无遣返流程 | P0核心事件详细说明 |
| `act3_marriage_green_card` | 暂不实现 | P1级别事件索引 |

#### 修复统计

- **P0事件索引确认**：12个事件已全部索引
- **生活成本表字段**：补充1处缺失备注
- **道具-事件联动**：新增6个道具记录，补充"来源事件"列
- **废弃事件标记**：2个事件已标记【已废弃/未实现】

---
