# 状态转换动画规范

本文档定义《去美国》游戏的动画效果规范，包括数值变化、场景切换、状态转换等动画的详细参数。

**设计原则**：
- 动画服务于反馈，不干扰操作
- 时长控制在300-800ms之间
- 使用CSS动画优先，复杂动画使用Web Animations API
- 支持"减少动画"无障碍选项

---

## 1. 动画参数总表

| 动画类型 | 时长 | 缓动函数 | 触发条件 |
|---------|------|---------|---------|
| 数值变化闪烁 | 300ms | ease-out | 数值增减时 |
| 进度条过渡 | 500ms | ease-out | 健康/心理变化 |
| 图标弹跳 | 600ms | elastic | Debuff获得/消失 |
| 场景切换淡出 | 300ms | ease-out | 场景切换开始 |
| 场景切换淡入 | 400ms | ease-out | 场景切换结束 |
| 弹窗出现 | 300ms | spring | 弹窗打开 |
| 弹窗消失 | 200ms | ease-in | 弹窗关闭 |
| 打字机效果 | 30ms/字 | linear | 叙事文本显示 |
| 按钮点击 | 100ms | ease-out | 按钮按下 |
| 卡片滑动 | 250ms | ease-out | 手势滑动 |
| 刷新旋转 | 1000ms | linear | 下拉刷新 |
| 警告闪烁 | 800ms | ease-in-out | 终结态警告 |

---

## 2. 数值变化动画

### 2.1 数值闪烁效果

```css
/* 增加时 - 绿色闪烁 */
@keyframes value-increase {
  0% { 
    color: inherit;
    transform: scale(1);
    text-shadow: none;
  }
  50% { 
    color: #38A169;
    transform: scale(1.2);
    text-shadow: 0 0 10px rgba(56, 161, 105, 0.5);
  }
  100% { 
    color: inherit;
    transform: scale(1);
    text-shadow: none;
  }
}

/* 减少时 - 红色闪烁 */
@keyframes value-decrease {
  0% { 
    color: inherit;
    transform: scale(1);
  }
  50% { 
    color: #E53E3E;
    transform: scale(0.9);
    text-shadow: 0 0 10px rgba(229, 62, 62, 0.5);
  }
  100% { 
    color: inherit;
    transform: scale(1);
  }
}

.value-change-increase {
  animation: value-increase 300ms ease-out;
}

.value-change-decrease {
  animation: value-decrease 300ms ease-out;
}
```

### 2.2 进度条过渡

```css
.progress-bar-fill {
  transition: width 500ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 健康度变化时 */
.health-bar .progress-bar-fill {
  background: linear-gradient(90deg, #E53E3E, #38A169);
}

/* 心理度变化时 */
.mental-bar .progress-bar-fill {
  background: linear-gradient(90deg, #805AD5, #3182CE);
}
```

### 2.3 Debuff图标弹跳

```css
@keyframes debuff-bounce {
  0% { 
    transform: scale(0) rotate(0deg);
    opacity: 0;
  }
  50% { 
    transform: scale(1.2) rotate(10deg);
    opacity: 1;
  }
  70% {
    transform: scale(0.9) rotate(-5deg);
  }
  100% { 
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.debuff-icon-enter {
  animation: debuff-bounce 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes debuff-shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
  20%, 40%, 60%, 80% { transform: translateX(3px); }
}

.debuff-icon-warning {
  animation: debuff-shake 800ms ease-in-out infinite;
}
```

---

## 3. 场景切换动画

### 3.1 场景切换三阶段

```css
/* 阶段1: 当前场景淡出 */
@keyframes scene-fade-out {
  from { 
    opacity: 1; 
    transform: scale(1);
    filter: brightness(1);
  }
  to { 
    opacity: 0; 
    transform: scale(0.95);
    filter: brightness(0.3);
  }
}

.scene-exit {
  animation: scene-fade-out 300ms ease-out forwards;
}

/* 阶段2: 过渡画面（场景名称展示） */
@keyframes scene-title-display {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  30% {
    opacity: 1;
    transform: translateY(0);
  }
  70% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-20px);
  }
}

.scene-title {
  animation: scene-title-display 1500ms ease-in-out forwards;
}

/* 阶段3: 新场景淡入 */
@keyframes scene-fade-in {
  from { 
    opacity: 0; 
    transform: scale(1.05);
    filter: brightness(1.2);
  }
  to { 
    opacity: 1; 
    transform: scale(1);
    filter: brightness(1);
  }
}

.scene-enter {
  animation: scene-fade-in 400ms ease-out forwards;
}
```

