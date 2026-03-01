# 特朗普移民政策声明事件集

> 本文档定义场景3（美国境内）中，由唐纳德总统政策声明触发的移民执法压力事件。
> 
> **核心设计原则**：
> - **只在场景3生效**：压力事件仅在 Act3 中触发
> - **政策声明触发**：通过"唐纳德总统宣布XXX"形式的事件添加 Debuff
> - **Debuff 机制**：产生 `pressure` 类型的环境 Debuff，强度等级 1-5
> - **自动衰减**：Debuff 持续时间归零后自动消失，新政策可添加新的 Debuff
> - **效果累加**：多个压力 Debuff 效果累加计算

---

## 1. 系统设计

### 1.1 Debuff 存储位置

```typescript
// 压力效果通过 environmentalDebuffs 数组管理（场景3状态）
interface Act3State {
  // ... 其他字段
  
  // 环境 Debuff 列表（包含压力型 Debuff）
  environmentalDebuffs: EnvironmentalDebuff[];
  
  // 已触发的政策事件记录
  triggeredPolicies: {
    eventId: string;
    turn: number;
    description: string;
  }[];
}

// 压力型 Debuff 结构
interface EnvironmentalDebuff {
  id: string;                      // Debuff ID，格式: debuff_{政策事件ID}
  name: string;                    // 显示名称（如"移民搜捕升级"）
  type: 'pressure';                // 类型标识
  intensity: 1 | 2 | 3 | 4 | 5;    // 强度等级（1=轻微，5=极端）
  source: string;                  // 来源描述（政策公告内容）
  duration: number;                // 持续回合（-1表示永久）
  effects: {
    raidChanceIncrease?: number;   // 突击检查概率增加（0-1）
    workDifficultyIncrease?: number; // 打工难度增加值
    mentalDamagePerTurn?: number;  // 每回合心理伤害
    cashCostMultiplier?: number;   // 现金消耗倍率
  };
}
```

### 1.2 触发方式

| 触发方式 | 说明 | 配置 |
|---------|------|------|
| **政策声明事件** | 回合开始时随机触发 | `category: 'POLICY_PRESSURE'`，使用 `minSceneTurn` 控制时机 |

### 1.3 压力强度等级

| 强度等级 | 状态名称 | ICE突袭概率加成 | 打工难度 | 心理/回合 | 其他效果 |
|---------|---------|----------------|---------|----------|---------|
| 1 | 【轻微关注】 | +3% | +5 | -1 | 无 |
| 2 | 【搜捕升级】 | +6% | +10 | -2 | 无 |
| 3 | 【风声鹤唳】 | +9% | +15 | -3 | 现金消耗+10% |
| 4 | 【全城搜捕】 | +12% | +20 | -4 | 现金消耗+20%，庇护暂停 |
| 5 | 【红色警戒】 | +15% | +30 | -6 | 现金消耗+30%，无法稳定打工 |

---

## 2. 系统规则

### 2.1 Debuff 叠加规则

**同 ID Debuff 叠加**：
- 若已存在相同 ID 的 Debuff，取最大强度并延长持续时间
- 例如：已有强度2持续3回合，再次触发同事件强度3持续4回合 → 结果为强度3持续7回合

**不同类型 Debuff 共存**：
- 多个不同来源的压力 Debuff 效果**累加计算**
- 例如：强度2（+15%检查）+ 强度3（+20%检查）= 总检查概率 +35%
- UI 保留多个 Debuff 显示，玩家清楚看到压力来源

### 2.2 Debuff 衰减机制

```typescript
// 回合结束时更新所有环境 Debuff
function updateEnvironmentalDebuffs(sceneState: Act3State): void {
  const debuffs = sceneState.environmentalDebuffs;
  
  for (let i = debuffs.length - 1; i >= 0; i--) {
    const debuff = debuffs[i];
    
    // 减少剩余回合
    if (debuff.duration > 0) {
      debuff.duration--;
    }
    
    // 持续时间归零时移除
    if (debuff.duration === 0) {
      debuffs.splice(i, 1);
      // 触发事件："移民局的搜捕力度似乎有所放松"
    }
  }
}
```

### 2.3 触发条件

