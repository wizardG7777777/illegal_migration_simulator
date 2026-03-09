/**
 * Console.tsx
 * 
 * 开发者控制台主组件
 * 
 * Props: 无（使用 useGameStore 获取状态）
 * 
 * 界面：
 * ┌─────────────────────────────────────────┐
 * │  🛠️ DevTools                    [—] [×] │
 * ├─────────────────────────────────────────┤
 * │  [仪表盘] [控制台] [日志] [状态]          │
 * ├─────────────────────────────────────────┤
 * │  > set money 1000                      │
 * │  ✓ 现金已设置为 $1000                   │
 * │  > scene act3                          │
 * │  ✓ 场景已切换到 act3                    │
 * │  > _                                   │
 * └─────────────────────────────────────────┘
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { useConsole } from './hooks/useConsole';
import { commandRegistry } from './commandRegistry';
import {
  setCommand,
  sceneCommand,
  eventCommand,
  giveCommand,
  removeCommand,
  debtCommand,
  flagCommand,
  saveCommand,
  loadCommand,
  statusCommand,
  helpCommand,
  clearCommand,
  npcCommand,
  chatCommand,
} from './commands';
import type { ConsoleOutput } from './hooks/useConsole';

// 注册所有命令
function registerAllCommands() {
  commandRegistry.register(setCommand);
  commandRegistry.register(sceneCommand);
  commandRegistry.register(eventCommand);
  commandRegistry.register(giveCommand);
  commandRegistry.register(removeCommand);
  commandRegistry.register(debtCommand);
  commandRegistry.register(flagCommand);
  commandRegistry.register(saveCommand);
  commandRegistry.register(loadCommand);
  commandRegistry.register(statusCommand);
  commandRegistry.register(helpCommand);
  commandRegistry.register(clearCommand);
  commandRegistry.register(npcCommand);
  commandRegistry.register(chatCommand);

  // 注册别名
  commandRegistry.registerAlias('s', 'set');
  commandRegistry.registerAlias('sc', 'scene');
  commandRegistry.registerAlias('e', 'event');
  commandRegistry.registerAlias('g', 'give');
  commandRegistry.registerAlias('rm', 'remove');
  commandRegistry.registerAlias('d', 'debt');
  commandRegistry.registerAlias('f', 'flag');
  commandRegistry.registerAlias('st', 'status');
  commandRegistry.registerAlias('h', 'help');
  commandRegistry.registerAlias('cls', 'clear');
  commandRegistry.registerAlias('c', 'clear');
  commandRegistry.registerAlias('n', 'npc');
  commandRegistry.registerAlias('ch', 'chat');
}

// 只在模块加载时注册一次
registerAllCommands();

/**
 * 控制台样式
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#1a1a2e',
    color: '#eaeaea',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    fontSize: '13px',
    lineHeight: '1.5',
    overflow: 'hidden',
  },
  outputContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '12px',
    paddingBottom: '4px',
  },
  outputItem: {
    marginBottom: '4px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  inputLine: {
    color: '#4ade80', // 绿色
  },
  outputLine: {
    color: '#eaeaea', // 白色
  },
  errorLine: {
    color: '#f87171', // 红色
  },
  systemLine: {
    color: '#60a5fa', // 蓝色
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    borderTop: '1px solid #333',
    backgroundColor: '#16213e',
  },
  inputPrompt: {
    color: '#4ade80',
    marginRight: '8px',
    userSelect: 'none',
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#eaeaea',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    padding: '4px 0',
  },
  suggestionsContainer: {
    position: 'absolute',
    bottom: '44px',
    left: '12px',
    right: '12px',
    backgroundColor: '#16213e',
    border: '1px solid #333',
    borderRadius: '4px',
    maxHeight: '200px',
    overflow: 'auto',
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
  },
  suggestion: {
    padding: '6px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #333',
  },
  suggestionSelected: {
    backgroundColor: '#0f3460',
  },
  suggestionHovered: {
    backgroundColor: '#1a1a2e',
  },
  scrollButton: {
    position: 'absolute',
    right: '16px',
    bottom: '56px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#0f3460',
    border: '1px solid #333',
    color: '#eaeaea',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
      justifyContent: 'center',
    fontSize: '14px',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  scrollButtonVisible: {
    opacity: 1,
  },
};

/**
 * Console 组件
 */
