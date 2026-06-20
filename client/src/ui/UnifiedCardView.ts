import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture, Ticker } from 'pixi.js';
import type { SlotItem, CardRuntimeState, ItemSize } from '@autocard/shared';
import { gameState } from '../core/GameState.js';
import { cardWidth, CARD_H, TIER_COLORS, TIER_BG, tierHex } from './layout.js';
import { CardTooltip } from './CardTooltip.js';

export type CardMode = 'normal' | 'battle';

// ── 模块级共享 ────────────────────────────────────────────────────────────────
const imageCache = new Map<string, Texture>();

const STATUS_COLORS: Record<string, number> = {
  haste:     0xffdd00,
  slow:      0x6688ff,
  freeze:    0x88eeff,
  destroyed: 0xff2222,
};

/** 颜色线性插值：a/b 为 0xRRGGBB 格式，t ∈ [0,1] */
function colorLerp(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b_ = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | b_;
}

/** 端口符号 */
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

// ═══════════════════════════════════════════════════════════════════════════════
// UnifiedCardView — 统一卡牌组件
// ═══════════════════════════════════════════════════════════════════════════════

export class UnifiedCardView extends Container {
  private mode: CardMode;

  // ── 外观层（两种模式共用）──────────────────────────────────────────────────
  private bg!: Graphics;           // 卡牌主体背景

  // ── 外观层（battle 模式专用）────────────────────────────────────────────────
  private cooldownBar!: Graphics;  // 充能进度条
  private cooldownLabel!: Text;    // 进度百分比标签
  private statusOverlay!: Graphics;// 状态覆盖层（冻结/摧毁/减速/加速）
  private triggerFlash!: Graphics; // 闪光遮罩
  private glowBorder!: Graphics;   // haste 发光边框
  private statusText: Text | null = null;

  // ── 动画状态（battle 模式）──────────────────────────────────────────────────
  private _cooldownProgress = 0;
  private _haste = false;
  private _flashAlpha = 0;
  private _flashActive = false;
  private _damagePulse = 0;
  private _readyPulse = 0;
  private _readyFlashed = false;
  private _elapsed = 0;            // 累计时间(ms)，供 sin 波使用
  private _tickerCb: ((ticker: Ticker) => void) | null = null;

  private w: number;
  private h = CARD_H;
  private item: SlotItem;

  // ── 长按 Tooltip ────────────────────────────────────────────────────────────
  private static _tooltip: CardTooltip | null = null;
  private _pressTimer: ReturnType<typeof setTimeout> | null = null;
  private _pressing = false;

  // ── 构造函数 ────────────────────────────────────────────────────────────────

