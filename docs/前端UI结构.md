# AutoCard 前端 UI 结构完整总结

## 1. 入口点和应用初始化

### main.ts
- **应用创建**：使用 Pixi.js `Application`
- **画布配置**：
  - 背景色：`#1a1a2e` (深蓝黑)
  - 自适应窗口：`resizeTo: window`
  - 反锯齿：`antialias: true`
- **挂载**：DOM 元素 `#app`
- **场景系统**：通过 `SceneManager` 管理 4 个场景
  - `lobby` - 大厅/英雄选择
  - `main` - 主游戏界面（日常运营、商店、PvE、PvP 选择）
  - `battle` - 战斗回放
  - `shop` - 商店界面

---

## 2. 屏幕布局系统 (layout.ts)

### 全局尺寸
```javascript
W = 960;      // 屏幕宽度
H = 600;      // 屏幕高度
SIDE_PAD = 16; // 两侧边距
```

### 四层分区（从上到下）

| 区域 | Y坐标 | 高度 | 用途 |
|-----|------|------|------|
| **Z1** | 2 | 100 | 顶部操作栏（按钮、HP条、战斗信息） |
| **Z2** | 106 | 230 | 内容区（商品、敌方棋盘、选择按钮） |
| **Z3** | 340 | 156 | 玩家棋盘区 |
| **Z4** | 500 | 100 | 底部信息栏（HP、金币、声望、储物箱按钮） |

### 内容偏移量
```javascript
INNER_X = 24;      // Z1/Z2/Z3 内容起始 X 坐标 (SIDE_PAD + 8)
Z2_LABEL_Y = 112;  // Z2 标签 Y (Z2_Y + 6)
Z2_CARD_Y = 132;   // Z2 卡牌 Y (Z2_Y + 26)
Z3_LABEL_Y = 344;  // Z3 标签 Y (Z3_Y + 4)
Z3_CARD_Y = 362;   // Z3 卡牌 Y (Z3_Y + 22)
```

### 卡牌尺寸常量
```javascript
CARD_UNIT = 88;    // 单格卡牌宽度
CARD_GAP = 6;      // 卡牌间距
CARD_H = 110;      // 卡牌高度

// 多格卡牌宽度计算函数
function cardWidth(size: 1 | 2 | 3): number {
  return CARD_UNIT * size + CARD_GAP * (size - 1);
}
// size=1: 88px, size=2: 182px, size=3: 276px
```

### 稀有度颜色体系
```javascript
TIER_COLORS = {
  bronze: 0xcd7f32,    // 边框色
  silver: 0xc0c0c0,
  gold: 0xffd700,
  diamond: 0x00ffff,
  legendary: 0xff44ff,
};

TIER_BG = {
  bronze: 0x3d2b1f,    // 背景色
  silver: 0x3a3a4a,
  gold: 0x4a3a10,
  diamond: 0x0a3a4a,
  legendary: 0x3a0a3a,
};
```

---

## 3. 核心 UI 组件

### CardView（普通卡牌视图）
**文件**：`client/src/ui/CardView.ts`

#### 构造结构
```
CardView (Container)
├── border (Graphics) - 稀有度边框 (-2, -2, w+4, h+4)
├── body (Graphics) - 卡牌主体 (0, 0, w, h)
├── name (Text) - 卡牌名称 (w/2, 4)
├── portText (Text) - 端口效果 (w/2, portY)
├── cdText (Text) - 冷却时间 (6, h-18)
├── tierLabel (Text) - 稀有度标记 (w-6, h-18)
├── description (Text) - 可选描述 (8, 50)
└── image (Sprite) - 可选卡牌图片 (6, 20)
```

#### 尺寸规则
- **1格卡牌**：88×110
  - 字体大小：名称 11px，端口 10px
- **2格卡牌**：182×110
  - 字体大小：名称 13px，端口 12px
- **3格卡牌**：276×110

