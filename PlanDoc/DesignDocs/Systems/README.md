# Systems - 核心玩法文档

本文档目录包含《去美国》游戏的核心玩法机制说明，面向设计师和开发者。

## 文档清单

| 文档 | 说明 | 状态 |
|-----|------|------|
| [TerminalStates.md](./TerminalStates.md) | 终结态机制（濒死/崩溃/匮乏） | ✅ 已完成 |
| [ItemSlotSystem.md](./ItemSlotSystem.md) | 物品槽位匹配系统 | ✅ 已完成 |
| [EconomySystem.md](./EconomySystem.md) | 经济系统与数值平衡 | ✅ 已完成 |
| [TurnFlow.md](./TurnFlow.md) | 回合流程与阶段说明 | ✅ 已完成 |
| [SceneTransition.md](./SceneTransition.md) | 场景切换机制 | ✅ 已完成 |
| [UISystem.md](./UISystem.md) | UI/UX设计（React + TailwindCSS） | ✅ 已完成 |
| [NarrativeSystem.md](./NarrativeSystem.md) | 叙事系统（事件链驱动） | ✅ 已完成 |
| [NarrativeSystem.md](./NarrativeSystem.md) | 叙事系统与文案规范 | ✅ 已完成 |

## 与 Core/ 目录的区别

- **Core/**: 技术实现规范（TypeScript 接口、数据结构、算法逻辑）
- **Systems/**: 玩法设计说明（规则描述、数值公式、设计意图）

设计师修改 Systems/ 中的规则后，开发者需要同步更新 Core/ 中的技术实现。
