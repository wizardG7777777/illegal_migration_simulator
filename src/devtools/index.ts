/**
 * DevTools 模块统一导出
 * 
 * 开发工具模块包含：
 * - Dashboard: 开发仪表盘主组件
 * - DevToolsOverlay: 游戏内悬浮窗
 * - Console: 开发者控制台
 * - hooks/useDevData: 开发数据获取 Hook
 * - hooks/useConsole: 控制台状态管理 Hook
 * - components/*: 各个功能面板组件
 */

// 主组件
export { DevDashboard } from './Dashboard';
export { DevToolsOverlay } from './DevToolsOverlay';
export { Console } from './Console';

// Hooks
export { useDevData } from './hooks/useDevData';
export { useConsole } from './hooks/useConsole';

// 命令注册中心
export {
  commandRegistry,
  CommandRegistry,
  type ConsoleCommand,
  type CommandContext,
  type CommandResult,
} from './commandRegistry';

// 组件（按需导入）
export { EventGraphPanel } from './components/EventGraphPanel';
export { BalancePanel } from './components/BalancePanel';
export { EventSandbox } from './components/EventSandbox';
export { EventBrowser } from './components/EventBrowser';
export { ItemBrowser } from './components/ItemBrowser';

// 默认导出
export { DevDashboard as default } from './Dashboard';
