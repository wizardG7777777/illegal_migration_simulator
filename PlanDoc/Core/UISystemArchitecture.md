# UI/UX 系统架构设计

本文档定义《去美国》游戏的用户界面与交互系统架构，包含视觉风格规范、界面布局、组件设计、交互流程、动画效果等技术实现规范。

**核心设计原则**：
- **信息密度控制**：参考《Papers, Please》的极简信息密度，避免信息过载
- **情绪优先**：通过视觉设计强化游戏的压抑、焦虑氛围
- **数值隐藏**：避免直接显示"健康-10"，用文案和体感描述代替
- **响应式适配**：支持桌面端和移动端浏览器访问

---

## 2. 视觉风格系统

### 2.1 场景色彩体系

| 场景 | 主色调 | 辅助色 | 强调色 | 氛围关键词 |
|-----|--------|--------|--------|-----------|
| **场景1：国内准备** | `#4A5568` 灰蓝 | `#D69E2E` 雾霾黄 | `#718096` 工业灰 | 压抑、迷茫、困顿 |
| **场景2：跨境穿越** | `#276749` 墨绿 | `#D69E2E` 土黄 | `#9B2C2C` 血迹红 | 危险、紧张、求生 |
| **场景3：美国生存** | `#2B6CB0` 霓虹蓝 | `#C53030` 警灯红 | `#718096` 水泥灰 | 焦虑、冷漠、孤独 |

```typescript
// 场景主题配置
interface SceneTheme {
  id: SceneId;
  colors: {
    primary: string;      // 主色调
    secondary: string;    // 辅助色
    accent: string;       // 强调色
    background: string;   // 背景色
    surface: string;      // 卡片/面板背景
    text: string;         // 主要文字
    textMuted: string;    // 次要文字
    danger: string;       // 危险/警告
    success: string;      // 成功/正面
  };
  fonts: {
    title: string;        // 标题字体
    body: string;         // 正文字体
    mono: string;         // 等宽字体（用于数值）
  };
}

const sceneThemes: Record<SceneId, SceneTheme> = {
  act1: {
    id: 'act1',
    colors: {
      primary: '#4A5568',
      secondary: '#D69E2E',
      accent: '#718096',
      background: '#1A202C',
      surface: '#2D3748',
      text: '#E2E8F0',
      textMuted: '#A0AEC0',
      danger: '#E53E3E',
      success: '#38A169'
    },
    fonts: {
      title: 'Noto Serif SC, serif',
      body: 'Noto Sans SC, sans-serif',
      mono: 'JetBrains Mono, monospace'
    }
  },
  // ... act2, act3 类似配置
};
```

### 2.2 设计灵感参考

- **《Papers, Please》**：极简信息密度， bureaucratic 压抑感
- **《This War of Mine》**：日记体叙事，手绘风格
- **《Beholder》**：监控视角，冷峻色调
- **《Reigns》**：卡片式决策，滑动交互

---

## 3. 界面布局架构

### 3.1 整体布局结构

```
┌─────────────────────────────────────────────────────────────┐
│ [StatusBar] 顶部状态栏                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [NarrativeArea] 主叙事区                                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [DebuffBar] Debuff 栏                                       │
├─────────────────────────────────────────────────────────────┤
│ [EventArea] 事件选择区                                       │
├─────────────────────────────────────────────────────────────┤
│ [QuickBar] 快捷栏（消耗品 + 常驻道具）                        │
└─────────────────────────────────────────────────────────────┘
```

```typescript
// 布局配置接口
interface LayoutConfig {
  // 区域可见性
  visibility: {
    statusBar: boolean;      // 始终显示
    narrativeArea: boolean;  // 始终显示
    debuffBar: boolean;      // 有 Debuff 时显示
    eventArea: boolean;      // 行动阶段显示
    quickBar: boolean;       // 始终显示
  };
  
  // 响应式断点
  breakpoints: {
    mobile: number;    // < 768px
    tablet: number;    // 768px - 1024px
    desktop: number;   // > 1024px
  };
  
  // 区域高度比例（桌面端）
  heightRatios: {
    statusBar: number;     // 约 8%
    narrativeArea: number; // 约 35%
    debuffBar: number;     // 约 8%（可变）
    eventArea: number;     // 约 35%
    quickBar: number;      // 约 14%
  };
}
```

### 3.2 顶部状态栏（StatusBar）

```typescript
interface StatusBarProps {
  // 场景信息
  currentScene: SceneId;
  sceneDisplayName: string;
  turnCount: {
    total: number;
    inScene: number;
  };
  
  // 资源状态
  resources: {
    money: {
      amount: number;
      currency: 'CNY' | 'USD';
    };
    health: {
      current: number;
      max: number;
      status: HealthStatus;  // 'energetic' | 'tired' | 'injured' | 'dying'
    };
    mental: {
      current: number;
      max: number;
      status: MentalStatus;  // 'calm' | 'low' | 'stressed' | 'breaking'
    };
    actionPoints: {
      current: number;
      max: number;
    };
  };
  
  // 终结态警告
  terminalState: TerminalState | null;
}

// 健康状态枚举
enum HealthStatus {
  ENERGETIC = 'energetic',  // 80-100: 💪 精力充沛
  TIRED = 'tired',          // 50-79: 😰 略显疲惫
  INJURED = 'injured',      // 20-49: 🤕 伤痕累累
  DYING = 'dying'           // 0-19: ☠️ 濒死警告
}

enum MentalStatus {
  CALM = 'calm',            // 80-100: 😊 心态平和
  LOW = 'low',              // 50-79: 😔 心情低落
  STRESSED = 'stressed',    // 20-49: 😫 濒临崩溃
  BREAKING = 'breaking'     // 0-19: 💔 崩溃警告
}
```

