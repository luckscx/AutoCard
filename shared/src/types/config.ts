import type { ItemSize, Port, TargetRule, Tier } from './game.js';

export interface ItemConfig {
  itemId: string;
  name: string;
  nameEn?: string;
  description: string;
  size: ItemSize;
  baseTier: Tier;
  price: number;
  cooldown: number;
  ports: Port[];
  targetRule: TargetRule;
  tags: string[];
  sourceHero?: string;
  image?: string;
  categories?: string[];
}

export interface HeroConfig {
  heroId: string;
  name: string;
  description: string;
  baseHp: number;
  hpPerLevel: number;
  startingGold: number;
  startingItems: string[];
  skillPool: string[];
}

export interface MonsterConfig {
  monsterId: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  hp: number;
  attack: number;
  xpReward: number;
  goldReward: number;
  lootTable: { itemId: string; chance: number }[];
}

export interface EventConfig {
  eventId: string;
  name: string;
  description: string;
  options: EventOption[];
}

export interface EventOption {
  label: string;
  effects: EventEffect[];
}

export interface EventEffect {
  type: 'gold' | 'xp' | 'hp' | 'item' | 'removeItem';
  value: number | string;
}

export interface LevelUpReward {
  level: number;
  maxHpBonus: number;
  unlockBoardSlot?: boolean;
  choices: LevelUpChoice[];
}

export interface LevelUpChoice {
  kind: 'skill' | 'itemUpgrade';
  id: string;
}
