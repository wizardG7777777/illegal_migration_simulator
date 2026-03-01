/**
 * /set 命令 - 修改游戏资源或属性
 * 
 * 用法：
 * /set money 1000           # 设置金钱为1000
 * /set money +500           # 增加500
 * /set health 80            # 设置健康度
 * /set attribute physique 12 # 设置体魄
 */

import type { ConsoleCommand, CommandContext, CommandResult } from '../commandRegistry';
import { CharacterSystem } from '../../systems/character/CharacterSystem';
import type { Attributes } from '../../types';

// 资源类型映射
const RESOURCE_MAP: Record<string, 'health' | 'mental' | 'actionPoints'> = {
  health: 'health',
  hp: 'health',
  健康: 'health',
  身体健康: 'health',
  
  mental: 'mental',
  mp: 'mental',
  心理: 'mental',
  心理健康: 'mental',
  精神: 'mental',
  
  actionpoints: 'actionPoints',
  ap: 'actionPoints',
  行动点: 'actionPoints',
  行动力: 'actionPoints',
};

// 属性类型映射
const ATTRIBUTE_MAP: Record<string, keyof Attributes> = {
  physique: 'physique',
  体魄: 'physique',
  体质: 'physique',
  
  intelligence: 'intelligence',
  智力: 'intelligence',
  
  english: 'english',
  英语: 'english',
  英文: 'english',
  
  social: 'social',
  社交: 'social',
  人脉: 'social',
  
  riskawareness: 'riskAwareness',
  风险意识: 'riskAwareness',
  风险: 'riskAwareness',
  
  survival: 'survival',
  生存: 'survival',
  生存能力: 'survival',
};

// 货币类型映射
const CURRENCY_MAP: Record<string, 'CNY' | 'USD'> = {
  cny: 'CNY',
  rmb: 'CNY',
  人民币: 'CNY',
  元: 'CNY',
  
  usd: 'USD',
  dollar: 'USD',
  美元: 'USD',
  刀: 'USD',
};

