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
├── Events_Random.md          # 通用随机事件
├── Events_RaidPressure.md    # 非法移民搜查压力事件（增加全局压力）
├── Events_Terminal.md        # 终结态事件（待补充）
└── Events_Milestones.md      # 里程碑/关键转折点（待补充）
```

---

## 事件统计概览

| 场景/类型 | 主动事件 | 随机事件 | 终结态事件 | 压力事件 | 总计 |
|----------|---------|---------|-----------|---------|-----|
| 场景1 | 12 | 8 | 6 | 3 | 29 |
| 场景2 | 10 | 10 | 6 | 3 | 29 |
| 场景3 | 14 | 10 | 6 | 3 | 33 |
| 通用随机 | - | 20 | - | 6 | 26 |
| **总计** | **36** | **48** | **18** | **15** | **117** |

---

## 场景1事件索引（国内准备）

### 主动事件（新槽位系统）
| ID | 名称 | 类型 | 物品槽位 | 属性影响 |
|---|-----|-----|---------|---------|
| `act1_work_delivery` | 快递分拣临时工 | 打工 | `transport`(可选) | 体魄+ |
| `act1_train_gym` | 健身房训练 | 提升 | `membership`(强制) | 体魄+ |
| `act1_buy_book` | 购买书籍 | 购买 | 无 | 随机获得书籍 |
| `act1_read_book` | 读书学习 | 提升 | `book`(强制) | 获得属性 |
| `act1_work_supermarket` | 连锁超市仓管夜班 | 打工 | `identity`(可选) | 体魄+, 资金+ |
| `act1_work_construction` | 工地高薪短包 | 打工 | 无 | 体魄+, 资金++ |
| `act1_transition` | 寻找离境机会 | 过渡 | `contact`(可选) | - |
| `act1_apply_college` | 野鸡大学申请 | 过渡 | `document`(强制) | 社交+ |

**槽位说明：**
- **强制槽位**：无匹配道具时事件灰色不可点击
- **可选槽位**：无匹配时事件可执行，但效果降低
- **匹配规则**：系统按优先级(0-9)排序，默认选中优先级最高的道具，玩家可手动更换 |

### 随机事件（部分）
| ID | 名称 | 正/负 | 触发条件 |
|---|-----|------|---------|
| `rand1_friend_loan` | 老朋友借钱 | 正面 | 5%概率 |
| `rand1_blackmarket_usd` | 发现低价美元渠道 | 正面 | 社交≥5时概率增加 |
| `rand1_rent_raise` | 房东涨租 | 负面 | 15%概率 |
| `rand1_scam_agent` | 黑中介骗钱 | 负面 | 风险意识<5时概率增加 |
| `rand1_police_visit` | 警察上门调查 | 负面 | 持有`fake_diploma`时概率增加 |

---

## 场景2事件索引（跨境穿越）

### 主动事件
| ID | 名称 | 类型 | 关键道具 | 属性影响 |
|---|-----|-----|---------|---------|
| `act2_move_jungle` | 独自穿越雨林 | 移动 | `compass_military`, `machete` | 生存能力+ |
| `act2_move_guide` | 向导带路 | 移动 | `guide_juan` | 风险意识+ |
| `act2_move_smuggler` | 走私客路线 | 移动 | `smuggler_amir` | - |
| `act2_cross_fence` | 硬闯边境铁丝网 | 移动 | `machete` | - |
| `act2_rest_camp` | 野外露营 | 休整 | `sleeping_bag` | - |
| `act2_scavenge_water` | 寻找水源 | 生存 | `waterskin` | - |
| `act2_trade` | 与其他偷渡者交易 | 交易 | `armband_mutual_aid` | - |
| `act2_combat_robbery` | 遭遇武装抢劫 | 危机 | `machete`, `armband_mutual_aid` | - |
| `act2_combat_borderpatrol` | 应对边境巡逻队 | 危机 | `route_map`, `machete` | - |
| `act2_transition` | 越过边境线 | 过渡 | `route_map`, `guide_juan` | - |

### 随机事件（部分）
| ID | 名称 | 正/负 | 触发条件 |
|---|-----|------|---------|
| `rand2_supply_cache` | 发现废弃补给点 | 正面 | `compass_military`增加概率 |
| `rand2_friendly_farmer` | 遇到友善的当地农民 | 正面 | 社交≥6时概率增加 |
| `rand2_mutual_aid` | 同乡互助会支援 | 正面 | `armband_mutual_aid` |
| `rand2_storm` | 暴雨袭击 | 负面 | 20%概率，`sleeping_bag`免疫 |
| `rand2_dehydration` | 沙漠脱水 | 负面 | `waterskin`免疫 |
| `rand2_betrayal` | 同伴背叛 | 负面 | 社交<5时概率增加 |
| `rand2_border_raid` | 边境巡逻队突袭 | 负面 | `route_map`减少概率 |

---

## 场景3事件索引（美国生存）

### 主动事件
| ID | 名称 | 类型 | 关键道具 | 属性影响 |
|---|-----|-----|---------|---------|
| `act3_work_delivery` | 送外卖 | 打工 | `transport`(强制), `identity`(可选) | 英语+ |
| `act3_work_uber` | Uber司机 | 打工 | `transport`(强制), `identity`(强制) | 英语+, 社交+ |
| `act3_work_kitchen` | 餐厅后厨帮工 | 打工 | 无 | 体魄- |
| `act3_work_supermarket` | 连锁超市打工 | 打工 | `identity`(强制) | - |
| `act3_lodge_blackhotel` | 家庭旅馆住宿 | 居住 | `key_blackhotel` | - |
| `act3_lodge_apartment` | 正规租房 | 居住 | `fake_lease`, `key_apartment` | 生存能力+ |
| `act3_identity_fake` | 办理假证件 | 身份 | 社交≥5 | - |
| `act3_identity_rent_uber` | 租用Uber账号 | 身份 | `fake_ssn` | - |
| `act3_identity_asylum` | 申请政治庇护 | 通关 | 现金≥1000 | - |
| `act3_social_church` | 参加华人教会活动 | 社交 | - | 社交+, 心理健康+ |
| `act3_social_douyin` | 刷抖音/小红书 | 信息 | `phone_old` | 智力+ |
| `act3_social_lawyer` | 找律师咨询 | 信息 | 现金≥300 | 智力+ |
| `act3_crisis_police` | 应对警察临检 | 危机 | `fake_ssn`, `debit_card` | - |
| `act3_crisis_raid` | 应对移民局突袭 | 危机 | `fake_lease` | - |

### 随机事件（部分）
| ID | 名称 | 正/负 | 触发条件 |
|---|-----|------|---------|
| `rand3_highpay_job` | 老乡介绍高薪工作 | 正面 | 社交≥7时概率增加 |
| `rand3_food_bank` | 教会食物银行 | 正面 | 15%概率 |
| `rand3_account_banned` | 账号被封 | 负面 | `uber_driver`时概率 |
| `rand3_fake_exposed` | 假证件被识破 | 负面 | `fake_ssn`时概率 |
| `rand3_eviction` | 房东涨租/驱赶 | 负面 | `fake_lease`时概率增加 |
| `rand3_robbery` | 被抢劫 | 负面 | `debit_card`减少概率 |

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
| `snakehead_card` | `contact` | 0 | contact_slot | 成功率+20% |

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

| 道具ID | 属性标签 | 优先级 | 可匹配槽位 | 槽位效果 |
|-------|---------|-------|-----------|---------|
| `compass_military` | `tool` | 2 | tool_slot | 风险意识+2, 迷路-30% |
| `machete` | `weapon` | 0 | weapon_slot | 解锁硬闯选项, 反击+40% |
| `sleeping_bag` | `survival_gear` | 3 | gear_slot | 健康消耗-3, 免疫极端天气 |
| `waterskin` | `survival_gear` | 4 | gear_slot | 健康消耗-2, 免疫脱水 |
| `guide_juan` | `guide` | 1 | guide_slot | 成功率+20% |
| `smuggler_amir` | `guide` | 0 | guide_slot | 成功率+30%, 封锁随机事件 |
| `route_map` | `tool` | 1 | tool_slot | 巡逻概率-20%, 免检定通过 |
| `armband_mutual_aid` | `contact` | 2 | contact_slot | 免疫背叛+50% |

### 场景3关键道具槽位匹配

| 道具ID | 属性标签 | 优先级 | 可匹配槽位 | 槽位效果 |
|-------|---------|-------|-----------|---------|
| `fake_ssn` | `identity` | 1 | identity_slot | 基础收入+50%, 60%过检查 |
| `uber_driver` | `identity` | 1 | identity_slot | 解锁Uber, 收入+120, 有封号风险 |
| `badge_warehouse` | `identity` | 2 | identity_slot | 行动点-1, 基础收入+70 |
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

## 待补充事件清单

- [ ] **Events_Terminal.md** - 终结态事件的完整补充
- [ ] **Events_Milestones.md** - 里程碑/关键转折点事件
- [ ] **场景过渡事件** - 场景1→2, 2→3的特殊过渡剧情
- [ ] **结局事件扩展** - 更多结局变体（成功/失败/灰色）
- [ ] **多周目事件** - 继承要素和新游戏+专属事件
