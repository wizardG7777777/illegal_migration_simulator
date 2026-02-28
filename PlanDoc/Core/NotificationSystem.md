# 通知系统架构设计

本文档定义《去美国》手机界面中的通知系统，将回合开始时触发的随机事件以手机通知形式呈现，要求玩家依次确认，无静默推送。

---

## 1. 核心设计原则

### 1.1 设计约束

1. **全部需要确认**：所有通知必须玩家手动确认，无静默推送
2. **依次呈现**：多个通知排队，逐个显示
3. **回合开始触发**：随机事件在回合开始时通过通知系统触发
4. **强制交互**：未处理完所有通知前，无法操作手机主界面

### 1.2 通知类型

| 类型 | 图标 | 颜色 | 说明 |
|-----|------|------|------|
| **紧急** | 🔴 | #E53E3E | 终结态警告、死亡威胁 |
| **重要** | 🟠 | #DD6B20 | 政策压力事件、重要剧情 |
| **普通** | 🔵 | #3182CE | 普通随机事件 |
| **系统** | ⚪ | #718096 | 系统提示、状态变更 |
| **社交** | 💬 | #38A169 | 聊天消息、社交事件 |

---

## 2. 数据结构

### 2.1 通知接口

```typescript
// 通知数据结构
interface GameNotification {
  id: string;                       // 唯一标识
  type: NotificationType;
  priority: NotificationPriority;
  
  // 显示内容
  content: {
    title: string;                  // 通知标题
    body: string;                   // 通知内容
    icon?: string;                  // 图标
    image?: string;                 // 配图（可选）
  };
  
  // 来源信息
  source: {
    appId: string;                  // 来源APP
    eventId: string;                // 关联事件ID
  };
  
  // 交互配置
  actions: NotificationAction[];    // 操作按钮
  
  // 时间信息
  timestamp: number;                // 生成时间
  expiry?: number;                  // 过期时间（可选）
  
  // 状态
  status: 'pending' | 'displayed' | 'confirmed' | 'expired';
  
  // 是否需要确认（全部通知都需要）
  requiresConfirmation: true;       // 固定为true
}

enum NotificationType {
  RANDOM_EVENT = 'random_event',     // 随机事件
  POLICY_PRESSURE = 'policy_pressure', // 政策压力
  TERMINAL_WARNING = 'terminal_warning', // 终结态警告
  SOCIAL_MESSAGE = 'social_message', // 社交消息
  SYSTEM = 'system',                 // 系统通知
  CHAIN_EVENT = 'chain_event',       // 事件链触发
  APP_UNLOCK = 'app_unlock',         // APP解锁
}

enum NotificationPriority {
  URGENT = 1,                        // 紧急 - 终结态
  HIGH = 2,                          // 重要 - 政策压力
  NORMAL = 3,                        // 普通 - 随机事件
  LOW = 4,                           // 低 - 系统提示
}

interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
}
```

### 2.2 通知队列

```typescript
interface NotificationQueue {
  notifications: GameNotification[];
  currentIndex: number;             // 当前显示的通知索引
  
  // 队列操作
  enqueue(notification: GameNotification): void;
  dequeue(): GameNotification | null;
  peek(): GameNotification | null;
  
  // 状态检查
  hasPending: boolean;              // 是否有待处理通知
  getPendingCount: () => number;    // 待处理数量
  
  // 清空
  clear(): void;
}

// 通知队列管理器
class NotificationManager {
  private queue: NotificationQueue = {
    notifications: [],
    currentIndex: 0,
    enqueue: (n) => { /* ... */ },
    dequeue: () => { /* ... */ },
    peek: () => queue.notifications[queue.currentIndex] || null,
    hasPending: false,
    getPendingCount: () => queue.notifications.length - queue.currentIndex,
    clear: () => { queue.notifications = []; queue.currentIndex = 0; }
  };
  
  // 添加通知到队列
  add(notification: GameNotification): void {
    // 按优先级插入
    const insertIndex = this.queue.notifications.findIndex(
      n => n.priority > notification.priority
    );
    if (insertIndex === -1) {
      this.queue.notifications.push(notification);
    } else {
      this.queue.notifications.splice(insertIndex, 0, notification);
    }
  }
  
  // 确认当前通知
  confirmCurrent(): void {
    const current = this.queue.peek();
    if (current) {
      current.status = 'confirmed';
      this.queue.currentIndex++;
    }
  }
  
  // 获取当前通知
  getCurrent(): GameNotification | null {
    return this.queue.peek();
  }
  
  // 是否还有未处理通知
  hasPending(): boolean {
    return this.queue.currentIndex < this.queue.notifications.length;
  }
  
  // 获取剩余数量
  getRemainingCount(): number {
    return this.queue.notifications.length - this.queue.currentIndex;
  }
}
```

