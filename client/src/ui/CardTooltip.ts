import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
import type { ItemConfig } from '@autocard/shared';
import { W, H, TIER_COLORS, TIER_BG, tierHex } from './layout.js';

const TOOLTIP_W = 260;
const PAD = 14;
const CORNER = 10;

/** 端口符号（复用 UnifiedCardView 里的逻辑） */
function portSymbol(type: string): string {
  const MAP: Record<string, string> = {
    damage: '⚔️', poison: '☠️', burn: '🔥', heal: '❤️',
    shield: '🛡️', haste: '⚡', charge: '🔋', slow: '❄️',
    freeze: '❄️', destroy: '💥',
  };
  return MAP[type] ?? '⭐';
}

/** Tier 中文名 */
function tierName(tier: string): string {
  const MAP: Record<string, string> = {
    bronze: '青铜', silver: '白银', gold: '黄金',
    diamond: '钻石', legendary: '传说',
  };
  return MAP[tier] ?? tier;
}

interface LineSpec {
  text: string;
  style: Partial<ConstructorParameters<typeof TextStyle>[0]>;
}

// ─────────────────────────────────────────────────────────────────────────────

export class CardTooltip extends Container {
  private _panel: Graphics;
  private _texts: Text[] = [];
  /** 已注册到 stage 的一次性关闭监听，避免重复注册 */
  private _stageCloseHandler: ((e: FederatedPointerEvent) => void) | null = null;

  constructor() {
    super();
    this.visible = false;
    this.zIndex = 9999;
    this.sortableChildren = false;

    // 背景面板（先占位，show() 时重新绘制）
    this._panel = new Graphics();
    this.addChild(this._panel);
  }

  /** 显示悬浮详情，anchorX/anchorY 为触发卡牌的世界坐标中心 */
  show(cfg: ItemConfig, tier: string, anchorX: number, anchorY: number) {
    this.visible = true;

    // 先清掉上一次可能残留的 stage 监听
    this._removeStageListener();

    // 清除旧内容
    this._panel.clear();
    for (const t of this._texts) { this.removeChild(t); t.destroy(); }
    this._texts = [];

    // ── 构建文字行 ──────────────────────────────────────────────────────────

    const lines: LineSpec[] = [];

    // 名称
    lines.push({
      text: cfg.name,
      style: { fill: tierHex(tier), fontSize: 16, fontWeight: 'bold', fontFamily: 'Noto Sans CJK SC, Arial, sans-serif' },
    });

    // 品质 · 大小
    const sizeLabel = cfg.size === 1 ? '小型(1格)' : cfg.size === 2 ? '中型(2格)' : '大型(3格)';
    lines.push({
      text: `${tierName(tier)} · ${sizeLabel}`,
      style: { fill: '#aaaacc', fontSize: 11, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif' },
    });

    // 分割线（用空行模拟）
    lines.push({ text: '─────────────────', style: { fill: '#334455', fontSize: 10, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif' } });

    // 效果描述
    if (cfg.description) {
      lines.push({
        text: cfg.description,
        style: {
          fill: '#ccddee', fontSize: 12, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif',
          wordWrap: true, wordWrapWidth: TOOLTIP_W - PAD * 2,
        },
      });
    }

    // 端口
    if (cfg.ports.length > 0) {
      const portStr = cfg.ports.map(p => `${portSymbol(p.type)} ${p.type} ×${p.value}`).join('   ');
      lines.push({ text: '', style: {} }); // 空行
      lines.push({
        text: portStr,
        style: { fill: tierHex(tier), fontSize: 12, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif', fontWeight: 'bold' },
      });
    }

    lines.push({ text: '', style: {} }); // 空行

    // 冷却
    lines.push({
      text: `⏱ 冷却：${cfg.cooldown}s`,
      style: { fill: '#aaddff', fontSize: 12, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif' },
    });

    // 价格
    lines.push({
      text: `💰 价格：${cfg.price}G`,
      style: { fill: '#ffd700', fontSize: 12, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif' },
    });

    // Tags / Kinds
    const tagList = [...(cfg.tags ?? []), ...(cfg.kinds ?? [])];
    if (tagList.length > 0) {
      lines.push({
        text: `🏷 ${tagList.join(' · ')}`,
        style: { fill: '#778899', fontSize: 10, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif' },
      });
    }

    // ── 渲染文字，计算总高度 ──────────────────────────────────────────────

    let curY = PAD;
    for (const line of lines) {
      if (!line.text) { curY += 6; continue; }
      const t = new Text({ text: line.text, style: line.style as any });
      t.x = PAD;
      t.y = curY;
      this.addChild(t);
      this._texts.push(t);
      curY += t.height + 5;
    }

    const tooltipH = curY + PAD;

    // ── 定位（避免超出画布边缘）──────────────────────────────────────────

    // 默认显示在卡牌上方
    let tx = anchorX - TOOLTIP_W / 2;
    let ty = anchorY - tooltipH - 8;

    // 左右边界
    tx = Math.max(6, Math.min(tx, W - TOOLTIP_W - 6));
    // 上边界：若上方不够则显示在下方
    if (ty < 4) ty = anchorY + 8;
    // 下边界
    if (ty + tooltipH > H - 4) ty = H - tooltipH - 4;

    this.x = tx;
    this.y = ty;

    // ── 绘制背景面板 ──────────────────────────────────────────────────────

    const borderColor = TIER_COLORS[tier] ?? 0x556677;
    const bgColor = TIER_BG[tier] ?? 0x1a2a3a;

    this._panel.roundRect(0, 0, TOOLTIP_W, tooltipH, CORNER);
    this._panel.fill({ color: bgColor, alpha: 0.97 });
    this._panel.roundRect(0, 0, TOOLTIP_W, tooltipH, CORNER);
    this._panel.stroke({ color: borderColor, width: 2 });

    // 走到根 stage，注册一次性 pointerup：任何地方松手就关闭
    let stage: Container | null = this as Container;
    while (stage.parent) stage = stage.parent as Container;
    if (stage && stage !== (this as Container)) {
      stage.eventMode = 'static';
      // 用 setTimeout 0 延迟注册，避免触发本次长按 pointerup 把自己立刻关掉
      setTimeout(() => {
        if (!this.visible) return;
        const handler = (_e: FederatedPointerEvent) => {
          this.hide();
        };
        this._stageCloseHandler = handler;
        (stage as Container).once('pointerup', handler);
      }, 0);
    }
  }

  private _removeStageListener() {
    if (!this._stageCloseHandler) return;
    let stage: Container | null = this as Container;
    while (stage.parent) stage = stage.parent as Container;
    if (stage && stage !== (this as Container)) {
      (stage as Container).off('pointerup', this._stageCloseHandler);
    }
    this._stageCloseHandler = null;
  }

  hide() {
    this._removeStageListener();
    this.visible = false;
  }
}
