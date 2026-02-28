# APP解锁系统架构设计

本文档定义《去美国》手机界面中APP的解锁机制，包括回合开始时的新APP解锁、条件解锁、剧情解锁等，为玩家提供渐进式功能开放体验。

---

## 1. 核心设计原则

### 1.1 解锁设计目标

1. **渐进式开放**：新玩家不会被过多功能淹没，随着游戏进行逐步解锁
2. **剧情驱动**：APP解锁与剧情推进结合，增强叙事感
3. **能力匹配**：解锁的APP与玩家当前能力、资源相匹配
4. **惊喜感**：关键剧情点的解锁带来成就感和期待

### 1.2 解锁类型

| 解锁类型 | 说明 | 示例 |
|---------|------|------|
| **回合解锁** | 达到特定回合自动解锁 | 场景3第1回合解锁住宿APP |
| **条件解锁** | 满足属性/资源条件解锁 | 社交≥8解锁高级社交功能 |
| **剧情解锁** | 完成特定事件后解锁 | 到达美国解锁金融APP |
| **道具解锁** | 获得特定道具后解锁 | 获得手机解锁浏览器 |
| **成就解锁** | 达成成就后解锁 | 多周目解锁快速存档 |

---

## 2. 数据结构

### 2.1 APP解锁配置

```typescript
// APP解锁配置接口
interface AppUnlockConfig {
  appId: string;                    // APP标识
  
  // 解锁条件（满足任一即可）
  unlockConditions: UnlockCondition[];
  
  // 解锁提示
  notification: {
    title: string;                  // 通知标题
    body: string;                   // 通知内容
    icon: string;                   // 图标
    priority: NotificationPriority;
  };
  
  // 首次打开引导
  tutorial?: {
    steps: TutorialStep[];          // 引导步骤
    canSkip: boolean;               // 是否可跳过
  };
  
  // 解锁后效果
  effects?: {
    unlockFeatures?: string[];      // 解锁的功能
    grantItems?: string[];          // 赠送的初始道具
    triggerEvents?: string[];       // 触发的事件
  };
}

// 解锁条件类型
 type UnlockCondition =
  | TurnUnlockCondition
  | AttributeUnlockCondition
  | ResourceUnlockCondition
  | SceneUnlockCondition
  | EventUnlockCondition
  | ItemUnlockCondition
  | AchievementUnlockCondition;

// 回合条件
interface TurnUnlockCondition {
  type: 'TURN';
  scene?: SceneId;                  // 特定场景
  minTurn: number;                  // 最小回合数
  maxTurn?: number;                 // 最大回合数（可选）
}

// 属性条件
interface AttributeUnlockCondition {
  type: 'ATTRIBUTE';
  attribute: keyof Attributes;
  minValue: number;
}

// 资源条件
interface ResourceUnlockCondition {
  type: 'RESOURCE';
  resource: 'health' | 'mental' | 'money';
  minValue: number;
}

// 场景条件
interface SceneUnlockCondition {
  type: 'SCENE';
  scene: SceneId;
  entryTurn?: number;               // 进入场景后第几回合
}

// 事件条件
interface EventUnlockCondition {
  type: 'EVENT';
  eventId: string;
  status: 'completed' | 'triggered';
}

// 道具条件
interface ItemUnlockCondition {
  type: 'ITEM';
  itemId: string;
  count?: number;
}

// 成就条件
interface AchievementUnlockCondition {
  type: 'ACHIEVEMENT';
  achievementId: string;
}
```

### 2.2 APP状态

