/**
 * 战斗引擎单元测试（vitest 正式测试套件）
 *
 * 对应任务 [5.1] 战斗引擎单元测试 + CI 门禁。
 * 本文件由 vitest 运行（见 server/vitest.config.ts 的 include 规则），
 * 取代 __tests__/engine.test.ts 中手写 assert + tsx 的方案。
 *
 * 注意：
 * - 必须在导入 engine.js 之前导入 ./testItems.js，使测试物品进入引擎的
 *   ALL_ITEMS_MAP 查找表（engine 在模块初始化时构建该快照）。
 * - 测试物品 critRate 均为 0，并用 vi.spyOn(Math,'random') 固定随机值，
 *   保证战斗结果完全确定性、可重复。
 */

import './testItems.js'; // 必须最先导入：注册测试物品到 ITEMS_MAP
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBattleEngine } from './engine.js';
import type { SlotItem, Tier, ItemSize } from '@autocard/shared';

// ────────────────────────────────────────────────────────────────
// 测试辅助
// ────────────────────────────────────────────────────────────────

function makeSlot(itemId: string, slotIndex: number, tier: Tier = 'bronze', size: ItemSize = 1): SlotItem {
  return { itemId, slotIndex, tier, size };
}

function makeCombatant(board: SlotItem[], hp = 100) {
  return { hp, maxHp: hp, level: 1, board };
}

// 固定随机数，避免暴击引入的不确定性（双保险，测试物品 critRate 已为 0）
let randomSpy: ReturnType<typeof vi.spyOn> | undefined;
beforeEach(() => {
  randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
});
afterEach(() => {
  randomSpy?.mockRestore();
});

// ────────────────────────────────────────────────────────────────
// 测试套件
// ────────────────────────────────────────────────────────────────

describe('战斗引擎 - 基础效果', () => {
  it('damage：护盾优先抵伤，真实伤害 <= 原始伤害', () => {
    const attacker = makeCombatant([makeSlot('ut_dmg5', 0)], 100);
    const defender = makeCombatant([makeSlot('ut_shield3', 0)], 100);

    const { events, defenderHpLeft } = runBattleEngine(attacker, defender);

    const firstDmg = events.find((e) => e.type === 'damage');
    expect(firstDmg, '应有 damage 事件').toBeDefined();
    if (firstDmg && firstDmg.type === 'damage') {
      // 护盾在 tick5 先生成(3点)，damage 在 tick10 触发，真实伤害不超过 5
      expect(firstDmg.value).toBeLessThanOrEqual(5);
    }
    expect(defenderHpLeft).toBeLessThan(100);
  });

  it('poison：持续叠加、不递减', () => {
    const attacker = makeCombatant([makeSlot('ut_poison3', 0)], 1000);
    const defender = makeCombatant([], 1000);

    const { events } = runBattleEngine(attacker, defender);

    const dotTicks = events.filter(
      (e): e is Extract<typeof e, { type: 'dot_tick' }> =>
        e.type === 'dot_tick' && e.side === 'enemy',
    );
    expect(dotTicks.length).toBeGreaterThanOrEqual(3);

    for (let i = 1; i < Math.min(dotTicks.length, 4); i++) {
      expect(dotTicks[i].poisonDmg).toBeGreaterThanOrEqual(dotTicks[i - 1].poisonDmg);
    }
  });

  it('burn：每秒衰减 1 层（3→2→1）', () => {
    const attacker = makeCombatant([makeSlot('ut_burn3_cd10', 0)], 1000);
    const defender = makeCombatant([], 1000);

    const { events } = runBattleEngine(attacker, defender);

    const dotTicks = events.filter(
      (e): e is Extract<typeof e, { type: 'dot_tick' }> =>
        e.type === 'dot_tick' && e.side === 'enemy',
    );
    expect(dotTicks.length).toBeGreaterThanOrEqual(3);
    expect(dotTicks[0].burnDmg).toBe(3);
    expect(dotTicks[1].burnDmg).toBe(2);
    expect(dotTicks[2].burnDmg).toBe(1);
  });

  it('heal：满血时治疗增量为 0（不超过 maxHp）', () => {
    // 当前 hp=10 且 maxHp=10（满血），治疗 5 后增量应为 0
    const attacker = makeCombatant([makeSlot('ut_heal5', 0)], 10);
    const defender = makeCombatant([], 1000);

    const { events } = runBattleEngine(attacker, defender);
    const healEvt = events.find((e) => e.type === 'heal');
    expect(healEvt, '应有 heal 事件').toBeDefined();
    if (healEvt && healEvt.type === 'heal') {
      expect(healEvt.value).toBe(0);
    }
  });
});

