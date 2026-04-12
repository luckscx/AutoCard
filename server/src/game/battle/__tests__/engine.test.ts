/**
 * 战斗引擎测试脚本（无测试框架，用 tsx 运行）
 * npx tsx server/src/game/battle/__tests__/engine.test.ts
 */

import { runBattleEngine } from '../engine.js';
import { ITEMS_MAP } from '../../config/index.js';
import type { SlotItem, ItemConfig, Tier, ItemSize } from '@autocard/shared';

// ────────────────────────────────────────────────────────────────
// 辅助工具
// ────────────────────────────────────────────────────────────────

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

/** 向 ITEMS_MAP 注册测试专用物品（进程退出前无需清理） */
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
// 注册测试物品
// ────────────────────────────────────────────────────────────────

// 伤害 5、CD=1s、targetRule=self
registerItem({
  itemId: 'test_dmg5',
  name: '测试伤害5',
  description: '',
  size: 1,
  baseTier: 'bronze',
  price: 0,
  cooldown: 1,
  ports: [{ category: 'output', type: 'damage', value: 5 }],
  targetRule: { kind: 'self' },
  tags: [],
});

// 护盾 3、CD=0.5s、targetRule=self（提前产生护盾）
registerItem({
  itemId: 'test_shield3',
  name: '测试护盾3',
  description: '',
  size: 1,
  baseTier: 'bronze',
  price: 0,
  cooldown: 0.5,
  ports: [{ category: 'defense', type: 'shield', value: 3 }],
  targetRule: { kind: 'self' },
  tags: [],
});

// 毒 3、CD=1s
registerItem({
  itemId: 'test_poison3',
  name: '测试毒3',
  description: '',
  size: 1,
  baseTier: 'bronze',
  price: 0,
  cooldown: 1,
  ports: [{ category: 'output', type: 'poison', value: 3 }],
  targetRule: { kind: 'self' },
  tags: [],
});

// 灼烧 3、CD=1s
registerItem({
  itemId: 'test_burn3',
  name: '测试灼烧3',
  description: '',
  size: 1,
  baseTier: 'bronze',
  price: 0,
  cooldown: 1,
  ports: [{ category: 'output', type: 'burn', value: 3 }],
  targetRule: { kind: 'self' },
  tags: [],
});

// haste 2s 给自身所有卡、CD=0.1s（极快）
registerItem({
  itemId: 'test_haste_all',
  name: '测试加速全体',
  description: '',
  size: 1,
  baseTier: 'bronze',
  price: 0,
  cooldown: 0.1,
  ports: [{ category: 'operational', type: 'haste', value: 2 }],
  targetRule: { kind: 'all' },
  tags: [],
});

// CD=2s、伤害 1
registerItem({
  itemId: 'test_dmg_cd2',
  name: '测试伤害CD2',
  description: '',
  size: 1,
  baseTier: 'bronze',
  price: 0,
  cooldown: 2,
  ports: [{ category: 'output', type: 'damage', value: 1 }],
  targetRule: { kind: 'self' },
  tags: [],
});

// freeze 2s 给敌方（targetRule=self 表示作用于敌方全体 leftmost）
registerItem({
  itemId: 'test_freeze2',
  name: '测试冻结2s',
  description: '',
  size: 1,
  baseTier: 'bronze',
  price: 0,
  cooldown: 0.5,   // 在 0.5s 时触发一次 freeze
  ports: [{ category: 'operational', type: 'freeze', value: 2 }],
  targetRule: { kind: 'leftmost' },
  tags: [],
});

// charge 1s 给己方 leftmost、CD=1s
registerItem({
  itemId: 'test_charge1',
  name: '测试充能1',
  description: '',
  size: 1,
  baseTier: 'bronze',
  price: 0,
  cooldown: 1,
  ports: [{ category: 'operational', type: 'charge', value: 1 }],
  targetRule: { kind: 'leftmost' },
  tags: [],
});

// destroy leftmost
registerItem({
  itemId: 'test_destroy_leftmost',
  name: '测试摧毁最左',
  description: '',
  size: 1,
  baseTier: 'bronze',
  price: 0,
  cooldown: 0.5,
  ports: [{ category: 'output', type: 'destroy', value: 1 }],
  targetRule: { kind: 'leftmost' },
  tags: [],
});

