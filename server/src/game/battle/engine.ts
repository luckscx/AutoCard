import type { SlotItem, BattleSide, BattleEvent, BattleSnapshot, CardRuntimeState, ItemConfig } from '@autocard/shared';
import { TIER_MULTIPLIER, BATTLE_TICK_MS, BATTLE_OVERTIME_SEC, BATTLE_MAX_SEC } from '@autocard/shared';
import { ITEMS_MAP, BAZAAR_ITEMS_MAP } from '../config/index.js';

// 合并两张物品表（bazaar 物品优先），供引擎内部查询
const ALL_ITEMS_MAP = new Map([...ITEMS_MAP, ...BAZAAR_ITEMS_MAP]);
import { resolveTarget } from './resolveTarget.js';
import { applyKindPassives } from './kindPassives.js';

interface Combatant {
  hp: number;
  maxHp: number;
  level: number;
  board: SlotItem[];
}

interface SideState {
  hp: number;
  maxHp: number;
  shield: number;
  poison: number;
  burn: number;
  cards: CardRuntimeState[];
  board: SlotItem[];
}

function initSide(c: Combatant): SideState {
  return {
    hp: c.hp,
    maxHp: c.maxHp,
    shield: 0,
    poison: 0,
    burn: 0,
    board: c.board,
    cards: c.board.map(item => ({
      slotIndex: item.slotIndex,
      cooldownProgress: 0,
      hasteRemain: 0,
      slowRemain: 0,
      freezeRemain: 0,
      destroyed: false,
    })),
  };
}

function getCardState(side: SideState, slotIndex: number): CardRuntimeState | undefined {
  return side.cards.find(c => c.slotIndex === slotIndex);
}

function getItemConfig(board: SlotItem[], slotIndex: number): ItemConfig | undefined {
  const slot = board.find(s => s.slotIndex === slotIndex);
  if (!slot) return undefined;
  return ALL_ITEMS_MAP.get(slot.itemId);
}

function getBoardConfigs(board: SlotItem[]): ItemConfig[] {
  return board.map(s => ALL_ITEMS_MAP.get(s.itemId)).filter((c): c is ItemConfig => c != null);
}

function getTierMul(board: SlotItem[], slotIndex: number): number {
  const slot = board.find(s => s.slotIndex === slotIndex);
  if (!slot) return 1;
  return TIER_MULTIPLIER[slot.tier] ?? 1;
}

function makeSnapshot(tick: number, player: SideState, enemy: SideState): BattleSnapshot {
  return {
    tick,
    player: { hp: player.hp, maxHp: player.maxHp, shield: player.shield, poison: player.poison, burn: player.burn },
    enemy: { hp: enemy.hp, maxHp: enemy.maxHp, shield: enemy.shield, poison: enemy.poison, burn: enemy.burn },
    playerCards: player.cards.map(c => {
      const cfg = getItemConfig(player.board, c.slotIndex);
      const cooldown = cfg?.cooldown ?? 1;
      return { ...c, cooldownProgress: Math.min(c.cooldownProgress / cooldown, 1) };
    }),
    enemyCards: enemy.cards.map(c => {
      const cfg = getItemConfig(enemy.board, c.slotIndex);
      const cooldown = cfg?.cooldown ?? 1;
      return { ...c, cooldownProgress: Math.min(c.cooldownProgress / cooldown, 1) };
    }),
  };
}

export interface BattleEngineResult {
  attackerWon: boolean;
  attackerHpLeft: number;
  defenderHpLeft: number;
  events: BattleEvent[];
  snapshots: BattleSnapshot[];
}

