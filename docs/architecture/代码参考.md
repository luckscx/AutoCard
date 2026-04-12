# AutoCard 项目 - 代码参考文档

## 完整的 CardView.ts 源码

```typescript
import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import type { SlotItem, ItemSize } from '@autocard/shared';
import { gameState } from '../core/GameState.js';
import { cardWidth, CARD_H, TIER_COLORS, TIER_BG, tierHex } from './layout.js';

// 图片缓存 - 避免重复加载
const imageCache = new Map<string, Texture>();

/**
 * 游戏卡牌视图类
 * 负责将 ItemConfig 数据渲染为可视化的卡牌
 */
export class CardView extends Container {
  private itemId: string;
  private tier: string;
  private size: ItemSize;

  constructor(item: SlotItem) {
    super();
    this.itemId = item.itemId;
    this.tier = item.tier;
    this.size = item.size;
    this.draw();
    
    // 设置交互区域
    const w = cardWidth(this.size);
    this.eventMode = 'static';
    this.hitArea = new Rectangle(0, 0, w, CARD_H);
  }

  /**
   * 主要绘制函数 - 构建卡牌的所有视觉元素
   */
  private draw() {
    const cfg = gameState.itemsMap.get(this.itemId);
    const w = cardWidth(this.size);
    const h = CARD_H;

    // 1. 卡牌底框 - 带稀有度颜色的外边框
    const border = new Graphics();
    border.roundRect(-2, -2, w + 4, h + 4, 8);
    border.fill({ color: TIER_COLORS[this.tier] ?? 0x555555, alpha: 0.9 });
    this.addChild(border);

    // 2. 卡牌主体 - 深色背景
    const body = new Graphics();
    body.roundRect(0, 0, w, h, 6);
    body.fill(TIER_BG[this.tier] ?? 0x222233);
    this.addChild(body);

    if (!cfg) return;

    // 3. 卡牌图片（如果存在）
    if (cfg.image) {
      this.drawCardImage(cfg.image, w, h);
    }

    // 4. 卡牌名称（顶部中央）
    const name = new Text({
      text: cfg.name,
      style: { 
        fill: '#ffffff', 
        fontSize: this.size === 1 ? 11 : 13, 
        fontFamily: 'Arial', 
        fontWeight: 'bold' 
      },
    });
    name.anchor.set(0.5, 0);
    name.x = w / 2;
    name.y = 4;
    this.addChild(name);

    // 5. 能力图标区 - 根据是否有图片调整位置
    const hasImage = !!cfg.image;
    const portY = hasImage ? h - 40 : 28;

    const portStr = cfg.ports.map(p => {
      const sym = portSymbol(p.type);
      return `${sym}${p.value}`;
    }).join(' ');
    
    const portText = new Text({
      text: portStr,
      style: { 
        fill: tierHex(this.tier), 
        fontSize: this.size === 1 ? 10 : 12, 
        fontFamily: 'Arial', 
        fontWeight: 'bold' 
      },
    });
    portText.anchor.set(0.5, 0);
    portText.x = w / 2;
    portText.y = portY;
    this.addChild(portText);

    // 6. 冷却时间（左下角）
    const cdText = new Text({
      text: `${cfg.cooldown}`,
      style: { 
        fill: '#aaddff', 
        fontSize: 11, 
        fontFamily: 'Arial', 
        fontWeight: 'bold' 
      },
    });
    cdText.x = 6;
    cdText.y = h - 18;
    this.addChild(cdText);

    // 7. 稀有度标记（右下角）- 显示首字母
    const tierLabel = new Text({
      text: this.tier[0].toUpperCase(),
      style: { 
        fill: tierHex(this.tier), 
        fontSize: 11, 
        fontFamily: 'Arial', 
        fontWeight: 'bold' 
      },
    });
    tierLabel.anchor.set(1, 0);
    tierLabel.x = w - 6;
    tierLabel.y = h - 18;
    this.addChild(tierLabel);

    // 8. 描述文本（中部，仅当无图片且尺寸≥2时显示）
    if (this.size >= 2 && !hasImage) {
      const desc = new Text({
        text: cfg.description,
        style: { 
          fill: '#99aabb', 
          fontSize: 10, 
          fontFamily: 'Arial', 
          wordWrap: true, 
          wordWrapWidth: w - 16 
        },
      });
      desc.x = 8;
      desc.y = 50;
      this.addChild(desc);
    }
  }

  /**
   * 绘制卡牌图片 - 异步加载并自适应缩放
   */
  private drawCardImage(imageUrl: string, cardWidth: number, cardHeight: number) {
    // 定义图片显示区域（卡牌中部）
    const imgW = cardWidth - 12;
    const imgH = cardHeight - 55;
    const imgX = 6;
    const imgY = 20;

    // 创建图片背景框
    const imgBg = new Graphics();
    imgBg.roundRect(imgX, imgY, imgW, imgH, 4);
    imgBg.fill(0x111111);
    this.addChild(imgBg);

    // 异步加载图片纹理
    if (imageCache.has(imageUrl)) {
      // 缓存命中 - 直接使用
      this.createSprite(imageCache.get(imageUrl)!, imgX, imgY, imgW, imgH);
    } else {
      // 缓存未命中 - 异步加载
      Assets.load<Texture>(imageUrl)
        .then((texture: Texture) => {
          // 存入缓存
          imageCache.set(imageUrl, texture);
          // 创建精灵
          this.createSprite(texture, imgX, imgY, imgW, imgH);
        })
        .catch((err: unknown) => {
          // 加载失败处理
          console.warn(`Failed to load card image: ${imageUrl}`, err);
        });
    }
  }

  /**
   * 根据纹理创建 Sprite 并自适应缩放
   * 保持宽高比，在指定区域内居中显示
   */
  private createSprite(texture: Texture, x: number, y: number, w: number, h: number) {
    const sprite = new Sprite(texture);
    sprite.x = x;
    sprite.y = y;

    // 计算宽高比
    const textureRatio = texture.width / texture.height;  // 纹理宽高比
    const targetRatio = w / h;                             // 目标区域宽高比

    if (textureRatio > targetRatio) {
      // 纹理更宽（landscape） → 按高度缩放，水平居中
      sprite.height = h;
      sprite.width = h * textureRatio;
      sprite.x = x + (w - sprite.width) / 2;
    } else {
      // 纹理更高（portrait） → 按宽度缩放，垂直居中
      sprite.width = w;
      sprite.height = w / textureRatio;
      sprite.y = y + (h - sprite.height) / 2;
    }

    this.addChild(sprite);
  }

  get cardWidth() { return cardWidth(this.size); }
  get cardHeight() { return CARD_H; }
}

/**
 * 端口类型 → emoji 符号的映射
 */
function portSymbol(type: string): string {
  switch (type) {
    case 'damage': return '\u2694\uFE0F';      // ⚔️
    case 'poison': return '\u2620\uFE0F';      // ☠️
    case 'burn': return '\uD83D\uDD25';        // 🔥
    case 'heal': return '\u2764\uFE0F';        // ❤️
    case 'shield': return '\uD83D\uDEE1\uFE0F';// 🛡️
    case 'haste': return '\u26A1';             // ⚡
    case 'charge': return '\uD83D\uDD0B';      // 🔋
    case 'slow': return '\u2744\uFE0F';        // ❄️
    case 'freeze': return '\u2744\uFE0F';      // ❄️
    default: return '\u2B50';                  // ⭐
  }
}

/**
 * 商店卡牌视图 - 显示购买选项
 */
export class ShopCardView extends Container {
  constructor(
    itemId: string,
    opts: { 
      purchased?: boolean;        // 是否已购买
      canAfford?: boolean;        // 是否有足够金币
      canPlace?: boolean;         // 是否有足够空间
      onBuy?: () => void;         // 购买回调
    },
  ) {
    super();
    const cfg = gameState.itemsMap.get(itemId);
    if (!cfg) return;

    const w = cardWidth(cfg.size as ItemSize);
    const h = CARD_H + 80;  // 商店卡牌更高

    // 底框
    const border = new Graphics();
    border.roundRect(-2, -2, w + 4, h + 4, 8);
    border.fill({ 
      color: opts.purchased ? 0x333333 : TIER_COLORS[cfg.baseTier] ?? 0x555555, 
      alpha: 0.9 
    });
    this.addChild(border);

    // 主体
    const body = new Graphics();
    body.roundRect(0, 0, w, h, 6);
    body.fill(opts.purchased ? 0x222222 : (TIER_BG[cfg.baseTier] ?? 0x222233));
    this.addChild(body);

    // 名称
    const name = new Text({
      text: cfg.name,
      style: { 
        fill: '#ffffff', 
        fontSize: cfg.size === 1 ? 13 : 16, 
        fontFamily: 'Arial', 
        fontWeight: 'bold' 
      },
    });
    name.anchor.set(0.5, 0);
    name.x = w / 2;
    name.y = 6;
    this.addChild(name);

    // 描述
    const desc = new Text({
      text: cfg.description,
      style: { 
        fill: '#99aabb', 
        fontSize: 11, 
        fontFamily: 'Arial', 
        wordWrap: true, 
        wordWrapWidth: w - 12 
      },
    });
    desc.x = 6;
    desc.y = 28;
    this.addChild(desc);

    // 能力
    const portStr = cfg.ports.map(p => `${portSymbol(p.type)}${p.value}`).join(' ');
    const portText = new Text({
      text: portStr,
      style: { 
        fill: tierHex(cfg.baseTier), 
        fontSize: 12, 
        fontFamily: 'Arial' 
      },
    });
    portText.x = 6;
    portText.y = 68;
    this.addChild(portText);

    // 信息行（价格、冷却、格子数）
    const info = new Text({
      text: `${cfg.price}G  CD:${cfg.cooldown}  ${cfg.size}格`,
      style: { 
        fill: '#ffcc00', 
        fontSize: 12, 
        fontFamily: 'Arial' 
      },
    });
    info.x = 6;
    info.y = 88;
    this.addChild(info);

    // 底部状态按钮/标签
    if (opts.purchased) {
      const sold = new Text({ 
        text: '已购', 
        style: { fill: '#4ad97a', fontSize: 14, fontFamily: 'Arial' } 
      });
      sold.anchor.set(0.5, 0);
      sold.x = w / 2;
      sold.y = CARD_H + 16;
      this.addChild(sold);
    } else if (!opts.canAfford) {
      const noGold = new Text({ 
        text: '金币不足', 
        style: { fill: '#ff6666', fontSize: 12, fontFamily: 'Arial' } 
      });
      noGold.anchor.set(0.5, 0);
      noGold.x = w / 2;
      noGold.y = CARD_H + 16;
      this.addChild(noGold);
    } else if (!opts.canPlace) {
      const noPlace = new Text({ 
        text: '无法购买', 
        style: { fill: '#ff6666', fontSize: 12, fontFamily: 'Arial' } 
      });
      noPlace.anchor.set(0.5, 0);
      noPlace.x = w / 2;
      noPlace.y = CARD_H + 16;
      this.addChild(noPlace);
    } else if (opts.onBuy) {
      // 购买按钮
      const btnW = Math.min(w - 16, 100);
      const btn = new Graphics();
      btn.roundRect(0, 0, btnW, 32, 6);
      btn.fill(0x4a90d9);  // 蓝色
      btn.x = (w - btnW) / 2;
      btn.y = CARD_H + 10;
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointertap', opts.onBuy);
      this.addChild(btn);

      // 按钮文字
      const btnText = new Text({ 
        text: '购买', 
        style: { fill: '#fff', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' } 
      });
      btnText.anchor.set(0.5);
      btnText.x = w / 2;
      btnText.y = CARD_H + 26;
      this.addChild(btnText);
    }
  }
}
```