**状态栏 UI 设计**：

```
┌─────────────────────────────────────────────────────────────┐
│  📍 国内准备  回合 12/50          💰 ¥5,678                  │
│                                 🏥 ████████░░ 略显疲惫       │
│                                 🧠 ██████░░░░ 心情低落       │
│                                 ⚡ ●●● (3/3)                │
└─────────────────────────────────────────────────────────────┘
```

**实现建议**：
- 健康/心理使用分段进度条，每段代表 20 点
- 鼠标悬停显示精确数值 Tooltip
- 终结态时对应资源图标闪烁红色动画

---

## 4. 核心组件设计

### 4.1 主叙事区（NarrativeArea）

```typescript
interface NarrativeAreaProps {
  // 当前事件
  currentEvent: GameEvent | null;
  
  // 历史记录（用于滚动查看）
  history: NarrativeLog[];
  
  // 显示配置
  config: {
    fontSize: 'small' | 'normal' | 'large';
    typewriterEnabled: boolean;  // 打字机效果
    typewriterSpeed: number;     // 毫秒/字
  };
}

interface NarrativeLog {
  id: string;
  timestamp: number;
  type: 'event' | 'random' | 'system' | 'ending';
  title?: string;
  content: string;
  choices?: string[];      // 玩家做出的选择
  results?: string[];      // 产生的结果
}
```

**叙事文本样式**：

```css
.narrative-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-color);
  text-align: justify;
  padding: 1rem;
}

/* 打字机效果 */
.typewriter-cursor::after {
  content: '|';
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

### 4.2 Debuff 栏（DebuffBar）- 常驻显示

Debuff 栏**始终显示在主界面**，采用横向滚动或折叠设计，占用固定高度区域。

```typescript
interface DebuffBarProps {
  debuffs: EnvironmentalDebuff[];
  maxDisplayCount: number;      // 最多显示数量（如 3）
  isExpanded: boolean;          // 是否展开显示全部
  onExpandToggle: () => void;
  onDebuffClick: (debuffId: string) => void;
}

// Debuff 状态指示
interface DebuffIndicatorProps {
  debuff: EnvironmentalDebuff;
  isCompact: boolean;           // 是否紧凑模式
}
```

**常驻 Debuff 栏（紧凑模式）**：

```
┌─────────────────────────────────────────────────────────────┐
│ 状态影响:                                                   │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ [+2 更多 ▼] │
│ │ 🔴 风声鹤唳  │ │ 📈 油价危机  │ │ 🏚️ 露宿街头  │            │
│ │   3/5  4回合 │ │   🚗 ×1.4    │ │   -5健康/回合│            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

**展开模式（点击「更多」后）**：

```
┌─────────────────────────────────────────────────────────────┐
│ 状态影响:                                        [▲ 收起]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🔴 风声鹤唳 (移民执法压力)              剩余: 4回合         │
│ 强度: ████████░░ 3/5                                        │
│ 影响: 检查+20% 打工+15 心理-3/回合 现金+10%                  │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│ 📈 油价危机 (经济型 Debuff)              永久持续           │
│ 通胀率: 🍞×1.0  🏠×1.0  🚗×1.4                            │
│ 来源: 油价暴涨，加满一箱油多花$50                           │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│ 🏚️ 露宿街头 (社交型 Debuff)              直到获得住宿        │
│ 影响: 健康-5/回合 心理-8/回合 行动点-1                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Debuff 图标颜色编码**：

| Debuff 类型 | 颜色 | 图标 |
|------------|------|------|
| pressure (压力型) | 🔴 红色系 | 🔴 |
| economic (经济型) | 📈 黄色系 | 📈 |
| weather (天气型) | 🌧️ 蓝色系 | 🌧️ |
| social (社交型) | 🏚️ 紫色系 | 🏚️ |

**主界面布局（含常驻 Debuff 栏）**：

```
┌─────────────────────────────────────────────────────────────┐
│ [StatusBar] 顶部状态栏                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [NarrativeArea] 主叙事区                                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [DebuffBar] 状态影响栏 (常驻)                               │
│ ┌─────┐ ┌─────┐ ┌─────┐ [更多]                              │
│ └─────┘ └─────┘ └─────┘                                    │
├─────────────────────────────────────────────────────────────┤
│ [EventArea] 事件选择区                                       │
│ ┌─────────────────┐  ┌─────────────────┐                   │
│ │ 💼 超市理货员    │  │ 📚 英语学习      │                   │
│ └─────────────────┘  └─────────────────┘                   │
├─────────────────────────────────────────────────────────────┤
│ [NavigationBar] 底部导航                                     │
│ [🎒 道具] [📜 事件] [👤 状态] [☰ 菜单]                      │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 事件系统界面

事件系统采用**卡片列表 + 全屏详情**的双层设计：
- **主界面**：显示事件卡片列表，仅展示关键信息
- **详情界面**：点击卡片后全屏/弹窗显示完整信息

#### 事件分类标识

