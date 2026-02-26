# TechDocs/ 技术文档骨架

> 本文档为 TechDocs/ 目录下需要补充的文件提供骨架结构。

---

## 文件 1: TechDocs/FrontendArchitecture.md

```markdown
# 前端技术架构

## 技术选型

### 核心技术栈

| 技术 | 版本 | 用途 |
|-----|------|------|
| React | 18.x | UI框架 |
| TypeScript | 5.x | 类型系统 |
| Vite | 5.x | 构建工具 |
| TailwindCSS | 3.x | 样式系统 |

### 选型理由

【待填充：为什么选择这些技术】

---

## 项目目录结构

```
src/
├── components/          # UI组件
│   ├── common/         # 通用组件（Button, Modal等）
│   ├── game/           # 游戏相关组件
│   └── layout/         # 布局组件
├── hooks/              # 自定义React Hooks
├── contexts/           # React Context（全局状态）
├── systems/            # 游戏系统实现
│   ├── character/      # 角色系统
│   ├── event/          # 事件系统
│   ├── item/           # 物品系统
│   ├── scene/          # 场景系统
│   └── save/           # 存档系统
├── data/               # 游戏数据
│   ├── events/         # 事件数据
│   ├── items/          # 物品数据
│   └── scenes/         # 场景配置
├── utils/              # 工具函数
├── types/              # TypeScript类型定义
└── styles/             # 全局样式
```

---

## 模块依赖关系

```
【待填充：模块依赖图】

示例:
UI Layer
  ├── GameScene
  ├── EventPanel
  └── StatusBar
      
State Layer
  ├── GameContext
  ├── CharacterState
  └── EventState
      
System Layer
  ├── EventEngine
  ├── CharacterManager
  └── SaveManager
```

---

## 组件设计规范

### 组件分层

| 层级 | 职责 | 示例 |
|-----|------|------|
| Page | 页面级组件，组合各模块 | GamePage, MenuPage |
| Container | 业务逻辑容器 | EventContainer, StatusContainer |
| Component | 纯展示组件 | EventCard, StatusBar |
| Primitive | 原子组件 | Button, Modal, Card |

### 组件命名规范

- 使用 PascalCase（如 `EventCard.tsx`）
- 组件名与文件名一致
- Hooks 使用 use 前缀（如 `useGameState.ts`）

---

## 性能优化策略

### 渲染优化

- [ ] 使用 `React.memo` 优化纯展示组件
- [ ] 使用 `useMemo`/`useCallback` 优化计算和回调
- [ ] 虚拟列表（如事件日志很长时）

### 加载优化

- [ ] 路由懒加载（如使用多页面）
- [ ] 资源懒加载
- [ ] 代码分割

### 状态优化

- [ ] 避免不必要的全局状态
- [ ] 状态扁平化设计

---

## 路由方案

【待填充：单页应用还是需要路由】

### 方案对比

| 方案 | 优点 | 缺点 | 建议 |
|-----|------|------|------|
| 单页无路由 | 简单 | 无法直接访问特定页面 | **推荐** |
| React Router | 标准方案 | 增加复杂度 | 如需要多页面 |

---

## 与 Core/ 架构的对应

| Core/ 文档 | Frontend 实现 |
|-----------|--------------|
| CharacterSystemArchitecture.md | `systems/character/` |
| EventSystemArchitecture.md | `systems/event/` |
| ItemSystemArchitecture.md | `systems/item/` |
| SceneSystemArchitecture.md | `systems/scene/` |
| SaveSystemArchitecture.md | `systems/save/` |
```

---

## 文件 2: TechDocs/StateManagement.md

```markdown
# 运行时状态管理

## 状态分层

### 全局状态（GameContext）

通过 React Context 提供，包含：

```typescript
interface GameState {
  // 当前游戏状态
  currentScene: SceneType;  // 'act1' | 'act2' | 'act3'
  currentTurn: number;
  gamePhase: GamePhase;     // 'player_turn' | 'event_resolution' | 'game_over'
  
  // 各系统状态
  character: CharacterState;
  scene: SceneState;
  inventory: InventoryState;
  
  // 运行时数据
  currentEvent: CurrentEvent | null;
  eventHistory: EventLogEntry[];
  activeDebuffs: EnvironmentalDebuff[];
}
```

### 局部状态

各组件内部管理的状态：

- UI 状态（如模态框开关、展开/折叠）
- 表单状态
- 动画状态

---

## 状态更新流程

### Action → Reducer → State

```typescript
// Action 定义
type GameAction =
  | { type: 'START_TURN' }
  | { type: 'SELECT_EVENT'; payload: { eventId: string } }
  | { type: 'EXECUTE_OPTION'; payload: { optionIndex: number } }
  | { type: 'END_TURN' }
  | { type: 'SAVE_GAME'; payload: { slotId: number } }
  | { type: 'LOAD_GAME'; payload: { saveData: SaveData } };

