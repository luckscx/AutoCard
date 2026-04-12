# 怪物战斗 Bug 修复文档

# 🐛 AutoCard 怪物点击战斗错误 - 完整分析报告

## 📋 问题概述

**症状**: 用户点击怪物时弹出报错，错误信息："未定义的物品" 且没有开始和怪物的战斗
**根本原因**: 物品库配置不一致导致战斗初始化失败

---

## 🔍 问题根源分析

### 核心问题：两个物品库不同步

项目中存在两个独立的物品库：
- **ITEMS_MAP** - 基础物品库 (`server/src/game/config/items.ts`)
- **BAZAAR_ITEMS_MAP** - 大巴扎物品库 (`server/src/game/config/bazaar_items.ts`)

**关键矛盾**: 
- `RunService.ts` 合并了两个库：`const ALL_ITEMS_MAP = new Map([...ITEMS_MAP, ...BAZAAR_ITEMS_MAP])`
- 但 `battle.ts` 的 `resolvePveBattle()` 只查看 `ITEMS_MAP`

### 详细流程分析

#### 1️⃣ 客户端层面

**文件**: `client/src/scenes/MainScene.ts` 
**行数**: 517-546

```typescript
private showPveButtons(runId: string) {
  const difficulties = [
    { label: '简单怪物', diff: 'easy' as const, color: 0x4ad97a },
    { label: '中等怪物', diff: 'medium' as const, color: 0xd9c44a },
    { label: '困难怪物', diff: 'hard' as const, color: 0xd94a4a },
  ];

  difficulties.forEach((d, i) => {
    const btn = new Button(d.label, 260, 56, d.color);
    btn.on('pointertap', async () => {
      try {
        const boardSnap = [...gameState.run!.board];
        const result = await api.pve(runId, d.diff);  // ⬅️ 关键调用
        // ...
      } catch (e: any) {
        console.error('pve failed:', e.message);
        alert(e.message || '战斗开始失败');  // ⬅️ 错误弹窗
      }
    });
  });
}
```

#### 2️⃣ API 层面

**文件**: `client/src/api/client.ts` L50-51

```typescript
pve: (runId: string, difficulty: 'easy' | 'medium' | 'hard') =>
  request<PveResponse>('POST', '/run/pve', { runId, difficulty }),
```

#### 3️⃣ 服务端路由层

**文件**: `server/src/api/run.ts` L49-54

```typescript
router.post('/pve', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { runId, difficulty } = req.body;
  const result = await runService.handlePve(runId, userId, difficulty);
  res.json(result);
}));
```

#### 4️⃣ 业务逻辑层 - RunService

**文件**: `server/src/services/RunService.ts` L145-204

```typescript
async handlePve(runId: string, userId: string, difficulty: 'easy' | 'medium' | 'hard') {
  const run = await this.getActiveRun(runId, userId);
  const hourType = HOUR_TYPE[run.hour as keyof typeof HOUR_TYPE];
  if (hourType !== 'pve') throw new Error(`Hour ${run.hour} is not PvE hour`);

  const monsters = getMonstersByDifficulty(difficulty);
  const monster = monsters[Math.floor(Math.random() * monsters.length)];

  // ⬇️ 关键调用 - 这里会出错！
  const battleResult = resolvePveBattle(
    { hp: run.hp, maxHp: run.maxHp, level: run.level, board: run.board },
    monster,
  );
```

#### 5️⃣ 战斗引擎层 - ❌ 问题所在！

**文件**: `server/src/game/battle.ts` L16-71

```typescript
export function resolvePveBattle(
  player: Combatant,
  monster: MonsterConfig,
): BattleResult {
  let monsterBoard: SlotItem[];

  if (monster.battleBoard && monster.battleBoard.length > 0) {
    monsterBoard = monster.battleBoard.map(slot => {
      const cfg = ITEMS_MAP.get(slot.itemId);  // ❌ 只查 ITEMS_MAP！
      if (!cfg) throw new Error(`Unknown monster item: ${slot.itemId}`);  // ❌ 错误源
      return {
        itemId: slot.itemId,
        tier: slot.tier ?? cfg.baseTier,
        size: cfg.size,
        slotIndex: slot.slotIndex,
      };
    });
  }
  // ...
}
```

---

## 🎯 完整错误链条

