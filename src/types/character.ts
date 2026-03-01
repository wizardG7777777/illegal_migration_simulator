/**
 * 角色相关类型定义
 * 包含六维属性、资源、终结态和角色状态
 */

/**
 * 六维属性
 * 范围: 0-20 (10为普通人水平)
 */
export interface Attributes {
  /** 体魄 - 高强度行动、极端环境、濒死窗口计算 */
  physique: number; // 0-20
  /** 智力 - 信息处理、骗局识别、崩溃窗口计算 */
  intelligence: number; // 0-20
  /** 英语技能 - 正规渠道沟通、选项解锁、失败代价降级 */
  english: number; // 0-20
  /** 社交 - 随机事件概率、信息获取、人脉分支 */
  social: number; // 0-20
  /** 风险意识 - 后果揭示、避坑、暴死事件降级 */
  riskAwareness: number; // 0-20
  /** 生存能力 - 极端环境存活、灰区操作、保命路径 */
  survival: number; // 0-20
}

/**
 * 资源数值结构
 * 包含当前值和最大值
 */
export interface ResourceValue {
  current: number;
  max: number;
}

/**
 * 行动点资源
 * 包含当前值、最大值和最小值
 */
export interface ActionPointResource {
  current: number;
  max: number;
  min: number;
}

/**
 * 货币结构
 * 支持人民币和美元
 */
export interface Money {
  cny: number;
  usd: number;
}

/**
 * 资源
 * 短期消耗，可波动
 */
export interface Resources {
  /** 身体健康度 - 归零进入【濒死】终结态 */
  health: ResourceValue; // 0-100
  /** 心理健康度 - 归零进入【崩溃】终结态 */
  mental: ResourceValue; // 0-100
  /** 现金（人民币/美元） */
  money: Money;
  /** 行动点 - 回合结束重置 */
  actionPoints: ActionPointResource;
}

/**
 * 终结态类型
 * - DYING: 濒死状态（体魄决定窗口）
 * - BREAKDOWN: 崩溃状态（智力决定窗口）
 * - DESTITUTE: 匮乏状态（资金归零后的软性惩罚）
 */
export type TerminalState = 'DYING' | 'BREAKDOWN' | 'DESTITUTE';

/**
 * 角色状态
 * 包含终结态和倒计时
 */
export interface CharacterStatus {
  /** 当前终结态类型，null 表示正常状态 */
  terminalState: TerminalState | null;
  /** 终结态倒计时回合数
   * 濒死：体魄0-1→0回合(立即死), 2-8→1回合, 9-15→2回合, 16-20→3回合
   * 崩溃：智力0-9→3回合, 10-19→2回合, 20→1回合
   */
  terminalCountdown: number;
  /** 状态标记（用于事件条件判断） */
  flags: Record<string, boolean | number | string>;
}

/**
 * 角色数据（完整定义）
 * 用于game.ts中的完整定义
 */
export interface CharacterData {
  /** 角色ID */
  id: string;
  /** 角色名称 */
  name: string;
  /** 六维属性 */
  attributes: Attributes;
  /** 资源 */
  resources: Resources;
  /** 角色状态 */
  status: CharacterStatus;
}
