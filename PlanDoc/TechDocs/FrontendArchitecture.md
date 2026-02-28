# 前端技术架构设计

## 1. 概述

本文档定义《去美国》游戏前端技术架构，包括技术选型、项目结构、组件设计规范、性能优化策略以及与 Core 架构的对应关系。

**设计目标**：
- 轻量级、快速加载的静态网页体验
- 类型安全的开发体验
- 模块化的游戏系统实现
- 与 Core 架构保持严格对应

---

## 2. 技术选型

### 2.1 技术栈概览

| 技术 | 版本 | 用途 |
|-----|------|------|
| **React** | 18.x | UI 框架，组件化开发 |
| **TypeScript** | 5.x | 类型系统，编译时检查 |
| **Vite** | 5.x | 构建工具，快速开发服务器 |
| **TailwindCSS** | 3.x | 原子化 CSS 样式系统 |
| **Lucide React** | latest | 图标库 |

### 2.2 选型理由

#### React 18.x
- **组件化架构**：匹配游戏系统的模块化设计
- **并发特性**：`useTransition` 可用于平滑的 UI 状态切换
- **生态成熟**：丰富的社区资源和工具链支持
- **与 Core 对应**：Component 层级对应 Core 的系统架构

#### TypeScript 5.x
- **类型安全**：与 Core 架构的 TypeScript 接口定义无缝衔接
- **IDE 支持**：优秀的代码提示和重构能力
- **维护性**：大型项目长期维护的必备工具
- **文档化**：类型定义即接口文档

#### Vite 5.x
- **快速冷启动**：秒级启动开发服务器
- **即时热更新**：保存即刷新，提升开发效率
- **优化构建**：Tree-shaking、代码分割、压缩优化
- **TypeScript 原生支持**：无需额外配置

#### TailwindCSS 3.x
- **原子化 CSS**：避免样式文件膨胀
- **设计系统一致**：通过配置统一颜色和间距
- **开发效率**：无需切换文件编写样式
- **响应式设计**：内置断点支持移动端适配

#### Lucide Icons
- **轻量级**：仅加载使用的图标
- **一致性**：统一的图标设计风格
- **Tree-shaking**：支持按需导入
- **React 友好**：提供 React 组件版本

---

## 3. 项目目录结构

```
src/
├── components/           # UI 组件（四层架构）
│   ├── pages/           # Page 层：完整页面
│   ├── containers/      # Container 层：业务容器
│   ├── modules/         # Module 层：功能模块
│   └── primitives/      # Primitive 层：原子组件
│
├── hooks/               # 自定义 React Hooks
│   ├── useCharacter.ts  # 角色状态 Hook
│   ├── useEvent.ts      # 事件系统 Hook
│   ├── useInventory.ts  # 物品栏 Hook
│   ├── useScene.ts      # 场景管理 Hook
│   ├── useTurn.ts       # 回合管理 Hook
│   └── useSave.ts       # 存档管理 Hook
│
├── contexts/            # React Context（全局状态）
│   ├── GameContext.tsx       # 游戏主状态
│   ├── CharacterContext.tsx  # 角色状态
│   ├── EventContext.tsx      # 事件系统状态
│   └── SaveContext.tsx       # 存档系统状态
│
├── systems/             # 游戏系统实现（对应 Core/）
│   ├── character/       # 角色系统
│   │   ├── CharacterManager.ts      # 角色管理器
│   │   ├── TerminalStateManager.ts  # 终结态管理器
│   │   └── AttributeSystem.ts       # 属性系统
│   ├── event/           # 事件系统
│   │   ├── EventManager.ts          # 事件管理器
│   │   ├── EventPoolManager.ts      # 事件池管理器
│   │   ├── SlotMatcher.ts           # 槽位匹配器
│   │   └── ChainManager.ts          # 事件链管理器
│   ├── item/            # 物品系统
│   │   ├── InventoryManager.ts      # 道具栏管理器
│   │   ├── ConsumableInventory.ts   # 消耗品栏
│   │   ├── PermanentInventory.ts    # 常驻道具栏
│   │   └── BookPool.ts              # 书籍池
│   ├── scene/           # 场景系统
│   │   ├── SceneManager.ts          # 场景管理器
│   │   ├── SceneTransitionManager.ts # 场景切换管理器
│   │   └── EnvironmentalDebuffManager.ts # 环境 Debuff 管理器
│   └── save/            # 存档系统
│       ├── SaveManager.ts           # 存档管理器
│       ├── StorageAdapter.ts        # 存储适配器
│       └── SaveMigrator.ts          # 存档迁移器
│
├── data/                # 游戏数据（静态配置）
│   ├── events/          # 事件数据
│   │   ├── act1/        # 场景1事件
│   │   ├── act2/        # 场景2事件
│   │   ├── act3/        # 场景3事件
│   │   └── common/      # 通用事件
│   ├── items/           # 物品数据
│   │   ├── consumables.ts   # 消耗品配置
│   │   └── permanents.ts    # 常驻道具配置
│   └── scenes/          # 场景配置
│       └── sceneConfigs.ts  # 场景配置表
│
├── types/               # TypeScript 类型定义
│   ├── character.ts     # 角色相关类型
│   ├── event.ts         # 事件相关类型
│   ├── item.ts          # 物品相关类型
│   ├── scene.ts         # 场景相关类型
│   ├── save.ts          # 存档相关类型
│   └── index.ts         # 类型导出
│
├── utils/               # 工具函数
│   ├── random.ts        # 随机数工具
│   ├── formatters.ts    # 格式化工具
│   ├── validators.ts    # 验证工具
│   └── constants.ts     # 常量定义
│
└── styles/              # 全局样式
    ├── index.css        # 主样式入口
    ├── variables.css    # CSS 变量
    └── animations.css   # 动画定义
```