---

## 3. 通知触发机制

### 3.1 回合开始通知生成

```typescript
// 回合开始时的通知生成流程
async function generateTurnStartNotifications(
  gameState: GameState
): Promise<GameNotification[]> {
  const notifications: GameNotification[] = [];
  
  // 1. 检查终结态（最高优先级）
  if (gameState.character.terminalState) {
    notifications.push(createTerminalWarningNotification(gameState));
  }
  
  // 2. 检查随机事件池
  const randomEvents = await EventSystem.getAvailableRandomEvents(gameState);
  for (const event of randomEvents) {
    notifications.push(createRandomEventNotification(event));
  }
  
  // 3. 检查政策压力事件（场景3）
  if (gameState.currentScene === 'act3') {
    const policyEvent = await EventSystem.checkPolicyPressure(gameState);
    if (policyEvent) {
      notifications.push(createPolicyNotification(policyEvent));
    }
  }
  
  // 4. 检查APP解锁
  const unlockedApps = checkAppUnlocks(gameState);
  for (const app of unlockedApps) {
    notifications.push(createAppUnlockNotification(app));
  }
  
  // 5. 检查社交消息
  const socialMessages = await SocialSystem.getPendingMessages(gameState);
  for (const message of socialMessages) {
    notifications.push(createSocialNotification(message));
  }
  
  // 按优先级排序
  return notifications.sort((a, b) => a.priority - b.priority);
}

// 创建终结态警告通知
function createTerminalWarningNotification(gameState: GameState): GameNotification {
  const state = gameState.character.terminalState;
  
  if (state.type === 'DYING') {
    return {
      id: `terminal_dying_${gameState.turn}`,
      type: NotificationType.TERMINAL_WARNING,
      priority: NotificationPriority.URGENT,
      content: {
        title: '⚠️ 身体状况危急',
        body: `你感到生命力在流失...还有 ${state.window} 回合找到救治，否则将走向终结。`,
        icon: '💀'
      },
      source: { appId: 'health', eventId: 'terminal_dying' },
      actions: [
        { id: 'find_help', label: '寻找救治', type: 'primary', onClick: () => {} },
        { id: 'ignore', label: '我知道了', type: 'secondary', onClick: () => {} }
      ],
      timestamp: Date.now(),
      status: 'pending',
      requiresConfirmation: true
    };
  }
  
  if (state.type === 'BREAKDOWN') {
    return {
      id: `terminal_breakdown_${gameState.turn}`,
      type: NotificationType.TERMINAL_WARNING,
      priority: NotificationPriority.URGENT,
      content: {
        title: '⚠️ 精神状态崩溃',
        body: `你的精神濒临崩溃...还有 ${state.window} 回合调整心态，否则将彻底崩溃。`,
        icon: '💔'
      },
      source: { appId: 'health', eventId: 'terminal_breakdown' },
      actions: [
        { id: 'rest', label: '休息调整', type: 'primary', onClick: () => {} },
        { id: 'ignore', label: '我知道了', type: 'secondary', onClick: () => {} }
      ],
      timestamp: Date.now(),
      status: 'pending',
      requiresConfirmation: true
    };
  }
  
  // DESTITUTION 不生成紧急通知，通过月度账单提示
  return null as any;
}

// 创建随机事件通知
function createRandomEventNotification(event: RandomEvent): GameNotification {
  return {
    id: `random_${event.id}_${Date.now()}`,
    type: NotificationType.RANDOM_EVENT,
    priority: event.isDangerous ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
    content: {
      title: getEventTitle(event),
      body: event.description.substring(0, 100) + '...',
      icon: getEventIcon(event)
    },
    source: { appId: getEventSourceApp(event), eventId: event.id },
    actions: [
      { 
        id: 'view', 
        label: '查看详情', 
        type: 'primary', 
        onClick: () => openEventDetail(event) 
      },
      { 
        id: 'ignore', 
        label: '稍后再说', 
        type: 'secondary', 
        onClick: () => {} 
      }
    ],
    timestamp: Date.now(),
    status: 'pending',
    requiresConfirmation: true
  };
}

// 创建政策压力通知
function createPolicyNotification(event: PolicyPressureEvent): GameNotification {
  return {
    id: `policy_${event.id}_${Date.now()}`,
    type: NotificationType.POLICY_PRESSURE,
    priority: NotificationPriority.HIGH,
    content: {
      title: '🔴 紧急政策公告',
      body: `唐纳德总统宣布${event.policyName}，这下移民局的搜查力度更大了...`,
      icon: '📰'
    },
    source: { appId: 'news', eventId: event.id },
    actions: [
      { 
        id: 'read', 
        label: '阅读全文', 
        type: 'primary', 
        onClick: () => openPolicyDetail(event) 
      }
    ],
    timestamp: Date.now(),
    status: 'pending',
    requiresConfirmation: true
  };
}

// 创建APP解锁通知
function createAppUnlockNotification(app: AppConfig): GameNotification {
  return {
    id: `unlock_${app.id}_${Date.now()}`,
    type: NotificationType.APP_UNLOCK,
    priority: NotificationPriority.NORMAL,
    content: {
      title: '✨ 新功能解锁',
      body: `${app.name} 已安装到你的手机，${app.unlockDescription || '现在可以使用了！'}`,
      icon: app.icon
    },
    source: { appId: 'system', eventId: `unlock_${app.id}` },
    actions: [
      { 
        id: 'open', 
        label: '立即打开', 
        type: 'primary', 
        onClick: () => openApp(app.id) 
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
  };
}
```

