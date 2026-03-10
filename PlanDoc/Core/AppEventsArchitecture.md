# APP内事件架构设计

本文档定义《去美国》各APP内部的事件结构、事件流转和数据交互规范。

---

## 1. APP内事件概述

### 1.1 事件分类

APP内事件分为三类：

| 事件类型 | 说明 | 示例 |
|---------|------|------|
| **列表事件** | 在列表中展示的可点击项 | 工作列表中的工作项、商品列表中的商品 |
| **详情事件** | 详情页中的操作 | 工作详情页的「报名」按钮、商品详情页的「购买」 |
| **内部事件** | APP内部触发的状态变更 | 刷新列表、切换筛选、搜索 |

### 1.2 事件与Core系统的映射

```typescript
// APP事件到Core事件的映射
interface AppEventMapping {
  appId: string;
  appEventId: string;               // APP内事件标识
  coreEventId: string;              // 对应Core系统事件ID
  eventType: 'FIXED' | 'CHAIN' | 'RANDOM';
  
  // 参数转换
  parameterMap: Record<string, string>;  // APP参数 -> Core参数
  
  // 结果处理
  resultHandler: (coreResult: EventResult) => AppEventResult;
}

// APP事件结果
interface AppEventResult {
  success: boolean;
  message: string;                  // 显示给用户的消息
  navigation?: {                    // 导航操作
    type: 'stay' | 'back' | 'push' | 'replace';
    target?: string;
  };
  refresh?: boolean;                // 是否刷新列表
  toast?: {                         // Toast提示
    type: 'success' | 'error' | 'info';
    message: string;
  };
}
```

---

## 2. 各APP内事件详细设计

### 2.1 赚钱APP (💼 赚点钱)

**列表事件：工作项点击**

```typescript
// 工作列表项点击 -> 打开详情
interface WorkListItemEvent {
  appEventId: 'work_item_click';
  parameters: {
    workId: string;                 // 工作ID
  };
  navigation: {
    type: 'push';
    target: 'WorkDetail';
    params: { workId: string };
  };
}

// 工作详情 -> 报名
interface WorkApplyEvent {
  appEventId: 'work_apply';
  coreEventId: 'act1_work_*';       // 根据具体工作映射
  parameters: {
    workId: string;
    slotItemId?: string;            // 选中的槽位道具
  };
  
  // 执行前检查
  preCheck: {
    hasEnoughAP: boolean;
    hasRequiredAttributes: boolean;
    hasRequiredSlots: boolean;
  };
  
  // 结果处理
  resultHandler: (result: EventResult) => ({
    success: result.success,
    message: result.success ? '报名成功！请准时到达工作地点' : result.reason,
    navigation: { type: 'back' },
    refresh: true,
    toast: result.success 
      ? { type: 'success', message: '报名成功' }
      : { type: 'error', message: result.reason }
  });
}
```

**APP内工作列表数据结构**：

```typescript
interface WorkListItem {
  id: string;
  name: string;                     // 工作名称
  category: 'daily' | 'parttime' | 'fulltime' | 'gray';
  
  // 工作信息
  wage: {
    amount: number;
    currency: 'CNY' | 'USD';
    period: 'hour' | 'day' | 'week' | 'month';
  };
  duration: number;                 // 工作时长（小时）
  distance: string;                 // 距离
  
  // 要求
  requirements: {
    attributes?: Partial<Attributes>;  // 属性要求
    slots?: string[];               // 槽位要求
  };
  
  // 状态
  status: 'available' | 'locked' | 'cooldown' | 'in_progress';
  cooldownTurns?: number;           // 冷却回合数
  
  // 效果预览
  preview: {
    money: number;                  // 预计收入
    healthChange: number;
    mentalChange: number;
    attributeChanges?: Partial<Attributes>;
  };
}
```

**工作列表刷新事件**：

