/**
 * 运行时验证工具
 * 提供游戏数据的运行时验证功能
 */

import { isValidEventId, isValidItemId } from './id';

// 常量定义
const ATTRIBUTE_MIN = 0;
const ATTRIBUTE_MAX = 20;
const RESOURCE_MIN = 0;
const RESOURCE_MAX = 100;

// 有效枚举值
const VALID_SCENES = ['act1', 'act2', 'act3'] as const;
const VALID_EVENT_CATEGORIES = ['RANDOM', 'FIXED', 'CHAIN', 'POLICY_PRESSURE'] as const;
const VALID_ITEM_CATEGORIES = ['CONSUMABLE', 'PERMANENT', 'BOOK'] as const;
const VALID_CURRENCIES = ['CNY', 'USD'] as const;
const VALID_TERMINAL_STATES = ['DYING', 'BREAKDOWN', 'DESTITUTE'] as const;
const VALID_ATTRIBUTES = [
  'physique',
  'intelligence',
  'english',
  'social',
  'riskAwareness',
  'survival',
] as const;

/**
 * 验证属性值是否在有效范围（0-20）
 * @param value - 属性值
 * @returns 是否有效
 */
export function isValidAttribute(value: number): boolean {
  return (
    typeof value === 'number' &&
    !isNaN(value) &&
    value >= ATTRIBUTE_MIN &&
    value <= ATTRIBUTE_MAX
  );
}

/**
 * 验证资源值是否在有效范围（0-100）
 * @param value - 资源值
 * @returns 是否有效
 */
export function isValidResource(value: number): boolean {
  return (
    typeof value === 'number' &&
    !isNaN(value) &&
    value >= RESOURCE_MIN &&
    value <= RESOURCE_MAX
  );
}

/**
 * 验证场景ID是否有效
 * @param id - 场景ID
 * @returns 是否有效
 */
export function isValidSceneId(id: string): boolean {
  return VALID_SCENES.includes(id as (typeof VALID_SCENES)[number]);
}

/**
 * 验证事件分类是否有效
 * @param category - 事件分类
 * @returns 是否有效
 */
export function isValidEventCategory(category: string): boolean {
  return VALID_EVENT_CATEGORIES.includes(category as (typeof VALID_EVENT_CATEGORIES)[number]);
}

/**
 * 验证物品分类是否有效
 * @param category - 物品分类
 * @returns 是否有效
 */
export function isValidItemCategory(category: string): boolean {
  return VALID_ITEM_CATEGORIES.includes(category as (typeof VALID_ITEM_CATEGORIES)[number]);
}

/**
 * 验证货币类型是否有效
 * @param currency - 货币类型
 * @returns 是否有效
 */
export function isValidCurrency(currency: string): boolean {
  return VALID_CURRENCIES.includes(currency as (typeof VALID_CURRENCIES)[number]);
}

/**
 * 验证终结态类型是否有效
 * @param state - 终结态类型
 * @returns 是否有效
 */
export function isValidTerminalState(state: string): boolean {
  return VALID_TERMINAL_STATES.includes(state as (typeof VALID_TERMINAL_STATES)[number]);
}

/**
 * 验证属性名是否有效
 * @param attr - 属性名
 * @returns 是否有效
 */
export function isValidAttributeName(attr: string): boolean {
  return VALID_ATTRIBUTES.includes(attr as (typeof VALID_ATTRIBUTES)[number]);
}

/**
 * 验证是否为正整数
 * @param value - 值
 * @returns 是否有效
 */
