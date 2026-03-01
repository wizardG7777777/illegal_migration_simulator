/**
 * StartPage 页面组件
 * 开始页面：游戏标题、角色名输入、开始游戏按钮、加载存档
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store';
import { Button } from '../primitives/Button';
import { Card } from '../primitives/Card';

/**
 * 开始页面组件
 */
export const StartPage = React.memo(function StartPage() {
  const navigate = useNavigate();
  const { startNewGame, getSaveList, loadFromStorage } = useGameStore();
  
  const [characterName, setCharacterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saves, setSaves] = useState<string[]>([]);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载存档列表
  useEffect(() => {
    const saveList = getSaveList();
    setSaves(saveList);
  }, [getSaveList]);

  // 处理开始新游戏
  const handleStartGame = useCallback(() => {
    if (!characterName.trim()) {
      setError('请输入角色名称');
      return;
    }

    setIsLoading(true);
    setError(null);

    // 短暂延迟以显示加载状态
    setTimeout(() => {
      startNewGame(characterName.trim());
      navigate('/game');
    }, 300);
  }, [characterName, startNewGame, navigate]);

  // 处理加载存档
  const handleLoadGame = useCallback((saveId: string) => {
    setIsLoading(true);
    const success = loadFromStorage(saveId);
    
    if (success) {
      navigate('/game');
    } else {
      setIsLoading(false);
      setError('加载存档失败');
    }
  }, [loadFromStorage, navigate]);

  // 处理输入变化
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCharacterName(e.target.value);
    setError(null);
  }, []);

  // 处理回车键
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleStartGame();
    }
  }, [handleStartGame]);

  // 格式化存档时间
  const formatSaveTime = (saveId: string): string => {
    try {
      // save_xxx_时间戳 格式
      const parts = saveId.split('_');
      if (parts.length >= 3) {
        const timestamp = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(timestamp)) {
          const date = new Date(timestamp);
          return date.toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      }
    } catch {
      // ignore
    }
    return '未知时间';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* 游戏标题 */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-3">
            去美国
          </h1>
          <p className="text-slate-500 text-sm">
            一段关于选择与代价的旅程
          </p>
        </div>

        {/* 主菜单卡片 */}
        {!showLoadMenu ? (
          <Card className="shadow-2xl">
            <div className="space-y-6">
              {/* 角色名输入 */}
              <div>
                <label 
                  htmlFor="character-name" 
                  className="block text-sm font-medium text-slate-400 mb-2"
                >
                  角色名称
                </label>
                <input
                  id="character-name"
                  type="text"
                  value={characterName}
                  onChange={handleNameChange}
                  onKeyDown={handleKeyDown}
                  placeholder="输入你的名字..."
                  maxLength={20}
                  disabled={isLoading}
                  className="
                    w-full px-4 py-3 
                    bg-slate-900 border border-slate-700 rounded-lg
                    text-slate-200 placeholder-slate-600
                    focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                    transition-colors
                    disabled:opacity-50
                  "
                />
                {error && (
                  <p className="mt-2 text-sm text-red-400">{error}</p>
                )}
              </div>

              {/* 开始按钮 */}
              <Button
                onClick={handleStartGame}
                disabled={isLoading}
                variant="primary"
                size="lg"
                className="w-full"
              >
                {isLoading ? '正在创建...' : '开始游戏'}
              </Button>

              {/* 加载存档按钮（如果有存档） */}
              {saves.length > 0 && (
                <Button
                  onClick={() => setShowLoadMenu(true)}
                  disabled={isLoading}
                  variant="secondary"
                  size="md"
                  className="w-full"
                >
                  加载存档 ({saves.length})
                </Button>
              )}
            </div>

            {/* 游戏说明 */}
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                这是一个关于非法移民的文字冒险游戏。<br />
                你的每一个选择都会影响最终的命运。
              </p>
            </div>
          </Card>
        ) : (
          /* 加载存档菜单 */
          <Card className="shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-200">选择存档</h2>
              <Button
                onClick={() => {
                  setShowLoadMenu(false);
                  setError(null); // 清除错误状态
                }}
                variant="ghost"
                size="sm"
              >
                返回
              </Button>
            </div>

            {/* 错误提示 - 在加载菜单中也显示 */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {saves.map((saveId, index) => (
                <button
                  key={saveId}
                  onClick={() => handleLoadGame(saveId)}
                  disabled={isLoading}
                  className="
                    w-full p-3 text-left
                    bg-slate-900/50 hover:bg-slate-800
                    border border-slate-700 hover:border-slate-600
                    rounded-lg transition-colors
                    disabled:opacity-50
                  "
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">
                      存档 {index + 1}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatSaveTime(saveId)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* 底部信息 */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-600">
            按下 ~ 键可在游戏中打开开发者工具
          </p>
        </div>
      </div>
    </div>
  );
});

export default StartPage;
