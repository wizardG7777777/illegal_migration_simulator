/**
 * 组件库使用示例
 * 展示如何组合使用原子组件和模块组件
 */

import React, { useState } from 'react';

// 原子组件
import {
  Button,
  Card,
  ProgressBar,
  AttributeBar,
  ResourceBar,
  MoneyDisplay,
  DualMoneyDisplay,
  Badge,
  StatusBadge,
} from './primitives';

// 模块组件
import {
  EventCard,
  CharacterPanel,
  StatusBar,
  TerminalAlert,
  InventoryGrid,
  DebuffIcon,
  DebuffBadge,
} from './modules';

// 类型
import type { 
  CharacterData, 
  GameEvent, 
  SceneState, 
  EnvironmentalDebuff,
  ConsumableItem,
  PermanentItem,
  TerminalState 
} from '@/types';

// ============================================
// 示例数据
// ============================================

const exampleCharacter: CharacterData = {
  id: 'char_001',
  name: '张浩',
  attributes: {
    physique: 12,
    intelligence: 14,
    english: 8,
    social: 10,
    riskAwareness: 11,
    survival: 9,
  },
  resources: {
    health: { current: 75, max: 100 },
    mental: { current: 60, max: 100 },
    money: { cny: 5000, usd: 0 },
    actionPoints: { current: 3, max: 5, min: 0 },
  },
  status: {
    terminalState: null,
    terminalCountdown: 0,
    flags: {},
  },
};

const exampleScene: SceneState = {
  currentScene: 'act1',
  turnCount: 15,
  sceneTurn: 8,
  act1: {
    hasInsightTriggered: false,
    hasTakenLoan: false,
    loanAmount: 0,
  },
  act2: null,
  act3: null,
  activeDebuffs: [
    {
      id: 'debuff_001',
      name: '就业冰河期',
      type: 'pressure',
      intensity: 2,
      duration: 5,
      source: '经济下行',
      effects: {
        workDifficultyIncrease: 10,
        raidChanceIncrease: 0,
        mentalDamagePerTurn: 1,
        cashCostMultiplier: 1,
      },
    },
  ],
};

const exampleEvent: GameEvent = {
  id: 'act1_work_construction',
  category: 'FIXED',
  name: '工地搬砖',
  description: '张浩在工地门口看到了招工启事，日结200元，但需要干满8小时重体力劳动。',
  scenes: ['act1'],
  execution: {
    repeatable: true,
    maxExecutions: 10,
    actionPointCost: 3,
  },
  slots: [
    {
      id: 'transport',
      name: '交通工具',
      tags: ['transport'],
      required: false,
      description: '选择合适的交通工具可以节省行动点',
    },
  ],
  choices: [
    {
      id: 'work_normal',
      name: '正常干活',
      effects: {
        resources: {
          health: -5,
          mental: -3,
          money: 200,
          moneyCurrency: 'CNY',
        },
        narrative: '一天下来腰酸背痛，但钱包鼓了一些。',
      },
    },
    {
      id: 'work_hard',
      name: '拼命干多拿钱',
      condition: {
        type: 'ATTRIBUTE',
        attribute: 'physique',
        operator: '>=',
        value: 12,
      },
      effects: {
        resources: {
          health: -10,
          mental: -5,
          money: 300,
          moneyCurrency: 'CNY',
        },
        narrative: '你咬牙坚持，多搬了几百块砖，拿到了额外奖金。',
      },
    },
  ],
};

const exampleInventoryItems = [
  { itemId: 'food_001', name: '面包', tags: ['food'], priority: 5 },
  { itemId: 'bike_001', name: '二手电动车', tags: ['transport'], priority: 3 },
];

const exampleConsumables: Array<{ item: ConsumableItem; count: number }> = [
  {
    item: {
      id: 'consumable_food',
      name: '食物补给',
      description: '维持生命的基本物资，可以缓解饥饿并略微恢复身体健康。',
      category: 'CONSUMABLE',
      subCategory: 'food',
      maxStack: 10,
      useTarget: 'self',
      tags: ['food'],
      priority: 5,
      effects: {
        healthRestore: 5,
      },
    },
    count: 3,
  },
];

const examplePermanents: Array<{ item: PermanentItem; slot: number }> = [
  {
    item: {
      id: 'perm_bike',
      name: '二手电动车',
      description: '充满电能跑40公里，送外卖的好帮手',
      category: 'PERMANENT',
      tags: ['transport'],
      priority: 3,
      canBeDeleted: true,
      slotEffects: {
        actionPointCostModifier: -1,
        moneyMultiplier: 1.2,
      },
      passiveEffects: {
        perTurn: {
          mentalRestore: 0.5,
        },
      },
      upkeepCost: {
        moneyPerTurn: 5,
      },
    },
    slot: 0,
  },
];

// ============================================
// 示例页面组件
// ============================================

