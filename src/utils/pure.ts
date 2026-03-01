/**
 * 纯函数工具库
 * 所有函数都是纯函数，无副作用
 */

/**
 * 数值钳制函数
 * 将值限制在 [min, max] 范围内
 * @param value - 输入值
 * @param min - 最小值
 * @param max - 最大值
 * @returns 钳制后的值
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 深度克隆（用于不可变状态更新）
 * 支持对象、数组、Date、RegExp、Map、Set
 * @param obj - 要克隆的对象
 * @returns 深拷贝后的对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as unknown as T;
  }

  if (obj instanceof Map) {
    const clonedMap = new Map();
    obj.forEach((value, key) => {
      clonedMap.set(key, deepClone(value));
    });
    return clonedMap as unknown as T;
  }

  if (obj instanceof Set) {
    const clonedSet = new Set();
    obj.forEach((value) => {
      clonedSet.add(deepClone(value));
    });
    return clonedSet as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }

  const cloned: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
    }
  }
  return cloned as T;
}

/**
 * 安全地访问嵌套对象属性
 * @param obj - 目标对象
 * @param path - 属性路径，如 "a.b.c" 或 "a[0].b"
 * @param defaultValue - 默认值（当路径不存在时返回）
 * @returns 属性值或默认值
 */
export function getNestedValue<T>(
  obj: unknown,
  path: string,
  defaultValue?: T
): T | undefined {
  if (obj === null || obj === undefined) {
    return defaultValue;
  }

  const keys = path.replace(/\[(\w+)\]/g, '.$1').split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    if (typeof current !== 'object') {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current !== undefined ? (current as T) : defaultValue;
}

/**
 * 判断对象是否为空
 * @param obj - 要检查的对象
 * @returns 如果对象没有自身属性则返回 true
 */
export function isEmpty(obj: Record<string, unknown>): boolean {
  if (obj === null || obj === undefined) {
    return true;
  }
  return Object.keys(obj).length === 0;
}

/**
 * 计算百分比
 * @param value - 当前值
 * @param total - 总值
 * @returns 百分比值 (0-100)，如果 total 为 0 返回 0
 */
export function percentage(value: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((value / total) * 100);
}

/**
 * 随机整数 [min, max]
 * 包含 min 和 max
 * @param min - 最小值
 * @param max - 最大值
 * @returns 随机整数
 */
export function randomInt(min: number, max: number): number {
  const safeMin = Math.ceil(min);
  const safeMax = Math.floor(max);
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

/**
 * 按权重随机选择
 * @param items - 待选择项数组
 * @param weights - 对应权重数组，必须和 items 长度相同
 * @returns 随机选中的项
 * @throws 当数组为空或权重长度不匹配时抛出错误
 */
export function weightedRandom<T>(items: T[], weights: number[]): T {
  if (items.length === 0) {
    throw new Error('Items array cannot be empty');
  }
  if (items.length !== weights.length) {
    throw new Error('Items and weights must have the same length');
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) {
    throw new Error('Total weight must be positive');
  }

  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  // 由于浮点数精度问题，如果到这里，返回最后一项
  return items[items.length - 1];
}

/**
 * 数组乱序（Fisher-Yates 洗牌算法）
 * 返回新数组，不修改原数组
 * @param array - 原数组
 * @returns 乱序后的新数组
 */
export function shuffle<T>(array: T[]): T[] {
  if (array.length <= 1) {
    return [...array];
  }

  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 创建不可变的状态更新（浅合并）
 * 用于更新对象状态，返回新对象
 * @param state - 原状态
 * @param partial - 要合并的部分状态
 * @returns 新状态对象
 */
export function mergeState<T>(state: T, partial: Partial<T>): T {
  return { ...state, ...partial };
}

/**
 * 将数组按指定大小分块
 * @param array - 原数组
 * @param size - 每块大小
 * @returns 分块后的数组
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('Chunk size must be positive');
  }
  if (array.length === 0) {
    return [];
  }

  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * 延迟指定毫秒数
 * 用于异步操作中的延时
 * @param ms - 毫秒数
 * @returns Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 将对象转换为查询参数字符串
 * @param params - 参数对象
 * @returns 查询字符串（不含开头的?）
 */
export function toQueryString(params: Record<string, string | number | boolean>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

/**
 * 防抖函数
 * @param fn - 原函数
 * @param delay - 延迟毫秒数
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: unknown, ...args: Parameters<T>) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 节流函数
 * @param fn - 原函数
 * @param interval - 间隔毫秒数
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