政策事件通过 `SceneTurnCondition` 控制触发时机：

```typescript
interface SceneTurnCondition {
  type: 'SCENE';
  value: 'act3';
  minSceneTurn?: number;   // 场景最小回合（新手保护）
  maxSceneTurn?: number;   // 场景最大回合（可选）
}
```

**设计意图**：
- `minSceneTurn`: 给玩家新手保护期，前几回合不会触发高压政策
- `maxSceneTurn`: 某些事件只在特定阶段触发
- 冷却时间：事件触发后设置冷却回合，避免过于密集

---

## 3. 政策声明事件

### 3.1 行政命令类

#### 唐纳德总统宣布：全国移民执法行动启动 (ID: `act3_policy_nationwide_raids`)

| 属性 | 值 |
|-----|---|
| **触发场景** | act3 |
| **触发条件** | 场景回合 ≥ 3 |
| **权重** | 15 |
| **冷却** | 25回合 |
| **最大触发** | 1次 |

**事件描述**：
> 你打开手机，看到推送的新闻："唐纳德总统宣布启动'爱国者行动'，全国范围内将展开为期30天的大规模非法移民清查。总统在声明中表示：'我们要把每一个非法入境者找出来，美国法律必须得到执行。'"
>
> 你所在的华人微信群瞬间炸了，有人在发避难所地址，有人在问要不要搬家。

**Debuff 配置**：
```yaml
debuff:
  id: "debuff_nationwide_raids"
  name: "全国执法行动"
  type: "pressure"
  intensity: 3                    # 强度等级 3
  duration: 10                    # 持续10回合
  effects:
    raidChanceIncrease: 0.20      # 突击检查+20%
    workDifficultyIncrease: 15    # 打工难度+15
    mentalDamagePerTurn: 3        # 每回合心理-3
    cashCostMultiplier: 1.10      # 现金消耗+10%
```

**立即效果**：
```typescript
{
  mental: -10,           // 恐慌
  // 接下来10回合内，ICE突袭事件权重翻倍
  eventModifier: {
    eventId: 'raid_ice_workplace',
    weightMultiplier: 2.0,
    duration: 10
  }
}
```

---

#### 唐纳德总统宣布：加强雇主核查 (ID: `act3_policy_everify_expansion`)

| 属性 | 值 |
|-----|---|
| **触发场景** | act3 |
| **触发条件** | 场景回合 ≥ 5 |
| **权重** | 18 |
| **冷却** | 20回合 |

**事件描述**：
> 新闻推送："唐纳德总统签署行政令，要求所有雇主必须在48小时内完成员工身份重新核查。'任何雇佣非法移民的企业都将面临最严厉的处罚。'总统在玫瑰园表示。"
>
> 你工作的餐厅老板开始逐一检查大家的证件。你低头假装在擦桌子，心跳加速。

**Debuff 配置**：
```yaml
debuff:
  id: "debuff_everify_expansion"
  name: "雇主核查加强"
  type: "pressure"
  intensity: 2                    # 强度等级 2
  duration: 5                     # 持续5回合
  effects:
    raidChanceIncrease: 0.15      # 突击检查+15%
    workDifficultyIncrease: 10    # 打工难度+10
    mentalDamagePerTurn: 2        # 每回合心理-2
```

**立即效果**：
```typescript
{
  // 所有打工类事件被锁定3回合（老板不敢用人）
  lockedEventTags: ['work', 'job'],
  duration: 3,
  mental: -5
}
```

---

#### 唐纳德总统宣布：暂停庇护申请 (ID: `act3_policy_asylum_ban`)

| 属性 | 值 |
|-----|---|
| **触发场景** | act3 |
| **触发条件** | 场景回合 ≥ 8，且有正在进行的庇护申请 |
| **权重** | 12 |
| **冷却** | 30回合 |
| **最大触发** | 1次 |

**事件描述**：
> "突发：唐纳德总统宣布暂停接收新的庇护申请，理由是'系统已被滥用'。已在处理中的申请将被'重新评估'。总统说：'我们要确保每一个获得庇护的人都真正值得。'"
>
> 你看着手机里律师的未读消息，手在发抖。你的申请已经提交了三个月。