---

## layout.ts - 完整布局系统

```typescript
// 窗口大小
export const W = 960;
export const H = 600;

// 卡牌基础尺寸
export const CARD_UNIT = 88;      // 基础单位 (1格宽度)
export const CARD_GAP = 6;        // 卡牌之间的间距
export const CARD_H = 110;        // 卡牌高度

/**
 * 根据卡牌大小计算宽度
 * size 1: 88px
 * size 2: 88*2 + 6 = 182px
 * size 3: 88*3 + 6*2 = 276px
 */
export function cardWidth(size: 1 | 2 | 3): number {
  return CARD_UNIT * size + CARD_GAP * (size - 1);
}

// ====== 屏幕分区 ======
// Zone 1: 顶部操作栏（按钮 / 拖拽售出区）
export const Z1_Y = 2;
export const Z1_H = 100;

// Zone 2: 内容区（储物箱 / 敌方卡牌 / 商店商品 / 选择按钮）
export const Z2_Y = 106;
export const Z2_H = 192;

// Zone 3: 玩家棋盘
export const Z3_Y = 302;
export const Z3_H = 156;

// Zone 4: 底部信息栏（HP / 金币 / 储物箱按钮）
export const Z4_Y = 462;
export const Z4_H = 100;

// 内容边距
export const SIDE_PAD = 16;       // 左右侧边距
export const INNER_X = SIDE_PAD + 8;

// Zone 2 & 3 内容位置
export const Z2_LABEL_Y = Z2_Y + 6;
export const Z2_CARD_Y = Z2_Y + 26;

export const Z3_LABEL_Y = Z3_Y + 4;
export const Z3_CARD_Y = Z3_Y + 22;

// 兼容旧导出名
export const UPPER_Y = Z1_Y;
export const UPPER_H = Z1_H + Z2_H + (Z2_Y - Z1_Y - Z1_H);
export const BOARD_Y = Z3_Y;
export const BOARD_INNER_X = INNER_X;
export const BOARD_INNER_Y = Z3_CARD_Y;
export const UPPER_INNER_X = INNER_X;
export const UPPER_INNER_Y = Z2_LABEL_Y;
export const BOTTOM_BAR_Y = Z4_Y;
export const BOTTOM_BAR_H = Z4_H;

// ====== 颜色系统 ======
export const TIER_COLORS: Record<string, number> = {
  bronze: 0xcd7f32,      // 青铜色 (边框)
  silver: 0xc0c0c0,      // 银色
  gold: 0xffd700,        // 金色
  diamond: 0x00ffff,     // 青绿色
  legendary: 0xff44ff,   // 洋红色
};

export const TIER_BG: Record<string, number> = {
  bronze: 0x3d2b1f,      // 深棕色 (背景)
  silver: 0x3a3a4a,      // 深灰蓝
  gold: 0x4a3a10,        // 深棕金
  diamond: 0x0a3a4a,     // 深青蓝
  legendary: 0x3a0a3a,   // 深紫红
};

/**
 * 获取稀有度对应的十六进制颜色字符串
 */
export function tierHex(tier: string): string {
  switch (tier) {
    case 'bronze': return '#cd7f32';
    case 'silver': return '#c0c0c0';
    case 'gold': return '#ffd700';
    case 'diamond': return '#00ffff';
    case 'legendary': return '#ff44ff';
    default: return '#888';
  }
}
```