---

## 4. 模块依赖关系

### 4.1 三层架构

```
┌─────────────────────────────────────────────────────────┐
│                      UI Layer                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │   Pages      │ │  Containers  │ │   Modules    │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
└──────────────────────────┬──────────────────────────────┘
                           │ React Context / Hooks
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    State Layer                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │ GameContext  │ │EventContext  │ │ SaveContext  │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
└──────────────────────────┬──────────────────────────────┘
                           │ 纯 TypeScript 类
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   System Layer                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │ Character    │ │   Event      │ │   Item       │     │
│  │   System     │ │   System     │ │   System     │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
│  ┌──────────────┐ ┌──────────────┐                      │
│  │   Scene      │ │   Save       │                      │
│  │   System     │ │   System     │                      │
│  └──────────────┘ └──────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

### 4.2 依赖方向规则

```
UI Layer ──depend──> State Layer ──depend──> System Layer
     │                                         ↑
     └─────────────────────────────────────────┘
                    (通过 Hooks 封装)
```

**关键约束**：
- UI 层不直接调用 System 层，必须通过 State 层
- System 层是纯 TypeScript 类，无 React 依赖
- State 层通过 Context 和 Hooks 连接 UI 和 System

---

## 5. 组件设计规范

### 5.1 四层组件架构

| 层级 | 命名规范 | 职责 | 示例 |
|-----|---------|------|------|
| **Page** | `*Page.tsx` | 完整页面，路由入口 | `GamePage.tsx`, `SaveMenuPage.tsx` |
| **Container** | `*Container.tsx` | 业务逻辑容器，管理数据流 | `EventPanelContainer.tsx` |
| **Module** | `*Module.tsx` | 功能模块，可复用业务组件 | `EventCard.tsx`, `InventoryGrid.tsx` |
| **Primitive** | `*.tsx` | 原子组件，纯样式 | `Button.tsx`, `ProgressBar.tsx` |

### 5.2 各层详细规范

#### Page 层
```typescript
// 页面组件只负责布局和组合 Container
const GamePage: React.FC = () => {
  return (
    <div className="game-page">
      <HeaderContainer />
      <main className="game-main">
        <SceneContainer />
        <EventPanelContainer />
        <StatusContainer />
      </main>
      <ActionBarContainer />
    </div>
  );
};
```

#### Container 层
```typescript
// 负责数据获取和业务逻辑
const EventPanelContainer: React.FC = () => {
  const { availableEvents, executeEvent } = useEvent();
  const { character } = useCharacter();
  
  // 过滤可执行的事件
  const executableEvents = useMemo(() => {
    return availableEvents.filter(event => 
      canExecuteEvent(event, character)
    );
  }, [availableEvents, character]);
  
  return (
    <EventPanelModule 
      events={executableEvents}
      onExecute={executeEvent}
    />
  );
};
```

#### Module 层
```typescript
// 接收纯数据 props，负责 UI 渲染
interface EventCardProps {
  event: FixedEvent;
  canExecute: boolean;
  onClick: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  canExecute, 
  onClick 
}) => {
  return (
    <div 
      className={cn(
        'event-card',
        !canExecute && 'event-card--disabled'
      )}
      onClick={canExecute ? onClick : undefined}
    >
      <h3>{event.name}</h3>
      <p>{event.description}</p>
      <EventCostDisplay cost={event.execution} />
    </div>
  );
};
```

#### Primitive 层
```typescript
// 原子组件，无业务逻辑
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        isLoading && 'btn--loading'
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <Spinner /> : children}
    </button>
  );
};
```

---

## 6. 性能优化策略

### 6.1 React 性能优化

#### Memoization
```typescript
// Primitive 层：默认使用 React.memo
const Button = React.memo<ButtonProps>(({ variant, size, children }) => {
  // 渲染逻辑
});