**Debuff 配置**：
```yaml
debuff:
  id: "debuff_asylum_ban"
  name: "庇护通道关闭"
  type: "pressure"
  intensity: 4                    # 强度等级 4
  duration: 8                     # 持续8回合
  effects:
    raidChanceIncrease: 0.25      # 突击检查+25%
    workDifficultyIncrease: 20    # 打工难度+20
    mentalDamagePerTurn: 4        # 每回合心理-4
    cashCostMultiplier: 1.20      # 现金消耗+20%
```

**立即效果**：
```typescript
{
  mental: -15,
  // 庇护申请进度冻结
  freezeProgress: {
    type: 'asylum',
    duration: -1  // 直到 Debuff 消失
  }
}
```

---

### 3.2 法律执行类

#### 唐纳德总统宣布：扩大快速遣返 (ID: `act3_policy_expedited_removal`)

| 属性 | 值 |
|-----|---|
| **触发场景** | act3 |
| **触发条件** | 场景回合 ≥ 6 |
| **权重** | 20 |
| **冷却** | 22回合 |

**事件描述**：
> "唐纳德总统在推特上宣布：'从今天起，快速遣返范围扩大到全国任何地方，不再局限于边境100英里。我们的执法人员现在可以在任何地点执行法律。'"
>
> 你盯着手机屏幕，感觉呼吸困难。这意味着无论你在哪里，都可能被当场遣返。

**Debuff 配置**：
```yaml
debuff:
  id: "debuff_expedited_removal"
  name: "快速遣返扩大"
  type: "pressure"
  intensity: 3                    # 强度等级 3
  duration: 6                     # 持续6回合
  effects:
    raidChanceIncrease: 0.20      # 突击检查+20%
    workDifficultyIncrease: 15    # 打工难度+15
    mentalDamagePerTurn: 3        # 每回合心理-3
    cashCostMultiplier: 1.10      # 现金消耗+10%
```

**立即效果**：
```typescript
{
  mental: -12,
  // 所有外出事件增加健康/心理压力消耗
  travelCostIncrease: {
    health: 5,
    mental: 5
  }
}
```

---

#### 唐纳德总统宣布：举报奖励计划 (ID: `act3_policy_snitch_reward`)

| 属性 | 值 |
|-----|---|
| **触发场景** | act3 |
| **触发条件** | 场景回合 ≥ 7 |
| **权重** | 16 |
| **冷却** | 18回合 |

**事件描述**：
> "唐纳德总统宣布推出'爱国举报奖励计划'：'任何向移民局举报非法移民的美国公民，在核实后可获得最高5000美元奖励。我们要让每个社区都成为执法的延伸。'"
>
> 你开始怀疑那个最近总是问你"从哪里来"的邻居。你决定以后走路上下班都要多绕几条街。

**Debuff 配置**：
```yaml
debuff:
  id: "debuff_snitch_reward"
  name: "举报奖励计划"
  type: "pressure"
  intensity: 2                    # 强度等级 2
  duration: 12                    # 持续12回合
  effects:
    raidChanceIncrease: 0.10      # 突击检查+10%
    workDifficultyIncrease: 5     # 打工难度+5
    mentalDamagePerTurn: 2        # 每回合心理-2
```

**立即效果**：
```typescript
{
  mental: -8,
  // 社交类事件风险增加（可能被举报）
  socialEventRisk: {
    pressureIncreaseOnFail: 1,
    duration: 15
  }
}
```

---

### 3.3 边境/海关类

#### 唐纳德总统宣布：重启边境墙建设 (ID: `act3_policy_wall_restart`)

| 属性 | 值 |
|-----|---|
| **触发场景** | act3 |
| **触发条件** | 场景回合 ≥ 4 |
| **权重** | 10 |
| **冷却** | 35回合 |

**事件描述**：
> "唐纳德总统在边境视察时宣布：'我们要完成这堵墙，而且要让墨西哥付钱。今天我们重新开始建设，美国人民的安全不容妥协。'"
>
> 虽然你已经在美国境内，但这个消息让你意识到退路正在被封死。如果在这里待不下去，你也回不去了。

