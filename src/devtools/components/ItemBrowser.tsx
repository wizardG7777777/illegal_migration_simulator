/**
 * ItemBrowser 组件
 * 
 * 道具浏览器和管理器
 * - 浏览所有道具（消耗品、常驻道具、书籍）
 * - 搜索和筛选
 * - 添加道具到当前游戏状态（开发工具功能）
 */

import React, { useState, useMemo } from 'react';
import type { AnyItem as Item, ItemCategory, ConsumableItem, PermanentItem } from '../../types/item';
import { Card, Button } from '../../components/primitives';

/**
 * 道具浏览器属性
 */
interface ItemBrowserProps {
  /** 所有道具 */
  items: Item[];
  /** 添加道具回调（开发工具功能） */
  onAddItem?: (itemId: string, count?: number) => void;
}

/**
 * 获取道具图标
 */
function getItemIcon(item: Item): string {
  if (item.category === 'CONSUMABLE') {
    const subCategory = (item as ConsumableItem).subCategory;
    switch (subCategory) {
      case 'food': return '🍞';
      case 'medical': return '💊';
      case 'book': return '📚';
      default: return '📦';
    }
  }
  if (item.category === 'PERMANENT') {
    const tags = item.tags;
    if (tags.includes('transport')) return '🚗';
    if (tags.includes('lodging')) return '🏠';
    if (tags.includes('weapon')) return '⚔️';
    if (tags.includes('tool')) return '🔧';
    if (tags.includes('identity')) return '🪪';
    if (tags.includes('document')) return '📄';
    if (tags.includes('contact')) return '👤';
    if (tags.includes('guide')) return '🧭';
    return '📦';
  }
  return '📦';
}

/**
 * 获取道具分类名称
 */
function getCategoryName(category: ItemCategory): string {
  switch (category) {
    case 'CONSUMABLE': return '消耗品';
    case 'PERMANENT': return '常驻道具';
    default: return '未知';
  }
}

/**
 * 获取子分类名称
 */
function getSubCategoryName(item: Item): string {
  if (item.category === 'CONSUMABLE') {
    const sub = (item as ConsumableItem).subCategory;
    switch (sub) {
      case 'food': return '食物';
      case 'medical': return '医疗';
      case 'book': return '书籍';
      default: return '其他';
    }
  }
  return '';
}

/**
 * 道具详情弹窗
 */