describe('战斗引擎 - 时序与状态', () => {
  it('haste：加速后同一卡触发次数增多', () => {
    const board = [makeSlot('ut_dmg_cd2', 0), makeSlot('ut_haste_all', 1)];
    const attacker = makeCombatant(board, 1000);
    const defender = makeCombatant([], 1000);

    const { events } = runBattleEngine(attacker, defender);

    const triggersNoHaste = Math.floor(5 / 2); // 无加速预期约 2 次 (2s,4s)
    const actualTriggers = events.filter(
      (e) => e.type === 'card_trigger' && e.side === 'player' && e.slotIndex === 0 && e.tick <= 50,
    ).length;
    expect(actualTriggers).toBeGreaterThan(triggersNoHaste);
  });

  it('freeze：冻结期间敌方卡不充能触发', () => {
    const attacker = makeCombatant([makeSlot('ut_freeze2', 0)], 1000);
    const defender = makeCombatant([makeSlot('ut_dmg_cd2', 0)], 1000);

    const { events } = runBattleEngine(attacker, defender);

    const freezeEvt = events.find((e) => e.type === 'freeze');
    expect(freezeEvt, '应有 freeze 事件').toBeDefined();
    if (freezeEvt && freezeEvt.type === 'freeze') {
      expect(freezeEvt.targetSlotIndices).toContain(0);
    }

    const freezeStart = (freezeEvt as Extract<typeof freezeEvt, { type: 'freeze' }>).tick;
    const freezeEnd = freezeStart + 20; // 2s = 20 tick
    const triggersDuringFreeze = events.filter(
      (e) =>
        e.type === 'card_trigger' &&
        e.side === 'enemy' &&
        e.slotIndex === 0 &&
        e.tick > freezeStart &&
        e.tick <= freezeEnd,
    );
    expect(triggersDuringFreeze.length).toBe(0);
  });

  it('charge：过充后立即触发被充能卡', () => {
    const board = [
      makeSlot('ut_dmg_cd2', 0), // CD=2s，被 charge
      makeSlot('ut_charge2_leftmost', 1), // CD=1s，发出 charge 2 给最左
    ];
    const attacker = makeCombatant(board, 1000);
    const defender = makeCombatant([], 1000);

    const { events } = runBattleEngine(attacker, defender);

    const chargeEvt = events.find((e) => e.type === 'charge');
    expect(chargeEvt, '应有 charge 事件').toBeDefined();
    if (chargeEvt && chargeEvt.type === 'charge') {
      const immediateTrigger = events.find(
        (e) =>
          e.type === 'card_trigger' &&
          e.side === 'player' &&
          e.slotIndex === 0 &&
          e.tick === chargeEvt.tick,
      );
      expect(immediateTrigger, 'charge 过充后应在同一 tick 立即触发 slotIndex=0').toBeDefined();
    }
  });

  it('destroy：摧毁敌方卡后不再触发', () => {
    const attacker = makeCombatant([makeSlot('ut_destroy_leftmost', 0)], 1000);
    const defender = makeCombatant([makeSlot('ut_dmg_cd2', 0), makeSlot('ut_dmg_cd2', 1)], 1000);

    const { events } = runBattleEngine(attacker, defender);

    const destroyEvt = events.find((e) => e.type === 'destroy');
    expect(destroyEvt, '应有 destroy 事件').toBeDefined();
    if (destroyEvt && destroyEvt.type === 'destroy') {
      expect(destroyEvt.targetSide).toBe('enemy');
      expect(destroyEvt.targetSlotIndex).toBe(0);
    }
    const destroyTick = (destroyEvt as Extract<typeof destroyEvt, { type: 'destroy' }>).tick;
    const lateTriggers = events.filter(
      (e) => e.type === 'card_trigger' && e.side === 'enemy' && e.slotIndex === 0 && e.tick > destroyTick,
    );
    expect(lateTriggers.length).toBe(0);
  });
});