```
用户点击"简单怪物" (MainScene.ts:528)
  ↓
api.pve(runId, 'easy') (client/src/api/client.ts:50)
  ↓
POST /run/pve (server/src/api/run.ts:49)
  ↓
runService.handlePve() (RunService.ts:145)
  ↓
resolvePveBattle(playerData, monster) (RunService.ts:153)  ⬅️ 调用这里
  ↓
battle.ts:22-32 检查 monster.battleBoard
  ↓
battle.ts:24 ITEMS_MAP.get(slot.itemId)
  ✗ 物品不存在（因为它在 BAZAAR_ITEMS_MAP 中）
  ↓
battle.ts:25 throw new Error(`Unknown monster item: ${slot.itemId}`)
  ↓
server/src/api/run.ts:24 捕获并返回 400 错误
  ↓
client alert("Unknown monster item: 物品名")
```

---

## 📍 核心问题代码

### ❌ battle.ts 第 24-25 行

```typescript
const cfg = ITEMS_MAP.get(slot.itemId);  // ❌ 只查基础库
if (!cfg) throw new Error(`Unknown monster item: ${slot.itemId}`);
```

### ✓ RunService.ts 第 12 行（已正确合并）

```typescript
const ALL_ITEMS_MAP = new Map([...ITEMS_MAP, ...BAZAAR_ITEMS_MAP]);  // ✓
```

### ✓ RunService.ts 第 191 行（已正确使用）

```typescript
const cfg = ALL_ITEMS_MAP.get(slot.itemId);  // ✓ 使用合并库
```

---

## 📊 受影响的代码位置

### 关键文件清单

| 文件 | 行号 | 问题 | 优先级 |
|-----|------|------|--------|
| **server/src/game/battle.ts** | **24** | ❌ 使用了错误的物品库 | **🔴 高** |
| server/src/services/RunService.ts | 12 | ⚠️ 物品库定义但未在 battle.ts 中使用 | 🟡 中 |
| server/src/api/run.ts | 49-54 | ✓ 正常处理 | 🟢 低 |
| client/src/scenes/MainScene.ts | 517-546 | ✓ 正常处理错误 | 🟢 低 |

---

## 🔧 解决方案

### 推荐方案：修改 battle.ts 使用统一的物品库

**步骤 1**: 修改 `server/src/game/battle.ts` 导入

```typescript
// 修改导入，添加 BAZAAR_ITEMS_MAP
import { ITEMS_MAP, BAZAAR_ITEMS_MAP } from './config/index.js';
```

**步骤 2**: 创建合并的物品库

```typescript
// 在 resolveBattle 和 resolvePveBattle 前添加
const ALL_ITEMS_MAP = new Map([...ITEMS_MAP, ...BAZAAR_ITEMS_MAP]);
```

**步骤 3**: 修改 resolvePveBattle 函数

```typescript
export function resolvePveBattle(
  player: Combatant,
  monster: MonsterConfig,
): BattleResult {
  let monsterBoard: SlotItem[];

  if (monster.battleBoard && monster.battleBoard.length > 0) {
    monsterBoard = monster.battleBoard.map(slot => {
      const cfg = ALL_ITEMS_MAP.get(slot.itemId);  // ⬅️ 修改这里！
      if (!cfg) throw new Error(`Unknown monster item: ${slot.itemId}`);
      return {
        itemId: slot.itemId,
        tier: slot.tier ?? cfg.baseTier,
        size: cfg.size,
        slotIndex: slot.slotIndex,
      };
    });
  }
  // ... 其余代码保持不变 ...
}
```

---

## ✅ 验证清单

测试修复是否成功：

- [ ] 编译通过
- [ ] 点击"简单怪物"不报错
- [ ] 点击"中等怪物"不报错
- [ ] 点击"困难怪物"不报错
- [ ] 战斗场景正常显示怪物物品
- [ ] 多次重试后仍然正常（确保所有随机怪物都能工作）

---

## 📎 相关文件导航

**需要修改**:
- `server/src/game/battle.ts` - 主要修复位置

**参考文件**:
- `server/src/game/config/items.ts` - 基础物品库定义
- `server/src/game/config/bazaar_items.ts` - 大巴扎物品库定义
- `server/src/game/config/monsters.ts` - 怪物配置（使用的物品）
- `server/src/services/RunService.ts` - 参考如何正确使用 ALL_ITEMS_MAP

**相关前端文件**:
- `client/src/scenes/MainScene.ts` - 怪物选择和错误处理
- `client/src/api/client.ts` - API 调用
- `client/src/scenes/BattleScene.ts` - 战斗显示

---

# 代码对比 - 修复前后

## 问题所在：battle.ts

### ❌ 修复前 (当前代码)

