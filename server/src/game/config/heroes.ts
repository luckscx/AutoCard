import type { HeroConfig } from '@autocard/shared';

export const HEROES: HeroConfig[] = [
  {
    heroId: 'warrior',
    name: '战士',
    description: '高生命，近战输出，擅长直接伤害',
    baseHp: 120,
    hpPerLevel: 12,
    startingGold: 8,
    startingItems: ['iron_sword'],
    skillPool: ['cleave', 'battle_cry', 'fortify'],
  },
  {
    heroId: 'mage',
    name: '法师',
    description: '远程法术，擅长灼烧和冰冻控制',
    baseHp: 80,
    hpPerLevel: 8,
    startingGold: 10,
    startingItems: ['fire_wand'],
    skillPool: ['fireball', 'frost_nova', 'arcane_surge'],
  },
  {
    heroId: 'rogue',
    name: '盗贼',
    description: '高频攻击，擅长剧毒和加速',
    baseHp: 90,
    hpPerLevel: 9,
    startingGold: 12,
    startingItems: ['poison_dagger'],
    skillPool: ['backstab', 'smoke_bomb', 'rapid_strike'],
  },
  {
    heroId: 'priest',
    name: '牧师',
    description: '治疗与护盾，防御向构筑',
    baseHp: 100,
    hpPerLevel: 10,
    startingGold: 8,
    startingItems: ['holy_staff'],
    skillPool: ['heal_wave', 'divine_shield', 'purify'],
  },
];
