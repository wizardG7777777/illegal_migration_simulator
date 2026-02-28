# 场景2限制机制设计

本文档定义《去美国》手机界面在场景2（跨境穿越）中的特殊限制机制，通过信号弱、APP锁定等方式模拟穿越途中的通讯中断和资源匮乏。

---

## 1. 核心设计概念

### 1.1 设计目标

场景2的核心体验是**孤立无援**和**资源匮乏**。手机界面通过以下方式强化这一体验：

1. **通讯中断**：大部分APP无法使用，模拟无网络/弱信号环境
2. **功能受限**：只能执行生存相关的核心操作
3. **渐进解锁**：随着穿越进度逐步恢复部分功能
4. **风险暗示**：通过UI变化暗示当前处境的危险

### 1.2 限制原则

| 限制类型 | 说明 | 设计目的 |
|---------|------|---------|
| **完全禁用** | APP灰色显示，无法打开 | 模拟无网络/无设备 |
| **功能受限** | APP可打开但功能受限 | 模拟弱信号/低电量 |
| **条件解锁** | 满足条件后恢复使用 | 模拟找到信号源/充电 |
| **降级使用** | 功能简化，信息缺失 | 模拟设备损坏/电量低 |

---

## 2. 系统状态映射

### 2.1 手机状态与游戏状态映射

```typescript
// 场景2手机状态接口
interface Scene2PhoneState {
  // 信号状态
  signal: {
    level: 0 | 1 | 2;               // 0=无信号, 1=弱信号, 2=正常
    status: 'no_signal' | 'searching' | 'weak' | 'normal';
    carrier: string | null;         // 运营商名称（场景2为null或"Roaming"）
  };
  
  // 网络状态
  network: {
    type: 'none' | '2G' | '3G' | 'WiFi';
    isRoaming: boolean;             // 始终为true（场景2在境外）
    dataLimit: boolean;             // 是否流量受限
  };
  
  // 电量状态（映射健康+心理）
  battery: {
    percentage: number;
    status: 'critical' | 'low' | 'normal';
    isPowerSaving: boolean;         // 低电量自动开启
  };
  
  // GPS状态（映射位置进度）
  gps: {
    accuracy: 'none' | 'low' | 'high';
    lastKnownLocation: string | null;
  };
  
  // 设备状态
  device: {
    isDamaged: boolean;             // 设备是否损坏（随机事件可触发）
    damageLevel: 0 | 1 | 2 | 3;     // 损坏程度
  };
}

// 场景2阶段定义
enum Scene2Phase {
  PHASE_0_START = 0,               // 起点：边境小镇
  PHASE_1_RAINFOREST = 1,          // 雨林阶段
  PHASE_2_CROSSING = 2,            // 穿越阶段
  PHASE_3_ARRIVAL = 3,             // 到达美国
}
```

### 2.2 状态栏显示

```
场景2不同阶段的状态栏显示:

起点(小镇):            雨林(初期):            雨林(深处):
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│ 📶 4G  6:00 AM │    │ 📡 搜索信号...  │    │ 🚫 无服务      │
│ 🔋 100%        │    │ 🔋 85%         │    │ 🔋 45% ⚠️      │
└────────────────┘    └────────────────┘    └────────────────┘

穿越中:                接近边境:
┌────────────────┐    ┌────────────────┐
│ 📡 漫游信号弱   │    │ 📶 3G Roaming  │
│ 🔋 20% 🔴      │    │ 🔋 15% 🔴      │
└────────────────┘    └────────────────┘
```

---

## 3. APP限制详细规则

### 3.1 APP可用性矩阵

| APP | 起点 | 雨林初期 | 雨林深处 | 穿越中 | 接近边境 | 备注 |
|-----|------|---------|---------|--------|---------|------|
| **💼 赚钱** | ✅ | 🔒 | 🔒 | 🔒 | ⚠️ | 只有向导交易可用 |
| **📚 学习** | ✅ | 🔒 | 🔒 | 🔒 | 🔒 | 完全禁用 |
| **🗺️ 出行** | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | 雨林阶段GPS弱 |
| **💬 社交** | ✅ | ⚠️ | ⚠️ | 🔒 | ✅ | 仅限向导联系 |
| **🛒 购物** | ✅ | 🔒 | 🔒 | 🔒 | 🔒 | 完全禁用 |
| **🏠 住宿** | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 场景3才解锁 |
| **💊 健康** | ✅ | ✅ | ✅ | ✅ | ✅ | 始终可用 |
| **📰 新闻** | ✅ | 🔒 | 🔒 | 🔒 | ⚠️ | 离线缓存 |
| **💳 金融** | ✅ | 🔒 | 🔒 | 🔒 | 🔒 | 现金交易 |
| **💸 借钱** | ✅ | ⚠️ | ⚠️ | 🔒 | 🔒 | 向导紧急借贷可用 |
| **🌐 浏览器** | ✅ | 🔒 | 🔒 | 🔒 | ⚠️ | 离线模式 |
| **⚙️ 设置** | ✅ | ✅ | ✅ | ✅ | ✅ | 始终可用 |

