# UI/UX 系统设计

## 概述

本文档定义《去美国》游戏的用户界面设计规范，涵盖视觉风格、组件设计、交互模式和动画系统。设计以**移动端优先**为核心，兼顾桌面端体验。

**技术栈**：React + TypeScript + TailwindCSS

---

## 1. 设计原则

### 1.1 数值包装化

**禁止直接显示数字**，用文案和视觉元素表达状态变化。

| ❌ 错误 | ✅ 正确 |
|--------|--------|
| "心理健康度 -5" | "你感到一阵焦虑" |
| "身体健康度 +10" | "感觉稍微好一些了" |
| "现金 $420" | "钱包里还有几张钞票" |
| "行动点 3/5" | "还有余力做几件事" |

**文案表达梯度**：

```typescript
// 健康度文案映射
const healthTextMap: Record<number, string> = {
  0: '濒死边缘',
  1: '奄奄一息', 
  2: '虚弱不堪',
  3: '疲惫不堪',
  4: '腰酸背痛',
  5: '马马虎虎',
  6: '尚可支撑',
  7: '精神尚可',
  8: '精力充沛',
  9: '生龙活虎',
  10: '状态极佳'
};

// 现金文案映射（场景3美元）
const cashTextMap = (amount: number): string => {
  if (amount <= 0) return '空空如也';
  if (amount < 50) return '只剩硬币';
  if (amount < 200) return '勉强够用';
  if (amount < 500) return '几张钞票';
  if (amount < 1000) return '小有积蓄';
  if (amount < 3000) return '钱包鼓鼓';
  return '财务自由';
};
```

### 1.2 黑色幽默的叙事风格

**视觉文案基调**：
- 冷静克制的旁观者视角
- 用讽刺和反讽表达荒诞
- 避免说教，让事件本身说话

**示例文案**：
```
【坐吃山空】Debuff 提示：
"你的存款正在以肉眼可见的速度消失，
 就像你的青春一样。"

【风声鹤唳】Debuff 提示：
"唐纳德总统的一条推文，
 让你的房租又涨了10%。"
```

### 1.3 移动端优先

**断点设计**：

| 断点 | 宽度 | 布局策略 |
|-----|------|---------|
| `sm` | 640px | 手机横屏，单列布局 |
| `md` | 768px | 平板竖屏，单列+侧边栏 |
| `lg` | 1024px | 平板横屏/小笔记本 |
| `xl` | 1280px | 桌面端，双栏布局 |

**触控友好规范**：
- 最小点击区域：44×44px
- 按钮间距：≥ 8px
- 文字最小字号：14px（移动端16px）

---

## 2. 界面布局规范

### 2.1 主界面布局

```
┌─────────────────────────────────────┐
│          顶部状态栏 (80px)           │  ← 固定定位
│  场景名 | 资源条 | Debuff指示器       │
├─────────────────────────────────────┤
│                                     │
│          中部事件区 (flex-1)         │  ← 可滚动区域
│     ┌───────────────────────┐       │
│     │     当前事件卡片       │       │
│     └───────────────────────┘       │
│                                     │
│     ┌───────────────────────┐       │
│     │     可用行动列表       │       │
│     └───────────────────────┘       │
│                                     │
├─────────────────────────────────────┤
│          底部行动栏 (60px)           │  ← 固定定位
│   [背包] [结束回合] [设置/菜单]       │
└─────────────────────────────────────┘
```

**布局代码示例**：

```tsx
// MainLayout.tsx
const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
      {/* 顶部状态栏 - 固定 */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-gray-800/95 backdrop-blur z-50 
                         border-b border-gray-700">
        <StatusBar />
      </header>
      
      {/* 中部事件区 - 可滚动 */}
      <main className="flex-1 pt-20 pb-16 px-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          <CurrentEventCard />
          <ActionList />
        </div>
      </main>
      
      {/* 底部行动栏 - 固定 */}
      <footer className="fixed bottom-0 left-0 right-0 h-16 bg-gray-800/95 backdrop-blur 
                         border-t border-gray-700">
        <BottomActionBar />
      </footer>
    </div>
  );
};
```

### 2.2 事件卡片设计

**结构分解**：

