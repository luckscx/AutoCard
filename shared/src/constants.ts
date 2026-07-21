export const BOARD_SIZE = 10;
export const STASH_SIZE = 10;
export const HOURS_PER_DAY = 6;
export const XP_PER_LEVEL = 8;
export const INITIAL_PRESTIGE = 20;
export const PVP_WINS_TO_WIN = 10;

/** 每天基础收入（天开始时自动获得） */
export const DAILY_BASE_INCOME = 3;

/** PvP 败场声望扣除基数（实际扣除 = min(day, PRESTIGE_LOSS_CAP)） */
export const PRESTIGE_LOSS_PER_DEFEAT = 1;

/** 声望扣除上限：后期天数越高扣越多，但不超过此值 */
export const PRESTIGE_LOSS_CAP = 2;

export const HOUR_TYPE = {
  1: 'choice',
  2: 'choice',
  3: 'pve',
  4: 'choice',
  5: 'choice',
  6: 'pvp',
} as const;

/** 商店刷新金币：随等级提高 */
export const SHOP_REFRESH_COST: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 4,
  diamond: 6,
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
 * level 1→4格, 2→6格, 3→8格, 4+→10格
 * (每级增加 2 格)
 */
export const BOARD_SLOTS_BY_LEVEL: Record<number, number> = {
  1: 4, 2: 6, 3: 8,
};
export function boardSlotsForLevel(level: number): number {
  return BOARD_SLOTS_BY_LEVEL[level] ?? 10;
}

// ────────────────────────────────────────────────────────────────
// 全局被动技能池（PvE 胜利后 3 选 1）
// ────────────────────────────────────────────────────────────────
import type { GlobalPassiveConfig, GlobalPassiveId } from './types/game.js';

export const GLOBAL_PASSIVE_POOL: GlobalPassiveConfig[] = [
  {
    id: 'burn_power',
    name: '烈焰增幅',
    description: '所有灼烧端口的基础伤害 +2',
    icon: '🔥',
    category: 'offense',
    stackable: true,
    value: 2,
  },
  {
    id: 'poison_power',
    name: '剧毒增幅',
    description: '所有毒素端口的基础伤害 +2',
    icon: '☠️',
    category: 'offense',
    stackable: true,
    value: 2,
  },
  {
    id: 'damage_power',
    name: '伤害强化',
    description: '所有伤害端口的效果 +15%',
    icon: '⚔️',
    category: 'offense',
    stackable: true,
    value: 0.15,
  },
  {
    id: 'heal_power',
    name: '治疗增幅',
    description: '所有治疗端口的效果 +25%',
    icon: '💚',
    category: 'defense',
    stackable: true,
    value: 0.25,
  },
  {
    id: 'shield_power',
    name: '护盾强化',
    description: '所有护盾端口的护盾量 +3',
    icon: '🛡️',
    category: 'defense',
    stackable: true,
    value: 3,
  },
  {
    id: 'crit_boost',
    name: '暴击精通',
    description: '所有卡牌的暴击率 +10%',
    icon: '🎯',
    category: 'offense',
    stackable: true,
    value: 0.10,
  },
  {
    id: 'haste_boost',
    name: '疾风之赐',
    description: '所有加速端口的持续时间 +2秒',
    icon: '💨',
    category: 'synergy',
    stackable: true,
    value: 2,
  },
  {
    id: 'hp_regen_passive',
    name: '生机不息',
    description: '每场战斗结束后回复 8 HP',
    icon: '❤️‍🩹',
    category: 'defense',
    stackable: true,
    value: 8,
  },
  {
    id: 'gold_bonus_passive',
    name: '财源广进',
    description: '所有金币获取 +2',
    icon: '💰',
    category: 'utility',
    stackable: true,
    value: 2,
  },
  {
    id: 'cooldown_reduction',
    name: '冷却缩减',
    description: '所有卡牌冷却时间 -15%',
    icon: '⏱️',
    category: 'utility',
    stackable: true,
    value: 0.15,
  },
  {
    id: 'burn_enhance',
    name: '不灭之焰',
    description: '灼烧叠层每 tick 仅衰减 0.5（原为每 tick -1）',
    icon: '🌋',
    category: 'synergy',
    stackable: false,
    value: 0.5,
  },
  {
    id: 'poison_enhance',
    name: '永恒之毒',
    description: '毒素叠层不衰减',
    icon: '🧪',
    category: 'synergy',
    stackable: false,
    value: 1,
  },
  {
    id: 'lifesteal',
    name: '吸血契约',
    description: '造成伤害的 10% 转为自身治疗',
    icon: '🩸',
    category: 'defense',
    stackable: true,
    value: 0.10,
  },
  {
    id: 'overtime_immune',
    name: '不屈意志',
    description: '免疫加时赛递增扣血效果',
    icon: '🗿',
    category: 'defense',
    stackable: false,
    value: 1,
  },
  {
    id: 'shield_start',
    name: '开局护盾',
    description: '每场战斗开始时获得 15 护盾',
    icon: '🏰',
    category: 'defense',
    stackable: true,
    value: 15,
  },
];

/** 通过 ID 查找被动技能配置 */
export const GLOBAL_PASSIVE_MAP: Map<GlobalPassiveId, GlobalPassiveConfig> = new Map(
  GLOBAL_PASSIVE_POOL.map(p => [p.id, p]),
);

/** PvE 胜利后技能 3 选 1 的基础选择数 */
export const SKILL_CHOICES_COUNT = 3;