### 3.2 场景特色过渡效果

#### 场景1→2（国内→跨境）

```
特效：火车/飞机行驶感
- 背景：横向移动的地图/云层
- 音效：火车轰鸣/飞机引擎
- 时长：2000ms
```

```css
@keyframes crossing-transition-act1-to-act2 {
  0% {
    background-position: 0% center;
    filter: brightness(0.5);
  }
  100% {
    background-position: 100% center;
    filter: brightness(1);
  }
}

.scene-transition-act1-to-act2 {
  background: url('assets/train-journey.svg') repeat-x center;
  background-size: auto 100%;
  animation: crossing-transition-act1-to-act2 2000ms linear forwards;
}
```

#### 场景2→3（跨境→美国）

```
特效：穿越边境墙
- 背景：边境墙剪影 + 手电筒光束
- 音效：心跳声 + 远处警笛
- 时长：2500ms
```

```css
@keyframes crossing-transition-act2-to-act3 {
  0% {
    clip-path: inset(0 100% 0 0);
    filter: brightness(0);
  }
  50% {
    clip-path: inset(0 50% 0 0);
    filter: brightness(0.3);
  }
  100% {
    clip-path: inset(0 0 0 0);
    filter: brightness(1);
  }
}

.scene-transition-act2-to-act3 {
  position: relative;
  animation: crossing-transition-act2-to-act3 2500ms ease-in-out forwards;
}

/* 手电筒光束效果 */
.flashlight-beam {
  position: absolute;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(255,255,200,0.8) 0%, transparent 70%);
  animation: flashlight-sweep 2500ms ease-in-out forwards;
}

@keyframes flashlight-sweep {
  0% { left: -10%; top: 50%; opacity: 0; }
  20% { opacity: 1; }
  80% { left: 110%; top: 30%; opacity: 1; }
  100% { opacity: 0; }
}
```

---

## 4. 弹窗动画

### 4.1 弹窗出现（Spring效果）

```css
@keyframes modal-enter {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  60% {
    transform: scale(1.05) translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-enter {
  animation: modal-enter 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### 4.2 弹窗消失

```css
@keyframes modal-exit {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}

.modal-exit {
  animation: modal-exit 200ms ease-in forwards;
}
```

### 4.3 背景遮罩

```css
.modal-backdrop {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  transition: opacity 300ms ease-out;
}
```

---

## 5. 叙事文本动画

### 5.1 打字机效果

```typescript
// TypeScript实现
class TypewriterEffect {
  private speed: number = 30; // ms/字
  private container: HTMLElement;
  private text: string;
  private currentIndex: number = 0;
  private isTyping: boolean = false;
  private onComplete?: () => void;
  
  constructor(
    container: HTMLElement, 
    text: string, 
    options?: { 
      speed?: number;
      onComplete?: () => void;
    }
  ) {
    this.container = container;
    this.text = text;
    this.speed = options?.speed ?? 30;
    this.onComplete = options?.onComplete;
  }
  
  async start(): Promise<void> {
    if (this.isTyping) return;
    this.isTyping = true;
    this.container.textContent = '';
    this.container.classList.add('typewriter-cursor');
    
    return new Promise((resolve) => {
      const type = () => {
        if (this.currentIndex < this.text.length) {
          this.container.textContent += this.text[this.currentIndex];
          this.currentIndex++;
          setTimeout(type, this.speed);
        } else {
          this.isTyping = false;
          this.container.classList.remove('typewriter-cursor');
          this.onComplete?.();
          resolve();
        }
      };
      type();
    });
  }
  
  skip(): void {
    if (!this.isTyping) return;
    this.currentIndex = this.text.length;
    this.container.textContent = this.text;
    this.container.classList.remove('typewriter-cursor');
    this.isTyping = false;
    this.onComplete?.();
  }
  
  isActive(): boolean {
    return this.isTyping;
  }
}

// 使用示例
const narrativeElement = document.getElementById('narrative-text');
const typewriter = new TypewriterEffect(
  narrativeElement, 
  '你站在边境墙下，心跳声震耳欲聋...',
  { speed: 40 }
);
typewriter.start();