---

## bazaar_items.ts 配置片段

```typescript
import type { ItemConfig } from '@autocard/shared';

// 从 BazaarDB 导入的卡牌数据
export const BAZAAR_ITEMS: ItemConfig[] = [
  // ====== 英雄 1: 皂沫 (dooley) ======
  {
    itemId: '皂沫中士',
    name: '皂沫中士',
    description: '最左侧物品在战斗中 +20 +40 +60 价值。',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 6.0,
    ports: [
      { category: 'output', type: 'damage', value: 5 },
    ],
    targetRule: { kind: 'self' },
    tags: [
      'Bronze',
      'CombatEncounter',
      'Common',
    ],
  },

  // ====== 英雄 2: 风车 (pygmalien) ======
  {
    itemId: '风车磨坊',
    name: '风车磨坊',
    description: '风车磨坊',
    size: 3,
    baseTier: 'gold',
    price: 3,
    cooldown: 35.0,
    ports: [
      { category: 'output', type: 'damage', value: 5 },
    ],
    targetRule: { kind: 'self' },
    tags: [
      'Gold+',
      'Item',
      'Large',
      'Pygmalien',
      'Health',
    ],
    categories: [
      'Pygmalien',
    ],
    sourceHero: 'pygmalien',
    image: '/assets/cards/风车磨坊.webp',  // 重要：图片路径
  },

  // ====== 英雄 3: 温馨海湾 (vanessa) ======
  {
    itemId: '温馨海湾',
    name: '温馨海湾',
    description: '温馨海湾',
    size: 3,
    baseTier: 'bronze',
    price: 3,
    cooldown: 4.0,
    ports: [
      { category: 'defense', type: 'shield', value: 10 },
    ],
    targetRule: { kind: 'self' },
    tags: [
      'Bronze+',
      'Item',
      'Large',
      'Vanessa',
      'Shield',
      'EconomyReference',
    ],
    categories: [
      'Vanessa',
    ],
    sourceHero: 'vanessa',
    image: '/assets/cards/温馨海湾.webp',
  },

  // 继续 ... 991 张卡牌
];

// 构建快速查找映射表
export const BAZAAR_ITEMS_MAP = new Map(
  BAZAAR_ITEMS.map(i => [i.itemId, i])
);
```