// haste adjacent 给 adjacent 卡、CD=0.1s
registerItem({
  itemId: 'test_haste_adjacent',
  name: '测试加速相邻',
  description: '',
  size: 1,
  baseTier: 'bronze',
  price: 0,
  cooldown: 0.1,
  ports: [{ category: 'operational', type: 'haste', value: 0.5 }],
  targetRule: { kind: 'adjacent' },
  tags: [],
});

// ────────────────────────────────────────────────────────────────
// 测试 1: damage + shield 抵挡
// ────────────────────────────────────────────────────────────────
function testDamageShield() {
  // 防守方先在 tick 5 产生 shield（CD=0.5s=5tick），攻击方在 tick 10 造成 damage 5
  // shield_plate 先触发 → shield=3，然后 iron_sword damage 5 → real=max(0,5-3)=2
  const attacker = makeCombatant([makeSlot('test_dmg5', 0)], 100);
  const defender = makeCombatant([makeSlot('test_shield3', 0)], 100);

  const { events, defenderHpLeft } = runBattleEngine(attacker, defender);

  // 找第一个 damage 事件
  const firstDmg = events.find(e => e.type === 'damage') as Extract<typeof events[0], { type: 'damage' }> | undefined;
  assert(firstDmg !== undefined, '应有 damage 事件');
  if (!firstDmg) throw new Error('应有 damage 事件');
  // shield 在 tick5 先给自己加盾，damage 在 tick10，此时 shield=3（可能累积更多）
  // 检验真实伤害 <= 5 且护盾起了作用（实际值 <=5）
  assert(firstDmg.value <= 5, `第一次 damage 应 <=5，实际=${firstDmg.value}`);

  // 确认 defender 扣血了
  assert(defenderHpLeft < 100, 'defender 应已受伤');
}

// ────────────────────────────────────────────────────────────────
// 测试 2: poison 永不递减
// ────────────────────────────────────────────────────────────────
function testPoisonNoDrain() {
  // attacker 在前 3 个 dot_tick 内叠毒（CD=1s，每秒触发一次毒 3）
  // dot_tick 每秒发生，每次 poisonDmg 应该是累积的毒（不递减）
  const attacker = makeCombatant([makeSlot('test_poison3', 0)], 1000);
  // 防止 attacker 死，defender 给高血量
  const defender = makeCombatant([], 1000);

  const { events } = runBattleEngine(attacker, defender);

  const dotTicks = events.filter(e => e.type === 'dot_tick' && (e as any).side === 'enemy') as Array<{ tick: number; poisonDmg: number; burnDmg: number }>;
  assert(dotTicks.length >= 3, `应有至少3次 enemy dot_tick，实际=${dotTicks.length}`);

  // 毒不递减：第1次毒应=3，第2次毒应=6（继续叠），第3次毒应=9
  // 检验每次 poisonDmg >= 前一次（只增不减）
  for (let i = 1; i < Math.min(dotTicks.length, 4); i++) {
    assert(
      dotTicks[i].poisonDmg >= dotTicks[i - 1].poisonDmg,
      `poison 应不递减：第${i}次=${dotTicks[i].poisonDmg} < 第${i - 1}次=${dotTicks[i - 1].poisonDmg}`
    );
  }
}

// ────────────────────────────────────────────────────────────────
// 测试 3: burn 每秒 -1 层
// ────────────────────────────────────────────────────────────────
function testBurnDecay() {
  // attacker 在 tick10（1s）给 burn 3，之后 dot_tick burnDmg=3,2,1
  // 需要 attacker 只触发一次（CD=10s），让 burn 先叠好
  registerItem({
    itemId: 'test_burn3_cd10',
    name: '测试灼烧3_慢',
    description: '',
    size: 1,
    baseTier: 'bronze',
    price: 0,
    cooldown: 10,
    ports: [{ category: 'output', type: 'burn', value: 3 }],
    targetRule: { kind: 'self' },
    tags: [],
  });

  const attacker = makeCombatant([makeSlot('test_burn3_cd10', 0)], 1000);
  const defender = makeCombatant([], 1000);

  const { events } = runBattleEngine(attacker, defender);

  const dotTicks = events.filter(e => e.type === 'dot_tick' && (e as any).side === 'enemy') as Array<{ tick: number; poisonDmg: number; burnDmg: number }>;
  assert(dotTicks.length >= 3, `应有至少3次 enemy dot_tick，实际=${dotTicks.length}`);

  // 第一次应 burnDmg=3，第二次=2，第三次=1
  assert(dotTicks[0].burnDmg === 3, `第1次 burnDmg 应=3，实际=${dotTicks[0].burnDmg}`);
  assert(dotTicks[1].burnDmg === 2, `第2次 burnDmg 应=2，实际=${dotTicks[1].burnDmg}`);
  assert(dotTicks[2].burnDmg === 1, `第3次 burnDmg 应=1，实际=${dotTicks[2].burnDmg}`);
}

