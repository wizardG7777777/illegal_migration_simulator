# AGENTS.md

本文档为 AI 编程助手提供项目背景信息，帮助理解项目结构、技术栈和开发规范。

## 项目概述

**项目名称**: migration_simulator (迁移模拟器)  
**项目描述**: 原《甜甜圈模拟器》，现在扩展到若干更多的润人。  
**引擎版本**: Godot 4.6  
**项目类型**: 2D 游戏/模拟器

这是一个基于 Godot 引擎开发的 2D 模拟类游戏，最初以"甜甜圈模拟器"为原型，现已扩展为包含更多角色（润人）的迁移主题模拟器。

## 技术栈

- **游戏引擎**: Godot 4.6
- **功能特性**: Mobile 渲染功能集
- **物理引擎**: Jolt Physics (3D 物理)
- **渲染器**: GL Compatibility (OpenGL 兼容模式)
- **分辨率**: 640×360 视口，canvas_items 拉伸模式
- **字符编码**: UTF-8

## 项目结构

```
.
├── .godot/                 # Godot 引擎内部文件和缓存（已 gitignore）
├── scene/                  # 场景文件目录
│   └── Room.tscn          # 主场景（Node2D 根节点）
├── icon.svg               # 项目图标
├── icon.svg.import        # 图标导入配置
├── project.godot          # 项目主配置文件
├── .editorconfig          # 编辑器配置（UTF-8 编码）
├── .gitignore             # Git 忽略规则
└── .gitattributes         # Git 行尾规范化配置（LF）
```

## 关键配置文件

### project.godot
- 应用名称和描述
- 视口尺寸设置（640×360）
- 渲染器配置（GL Compatibility）
- 物理引擎配置（Jolt Physics）

### .editorconfig
```ini
root = true
[*]
charset = utf-8
```

### .gitignore
- `.godot/` - Godot 引擎缓存和临时文件
- `/android/` - Android 构建输出

### .gitattributes
- 所有文本文件使用 LF 行尾
- 自动规范化行尾符

## 代码组织

目前项目处于早期开发阶段：

- **场景**: 使用 `.tscn` 格式存储（Godot 文本场景格式）
- **场景根节点**: 当前仅有 `Room.tscn`，根节点为 `Node2D` 类型
- **资源导入**: 所有外部资源（如 SVG 图标）通过 `.import` 文件配置导入参数

## 开发规范

### 文件命名
- 场景文件使用 PascalCase 命名（如 `Room.tscn`）
- 资源导入配置使用 `{filename}.{ext}.import` 格式

### 编码规范
- 所有源文件使用 UTF-8 编码
- 文本文件使用 LF 行尾（由 Git 自动处理）

### 资源管理
- 外部资源导入后存储在 `.godot/imported/` 目录
- 不要手动修改 `.godot/` 目录下的文件，由引擎自动管理

## 构建和运行

### 使用 Godot 编辑器
1. 使用 Godot 4.6 或兼容版本打开项目
2. 编辑器会自动加载 `project.godot`
3. 主场景为 `scene/Room.tscn`

### 导出配置
- 项目配置了 Mobile 渲染功能集
- Android 导出目录为 `/android/`（已 gitignore）
- Windows 平台使用 D3D12 渲染设备驱动

## 注意事项

1. **不要提交 `.godot/` 目录**: 这是 Godot 的缓存目录，已在 `.gitignore` 中排除
2. **场景文件格式**: 使用 Godot 4.x 的文本场景格式（format=3）
3. **物理引擎**: 项目使用 Jolt Physics 作为 3D 物理引擎，即使主要是 2D 项目
4. **分辨率设计**: 游戏设计分辨率为 640×360，使用 canvas_items 拉伸模式适配不同屏幕

## 扩展建议

当添加新功能时，建议遵循以下目录结构：

```
scene/           # 场景文件
script/          # GDScript 脚本（建议创建）
assets/          # 原始资源文件（建议创建）
   ├── texture/  # 纹理/图片
   ├── audio/    # 音频文件
   └── font/     # 字体文件
```
