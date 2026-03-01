/**
 * BackpackModal 背包模态框组件
 * 全屏展示的背包详情页面，支持分类浏览、筛选和详细查看
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { 
  InventoryData, 
  ConsumableItem, 
  PermanentItem,
  ItemTag,
  ConsumableSubCategory 
} from '../../types';
import { DataLoader } from '../../systems/loader/DataLoader';
import { Button } from '../primitives/Button';

export interface BackpackModalProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 物品栏数据 */
  inventory: InventoryData;
  /** 使用消耗品回调 */
  onUseItem: (itemId: string) => void;
}

type ItemCategory = 'all' | 'consumable' | 'permanent' | 'book';
type ConsumableFilter = 'all' | ConsumableSubCategory;

// ============================================
// 图标映射
// ============================================

const TAG_ICONS: Record<ItemTag | string, string> = {
  transport: '🚗',
  lodging: '🏠',
  weapon: '⚔️',
  tool: '🔧',
  identity: '🪪',
  document: '📄',
  contact: '👤',
  membership: '🎫',
  guide: '🧭',
  cross_scene: '📌',
  medical: '💊',
  food: '🍞',
  book: '📚',
};

const SUBCATEGORY_ICONS: Record<ConsumableSubCategory | string, string> = {
  food: '🍞',
  medical: '💊',
  book: '📚',
  other: '📦',
};

const RARITY_COLORS: Record<string, string> = {
  COMMON: 'text-slate-400',
  RARE: 'text-blue-400',
  EPIC: 'text-purple-400',
  LEGENDARY: 'text-amber-400',
};

const RARITY_NAMES: Record<string, string> = {
  COMMON: '普通',
  RARE: '稀有',
  EPIC: '史诗',
  LEGENDARY: '传说',
};

// ============================================
// 子组件
// ============================================

/**
 * 消耗品详情卡片
 */
const ConsumableDetailCard = React.memo(function ConsumableDetailCard({
  itemId,
  count,
  onUse,
}: {
  itemId: string;
  count: number;
  onUse: () => void;
}) {
  const item = DataLoader.getInstance().getItem(itemId) as ConsumableItem | undefined;
  
  if (!item) return null;

  const canUse = item.useTarget === 'self';
  
  // 效果描述
  const effectDescriptions: string[] = [];
  if (item.effects.healthRestore) effectDescriptions.push(`健康 +${item.effects.healthRestore}`);
  if (item.effects.mentalRestore) effectDescriptions.push(`心理 +${item.effects.mentalRestore}`);
  if (item.effects.actionPointRestore) effectDescriptions.push(`行动点 +${item.effects.actionPointRestore}`);
  
  // 属性加成
  if (item.effects.attributeBonus) {
    Object.entries(item.effects.attributeBonus).forEach(([attr, val]) => {
      const attrNames: Record<string, string> = {
        physique: '体魄', intelligence: '智力', english: '英语',
        social: '社交', riskAwareness: '风险意识', survival: '生存'
      };
      effectDescriptions.push(`${attrNames[attr] || attr} +${val}`);
    });
  }

  return (
    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex items-start gap-4">
        {/* 图标 */}
        <div className="w-14 h-14 bg-slate-700/50 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
          {SUBCATEGORY_ICONS[item.subCategory] || '📦'}
        </div>
        
        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-200">{item.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {item.subCategory === 'food' && '食物类'}
                {item.subCategory === 'medical' && '医疗类'}
                {item.subCategory === 'book' && '书籍类'}
                {item.subCategory === 'other' && '其他'}
              </p>
            </div>
            <span className="px-2.5 py-1 bg-slate-700 rounded-lg text-sm font-medium text-slate-300">
              ×{count}
            </span>
          </div>
          
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            {item.description}
          </p>
          
          {/* 效果 */}
          {effectDescriptions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {effectDescriptions.map((effect, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded">
                  {effect}
                </span>
              ))}
            </div>
          )}
          
          {/* 使用消耗 */}
          {(item.useCost?.actionPoint || item.useCost?.money) ? (
            <p className="text-xs text-amber-400 mt-2">
              使用消耗: 
              {item.useCost.actionPoint ? ` ${item.useCost.actionPoint} AP` : ''}
              {item.useCost.money ? ` $${item.useCost.money}` : ''}
            </p>
          ) : null}
        </div>
        
        {/* 使用按钮 */}
        {canUse && count > 0 && (
          <Button
            onClick={onUse}
            variant="primary"
            size="sm"
            className="flex-shrink-0"
          >
            使用
          </Button>
        )}
      </div>
    </div>
  );
});