// Module 层：复杂组件使用 useMemo/useCallback
const EventCard: React.FC<EventCardProps> = ({ event, onExecute }) => {
  const slotEffects = useMemo(() => {
    return calculateSlotEffects(event.slots);
  }, [event.slots]);
  
  const handleClick = useCallback(() => {
    onExecute(event.id);
  }, [event.id, onExecute]);
  
  return (
    // 渲染逻辑
  );
};
```

#### Context 优化
```typescript
// 拆分 Context 避免不必要重渲染
const GameStateContext = createContext<GameState>(null!);
const GameDispatchContext = createContext<Dispatch>(null!);

// 使用 selector 模式
const useHealth = () => {
  const state = useContext(GameStateContext);
  return state.character.resources.health.current;
};
```

### 6.2 代码分割与懒加载

```typescript
// 路由级别分割
const SaveMenuPage = lazy(() => import('./pages/SaveMenuPage'));

// 功能级别分割
const EventChainModal = lazy(() => import('./modules/EventChainModal'));

// Suspense 边界
<Suspense fallback={<LoadingScreen />}>
  <SaveMenuPage />
</Suspense>
```

### 6.3 渲染优化

```typescript
// 使用 will-change 优化动画
const EventAnimation: React.FC = () => {
  return (
    <div className="event-animation will-change-transform">
      {/* 动画内容 */}
    </div>
  );
};

// 虚拟列表（如果事件列表很长）
import { FixedSizeList } from 'react-window';

const EventList: React.FC = ({ events }) => {
  return (
    <FixedSizeList
      height={500}
      itemCount={events.length}
      itemSize={80}
    >
      {({ index, style }) => (
        <EventCard event={events[index]} style={style} />
      )}
    </FixedSizeList>
  );
};
```

---

## 7. 路由方案

### 7.1 单页无路由（推荐）

**决策理由**：
- 游戏是线性体验，无需 URL 导航
- 状态管理简单，无路由状态同步问题
- 更适合沉浸式叙事体验
- 实现简单，无需额外依赖

**实现方式**：
```typescript
// App.tsx
const App: React.FC = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('MENU');
  
  return (
    <div className="app">
      {gamePhase === 'MENU' && <MainMenuPage onStart={startGame} />}
      {gamePhase === 'CHARACTER_CREATE' && <CharacterCreatePage />}
      {gamePhase === 'PLAYING' && <GamePage />}
      {gamePhase === 'GAME_OVER' && <EndingPage />}
    </div>
  );
};
```

### 7.2 备选：React Router（如需要）

```typescript
// 如需浏览器历史支持，可使用 memory router
import { MemoryRouter, Routes, Route } from 'react-router-dom';

<MemoryRouter>
  <Routes>
    <Route path="/" element={<MainMenuPage />} />
    <Route path="/game" element={<GamePage />} />
    <Route path="/saves" element={<SaveMenuPage />} />
  </Routes>
