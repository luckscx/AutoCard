export type Tier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary';
export type ItemSize = 1 | 2 | 3;
export type RunStatus = 'active' | 'finished_win' | 'finished_lose';
export type HourType = 'choice' | 'pve' | 'pvp';
export type ChoiceKind = 'shop' | 'event' | 'gift';
export type PortCategory = 'output' | 'operational' | 'defense';

export type OutputPortType = 'damage' | 'poison' | 'burn' | 'destroy';
export type OperationalPortType = 'haste' | 'charge' | 'slow' | 'freeze';
export type DefensePortType = 'heal' | 'shield';
export type PortType = OutputPortType | OperationalPortType | DefensePortType;

export interface Port {
  category: PortCategory;
  type: PortType;
  value: number;
}

export type TargetRule =
  | { kind: 'self' }
  | { kind: 'adjacent' }
  | { kind: 'leftmost' }
  | { kind: 'rightmost' }
  | { kind: 'all' }
  | { kind: 'position'; index: number };

export interface SlotItem {
  itemId: string;
  tier: Tier;
  size: ItemSize;
  slotIndex: number;
}

export interface RunState {
  id: string;
  userId: string;
  heroId: string;
  status: RunStatus;
  day: number;
  hour: number;
  prestige: number;
  pvpWins: number;
  xp: number;
  level: number;
  gold: number;
  hp: number;
  maxHp: number;
  board: SlotItem[];
  stash: SlotItem[];
  shopRefreshed?: boolean;
}

export interface PvpMirrorSnapshot {
  level: number;
  hp: number;
  maxHp: number;
  board: SlotItem[];
  heroId: string;
}

export type BattleSide = 'player' | 'enemy';

export interface CardRuntimeState {
  slotIndex: number;
  cooldownProgress: number;
  hasteRemain: number;
  slowRemain: number;
  freezeRemain: number;
  destroyed: boolean;
}

export type BattleEvent =
  | { tick: number; type: 'card_trigger'; side: BattleSide; slotIndex: number }
  | { tick: number; type: 'damage'; value: number; targetSide: BattleSide; crit?: boolean }
  | { tick: number; type: 'poison'; value: number; targetSide: BattleSide }
  | { tick: number; type: 'burn'; value: number; targetSide: BattleSide }
  | { tick: number; type: 'heal'; value: number; targetSide: BattleSide }
  | { tick: number; type: 'shield'; value: number; targetSide: BattleSide }
  | { tick: number; type: 'haste'; value: number; targetSide: BattleSide; targetSlotIndices: number[] }
  | { tick: number; type: 'charge'; value: number; targetSide: BattleSide; targetSlotIndices: number[] }
  | { tick: number; type: 'slow'; value: number; targetSide: BattleSide; targetSlotIndices: number[] }
  | { tick: number; type: 'freeze'; value: number; targetSide: BattleSide; targetSlotIndices: number[] }
  | { tick: number; type: 'destroy'; targetSide: BattleSide; targetSlotIndex: number }
  | { tick: number; type: 'dot_tick'; side: BattleSide; poisonDmg: number; burnDmg: number }
  | { tick: number; type: 'overtime'; playerDmg: number; enemyDmg: number }
  | { tick: number; type: 'battle_end'; winner: BattleSide };

export interface BattleSnapshot {
  tick: number;
  player: { hp: number; maxHp: number; shield: number; poison: number; burn: number };
  enemy: { hp: number; maxHp: number; shield: number; poison: number; burn: number };
  playerCards: CardRuntimeState[];
  enemyCards: CardRuntimeState[];
}

export interface BattleResult {
  won: boolean;
  hpLeft: number;
  xpGained: number;
  goldGained: number;
  loot?: string[];
  events?: BattleEvent[];
  snapshots?: BattleSnapshot[];
}
