# 叙事系统设计（Narrative System）

## 1. 概述

本文档定义《去美国》游戏的叙事系统设计，包含事件驱动的叙事架构、文本组织规范、叙事标记系统以及文案风格指南。

### 1.1 核心设计理念

- **事件驱动叙事**：叙事不由对话树主导，而是通过事件的发生和玩家的选择自然推进
- **文本与数据分离**：便于本地化和版本管理
- **一致性体验**：三个场景保持统一的叙事语气和文本结构
- **包装化数值**：避免直接展示数值，通过文案暗示变化

---

## 2. 叙事架构

### 2.1 事件驱动叙事模型

```
┌─────────────────────────────────────────────────────────────┐
│                    叙事流程模型                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   [事件触发] ──▶ [文本呈现] ──▶ [玩家选择] ──▶ [结果反馈]     │
│        │             │              │             │         │
│        ▼             ▼              ▼             ▼         │
│   随机/固定/     描述+选项      条件判断      状态更新        │
│   链式/政策                      属性/道具    叙事标记        │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 叙事标记（Story Flags）记录关键选择，影响后续事件    │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 文本层级结构

| 层级 | 功能 | 示例 |
|-----|------|------|
| **事件标题** | 简洁概括事件内容 | "暴雨袭击"、"送外卖" |
| **事件描述** | 场景描写，建立氛围 | "你在凌晨四点的仓库里..." |
| **选项文本** | 玩家可执行的行动 | "拼命干，多拿钱" |
| **条件提示** | 选项的前置要求 | "需要：体魄≥6" |
| **结果文本** | 执行后的反馈 | "你赚了¥120，但腰差点断了" |
| **状态反馈** | 资源变化的包装化表达 | "你感到一阵眩晕" |

### 2.3 文本与数据分离架构

```
┌─────────────────────────────────────────────────────────────┐
│                   文本与数据分离架构                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐        ┌─────────────┐        ┌─────────┐ │
│   │  事件数据   │◀──────▶│  文本资源   │◀──────▶│  本地化  │ │
│   │  (JSON)     │   ID   │  (YAML)     │   Key  │  (i18n)  │ │
│   └─────────────┘        └─────────────┘        └─────────┘ │
│          │                      │                           │
│          ▼                      ▼                           │
│   ┌─────────────────────────────────────┐                   │
│   │         运行时渲染引擎               │                   │
│   │  - 变量替换（[角色名]、[属性]）       │                   │
│   │  - 条件文本（根据状态显示不同文案）   │                   │
│   │  - 数值包装（将数字转为描述性文本）   │                   │
│   └─────────────────────────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**分离原则**：
- 事件数据只包含逻辑（ID、触发条件、效果数值）
- 文本资源通过事件ID关联，支持多语言
- 运行时动态渲染，支持变量替换和条件文本

---

## 3. 文本组织规范

### 3.1 事件文本存储结构（YAML）

