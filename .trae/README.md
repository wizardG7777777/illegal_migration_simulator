# Trae MCP 配置说明

## 配置位置

MCP配置文件位于 [`.trae/mcp.json`](file:///Users/yanchenyu/Documents/WebApps/illegal_immigration_simulator/GoDot_migration_simulator/.trae/mcp.json)

## 已配置的 MCP

### SceneView MCP - Godot 场景渲染工具

**项目路径**: `/Users/yanchenyu/Documents/PythonProjects/sceneView`

**功能**: 专为 Godot 引擎打造的 MCP 工具，用于场景渲染与图片交付

#### 核心特性

- **场景渲染**：将 Godot 场景渲染为 PNG 图片并返回
- **只读设计**：不修改任何场景文件，仅在内存中渲染
- **零依赖运行**：无需 Godot 编辑器，无需插件，无需端口

#### 架构

```
AI Agent ◄──stdio──► Python MCP Server ──subprocess──► godot -s render.gd
                                                        (renders PNG, exits)
```

#### 可用工具

- `scene_render` - 渲染指定场景并返回 PNG 图片
  - `scene_path`（必需）：场景文件的绝对路径
  - `resolution`（可选）：分辨率 `{x, y}`，默认 1152×648
  - `camera_position`（可选）：相机位置 `{x, y}`
  - `camera_zoom`（可选）：缩放倍数，默认 1.0

#### 环境变量配置

| 变量 | 当前值 | 说明 |
|------|--------|------|
| `GODOT_PATH` | `/Applications/Godot.app/Contents/MacOS/Godot` | Godot 可执行文件路径 |
| `SCENE_VIEW_MAX_CONCURRENT` | `2` | 最大并行渲染进程数 |
| `SCENE_VIEW_TIMEOUT` | `30` | 渲染超时（秒） |
| `SCENE_VIEW_RESOLUTION` | `1152x648` | 默认分辨率 |

#### 使用示例

```
用户: 帮我看一下 Room.tscn 场景
AI: [调用 scene_render 渲染场景，传入 /Users/yanchenyu/Documents/WebApps/illegal_immigration_simulator/GoDot_migration_simulator/scene/Room.tscn]
```

## 配置说明

当前配置使用 **uv** 从本地源码运行 MCP 服务器：

```json
{
  "mcpServers": {
    "scene-view": {
      "command": "uv",
      "args": [
        "--directory",
        "/Users/yanchenyu/Documents/PythonProjects/sceneView",
        "run",
        "scene-view-mcp"
      ],
      "env": {
        "GODOT_PATH": "/Applications/Godot.app/Contents/MacOS/Godot"
      }
    }
  }
}
```

## 环境要求

- macOS（已测试）/ Windows / Linux 桌面
- Python 3.10+
- Godot 4.x 可执行文件
- uv (Python 包管理器)

## 故障排查

1. **uv 未安装**: 确保已安装 uv：`curl -LsSf https://astral.sh/uv/install.sh | sh`
2. **Godot 路径错误**: 确认 `GODOT_PATH` 指向正确的 Godot 可执行文件
3. **依赖缺失**: 在 sceneView 目录运行 `uv sync` 安装依赖
4. **GPU 渲染问题**: 确保系统有图形界面，不支持无头服务器环境

## 验证 MCP 工作

重启 Trae 后，MCP 工具应该自动加载。你可以通过以下方式测试：

1. 打开 Trae 的 AI 聊天
2. 询问 "帮我渲染 Room.tscn 场景"
3. AI 应该能够调用 `scene_render` 工具

## 项目特定信息

针对这个 Godot 项目：
- **场景目录**: `scene/`
- **主场景**: `scene/Room.tscn`
- **项目根目录**: `/Users/yanchenyu/Documents/WebApps/illegal_immigration_simulator/GoDot_migration_simulator`
- **Godot 版本**: 4.6