// 玩家点击跳过
document.addEventListener('click', () => {
  if (typewriter.isActive()) {
    typewriter.skip();
  }
});
```

### 5.2 光标闪烁

```css
@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.typewriter-cursor::after {
  content: '|';
  animation: cursor-blink 1s infinite;
  color: var(--accent-color, #3182CE);
}
```

### 5.3 段落淡入效果

```css
@keyframes paragraph-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.narrative-paragraph {
  animation: paragraph-fade-in 400ms ease-out;
  animation-fill-mode: both;
}

.narrative-paragraph:nth-child(1) { animation-delay: 0ms; }
.narrative-paragraph:nth-child(2) { animation-delay: 100ms; }
.narrative-paragraph:nth-child(3) { animation-delay: 200ms; }
```

---

## 6. 终结态警告动画

### 6.1 濒死状态 - 红色脉冲

```css
@keyframes dying-pulse {
  0%, 100% {
    box-shadow: inset 0 0 0 0 rgba(229, 62, 62, 0);
  }
  50% {
    box-shadow: inset 0 0 50px 20px rgba(229, 62, 62, 0.3);
  }
}

.dying-warning {
  animation: dying-pulse 800ms ease-in-out infinite;
}

/* 心跳图标加速 */
@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.1); }
  50% { transform: scale(1); }
  75% { transform: scale(1.1); }
}

.heartbeat-icon {
  animation: heartbeat calc(60s / var(--heart-rate, 60)) infinite;
}

/* 屏幕边缘泛红 */
@keyframes dying-screen-edge {
  0%, 100% {
    border: 0 solid transparent;
  }
  50% {
    border: 4px solid rgba(229, 62, 62, 0.5);
  }
}

.dying-screen-border {
  animation: dying-screen-edge 800ms ease-in-out infinite;
}
```

### 6.2 崩溃状态 - 黑色遮罩收缩

```css
@keyframes breakdown-veil {
  from {
    clip-path: circle(100% at center);
    background: rgba(0, 0, 0, 0);
  }
  to {
    clip-path: circle(20% at center);
    background: rgba(0, 0, 0, 0.7);
  }
}

.breakdown-warning {
  animation: breakdown-veil var(--window-turns, 3s) ease-in forwards;
}

/* 视野收缩时的文字扭曲效果 */
@keyframes text-glitch {
  0%, 100% { 
    transform: translate(0);
    filter: none;
  }
  20% { 
    transform: translate(-2px, 2px);
    filter: hue-rotate(90deg);
  }
  40% { 
    transform: translate(2px, -2px);
    filter: hue-rotate(-90deg);
  }
  60% { 
    transform: translate(-2px, -2px);
    filter: hue-rotate(180deg);
  }
  80% { 
    transform: translate(2px, 2px);
    filter: hue-rotate(-180deg);
  }
}

.breakdown-text {
  animation: text-glitch 200ms ease-in-out infinite;
}
```

### 6.3 匮乏状态 - 灰色闪烁

```css
@keyframes destitution-gray {
  0%, 100% {
    filter: grayscale(0%) brightness(1);
  }
  50% {
    filter: grayscale(100%) brightness(0.7);
  }
}

.destitution-warning {
  animation: destitution-gray 1500ms ease-in-out infinite;
}
```

---

## 7. 按钮交互动画

### 7.1 点击反馈

```css
.button {
  transition: transform 100ms ease-out, background-color 150ms ease, box-shadow 200ms ease;
}

.button:active {
  transform: scale(0.95);
}

.button:disabled {
  transform: scale(1);
  opacity: 0.5;
  cursor: not-allowed;
}

/* 涟漪效果 */
@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

.button-ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transform: scale(0);
  animation: ripple 600ms linear;
  pointer-events: none;
}
```

### 7.2 悬停效果

```css
.button-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.button-hover:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* 行动点按钮 - 可用状态高亮 */
.button-action-available {
  animation: action-glow 1500ms ease-in-out infinite;
}

@keyframes action-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(66, 153, 225, 0.4);
  }
  50% {
    box-shadow: 0 0 20px 5px rgba(66, 153, 225, 0.2);
  }
}
```

---

## 8. 列表项动画

### 8.1 事件卡片进入

```css
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.event-card {
  animation: card-enter 300ms ease-out;
  animation-fill-mode: both;
}

/* 错开动画（Stagger） */
.event-card:nth-child(1) { animation-delay: 0ms; }
.event-card:nth-child(2) { animation-delay: 50ms; }
.event-card:nth-child(3) { animation-delay: 100ms; }
.event-card:nth-child(4) { animation-delay: 150ms; }
.event-card:nth-child(5) { animation-delay: 200ms; }
/* 依此类推 */

