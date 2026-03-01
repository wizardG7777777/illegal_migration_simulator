/**
 * useConsole Hook
 * 
 * 控制台状态管理 Hook
 * 负责命令历史、输出记录、命令执行等功能
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { commandRegistry, type CommandContext } from '../commandRegistry';
import { useGameStore, setState as setGameState } from '../../store';
import type { GameState } from '../../types';

/**
 * 控制台输出类型
 */
export interface ConsoleOutput {
  /** 输出类型 */
  type: 'input' | 'output' | 'error' | 'system';
  /** 内容 */
  content: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 控制台状态
 */
export interface ConsoleState {
  /** 命令历史 */
  history: string[];
  /** 输出记录 */
  output: ConsoleOutput[];
  /** 当前输入 */
  currentInput: string;
  /** 历史索引（用于上下箭头导航） */
  historyIndex: number;
  /** 是否显示自动补全建议 */
  showSuggestions: boolean;
  /** 自动补全建议列表 */
  suggestions: string[];
  /** 选中的建议索引 */
  selectedSuggestion: number;
}

/**
 * 控制台 Hook 返回类型
 */
export interface UseConsoleReturn {
  /** 当前状态 */
  state: ConsoleState;
  /** 设置当前输入 */
  setCurrentInput: (input: string) => void;
  /** 执行命令 */
  executeCommand: (input: string) => void;
  /** 导航历史命令 */
  navigateHistory: (direction: 'up' | 'down') => void;
  /** 清屏 */
  clearOutput: () => void;
  /** 选择建议 */
  selectSuggestion: (index: number) => void;
  /** 导航建议 */
  navigateSuggestions: (direction: 'up' | 'down') => void;
  /** 应用选中的建议 */
  applySuggestion: () => void;
  /** 关闭建议 */
  closeSuggestions: () => void;
  /** 更新建议 */
  updateSuggestions: (input: string) => void;
}

/**
 * 历史记录存储键名
 */
const HISTORY_STORAGE_KEY = 'dev_console_history';
const MAX_HISTORY_SIZE = 100;
const MAX_OUTPUT_SIZE = 500;

/**
 * 控制台 Hook
 */
export function useConsole(): UseConsoleReturn {
  // 从 store 获取当前状态
  const gameState = useGameStore(s => s.state);
  const store = useGameStore();

  // 本地状态
  const [state, setState] = useState<ConsoleState>(() => {
    // 尝试从 localStorage 加载历史
    const savedHistory = typeof window !== 'undefined' 
      ? localStorage.getItem(HISTORY_STORAGE_KEY) 
      : null;
    
    return {
      history: savedHistory ? JSON.parse(savedHistory) : [],
      output: [{
        type: 'system',
        content: '🛠️ 开发者控制台已就绪\n输入 /help 查看可用命令',
        timestamp: Date.now(),
      }],
      currentInput: '',
      historyIndex: -1,
      showSuggestions: false,
      suggestions: [],
      selectedSuggestion: 0,
    };
  });

  // 引用最新的 gameState，避免闭包问题
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // 保存历史到 localStorage
  const saveHistory = useCallback((history: string[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY_SIZE)));
    }
  }, []);

  // 创建命令上下文
  const createContext = useCallback((): CommandContext => ({
    getState: () => gameStateRef.current,
    setState: (newState: GameState) => {
      // 通过 store 更新状态
      setGameState({ state: newState }, 'devConsole/setState');
    },
    store: store as unknown as CommandContext['store'],
  }), [store]);

  // 更新建议
  const updateSuggestions = useCallback((input: string) => {
    if (!input.trim()) {
      setState(prev => ({ ...prev, showSuggestions: false, suggestions: [] }));
      return;
    }

    const context = createContext();
    const suggestions = commandRegistry.getArgumentSuggestions(input, context);
    
    setState(prev => ({
      ...prev,
      showSuggestions: suggestions.length > 0,
      suggestions: suggestions.slice(0, 10),
      selectedSuggestion: 0,
    }));
  }, [createContext]);

  // 执行命令
  const executeCommand = useCallback((input: string) => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // 添加到输出
    setState(prev => {
      const newOutput: ConsoleOutput[] = [
        ...prev.output,
        { type: 'input', content: `> ${trimmedInput}`, timestamp: Date.now() },
      ];

      // 限制输出数量
      if (newOutput.length > MAX_OUTPUT_SIZE) {
        newOutput.splice(0, newOutput.length - MAX_OUTPUT_SIZE);
      }

      return {
        ...prev,
        output: newOutput,
        currentInput: '',
        showSuggestions: false,
        suggestions: [],
      };
    });

    // 处理清屏命令
    if (trimmedInput.toLowerCase() === '/clear' || trimmedInput.toLowerCase() === 'clear') {
      setState(prev => ({
        ...prev,
        output: [{
          type: 'system',
          content: '🛠️ 开发者控制台已就绪\n输入 /help 查看可用命令',
          timestamp: Date.now(),
        }],
      }));
      
      // 添加到历史
      setState(prev => {
        const newHistory = [trimmedInput, ...prev.history.filter(h => h !== trimmedInput)];
        saveHistory(newHistory);
        return { ...prev, history: newHistory, historyIndex: -1 };
      });
      return;
    }

    // 执行命令
    const context = createContext();
    const result = commandRegistry.execute(trimmedInput, context);

    // 添加到输出
    setState(prev => {
      const newOutput = [...prev.output];
      
      if (result.success) {
        if (result.message && result.message !== '__CLEAR__') {
          newOutput.push({
            type: 'output',
            content: result.message,
            timestamp: Date.now(),
          });
        }
      } else {
        newOutput.push({
          type: 'error',
          content: result.error || '命令执行失败',
          timestamp: Date.now(),
        });
      }

      // 限制输出数量
      if (newOutput.length > MAX_OUTPUT_SIZE) {
        newOutput.splice(0, newOutput.length - MAX_OUTPUT_SIZE);
      }

      return { ...prev, output: newOutput };
    });

    // 添加到历史（不重复添加相同的连续命令）
    setState(prev => {
      const newHistory = prev.history[0] === trimmedInput 
        ? prev.history 
        : [trimmedInput, ...prev.history.filter(h => h !== trimmedInput)].slice(0, MAX_HISTORY_SIZE);
      
      saveHistory(newHistory);
      return { ...prev, history: newHistory, historyIndex: -1 };
    });
  }, [createContext, saveHistory]);

  // 导航历史命令
  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    setState(prev => {
      if (prev.history.length === 0) return prev;

      let newIndex: number;
      if (direction === 'up') {
        newIndex = prev.historyIndex + 1;
        if (newIndex >= prev.history.length) {
          newIndex = prev.history.length - 1;
        }
      } else {
        newIndex = prev.historyIndex - 1;
        if (newIndex < -1) {
          newIndex = -1;
        }
      }

      const newInput = newIndex === -1 ? '' : prev.history[newIndex];

      return {
        ...prev,
        historyIndex: newIndex,
        currentInput: newInput,
        showSuggestions: false,
        suggestions: [],
      };
    });
  }, []);

  // 清屏
  const clearOutput = useCallback(() => {
    setState(prev => ({
      ...prev,
      output: [{
        type: 'system',
        content: '🛠️ 开发者控制台已就绪\n输入 /help 查看可用命令',
        timestamp: Date.now(),
      }],
    }));
  }, []);

  // 选择建议
  const selectSuggestion = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      selectedSuggestion: Math.max(0, Math.min(index, prev.suggestions.length - 1)),
    }));
  }, []);

  // 导航建议
  const navigateSuggestions = useCallback((direction: 'up' | 'down') => {
    setState(prev => {
      if (prev.suggestions.length === 0) return prev;

      let newIndex: number;
      if (direction === 'up') {
        newIndex = prev.selectedSuggestion - 1;
        if (newIndex < 0) newIndex = prev.suggestions.length - 1;
      } else {
        newIndex = prev.selectedSuggestion + 1;
        if (newIndex >= prev.suggestions.length) newIndex = 0;
      }

      return { ...prev, selectedSuggestion: newIndex };
    });
  }, []);

  // 应用选中的建议
  const applySuggestion = useCallback(() => {
    setState(prev => {
      if (!prev.showSuggestions || prev.suggestions.length === 0) return prev;

      const suggestion = prev.suggestions[prev.selectedSuggestion];
      const currentInput = prev.currentInput;

      // 智能替换输入
      let newInput: string;
      if (currentInput.startsWith('/')) {
        // 命令模式
        const parts = currentInput.slice(1).split(/\s+/);
        const lastPart = parts[parts.length - 1];
        
        if (parts.length === 1) {
          // 替换命令名
          newInput = `/${suggestion}`;
        } else if (suggestion.startsWith(lastPart) || lastPart === '') {
          // 替换最后一个参数
          parts[parts.length - 1] = suggestion;
          newInput = '/' + parts.join(' ');
        } else {
          // 追加建议
          newInput = currentInput + suggestion;
        }
      } else {
        newInput = suggestion;
      }

      return {
        ...prev,
        currentInput: newInput,
        showSuggestions: false,
        suggestions: [],
      };
    });
  }, []);

  // 关闭建议
  const closeSuggestions = useCallback(() => {
    setState(prev => ({
      ...prev,
      showSuggestions: false,
      suggestions: [],
    }));
  }, []);

  // 设置当前输入
  const setCurrentInput = useCallback((input: string) => {
    setState(prev => ({
      ...prev,
      currentInput: input,
      // 重置历史索引当用户手动输入时
      historyIndex: input !== prev.currentInput && prev.historyIndex !== -1 ? -1 : prev.historyIndex,
    }));
    
    // 更新建议
    updateSuggestions(input);
  }, [updateSuggestions]);

  return {
    state,
    setCurrentInput,
    executeCommand,
    navigateHistory,
    clearOutput,
    selectSuggestion,
    navigateSuggestions,
    applySuggestion,
    closeSuggestions,
    updateSuggestions,
  };
}
