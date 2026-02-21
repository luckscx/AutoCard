import type { EventConfig } from '@autocard/shared';

export const EVENTS: EventConfig[] = [
  {
    eventId: 'mysterious_merchant',
    name: '神秘商人',
    description: '一个戴着面具的商人向你走来',
    options: [
      {
        label: '花费5金币购买随机银色物品',
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
    options: [
      {
        label: '免费治疗（+20 HP）',
        effects: [{ type: 'hp', value: 20 }],
      },
      {
        label: '花费3金币获得圣光法杖',
        effects: [{ type: 'gold', value: -3 }, { type: 'item', value: 'holy_staff' }],
      },
    ],
  },
  {
    eventId: 'treasure_goblin',
    name: '宝藏哥布林',
    description: '一只哥布林抱着金币从你面前跑过',
    options: [
      {
        label: '追赶（50%概率获得8金币，50%损失1 XP）',
        effects: [{ type: 'gold', value: 8 }],
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
    options: [
      {
        label: '花费4金币强化一件装备（随机升Tier）',
        effects: [{ type: 'gold', value: -4 }],
      },
      {
        label: '卖出一件装备获取双倍金币',
        effects: [{ type: 'removeItem', value: 'random' }, { type: 'gold', value: 6 }],
      },
      {
        label: '离开',
        effects: [],
      },
    ],
  },
];