```yaml
# 文本资源文件：narrative/events.yaml
# 按场景分组，便于管理

events:
  # ========== 场景1：国内准备 ==========
  act1_work_delivery:
    title: "快递分拣临时工"
    description: "你在凌晨四点的仓库里，和一群同样疲惫的人一起，把包裹从传送带搬到对应的区域。"
    
    # 条件变体（根据玩家状态显示不同描述）
    conditional_descriptions:
      - condition: "mental < 30"
        text: "你在凌晨四点的仓库里，眼神空洞地望着永不停歇的传送带。每一个包裹都像是在嘲笑你的处境。"
    
    options:
      - id: "hard_work"
        text: "拼命干，多拿钱"
        condition_hint: ""  # 无条件
        result: "你赚了¥120，但腰差点断了。"
        
      - id: "normal_work"
        text: "正常速度干活"
        result: "你赚了¥80，身体还能撑得住。"
        
      - id: "slack_off"
        text: "偷偷懒"
        condition_hint: "需要：智力≥5"
        result: "你只赚了¥50，但至少没把自己累垮。"
    
    # 结果变体（根据属性显示不同反馈）
    result_variants:
      - trigger: "physique < 5 AND option == hard_work"
        text: "你的腰发出一声脆响。你赚了¥120，但接下来几天恐怕站不直了。"
  
  act1_work_delivery:
    title: "送外卖"
    description: "手机提示音响个不停。你穿上骑手马甲，启动电动车，开始今晚的配送。"
    
    slots_hints:
      transport_slot:
        no_match: "你没有代步工具，无法接单。"
        matched: "电动车电量充足，今晚可以多跑几单。"
    
    options:
      - id: "normal_delivery"
        text: "正常送单"
        result: "你跑了8单，赚了¥130，虽然有点累但收入不错。"
        
      - id: "rush_delivery"
        text: "抢时间送单（需要体魄≥8）"
        condition_hint: "需要：体魄≥8"
        result: "你赚了¥150，但每一张钞票都让你紧张。"

  # ========== 场景2：跨境穿越 ==========
  act2_move_guide:
    title: "跟随向导前行"
    description: "向导用蹩脚的英语夹杂着西班牙语告诉你，天黑前必须到达下一个休息点。"
    
    options:
      - id: "follow_quickly"
        text: "加快脚步跟上"
        result: "你们在天黑前到达了休息点，但你几乎走不动了。"
        
      - id: "pace_yourself"
        text: "保持自己的节奏"
        result: "你到达时天已经黑了，向导脸色不太好看。"

  # ========== 场景3：美国生存 ==========
  act3_work_delivery:
    title: "送外卖"
    description: "你骑着车在洛杉矶的街道上穿梭，手机里的送餐App不断弹出新的订单。"
    
    slots_hints:
      transport_slot:
        vehicle_tesla: "你的特斯拉引起了顾客的好奇，小费概率+10%。"
        vehicle_scooter: "电动车在堵车的街道上如鱼得水。"
        vehicle_ebike: "你的二手电动车发出吱吱的声响，但你还是准时送到了。"
      
      identity_slot:
        no_match: "没有证件，你只能接华人区的单子。"
        fake_ssn: "假SSN让你能接更多单，但每次敲门你都心惊胆战。"
    
    options:
      - id: "normal_delivery"
        text: "正常送单"
        result: "你完成了5单，收入$50。洛杉矶的阳光让你想起了家乡。"
        
      - id: "rush_delivery"
        text: "抢时间多送几单"
        condition_hint: "需要：体魄≥6"
        result: "你完成了8单，收入$80。你的腿在发抖。"
        
      - id: "decline_orders"
        text: "挑单送，避开可疑区域"
        condition_hint: "需要：风险意识≥5"
        result: "你只完成了3单，收入$30，但至少感觉安全。"

# 随机事件文本
random_events:
  rand1_police_visit:
    title: "警察敲门"
    description: "咚咚咚。门外传来敲门声和一句'社区检查'。你的心跳漏了一拍。"
    
    options:
      - id: "open_door"
        text: "开门应对"
        result: "只是例行检查，你应付过去了。但你整晚都在想，如果当时不开门会怎样。"
        
      - id: "stay_silent"
        text: "保持安静"
        result: "敲门声持续了几分钟，然后停了。你躲在窗帘后，看着警车离开。"

  rand3_account_banned:
    title: "账号被封"
    description: "你打开送餐App，看到一行红色警告：'您的账号因异常活动被暂时冻结。'"
    
    options:
      - id: "appeal"
        text: "申诉"
        result: "你提交了申诉，但系统告诉你需要5-7个工作日处理。"
        
      - id: "create_new"
        text: "用新身份注册"
        condition_hint: "需要：假SSN道具"
        result: "你花了整个下午设置新账号。一切又要从头开始。"

# 政策压力事件文本
policy_events:
  act3_policy_001:
    title: "加强边境安全"
    announcement: "唐纳德总统宣布加强边境安全和国家执法行动"
    description: "唐纳德总统宣布加强边境安全和国家执法行动，这下移民局的搜查力度更大了。"
    
    # Debuff 相关文本
    debuff_text:
      name: "移民搜捕升级"
      description: "突击检查概率增加，打工难度上升。"

# 事件链文本
chain_events:
  chain_asylum:
    name: "政治庇护申请"
    description: "你听说通过政治庇护可以获得合法身份，但这将是一条漫长而艰难的路。"
    
    nodes:
      asylum_1_consult:
        title: "咨询律师"
        description: "律师办公室在唐人街的一栋老旧建筑里。他看着你的材料，眉头紧皱。"
        options:
          - id: "pay_consultation"
            text: "支付咨询费$200"
            result: "律师告诉你，你的案子有胜算，但需要准备大量材料。"
            
          - id: "ask_pro_bono"
            text: "询问免费咨询"
            condition_hint: "需要：社交≥7"
            result: "律师叹了口气，说他可以给你一个小时的免费建议。"
      
      asylum_2_prepare:
        title: "准备材料"
        description: "你需要证明回国会面临迫害。每一个字都可能决定你的命运。"
        
      asylum_3_submit_strong:
        title: "提交申请（材料充分）"
        description: "你的材料准备得很充分。律师说，这是他能看到的最好的庇护申请之一。"
        
      asylum_3_submit_weak:
        title: "提交申请（材料不足）"
        description: "你知道材料有漏洞，但你已经拖不起了。"
        
      asylum_4_result:
        title: "等待结果"
        description: "移民局的通知终于来了。你的手在颤抖。"
```