#### 图片布局
- 图片区：宽 `cardWidth - 12`，高 `cardHeight - 55`
- 图片位置：`(6, 20)`
- 端口显示位置随是否有图片调整：
  - 有图片：`h - 40`
  - 无图片：`28`

---

### BattleCardView（战斗中的卡牌）
**文件**：`client/src/ui/BattleCardView.ts`

#### 运行时状态更新
```typescript
interface CardRuntimeState {
  slotIndex: number;
  cooldownProgress: number;  // 当前冷却进度 (0-max)
  hasteRemain: number;       // 加速剩余时间
  slowRemain: number;        // 减速剩余时间
  freezeRemain: number;      // 冻结剩余时间
  destroyed: boolean;        // 是否摧毁
}
```

#### 动画效果
- **冷却条**：底部 6px 高的进度条（蓝色）
- **状态叠加层**：
  - 摧毁：红色 (0xff2222, 60% 不透明)
  - 冻结：青色 (0x88eeff, 30% 不透明)
  - 减速：蓝色 (0x6688ff)
  - 加速：黄色 (0xffdd00)
- **触发闪光**：白色闪光 120ms（用于卡牌触发动画）

---

### ShopCardView（商店卡牌）
**文件**：`client/src/ui/CardView.ts`

#### 高度计算（有图片时）
```javascript
const NAME_H = 24;        // 名称区高度
const SHOP_IMG_H = 96;    // 图片区高度
const SHOP_INFO_H = 48;   // 端口/价格信息区高度
const BTN_AREA_H = 44;    // 购买按钮区高度
const totalH = NAME_H + SHOP_IMG_H + SHOP_INFO_H + BTN_AREA_H; // 212px
```

#### 状态显示
- **已购买**：灰色背景 + "已购" 绿色文字
- **金币不足**：红色 "金币不足"
- **无法放置**：红色 "无法放置"
- **可购买**：蓝色购买按钮 (100×30)

---

### BoardRow（棋盘行容器）
**文件**：`client/src/ui/BoardRow.ts`

#### 结构
```
BoardRow (Container) - 10格棋盘
├── bgSlots (Container) - 背景格子层
│   └── Graphics[10] - 每格 (88×110, 半透明)
├── slotGlowLayer (Container) - 高亮显示层
│   └── Graphics[] - 动态生成的目标高亮
└── cardsLayer (Container) - 卡牌显示层
    └── CardView[] - 卡牌
```

#### 拖拽交互
- **单行内拖拽**：
  - 拖拽到不同格子：调用 `onSwap`
  - 拖拽到同ID同Tier的卡牌：调用 `onMerge`
  - 拖拽出行外：调用 `onDragOut`
  
- **跨行拖拽**（由 MainScene 控制）：
  - 从棋盘拖到储物箱
  - 从储物箱拖到棋盘
  - 拖到上方卖出

#### 目标预览
- 悬停卡牌时：根据卡牌的 `targetRule` 高亮目标格子
- 高亮效果：蓝色边框 + 半透明蓝色填充

---

### BottomBar（底部信息栏）
**文件**：`client/src/ui/BottomBar.ts`

#### 显示内容
- **储物箱按钮**：左上角 (8, 8)，72×34，金色边框
- **HP**：X=96，绿色文字 "HP {hp}/{maxHp}"
- **金币**：X=220，黄色文字 "{gold} G"
- **声望**：X=330，橙色文字 "声望 {prestige}"
- **游戏信息**：下方，浅蓝色 "Lv.{level} XP {xp}/8 PvP {pvpWins}/10 Day{day} H{hour}"

#### 位置
```javascript
x = SIDE_PAD (16);
y = Z4_Y (500);
宽度 = W - SIDE_PAD * 2 (928);
高度 = Z4_H (100);
```

---

### Button（通用按钮）
**文件**：`client/src/ui/Button.ts`

#### 参数
```typescript
constructor(
  text: string,
  width = 200,
  height = 50,
  color = 0x4a90d9  // 默认蓝色
)
```

