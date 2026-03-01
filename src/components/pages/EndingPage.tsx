/**
 * EndingPage 页面组件
 * 结局页面：显示结局文本、游戏统计、返回主菜单/重新开始
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore } from '../../store';
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';

export interface EndingPageProps {
  /** 结局ID */
  endingId?: string;
}

/**
 * 结局数据（示例，实际应从配置加载）
 */
const ENDING_DATA: Record<string, {
  title: string;
  icon: string;
  description: string;
  color: string;
  type: 'success' | 'failure' | 'neutral';
}> = {
  // 成功结局
  green_card_work: {
    title: '辛勤的收获',
    icon: '🟢',
    description: '经过多年的努力工作和等待，你终于通过劳工移民获得了绿卡。虽然过程艰辛，但你现在可以合法地在美国生活和工作了。',
    color: 'text-green-400',
    type: 'success',
  },
  green_card_marriage: {
    title: '爱情的果实',
    icon: '💍',
    description: '你遇到了真爱，通过婚姻获得了绿卡。无论这段关系开始的原因是什么，你们都决定一起面对未来的生活。',
    color: 'text-pink-400',
    type: 'success',
  },
  green_card_asylum: {
    title: '重生的希望',
    icon: '🕊️',
    description: '你的庇护申请终于被批准了。虽然经历了漫长的等待和无数次的焦虑，但你终于可以在美国安全地生活下去了。',
    color: 'text-blue-400',
    type: 'success',
  },
  green_card_talent: {
    title: '人才的认可',
    icon: '⭐',
    description: '你的专业能力得到了认可，通过人才移民获得了绿卡。美国这片土地上，终于有了你施展才华的舞台。',
    color: 'text-yellow-400',
    type: 'success',
  },
  
  // 失败结局
  death_dying: {
    title: '长眠他乡',
    icon: '⚰️',
    description: '你的身体终于支撑不住了。在这片陌生的土地上，你留下了最后一口气。没有人知道你的故事，也没有人为你哭泣。',
    color: 'text-red-400',
    type: 'failure',
  },
  death_breakdown: {
    title: '精神的崩溃',
    icon: '😵',
    description: '持续的压力和焦虑最终击垮了你的精神。你失去了理智，被送进了精神病院，在那里度过了余生。',
    color: 'text-purple-400',
    type: 'failure',
  },
  death_jail: {
    title: '铁窗生涯',
    icon: '🔒',
    description: '你被捕入狱，没有保释，也没有大赦。在监狱中，你度过了漫长的岁月，直到生命的尽头。',
    color: 'text-gray-400',
    type: 'failure',
  },
  death_deported: {
    title: '遣返之路',
    icon: '✈️',
    description: '你被移民局抓获并遣返回国。多年的努力化为泡影，你带着破碎的梦想回到了起点。',
    color: 'text-orange-400',
    type: 'failure',
  },
  
  // 中性结局
  survival_illegal: {
    title: '灰色的生存',
    icon: '🐁',
    description: '你没有获得合法身份，但也没有被抓到。你像一只老鼠一样生活在社会的阴影中，每天都在担心明天。',
    color: 'text-slate-400',
    type: 'neutral',
  },
  survival_gave_up: {
    title: '放弃的觉悟',
    icon: '🏠',
    description: '在经历了无数的挫折后，你决定放弃前往美国的梦想，留在国内重新开始。有时候，放弃也是一种勇气。',
    color: 'text-teal-400',
    type: 'neutral',
  },
  
  // 默认
  default: {
    title: '未知的结局',
    icon: '❓',
    description: '你的故事以某种方式结束了，但没有人知道具体发生了什么。',
    color: 'text-slate-400',
    type: 'neutral',
  },
};

/**
 * 获取结局数据
 */
const getEndingData = (endingId: string | undefined) => {
  if (!endingId) return ENDING_DATA.default;
  return ENDING_DATA[endingId] || ENDING_DATA.default;
};

/**
 * 结局页面组件
 */