**Debuff 配置**：
```yaml
debuff:
  id: "debuff_wall_restart"
  name: "退路被封"
  type: "pressure"
  intensity: 1                    # 强度等级 1（心理象征性打击）
  duration: 5                     # 持续5回合
  effects:
    mentalDamagePerTurn: 1        # 每回合心理-1
```

**立即效果**：
```typescript
{
  mental: -5,
  // 心理象征性打击：退路被封
  narrative: "退路正在被封死"
}
```

---

#### 唐纳德总统宣布：取消TPS保护 (ID: `act3_policy_tps_cancel`)

| 属性 | 值 |
|-----|---|
| **触发场景** | act3 |
| **触发条件** | 场景回合 ≥ 5 |
| **权重** | 14 |
| **冷却** | 28回合 |

**事件描述**：
> "唐纳德总统宣布取消多个国家的临时保护身份(TPS)：'TPS不是永久的，是时候让这些国家的公民回国重建家园了。我们不能再当世界的避难所。'"
>
> 虽然你不是TPS持有者，但你在华人社区中心看到很多人崩溃。有人在这里住了20年，现在被告知要被遣返。兔死狐悲，你不知道下一个会不会轮到你。

**Debuff 配置**：
```yaml
debuff:
  id: "debuff_tps_cancel"
  name: "TPS取消恐慌"
  type: "pressure"
  intensity: 2                    # 强度等级 2
  duration: 6                     # 持续6回合
  effects:
    raidChanceIncrease: 0.10      # 突击检查+10%
    mentalDamagePerTurn: 2        # 每回合心理-2
```

**立即效果**：
```typescript
{
  mental: -10,
  // 社区支持度下降（大家自顾不暇）
  communityStanding: {
    chineseCommunity: -10
  }
}
```

---

### 3.4 社交媒体/言论类

#### 唐纳德总统发推：ICE下周有大动作 (ID: `act3_policy_tweet_ice_action`)

| 属性 | 值 |
|-----|---|
| **触发场景** | act3 |
| **触发条件** | 场景回合 ≥ 4 |
| **权重** | 25 |
| **冷却** | 15回合 |

**事件描述**：
> 你刷到唐纳德总统的推特："ICE下周将有重大行动！非法移民们，你们的时间不多了。自首是你们的最佳选择。#法律与秩序"
>
> 推文下方是一串 cities 名单，你所在的城市赫然在列。

**Debuff 配置**：
```yaml
debuff:
  id: "debuff_tweet_ice_action"
  name: "ICE行动预警"
  type: "pressure"
  intensity: 2                    # 强度等级 2
  duration: 3                     # 持续3回合
  effects:
    raidChanceIncrease: 0.20      # 突击检查+20%（预告期风险更高）
    workDifficultyIncrease: 10    # 打工难度+10
    mentalDamagePerTurn: 2        # 每回合心理-2
```

**立即效果**：
```typescript
{
  mental: -10,
  // 接下来3回合内无法休息（恐慌失眠）
  disableRest: 3,
  // 下一回合必定触发ICE相关事件
  forcedNextEvent: 'raid_ice_related'
}
```

---

#### 唐纳德总统宣布：社交媒体监控加强 (ID: `act3_policy_social_media_monitor`)

| 属性 | 值 |
|-----|---|
| **触发场景** | act3 |
| **触发条件** | 场景回合 ≥ 6，且使用过社交网络类事件 |
| **权重** | 15 |
| **冷却** | 24回合 |

**事件描述**：
> "唐纳德总统宣布与多家社交媒体公司合作：'我们将监控那些可能被非法移民用来规避执法的平台。如果你在网上违法，我们一定会找到你。'"
>
> 你立刻删掉了自己在朋友圈发的所有定位信息。你开始后悔上周在群里问的那句"有没有不用工卡的工作"。

**Debuff 配置**：
```yaml
debuff:
  id: "debuff_social_media_monitor"
  name: "社交媒体监控"
  type: "pressure"
  intensity: 2                    # 强度等级 2
  duration: 8                     # 持续8回合
  effects:
    raidChanceIncrease: 0.10      # 突击检查+10%
    mentalDamagePerTurn: 2        # 每回合心理-2
```

