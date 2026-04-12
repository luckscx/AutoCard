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
  private cdLabel!: Text;
  private statusOverlay!: Graphics;
  private triggerFlash!: Graphics;
  private glowBorder!: Graphics;
  private statusText: Text | null = null;
  private _readyFlashed = false;
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

    // 金黄发光边框（haste 专用），置于最底层
    this.glowBorder = new Graphics();
    this.glowBorder.roundRect(-6, -6, w + 12, h + 12, 12);
    this.glowBorder.fill({ color: 0xffcc00, alpha: 0.4 });
    this.glowBorder.visible = false;
    this.addChild(this.glowBorder);

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

    this.cdLabel = new Text({
      text: '',
      style: { fill: '#aaddff', fontSize: 10, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    this.cdLabel.anchor.set(0.5, 1);
    this.cdLabel.x = w / 2;
    this.cdLabel.y = h - 10;
    this.addChild(this.cdLabel);

    this.statusOverlay = new Graphics();
    this.statusOverlay.alpha = 0.3;
    this.addChild(this.statusOverlay);

    // 触发闪光层：fill alpha=1，通过容器 alpha 控制渐变
    this.triggerFlash = new Graphics();
    this.triggerFlash.roundRect(0, 0, w, h, 6);
    this.triggerFlash.fill({ color: 0xffffff, alpha: 1 });
    this.triggerFlash.visible = false;
    this.addChild(this.triggerFlash);
  }

  updateState(cs: CardRuntimeState) {
    const w = this.w;
    const barH = 8;

    // 移除上一帧的状态文字
    if (this.statusText) {
      this.removeChild(this.statusText);
      this.statusText = null;
    }

    // ── 充能进度条 ──────────────────────────────────────────────
    this.cdBar.clear();
    this.cdBar.visible = true;

    const ratio = Math.min(cs.cooldownProgress / this.cooldown, 1);
    const isHidden = cs.destroyed || cs.freezeRemain > 0;

    if (isHidden) {
      // freeze / destroyed：隐藏进度条
      this.cdBar.visible = false;
      this.cdLabel.text = '';
      this._readyFlashed = false;
    } else {
      // 深蓝底层背景
      this.cdBar.roundRect(0, this.h - barH, w, barH, 3);
      this.cdBar.fill({ color: 0x1a3a6e, alpha: 1 });

      // 根据当前状态决定进度条颜色
      let barColor = 0x44aaff;
      if (cs.hasteRemain > 0) barColor = 0xffcc00;
      else if (cs.slowRemain > 0) barColor = 0x4466aa;

      if (ratio > 0) {
        if (ratio >= 1) {
          // 就绪：整体白色
          this.cdBar.roundRect(0, this.h - barH, w, barH, 3);
          this.cdBar.fill({ color: 0xffffff, alpha: 1 });

          // 首次到达 100% 触发闪烁
          if (!this._readyFlashed) {
            this._readyFlashed = true;
            this.flash();
          }
        } else {
          this._readyFlashed = false;
          const fillW = w * ratio;

          // 主进度填充
          this.cdBar.roundRect(0, this.h - barH, fillW, barH, 3);
          this.cdBar.fill({ color: barColor, alpha: 1 });

          // 前端高光点（宽 4px，亮蓝白）
          const hlW = 4;
          const hlX = Math.max(0, fillW - hlW);
          this.cdBar.rect(hlX, this.h - barH, hlW, barH);
          this.cdBar.fill({ color: 0x88ddff, alpha: 0.9 });
        }
      } else {
        this._readyFlashed = false;
      }

      const pct = Math.round(ratio * 100);
      this.cdLabel.text = pct >= 100 ? '就绪' : `${pct}%`;
    }

    // ── 状态覆盖层 ──────────────────────────────────────────────
    this.statusOverlay.clear();
    this.glowBorder.visible = false;

    if (cs.destroyed) {
      // 红色遮罩
      this.statusOverlay.alpha = 0.6;
      this.statusOverlay.roundRect(0, 0, w, this.h, 6);
      this.statusOverlay.fill(STATUS_COLORS.destroyed);

      // 中央 "X" 文字
      const xt = new Text({
        text: 'X',
        style: { fill: '#ff2222', fontSize: 24, fontFamily: 'Arial', fontWeight: 'bold' },
      });
      xt.anchor.set(0.5, 0.5);
      xt.x = w / 2;
      xt.y = this.h / 2;
      this.addChild(xt);
      this.statusText = xt;

    } else if (cs.freezeRemain > 0) {
      // 冰冻：明显蓝白遮罩
      this.statusOverlay.alpha = 0.5;
      this.statusOverlay.roundRect(0, 0, w, this.h, 6);
      this.statusOverlay.fill(0x88eeff);

      // 中央 "冻结" 文字
      const ft = new Text({
        text: '冻结',
        style: { fill: '#ffffff', fontSize: 14, fontFamily: 'Arial' },
      });
      ft.anchor.set(0.5, 0.5);
      ft.x = w / 2;
      ft.y = this.h / 2;
      this.addChild(ft);
      this.statusText = ft;

    } else if (cs.slowRemain > 0) {
      // 减速：深蓝灰遮罩
      this.statusOverlay.alpha = 0.4;
      this.statusOverlay.roundRect(0, 0, w, this.h, 6);
      this.statusOverlay.fill(0x334477);

    } else if (cs.hasteRemain > 0) {
      // 加速：淡金色遮罩 + 金黄发光边框
      this.statusOverlay.alpha = 0.25;
      this.statusOverlay.roundRect(0, 0, w, this.h, 6);
      this.statusOverlay.fill(STATUS_COLORS.haste);
      this.glowBorder.visible = true;
    }
  }

  flash() {
    this.triggerFlash.alpha = 0.7;
    this.triggerFlash.visible = true;
    setTimeout(() => {
      this.triggerFlash.alpha = 0.2;
      setTimeout(() => {
        this.triggerFlash.visible = false;
        this.triggerFlash.alpha = 1; // 重置，供下次使用
      }, 80);
    }, 80);
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
