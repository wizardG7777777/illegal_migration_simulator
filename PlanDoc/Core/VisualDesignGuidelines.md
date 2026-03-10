# 视觉设计规范

本文档定义《去美国》手机界面的视觉设计规范，包含色彩系统、字体规范、图标设计、动画效果等。

---

## 1. 设计理念

### 1.1 整体风格

**核心关键词**：压抑、真实、沉浸

- **压抑**：通过暗色调和有限的色彩传递游戏的高压氛围
- **真实**：模拟真实手机界面，增强代入感
- **沉浸**：界面元素与游戏机制深度融合（电量=健康+心理）

### 1.2 设计参考

- **《Papers, Please》**：极简信息密度，bureaucratic压抑感
- **《Reigns》**：卡片式决策，简洁手势操作
- **《Orwell》**：监控视角，冷峻色调
- **真实手机UI**：iOS/Android的熟悉感降低学习成本

---

## 2. 色彩系统

### 2.1 场景主题色

```typescript
const themes = {
  // 场景1：国内准备 - 雾霾灰蓝
  act1: {
    primary: '#4A5568',         // 主色：灰蓝
    secondary: '#718096',       // 辅助色：浅灰蓝
    accent: '#D69E2E',          // 强调色：雾霾黄
    background: '#1A202C',      // 背景：深色
    surface: '#2D3748',         // 卡片背景
    text: '#E2E8F0',            // 主文字
    textMuted: '#A0AEC0',       // 次要文字
    danger: '#E53E3E',          // 危险/警告
    success: '#38A169',         // 成功
  },
  
  // 场景2：跨境穿越 - 雨林墨绿
  act2: {
    primary: '#276749',         // 主色：墨绿
    secondary: '#2F855A',       // 辅助色：浅绿
    accent: '#9B2C2C',          // 强调色：血迹红
    background: '#1C4532',      // 背景：深绿
    surface: '#22543D',         // 卡片背景
    text: '#F0FFF4',            // 主文字
    textMuted: '#9AE6B4',       // 次要文字
    danger: '#C53030',
    success: '#48BB78',
  },
  
  // 场景3：美国生存 - 霓虹水泥
  act3: {
    primary: '#2B6CB0',         // 主色：霓虹蓝
    secondary: '#4A5568',       // 辅助色：水泥灰
    accent: '#C53030',          // 强调色：警灯红
    background: '#171923',      // 背景：近黑
    surface: '#2D3748',         // 卡片背景
    text: '#E2E8F0',
    textMuted: '#A0AEC0',
    danger: '#E53E3E',
    success: '#38A169',
  }
};
```

### 2.2 功能色

| 用途 | 颜色 | 色值 | 使用场景 |
|-----|------|------|---------|
| **成功/正面** | 🟢 绿色 | #38A169 | 收入增加、操作成功、健康恢复 |
| **警告/注意** | 🟡 黄色 | #D69E2E | 资源偏低、警告提示 |
| **危险/负面** | 🔴 红色 | #E53E3E | 健康下降、危险事件、违约 |
| **信息/中性** | 🔵 蓝色 | #3182CE | 提示信息、可交互元素 |
| **禁用/锁定** | ⚫ 灰色 | #718096 | 锁定APP、不可用选项 |

### 2.3 APP专属色

每个APP有专属的主题色，用于图标和界面强调：

| APP | 主色 | 色值 | 辅助色 |
|-----|------|------|--------|
| 💼 赚钱 | 绿色 | #38A169 | #2F855A |
| 📚 学习 | 蓝色 | #3182CE | #2C5282 |
| 🗺️ 出行 | 青色 | #319795 | #2C7A7B |
| 💬 社交 | 橙色 | #DD6B20 | #C05621 |
| 🛒 购物 | 粉色 | #D53F8C | #B83280 |
| 🏠 住宿 | 紫色 | #805AD5 | #6B46C1 |
| 💊 健康 | 红色 | #E53E3E | #C53030 |
| 📰 新闻 | 靛蓝 | #5A67D8 | #4C51BF |
| 💳 金融 | 金色 | #D69E2E | #B7791F |
| 💸 借钱 | 深红 | #9B2C2C | #742A2A |
| 🌐 浏览器 | 天蓝 | #4299E1 | #3182CE |
| ⚙️ 设置 | 灰色 | #718096 | #4A5568 |

---

## 3. 字体规范

### 3.1 字体选择

```css
/* 中文字体 */
--font-title: 'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif;
--font-body: 'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;

/* 英文字体（数字/货币） */
--font-number: 'SF Pro Display', 'Roboto', 'Helvetica Neue', sans-serif;
```

