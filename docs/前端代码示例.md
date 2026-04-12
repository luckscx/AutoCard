# AutoCard 前端关键代码快速参考

## 1. 布局常量导入模板

```typescript
// 完整导入
import {
  W, H,                              // 960, 600
  SIDE_PAD, INNER_X,                // 16, 24
  CARD_UNIT, CARD_GAP, CARD_H,      // 88, 6, 110
  cardWidth,                         // 函数
  Z1_Y, Z1_H,                        // 2, 100
  Z2_Y, Z2_H, Z2_LABEL_Y, Z2_CARD_Y, // 106, 230, 112, 132
  Z3_Y, Z3_H, Z3_LABEL_Y, Z3_CARD_Y, // 340, 156, 344, 362
  Z4_Y, Z4_H,                        // 500, 100
  TIER_COLORS, TIER_BG, tierHex,
} from '../ui/layout.js';
```

## 2. 卡牌尺寸计算

```typescript
// 单格卡牌
const w1 = cardWidth(1); // 88
const h = 110;

// 双格卡牌
const w2 = cardWidth(2); // 182
// 计算: 88*2 + 6*1 = 176 + 6 = 182

// 三格卡牌
const w3 = cardWidth(3); // 276
// 计算: 88*3 + 6*2 = 264 + 12 = 276

// 棋盘 X 坐标
const boardX = INNER_X + slotIndex * (CARD_UNIT + CARD_GAP);
// slotIndex=0: 24, slotIndex=1: 24+94=118, 等等
```

## 3. CardView 创建示例

```typescript
import { CardView } from '../ui/CardView.js';

// 创建普通卡牌视图
const item: SlotItem = { itemId: 'sword_1', tier: 'gold', size: 1, slotIndex: 0 };
const card = new CardView(item);

// 设置位置
card.x = 24;  // INNER_X
card.y = 362; // Z3_CARD_Y

// 设置拖拽交互（BoardRow 内部实现）
card.eventMode = 'static';
card.cursor = 'grab';

// 获取尺寸
console.log(card.cardWidth);  // 88
console.log(card.cardHeight); // 110
```

## 4. BoardRow 创建和配置

```typescript
import { BoardRow } from '../ui/BoardRow.js';

// 创建棋盘行（10格）
const boardRow = new BoardRow(10);
boardRow.x = INNER_X;
boardRow.y = Z3_CARD_Y;

// 配置容器类型
boardRow.containerType = 'board'; // 或 'stash'

// 更新卡牌
const items: SlotItem[] = [
  { itemId: 'sword', tier: 'gold', size: 1, slotIndex: 0 },
  { itemId: 'shield', tier: 'silver', size: 2, slotIndex: 1 },
];
boardRow.update(items);

// 设置回调
boardRow.onSwap = (item: SlotItem, targetSlot: number) => {
  console.log(`交换 ${item.itemId} 到 ${targetSlot}`);
};

boardRow.onMerge = (a: SlotItem, b: SlotItem) => {
  console.log(`合成 ${a.itemId} + ${b.itemId}`);
};

boardRow.onDragOut = (item: SlotItem, gx: number, gy: number) => {
  console.log(`卡牌拖出: (${gx}, ${gy})`);
};

boardRow.onDragging = (item: SlotItem, gx: number, gy: number) => {
  console.log(`正在拖拽: (${gx}, ${gy})`);
};

boardRow.onDragStop = () => {
  console.log('拖拽结束');
};

// 跨行拖拽支持（供外部调用）
boardRow.showExternalHighlight(globalX, 2); // 显示2格卡牌的高亮
boardRow.clearExternalHighlight();
const slotIdx = boardRow.getSlotIndexAtGlobal(globalX); // 获取格子索引
```

## 5. 场景切换模式