### 3.2 限制状态定义

```typescript
enum AppRestrictionLevel {
  FULL_ACCESS = 'full',            // 完全可用
  LIMITED = 'limited',             // 功能受限
  READ_ONLY = 'read_only',         // 只读
  OFFLINE_MODE = 'offline',        // 离线模式
  LOCKED = 'locked',               // 完全锁定
  HIDDEN = 'hidden',               // 隐藏
}

interface AppRestrictionConfig {
  appId: string;
  level: AppRestrictionLevel;
  
  // 限制详情
  restrictions: {
    message: string;                // 限制提示信息
    icon: string;                   // 限制图标
    canBypass: boolean;             // 是否可绕过
    bypassCondition?: string;       // 绕过条件
  };
  
  // 可用功能（LIMITED时）
  availableFeatures?: string[];
  
  // 降级功能（OFFLINE_MODE时）
  offlineFeatures?: string[];
}
```

### 3.3 各APP限制详情

#### 💼 赚钱APP - 完全锁定

```
状态: 🔒 完全锁定
提示: "无网络连接，无法访问招聘平台"
可用功能: 无

界面显示:
┌─────────────────────────────────────────┐
│  < 赚点钱                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        🔒                                  │
│                                                             │
│              赚钱APP已锁定                                   │
│                                                             │
│        当前区域无网络覆盖                                    │
│        无法访问招聘平台                                      │
│                                                             │
│        穿越途中无法打工赚钱                                  │
│        请保留现金以备不时之需                                │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

例外情况:
- 向导费用支付: 通过社交APP与向导交易
- 现金交易: 在边境小镇可与向导现金结算
```

#### 📚 学习APP - 完全锁定

```
状态: 🔒 完全锁定
提示: "设备离线，无法访问学习资源"
可用功能: 无

特殊说明:
- 即使下载的书籍也无法阅读（没有时间和精力）
- 场景2专注于生存，不允许学习提升
```

#### 🗺️ 出行APP - 功能受限

```
状态: ⚠️ 功能受限
提示: "GPS信号弱，定位可能不准确"
可用功能: 基础导航、路线查看、距离估算

受限功能:
- 实时路况: ❌ 不可用
- 精确导航: ❌ 不可用
- 周边搜索: ⚠️ 范围受限

界面显示:
┌─────────────────────────────────────────┐
│  < 怎么去                      ⚠️ GPS弱  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │           [模糊地图 - 手绘风格]                      │   │
│  │                                                     │   │
│  │     ● 你在这里 (约)                                │   │
│  │                                                     │   │
│  │     ~ 雨林区域 ~                                   │   │
│  │                                                     │   │
│  │     ● 边境方向 (? km)                               │   │
│  │                                                     │   │
│  │   ⚠️ 定位不准确，仅供参考                            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  【穿越路线】                                               │
│  ⬅️ 向导带领路线 (推荐)                                    │
│     预计: 5回合 | 费用: $50/回合                           │
│                                                             │
│  ⬆️ 独自穿越                                               │
│     ⚠️ 需要: 生存能力 ≥ 8                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 💬 社交APP - 功能受限

```
状态: ⚠️ 功能受限
提示: "信号弱，消息可能延迟发送"
可用功能: 向导联系

受限功能:
- 新联系人: ❌ 无法添加
- 群聊: ⚠️ 仅已有群聊
- 附近的人: ❌ 不可用
- 朋友圈/动态: ❌ 不可用

界面显示:
┌─────────────────────────────────────────┐
│  < 找人聊                      ⚠️ 信号弱 │
├─────────────────────────────────────────────────────────────┤
│  ⚠️ 消息可能延迟发送                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────┐ 向导老张                                    刚刚   │
│  │ 🧭 │ [已读] 前面有沼泽地，跟紧点                      │
│  └────┘ ────────────────────────────────────────────────  │
│                                                             │
│  │  🔒 其他联系人 (无信号)                                      │
│  ┌────┐ 李姐                                        3天前  │
│  │ 👩 │ 等待网络恢复后查看                               │
│  └────┘                                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 🛒 购物APP - 完全锁定