/**
 * 常驻道具详情卡片
 */
const PermanentDetailCard = React.memo(function PermanentDetailCard({
  itemId,
}: {
  itemId: string;
}) {
  const item = DataLoader.getInstance().getItem(itemId) as PermanentItem | undefined;
  
  if (!item) return null;

  const icon = item.tags.length > 0 ? (TAG_ICONS[item.tags[0]] || '📦') : '📦';
  
  // 被动效果描述
  const passiveEffects: string[] = [];
  if (item.passiveEffects?.perTurn) {
    const { perTurn } = item.passiveEffects;
    if (perTurn.healthRestore) passiveEffects.push(`每回合健康 +${perTurn.healthRestore}`);
    if (perTurn.mentalRestore) passiveEffects.push(`每回合心理 +${perTurn.mentalRestore}`);
    if (perTurn.moneyChange) {
      passiveEffects.push(perTurn.moneyChange > 0 
        ? `每回合收入 $${perTurn.moneyChange}` 
        : `每回合消耗 $${Math.abs(perTurn.moneyChange)}`
      );
    }
  }

  // 槽位效果描述
  const slotEffects: string[] = [];
  if (item.slotEffects) {
    if (item.slotEffects.actionPointCostModifier && item.slotEffects.actionPointCostModifier < 0) {
      slotEffects.push(`节省 ${Math.abs(item.slotEffects.actionPointCostModifier)} 行动点`);
    }
    if (item.slotEffects.moneyMultiplier && item.slotEffects.moneyMultiplier > 1) {
      slotEffects.push(`收入 +${Math.round((item.slotEffects.moneyMultiplier - 1) * 100)}%`);
    }
    if (item.slotEffects.successRateModifier && item.slotEffects.successRateModifier > 0) {
      slotEffects.push(`成功率 +${Math.round(item.slotEffects.successRateModifier * 100)}%`);
    }
  }

  return (
    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex items-start gap-4">
        {/* 图标 */}
        <div className="w-14 h-14 bg-slate-700/50 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
          {icon}
        </div>
        
        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-200">{item.name}</h3>
              {item.canBeDeleted && (
                <span className="text-xs px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 rounded mt-1 inline-block">
                  可丢失
                </span>
              )}
            </div>
            <span className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-400">
              优先级 {item.priority}
            </span>
          </div>
          
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            {item.description}
          </p>
          
          {/* 标签 */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {item.tags.map(tag => (
              <span 
                key={tag} 
                className="text-xs px-2 py-1 bg-slate-700/70 rounded text-slate-300 flex items-center gap-1"
              >
                <span>{TAG_ICONS[tag] || '📦'}</span>
                <span>{tag}</span>
              </span>
            ))}
          </div>
          
          {/* 被动效果 */}
          {passiveEffects.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">被动效果</p>
              <div className="flex flex-wrap gap-2">
                {passiveEffects.map((effect, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded">
                    {effect}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* 槽位效果 */}
          {slotEffects.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-slate-500 mb-1">事件加成</p>
              <div className="flex flex-wrap gap-2">
                {slotEffects.map((effect, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded">
                    {effect}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* 维护成本 */}
          {item.upkeepCost && item.upkeepCost.moneyPerTurn > 0 && (
            <p className="text-xs text-amber-400 mt-3">
              ⚠️ 每回合维护成本: ${item.upkeepCost.moneyPerTurn}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * 已读书籍卡片
 */
const BookReadCard = React.memo(function BookReadCard({
  bookId,
}: {
  bookId: string;
}) {
  const book = DataLoader.getInstance().getItem(bookId) as ConsumableItem | undefined;
  
  if (!book) return null;

  // 属性加成
  const attributeEffects: string[] = [];
  if (book.effects.attributeBonus) {
    Object.entries(book.effects.attributeBonus).forEach(([attr, val]) => {
      const attrNames: Record<string, string> = {
        physique: '体魄', intelligence: '智力', english: '英语',
        social: '社交', riskAwareness: '风险意识', survival: '生存'
      };
      attributeEffects.push(`${attrNames[attr] || attr} +${val}`);
    });
  }

  return (
    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-slate-700/50 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
          📚
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-200">{book.name}</h3>
            {(book as any).rarity && (
              <span className={`text-xs ${RARITY_COLORS[(book as any).rarity] || 'text-slate-400'}`}>
                {RARITY_NAMES[(book as any).rarity] || '普通'}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">{book.description}</p>
          
          {attributeEffects.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {attributeEffects.map((effect, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded">
                  {effect}
                </span>
              ))}
            </div>
          )}
          
          <p className="text-xs text-green-400 mt-2">✓ 已阅读</p>
        </div>
      </div>
    </div>
  );
});

// ============================================
// 主组件
// ============================================

export const BackpackModal = React.memo(function BackpackModal({
  isOpen,
  onClose,
  inventory,
  onUseItem,
}: BackpackModalProps) {
  const [activeCategory, setActiveCategory] = useState<ItemCategory>('all');
  const [consumableFilter, setConsumableFilter] = useState<ConsumableFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 计算统计数据
  const stats = useMemo(() => ({
    total: inventory.consumables.reduce((s, c) => s + c.count, 0) + inventory.permanents.length,
    consumable: inventory.consumables.reduce((s, c) => s + c.count, 0),
    permanent: inventory.permanents.length,
    book: inventory.booksRead.length,
  }), [inventory]);

  // 筛选消耗品
  const filteredConsumables = useMemo(() => {
    let items = inventory.consumables;
    if (consumableFilter !== 'all') {
      items = items.filter(({ itemId }) => {
        const item = DataLoader.getInstance().getItem(itemId) as ConsumableItem;
        return item?.subCategory === consumableFilter;
      });
    }
    if (searchQuery) {
      items = items.filter(({ itemId }) => {
        const item = DataLoader.getInstance().getItem(itemId) as ConsumableItem;
        return item?.name.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    return items;
  }, [inventory.consumables, consumableFilter, searchQuery]);

  // 筛选常驻道具
  const filteredPermanents = useMemo(() => {
    let items = inventory.permanents;
    if (searchQuery) {
      items = items.filter(({ itemId }) => {
        const item = DataLoader.getInstance().getItem(itemId) as PermanentItem;
        return item?.name.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    return items;
  }, [inventory.permanents, searchQuery]);

  // 筛选书籍
  const filteredBooks = useMemo(() => {
    if (!searchQuery) return inventory.booksRead;
    return inventory.booksRead.filter(bookId => {
      const book = DataLoader.getInstance().getItem(bookId);
      return book?.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [inventory.booksRead, searchQuery]);

  const handleUseItem = useCallback((itemId: string) => {
    onUseItem(itemId);
  }, [onUseItem]);

  // 处理ESC键关闭
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎒</span>
            <div>
              <h2 className="text-lg font-semibold text-slate-200">背包</h2>
              <p className="text-xs text-slate-500">
                共 {stats.total} 件物品
                {stats.consumable > 0 && ` · ${stats.consumable} 消耗品`}
                {stats.permanent > 0 && ` · ${stats.permanent} 常驻道具`}
                {stats.book > 0 && ` · ${stats.book} 已读书籍`}
              </p>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm">
            ✕ 关闭
          </Button>
        </div>

        {/* 筛选栏 */}
        <div className="p-4 border-b border-slate-700 space-y-3">
          {/* 分类标签 */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: '全部', count: stats.total, icon: '📦' },
              { key: 'consumable', label: '消耗品', count: stats.consumable, icon: '🍞' },
              { key: 'permanent', label: '常驻道具', count: stats.permanent, icon: '🔧' },
              { key: 'book', label: '已读书籍', count: stats.book, icon: '📚' },
            ].map(({ key, label, count, icon }) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key as ItemCategory)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors
                  ${activeCategory === key 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                  }
                `}
              >
                <span>{icon}</span>
                <span>{label}</span>
                <span className="text-xs opacity-60">({count})</span>
              </button>
            ))}
          </div>

          {/* 消耗品子筛选 */}
          {activeCategory === 'consumable' && (
            <div className="flex flex-wrap gap-2 pl-2 border-l-2 border-slate-700">
              {[
                { key: 'all', label: '全部' },
                { key: 'food', label: '🍞 食物' },
                { key: 'medical', label: '💊 医疗' },
                { key: 'book', label: '📚 书籍' },
                { key: 'other', label: '📦 其他' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setConsumableFilter(key as ConsumableFilter)}
                  className={`
                    px-3 py-1 rounded text-xs transition-colors
                    ${consumableFilter === key 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'text-slate-500 hover:text-slate-300'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* 搜索框 */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="搜索物品..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 消耗品区域 */}
          {(activeCategory === 'all' || activeCategory === 'consumable') && filteredConsumables.length > 0 && (
            <section>
              {(activeCategory === 'all') && (
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>📦</span>
                  <span>消耗品</span>
                  <span className="text-slate-400">({filteredConsumables.reduce((s, c) => s + c.count, 0)})</span>
                </h3>
              )}
              <div className="space-y-3">
                {filteredConsumables.map(({ itemId, count }) => (
                  <ConsumableDetailCard
                    key={itemId}
                    itemId={itemId}
                    count={count}
                    onUse={() => handleUseItem(itemId)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 常驻道具区域 */}
          {(activeCategory === 'all' || activeCategory === 'permanent') && filteredPermanents.length > 0 && (
            <section>
              {(activeCategory === 'all') && (
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>🔧</span>
                  <span>常驻道具</span>
                  <span className="text-slate-400">({filteredPermanents.length})</span>
                </h3>
              )}
              <div className="space-y-3">
                {filteredPermanents.map(({ itemId }) => (
                  <PermanentDetailCard key={itemId} itemId={itemId} />
                ))}
              </div>
            </section>
          )}

          {/* 已读书籍区域 */}
          {(activeCategory === 'all' || activeCategory === 'book') && filteredBooks.length > 0 && (
            <section>
              {(activeCategory === 'all') && (
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>📚</span>
                  <span>已读书籍</span>
                  <span className="text-slate-400">({filteredBooks.length})</span>
                </h3>
              )}
              <div className="space-y-3">
                {filteredBooks.map(bookId => (
                  <BookReadCard key={bookId} bookId={bookId} />
                ))}
              </div>
            </section>
          )}

          {/* 空状态 */}
          {((activeCategory === 'consumable' && filteredConsumables.length === 0) ||
            (activeCategory === 'permanent' && filteredPermanents.length === 0) ||
            (activeCategory === 'book' && filteredBooks.length === 0)) && (
            <div className="text-center py-12">
              <span className="text-4xl">📭</span>
              <p className="text-slate-500 mt-2">暂无此类物品</p>
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="p-3 border-t border-slate-700 bg-slate-800/30 text-xs text-slate-500 text-center">
          按 ESC 键关闭背包
        </div>
      </div>
    </div>
  );
});

export default BackpackModal;
