# 事件效果说明

## 新效果类型

### 1. unlockNPC - 解锁NPC

用于在事件中解锁联系人。

```json
{
  "effects": {
    "unlockNPC": "npc_john_driver"
  }
}
```

**注意**：
- NPC ID 必须在 `public/data/npcs/` 中有对应的配置文件
- 如果NPC已解锁，不会重复解锁
- 解锁后会自动添加到聊天记录中

### 2. addDebuff - 添加Debuff

用于给玩家添加环境Debuff。

```json
{
  "effects": {
    "addDebuff": {
      "id": "debuff_unique_id",
      "name": "Debuff显示名称",
      "type": "pressure",
      "intensity": 2,
      "duration": 5
    }
  }
}
```

**字段说明**：
- `id`: Debuff唯一标识
- `name`: 显示名称
- `type`: 类型，可选 `pressure`（执法压力）或 `economic`（经济影响）
- `intensity`: 强度 1-5
- `duration`: 持续回合数

### 3. removeDebuff - 移除Debuff

用于移除已有的Debuff。

```json
{
  "effects": {
    "removeDebuff": "debuff_unique_id"
  }
}
```

## 完整示例

见 `examples_npc_debuff.json`