```
状态: 🔒 完全锁定
提示: "无网络连接，无法访问商店"
可用功能: 查看已购道具

界面显示:
┌─────────────────────────────────────────┐
│  < 买东西                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        🔒                                  │
│                                                             │
│              购物APP已锁定                                   │
│                                                             │
│        雨林深处没有商店                                      │
│        也无法访问在线购物平台                                │
│                                                             │
│        【当前道具】                                          │
│        你随身携带的物品:                                     │
│        • 💧 水袋 x3                                         │
│        • 🍞 干粮 x2                                         │
│        • 💊 急救包 x1                                       │
│                                                             │
│        请合理使用有限资源                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 💊 健康APP - 完全可用

```
状态: ✅ 完全可用
说明: "健康监测不依赖网络"

功能:
- 自我诊断
- 急救指南（离线缓存）
- 药品使用
- 伤势记录

界面显示:
┌─────────────────────────────────────────┐
│  < 看医生                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  【我的状态】                                                │
│  💪 体魄: 7/20                                             │
│  🏥 健康: 65/100                                           │
│  🧠 心理: 45/100  ⚠️ 偏低                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  【当前伤势】                                                │
│  🤕 腿部擦伤 (轻伤)                                          │
│  效果: 移动速度 -10%                                         │
│  [查看详情]  [使用药品]                                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  【可用药品】                                                │
│  💊 止痛药 x2                    [使用]                      │
│  💉 绷带 x1                      [使用]                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  【急救指南】                                                │
│  📖 如何处理毒蛇咬伤                                         │
│  📖 野外急救基础                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 📰 新闻APP - 离线模式

```
状态: ⚠️ 离线模式
提示: "离线浏览 - 仅显示缓存内容"
可用功能: 查看缓存新闻

受限功能:
- 实时新闻: ❌ 不可用
- 推送通知: ❌ 不可用
- 新闻刷新: ❌ 不可用

界面显示:
┌─────────────────────────────────────────┐
│  < 看新闻                      ⚠️ 离线  │
├─────────────────────────────────────────────────────────────┤
│  仅显示缓存内容，无法获取最新新闻                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📰 缓存新闻 (3天前)                                        │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  墨西哥边境加强巡逻                                          │
│  2天前                                                     │
│  [已读]                                                    │
│                                                             │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  雨林季节来临，建议谨慎出行                                  │
│  5天前                                                     │
│  [已读]                                                    │
│                                                             │
│  🔒 更多新闻将在网络恢复后显示                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 限制触发机制

### 4.1 阶段切换触发

```typescript
// 场景2阶段切换时的限制更新
function updateScene2Restrictions(
  currentPhase: Scene2Phase,
  gameState: GameState
): AppRestrictionConfig[] {
  const restrictions: AppRestrictionConfig[] = [];
  
  switch (currentPhase) {
    case Scene2Phase.PHASE_0_START:
      // 起点：大部分APP可用
      restrictions.push(
        { appId: 'housing', level: AppRestrictionLevel.LOCKED, ... },
        { appId: 'work', level: AppRestrictionLevel.LIMITED, ... }
      );
      break;
      
    case Scene2Phase.PHASE_1_RAINFOREST:
      // 进入雨林：信号开始减弱
      restrictions.push(
        { appId: 'work', level: AppRestrictionLevel.LOCKED, 
          restrictions: { message: '无网络连接', icon: '📡', canBypass: false } },
        { appId: 'study', level: AppRestrictionLevel.LOCKED, ... },
        { appId: 'shop', level: AppRestrictionLevel.LOCKED, ... },
        { appId: 'travel', level: AppRestrictionLevel.LIMITED,
          restrictions: { message: 'GPS信号弱', icon: '📡', canBypass: false } },
        { appId: 'social', level: AppRestrictionLevel.LIMITED,
          restrictions: { message: '信号弱', icon: '📡', canBypass: false } },
        { appId: 'news', level: AppRestrictionLevel.OFFLINE_MODE, ... },
        { appId: 'browser', level: AppRestrictionLevel.LOCKED, ... }
      );
      break;
      
    case Scene2Phase.PHASE_2_CROSSING:
      // 穿越阶段：信号几乎中断
      restrictions.push(
        { appId: 'social', level: AppRestrictionLevel.LOCKED, ... },
        // ... 更多限制
      );
      break;
      
    case Scene2Phase.PHASE_3_ARRIVAL:
      // 接近美国：信号逐渐恢复
      restrictions.push(
        { appId: 'social', level: AppRestrictionLevel.FULL_ACCESS },
        { appId: 'news', level: AppRestrictionLevel.LIMITED, ... },
        // ... 逐步恢复
      );
      break;
  }
  
  return restrictions;
}
```

### 4.2 限制触发机制

场景2的限制**仅通过阶段切换触发**，不设随机事件导致的临时限制。

```typescript
// 场景2限制仅由阶段切换触发
interface Scene2RestrictionTrigger {
  type: 'PHASE_CHANGE';             // 仅阶段切换
  fromPhase: Scene2Phase;
  toPhase: Scene2Phase;
}
```

**设计说明**：
- 场景2的限制是**结构性的**，反映整体环境（雨林无网络、穿越中信号中断）
- 不设置手机进水、信号塔等临时事件，保持体验一致性
- 玩家明确知道限制来源是**环境**而非**设备故障**

---

## 5. 解锁提示设计

### 5.1 APP锁定提示

```
主界面显示:
┌─────────────────────────────────────────┐
│  🚫 无服务    ⏱️ 剩余8回合    🔋 45% 📱   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────┐  ┌─────┐  ┌─────┐                               │
│  │ 🗺️  │  │ 💬  │  │ 💊  │                               │
│  │ 出行│  │ 社交│  │ 健康│                               │
│  │     │  │ ⚠️  │  │     │                               │
│  └─────┘  └─────┘  └─────┘                               │
│                                                             │
│  【以下APP暂不可用】                                        │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐            │
│  │ 💼  │  │ 📚  │  │ 🛒  │  │ 📰  │  │ 🌐  │            │
│  │ 🔒  │  │ 🔒  │  │ 🔒  │  │ 🔒  │  │ 🔒  │            │
│  │ 赚钱│  │ 学习│  │ 购物│  │ 新闻│  │ 上网│            │
│  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘            │
│                                                             │
│  原因: 穿越途中无网络覆盖                                    │
│  预计恢复: 到达美国后                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 点击锁定APP的提示