**立即效果**：
```typescript
{
  mental: -5,
  // 信息获取类事件效果降低（大家不敢说话）
  infoEventPenalty: {
    socialReduction: 3,
    duration: 10
  }
}
```

---

### 3.5 终极压力事件

#### 唐纳德总统宣布：国家紧急状态 (ID: `act3_policy_national_emergency`)

| 属性 | 值 |
|-----|---|
| **触发场景** | act3 |
| **触发条件** | 场景回合 ≥ 15，且已触发至少2个其他政策事件 |
| **权重** | 8 |
| **冷却** | 40回合 |
| **最大触发** | 1次（整局游戏） |

**事件描述**：
> 唐纳德总统在 Oval Office 向全国发表电视讲话："今天，我宣布国家进入紧急状态。非法移民潮已经威胁到我们的国家安全。我将动用一切权力，包括军队，来保卫我们的边境和街道。"
>
> "从现在起，任何阻碍执法的人都将被起诉。任何城市如果拒绝配合联邦执法，将失去所有联邦资金。"
>
> 你关掉电视，手在发抖。窗外的街道上，你看到了军车驶过。

**Debuff 配置**：
```yaml
debuff:
  id: "debuff_national_emergency"
  name: "国家紧急状态"
  type: "pressure"
  intensity: 5                    # 强度等级 5（最高）
  duration: 10                    # 持续10回合
  effects:
    raidChanceIncrease: 0.50      # 突击检查+50%
    workDifficultyIncrease: 30    # 打工难度+30
    mentalDamagePerTurn: 6        # 每回合心理-6
    cashCostMultiplier: 1.30      # 现金消耗+30%
```

**立即效果**：
```typescript
{
  mental: -20,
  health: -10,  // 极度焦虑导致身体不适
  // 立即触发最高级别难度
  maxPressureEffects: {
    // 所有ICE事件权重最大化
    // 打工事件50%概率触发ICE检查
    // 每回合自动扣心理健康度
    autoMentalDrain: 6
  },
  // 必须在10回合内达成通关条件，否则游戏结束
  forcedEndgame: 10
}
```

---

## 4. 压力对游戏的影响

### 4.1 压力效果计算

当存在多个压力 Debuff 时，效果**累加计算**：

```typescript
// 计算总压力效果
function calculateTotalPressureEffects(debuffs: EnvironmentalDebuff[]): PressureEffect {
  const pressureDebuffs = debuffs.filter(d => d.type === 'pressure');
  
  return pressureDebuffs.reduce((total, debuff) => ({
    raidChanceIncrease: total.raidChanceIncrease + (debuff.effects.raidChanceIncrease || 0),
    workDifficultyIncrease: total.workDifficultyIncrease + (debuff.effects.workDifficultyIncrease || 0),
    mentalDamagePerTurn: total.mentalDamagePerTurn + (debuff.effects.mentalDamagePerTurn || 0),
    cashCostMultiplier: total.cashCostMultiplier * (debuff.effects.cashCostMultiplier || 1)
  }), {
    raidChanceIncrease: 0,
    workDifficultyIncrease: 0,
    mentalDamagePerTurn: 0,
    cashCostMultiplier: 1
  });
}
```

**示例**：
- Debuff A（强度3）：检查+20%，打工+15，心理-3，现金×1.1
- Debuff B（强度2）：检查+15%，打工+10，心理-2
- **总计**：检查+35%，打工+25，心理-5/回合，现金×1.1

### 4.2 UI 展示

**Debuff 列表**：
```
┌─────────────────────────────────────────┐
│ 🚨 当前压力状态                         │
├─────────────────────────────────────────┤
│ 【国家紧急状态】        强度5  还剩8回合 │
│   突击检查 +50%，心理 -6/回合           │
│                                         │
│ 【雇主核查加强】        强度2  还剩3回合 │
│   突击检查 +15%，打工难度 +10           │
├─────────────────────────────────────────┤
│ 总计效果：                              │
│ 突击检查概率: +65%                      │
│ 打工难度增加: +40                       │
│ 心理健康消耗: -11/回合                  │
│ 现金消耗倍率: ×1.30                     │
└─────────────────────────────────────────┘
```

---

## 5. 事件索引

