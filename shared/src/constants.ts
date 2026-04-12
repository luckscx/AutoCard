export const BOARD_SIZE = 10;
export const STASH_SIZE = 10;
export const HOURS_PER_DAY = 6;
export const XP_PER_LEVEL = 8;
export const INITIAL_PRESTIGE = 20;
export const PVP_WINS_TO_WIN = 10;

export const HOUR_TYPE = {
  1: 'choice',
  2: 'choice',
  3: 'pve',
  4: 'choice',
  5: 'choice',
  6: 'pvp',
} as const;

export const SHOP_REFRESH_COST: Record<string, number> = {
  bronze: 2,
  silver: 4,
  gold: 6,
  diamond: 8,
};

/** 商店刷新金币：随等级提高 */
export function shopRefreshCostForLevel(level: number): number {
  if (level < 3) return SHOP_REFRESH_COST.bronze;
  if (level < 5) return SHOP_REFRESH_COST.silver;
  if (level < 8) return SHOP_REFRESH_COST.gold;
  return SHOP_REFRESH_COST.diamond;
}

export const TIER_ORDER = ['bronze', 'silver', 'gold', 'diamond', 'legendary'] as const;

export const TIER_MULTIPLIER: Record<string, number> = {
  bronze: 1, silver: 1.5, gold: 2.2, diamond: 3, legendary: 4,
};

export const BATTLE_TICK_MS = 100;
export const BATTLE_OVERTIME_SEC = 20;
export const BATTLE_MAX_SEC = 40;

export const KIND_IDS = [
  // 主题类别（阵营/流派）
  'weapon', 'apparel', 'aquatic', 'core', 'dinosaur', 'dragon',
  'drone', 'food', 'loot', 'potion', 'tool', 'property', 'ray',
  'relic', 'tech', 'vehicle', 'material', 'ammo', 'toy', 'companion', 'flight',
  // 特性类别（效果属性标签）
  'poison', 'burn', 'freeze', 'shield',
  // 体积类别
  'small', 'medium', 'large',
] as const;

export type KindId = typeof KIND_IDS[number];

/**
 * 每个等级对应的棋盘可用格数（最多 10 格）
 * level 1→4格, 2→5格, 3→6格, 4→7格, 5→8格, 6→9格, 7+→10格
 */
export const BOARD_SLOTS_BY_LEVEL: Record<number, number> = {
  1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9,
};
export function boardSlotsForLevel(level: number): number {
  return BOARD_SLOTS_BY_LEVEL[level] ?? 10;
}