---

## 4. 通知界面

### 4.1 通知中心（锁屏界面）

```
┌─────────────────────────────────────────┐
│  9:41    12月15日 星期五                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔴 紧急                                             │   │
│  │ 身体状况危急                                        │   │
│  │ 你感到生命力在流失...还有2回合找到救治             │   │
│  │                                     [寻找救治]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📰 看新闻                                           │   │
│  │ 新政策发布：移民执法力度加强                        │   │
│  │                                     [阅读全文]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💬 找人聊                                           │   │
│  │ 王哥发来新消息                                      │   │
│  │                                     [查看]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│           还有 2 条通知                                    │
│                                                             │
│              [滑动解锁]                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 通知弹窗（模态）

当有高优先级通知时，全屏弹窗阻止操作：

```
┌─────────────────────────────────────────┐
│                                                             │
│                                                             │
│                  🔴 紧急                                    │
│                                                             │
│              身体状况危急                                   │
│                                                             │
│     你感到生命力在流失...                                   │
│     还有 2 回合找到救治                                     │
│     否则将走向终结                                          │
│                                                             │
│     体魄决定的喘息窗口:                                     │
│     ◉ ◉ ○                                                   │
│                                                             │
│                                                             │
│              [寻找救治]    [我知道了]                       │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 通知条（顶部滑入）

普通通知以顶部通知条形式出现：

```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────────┐ │
│  │ 💬 找人聊                    刚刚   │ │
│  │ 王哥: 兄弟，有个工作机会...         │ │
│  │                            [查看]   │ │
│  └─────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    ...                                     │
```

### 4.4 通知队列指示器

多个通知时显示进度：

```
┌─────────────────────────────────────────┐
│  通知 1/3  🔴 紧急                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              ...通知内容...                                 │
│                                                             │
│     [上一条]          [下一条]                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 交互流程

### 5.1 回合开始完整流程

```
回合开始
    ↓
[显示遮罩: 正在接收新消息...]
    ↓
生成通知队列
    ↓
检查是否有通知
    ↓
┌─────────┬─────────┐
│  有通知  │ 无通知   │
└────┬────┴────┬────┘
     ↓          ↓
显示锁屏界面   直接进入
(通知中心)     手机主界面
     ↓
玩家处理通知
    ↓
是否还有未处理？
    ↓
┌─────────┬─────────┐
│    是    │   否    │
└────┬────┴────┬────┘
     ↓          ↓
  显示下一条    解锁
  通知          进入主界面