| 事件ID | 最小场景回合 | 强度等级 | 持续时间 | 主要效果 |
|--------|-------------|---------|---------|---------|
| `act3_policy_nationwide_raids` | 3 | 3 | 10回合 | 检查+20%，打工+15，心理-3 |
| `act3_policy_everify_expansion` | 5 | 2 | 5回合 | 检查+15%，打工+10，心理-2，锁定打工3回合 |
| `act3_policy_asylum_ban` | 8 | 4 | 8回合 | 检查+25%，打工+20，心理-4，庇护暂停 |
| `act3_policy_expedited_removal` | 6 | 3 | 6回合 | 检查+20%，打工+15，心理-3 |
| `act3_policy_snitch_reward` | 7 | 2 | 12回合 | 检查+10%，打工+5，心理-2 |
| `act3_policy_wall_restart` | 4 | 1 | 5回合 | 心理-1 |
| `act3_policy_tps_cancel` | 5 | 2 | 6回合 | 检查+10%，心理-2，社区声望-10 |
| `act3_policy_tweet_ice_action` | 4 | 2 | 3回合 | 检查+20%，打工+10，心理-2，强制ICE事件 |
| `act3_policy_social_media_monitor` | 6 | 2 | 8回合 | 检查+10%，心理-2，信息获取-3 |
| `act3_policy_national_emergency` | 15 | 5 | 10回合 | 检查+50%，打工+30，心理-6，强制终局 |

---

## 6. 实现参考

### 6.1 TypeScript 接口定义

```typescript
// 政策压力事件
interface PolicyPressureEvent {
  id: string;
  category: 'POLICY_PRESSURE';
  name: string;
  description: string;
  
  trigger: {
    phase: 'TURN_START';
    weight: number;
    maxTriggers: number;
    cooldown: number;
    conditions: SceneTurnCondition[];
  };
  
  scenes: ['act3'];
  
  content: {
    announcement: string;
    displayText: string;
  };
  
  debuff: {
    id: string;
    name: string;
    type: 'pressure';
    intensity: 1 | 2 | 3 | 4 | 5;
    duration: number;
    effects: PressureDebuffEffect;
  };
  
  // 立即生效的一次性效果（非持续）
  immediateEffects?: {
    health?: number;
    mental?: number;
    lockedEventTags?: string[];
    disableRest?: number;
    forcedNextEvent?: string;
    communityStanding?: { [key: string]: number };
  };
}

interface SceneTurnCondition {
  type: 'SCENE';
  value: 'act3';
  minSceneTurn?: number;
  maxSceneTurn?: number;
}

interface PressureDebuffEffect {
  raidChanceIncrease?: number;
  workDifficultyIncrease?: number;
  mentalDamagePerTurn?: number;
  cashCostMultiplier?: number;
}
```

### 6.2 事件触发流程

```typescript
// 在回合流程中触发政策事件
function executeTurn(): TurnResult {
  // ... 其他回合逻辑
  
  // 场景3特有：尝试触发政策压力事件
  if (currentScene === 'act3') {
    const policyEvent = drawPolicyEvent(pool);
    if (policyEvent) {
      const result = executePolicyEvent(policyEvent);
      // 添加 Debuff 到 environmentalDebuffs
      addEnvironmentalDebuff(result.debuff);
      // 应用立即效果
      applyImmediateEffects(policyEvent.immediateEffects);
    }
  }
  
  // ... 回合结束逻辑
  
  // 更新所有 Debuff 持续时间
  updateEnvironmentalDebuffs();
}
```

---

**文档版本**: v2.0
**最后更新**: 2026-02-27
**状态**: 已更新为强度等级制（intensity 1-5）
**注意**: 本文件所有事件仅在场景3（act3）生效

---

## 修改记录

### v2.0 (2026-02-27)
- **重大变更**：将压力系统从 0-100 数值制改为 intensity 1-5 强度等级制
- **移除**：全局压力值存储、单向增长机制、每回合基础增长
- **新增**：基于 EnvironmentalDebuff 的压力机制
- **新增**：Debuff 自动衰减和叠加规则
- **更新**：所有事件配置使用新的 debuff 结构

### v1.0 (2026-02-26)
- 初始版本，使用 0-100 压力值系统
