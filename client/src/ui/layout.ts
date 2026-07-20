// ── 竖屏移动端优先设计分辨率 (390 × 844) ──
export const W = 390;
export const H = 844;

// 卡牌基础单元（竖屏单行10格）
// 计算：390 - 8*2 padding - 4 = 374px，10格*36 + 9间距*2 = 378px ≈ 填满
export const CARD_UNIT = 36;
export const CARD_GAP = 2;
export const CARD_H = 96;   // 从 72 放大到 96，给图片+port+冷却留足空间

export function cardWidth(size: 1 | 2 | 3): number {
  return CARD_UNIT * size + CARD_GAP * (size - 1);
}

// 棋盘行：1行 × 10列（单行线性，保留 targetRule 左右位置关系）
export const BOARD_COLS = 10;

// 顶部留白
export const TOP_PAD = 20;

// Zone 1: 顶部状态栏（HP / 金币 / 声望 + 菜单按钮）
export const Z1_Y = TOP_PAD;       // 0 → 20，顶部留白
export const Z1_H = 50;

// Zone 2: 内容区（储物箱 / 敌方卡牌 / 商店商品 / 选择按钮）
export const Z2_Y = 54 + TOP_PAD;
export const Z2_H = 280;

// Zone 3: 玩家棋盘（1行 × 10格）
export const Z3_Y = 338 + TOP_PAD;
export const Z3_H = 124;   // CARD_H(96) + label(22) + margin(6)

// Zone 4: 底部操作栏
export const Z4_Y = 560 + TOP_PAD;
export const Z4_H = 68;

export const SIDE_PAD = 10;
export const INNER_X = SIDE_PAD + 4;

export const Z2_LABEL_Y = Z2_Y + 6;
export const Z2_CARD_Y  = Z2_Y + 28;

export const Z3_LABEL_Y = Z3_Y + 4;
export const Z3_CARD_Y  = Z3_Y + 22;

// 保留兼容旧导出名
export const UPPER_Y = Z1_Y;
export const UPPER_H = Z1_H + Z2_H + (Z2_Y - Z1_Y - Z1_H);
export const BOARD_Y = Z3_Y;
export const BOARD_INNER_X = INNER_X;
export const BOARD_INNER_Y = Z3_CARD_Y;
export const UPPER_INNER_X = INNER_X;
export const UPPER_INNER_Y = Z2_LABEL_Y;
export const BOTTOM_BAR_Y = Z4_Y;
export const BOTTOM_BAR_H = Z4_H;

// ── 战斗场景专用常量 ──
// 玩家棋盘对齐部署阶段 Z3_Y=338，其余区块从这里向上/向下展开
export const BATTLE_Z1_Y  = 140 + TOP_PAD;  // 顶部信息栏（标题+速度+Tick）
export const BATTLE_Z1_H  = 38;

export const BATTLE_ZEH_Y = 184 + TOP_PAD;  // 敌方血条行
export const BATTLE_ZEH_H = 22;

export const BATTLE_Z2_Y  = 212 + TOP_PAD;  // 敌方棋盘（CARD_H=96，高度调大）
export const BATTLE_Z2_H  = 114;
export const BATTLE_Z2_CARD_Y = BATTLE_Z2_Y + 14;

export const BATTLE_Z3_Y  = 338 + TOP_PAD;  // 玩家棋盘 — 与部署阶段 Z3_Y 对齐
export const BATTLE_Z3_H  = 114;
export const BATTLE_Z3_CARD_Y = BATTLE_Z3_Y + 14;

export const BATTLE_ZPH_Y = 458 + TOP_PAD;  // 我方血条行（338 + 114 + 6）
export const BATTLE_ZPH_H = 22;

export const TIER_COLORS: Record<string, number> = {
  bronze:    0xcd7f32,
  silver:    0xc0c0c0,
  gold:      0xffd700,
  diamond:   0x00ffff,
  legendary: 0xff44ff,
};

export const TIER_BG: Record<string, number> = {
  bronze:    0x3d2b1f,
  silver:    0x3a3a4a,
  gold:      0x4a3a10,
  diamond:   0x0a3a4a,
  legendary: 0x3a0a3a,
};

export function tierHex(tier: string): string {
  switch (tier) {
    case 'bronze':    return '#cd7f32';
    case 'silver':    return '#c0c0c0';
    case 'gold':      return '#ffd700';
    case 'diamond':   return '#00ffff';
    case 'legendary': return '#ff44ff';
    default:          return '#888';
  }
}