```typescript
interface AppState {
  appId: string;
  status: 'locked' | 'unlockable' | 'unlocked' | 'first_open' | 'active';
  
  // 解锁信息
  unlockInfo?: {
    unlockedAt: number;             // 解锁回合
    unlockedBy: string;             // 解锁条件ID
  };
  
  // 首次打开标记
  firstOpen: boolean;
  
  // 使用统计
  stats: {
    openCount: number;
    lastOpenAt: number | null;
    totalUseTime: number;
  };
}

// 解锁检查器
class AppUnlockChecker {
  private configs: Map<string, AppUnlockConfig> = new Map();
  private states: Map<string, AppState> = new Map();
  
  // 检查所有APP的解锁条件
  checkUnlocks(gameState: GameState): AppUnlockConfig[] {
    const newlyUnlocked: AppUnlockConfig[] = [];
    
    for (const [appId, config] of this.configs) {
      const state = this.states.get(appId);
      
      // 已解锁的跳过
      if (state?.status === 'unlocked' || state?.status === 'active') {
        continue;
      }
      
      // 检查是否满足任一解锁条件
      const isUnlockable = config.unlockConditions.some(
        condition => this.checkCondition(condition, gameState)
      );
      
      if (isUnlockable) {
        newlyUnlocked.push(config);
      }
    }
    
    return newlyUnlocked;
  }
  
  // 检查单个条件
  private checkCondition(
    condition: UnlockCondition,
    gameState: GameState
  ): boolean {
    switch (condition.type) {
      case 'TURN':
        return this.checkTurnCondition(condition, gameState);
      case 'ATTRIBUTE':
        return gameState.character.attributes[condition.attribute] >= condition.minValue;
      case 'RESOURCE':
        return this.checkResourceCondition(condition, gameState);
      case 'SCENE':
        return this.checkSceneCondition(condition, gameState);
      case 'EVENT':
        return this.checkEventCondition(condition, gameState);
      case 'ITEM':
        return this.checkItemCondition(condition, gameState);
      case 'ACHIEVEMENT':
        return gameState.achievements.includes(condition.achievementId);
      default:
        return false;
    }
  }
  
  private checkTurnCondition(
    condition: TurnUnlockCondition,
    gameState: GameState
  ): boolean {
    const turnCount = condition.scene
      ? gameState.character.status.turnCount.inCurrentScene
      : gameState.character.status.turnCount.total;
    
    const afterMin = turnCount >= condition.minTurn;
    const beforeMax = condition.maxTurn ? turnCount <= condition.maxTurn : true;
    
    return afterMin && beforeMax;
  }
  
  // ... 其他条件检查方法
}
```

---

## 3. 各APP解锁配置

### 3.1 场景1解锁配置

```typescript
const scene1UnlockConfigs: AppUnlockConfig[] = [
  // 赚钱APP - 初始解锁
  {
    appId: 'work',
    unlockConditions: [
      { type: 'TURN', minTurn: 0 }  // 游戏开始即解锁
    ],
    notification: {
      title: '✨ 新功能解锁',
      body: '「赚点钱」已安装到你的手机，开始找工作吧！',
      icon: '💼',
      priority: NotificationPriority.NORMAL
    },
    tutorial: {
      steps: [
        { title: '找工作', content: '在这里你可以浏览各种工作机会' },
        { title: '筛选', content: '使用标签筛选适合你的工作' },
        { title: '报名', content: '点击报名开始工作，赚取收入' }
      ],
      canSkip: true
    }
  },
  
  // 学习APP - 初始解锁
  {
    appId: 'study',
    unlockConditions: [
      { type: 'TURN', minTurn: 0 }
    ],
    notification: {
      title: '✨ 新功能解锁',
      body: '「学点啥」已安装到你的手机，提升自己的能力！',
      icon: '📚',
      priority: NotificationPriority.NORMAL
    }
  },
  
  // 社交APP - 第2回合解锁
  {
    appId: 'social',
    unlockConditions: [
      { type: 'TURN', minTurn: 2 }
    ],
    notification: {
      title: '✨ 新功能解锁',
      body: '「找人聊」已安装到你的手机，结识更多朋友！',
      icon: '💬',
      priority: NotificationPriority.NORMAL
    },
    tutorial: {
      steps: [
        { title: '联系人', content: '查看你认识的朋友' },
        { title: '聊天', content: '和朋友交流，获取信息和帮助' }
      ],
      canSkip: true
    }
  },
  
  // 购物APP - 第3回合解锁
  {
    appId: 'shop',
    unlockConditions: [
      { type: 'TURN', minTurn: 3 }
    ],
    notification: {
      title: '✨ 新功能解锁',
      body: '「买东西」已安装到你的手机，购买所需物品！',
      icon: '🛒',
      priority: NotificationPriority.NORMAL
    }
  },
  
  // 出行APP - 第5回合解锁
  {
    appId: 'travel',
    unlockConditions: [
      { type: 'TURN', minTurn: 5 }
    ],
    notification: {
      title: '✨ 新功能解锁',
      body: '「怎么去」已安装到你的手机，规划你的出行！',
      icon: '🗺️',
      priority: NotificationPriority.NORMAL
    }
  },
  
  // 新闻APP - 第4回合解锁
  {
    appId: 'news',
    unlockConditions: [
      { type: 'TURN', minTurn: 4 }
    ],
    notification: {
      title: '✨ 新功能解锁',
      body: '「看新闻」已安装到你的手机，了解最新动态！',
      icon: '📰',
      priority: NotificationPriority.NORMAL
    }
  },
  
  // 金融APP - 第6回合解锁
  {
    appId: 'finance',
    unlockConditions: [
      { type: 'TURN', minTurn: 6 }
    ],
    notification: {
      title: '✨ 新功能解锁',
      body: '「钱的事儿」已安装到你的手机，管理你的财务！',
      icon: '💳',
      priority: NotificationPriority.NORMAL
    }
  },
  
  // 浏览器APP - 智力≥5解锁
  {
    appId: 'browser',
    unlockConditions: [
      { type: 'ATTRIBUTE', attribute: 'intelligence', minValue: 5 },
      { type: 'TURN', minTurn: 3 }
    ],
    notification: {
      title: '✨ 新功能解锁',
      body: '你的智力提升到新水平，解锁了「上网」功能！',
      icon: '🌐',
      priority: NotificationPriority.NORMAL
    }
  },
  
  // 健康APP - 触发受伤事件或第10回合
  {
    appId: 'health',
    unlockConditions: [
      { type: 'EVENT', eventId: 'injury_any', status: 'triggered' },
      { type: 'TURN', minTurn: 10 }
    ],
    notification: {
      title: '✨ 新功能解锁',
      body: '「看医生」已安装到你的手机，关注你的健康！',
      icon: '💊',
      priority: NotificationPriority.NORMAL
    }
  }
];
```

