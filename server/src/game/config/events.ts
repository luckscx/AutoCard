import type { EventConfig } from '@autocard/shared';

export const EVENTS: EventConfig[] = [
  // ========================================
  // 一、通用事件（7个）— 所有英雄可遇
  // ========================================

  {
    eventId: 'mysterious_merchant',
    name: '神秘商人',
    description: '一个戴着面具的商人向你走来',
    rarity: 'common',
    options: [
      {
        label: '花费5金币购买随机银色物品',
        condition: { type: 'minGold', value: 5 },
        effects: [{ type: 'gold', value: -5 }, { type: 'item', value: 'random_silver' }],
      },
      {
        label: '交出一件装备换取10金币',
        effects: [{ type: 'removeItem', value: 'random' }, { type: 'gold', value: 10 }],
      },
      {
        label: '礼貌拒绝',
        effects: [],
      },
    ],
  },
  {
    eventId: 'ancient_shrine',
    name: '远古神殿',
    description: '你发现了一座古老的神殿',
    rarity: 'common',
    options: [
      {
        label: '祈祷（+2 XP）',
        effects: [{ type: 'xp', value: 2 }],
      },
      {
        label: '搜刮宝箱（+6 金币）',
        effects: [{ type: 'gold', value: 6 }],
      },
      {
        label: '触摸祭坛（-10 HP，获得随机物品）',
        effects: [{ type: 'hp', value: -10 }, { type: 'item', value: 'random_bronze' }],
      },
    ],
  },
  {
    eventId: 'wandering_healer',
    name: '流浪治疗师',
    description: '一位治疗师愿意帮助你',
    rarity: 'common',
    options: [
      {
        label: '免费治疗（+20 HP）',
        effects: [{ type: 'hp', value: 20 }],
      },
      {
        label: '花费3金币获得降落伞',
        condition: { type: 'minGold', value: 3 },
        effects: [{ type: 'gold', value: -3 }, { type: 'item', value: '降落伞' }],
      },
    ],
  },
  {
    eventId: 'treasure_goblin',
    name: '宝藏哥布林',
    description: '一只哥布林抱着金币从你面前跑过',
    rarity: 'common',
    options: [
      {
        label: '追赶（60%获得8金币，40%损失1 XP）',
        effects: [
          { type: 'gold', value: 8, chance: 0.6 },
          { type: 'xp', value: -1, chance: 0.4 },
        ],
      },
      {
        label: '放它走（+1 XP 安慰奖）',
        effects: [{ type: 'xp', value: 1 }],
      },
    ],
  },
  {
    eventId: 'blacksmith',
    name: '铁匠铺',
    description: '你遇到了一位经验丰富的铁匠',
    rarity: 'common',
    options: [
      {
        label: '花费4金币强化一件装备（随机升Tier）',
        condition: { type: 'minGold', value: 4 },
        effects: [{ type: 'gold', value: -4 }, { type: 'buff', value: 'upgrade_random', duration: 0 }],
      },
      {
        label: '卖出一件装备获取6金币',
        effects: [{ type: 'removeItem', value: 'random' }, { type: 'gold', value: 6 }],
      },
      {
        label: '离开',
        effects: [],
      },
    ],
  },
  {
    eventId: 'gambling_den',
    name: '赌场',
    description: '一个闪烁着霓虹灯的赌场映入眼帘',
    rarity: 'rare',
    options: [
      {
        label: '押大（花费5金币，70%赢得12金币，30%血本无归）',
        condition: { type: 'minGold', value: 5 },
        effects: [
          { type: 'gold', value: -5 },
          { type: 'gold', value: 12, chance: 0.7 },
        ],
      },
      {
        label: '押小（花费3金币，40%赢得10金币，60%血本无归）',
        condition: { type: 'minGold', value: 3 },
        effects: [
          { type: 'gold', value: -3 },
          { type: 'gold', value: 10, chance: 0.4 },
        ],
      },
      {
        label: '路过不赌',
        effects: [],
      },
    ],
  },
  {
    eventId: 'cursed_chest',
    name: '诅咒宝箱',
    description: '一个散发着紫色光芒的宝箱，打开它可能有意想不到的后果',
    rarity: 'rare',
    conditions: [{ type: 'minLevel', value: 3 }],
    options: [
      {
        label: '强行打开（50%获得随机金色物品，50%扣15 HP）',
        effects: [
          { type: 'item', value: 'random_gold', chance: 0.5 },
          { type: 'hp', value: -15, chance: 0.5 },
        ],
      },
      {
        label: '小心撬锁（80%获得随机银色物品，20%触发陷阱-8 HP）',
        effects: [
          { type: 'item', value: 'random_silver', chance: 0.8 },
          { type: 'hp', value: -8, chance: 0.2 },
        ],
      },
      {
        label: '明智地走开',
        effects: [],
      },
    ],
  },

  // ========================================
  // 二、英雄专属事件（6个）— 仅特定英雄可遇
  // ========================================

  {
    eventId: 'core_overload',
    name: '核心过载',
    description: '你的核心装置突然发出刺耳的嗡鸣，能量正在失控！',
    heroId: 'dooley',
    rarity: 'rare',
    options: [
      {
        label: '释放过载能量（+3 XP，-12 HP）',
        effects: [{ type: 'xp', value: 3 }, { type: 'hp', value: -12 }],
      },
      {
        label: '吸收过载（获得随机燃烧类物品）',
        effects: [{ type: 'item', value: 'random_burn' }],
      },
      {
        label: '紧急关闭（无事发生）',
        effects: [],
      },
    ],
  },
  {
    eventId: 'joy_parade',
    name: '欢乐巡游',
    description: '一群欢乐的小丑邀请你加入他们的巡游！',
    heroId: 'jules',
    rarity: 'rare',
    options: [
      {
        label: '加入巡游（+2 XP，+5金币）',
        effects: [{ type: 'xp', value: 2 }, { type: 'gold', value: 5 }],
      },
      {
        label: '偷走小丑的道具（获得随机护盾类物品，50%被追打-10 HP）',
        effects: [
          { type: 'item', value: 'random_shield' },
          { type: 'hp', value: -10, chance: 0.5 },
        ],
      },
    ],
  },
  {
    eventId: 'alchemist_lab',
    name: '炼金实验室',
    description: '你发现了一间废弃的炼金实验室，桌上摆满了试剂瓶',
    heroId: 'mak',
    rarity: 'rare',
    options: [
      {
        label: '调配药剂（70%获得随机药水类物品，30%爆炸-8 HP）',
        effects: [
          { type: 'item', value: 'random_potion', chance: 0.7 },
          { type: 'hp', value: -8, chance: 0.3 },
        ],
      },
      {
        label: '拿走翡翠样本（+1 XP）',
        effects: [{ type: 'xp', value: 1 }],
      },
    ],
  },
  {
    eventId: 'property_auction',
    name: '房产拍卖会',
    description: '一场盛大的房产拍卖会正在进行，有你熟悉的房产类型！',
    heroId: 'pygmalien',
    rarity: 'rare',
    options: [
      {
        label: '竞拍房产（花费8金币，获得随机房产类物品）',
        condition: { type: 'minGold', value: 8 },
        effects: [{ type: 'gold', value: -8 }, { type: 'item', value: 'random_property' }],
      },
      {
        label: '投资收租（+6金币，+2 HP回复）',
        effects: [{ type: 'gold', value: 6 }, { type: 'hp', value: 2 }],
      },
    ],
  },
  {
    eventId: 'vehicle_wreck',
    name: '载具残骸',
    description: '你发现了一辆坠毁的载具，零件散落一地',
    heroId: 'stelle',
    rarity: 'rare',
    options: [
      {
        label: '拆解零件（获得随机载具/工具类物品）',
        effects: [{ type: 'item', value: 'random_vehicle' }],
      },
      {
        label: '修复载具（花费5金币，80%获得随机银色物品，20%失败）',
        condition: { type: 'minGold', value: 5 },
        effects: [
          { type: 'gold', value: -5 },
          { type: 'item', value: 'random_silver', chance: 0.8 },
        ],
      },
      {
        label: '搜刮油箱（+3金币）',
        effects: [{ type: 'gold', value: 3 }],
      },
    ],
  },
  {
    eventId: 'pirate_cove',
    name: '海盗湾',
    description: '你潜入了一个海盗据点，水手们的武器散落各处',
    heroId: 'vanessa',
    rarity: 'rare',
    options: [
      {
        label: '偷取武器（获得随机武器类物品，50%被发现-10 HP）',
        effects: [
          { type: 'item', value: 'random_weapon' },
          { type: 'hp', value: -10, chance: 0.5 },
        ],
      },
      {
        label: '潜水逃跑（+1 XP）',
        effects: [{ type: 'xp', value: 1 }],
      },
      {
        label: '贿赂守卫（花费4金币，安全通过+5金币）',
        condition: { type: 'minGold', value: 4 },
        effects: [{ type: 'gold', value: -4 }, { type: 'gold', value: 5 }],
      },
    ],
  },

  // ========================================
  // 三、高等级事件（3个）— 需要一定等级才出现
  // ========================================

  {
    eventId: 'dragons_lair',
    name: '龙巢',
    description: '你发现了一处龙巢，龙蛋散发着灼热的气息',
    rarity: 'epic',
    conditions: [{ type: 'minLevel', value: 5 }],
    options: [
      {
        label: '偷取龙蛋（30%获得随机钻石物品，70%被灼烧-20 HP）',
        effects: [
          { type: 'item', value: 'random_diamond', chance: 0.3 },
          { type: 'hp', value: -20, chance: 0.7 },
        ],
      },
      {
        label: '与幼龙交朋友（+3 XP）',
        effects: [{ type: 'xp', value: 3 }],
      },
      {
        label: '悄悄离开',
        effects: [],
      },
    ],
  },
  {
    eventId: 'arena_champion',
    name: '竞技场冠军',
    description: '一位竞技场冠军向你发起挑战，胜者将获得丰厚奖励',
    rarity: 'epic',
    conditions: [{ type: 'minLevel', value: 4 }],
    options: [
      {
        label: '接受挑战（50%赢得15金币+3 XP，50%损失2 XP）',
        effects: [
          { type: 'gold', value: 15, chance: 0.5 },
          { type: 'xp', value: 3, chance: 0.5 },
          { type: 'xp', value: -2, chance: 0.5 },
        ],
      },
      {
        label: '认输交保护费（-3金币，+1 XP）',
        condition: { type: 'minGold', value: 3 },
        effects: [{ type: 'gold', value: -3 }, { type: 'xp', value: 1 }],
      },
    ],
  },
  {
    eventId: 'fountain_of_youth',
    name: '青春之泉',
    description: '传说中能让人恢复青春的泉水就在眼前',
    rarity: 'epic',
    conditions: [{ type: 'minLevel', value: 6 }],
    options: [
      {
        label: '饮用泉水（回复50%最大HP）',
        effects: [{ type: 'healPercent', value: 50 }],
      },
      {
        label: '装瓶出售（获得12金币）',
        effects: [{ type: 'gold', value: 12 }],
      },
      {
        label: '沐浴其中（+4 XP，回复30%最大HP）',
        effects: [{ type: 'xp', value: 4 }, { type: 'healPercent', value: 30 }],
      },
    ],
  },
];