```typescript
import { SceneManager } from './core/SceneManager.js';

// 在 main.ts 中
const sm = new SceneManager(app);
sm.register('lobby', new LobbyScene(sm));
sm.register('main', new MainScene(sm));
sm.register('battle', new BattleScene(sm));
sm.register('shop', new ShopScene(sm));

// 切换到 MainScene
await sm.goto('main');

// 切换到 Battle 并传数据
await sm.goto('battle', {
  type: 'pve',
  result: battleResult,
  monsterName: 'Goblin',
  playerBoard: boardSnapshot,
});

// 切换到 ShopScene
await sm.goto('shop', {
  run: gameState.run,
  shopItems: ['item1', 'item2', 'item3'],
});
```

## 6. BattleCardView 状态更新

```typescript
import { BattleCardView } from '../ui/BattleCardView.js';

// 创建战斗卡牌
const battleCard = new BattleCardView(item);

// 更新状态（每 Tick 调用）
const state: CardRuntimeState = {
  slotIndex: 0,
  cooldownProgress: 30,    // 当前冷却进度
  hasteRemain: 0,
  slowRemain: 0,
  freezeRemain: 0,
  destroyed: false,
};
battleCard.updateState(state);

// 触发闪光动画（卡牌触发时）
battleCard.flash(); // 120ms 白色闪光

// 获取卡牌宽度
const w = battleCard.cardW;
```

## 7. BottomBar 配置

```typescript
import { BottomBar } from '../ui/BottomBar.js';

const bottomBar = new BottomBar();

// 设置位置
bottomBar.x = SIDE_PAD;
bottomBar.y = Z4_Y;

// 更新显示
const run: RunState = {
  hp: 80,
  maxHp: 100,
  gold: 250,
  prestige: 5,
  level: 3,
  xp: 4,
  pvpWins: 2,
  day: 1,
  hour: 2,
  // ... 其他属性
};
bottomBar.update(run);

// 设置储物箱按钮回调
bottomBar.onStashToggle = () => {
  console.log('储物箱按钮被点击');
};

this.addChild(bottomBar);
```

## 8. Button 使用

```typescript
import { Button } from '../ui/Button.js';

// 创建按钮
const btn = new Button('点击我', 200, 50, 0x4a90d9);

// 位置
btn.x = 100;
btn.y = 300;

// 事件监听
btn.on('pointertap', () => {
  console.log('按钮被点击');
});

// 修改文字（有 setText 方法）
btn.setText('新文字');

this.addChild(btn);
```

## 9. 区域检测例子（Z1-Z4）

```typescript
// 判断是否在区域内
function isInZ1(y: number): boolean {
  return y >= Z1_Y && y < Z1_Y + Z1_H; // 2 ~ 102
}

function isInZ2(y: number): boolean {
  return y >= Z2_Y && y < Z2_Y + Z2_H; // 106 ~ 336
}

function isInZ3(y: number): boolean {
  return y >= Z3_Y && y < Z3_Y + Z3_H; // 340 ~ 496
}

function isInZ4(y: number): boolean {
  return y >= Z4_Y && y < Z4_Y + Z4_H; // 500 ~ 600
}

// 拖拽卖出判断（如在 MainScene）
if (gy < Z3_Y) {
  // 从棋盘向上拖 → 卖出
  this.sellHint.visible = true;
} else {
  this.sellHint.visible = false;
}
```

## 10. 高亮目标格子示例

```typescript
import { getTargetRuleHighlightSlots } from '../ui/targetSlotPreview.js';

// 获取要高亮的格子
const board: SlotItem[] = [
  { itemId: 'card1', tier: 'gold', size: 1, slotIndex: 0 },
  { itemId: 'card2', tier: 'gold', size: 1, slotIndex: 2 },
];

const hovered: SlotItem = { itemId: 'card3', tier: 'gold', size: 1, slotIndex: 5 };

// 假设 card3 的 targetRule 是 'adjacent'
const rule = { kind: 'adjacent' } as TargetRule;

const slots = getTargetRuleHighlightSlots(hovered, board, rule);
// slots = [2] (card3 右邻 card2)

// 显示高亮
for (const s of slots) {
  const g = new Graphics();
  g.roundRect(0, 0, CARD_UNIT, CARD_H, 6);
  g.fill({ color: 0x3399ff, alpha: 0.38 });
  g.stroke({ color: 0x88ddff, width: 2 });
  g.x = s * (CARD_UNIT + CARD_GAP);
  this.addChild(g);
}
```