**文件**: `server/src/game/battle.ts`

```typescript
import type { SlotItem, BattleResult, BattleEvent, BattleSnapshot, MonsterConfig } from '@autocard/shared';
import { ITEMS_MAP } from './config/index.js';  // ⚠️ 只导入了 ITEMS_MAP
import { runBattleEngine } from './battle/engine.js';

interface Combatant {
  hp: number;
  maxHp: number;
  level: number;
  board: SlotItem[];
}

export function resolveBattle(attacker: Combatant, defender: Combatant): { attackerWon: boolean; attackerHpLeft: number; defenderHpLeft: number; events: BattleEvent[]; snapshots: BattleSnapshot[] } {
  return runBattleEngine(attacker, defender);
}

export function resolvePveBattle(
  player: Combatant,
  monster: MonsterConfig,
): BattleResult {
  let monsterBoard: SlotItem[];

  if (monster.battleBoard && monster.battleBoard.length > 0) {
    monsterBoard = monster.battleBoard.map(slot => {
      const cfg = ITEMS_MAP.get(slot.itemId);  // ❌ 问题：只查 ITEMS_MAP
      if (!cfg) throw new Error(`Unknown monster item: ${slot.itemId}`);  // ❌ 这里会抛错
      return {
        itemId: slot.itemId,
        tier: slot.tier ?? cfg.baseTier,
        size: cfg.size,
        slotIndex: slot.slotIndex,
      };
    });
  } else {
    // ... 其他代码 ...
  }
  // ...
}
```

### ✅ 修复后 (新代码)

**文件**: `server/src/game/battle.ts`

```typescript
import type { SlotItem, BattleResult, BattleEvent, BattleSnapshot, MonsterConfig } from '@autocard/shared';
import { ITEMS_MAP, BAZAAR_ITEMS_MAP } from './config/index.js';  // ✅ 导入两个库
import { runBattleEngine } from './battle/engine.js';

// ✅ 创建合并的物品库
const ALL_ITEMS_MAP = new Map([...ITEMS_MAP, ...BAZAAR_ITEMS_MAP]);

interface Combatant {
  hp: number;
  maxHp: number;
  level: number;
  board: SlotItem[];
}

export function resolveBattle(attacker: Combatant, defender: Combatant): { attackerWon: boolean; attackerHpLeft: number; defenderHpLeft: number; events: BattleEvent[]; snapshots: BattleSnapshot[] } {
  return runBattleEngine(attacker, defender);
}

export function resolvePveBattle(
  player: Combatant,
  monster: MonsterConfig,
): BattleResult {
  let monsterBoard: SlotItem[];

  if (monster.battleBoard && monster.battleBoard.length > 0) {
    monsterBoard = monster.battleBoard.map(slot => {
      const cfg = ALL_ITEMS_MAP.get(slot.itemId);  // ✅ 修复：查合并后的库
      if (!cfg) throw new Error(`Unknown monster item: ${slot.itemId}`);  // ✓ 现在能找到物品
      return {
        itemId: slot.itemId,
        tier: slot.tier ?? cfg.baseTier,
        size: cfg.size,
        slotIndex: slot.slotIndex,
      };
    });
  } else {
    // ... 其他代码 ...
  }
  // ...
}
```

---

## 对比总结

### 第1行：导入部分

| 修复前 | 修复后 |
|-------|-------|
| `import { ITEMS_MAP } from './config/index.js';` | `import { ITEMS_MAP, BAZAAR_ITEMS_MAP } from './config/index.js';` |

### 第3行：物品库定义

| 修复前 | 修复后 |
|-------|-------|
| 无 | `const ALL_ITEMS_MAP = new Map([...ITEMS_MAP, ...BAZAAR_ITEMS_MAP]);` |

### 第24行：关键修复

| 修复前 | 修复后 |
|-------|-------|
| `const cfg = ITEMS_MAP.get(slot.itemId);` | `const cfg = ALL_ITEMS_MAP.get(slot.itemId);` |

---

## 对标的正确实现

### ✅ RunService.ts 中的正确做法 (参考)

**文件**: `server/src/services/RunService.ts`

