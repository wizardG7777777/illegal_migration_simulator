/**
 * useDevData Hook
 * 
 * 开发数据获取 Hook，用于加载和管理开发工具所需的游戏数据
 * 包括事件、道具等
 */

import { useState, useEffect, useCallback } from 'react';
import type { GameEvent } from '../../types/event';
import type { AnyItem as Item } from '../../types/item';
import { dataLoader } from '../../systems/loader/DataLoader';

/**
 * 开发数据状态
 */
interface DevDataState {
  /** 所有事件 */
  events: GameEvent[];
  /** 所有道具 */
  items: Item[];
  /** 是否加载中 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
}

/**
 * 初始状态
 */
const initialState: DevDataState = {
  events: [],
  items: [],
  loading: true,
  error: null,
};

/**
 * 开发数据 Hook
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { events, items, loading, error, reload } = useDevData();
 *   
 *   if (loading) return <div>加载中...</div>;
 *   if (error) return <div>错误: {error}</div>;
 *   
 *   return <div>已加载 {events.length} 个事件</div>;
 * }
 * ```
 */
export function useDevData() {
  const [state, setState] = useState<DevDataState>(initialState);

  /**
   * 加载数据
   */
  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 确保数据已加载
      if (!dataLoader.isLoaded()) {
        await dataLoader.loadAll();
      }

      const events = dataLoader.getAllEvents();
      const items = dataLoader.getAllItems();

      setState({
        events,
        items,
        loading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * 重新加载数据
   */
  const reload = useCallback(async () => {
    dataLoader.clearCache();
    await loadData();
  }, [loadData]);

  // 初始加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...state,
    reload,
  };
}

export default useDevData;
