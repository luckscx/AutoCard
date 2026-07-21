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

/** 日常运营中选「随机事件」后挂起，完成选项前不推进小时 */
export interface PendingEventState {
  eventId: string;
  name: string;
  description: string;
  options: { label: string }[];
}

/** 升级三选一中的单个选项 */
export interface GameLevelUpChoice {
  label: string;
  kind: 'unlock_slot' | 'upgrade_item' | 'bonus_hp' | 'bonus_hp_heal';
}

/** 升级后挂起的三选一状态，完成选择前不推进后续流程 */
export interface PendingLevelUpState {
  level: number;
  choices: GameLevelUpChoice[];
}

// ────────────────────────────────────────────────────────────────
// 全局被动技能系统（PvE 胜利后 3 选 1）
// ────────────────────────────────────────────────────────────────

/** 全局被动技能 ID — 对应技能池中的技能 */
export type GlobalPassiveId =
  | 'burn_power'        // 灼烧端口 +N
  | 'poison_power'      // 毒素端口 +N
  | 'damage_power'      // 伤害端口 +N%
  | 'heal_power'        // 治疗端口 +N%
  | 'shield_power'      // 护盾端口 +N
  | 'crit_boost'        // 暴击率 +N%
  | 'haste_boost'       // 加速端口持续 +N秒
  | 'hp_regen_passive'  // 每场战斗后回复 N HP
  | 'gold_bonus_passive'// 金币获取 +N
  | 'cooldown_reduction'// 所有卡牌冷却 -N%
  | 'burn_enhance'      // 灼烧叠层不掉（每tick仅减0.5）
  | 'poison_enhance'    // 毒素不衰减
  | 'lifesteal'         // 伤害的 N% 转为治疗
  | 'overtime_immune'   // 免疫加时赛伤害
  | 'shield_start'      // 开局获得 N 护盾
  ;

/** 被动技能配置定义（静态数据，不随 Run 变化） */
export interface GlobalPassiveConfig {
  id: GlobalPassiveId;
  name: string;
  description: string;
  icon: string;          // emoji 图标
  /** 技能分类，用于 3 选 1 抽取时的策略 */
  category: 'offense' | 'defense' | 'utility' | 'synergy';
  /** 同一技能是否可叠加选取；false 则已拥有时不再出现 */
  stackable: boolean;
  /** 效果数值（>0 时为增益倍率/值，由引擎按技能逻辑解释） */
  value: number;
}

/** 运行时已习得的全局被动技能实例 */
export interface OwnedPassive {
  id: GlobalPassiveId;
  /** 已叠加的次数（非可叠加技能最多 1） */
  stacks: number;
  /** 当前总效果值 = config.value * stacks */
  totalValue: number;
}

/** PvE 胜利后挂起的 3 选 1 技能选择状态 */
export interface PendingSkillChoiceState {
  /** 可选的 3 个技能 ID（已过滤已有非叠加技能） */
  choices: GlobalPassiveId[];
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
  pendingEvent?: PendingEventState | null;
  income?: number;         // 默认 0，每天开始时自动获得的金币
  hpRegen?: number;        // 默认 0，每场战斗结束后自动回复 HP
  goldGainBonus?: number;  // 默认 0，所有金币获取来源的额外加成量
  boardSlots: number;            // 当前可用棋盘格数（4~10）
  pendingLevelUp?: PendingLevelUpState | null;
  globalPassives?: OwnedPassive[];          // 已习得的全局被动技能
  pendingSkillChoice?: PendingSkillChoiceState | null; // PvE 胜利后挂起的技能选择
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
