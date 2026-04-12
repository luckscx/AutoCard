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
    battleBoard: [{ itemId: '毒刺', slotIndex: 0 }],
    lootTable: [
      { itemId: '翡翠', chance: 0.4 },
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
    battleBoard: [
      { itemId: '迷你弯刀', slotIndex: 0 },
      { itemId: '毒液', slotIndex: 1 },
    ],
    lootTable: [
      { itemId: '毒液', chance: 0.3 },
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
    battleBoard: [
      { itemId: '蒸汽汤勺', slotIndex: 0 },
      { itemId: '硫磺', slotIndex: 1 },
    ],
    lootTable: [
      { itemId: '蒸汽汤勺', chance: 0.35 },
      { itemId: '炭火科尔', chance: 0.15 },
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
    battleBoard: [
      { itemId: '巴努叶', slotIndex: 0 },
      { itemId: '珍珠', slotIndex: 1 },
      { itemId: '恶蚊', slotIndex: 2 },
    ],
    lootTable: [
      { itemId: '巴努叶', chance: 0.3 },
      { itemId: '珍珠', chance: 0.2 },
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
    // 幼龙：gold级熔岩武器 + silver级灼烧加成，掉落高价值奖励
    battleBoard: [
      { itemId: '熔岩压路机', slotIndex: 0 },
      { itemId: '加热箱', slotIndex: 2 },
    ],
    lootTable: [
      { itemId: '熔岩压路机', chance: 0.15 },
      { itemId: '双头巨锤', chance: 0.10 },
      { itemId: '加热箱', chance: 0.25 },
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
    // 巫妖：gold级冰霜法球 + silver级神经毒素 + silver级灵质治愈
    battleBoard: [
      { itemId: '冰霜9000', slotIndex: 0 },
      { itemId: '神经毒素', slotIndex: 2 },
      { itemId: '灵质', slotIndex: 5 },
    ],
    lootTable: [
      { itemId: '神经毒素', chance: 0.20 },
      { itemId: '冰霜9000', chance: 0.15 },
      { itemId: '毒伞菇', chance: 0.25 },
    ],
  },
];

export function getMonstersByDifficulty(difficulty: 'easy' | 'medium' | 'hard') {
  return MONSTERS.filter(m => m.difficulty === difficulty);
}