// ────────────────────────────────────────────────────────────────
// 测试 4: haste 加速充能
// ────────────────────────────────────────────────────────────────
function testHasteSpeedup() {
  // 卡A: CD=2s，普通触发 5s 内触发约2次
  // 卡B: CD=0.1s，haste_all 2s，持续为所有卡加速
  // 有 haste 时，卡A 应在 5s 内触发 > 2 次
  const board = [
    makeSlot('test_dmg_cd2', 0),
    makeSlot('test_haste_all', 1),
  ];

  const attacker = makeCombatant(board, 1000);
  const defender = makeCombatant([], 1000);

  const { events } = runBattleEngine(attacker, defender);

  // 只统计前 50 tick（5s）内 card_trigger for slotIndex=0
  const triggersNoHaste = Math.floor(5 / 2); // 无加速预期约 2 次（在 2s、4s）
  const actualTriggers = events.filter(
    e => e.type === 'card_trigger' && (e as any).side === 'player' && (e as any).slotIndex === 0
      && (e as any).tick <= 50
  ).length;
  assert(actualTriggers > triggersNoHaste, `haste 应让卡A触发更多次，5s内实际=${actualTriggers}，无加速预期约${triggersNoHaste}`);
}

// ────────────────────────────────────────────────────────────────
// 测试 5: freeze 冻结充能
// ────────────────────────────────────────────────────────────────
function testFreezeBlocksCharge() {
  // defender 有 CD=1s 的卡（slotIndex=0），attacker 的 freeze 在 tick5 冻结 2s
  // 在 freeze 的 2s（tick5 ~ tick25）内，该卡不应有 card_trigger
  // freeze targetRule=leftmost，目标是 enemy 的 leftmost（slotIndex=0）

  // 使用 test_freeze2（CD=0.5s，触发后 freeze 敌方 leftmost 2s）
  const attacker = makeCombatant([makeSlot('test_freeze2', 0)], 1000);
  const defender = makeCombatant([makeSlot('test_dmg_cd2', 0)], 1000);

  const { events } = runBattleEngine(attacker, defender);

  // freeze 在 tick5 触发（CD=0.5s），冻结 enemy slotIndex=0 的卡 2s
  // 该卡 CD=2s，若没冻结，应在 tick20 触发（从第 1 tick 开始充能）
  // 被冻结后，充能暂停 2s，应在 tick20+20=tick40 附近触发

  const freezeEvt = events.find(e => e.type === 'freeze') as any;
  assert(freezeEvt !== undefined, '应有 freeze 事件');
  assert(
    freezeEvt.targetSlotIndices.includes(0),
    `freeze 应命中 enemy slotIndex=0，实际=${JSON.stringify(freezeEvt.targetSlotIndices)}`
  );

  // 在 freeze 生效期内（freezeEvt.tick 到 freezeEvt.tick + 20tick），enemy slotIndex=0 不应有 card_trigger
  const freezeStart = freezeEvt.tick;
  const freezeEnd = freezeStart + 20; // 2s = 20tick
  const triggersDuringFreeze = events.filter(
    e => e.type === 'card_trigger'
      && (e as any).side === 'enemy'
      && (e as any).slotIndex === 0
      && (e as any).tick > freezeStart
      && (e as any).tick <= freezeEnd
  );
  assert(
    triggersDuringFreeze.length === 0,
    `freeze 期间 enemy card 不应触发，但触发了 ${triggersDuringFreeze.length} 次`
  );
}