#### 交互
- 悬停时：色调淡化 (0xcccccc)
- 移出时：恢复原色

---

### Panel（通用面板）
**文件**：`client/src/ui/Panel.ts`

```typescript
constructor(
  width: number,
  height: number,
  bgColor = 0x16213e,  // 深蓝
  alpha = 0.9,
  radius = 12
)
```

---

### SlotGrid（储物箱/物品网格）
**文件**：`client/src/ui/SlotGrid.ts`

#### 格子尺寸
```javascript
SLOT_W = 64;
SLOT_H = 64;
GAP = 4;
```

#### 显示
- 空格子：半透明暗蓝 (0x2a2a4a)
- 占用格子：稀有度颜色填充 + 物品名称 + 稀有度字母

---

## 4. 场景 (Scene) 详解

### 1. LobbyScene（大厅）
**文件**：`client/src/scenes/LobbyScene.ts`

#### 布局
```
├── 标题 "自走牌 AutoCard" (居中, Y=30, 36px)
├── 加载文本 (居中, Y=80)
├── 玩家昵称 (可点击修改, Y=72)
├── 教程提示框 (可选, Y=420) [如未见过]
└── 英雄卡牌行 (Y=130)
    └── HeroCard[3] (210×280 每张)
        ├── 名称 (22px 金色)
        ├── 描述 (13px 灰色, 换行)
        ├── 属性 (13px 浅蓝)
        └── 选择按钮 (42px)
```

#### 英雄卡牌排列
- 总宽度：`3 * 210 + 2 * 12 = 666px`
- 起始 X：`(960 - 666) / 2 ≈ 147px`
- 卡牌间距：12px

---

### 2. MainScene（主游戏界面）
**文件**：`client/src/scenes/MainScene.ts`

#### 四层分布

##### Z1（顶部操作栏）
- 背景：暗蓝 (0x0e1a2b)
- 显示：当前日期/时段 (Day{day} H{hour} — 标签)

##### Z2（内容区，可变）
根据游戏阶段显示：

###### 日常运营时 (hourType === 'choice')
- 显示 3 个选择按钮：
  1. "进入商店" (蓝色 0x4a90d9)
  2. "随机事件" (粉红 0xd94a7a)
  3. "免费礼物" (绿色 0x4ad97a)
- 尺寸：260×56，间距 290px

###### PvE 时 (hourType === 'pve')
- 显示 3 个难度按钮：
  1. "简单怪物" (绿色)
  2. "中等怪物" (黄色)
  3. "困难怪物" (红色)

###### PvP 时 (hourType === 'pvp')
- 单个大按钮："开始 PvP 镜像战！" (粉红, 400×60)

###### 待处理事件 (pendingEvent 存在)
- 事件标题 (16px 金色)
- 事件描述 (13px, 换行)
- 事件选项按钮 (多个, 垂直排列, 52px 间距)

##### Z3（玩家棋盘）
- 背景：深暗蓝 (0x14243a)
- 标签："我的棋盘" (Z3_LABEL_Y)
- BoardRow 容器 (10格, 可拖拽)
- 位置：X=INNER_X, Y=Z3_CARD_Y

#### 储物箱切换
- 点击底部储物箱按钮切换 Z2 内容为储物箱行
- 储物箱行显示在 Z2 区域内
- 可在棋盘和储物箱间跨行拖拽

#### 卖出机制
- **可视化提示**：
  - 从棋盘向上拖（超过 Z3_Y）：显示卖出遮罩覆盖 Z1 区域
  - 从储物箱向上拖（超过 Z2_Y）：显示卖出遮罩覆盖 Z1 区域
  - 松手即售出

---

### 3. ShopScene（商店）
**文件**：`client/src/scenes/ShopScene.ts`

#### 四层分布

##### Z1（顶部操作栏）
- 标题："商店" (金色)
- 当前金币 (黄色)
- 刷新按钮：
  - 未刷新：`"刷新 ({cost}G)"` (橙色 0xd9944a)
  - 已刷新：`"已刷新"` (灰色 0x444444, 禁用)