```typescript
interface WorkListRefreshEvent {
  appEventId: 'work_list_refresh';
  // 内部事件，不映射到Core
  handler: () => {
    // 重新获取工作列表
    const works = getAvailableWorks(gameState);
    return { success: true, data: works };
  };
}
```

### 2.2 学习APP (📚 学点啥)

**列表事件：书籍项点击**

```typescript
interface BookItemEvent {
  appEventId: 'book_item_click';
  parameters: {
    bookId: string;
    type: 'owned' | 'store';        // 已拥有还是在商店
  };
  
  // 已拥有书籍 -> 阅读
  if (type === 'owned') {
    return {
      navigation: { type: 'push', target: 'BookReader', params: { bookId } }
    };
  }
  
  // 商店书籍 -> 购买详情
  else {
    return {
      navigation: { type: 'push', target: 'BookPurchase', params: { bookId } }
    };
  }
}

// 阅读事件
interface BookReadEvent {
  appEventId: 'book_read';
  coreEventId: 'act1_read_book';    // 通用读书事件
  parameters: {
    bookId: string;
    duration: number;               // 阅读时长（消耗的AP）
  };
  resultHandler: (result: EventResult) => ({
    success: result.success,
    message: `阅读完成，${result.attributeChanges}`,
    refresh: true,                  // 刷新书架（书籍可能已读完删除）
    toast: { type: 'success', message: '阅读完成' }
  });
}

// 购买书籍事件
interface BookPurchaseEvent {
  appEventId: 'book_purchase';
  coreEventId: 'act1_buy_book';
  parameters: {
    bookId: string;
  };
  preCheck: {
    hasEnoughMoney: boolean;
    inventoryNotFull: boolean;
  };
}
```

### 2.3 出行APP (🗺️ 怎么去)

**列表事件：目的地点击**

```typescript
interface DestinationClickEvent {
  appEventId: 'destination_click';
  parameters: {
    destinationId: string;
    destinationType: 'work' | 'shop' | 'social' | 'plot';
  };
  
  // 检查是否需要交通工具
  navigation: {
    type: 'push';
    target: 'TravelPlan';
    params: { destinationId, destinationType };
  };
}

// 规划出行事件
interface TravelPlanEvent {
  appEventId: 'travel_plan';
  coreEventId: 'act1_travel';
  parameters: {
    destinationId: string;
    transportItemId: string;        // 选中的交通工具
  };
  
  // 场景2特殊：穿越路线选择
  specialCase: {
    scene: 'act2';
    eventId: 'act2_crossing_choice';
    options: ['guide', 'desert', 'wall'];
  };
}
```

### 2.4 社交APP (💬 找人聊)

**列表事件：联系人点击**

```typescript
interface ContactClickEvent {
  appEventId: 'contact_click';
  parameters: {
    contactId: string;
  };
  navigation: {
    type: 'push';
    target: 'Chat';
    params: { contactId };
  };
}

// 发送消息事件
interface SendMessageEvent {
  appEventId: 'send_message';
  coreEventId: 'act1_social_interact';  // 可能触发社交事件
  parameters: {
    contactId: string;
    messageType: 'greet' | 'ask_help' | 'share_info' | 'plot';
  };
  
  // 特殊：剧情消息可能触发链式事件
  specialTrigger: {
    condition: (messageType, contactId) => boolean;
    chainEventId: string;
  };
}

// 接收消息（被动事件）
interface ReceiveMessageEvent {
  appEventId: 'receive_message';
  // 由通知系统触发
  trigger: {
    source: NotificationType.SOCIAL_MESSAGE;
    handler: (notification: GameNotification) => {
      // 更新聊天列表
      addMessageToChat(notification.source.contactId, notification.content);
      // 显示红点
      updateBadge('social', getUnreadCount());
    };
  };
}
```

### 2.5 购物APP (🛒 买东西)

**列表事件：商品点击**