---

## BattleCardView.ts - 战斗中的卡牌

```typescript
import { Container, Graphics, Text } from 'pixi.js';
import type { SlotItem, CardRuntimeState, ItemSize } from '@autocard/shared';
import { gameState } from '../core/GameState.js';
import { cardWidth, CARD_H, TIER_COLORS, TIER_BG, tierHex } from './layout.js';

const STATUS_COLORS: Record<string, number> = {
  haste: 0xffdd00,       // 黄色 - 加速
  slow: 0x6688ff,        // 蓝色 - 减速
  freeze: 0x88eeff,      // 青色 - 冻结
  destroyed: 0xff2222,   // 红色 - 摧毁
};

/**
 * 战斗中的卡牌视图 - 显示实时冷却和状态
 */
export class BattleCardView extends Container {
  private bg!: Graphics;
  private cdBar!: Graphics;           // 冷却条
  private cdLabel!: Text;             // 冷却数字
  private statusOverlay!: Graphics;   // 状态效果叠加层
  private triggerFlash!: Graphics;    // 触发闪光
  private w: number;
  private h = CARD_H;
  private item: SlotItem;
  private cooldown: number;

  constructor(item: SlotItem) {
    super();
    this.item = item;
    this.w = cardWidth(item.size as ItemSize);
    const cfg = gameState.itemsMap.get(item.itemId);
    this.cooldown = cfg?.cooldown ?? 1;
    this.draw();
  }

  /**
   * 绘制卡牌框架
   */
  private draw() {
    const cfg = gameState.itemsMap.get(this.item.itemId);
    const w = this.w;
    const h = this.h;

    // 底框 - 稀有度颜色
    const border = new Graphics();
    border.roundRect(-2, -2, w + 4, h + 4, 8);
    border.fill({ 
      color: TIER_COLORS[this.item.tier] ?? 0x555555, 
      alpha: 0.9 
    });
    this.addChild(border);

    // 主体背景
    this.bg = new Graphics();
    this.bg.roundRect(0, 0, w, h, 6);
    this.bg.fill(TIER_BG[this.item.tier] ?? 0x222233);
    this.addChild(this.bg);

    if (cfg) {
      // 名称
      const name = new Text({
        text: cfg.name,
        style: { 
          fill: '#ffffff', 
          fontSize: this.item.size === 1 ? 11 : 14, 
          fontFamily: 'Arial', 
          fontWeight: 'bold' 
        },
      });
      name.anchor.set(0.5, 0);
      name.x = w / 2;
      name.y = 4;
      this.addChild(name);

      // 能力
      const portStr = cfg.ports.map(p => `${portSymbol(p.type)}${p.value}`).join(' ');
      const portText = new Text({
        text: portStr,
        style: { 
          fill: tierHex(this.item.tier), 
          fontSize: this.item.size === 1 ? 10 : 12, 
          fontFamily: 'Arial' 
        },
      });
      portText.anchor.set(0.5, 0);
      portText.x = w / 2;
      portText.y = 22;
      this.addChild(portText);
    }

    // 冷却条
    this.cdBar = new Graphics();
    this.addChild(this.cdBar);

    // 冷却标签
    this.cdLabel = new Text({
      text: '',
      style: { 
        fill: '#aaddff', 
        fontSize: 10, 
        fontFamily: 'Arial', 
        fontWeight: 'bold' 
      },
    });
    this.cdLabel.anchor.set(0.5, 1);
    this.cdLabel.x = w / 2;
    this.cdLabel.y = h - 10;
    this.addChild(this.cdLabel);
  }

  /**
   * 更新冷却条和标签
   * @param remaining 剩余冷却时间
   */
  updateCooldown(remaining: number) {
    const progress = Math.max(0, remaining / this.cooldown);
    const w = this.w;
    const h = this.h;

    // 清空冷却条
    this.cdBar.clear();
    
    if (progress > 0) {
      // 绘制冷却条背景
      this.cdBar.rect(4, h - 8, w - 8, 4);
      this.cdBar.fill(0x222222);
      
      // 绘制冷却进度
      const barW = (w - 8) * progress;
      this.cdBar.rect(4, h - 8, barW, 4);
      this.cdBar.fill(0x4a90d9);
      
      // 更新标签
      this.cdLabel.text = remaining.toFixed(1);
    } else {
      this.cdLabel.text = '';
    }
  }

  /**
   * 显示状态效果 (加速/减速/冻结/摧毁)
   */
  showStatus(status: string) {
    const color = STATUS_COLORS[status] ?? 0xaaaaaa;
    const w = this.w;
    const h = this.h;

    if (this.statusOverlay) {
      this.removeChild(this.statusOverlay);
    }

    this.statusOverlay = new Graphics();
    this.statusOverlay.roundRect(0, 0, w, h, 6);
    this.statusOverlay.fill(color);
    this.statusOverlay.alpha = 0.3;
    this.addChildAt(this.statusOverlay, this.children.length - 1);
  }

  /**
   * 触发闪光效果 (卡牌被触发时)
   */
  triggerFlash() {
    const w = this.w;
    const h = this.h;

    if (this.triggerFlash) {
      this.removeChild(this.triggerFlash);
    }

    this.triggerFlash = new Graphics();
    this.triggerFlash.roundRect(0, 0, w, h, 6);
    this.triggerFlash.fill(0xffff00);
    this.triggerFlash.alpha = 0.5;
    this.addChild(this.triggerFlash);

    // 0.2秒后淡出
    setTimeout(() => {
      if (this.triggerFlash && this.children.includes(this.triggerFlash)) {
        this.removeChild(this.triggerFlash);
      }
    }, 200);
  }
}

function portSymbol(type: string): string {
  // ... 同 CardView 中的定义
}
```

---

## 数据流示意图

```
┌─────────────────────────────────────────────────────────────┐
│                    bazaar_items.ts                          │
│                  (991 张卡牌配置)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  gameState.itemsMap        │
        │  Map<itemId, ItemConfig>   │
        └────────────────────────────┘
                     │
        ┌────────────┴────────────────┬────────────────┐
        │                             │                │
        ▼                             ▼                ▼
   CardView              BattleCardView         ShopCardView
   (标准卡牌)            (战斗卡牌)             (商店卡牌)
   
        │                             │                │
        ├──► 绘制框架                 ├──► 实时冷却    ├──► 购买按钮
        ├──► 加载图片                 ├──► 状态效果    ├──► 价格显示
        ├──► 显示能力                 └──► 闪光效果    └──► 状态标签
        └──► 显示稀有度

        │                 异步加载                  │
        └─────────────────────────────────────────┘
                          │
                          ▼
              ┌────────────────────┐
              │   imageCache       │
              │   (Texture Map)    │
              └────────────────────┘
                          │
                          ▼
              ┌────────────────────┐
              │  /assets/cards/    │
              │  (852 张 WebP)     │
              └────────────────────┘
```

