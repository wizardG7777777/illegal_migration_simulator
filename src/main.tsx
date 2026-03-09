import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { dataLoader } from './systems/loader/DataLoader';

// 加载状态组件
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">加载游戏数据...</p>
      </div>
    </div>
  );
}

// 错误状态组件
function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-red-400 mb-2">数据加载失败</h1>
        <p className="text-slate-400 text-sm">{message}</p>
        <p className="text-slate-500 text-xs mt-4">请刷新页面重试</p>
      </div>
    </div>
  );
}

// 初始化应用
async function initApp() {
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  
  // 先显示加载状态
  root.render(<LoadingScreen />);
  
  try {
    // 加载游戏数据
    await dataLoader.loadAll();
    console.log('[App] 数据加载完成');
    
    // 数据加载成功，渲染主应用
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('[App] 数据加载失败:', error);
    // 显示错误页面
    root.render(
      <ErrorScreen 
        message={error instanceof Error ? error.message : '未知错误'} 
      />
    );
  }
}

initApp();
