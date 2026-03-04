/**
 * Dashboard.tsx
 * 
 * 开发工具仪表盘主组件
 * 
 * 功能：
 * - 标签页导航：事件图谱 | 数值平衡 | 事件沙盒 | 事件索引
 * - 仅在 DEV 模式渲染
 * - 数据加载和管理
 */

import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDevData } from './hooks/useDevData';
import { EventGraphPanel } from './components/EventGraphPanel';
import { BalancePanel } from './components/BalancePanel';
import { EventSandbox } from './components/EventSandbox';
import { EventBrowser } from './components/EventBrowser';
import { ItemBrowser } from './components/ItemBrowser';
import { Button, Card } from '../components/primitives';

/**
 * 标签页类型
 */
type TabId = 'graph' | 'balance' | 'sandbox' | 'browser' | 'items';

/**
 * 标签页配置
 */
const tabs: { id: TabId; label: string; description: string }[] = [
  {
    id: 'graph',
    label: '事件图谱',
    description: '查看事件关系和链式连接',
  },
  {
    id: 'balance',
    label: '数值平衡',
    description: '分析事件性价比和生活成本',
  },
  {
    id: 'sandbox',
    label: '事件沙盒',
    description: '测试事件在不同状态下的效果',
  },
  {
    id: 'browser',
    label: '事件索引',
    description: '浏览和验证所有事件',
  },
  {
    id: 'items',
    label: '道具库',
    description: '浏览所有道具并添加到游戏',
  },
];

/**
 * 加载中组件
 */
function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">加载游戏数据...</p>
      </div>
    </div>
  );
}

/**
 * 错误状态组件
 */
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Card className="p-8 max-w-md text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-slate-200 mb-2">加载失败</h2>
        <p className="text-slate-400 mb-4">{error}</p>
        <Button onClick={onRetry}>重试</Button>
      </Card>
    </div>
  );
}

/**
 * 开发仪表盘组件
 */
export function DevDashboard() {
  // 仅在开发模式渲染
  if (import.meta.env.PROD) {
    return <Navigate to="/" replace />;
  }

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('graph');
  const { events, items, loading, error, reload } = useDevData();

  // 添加道具到游戏（开发工具功能）
  const handleAddItem = (itemId: string, count?: number) => {
    // 通过控制台命令添加道具
    const event = new CustomEvent('dev:addItem', {
      detail: { itemId, count: count || 1 }
    });
    window.dispatchEvent(event);
    
    // 显示提示
    alert(`已添加道具: ${itemId} x${count || 1}`);
  };

  // 加载中
  if (loading) {
    return <LoadingState />;
  }

  // 错误
  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* 头部 */}
      <header className="border-b border-slate-800 bg-slate-900/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-slate-100">
                《去美国》开发仪表盘
              </h1>
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded font-medium">
                DEV MODE ONLY
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>{events.length} 个事件</span>
              <span>{items.length} 个道具</span>
              <Button size="sm" variant="ghost" onClick={reload}>
                🔄 刷新数据
              </Button>
              <Button size="sm" variant="secondary" onClick={() => navigate('/game')}>
                🎮 返回游戏
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 导航标签 */}
      <nav className="border-b border-slate-800 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }
                `}
                title={tab.description}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 标签页说明 */}
        <div className="mb-6">
          <p className="text-sm text-slate-500">
            {tabs.find(t => t.id === activeTab)?.description}
          </p>
        </div>

        {/* 面板内容 */}
        <div className="space-y-6">
          {activeTab === 'graph' && <EventGraphPanel events={events} />}
          {activeTab === 'balance' && <BalancePanel events={events} />}
          {activeTab === 'sandbox' && <EventSandbox events={events} />}
          {activeTab === 'browser' && <EventBrowser events={events} items={items} />}
          {activeTab === 'items' && <ItemBrowser items={items} onAddItem={handleAddItem} />}
        </div>
      </main>

      {/* 底部信息 */}
      <footer className="border-t border-slate-800 mt-12 py-6 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <div>
              <p>开发工具仅供内部使用，不会打包到生产环境</p>
            </div>
            <div className="flex gap-4">
              <span>访问方式:</span>
              <code className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                /__devtools/dashboard
              </code>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default DevDashboard;
