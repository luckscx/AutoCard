// ── 竖屏移动端优先设计分辨率 (390 × 844) ──
export const W = 390;
export const H = 844;

// 卡牌基础单元（竖屏单行10格，390px宽适配）
// 计算：390 - 8*2 padding = 374px，10格*34 + 9间距*2 = 358px
export const CARD_UNIT = 34;
export const CARD_GAP = 2;
export const CARD_H = 72;

export function cardWidth(size: 1 | 2 | 3): number {
  return CARD_UNIT * size + CARD_GAP * (size - 1);
}

// 棋盘行：1行 × 10列（单行线性，保留 targetRule 左右位置关系）
export const BOARD_COLS = 10;

// Zone 1: 顶部状态栏（HP / 金币 / 声望 + 菜单按钮）
export const Z1_Y = 0;
export const Z1_H = 50;

// Zone 2: 内容区（储物箱 / 敌方卡牌 / 商店商品 / 选择按钮）
export const Z2_Y = 54;
export const Z2_H = 280;

// Zone 3: 玩家棋盘（1行 × 10格）
export const Z3_Y = 338;
export const Z3_H = 100;   // 单行: CARD_H + label

// Zone 4: 底部操作栏
export const Z4_Y = 560;
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
export const BATTLE_Z1_Y  = 0;
export const BATTLE_Z1_H  = 38;   // 顶部信息栏（标题+速度+Tick）

export const BATTLE_ZEH_Y = 42;   // 敌方血条行 Y
export const BATTLE_ZEH_H = 20;   // 敌方血条行高

export const BATTLE_Z2_Y  = 66;   // 敌方棋盘 Y
export const BATTLE_Z2_H  = 90;   // 敌方棋盘高
export const BATTLE_Z2_CARD_Y = BATTLE_Z2_Y + 14; // 卡牌起始Y

export const BATTLE_Z3_Y  = 160;  // 玩家棋盘 Y
export const BATTLE_Z3_H  = 90;   // 玩家棋盘高
export const BATTLE_Z3_CARD_Y = BATTLE_Z3_Y + 14; // 卡牌起始Y

export const BATTLE_ZPH_Y = 254;  // 我方血条行 Y
export const BATTLE_ZPH_H = 20;   // 我方血条行高

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