### 3.2 变量替换系统

**变量语法**：使用 `{{variable}}` 标记需要替换的变量

**支持的变量类型**：

| 变量类型 | 语法示例 | 说明 |
|---------|---------|------|
| **角色属性** | `{{character.name}}` | 角色名 |
| **数值属性** | `{{character.physique}}` | 体魄值 |
| **资源** | `{{resources.health}}` | 健康值 |
| **道具** | `{{items.backpack.name}}` | 道具名称 |
| **场景** | `{{scene.name}}` | 当前场景名 |
| **回合** | `{{turn.current}}` | 当前回合数 |
| **叙事标记** | `{{flags.chose_x}}` | 是否选择了某选项 |

**使用示例**：

```yaml
# 变量替换示例
events:
  rand1_meet_old_friend:
    title: "偶遇故人"
    description: "你在便利店排队时，听到有人叫你的名字。'{{character.name}}？真的是你？'"
    
    options:
      - id: "greet"
        text: "打招呼"
        result: "你们聊了几分钟。他问你最近怎么样，你只是笑了笑。这已经是第{{turn.current}}天了。"
        
      - id: "avoid"
        text: "假装没听见，快速离开"
        result: "你走出便利店，心跳加速。你不确定他有没有追出来。"
```

**处理器伪代码**：

```typescript
function renderText(template: string, context: RenderContext): string {
  // 正则匹配 {{variable}} 格式
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path);
    return formatValue(value, path);  // 根据类型格式化
  });
}

// 数值格式化示例
function formatValue(value: any, path: string): string {
  if (path.includes('health')) {
    if (value > 80) return "状态良好";
    if (value > 50) return "有些疲惫";
    if (value > 20) return "相当虚弱";
    return "濒临极限";
  }
  return String(value);
}
```

### 3.3 条件文本系统

**条件语法**：根据游戏状态动态选择显示的文本

```yaml
# 条件文本配置示例
events:
  act3_police_raid:
    title: "突击检查"
    
    # 基础描述
    description: "你听到楼下传来嘈杂声和警笛声。"
    
    # 条件变体（按优先级匹配，第一个匹配的生效）
    conditional_descriptions:
      - condition: "has_debuff('pressure') AND debuff.intensity >= 4"
        priority: 1
        text: " ICE来了。他们穿着防弹背心，逐个房间敲门。你知道这一天迟早会来，但没想到这么快。"
        
      - condition: "riskAwareness >= 7"
        priority: 2
        text: "你早就注意到最近街上警车变多。敲门声响起时，你已经准备好了应对方案。"
        
      - condition: "mental < 30"
        priority: 3
        text: "你的大脑一片空白。敲门声每响一下，你的心跳就快一分。"
    
    options:
      - id: "hide"
        text: "躲藏"
        # 选项本身的条件变体
        conditional_text:
          - condition: "has_item('hiding_spot')"
            text: "躲进事先准备好的藏身处"
        result: "你屏住呼吸，听着脚步声从门外经过。"
```

**条件表达式语法**：

| 表达式 | 说明 | 示例 |
|-------|------|------|
| `attribute >= N` | 属性比较 | `physique >= 6` |
| `has_item('id')` | 拥有道具 | `has_item('fake_ssn')` |
| `has_debuff('id')` | 拥有Debuff | `has_debuff('pressure')` |
| `has_flag('id')` | 拥有标记 | `has_flag('met_lawyer')` |
| `AND` / `OR` / `NOT` | 逻辑运算 | `physique >= 6 AND has_item('weapon')` |

---

## 4. 叙事标记系统（Story Flags）

### 4.1 标记的作用

叙事标记用于记录玩家的关键选择，影响后续事件的触发和文本展示。

