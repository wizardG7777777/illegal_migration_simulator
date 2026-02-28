# APP通用框架架构设计

本文档定义《去美国》手机界面中各APP的通用架构，提供高可复用的组件框架，确保所有APP拥有一致的交互体验和视觉风格。

---

## 1. 通用APP架构

### 1.1 APP容器架构

所有APP共享同一个容器外壳，内部内容通过配置渲染：

```typescript
// APP容器接口
interface AppContainerProps {
  appId: string;                    // APP唯一标识
  appConfig: AppConfig;             // APP配置
  children: React.ReactNode;        // APP内容
}

// APP配置接口
interface AppConfig {
  id: string;
  name: string;                     // 显示名称
  icon: string;                     // 图标
  theme: AppTheme;                  // 主题配色
  
  // 导航配置
  navigation: {
    type: 'tabs' | 'list' | 'stack';  // 导航类型
    items: NavItem[];               // 导航项
  };
  
  // 功能配置
  features: {
    search: boolean;                // 是否支持搜索
    filter: boolean;                // 是否支持筛选
    refresh: boolean;               // 是否支持下拉刷新
    badge: boolean;                 // 是否显示角标
  };
  
  // 状态配置
  states: {
    empty: EmptyStateConfig;        // 空状态
    loading: LoadingStateConfig;    // 加载状态
    error: ErrorStateConfig;        // 错误状态
    locked: LockedStateConfig;      // 锁定状态
  };
}

// 导航项
interface NavItem {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
  isDefault?: boolean;
}

// 主题配置
interface AppTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  accentColor: string;
}
```

### 1.2 APP容器布局

```
┌─────────────────────────────────────────┐
│  【APP通用容器】                          │
├─────────────────────────────────────────────────────────────┤
│  < 返回    APP名称              [🔍] [⋯]   │  ← 顶部导航栏
├─────────────────────────────────────────────────────────────┤
│  【Tab导航栏】（可选）                      │
│  [Tab1] [Tab2] [Tab3]                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │              【APP内容区域】                         │   │
│  │                                                     │   │
│  │   列表 / 卡片 / 详情 / 表单                          │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  【底部操作栏】（可选）                     │
│  [次要操作]          [主要操作]             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 顶部导航栏组件

```typescript
interface AppHeaderProps {
  title: string;                    // 标题
  showBack: boolean;                // 是否显示返回
  onBack: () => void;               // 返回回调
  
  // 右侧操作
  rightActions: HeaderAction[];
  
  // 自定义内容
  customContent?: React.ReactNode;
}

interface HeaderAction {
  icon: string;
  label?: string;
  badge?: number;
  onClick: () => void;
  disabled?: boolean;
}
```

**顶部导航栏变体**：

```
基础版:              带搜索:              带操作:
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ <   赚点钱     │  │ <   赚点钱  🔍 │  │ <   找人聊  ⋯ │
└────────────────┘  └────────────────┘  └────────────────┘

带自定义:            详情页:             Tab切换:
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ <   赚点钱  💰 │  │ < 超市理货员   │  │ <   [Tab切换] │
└────────────────┘  └────────────────┘  └────────────────┘
```

### 1.4 Tab导航组件

```typescript
interface AppTabBarProps {
  tabs: NavItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant: 'default' | 'pills' | 'underline';
}
```

**Tab导航样式**：

```
默认样式:            胶囊样式:           下划线样式:
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ [全部][日结][全职]│ │  全部 | 日结 | 全职│ │ 全部  日结  全职│
│                │  │  [====]         │  │  ───           │
└────────────────┘  └────────────────┘  └────────────────┘
```

### 1.5 列表组件（核心复用组件）

```typescript
// 通用列表项接口
interface AppListItemProps {
  id: string;
  type: 'event' | 'item' | 'contact' | 'news' | 'job' | 'message';
  
  // 基础信息
  title: string;
  subtitle?: string;
  description?: string;
  
  // 媒体
  icon?: string;                    // Emoji图标
  image?: string;                   // 图片URL
  avatar?: string;                  // 头像（社交类）
  
  // 元信息
  metadata: {
    badges?: Badge[];               // 角标标签
    tags?: Tag[];                   // 标签
    price?: PriceInfo;              // 价格信息
    distance?: string;              // 距离
    time?: string;                  // 时间
    status?: ItemStatus;            // 状态
  };
  
