import type { MonsterConfig } from '@autocard/shared';

export const MONSTERS: MonsterConfig[] = [
  // ===== Easy =====
  {
    monsterId: 'slime',
    name: '史莱姆',
    difficulty: 'easy',
    hp: 40,
    attack: 5,
    xpReward: 1,
    goldReward: 3,
    lootTable: [
      { itemId: 'health_potion', chance: 0.4 },
    ],
  },
  {
    monsterId: 'rat_king',
    name: '鼠王',
    difficulty: 'easy',
    hp: 35,
    attack: 8,
    xpReward: 1,
    goldReward: 4,
    lootTable: [
      { itemId: 'swift_boots', chance: 0.2 },
    ],
  },

  // ===== Medium =====
  {
    monsterId: 'goblin_shaman',
    name: '哥布林萨满',
    difficulty: 'medium',
    hp: 70,
    attack: 12,
    xpReward: 2,
    goldReward: 6,
    lootTable: [
      { itemId: 'energy_crystal', chance: 0.35 },
      { itemId: 'fire_wand', chance: 0.15 },
    ],
  },
  {
    monsterId: 'stone_golem',
    name: '石头傀儡',
    difficulty: 'medium',
    hp: 100,
    attack: 10,
    xpReward: 2,
    goldReward: 5,
    lootTable: [
      { itemId: 'shield_plate', chance: 0.3 },
      { itemId: 'thorns_ring', chance: 0.2 },
    ],
  },

  // ===== Hard =====
  {
    monsterId: 'dragon_whelp',
    name: '幼龙',
    difficulty: 'hard',
    hp: 150,
    attack: 20,
    xpReward: 3,
    goldReward: 10,
    lootTable: [
      { itemId: 'inferno_staff', chance: 0.15 },
      { itemId: 'giants_club', chance: 0.1 },
      { itemId: 'shadow_cloak', chance: 0.2 },
    ],
  },
  {
    monsterId: 'lich',
    name: '巫妖',
    difficulty: 'hard',
    hp: 120,
    attack: 25,
    xpReward: 3,
    goldReward: 8,
    lootTable: [
      { itemId: 'arcane_tome', chance: 0.2 },
      { itemId: 'frost_orb', chance: 0.25 },
      { itemId: 'divine_robe', chance: 0.1 },
    ],
  },
];

export function getMonstersByDifficulty(difficulty: 'easy' | 'medium' | 'hard') {
  return MONSTERS.filter(m => m.difficulty === difficulty);
}
