# Migration Simulator (移民模拟器)

> 本项目最初以「甜甜圈模拟器」为原型，现已扩展为包含更多角色（润人）的移民主题模拟器。

**⚠️ 当前状态：未完成 / 开发中**

---

## 项目分支说明

本项目目前分为两个分支，分别基于不同的技术栈和视觉表现方向进行探索：

### `main` — Godot 分支（当前主分支）

- **技术栈**：Godot 4.6
- **方向**：以类《星露谷物语》的 2D 像素风格作为视觉表现形式的探索
- **状态**：活跃开发中
- **内容**：包含场景（`.tscn`）、脚本（GDScript）、TileMap 地图、角色动画素材、家具交互系统等

### `React_archived` — React 分支（已归档）

- **技术栈**：React + HTML5
- **方向**：基于网页的交互式文字/卡牌模拟器
- **状态**：已归档，保留作为基准参考
- **内容**：包含 React 组件、事件 JSON 数据、UI 模块等

> 注：团队因视觉表现需求，以及后续开发的考虑，决定从 React 迁移至 Godot 进行后续开发。React 分支完整保留了迁移前的全部代码与数据，可供对比与参考。

---

## 共享文档

**`PlanDoc/` 目录为两个分支共享的策划与记录文档。**

无论你在哪个分支工作，设计文档、事件策划、角色设定、系统架构、叙事大纲等均保持一致，确保双分支在内容层面始终对齐。

---

## 快速开始

### 运行 Godot 版本（main 分支）

1. 安装 [Godot 4.6](https://godotengine.org/)
2. 打开项目根目录下的 `project.godot`
3. 主场景为 `scene/Room.tscn`

### 运行 React 版本（React_archived 分支）

```bash
git checkout React_archived
npm install
npm run dev
```

---

## 项目结构（main 分支）

```
scene/          # 场景文件（Room.tscn 等）
script/         # GDScript 脚本
assets/         # 游戏素材（角色、家具、图块集）
PlanDoc/        # 策划与设计文档（与 React 分支共享）
project.godot   # Godot 项目配置
```

---

## 技术规格

- **引擎**：Godot 4.6
- **渲染器**：GL Compatibility（OpenGL 兼容模式）
- **物理引擎**：Jolt Physics
- **设计分辨率**：640 × 360（canvas_items 拉伸模式）
- **编码**：UTF-8

---

## 许可证
目前没有明确许可证类型，但是预计会使用 MIT 许可证。