```
┌─────────────────────────────────────┐
│ 🎲 随机事件                    ⚡    │  ← 类型标签 + 紧急度
├─────────────────────────────────────┤
│                                     │
│  暴雨                              │  ← 事件标题
│                                     │
│  天空突然暗了下来，豆大的雨点开始   │  ← 场景描述（50-100字）
│  砸向地面。你急忙寻找避雨的地方，   │
│  但似乎无处可去...                  │
│                                     │
├─────────────────────────────────────┤
│ 可选行动:                           │
│ ┌───────────────────────────────┐   │
│ │ □ 找棵大树躲避                 │   │  ← 选项按钮
│ │    效果: 可能被雷劈 ⚡         │   │
│ └───────────────────────────────┘   │
│ ┌───────────────────────────────┐   │
│ │ □ 冒雨前进                     │   │
│ │    需要: 体魄≥8               │   │
│ └───────────────────────────────┘   │
│ ┌───────────────────────────────┐   │
│ │ □ 使用雨衣 [物品]              │   │  ← 带槽位标识
│ │    消耗: 雨衣×1               │   │
│ └───────────────────────────────┘   │
├─────────────────────────────────────┤
│ [槽位区 - 仅固定事件显示]           │
│ 🚗 交通工具: [特斯拉 ▼]             │
├─────────────────────────────────────┤
│         [ 确认执行 ]                │  ← 主行动按钮
└─────────────────────────────────────┘
```

**组件代码**：

```tsx
// EventCard.tsx
interface EventCardProps {
  event: GameEvent;
  type: 'random' | 'fixed' | 'chain';
  urgency?: 'normal' | 'urgent' | 'critical';
}

const EventCard: React.FC<EventCardProps> = ({ event, type, urgency }) => {
  const typeIcons = {
    random: '🎲',
    fixed: '📍',
    chain: '⛓️'
  };
  
  const urgencyClasses = {
    normal: 'border-gray-600',
    urgent: 'border-amber-500/50',
    critical: 'border-red-500/50 animate-pulse-border'
  };
  
  return (
    <div className={`
      rounded-xl border-2 p-4 bg-gray-800
      ${urgencyClasses[urgency || 'normal']}
    `}>
      {/* 头部 */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-400">
          {typeIcons[type]} {type === 'random' ? '随机事件' : type === 'fixed' ? '固定事件' : '事件链'}
        </span>
        {urgency === 'critical' && <span className="text-red-400">⚡ 紧急</span>}
      </div>
      
      {/* 标题和描述 */}
      <h2 className="text-xl font-bold mb-3 text-gray-100">{event.title}</h2>
      <p className="text-gray-300 leading-relaxed mb-4">{event.description}</p>
      
      {/* 选项列表 */}
      <div className="space-y-2">
        <p className="text-sm text-gray-500 mb-2">可选行动:</p>
        {event.options.map((option) => (
          <OptionButton key={option.id} option={option} />
        ))}
      </div>
      
      {/* 槽位区（仅固定事件） */}
      {type === 'fixed' && event.slots && (
        <SlotArea slots={event.slots} />
      )}
    </div>
  );
};
```

### 2.3 结算界面

#### 回合结算

```
┌─────────────────────────────────────┐
│         第 23 天 结束               │
├─────────────────────────────────────┤
│                                     │
│  今日收支                           │
│  ─────────────────────────          │
│  💰 收入        +$120               │  ← 绿色表示增加
│     └─ 送外卖                       │
│  💸 支出        -$40                │  ← 红色表示减少
│     └─ 食品杂货                     │
│  ─────────────────────────          │
│  净变化         +$80                │
│                                     │
├─────────────────────────────────────┤
│  状态变化                           │
│  ─────────────────────────          │
│  🧠 心理: 感觉稍微好一些            │
│  💪 身体: 没有变化                  │
│                                     │
├─────────────────────────────────────┤
│                                     │
│     [ 进入第 24 天 ]                │
│                                     │
└─────────────────────────────────────┘
```

#### 月度结算（场景3特有）

```
┌─────────────────────────────────────┐
│        第 1 个月 结束               │
├─────────────────────────────────────┤
│                                     │
│  💸 月度支出明细                    │
│  ┌───────────────────────────────┐  │
│  │ 🍞 食品      $400 × 1.0 = $400│  │
│  │ 🏠 住宿      $600 × 1.2 = $720│  │  ← 通胀影响高亮
│  │ 🚗 出行      $100 × 1.0 = $100│  │
│  ├───────────────────────────────┤  │
│  │ 合计         $1,220           │  │
│  └───────────────────────────────┘  │
│                                     │
│  ⚠️ 住宿成本因【房租暴涨】上涨 20%   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  钱包状态: 几张钞票 → 勉强够用       │
│                                     │
├─────────────────────────────────────┤
│     [ 进入第 2 个月 ]               │
└─────────────────────────────────────┘
```

**组件代码**：