```typescript
// L12 - 已经正确合并了
const ALL_ITEMS_MAP = new Map([...ITEMS_MAP, ...BAZAAR_ITEMS_MAP]);

// L191 - 已经正确使用
const monsterBoard: SlotItem[] = monster.battleBoard && monster.battleBoard.length > 0
  ? monster.battleBoard.map(slot => {
      const cfg = ALL_ITEMS_MAP.get(slot.itemId);  // ✓ 正确使用合并库
      return cfg
        ? { itemId: slot.itemId, tier: (slot.tier ?? cfg.baseTier) as SlotItem['tier'], 
            size: cfg.size as SlotItem['size'], slotIndex: slot.slotIndex }
        : { itemId: slot.itemId, tier: (slot.tier ?? 'bronze') as SlotItem['tier'], 
            size: 1 as SlotItem['size'], slotIndex: slot.slotIndex };
    })
  : [{ itemId: '__monster_attack', tier: 'bronze' as const, size: 1 as const, slotIndex: 0 }];
```

---

## 数据流分析

### 怪物配置中的物品

**文件**: `server/src/game/config/monsters.ts`

```typescript
export const MONSTERS: MonsterConfig[] = [
  {
    monsterId: 'slime',
    battleBoard: [{ itemId: '毒刺', slotIndex: 0 }],  // ← 在哪里定义？
    // ...
  },
];
```

### 物品定义位置

**文件**: `server/src/game/config/bazaar_items.ts`

```typescript
export const BAZAAR_ITEMS: ItemConfig[] = [
  {
    itemId: '毒刺',           // ← 这里！在 BAZAAR_ITEMS 中
    name: '毒刺',
    // ...
  },
  // ... 其他所有怪物物品都在这里 ...
];
```

### 物品库合并

**文件**: `server/src/game/config/index.ts`

```typescript
export const ITEMS_MAP = new Map(ITEMS.map(i => [i.itemId, i]));
export const BAZAAR_ITEMS_MAP = new Map(BAZAAR_ITEMS.map(i => [i.itemId, i]));
```

---

## 流程验证

### ✅ 修复后的执行流程

```
1. 用户点击"简单怪物"
2. RunService.handlePve() 被调用
3. 获取随机怪物：slime（battleBoard: ['毒刺']）
4. 调用 resolvePveBattle()
5. 遍历 battleBoard 中的物品
   └─ 尝试查找 '毒刺'
      └─ ALL_ITEMS_MAP.get('毒刺')
         └─ ✓ 在 BAZAAR_ITEMS_MAP 中找到！
      └─ 成功构建 monsterBoard
6. runBattleEngine() 正常执行
7. 返回 BattleResult
8. ✅ 客户端接收到正确的战斗数据
9. ✅ BattleScene 正常显示
```

---

## 关键改动汇总

| 项目 | 改动 | 原因 |
|-----|------|------|
| **导入** | 添加 `BAZAAR_ITEMS_MAP` | 需要访问大巴扎中的物品 |
| **库定义** | 添加 `ALL_ITEMS_MAP` 合并 | 统一物品查询入口 |
| **查询** | 改用 `ALL_ITEMS_MAP` | 涵盖所有物品库中的物品 |

---

## 测试用例

### 应该通过的场景

```typescript
// Easy 怪物 - slime
const slime = MONSTERS[0];  // battleBoard: ['毒刺']
ALL_ITEMS_MAP.get('毒刺');  // ✓ 应该返回物品配置

// Medium 怪物 - goblin_shaman
const goblin = MONSTERS[2];  // battleBoard: ['蒸汽汤勺', '硫磺']
ALL_ITEMS_MAP.get('蒸汽汤勺');  // ✓ 应该返回物品配置
ALL_ITEMS_MAP.get('硫磺');      // ✓ 应该返回物品配置

// Hard 怪物 - dragon_whelp
const dragon = MONSTERS[4];  // battleBoard: ['熔岩压路机', '加热箱']
ALL_ITEMS_MAP.get('熔岩压路机');  // ✓ 应该返回物品配置
ALL_ITEMS_MAP.get('加热箱');      // ✓ 应该返回物品配置
```

---

## 完整修改检查表

- [ ] 导入语句包含 `BAZAAR_ITEMS_MAP`
- [ ] 创建了 `ALL_ITEMS_MAP` 合并库
- [ ] `resolvePveBattle()` 中的 `ITEMS_MAP.get()` 改为 `ALL_ITEMS_MAP.get()`
- [ ] 文件编译无错误
- [ ] 功能测试通过

---

# Monster PvE Battle Bug - Fix Applied

## Summary
The bug where players received "未定义的物品" (undefined item) errors when clicking on PvE monsters has been **FIXED**.