/* 或使用通用CSS变量 */
.event-card {
  animation-delay: calc(var(--card-index, 0) * 50ms);
}
```

### 8.2 卡片滑动（手势）

```css
.event-card {
  transition: transform 250ms ease-out, opacity 200ms ease;
}

.event-card.swiping-left {
  transform: translateX(-80px);
  opacity: 0.5;
}

.event-card.swiping-right {
  transform: translateX(80px);
  opacity: 0.5;
}

.event-card.discarded {
  transform: translateX(-100%);
  opacity: 0;
}
```

### 8.3 道具网格动画

```css
@keyframes item-grid-enter {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.item-grid-cell {
  animation: item-grid-enter 300ms ease-out;
  animation-fill-mode: both;
  animation-delay: calc(var(--grid-index, 0) * 30ms);
}
```

---

## 9. 减少动画选项

### 9.1 无障碍支持

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  /* 保留必要的功能动画 */
  .typewriter-cursor::after {
    animation-duration: 1s !important;
  }
  
  /* 保留终结态警告的可见性 */
  .dying-warning,
  .breakdown-warning,
  .destitution-warning {
    animation-duration: 0ms !important;
    border: 2px solid;
  }
  
  .dying-warning {
    border-color: #E53E3E;
    box-shadow: inset 0 0 30px 10px rgba(229, 62, 62, 0.3);
  }
  
  .breakdown-warning {
    border-color: #805AD5;
    background: rgba(0, 0, 0, 0.7);
    clip-path: circle(30% at center);
  }
  
  .destitution-warning {
    border-color: #718096;
    filter: grayscale(100%) brightness(0.8);
  }
}
```

### 9.2 用户设置覆盖

```typescript
class AnimationSettings {
  private static STORAGE_KEY = 'animation-settings';
  private reducedMotion: boolean = false;
  
  constructor() {
    this.loadSettings();
    this.setupMediaQueryListener();
  }
  
  private loadSettings(): void {
    const stored = localStorage.getItem(AnimationSettings.STORAGE_KEY);
    if (stored) {
      this.reducedMotion = JSON.parse(stored).reducedMotion;
    } else {
      // 检测系统偏好
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    this.applySettings();
  }
  
  private setupMediaQueryListener(): void {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', (e) => {
      if (!localStorage.getItem(AnimationSettings.STORAGE_KEY)) {
        this.reducedMotion = e.matches;
        this.applySettings();
      }
    });
  }
  
  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
    localStorage.setItem(AnimationSettings.STORAGE_KEY, JSON.stringify({
      reducedMotion: value
    }));
    this.applySettings();
  }
  
  private applySettings(): void {
    document.documentElement.classList.toggle('reduce-motion', this.reducedMotion);
  }
  
  isReducedMotion(): boolean {
    return this.reducedMotion;
  }
}

// 全局实例
export const animationSettings = new AnimationSettings();
```

---

## 10. 性能优化

### 10.1 GPU加速

```css
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* 动画结束后移除 */
.animation-complete {
  will-change: auto;
}
```

### 10.2 节流控制

```typescript
// 同时只能有一个动画在进行
class AnimationManager {
  private isAnimating: boolean = false;
  private animationQueue: (() => Promise<void>)[] = [];
  
  async play(animation: () => Promise<void>): Promise<void> {
    if (this.isAnimating) {
      // 将动画加入队列
      this.animationQueue.push(animation);
      return;
    }
    
    this.isAnimating = true;
    await animation();
    this.isAnimating = false;
    
    // 处理队列中的下一个动画
    if (this.animationQueue.length > 0) {
      const next = this.animationQueue.shift();
      if (next) {
        this.play(next);
      }
    }
  }
  
  // 立即执行，跳过队列
  async playImmediate(animation: () => Promise<void>): Promise<void> {
    await animation();
  }
  
  clearQueue(): void {
    this.animationQueue = [];
  }
}

export const animationManager = new AnimationManager();
```

### 10.3 动画帧优化

```typescript
class SmoothNumberAnimation {
  private rafId: number | null = null;
  
  animate(
    element: HTMLElement,
    fromValue: number,
    toValue: number,
    duration: number = 500,
    formatter?: (value: number) => string
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      const step = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用 ease-out 缓动
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = fromValue + (toValue - fromValue) * eased;
        
        element.textContent = formatter 
          ? formatter(currentValue) 
          : Math.round(currentValue).toString();
        
        if (progress < 1) {
          this.rafId = requestAnimationFrame(step);
        } else {
          this.rafId = null;
          resolve();
        }
      };
      
      this.rafId = requestAnimationFrame(step);
    });
  }
  
  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

export const numberAnimator = new SmoothNumberAnimation();
```

### 10.4 虚拟滚动优化

```typescript
// 用于长列表的性能优化
class VirtualScroller {
  private container: HTMLElement;
  private itemHeight: number;
  private bufferSize: number = 3;
  
  constructor(container: HTMLElement, itemHeight: number) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.setupScrollListener();
  }
  
  private setupScrollListener(): void {
    let ticking = false;
    
    this.container.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          this.updateVisibleItems();
          ticking = false;
        });
        ticking = true;
      }
    });
  }
  
  private updateVisibleItems(): void {
    const scrollTop = this.container.scrollTop;
    const viewportHeight = this.container.clientHeight;
    
    const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.bufferSize);
    const endIndex = Math.min(
      this.getTotalItems() - 1,
      Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + this.bufferSize
    );
    
    // 只渲染可见范围内的项目
    this.renderItems(startIndex, endIndex);
  }
  
  private renderItems(start: number, end: number): void {
    // 实现渲染逻辑
  }
  
  private getTotalItems(): number {
    // 返回总项目数
    return 0;
  }
}
```

---

## 11. 场景特定动画

### 11.1 场景1：国内准备

```css
/* 打工按钮 - 疲惫效果 */
@keyframes work-fatigue {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(1px); }
  75% { transform: translateY(-1px); }
}

.work-button-exhausted {
  animation: work-fatigue 300ms ease-in-out;
}

/* 人民币到美元兑换动画 */
@keyframes currency-exchange {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateY(-20px) scale(0.8);
    opacity: 0.5;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.currency-exchange-anim {
  animation: currency-exchange 600ms ease-in-out;
}
```

### 11.2 场景2：跨境穿越

```css
/* 环境恶化效果 - 沙尘暴 */
@keyframes sandstorm-overlay {
  0%, 100% {
    background: linear-gradient(90deg, transparent 0%, rgba(194, 178, 128, 0.1) 50%, transparent 100%);
    background-position: -100% center;
  }
  50% {
    background: linear-gradient(90deg, transparent 0%, rgba(194, 178, 128, 0.3) 50%, transparent 100%);
    background-position: 100% center;
  }
}

.sandstorm-effect {
  animation: sandstorm-overlay 3000ms ease-in-out infinite;
}

/* 夜间行军 - 手电筒效果 */
@keyframes flashlight-flicker {
  0%, 100% { opacity: 1; }
  10% { opacity: 0.8; }
  20% { opacity: 1; }
  30% { opacity: 0.9; }
  40% { opacity: 1; }
}

.flashlight-beam-flicker {
  animation: flashlight-flicker 2000ms ease-in-out infinite;
}

/* 迷路时的方向指示器抖动 */
@keyframes compass-spin {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(15deg); }
  50% { transform: rotate(-10deg); }
  75% { transform: rotate(5deg); }
  100% { transform: rotate(0deg); }
}

.companion-lost .compass-icon {
  animation: compass-spin 800ms ease-in-out infinite;
}
```

### 11.3 场景3：美国生存

```css
/* 大通胀时代 - 价格闪烁上涨 */
@keyframes price-surge {
  0% { color: inherit; }
  50% { color: #E53E3E; transform: scale(1.1); }
  100% { color: inherit; }
}

.inflation-price-warning {
  animation: price-surge 600ms ease-in-out;
}

/* 执法压力 - 警灯闪烁 */
@keyframes police-lights {
  0%, 100% {
    box-shadow: inset 0 0 30px rgba(255, 0, 0, 0.3);
  }
  50% {
    box-shadow: inset 0 0 30px rgba(0, 0, 255, 0.3);
  }
}

.pressure-level-high {
  animation: police-lights 1000ms ease-in-out infinite;
}

/* 账单扣除 - 扣款效果 */
@keyframes bill-deduct {
  0% {
    transform: translateX(0);
    opacity: 1;
  }
  50% {
    transform: translateX(-20px);
    opacity: 0.5;
    color: #E53E3E;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

.bill-deduction-anim {
  animation: bill-deduct 400ms ease-out;
}

/* 庇护申请进度 */
@keyframes asylum-progress {
  0% { width: var(--progress-from, 0%); }
  100% { width: var(--progress-to, 100%); }
}

.asylum-progress-bar {
  animation: asylum-progress 1000ms ease-out forwards;
}
```

---

## 12. 交互反馈动画

### 12.1 拖拽交互

```css
.draggable-item {
  cursor: grab;
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.draggable-item:active {
  cursor: grabbing;
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.draggable-item.dragging {
  opacity: 0.8;
  z-index: 1000;
}

/* 放置区域高亮 */
.drop-zone {
  transition: background-color 200ms ease, border-color 200ms ease;
}

.drop-zone.drag-over {
  background-color: rgba(66, 153, 225, 0.1);
  border-color: #4299E1;
  border-style: dashed;
}
```

### 12.2 选择反馈

```css
/* 选项选中效果 */
@keyframes option-select {
  0% {
    transform: scale(1);
    border-color: transparent;
  }
  50% {
    transform: scale(1.02);
    border-color: #4299E1;
  }
  100% {
    transform: scale(1);
    border-color: #4299E1;
  }
}

.option-selected {
  animation: option-select 300ms ease-out forwards;
}

/* 结果揭示 */
@keyframes result-reveal {
  from {
    opacity: 0;
    transform: translateY(10px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

.result-display {
  animation: result-reveal 400ms ease-out;
}
```

### 12.3 通知提示

```css
@keyframes notification-slide-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes notification-slide-out {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

.notification-enter {
  animation: notification-slide-in 300ms ease-out;
}

.notification-exit {
  animation: notification-slide-out 200ms ease-in forwards;
}

/* 成功/失败颜色 */
.notification-success {
  border-left: 4px solid #38A169;
}

.notification-error {
  border-left: 4px solid #E53E3E;
}

.notification-warning {
  border-left: 4px solid #D69E2E;
}
```

---

## 13. 状态保存与恢复

```typescript
interface AnimationState {
  scene: string;
  pendingAnimations: string[];
  typewriterProgress?: number;
}

class AnimationStateManager {
  saveState(): AnimationState {
    return {
      scene: document.body.dataset.currentScene || '',
      pendingAnimations: this.getPendingAnimations(),
      typewriterProgress: this.getTypewriterProgress()
    };
  }
  
  restoreState(state: AnimationState): void {
    // 恢复场景
    if (state.scene) {
      document.body.dataset.currentScene = state.scene;
    }
    
    // 恢复打字机进度
    if (state.typewriterProgress !== undefined) {
      // 触发打字机恢复
    }
  }
  
  private getPendingAnimations(): string[] {
    return Array.from(document.querySelectorAll('.animating'))
      .map(el => el.id)
      .filter(Boolean);
  }
  
  private getTypewriterProgress(): number | undefined {
    const typewriterEl = document.querySelector('.typewriter-active');
    return typewriterEl ? 
      parseInt(typewriterEl.getAttribute('data-progress') || '0') : 
      undefined;
  }
}

export const animationStateManager = new AnimationStateManager();
```

---

## 14. 缓动函数参考表

| 名称 | CSS值 | 用途 |
|-----|-------|-----|
| Linear | `linear` | 持续动画、进度条 |
| Ease | `ease` | 默认过渡 |
| Ease Out | `ease-out` | 元素进入、数值变化 |
| Ease In | `ease-in` | 元素退出 |
| Ease In Out | `ease-in-out` | 循环动画 |
| Spring | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 弹窗出现 |
| Elastic | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | 图标弹跳 |
| Bounce Out | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | 强调反馈 |

---

## 15. 调试工具

```typescript
// 动画调试器 - 开发环境使用
class AnimationDebugger {
  private enabled: boolean = false;
  
  enable(): void {
    this.enabled = true;
    document.body.classList.add('anim-debug');
    this.injectStyles();
  }
  
  disable(): void {
    this.enabled = false;
    document.body.classList.remove('anim-debug');
  }
  
  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .anim-debug .animated-element {
        outline: 2px dashed rgba(255, 0, 0, 0.5);
        position: relative;
      }
      .anim-debug .animated-element::before {
        content: attr(data-anim-name);
        position: absolute;
        top: -20px;
        left: 0;
        background: red;
        color: white;
        font-size: 10px;
        padding: 2px 4px;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }
  
  logAnimation(name: string, duration: number): void {
    if (this.enabled) {
      console.log(`[Animation] ${name}: ${duration}ms`);
    }
  }
}

export const animDebugger = new AnimationDebugger();
```

---

## 16. 版本记录

| 版本 | 日期 | 更新内容 |
|-----|------|---------|
| 1.0 | 2026-02-28 | 初始版本，包含基础动画规范和实现 |