### 3.2 字号规范

| 用途 | 字号 | 行高 | 字重 | 说明 |
|-----|------|------|------|------|
| **系统时间** | 72px | 1 | 200 | 锁屏时间显示 |
| **大标题** | 24px | 1.3 | 600 | APP名称、章节标题 |
| **小标题** | 18px | 1.4 | 600 | 卡片标题、列表标题 |
| **正文** | 16px | 1.6 | 400 | 描述文本、叙事文本 |
| **辅助文字** | 14px | 1.5 | 400 | 标签、说明文字 |
| **小字/标注** | 12px | 1.4 | 400 | 时间、角标、提示 |
| **数字/货币** | 20px | 1 | 500 | 金额、数值（等宽） |

### 3.3 文字样式

```css
/* 标题样式 */
.text-title {
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

/* 正文样式 */
.text-body {
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.6;
  color: var(--text);
}

/* 叙事文本（主界面） */
.text-narrative {
  font-family: var(--font-title);
  font-size: 16px;
  line-height: 1.8;
  color: var(--text);
  text-align: justify;
}

/* 数字/货币 */
.text-number {
  font-family: var(--font-number);
  font-feature-settings: 'tnum';  /* 等宽数字 */
  font-variant-numeric: tabular-nums;
}

/* 弱化文字 */
.text-muted {
  color: var(--text-muted);
}

/* 危险/警告文字 */
.text-danger {
  color: var(--danger);
}
```

---

## 4. 图标设计

### 4.1 图标风格

- **主图标**：Emoji（原生系统支持，跨平台一致）
- **备用图标**：SVG图标（Emoji不可用时降级）
- **图标尺寸**：24px（标准）、20px（小）、32px（大）

### 4.2 APP图标设计

```css
.app-icon {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  position: relative;
  
  /* 渐变背景 */
  background: linear-gradient(
    135deg,
    var(--app-primary) 0%,
    var(--app-secondary) 100%
  );
  
  /* 阴影 */
  box-shadow: 
    0 2px 4px rgba(0,0,0,0.1),
    0 4px 8px rgba(0,0,0,0.1);
  
  /* 锁定状态 */
  &.locked {
    opacity: 0.5;
    filter: grayscale(100%);
  }
  
  /* 角标 */
  .badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: #E53E3E;
    border-radius: 10px;
    font-size: 12px;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
```

### 4.3 系统图标

| 图标 | 用途 | 替代文字 |
|-----|------|---------|
| 🔋 | 电量 | 电量 |
| 📶 | 信号 | 信号 |
| 📡 | 搜索信号 | 搜索中 |
| 🚫 | 无服务 | 无服务 |
| ⏱️ | 倒计时 | 剩余 |
| ✉️ | 通知 | 通知 |
| 🔒 | 锁定 | 锁定 |
| ⚠️ | 警告 | 警告 |
| ✅ | 完成 | 完成 |
| ❌ | 失败 | 失败 |

---

## 5. 布局规范

### 5.1 屏幕尺寸

```typescript
// 设计基准尺寸（iPhone标准）
const designSize = {
  width: 375,   // 逻辑像素
  height: 812,  // iPhone X 尺寸
};

// 安全区域
const safeArea = {
  top: 44,      // 状态栏 + 刘海
  bottom: 34,   // 底部安全区
  left: 0,
  right: 0,
};
```

### 5.2 间距规范

```css
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
}
```

### 5.3 圆角规范

| 元素 | 圆角 |
|-----|------|
| APP图标 | 14px |
| 卡片 | 12px |
| 按钮 | 8px |
| 输入框 | 6px |
| 小标签 | 4px |
| 全屏弹窗 | 16px (顶部) |

---

## 6. 动画效果

### 6.1 动画原则

- **目的性**：每个动画都有明确目的，不炫技
- **克制性**：动画时长控制在300ms以内
- **一致性**：同类动画使用相同参数

### 6.2 动画时长

| 动画类型 | 时长 | 缓动函数 |
|---------|------|---------|
| **页面切换** | 300ms | ease-in-out |
| **弹窗出现** | 200ms | ease-out |
| **弹窗消失** | 150ms | ease-in |
| **列表项出现** | 150ms | ease-out (stagger 50ms) |
| **按钮按下** | 100ms | ease-in-out |
| **状态变化** | 300ms | ease-in-out |
| **脉冲/警告** | 1000ms | ease-in-out (infinite) |

### 6.3 关键动画

**APP打开动画**：
```css
@keyframes app-launch {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.app-container {
  animation: app-launch 0.3s ease-out;
}
```

