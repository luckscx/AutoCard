# 🎯 AutoCard 项目 — 等级、棋盘、格子 快速参考

## 📦 核心数据结构

### RunState (玩家运行状态)
```
level: number                  // 当前等级 (1 起始)
boardSlots: number            // 可用棋盘格数 (4~10)
xp: number                    // 经验值 (0~8)
board: SlotItem[]             // 棋盘上的卡牌数组
stash: SlotItem[]             // 储物箱的卡牌数组 (固定 10 格)
pendingLevelUp: {             // 升级三选一状态
  level: number
  choices: { label, kind }[]
}
```

### SlotItem (棋盘卡牌)
```
itemId: string                // 物品 ID
tier: Tier                    // 等阶 (bronze|silver|gold|diamond|legendary)
size: 1|2|3                   // 占用格数
slotIndex: number             // 在棋盘中的起始位置 (0-indexed)
```

---

## ⚙️ 关键常数

| 常数 | 值 | 说明 |
|------|-----|------|
| `XP_PER_LEVEL` | 8 | 升级所需 XP |
| `BOARD_SIZE` | 10 | 最大棋盘格数 |
| `STASH_SIZE` | 10 | 储物箱固定格数 |

---

## 📊 等级 → 棋盘格数 映射

| 等级 | 棋盘格数 |
|------|----------|
| 1 | 4 |
| 2 | 6 |
| 3 | 8 |
| 4+ | 10 |

**代码位置**：`shared/src/constants.ts` → `BOARD_SLOTS_BY_LEVEL`

---

## 🔄 升级流程 (Backend)

```
gainXp(amount) 被调用
  ↓
while (xp >= 8)
  xp -= 8
  level++
  boardSlots = boardSlotsForLevel(level)  // 格数更新
  maxHp += hero.hpPerLevel
  hp = min(maxHp, hp + hpPerLevel)
  pendingLevelUp = generateLevelUpChoices()  // 生成三选一
  ↓
generateLevelUpChoices():
  canUnlockSlot = (boardSlots < 10)
  if canUnlockSlot:
    choice[0] = "解锁棋盘格（+1格）"
  else:
    choice[0] = "生命上限 +5"
  choice[1] = "升阶一张卡牌（随机）"
  choice[2] = "生命上限 +10，治疗 10"
```

---

## 🎨 前端棋盘渲染

### 尺寸常数
```
CARD_UNIT = 88              // 单位宽
CARD_GAP = 6                // 间距
CARD_H = 110                // 卡牌高
```

### 计算公式
```
cardWidth(size) = CARD_UNIT * size + CARD_GAP * (size - 1)

size=1: 88
size=2: 182
size=3: 276
```

### 绘制流程
```
new BoardRow(boardSlots)
  → drawBgSlots()  // 绘制 boardSlots 个背景格子
  ↓
update(items: SlotItem[])
  → for each item:
      card.x = item.slotIndex * (CARD_UNIT + CARD_GAP)
      // 卡牌占用宽度: cardWidth(item.size)
```

---

## 📍 关键代码位置

| 需求 | 文件 | 行号 |
|------|------|-----|
| 升级条件 | `shared/src/constants.ts` | L4 |
| 格子映射 | `shared/src/constants.ts` | L59-64 |
| 商店等级调整 | `shared/src/constants.ts` | L25-30 |
| RunState 定义 | `shared/src/types/game.ts` | L54-77 |
| SlotItem 定义 | `shared/src/types/game.ts` | L27-32 |
| Run 模型 | `server/src/models/Run.ts` | L49-78 |
| gainXp 逻辑 | `server/src/services/RunService.ts` | L505-523 |
| 升级选项生成 | `server/src/services/RunService.ts` | L525-537 |
| 商店物品生成 | `server/src/services/RunService.ts` | L607-643 |
| 棋盘尺寸常数 | `client/src/ui/layout.ts` | L4-10 |
| BoardRow 组件 | `client/src/ui/BoardRow.ts` | 全文 |
| CardView 组件 | `client/src/ui/CardView.ts` | 全文 |
| 主场景 | `client/src/scenes/MainScene.ts` | L85-96, 314-329 |
| 信息栏 | `client/src/ui/BottomBar.ts` | L64-69 |

---

## 🚀 动态棋盘调整

当升级后 boardSlots 增加时：

```
MainScene.refresh()
  ↓
newBoardSlots = run.boardSlots ?? 10
  ↓
if (boardRow.slotCount !== newBoardSlots)
  removeChild(boardRow)
  boardRow = new BoardRow(newBoardSlots)  // ⭐ 创建更多格子
  addChild(boardRow)
  ↓
boardRow.update(run.board)  // 重新放置卡牌
```

---

## ✨ 快速检查清单

- [ ] 玩家等级范围：1 ~ ∞
- [ ] 棋盘格数范围：4 ~ 10
- [ ] 升级需要 XP：8
- [ ] 默认棋盘格数（等级 1）：4
- [ ] 最大棋盘格数：10（等级 4+）
- [ ] 储物箱格数：固定 10
- [ ] 卡牌尺寸选项：1, 2, 3
- [ ] 格子自动增加：YES（升级时自动 +2，等级 1: 4格 → 等级 4: 10格）
- [ ] 格子需要选择：NO（自动生效，只提供选项）
- [ ] 棋盘动态重建：YES（detectSlotCount 变化时）

