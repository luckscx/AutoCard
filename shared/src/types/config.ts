import type { ItemSize, Port, TargetRule, Tier } from './game.js';

/** 野怪多卡棋盘；不配则战斗端用 attack 合成单卡普攻 */
export interface MonsterBattleSlot {
  itemId: string;
  slotIndex: number;
  tier?: Tier;
}

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
  critRate?: number;
  tags: string[];
  kinds?: string[];   // Kind 类型标签，用于 Kind 被动系统
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
  battleBoard?: MonsterBattleSlot[];
}

export interface EventConfig {
  eventId: string;
  name: string;
  description: string;
  /** 事件出现条件，全部满足才可出现，留空则无条件 */
  conditions?: EventCondition[];
  /** 英雄专属事件：仅指定英雄可遇到 */
  heroId?: string;
  /** 事件稀有度：common 默认 60% 权重，rare 30%，epic 10% */
  rarity?: 'common' | 'rare' | 'epic';
  options: EventOption[];
}

export interface EventCondition {
  /** 条件类型 */
  type: 'minLevel' | 'minGold' | 'minHpPercent' | 'hasItem' | 'hasTag' | 'dayGte';
  /** 条件值：数字或字符串 */
  value: number | string;
}

export interface EventOption {
  label: string;
  effects: EventEffect[];
  /** 选项出现条件，不满足则隐藏此选项 */
  condition?: EventCondition;
}

export interface EventEffect {
  type: 'gold' | 'xp' | 'hp' | 'item' | 'removeItem' | 'buff' | 'debuff' | 'healPercent' | 'shield';
  value: number | string;
  /** 效果生效概率 0~1，不填则 100% 生效 */
  chance?: number;
  /** buff/debuff 类型特有：持续天数 */
  duration?: number;
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