## 11. ShopCardView 创建

```typescript
import { ShopCardView } from '../ui/CardView.js';

const card = new ShopCardView(itemId, {
  purchased: false,
  canAfford: playerGold >= itemPrice,
  canPlace: hasEmptySlot,
  onBuy: () => {
    console.log(`购买 ${itemId}`);
    // 调用 API
  },
});

card.x = 100;
card.y = Z2_CARD_Y;
this.addChild(card);
```

## 12. Graphics 绘制常用模式

```typescript
import { Graphics, Text } from 'pixi.js';

// 绘制面板
const panel = new Graphics();
panel.roundRect(0, 0, 400, 300, 12);
panel.fill({ color: 0x0e1a2b, alpha: 0.95 });
panel.stroke({ color: 0x4a90d9, width: 2 });
this.addChild(panel);

// 绘制按钮背景
const btnBg = new Graphics();
btnBg.roundRect(0, 0, 200, 50, 10);
btnBg.fill(0x4a90d9);
this.addChild(btnBg);

// 绘制进度条
const barBg = new Graphics();
barBg.roundRect(0, 0, 400, 16, 4);
barBg.fill({ color: 0x222233, alpha: 0.8 });
this.addChild(barBg);

const barFill = new Graphics();
const ratio = 0.75; // 75% 进度
barFill.roundRect(0, 0, 400 * ratio, 16, 4);
barFill.fill(0x44aaff);
this.addChild(barFill);

// 添加文字
const label = new Text({
  text: '标题',
  style: {
    fill: '#ffffff',
    fontSize: 18,
    fontFamily: 'Arial',
    fontWeight: 'bold',
  },
});
label.x = 10;
label.y = 10;
this.addChild(label);
```

## 13. 浮动文字动画（战斗中）

```typescript
// 创建浮动文字
const floatText = new Text({
  text: `-50 伤害`,
  style: { fill: '#ff4444', fontSize: 16, fontFamily: 'Arial', fontWeight: 'bold' },
});
floatText.anchor.set(0.5);
floatText.x = 200 + (Math.random() - 0.5) * 40;
floatText.y = 250;
this.floatLayer.addChild(floatText);

// 动画循环
let life = 0;
const anim = () => {
  life += 16;
  floatText.y -= 1;                           // 上移
  floatText.alpha = Math.max(0, 1 - life / 800); // 淡出
  
  if (life >= 800) {
    this.floatLayer.removeChild(floatText);
    floatText.destroy();
  } else {
    requestAnimationFrame(anim);
  }
};
requestAnimationFrame(anim);
```

## 14. GameState 使用

```typescript
import { gameState } from '../core/GameState.js';

// 设置运行状态
gameState.setRun(runData);

// 获取当前运行
const currentRun = gameState.run;

// 设置配置
gameState.setConfigs(heroes, items, bazaarItems);

// 获取卡牌配置
const itemCfg = gameState.itemsMap.get(itemId);
if (itemCfg) {
  console.log(itemCfg.name, itemCfg.tier, itemCfg.size);
}

// 清空运行
gameState.setRun(null);
```

## 15. 场景生命周期

```typescript
import { Scene } from '../core/SceneManager.js';

export class MyScene extends Scene {
  // 进入场景时调用（可异步）
  async onEnter(data?: any) {
    this.removeChildren(); // 清空旧内容
    console.log('Scene data:', data);
    
    // 构建 UI
    const bg = new Graphics();
    bg.rect(0, 0, W, H);
    bg.fill(0x1a1a2e);
    this.addChild(bg);
    
    // 加载数据
    // await fetchData();
  }

  // 离开场景时调用
  onExit() {
    // 清理资源（如定时器、监听器）
    // clearInterval(...);
    // ticker?.stop();
  }
}
```