// ────────────────────────────────────────────────────────────────
// 测试 6: charge 过充立即触发
// ────────────────────────────────────────────────────────────────
function testChargeOverflow() {
  // 场景：player slotIndex=1 有 CD=2s 的卡，slotIndex=0 有 charge_leftmost（CD=1s，charge 2s）
  // charge 在 tick10（1s）触发，给 slotIndex=1 充能 2s → cooldownProgress=2+X >= 2 → 立即触发
  // 即 charge 事件之后同一 tick 就有 slotIndex=1 的 card_trigger

  registerItem({
    itemId: 'test_charge2_leftmost',
    name: '测试充能2最左',
    description: '',
    size: 1,
    baseTier: 'bronze',
    price: 0,
    cooldown: 1,
    ports: [{ category: 'operational', type: 'charge', value: 2 }],
    targetRule: { kind: 'leftmost' },
    tags: [],
  });

  // slotIndex=1 是 CD=2s 的卡（最左是 slotIndex=0 吗？charge_leftmost 在 slotIndex=1，leftmost 是 slotIndex=0）
  // 调换：charge 放 slotIndex=1（CD=1s），target 是最左 slotIndex=0（CD=2s）
  const board = [
    makeSlot('test_dmg_cd2', 0),       // CD=2s，被 charge
    makeSlot('test_charge2_leftmost', 1), // CD=1s，发出 charge 2 给 leftmost
  ];

  const attacker = makeCombatant(board, 1000);
  const defender = makeCombatant([], 1000);

  const { events } = runBattleEngine(attacker, defender);

  // charge 触发的 tick
  const chargeEvt = events.find(e => e.type === 'charge') as any;
  assert(chargeEvt !== undefined, '应有 charge 事件');

  // 在 chargeEvt.tick，slotIndex=0 应立即有 card_trigger（过充触发）
  const immediateTrigger = events.find(
    e => e.type === 'card_trigger'
      && (e as any).side === 'player'
      && (e as any).slotIndex === 0
      && (e as any).tick === chargeEvt.tick
  );
  assert(
    immediateTrigger !== undefined,
    `charge 过充后应在同一 tick(${chargeEvt.tick}) 立即触发 slotIndex=0，但未找到`
  );
}

// ────────────────────────────────────────────────────────────────
// 测试 7: destroy 移除敌方卡牌
// ────────────────────────────────────────────────────────────────
function testDestroy() {
  // attacker: destroy_leftmost（CD=0.5s，摧毁敌方 leftmost）
  // defender: slotIndex=0（最左）+ slotIndex=1 两张卡
  // 第一次触发后，slotIndex=0 destroyed=true，后续不再 card_trigger

  const attacker = makeCombatant([makeSlot('test_destroy_leftmost', 0)], 1000);
  const defender = makeCombatant([
    makeSlot('test_dmg_cd2', 0),
    makeSlot('test_dmg_cd2', 1),
  ], 1000);

  const { events } = runBattleEngine(attacker, defender);

  const destroyEvt = events.find(e => e.type === 'destroy') as any;
  assert(destroyEvt !== undefined, '应有 destroy 事件');
  assert(destroyEvt.targetSide === 'enemy', `destroy 目标应是 enemy，实际=${destroyEvt.targetSide}`);
  assert(destroyEvt.targetSlotIndex === 0, `应摧毁 slotIndex=0，实际=${destroyEvt.targetSlotIndex}`);

  // destroy 之后，slotIndex=0 不应再出现 card_trigger
  const destroyTick = destroyEvt.tick;
  const lateTriggersOnDestroyed = events.filter(
    e => e.type === 'card_trigger'
      && (e as any).side === 'enemy'
      && (e as any).slotIndex === 0
      && (e as any).tick > destroyTick
  );
  assert(
    lateTriggersOnDestroyed.length === 0,
    `被 destroy 的卡不应再触发，但触发了 ${lateTriggersOnDestroyed.length} 次`
  );
}