```
┌─────────────────────────────────────────────────────────────┐
│                    叙事标记生命周期                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│   │   事件A     │───▶│  设置标记   │───▶│   事件B     │    │
│   │ 选择帮助NPC │    │ helped_npc  │    │ 检查标记    │    │
│   └─────────────┘    └─────────────┘    │ 改变文本    │    │
│                                         └─────────────┘    │
│                                                              │
│   标记类型：                                                 │
│   - 二元标记（是否触发）                                     │
│   - 数值标记（程度记录）                                     │
│   - 计数标记（发生次数）                                     │
│   - 时间标记（触发回合）                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 标记定义

```typescript
// 叙事标记类型
interface StoryFlag {
  id: string;              // 唯一标识
  type: 'BOOLEAN' | 'NUMBER' | 'COUNTER' | 'TIMESTAMP';
  value: boolean | number;
  metadata: {
    description: string;   // 标记说明（调试用）
    category: string;      // 分类（如'character', 'choice', 'event'）
    persistence: 'SCENE' | 'GAME';  // 跨场景/跨游戏持久化
  };
}

// 标记管理器
interface FlagManager {
  flags: Map<string, StoryFlag>;
  
  setFlag(id: string, value: any): void;
  getFlag(id: string): any;
  hasFlag(id: string): boolean;
  incrementCounter(id: string): void;
  
  // 场景切换时保存/恢复
  serialize(): string;
  deserialize(data: string): void;
}
```

### 4.3 标记使用场景

```yaml
# 事件配置中的标记使用

events:
  act1_meet_smuggler:
    title: "接触蛇头"
    description: "通过一个老同乡，你认识了一个自称'能搞定一切'的人。"
    
    options:
      - id: "trust"
        text: "相信他的话，交定金"
        result: "你交了¥5000定金。他说下周就能安排。"
        set_flags:
          - id: "paid_smuggler"
            type: "BOOLEAN"
            value: true
          - id: "smuggler_deposit"
            type: "NUMBER"
            value: 5000
            
      - id: "hesitate"
        text: "再考虑考虑"
        result: "你说需要时间考虑。他的眼神冷了下来。"
        set_flags:
          - id: "smuggler_distrust"
            type: "BOOLEAN"
            value: true

  act2_border_crossing:
    title: "边境穿越"
    description: "你站在墨西哥边境，向导催你快点决定路线。"
    
    # 根据标记显示不同选项
    conditional_options:
      - id: "use_smuggler"
        text: "联系之前定好的蛇头"
        condition: "has_flag('paid_smuggler')"
        result: "蛇头还算守信，虽然多要了$500'紧急费'。"
        
      - id: "avoid_smuggler"
        text: "找其他路线"
        condition: "has_flag('smuggler_distrust')"
        result: "你的直觉救了您。后来你听说那个蛇头把好几个人丢在了沙漠里。"
```

### 4.4 常见标记分类

| 分类 | 用途 | 示例 |
|-----|------|------|
| **角色关系** | 记录与NPC的互动 | `relation_lawyer_friendly`, `betrayed_companion` |
| **关键选择** | 记录重大决策 | `chose_legal_path`, `accepted_underground_job` |
| **事件触发** | 标记已发生事件 | `met_police_before`, `witnessed_arrest` |
| **资源使用** | 记录资源消耗 | `spent_savings_on_lawyer`, `sold_phone` |
| **知识获取** | 记录已知信息 | `knows_asylum_process`, `heard_about_shelter` |

---

## 5. 事件链叙事设计

### 5.1 链式事件的结构

```
┌─────────────────────────────────────────────────────────────┐
│                   事件链叙事结构                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   庇护申请事件链示例：                                        │
│                                                              │
│   ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│   │ 节点1    │─────▶│ 节点2    │─────▶│ 节点3A   │────┐    │
│   │ 咨询律师 │      │ 准备材料 │      │ 强势提交 │    │    │
│   └──────────┘      └──────────┘      └──────────┘    │    │
│                                              ▲        │    │
│                                              │分支条件│    │
│                                              │智力≥7  │    │
│                                              ▼        │    │
│                                        ┌──────────┐   │    │
│                                        │ 节点3B   │───┘    │
│                                        │ 弱势提交 │        │
│                                        └──────────┘        │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 节点4（结果）                                        │   │
│   │ - 强势+运气好 → 通过                                 │   │
│   │ - 弱势 或 运气差 → 被拒/遣返                        │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   叙事连贯性保证：                                            │
│   - 每个节点引用前序节点的结果                                │
│   - 标记系统记录链内选择                                      │
│   - 文本中暗示之前的决定                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 叙事连贯性设计

