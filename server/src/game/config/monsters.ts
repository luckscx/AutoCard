import type { MonsterConfig } from '@autocard/shared';

/**
 * AutoCard 怪物配置 v2 — 10 只怪物
 * 难度梯度：easy x3 / medium x3 / hard x4
 * 每档怪物有不同的端口组合和战斗风格
 * 
 * 数值设计原则：
 * - Easy：HP 30-50，低输出，1-2 个物品，玩家血量损失 < 30%
 * - Medium：HP 60-90，中等输出，2-3 个物品，需要一定构筑
 * - Hard：HP 100-150，高输出，2-3 个物品，需要合理构筑才能打过
 * - goldReward 确保每天约 5-8 金收入（1场 PvE + 基础收入 + PvP）
 * 
 * 物品引用说明：
 * - 大巴扎物品(bazaar_items.ts)使用中文名作为 itemId
 * - 基础物品(items.ts)使用英文 id 如 u14_wooden_shield
 */

export const MONSTERS: MonsterConfig[] = [
  // ===== Easy (x3) =====
  {
    monsterId: 'slime',
    name: '史莱姆',
    difficulty: 'easy',
    hp: 35,
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
    hp: 30,
    attack: 7,
    xpReward: 1,
    goldReward: 3,
    battleBoard: [
      { itemId: '迷你弯刀', slotIndex: 0 },
      { itemId: '毒液', slotIndex: 1 },
    ],
    lootTable: [
      { itemId: '毒液', chance: 0.3 },
    ],
  },
  {
    monsterId: 'mushroom_sprite',
    name: '蘑菇精',
    difficulty: 'easy',
    hp: 40,
    attack: 4,
    xpReward: 1,
    goldReward: 4,
    // 蘑菇精：毒系+治疗组合，低伤害但略磨血
    battleBoard: [
      { itemId: '毒伞菇', slotIndex: 0 },
      { itemId: 'u16_first_aid_kit', slotIndex: 2 },
    ],
    lootTable: [
      { itemId: '毒伞菇', chance: 0.35 },
      { itemId: '翡翠', chance: 0.15 },
    ],
  },

  // ===== Medium (x3) =====
  {
    monsterId: 'goblin_shaman',
    name: '哥布林萨满',
    difficulty: 'medium',
    hp: 65,
    attack: 10,
    xpReward: 2,
    goldReward: 5,
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
    hp: 90,
    attack: 8,
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
  {
    monsterId: 'forest_dryad',
    name: '森林树妖',
    difficulty: 'medium',
    hp: 70,
    attack: 11,
    xpReward: 2,
    goldReward: 6,
    // 树妖：治疗+护盾，能拖长战斗
    battleBoard: [
      { itemId: '灵质', slotIndex: 0 },
      { itemId: '珍珠', slotIndex: 2 },
      { itemId: 'u14_wooden_shield', slotIndex: 4 },
    ],
    lootTable: [
      { itemId: '灵质', chance: 0.25 },
      { itemId: 'u14_wooden_shield', chance: 0.2 },
      { itemId: 'u17_herb_bag', chance: 0.15 },
    ],
  },

  // ===== Hard (x3) =====
  {
    monsterId: 'dragon_whelp',
    name: '幼龙',
    difficulty: 'hard',
    hp: 140,
    attack: 18,
    xpReward: 3,
    goldReward: 8,
    // 幼龙：灼烧+加速组合，高爆发
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
    hp: 110,
    attack: 22,
    xpReward: 3,
    goldReward: 8,
    // 巫妖：冰霜+毒+治疗，控制型
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
  {
    monsterId: 'inferno_knight',
    name: '炼狱骑士',
    difficulty: 'hard',
    hp: 130,
    attack: 20,
    xpReward: 3,
    goldReward: 9,
    // 炼狱骑士：灼烧+护盾+加速，攻守兼备
    battleBoard: [
      { itemId: '硫磺', slotIndex: 0 },
      { itemId: 'u15_thorn_amulet', slotIndex: 2 },
      { itemId: 'u07_hourglass', slotIndex: 5 },
    ],
    lootTable: [
      { itemId: '硫磺', chance: 0.25 },
      { itemId: 'u15_thorn_amulet', chance: 0.15 },
      { itemId: 'u07_hourglass', chance: 0.2 },
    ],
  },
  {
    monsterId: 'shadow_assassin',
    name: '暗影刺客',
    difficulty: 'hard',
    hp: 100,
    attack: 25,
    // 暗影刺客：高攻低血，毒+伤害速攻型
    battleBoard: [
      { itemId: '神经毒素', slotIndex: 0 },
      { itemId: '毒刺', slotIndex: 2 },
      { itemId: 'u07_hourglass', slotIndex: 4 },
    ],
    lootTable: [
      { itemId: '毒刺', chance: 0.25 },
      { itemId: '神经毒素', chance: 0.20 },
      { itemId: 'u09_gear_clockwork', chance: 0.15 },
    ],
    xpReward: 3,
    goldReward: 8,
  },
];

export function getMonstersByDifficulty(difficulty: 'easy' | 'medium' | 'hard') {
  return MONSTERS.filter(m => m.difficulty === difficulty);
}