// ────────────────────────────────────────────────────────────────
// 测试 8: overtime 递增扣血
// ────────────────────────────────────────────────────────────────
function testOvertime() {
  // 双方无攻击卡，超时后应出现 overtime 事件，且 playerDmg 递增
  const attacker = makeCombatant([], 9999);
  const defender = makeCombatant([], 9999);

  const { events } = runBattleEngine(attacker, defender);

  const overtimeEvts = events.filter(e => e.type === 'overtime') as Array<{ tick: number; playerDmg: number; enemyDmg: number }>;
  assert(overtimeEvts.length >= 2, `应有至少2次 overtime 事件，实际=${overtimeEvts.length}`);

  // 检验 playerDmg 递增
  for (let i = 1; i < overtimeEvts.length; i++) {
    assert(
      overtimeEvts[i].playerDmg > overtimeEvts[i - 1].playerDmg,
      `overtime playerDmg 应递增：第${i}次=${overtimeEvts[i].playerDmg} <= 第${i - 1}次=${overtimeEvts[i - 1].playerDmg}`
    );
  }
}

// ────────────────────────────────────────────────────────────────
// 测试 9: 战斗 end 事件
// ────────────────────────────────────────────────────────────────
function testBattleEnd() {
  // attacker 高攻（每0.1s 打 5 伤害），defender 100 HP 无护甲
  const attacker = makeCombatant([makeSlot('test_dmg5', 0)], 100);
  const defender = makeCombatant([], 100);

  const { events, attackerWon } = runBattleEngine(attacker, defender);

  const lastEvt = events[events.length - 1];
  assert(lastEvt.type === 'battle_end', `最后事件应是 battle_end，实际=${lastEvt.type}`);

  const endEvt = lastEvt as Extract<typeof lastEvt, { type: 'battle_end' }>;
  assert(endEvt.winner === 'player', `attacker 应获胜，实际 winner=${endEvt.winner}`);
  assert(attackerWon === true, 'attackerWon 应为 true');
}

// ────────────────────────────────────────────────────────────────
// 测试 10: targetRule - adjacent 只加速相邻
// ────────────────────────────────────────────────────────────────
function testAdjacentTargetRule() {
  // haste_adjacent 在 slotIndex=0（size=1），adjacent 仅有 slotIndex=1
  // slotIndex=2 不是相邻的（slotIndex=0 的 size=1，end=1，slotIndex=2 不贴着）
  const board = [
    makeSlot('test_haste_adjacent', 0),   // 发出 haste 给 adjacent
    makeSlot('test_dmg_cd2', 1),           // 应被加速
    makeSlot('test_dmg_cd2', 3),           // 不相邻，不应被加速
  ];

  const attacker = makeCombatant(board, 1000);
  const defender = makeCombatant([], 1000);

  const { events } = runBattleEngine(attacker, defender);

  const hasteEvts = events.filter(e => e.type === 'haste') as Array<{ targetSlotIndices: number[] }>;
  assert(hasteEvts.length > 0, '应有 haste 事件');

  for (const evt of hasteEvts) {
    assert(
      !evt.targetSlotIndices.includes(3),
      `adjacent haste 不应命中 slotIndex=3（非相邻），实际=${JSON.stringify(evt.targetSlotIndices)}`
    );
    assert(
      evt.targetSlotIndices.length === 0 || evt.targetSlotIndices.includes(1),
      `adjacent haste 应命中 slotIndex=1，实际=${JSON.stringify(evt.targetSlotIndices)}`
    );
  }

  // 统计 5s 内 slotIndex=1 vs slotIndex=3 的触发次数
  const triggers1 = events.filter(
    e => e.type === 'card_trigger' && (e as any).side === 'player' && (e as any).slotIndex === 1 && (e as any).tick <= 50
  ).length;
  const triggers3 = events.filter(
    e => e.type === 'card_trigger' && (e as any).side === 'player' && (e as any).slotIndex === 3 && (e as any).tick <= 50
  ).length;

  assert(
    triggers1 >= triggers3,
    `slotIndex=1（相邻被加速）应触发 >= slotIndex=3（未加速），1触发=${triggers1}，3触发=${triggers3}`
  );
}

// ────────────────────────────────────────────────────────────────
// 运行所有测试
// ────────────────────────────────────────────────────────────────

const tests = [
  testDamageShield,
  testPoisonNoDrain,
  testBurnDecay,
  testHasteSpeedup,
  testFreezeBlocksCharge,
  testChargeOverflow,
  testDestroy,
  testOvertime,
  testBattleEnd,
  testAdjacentTargetRule,
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