```yaml
# 事件链文本配置示例
chain_events:
  chain_asylum:
    name: "政治庇护申请"
    
    nodes:
      asylum_1_consult:
        title: "咨询律师"
        description: "律师办公室在唐人街的一栋老旧建筑里。"
        options:
          - id: "pay_full"
            text: "支付全款$2000"
            result: "律师收下了钱，给了你一张清单。'把这些材料准备好，我们就有机会。'"
            set_flags:
              - { id: "lawyer_paid_full", type: "BOOLEAN", value: true }
              - { id: "lawyer_relation", type: "NUMBER", value: 8 }  # 关系值
              
          - id: "pay_partial"
            text: "先付$500定金"
            result: "律师皱了皱眉，但还是收下了。'等你筹够钱我们再开始。'"
            set_flags:
              - { id: "lawyer_paid_partial", type: "BOOLEAN", value: true }
              - { id: "lawyer_relation", type: "NUMBER", value: 4 }

      asylum_2_prepare:
        title: "准备材料"
        description: "清单上的项目让你头晕：身份证明、迫害证据、时间线说明..."
        
        # 引用前序节点结果
        conditional_descriptions:
          - condition: "has_flag('lawyer_paid_full')"
            text: "你想起律师的叮嘱，开始逐项准备材料。他收了你$2000，至少应该给点好建议。"
          - condition: "has_flag('lawyer_paid_partial')"
            text: "你没有足够的钱请律师全程指导，只能自己摸索。每个表格都填得小心翼翼。"
        
        options:
          - id: "do_it_yourself"
            text: "自己准备"
            condition_hint: "需要：智力≥6"
            result: "你花了整整两周，材料终于准备得差不多了。"
            set_flags:
              - { id: "asylum_material_quality", type: "NUMBER", value: 6 }
              
          - id: "hire_helper"
            text: "请翻译帮忙整理"
            money_cost: 300
            result: "专业人士就是不一样，材料看起来整齐多了。"
            set_flags:
              - { id: "asylum_material_quality", type: "NUMBER", value: 8 }

      asylum_3_submit:
        title: "提交申请"
        description: "移民局的走廊漫长而寂静。你攥着文件夹，手心里全是汗。"
        
        conditional_options:
          - id: "submit_confident"
            text: "自信地提交"
            condition: "get_flag('asylum_material_quality') >= 7"
            result: "官员翻看了你的材料，点了点头。'我们会尽快处理。'"
            set_flags:
              - { id: "asylum_submission_strength", type: "STRING", value: "strong" }
              
          - id: "submit_nervous"
            text: "忐忑地提交"
            result: "官员皱着眉看完了你的材料。'有些部分需要补充，我们会发信通知你。'"
            set_flags:
              - { id: "asylum_submission_strength", type: "STRING", value: "weak" }

      asylum_4_result:
        title: "等待结果"
        description: "三个月后，信终于来了。"
        
        conditional_descriptions:
          - condition: "get_flag('asylum_submission_strength') == 'strong'"
            text: "你对自己的材料有信心，但等待还是让人焦虑。"
          - condition: "get_flag('asylum_submission_strength') == 'weak'"
            text: "你一直在担心材料的问题。每一天都在后悔当初没有准备得更充分。"
        
        options:
          - id: "open_letter"
            text: "打开信封"
            # 结果根据多个标记综合判定
            conditional_results:
              - condition: "get_flag('asylum_submission_strength') == 'strong' AND luck_check()"
                text: "'您的政治庇护申请已通过...'你读了三遍才敢相信。"
                ending: "asylum_approved"
                
              - condition: "get_flag('asylum_submission_strength') == 'weak' OR !luck_check()"
                text: "'我们很遗憾地通知您...'后面的字你几乎看不清了。"
                ending: "asylum_denied"
```

### 5.3 分支点的叙事处理

在事件链的分支点，需要确保：

1. **分支前的铺垫**：在玩家做选择前，文本应暗示不同选择的后果
2. **选择后立即反馈**：让玩家感受到选择的重要性
3. **后续事件的呼应**：分支后的文本应体现之前的选择

```yaml
# 分支点叙事示例

asylum_2_prepare:
  title: "准备材料"
  description: "清单上的项目让你头晕。你知道这些材料将决定你的命运。"
  
  # 分支前的铺垫
  narrative_hints:
    - "律师曾提醒你：'材料质量比数量更重要。'"
    - "你听说过有人因为材料不充分而被直接拒绝。"
    - "但请专业人士帮忙需要$300，你手头并不宽裕。"
  
  options:
    - id: "do_it_yourself"
      text: "自己准备（省钱但可能不充分）"
      result: "你决定省钱自己干。每个晚上都在研究怎么填表。"
      # 选择后立即反馈
      immediate_feedback: "你的心理健康度下降，但保留了现金。"
      
    - id: "hire_helper"
      text: "请翻译帮忙（花钱但更专业）"
      result: "你咬咬牙付了$300。翻译说你的案子'有戏'。"
      immediate_feedback: "你的现金减少，但对结果更有信心。"
```