**通知滑入动画**：
```css
@keyframes notification-slide-in {
  0% {
    transform: translateY(-100%);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

.notification {
  animation: notification-slide-in 0.4s ease-out;
}
```

**角标弹跳动画**：
```css
@keyframes badge-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.badge.new {
  animation: badge-bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

**终结态脉冲动画**：
```css
@keyframes terminal-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(229, 62, 62, 0.4);
  }
  50% {
    box-shadow: 0 0 0 20px rgba(229, 62, 62, 0);
  }
}

.terminal-warning {
  animation: terminal-pulse 1s ease-in-out infinite;
}
```

**列表项进入（交错动画）**：
```css
@keyframes list-item-enter {
  0% {
    transform: translateX(-20px);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

.list-item {
  animation: list-item-enter 0.15s ease-out;
  animation-fill-mode: both;
}

/* 交错延迟 */
.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 50ms; }
.list-item:nth-child(3) { animation-delay: 100ms; }
/* ... */
```

---

## 7. 组件样式

### 7.1 按钮

```css
/* 主按钮 */
.btn-primary {
  background: var(--app-primary);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  border: none;
  transition: transform 0.1s, opacity 0.2s;
  
  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }
  
  &:disabled {
    background: var(--text-muted);
    opacity: 0.5;
  }
}

/* 次按钮 */
.btn-secondary {
  background: transparent;
  color: var(--app-primary);
  border: 1px solid var(--app-primary);
  /* ... */
}

/* 危险按钮 */
.btn-danger {
  background: var(--danger);
  color: white;
  /* ... */
}
```

### 7.2 卡片

```css
.card {
  background: var(--surface);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  
  /* 点击态 */
  &.clickable {
    cursor: pointer;
    transition: background 0.2s;
    
    &:active {
      background: rgba(255,255,255,0.05);
    }
  }
  
  /* 选中态 */
  &.selected {
    border: 2px solid var(--app-primary);
  }
  
  /* 禁用态 */
  &.disabled {
    opacity: 0.5;
  }
}
```

### 7.3 进度条

```css
.progress-bar {
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--app-primary), var(--app-secondary));
    border-radius: 4px;
    transition: width 0.6s ease-out;
  }
  
  /* 不同状态 */
  &.danger .progress-fill {
    background: var(--danger);
  }
  
  &.warning .progress-fill {
    background: var(--warning);
  }
}
```

### 7.4 标签/徽章

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  
  &.default {
    background: rgba(255,255,255,0.1);
    color: var(--text-muted);
  }
  
  &.primary {
    background: var(--app-primary);
    color: white;
  }
  
  &.danger {
    background: rgba(229, 62, 62, 0.2);
    color: var(--danger);
  }
  
  &.warning {
    background: rgba(214, 158, 46, 0.2);
    color: var(--warning);
  }
}
```

---

## 8. 响应式适配

### 8.1 断点设计

```typescript
const breakpoints = {
  mobile: 375,      // 标准手机
  mobileL: 414,     // 大屏手机
  tablet: 768,      // 平板
  desktop: 1024,    // 桌面
};
```

### 8.2 适配规则

- **移动端优先**：设计以375px为基准
- **平板适配**：增加边距，列表可能改为网格
- **桌面端**：居中的手机模拟器显示

---

## 9. 无障碍设计

### 9.1 对比度

- 文字与背景对比度 ≥ 4.5:1
- 大文字（18px+）对比度 ≥ 3:1
- 交互元素对比度 ≥ 3:1

### 9.2 动画减少

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 9.3 触摸目标

- 最小触摸目标：44px × 44px
- 按钮间距：8px

---

## 10. 设计资源

### 10.1 CSS变量完整定义

```css
:root {
  /* 场景色（动态切换） */
  --scene-primary: #4A5568;
  --scene-secondary: #718096;
  --scene-accent: #D69E2E;
  --scene-bg: #1A202C;
  --scene-surface: #2D3748;
  
  /* 功能色 */
  --danger: #E53E3E;
  --warning: #D69E2E;
  --success: #38A169;
  --info: #3182CE;
  
  /* 文字色 */
  --text: #E2E8F0;
  --text-muted: #A0AEC0;
  --text-disabled: #718096;
  
  /* 间距 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  
  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  
  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  
  /* 动画 */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --easing-default: ease-in-out;
  --easing-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

---

## 11. 相关文档

- [MobileUIArchitecture.md](./MobileUIArchitecture.md) - 手机界面架构
- [AppFrameworkArchitecture.md](./AppFrameworkArchitecture.md) - APP框架
- [UISystemArchitecture.md](./UISystemArchitecture.md) - UI系统