```tsx
// SettlementModal.tsx
interface SettlementData {
  day: number;
  month?: number;
  income: { amount: number; source: string }[];
  expenses: { amount: number; category: string }[];
  statusChanges: { type: 'health' | 'mental'; text: string }[];
  debuffs?: { name: string; effect: string }[];
}

const SettlementModal: React.FC<{ data: SettlementData; onContinue: () => void }> = 
  ({ data, onContinue }) => {
    const totalIncome = data.income.reduce((sum, i) => sum + i.amount, 0);
    const totalExpense = data.expenses.reduce((sum, e) => sum + e.amount, 0);
    const netChange = totalIncome - totalExpense;
    
    return (
      <Modal>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-100">
            第 {data.month ? `${data.month} 个月` : `${data.day} 天`} 结束
          </h2>
        </div>
        
        {/* 收支明细 */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            今日收支
          </h3>
          
          <div className="border-t border-gray-700 pt-3">
            {data.income.map((inc, idx) => (
              <div key={idx} className="flex justify-between text-green-400">
                <span>💰 {inc.source}</span>
                <span>+${inc.amount}</span>
              </div>
            ))}
            {data.expenses.map((exp, idx) => (
              <div key={idx} className="flex justify-between text-red-400">
                <span>💸 {exp.category}</span>
                <span>-${exp.amount}</span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-700 pt-2 flex justify-between font-bold">
            <span className="text-gray-300">净变化</span>
            <span className={netChange >= 0 ? 'text-green-400' : 'text-red-400'}>
              {netChange >= 0 ? '+' : ''}${netChange}
            </span>
          </div>
        </div>
        
        {/* 状态变化 */}
        {data.statusChanges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              状态变化
            </h3>
            {data.statusChanges.map((change, idx) => (
              <p key={idx} className="text-gray-300">
                {change.type === 'health' ? '💪' : '🧠'} {change.text}
              </p>
            ))}
          </div>
        )}
        
        <Button onClick={onContinue} variant="primary" fullWidth>
          继续
        </Button>
      </Modal>
    );
  };
```

### 2.4 结局界面

```
┌─────────────────────────────────────┐
│                                     │
│           🏁 游戏结束                │
│                                     │
├─────────────────────────────────────┤
│                                     │
│     "你倒在了离边境墙只有            │
│       50米的地方"                   │
│                                     │
│         —— 渴死（场景2）             │
│                                     │
├─────────────────────────────────────┤
│  游戏历程                           │
│  ─────────────────────────          │
│  存活天数:      47天                │
│  经历场景:      国内准备 → 跨境穿越 │
│  获得成就:      电子宠物纪念章       │
│  临终遗言:      "下辈子还来"        │
│                                     │
├─────────────────────────────────────┤
│  详细统计                           │
│  ─────────────────────────          │
│  完成事件:      23个                │
│  最高现金:      ¥12,450             │
│  阅读书籍:      3本                 │
│  结识同伴:      2人                 │
│                                     │
├─────────────────────────────────────┤
│                                     │
│   [ 重新开始 ]    [ 分享结局 ]       │
│                                     │
│   [ 返回主菜单 ]                    │
│                                     │
└─────────────────────────────────────┘
```

---

## 3. 组件设计

### 3.1 ResourceBar（资源条）

**功能**：显示健康、心理、现金、行动点四项核心资源

**设计**：

```
移动端（垂直堆叠）:
┌─────────────────┐
│ 💪 ████████░░   │  ← 健康度（体魄图标）
│ 🧠 ██████░░░░   │  ← 心理度
│ 💰 几张钞票     │  ← 现金（文字描述）
│ ⚡ ▓▓▓▓░ 3/5    │  ← 行动点
└─────────────────┘

桌面端（水平排列）:
┌─────────────────────────────────────────────────┐
│ 💪 ████████░░  🧠 ██████░░░░  💰 几张钞票  ⚡ ▓▓▓▓░
└─────────────────────────────────────────────────┘
```

**组件代码**：