  // 操作
  primaryAction?: ListAction;
  secondaryActions?: ListAction[];
  
  // 点击
  onClick?: () => void;
  onExpand?: () => void;
}

// 列表项状态
enum ItemStatus {
  AVAILABLE = 'available',           // 可用
  LOCKED = 'locked',                 // 锁定
  COOLDOWN = 'cooldown',             // 冷却中
  IN_PROGRESS = 'in_progress',       // 进行中
  COMPLETED = 'completed',           // 已完成
  UNREAD = 'unread',                 // 未读
}

// 角标
interface Badge {
  text: string;
  type: 'default' | 'warning' | 'danger' | 'success';
}

// 价格信息
interface PriceInfo {
  amount: number;
  currency: 'CNY' | 'USD';
  originalAmount?: number;          // 原价（折扣显示）
  unit?: string;                    // 单位（如 "/天"）
}

// 列表操作
interface ListAction {
  icon?: string;
  label: string;
  onClick: (e: Event) => void;
  variant?: 'primary' | 'secondary' | 'danger';
}
```

**列表项模板**：

```
基础列表项:              带操作列表项:           带图片列表项:
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ 📦 超市理货员       │  │ 📦 超市理货员    [去]│  │ ┌────┐ 📦 超市理货员│
│ 💰 $120/天         │  │ 💰 $120/天          │  │ │ 📷 │ 💰 $120/天    │
│ ⏱️ 8小时           │  │ ⏱️ 8小时            │  │ └────┘ ⏱️ 8小时     │
└────────────────────┘  └────────────────────┘  └────────────────────┘