  constructor(item: SlotItem, mode: CardMode = 'normal') {
    super();
    this.item = item;
    this.mode = mode;
    this.w = cardWidth(item.size as ItemSize);

    if (mode === 'normal') {
      this.drawNormal();
      this.eventMode = 'static';
      this.hitArea = new Rectangle(0, 0, this.w, CARD_H);
    } else {
      this.drawBattle();
      this._startTicker();
    }

    // ── 长按 1s 显示 Tooltip（两种模式都支持）───────────────────────────────
    this.eventMode = 'static';
    this.hitArea = new Rectangle(0, 0, this.w, CARD_H);
    this._bindLongPress();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 绘制：normal 模式（从 CardView 迁移）
  // ═══════════════════════════════════════════════════════════════════════════

  private drawNormal() {
    const cfg = gameState.itemsMap.get(this.item.itemId);
    const w = this.w;
    const h = this.h;

    // 卡牌底框
    const border = new Graphics();
    border.roundRect(-2, -2, w + 4, h + 4, 8);
    border.fill({ color: TIER_COLORS[this.item.tier] ?? 0x555555, alpha: 0.9 });
    this.addChild(border);

    // 卡牌主体
    this.bg = new Graphics();
    this.bg.roundRect(0, 0, w, h, 6);
    this.bg.fill(TIER_BG[this.item.tier] ?? 0x222233);
    this.addChild(this.bg);

    if (!cfg) return;

    // 卡牌图片
    if (cfg.image) {
      this.drawCardImage(cfg.image, w, h);
    }

    // 名称
    const name = new Text({
      text: cfg.name,
      style: { fill: '#ffffff', fontSize: this.item.size === 1 ? 11 : 13, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    name.anchor.set(0.5, 0);
    name.x = w / 2;
    name.y = 4;
    this.addChild(name);

    const hasImage = !!cfg.image;
    const portY = hasImage ? h - 40 : 28;

    // 端口图标
    const portStr = cfg.ports.map(p => `${portSymbol(p.type)}${p.value}`).join(' ');
    const portText = new Text({
      text: portStr,
      style: { fill: tierHex(this.item.tier), fontSize: this.item.size === 1 ? 10 : 12, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    portText.anchor.set(0.5, 0);
    portText.x = w / 2;
    portText.y = portY;
    this.addChild(portText);

    // 冷却（左下）
    const cdText = new Text({
      text: `${cfg.cooldown}`,
      style: { fill: '#aaddff', fontSize: 11, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    cdText.x = 6;
    cdText.y = h - 18;
    this.addChild(cdText);

    // Tier 标记（右下）
    const tierLabel = new Text({
      text: this.item.tier[0].toUpperCase(),
      style: { fill: tierHex(this.item.tier), fontSize: 11, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    tierLabel.anchor.set(1, 0);
    tierLabel.x = w - 6;
    tierLabel.y = h - 18;
    this.addChild(tierLabel);

    // 描述（仅 size>=2 且无图）
    if (this.item.size >= 2 && !hasImage) {
      const desc = new Text({
        text: cfg.description,
        style: { fill: '#99aabb', fontSize: 10, fontFamily: 'Arial', wordWrap: true, wordWrapWidth: w - 16 },
      });
      desc.x = 8;
      desc.y = 50;
      this.addChild(desc);
    }
  }

  /** 在容器内绘制卡牌图片（含深色背景框 + 按比例缩放的 Sprite） */
  private drawCardImage(imageUrl: string, cardW: number, cardH: number) {
    const imgW = cardW - 12;
    const imgH = cardH - 55;
    const imgX = 6;
    const imgY = 20;
    this._drawImageInto(imageUrl, imgX, imgY, imgW, imgH);
  }

  private _drawImageInto(imageUrl: string, x: number, y: number, w: number, h: number) {
    const imgBg = new Graphics();
    imgBg.roundRect(x, y, w, h, 4);
    imgBg.fill(0x111111);
    this.addChild(imgBg);

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
      const mask = new Graphics();
      mask.rect(x, y, w, h);
      mask.fill(0xffffff);
      this.addChild(mask);
      sprite.mask = mask;
      this.addChild(sprite);
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 绘制：battle 模式（从 BattleCardView 迁移 + 修复）
  // ═══════════════════════════════════════════════════════════════════════════

  private drawBattle() {
    const cfg = gameState.itemsMap.get(this.item.itemId);
    const w = this.w;
    const h = this.h;

    // 发光边框（haste 专用，初始隐藏）
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
    this.cooldownBar = new Graphics();
    this.addChild(this.cooldownBar);

    // 进度标签
    this.cooldownLabel = new Text({
      text: '',
      style: { fill: '#aaddff', fontSize: 9, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    this.cooldownLabel.anchor.set(0.5, 1);
    this.cooldownLabel.x = w / 2;
    this.cooldownLabel.y = h - 11;
    this.cooldownLabel.visible = this.item.size > 1;
    this.addChild(this.cooldownLabel);

    // 状态覆盖层
    this.statusOverlay = new Graphics();
    this.addChild(this.statusOverlay);

    // 触发闪光层
    this.triggerFlash = new Graphics();
    this.triggerFlash.roundRect(0, 0, w, h, 6);
    this.triggerFlash.fill({ color: 0xffffff, alpha: 1 });
    this.triggerFlash.alpha = 0;
    this.triggerFlash.visible = false;
    this.addChild(this.triggerFlash);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Ticker 驱动（battle 模式）
  // ═══════════════════════════════════════════════════════════════════════════

  private _startTicker() {
    const ticker = Ticker.shared;
    this._tickerCb = (t: Ticker) => this._onTick(t);
    ticker.add(this._tickerCb);
  }

  private _onTick(ticker: Ticker) {
    const dt = ticker.deltaMS;
    this._elapsed += dt;

    // ── 触发闪光渐隐 ──
    if (this._flashActive) {
      this._flashAlpha = Math.max(0, this._flashAlpha - dt * 0.005);
      this.triggerFlash.alpha = this._flashAlpha;
      if (this._flashAlpha <= 0) {
        this._flashActive = false;
        this.triggerFlash.visible = false;
      }
    }

    // ── 受伤红色脉冲渐隐 ──
    if (this._damagePulse > 0) {
      this._damagePulse = Math.max(0, this._damagePulse - dt * 0.008);
      this.statusOverlay.alpha = this._damagePulse * 0.7;
      if (this._damagePulse <= 0) {
        this.statusOverlay.clear();
      }
    }

    // ── 就绪脉冲渐隐 ──
    if (this._readyPulse > 0) {
      this._readyPulse = Math.max(0, this._readyPulse - dt * 0.003);
      this.triggerFlash.alpha = this._readyPulse * 0.5;
      this.triggerFlash.visible = this._readyPulse > 0;
    }

    // ── 满格金黄脉冲（cooldownProgress >= 0.99）──
    if (this._cooldownProgress >= 0.99) {
      // 周期 ~0.4 秒：sin(2π * t / 400) → [-1,1]，映射到 [0.3, 1.0]
      const pulse = (Math.sin(this._elapsed * 0.0157) + 1) / 2; // 2π/400 ≈ 0.0157
      this.cooldownBar.alpha = 0.3 + pulse * 0.7;
    } else {
      this.cooldownBar.alpha = 1;
    }

    // ── Haste sin 波脉动 ──
    if (this.glowBorder.visible) {
      const pulse = (Math.sin(this._elapsed * 0.006) + 1) / 2;
      this.glowBorder.alpha = 0.3 + pulse * 0.5;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 触发闪光（卡牌技能激活，battle 模式）
  // ═══════════════════════════════════════════════════════════════════════════

  flash() {
    if (this.mode !== 'battle') return;
    this.triggerFlash.clear();
    this.triggerFlash.roundRect(0, 0, this.w, this.h, 6);
    this.triggerFlash.fill({ color: 0xffffff, alpha: 1 });
    this._flashAlpha = 0.85;
    this.triggerFlash.alpha = this._flashAlpha;
    this.triggerFlash.visible = true;
    this._flashActive = true;
    this._readyPulse = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 受伤脉冲（battle 模式）
  // ═══════════════════════════════════════════════════════════════════════════

  flashDamage() {
    if (this.mode !== 'battle') return;
    this.statusOverlay.clear();
    this.statusOverlay.roundRect(0, 0, this.w, this.h, 6);
    this.statusOverlay.fill({ color: 0xff2222, alpha: 1 });
    this._damagePulse = 1.0;
    this.statusOverlay.alpha = 0.7;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 更新运行时状态（battle 模式）
  // ═══════════════════════════════════════════════════════════════════════════

  updateState(cs: CardRuntimeState) {
    if (this.mode !== 'battle') return;

    const w = this.w;
    const barH = 6;

    // 清除上一帧状态文字
    if (this.statusText) {
      this.removeChild(this.statusText);
      this.statusText.destroy();
      this.statusText = null;
    }

    // ── 充能进度条 ──────────────────────────────────────────────────────────
    // cooldownProgress 由后端归一化为 0~1（makeSnapshot 中除以 cfg.cooldown）
    const ratio = Math.min(Math.max(cs.cooldownProgress, 0), 1);
    this._cooldownProgress = ratio;
    const isDestroyed = cs.destroyed || cs.freezeRemain > 0;

    this.cooldownBar.clear();

    if (isDestroyed) {
      this.cooldownLabel.text = '';
      this._readyFlashed = false;
    } else {
      const barY = this.h - barH;

      // 轨道背景
      this.cooldownBar.roundRect(0, barY, w, barH, 2);
      this.cooldownBar.fill({ color: 0x0a1a30, alpha: 1 });

      if (ratio >= 0.99) {
        // 就绪：金黄满条（同 colorLerp 终点 0xffd700）
        this.cooldownBar.roundRect(0, barY, w, barH, 2);
        this.cooldownBar.fill({ color: 0xffd700, alpha: 1 });

        if (!this._readyFlashed) {
          this._readyFlashed = true;
          this.triggerFlash.clear();
          this.triggerFlash.roundRect(0, 0, w, this.h, 6);
          this.triggerFlash.fill({ color: 0xffee44, alpha: 1 });
          this._readyPulse = 1.0;
          this._flashActive = false;
        }
      } else {
        this._readyFlashed = false;
        this._readyPulse = 0;

        // 颜色插值：progress=0 → 0x336688（暗蓝），progress=1 → 0xffd700（金黄）
        const barColor = colorLerp(0x336688, 0xffd700, ratio);

        // Haste / Slow 覆盖颜色
        let finalColor = barColor;
        if (cs.hasteRemain > 0)     finalColor = 0xffcc00;
        else if (cs.slowRemain > 0) finalColor = 0x3355aa;

        const fillW = Math.max(2, w * ratio);
        this.cooldownBar.roundRect(0, barY, fillW, barH, 2);
        this.cooldownBar.fill({ color: finalColor, alpha: 1 });

        // 前端高光
        const hlW = Math.min(4, fillW);
        this.cooldownBar.rect(fillW - hlW, barY, hlW, barH);
        this.cooldownBar.fill({ color: 0xffffff, alpha: 0.8 });
      }

      if (this.item.size > 1) {
        const pct = Math.round(ratio * 100);
        this.cooldownLabel.text = pct >= 100 ? '就绪' : `${pct}%`;
      }
    }

    // ── 状态覆盖层 ─────────────────────────────────────────────────────────
    if (this._damagePulse <= 0) {
      this.statusOverlay.clear();
      this.glowBorder.visible = false;
      this._haste = false;

      if (cs.destroyed) {
        this.statusOverlay.alpha = 0.65;
        this.statusOverlay.roundRect(0, 0, w, this.h, 6);
        this.statusOverlay.fill(STATUS_COLORS.destroyed);
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
        this._haste = true;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 长按 Tooltip
  // ═══════════════════════════════════════════════════════════════════════════

  private _bindLongPress() {
    // 确保全局唯一 Tooltip 节点已存在（挂到 stage 的工作由各场景负责）
    const ensureTooltip = () => {
      if (!UnifiedCardView._tooltip) {
        UnifiedCardView._tooltip = new CardTooltip();
      }
      return UnifiedCardView._tooltip;
    };

    let pressStartX = 0;
    let pressStartY = 0;

    const startPress = (e: any) => {
      this._pressing = true;
      pressStartX = e.global?.x ?? 0;
      pressStartY = e.global?.y ?? 0;
      this._pressTimer = setTimeout(() => {
        if (!this._pressing) return;
        const cfg = gameState.itemsMap.get(this.item.itemId);
        if (!cfg) return;

        const tooltip = ensureTooltip();

        // 如果 tooltip 还没有父节点，挂到当前卡牌所在场景的根
        if (!tooltip.parent && this.parent) {
          // 找最顶层 Container（stage 下第一级 scene）
          let root: Container = this;
          while (root.parent && root.parent.parent) root = root.parent as Container;
          root.addChild(tooltip);
        }

        // 世界坐标中心
        const globalPos = this.getGlobalPosition();
        const wx = globalPos.x + this.w / 2;
        const wy = globalPos.y;

        // 还原到场景本地坐标（tooltip 挂在场景下）
        let lx = wx;
        let ly = wy;
        if (tooltip.parent) {
          const parentGlobal = tooltip.parent.getGlobalPosition();
          const scaleX = tooltip.parent.worldTransform.a || 1;
          const scaleY = tooltip.parent.worldTransform.d || 1;
          lx = (wx - parentGlobal.x) / scaleX;
          ly = (wy - parentGlobal.y) / scaleY;
        }

        tooltip.show(cfg, this.item.tier, lx, ly);

        // 挂到最前
        if (tooltip.parent) {
          tooltip.parent.setChildIndex(tooltip, tooltip.parent.children.length - 1);
        }
      }, 1000);
    };

    const endPress = () => {
      this._pressing = false;
      if (this._pressTimer !== null) {
        clearTimeout(this._pressTimer);
        this._pressTimer = null;
      }
    };

    const onMove = (e: any) => {
      if (!this._pressing) return;
      const dx = (e.global?.x ?? 0) - pressStartX;
      const dy = (e.global?.y ?? 0) - pressStartY;
      // 移动超过 8px 才取消（容忍手指微抖）
      if (dx * dx + dy * dy > 64) endPress();
    };

    // 全局点击一次就隐藏 tooltip（任意卡牌或空白区都关）
    const globalTap = () => {
      UnifiedCardView._tooltip?.hide();
    };

    this.on('pointerdown', startPress);
    this.on('pointerup', endPress);
    this.on('pointerupoutside', endPress);
    this.on('pointermove', onMove);
    this.on('pointertap', globalTap);
  }

  // ═══════════════════════════════════════════════════════════════════════════

  destroy(options?: Parameters<Container['destroy']>[0]) {
    if (this._pressTimer !== null) {
      clearTimeout(this._pressTimer);
      this._pressTimer = null;
    }
    if (this._tickerCb) {
      Ticker.shared.remove(this._tickerCb);
      this._tickerCb = null;
    }
    super.destroy(options);
  }

  /** 卡牌宽度（供外部布局使用） */
  get cardWidth() { return this.w; }
  /** 卡牌高度 */
  get cardHeight() { return CARD_H; }
}
