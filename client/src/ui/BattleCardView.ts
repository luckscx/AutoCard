import { Container, Graphics, Text } from 'pixi.js';
import type { SlotItem, CardRuntimeState, ItemSize } from '@autocard/shared';
import { gameState } from '../core/GameState.js';
import { cardWidth, CARD_H, TIER_COLORS, TIER_BG, tierHex } from './layout.js';

const STATUS_COLORS: Record<string, number> = {
  haste: 0xffdd00,
  slow: 0x6688ff,
  freeze: 0x88eeff,
  destroyed: 0xff2222,
};

export class BattleCardView extends Container {
  private bg!: Graphics;
  private cdBar!: Graphics;
  private statusOverlay!: Graphics;
  private triggerFlash!: Graphics;
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

  private draw() {
    const cfg = gameState.itemsMap.get(this.item.itemId);
    const w = this.w;
    const h = this.h;

    const border = new Graphics();
    border.roundRect(-2, -2, w + 4, h + 4, 8);
    border.fill({ color: TIER_COLORS[this.item.tier] ?? 0x555555, alpha: 0.9 });
    this.addChild(border);

    this.bg = new Graphics();
    this.bg.roundRect(0, 0, w, h, 6);
    this.bg.fill(TIER_BG[this.item.tier] ?? 0x222233);
    this.addChild(this.bg);

    if (cfg) {
      const name = new Text({
        text: cfg.name,
        style: { fill: '#ffffff', fontSize: this.item.size === 1 ? 11 : 14, fontFamily: 'Arial', fontWeight: 'bold' },
      });
      name.anchor.set(0.5, 0);
      name.x = w / 2;
      name.y = 4;
      this.addChild(name);

      const portStr = cfg.ports.map(p => `${portSymbol(p.type)}${p.value}`).join(' ');
      const portText = new Text({
        text: portStr,
        style: { fill: tierHex(this.item.tier), fontSize: this.item.size === 1 ? 10 : 12, fontFamily: 'Arial' },
      });
      portText.anchor.set(0.5, 0);
      portText.x = w / 2;
      portText.y = 22;
      this.addChild(portText);
    }

    this.cdBar = new Graphics();
    this.addChild(this.cdBar);

    this.statusOverlay = new Graphics();
    this.statusOverlay.alpha = 0.3;
    this.addChild(this.statusOverlay);

    this.triggerFlash = new Graphics();
    this.triggerFlash.roundRect(0, 0, w, h, 6);
    this.triggerFlash.fill({ color: 0xffffff, alpha: 0.6 });
    this.triggerFlash.visible = false;
    this.addChild(this.triggerFlash);
  }

  updateState(cs: CardRuntimeState) {
    const w = this.w;
    const barH = 6;

    this.cdBar.clear();
    if (!cs.destroyed) {
      this.cdBar.roundRect(0, this.h - barH, w, barH, 3);
      this.cdBar.fill({ color: 0x333355, alpha: 0.8 });
      const ratio = Math.min(cs.cooldownProgress / this.cooldown, 1);
      if (ratio > 0) {
        this.cdBar.roundRect(0, this.h - barH, w * ratio, barH, 3);
        this.cdBar.fill(0x44aaff);
      }
    }

    this.statusOverlay.clear();
    if (cs.destroyed) {
      this.statusOverlay.alpha = 0.6;
      this.statusOverlay.roundRect(0, 0, w, this.h, 6);
      this.statusOverlay.fill(STATUS_COLORS.destroyed);
    } else if (cs.freezeRemain > 0) {
      this.statusOverlay.roundRect(0, 0, w, this.h, 6);
      this.statusOverlay.fill(STATUS_COLORS.freeze);
    } else if (cs.slowRemain > 0) {
      this.statusOverlay.roundRect(0, 0, w, this.h, 6);
      this.statusOverlay.fill(STATUS_COLORS.slow);
    } else if (cs.hasteRemain > 0) {
      this.statusOverlay.roundRect(0, 0, w, this.h, 6);
      this.statusOverlay.fill(STATUS_COLORS.haste);
    }
  }

  flash() {
    this.triggerFlash.visible = true;
    setTimeout(() => { this.triggerFlash.visible = false; }, 120);
  }

  get cardW() { return this.w; }
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
    case 'destroy': return '\uD83D\uDCA5';
    default: return '\u2B50';
  }
}
