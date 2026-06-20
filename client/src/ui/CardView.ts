import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import type { SlotItem, ItemSize } from '@autocard/shared';
import { gameState } from '../core/GameState.js';
import { cardWidth, CARD_H, TIER_COLORS, TIER_BG, tierHex } from './layout.js';

// 图片缓存
const imageCache = new Map<string, Texture>();

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
    const w = cardWidth(this.size);
    this.eventMode = 'static';
    this.hitArea = new Rectangle(0, 0, w, CARD_H);
  }

  private draw() {
    const cfg = gameState.itemsMap.get(this.itemId);
    const w = cardWidth(this.size);
    const h = CARD_H;

    // 卡牌底框
    const border = new Graphics();
    border.roundRect(-2, -2, w + 4, h + 4, 8);
    border.fill({ color: TIER_COLORS[this.tier] ?? 0x555555, alpha: 0.9 });
    this.addChild(border);

    // 卡牌主体
    const body = new Graphics();
    body.roundRect(0, 0, w, h, 6);
    body.fill(TIER_BG[this.tier] ?? 0x222233);
    this.addChild(body);

    if (!cfg) return;

    // 显示卡牌图片
    if (cfg.image) {
      this.drawCardImage(cfg.image, w, h);
    }

    // 名称
    const name = new Text({
      text: cfg.name,
      style: { fill: '#ffffff', fontSize: this.size === 1 ? 11 : 13, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    name.anchor.set(0.5, 0);
    name.x = w / 2;
    name.y = 4;
    this.addChild(name);

    // 如果有图片，调整布局
    const hasImage = !!cfg.image;
    const portY = hasImage ? h - 40 : 28;

    // 端口图标区 — 简单文字表示
    const portStr = cfg.ports.map(p => {
      const sym = portSymbol(p.type);
      return `${sym}${p.value}`;
    }).join(' ');
    const portText = new Text({
      text: portStr,
      style: { fill: tierHex(this.tier), fontSize: this.size === 1 ? 10 : 12, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    portText.anchor.set(0.5, 0);
    portText.x = w / 2;
    portText.y = portY;
    this.addChild(portText);

    // 冷却 (左下)
    const cdText = new Text({
      text: `${cfg.cooldown}`,
      style: { fill: '#aaddff', fontSize: 11, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    cdText.x = 6;
    cdText.y = h - 18;
    this.addChild(cdText);

    // Tier 标记 (右下)
    const tierLabel = new Text({
      text: this.tier[0].toUpperCase(),
      style: { fill: tierHex(this.tier), fontSize: 11, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    tierLabel.anchor.set(1, 0);
    tierLabel.x = w - 6;
    tierLabel.y = h - 18;
    this.addChild(tierLabel);

    // 中部描述 (仅 size>=2 且没有图片时显示)
    if (this.size >= 2 && !hasImage) {
      const desc = new Text({
        text: cfg.description,
        style: { fill: '#99aabb', fontSize: 10, fontFamily: 'Arial', wordWrap: true, wordWrapWidth: w - 16 },
      });
      desc.x = 8;
      desc.y = 50;
      this.addChild(desc);
    }
  }

  private drawCardImage(imageUrl: string, cardWidth: number, cardHeight: number) {
    const imgW = cardWidth - 12;
    const imgH = cardHeight - 55;
    const imgX = 6;
    const imgY = 20;
    drawImageInto(this, imageUrl, imgX, imgY, imgW, imgH);
  }

  get cardWidth() { return cardWidth(this.size); }
  get cardHeight() { return CARD_H; }
}

// ──────────────────────────────────────────────────────────────────────────────
// 模块级共享工具函数
// ──────────────────────────────────────────────────────────────────────────────

/** 在容器内绘制卡牌图片（含深色背景框 + 按比例缩放的 Sprite） */
function drawImageInto(container: Container, imageUrl: string, x: number, y: number, w: number, h: number) {
  const imgBg = new Graphics();
  imgBg.roundRect(x, y, w, h, 4);
  imgBg.fill(0x111111);
  container.addChild(imgBg);

  const apply = (texture: Texture) => {
    const sprite = new Sprite(texture);
    const texRatio = texture.width / texture.height;
    const tgtRatio = w / h;
    if (texRatio > tgtRatio) {
      sprite.height = h;
      sprite.width = h * texRatio;
      sprite.x = x + (w - sprite.width) / 2;
      sprite.y = y;
    } else {
      sprite.width = w;
      sprite.height = w / texRatio;
      sprite.x = x;
      sprite.y = y + (h - sprite.height) / 2;
    }
    // 用矩形遮罩裁剪，防止图片溢出卡牌边界
    const mask = new Graphics();
    mask.rect(x, y, w, h);
    mask.fill(0xffffff);
    container.addChild(mask);
    sprite.mask = mask;
    container.addChild(sprite);
  };

  if (imageCache.has(imageUrl)) {
    apply(imageCache.get(imageUrl)!);
  } else {
    Assets.load<Texture>(imageUrl)
      .then((texture: Texture) => {
        imageCache.set(imageUrl, texture);
        apply(texture);
      })
      .catch((err: unknown) => {
        console.warn(`Failed to load card image: ${imageUrl}`, err);
      });
  }
}

function portSymbol(type: string): string {
  switch (type) {
    case 'damage': return '\u2694\uFE0F';
    case 'poison': return '\u2620\uFE0F';
    case 'burn': return '\uD83D\uDD25';
    case 'heal': return '\u2764\uFE0F';
    case 'shield': return '\uD83D\uDEE1\uFE0F';
    case 'haste': return '\u26A1';
    case 'charge': return '\uD83D\uDD0B';
    case 'slow': return '\u2744\uFE0F';
    case 'freeze': return '\u2744\uFE0F';
    default: return '\u2B50';
  }
}

export class ShopCardView extends Container {
  constructor(
    itemId: string,
    opts: { purchased?: boolean; canAfford?: boolean; canPlace?: boolean; canUpgrade?: boolean; onBuy?: () => void },
  ) {
    super();
    const cfg = gameState.itemsMap.get(itemId);
    if (!cfg) return;

    const w = cardWidth(cfg.size as ItemSize);
    const hasImg = !!cfg.image;

    // 商店卡牌高度：有图片时更高一些，便于显示图片
    const SHOP_IMG_H = 96;  // 图片区高度
    const SHOP_INFO_H = 48; // 端口/价格信息区高度
    const BTN_AREA_H = 44;  // 购买按钮区高度
    const NAME_H = 24;      // 名称区高度
    const h = hasImg
      ? NAME_H + SHOP_IMG_H + SHOP_INFO_H + BTN_AREA_H
      : CARD_H + 80;

    // 边框
    const border = new Graphics();
    border.roundRect(-2, -2, w + 4, h + 4, 8);
    border.fill({ color: opts.purchased ? 0x333333 : TIER_COLORS[cfg.baseTier] ?? 0x555555, alpha: 0.9 });
    this.addChild(border);

    // 主体背景
    const body = new Graphics();
    body.roundRect(0, 0, w, h, 6);
    body.fill(opts.purchased ? 0x222222 : (TIER_BG[cfg.baseTier] ?? 0x222233));
    this.addChild(body);

    // 名称（顶部居中）
    const name = new Text({
      text: cfg.name,
      style: { fill: '#ffffff', fontSize: cfg.size === 1 ? 12 : 14, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    name.anchor.set(0.5, 0);
    name.x = w / 2;
    name.y = 5;
    this.addChild(name);

    if (hasImg) {
      // ── 有图片时的布局 ──
      // 图片区
      drawImageInto(this, cfg.image!, 4, NAME_H, w - 8, SHOP_IMG_H);

      // 端口效果（图片下方）
      const portStr = cfg.ports.map(p => `${portSymbol(p.type)}${p.value}`).join('  ');
      const portText = new Text({
        text: portStr,
        style: { fill: tierHex(cfg.baseTier), fontSize: cfg.size === 1 ? 11 : 13, fontFamily: 'Arial', fontWeight: 'bold' },
      });
      portText.anchor.set(0.5, 0);
      portText.x = w / 2;
      portText.y = NAME_H + SHOP_IMG_H + 4;
      this.addChild(portText);

      // 价格 / CD / 格数
      const info = new Text({
        text: `${cfg.price}G  CD:${cfg.cooldown}s  ${cfg.size}格`,
        style: { fill: '#ffcc00', fontSize: 11, fontFamily: 'Arial' },
      });
      info.anchor.set(0.5, 0);
      info.x = w / 2;
      info.y = NAME_H + SHOP_IMG_H + 22;
      this.addChild(info);
    } else {
      // ── 无图片时的回退布局（文字版）──
      const desc = new Text({
        text: cfg.description,
        style: { fill: '#99aabb', fontSize: 11, fontFamily: 'Arial', wordWrap: true, wordWrapWidth: w - 12 },
      });
      desc.x = 6;
      desc.y = 28;
      this.addChild(desc);

      const portStr = cfg.ports.map(p => `${portSymbol(p.type)}${p.value}`).join(' ');
      const portText = new Text({
        text: portStr,
        style: { fill: tierHex(cfg.baseTier), fontSize: 12, fontFamily: 'Arial' },
      });
      portText.x = 6;
      portText.y = 68;
      this.addChild(portText);

      const info = new Text({
        text: `${cfg.price}G  CD:${cfg.cooldown}  ${cfg.size}格`,
        style: { fill: '#ffcc00', fontSize: 12, fontFamily: 'Arial' },
      });
      info.x = 6;
      info.y = 88;
      this.addChild(info);
    }

    // ── 购买状态区域 ──
    const statusY = h - BTN_AREA_H + 6;

    // 可升级标记（卡牌右上角）
    if (opts.canUpgrade && !opts.purchased) {
      const upBadge = new Text({
        text: '⬆️可升级',
        style: { fill: '#ffd700', fontSize: 11, fontFamily: 'Arial', fontWeight: 'bold' },
      });
      upBadge.anchor.set(1, 0);
      upBadge.x = w - 4;
      upBadge.y = 3;
      this.addChild(upBadge);
    }

    if (opts.purchased) {
      const sold = new Text({ text: '已购', style: { fill: '#4ad97a', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' } });
      sold.anchor.set(0.5, 0);
      sold.x = w / 2;
      sold.y = statusY;
      this.addChild(sold);
    } else if (!opts.canAfford) {
      const noGold = new Text({ text: '金币不足', style: { fill: '#ff6666', fontSize: 12, fontFamily: 'Arial' } });
      noGold.anchor.set(0.5, 0);
      noGold.x = w / 2;
      noGold.y = statusY;
      this.addChild(noGold);
    } else if (!opts.canPlace && !opts.canUpgrade) {
      const noPlace = new Text({ text: '无法放置', style: { fill: '#ff6666', fontSize: 12, fontFamily: 'Arial' } });
      noPlace.anchor.set(0.5, 0);
      noPlace.x = w / 2;
      noPlace.y = statusY;
      this.addChild(noPlace);
    } else if (opts.onBuy) {
      const btnW = Math.min(w - 16, 100);
      const btn = new Graphics();
      btn.roundRect(0, 0, btnW, 30, 6);
      btn.fill(opts.canUpgrade ? 0xd9944a : 0x4a90d9);
      btn.x = (w - btnW) / 2;
      btn.y = statusY;
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointertap', opts.onBuy);
      this.addChild(btn);
      const btnText = new Text({
        text: opts.canUpgrade ? '升级' : '购买',
        style: { fill: '#fff', fontSize: 13, fontFamily: 'Arial', fontWeight: 'bold' },
      });
      btnText.anchor.set(0.5);
      btnText.x = w / 2;
      btnText.y = statusY + 15;
      this.addChild(btnText);
    }
  }
}
