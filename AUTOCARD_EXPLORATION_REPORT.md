# AutoCard 项目代码探索报告

## 项目结构概览
- **shared/src/** - 共享类型定义和常量
- **server/src/** - 后端服务逻辑
- **client/src/** - 前端渲染和交互

---

## 1️⃣ 等级 (Level) 相关定义

### 📍 shared/src/constants.ts
```typescript
export const XP_PER_LEVEL = 8;  // 升级所需的 XP

// 每个等级对应的棋盘可用格数（最多 10 格）
// level 1→4格, 2→6格, 3→8格, 4+→10格 (每级增加 2 格)
export const BOARD_SLOTS_BY_LEVEL: Record<number, number> = {
  1: 4, 2: 6, 3: 8,
};

export function boardSlotsForLevel(level: number): number {
  return BOARD_SLOTS_BY_LEVEL[level] ?? 10;
}

// 商店刷新金币随等级提高
export function shopRefreshCostForLevel(level: number): number {
  if (level < 3) return SHOP_REFRESH_COST.bronze;    // 2金币
  if (level < 5) return SHOP_REFRESH_COST.silver;    // 4金币
  if (level < 8) return SHOP_REFRESH_COST.gold;      // 6金币
  return SHOP_REFRESH_COST.diamond;                  // 8金币
}
```

### 📍 shared/src/types/game.ts - RunState 接口
```typescript
export interface RunState {
  id: string;
  userId: string;
  heroId: string;
  status: RunStatus;
  day: number;
  hour: number;
  prestige: number;
  pvpWins: number;
  xp: number;
  level: number;              // ⭐ 玩家当前等级
  gold: number;
  hp: number;
  maxHp: number;
  board: SlotItem[];          // 玩家棋盘 (4~10 格)
  stash: SlotItem[];          // 储物箱 (10 格)
  boardSlots: number;         // ⭐ 当前可用棋盘格数（4~10）
  pendingLevelUp?: PendingLevelUpState | null;  // 升级三选一状态
  // ... 其他字段
}
```

---

## 2️⃣ 棋盘 (Board) 和格子 (Slot) 相关定义

### 📍 shared/src/constants.ts
```typescript
export const BOARD_SIZE = 10;      // 棋盘最大格数
export const STASH_SIZE = 10;      // 储物箱固定 10 格
```

### 📍 shared/src/types/game.ts - SlotItem 接口
```typescript
export interface SlotItem {
  itemId: string;
  tier: Tier;                      // bronze|silver|gold|diamond|legendary
  size: ItemSize;                  // 1 | 2 | 3（占用的格数）
  slotIndex: number;               // 在棋盘/储物箱中的起始位置
}
```

### 📍 shared/src/types/config.ts - ItemConfig
```typescript
export interface ItemConfig {
  itemId: string;
  name: string;
  description: string;
  size: ItemSize;                  // 物品占用 1、2 或 3 个格子
  baseTier: Tier;
  price: number;
  cooldown: number;
  ports: Port[];
  // ... 其他字段
}
```

---

## 3️⃣ 服务端 (Server) - 玩家等级处理

### 📍 server/src/models/Run.ts - MongoDB 模型
```typescript
export interface IRun extends Document {
  userId: Types.ObjectId;
  heroId: string;
  level: number;              // ⭐ 玩家等级（1 起始）
  xp: number;                 // 当前经验值
  gold: number;
  hp: number;
  maxHp: number;
  board: SlotItem[];          // 当前棋盘卡牌数组
  stash: SlotItem[];          // 储物箱卡牌数组
  boardSlots: number;         // ⭐ 当前可用格数（默认 4，最多 10）
  pendingLevelUp?: PendingLevelUpState | null;
  // ... 其他字段
}

const RunSchema = new Schema<IRun>({
  level: { type: Number, default: 1 },
  boardSlots: { type: Number, default: 4 },
  // ... 其他字段
});
```

### 📍 server/src/services/RunService.ts - 升级逻辑

#### 新游戏开始（初始化）
```typescript
async startRun(userId: string, heroId: string): Promise<RunState> {
  const startingBoard: SlotItem[] = hero.startingItems.map((itemId, i) => {
    const cfg = ALL_ITEMS_MAP.get(itemId)!;
    return { itemId, tier: cfg.baseTier, size: cfg.size, slotIndex: i };
  });

  const run = await RunModel.create({
    level: 1,                           // 初始等级 = 1
    xp: 0,
    boardSlots: boardSlotsForLevel(1),  // = 4 格
    board: startingBoard,
    stash: [],
    // ...
  });
}
```

#### 获得 XP 并升级
```typescript
private gainXp(run: IRun, amount: number) {
  run.xp += amount;
  
  while (run.xp >= XP_PER_LEVEL) {  // XP_PER_LEVEL = 8
    run.xp -= XP_PER_LEVEL;
    run.level += 1;                 // ⭐ 等级 +1
    
    const hero = HEROES.find(h => h.heroId === run.heroId);
    if (hero) {
      run.maxHp += hero.hpPerLevel;
      run.hp = Math.min(run.maxHp, run.hp + hero.hpPerLevel);
    }
    
    // ⭐ 根据新等级更新可用格数
    run.boardSlots = boardSlotsForLevel(run.level);
    
    // 生成升级三选一（解锁格子、升阶卡牌、增加生命）
    if (!run.pendingLevelUp) {
      run.pendingLevelUp = this.generateLevelUpChoices(run);
      run.markModified('pendingLevelUp');
    }
  }
}
```

#### 升级三选一选项生成
```typescript
private generateLevelUpChoices(run: IRun): {
  level: number;
  choices: { label: string; kind: string }[]
} {
  const canUnlockSlot = run.boardSlots < 10;  // 还未达到最大值（10）
  return {
    level: run.level,
    choices: [
      canUnlockSlot
        ? { label: '解锁棋盘格（+1格）', kind: 'unlock_slot' }     // ⭐ 解锁格子选项
        : { label: '生命上限 +5', kind: 'bonus_hp' },
      { label: '升阶一张卡牌（随机）', kind: 'upgrade_item' },
      { label: '生命上限 +10，治疗 10', kind: 'bonus_hp_heal' },
    ],
  };
}
```

#### 商店物品生成（与等级挂钩）
```typescript
private tierPickWeight(level: number, tier: string): number {
  if (level < 3) return tier === 'bronze' ? 1 : 0;      // 只有 bronze
  if (level < 5) {
    return tier === 'bronze' ? 1 : tier === 'silver' ? 0.5 : 0;
  }
  if (level < 8) {
    return tier === 'legendary' ? 0 : 
           tier === 'diamond' ? 0.3 : 
           tier === 'gold' ? 0.5 : 1;
  }
  // level >= 8，所有等级都有概率出现
  return tier === 'legendary' ? 0.2 : 1;
}
```

---

## 4️⃣ 客户端 (Client) - 棋盘渲染

### 📍 client/src/ui/layout.ts - 棋盘尺寸常量
```typescript
export const CARD_UNIT = 88;      // 单个卡牌单位宽度
export const CARD_GAP = 6;        // 卡牌间距
export const CARD_H = 110;        // 卡牌高度

export function cardWidth(size: 1 | 2 | 3): number {
  return CARD_UNIT * size + CARD_GAP * (size - 1);
  // size=1: 88   size=2: 182   size=3: 276
}

// 布局区域划分
export const Z3_Y = 340;          // 棋盘区域 Y 坐标
export const Z3_H = 156;          // 棋盘区域高度
export const Z3_CARD_Y = Z3_Y + 22;  // 卡牌绘制 Y 坐标
```

### 📍 client/src/ui/BoardRow.ts - 棋盘行组件
```typescript
export class BoardRow extends Container {
  private _slotCount: number;      // ⭐ 当前格数（4~10）
  get slotCount(): number { return this._slotCount; }
  private items: SlotItem[] = [];
  
  constructor(slotCount = 10) {
    super();
    this._slotCount = slotCount;
    this.drawBgSlots();            // 绘制 slotCount 个背景格子
  }

  private drawBgSlots() {
    for (let i = 0; i < this._slotCount; i++) {
      const g = new Graphics();
      g.roundRect(0, 0, CARD_UNIT, CARD_H, 6);
      g.fill({ color: 0x1a1a2e, alpha: 0.5 });
      g.x = i * (CARD_UNIT + CARD_GAP);  // 按 slotIndex 排列
      this.bgSlots.addChild(g);
    }
  }

  update(items: SlotItem[]) {
    this.items = [...items];
    for (const item of items) {
      const card = new CardView(item);
      // ⭐ 根据 item.slotIndex 和 size 计算位置
      card.x = item.slotIndex * (CARD_UNIT + CARD_GAP);
      this.cardsLayer.addChild(card);
    }
  }
  
  // 拖拽时动态计算目标格子
  private getSlotAtLocal(localX: number): number {
    const step = CARD_UNIT + CARD_GAP;
    const idx = Math.round(localX / step);
    if (idx < 0 || idx >= this._slotCount) return -1;
    return idx;
  }
}
```

### 📍 client/src/ui/CardView.ts - 卡牌视图
```typescript
export class CardView extends Container {
  constructor(item: SlotItem) {
    super();
    this.size = item.size;           // ⭐ 1、2 或 3
    this.draw();
    const w = cardWidth(this.size);  // 根据 size 计算宽度
    this.hitArea = new Rectangle(0, 0, w, CARD_H);
  }

  private draw() {
    const w = cardWidth(this.size);   // size=1→88   size=2→182   size=3→276
    const h = CARD_H;                 // 110
    
    // 绘制卡牌边框、背景、文字等
    const border = new Graphics();
    border.roundRect(-2, -2, w + 4, h + 4, 8);
    border.fill({ color: TIER_COLORS[this.tier] ?? 0x555555, alpha: 0.9 });
    this.addChild(border);
  }
}
```

### 📍 client/src/ui/BottomBar.ts - 玩家信息栏
```typescript
update(run: RunState) {
  this.hpText.text = `HP ${run.hp}/${run.maxHp}`;
  this.goldText.text = `${run.gold} G`;
  this.prestigeText.text = `声望 ${run.prestige}`;
  // ⭐ 显示等级、XP 进度、PvP 胜场等
  this.infoText.text = 
    `Lv.${run.level}  XP ${run.xp}/8  PvP ${run.pvpWins}/10  Day${run.day} H${run.hour}`;
}
```

### 📍 client/src/scenes/MainScene.ts - 主场景
```typescript
async onEnter() {
  const run = gameState.run!;
  
  // ⭐ 根据 run.boardSlots 创建棋盘
  const boardSlots = run.boardSlots ?? 10;
  this.boardRow = new BoardRow(boardSlots);
  this.boardRow.y = Z3_CARD_Y;
  this.boardRow.containerType = 'board';
  this.boardRow.update(run.board);      // 放置卡牌
  this.addChild(this.boardRow);

  // 储物箱始终 10 格
  this.stashRow = new BoardRow(10);
  this.stashRow.containerType = 'stash';
  this.stashRow.update(run.stash);
  this.addChild(this.stashRow);
}

// 当升级时动态调整棋盘格数
private refresh() {
  const run = gameState.run!;
  const newBoardSlots = run.boardSlots ?? 10;
  
  if (this.boardRow.slotCount !== newBoardSlots) {
    // 格数变化，重建棋盘行
    this.removeChild(this.boardRow);
    this.boardRow = new BoardRow(newBoardSlots);  // ⭐ 重新创建，格子数量可能增加
    this.boardRow.x = INNER_X;
    this.boardRow.y = Z3_CARD_Y;
    this.addChild(this.boardRow);
  }
  
  this.boardRow.update(run.board);
}
```

---

## 5️⃣ 关键数据流总结

### 🔄 升级 → 解锁格子流程
```
1. PvE 或 PvP 战斗获胜
   ↓
2. 获得 XP，调用 gainXp()
   ↓
3. 当 xp >= 8 时，level++，boardSlots 更新
   ↓
4. 生成 pendingLevelUp 三选一（如果还有格子，选项包括"解锁格子"）
   ↓
5. 玩家选择"解锁格子" → handleLevelUpChoice()
   ↓
6. boardSlots 已在 gainXp 中更新完成 ✓
   （无需在选择处再次更新）
   ↓
7. pendingLevelUp 清空，返回主场景
   ↓
8. MainScene.refresh() 检测 boardSlots 变化
   ↓
9. 重建 BoardRow，格子数 +1 ✓
```

### 📊 等级→商店物品类型映射
```
Level 1-2   → 仅 Bronze 品质
Level 3-4   → Bronze 为主，Silver 偶现
Level 5-7   → 全系出现，Legendary 不出
Level 8+    → 全系出现，包括 Legendary
```

---

## 6️⃣ 关键文件路径速查表

| 功能 | 文件路径 | 关键对象 |
|------|---------|--------|
| **等级常量** | `shared/src/constants.ts` | `XP_PER_LEVEL`, `BOARD_SLOTS_BY_LEVEL`, `boardSlotsForLevel()` |
| **类型定义** | `shared/src/types/game.ts` | `RunState`, `SlotItem`, `PendingLevelUpState` |
| **配置定义** | `shared/src/types/config.ts` | `ItemConfig` (size 字段) |
| **Run 模型** | `server/src/models/Run.ts` | `IRun` interface, level, boardSlots |
| **升级逻辑** | `server/src/services/RunService.ts` | `gainXp()`, `generateLevelUpChoices()`, `handleLevelUpChoice()` |
| **棋盘尺寸** | `client/src/ui/layout.ts` | `CARD_UNIT`, `CARD_H`, `cardWidth()` |
| **棋盘组件** | `client/src/ui/BoardRow.ts` | `BoardRow` class, `slotCount` 属性 |
| **卡牌组件** | `client/src/ui/CardView.ts` | `CardView` class, size 处理 |
| **信息栏** | `client/src/ui/BottomBar.ts` | 显示 level, xp, pvpWins |
| **主场景** | `client/src/scenes/MainScene.ts` | 棋盘初始化和动态调整 |

---

## ✅ 关键发现

1. **等级范围**：1~无限（理论上）
2. **格子范围**：4~10 格（根据等级递增）
3. **升级条件**：累积 8 XP
4. **解锁机制**：升级时若格子 < 10，提供"解锁格子"选项
5. **动态调整**：`MainScene.refresh()` 监听 boardSlots 变化，动态重建棋盘
6. **卡牌尺寸**：1、2、3 格，影响棋盘排列和计算
7. **储物箱固定**：始终 10 格，不受等级影响