export function isPositiveInteger(value: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * 验证是否为非负数
 * @param value - 值
 * @returns 是否有效
 */
export function isNonNegativeNumber(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= 0;
}

/**
 * 验证事件数据格式（基础检查）
 * 检查必需字段和基本格式，不验证业务逻辑
 * @param data - 事件数据对象
 * @returns 验证结果 { valid: boolean; errors: string[] }
 */
export function validateEventData(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data === null || typeof data !== 'object') {
    return { valid: false, errors: ['Event data must be an object'] };
  }

  const eventData = data as Record<string, unknown>;

  // 检查必需字段
  const requiredFields = ['id', 'category', 'name', 'description', 'scenes'];
  for (const field of requiredFields) {
    if (!(field in eventData)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // 验证ID
  if (typeof eventData.id === 'string') {
    if (!isValidEventId(eventData.id)) {
      errors.push(`Invalid event ID format: ${eventData.id}`);
    }
  } else if ('id' in eventData) {
    errors.push('Event ID must be a string');
  }

  // 验证分类
  if (typeof eventData.category === 'string') {
    if (!isValidEventCategory(eventData.category)) {
      errors.push(
        `Invalid event category: ${eventData.category}. Must be one of: ${VALID_EVENT_CATEGORIES.join(', ')}`
      );
    }
  } else if ('category' in eventData) {
    errors.push('Event category must be a string');
  }

  // 验证名称
  if (typeof eventData.name !== 'string' || eventData.name.length === 0) {
    if ('name' in eventData) {
      errors.push('Event name must be a non-empty string');
    }
  }

  // 验证描述
  if (typeof eventData.description !== 'string' || eventData.description.length === 0) {
    if ('description' in eventData) {
      errors.push('Event description must be a non-empty string');
    }
  }

  // 验证场景数组
  if (Array.isArray(eventData.scenes)) {
    if (eventData.scenes.length === 0) {
      errors.push('Event scenes array cannot be empty');
    } else {
      for (const scene of eventData.scenes) {
        if (typeof scene !== 'string' || !isValidSceneId(scene)) {
          errors.push(`Invalid scene ID in scenes: ${scene}`);
        }
      }
    }
  } else if ('scenes' in eventData) {
    errors.push('Event scenes must be an array');
  }

  // 验证choices（如果存在）
  if (eventData.choices !== undefined) {
    if (Array.isArray(eventData.choices)) {
      if (eventData.choices.length === 0) {
        errors.push('Event choices array cannot be empty if provided');
      } else {
        for (let i = 0; i < eventData.choices.length; i++) {
          const choice = eventData.choices[i];
          if (choice === null || typeof choice !== 'object') {
            errors.push(`Choice at index ${i} must be an object`);
            continue;
          }
          const choiceErrors = validateChoiceData(choice as Record<string, unknown>, i);
          errors.push(...choiceErrors);
        }
      }
    } else {
      errors.push('Event choices must be an array');
    }
  }

  // 验证execution配置（如果是FIXED事件）
  if (eventData.category === 'FIXED' && eventData.execution !== undefined) {
    const execErrors = validateExecutionConfig(eventData.execution as Record<string, unknown>);
    errors.push(...execErrors);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证选项数据
 * @param choice - 选项数据
 * @param index - 选项索引（用于错误信息）
 * @returns 错误数组
 */
function validateChoiceData(choice: Record<string, unknown>, index: number): string[] {
  const errors: string[] = [];

  // 检查必需字段
  if (typeof choice.id !== 'string' || choice.id.length === 0) {
    errors.push(`Choice at index ${index}: missing or invalid 'id'`);
  }

  if (typeof choice.name !== 'string' || choice.name.length === 0) {
    errors.push(`Choice at index ${index}: missing or invalid 'name'`);
  }

  // 验证effects（如果存在）
  if (choice.effects !== undefined) {
    if (choice.effects === null || typeof choice.effects !== 'object') {
      errors.push(`Choice at index ${index}: effects must be an object`);
    } else {
      const effects = choice.effects as Record<string, unknown>;

      // 验证资源变化
      if (effects.resources !== undefined) {
        if (effects.resources === null || typeof effects.resources !== 'object') {
          errors.push(`Choice at index ${index}: effects.resources must be an object`);
        }
      }

      // 验证属性变化
      if (effects.attributes !== undefined) {
        if (effects.attributes === null || typeof effects.attributes !== 'object') {
          errors.push(`Choice at index ${index}: effects.attributes must be an object`);
        } else {
          const attrs = effects.attributes as Record<string, unknown>;
          for (const [attr, value] of Object.entries(attrs)) {
            if (!isValidAttributeName(attr)) {
              errors.push(
                `Choice at index ${index}: invalid attribute name in effects.attributes: ${attr}`
              );
            }
            if (typeof value !== 'number') {
              errors.push(
                `Choice at index ${index}: attribute value must be a number for ${attr}`
              );
            }
          }
        }
      }
    }
  }

  // 验证condition（如果存在）
  if (choice.condition !== undefined) {
    if (choice.condition === null || typeof choice.condition !== 'object') {
      errors.push(`Choice at index ${index}: condition must be an object`);
    }
  }

  return errors;
}

/**
 * 验证执行配置
 * @param execution - 执行配置
 * @returns 错误数组
 */
function validateExecutionConfig(execution: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (typeof execution.repeatable !== 'boolean') {
    errors.push('execution.repeatable must be a boolean');
  }

  if (execution.actionPointCost !== undefined) {
    if (!isPositiveInteger(execution.actionPointCost as number)) {
      errors.push('execution.actionPointCost must be a positive integer');
    }
  }

  if (execution.maxExecutions !== undefined) {
    if (!isPositiveInteger(execution.maxExecutions as number)) {
      errors.push('execution.maxExecutions must be a positive integer');
    }
  }

  if (execution.moneyCost !== undefined) {
    if (!isNonNegativeNumber(execution.moneyCost as number)) {
      errors.push('execution.moneyCost must be a non-negative number');
    }
  }

  if (execution.moneyCurrency !== undefined) {
    if (!isValidCurrency(execution.moneyCurrency as string)) {
      errors.push(
        `execution.moneyCurrency must be one of: ${VALID_CURRENCIES.join(', ')}`
      );
    }
  }

  return errors;
}

/**
 * 验证道具数据格式
 * @param data - 道具数据对象
 * @returns 验证结果 { valid: boolean; errors: string[] }
 */
export function validateItemData(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data === null || typeof data !== 'object') {
    return { valid: false, errors: ['Item data must be an object'] };
  }

  const itemData = data as Record<string, unknown>;

  // 检查必需字段
  const requiredFields = ['id', 'name', 'description', 'category'];
  for (const field of requiredFields) {
    if (!(field in itemData)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // 验证ID
  if (typeof itemData.id === 'string') {
    if (!isValidItemId(itemData.id)) {
      errors.push(`Invalid item ID format: ${itemData.id}`);
    }
  } else if ('id' in itemData) {
    errors.push('Item ID must be a string');
  }

  // 验证分类
  if (typeof itemData.category === 'string') {
    if (!isValidItemCategory(itemData.category)) {
      errors.push(
        `Invalid item category: ${itemData.category}. Must be one of: ${VALID_ITEM_CATEGORIES.join(', ')}`
      );
    }
  } else if ('category' in itemData) {
    errors.push('Item category must be a string');
  }

  // 验证名称
  if (typeof itemData.name !== 'string' || itemData.name.length === 0) {
    if ('name' in itemData) {
      errors.push('Item name must be a non-empty string');
    }
  }

  // 验证描述
  if (typeof itemData.description !== 'string' || itemData.description.length === 0) {
    if ('description' in itemData) {
      errors.push('Item description must be a non-empty string');
    }
  }

  // 验证tags（如果存在）
  if (itemData.tags !== undefined) {
    if (Array.isArray(itemData.tags)) {
      for (const tag of itemData.tags) {
        if (typeof tag !== 'string') {
          errors.push(`Item tags must be strings, got: ${typeof tag}`);
        }
      }
    } else {
      errors.push('Item tags must be an array');
    }
  }

  // 验证priority（如果存在）
  if (itemData.priority !== undefined) {
    if (
      typeof itemData.priority !== 'number' ||
      !Number.isInteger(itemData.priority) ||
      itemData.priority < 0 ||
      itemData.priority > 9
    ) {
      errors.push('Item priority must be an integer between 0 and 9');
    }
  }

  // 验证canBeDeleted（如果存在）
  if (itemData.canBeDeleted !== undefined && typeof itemData.canBeDeleted !== 'boolean') {
    errors.push('Item canBeDeleted must be a boolean');
  }

  // 消耗品特有字段验证
  if (itemData.category === 'CONSUMABLE') {
    if (itemData.maxStack !== undefined) {
      if (!isPositiveInteger(itemData.maxStack as number)) {
        errors.push('Consumable maxStack must be a positive integer');
      }
    }

    if (itemData.useTarget !== undefined) {
      const validTargets = ['self', 'event'];
      if (!validTargets.includes(itemData.useTarget as string)) {
        errors.push(`Consumable useTarget must be one of: ${validTargets.join(', ')}`);
      }
    }
  }

  // 书籍特有字段验证
  if (itemData.category === 'CONSUMABLE' && itemData.subCategory === 'book') {
    if (typeof itemData.bookId !== 'string' || (itemData.bookId as string).length === 0) {
      errors.push('Book item must have a valid bookId');
    }

    if (itemData.rarity !== undefined) {
      const validRarities = ['COMMON', 'RARE', 'EPIC'];
      if (!validRarities.includes(itemData.rarity as string)) {
        errors.push(`Book rarity must be one of: ${validRarities.join(', ')}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证角色数据格式
 * @param data - 角色数据对象
 * @returns 验证结果 { valid: boolean; errors: string[] }
 */
export function validateCharacterData(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data === null || typeof data !== 'object') {
    return { valid: false, errors: ['Character data must be an object'] };
  }

  const charData = data as Record<string, unknown>;

  // 验证ID
  if (typeof charData.id !== 'string' || charData.id.length === 0) {
    errors.push('Character ID must be a non-empty string');
  }

  // 验证名称
  if (typeof charData.name !== 'string' || charData.name.length === 0) {
    errors.push('Character name must be a non-empty string');
  }

  // 验证属性
  if (charData.attributes === null || typeof charData.attributes !== 'object') {
    errors.push('Character attributes must be an object');
  } else {
    const attrs = charData.attributes as Record<string, unknown>;
    for (const attrName of VALID_ATTRIBUTES) {
      const value = attrs[attrName];
      if (value === undefined) {
        errors.push(`Missing attribute: ${attrName}`);
      } else if (!isValidAttribute(value as number)) {
        errors.push(
          `Invalid attribute value for ${attrName}: ${value}. Must be between ${ATTRIBUTE_MIN} and ${ATTRIBUTE_MAX}`
        );
      }
    }
  }

  // 验证资源
  if (charData.resources === null || typeof charData.resources !== 'object') {
    errors.push('Character resources must be an object');
  } else {
    const resources = charData.resources as Record<string, unknown>;

    // 验证health
    if (resources.health === null || typeof resources.health !== 'object') {
      errors.push('Character resources.health must be an object');
    } else {
      const health = resources.health as Record<string, unknown>;
      if (!isValidResource((health.current as number) ?? 0)) {
        errors.push(`Invalid health.current value: ${health.current}`);
      }
      if (!isValidResource((health.max as number) ?? 0)) {
        errors.push(`Invalid health.max value: ${health.max}`);
      }
    }

    // 验证mental
    if (resources.mental === null || typeof resources.mental !== 'object') {
      errors.push('Character resources.mental must be an object');
    } else {
      const mental = resources.mental as Record<string, unknown>;
      if (!isValidResource((mental.current as number) ?? 0)) {
        errors.push(`Invalid mental.current value: ${mental.current}`);
      }
      if (!isValidResource((mental.max as number) ?? 0)) {
        errors.push(`Invalid mental.max value: ${mental.max}`);
      }
    }

    // 验证money
    if (resources.money === null || typeof resources.money !== 'object') {
      errors.push('Character resources.money must be an object');
    } else {
      const money = resources.money as Record<string, unknown>;
      if (typeof money.cny !== 'number' || isNaN(money.cny)) {
        errors.push('Character resources.money.cny must be a number');
      }
      if (typeof money.usd !== 'number' || isNaN(money.usd)) {
        errors.push('Character resources.money.usd must be a number');
      }
    }

    // 验证actionPoints
    if (resources.actionPoints === null || typeof resources.actionPoints !== 'object') {
      errors.push('Character resources.actionPoints must be an object');
    }
  }

  // 验证状态
  if (charData.status === null || typeof charData.status !== 'object') {
    errors.push('Character status must be an object');
  } else {
    const status = charData.status as Record<string, unknown>;

    // 验证terminalState
    if (status.terminalState !== null && status.terminalState !== undefined) {
      if (!isValidTerminalState(status.terminalState as string)) {
        errors.push(
          `Invalid terminalState: ${status.terminalState}. Must be one of: ${VALID_TERMINAL_STATES.join(', ')}, or null`
        );
      }
    }

    // 验证terminalCountdown
    if (typeof status.terminalCountdown !== 'number' || !Number.isInteger(status.terminalCountdown)) {
      errors.push('Character status.terminalCountdown must be an integer');
    } else if ((status.terminalCountdown as number) < 0 || (status.terminalCountdown as number) > 3) {
      errors.push('Character status.terminalCountdown must be between 0 and 3');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证游戏状态数据格式（基础检查）
 * @param data - 游戏状态对象
 * @returns 验证结果 { valid: boolean; errors: string[] }
 */
export function validateGameState(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data === null || typeof data !== 'object') {
    return { valid: false, errors: ['GameState must be an object'] };
  }

  const state = data as Record<string, unknown>;

  // 检查必需字段
  const requiredFields = ['meta', 'character', 'scene', 'inventory', 'event', 'global'];
  for (const field of requiredFields) {
    if (!(field in state)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // 验证meta
  if (state.meta !== null && typeof state.meta === 'object') {
    const meta = state.meta as Record<string, unknown>;
    if (typeof meta.version !== 'string') {
      errors.push('meta.version must be a string');
    }
    if (typeof meta.createdAt !== 'number') {
      errors.push('meta.createdAt must be a number (timestamp)');
    }
  }

  // 验证character
  if (state.character !== null && typeof state.character === 'object') {
    const charResult = validateCharacterData(state.character);
    errors.push(...charResult.errors.map((e) => `character: ${e}`));
  }

  // 验证scene
  if (state.scene !== null && typeof state.scene === 'object') {
    const scene = state.scene as Record<string, unknown>;
    if (typeof scene.currentScene !== 'string' || !isValidSceneId(scene.currentScene)) {
      errors.push(`Invalid scene.currentScene: ${scene.currentScene}`);
    }
    if (typeof scene.turnCount !== 'number' || !Number.isInteger(scene.turnCount)) {
      errors.push('scene.turnCount must be an integer');
    }
    if (typeof scene.sceneTurn !== 'number' || !Number.isInteger(scene.sceneTurn)) {
      errors.push('scene.sceneTurn must be an integer');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 批量验证多个事件
 * @param events - 事件数组
 * @returns 验证结果，包含每个事件的验证状态和汇总错误
 */
export function validateMultipleEvents(
  events: unknown[]
): {
  valid: boolean;
  totalErrors: number;
  results: Array<{ index: number; id?: string; valid: boolean; errors: string[] }>;
} {
  const results: Array<{ index: number; id?: string; valid: boolean; errors: string[] }> = [];
  let totalErrors = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const result = validateEventData(event);
    const eventId =
      event !== null && typeof event === 'object' && 'id' in event
        ? (event as Record<string, unknown>).id
        : undefined;

    results.push({
      index: i,
      id: typeof eventId === 'string' ? eventId : undefined,
      valid: result.valid,
      errors: result.errors,
    });

    totalErrors += result.errors.length;
  }

  return {
    valid: totalErrors === 0,
    totalErrors,
    results,
  };
}

/**
 * 批量验证多个道具
 * @param items - 道具数组
 * @returns 验证结果，包含每个道具的验证状态和汇总错误
 */
export function validateMultipleItems(
  items: unknown[]
): {
  valid: boolean;
  totalErrors: number;
  results: Array<{ index: number; id?: string; valid: boolean; errors: string[] }>;
} {
  const results: Array<{ index: number; id?: string; valid: boolean; errors: string[] }> = [];
  let totalErrors = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = validateItemData(item);
    const itemId =
      item !== null && typeof item === 'object' && 'id' in item
        ? (item as Record<string, unknown>).id
        : undefined;

    results.push({
      index: i,
      id: typeof itemId === 'string' ? itemId : undefined,
      valid: result.valid,
      errors: result.errors,
    });

    totalErrors += result.errors.length;
  }

  return {
    valid: totalErrors === 0,
    totalErrors,
    results,
  };
}