### 3.2 场景2解锁配置

```typescript
const scene2UnlockConfigs: AppUnlockConfig[] = [
  // 场景2开始时，大部分APP锁定，但会触发解锁提示
  
  // 出行APP - 场景2开始时重新解锁（功能受限）
  {
    appId: 'travel',
    unlockConditions: [
      { type: 'SCENE', scene: 'act2', entryTurn: 0 }
    ],
    notification: {
      title: '📡 信号恢复',
      body: '「怎么去」已恢复使用，但GPS信号较弱',
      icon: '🗺️',
      priority: NotificationPriority.NORMAL
    },
    effects: {
      unlockFeatures: ['basic_navigation', 'route_view']
    }
  },
  
  // 社交APP - 场景2开始时重新解锁（仅限同伴聊天）
  {
    appId: 'social',
    unlockConditions: [
      { type: 'SCENE', scene: 'act2', entryTurn: 0 }
    ],
    notification: {
      title: '📡 信号恢复',
      body: '「找人聊」已恢复使用，但仅能联系同伴',
      icon: '💬',
      priority: NotificationPriority.NORMAL
    },
    effects: {
      unlockFeatures: ['companion_chat_only']
    }
  },
  
  // 健康APP - 场景2始终保持解锁
  {
    appId: 'health',
    unlockConditions: [
      { type: 'SCENE', scene: 'act2', entryTurn: 0 }
    ],
    notification: {
      title: '✅ 功能正常',
      body: '「看医生」功能正常，离线健康监测可用',
      icon: '💊',
      priority: NotificationPriority.LOW
    }
  }
];
```

### 3.3 场景3解锁配置