消息列表项:              商品列表项:             工作列表项:
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ ┌──┐ 王哥      刚刚 │  │ ┌────┐ 💊 止痛药   │  │ 📦 超市理货员      │
│ │👤│ [新消息]...   │  │ │ 💊 │ $15        │  │ 💰 $120/天 ⭐3.2  │
│ └──┘ ────────────── │  │ └────┤ [+购物车]  │  │ 📍 2km [日结] [报名]│
└────────────────────┘  └──────┘            │  └────────────────────┘
```

### 1.6 空状态组件

```typescript
interface EmptyStateConfig {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

```
┌─────────────────────────────────────────┐
│                                         │
│                  📭                     │
│                                         │
│            暂时没有可用工作              │
│                                         │
│    你的属性还不够，先去学习提升一下吧     │
│                                         │
│         [去学习]                        │
│                                         │
└─────────────────────────────────────────┘
```

### 1.7 加载与错误状态

```
加载中:                      错误:
┌─────────────────────────┐  ┌─────────────────────────┐
│                         │  │                         │
│       ┌─────────┐       │  │          ⚠️            │
│       │ 加载中...│       │  │                         │
│       │ ◠ ◡ ◠  │       │  │    无法连接到网络        │
│       └─────────┘       │  │                         │
│                         │  │    请检查信号强度        │
│                         │  │                         │
│                         │  │       [重试]            │
└─────────────────────────┘  └─────────────────────────┘
```

---

## 2. 具体APP配置示例

### 2.1 赚钱APP配置

```typescript
const workAppConfig: AppConfig = {
  id: 'work',
  name: '赚点钱',
  icon: '💼',
  theme: {
    primaryColor: '#38A169',
    secondaryColor: '#2F855A',
    backgroundColor: '#F7FAFC',
    surfaceColor: '#FFFFFF',
    textColor: '#1A202C',
    accentColor: '#48BB78'
  },
  
  navigation: {
    type: 'tabs',
    items: [
      { id: 'all', label: '全部', isDefault: true },
      { id: 'daily', label: '日结' },
      { id: 'parttime', label: '兼职' },
      { id: 'fulltime', label: '全职' },
      { id: 'gray', label: '灰色' }
    ]
  },
  
  features: {
    search: true,
    filter: true,
    refresh: true,
    badge: true
  },
  
  states: {
    empty: {
      icon: '💼',
      title: '暂时没有可用工作',
      description: '你的属性还不够，先去学习提升一下吧',
      action: { label: '去学习', onClick: () => openApp('study') }
    },
    loading: {
      icon: '⏳',
      title: '正在加载工作列表...'
    },
    error: {
      icon: '⚠️',
      title: '无法加载工作列表',
      description: '请检查网络连接'
    },
    locked: {
      icon: '🔒',
      title: '赚钱APP已锁定',
      description: '场景2穿越途中无法打工'
    }
  }
};
```

### 2.2 社交APP配置

```typescript
const socialAppConfig: AppConfig = {
  id: 'social',
  name: '找人聊',
  icon: '💬',
  theme: {
    primaryColor: '#3182CE',
    secondaryColor: '#2C5282',
    backgroundColor: '#F7FAFC',
    surfaceColor: '#FFFFFF',
    textColor: '#1A202C',
    accentColor: '#4299E1'
  },
  
  navigation: {
    type: 'tabs',
    items: [
      { id: 'contacts', label: '联系人', isDefault: true, badge: 0 },
      { id: 'groups', label: '群聊' },
      { id: 'nearby', label: '附近的人' }
    ]
  },
  
  features: {
    search: true,
    filter: false,
    refresh: true,
    badge: true
  },
  
  states: {
    empty: {
      icon: '👤',
      title: '还没有联系人',
      description: '多参加社交活动，结识新朋友'
    }
  }
};
```

---

## 3. APP框架复用实现

### 3.1 基础容器组件

```tsx
// AppContainer.tsx
interface AppContainerProps {
  config: AppConfig;
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
}

const AppContainer: React.FC<AppContainerProps> = ({
  config,
  children,
  currentView,
  onViewChange
}) => {
  return (
    <div 
      className="app-container"
      style={{ '--app-primary': config.theme.primaryColor } as React.CSSProperties}
    >
      {/* 顶部导航 */}
      <AppHeader
        title={config.name}
        showBack={true}
        onBack={closeApp}
        rightActions={[
          config.features.search && { icon: '🔍', onClick: toggleSearch },
          { icon: '⋯', onClick: showOptions }
        ].filter(Boolean)}
      />
      
      {/* Tab导航 */}
      {config.navigation.type === 'tabs' && (
        <AppTabBar
          tabs={config.navigation.items}
          activeTab={currentView}
          onTabChange={onViewChange}
          variant="default"
        />
      )}
      
      {/* 内容区域 */}
      <main className="app-content">
        {children}
      </main>
      
      {/* 底部操作栏（可选） */}
      <AppFooter />
    </div>
  );
};
```

### 3.2 列表渲染器

```tsx
// AppList.tsx
interface AppListProps<T extends AppListItemProps> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyState?: EmptyStateConfig;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
}

const AppList = <T extends AppListItemProps>({
  items,
  renderItem,
  emptyState,
  loading,
  error,
  onRefresh
}: AppListProps<T>) => {
  // 加载状态
  if (loading) return <LoadingState />;
  
  // 错误状态
  if (error) return <ErrorState message={error} onRetry={onRefresh} />;
  
  // 空状态
  if (items.length === 0 && emptyState) {
    return <EmptyState {...emptyState} />;
  }
  
  // 列表渲染
  return (
    <div className="app-list">
      {items.map(item => (
        <ListItemRenderer key={item.id} item={item} render={renderItem} />
      ))}
    </div>
  );
};

// 默认列表项渲染
const DefaultListItem: React.FC<{ item: AppListItemProps }> = ({ item }) => {
  return (
    <div 
      className={`list-item list-item--${item.metadata.status}`}
      onClick={item.onClick}
    >
      {/* 图标/头像 */}
      {item.avatar && <Avatar src={item.avatar} />}
      {item.icon && <span className="list-item__icon">{item.icon}</span>}
      
      {/* 内容 */}
      <div className="list-item__content">
        <div className="list-item__title">{item.title}</div>
        {item.subtitle && (
          <div className="list-item__subtitle">{item.subtitle}</div>
        )}
        {item.description && (
          <div className="list-item__desc">{item.description}</div>
        )}
        
        {/* 元信息 */}
        <div className="list-item__meta">
          {item.metadata.badges?.map(badge => (
            <Badge key={badge.text} type={badge.type}>{badge.text}</Badge>
          ))}
          {item.metadata.price && (
            <Price {...item.metadata.price} />
          )}
        </div>
      </div>
      
      {/* 操作区 */}
      <div className="list-item__actions">
        {item.primaryAction && (
          <Button onClick={item.primaryAction.onClick}>
            {item.primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
};
```

---

## 4. APP状态管理

### 4.1 APP状态机

```typescript
// APP状态机
enum AppScreenState {
  LOADING = 'loading',               // 加载中
  LIST = 'list',                     // 列表视图
  DETAIL = 'detail',                 // 详情视图
  FORM = 'form',                     // 表单视图
  EMPTY = 'empty',                   // 空状态
  ERROR = 'error',                   // 错误状态
  LOCKED = 'locked'                  // 锁定状态
}

interface AppStateMachine {
  currentState: AppScreenState;
  previousState: AppScreenState | null;
  data: any;
  
  // 状态转换
  transition(to: AppScreenState, data?: any): void;
  goBack(): void;
}

// 使用示例
const useAppState = (appId: string) => {
  const [state, setState] = useState<AppScreenState>(AppScreenState.LOADING);
  const [data, setData] = useState<any>(null);
  
  const transition = useCallback((to: AppScreenState, newData?: any) => {
    setState(to);
    if (newData) setData(newData);
  }, []);
  
  return { state, data, transition };
};
```

### 4.2 APP数据获取

```typescript
// APP数据钩子
const useAppData = (appId: string, viewId: string) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 通过Adapter获取数据
      const result = await MobileUIAdapter.getAppContent(appId, viewId);
      setData(result.listItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [appId, viewId]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, loading, error, refresh: fetchData };
};
```

---

## 5. 跨APP通用交互

### 5.1 APP间跳转

```typescript
// APP跳转系统
interface AppNavigator {
  // 打开APP
  openApp(appId: string, params?: Record<string, any>): void;
  
  // 关闭当前APP
  closeApp(): void;
  
  // 跳转到指定视图
  navigateTo(appId: string, viewId: string, params?: any): void;
  
  // 返回
  goBack(): void;
}

// 使用示例
const handleWorkClick = () => {
  // 从社交APP的工作推荐跳转到赚钱APP
  navigator.openApp('work', { 
    filter: 'recommended',
    referrer: 'social'
  });
};
```

### 5.2 全局操作

```typescript
// 全局操作接口
interface GlobalActions {
  // 显示Toast
  toast(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
  
  // 显示确认对话框
  confirm(options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }): void;
  
  // 显示加载遮罩
  showLoading(message?: string): void;
  hideLoading(): void;
}
```

---

## 6. 样式系统

### 6.1 CSS变量定义

```css
/* app-variables.css */
:root {
  /* 基础尺寸 */
  --app-header-height: 56px;
  --app-tab-height: 44px;
  --app-footer-height: 64px;
  --app-safe-area-top: env(safe-area-inset-top);
  --app-safe-area-bottom: env(safe-area-inset-bottom);
  
  /* 间距 */
  --app-spacing-xs: 4px;
  --app-spacing-sm: 8px;
  --app-spacing-md: 16px;
  --app-spacing-lg: 24px;
  
  /* 圆角 */
  --app-radius-sm: 4px;
  --app-radius-md: 8px;
  --app-radius-lg: 12px;
  
  /* 阴影 */
  --app-shadow-sm: 0 1px 2px rgba(0,0,0,0.1);
  --app-shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --app-shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}

/* APP特定变量通过内联样式注入 */
.app-container {
  --app-primary: #3182CE;
  --app-primary-dark: #2C5282;
  --app-surface: #FFFFFF;
  --app-background: #F7FAFC;
}
```

### 6.2 通用样式类

```css
/* app-base.css */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--app-background);
}

.app-header {
  height: var(--app-header-height);
  background: var(--app-surface);
  border-bottom: 1px solid rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  padding: 0 var(--app-spacing-md);
}

.app-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.app-tab-bar {
  height: var(--app-tab-height);
  background: var(--app-surface);
  display: flex;
  border-bottom: 1px solid rgba(0,0,0,0.1);
}

/* 列表样式 */
.app-list {
  padding: var(--app-spacing-sm);
}

.list-item {
  display: flex;
  align-items: center;
  padding: var(--app-spacing-md);
  background: var(--app-surface);
  border-radius: var(--app-radius-md);
  margin-bottom: var(--app-spacing-sm);
}

.list-item--locked {
  opacity: 0.6;
  background: #F5F5F5;
}

.list-item--unread {
  background: #EBF8FF;
}
```

---

## 7. 性能优化

### 7.1 虚拟滚动

```typescript
// 长列表虚拟滚动
interface VirtualListProps {
  items: any[];
  itemHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  overscan?: number;
}

const VirtualList: React.FC<VirtualListProps> = ({
  items,
  itemHeight,
  renderItem,
  overscan = 5
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 计算可见范围
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;
  
  return (
    <div 
      ref={containerRef}
      className="virtual-list"
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### 7.2 懒加载

```typescript
// APP内容懒加载
const LazyAppContent = lazy(() => import('./AppContent'));

// 图片懒加载
const LazyImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);
  
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
    />
  );
};
```

---

## 8. 文件结构

```
src/
├── mobile/
│   ├── framework/              # 通用框架
│   │   ├── AppContainer.tsx    # APP容器
│   │   ├── AppHeader.tsx       # 顶部导航
│   │   ├── AppTabBar.tsx       # Tab导航
│   │   ├── AppList.tsx         # 列表组件
│   │   ├── AppListItem.tsx     # 列表项
│   │   ├── EmptyState.tsx      # 空状态
│   │   ├── LoadingState.tsx    # 加载状态
│   │   ├── ErrorState.tsx      # 错误状态
│   │   └── LockedState.tsx     # 锁定状态
│   │
│   ├── apps/                   # 各APP实现
│   │   ├── WorkApp/
│   │   │   ├── index.tsx       # APP入口
│   │   │   ├── WorkList.tsx    # 工作列表
│   │   │   ├── WorkDetail.tsx  # 工作详情
│   │   │   └── config.ts       # APP配置
│   │   ├── StudyApp/
│   │   ├── SocialApp/
│   │   └── ...
│   │
│   ├── hooks/
│   │   ├── useAppState.ts      # APP状态管理
│   │   ├── useAppData.ts       # APP数据获取
│   │   └── useVirtualList.ts   # 虚拟滚动
│   │
│   └── styles/
│       ├── app-variables.css   # CSS变量
│       └── app-base.css        # 基础样式
│
└── adapter/
    └── MobileUIAdapter.ts      # 与Core系统对接