```tsx
// ResourceBar.tsx
interface ResourceBarProps {
  health: number;      // 0-10
  mental: number;      // 0-10
  cash: number;
  currency: 'CNY' | 'USD';
  actionPoints: { current: number; max: number };
  debuffs: Debuff[];
}

const ResourceBar: React.FC<ResourceBarProps> = ({
  health, mental, cash, currency, actionPoints, debuffs
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
      {/* 健康度 */}
      <ResourceIndicator 
        icon="💪"
        value={health}
        max={10}
        colorClass="bg-red-500"
        label={getHealthText(health)}
      />
      
      {/* 心理度 */}
      <ResourceIndicator 
        icon="🧠"
        value={mental}
        max={10}
        colorClass="bg-blue-500"
        label={getMentalText(mental)}
      />
      
      {/* 现金 */}
      <div className="flex items-center gap-2">
        <span className="text-xl">{currency === 'CNY' ? '¥' : '$'}</span>
        <span className="text-sm text-gray-300">{getCashText(cash)}</span>
      </div>
      
      {/* 行动点 */}
      <div className="flex items-center gap-2">
        <span className="text-xl">⚡</span>
        <ActionPointIndicator current={actionPoints.current} max={actionPoints.max} />
      </div>
      
      {/* Debuff 指示器 */}
      {debuffs.length > 0 && (
        <div className="flex gap-1">
          {debuffs.map(debuff => (
            <DebuffIndicator key={debuff.id} debuff={debuff} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
};

// 资源指示器子组件
const ResourceIndicator: React.FC<{
  icon: string;
  value: number;
  max: number;
  colorClass: string;
  label: string;
}> = ({ icon, value, max, colorClass, label }) => {
  const percentage = (value / max) * 100;
  
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${colorClass} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
};

// 行动点指示器
const ActionPointIndicator: React.FC<{ current: number; max: number }> = 
  ({ current, max }) => {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <div 
            key={i}
            className={`w-3 h-3 rounded-sm ${
              i < current ? 'bg-amber-400' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };
```

### 3.2 EventCard（事件卡片）

已在前文 2.2 中详细定义，此处补充变体样式：

```typescript
// 事件卡片变体
type EventCardVariant = 
  | 'default'      // 普通事件
  | 'random'       // 随机事件（带骰子图标）
  | 'chain'        // 事件链（带链条图标）
  | 'terminal'     // 终结态事件（红色边框）
  | 'policy'       // 政策事件（场景3特有，金色边框）
  | 'miracle';     // 奇迹事件（彩虹边框）

// 样式映射
const variantStyles: Record<EventCardVariant, string> = {
  default: 'border-gray-600',
  random: 'border-purple-500/50',
  chain: 'border-amber-500/50',
  terminal: 'border-red-600',
  policy: 'border-amber-400',
  miracle: 'border-gradient-to-r from-purple-400 via-pink-400 to-amber-400'
};
```

### 3.3 ActionButton（行动按钮）

**功能**：显示可执行事件，支持槽位展示

**状态变体**：

```
┌─────────────────────────────────────┐
│ 正常状态                            │
│ ┌───────────────────────────────┐   │
│ │ 🚴 送外卖                      │   │
│ │    预计: 行动点-2  收入+$60    │   │
│ └───────────────────────────────┘   │
├─────────────────────────────────────┤
│ 禁用状态（槽位未满足）               │
│ ┌───────────────────────────────┐   │
│ │ 🏋️ 健身房训练 [灰色]           │   │
│ │    ❌ 缺少: 健身会员卡         │   │
│ └───────────────────────────────┘   │
├─────────────────────────────────────┤
│ 选中状态                            │
│ ┌───────────────────────────────┐   │
│ │ 🚴 送外卖 [蓝色边框]            │   │
│ │ ┌─────────────────────────┐   │   │
│ │ │ 槽位: 🚗 [特斯拉 ▼]     │   │   │
│ │ │      🆔 [假SSN ▼]       │   │   │
│ │ └─────────────────────────┘   │   │
│ │    预计: 行动点-1  收入+$78    │   │
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

**组件代码**：

```tsx
// ActionButton.tsx
interface ActionButtonProps {
  event: FixedEvent;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string;
  equippedSlots?: Record<string, PermanentItem>;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  event, isSelected, isDisabled, disabledReason, equippedSlots, onClick
}) => {
  // 计算最终数值
  const stats = calculateEventStats(event, equippedSlots);
  
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        w-full text-left p-3 rounded-lg border-2 transition-all
        ${isDisabled 
          ? 'bg-gray-800/50 border-gray-700 opacity-60 cursor-not-allowed' 
          : isSelected
            ? 'bg-gray-700 border-blue-500'
            : 'bg-gray-800 border-gray-600 hover:border-gray-500'
        }
      `}
    >
      {/* 标题行 */}
      <div className="flex justify-between items-start mb-2">
        <span className="font-medium text-gray-100">{event.name}</span>
        {event.slots && event.slots.length > 0 && (
          <span className="text-xs text-gray-500">
            {event.slots.length}个槽位
          </span>
        )}
      </div>
      
      {/* 禁用原因 */}
      {isDisabled && disabledReason && (
        <p className="text-sm text-red-400">❌ {disabledReason}</p>
      )}
      
      {/* 选中时显示槽位配置 */}
      {isSelected && event.slots && (
        <SlotConfigurator 
          slots={event.slots} 
          equipped={equippedSlots}
          onChange={(slotId, item) => {/* 更新槽位 */}}
        />
      )}
      
      {/* 预计效果 */}
      {!isDisabled && (
        <p className="text-sm text-gray-400 mt-2">
          预计: 行动点-{stats.apCost}
          {stats.income > 0 && `  收入+$${stats.income}`}
        </p>
      )}
    </button>
  );
};

