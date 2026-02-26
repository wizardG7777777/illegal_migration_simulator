# Core - 系统架构文档

本文档目录包含《去美国》游戏的技术实现规范，面向开发者。

## 文档清单

| 文档 | 说明 | 状态 |
|-----|------|------|
| [CharacterSystemArchitecture.md](./CharacterSystemArchitecture.md) | 角色系统架构（属性、资源、终结态） | ✅ 已完成 |
| [EventSystemArchitecture.md](./EventSystemArchitecture.md) | 事件系统架构（分类、触发、事件链） | ✅ 已完成 |
| [ItemSystemArchitecture.md](./ItemSystemArchitecture.md) | 物品系统架构（消耗品、常驻品、槽位匹配） | ✅ 已完成 |
| [SceneSystemArchitecture.md](./SceneSystemArchitecture.md) | 场景系统架构（三幕结构、切换、生活成本） | ✅ 已完成 |
| [SaveSystemArchitecture.md](./SaveSystemArchitecture.md) | 存档/读档系统（React + localStorage） | ✅ 已完成 |
| [EndingSystemArchitecture.md](./EndingSystemArchitecture.md) | 结局系统（死亡/通关/特殊结局管理） | ✅ 已完成 |
| [StatisticsSystemArchitecture.md](./StatisticsSystemArchitecture.md) | 统计系统（与存档集成） | ✅ 已完成 |

## 与 DesignDocs/Systems 的区别

- **Core/**: 技术实现规范（TypeScript 接口、数据结构、算法逻辑）
- **DesignDocs/Systems/**: 玩法设计说明（规则描述、数值公式、设计意图）

设计师修改 DesignDocs 中的规则后，开发者需要同步更新 Core 中的技术实现。

## 技术栈

- **前端**: React + TypeScript + TailwindCSS
- **存储**: localStorage（主要）+ IndexedDB（预留）
- **构建**: Vite / Create React App

## 架构设计原则

1. **数据驱动**: 配置与逻辑分离，便于调整平衡性
2. **模块化**: 各系统独立，通过明确接口交互
3. **可测试**: 核心业务逻辑纯函数化，便于单元测试
4. **可扩展**: 预留版本迁移、多周目、云存档等扩展点
