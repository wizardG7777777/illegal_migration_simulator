# 待补充文档索引

> 本文档列出 PlanDoc 中尚未完成或需要补充的文档骨架，为系统性补充工作提供指引。
> 
> 创建日期：2026-02-27

---

## 📋 文档完成状态总览

| 目录 | 状态 | 完成度 | 优先级 |
|-----|------|--------|--------|
| Core/ | ✅ 基本完成 | 95% | - |
| DesignDocs/ | ⚠️ 需补充 | 80% | P1 |
| **NarrativeDocs/** | ❌ **完全缺失** | 0% | **P0** |
| **ProjectDocs/** | ❌ **完全缺失** | 0% | **P0** |
| TechDocs/ | ⚠️ 部分缺失 | 40% | P1 |

---

## 🔴 P0 优先级（阻塞开发）

### 1. 叙事文档 (NarrativeDocs/)

这些文档是文字冒险游戏的核心，**必须在开发开始前完成**。

| 文档路径 | 说明 | 依赖 |
|---------|------|------|
| `NarrativeDocs/README.md` | 叙事文档总览与使用指南 | - |
| `NarrativeDocs/StoryOutline/MainStoryArc.md` | 主线剧情：从决定去美国到最终结局 | DesignPrinciples.md |
| `NarrativeDocs/StoryOutline/Act1_Outline.md` | 场景1剧情线详细设计 | Events_Act1_Prep.md |
| `NarrativeDocs/StoryOutline/Act2_Outline.md` | 场景2剧情线详细设计 | Events_Act2_Crossing.md |
| `NarrativeDocs/StoryOutline/Act3_Outline.md` | 场景3剧情线详细设计 | Events_Act3_USA.md |
| `NarrativeDocs/StoryOutline/EndingBranches.md` | 所有结局分支及触发条件 | EndingSystemArchitecture.md |
| `NarrativeDocs/Dialogues/README.md` | 对话文档规范 | - |
| `NarrativeDocs/Dialogues/Templates/EventDialogueTemplate.md` | 事件对话标准格式模板 | - |
| `NarrativeDocs/Dialogues/Act1_Dialogues.md` | 场景1事件完整文案 | Events_Act1_Prep.md |
| `NarrativeDocs/Dialogues/Act2_Dialogues.md` | 场景2事件完整文案 | Events_Act2_Crossing.md |
| `NarrativeDocs/Dialogues/Act3_Dialogues.md` | 场景3事件完整文案 | Events_Act3_USA.md |
| `NarrativeDocs/Dialogues/EndingTexts.md` | 所有结局文案 | EndingBranches.md |
| `NarrativeDocs/Dialogues/CommonTexts.md` | 通用文本（UI提示、状态描述）| UISystem.md |

**骨架文件**: 见 `_PENDING_NarrativeDocs_Skeleton.md`

---

### 2. 项目管理文档 (ProjectDocs/)

用于跟踪开发进度和验收标准。

| 文档路径 | 说明 | 依赖 |
|---------|------|------|
| `ProjectDocs/README.md` | 项目文档目录说明 | - |
| `ProjectDocs/TaskBoard.md` | 任务看板（当前开发任务）| - |
| `ProjectDocs/Milestone_Checklist.md` | 里程碑验收标准 | TaskBoard.md |
| `ProjectDocs/Roadmap.md` | 开发路线图（MVP→Alpha→Beta→Release）| - |

**骨架文件**: 见 `_PENDING_ProjectDocs_Skeleton.md`

---

### 3. 技术架构文档 (TechDocs/)

阶段一开发必需的技术设计。

| 文档路径 | 说明 | 依赖 |
|---------|------|------|
| `TechDocs/FrontendArchitecture.md` | 前端技术架构（React+TS+Tailwind）| Core/README.md |
| `TechDocs/StateManagement.md` | 运行时状态管理方案 | SaveSystemArchitecture.md |

**骨架文件**: 见 `_PENDING_TechDocs_Skeleton.md`

---

## 🟡 P1 优先级（开发中补充）

### 4. 设计文档补充 (DesignDocs/)

| 文档路径 | 说明 | 依赖 |
|---------|------|------|
| `DesignDocs/Events/Events_Terminal.md` | 终结态事件详细设计 | TerminalStates.md |
| `DesignDocs/Events/Events_Milestones.md` | 里程碑/转折点事件 | - |
| `DesignDocs/Events/Act2_DeathEvents.md` | 场景2致命随机事件（至少5个）| Events_Act2_Crossing.md |
| `DesignDocs/Items/Act2_Consumables.md` | 场景2专属消耗品 | Consumables.md |

**骨架文件**: 见 `_PENDING_DesignDocs_Skeleton.md`

---

### 5. 世界设定补充 (DesignDocs/World/)

| 文档路径 | 说明 |
|---------|------|
| `DesignDocs/World/Locations/Act2_Locations.md` | 场景2详细地点设定（雨林、边境墙、沙漠节点）|
| `DesignDocs/World/Locations/Act3_Locations.md` | 场景3详细地点设定（洛杉矶/纽约华人社区）|
| `DesignDocs/World/Factions/ChineseCommunities.md` | 华人互助组织详细设定 |

---

## 🟢 P2 优先级（后期完善）

### 6. 叙事扩展 (NarrativeDocs/)

| 文档路径 | 说明 |
|---------|------|
| `NarrativeDocs/Lore/WorldBackground.md` | 世界观背景（不直接展示）|
| `NarrativeDocs/Lore/RumorsAndMyths.md` | 谣言与传说 |
| `NarrativeDocs/Lore/Newspapers.md` | 新闻剪报素材 |
| `NarrativeDocs/Lore/OnlinePosts.md` | 论坛帖子/社交媒体内容 |
| `NarrativeDocs/CharacterStories/BackgroundTemplates.md` | 角色背景模板 |
| `NarrativeDocs/CharacterStories/NPCProfiles.md` | 重要NPC档案 |

### 7. 项目管理扩展 (ProjectDocs/)

| 文档路径 | 说明 |
|---------|------|
| `ProjectDocs/Asset_Inventory.md` | 资源清单（图片、字体）|
| `ProjectDocs/Tech_Decisions.md` | 技术决策记录（ADR）|
| `ProjectDocs/Testing_Plan.md` | 测试策略 |
| `ProjectDocs/Playtest_Log.md` | 试玩反馈记录 |

### 8. 技术扩展 (TechDocs/)

| 文档路径 | 说明 |
|---------|------|
| `TechDocs/DevelopmentWorkflow.md` | 开发流程规范 |
| `TechDocs/TestingStrategy.md` | 测试方案 |
| `TechDocs/APIDesign.md` | API 接口详细设计（阶段二）|

### 9. 系统架构补充 (Core/)

| 文档路径 | 说明 |
|---------|------|
| `Core/SystemOverview.md` | 系统交互总览 |
| `Core/GameLoopArchitecture.md` | 游戏主循环架构 |
| `Core/UISystemArchitecture.md` | UI 系统架构 |

---

## 📝 使用说明

### 补充文档的步骤

1. **选择优先级**: 按照 P0 → P1 → P2 的顺序
2. **查看骨架**: 阅读对应的 `_PENDING_*_Skeleton.md` 文件
3. **填充内容**: 将骨架内容复制到目标路径并填充
4. **更新索引**: 在此文件中标记完成状态

### 文档命名规范

- 使用 PascalCase 命名（如 `MainStoryArc.md`）
- 事件文档前缀：`Events_`（如 `Events_Terminal.md`）
- 场景特定文档后缀：`Act{N}_`（如 `Act1_Dialogues.md`）

### 标记完成状态

在本文档中，当一个文档完成后，将其状态更新为：

```markdown
| `NarrativeDocs/StoryOutline/MainStoryArc.md` | 主线剧情 | - | ✅ |
```

---

## 📊 进度跟踪

### P0 任务完成进度

- [ ] NarrativeDocs/README.md
- [ ] NarrativeDocs/StoryOutline/MainStoryArc.md
- [ ] NarrativeDocs/StoryOutline/Act1_Outline.md
- [ ] NarrativeDocs/StoryOutline/Act2_Outline.md
- [ ] NarrativeDocs/StoryOutline/Act3_Outline.md
- [ ] NarrativeDocs/StoryOutline/EndingBranches.md
- [ ] NarrativeDocs/Dialogues/README.md
- [ ] NarrativeDocs/Dialogues/Templates/EventDialogueTemplate.md
- [ ] NarrativeDocs/Dialogues/Act1_Dialogues.md
- [ ] NarrativeDocs/Dialogues/Act2_Dialogues.md
- [ ] NarrativeDocs/Dialogues/Act3_Dialogues.md
- [ ] NarrativeDocs/Dialogues/EndingTexts.md
- [ ] NarrativeDocs/Dialogues/CommonTexts.md
- [ ] ProjectDocs/README.md
- [ ] ProjectDocs/TaskBoard.md
- [ ] ProjectDocs/Milestone_Checklist.md
- [ ] ProjectDocs/Roadmap.md
- [ ] TechDocs/FrontendArchitecture.md
- [ ] TechDocs/StateManagement.md

**P0 完成度: 0/20**

---

> 💡 **提示**: 定期更新此索引文件，保持对文档状态的实时跟踪。