export const setCommand: ConsoleCommand = {
  name: 'set',
  description: '修改游戏资源或属性',
  usage: '/set <resource|attribute> <value> [currency]',
  examples: [
    '/set money 1000 USD',
    '/set health 80',
    '/set physique 15',
    '/set attribute intelligence 12',
  ],

  execute(args: string[], context: CommandContext): CommandResult {
    if (args.length < 2) {
      return {
        success: false,
        message: '',
        error: '参数不足。用法: /set <resource|attribute> <value> [currency]',
      };
    }

    const target = args[0].toLowerCase();
    
    const state = context.getState();

    // 处理 "attribute" 前缀语法（必须在解析数值之前检查）
    if (target === 'attribute' || target === 'attr' || target === '属性') {
      const attrName = args[1]?.toLowerCase();
      const attrValueStr = args[2];
      
      if (!attrName || !attrValueStr) {
        return {
          success: false,
          message: '',
          error: '参数不足。用法: /set attribute <attrName> <value>',
        };
      }

      const attr = ATTRIBUTE_MAP[attrName];
      if (!attr) {
        return {
          success: false,
          message: '',
          error: `未知属性: ${attrName}。可用属性: physique, intelligence, english, social, riskAwareness, survival`,
        };
      }

      const attrValue = parseFloat(attrValueStr);
      if (isNaN(attrValue)) {
        return {
          success: false,
          message: '',
          error: `无效数值: ${attrValueStr}`,
        };
      }

      const newValue = Math.max(0, Math.min(20, attrValue));
      const currentValue = state.character.attributes[attr];
      const delta = newValue - currentValue;

      if (delta !== 0) {
        const newState = CharacterSystem.modifyAttribute(state, attr, delta);
        context.setState(newState);
      }

      const displayName = {
        physique: '体魄',
        intelligence: '智力',
        english: '英语',
        social: '社交',
        riskAwareness: '风险意识',
        survival: '生存能力',
      }[attr];

      return {
        success: true,
        message: `✓ ${displayName}已设置为 ${newValue}/20`,
      };
    }

    // 解析数值（支持 +n 和 -n 的相对变化）
    const valueStr = args[1];
    const currencyArg = args[2]?.toUpperCase();
    
    const isRelative = valueStr.startsWith('+') || valueStr.startsWith('-');
    const value = parseFloat(valueStr);

    if (isNaN(value)) {
      return {
        success: false,
        message: '',
        error: `无效数值: ${valueStr}`,
      };
    }

    // 处理金钱
    if (target === 'money' || target === '现金' || target === '金钱') {
      const currency = CURRENCY_MAP[currencyArg?.toLowerCase() || 'usd'] || 'USD';
      
      let newValue: number;
      if (isRelative) {
        const current = currency === 'CNY' 
          ? state.character.resources.money.cny 
          : state.character.resources.money.usd;
        newValue = Math.max(0, current + value);
      } else {
        newValue = Math.max(0, value);
      }

      const newState = CharacterSystem.modifyMoney(state, currency, newValue - (currency === 'CNY' ? state.character.resources.money.cny : state.character.resources.money.usd));
      context.setState(newState);

      const currencySymbol = currency === 'CNY' ? '¥' : '$';
      return {
        success: true,
        message: `✓ ${currency === 'CNY' ? '人民币' : '美元'}已设置为 ${currencySymbol}${newValue}`,
      };
    }

    // 处理资源（健康/心理/行动点）
    const resourceKey = RESOURCE_MAP[target];
    if (resourceKey) {
      let newValue: number;
      const currentValue = state.character.resources[resourceKey].current;
      
      if (isRelative) {
        newValue = currentValue + value;
      } else {
        newValue = value;
      }

      // 限制在有效范围内
      const maxValue = state.character.resources[resourceKey].max;
      const minValue = resourceKey === 'actionPoints' 
        ? state.character.resources[resourceKey].min 
        : 0;
      
      newValue = Math.max(minValue, Math.min(maxValue, newValue));

      const delta = newValue - currentValue;
      if (delta !== 0) {
        const newState = CharacterSystem.modifyResource(state, resourceKey, delta);
        context.setState(newState);
      }

      const resourceName = {
        health: '身体健康度',
        mental: '心理健康度',
        actionPoints: '行动点',
      }[resourceKey];

      return {
        success: true,
        message: `✓ ${resourceName}已设置为 ${newValue}/${maxValue}`,
      };
    }

    // 处理属性
    const attrKey = ATTRIBUTE_MAP[target];
    if (attrKey) {
      let newValue: number;
      const currentValue = state.character.attributes[attrKey];
      
      if (isRelative) {
        newValue = currentValue + value;
      } else {
        newValue = value;
      }

      // 限制在 0-20 范围内
      newValue = Math.max(0, Math.min(20, newValue));

      const delta = newValue - currentValue;
      if (delta !== 0) {
        const newState = CharacterSystem.modifyAttribute(state, attrKey, delta);
        context.setState(newState);
      }

      const attrName = {
        physique: '体魄',
        intelligence: '智力',
        english: '英语',
        social: '社交',
        riskAwareness: '风险意识',
        survival: '生存能力',
      }[attrKey];

      return {
        success: true,
        message: `✓ ${attrName}已设置为 ${newValue}/20`,
      };
    }

    return {
      success: false,
      message: '',
      error: `未知目标: ${target}。可用: money, health, mental, actionPoints, physique, intelligence, english, social, riskAwareness, survival`,
    };
  },

  getSuggestions(args: string[], argIndex: number, _context: CommandContext): string[] {
    if (argIndex === 0) {
      return ['money', 'health', 'mental', 'actionPoints', 'attribute', 'physique', 'intelligence', 'english', 'social', 'riskAwareness', 'survival'];
    }
    if (argIndex === 1 && (args[0] === 'attribute' || args[0] === 'attr' || args[0] === '属性')) {
      return ['physique', 'intelligence', 'english', 'social', 'riskAwareness', 'survival'];
    }
    if (argIndex === 1 && args[0] === 'money') {
      return ['CNY', 'USD'];
    }
    return [];
  },
};