## Root Cause
The `resolvePveBattle()` function in `server/src/game/battle.ts` was only looking up monster items in `ITEMS_MAP`, but all monster items are defined in `BAZAAR_ITEMS_MAP`. When a monster with items from the bazaar items library was encountered, the lookup would fail and throw an error.

## Fix Applied
**File:** `server/src/game/battle.ts`

### Changes Made:
1. **Line 2:** Added import of `BAZAAR_ITEMS_MAP`
   ```typescript
   import { ITEMS_MAP, BAZAAR_ITEMS_MAP } from './config/index.js';
   ```

2. **Line 13:** Created merged item map
   ```typescript
   const ALL_ITEMS_MAP = new Map([...ITEMS_MAP, ...BAZAAR_ITEMS_MAP]);
   ```

3. **Line 27:** Updated item lookup to use merged map
   ```typescript
   const cfg = ALL_ITEMS_MAP.get(slot.itemId);  // Changed from ITEMS_MAP
   ```

## Verification
The fix ensures that all 6 PvE monsters can now be properly initialized:
- **Easy:** Slime (毒刺), Rat King (迷你弯刀, 毒液)
- **Medium:** Goblin Shaman (蒸汽汤勺, 硫磺), Stone Golem (巴努叶, 珍珠, 恶蚊)
- **Hard:** Dragon Whelp (熔岩压路机, 加热箱), Lich (冰霜9000, 神经毒素, 灵质)

## Testing Recommendations
1. Click on each difficulty level (Easy, Medium, Hard) buttons in MainScene
2. Verify battle scenes load without errors
3. Confirm all monster items display correctly on their battle boards
4. Test combat mechanics work as expected

## Commit
- Hash: `af02dae`
- Message: "Fix monster PvE battle initialization error by merging item maps"
- Status: ✅ Applied and committed to main branch

---

# 🎯 怪物战斗错误 - 快速参考

## 问题症状
- ❌ 用户点击"简单怪物"、"中等怪物"或"困难怪物"按钮
- ❌ 弹出 alert: "Unknown monster item: [物品名]" 或 "战斗开始失败"
- ❌ 没有进入战斗场景

## 问题根源
```
battle.ts 第 24 行使用了错误的物品库
  const cfg = ITEMS_MAP.get(slot.itemId);  // ❌ 只查 ITEMS_MAP
  
但怪物的物品在 BAZAAR_ITEMS_MAP 中
  const cfg = ALL_ITEMS_MAP.get(slot.itemId);  // ✓ 应该查合并的库
```

## 关键代码路径
```
点击按钮 (MainScene.ts:528)
    ↓
调用 API (api/client.ts:50)
    ↓
服务端路由 (api/run.ts:49)
    ↓
业务逻辑 (RunService.ts:153) 调用 resolvePveBattle()
    ↓
❌ battle.ts:24-25 出错（只查 ITEMS_MAP）
    ↓
返回 400 错误
    ↓
显示错误弹窗 (MainScene.ts:542)
```

## 文件位置

| 文件 | 行号 | 说明 |
|-----|------|------|
| **server/src/game/battle.ts** | **22-32** | ⚠️ **需要修改** |
| server/src/services/RunService.ts | 12, 191 | 已正确实现 |
| server/src/api/run.ts | 49-54 | 路由处理 |
| client/src/scenes/MainScene.ts | 517-546 | 前端按钮 |

## 修复步骤

### 1. 打开 `server/src/game/battle.ts`

### 2. 在文件顶部导入 BAZAAR_ITEMS_MAP

```typescript
import { ITEMS_MAP, BAZAAR_ITEMS_MAP } from './config/index.js';
```

### 3. 在导出函数前添加合并库

```typescript
// 创建合并的物品库
const ALL_ITEMS_MAP = new Map([...ITEMS_MAP, ...BAZAAR_ITEMS_MAP]);
```

### 4. 修改第 24 行

**修改前**:
```typescript
const cfg = ITEMS_MAP.get(slot.itemId);
```

**修改后**:
```typescript
const cfg = ALL_ITEMS_MAP.get(slot.itemId);
```

## 验证修复

```bash
# 1. 重新编译
npm run build

# 2. 测试
# - 点击简单怪物 ✓
# - 点击中等怪物 ✓
# - 点击困难怪物 ✓
# - 多次测试确保所有怪物都能工作 ✓
```

## 相关配置
- **怪物列表**: `server/src/game/config/monsters.ts`
- **基础物品**: `server/src/game/config/items.ts`
- **巴扎物品**: `server/src/game/config/bazaar_items.ts`
- **物品合并**: `server/src/services/RunService.ts:12`