export function ExampleGameUI(): React.ReactElement {
  const [terminalState, setTerminalState] = useState<TerminalState | null>(null);
  const [countdown, setCountdown] = useState(3);

  const handleExecuteEvent = (choiceId: string, slots?: Record<string, string>) => {
    console.log('执行事件:', choiceId, '槽位选择:', slots);
  };

  const handleUseItem = (itemId: string) => {
    console.log('使用物品:', itemId);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 页面标题 */}
        <h1 className="text-2xl font-bold text-center mb-8">组件库使用示例</h1>

        {/* 状态条 */}
        <section>
          <h2 className="text-lg font-semibold text-slate-400 mb-3">1. 状态条 (StatusBar)</h2>
          <StatusBar scene={exampleScene} turnCount={exampleScene.turnCount} />
        </section>

        {/* 终结态警告 */}
        <section>
          <h2 className="text-lg font-semibold text-slate-400 mb-3">2. 终结态警告 (TerminalAlert)</h2>
          <div className="space-y-3">
            <div className="flex gap-2 mb-3">
              <Button size="sm" onClick={() => setTerminalState('DYING')}>濒死</Button>
              <Button size="sm" onClick={() => setTerminalState('BREAKDOWN')}>崩溃</Button>
              <Button size="sm" onClick={() => setTerminalState('DESTITUTE')}>匮乏</Button>
              <Button size="sm" variant="ghost" onClick={() => setTerminalState(null)}>清除</Button>
            </div>
            <TerminalAlert 
              terminalState={terminalState} 
              countdown={countdown}
            />
          </div>
        </section>

        {/* 两栏布局：角色面板 + 物品网格 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 角色面板 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-400 mb-3">3. 角色面板 (CharacterPanel)</h2>
            <CharacterPanel 
              character={exampleCharacter}
              currentScene={exampleScene.currentScene}
            />
          </section>

          {/* 物品网格 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-400 mb-3">4. 物品网格 (InventoryGrid)</h2>
            <InventoryGrid
              consumables={exampleConsumables}
              permanents={examplePermanents}
              onUseItem={handleUseItem}
            />
          </section>
        </div>

        {/* 事件卡片 */}
        <section>
          <h2 className="text-lg font-semibold text-slate-400 mb-3">5. 事件卡片 (EventCard)</h2>
          <EventCard
            event={exampleEvent}
            inventoryItems={exampleInventoryItems}
            characterAttributes={exampleCharacter.attributes}
            onExecute={handleExecuteEvent}
          />
        </section>

        {/* 原子组件展示 */}
        <section>
          <h2 className="text-lg font-semibold text-slate-400 mb-3">6. 原子组件展示</h2>
          <Card>
            <div className="space-y-6">
              
              {/* 按钮 */}
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">按钮 (Button)</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary">主要</Button>
                  <Button variant="secondary">次要</Button>
                  <Button variant="danger">危险</Button>
                  <Button variant="ghost">幽灵</Button>
                  <Button disabled>禁用</Button>
                </div>
              </div>

              {/* 进度条 */}
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">进度条 (ProgressBar)</h3>
                <div className="space-y-2">
                  <ProgressBar current={75} max={100} color="green" showValue label="健康" />
                  <ProgressBar current={45} max={100} color="blue" showValue label="心理" />
                  <ProgressBar current={90} max={100} color="red" showValue label="进度" />
                </div>
              </div>

              {/* 属性条 */}
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">属性条 (AttributeBar)</h3>
                <div className="space-y-2 max-w-md">
                  <AttributeBar name="体魄" value={15} attributeKey="physique" />
                  <AttributeBar name="智力" value={8} attributeKey="intelligence" />
                  <AttributeBar name="英语" value={12} attributeKey="english" />
                </div>
              </div>

              {/* 资源条 */}
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">资源条 (ResourceBar)</h3>
                <div className="space-y-2 max-w-md">
                  <ResourceBar type="health" current={80} max={100} />
                  <ResourceBar type="mental" current={45} max={100} />
                  <ResourceBar type="actionPoints" current={2} max={5} />
                </div>
              </div>

              {/* 金钱显示 */}
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">金钱显示 (MoneyDisplay)</h3>
                <div className="space-y-2">
                  <div className="flex gap-4">
                    <MoneyDisplay amount={5000} currency="CNY" />
                    <MoneyDisplay amount={1200} currency="USD" />
                  </div>
                  <DualMoneyDisplay cny={3000} usd={500} />
                </div>
              </div>

              {/* 徽章 */}
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">徽章 (Badge)</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">默认</Badge>
                  <Badge variant="success">成功</Badge>
                  <Badge variant="warning">警告</Badge>
                  <Badge variant="danger">危险</Badge>
                  <Badge variant="info">信息</Badge>
                  <StatusBadge status="active" />
                  <StatusBadge status="pending" />
                  <DebuffBadge count={2} />
                </div>
              </div>

              {/* Debuff图标 */}
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">Debuff图标 (DebuffIcon)</h3>
                <div className="flex gap-3">
                  {exampleScene.activeDebuffs.map(debuff => (
                    <DebuffIcon key={debuff.id} debuff={debuff} showTooltip size="lg" />
                  ))}
                </div>
              </div>

            </div>
          </Card>
        </section>

      </div>
    </div>
  );
}

export default ExampleGameUI;
