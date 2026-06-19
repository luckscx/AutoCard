import { Container, Graphics, Text, Ticker } from 'pixi.js';
import type { SlotItem, CardRuntimeState, ItemSize } from '@autocard/shared';
import { gameState } from '../core/GameState.js';
import { cardWidth, CARD_H, TIER_COLORS, TIER_BG, tierHex } from './layout.js';

const STATUS_COLORS: Record<string, number> = {
  haste:     0xffdd00,
  slow:      0x6688ff,
  freeze:    0x88eeff,
  destroyed: 0xff2222,
};

// 全局共享 ticker，避免每张卡都创建独立 ticker
let _sharedTicker: Ticker | null = null;
function getSharedTicker(): Ticker {
  if (!_sharedTicker) {
    _sharedTicker = new Ticker();
    _sharedTicker.start();
  }
  return _sharedTicker;
}

export class BattleCardView extends Container {
  private bg!: Graphics;
  private cdBar!: Graphics;
  private cdLabel!: Text;
  private statusOverlay!: Graphics;
  private triggerFlash!: Graphics;
  private glowBorder!: Graphics;
  private statusText: Text | null = null;
  private _readyFlashed = false;
  private _flashAlpha = 0;
  private _flashActive = false;
  private _damagePulse = 0;       // >0 时做红色受伤脉冲
  private _readyPulse = 0;        // >0 时做就绪白色脉冲
  private _tickerCb: (() => void) | null = null;
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
    this._startTicker();
  }

  private draw() {
    const cfg = gameState.itemsMap.get(this.item.itemId);
    const w = this.w;
    const h = this.h;

    // 发光边框（haste 专用）
    this.glowBorder = new Graphics();
    this.glowBorder.roundRect(-5, -5, w + 10, h + 10, 10);
    this.glowBorder.fill({ color: 0xffcc00, alpha: 0.5 });
    this.glowBorder.visible = false;
    this.addChild(this.glowBorder);

    // tier 彩色边框
    const border = new Graphics();
    border.roundRect(-2, -2, w + 4, h + 4, 8);
    border.fill({ color: TIER_COLORS[this.item.tier] ?? 0x555555, alpha: 0.9 });
    this.addChild(border);

    // 卡牌主体背景
    this.bg = new Graphics();
    this.bg.roundRect(0, 0, w, h, 6);
    this.bg.fill(TIER_BG[this.item.tier] ?? 0x222233);
    this.addChild(this.bg);

    if (cfg) {
      const name = new Text({
        text: cfg.name,
        style: {
          fill: '#ffffff',
          fontSize: this.item.size === 1 ? 9 : 13,
          fontFamily: 'Arial',
          fontWeight: 'bold',
        },
      });
      name.anchor.set(0.5, 0);
      name.x = w / 2;
      name.y = 3;
      this.addChild(name);

      if (this.item.size > 1) {
        const portStr = cfg.ports.map(p => `${portSymbol(p.type)}${p.value}`).join(' ');
        const portText = new Text({
          text: portStr,
          style: { fill: tierHex(this.item.tier), fontSize: 11, fontFamily: 'Arial' },
        });
        portText.anchor.set(0.5, 0);
        portText.x = w / 2;
        portText.y = 20;
        this.addChild(portText);
      }
    }

    // 充能进度条
    this.cdBar = new Graphics();
    this.addChild(this.cdBar);

    // 进度标签（只在 size>1 时显示，size=1 卡太窄）
    this.cdLabel = new Text({
      text: '',
      style: { fill: '#aaddff', fontSize: 9, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    this.cdLabel.anchor.set(0.5, 1);
    this.cdLabel.x = w / 2;
    this.cdLabel.y = h - 11;
    this.cdLabel.visible = this.item.size > 1;
    this.addChild(this.cdLabel);

    // 状态覆盖层
    this.statusOverlay = new Graphics();
    this.addChild(this.statusOverlay);

    // 触发闪光层（用 alpha 控制，初始隐藏）
    this.triggerFlash = new Graphics();
    this.triggerFlash.roundRect(0, 0, w, h, 6);
    this.triggerFlash.fill({ color: 0xffffff, alpha: 1 });
    this.triggerFlash.alpha = 0;
    this.triggerFlash.visible = false;
    this.addChild(this.triggerFlash);
  }

  // ── Ticker 驱动所有动画 ────────────────────────────────────────────────────
  private _startTicker() {
    const ticker = getSharedTicker();
    this._tickerCb = () => this._onTick(ticker.deltaTime);
    ticker.add(this._tickerCb);
  }

  private _onTick(delta: number) {
    const decay = delta * 0.08; // 每帧衰减量（~60fps 时约 1.2s 完全消隐）

    // ── 触发闪光渐隐 ──
    if (this._flashActive) {
      this._flashAlpha = Math.max(0, this._flashAlpha - decay);
      this.triggerFlash.alpha = this._flashAlpha;
      if (this._flashAlpha <= 0) {
        this._flashActive = false;
        this.triggerFlash.visible = false;
      }
    }

    // ── 受伤红色脉冲渐隐 ──
    if (this._damagePulse > 0) {
      this._damagePulse = Math.max(0, this._damagePulse - decay * 1.5);
      this.statusOverlay.alpha = this._damagePulse * 0.7;
      if (this._damagePulse <= 0) {
        this.statusOverlay.clear();
      }
    }

    // ── 就绪白色脉冲渐隐 ──
    if (this._readyPulse > 0) {
      this._readyPulse = Math.max(0, this._readyPulse - decay * 0.6);
      this.triggerFlash.alpha = this._readyPulse * 0.5;
      this.triggerFlash.visible = this._readyPulse > 0;
    }

    // ── glowBorder 脉动（haste 时持续跳动）──
    if (this.glowBorder.visible) {
      const pulse = (Math.sin(Date.now() * 0.006) + 1) / 2;
      this.glowBorder.alpha = 0.3 + pulse * 0.5;
    }
  }

  // ── 触发闪光（卡牌技能激活）────────────────────────────────────────────────
  flash() {
    this.triggerFlash.clear();
    this.triggerFlash.roundRect(0, 0, this.w, this.h, 6);
    this.triggerFlash.fill({ color: 0xffffff, alpha: 1 });
    this._flashAlpha = 0.85;
    this.triggerFlash.alpha = this._flashAlpha;
    this.triggerFlash.visible = true;
    this._flashActive = true;
    this._readyPulse = 0; // 避免和就绪脉冲互相干扰
  }

  // ── 受伤脉冲（外部调用，由 BattleScene processEvent damage 触发）────────────
  flashDamage() {
    this.statusOverlay.clear();
    this.statusOverlay.roundRect(0, 0, this.w, this.h, 6);
    this.statusOverlay.fill({ color: 0xff2222, alpha: 1 });
    this._damagePulse = 1.0;
    this.statusOverlay.alpha = 0.7;
  }

  // ── 更新运行时状态 ──────────────────────────────────────────────────────────
  updateState(cs: CardRuntimeState) {
    const w = this.w;
    const barH = 6; // 竖屏下卡牌只有 34px 宽，进度条高度 6px 更合适

    // 清除上一帧状态文字
    if (this.statusText) {
      this.removeChild(this.statusText);
      this.statusText?.destroy();
      this.statusText = null;
    }

    // ── 充能进度条 ──────────────────────────────────────────────────────────
    this.cdBar.clear();
    const ratio = Math.min(cs.cooldownProgress / this.cooldown, 1);
    const isHidden = cs.destroyed || cs.freezeRemain > 0;

    if (isHidden) {
      this.cdLabel.text = '';
      this._readyFlashed = false;
    } else {
      const barY = this.h - barH;

      // 轨道背景
      this.cdBar.roundRect(0, barY, w, barH, 2);
      this.cdBar.fill({ color: 0x0a1a30, alpha: 1 });

      if (ratio >= 1) {
        // 就绪：整条亮白，带蓝白渐变感
        this.cdBar.roundRect(0, barY, w, barH, 2);
        this.cdBar.fill({ color: 0xffffff, alpha: 1 });

        if (!this._readyFlashed) {
          this._readyFlashed = true;
          // 触发就绪脉冲（比 flash 弱一些，金黄色）
          this.triggerFlash.clear();
          this.triggerFlash.roundRect(0, 0, w, this.h, 6);
          this.triggerFlash.fill({ color: 0xffee44, alpha: 1 });
          this._readyPulse = 1.0;
          this._flashActive = false;
        }
      } else {
        this._readyFlashed = false;
        this._readyPulse = 0;

        if (ratio > 0) {
          // 进度颜色：普通蓝 / haste 金 / slow 暗蓝
          let barColor = 0x44aaff;
          if (cs.hasteRemain > 0)     barColor = 0xffcc00;
          else if (cs.slowRemain > 0) barColor = 0x3355aa;

          const fillW = Math.max(2, w * ratio);
          this.cdBar.roundRect(0, barY, fillW, barH, 2);
          this.cdBar.fill({ color: barColor, alpha: 1 });

          // 前端高光（亮点）
          const hlW = Math.min(4, fillW);
          this.cdBar.rect(fillW - hlW, barY, hlW, barH);
          this.cdBar.fill({ color: 0xffffff, alpha: 0.8 });
        }
      }

      if (this.item.size > 1) {
        const pct = Math.round(ratio * 100);
        this.cdLabel.text = pct >= 100 ? '就绪' : `${pct}%`;
      }
    }

    // ── 状态覆盖层（不被 damagePulse 控制的部分）────────────────────────────
    // 只有 damagePulse 不活跃时才更新 statusOverlay
    if (this._damagePulse <= 0) {
      this.statusOverlay.clear();
      this.glowBorder.visible = false;

      if (cs.destroyed) {
        this.statusOverlay.alpha = 0.65;
        this.statusOverlay.roundRect(0, 0, w, this.h, 6);
        this.statusOverlay.fill(STATUS_COLORS.destroyed);
        // 叉号
        const xt = new Text({
          text: '✕',
          style: { fill: '#ff4444', fontSize: w > 60 ? 26 : 16, fontFamily: 'Arial', fontWeight: 'bold' },
        });
        xt.anchor.set(0.5, 0.5);
        xt.x = w / 2;
        xt.y = this.h / 2;
        this.addChild(xt);
        this.statusText = xt;

      } else if (cs.freezeRemain > 0) {
        this.statusOverlay.alpha = 0.55;
        this.statusOverlay.roundRect(0, 0, w, this.h, 6);
        this.statusOverlay.fill(0x88eeff);
        if (w > 50) {
          const ft = new Text({
            text: '冻',
            style: { fill: '#ffffff', fontSize: 13, fontFamily: 'Arial', fontWeight: 'bold' },
          });
          ft.anchor.set(0.5, 0.5);
          ft.x = w / 2;
          ft.y = this.h / 2;
          this.addChild(ft);
          this.statusText = ft;
        }

      } else if (cs.slowRemain > 0) {
        this.statusOverlay.alpha = 0.35;
        this.statusOverlay.roundRect(0, 0, w, this.h, 6);
        this.statusOverlay.fill(0x334477);

      } else if (cs.hasteRemain > 0) {
        this.statusOverlay.alpha = 0.22;
        this.statusOverlay.roundRect(0, 0, w, this.h, 6);
        this.statusOverlay.fill(STATUS_COLORS.haste);
        this.glowBorder.visible = true;
      }
    }
  }

  // 销毁时移除 ticker 回调，防止内存泄漏
  destroy(options?: Parameters<Container['destroy']>[0]) {
    if (this._tickerCb) {
      getSharedTicker().remove(this._tickerCb);
      this._tickerCb = null;
    }
    super.destroy(options);
  }

  get cardW() { return this.w; }
}

function portSymbol(type: string): string {
  switch (type) {
    case 'damage':  return '\u2694\uFE0F';
    case 'poison':  return '\u2620\uFE0F';
    case 'burn':    return '\uD83D\uDD25';
    case 'heal':    return '\u2764\uFE0F';
    case 'shield':  return '\uD83D\uDEE1\uFE0F';
    case 'haste':   return '\u26A1';
    case 'charge':  return '\uD83D\uDD0B';
    case 'slow':    return '\u2744\uFE0F';
    case 'freeze':  return '\u2744\uFE0F';
    case 'destroy': return '\uD83D\uDCA5';
    default:        return '\u2B50';
  }
}
