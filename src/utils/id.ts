/**
 * ID 生成工具
 * 提供事件ID生成、UUID生成、ID验证和解析功能
 */

/**
 * ID 命名规范（来自 AGENTS.md）：
 * - 事件：act{N}_{类型}_{描述} 如 `act1_work_supermarket`
 * - 随机：rand{N}_{描述} 如 `rand2_storm`
 * - 政策：act{N}_policy_{编号} 如 `act3_policy_001`
 * - 道具：{分类}_{描述} 如 `consumable_painkiller`, `perm_backpack`
 */

// ID 格式正则表达式
const EVENT_ID_REGEX = /^(act[123]|rand[123])_([a-z]+)_[a-z0-9_]+$/;
const POLICY_ID_REGEX = /^act[123]_policy_\d{3}$/;
const ITEM_ID_REGEX = /^(consumable|perm|book)_[a-z0-9_]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 生成唯一事件ID
 * 格式: {场景}_{类型}_{描述}
 * @param scene - 场景ID (act1/act2/act3/rand1/rand2/rand3)
 * @param type - 事件类型 (work/random/fixed/chain/policy/item/social/study)
 * @param desc - 描述，使用小写字母、数字和下划线
 * @returns 格式化的事件ID
 * @example
 * generateEventId('act1', 'work', 'supermarket') // 'act1_work_supermarket'
 * generateEventId('act3', 'policy', '001') // 'act3_policy_001'
 */
export function generateEventId(scene: string, type: string, desc: string): string {
  // 验证场景
  const validScenes = ['act1', 'act2', 'act3', 'rand1', 'rand2', 'rand3'];
  if (!validScenes.includes(scene)) {
    throw new Error(`Invalid scene: ${scene}. Must be one of: ${validScenes.join(', ')}`);
  }

  // 清理描述：转为小写，移除非字母数字字符，用下划线替换空格和连字符
  const cleanDesc = desc
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, ''); // 移除首尾下划线

  if (!cleanDesc) {
    throw new Error('Description cannot be empty after cleaning');
  }

  // 政策事件特殊处理
  if (type === 'policy') {
    // desc 应该是数字，格式化为3位
    const policyNum = desc.padStart(3, '0');
    if (!/^\d{3}$/.test(policyNum)) {
      throw new Error(`Invalid policy number: ${desc}. Must be a number.`);
    }
    return `${scene}_policy_${policyNum}`;
  }

  // 验证类型
  const validTypes = ['work', 'random', 'fixed', 'chain', 'item', 'social', 'study', 'terminal', 'debt'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  return `${scene}_${type}_${cleanDesc}`;
}

/**
 * 生成UUID v4（用于存档等）
 * 符合 RFC 4122 标准
 * @returns UUID 字符串
 * @example '550e8400-e29b-41d4-a716-446655440000'
 */
export function generateUUID(): string {
  // 使用 crypto API 如果可用（浏览器/Node.js 现代环境）
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // 降级实现
  const segments: string[] = [];
  
  // 8位随机十六进制
  segments.push(randomHex(8));
  
  // 4位随机十六进制
  segments.push(randomHex(4));
  
  // 4位随机十六进制，第13位为 '4' (版本号)
  segments.push(((Math.random() * 0x10000) | 0).toString(16).padStart(4, '0').slice(0, 3) + '4');
  
  // 4位随机十六进制，第17位为 '8'/'9'/'a'/'b' (变体)
  const variant = ['8', '9', 'a', 'b'][(Math.random() * 4) | 0];
  segments.push(variant + randomHex(3));
  
  // 12位随机十六进制
  segments.push(randomHex(12));
  
  return segments.join('-');
}

/**
 * 生成指定长度的随机十六进制字符串
 * @param length - 长度
 * @returns 十六进制字符串
 */
