/**
 * App.tsx
 * 应用主组件，配置路由和全局Provider
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StartPage, GamePage, EndingPage } from './components/pages';
import { DevToolsOverlay } from './devtools';

// 懒加载开发仪表盘（仅在 DEV 模式使用）
const DevDashboard = import.meta.env.DEV
  ? lazy(() => import('./devtools').then(m => ({ default: m.DevDashboard })))
  : null;

/**
 * 加载中组件
 */
const PageLoading = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-400">加载中...</p>
    </div>
  </div>
);

/**
 * 应用主组件
 */
function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* 首页/开始页面 */}
          <Route path="/" element={<StartPage />} />
          
          {/* 游戏主页面 */}
          <Route path="/game" element={<GamePage />} />
          
          {/* 结局页面 */}
          <Route path="/ending" element={<EndingPage />} />
          
          {/* 开发工具仪表盘（仅在 DEV 模式） */}
          {import.meta.env.DEV && DevDashboard && (
            <Route path="/__devtools/dashboard" element={<DevDashboard />} />
          )}
          
          {/* 404 - 重定向到首页 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      
      {/* DevTools 悬浮窗（仅在 DEV 模式） */}
      {import.meta.env.DEV && <DevToolsOverlay />}
    </BrowserRouter>
  );
}

export default App;