```typescript
// 事件分类枚举
enum EventCategory {
  WORK = 'work',           // 打工赚钱 💼
  STUDY = 'study',         // 学习提升 📚
  REST = 'rest',           // 休息恢复 😴
  TRADE = 'trade',         // 交易购物 🛒
  SOCIAL = 'social',       // 社交互动 👥
  PLOT = 'plot',           // 剧情推进 ⭐
  DANGER = 'danger',       // 危险事件 ⚠️
  SPECIAL = 'special',     // 特殊事件 ✨
}

// 分类配置
const eventCategoryConfig: Record<EventCategory, {
  icon: string;
  label: string;
  color: string;
  description: string;
}> = {
  work: { icon: '💼', label: '打工', color: '#38A169', description: '获取收入' },
  study: { icon: '📚', label: '学习', color: '#3182CE', description: '提升属性' },
  rest: { icon: '😴', label: '休息', color: '#805AD5', description: '恢复身心' },
  trade: { icon: '🛒', label: '交易', color: '#D69E2E', description: '买卖物品' },
  social: { icon: '👥', label: '社交', color: '#DD6B20', description: '建立关系' },
  plot: { icon: '⭐', label: '剧情', color: '#E53E3E', description: '推动进程' },
  danger: { icon: '⚠️', label: '危险', color: '#C53030', description: '高风险' },
  special: { icon: '✨', label: '特殊', color: '#D53F8C', description: '独特事件' },
};
```

#### 主界面事件卡片（简化版）

```typescript
interface EventCardCompactProps {
  event: GameEvent;
  category: EventCategory;
  isEnabled: boolean;
  slotStatus: 'matched' | 'partial' | 'locked';  // 槽位匹配状态
  onClick: () => void;
}
```

**可用状态卡片**：

```
┌─────────────────────────────────────────┐
│ 💼 打工                         [2 AP]  │
│ 超市理货员                               │
├─────────────────────────────────────────┤
│ 【预计】💰 +$120  😰 -3  💪 -2          │
│                                         │
│ ✅ 已匹配: 🚗 公交卡                     │
└─────────────────────────────────────────┘
```

**部分匹配卡片**：

```
┌─────────────────────────────────────────┐
│ 📚 学习                         [2 AP]  │
│ 英语提升                                 │
├─────────────────────────────────────────┤
│ 【预计】🧠 智力 +1                      │
│                                         │
│ ⚠️ 可选槽: 未匹配书籍(效果降低)          │
└─────────────────────────────────────────┘
```

**锁定状态卡片**：

```
┌─────────────────────────────────────────┐
│ ⭐ 剧情                         [3 AP]  │
│ 跨境向导                    [🔒 未解锁]  │
├─────────────────────────────────────────┤
│ 【需要】🚗 交通工具类道具                │
│                                         │
│ [查看详情]                               │
└─────────────────────────────────────────┘
```

**冷却中卡片**：

```
┌─────────────────────────────────────────┐
│ 💼 打工                         [2 AP]  │
│ 超市理货员                    [⏳ 3回合] │
├─────────────────────────────────────────┤
│ 【预计】💰 +$120  😰 -3  💪 -2          │
│                                         │
│ 冷却中，暂时无法执行                      │
└─────────────────────────────────────────┘
```

#### 事件详情界面（全屏/弹窗）

```typescript
interface EventDetailModalProps {
  event: GameEvent;
  slotMatchResult: SlotMatchResult;
  onExecute: (optionId?: string, slotOverrides?: Map<string, string>) => void;
  onClose: () => void;
}
```

**事件详情界面布局**：

```
┌─────────────────────────────────────────────────────────────┐
│  💼 打工事件                                    [X 返回]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📦 超市理货员                                               │
│  ─────────────────────────────────────────────────         │
│                                                             │
│  你站在货架前，机械地摆放着商品。货架上的商品琳琅满目，      │
│  但你没有心情欣赏。时薪 $15，但你需要站着工作8小时。         │
│  下班后你的腿几乎不是自己的了。                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  【行动消耗】⚡ 2 AP                                        │
├─────────────────────────────────────────────────────────────┤
│  【槽位匹配】                                                │
│                                                             │
│  🚗 交通方式 (可选槽位)                                     │
│  ┌─────────────────────────────────────────┐                │
│  │ 当前选择: 🚌 公交卡 (优先级: 2)          │                │
│  │ 效果: 通勤时间 -1小时                    │                │
│  │                                         │                │
│  │ [更换道具 ▼]                            │                │
│  │ • 🚶 步行 (耗时正常)                    │
│  │ • 🚗 二手车 (耗时 -2小时, 维护费$30)     │                │
│  └─────────────────────────────────────────┘                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  【预计结果】                                                │
│                                                             │
│  资源变化:                                                  │
│  💰 现金  +$120                                            │
│  😰 心理   -3  (长时间站立的疲惫)                           │
│  💪 体魄   -2  (体力消耗)                                   │
│                                                             │
│  其他效果:                                                  │
│  • 可能触发"顾客投诉"随机事件                               │
│  • 累积打工经验                                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         [确认执行]              [取消]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**强制槽位未匹配的事件详情**：

```
┌─────────────────────────────────────────────────────────────┐
│  ⭐ 剧情事件                                    [X 返回]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🧭 跨境向导                                       [🔒 锁定] │
│  ─────────────────────────────────────────────────         │
│                                                             │
│  雨林深处，向导不耐烦地敲着手表。                          │
│  "兄弟，准备好出发了吗？我们需要交通工具穿越沼泽。"         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  【解锁条件】                                                │
│                                                             │
│  🔒 需要道具标签: transport                                 │
│                                                             │
│  你没有匹配的道具。以下道具可以解锁此事件：                  │
│  • 🚗 破旧二手车 (商店购买, $800)                           │
│  • 🚌 长途巴士票 (一次性, $200)                             │
│  • 🚶 徒步穿越 (需要: 体魄≥12)                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              [前往商店]              [暂时离开]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 事件列表界面

