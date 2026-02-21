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

export const TIER_ORDER = ['bronze', 'silver', 'gold', 'diamond', 'legendary'] as const;

export const TIER_MULTIPLIER: Record<string, number> = {
  bronze: 1, silver: 1.5, gold: 2.2, diamond: 3, legendary: 4,
};

export const BATTLE_TICK_MS = 100;
export const BATTLE_OVERTIME_SEC = 20;
export const BATTLE_MAX_SEC = 40;