```typescript
interface ProductClickEvent {
  appEventId: 'product_click';
  parameters: {
    productId: string;
    shopId: string;
  };
  navigation: {
    type: 'push';
    target: 'ProductDetail';
    params: { productId, shopId };
  };
}

// 加入购物车事件（APP内部）
interface AddToCartEvent {
  appEventId: 'add_to_cart';
  // 纯APP内部事件
  handler: (productId: string, quantity: number) => {
    cart.addItem(productId, quantity);
    updateCartBadge();
    showToast('已加入购物车');
  };
}

// 结算事件
interface CheckoutEvent {
  appEventId: 'checkout';
  coreEventId: 'act1_purchase';     // 通用购买事件
  parameters: {
    items: { itemId: string; quantity: number; }[];
    totalAmount: number;
  };
  preCheck: {
    hasEnoughMoney: boolean;
    inventorySpace: boolean;
  };
  resultHandler: (result: EventResult) => ({
    success: result.success,
    navigation: result.success ? { type: 'back', count: 2 } : { type: 'stay' },
    toast: { 
      type: result.success ? 'success' : 'error', 
      message: result.success ? '购买成功' : result.reason 
    }
  });
}
```

### 2.6 住宿APP (🏠 住哪儿)

**场景3专属APP**

```typescript
interface HousingListItemEvent {
  appEventId: 'housing_item_click';
  parameters: {
    housingId: string;
  };
  navigation: {
    type: 'push';
    target: 'HousingDetail';
    params: { housingId };
  };
}

// 租房事件
interface RentHousingEvent {
  appEventId: 'rent_housing';
  coreEventId: 'act3_rent_housing';
  parameters: {
    housingId: string;
    deposit: number;                  // 押金
    monthlyRent: number;              // 月租
  };
  preCheck: {
    canAffordDeposit: boolean;
    canAffordMonthly: boolean;
  };
  resultHandler: (result: EventResult) => ({
    success: result.success,
    message: result.success ? '租房成功！本月租金已扣除' : result.reason,
    refresh: true,
    toast: { type: result.success ? 'success' : 'error', message: result.message }
  });
}

// 退租事件
interface CancelHousingEvent {
  appEventId: 'cancel_housing';
  coreEventId: 'act3_cancel_housing';
  parameters: {
    housingId: string;
  };
  // 退租后进入【露宿街头】状态
  warning: '退租后将无家可归，健康和心理将持续下降';
}
```

### 2.7 健康APP (💊 看医生)

```typescript
// 自我诊断事件
interface SelfDiagnosisEvent {
  appEventId: 'self_diagnosis';
  // 纯信息展示，无Core映射
  handler: () => ({
    healthStatus: calculateHealthStatus(gameState),
    recommendations: getHealthRecommendations(gameState)
  });
}

// 使用药品事件
interface UseMedicineEvent {
  appEventId: 'use_medicine';
  coreEventId: 'act1_use_item';
  parameters: {
    itemId: string;
    target: 'self';
  };
  resultHandler: (result: EventResult) => ({
    success: result.success,
    refresh: true,                    // 刷新药品列表
    toast: { type: 'success', message: '使用成功' }
  });
}

// 休息事件
interface RestEvent {
  appEventId: 'rest';
  coreEventId: 'act1_rest';
  parameters: {
    restType: 'short' | 'long' | 'sleep';  // 小憩/长时间休息/睡觉
    location?: string;                // 休息地点（影响效果）
  };
}
```

### 2.8 新闻APP (📰 看新闻)

```typescript
// 新闻点击事件
interface NewsClickEvent {
  appEventId: 'news_click';
  parameters: {
    newsId: string;
  };
  navigation: {
    type: 'push';
    target: 'NewsDetail';
    params: { newsId };
  };
  // 标记为已读
  sideEffect: {
    markAsRead: true;
    updateBadge: decrementBadge('news');
  };
}

// 政策新闻特殊处理
interface PolicyNewsEvent {
  appEventId: 'policy_news';
  // 政策新闻关联压力事件
  coreEventId: 'act3_policy_pressure';
  parameters: {
    policyId: string;
    debuffId: string;
  };
  // 阅读后触发Debuff应用
  resultHandler: () => ({
    applyDebuff: true,
    showWarning: '新政策将对你的生存产生影响'
  });
}
```