```typescript
interface EventListScreenProps {
  events: GameEvent[];
  categories: EventCategory[];
  selectedCategory: EventCategory | 'all';
  onCategoryChange: (category: EventCategory | 'all') => void;
  onEventClick: (eventId: string) => void;
}
```

```
┌─────────────────────────────────────────────────────────────┐
│  📜 可执行事件                              [🎒] [👤] [☰]  │
├─────────────────────────────────────────────────────────────┤
│  [全部] [💼打工] [📚学习] [😴休息] [🛒交易] [⭐剧情]        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 💼 超市理货员                      [2 AP]  ✅ 已匹配        │
│    预计: 💰 +$120  😰 -3                                   │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│ 📚 英语学习                        [2 AP]  ⚠️ 效果降低      │
│    预计: 🧠 +1 (无书籍时减半)                                │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│ 😴 公园长椅休息                    [1 AP]  ✅ 可用          │
│    预计: 💪 +5  🧠 +2                                       │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│ ⭐ 跨境向导                        [3 AP]  🔒 需要道具      │
│    需要: 🚗 交通工具                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 道具系统界面

道具系统采用**独立界面**设计，通过底部导航栏或快捷键进入，不在主界面常驻显示。

#### 道具管理界面

```typescript
interface InventoryScreenProps {
  consumables: ConsumableItem[];
  permanents: PermanentItem[];
  maxSlots: {
    consumable: number;
    permanent: number;
  };
  sceneWarning: boolean;  // 场景切换警告
  onItemClick: (item: ConsumableItem | PermanentItem) => void;
  onItemUse: (itemId: string, count: number) => void;
  onClose: () => void;
}

// 道具筛选标签
type ItemFilter = 'all' | 'medical' | 'food' | 'book' | 'transport' | 'lodging' | 'tool';
```

**道具管理界面布局**：

```
┌─────────────────────────────────────────────────────────────┐
│  🎒 道具管理                              [X 关闭]          │
├─────────────────────────────────────────────────────────────┤
│  [全部] [医疗] [食物] [书籍] [交通] [住宿] [工具]            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  【消耗品】 8/20槽                             [整理]       │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                │
│  │ 💊 │ │ 🍞 │ │ 💧 │ │ 📖 │ │ 💉 │ │    │                │
│  │ ×3 │ │ ×2 │ │ ×1 │ │ ×1 │ │ ×2 │ │ +  │                │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                │
│  止痛药  面包   矿泉水  英语书   绷带                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  【常驻道具】 4/8槽                          ⚠️ 场景切换清空  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│  │   🚗   │ │   🏠   │ │   📱   │ │   ➕   │               │
│  │  破旧  │ │  合租  │ │  智能  │ │  空槽  │               │
│  │  二手车│ │  房间  │ │  手机  │ │        │               │
│  └────────┘ └────────┘ └────────┘ └────────┘               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  【选中道具详情】                                           │
│  ┌─────────────────────────────────────────┐                │
│  │  🏠 合租房间                     [使用] │                │
│  │  标签: lodging | 优先级: 3              │                │
│  │                                         │                │
│  │  效果:                                  │                │
│  │  • 住宿成本基础 $600/月                 │                │
│  │  • 心理恢复 +2/回合                     │                │
│  │  • 获得【安身之所】状态                 │                │
│  │                                         │                │
│  │  维护费: $0/回合 | 不可删除             │                │
│  └─────────────────────────────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**底部导航栏入口**：

```
┌─────────────────────────────────────────┐
│  [🎒 道具]  [📜 事件]  [👤 状态]  [☰ 菜单] │
└─────────────────────────────────────────┘
```

#### 道具快捷使用（可选）

如果需要在主界面快速使用消耗品，可以在底部导航栏长按「道具」按钮呼出快捷轮盘：

```
        ┌────┐
   ┌────┐ 💊 ┌────┐
   │ 🍞 │    │ 💧 │
   └────┘ ──── └────┘
        │ 📖 │
        └────┘
   松开选择，移开取消
```

---

## 5. 特殊界面

### 5.1 终结态警告界面

#### 濒死状态

```typescript
interface DyingWarningProps {
  window: number;           // 喘息窗口回合数 (0-3)
  currentTurn: number;      // 当前倒计时回合
  onRequestHelp: () => void;
}
```

```
┌─────────────────────────────────────────┐
│                                         │
│                  💀                     │
│                                         │
│          你感到生命力在流失...           │
│                                         │
│    还有 2 回合找到救治，否则...          │
│                                         │
│    ◉ ◉ ○  (体魄决定的喘息窗口)          │
│                                         │
│         [寻找救治途径]                   │
│                                         │
└─────────────────────────────────────────┘
```

**视觉设计**：
- 屏幕边缘红色渐变脉冲动画
- 心跳音效（可选）
- 心跳图标随窗口减少而加速

#### 崩溃状态

```typescript
interface BreakdownWarningProps {
  window: number;           // 崩溃窗口回合数 (1-3)
  currentTurn: number;
}
```