```
点击锁定的赚钱APP:

┌─────────────────────────────────────────┐
│                                         │
│                 🔒                      │
│                                         │
│           赚钱APP暂时锁定                 │
│                                         │
│    当前位置: 雨林深处                      │
│    网络状态: 无服务                        │
│                                         │
│    穿越途中无法:                           │
│    • 访问招聘平台                          │
│    • 接收工作邀请                          │
│    • 在线结算工资                          │
│                                         │
│    恢复条件: 到达美国，网络恢复后           │
│                                         │
│         [我知道了]                        │
│                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 与回合流程的集成

### 6.1 回合开始检查

```typescript
// 回合开始时检查并应用限制
function checkScene2Restrictions(gameState: GameState): void {
  if (gameState.currentScene !== 'act2') return;
  
  const currentPhase = calculateScene2Phase(gameState);
  const restrictions = updateScene2Restrictions(currentPhase, gameState);
  
  // 应用限制
  for (const restriction of restrictions) {
    AppManager.applyRestriction(restriction);
  }
  
  // 检查是否有临时限制到期
  AppManager.checkTemporaryRestrictions();
  
  // 更新系统状态栏
  updateSystemStatusBar(currentPhase, gameState);
}
```

### 6.2 状态栏更新

```typescript
function updateSystemStatusBar(
  phase: Scene2Phase,
  gameState: GameState
): void {
  const statusBar: SystemStatusBar = {
    time: { display: '⏱️', turnInfo: `剩余${getRemainingTurns(gameState)}回合` },
    signal: calculateSignalLevel(phase),
    network: { type: getNetworkType(phase), isRoaming: true },
    battery: calculateBatteryStatus(gameState),
    notifications: { hasUnread: false, count: 0, urgent: hasUrgentEvent(gameState) }
  };
  
  // 更新UI
  StatusBar.update(statusBar);
}
```

---

## 7. 相关文档

- [MobileUIArchitecture.md](./MobileUIArchitecture.md) - 手机界面总体架构
- [AppFrameworkArchitecture.md](./AppFrameworkArchitecture.md) - APP通用框架
- [SceneSystemArchitecture.md](../SceneSystemArchitecture.md) - 场景系统
- [EventSystemArchitecture.md](../EventSystemArchitecture.md) - 事件系统
