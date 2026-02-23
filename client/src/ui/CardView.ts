import { Container, Graphics, Text, Sprite, Texture } from 'pixi.js';
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
    // 图片区域大小
    const imgW = cardWidth - 12;
    const imgH = cardHeight - 55;
    const imgX = 6;
    const imgY = 20;

    // 创建背景框
    const imgBg = new Graphics();
    imgBg.roundRect(imgX, imgY, imgW, imgH, 4);
    imgBg.fill(0x111111);
    this.addChild(imgBg);

    // 异步加载图片
    if (imageCache.has(imageUrl)) {
      this.createSprite(imageCache.get(imageUrl)!, imgX, imgY, imgW, imgH);
    } else {
      Texture.fromURL(imageUrl)
        .then(texture => {
          imageCache.set(imageUrl, texture);
          this.createSprite(texture, imgX, imgY, imgW, imgH);
        })
        .catch(err => {
          console.warn(`Failed to load card image: ${imageUrl}`, err);
        });
    }
  }

  private createSprite(texture: Texture, x: number, y: number, w: number, h: number) {
    const sprite = new Sprite(texture);
    sprite.x = x;
    sprite.y = y;

    // 保持比例缩放
    const textureRatio = texture.width / texture.height;
    const targetRatio = w / h;

    if (textureRatio > targetRatio) {
      // 图片更宽，按高度缩放
      sprite.height = h;
      sprite.width = h * textureRatio;
      sprite.x = x + (w - sprite.width) / 2;
    } else {
      // 图片更高，按宽度缩放
      sprite.width = w;
      sprite.height = w / textureRatio;
      sprite.y = y + (h - sprite.height) / 2;
    }

    this.addChild(sprite);
  }

  get cardWidth() { return cardWidth(this.size); }
  get cardHeight() { return CARD_H; }
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
    opts: { purchased?: boolean; canAfford?: boolean; canPlace?: boolean; onBuy?: () => void },
  ) {
    super();
    const cfg = gameState.itemsMap.get(itemId);
    if (!cfg) return;

    const w = cardWidth(cfg.size as ItemSize);
    const h = CARD_H + 80;

    const border = new Graphics();
    border.roundRect(-2, -2, w + 4, h + 4, 8);
    border.fill({ color: opts.purchased ? 0x333333 : TIER_COLORS[cfg.baseTier] ?? 0x555555, alpha: 0.9 });
    this.addChild(border);

    const body = new Graphics();
    body.roundRect(0, 0, w, h, 6);
    body.fill(opts.purchased ? 0x222222 : (TIER_BG[cfg.baseTier] ?? 0x222233));
    this.addChild(body);

    const name = new Text({
      text: cfg.name,
      style: { fill: '#ffffff', fontSize: cfg.size === 1 ? 13 : 16, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    name.anchor.set(0.5, 0);
    name.x = w / 2;
    name.y = 6;
    this.addChild(name);

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

    if (opts.purchased) {
      const sold = new Text({ text: '已购', style: { fill: '#4ad97a', fontSize: 14, fontFamily: 'Arial' } });
      sold.anchor.set(0.5, 0);
      sold.x = w / 2;
      sold.y = CARD_H + 16;
      this.addChild(sold);
    } else if (!opts.canAfford) {
      const noGold = new Text({ text: '金币不足', style: { fill: '#ff6666', fontSize: 12, fontFamily: 'Arial' } });
      noGold.anchor.set(0.5, 0);
      noGold.x = w / 2;
      noGold.y = CARD_H + 16;
      this.addChild(noGold);
    } else if (!opts.canPlace) {
      const noPlace = new Text({ text: '无法购买', style: { fill: '#ff6666', fontSize: 12, fontFamily: 'Arial' } });
      noPlace.anchor.set(0.5, 0);
      noPlace.x = w / 2;
      noPlace.y = CARD_H + 16;
      this.addChild(noPlace);
    } else if (opts.onBuy) {
      const btnW = Math.min(w - 16, 100);
      const btn = new Graphics();
      btn.roundRect(0, 0, btnW, 32, 6);
      btn.fill(0x4a90d9);
      btn.x = (w - btnW) / 2;
      btn.y = CARD_H + 10;
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointertap', opts.onBuy);
      this.addChild(btn);
      const btnText = new Text({ text: '购买', style: { fill: '#fff', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' } });
      btnText.anchor.set(0.5);
      btnText.x = w / 2;
      btnText.y = CARD_H + 26;
      this.addChild(btnText);
    }
  }
}