### 2.9 借钱APP (💸 借点钱)

```typescript
// 申请贷款事件
interface ApplyLoanEvent {
  appEventId: 'apply_loan';
  coreEventId: 'act1_borrow_money';  // 场景1/2/3统一借贷事件
  parameters: {
    lenderId: string;
    amount: number;
    period: number;
  };
  preCheck: {
    creditScore: boolean;             // 信用检查
    maxDebtLimit: boolean;            // 债务上限
    noCurrentDefault: boolean;        // 无当前违约
  };
  resultHandler: (result: EventResult) => ({
    success: result.success,
    message: result.success 
      ? `借款成功！分${period}期还款，每期$${result.perTurnPayment}` 
      : result.reason,
    refresh: true,
    toast: { type: result.success ? 'success' : 'error', message: result.message }
  });
}

// 还款事件
interface RepayLoanEvent {
  appEventId: 'repay_loan';
  coreEventId: 'act3_repay_debt';
  parameters: {
    debtId: string;
    amount: number;
    isEarlyRepayment: boolean;
  };
  preCheck: {
    hasEnoughMoney: boolean;
  };
  resultHandler: (result: EventResult) => ({
    success: result.success,
    message: result.isEarlyRepayment 
      ? `提前还款成功！节省利息$${result.interestSaved}` 
      : '还款成功',
    refresh: true
  });
}

// 一次性还清所有债务
interface RepayAllLoansEvent {
  appEventId: 'repay_all_loans';
  coreEventId: 'act3_repay_all_debt';
  parameters: {};
  preCheck: {
    totalDebtAmount: number;
    hasEnoughMoney: boolean;
  };
}
```

---

## 3. APP内事件通用处理流程

### 3.1 事件处理流程图

```
用户操作APP内事件
        ↓
APP事件拦截器
        ↓
┌─────────────────┐
│ 1. 执行前检查    │
│ - 参数有效性     │
│ - 前置条件       │
│ - 资源充足性     │
└────────┬────────┘
         ↓
    检查通过?
         ↓
┌─────────┬─────────┐
│   通过   │  未通过  │
└────┬────┴────┬────┘
     ↓          ↓
调用Core系统   显示错误提示
     ↓          ↓
等待执行结果   结束
     ↓
┌─────────────────┐
│ 2. 结果处理      │
│ - 更新本地状态   │
│ - 刷新UI        │
│ - 导航操作      │
│ - Toast提示     │
└────────┬────────┘
         ↓
┌─────────────────┐
│ 3. 副作用处理    │
│ - 角标更新      │
│ - 通知发送      │
│ - 链式事件触发   │
└─────────────────┘
```

### 3.2 统一事件处理器

```typescript
// 统一APP事件处理器
class AppEventHandler {
  async handleEvent(
    appId: string,
    eventId: string,
    parameters: Record<string, any>
  ): Promise<AppEventResult> {
    // 1. 获取事件配置
    const eventConfig = this.getEventConfig(appId, eventId);
    
    // 2. 执行前检查
    const preCheckResult = await this.runPreChecks(eventConfig.preCheck, parameters);
    if (!preCheckResult.passed) {
      return {
        success: false,
        message: preCheckResult.reason,
        toast: { type: 'error', message: preCheckResult.reason }
      };
    }
    
    // 3. 调用Core系统
    let coreResult: EventResult;
    if (eventConfig.coreEventId) {
      coreResult = await EventSystem.executeEvent(
        eventConfig.coreEventId,
        this.mapParameters(eventConfig.parameterMap, parameters)
      );
    } else {
      // 纯APP内部事件
      coreResult = await this.handleInternalEvent(eventConfig, parameters);
    }
    
    // 4. 处理结果
    const appResult = eventConfig.resultHandler(coreResult);
    
    // 5. 执行副作用
    await this.handleSideEffects(eventConfig.sideEffects, appResult);
    
    return appResult;
  }
  
  private async runPreChecks(
    checks: PreCheckConfig,
    parameters: Record<string, any>
  ): Promise<{ passed: boolean; reason?: string }> {
    for (const [checkName, checkFn] of Object.entries(checks)) {
      const result = await checkFn(parameters);
      if (!result.passed) {
        return { passed: false, reason: result.reason };
      }
    }
    return { passed: true };
  }
  
  private mapParameters(
    map: Record<string, string>,
    parameters: Record<string, any>
  ): Record<string, any> {
    const mapped: Record<string, any> = {};
    for (const [appParam, coreParam] of Object.entries(map)) {
      mapped[coreParam] = parameters[appParam];
    }
    return mapped;
  }
}
```

