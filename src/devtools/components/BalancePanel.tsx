/**
 * BalancePanel 组件
 * 
 * 数值平衡面板
 * - 打工事件性价比分析（收入/AP，健康成本，心理成本）
 * - 异常值高亮（偏离均值>30%）
 * - 生活成本压力测试
 */

import React, { useState, useMemo } from 'react';
import type { GameEvent } from '../../types/event';
import { Card } from '../../components/primitives';

/**
 * 平衡面板属性
 */
interface BalancePanelProps {
  /** 所有事件 */
  events: GameEvent[];
}

/**
 * 打工事件数据
 */
interface WorkEventData {
  /** 事件ID */
  id: string;
  /** 事件名称 */
  name: string;
  /** 场景 */
  scene: string;
  /** 行动点消耗 */
  actionPointCost: number;
  /** 金钱收益 */
  moneyGain: number;
  /** 货币类型 */
  currency: 'CNY' | 'USD';
  /** 健康消耗 */
  healthCost: number;
  /** 心理消耗 */
  mentalCost: number;
  /** 属性加成 */
  attributeBonus: string[];
}

/**
 * 计算事件的各项数值
 */
function calculateEventStats(event: GameEvent): WorkEventData | null {
  if (!event.execution) return null;

  let moneyGain = 0;
  let healthCost = 0;
  let mentalCost = 0;
  const currency = event.execution.moneyCurrency || 'CNY';
  const attributeBonus: string[] = [];

  // 遍历所有选项计算平均值
  if (event.choices && event.choices.length > 0) {
    let validChoices = 0;

    event.choices.forEach(choice => {
      const effects = choice.effects;
      if (effects?.resources) {
        const money = effects.resources.money || 0;
        const health = effects.resources.health || 0;
        const mental = effects.resources.mental || 0;

        if (money > 0 || health < 0 || mental < 0) {
          moneyGain += money;
          healthCost += Math.abs(Math.min(0, health));
          mentalCost += Math.abs(Math.min(0, mental));
          validChoices++;
        }
      }

      if (effects?.attributes) {
        Object.entries(effects.attributes).forEach(([attr, value]) => {
          if (value && value > 0) {
            attributeBonus.push(attr);
          }
        });
      }
    });

    if (validChoices > 0) {
      moneyGain = Math.round(moneyGain / validChoices);
      healthCost = Math.round(healthCost / validChoices);
      mentalCost = Math.round(mentalCost / validChoices);
    }
  }

  // 只返回有收益的工作事件
  if (moneyGain <= 0) return null;

  return {
    id: event.id,
    name: event.name,
    scene: event.scenes[0] || 'unknown',
    actionPointCost: event.execution.actionPointCost,
    moneyGain,
    currency,
    healthCost,
    mentalCost,
    attributeBonus: [...new Set(attributeBonus)],
  };
}

/**
 * 评分等级
 */
function getRating(data: WorkEventData): { score: number; label: string; color: string } {
  const incomePerAP = data.moneyGain / data.actionPointCost;
  const healthPerAP = data.healthCost / data.actionPointCost;
  const mentalPerAP = data.mentalCost / data.actionPointCost;

  // 综合评分 (收入/AP - 健康成本 - 心理成本/2)
  const score = incomePerAP - healthPerAP * 2 - mentalPerAP;

  if (score >= 50) return { score, label: '★★★★★ 最优', color: 'text-green-400' };
  if (score >= 30) return { score, label: '★★★★☆ 优秀', color: 'text-blue-400' };
  if (score >= 15) return { score, label: '★★★☆☆ 良好', color: 'text-yellow-400' };
  if (score >= 5) return { score, label: '★★☆☆☆ 一般', color: 'text-orange-400' };
  return { score, label: '★☆☆☆☆ 较差', color: 'text-red-400' };
}

/**
 * 计算统计数据
 */
function calculateStats(data: WorkEventData[]) {
  if (data.length === 0) return null;

  const incomePerAP = data.map(d => d.moneyGain / d.actionPointCost);
  const healthPerAP = data.map(d => d.healthCost / d.actionPointCost);
  const mentalPerAP = data.map(d => d.mentalCost / d.actionPointCost);

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    avgIncomePerAP: avg(incomePerAP),
    avgHealthPerAP: avg(healthPerAP),
    avgMentalPerAP: avg(mentalPerAP),
  };
}