---

## 6. 文案风格指南

### 6.1 基调与视角

| 要素 | 规范 | 示例 |
|-----|------|------|
| **基调** | 冷静克制的旁观者视角，带黑色幽默 | "货架上的商品在荧光灯下显得格外刺眼" |
| **视角** | 第二人称（"你"） | "你听到楼下传来嘈杂声" |
| **时态** | 现在时，增强沉浸感 | "你的心跳漏了一拍" |
| **人称** | 避免直接说教，让事件本身说话 | ❌ "你应该..." ✅ "你看着..." |

### 6.2 数值包装化表达

**原则**：避免直接显示数字，用描述性语言暗示变化。

| 数值变化 | ❌ 直接显示 | ✅ 包装化表达 |
|---------|-----------|--------------|
| 健康+10 | "健康度+10" | "你感觉身体舒展了一些" |
| 健康-15 | "健康度-15" | "你感到一阵眩晕，扶住了墙" |
| 心理+5 | "心理+5" | "你深吸一口气，稍微平静了一点" |
| 心理-20 | "心理-20" | "绝望感像潮水一样涌来" |
| 现金+100 | "现金+100" | "你的钱包鼓了一些" |
| 现金-50 | "现金-50" | "你看着余额，心头一紧" |
| 体魄检定失败 | "体魄检定失败" | "你的力气不够，差点摔倒" |

**特殊反馈**（资源临界点）：

```yaml
# 健康度临界反馈
health_critical_feedback:
  - range: [0, 20]
    text: "你感觉视线模糊，几乎站不稳"
  - range: [21, 50]
    text: "你的身体在发出警报"
  - range: [51, 80]
    text: "你感觉有点疲惫"
  - range: [81, 100]
    text: "你感觉状态还行"

# 心理健康临界反馈  
mental_critical_feedback:
  - range: [0, 20]
    text: "你盯着墙壁，不知道还能撑多久"
  - range: [21, 50]
    text: "焦虑像背景音乐一样挥之不去"
  - range: [51, 80]
    text: "你努力保持冷静"
  - range: [81, 100]
    text: "你的心态还算平稳"
```

### 6.3 黑色幽默的运用

**原则**：不直接说破，让玩家自己体会。

| 场景 | 文案示例 |
|-----|---------|
| 送外卖被投诉 | "顾客说汤洒了，给你打了1星。你看着保温箱里的密封包装，默默点了'申诉'。" |
| 假证件被查 | "警察盯着你的身份证看了三秒，然后还给了你。你分辨不出他是真没发现还是懒得管。" |
| 账号被封 | "系统提示'您的账号存在异常'。你想着每天12小时送外卖确实挺异常的。" |
| 没钱交租 | "房东发来消息：'兄弟，理解你的难处，但我也理解银行的难处。'" |

### 6.4 梗与金句的使用

**来源**：推特/论坛中的电子宠物事迹、移民论坛黑话

**呈现方式**：
- 藏在事件描述中，不直接解释
- 单句可截图，有共鸣感
- 符合角色身份和场景

```yaml
# 梗的使用示例
events:
  act3_work_delivery:
    title: "送外卖"
    description: "你骑着车在洛杉矶的街道上穿梭。导航显示这单只有$4，但你已经在线两个小时没接到单了。"
    
    # 金句选项
    options:
      - id: "accept"
        text: "接"
        result: "你告诉自己：'来了美国就是美国人，美国人就该勤劳。'虽然你的时薪已经低于法定最低工资。"
        
      - id: "decline"
        text: "不接"
        result: "你划掉了这一单。三分钟后，系统提示你的接单率过低，影响派单优先级。"

  rand3_account_banned:
    title: "账号被封"
    description: "你的送餐账号显示'永久封禁'。没有解释，没有申诉入口，只有一个'了解更多'的链接，点进去是404。"
    
    options:
      - id: "new_account"
        text: "用新身份注册"
        result: "这是你这个月第三个账号了。你已经开始记混哪个SSN对应哪个手机号。"
```

**金句类型参考**：

| 类型 | 示例 |
|-----|------|
| **自我安慰型** | "来了就是美国人"、"至少比国内强" |
| **黑色幽默型** | "自由职业的另一种说法就是没有社保" |
| **现实映射型** | "你刷着抖音上的电子宠物，突然意识到自己也是别人的电子宠物" |
| **自嘲型** | "以前觉得'月薪三千'是梗，现在发现是奢望" |

---

## 7. 与 EventSystem 的集成