**视觉设计**：
- 屏幕边缘黑色遮罩逐渐收缩
- 倒计时结束时强制触发崩溃冲击事件

### 5.2 月度账单系统（场景3特有）

月度账单是**场景3美国生存**的核心机制之一，用于展示每月固定支出的明细。由于场景3以「现金流管理」为核心玩法，月度账单让玩家清楚了解资金去向。

#### 触发时机

```typescript
interface MonthlyBillTrigger {
  // 每月第1回合自动触发
  triggerTurn: 'first_of_month';  // 场景3中每30回合为一个月
  
  // 也可手动查看
  manualAccess: true;  // 通过状态界面随时查看
}
```

**触发流程**：
1. 回合开始 → 检测是否为每月第1回合
2. 是 → 弹出月度账单界面（模态弹窗，必须查看后关闭）
3. 自动扣除生活费用（现金不足时进入【匮乏】状态）
4. 同时显示债务还款提醒

#### 月度账单界面

```typescript
interface MonthlyBillProps {
  monthNumber: number;          // 第几个月
  
  // 生活成本明细
  livingCosts: {
    food: {
      base: number;             // 基础成本
      rate: number;             // 通胀率
      total: number;            // 实际支出
      description: string;      // 说明（如"基础食品开销"）
    };
    lodging: {
      base: number;
      rate: number;
      total: number;
      itemName: string;         // 当前住宿道具名称
      itemId: string;
    };
    transport: {
      base: number;
      rate: number;
      total: number;
      itemName: string;         // 当前出行道具名称
      itemId: string;
    };
  };
  
  // 债务还款
  debtPayments: {
    debtId: string;
    name: string;               // 如"信用卡"、"网贷"
    amount: number;
    isAutoDeducted: boolean;    // 是否自动扣除
  }[];
  
  // 汇总
  summary: {
    livingCostTotal: number;    // 生活成本总计
    debtPaymentTotal: number;   // 债务还款总计
    grandTotal: number;         // 总支出
    currentMoney: number;       // 扣除前现金
    remainingMoney: number;     // 扣除后现金
    isDeficit: boolean;         // 是否赤字（资金不足）
  };
  
  onClose: () => void;
  onViewDetails: (type: 'living' | 'debt') => void;
}
```

**月度账单界面（每月第1回合自动弹出）**：

```
┌─────────────────────────────────────────────────────────────┐
│  📅 月度账单 - 第3个月                           [X 已知晓]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  💰 月初资金: $2,345                                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  【生活成本】                                               │
│                                                             │
│  🍞 食品    $400 × 1.00           = $400                    │
│     人活着就要吃饭，这笔省不了                               │
│                                                             │
│  🏠 住宿    $600 × 1.00           = $600  [合租房间]         │
│     你的住宿道具，提供基础休息效果                           │
│                                                             │
│  🚗 出行    $100 × 1.40 ⚠️        = $140  [公交卡]           │
│     油价危机影响，出行成本上涨40%                            │
│                                                             │
│  ────────────────────────────────────────────────────────  │
│  生活成本小计: $1,140                                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  【债务还款】(自动扣除)                                      │
│                                                             │
│  💳 信用卡还款                    -$150                     │
│  💸 网贷分期                      -$200                     │
│                                                             │
│  债务还款小计: $350                                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 本月总支出: $1,490                                      │
│                                                             │
│  💵 扣除后剩余: $855                                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ⚠️ 警告: 资金偏低，建议寻找更高收入工作                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**资金不足时的账单界面**：

```
┌─────────────────────────────────────────────────────────────┐
│  📅 月度账单 - 第3个月                           [X 已知晓]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  💰 月初资金: $800                                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  【生活成本】                                               │
│  ...                                                        │
│  生活成本小计: $1,140                                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  【债务还款】(自动扣除)                                      │
│  ...                                                        │
│  债务还款小计: $350                                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 本月总支出: $1,490                                      │
│                                                             │
│  💵 扣除后剩余: ❌ -$690                                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🔴 资金不足!                                               │
│                                                             │
│  你进入了【匮乏】状态:                                       │
│  • 每回合健康 -3                                            │
│  • 每回合心理 -5                                            │
│  • 无法执行部分消费类事件                                    │
│                                                             │
│  建议: 立即寻找收入来源，或考虑变卖道具                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 账单与 Debuff 的关系

月度账单中的**通胀率**直接来自当前激活的 `economic` 类型 Debuff：

```
场景3第1回合:
┌─────────────────────────────────────────────────────────┐
│ 状态影响:                                               │
│ ┌─────────────┐ ┌─────────────┐                        │
│ │ 📈 油价危机  │ │             │                        │
│ │   🚗 ×1.4    │ │             │                        │
│ └─────────────┘ └─────────────┘                        │
└─────────────────────────────────────────────────────────┘
        ↓
月度账单中:
🚗 出行    $100 × 1.40 ⚠️  = $140
```

#### 历史账单查询

玩家可以通过「状态」界面查看历史账单记录：

```
┌─────────────────────────────────────────────────────────────┐
│  📊 财务记录                                                │
├─────────────────────────────────────────────────────────────┤
│  [第1月] [第2月] [第3月] [第4月]                            │
├─────────────────────────────────────────────────────────────┤
│  第2个月账单:                                               │
│  ─────────────────────────────────────────────────────────  │
│  月初资金: $1,800                                           │
│  生活成本: $1,000                                           │
│  债务还款: $500                                             │
│  月末剩余: $300                                             │
│  ─────────────────────────────────────────────────────────  │
│  活跃 Debuff: 无                                            │
│  住宿: 收容所床位 ($0)                                       │
│  出行: 公交卡 ($100)                                         │
└─────────────────────────────────────────────────────────────┘
```

