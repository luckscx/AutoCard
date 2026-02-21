export const W = 960;
export const H = 600;

export const CARD_UNIT = 88;
export const CARD_GAP = 6;
export const CARD_H = 110;

export function cardWidth(size: 1 | 2 | 3): number {
  return CARD_UNIT * size + CARD_GAP * (size - 1);
}

// Zone 1: 顶部操作栏（按钮 / 拖拽售出区）
export const Z1_Y = 2;
export const Z1_H = 100;

// Zone 2: 内容区（储物箱 / 敌方卡牌 / 商店商品 / 选择按钮）
export const Z2_Y = 106;
export const Z2_H = 192;

// Zone 3: 玩家棋盘
export const Z3_Y = 302;
export const Z3_H = 156;

// Zone 4: 底部信息栏（HP / 金币 / 储物箱按钮）
export const Z4_Y = 462;
export const Z4_H = 100;

export const SIDE_PAD = 16;
export const INNER_X = SIDE_PAD + 8;

export const Z2_LABEL_Y = Z2_Y + 6;
export const Z2_CARD_Y = Z2_Y + 26;

export const Z3_LABEL_Y = Z3_Y + 4;
export const Z3_CARD_Y = Z3_Y + 22;

// 保留兼容旧导出名（LobbyScene 等使用）
export const UPPER_Y = Z1_Y;
export const UPPER_H = Z1_H + Z2_H + (Z2_Y - Z1_Y - Z1_H);
export const BOARD_Y = Z3_Y;
export const BOARD_INNER_X = INNER_X;
export const BOARD_INNER_Y = Z3_CARD_Y;
export const UPPER_INNER_X = INNER_X;
export const UPPER_INNER_Y = Z2_LABEL_Y;
export const BOTTOM_BAR_Y = Z4_Y;
export const BOTTOM_BAR_H = Z4_H;

export const TIER_COLORS: Record<string, number> = {
  bronze: 0xcd7f32,
  silver: 0xc0c0c0,
  gold: 0xffd700,
  diamond: 0x00ffff,
  legendary: 0xff44ff,
};

export const TIER_BG: Record<string, number> = {
  bronze: 0x3d2b1f,
  silver: 0x3a3a4a,
  gold: 0x4a3a10,
  diamond: 0x0a3a4a,
  legendary: 0x3a0a3a,
};

export function tierHex(tier: string): string {
  switch (tier) {
    case 'bronze': return '#cd7f32';
    case 'silver': return '#c0c0c0';
    case 'gold': return '#ffd700';
    case 'diamond': return '#00ffff';
    case 'legendary': return '#ff44ff';
    default: return '#888';
  }
}