// Reducer 处理
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_TURN':
      // 触发随机事件，重置行动点等
      return { ...state, /* ... */ };
    case 'EXECUTE_OPTION':
      // 执行选项，应用效果
      return { ...state, /* ... */ };
    // ...
  }
}
```

---

## 与存档系统的关系

### 状态持久化时机

| 时机 | 操作 | 说明 |
|-----|------|------|
| 回合结束 | 自动保存 | 保存到自动存档槽 |
| 玩家手动 | 保存到指定槽 | 通过存档界面 |
| 退出游戏前 | 提示保存 | 防止数据丢失 |

### 状态恢复流程

```
1. 读取 SaveData（来自 localStorage）
2. 验证版本兼容性
3. 反序列化为 GameState
4. 恢复游戏到保存时的状态
```

---

## 状态订阅与通知

### 关键状态监听

```typescript
// 终结态监听
useEffect(() => {
  if (character.health <= 0) {
    dispatch({ type: 'ENTER_TERMINAL_STATE', payload: 'dying' });
  }
  if (character.mental <= 0) {
    dispatch({ type: 'ENTER_TERMINAL_STATE', payload: 'breakdown' });
  }
}, [character.health, character.mental]);

// 场景切换监听
useEffect(() => {
  if (act1State.moneyUSD > 0 && act1State.readyToLeave) {
    dispatch({ type: 'TRANSITION_SCENE', payload: 'act2' });
  }
}, [act1State]);
```

---

## 调试工具

### 状态查看器（开发环境）

```typescript
// 开发模式下显示状态面板
if (process.env.NODE_ENV === 'development') {
  // 显示当前完整状态树
  // 支持时间旅行（撤销/重做）
}
```

### 状态日志

```typescript
// 记录所有状态变更
function logStateChange(prev: GameState, next: GameState, action: GameAction) {
  console.log('[State]', action.type, {
    diff: calculateDiff(prev, next),
    timestamp: Date.now()
  });
}
```

---

## 性能考虑

### 避免不必要渲染

```typescript
// 使用 selector 只订阅需要的部分
const health = useGameSelector(state => state.character.resources.health);

// 而不是订阅整个 character 对象
// const character = useGameSelector(state => state.character); // ❌ 会导致不必要渲染
```

### 批量更新

```typescript
// 多个相关状态变更批量处理
dispatch([
  { type: 'UPDATE_HEALTH', payload: -10 },
  { type: 'UPDATE_MONEY', payload: -500 },
  { type: 'ADD_LOG', payload: logEntry }
]);
```
```

---

## 文件 3: TechDocs/DevelopmentWorkflow.md（P1）

```markdown
# 开发流程规范

## 环境要求

- Node.js >= 18
- pnpm >= 8 (或 npm/yarn)
- Git

## 项目初始化

```bash
# 克隆仓库
git clone 【仓库地址】
cd 【项目目录】

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

## 代码规范

### ESLint 配置

【待填充】

### Prettier 配置

【待填充】

### Git 提交规范

```
feat: 新功能
fix: 修复
docs: 文档
style: 格式
refactor: 重构
test: 测试
chore: 构建/工具
```

## 分支策略

- `main`: 稳定分支
- `develop`: 开发分支
- `feature/*`: 功能分支
- `hotfix/*`: 紧急修复

## 发布流程

1. 更新版本号
2. 更新 CHANGELOG
3. 打标签
4. 构建部署
```

---

## 文件 4: TechDocs/TestingStrategy.md（P1）

```markdown
# 测试策略

## 测试金字塔

```
    /\
   /  \  E2E (少量)
  /----\
 /      \  集成测试 (中等)
/--------\
/          \  单元测试 (大量)
------------
```

## 单元测试

### 测试框架

- Vitest (或 Jest)
- 测试文件: `*.test.ts`

### 重点测试模块

| 模块 | 测试项 |
|-----|--------|
| 事件系统 | 槽位匹配逻辑、条件判定 |
| 角色系统 | 属性计算、终结态判定 |
| 存档系统 | 序列化/反序列化、版本迁移 |

## 集成测试

测试系统间交互：

- 完整回合流程
- 场景切换
- 存档/读档

## E2E测试

关键用户流程：

- 创建角色 → 完成场景1
- 触发死亡结局
- 存档 → 读档继续
```

---

## 文件 5: TechDocs/APIDesign.md（阶段二）

```markdown
# API 接口设计

> 阶段二 LLM 集成时使用

## 接口概览

| 接口 | 方法 | 用途 |
|-----|------|------|
| /api/chat | POST | LLM 对话 |

## /api/chat

### 请求

```typescript
interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;  // 默认 200
  temperature?: number; // 默认 0.7
}
```

### 响应

```typescript
interface ChatResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

interface ChatError {
  error: string;
  code: string;
}
```

### 错误码

| 码 | 说明 |
|----|------|
| 429 | 请求过于频繁 |
| 500 | 服务器错误 |
| 503 | 服务暂时不可用 |

## 前端调用示例

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: '你是一个...' },
      { role: 'user', content: '玩家输入' }
    ]
  })
});
```

详见 CloudDeploy.md 中的安全设计和成本控制。
```

---

*以上为 TechDocs/ 的全部骨架内容*