### 7.1 从事件ID获取文本

```typescript
// 文本获取接口
interface NarrativeResolver {
  // 获取事件完整文本
  getEventText(eventId: string): EventText;
  
  // 根据上下文渲染文本
  renderDescription(eventId: string, context: GameContext): string;
  renderOptions(eventId: string, context: GameContext): OptionText[];
  renderResult(eventId: string, optionId: string, context: GameContext): string;
}

// 使用示例
class EventExecutor {
  constructor(
    private eventData: EventData,
    private narrative: NarrativeResolver,
    private flagManager: FlagManager
  ) {}
  
  execute(eventId: string, context: GameContext): EventResult {
    // 1. 获取事件数据（数值逻辑）
    const event = this.eventData.get(eventId);
    
    // 2. 获取并渲染文本
    const text = this.narrative.getEventText(eventId);
    const description = this.narrative.renderDescription(eventId, context);
    
    // 3. 显示给玩家
    ui.showEvent({
      title: text.title,
      description: description,
      options: this.narrative.renderOptions(eventId, context)
    });
    
    // 4. 玩家选择后，渲染结果
    const result = this.narrative.renderResult(eventId, selectedOption, context);
    ui.showResult(result);
    
    // 5. 应用数值效果
    return this.applyEffects(event, selectedOption);
  }
}
```

### 7.2 动态结局文本生成

```typescript
// 结局文本生成器
interface EndingGenerator {
  generateEnding(context: GameContext): EndingText;
}

// 结局配置示例
endings:
  death_exhaustion:
    base_text: "你在异国的土地上闭上了眼睛。"
    
    # 根据游戏历程追加段落
    append_sections:
      - condition: "has_flag('met_family_expectations')"
        text: "你曾经答应家人要出人头地。"
        
      - condition: "turn.current < 30"
        text: "你只坚持了不到一个月。"
        
      - condition: "resources.money.usd > 1000"
        text: "你的钱包里还有没花完的美元。"
        
      - condition: "has_flag('betrayed_friend')"
        text: "你想起那个被你出卖的朋友，不知道他现在怎么样。"
    
    # 统计数据展示
    stats_display:
      - "存活天数: {{turn.current}}"
      - "总收入: ${{total_income}}"
      - "完成事件: {{events_completed}}"

  asylum_approved:
    base_text: "你的政治庇护申请通过了。"
    
    append_sections:
      - condition: "has_flag('lawyer_paid_full')"
        text: "那$2000律师费没有白花。"
        
      - condition: "get_flag('asylum_submission_strength') == 'weak'"
        text: "你至今不敢相信自己是怎么通过的。也许移民局那天心情好。"
        
      - condition: "has_debuff('pressure')"
        text: "但你知道这只是开始。外面ICE的搜捕还在继续。"
```

**结局文本生成流程**：

```
触发结局
    │
    ▼
获取基础结局文本
    │
    ▼
遍历条件段落
    │
    ├── 条件满足？──▶ 追加到结局文本
    │
    ▼
整合最终结局
    │
    ▼
显示统计数据
    │
    ▼
展示完整结局
```

### 7.3 叙事数据与事件数据的对应关系

| 事件数据 (JSON) | 叙事数据 (YAML) | 运行时结合 |
|----------------|----------------|-----------|
| `id: "act1_work_delivery"` | `events.act1_work_delivery` | 通过ID关联 |
| `trigger.conditions` | `conditional_descriptions[].condition` | 条件表达式共享 |
| `options[].id` | `options[].id` | ID对应 |
| `options[].effect` | `options[].result` | 效果+文本同时展示 |
| `set_flags` | `set_flags` | 叙事层定义，事件层执行 |

---

## 8. 示例：完整事件配置