```typescript
const scene3UnlockConfigs: AppUnlockConfig[] = [
  // 住宿APP - 场景3第1回合解锁（核心解锁）
  {
    appId: 'housing',
    unlockConditions: [
      { type: 'SCENE', scene: 'act3', entryTurn: 1 }
    ],
    notification: {
      title: '🎉 重要功能解锁',
      body: '「住哪儿」已安装！在美国生存需要稳定的住所',
      icon: '🏠',
      priority: NotificationPriority.HIGH
    },
    tutorial: {
      steps: [
        { title: '住宿', content: '在美国，住宿是最大的开销之一' },
        { title: '选择', content: '从收容所到合租到公寓，选择适合你的' },
        { title: '月度成本', content: '每月会自动扣除住宿费，注意现金流' }
      ],
      canSkip: false  // 重要功能，不可跳过
    },
    effects: {
      triggerEvents: ['act3_first_rent_due']  // 触发首次交租事件
    }
  },
  
  // 金融APP完全解锁 - 场景3第2回合
  {
    appId: 'finance',
    unlockConditions: [
      { type: 'SCENE', scene: 'act3', entryTurn: 2 }
    ],
    notification: {
      title: '✨ 功能升级',
      body: '「钱的事儿」功能已完全恢复，管理美元账户',
      icon: '💳',
      priority: NotificationPriority.NORMAL
    },
    effects: {
      unlockFeatures: ['usd_account', 'debt_management', 'monthly_bill']
    }
  },
  
  // 新闻APP完全解锁 - 场景3第3回合
  {
    appId: 'news',
    unlockConditions: [
      { type: 'SCENE', scene: 'act3', entryTurn: 3 }
    ],
    notification: {
      title: '📡 网络已连接',
      body: '「看新闻」已完全恢复，获取最新政策动态',
      icon: '📰',
      priority: NotificationPriority.NORMAL
    },
    effects: {
      unlockFeatures: ['real_time_news', 'policy_alerts']
    }
  },
  
  // 赚钱APP完全解锁 - 场景3第2回合
  {
    appId: 'work',
    unlockConditions: [
      { type: 'SCENE', scene: 'act3', entryTurn: 2 }
    ],
    notification: {
      title: '✨ 功能升级',
      body: '「赚点钱」已完全恢复，开始在美国打工',
      icon: '💼',
      priority: NotificationPriority.NORMAL
    }
  },
  
  // 浏览器解锁 - 到达美国后
  {
    appId: 'browser',
    unlockConditions: [
      { type: 'SCENE', scene: 'act3', entryTurn: 2 }
    ],
    notification: {
      title: '📡 网络已连接',
      body: '「上网」功能已恢复，可访问美国网站',
      icon: '🌐',
      priority: NotificationPriority.NORMAL
    }
  },
  
  // 高级社交功能 - 社交≥10解锁
  {
    appId: 'social_advanced',
    unlockConditions: [
      { type: 'ATTRIBUTE', attribute: 'social', minValue: 10 },
      { type: 'SCENE', scene: 'act3' }
    ],
    notification: {
      title: '✨ 功能升级',
      body: '你的社交能力提升，解锁更多社交功能！',
      icon: '💬',
      priority: NotificationPriority.NORMAL
    },
    effects: {
      unlockFeatures: ['advanced_networking', 'influencer_contacts']
    }
  }
];
```

---

## 4. 解锁流程

### 4.1 回合开始解锁检查

```typescript
// 回合开始时检查解锁
async function processTurnStartUnlocks(gameState: GameState): Promise<void> {
  const unlockChecker = new AppUnlockChecker();
  
  // 检查新解锁的APP
  const newlyUnlocked = unlockChecker.checkUnlocks(gameState);
  
  if (newlyUnlocked.length === 0) return;
  
  // 生成解锁通知
  const unlockNotifications: GameNotification[] = newlyUnlocked.map(config => ({
    id: `unlock_${config.appId}_${gameState.turn}`,
    type: NotificationType.APP_UNLOCK,
    priority: config.notification.priority,
    content: {
      title: config.notification.title,
      body: config.notification.body,
      icon: config.notification.icon
    },
    source: { appId: 'system', eventId: `unlock_${config.appId}` },
    actions: [
      {
        id: 'open',
        label: '立即打开',
        type: 'primary',
        onClick: () => {
          openApp(config.appId);
          if (config.tutorial && !config.tutorial.canSkip) {
            showTutorial(config.tutorial);
          }
        }
      },
      {
        id: 'later',
        label: '稍后',
        type: 'secondary',
        onClick: () => {}
      }
    ],
    timestamp: Date.now(),
    status: 'pending',
    requiresConfirmation: true
  }));
  
  // 添加到通知队列
  NotificationManager.addToQueue(unlockNotifications);
  
  // 更新APP状态
  for (const config of newlyUnlocked) {
    AppManager.unlockApp(config.appId, {
      unlockedAt: gameState.turn,
      unlockedBy: 'turn_start_check'
    });
    
    // 应用解锁效果
    if (config.effects) {
      applyUnlockEffects(config.effects, gameState);
    }
  }
}
```

### 4.2 解锁通知界面

