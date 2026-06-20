import type { SlotItem, BattleResult, BattleEvent, BattleSnapshot, MonsterConfig } from '@autocard/shared';
import { ITEMS_MAP, BAZAAR_ITEMS_MAP } from './config/index.js';
import { runBattleEngine } from './battle/engine.js';

interface Combatant {
  hp: number;
  maxHp: number;
  level: number;
  board: SlotItem[];
}

// Merge both item maps for complete item lookups
const ALL_ITEMS_MAP = new Map([...ITEMS_MAP, ...BAZAAR_ITEMS_MAP]);

export function resolveBattle(attacker: Combatant, defender: Combatant): { attackerWon: boolean; attackerHpLeft: number; defenderHpLeft: number; events: BattleEvent[]; snapshots: BattleSnapshot[] } {
  return runBattleEngine(attacker, defender);
}

export function resolvePveBattle(
  player: Combatant,
  monster: MonsterConfig,
): BattleResult {
  let monsterBoard: SlotItem[];

  if (monster.battleBoard && monster.battleBoard.length > 0) {
    monsterBoard = monster.battleBoard.map(slot => {
      const cfg = ALL_ITEMS_MAP.get(slot.itemId);
      if (!cfg) {
        console.error(`[resolvePveBattle] Unknown monster item: "${slot.itemId}" (monster: ${monster.name})`);
        throw new Error(`Unknown monster item: ${slot.itemId}`);
      }
      return {
        itemId: slot.itemId,
        tier: slot.tier ?? cfg.baseTier,
        size: cfg.size,
        slotIndex: slot.slotIndex,
      };
    });
  } else {
    if (!ITEMS_MAP.has('__monster_attack')) {
      ITEMS_MAP.set('__monster_attack', {
        itemId: '__monster_attack',
        name: 'Monster Attack',
        description: '',
        size: 1,
        baseTier: 'bronze',
        price: 0,
        cooldown: 2,
        ports: [{ category: 'output', type: 'damage', value: monster.attack }],
        targetRule: { kind: 'self' },
        tags: [],
      });
    } else {
      const cfg = ITEMS_MAP.get('__monster_attack')!;
      cfg.ports[0].value = monster.attack;
    }

    monsterBoard = [{ itemId: '__monster_attack', tier: 'bronze' as const, size: 1 as const, slotIndex: 0 }];
  }

  const monsterCombatant: Combatant = {
    hp: monster.hp,
    maxHp: monster.hp,
    level: 1,
    board: monsterBoard,
  };

  const result = runBattleEngine(player, monsterCombatant);
  return {
    won: result.attackerWon,
    hpLeft: result.attackerHpLeft,
    xpGained: 0,
    goldGained: 0,
    events: result.events,
    snapshots: result.snapshots,
  };
}