describe('战斗引擎 - 结束与超时', () => {
  it('overtime：超时后双方持续递增扣血', () => {
    const attacker = makeCombatant([], 9999);
    const defender = makeCombatant([], 9999);

    const { events } = runBattleEngine(attacker, defender);

    const overtimeEvts = events.filter(
      (e): e is Extract<typeof e, { type: 'overtime' }> => e.type === 'overtime',
    );
    expect(overtimeEvts.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < overtimeEvts.length; i++) {
      expect(overtimeEvts[i].playerDmg).toBeGreaterThan(overtimeEvts[i - 1].playerDmg);
    }
  });

  it('battle_end：高攻方获胜且 winner 标记正确', () => {
    const attacker = makeCombatant([makeSlot('ut_dmg5', 0)], 100);
    const defender = makeCombatant([], 100);

    const { events, attackerWon } = runBattleEngine(attacker, defender);

    const lastEvt = events[events.length - 1];
    expect(lastEvt.type).toBe('battle_end');
    if (lastEvt.type === 'battle_end') {
      expect(lastEvt.winner).toBe('player');
    }
    expect(attackerWon).toBe(true);
  });

  it('battle_end：防守方获胜时 attackerWon 为 false', () => {
    const attacker = makeCombatant([], 100);
    const defender = makeCombatant([makeSlot('ut_dmg5', 0)], 100);

    const { attackerWon } = runBattleEngine(attacker, defender);
    expect(attackerWon).toBe(false);
  });
});

describe('战斗引擎 - 目标解析与数值', () => {
  it('targetRule adjacent：只加速相邻卡，不命中非相邻', () => {
    const board = [
      makeSlot('ut_haste_adjacent', 0), // 发出 haste 给 adjacent
      makeSlot('ut_dmg_cd2', 1), // 相邻，应被加速
      makeSlot('ut_dmg_cd2', 3), // 不相邻，不应被加速
    ];
    const attacker = makeCombatant(board, 1000);
    const defender = makeCombatant([], 1000);

    const { events } = runBattleEngine(attacker, defender);

    const hasteEvts = events.filter(
      (e): e is Extract<typeof e, { type: 'haste' }> => e.type === 'haste',
    );
    expect(hasteEvts.length).toBeGreaterThan(0);
    for (const evt of hasteEvts) {
      expect(evt.targetSlotIndices).not.toContain(3);
      expect(evt.targetSlotIndices.length === 0 || evt.targetSlotIndices.includes(1)).toBe(true);
    }

    const triggers1 = events.filter(
      (e) => e.type === 'card_trigger' && e.side === 'player' && e.slotIndex === 1 && e.tick <= 50,
    ).length;
    const triggers3 = events.filter(
      (e) => e.type === 'card_trigger' && e.side === 'player' && e.slotIndex === 3 && e.tick <= 50,
    ).length;
    expect(triggers1).toBeGreaterThanOrEqual(triggers3);
  });

  it('tier 倍率：gold 伤害按 2.2 倍结算', () => {
    // ut_dmg10_gold 原始 value=10，gold 倍率 2.2 → 22；防守方无护盾，第一击应为 22
    const attacker = makeCombatant([makeSlot('ut_dmg10_gold', 0, 'gold')], 100);
    const defender = makeCombatant([], 100);

    const { events } = runBattleEngine(attacker, defender);
    const firstDmg = events.find((e) => e.type === 'damage');
    expect(firstDmg, '应有 damage 事件').toBeDefined();
    if (firstDmg && firstDmg.type === 'damage') {
      expect(firstDmg.value).toBe(22);
    }
  });

  it('kind 被动：dragon + burn 联动，每张 dragon 卡 +2 burn', () => {
    // 两张 dragon 卡（ut_dragon_burn + ut_dragon_other）→ burn 应被 +4（2*2）
    // ut_dragon_burn 基础 burn=3，最终应为 7
    const board = [makeSlot('ut_dragon_burn', 0), makeSlot('ut_dragon_other', 1)];
    const attacker = makeCombatant(board, 1000);
    const defender = makeCombatant([], 1000);

    const { events } = runBattleEngine(attacker, defender);
    const dotTicks = events.filter(
      (e): e is Extract<typeof e, { type: 'dot_tick' }> =>
        e.type === 'dot_tick' && e.side === 'enemy',
    );
    expect(dotTicks.length).toBeGreaterThanOrEqual(1);
    // 第一次 dot_tick 的 burnDmg 即第一张 dragon burn 卡触发的 3 + 4(被动) = 7
    expect(dotTicks[0].burnDmg).toBe(7);
  });
});
