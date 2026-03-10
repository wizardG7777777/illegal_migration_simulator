# 《去美国》项目文档

> 本文档是《去美国》文字冒险游戏的项目管理文档入口，包含开发计划、任务追踪和进度管理。

---

## 文档目录用途

| 目录 | 用途说明 |
|------|----------|
| `README.md` | **本文档** - 项目文档入口，目录结构说明，使用指南 |
| `TaskBoard.md` | 任务看板 - 当前开发任务状态、待办事项、阻塞项 |
| `Milestone_Checklist.md` | 里程碑验收清单 - 各阶段验收标准和完成状态 |
| `Roadmap.md` | 开发路线图 - 详细开发计划和时间安排 |

---

## 适用原则

### 独立/小团队开发

本文档体系适用于独立开发者或小规模团队协作（1-3人），具有以下特点：

- **轻量级**：避免过度文档化，聚焦核心信息
- **可执行**：每个任务都有明确的完成标准
- **可追溯**：关键决策和变更记录清晰
- **可调整**：根据实际进度灵活调整优先级

### Git版本控制

- 所有文档与代码一同提交到 Git 仓库
- 重要变更需要在文档中记录变更历史和原因
- 使用 Markdown 格式确保版本控制友好（diff 可读）

---

## 目录结构

```
PlanDoc/
├── Core/                          # 系统架构文档（技术规范）
│   ├── CharacterSystemArchitecture.md
│   ├── EventSystemArchitecture.md
│   ├── ItemSystemArchitecture.md
│   ├── SceneSystemArchitecture.md
│   ├── SaveSystemArchitecture.md
│   ├── EndingSystemArchitecture.md
│   └── StatisticsSystemArchitecture.md
│
├── DesignDocs/                    # 游戏设计文档（玩法机制）
│   ├── DesignPrinciples.md
│   ├── Character/
│   ├── Events/
│   ├── Items/
│   ├── World/
│   └── Systems/
│
├── ProjectDocs/                   # 项目管理文档（本文档）
│   ├── README.md                  # 文档入口
│   ├── TaskBoard.md               # 任务看板
│   ├── Milestone_Checklist.md     # 里程碑清单
│   └── Roadmap.md                 # 开发路线图
│
└── TechDocs/                      # 技术实现文档
    └── CloudDeploy.md
```

---

## 使用指南

### 文档更新频率

| 文档名 | 更新频率 | 主要读者 | 维护者 |
|--------|----------|----------|--------|
| `README.md` | 随目录结构变更 | 所有团队成员 | 项目负责人 |
| `TaskBoard.md` | 每日/每次工作会话 | 开发者、项目经理 | 开发者 |
| `Milestone_Checklist.md` | 里程碑评审时更新 | 项目负责人、QA | 项目负责人 |
| `Roadmap.md` | 周会时更新 | 所有团队成员 | 项目负责人 |

### 使用建议

1. **日常开发**：每天开始时查看 `TaskBoard.md`，了解当前任务状态
2. **周会**：每周回顾 `Roadmap.md`，调整下周计划
3. **里程碑评审**：对照 `Milestone_Checklist.md` 逐项验收
4. **新人入职**：先阅读本文档了解项目文档体系

---

## 开发阶段划分

根据 AGENTS.md 和整体规划，项目分为四个主要阶段：

### 阶段一：MVP（4周）
**目标**：场景1可玩
- 角色系统、事件系统、物品系统基础实现
- 场景1完整事件数据（打工、学习、随机事件）
- 基本的 UI 和存档功能

### 阶段二：Alpha（4周）
**目标**：三场景完整流程
- 场景2和场景3的事件数据
- 场景切换机制
- 5种基础结局
- 核心系统完善（生活成本、执法压力）

### 阶段三：Beta（3周）
**目标**：数值平衡 + 多结局
- 24种结局全部实现
- 数值整体平衡调试
- Bug修复和体验优化

### 阶段四：Release（1周）
**目标**：发布就绪
- 云部署和域名配置
- 性能优化
- 用户文档和上线准备

**总工期**：12周（约3个月）

---

## 快速链接

- [核心设计原则](../DesignDocs/DesignPrinciples.md)
- [事件总库](../DesignDocs/Events/EventPool.md)
- [AGENTS.md](../../AGENTS.md) - 全局开发指南

---

## 更新历史

| 日期 | 变更内容 | 变更人 |
|------|----------|--------|
| 2026-02-27 | 创建项目文档结构 | - |

