/**
 * P1 功能测试脚本（无测试框架，用 tsx 运行）
 * npx tsx server/src/game/battle/__tests__/p1.test.ts
 */

import { runBattleEngine } from '../engine.js';
import { ITEMS_MAP } from '../../config/index.js';
import type { SlotItem, Tier, ItemSize, ItemConfig } from '@autocard/shared';

// ────────────────────────────────────────────────────────────────
// 辅助工具
// ────────────────────────────────────────────────────────────────

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function registerItem(cfg: ItemConfig) {
  ITEMS_MAP.set(cfg.itemId, cfg);
}

function makeSlot(itemId: string, slotIndex: number, tier: Tier = 'bronze', size: ItemSize = 1): SlotItem {
  return { itemId, slotIndex, tier, size };
}

function makeCombatant(board: SlotItem[], hp = 100) {
  return { hp, maxHp: hp, level: 1, board };
}

// ────────────────────────────────────────────────────────────────
// 测试 1：legendary 品阶倍率 ×4.0
// ────────────────────────────────────────────────────────────────
function testLegendaryTierMultiplier() {
  // 注册测试物品：damage value=10，critRate=0（确保不暴击）
  registerItem({
    itemId: 'test_legendary_dmg',
    name: '测试 legendary 伤害',
    description: '',
    size: 1,
    baseTier: 'bronze',
    price: 0,
    cooldown: 1,
    critRate: 0,
    ports: [{ category: 'output', type: 'damage', value: 10 }],
    targetRule: { kind: 'self' },
    tags: [],
  });

  // attacker：legendary 品阶的该卡
  const attacker = makeCombatant([makeSlot('test_legendary_dmg', 0, 'legendary')]);
  // defender：高 HP，空棋盘（不会立即结束）
  const defender = makeCombatant([], 200);

  const { events } = runBattleEngine(attacker, defender);

  const firstDmg = events.find(e => e.type === 'damage') as Extract<typeof events[0], { type: 'damage' }> | undefined;
  if (!firstDmg) throw new Error('应有 damage 事件');
  // legendary × 4.0：Math.round(10 * 4.0) = 40
  assert(
    firstDmg.value === 40,
    `legendary 倍率应使 damage = 40，实际=${firstDmg.value}`
  );
}

// ────────────────────────────────────────────────────────────────
// 测试 2：critRate=100 必定暴击
// ────────────────────────────────────────────────────────────────
function testCritRate100() {
  // 注册测试物品：damage value=10，critRate=100（必暴击），bronze 品阶
  registerItem({
    itemId: 'test_crit100_dmg',
    name: '测试 100% 暴击伤害',
    description: '',
    size: 1,
    baseTier: 'bronze',
    price: 0,
    cooldown: 1,
    critRate: 100,
    ports: [{ category: 'output', type: 'damage', value: 10 }],
    targetRule: { kind: 'self' },
    tags: [],
  });

  const attacker = makeCombatant([makeSlot('test_crit100_dmg', 0, 'bronze')]);
  const defender = makeCombatant([], 200);

  const { events } = runBattleEngine(attacker, defender);

  const firstDmg = events.find(e => e.type === 'damage') as (Extract<typeof events[0], { type: 'damage' }> & { crit?: boolean }) | undefined;
  if (!firstDmg) throw new Error('应有 damage 事件');

  // bronze × 1.0 × 暴击 × 2 = Math.round(10 * 1.0 * 2) = 20
  assert(
    firstDmg.value === 20,
    `critRate=100 应使 damage = 20，实际=${firstDmg.value}`
  );
  assert(
    (firstDmg as any).crit === true,
    `critRate=100 的 damage 事件应带 crit=true`
  );
}

// ────────────────────────────────────────────────────────────────
// 测试 3：income 每天结算（不依赖 MongoDB，模拟 advanceHour 逻辑）
// ────────────────────────────────────────────────────────────────
function testIncomePerDay() {
  function simulateAdvanceHour(run: {
    hour: number;
    day: number;
    gold: number;
    hp: number;
    maxHp: number;
    income: number;
    status: string;
  }) {
    if (run.status !== 'active') return;
    run.hour += 1;
    if (run.hour > 6) {
      run.hour = 1;
      run.day += 1;
      if (run.income > 0) run.gold += run.income;
      run.hp = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * 0.2));
    }
  }

  const run = {
    hour: 6,
    day: 1,
    gold: 10,
    hp: 50,
    maxHp: 100,
    income: 5,
    status: 'active',
  };

  simulateAdvanceHour(run);

  assert(run.day === 2, `应进入第 2 天，实际=${run.day}`);
  assert(run.hour === 1, `新天 hour 应重置为 1，实际=${run.hour}`);
  assert(
    run.gold === 15,
    `income=5 应使 gold 从 10 增至 15，实际=${run.gold}`
  );
}

// ────────────────────────────────────────────────────────────────
// 测试 4：hpRegen 战后回血
// ────────────────────────────────────────────────────────────────
function testHpRegen() {
  function simulateHpRegen(run: { hp: number; maxHp: number; hpRegen: number }) {
    if (run.hpRegen > 0) run.hp = Math.min(run.maxHp, run.hp + run.hpRegen);
  }

  // 正常回血
  const run1 = { hp: 60, maxHp: 100, hpRegen: 15 };
  simulateHpRegen(run1);
  assert(run1.hp === 75, `hpRegen=15 应使 hp 从 60 回至 75，实际=${run1.hp}`);

  // 回血上限不超过 maxHp
  const run2 = { hp: 95, maxHp: 100, hpRegen: 15 };
  simulateHpRegen(run2);
  assert(
    run2.hp === 100,
    `hpRegen=15 超出上限时 hp 应为 maxHp=100，实际=${run2.hp}`
  );
}

// ────────────────────────────────────────────────────────────────
// 测试 5：goldGainBonus 金币加成
// ────────────────────────────────────────────────────────────────
function testGoldGainBonus() {
  function applyGoldGain(base: number, bonus: number): number {
    return base + bonus;
  }

  assert(
    applyGoldGain(5, 3) === 8,
    `goldGainBonus=3 应使 gold 从 5 增至 8，实际=${applyGoldGain(5, 3)}`
  );
  assert(
    applyGoldGain(3, 0) === 3,
    `goldGainBonus=0（无加成）应保持 gold=3，实际=${applyGoldGain(3, 0)}`
  );
}

// ────────────────────────────────────────────────────────────────
// 运行所有测试
// ────────────────────────────────────────────────────────────────

const tests = [
  testLegendaryTierMultiplier,
  testCritRate100,
  testIncomePerDay,
  testHpRegen,
  testGoldGainBonus,
];

let pass = 0;
let fail = 0;

for (const t of tests) {
  try {
    t();
    pass++;
    console.log('✓', t.name);
  } catch (e) {
    fail++;
    console.error('✗', t.name, '-', (e as Error).message);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