#### 设计目的

1. **透明化支出**：让玩家清楚知道钱花在哪里
2. **强化场景3主题**：现金流管理是核心玩法
3. **Debuff 可视化**：将经济型 Debuff 的影响具象化为账单数字
4. **决策辅助**：帮助玩家判断是否需要更换住宿/出行道具
5. **压力感**：每月固定支出制造「结构性压迫」感

### 5.3 随机事件弹窗

```typescript
interface RandomEventModalProps {
  event: RandomEvent;
  onChoiceSelect: (choiceId: string) => void;
  onClose: () => void;
}
```

```
┌─────────────────────────────────────────┐
│              🌧️ 暴雨突降                │
├─────────────────────────────────────────┤
│ 天空突然乌云密布，大雨倾盆而下。          │
│ 你浑身湿透，找不到避雨的地方...          │
├─────────────────────────────────────────┤
│ 【可选行动】                             │
│                                         │
│ ① 找个屋檐躲雨                          │
│    → 健康 -5, 心理 -3                   │
│                                         │
│ ② 冒雨前行 (需要: 体魄≥8)               │
│    → 健康 -10, 继续前进                  │
│                                         │
│ ③ 使用雨具 (需要: ☂️ 雨伞)              │
│    → 无损失                             │
│                                         │
└─────────────────────────────────────────┘
```

### 5.4 结局展示界面

#### 死亡结局

```typescript
interface DeathEndingProps {
  ending: Ending;
  statistics: {
    totalTurns: number;
    currentScene: SceneId;
    playTime: number;
  };
  onViewStats: () => void;
  onRestart: () => void;
  onLoadSave: () => void;
}
```

```
┌─────────────────────────────────────────┐
│                                         │
│              💀 坠墙身亡                │
│                                         │
│  你失去了抓握的力量，从边境墙上坠落。    │
│  30英尺的高度，足以让一切梦想终结。      │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│                                         │
│  存活回合: 37                           │
│  场景: 场景2 - 边境小镇                   │
│                                         │
│  [查看统计] [重新开始] [读取存档]         │
│                                         │
└─────────────────────────────────────────┘
```

#### 通关结局

```
┌─────────────────────────────────────────┐
│                                         │
│            🎉 绿卡得主                  │
│                                         │
│  经过漫长的等待和无数次的煎熬，          │
│  你终于拿到了那张梦寐以求的绿卡。        │
│  从此，你可以光明正大地生活在这片土地。   │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│                                         │
│  总回合: 127   游戏时长: 4小时           │
│  死亡次数: 3   最终资金: $23,456         │
│                                         │
│  [查看完整统计] [分享结局] [新游戏+]      │
│                                         │
└─────────────────────────────────────────┘
```

---

## 6. 交互流程

### 6.1 回合流程 UI 状态

```typescript
enum TurnPhase {
  TURN_START = 'turn_start',           // 回合开始
  DEBUFF_APPLY = 'debuff_apply',       // 应用 Debuff
  RANDOM_EVENT = 'random_event',       // 随机事件判定
  PLAYER_ACTION = 'player_action',     // 玩家行动阶段
  TURN_END = 'turn_end',               // 回合结束
}

interface TurnFlowUIProps {
  currentPhase: TurnPhase;
  isProcessing: boolean;              // 是否正在处理中
  processingText: string;             // 处理提示文本
}
```

**回合过渡动画**：

```
┌─────────────────────────────────────────┐
│                                         │
│         第 13 回合开始                   │
│                                         │
│    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│              50%                         │
│                                         │
│         正在应用环境效果...               │
│                                         │
└─────────────────────────────────────────┘
```

### 6.2 场景切换动画

```typescript
interface SceneTransitionProps {
  fromScene: SceneId;
  toScene: SceneId;
  transitionType: 'normal' | 'death' | 'success';
  onComplete: () => void;
}
```

**场景1 → 场景2**：
1. 屏幕渐黑（500ms）
2. 显示文字：「你踏上了前往美国的旅程...」（打字机效果）
3. 地图动画：简化的世界地图，从中国移动到南美（2s）
4. **道具清空动画**：常驻道具栏逐个消失（强调「从零开始」）
5. 淡入场景2：「雨林深处，向导在等待」

**场景2 → 场景3**：
1. 根据穿越方式显示不同动画：
   - 货车偷渡：货车行驶动画
   - 沙漠穿越：沙漠行走剪影
   - 攀爬边境墙：攀爬动画
2. 成功：显示「你终于踏上了美国的土地...」
3. 失败：直接跳转到死亡结局

---

## 7. 存档系统 UI

### 7.1 存档管理界面

```typescript
interface SaveManagerUIProps {
  manualSlots: SaveSlot[];
  autoSaves: SaveSlot[];
  onSaveToSlot: (slotIndex: number) => void;
  onLoadFromSlot: (slotIndex: number) => void;
  onDeleteSlot: (slotIndex: number) => void;
  onImport: () => void;
  onExport: (slotIndex: number) => void;
}

interface SaveSlot {
  index: number;
  type: 'MANUAL' | 'AUTO';
  isEmpty: boolean;
  metadata?: SaveMetadata;
}
```