export const Console: React.FC = () => {
  const {
    state,
    setCurrentInput,
    executeCommand,
    navigateHistory,
    clearOutput,
    selectSuggestion,
    navigateSuggestions,
    applySuggestion,
    closeSuggestions,
  } = useConsole();

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const [hoveredSuggestion, setHoveredSuggestion] = React.useState<number | null>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (outputRef.current) {
      const container = outputRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      } else {
        setShowScrollButton(true);
      }
    }
  }, [state.output]);

  // 监听滚动
  const handleScroll = useCallback(() => {
    if (outputRef.current) {
      const container = outputRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      setShowScrollButton(!isNearBottom);
    }
  }, []);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
      setShowScrollButton(false);
    }
  }, []);

  // 处理输入
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentInput(e.target.value);
  }, [setCurrentInput]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Tab - 自动补全
    if (e.key === 'Tab') {
      e.preventDefault();
      if (state.showSuggestions && state.suggestions.length > 0) {
        applySuggestion();
      }
      return;
    }

    // 上下箭头 - 历史命令
    if (e.key === 'ArrowUp') {
      if (state.showSuggestions) {
        e.preventDefault();
        navigateSuggestions('up');
      } else {
        e.preventDefault();
        navigateHistory('up');
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      if (state.showSuggestions) {
        e.preventDefault();
        navigateSuggestions('down');
      } else {
        e.preventDefault();
        navigateHistory('down');
      }
      return;
    }

    // Escape - 关闭建议
    if (e.key === 'Escape') {
      closeSuggestions();
      return;
    }

    // Ctrl+L - 清屏
    if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      clearOutput();
      return;
    }

    // Enter - 执行命令
    if (e.key === 'Enter') {
      if (state.showSuggestions && state.suggestions.length > 0) {
        applySuggestion();
        return;
      }
      executeCommand(state.currentInput);
      return;
    }
  }, [
    state.showSuggestions,
    state.suggestions.length,
    state.currentInput,
    applySuggestion,
    navigateSuggestions,
    navigateHistory,
    closeSuggestions,
    clearOutput,
    executeCommand,
  ]);

  // 渲染输出行
  const renderOutput = (item: ConsoleOutput, index: number) => {
    let style: React.CSSProperties = styles.outputItem;
    switch (item.type) {
      case 'input':
        style = { ...style, ...styles.inputLine };
        break;
      case 'output':
        style = { ...style, ...styles.outputLine };
        break;
      case 'error':
        style = { ...style, ...styles.errorLine };
        break;
      case 'system':
        style = { ...style, ...styles.systemLine };
        break;
    }

    return (
      <div key={index} style={style}>
        {item.content}
      </div>
    );
  };

  // 只在开发模式下渲染
  if (typeof window !== 'undefined' && !import.meta.env.DEV) {
    return (
      <div style={styles.container}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#666',
        }}>
          开发者控制台仅在开发模式可用
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* 输出区域 */}
      <div
        ref={outputRef}
        style={styles.outputContainer}
        onScroll={handleScroll}
      >
        {state.output.map(renderOutput)}
      </div>

      {/* 自动补全建议 */}
      {state.showSuggestions && state.suggestions.length > 0 && (
        <div style={styles.suggestionsContainer as React.CSSProperties}>
          {state.suggestions.map((suggestion, index) => (
            <div
              key={index}
              style={{
                ...styles.suggestion,
                ...(index === state.selectedSuggestion ? styles.suggestionSelected : {}),
                ...(index === hoveredSuggestion ? styles.suggestionHovered : {}),
              }}
              onClick={() => {
                selectSuggestion(index);
                applySuggestion();
                inputRef.current?.focus();
              }}
              onMouseEnter={() => setHoveredSuggestion(index)}
              onMouseLeave={() => setHoveredSuggestion(null)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}

      {/* 滚动到底部按钮 */}
      <button
        style={{
          ...styles.scrollButton,
          ...(showScrollButton ? styles.scrollButtonVisible : {}),
        }}
        onClick={scrollToBottom}
        title="滚动到底部"
      >
        ↓
      </button>

      {/* 输入区域 */}
      <div style={styles.inputContainer}>
        <span style={styles.inputPrompt}>›</span>
        <input
          ref={inputRef}
          type="text"
          value={state.currentInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          style={styles.input}
          placeholder="输入命令... (Tab补全, ↑↓历史, Ctrl+L清屏, /help帮助)"
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
        />
      </div>
    </div>
  );
};

export default Console;