---

## 4. 事件触发时机

### 4.1 主动触发

| 触发方式 | 说明 | 示例 |
|---------|------|------|
| **点击触发** | 用户点击列表项或按钮 | 点击工作报名、点击购买 |
| **滑动触发** | 用户滑动操作 | 下拉刷新、删除商品 |
| **输入触发** | 用户输入完成后 | 搜索、筛选条件变更 |

### 4.2 被动触发

| 触发方式 | 说明 | 示例 |
|---------|------|------|
| **通知触发** | 通知系统推送 | 新消息、新政策 |
| **状态变更触发** | 游戏状态变化 | 场景切换后APP状态更新 |
| **定时触发** | 回合切换 | 月度账单生成 |

---

## 5. 错误处理

### 5.1 错误类型

```typescript
enum AppEventError {
  // 前置条件错误
  INSUFFICIENT_AP = 'insufficient_ap',           // 行动点不足
  INSUFFICIENT_MONEY = 'insufficient_money',     // 资金不足
  INSUFFICIENT_ATTRIBUTE = 'insufficient_attr',  // 属性不足
  MISSING_REQUIRED_SLOT = 'missing_slot',        // 缺少必需槽位
  ON_COOLDOWN = 'on_cooldown',                   // 冷却中
  
  // 系统错误
  NETWORK_ERROR = 'network_error',               // 网络错误（场景2）
  EVENT_LOCKED = 'event_locked',                 // 事件已锁定
  INVENTORY_FULL = 'inventory_full',             // 背包已满
  
  // 业务错误
  CREDIT_TOO_LOW = 'credit_too_low',             // 信用太低
  MAX_DEBT_REACHED = 'max_debt_reached',         // 债务上限
}

// 错误提示映射
const errorMessages: Record<AppEventError, string> = {
  [AppEventError.INSUFFICIENT_AP]: '行动点不足，请休息恢复',
  [AppEventError.INSUFFICIENT_MONEY]: '资金不足，先去赚点钱吧',
  [AppEventError.INSUFFICIENT_ATTRIBUTE]: '属性不足，需要{attribute}≥{value}',
  [AppEventError.MISSING_REQUIRED_SLOT]: '缺少必需的道具: {slotType}',
  [AppEventError.ON_COOLDOWN]: '该选项冷却中，还剩{turns}回合',
  [AppEventError.NETWORK_ERROR]: '当前区域无网络，无法使用该功能',
  [AppEventError.EVENT_LOCKED]: '该功能尚未解锁',
  [AppEventError.INVENTORY_FULL]: '背包已满，请先整理物品',
  [AppEventError.CREDIT_TOO_LOW]: '信用评分过低，无法申请贷款',
  [AppEventError.MAX_DEBT_REACHED]: '债务已达上限，请先还款',
};
```

---

## 6. 相关文档

- [MobileUIArchitecture.md](./MobileUIArchitecture.md) - 手机界面总体架构
- [AppFrameworkArchitecture.md](./AppFrameworkArchitecture.md) - APP通用框架
- [EventSystemArchitecture.md](../EventSystemArchitecture.md) - Core事件系统