```
┌─────────────────────────────────────────┐
│           📁 存档管理                   │
├─────────────────────────────────────────┤
│ 【手动存档】        [💾 快速存档]       │
│ ┌────────┐ ┌────────┐ ┌────────┐       │
│ │ 存档 1 │ │ 存档 2 │ │ 存档 3 │       │
│ │ [空]   │ │ 回合12 │ │ 回合25 │       │
│ │        │ │ 场景1  │ │ 场景2  │       │
│ └────────┘ └────────┘ └────────┘       │
│                                         │
│ 【自动存档】                            │
│ ┌─────────────────────────────────┐     │
│ │ 🔄 自动 - 回合15 场景2 14:32    │     │
│ └─────────────────────────────────┘     │
│                                         │
│ [导入存档] [导出存档] [删除所有]         │
└─────────────────────────────────────────┘
```

### 7.2 存档预览卡片

```
┌─────────────────────────┐
│ 💾 存档 2    2024-01-15 │
│ 回合 12 / 场景1: 国内准备 │
├─────────────────────────┤
│ 🏥 健康: 85  🧠 心理: 72 │
│ 💰 ¥12,000              │
├─────────────────────────┤
│ ⏱️ 游戏时长: 45分钟      │
│ 💀 濒死次数: 1           │
└─────────────────────────┘
```

---

## 8. 动画与过渡效果

### 8.1 动画时间规范

| 动画类型 | 持续时间 | 缓动函数 |
|---------|---------|---------|
| 页面切换 | 300ms | ease-in-out |
| 弹窗出现 | 200ms | ease-out |
| 弹窗消失 | 150ms | ease-in |
| 打字机效果 | 30ms/字 | linear |
| Debuff 出现 | 400ms | spring |
| 数值变化 | 600ms | ease-out |
| 场景切换 | 2000ms | ease-in-out |
| 终结态警告脉冲 | 1000ms | ease-in-out (infinite) |

### 8.2 关键动画实现

**数值变化动画**：

```typescript
// 使用 CountUp.js 或自定义实现
interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  colorChange?: 'none' | 'green' | 'red';  // 数值变化时颜色闪烁
}
```

**Debuff 出现动画**：

```css
@keyframes debuff-appear {
  0% {
    transform: scale(0.8) translateY(-10px);
    opacity: 0;
  }
  50% {
    transform: scale(1.05) translateY(0);
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.debuff-card {
  animation: debuff-appear 0.4s ease-out;
}
```

**终结态脉冲动画**：

```css
@keyframes terminal-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(229, 62, 62, 0.4);
  }
  50% {
    box-shadow: 0 0 0 20px rgba(229, 62, 62, 0);
  }
}

.terminal-warning {
  animation: terminal-pulse 1s ease-in-out infinite;
}
```

---

## 9. 响应式适配

### 9.1 断点设计

```typescript
const breakpoints = {
  mobile: 768,    // 手机
  tablet: 1024,   // 平板
  desktop: 1280,  // 桌面
  wide: 1536,     // 宽屏
};
```

### 9.2 移动端适配

**布局调整**：
- 顶部状态栏垂直堆叠显示
- 事件卡片单列显示
- 底部固定导航栏：道具 | 事件 | 角色 | 菜单

**手势操作**：
- 左滑：上一回合历史
- 右滑：下一回合历史
- 双击：快速确认
- 长按：显示详情

```typescript
interface MobileGestureConfig {
  swipeThreshold: number;      // 滑动阈值 (px)
  doubleTapDelay: number;      // 双击间隔 (ms)
  longPressDelay: number;      // 长按延迟 (ms)
}
```

---

## 10. 无障碍支持

### 10.1 ARIA 标签规范

```typescript
interface ARIAConfig {
  // 关键元素的 aria-label
  labels: {
    healthBar: string;         // "健康值，当前 85，状态：略显疲惫"
    mentalBar: string;         // "心理值，当前 72，状态：心情低落"
    actionPoint: string;       // "行动点，剩余 3 点"
    eventCard: string;         // "事件：超市理货员，消耗 2 行动点"
    debuffCard: string;        // "Debuff：风声鹤唳，剩余 4 回合"
  };
  
  // 角色描述
  roles: {
    narrativeArea: 'region';
    eventList: 'list';
    eventCard: 'listitem';
    debuffBar: 'region';
    inventory: 'region';
  };
}
```

### 10.2 键盘导航

```typescript
interface KeyboardNavigationConfig {
  shortcuts: {
    'Space': '确认/下一步';
    'Escape': '取消/关闭弹窗';
    'Tab': '在可交互元素间切换';
    'ArrowUp/Down': '在事件列表中移动';
    '1-9': '快速选择对应选项';
    'S': '快速保存';
    'L': '加载存档';
  };
}
```

---

## 11. 状态管理集成

### 11.1 UI State 接口

```typescript
interface UIState {
  // 布局状态
  layout: {
    isMobile: boolean;
    sidebarCollapsed: boolean;
    debuffBarExpanded: boolean;
  };
  
  // 显示配置
  display: {
    fontSize: 'small' | 'normal' | 'large';
    typewriterEnabled: boolean;
    animationsEnabled: boolean;
    reducedMotion: boolean;      // 减少动画
  };
  
  // 当前界面状态
  currentView: 'game' | 'save' | 'settings' | 'statistics';
  modalStack: ModalType[];       // 弹窗栈（支持多层）
  
  // 交互状态
  interaction: {
    selectedEventId: string | null;
    selectedSlotId: string | null;
    hoveredItemId: string | null;
  };
  
  // 历史记录浏览
  history: {
    isViewingHistory: boolean;
    currentHistoryIndex: number;
  };
}

type ModalType = 
  | { type: 'random_event'; eventId: string; }
  | { type: 'ending'; endingId: string; }
  | { type: 'save_manager'; }
  | { type: 'settings'; }
  | { type: 'confirm'; title: string; message: string; onConfirm: () => void; };
```

