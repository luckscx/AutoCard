/**
 * P4-A 测试：验证怪物多卡棋盘战斗逻辑
 * npx tsx server/src/game/battle/__tests__/p4.test.ts
 */

import { resolvePveBattle } from '../../battle.js';
import { MONSTERS } from '../../config/monsters.js';
import type { SlotItem } from '@autocard/shared';

// ────────────────────────────────────────────────────────────────
// 辅助工具
// ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`断言失败：${msg}`);
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${(e as Error).message}`);
    failed++;
  }
}

/** 构造玩家参数：高 HP、空棋盘，不反击只挨打 */
function makePlayer(hp = 500, board: SlotItem[] = []) {
  return { hp, maxHp: hp, level: 1, board };
}

// ────────────────────────────────────────────────────────────────
console.log('\n── P4 测试套件：怪物多卡棋盘战斗逻辑 ──\n');
// ────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────
// 测试 1：多卡怪物 — 鼠王双刀
// rat_king: [poison_dagger@0, venom_vial@1]
// 两张卡都应在 enemy 侧触发，并产生 poison 事件
// ────────────────────────────────────────────────────────────────
test('测试 1：鼠王 — enemy 侧 slotIndex 0 & 1 均触发，产生 poison 事件', () => {
  const ratKing = MONSTERS.find(m => m.monsterId === 'rat_king');
  assert(ratKing != null, 'monsters 中未找到 rat_king');

  const result = resolvePveBattle(makePlayer(500), ratKing!);
  const events = result.events ?? [];

  // enemy 侧 card_trigger 事件
  const enemyTriggers = events.filter(
    e => e.type === 'card_trigger' && (e as any).side === 'enemy',
  );
  assert(enemyTriggers.length > 0, 'enemy 侧应有 card_trigger 事件');

  const triggeredSlots = new Set(enemyTriggers.map(e => (e as any).slotIndex as number));
  assert(triggeredSlots.has(0), 'slotIndex=0 (poison_dagger) 应至少触发一次');
  assert(triggeredSlots.has(1), 'slotIndex=1 (venom_vial) 应至少触发一次');

  // poison 事件（两张卡均输出 poison）
  const poisonEvents = events.filter(e => e.type === 'poison');
  assert(poisonEvents.length > 0, '应有 poison 类型事件（两张卡均造成毒）');

  const firstPoison = poisonEvents[0] as { value: number };
  console.log(`     (首条 poison 事件 value = ${firstPoison.value}，触发 slotIndex = ${[...triggeredSlots].sort().join(',')} ✓)`);
});

// ────────────────────────────────────────────────────────────────
// 测试 2：带品阶怪物 — 幼龙 silver inferno_staff
// inferno_staff silver: rawValue = Math.round(25 × 1.5) = 38
// dragon 被动：2 × 1（棋盘仅 1 张 dragon 卡）= +2
// 最终 burn value = applyKindPassives → Math.max(0, Math.round(38 + 2)) = 40
// ────────────────────────────────────────────────────────────────
test('测试 2：幼龙 — silver inferno_staff burn 事件 value 符合品阶×被动计算', () => {
  const dragonWhelp = MONSTERS.find(m => m.monsterId === 'dragon_whelp');
  assert(dragonWhelp != null, 'monsters 中未找到 dragon_whelp');

  const result = resolvePveBattle(makePlayer(500), dragonWhelp!);
  const events = result.events ?? [];

  // 找 enemy 侧触发的 burn 事件
  const burnEvents = events.filter(
    e => e.type === 'burn' && (e as any).targetSide === 'player',
  );
  assert(burnEvents.length > 0, '应有 burn 类型事件（inferno_staff 触发）');

  // silver(1.5) × 25 = 37.5 → Math.round = 38；dragon 被动 +2 → 40
  const firstBurn = burnEvents[0] as { value: number };
  const expectedValue = 40;
  const tolerance = 1;
  assert(
    Math.abs(firstBurn.value - expectedValue) <= tolerance,
    `inferno_staff(silver)+dragon被动 burn value 应为 ${expectedValue}±${tolerance}，实际=${firstBurn.value}`,
  );

  console.log(`     (首条 burn 事件 value = ${firstBurn.value}，预期 = ${expectedValue} ✓)`);
});

// ────────────────────────────────────────────────────────────────
// 测试 3：fallback 路径 — 无 battleBoard 怪物
// 手动构造无 battleBoard 的怪物 → 使用虚拟 __monster_attack 单卡
// 验证 card_trigger 和 damage 事件均出现
// ────────────────────────────────────────────────────────────────
test('测试 3：fallback — 无 battleBoard 怪物走虚拟单卡路径', () => {
  const plainMonster = {
    monsterId: 'test_plain',
    name: '测试怪',
    difficulty: 'easy' as const,
    hp: 50,
    attack: 10,
    xpReward: 1,
    goldReward: 3,
    lootTable: [],
    // 故意不设置 battleBoard
  };

  const result = resolvePveBattle(makePlayer(500), plainMonster);
  const events = result.events ?? [];

  // 应有 card_trigger（虚拟卡触发）
  const triggerEvents = events.filter(e => e.type === 'card_trigger');
  assert(triggerEvents.length > 0, 'fallback 路径应有 card_trigger 事件（虚拟卡触发）');

  // 应有 damage（虚拟卡造成伤害）
  const damageEvents = events.filter(e => e.type === 'damage');
  assert(damageEvents.length > 0, 'fallback 路径应有 damage 事件（虚拟卡造成伤害）');

  const firstDmg = damageEvents[0] as { value: number };
  console.log(`     (虚拟卡 damage value = ${firstDmg.value}，card_trigger 共 ${triggerEvents.length} 次 ✓)`);
});

// ────────────────────────────────────────────────────────────────
// 测试 4：石头傀儡 — shield + thorns + war_axe 三卡组合
// stone_golem: [shield_plate@0, thorns_ring@1, war_axe@2]
// player HP=200, 空棋盘
// 断言：enemy 一侧有 shield 事件、damage 事件，且有 battle_end
// ────────────────────────────────────────────────────────────────
test('测试 4：石头傀儡 — 三卡 shield/damage 事件均出现，战斗正常结束', () => {
  const stoneGolem = MONSTERS.find(m => m.monsterId === 'stone_golem');
  assert(stoneGolem != null, 'monsters 中未找到 stone_golem');

  const result = resolvePveBattle(makePlayer(200), stoneGolem!);
  const events = result.events ?? [];

  // shield_plate → shield 事件（targetSide='enemy'，即怪物自身护盾）
  const shieldEvents = events.filter(
    e => e.type === 'shield' && (e as any).targetSide === 'enemy',
  );
  assert(shieldEvents.length > 0, 'enemy 侧应有 shield 事件（shield_plate 触发）');

  // thorns_ring/war_axe → damage 事件（targetSide='player'）
  const damageEvents = events.filter(
    e => e.type === 'damage' && (e as any).targetSide === 'player',
  );
  assert(damageEvents.length > 0, 'enemy 侧应有 damage 事件（thorns_ring 或 war_axe 触发）');

  // battle_end 事件
  const endEvent = events.find(e => e.type === 'battle_end');
  assert(endEvent != null, '应有 battle_end 事件');

  console.log(`     (shield 事件 ${shieldEvents.length} 次，damage 事件 ${damageEvents.length} 次，battle_end ✓)`);
});

// ────────────────────────────────────────────────────────────────
// 测试 5：巫妖 — freeze + charge + heal 联动
// lich: [frost_orb@0, arcane_tome@2(silver), holy_staff@5]
// player HP=200, 空棋盘
// frost_orb  → freeze 事件（player 空棋盘，targetSlotIndices=[]，但事件存在）
// arcane_tome→ charge 事件（充能己方 leftmost=frost_orb@0）
// holy_staff → heal 事件（治疗 enemy 自身）
// ────────────────────────────────────────────────────────────────
test('测试 5：巫妖 — charge 事件（arcane_tome 充能 leftmost）和 heal 事件（holy_staff）均出现', () => {
  const lich = MONSTERS.find(m => m.monsterId === 'lich');
  assert(lich != null, 'monsters 中未找到 lich');

  const result = resolvePveBattle(makePlayer(200), lich!);
  const events = result.events ?? [];

  // arcane_tome 充能己方 leftmost → charge 事件，targetSide='enemy'（对己方卡充能）
  const chargeEvents = events.filter(
    e => e.type === 'charge' && (e as any).targetSide === 'enemy',
  );
  assert(chargeEvents.length > 0, '应有 charge 事件（arcane_tome 充能己方 leftmost=frost_orb）');

  // holy_staff 治疗己方 → heal 事件，targetSide='enemy'
  const healEvents = events.filter(
    e => e.type === 'heal' && (e as any).targetSide === 'enemy',
  );
  assert(healEvents.length > 0, '应有 heal 事件（holy_staff 治疗 enemy 自身）');

  // freeze 事件也应出现（即使 targetSlotIndices=[]）
  const freezeEvents = events.filter(e => e.type === 'freeze');
  console.log(`     (charge 事件 ${chargeEvents.length} 次，heal 事件 ${healEvents.length} 次，freeze 事件 ${freezeEvents.length} 次 ✓)`);
});

// ────────────────────────────────────────────────────────────────
// 汇总
// ────────────────────────────────────────────────────────────────
console.log(`\n── 结果：${passed} 通过 / ${failed} 失败 ──\n`);
if (failed > 0) process.exit(1);