export function runBattleEngine(attacker: Combatant, defender: Combatant): BattleEngineResult {
  const player = initSide(attacker);
  const enemy = initSide(defender);
  const events: BattleEvent[] = [];
  const snapshots: BattleSnapshot[] = [];

  const tickSec = BATTLE_TICK_MS / 1000;
  const maxTicks = (BATTLE_MAX_SEC * 1000) / BATTLE_TICK_MS;
  const overtimeTick = (BATTLE_OVERTIME_SEC * 1000) / BATTLE_TICK_MS;

  snapshots.push(makeSnapshot(0, player, enemy));

  function getSide(side: BattleSide): SideState { return side === 'player' ? player : enemy; }
  function getOpponent(side: BattleSide): SideState { return side === 'player' ? enemy : player; }
  function oppSide(side: BattleSide): BattleSide { return side === 'player' ? 'enemy' : 'player'; }

  // ---------------------------------------------------------------------------
  // 修复 3: 增加 isCrit 参数，damage 事件带 crit 标记
  // ---------------------------------------------------------------------------
  function applyEffect(
    tick: number,
    portType: string,
    value: number,
    sourceSide: BattleSide,
    sourceSlotIndex: number,
    cfg: ItemConfig,
    isCrit = false,
  ) {
    const self = getSide(sourceSide);
    const opp = getOpponent(sourceSide);
    const oppS = oppSide(sourceSide);

    switch (portType) {
      case 'damage': {
        const real = Math.max(0, value - opp.shield);
        opp.shield = Math.max(0, opp.shield - value);
        opp.hp -= real;
        // 修复 3: 将 crit 信息写入 damage 事件
        events.push({ tick, type: 'damage', value: real, targetSide: oppS, ...(isCrit ? { crit: true } : {}) });
        break;
      }
      case 'poison': {
        opp.poison += value;
        events.push({ tick, type: 'poison', value, targetSide: oppS });
        break;
      }
      case 'burn': {
        opp.burn += value;
        events.push({ tick, type: 'burn', value, targetSide: oppS });
        break;
      }
      case 'destroy': {
        // 修复 1: 对敌方棋盘调用 resolveTarget 时，传 -1 作为 selfSlotIndex，
        // 避免跨棋盘索引污染（不应把己方 slotIndex 当做对方排除位置）
        const resolved = resolveTarget(cfg.targetRule, opp.board, -1);
        const targetIndices = resolved.slotIndices.length > 0 ? resolved.slotIndices :
          opp.board.length > 0 ? [opp.board[0].slotIndex] : [];
        for (const idx of targetIndices) {
          const cs = getCardState(opp, idx);
          if (cs && !cs.destroyed) {
            cs.destroyed = true;
            events.push({ tick, type: 'destroy', targetSide: oppS, targetSlotIndex: idx });
          }
        }
        break;
      }
      case 'heal': {
        const before = self.hp;
        self.hp = Math.min(self.maxHp, self.hp + value);
        events.push({ tick, type: 'heal', value: self.hp - before, targetSide: sourceSide });
        break;
      }
      case 'shield': {
        self.shield += value;
        events.push({ tick, type: 'shield', value, targetSide: sourceSide });
        break;
      }
      case 'haste':
      case 'charge':
      case 'slow':
      case 'freeze': {
        const isOffensive = portType === 'slow' || portType === 'freeze';
        const targetSideState = isOffensive ? opp : self;
        const targetBoard = isOffensive ? opp.board : self.board;
        // 修复 1: 对敌方棋盘（slow/freeze）调用时传 -1，避免跨棋盘索引污染
        const resolveIdx = isOffensive ? -1 : sourceSlotIndex;
        const resolved = resolveTarget(cfg.targetRule, targetBoard, resolveIdx);
        const indices = resolved.slotIndices;
        const evtSide = isOffensive ? oppS : sourceSide;

        for (const idx of indices) {
          const cs = getCardState(targetSideState, idx);
          if (!cs || cs.destroyed) continue;
          if (portType === 'haste') {
            cs.hasteRemain += value;
          } else if (portType === 'slow') {
            cs.slowRemain += value;
          } else if (portType === 'freeze') {
            cs.freezeRemain += value;
          } else if (portType === 'charge') {
            cs.cooldownProgress += value;
            // 修复 2: charge 过充后立即触发
            triggerCardIfReady(cs, sourceSide, tick, targetSideState);
          }
        }

        events.push({ tick, type: portType as BattleEvent['type'], value, targetSide: evtSide, targetSlotIndices: indices } as BattleEvent);
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 修复 2: 抽出内联函数，处理 charge 过充立即触发（闭包访问 player/enemy/events）
  // ---------------------------------------------------------------------------
  function triggerCardIfReady(cs: CardRuntimeState, side: BattleSide, tick: number, s: SideState) {
    const cfg = getItemConfig(s.board, cs.slotIndex);
    if (!cfg) return;
    while (cs.cooldownProgress >= cfg.cooldown && !cs.destroyed) {
      cs.cooldownProgress -= cfg.cooldown;
      events.push({ tick, type: 'card_trigger', side, slotIndex: cs.slotIndex });
      const tierMul = getTierMul(s.board, cs.slotIndex);
      for (const port of cfg.ports) {
        // 修复 3: 暴击判定
        const isCrit = cfg.critRate != null && cfg.critRate > 0 && Math.random() * 100 < cfg.critRate;
        const rawValue = Math.round(port.value * tierMul * (isCrit ? 2 : 1));
        const boardConfigs = getBoardConfigs(s.board);
        const value = applyKindPassives(port.type, rawValue, cfg, boardConfigs);
        applyEffect(tick, port.type, value, side, cs.slotIndex, cfg, isCrit);
      }
      if (player.hp <= 0 || enemy.hp <= 0) return;
    }
  }

  function processSide(tick: number, side: BattleSide) {
    const s = getSide(side);
    for (const cs of s.cards) {
      if (cs.destroyed) continue;
      const cfg = getItemConfig(s.board, cs.slotIndex);
      if (!cfg) continue;

      if (cs.freezeRemain > 0) {
        cs.freezeRemain = Math.max(0, cs.freezeRemain - tickSec);
        continue;
      }

      let chargeRate = tickSec;
      if (cs.hasteRemain > 0) {
        chargeRate *= 2;
        cs.hasteRemain = Math.max(0, cs.hasteRemain - tickSec);
      }
      if (cs.slowRemain > 0) {
        chargeRate *= 0.5;
        cs.slowRemain = Math.max(0, cs.slowRemain - tickSec);
      }

      cs.cooldownProgress += chargeRate;

      // 修复 3: 暴击判定在此处（processSide 的正常触发路径）
      while (cs.cooldownProgress >= cfg.cooldown && !cs.destroyed) {
        cs.cooldownProgress -= cfg.cooldown;
        events.push({ tick, type: 'card_trigger', side, slotIndex: cs.slotIndex });

        const tierMul = getTierMul(s.board, cs.slotIndex);
        for (const port of cfg.ports) {
          const isCrit = cfg.critRate != null && cfg.critRate > 0 && Math.random() * 100 < cfg.critRate;
          const rawValue = Math.round(port.value * tierMul * (isCrit ? 2 : 1));
          const boardConfigs = getBoardConfigs(s.board);
          const value = applyKindPassives(port.type, rawValue, cfg, boardConfigs);
          applyEffect(tick, port.type, value, side, cs.slotIndex, cfg, isCrit);
        }

        if (player.hp <= 0 || enemy.hp <= 0) return;
      }
    }
  }

  for (let tick = 1; tick <= maxTicks; tick++) {
    if (tick % 10 === 0) {
      for (const [s, side] of [[player, 'player'], [enemy, 'enemy']] as [SideState, BattleSide][]) {
        if (s.poison > 0 || s.burn > 0) {
          const poisonDmg = s.poison;
          const burnDmg = s.burn;
          s.hp -= poisonDmg + burnDmg;
          s.burn = Math.max(0, s.burn - 1);
          events.push({ tick, type: 'dot_tick', side, poisonDmg, burnDmg });
        }
      }
      if (player.hp <= 0 || enemy.hp <= 0) break;
    }

    processSide(tick, 'player');
    if (player.hp <= 0 || enemy.hp <= 0) break;
    processSide(tick, 'enemy');
    if (player.hp <= 0 || enemy.hp <= 0) break;

    if (tick >= overtimeTick && tick % 10 === 0) {
      const sec = Math.floor(tick / 10);
      const otDmg = sec - BATTLE_OVERTIME_SEC;
      if (otDmg > 0) {
        player.hp -= otDmg;
        enemy.hp -= otDmg;
        events.push({ tick, type: 'overtime', playerDmg: otDmg, enemyDmg: otDmg });
      }
    }

    snapshots.push(makeSnapshot(tick, player, enemy));

    if (player.hp <= 0 || enemy.hp <= 0) break;
  }

  player.hp = Math.max(0, player.hp);
  enemy.hp = Math.max(0, enemy.hp);

  const winner: BattleSide = player.hp > enemy.hp ? 'player' : 'enemy';
  events.push({ tick: events.length > 0 ? events[events.length - 1].tick : 0, type: 'battle_end', winner });
  snapshots.push(makeSnapshot(events[events.length - 1].tick, player, enemy));

  return {
    attackerWon: player.hp >= enemy.hp,
    attackerHpLeft: player.hp,
    defenderHpLeft: enemy.hp,
    events,
    snapshots,
  };
}