---

## 12. 性能优化

### 12.1 渲染优化

```typescript
interface PerformanceConfig {
  // 虚拟滚动（历史记录过多时）
  virtualScroll: {
    enabled: boolean;
    itemHeight: number;
    overscan: number;
  };
  
  // 组件懒加载
  lazyLoad: {
    debuffDetails: boolean;      // Debuff 详情懒加载
    eventHistory: boolean;       // 历史记录懒加载
    statistics: boolean;         // 统计页面懒加载
  };
  
  // 动画性能
  animations: {
    useTransform: boolean;       // 使用 transform 代替 top/left
    willChange: boolean;         // 动态添加 will-change
  };
}
```

### 12.2 内存管理

- 历史记录最多保留 100 回合，超出后压缩为摘要
- 图片资源使用懒加载
- 组件卸载时清理定时器和事件监听

---

## 13. 与 Core 系统的对接

### 13.1 数据流

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Core 系统   │ --> │  State 管理  │ --> │  UI 组件    │
│             │     │  (React      │     │             │
│  - 角色状态  │     │   Context/   │     │  - 状态栏   │
│  - 事件系统  │     │   Redux)     │     │  - 事件卡片 │
│  - 物品系统  │     │              │     │  - 道具栏   │
│  - 场景状态  │     │              │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       ↑                                      │
       └────────── 用户交互事件 <─────────────┘
```

### 13.2 核心对接接口

```typescript
// UI 层与 Core 层的对接接口
interface GameUIController {
  // 获取当前状态
  getCurrentState(): GameState;
  
  // 执行事件
  executeEvent(eventId: string, optionId?: string): Promise<EventResult>;
  
  // 使用道具
  useItem(itemId: string, target?: string): Promise<ItemUseResult>;
  
  // 切换槽位道具
  changeSlotItem(slotId: string, itemId: string): void;
  
  // 存档/读档
  saveGame(slotIndex?: number): Promise<SaveResult>;
  loadGame(saveId: string): Promise<LoadResult>;
  
  // 回合控制
  nextTurn(): Promise<void>;
  
  // 订阅状态变更
  subscribe(callback: (state: GameState) => void): () => void;
}
```

---

## 14. 文件命名与目录结构

```
src/
├── components/
│   ├── ui/                    # 基础 UI 组件
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── ProgressBar.tsx
│   │   └── Tooltip.tsx
│   │
│   ├── game/                  # 游戏相关组件
│   │   ├── StatusBar/         # 状态栏
│   │   ├── NarrativeArea/     # 叙事区
│   │   ├── DebuffBar/         # Debuff 栏
│   │   ├── EventCard/         # 事件卡片
│   │   ├── EventList/         # 事件列表
│   │   ├── Inventory/         # 道具栏
│   │   │   ├── ConsumableInventory.tsx
│   │   │   └── PermanentInventory.tsx
│   │   ├── TerminalWarning/   # 终结态警告
│   │   ├── MonthlyBill/       # 月度账单
│   │   └── SceneTransition/   # 场景切换
│   │
│   ├── modals/                # 弹窗组件
│   │   ├── RandomEventModal.tsx
│   │   ├── EndingModal.tsx
│   │   ├── SaveManagerModal.tsx
│   │   └── ConfirmModal.tsx
│   │
│   └── screens/               # 页面级组件
│       ├── GameScreen.tsx
│       ├── SaveScreen.tsx
│       ├── SettingsScreen.tsx
│       └── StatisticsScreen.tsx
│
├── hooks/                     # 自定义 Hooks
│   ├── useGameState.ts
│   ├── useTurnFlow.ts
│   ├── useInventory.ts
│   ├── useSaveManager.ts
│   └── useTheme.ts
│
├── styles/                    # 样式文件
│   ├── themes/                # 主题配置
│   │   ├── act1.ts
│   │   ├── act2.ts
│   │   └── act3.ts
│   ├── animations.css         # 动画定义
│   └── globals.css            # 全局样式
│
└── types/                     # TypeScript 类型
    └── ui.ts
```

---

## 15. 相关文档

- [CharacterSystemArchitecture.md](./CharacterSystemArchitecture.md) - 角色系统（健康/心理状态显示）
- [EventSystemArchitecture.md](./EventSystemArchitecture.md) - 事件系统（事件卡片交互）
- [ItemSystemArchitecture.md](./ItemSystemArchitecture.md) - 物品系统（道具栏 UI）
- [SceneSystemArchitecture.md](./SceneSystemArchitecture.md) - 场景系统（场景切换动画）
- [EndingSystemArchitecture.md](./EndingSystemArchitecture.md) - 结局系统（结局展示界面）
- [SaveSystemArchitecture.md](./SaveSystemArchitecture.md) - 存档系统（存档管理 UI）
- [DebtSystemArchitecture.md](./DebtSystemArchitecture.md) - 债务系统（月度账单展示）