## 16. 稀有度相关查询

```typescript
import { tierHex, TIER_COLORS, TIER_BG } from '../ui/layout.js';

const tier = 'gold';

// 获取十六进制颜色字符串
const hexColor = tierHex(tier); // '#ffd700'

// 获取数值颜色
const borderColor = TIER_COLORS[tier];     // 0xffd700
const bgColor = TIER_BG[tier];            // 0x4a3a10

// 用于 Text 样式
const text = new Text({
  text: '金色卡牌',
  style: { fill: tierHex(tier), fontSize: 14, fontFamily: 'Arial' },
});
```

## 17. 战斗系统关键数据结构

```typescript
// BattleResult - 战斗结果
interface BattleResult {
  won: boolean;
  hpLeft: number;
  xpGained: number;
  goldGained: number;
  loot: string[]; // 战利品卡牌 ID
  events?: BattleEvent[];
  snapshots?: BattleSnapshot[];
}

// BattleEvent - 单个事件
interface BattleEvent {
  type: 'card_trigger' | 'damage' | 'heal' | 'destroy' | ... ;
  tick: number;
  side?: 'player' | 'enemy';
  value?: number;
  // ... 其他属性
}

// BattleSnapshot - 战斗快照
interface BattleSnapshot {
  tick: number;
  player: { hp: number; shield: number; poison: number; burn: number };
  enemy: { hp: number; shield: number; poison: number; burn: number };
  playerCards: CardRuntimeState[];
  enemyCards: CardRuntimeState[];
}

// CardRuntimeState - 卡牌运行时状态
interface CardRuntimeState {
  slotIndex: number;
  cooldownProgress: number;
  hasteRemain: number;
  slowRemain: number;
  freezeRemain: number;
  destroyed: boolean;
}
```

## 18. Pixi 常用模式

```typescript
import { Container, Graphics, Text, Sprite, Ticker } from 'pixi.js';

// 创建容器
const container = new Container();

// 添加子元素
container.addChild(child1, child2);

// 移除子元素
container.removeChild(child);
container.removeChildren(); // 移除全部

// 设置位置和大小
container.x = 100;
container.y = 200;
container.width = 300;
container.height = 150;

// 设置缩放
container.scale.set(0.5); // 缩放到 50%

// 设置旋转（弧度）
container.rotation = Math.PI / 4; // 45 度

// 设置透明度
container.alpha = 0.5;

// 设置可见性
container.visible = true;

// 事件模式（交互性）
container.eventMode = 'static'; // 允许交互
container.cursor = 'pointer';

// 事件监听
container.on('pointertap', () => console.log('点击'));
container.on('pointerover', () => console.log('悬停'));
container.on('pointerout', () => console.log('移出'));

// Ticker（每帧调用）
const ticker = new Ticker();
ticker.add(delta => {
  console.log('Frame:', delta);
});
ticker.start();
ticker.stop();

// 销毁
container.destroy();
ticker.destroy();
```

---

## 快速查找表

| 需求 | 文件 | 主要类 |
|-----|-----|--------|
| 卡牌显示 | CardView.ts | CardView, ShopCardView |
| 棋盘交互 | BoardRow.ts | BoardRow |
| 底部栏 | BottomBar.ts | BottomBar |
| 按钮 | Button.ts | Button |
| 布局常量 | layout.ts | (常量导出) |
| 游戏状态 | GameState.ts | gameState |
| 场景管理 | SceneManager.ts | SceneManager, Scene |
| 目标预览 | targetSlotPreview.ts | getTargetRuleHighlightSlots |
| 大厅 | LobbyScene.ts | LobbyScene |
| 主游戏 | MainScene.ts | MainScene |
| 战斗 | BattleScene.ts | BattleScene |
| 商店 | ShopScene.ts | ShopScene |

