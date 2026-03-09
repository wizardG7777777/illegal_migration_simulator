/**
 * 类型定义统一入口
 * 导出所有游戏相关类型
 */

// ============================================
// 角色相关类型
// ============================================
export type {
  Attributes,
  ResourceValue,
  ActionPointResource,
  Money,
  Resources,
  TerminalState,
  CharacterStatus,
} from './character';

// ============================================
// 物品相关类型
// ============================================
export type {
  ItemCategory,
  ConsumableSubCategory,
  ItemTag,
  Item,
  ConsumableEffect,
  UseCost,
  ConsumableItem,
  BookItem,
  SlotEffect,
  PassiveEffect,
  UpkeepCost,
  PermanentItem,
  AnyItem,
} from './item';

// ============================================
// 场景相关类型
// ============================================
export type {
  SceneId,
  SceneConfig,
  Act1State,
  Act2State,
  VisaStatus,
  OngoingCost,
  LivingExpenseItems,
  LivingExpenses,
  Act3State,
  EnvironmentalDebuffType,
  EconomicDebuffSubtype,
  PressureDebuffEffect,
  EconomicDebuffEffect,
  EnvironmentalDebuff,
  DebtData,
  BaselineCosts,
  PressureEffect,
  CrossSceneData,
} from './scene';

// ============================================
// 事件相关类型
// ============================================
export type {
  EventCategory,
  EventConditionType,
  AttributeOperator,
  BaseEventCondition,
  SceneCondition,
  AttributeCondition,
  ItemCondition,
  FlagCondition,
  ChainUnlockedCondition,
  EventCondition,
  TriggerConfig,
  ExecutionConfig,
  ItemSlot,
  ResourceEffect,
  EventEffect,
  EventChoice,
  ChainConfig,
  PolicyPressureContent,
  DebuffConfig,
  EventTag,
  GameEvent,
  ActiveChain,
} from './event';

// ============================================
// 游戏状态相关类型
// ============================================
export type {
  GameMeta,
  CharacterData,
  SceneState,
  InventoryData,
  EventRuntimeData,
  GameStatistics,
  GlobalData,
  GameState,
  SaveData,
  PlayerActionType,
  PlayerAction,
} from './game';

// ============================================
// NPC系统相关类型
// ============================================
export type {
  NPCConfig,
  NPCState,
  ChatMessage,
  NPCSystemState,
  NPCsDataFile,
} from './npc';