```
┌─────────────────────────────────────────┐
│                                                             │
│                  ✨                                        │
│                                                             │
│              新功能解锁                                      │
│                                                             │
│                   🏠                                        │
│                                                             │
│              「住哪儿」已安装                                │
│                                                             │
│    在美国生存需要稳定的住所                                  │
│    现在可以寻找租房了                                        │
│                                                             │
│                                                             │
│         [立即打开]    [稍后]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 首次打开引导

```
首次打开住宿APP:

┌─────────────────────────────────────────┐
│  < 住哪儿                    [跳过 1/3]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              🏠 住宿介绍                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │              [插图: 不同类型的住所]                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  在美国，住宿是最大的开销之一                                │
│                                                             │
│  从收容所到合租到公寓，选择适合你的住所                      │
│                                                             │
│  每月会自动扣除住宿费，注意保持现金流！                      │
│                                                             │
│                                                             │
│         [下一步]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 特殊解锁场景

### 5.1 剧情点解锁

```typescript
// 到达美国时的批量解锁
function unlockOnArrivalUSA(gameState: GameState): void {
  const arrivalUnlocks = [
    { appId: 'housing', notification: { title: '🎉 到达美国', body: '「住哪儿」已解锁' } },
    { appId: 'work', notification: { title: '✨ 功能恢复', body: '「赚点钱」已恢复' } },
    { appId: 'finance', notification: { title: '✨ 功能恢复', body: '「钱的事儿」已恢复' } }
  ];
  
  for (const unlock of arrivalUnlocks) {
    AppManager.unlockApp(unlock.appId);
    NotificationManager.add({
      ...unlock.notification,
      type: NotificationType.APP_UNLOCK,
      priority: NotificationPriority.HIGH
    });
  }
}

// 获得手机道具解锁浏览器
function unlockOnGetPhone(gameState: GameState): void {
  if (gameState.inventory.hasItem('smartphone')) {
    AppManager.unlockApp('browser');
    NotificationManager.add({
      title: '✨ 获得手机',
      body: '有了手机，你可以「上网」了！',
      type: NotificationType.APP_UNLOCK,
      priority: NotificationPriority.NORMAL
    });
  }
}
```

### 5.2 成就解锁

```typescript
// 成就相关解锁（非多周目奖励，只是成就解锁提示）
const achievementUnlocks: AppUnlockConfig[] = [
  {
    appId: 'statistics',
    unlockConditions: [
      { type: 'TURN', minTurn: 50 }  // 游戏进行到一定阶段解锁统计
    ],
    notification: {
      title: '✨ 功能解锁',
      body: '「数据统计」功能已解锁，查看你的游戏历程！',
      icon: '📊',
      priority: NotificationPriority.NORMAL
    }
  }
];
```

**注意**：本项目**不设多周目奖励机制**，保持每局游戏独立完整体验。

---

## 6. 界面实现

### 6.1 主界面新APP提示

```
主界面显示新解锁APP:

┌─────────────────────────────────────────┐
│  📶 4G    9:41 AM    🔋 85% 📱           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  【新解锁】                                                 │
│  ┌─────┐                                                   │
│  │ 🏠  │ ← 新!                                             │
│  │ 住哪儿│                                                  │
│  └─────┘                                                   │
│                                                             │
│  【我的APP】                                                │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                      │
│  │ 💼  │  │ 📚  │  │ 🗺️  │  │ 💬  │                      │
│  │ 赚钱│  │ 学习│  │ 出行│  │ 社交│                      │
│  │     │  │     │  │     │  │     │                      │
│  └─────┘  └─────┘  └─────┘  └─────┘                      │
│                                                             │
│  ...                                                       │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 锁定APP预览

```
未解锁的APP显示预览:

┌─────────────────────────────────────────┐
│                                                             │
│  【即将解锁】                                               │
│                                                             │
│  ┌─────┐                                                   │
│  │ 🔒  │                                                  │
│  │ 住哪儿│                                                  │
│  └─────┘                                                   │
│  解锁条件: 到达美国后                                        │
│  预计: 当前场景结束后                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. 相关文档

- [MobileUIArchitecture.md](./MobileUIArchitecture.md) - 手机界面总体架构
- [AppFrameworkArchitecture.md](./AppFrameworkArchitecture.md) - APP通用框架
- [NotificationSystem.md](./NotificationSystem.md) - 通知系统
- [SceneSystemArchitecture.md](../SceneSystemArchitecture.md) - 场景系统