function ItemDetailModal({
  item,
  onClose,
  onAdd,
}: {
  item: Item;
  onClose: () => void;
  onAdd: (count?: number) => void;
}) {
  const [count, setCount] = useState(1);
  const isConsumable = item.category === 'CONSUMABLE';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getItemIcon(item)}</span>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">{item.name}</h3>
              <p className="text-xs text-slate-500">{item.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xl leading-none px-2"
          >
            ×
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <div className="text-xs text-slate-500">分类</div>
              <div className="text-sm font-medium text-slate-200">
                {getCategoryName(item.category)}
              </div>
            </Card>
            {item.category === 'CONSUMABLE' && (
              <Card className="p-3">
                <div className="text-xs text-slate-500">子分类</div>
                <div className="text-sm font-medium text-slate-200">
                  {getSubCategoryName(item)}
                </div>
              </Card>
            )}
            {item.category === 'PERMANENT' && (
              <Card className="p-3">
                <div className="text-xs text-slate-500">优先级</div>
                <div className="text-sm font-medium text-slate-200">
                  {(item as PermanentItem).priority}
                </div>
              </Card>
            )}
            {item.category === 'CONSUMABLE' && (
              <Card className="p-3">
                <div className="text-xs text-slate-500">最大堆叠</div>
                <div className="text-sm font-medium text-slate-200">
                  {(item as ConsumableItem).maxStack}
                </div>
              </Card>
            )}
          </div>

          {/* 描述 */}
          <Card className="p-3">
            <div className="text-xs text-slate-500 mb-1">描述</div>
            <p className="text-sm text-slate-300">{item.description}</p>
          </Card>

          {/* 效果详情 */}
          {item.category === 'CONSUMABLE' && (
            <Card className="p-3">
              <div className="text-xs text-slate-500 mb-2">使用效果</div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const effects = (item as ConsumableItem).effects;
                  const labels: string[] = [];
                  if (effects.healthRestore) labels.push(`健康 +${effects.healthRestore}`);
                  if (effects.mentalRestore) labels.push(`心理 +${effects.mentalRestore}`);
                  if (effects.actionPointRestore) labels.push(`行动点 +${effects.actionPointRestore}`);
                  if (effects.attributeBonus) {
                    Object.entries(effects.attributeBonus).forEach(([attr, val]) => {
                      const names: Record<string, string> = {
                        physique: '体魄', intelligence: '智力', english: '英语',
                        social: '社交', riskAwareness: '风险意识', survival: '生存'
                      };
                      labels.push(`${names[attr] || attr} +${val}`);
                    });
                  }
                  return labels.length > 0 ? labels.map((label, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded">
                      {label}
                    </span>
                  )) : <span className="text-xs text-slate-500">无直接效果</span>;
                })()}
              </div>
            </Card>
          )}

          {item.category === 'PERMANENT' && (
            <>
              {/* 标签 */}
              <Card className="p-3">
                <div className="text-xs text-slate-500 mb-2">标签</div>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </Card>

              {/* 被动效果 */}
              {(item as PermanentItem).passiveEffects?.perTurn && (
                <Card className="p-3">
                  <div className="text-xs text-slate-500 mb-2">被动效果（每回合）</div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const perTurn = (item as PermanentItem).passiveEffects!.perTurn!;
                      const labels: string[] = [];
                      if (perTurn.healthRestore) labels.push(`健康 +${perTurn.healthRestore}`);
                      if (perTurn.mentalRestore) labels.push(`心理 +${perTurn.mentalRestore}`);
                      if (perTurn.moneyChange) labels.push(`金钱 ${perTurn.moneyChange > 0 ? '+' : ''}${perTurn.moneyChange}`);
                      return labels.map((label, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded">
                          {label}
                        </span>
                      ));
                    })()}
                  </div>
                </Card>
              )}

              {/* 维护成本 */}
              {(item as PermanentItem).upkeepCost?.moneyPerTurn ? (
                <Card className="p-3">
                  <div className="text-xs text-slate-500 mb-1">维护成本</div>
                  <div className="text-sm text-amber-400">
                    每回合 ${(item as PermanentItem).upkeepCost!.moneyPerTurn}
                  </div>
                </Card>
              ) : null}
            </>
          )}

          {/* JSON 源码 */}
          <details className="text-sm">
            <summary className="text-slate-500 cursor-pointer hover:text-slate-300">
              查看 JSON 源码
            </summary>
            <pre className="mt-2 p-3 bg-slate-900 rounded text-xs text-slate-400 font-mono overflow-auto max-h-[200px]">
              {JSON.stringify(item, null, 2)}
            </pre>
          </details>
        </div>

        {/* 底部操作 */}
        <div className="p-4 border-t border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">数量:</span>
            {isConsumable ? (
              <input
                type="number"
                min={1}
                max={(item as ConsumableItem).maxStack}
                value={count}
                onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm"
              />
            ) : (
              <span className="text-sm text-slate-500">常驻道具只能添加 1 个</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button onClick={() => onAdd(isConsumable ? count : 1)}>
              🎁 添加到游戏
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 道具浏览器组件
 */
export function ItemBrowser({ items, onAddItem }: ItemBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<ItemCategory | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // 过滤道具
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchId = item.id.toLowerCase().includes(query);
        const matchName = item.name.toLowerCase().includes(query);
        const matchTag = item.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchId && !matchName && !matchTag) return false;
      }

      // 分类过滤
      if (filterCategory !== 'all' && item.category !== filterCategory) {
        return false;
      }

      return true;
    });
  }, [items, searchQuery, filterCategory]);

  // 统计
  const stats = useMemo(() => {
    const total = items.length;
    const byCategory = {
      CONSUMABLE: items.filter(i => i.category === 'CONSUMABLE').length,
      PERMANENT: items.filter(i => i.category === 'PERMANENT').length,
    };
    const bySubCategory = {
      food: items.filter(i => i.category === 'CONSUMABLE' && (i as ConsumableItem).subCategory === 'food').length,
      medical: items.filter(i => i.category === 'CONSUMABLE' && (i as ConsumableItem).subCategory === 'medical').length,
      book: items.filter(i => i.category === 'CONSUMABLE' && (i as ConsumableItem).subCategory === 'book').length,
      other: items.filter(i => i.category === 'CONSUMABLE' && (i as ConsumableItem).subCategory === 'other').length,
    };
    return { total, byCategory, bySubCategory };
  }, [items]);

  const handleAddItem = (count?: number) => {
    if (selectedItem && onAddItem) {
      onAddItem(selectedItem.id, count);
      setSelectedItem(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="text-xs text-slate-500">总计</div>
          <div className="text-xl font-semibold text-slate-200">{stats.total}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500">消耗品</div>
          <div className="text-xl font-semibold text-green-400">{stats.byCategory.CONSUMABLE}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500">常驻道具</div>
          <div className="text-xl font-semibold text-blue-400">{stats.byCategory.PERMANENT}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500">🍞 食物</div>
          <div className="text-xl font-semibold text-amber-400">{stats.bySubCategory.food}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500">💊 医疗</div>
          <div className="text-xl font-semibold text-red-400">{stats.bySubCategory.medical}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-slate-500">📚 书籍</div>
          <div className="text-xl font-semibold text-purple-400">{stats.bySubCategory.book}</div>
        </Card>
      </div>

      {/* 过滤工具栏 */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          {/* 搜索 */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-slate-400 mb-1">搜索</label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ID、名称或标签..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 分类过滤 */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">分类</label>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as ItemCategory | 'all')}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">全部</option>
              <option value="CONSUMABLE">消耗品</option>
              <option value="PERMANENT">常驻道具</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 道具列表 */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">图标</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">ID</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">名称</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium">分类</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">标签</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr
                  key={item.id}
                  className="border-b border-slate-800 hover:bg-slate-800/50"
                >
                  <td className="py-3 px-4">
                    <span className="text-xl">{getItemIcon(item)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <code className="text-xs text-slate-500">{item.id}</code>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-300">{item.name}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[200px]">
                      {item.description.slice(0, 40)}...
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        item.category === 'CONSUMABLE'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {getCategoryName(item.category)}
                    </span>
                    {item.category === 'CONSUMABLE' && (
                      <div className="text-xs text-slate-500 mt-1">
                        {getSubCategoryName(item)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5 bg-slate-900 rounded text-slate-500"
                        >
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-xs text-slate-600">
                          +{item.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 transition-colors"
                    >
                      详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredItems.length === 0 && (
          <div className="py-8 text-center text-slate-500">没有找到匹配的道具</div>
        )}
      </Card>

      {/* 结果统计 */}
      <div className="text-sm text-slate-500 text-center py-2">
        显示 {filteredItems.length} / {items.length} 个道具
        {searchQuery && ` (搜索: "${searchQuery}")`}
      </div>

      {/* 道具详情弹窗 */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdd={handleAddItem}
        />
      )}
    </div>
  );
}

export default ItemBrowser;
