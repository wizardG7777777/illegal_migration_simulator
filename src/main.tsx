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

// 初始化应用
async function initApp() {
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  
  // 先显示加载状态
  root.render(<LoadingScreen />);
  
  try {
    // 加载游戏数据
    await dataLoader.loadAll();
    console.log('[App] 数据加载完成');
  } catch (error) {
    console.error('[App] 数据加载失败:', error);
  }

  // 渲染主应用
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

initApp();