/**
 * 生活成本压力测试配置
 */
interface LivingCostConfig {
  name: string;
  food: number;
  lodging: number;
  transport: number;
  inflation?: number;
  note?: string;
}

const livingCostConfigs: LivingCostConfig[] = [
  { name: '基础配置', food: 400, lodging: 600, transport: 100, note: '合租+公交' },
  { name: '中等配置', food: 400, lodging: 1200, transport: 350, note: '公寓+二手车' },
  { name: '高端配置', food: 400, lodging: 2500, transport: 600, note: 'House+特斯拉' },
  { name: '最差配置', food: 400, lodging: 0, transport: 50, note: '收容所+公交（有debuff）' },
  { name: '+20%通胀', food: 480, lodging: 720, transport: 120, inflation: 1.2, note: '基础配置+通胀' },
  { name: '+50%通胀', food: 600, lodging: 900, transport: 150, inflation: 1.5, note: '严重通胀' },
];

/**
 * 平衡面板组件
 */
export function BalancePanel({ events }: BalancePanelProps) {
  const [selectedScene, setSelectedScene] = useState<string>('all');

  // 提取打工事件
  const workEvents = useMemo(() => {
    return events
      .map(calculateEventStats)
      .filter((e): e is WorkEventData => e !== null);
  }, [events]);

  // 获取所有场景
  const scenes = useMemo(() => {
    const sceneSet = new Set<string>();
    workEvents.forEach(e => sceneSet.add(e.scene));
    return Array.from(sceneSet).sort();
  }, [workEvents]);

  // 过滤事件
  const filteredEvents = useMemo(() => {
    if (selectedScene === 'all') return workEvents;
    return workEvents.filter(e => e.scene === selectedScene);
  }, [workEvents, selectedScene]);

  // 计算统计
  const stats = useMemo(() => calculateStats(filteredEvents), [filteredEvents]);

  // 检测异常值
  const eventsWithOutliers = useMemo(() => {
    if (!stats) return [];

    return filteredEvents.map(event => {
      const incomePerAP = event.moneyGain / event.actionPointCost;
      const healthPerAP = event.healthCost / event.actionPointCost;
      const mentalPerAP = event.mentalCost / event.actionPointCost;

      const isOutlier =
        Math.abs(incomePerAP - stats.avgIncomePerAP) / stats.avgIncomePerAP > 0.3 ||
        Math.abs(healthPerAP - stats.avgHealthPerAP) / (stats.avgHealthPerAP || 1) > 0.5 ||
        Math.abs(mentalPerAP - stats.avgMentalPerAP) / (stats.avgMentalPerAP || 1) > 0.5;

      return { ...event, isOutlier };
    });
  }, [filteredEvents, stats]);

  return (
    <div className="space-y-6">
      {/* 场景选择 */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm text-slate-400">选择场景:</label>
          <select
            value={selectedScene}
            onChange={e => setSelectedScene(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">全部场景</option>
            {scenes.map(scene => (
              <option key={scene} value={scene}>
                {scene}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* 统计数据 */}
      {stats && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">统计数据</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-slate-900 rounded">
              <div className="text-xs text-slate-500">平均收入/AP</div>
              <div className="text-lg font-semibold text-green-400">
                {stats.avgIncomePerAP.toFixed(1)}
              </div>
            </div>
            <div className="p-3 bg-slate-900 rounded">
              <div className="text-xs text-slate-500">平均健康/AP</div>
              <div className="text-lg font-semibold text-red-400">
                {stats.avgHealthPerAP.toFixed(1)}
              </div>
            </div>
            <div className="p-3 bg-slate-900 rounded">
              <div className="text-xs text-slate-500">平均心理/AP</div>
              <div className="text-lg font-semibold text-orange-400">
                {stats.avgMentalPerAP.toFixed(1)}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 打工事件表格 */}
      <Card
        header={<h3 className="font-medium text-slate-200">打工事件性价比分析</h3>}
        className="overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-3 text-slate-400 font-medium">事件</th>
                <th className="text-center py-2 px-3 text-slate-400 font-medium">场景</th>
                <th className="text-right py-2 px-3 text-slate-400 font-medium">收入/AP</th>
                <th className="text-right py-2 px-3 text-slate-400 font-medium">健康/AP</th>
                <th className="text-right py-2 px-3 text-slate-400 font-medium">心理/AP</th>
                <th className="text-center py-2 px-3 text-slate-400 font-medium">货币</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">评级</th>
              </tr>
            </thead>
            <tbody>
              {eventsWithOutliers.map(event => {
                const rating = getRating(event);
                const incomePerAP = (event.moneyGain / event.actionPointCost).toFixed(1);
                const healthPerAP = (event.healthCost / event.actionPointCost).toFixed(1);
                const mentalPerAP = (event.mentalCost / event.actionPointCost).toFixed(1);

                return (
                  <tr
                    key={event.id}
                    className={`border-b border-slate-800 hover:bg-slate-800/50 ${
                      event.isOutlier ? 'bg-red-900/10' : ''
                    }`}
                  >
                    <td className="py-2 px-3">
                      <div className="font-medium text-slate-300">{event.name}</div>
                      <code className="text-xs text-slate-500">{event.id}</code>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="text-xs px-2 py-1 bg-slate-900 rounded text-slate-400">
                        {event.scene}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-green-400">
                      {event.isOutlier && parseFloat(incomePerAP) > 50 && '⚠️ '}
                      {incomePerAP}
                    </td>
                    <td className="py-2 px-3 text-right text-red-400">{healthPerAP}</td>
                    <td className="py-2 px-3 text-right text-orange-400">{mentalPerAP}</td>
                    <td className="py-2 px-3 text-center text-slate-500">{event.currency}</td>
                    <td className={`py-2 px-3 ${rating.color}`}>{rating.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {eventsWithOutliers.length === 0 && (
          <div className="py-8 text-center text-slate-500">暂无打工事件数据</div>
        )}
      </Card>

      {/* 生活成本压力测试 */}
      <Card
        header={<h3 className="font-medium text-slate-200">生活成本压力测试（场景3）</h3>}
        className="overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-3 text-slate-400 font-medium">配置</th>
                <th className="text-right py-2 px-3 text-slate-400 font-medium">食品</th>
                <th className="text-right py-2 px-3 text-slate-400 font-medium">住宿</th>
                <th className="text-right py-2 px-3 text-slate-400 font-medium">出行</th>
                <th className="text-right py-2 px-3 text-slate-400 font-medium">总计/月</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">备注</th>
              </tr>
            </thead>
            <tbody>
              {livingCostConfigs.map(config => {
                const total = config.food + config.lodging + config.transport;
                const displayTotal = config.inflation
                  ? Math.round(total * config.inflation)
                  : total;
                const isHighCost = displayTotal > 1500;

                return (
                  <tr key={config.name} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-2 px-3 font-medium text-slate-300">{config.name}</td>
                    <td className="py-2 px-3 text-right text-slate-400">${config.food}</td>
                    <td className="py-2 px-3 text-right text-slate-400">${config.lodging}</td>
                    <td className="py-2 px-3 text-right text-slate-400">${config.transport}</td>
                    <td className={`py-2 px-3 text-right font-medium ${isHighCost ? 'text-red-400' : 'text-green-400'}`}>
                      {config.inflation && `×${config.inflation.toFixed(1)} = `}${displayTotal}
                      {isHighCost && ' ⚠️'}
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-xs">{config.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 压力测试说明 */}
        <div className="p-4 bg-slate-900/50 text-xs text-slate-500 space-y-1">
          <p>💡 压力测试说明：</p>
          <p>• 场景3每月需支付生活成本，收入低于支出将进入恶性循环</p>
          <p>• 月收入需 ≥ 生活成本 + 还款额（如有债务）才能维持</p>
          <p>• 通胀 Debuff 会按比例增加所有生活成本</p>
          <p>• 收容所虽然免费但会带来 Debuff 惩罚</p>
        </div>
      </Card>
    </div>
  );
}

export default BalancePanel;
