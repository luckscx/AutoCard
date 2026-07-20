/**
 * theme.ts — 集中配色体系 + PixiJS v8 绘图工具
 * 所有场景/组件共用，统一视觉语言。
 */
import { Graphics, Container } from 'pixi.js';

// ── 核心调色板 ──
export const C = {
  // 背景层次
  bgDeep:     0x08081a,
  bgDark:     0x0f0f24,
  bgMid:      0x161634,
  bgSurface:  0x1c1c3e,
  bgElevated: 0x242450,

  // 面板
  panel:      0x1a1a38,
  panelHover: 0x242450,
  panelActive:0x2e2e5c,

  // 主色系
  blue:       0x4a9eff,
  blueDark:   0x2563eb,
  blueLight:  0x7bb3ff,

  // 强调色
  gold:       0xffd700,
  goldDark:   0xb8860b,
  green:      0x00d97a,
  greenDark:  0x00a35a,
  red:        0xff5b5b,
  purple:     0x8b5cf6,
  orange:     0xff8c42,
  cyan:       0x22d3ee,

  // 文字
  text:       0xe8e8f5,
  textDim:    0x8a8ab5,
  textMuted:  0x555575,
  textGold:   0xffd700,
  textBlue:   0x7bb3ff,
  textGreen:  0x33dd88,
  textRed:    0xff7777,

  // 描边
  border:     0x363660,
  borderLite: 0x484878,
  borderHi:   0x4a9eff,

  // 阴影/遮罩
  shadow:     0x000010,
  overlay:    0x000022,
} as const;

// ── 文字颜色 CSS 字符串 (PixiJS Text fill 接受 string) ──
export const T = {
  primary:   '#e8e8f5',
  secondary: '#8a8ab5',
  muted:     '#555575',
  gold:      '#ffd700',
  blue:      '#7bb3ff',
  green:     '#33dd88',
  red:       '#ff7777',
  cyan:      '#22d3ee',
  purple:    '#a78bfa',
  orange:    '#ff8c42',
};

// ── 颜色插值 ──
export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return ((ar + (br - ar) * t) << 16 | (ag + (bg - ag) * t) << 8 | (ab + (bb - ab) * t)) >>> 0;
}

// ── 绘图工具函数 ──

/**
 * 绘制深度面板：底色 + 顶部高光 + 描边
 * 模拟 "光从上方" 的 3D 质感。
 */
export function drawPanel(
  g: Graphics,
  x: number, y: number, w: number, h: number,
  radius: number = 12,
  bg: number = C.panel,
  border: number = C.border,
  glowAlpha: number = 0,
  glowColor: number = C.blue,
): Graphics {
  // 外发光
  if (glowAlpha > 0) {
    g.roundRect(x - 2, y - 2, w + 4, h + 4, radius + 2);
    g.fill({ color: glowColor, alpha: glowAlpha });
  }
  // 底色
  g.roundRect(x, y, w, h, radius);
  g.fill({ color: bg, alpha: 0.93 });
  // 顶部 35% 高光叠加
  g.roundRect(x + 1, y + 1, w - 2, h * 0.35, radius - 1);
  g.fill({ color: 0xffffff, alpha: 0.035 });
  // 描边
  g.roundRect(x, y, w, h, radius);
  g.stroke({ color: border, width: 1, alpha: 0.55 });
  // 顶部内描边高光
  g.roundRect(x + 1, y + 1, w - 2, h - 2, radius - 1);
  g.stroke({ color: 0xffffff, width: 1, alpha: 0.06 });
  return g;
}

/**
 * 绘制按钮背景：渐变模拟 + 边光 + 圆角
 */
export function drawButtonBg(
  g: Graphics,
  x: number, y: number, w: number, h: number,
  color: number,
  radius: number = 10,
  pressed: boolean = false,
): Graphics {
  // 阴影
  g.roundRect(x, y + 2, w, h, radius);
  g.fill({ color: 0x000000, alpha: 0.25 });

  // 主体底色（略深）
  const dark = lerpColor(color, 0x000000, 0.35);
  g.roundRect(x, y, w, h, radius);
  g.fill({ color: dark });

  // 上半部高光（渐变模拟）
  g.roundRect(x, y, w, h * 0.5, radius);
  g.fill({ color: color, alpha: 0.92 });

  // 顶部亮线
  g.roundRect(x + 2, y + 1, w - 4, h * 0.4, radius - 2);
  g.fill({ color: 0xffffff, alpha: pressed ? 0.02 : 0.08 });

  // 描边
  g.roundRect(x, y, w, h, radius);
  g.stroke({ color: lerpColor(color, 0xffffff, 0.3), width: 1, alpha: 0.4 });

  return g;
}

/**
 * 绘制全屏渐变背景（多层叠加模拟）
 */
export function drawFullscreenBg(g: Graphics, w: number, h: number): Graphics {
  // 深底
  g.rect(0, 0, w, h);
  g.fill({ color: C.bgDeep });
  // 中部微亮（营造纵深）
  g.rect(0, h * 0.15, w, h * 0.7);
  g.fill({ color: C.bgMid, alpha: 0.5 });
  // 顶部光晕
  g.roundRect(-50, -50, w + 100, h * 0.3, 0);
  g.fill({ color: C.bgElevated, alpha: 0.3 });
  // 底部暗化
  g.rect(0, h * 0.7, w, h * 0.3);
  g.fill({ color: 0x000000, alpha: 0.25 });
  return g;
}

/**
 * 绘制装饰性发光圆（ Lobby 背景）
 */
export function drawGlowOrb(g: Graphics, cx: number, cy: number, r: number, color: number, alpha: number = 0.08): Graphics {
  for (let i = 4; i >= 0; i--) {
    const rr = r * (1 + i * 0.3);
    g.circle(cx, cy, rr);
    g.fill({ color, alpha: alpha * (1 - i * 0.18) });
  }
  return g;
}

/**
 * 绘制状态徽章（底栏图标背景）
 */
export function drawBadge(g: Graphics, x: number, y: number, w: number, h: number, color: number, radius: number = 8): Graphics {
  // 底色
  g.roundRect(x, y, w, h, radius);
  g.fill({ color: lerpColor(color, 0x000000, 0.55), alpha: 0.85 });
  // 顶部高光
  g.roundRect(x + 1, y + 1, w - 2, h * 0.4, radius - 1);
  g.fill({ color: color, alpha: 0.2 });
  // 描边
  g.roundRect(x, y, w, h, radius);
  g.stroke({ color: color, width: 1, alpha: 0.5 });
  return g;
}

// ── Tier 颜色升级（保留兼容 layout.ts 的 TIER_COLORS/TIER_BG） ──
export const TIER_GLOW: Record<string, number> = {
  bronze:    0xcd7f32,
  silver:    0xc0c0c0,
  gold:      0xffd700,
  diamond:   0x22d3ee,
  legendary: 0xb14aff,
};

export function tierColorCSS(tier: string): string {
  switch (tier) {
    case 'bronze':    return '#cd7f32';
    case 'silver':    return '#c0c0c0';
    case 'gold':      return '#ffd700';
    case 'diamond':   return '#22d3ee';
    case 'legendary': return '#b14aff';
    default:          return '#888';
  }
}