function randomHex(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // 降级：使用 Math.random
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = (Math.random() * 256) | 0;
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

/**
 * 验证ID格式是否符合规范
 * 支持事件ID、道具ID、政策ID和UUID
 * @param id - 要验证的ID
 * @returns 是否有效
 */
export function isValidId(id: string): boolean {
  if (typeof id !== 'string' || id.length === 0) {
    return false;
  }

  // 检查是否为UUID
  if (UUID_REGEX.test(id)) {
    return true;
  }

  // 检查是否为政策ID
  if (POLICY_ID_REGEX.test(id)) {
    return true;
  }

  // 检查是否为事件ID
  if (EVENT_ID_REGEX.test(id)) {
    return true;
  }

  // 检查是否为道具ID
  if (ITEM_ID_REGEX.test(id)) {
    return true;
  }

  return false;
}

/**
 * 验证事件ID格式
 * @param id - 事件ID
 * @returns 是否有效的事件ID
 */
export function isValidEventId(id: string): boolean {
  if (typeof id !== 'string' || id.length === 0) {
    return false;
  }

  // 政策ID是特殊的事件ID
  if (POLICY_ID_REGEX.test(id)) {
    return true;
  }

  return EVENT_ID_REGEX.test(id);
}

/**
 * 验证道具ID格式
 * @param id - 道具ID
 * @returns 是否有效的道具ID
 */
export function isValidItemId(id: string): boolean {
  if (typeof id !== 'string' || id.length === 0) {
    return false;
  }

  return ITEM_ID_REGEX.test(id);
}

/**
 * 验证UUID格式
 * @param id - UUID
 * @returns 是否有效的UUID
 */
export function isValidUUID(id: string): boolean {
  if (typeof id !== 'string') {
    return false;
  }
  return UUID_REGEX.test(id);
}

/**
 * 从事件ID解析信息
 * 支持标准事件ID和政策ID
 * @param id - 事件ID
 * @returns 解析结果，包含 scene, type, desc
 * @throws 当ID格式无效时抛出错误
 * @example
 * parseEventId('act1_work_supermarket') // { scene: 'act1', type: 'work', desc: 'supermarket' }
 * parseEventId('act3_policy_001') // { scene: 'act3', type: 'policy', desc: '001' }
 */
export function parseEventId(id: string): { scene: string; type: string; desc: string } {
  if (!isValidEventId(id)) {
    throw new Error(`Invalid event ID format: ${id}`);
  }

  // 处理政策ID
  if (id.includes('_policy_')) {
    const match = id.match(/^(act[123])_policy_(\d{3})$/);
    if (match) {
      return {
        scene: match[1],
        type: 'policy',
        desc: match[2],
      };
    }
  }

  // 处理标准事件ID
  const parts = id.split('_');
  if (parts.length < 3) {
    throw new Error(`Invalid event ID format: ${id}`);
  }

  const scene = parts[0];
  const type = parts[1];
  const desc = parts.slice(2).join('_');

  return { scene, type, desc };
}

/**
 * 从道具ID解析信息
 * @param id - 道具ID
 * @returns 解析结果，包含 prefix 和 desc
 * @throws 当ID格式无效时抛出错误
 * @example
 * parseItemId('consumable_painkiller') // { prefix: 'consumable', desc: 'painkiller' }
 * parseItemId('perm_backpack') // { prefix: 'perm', desc: 'backpack' }
 */
export function parseItemId(id: string): { prefix: string; desc: string } {
  if (!isValidItemId(id)) {
    throw new Error(`Invalid item ID format: ${id}`);
  }

  const parts = id.split('_');
  const prefix = parts[0];
  const desc = parts.slice(1).join('_');

  return { prefix, desc };
}

/**
 * 生成道具ID
 * @param prefix - 分类前缀 (consumable/perm/book)
 * @param desc - 描述
 * @returns 格式化的道具ID
 * @example
 * generateItemId('consumable', 'painkiller') // 'consumable_painkiller'
 * generateItemId('perm', 'backpack') // 'perm_backpack'
 */
export function generateItemId(prefix: string, desc: string): string {
  const validPrefixes = ['consumable', 'perm', 'book'];
  if (!validPrefixes.includes(prefix)) {
    throw new Error(`Invalid prefix: ${prefix}. Must be one of: ${validPrefixes.join(', ')}`);
  }

  const cleanDesc = desc
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!cleanDesc) {
    throw new Error('Description cannot be empty after cleaning');
  }

  return `${prefix}_${cleanDesc}`;
}

/**
 * 生成存档ID
 * 基于时间戳和随机数
 * @returns 存档ID
 * @example 'save_1677654321_a3f7'
 */
export function generateSaveId(): string {
  const timestamp = Date.now();
  const random = randomHex(4);
  return `save_${timestamp}_${random}`;
}

/**
 * 验证存档ID格式
 * @param id - 存档ID
 * @returns 是否有效
 */
export function isValidSaveId(id: string): boolean {
  if (typeof id !== 'string') {
    return false;
  }
  return /^save_\d+_[0-9a-f]{4}$/.test(id);
}

/**
 * 从存档ID解析时间戳
 * @param saveId - 存档ID
 * @returns 时间戳，如果无效则返回 null
 */
export function parseSaveTimestamp(saveId: string): number | null {
  if (!isValidSaveId(saveId)) {
    return null;
  }

  const match = saveId.match(/^save_(\d+)_/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * 获取场景编号
 * @param sceneId - 场景ID (act1/act2/act3)
 * @returns 场景编号 (1/2/3)，无效则返回 null
 */
export function getSceneNumber(sceneId: string): number | null {
  const match = sceneId.match(/^act(\d)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * 检查是否为随机事件场景ID
 * @param sceneId - 场景ID
 * @returns 是否是随机事件场景 (rand1/rand2/rand3)
 */
export function isRandomEventScene(sceneId: string): boolean {
  return /^rand[123]$/.test(sceneId);
}

/**
 * 生成短ID（用于日志、调试等）
 * 8位随机十六进制字符串
 * @returns 短ID
 */
export function generateShortId(): string {
  return randomHex(8);
}