```

### 5.2 通知处理状态

```typescript
// 通知处理Hook
const useNotificationSystem = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<GameNotification | null>(null);
  const [queueInfo, setQueueInfo] = useState({ current: 0, total: 0 });
  
  // 开始处理回合通知
  const startProcessing = useCallback(async (gameState: GameState) => {
    setIsProcessing(true);
    
    // 生成通知
    const notifications = await generateTurnStartNotifications(gameState);
    
    // 初始化队列
    NotificationManager.initializeQueue(notifications);
    
    // 显示第一条
    showNextNotification();
  }, []);
  
  // 显示下一条通知
  const showNextNotification = useCallback(() => {
    const next = NotificationManager.getCurrent();
    if (next) {
      setCurrentNotification(next);
      setQueueInfo({
        current: NotificationManager.getCurrentIndex() + 1,
        total: NotificationManager.getTotalCount()
      });
    } else {
      // 队列为空，结束处理
      setIsProcessing(false);
      setCurrentNotification(null);
      unlockPhone();
    }
  }, []);
  
  // 确认当前通知
  const confirmCurrent = useCallback((actionId: string) => {
    const current = NotificationManager.getCurrent();
    if (current) {
      // 执行操作
      const action = current.actions.find(a => a.id === actionId);
      if (action) {
        action.onClick();
      }
      
      // 标记为已确认
      NotificationManager.confirmCurrent();
      
      // 显示下一条
      showNextNotification();
    }
  }, [showNextNotification]);
  
  return {
    isProcessing,
    currentNotification,
    queueInfo,
    startProcessing,
    confirmCurrent
  };
};
```

---

## 6. 与事件系统的对接

### 6.1 事件到通知的转换

```typescript
// 事件系统通知适配器
class EventNotificationAdapter {
  // 将随机事件转换为通知
  static convertRandomEvent(event: RandomEvent): GameNotification {
    return {
      id: `event_${event.id}`,
      type: NotificationType.RANDOM_EVENT,
      priority: this.mapEventPriority(event),
      content: {
        title: event.title,
        body: event.description,
        icon: this.getEventIcon(event)
      },
      source: {
        appId: this.mapEventToApp(event),
        eventId: event.id
      },
      actions: event.options.map(opt => ({
        id: opt.id,
        label: opt.label,
        type: opt.isRecommended ? 'primary' : 'secondary',
        onClick: () => EventSystem.executeEvent(event.id, opt.id)
      })),
      timestamp: Date.now(),
      status: 'pending',
      requiresConfirmation: true
    };
  }
  
  // 映射事件优先级
  private static mapEventPriority(event: RandomEvent): NotificationPriority {
    if (event.isFatal) return NotificationPriority.URGENT;
    if (event.isDangerous) return NotificationPriority.HIGH;
    if (event.isImportant) return NotificationPriority.NORMAL;
    return NotificationPriority.LOW;
  }
  
  // 映射事件到APP
  private static mapEventToApp(event: RandomEvent): string {
    const appMap: Record<string, string> = {
      'work': 'work',
      'social': 'social',
      'travel': 'travel',
      'shop': 'shop',
      'health': 'health',
      'news': 'news',
      'finance': 'finance'
    };
    return appMap[event.category] || 'system';
  }
}
```

---

## 7. 界面实现

### 7.1 锁屏通知中心组件

```tsx
// LockScreen.tsx
interface LockScreenProps {
  notifications: GameNotification[];
  onUnlock: () => void;
  onNotificationClick: (notification: GameNotification, actionId: string) => void;
}

const LockScreen: React.FC<LockScreenProps> = ({
  notifications,
  onUnlock,
  onNotificationClick
}) => {
  return (
    <div className="lock-screen">
      {/* 时间和日期 */}
      <div className="lock-screen__time">
        <div className="time">9:41</div>
        <div className="date">12月15日 星期五</div>
        <div className="game-info">场景3 - 美国生存 第5天</div>
      </div>
      
      {/* 通知列表 */}
      <div className="lock-screen__notifications">
        {notifications.slice(0, 3).map(notification => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onActionClick={(actionId) => onNotificationClick(notification, actionId)}
          />
        ))}
        
        {notifications.length > 3 && (
          <div className="more-notifications">
            还有 {notifications.length - 3} 条通知
          </div>
        )}
      </div>
      
      {/* 解锁提示 */}
      <div className="lock-screen__unlock" onClick={onUnlock}>
        [滑动解锁]
      </div>
    </div>
  );
};