```yaml
# narrative/events.yaml 中的完整配置

events:
  act1_work_delivery:
    # ========== 基础信息 ==========
    title: "快递分拣临时工"
    
    # ========== 描述文本 ==========
    description: "你在凌晨四点的仓库里，和一群同样疲惫的人一起，把包裹从传送带搬到对应的区域。"
    
    # 条件变体描述
    conditional_descriptions:
      - condition: "mental < 30"
        text: "你在凌晨四点的仓库里，眼神空洞地望着永不停歇的传送带。每一个包裹都像是在嘲笑你的处境。"
      - condition: "turn.current > 20"
        text: "这是你在仓库的第{{turn.current}}个凌晨。你开始记住哪些同事会在几点偷偷去抽烟。"
    
    # ========== 槽位提示 ==========
    slots_hints:
      identity_slot:
        no_match: "你没有证件，只能做最低薪的理货，时薪¥15。"
        matched: "你的假身份证让你能做点轻松的扫描工作，时薪¥20。"
    
    # ========== 选项配置 ==========
    options:
      - id: "hard_work"
        text: "拼命干，多拿钱"
        result: "你赚了¥120，但腰差点断了。"
        
        # 结果变体
        conditional_results:
          - condition: "physique < 5"
            text: "你的腰发出一声脆响。你赚了¥120，但接下来几天恐怕站不直了。"
          - condition: "physique > 8"
            text: "对你这种体格来说，这工作量刚刚好。你赚了¥120，甚至还有点余力。"
            
        # 设置的标记
        set_flags:
          - { id: "worked_hard_last", type: "BOOLEAN", value: true }
          - { id: "warehouse_shifts", type: "COUNTER", increment: true }
          
      - id: "normal_work"
        text: "正常速度干活"
        result: "你赚了¥80，身体还能撑得住。"
        
      - id: "slack_off"
        text: "偷偷懒"
        condition_hint: "需要：智力≥5"
        result: "你学会了在监控死角休息。只赚了¥50，但至少没把自己累垮。"
        set_flags:
          - { id: "learned_warehouse_loopholes", type: "BOOLEAN", value: true }

# events.json 中的对应配置（数据层）
{
  "id": "act1_work_delivery",
  "category": "FIXED",
  "scenes": ["act1"],
  "execution": {
    "repeatable": true,
    "actionPointCost": 2
  },
  "slots": [
    {
      "id": "identity_slot",
      "tags": ["identity"],
      "required": false
    }
  ],
  "effects": {
    "hard_work": {
      "money": { "cny": 120 },
      "health": -10
    },
    "normal_work": {
      "money": { "cny": 80 },
      "health": -5
    },
    "slack_off": {
      "money": { "cny": 50 },
      "health": 0,
      "condition": { "attribute": "intelligence", "operator": ">=", "value": 5 }
    }
  }
}
```

---

## 9. 本地化支持

### 9.1 多语言文件结构

```
narrative/
├── events.yaml           # 默认语言（中文）
├── events.en.yaml        # 英文
├── events.zh-Hant.yaml   # 繁体中文
└── _templates/           # 文本模板
    └── event_template.yaml
```

### 9.2 本地化变量

```yaml
# 支持变量替换的本地化

# events.zh.yaml
events:
  act1_work_delivery:
    title: "快递分拣临时工"
    description: "你在凌晨四点的仓库里..."

# events.en.yaml  
events:
  act1_work_delivery:
    title: "Parcel Sorting Temp Job"
    description: "It's 4 AM in the warehouse..."
```

---

## 10. 附录

### 10.1 叙事标记命名规范

| 前缀 | 用途 | 示例 |
|-----|------|------|
| `met_` | 遇见NPC | `met_lawyer`, `met_smuggler` |
| `chose_` | 关键选择 | `chose_legal_path`, `chose_underground` |
| `has_` | 拥有状态 | `has_passport`, `has_debt` |
| `knows_` | 知道信息 | `knows_asylum_process` |
| `completed_` | 完成事件 | `completed_english_course` |
| `betrayed_` | 负面行为 | `betrayed_companion` |
| `helped_` | 正面行为 | `helped_stranger` |

### 10.2 常用条件表达式

```yaml
# 属性检查
condition: "physique >= 6"
condition: "intelligence < 5"

# 道具检查
condition: "has_item('fake_ssn')"
condition: "has_item_tag('transport')"

# Debuff检查
condition: "has_debuff('pressure')"
condition: "debuff.intensity >= 3"

# 标记检查
condition: "has_flag('met_lawyer')"
condition: "get_flag('lawyer_relation') >= 7"

# 复合条件
condition: "physique >= 6 AND has_item('water')"
condition: "has_flag('chose_legal_path') OR intelligence >= 7"
condition: "NOT has_flag('betrayed_friend')"

# 场景检查
condition: "scene.current == 'act3'"
condition: "turn.scene >= 10"
```

### 10.3 文本长度建议

| 元素 | 建议长度 | 说明 |
|-----|---------|------|
| 事件标题 | 2-8字 | 简洁明了 |
| 事件描述 | 50-100字 | 建立氛围 |
| 选项文本 | 4-12字 | 清晰可点击 |
| 选项结果 | 20-60字 | 反馈效果 |
| 条件提示 | 5-15字 | 前置要求 |

---

> **维护提示**：本文档应与 EventSystemArchitecture.md 同步维护。修改叙事结构时需更新两个文档。
