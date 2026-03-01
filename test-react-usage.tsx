/**
 * React 使用测试文件
 * 验证 Store 是否能被 React 组件正常使用
 */

import { useGameStore } from './src/store';

// ============================================
// 测试基本的 React 组件使用
// ============================================

function TestComponent() {
  // 测试1: 使用 selector 获取嵌套状态
  const character = useGameStore(state => state.state.character);
  
  // 测试2: 解构获取 actions
  const { endTurn, startNewGame } = useGameStore();
  
  // 测试3: 获取状态和 action 的组合
  const currentScene = useGameStore(state => state.state.scene.currentScene);
  const { executeEvent } = useGameStore();
  
  return (
    <div>
      <p>角色名: {character.name}</p>
      <p>当前场景: {currentScene}</p>
      <button onClick={endTurn}>结束回合</button>
      <button onClick={() => startNewGame('测试角色')}>新游戏</button>
    </div>
  );
}

// ============================================
// 测试使用选择器
// ============================================

import { selectCharacter, selectTerminalStatus } from './src/store/selectors';

function TestWithSelectors() {
  // 这种方式需要 useGameStore 支持 selector 函数
  const character = useGameStore(selectCharacter);
  const terminalStatus = useGameStore(selectTerminalStatus);
  
  return (
    <div>
      <p>健康: {character.resources.health.current}</p>
      {terminalStatus && (
        <p>终结态倒计时: {terminalStatus.countdown}</p>
      )}
    </div>
  );
}

// ============================================
// 测试 vanilla store 的直接使用（非React方式）
// ============================================

function TestVanillaUsage() {
  // vanilla store 可以直接调用 getState() 和 setState()
  const handleClick = () => {
    // 这是 vanilla store 的用法
    const state = useGameStore.getState();
    state.endTurn();
  };
  
  return <button onClick={handleClick}>Vanilla方式结束回合</button>;
}

export { TestComponent, TestWithSelectors, TestVanillaUsage };