// 槽位配置器
const SlotConfigurator: React.FC<{
  slots: ItemSlot[];
  equipped: Record<string, PermanentItem>;
  onChange: (slotId: string, item: PermanentItem) => void;
}> = ({ slots, equipped, onChange }) => {
  return (
    <div className="mt-3 pt-3 border-t border-gray-600 space-y-2">
      {slots.map(slot => {
        const selectedItem = equipped[slot.id];
        return (
          <div key={slot.id} className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">{slot.name}:</span>
            <select
              value={selectedItem?.id || ''}
              onChange={(e) => {/* 处理选择 */}}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 
                         text-gray-300 focus:border-blue-500 outline-none"
            >
              <option value="">无</option>
              {/* 可选道具列表 */}
            </select>
            {selectedItem?.slotEffects && (
              <span className="text-xs text-green-400">
                {formatSlotEffects(selectedItem.slotEffects)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
```

### 3.4 DebuffIndicator（Debuff图标）

**功能**：显示当前生效的负面状态

**类型分类**：

```typescript
interface Debuff {
  id: string;
  name: string;
  type: 'health' | 'mental' | 'economic' | 'pressure' | 'environmental';
  intensity?: 1 | 2 | 3 | 4 | 5;  // 压力类特有
  duration: number;  // 剩余回合，-1表示永久
  description: string;
}

// 类型图标映射
const debuffIcons: Record<Debuff['type'], string> = {
  health: '🩹',      // 健康类
  mental: '😰',      // 心理类
  economic: '📈',    // 经济类（通胀）
  pressure: '🚨',    // 执法压力类
  environmental: '🌍' // 环境类
};

// 强度颜色映射（压力类）
const intensityColors: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-amber-400',
  3: 'text-orange-400',
  4: 'text-red-400',
  5: 'text-red-600'
};
```

**显示方式**：

```
小尺寸（状态栏）:
🚨  🩹  📈

中尺寸（详情面板）:
┌─────────────────────┐
│ 🚨 风声鹤唳         │
│    持续: 5回合      │
└─────────────────────┘

大尺寸（带详情）:
┌─────────────────────────────────────┐
│ 🚨 风声鹤唳（强度3/5）              │
├─────────────────────────────────────┤
│ 来源: 唐纳德总统宣布排除ICE净化美国  │
│                                     │
│ 效果:                               │
│ • 突击检查概率 +20%                 │
│ • 打工收入 -15%                     │
│ • 心理/回合 -3                      │
│                                     │
│ 剩余: 5回合                         │
└─────────────────────────────────────┘
```

**组件代码**：

```tsx
// DebuffIndicator.tsx
interface DebuffIndicatorProps {
  debuff: Debuff;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const DebuffIndicator: React.FC<DebuffIndicatorProps> = ({
  debuff, size = 'md', showDetails = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-12 h-12 text-2xl'
  };
  
  const colorClass = debuff.type === 'pressure' && debuff.intensity
    ? intensityColors[debuff.intensity]
    : 'text-gray-400';
  
  if (showDetails || isExpanded) {
    return (
      <div className="bg-gray-800 rounded-lg p-3 border border-gray-600">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{debuffIcons[debuff.type]}</span>
          <span className="font-medium text-gray-100">{debuff.name}</span>
          {debuff.intensity && (
            <span className={`text-sm ${intensityColors[debuff.intensity]}`}>
              强度{debuff.intensity}/5
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mb-3">{debuff.description}</p>
        {debuff.duration > 0 && (
          <p className="text-xs text-gray-500">剩余: {debuff.duration}回合</p>
        )}
        {debuff.duration === -1 && (
          <p className="text-xs text-amber-500">永久生效</p>
        )}
      </div>
    );
  }
  
  return (
    <button
      onClick={() => setIsExpanded(true)}
      className={`
        ${sizeClasses[size]} rounded-full bg-gray-700 
        flex items-center justify-center
        hover:bg-gray-600 transition-colors
        ${colorClass}
      `}
      title={debuff.name}
    >
      {debuffIcons[debuff.type]}
    </button>
  );
};
```

### 3.5 Modal/Dialog（弹窗）

**功能**：用于结算、确认、提示等场景

**变体类型**：

```tsx
type ModalVariant = 
  | 'default'    // 普通信息
  | 'confirm'    // 需要确认
  | 'warning'    // 警告
  | 'danger'     // 危险操作
  | 'success'    // 成功提示
  | 'settlement' // 回合/月度结算
  | 'ending';    // 游戏结局
```

**组件代码**：

```tsx
// Modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  variant?: ModalVariant;
  title?: string;
  children: React.ReactNode;
  actions?: {
    primary?: { label: string; onClick: () => void };
    secondary?: { label: string; onClick: () => void };
  };
}

const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, variant = 'default', title, children, actions
}) => {
  if (!isOpen) return null;
  
  const variantStyles: Record<ModalVariant, string> = {
    default: 'border-gray-600',
    confirm: 'border-blue-500',
    warning: 'border-amber-500',
    danger: 'border-red-500',
    success: 'border-green-500',
    settlement: 'border-purple-500',
    ending: 'border-amber-400'
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className={`
        relative w-full max-w-md rounded-2xl 
        bg-gray-800 border-2 ${variantStyles[variant]}
        shadow-2xl overflow-hidden
        animate-modal-enter
      `}>
        {/* 标题栏 */}
        {title && (
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-bold text-gray-100">{title}</h3>
          </div>
        )}
        
        {/* 内容区 */}
        <div className="p-6">
          {children}
        </div>
        
        {/* 操作按钮 */}
        {actions && (
          <div className="px-6 py-4 border-t border-gray-700 flex gap-3 justify-end">
            {actions.secondary && (
              <Button 
                variant="secondary" 
                onClick={actions.secondary.onClick}
              >
                {actions.secondary.label}
              </Button>
            )}
            {actions.primary && (
              <Button 
                variant={variant === 'danger' ? 'danger' : 'primary'}
                onClick={actions.primary.onClick}
              >
                {actions.primary.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Button 组件
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children, variant = 'primary', size = 'md', 
  fullWidth, onClick, disabled
}) => {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-500 text-white',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
    ghost: 'bg-transparent hover:bg-gray-700 text-gray-300'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        rounded-lg font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {children}
    </button>
  );
};
```

---

## 4. 动画/过渡规范

### 4.1 场景切换动画

```css
/* 场景切换 - 淡出淡入 */
@keyframes scene-fade-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
}

@keyframes scene-fade-in {
  from { opacity: 0; transform: scale(1.05); }
  to { opacity: 1; transform: scale(1); }
}

.scene-exit {
  animation: scene-fade-out 0.3s ease-out forwards;
}

.scene-enter {
  animation: scene-fade-in 0.4s ease-out forwards;
}
```

**React 实现**：

```tsx
// SceneTransition.tsx
import { CSSTransition, TransitionGroup } from 'react-transition-group';

const SceneTransition: React.FC<{ sceneId: string; children: React.ReactNode }> = 
  ({ sceneId, children }) => {
    return (
      <TransitionGroup>
        <CSSTransition
          key={sceneId}
          timeout={{ enter: 400, exit: 300 }}
          classNames="scene"
        >
          <div className="scene-content">{children}</div>
        </CSSTransition>
      </TransitionGroup>
    );
  };
```

### 4.2 数值变化动画

```css
/* 数值变化 - 弹出提示 */
@keyframes value-pop {
  0% { opacity: 0; transform: translateY(10px) scale(0.8); }
  20% { opacity: 1; transform: translateY(-5px) scale(1.1); }
  100% { opacity: 0; transform: translateY(-30px) scale(1); }
}

.value-change {
  position: absolute;
  animation: value-pop 1s ease-out forwards;
  pointer-events: none;
}

.value-change.positive {
  color: #4ade80;  /* green-400 */
}

.value-change.negative {
  color: #f87171;  /* red-400 */
}
```

**React Hook**：

```tsx
// useValueAnimation.ts
export const useValueAnimation = () => {
  const [animations, setAnimations] = useState<Array<{
    id: string;
    value: string;
    type: 'positive' | 'negative';
    x: number;
    y: number;
  }>>([]);
  
  const triggerAnimation = (
    value: string, 
    type: 'positive' | 'negative',
    elementRef: React.RefObject<HTMLElement>
  ) => {
    const rect = elementRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const id = Math.random().toString(36);
    setAnimations(prev => [...prev, {
      id, value, type,
      x: rect.left + rect.width / 2,
      y: rect.top
    }]);
    
    setTimeout(() => {
      setAnimations(prev => prev.filter(a => a.id !== id));
    }, 1000);
  };
  
  return { animations, triggerAnimation };
};
```

### 4.3 事件出现/消失动画

```css
/* 事件卡片进入 */
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 事件卡片退出 */
@keyframes card-exit {
  to {
    opacity: 0;
    transform: translateX(-100%);
  }
}

.event-card-enter {
  animation: card-enter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.event-card-exit {
  animation: card-exit 0.2s ease-in forwards;
}
```

### 4.4 按钮交互反馈

```css
/* 按钮点击反馈 */
.btn-click-feedback {
  transition: transform 0.1s, background-color 0.2s;
}

.btn-click-feedback:active {
  transform: scale(0.95);
}

/* 按钮加载状态 */
@keyframes btn-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.btn-loading {
  background: linear-gradient(
    90deg, 
    transparent 0%, 
    rgba(255,255,255,0.2) 50%, 
    transparent 100%
  );
  background-size: 200% 100%;
  animation: btn-loading 1.5s infinite;
}
```

### 4.5 Debuff 出现动画

```css
/* Debuff 添加时的抖动警告 */
@keyframes debuff-shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
  20%, 40%, 60%, 80% { transform: translateX(3px); }
}

@keyframes debuff-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
}

.debuff-new {
  animation: 
    debuff-shake 0.5s ease-in-out,
    debuff-pulse 1s ease-out;
}
```

---

## 5. TailwindCSS 配置

### 5.1 自定义颜色

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 主色调 - 深灰系（低调冷静）
        gray: {
          850: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        
        // 强调色
        primary: {
          DEFAULT: '#3b82f6',  // blue-500
          dark: '#1d4ed8',     // blue-700
          light: '#60a5fa',    // blue-400
        },
        
        // 状态色
        danger: {
          DEFAULT: '#ef4444',  // red-500
          dark: '#b91c1c',     // red-700
        },
        warning: {
          DEFAULT: '#f59e0b',  // amber-500
          dark: '#b45309',     // amber-700
        },
        success: {
          DEFAULT: '#22c55e',  // green-500
          dark: '#15803d',     // green-700
        },
        
        // 场景专属色
        scene: {
          act1: '#8b5cf6',     // violet-500（场景1：准备）
          act2: '#f97316',     // orange-500（场景2：穿越）
          act3: '#06b6d4',     // cyan-500（场景3：生存）
        },
        
        // 终结态警示色
        terminal: {
         濒死: '#dc2626',      // red-600
          崩溃: '#7c3aed',      // violet-600
          匮乏: '#ca8a04',      // yellow-600
        }
      },
      
      // 自定义间距
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // 自定义动画
      animation: {
        'modal-enter': 'modal-enter 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'pulse-border': 'pulse-border 2s infinite',
      },
      
      keyframes: {
        'modal-enter': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        'pulse-border': {
          '0%, 100%': { borderColor: 'rgba(239, 68, 68, 0.5)' },
          '50%': { borderColor: 'rgba(239, 68, 68, 1)' },
        },
      },
      
      // 字体
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
```

### 5.2 常用工具类组合

```css
/* 可以在 CSS 中预定义常用组合 */
@layer components {
  .card-base {
    @apply rounded-xl bg-gray-800 border border-gray-700 p-4;
  }
  
  .card-interactive {
    @apply card-base hover:border-gray-600 transition-colors cursor-pointer;
  }
  
  .text-gradient {
    @apply bg-clip-text text-transparent bg-gradient-to-r;
  }
  
  .btn-base {
    @apply px-4 py-2 rounded-lg font-medium transition-all duration-200;
  }
  
  .icon-btn {
    @apply w-10 h-10 rounded-full flex items-center justify-center 
           bg-gray-700 hover:bg-gray-600 transition-colors;
  }
  
  .safe-area-inset {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
}
```

---

## 6. 主题变量（暗黑模式）

### 6.1 CSS 变量定义

```css
/* globals.css */
:root {
  /* 背景色 */
  --bg-primary: #030712;       /* gray-950 */
  --bg-secondary: #111827;     /* gray-900 */
  --bg-tertiary: #1f2937;      /* gray-800 */
  --bg-elevated: #374151;      /* gray-700 */
  
  /* 文字色 */
  --text-primary: #f9fafb;     /* gray-50 */
  --text-secondary: #d1d5db;   /* gray-300 */
  --text-tertiary: #9ca3af;    /* gray-400 */
  --text-muted: #6b7280;       /* gray-500 */
  
  /* 边框 */
  --border-default: #374151;   /* gray-700 */
  --border-hover: #4b5563;     /* gray-600 */
  
  /* 强调色 */
  --accent-primary: #3b82f6;   /* blue-500 */
  --accent-success: #22c55e;   /* green-500 */
  --accent-warning: #f59e0b;   /* amber-500 */
  --accent-danger: #ef4444;    /* red-500 */
  
  /* 场景色 */
  --scene-act1: #8b5cf6;
  --scene-act2: #f97316;
  --scene-act3: #06b6d4;
}
```

### 6.2 组件使用变量

```tsx
// 示例：使用 CSS 变量的组件
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      borderColor: 'var(--border-default)',
      color: 'var(--text-primary)'
    }} className="rounded-xl border p-4">
      {children}
    </div>
  );
};
```

### 6.3 场景主题切换

```tsx
// 根据当前场景动态调整主题
const useSceneTheme = (sceneId: SceneId) => {
  useEffect(() => {
    const root = document.documentElement;
    
    const sceneColors = {
      act1: '#8b5cf6',
      act2: '#f97316', 
      act3: '#06b6d4'
    };
    
    root.style.setProperty('--accent-scene', sceneColors[sceneId]);
    root.style.setProperty('--scene-indicator', sceneColors[sceneId]);
    
    // 添加场景类名用于特定样式
    document.body.className = `scene-${sceneId}`;
  }, [sceneId]);
};
```

---

## 7. 响应式设计规范

### 7.1 断点适配表

| 组件 | 移动端 (<768px) | 平板 (768-1024px) | 桌面端 (>1024px) |
|-----|----------------|------------------|-----------------|
| 状态栏 | 垂直堆叠 | 水平排列 | 水平排列 |
| 事件卡片 | 全宽 | 全宽 | 居中最大宽 640px |
| 行动列表 | 单列 | 双列网格 | 双列网格 |
| 结算弹窗 | 全屏 | 居中模态框 | 居中模态框 |
| 底部栏 | 固定底部 | 固定底部 | 可选侧边栏 |

### 7.2 字体大小适配

```css
/* 响应式字体 */
.text-responsive-xl {
  @apply text-lg md:text-xl lg:text-2xl;
}

.text-responsive-lg {
  @apply text-base md:text-lg lg:text-xl;
}

.text-responsive-base {
  @apply text-sm md:text-base;
}

.text-responsive-sm {
  @apply text-xs md:text-sm;
}
```

### 7.3 触控优化

```css
/* 触控区域优化 */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* 间距优化 */
.touch-spacing {
  gap: 12px;
}

@media (min-width: 768px) {
  .touch-spacing {
    gap: 16px;
  }
}
```

---

## 8. 可访问性规范

### 8.1 颜色对比度

- 正文文字与背景对比度 ≥ 4.5:1
- 大文字（18px+）对比度 ≥ 3:1
- 交互元素对比度 ≥ 3:1

### 8.2 键盘导航

```tsx
// 支持键盘导航的组件示例
const ActionButton: React.FC = () => {
  return (
    <button
      className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                 focus:ring-offset-gray-900"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      执行
    </button>
  );
};
```

### 8.3 屏幕阅读器支持

```tsx
// 资源条的屏幕阅读器文本
const ResourceBar: React.FC = () => {
  return (
    <div role="region" aria-label="角色状态">
      <div role="status" aria-live="polite">
        <span className="sr-only">
          健康状态: {healthText}, 心理状态: {mentalText}, 
          现金: {cashText}, 行动点: {currentAp}点
        </span>
      </div>
      {/* 视觉内容 */}
    </div>
  );
};
```

---

## 9. 文件结构

```
src/
├── components/
│   ├── ui/                    # 基础UI组件
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   └── Icon.tsx
│   │
│   ├── game/                  # 游戏专用组件
│   │   ├── ResourceBar.tsx
│   │   ├── EventCard.tsx
│   │   ├── ActionButton.tsx
│   │   ├── DebuffIndicator.tsx
│   │   ├── SettlementModal.tsx
│   │   └── EndingScreen.tsx
│   │
│   └── layout/                # 布局组件
│       ├── MainLayout.tsx
│       ├── StatusBar.tsx
│       ├── EventArea.tsx
│       └── BottomActionBar.tsx
│
├── hooks/                     # 自定义Hooks
│   ├── useValueAnimation.ts
│   ├── useSceneTheme.ts
│   └── useMediaQuery.ts
│
├── styles/                    # 样式文件
│   ├── globals.css
│   ├── animations.css
│   └── themes.css
│
└── utils/                     # 工具函数
    ├── textMappings.ts        # 数值文案映射
    └── formatters.ts
```

---

## 10. 设计检查清单

### 新功能开发时检查

- [ ] 移动端布局是否正常
- [ ] 数值变化是否有文案包装（不直接显示数字）
- [ ] 交互元素最小点击区域 44×44px
- [ ] 颜色对比度是否符合 WCAG 标准
- [ ] 键盘导航是否可用
- [ ] 动画是否有 prefers-reduced-motion 支持
- [ ] 暗黑模式下颜色是否正确

### 代码提交前检查

- [ ] Tailwind 类名是否遵循设计规范
- [ ] 自定义颜色是否使用 theme 变量
- [ ] 动画是否使用预设 keyframes
- [ ] 组件 props 是否有完整类型定义
- [ ] 无障碍属性是否齐全
