# StoryOutline 目录说明

> 本目录包含《去美国》文字冒险游戏的核心叙事文档，定义整体故事架构、三幕剧情线及结局分支。

---

## 目录用途

StoryOutline 是叙事设计的顶层设计文档集合，承担以下职责：

- **故事框架定义**：确定三幕结构、核心冲突、主题隐喻
- **剧情线规划**：每个场景的节点分布、情绪曲线、关键转折
- **结局统筹**：所有可能结局的分类、触发条件与叙事闭环
- **跨系统协调**：确保叙事与游戏机制（属性、事件、道具）一致

---

## 文件清单

| 文件名 | 用途 | 对应 Core 文档 |
|-------|------|---------------|
| `MainStoryArc.md` | 主线剧情大纲 | 全局叙事框架 |
| `Act1_Outline.md` | 场景1剧情线 | SceneSystemArchitecture (Act1) |
| `Act2_Outline.md` | 场景2剧情线 | SceneSystemArchitecture (Act2) |
| `Act3_Outline.md` | 场景3剧情线 | SceneSystemArchitecture (Act3) |
| `EndingBranches.md` | 结局分支总览 | EndingSystemArchitecture |

---

## 依赖关系

```
MainStoryArc.md (顶层设计)
    ├── Act1_Outline.md ──→ Events_Act1_Prep.md
    ├── Act2_Outline.md ──→ Events_Act2_Crossing.md
    └── Act3_Outline.md ──→ Events_Act3_USA.md
              │
              ▼
       EndingBranches.md
```

**依赖说明**：
- StoryOutline 定义**故事框架**，DesignDocs/Events/ 定义**具体实现**
- 剧情线文档中的"剧情节点"对应事件文档中的"关键事件"
- 结局分支中的触发条件直接引用 Core/EndingSystemArchitecture 的定义

---

## 与 DesignDocs 的对应关系

| StoryOutline | DesignDocs 对应文件 |
|-------------|-------------------|
| `Act1_Outline.md` 剧情节点 | `Events_Act1_Prep.md` 主动事件/随机事件 |
| `Act2_Outline.md` 环境挑战 | `Events_Act2_Crossing.md` 危机事件 |
| `Act3_Outline.md` 身份追寻 | `Events_Act3_USA.md` 通关事件 |
| `EndingBranches.md` 结局表格 | `EndingSystemArchitecture.md` 结局类型定义 |

**协作流程**：
1. StoryOutline 先定义"需要什么剧情"
2. Events 文档定义"如何实现这些剧情"
3. 双方保持同步更新，确保叙事意图被准确实现

---

## 文案风格规范

所有 StoryOutline 文档遵循以下叙事规范：

### 1. 基调与视角
- **基调**：冷静克制的旁观者视角，带黑色幽默
- **视角**：第二人称（"你"）
- **人称**：避免直接说教，让事件本身说话

### 2. 数值包装化（严禁直接显示数字）

| ❌ 禁止 | ✅ 正确 |
|-------|-------|
| "健康度-30" | "你感到一阵眩晕" |
| "现金+$120" | "口袋稍微鼓了一点" |
| "倒计时3回合" | "你感觉撑不了多久了" |
| "成功概率60%" | "看起来有希望，但也有风险" |

### 3. 事件描述格式

```markdown
### 事件名称

**你看到了什么**（场景描写，50-100字）

**可选行动**：
1. **选项A**（条件：属性≥X）→ 结果描述 + 数值暗示
2. **选项B** → 结果描述 + 数值暗示
3. **选项C**（需道具：xxx）→ 结果描述 + 数值暗示
```

### 4. 情绪曲线描述

使用五级情绪刻度描述角色状态变化：
- **高涨**：充满希望、决心坚定
- **平稳**：正常状态、略有波动
- **焦虑**：压力累积、开始担忧
- **低落**：身心俱疲、濒临崩溃
- **绝望**：看不到出路、放弃边缘

### 5. 梗与金句原则

- **来源**：推特/现实中的电子宠物事迹、论坛黑话
- **呈现**：藏在事件描述或选项文本中，不直接解释
- **传播性**：单句可截图，有共鸣感

**示例**：
- "明明好好呆在国内一点事也没有，但人就是要去冒险。"
- "赚到的钱和之前被宣传的完全不一样，但是生活需要的资金越来越多。"

---

## 维护提示

1. **版本控制**：重大剧情变更需记录变更日志
2. **同步更新**：修改 StoryOutline 时，需同步检查对应 Events 文档
3. **一致性检查**：确保角色属性成长、资源消耗与叙事描述一致
4. **结局唯一性**：每个剧情线最终必须指向 EndingBranches 中定义的某个结局

---

> 更多设计约束请参考 `/PlanDoc/DesignDocs/DesignPrinciples.md`