- 离开按钮 (蓝色)

##### Z2（商品卡牌行）
- 背景：暗蓝 (0x0e1a2b)
- 水平滚动：每个卡牌占用 `cardWidth(size) + 16px`
- ShopCardView 组件

##### Z3（玩家棋盘）
- 背景：深暗蓝 (0x14243a)
- 类似 MainScene 的棋盘
- 拖拽卡牌到棋盘或储物箱
- 拖拽出行外向上售出

##### Z4（底栏）
- BottomBar 组件

#### 卖出遮罩
- 覆盖 Z1 到 Z2 底部
- 背景色：金色 (0xbfa620, 92% 不透明)
- 文字：白色 28px "松手售出卡牌"

---

### 4. BattleScene（战斗回放）
**文件**：`client/src/scenes/BattleScene.ts`

#### 四层分布

##### Z1（战斗信息）
- 背景：红色系 (0x2a0e0e)
- 左上：战斗标题 (PvE/PvP + 对手名)
- 左侧：敌方 HP 条
- 右侧：我方 HP 条
- 速度标记：右上角 "4x" (播放速度)
- Tick 标签：中上 "Tick {n}"
- 下方状态：护盾/毒/燃烧堆栈

##### Z2（敌方棋盘）
- 背景：红色系 (0x2a0e0e)
- 标签："敌方棋盘" (红色)
- 棋盘显示：BattleCardView[n]
- Y 位置：Z2_CARD_Y + 20

##### Z3（我方棋盘）
- 背景：深暗蓝 (0x14243a)
- 标签："我的棋盘" (浅蓝)
- 棋盘显示：BattleCardView[n]
- Y 位置：Z3_CARD_Y

##### 浮动文字层
- 伤害：红色 `-{dmg}` (Y = 敌方区域)
- 治疗：绿色 `+{heal}`
- 护盾：蓝色 `🛡️+{shield}`
- 毒/燃烧：绿/橙色 `☠️+{value}` / `🔥+{value}`
- DoT 伤害：紫色 `-{total} DoT`
- 摧毁：红色 `💥摧毁`
- 状态效果：对应颜色 `⚡加速` / `❄️冻结` / `❄️减速` / `🔋充能`
- 超时伤害：橙色 `加时伤害 -{dmg}`

#### HP 条渲染
```
HpBar (Container, 400×16)
├── barBg (Graphics) - 背景 (0x222233, 80% 不透明)
├── hpFill (Graphics) - HP 填充 (绿/红 根据方)
├── shieldFill (Graphics) - 护盾填充 (青色 0x88ccff)
└── textLabel (Text) - "HP+护盾/maxHP"
```

#### 播放控制
- 播放速度：**4x**
- 事件处理：逐事件应用，根据 tick 播放
- 动画持续时间：
  - 浮字：800ms 上升并淡出
  - 闪光：120ms

#### 战斗结果界面
- 遮罩：黑色透明 (55% 不透明)
- 面板：420×260/300
- 边框颜色：胜利绿 (0x4ad97a) / 失败红 (0xd94a4a)
- 标题：36px 大
- 详情：
  - 剩余 HP
  - 获得 XP 和金币
  - 战利品列表（如有）

---

## 5. 数据流和状态管理

### GameState (gameState.ts)
```typescript
class GameStateStore {
  run: RunState | null;              // 当前游戏进度
  heroes: HeroConfig[];              // 可选英雄
  items: ItemConfig[];               // 道具配置
  bazaarItems: ItemConfig[];         // 市集道具
  itemsMap: Map<string, ItemConfig>; // 快速查询
  
  setRun(run: RunState | null)
  setConfigs(heroes, items, bazaarItems)
}
```