</MemoryRouter>
```

---

## 8. 与 Core 架构的对应表

### 8.1 系统映射

| Core 架构文件 | 前端实现位置 | 关键类/Hook |
|--------------|-------------|------------|
| `CharacterSystemArchitecture.md` | `src/systems/character/` | `CharacterManager`, `useCharacter` |
| `EventSystemArchitecture.md` | `src/systems/event/` | `EventManager`, `EventPoolManager`, `useEvent` |
| `ItemSystemArchitecture.md` | `src/systems/item/` | `InventoryManager`, `useInventory` |
| `SceneSystemArchitecture.md` | `src/systems/scene/` | `SceneManager`, `useScene` |
| `SaveSystemArchitecture.md` | `src/systems/save/` | `SaveManager`, `useSave` |
| `EndingSystemArchitecture.md` | `src/systems/ending/` | `EndingManager`, `useEnding` |

### 8.2 数据结构对应

| Core 类型 | 前端类型定义 | 用途 |
|----------|-------------|------|
| `Character` | `src/types/character.ts` | 角色数据结构 |
| `GameEvent` | `src/types/event.ts` | 事件数据结构 |
| `PermanentItem` | `src/types/item.ts` | 道具数据结构 |
| `SceneRuntimeData` | `src/types/scene.ts` | 场景数据结构 |
| `SaveData` | `src/types/save.ts` | 存档数据结构 |

### 8.3 状态对应

| Core 状态 | Context | Hook |
|----------|---------|------|
| `Character.resources` | `CharacterContext` | `useHealth`, `useMental`, `useMoney` |
| `Character.attributes` | `CharacterContext` | `useAttributes` |
| `Character.status` | `GameContext` | `useGameStatus` |
| `EnvironmentalDebuff[]` | `GameContext` | `useDebuffs` |
| `SceneEventPool` | `EventContext` | `useEventPool` |
| `InventoryManager` | `ItemContext` | `useInventory` |

---

## 9. 开发规范

### 9.1 命名规范

```typescript
// 文件命名
// - 组件：PascalCase.tsx
// - 工具：camelCase.ts
// - 类型：camelCase.types.ts

// 变量命名
// - React 组件：PascalCase
// - 普通变量：camelCase
// - 常量：SCREAMING_SNAKE_CASE
// - 类型/接口：PascalCase
// - 枚举：PascalCase，成员 SCREAMING_SNAKE_CASE

// 示例
const MAX_INVENTORY_SLOTS = 20;           // 常量

interface CharacterProps {                // 接口
  character: Character;
}

const CharacterCard: React.FC<CharacterProps> = () => {  // 组件
  const [isExpanded, setIsExpanded] = useState(false);   // 状态
  
  const handleToggle = () => {            // 事件处理
    setIsExpanded(prev => !prev);
  };
};
```

### 9.2 导入顺序

```typescript
// 1. React 相关
import React, { useState, useCallback } from 'react';

// 2. 第三方库
import { cn } from 'class-variance-authority';
import { Heart } from 'lucide-react';

// 3. 绝对路径导入
import { useCharacter } from '@/hooks/useCharacter';
import { Button } from '@/components/primitives/Button';

// 4. 相对路径导入
import { EventCard } from './EventCard';
import styles from './EventPanel.module.css';

// 5. 类型导入
import type { FixedEvent } from '@/types/event';
```

### 9.3 类型定义规范

```typescript
// 优先使用 interface 定义对象类型
interface EventCardProps {
  event: FixedEvent;
  onExecute: (eventId: string) => void;
}

// 使用 type 定义联合类型或复杂类型
type EventCategory = 'RANDOM' | 'FIXED' | 'CHAIN' | 'POLICY_PRESSURE';

// Props 默认导出
export type { EventCardProps };
```

---

## 10. 构建与部署

### 10.1 Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          // 代码分割
          'react-vendor': ['react', 'react-dom'],
          'game-systems': [
            './src/systems/character',
            './src/systems/event',
            './src/systems/item',
          ],
        },
      },
    },
  },
});
```

### 10.2 TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 11. 附录

### 11.1 推荐 VSCode 插件

- **ES7+ React/Redux/React-Native snippets**：代码片段
- **Tailwind CSS IntelliSense**：Tailwind 智能提示
- **TypeScript Importer**：自动导入类型
- **Auto Import**：自动导入模块

### 11.2 文件模板

#### 组件模板
```typescript
import React from 'react';
import { cn } from '@/utils/cn';

interface ${ComponentName}Props {
  className?: string;
}

export const ${ComponentName}: React.FC<${ComponentName}Props> = ({
  className,
}) => {
  return (
    <div className={cn('', className)}>
      {/* 组件内容 */}
    </div>
  );
};

${ComponentName}.displayName = '${ComponentName}';
```

#### Hook 模板
```typescript
import { useState, useCallback } from 'react';

interface Use${HookName}Options {
  // 选项定义
}

interface Use${HookName}Return {
  // 返回值定义
}

export const use${HookName} = (
  options?: Use${HookName}Options
): Use${HookName}Return => {
  const [state, setState] = useState();
  
  const handler = useCallback(() => {
    // 处理逻辑
  }, []);
  
  return {
    // 返回值
  };
};
```

---

**文档版本**: v1.0
**最后更新**: 2026-02-27
**状态**: P0 - 待实现