// 通知卡片组件
const NotificationCard: React.FC<{
  notification: GameNotification;
  onActionClick: (actionId: string) => void;
}> = ({ notification, onActionClick }) => {
  return (
    <div className={`notification-card notification-card--${notification.type}`}>
      <div className="notification-card__header">
        <span className="icon">{notification.content.icon}</span>
        <span className="source">{getAppName(notification.source.appId)}</span>
        <span className="time">刚刚</span>
      </div>
      
      <div className="notification-card__content">
        <div className="title">{notification.content.title}</div>
        <div className="body">{notification.content.body}</div>
      </div>
      
      <div className="notification-card__actions">
        {notification.actions.map(action => (
          <button
            key={action.id}
            className={`action-btn action-btn--${action.type}`}
            onClick={() => onActionClick(action.id)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};
```

### 7.2 通知弹窗组件

```tsx
// NotificationModal.tsx
interface NotificationModalProps {
  notification: GameNotification;
  queueInfo: { current: number; total: number };
  onConfirm: (actionId: string) => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  notification,
  queueInfo,
  onConfirm
}) => {
  return (
    <div className="notification-modal-overlay">
      <div className={`notification-modal notification-modal--${notification.type}`}>
        {/* 队列指示器 */}
        <div className="queue-indicator">
          通知 {queueInfo.current}/{queueInfo.total}
        </div>
        
        {/* 图标 */}
        <div className="notification-modal__icon">
          {notification.content.icon}
        </div>
        
        {/* 内容 */}
        <div className="notification-modal__content">
          <h2>{notification.content.title}</h2>
          <p>{notification.content.body}</p>
        </div>
        
        {/* 操作按钮 */}
        <div className="notification-modal__actions">
          {notification.actions.map(action => (
            <button
              key={action.id}
              className={`btn btn--${action.type}`}
              onClick={() => onConfirm(action.id)}
            >
              {action.label}
            </button>
          ))}
        </div>
        
        {/* 进度条（多个通知时） */}
        {queueInfo.total > 1 && (
          <div className="progress-bar">
            <div 
              className="progress-bar__fill" 
              style={{ width: `${(queueInfo.current / queueInfo.total) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 8. 样式设计

```css
/* notification-system.css */

/* 锁屏界面 */
.lock-screen {
  position: fixed;
  inset: 0;
  background: linear-gradient(180deg, #1a202c 0%, #2d3748 100%);
  display: flex;
  flex-direction: column;
  padding: 60px 20px 40px;
}

.lock-screen__time {
  text-align: center;
  color: white;
  margin-bottom: 40px;
}

.lock-screen__time .time {
  font-size: 72px;
  font-weight: 200;
}

.lock-screen__time .date {
  font-size: 18px;
  opacity: 0.8;
}

/* 通知卡片 */
.notification-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  backdrop-filter: blur(10px);
}

.notification-card--terminal_warning {
  background: linear-gradient(135deg, #FED7D7 0%, #FEB2B2 100%);
  border: 2px solid #E53E3E;
}

.notification-card--policy_pressure {
  background: linear-gradient(135deg, #FEEBC8 0%, #FBD38D 100%);
}

.notification-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #718096;
}

.notification-card__content .title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.notification-card__content .body {
  font-size: 14px;
  color: #4A5568;
  line-height: 1.5;
}

.notification-card__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
}

/* 通知弹窗 */
.notification-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.notification-modal {
  background: white;
  border-radius: 20px;
  padding: 32px;
  max-width: 360px;
  width: 90%;
  text-align: center;
}

.notification-modal--terminal_warning {
  background: linear-gradient(135deg, #FFF5F5 0%, #FED7D7 100%);
  border: 3px solid #E53E3E;
}

.notification-modal__icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.notification-modal__content h2 {
  font-size: 20px;
  margin-bottom: 12px;
}

.notification-modal__content p {
  font-size: 16px;
  color: #4A5568;
  line-height: 1.6;
}

.notification-modal__actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.notification-modal__actions button {
  flex: 1;
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  font-size: 16px;
  cursor: pointer;
}

.btn--primary {
  background: #3182CE;
  color: white;
}

.btn--secondary {
  background: #E2E8F0;
  color: #4A5568;
}

.btn--danger {
  background: #E53E3E;
  color: white;
}

/* 进度条 */
.progress-bar {
  height: 4px;
  background: #E2E8F0;
  border-radius: 2px;
  margin-top: 24px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: #3182CE;
  border-radius: 2px;
  transition: width 0.3s ease;
}
```

---

## 9. 相关文档

- [MobileUIArchitecture.md](./MobileUIArchitecture.md) - 手机界面总体架构
- [AppFrameworkArchitecture.md](./AppFrameworkArchitecture.md) - APP通用框架
- [EventSystemArchitecture.md](../EventSystemArchitecture.md) - 事件系统