export const EndingPage = React.memo(function EndingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = useGameStore(s => s.state);
  
  // 从location state或store获取数据
  const locationEndingId = (location.state as { endingId?: string })?.endingId;
  const endingId = locationEndingId || state.meta.endingId;
  const statistics = state.global.statistics;
  
  const [endingData, setEndingData] = useState(ENDING_DATA.default);
  const [isLoading, setIsLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);

  // 加载结局数据
  useEffect(() => {
    // 模拟加载结局配置
    setTimeout(() => {
      setEndingData(getEndingData(endingId));
      setIsLoading(false);
    }, 500);
  }, [endingId]);

  // 处理重新开始
  const handleRestart = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">加载结局...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`
          absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl
          ${endingData.type === 'success' ? 'bg-green-500/5' : ''}
          ${endingData.type === 'failure' ? 'bg-red-500/5' : ''}
          ${endingData.type === 'neutral' ? 'bg-slate-500/5' : ''}
        `} />
        <div className={`
          absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl
          ${endingData.type === 'success' ? 'bg-blue-500/5' : ''}
          ${endingData.type === 'failure' ? 'bg-purple-500/5' : ''}
          ${endingData.type === 'neutral' ? 'bg-teal-500/5' : ''}
        `} />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* 结局卡片 */}
        <Card className="shadow-2xl mb-6">
          {/* 结局标题 */}
          <div className="text-center mb-6">
            <div className={`
              inline-flex items-center justify-center
              w-24 h-24 rounded-full mb-4
              ${endingData.type === 'success' ? 'bg-green-500/10' : ''}
              ${endingData.type === 'failure' ? 'bg-red-500/10' : ''}
              ${endingData.type === 'neutral' ? 'bg-slate-500/10' : ''}
            `}>
              <span className="text-5xl">{endingData.icon}</span>
            </div>
            
            <h1 className={`text-3xl font-bold ${endingData.color} mb-2`}>
              {endingData.title}
            </h1>
            
            <span className={`
              inline-block px-3 py-1 rounded-full text-xs font-medium
              ${endingData.type === 'success' ? 'bg-green-500/10 text-green-400' : ''}
              ${endingData.type === 'failure' ? 'bg-red-500/10 text-red-400' : ''}
              ${endingData.type === 'neutral' ? 'bg-slate-500/10 text-slate-400' : ''}
            `}>
              {endingData.type === 'success' ? '成功结局' : ''}
              {endingData.type === 'failure' ? '失败结局' : ''}
              {endingData.type === 'neutral' ? '其他结局' : ''}
            </span>
          </div>

          {/* 结局描述 */}
          <p className="text-slate-300 leading-relaxed text-center mb-6">
            {endingData.description}
          </p>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <Button
              onClick={handleRestart}
              variant="primary"
              size="lg"
              className="w-full"
            >
              回到主菜单
            </Button>
            
            <Button
              onClick={() => setShowStats(!showStats)}
              variant="secondary"
              size="md"
              className="w-full"
            >
              {showStats ? '隐藏统计' : '查看游戏统计'}
            </Button>
          </div>
        </Card>

        {/* 游戏统计 */}
        {showStats && (
          <Card className="shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <span>📊</span>
              <span>游戏统计</span>
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-900/50 rounded">
                <p className="text-xs text-slate-500">总回合数</p>
                <p className="text-xl font-mono text-slate-300">
                  {statistics.totalTurns}
                </p>
              </div>

              <div className="p-3 bg-slate-900/50 rounded">
                <p className="text-xs text-slate-500">触发事件</p>
                <p className="text-xl font-mono text-slate-300">
                  {statistics.totalEventsTriggered}
                </p>
              </div>

              <div className="p-3 bg-slate-900/50 rounded">
                <p className="text-xs text-slate-500">打工次数</p>
                <p className="text-xl font-mono text-slate-300">
                  {statistics.totalWorkSessions}
                </p>
              </div>

              <div className="p-3 bg-slate-900/50 rounded">
                <p className="text-xs text-slate-500">死亡次数</p>
                <p className="text-xl font-mono text-slate-300">
                  {statistics.deathCount}
                </p>
              </div>

              <div className="p-3 bg-slate-900/50 rounded col-span-2">
                <p className="text-xs text-slate-500">通关次数</p>
                <p className="text-xl font-mono text-slate-300">
                  {statistics.completionCount}
                </p>
              </div>

              {statistics.unlockedEndings.length > 0 && (
                <div className="p-3 bg-slate-900/50 rounded col-span-2">
                  <p className="text-xs text-slate-500 mb-2">已解锁结局</p>
                  <div className="flex flex-wrap gap-2">
                    {statistics.unlockedEndings.map(ending => (
                      <span 
                        key={ending}
                        className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-400"
                      >
                        {ENDING_DATA[ending]?.title || ending}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 底部信息 */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-600">
            感谢游玩《去美国》
          </p>
          <p className="text-xs text-slate-700 mt-1">
            每个选择都有其代价，每个结局都有其意义
          </p>
        </div>
      </div>
    </div>
  );
});

export default EndingPage;
