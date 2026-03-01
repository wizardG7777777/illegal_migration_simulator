# 组件库使用指南

## 目录结构

```
src/components/
├── primitives/          # 原子组件（基础UI元素）
│   ├── Button.tsx      # 按钮
│   ├── Card.tsx        # 卡片容器
│   ├── ProgressBar.tsx # 进度条
│   ├── AttributeBar.tsx # 属性条（0-20）
│   ├── ResourceBar.tsx # 资源条（0-100）
│   ├── MoneyDisplay.tsx # 金钱显示
│   ├── Badge.tsx       # 徽章/标签
│   └── index.ts        # 统一导出
│
├── modules/            # 模块组件（业务组件）
│   ├── EventCard.tsx      # 事件卡片
│   ├── CharacterPanel.tsx # 角色面板
│   ├── StatusBar.tsx      # 状态条
│   ├── TerminalAlert.tsx  # 终结态警告
│   ├── InventoryGrid.tsx  # 物品网格
│   ├── DebuffIcon.tsx     # Debuff图标
│   └── index.ts           # 统一导出
│
└── README.md           # 本文件
```

## 使用示例

### 1. 原子组件

```tsx
import { 
  Button, 
  Card, 
  ProgressBar, 
  AttributeBar, 
  ResourceBar,
  MoneyDisplay,
  Badge 
} from '@/components/primitives';

// 按钮
<Button variant="primary" size="md" onClick={handleClick}>
  确认
</Button>

// 卡片
<Card header="标题" footer="底部">
  内容
</Card>

// 进度条
<ProgressBar current={75} max={100} color="green" showValue />

// 属性条（六维属性）
<AttributeBar attributeKey="physique" value={15} />

// 资源条
<ResourceBar type="health" current={80} max={100} />

// 金钱显示
<MoneyDisplay amount={1000} currency="USD" />

// 徽章
<Badge variant="danger">警告</Badge>
```

### 2. 模块组件

```tsx
import {
  EventCard,
  CharacterPanel,
  StatusBar,
  TerminalAlert,
  InventoryGrid,
  DebuffIcon,
} from '@/components/modules';

// 角色面板
<CharacterPanel 
  character={gameState.character} 
  currentScene={gameState.scene.currentScene}
/>

// 状态条
<StatusBar 
  scene={gameState.scene} 
  turnCount={gameState.scene.turnCount}
/>

// 终结态警告
<TerminalAlert 
  terminalState="DYING" 
  countdown={2}
/>

// 事件卡片
<EventCard
  event={currentEvent}
  inventoryItems={availableItems}
  characterAttributes={character.attributes}
  onExecute={handleExecuteEvent}
/>

// 物品网格
<InventoryGrid
  consumables={consumableItems}
  permanents={permanentItems}
  onUseItem={handleUseItem}
/>

// Debuff图标
<DebuffIcon debuff={activeDebuff} showTooltip />
```

## 组件依赖关系

```
模块组件 → 原子组件

EventCard → Card, Button, Badge
CharacterPanel → Card, AttributeBar, ResourceBar, DualMoneyDisplay, Badge
StatusBar → Badge, DebuffIcon
TerminalAlert → Card, ProgressBar
InventoryGrid → Card, Badge, Button
DebuffIcon → (无依赖)

AttributeBar → ProgressBar
ResourceBar → ProgressBar
DualMoneyDisplay → MoneyDisplay
StatusBadge → Badge
DebuffBadge → (独立)
```

## 样式规范

- 使用 Tailwind CSS
- 深色主题配色
- 响应式设计
- 动画效果

### 颜色参考

```
背景: slate-900 (主) / slate-800 (卡片) / slate-700 (悬停)
文字: slate-100 (主) / slate-300 (次要) / slate-400 (提示)
属性: red (体魄) / blue (智力) / green (英语) / yellow (社交) / purple (风险意识) / orange (生存)
状态: red-600 (濒死) / purple-600 (崩溃) / yellow-600 (匮乏)
```