### SceneManager (SceneManager.ts)
```typescript
class SceneManager {
  register(name: string, scene: Scene)  // 注册场景
  async goto(name: string, data?: any)  // 切换场景并传数据
  currentScene: Scene | null
}

abstract class Scene extends Container {
  abstract onEnter(data?: any): void | Promise<void>
  onExit(): void
}
```

---

## 6. 坐标计算公式

### 单位转换
```javascript
// 棋盘格子索引 → 屏幕 X 坐标
screenX = INNER_X + slotIndex * (CARD_UNIT + CARD_GAP);
// slotIndex 0~9 → X: 24 到 24 + 9*94 = 870

// 卡牌宽度 (多格)
cardWidth(size) = 88*size + 6*(size-1)
// size=1: 88, size=2: 182, size=3: 276

// 格子覆盖范围检测
isSlotCovered(slotIndex, itemSlotIndex, itemSize)
  = slotIndex >= itemSlotIndex && slotIndex < itemSlotIndex + itemSize
```

### 拖拽反馈
```javascript
// 拖拽时格子 snap
dragGhost.x = localX - dragOffset.x;
dragGhost.y = localY - dragOffset.y;

// 高亮目标格子
highlightX = slotIdx * (CARD_UNIT + CARD_GAP);
highlightW = cardWidth(size);

// 卖出判断
isSelling = globalY < targetZone.y
```

---

## 7. 端口目标预览系统

**文件**：`client/src/ui/targetSlotPreview.ts`

### 目标规则类型
- `'self'` - 仅自己
- `'adjacent'` - 相邻单位
- `'leftmost'` - 最左侧单位
- `'rightmost'` - 最右侧单位
- `'all'` - 其他所有单位
- `'position'` - 指定格子

### 高亮计算
```typescript
function getTargetRuleHighlightSlots(
  hovered: SlotItem,
  board: SlotItem[],
  rule: TargetRule
): number[]
// 返回要高亮的单位格子数组
```

---

## 8. 端口符号映射

```javascript
damage: '⚔️'
poison: '☠️'
burn: '🔥'
heal: '❤️'
shield: '🛡️'
haste: '⚡'
charge: '🔋'
slow: '❄️'
freeze: '❄️'
destroy: '💥'
```

---

## 9. 颜色体系

| 用途 | 值 | 十六进制 |
|-----|-----|---------|
| 主背景 | 0x1a1a2e | 深蓝黑 |
| 内容背景 | 0x0e1a2b | 更深蓝 |
| 棋盘背景 | 0x14243a | 深蓝 |
| 稀有度-铜 | 0xcd7f32 | 铜色 |
| 稀有度-银 | 0xc0c0c0 | 银色 |
| 稀有度-金 | 0xffd700 | 金色 |
| 稀有度-钻 | 0x00ffff | 青色 |
| 稀有度-传 | 0xff44ff | 紫色 |
| 按钮-蓝 | 0x4a90d9 | 亮蓝 |
| 按钮-红 | 0xd94a4a | 暗红 |
| 按钮-绿 | 0x4ad97a | 亮绿 |
| 文字-白 | 0xffffff | 白 |
| 文字-黄 | 0xffd700 | 金黄 |
| HP-我方 | 0x4ad97a | 绿 |
| HP-敌方 | 0xd94a4a | 红 |
| 伤害 | 0xff4444 | 亮红 |
| 治疗 | 0x44ff44 | 亮绿 |

---

## 10. 字体配置

所有文字统一使用：
- **字体**：Arial
- **字体族**：Arial

### 常见字体大小
- 标题/大标题：22-36px (fontWeight: 'bold')
- 中等标题：14-16px (fontWeight: 'bold')
- 标签/按钮：12-13px
- 卡牌内容：10-13px
- 信息文本：11-13px

---

## 11. 响应式考虑

**当前方案**：`resizeTo: window` 使 Pixi 应用自适应窗口大小，但：
- 布局坐标仍基于固定 960×600
- 元素不会随窗口缩放
- 建议：如需真正响应式，需重新计算所有坐标基于 `app.screen.width/height`