```

---

## 9. 使用示例

### 9.1 完整APP实现示例

```tsx
// apps/WorkApp/index.tsx
import { AppContainer, AppList, DefaultListItem } from '../../framework';
import { useAppData, useAppState } from '../../hooks';
import { workAppConfig } from './config';

const WorkApp: React.FC = () => {
  const { state, transition } = useAppState('work');
  const [currentTab, setCurrentTab] = useState('all');
  const { data, loading, error, refresh } = useAppData('work', currentTab);
  
  // 渲染工作项
  const renderWorkItem = (item: WorkItem) => {
    const listItem: AppListItemProps = {
      id: item.id,
      type: 'job',
      title: item.name,
      subtitle: `${item.wageType} | ${item.distance}`,
      description: item.description,
      icon: item.icon,
      metadata: {
        price: { amount: item.wage, currency: 'USD', unit: `/${item.wagePeriod}` },
        badges: item.requirements.map(r => ({ text: r.name, type: 'default' })),
        status: item.available ? 'available' : 'locked'
      },
      primaryAction: {
        label: '报名',
        onClick: () => handleApply(item)
      },
      onClick: () => transition(AppScreenState.DETAIL, item)
    };
    
    return <DefaultListItem item={listItem} />;
  };
  
  return (
    <AppContainer
      config={workAppConfig}
      currentView={currentTab}
      onViewChange={setCurrentTab}
    >
      <AppList
        items={data}
        renderItem={renderWorkItem}
        loading={loading}
        error={error}
        onRefresh={refresh}
        emptyState={workAppConfig.states.empty}
      />
    </AppContainer>
  );
};

export default WorkApp;
```

---

## 10. 相关文档

- [MobileUIArchitecture.md](./MobileUIArchitecture.md) - 手机界面总体架构
- [NotificationSystem.md](./NotificationSystem.md) - 通知系统详细设计
- [Scene2Restrictions.md](./Scene2Restrictions.md) - 场景2限制机制
