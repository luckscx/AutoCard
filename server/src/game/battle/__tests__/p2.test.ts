/**
 * P2 测试：KindPassiveRegistry 单元测试 + 引擎集成测试
 * npx tsx server/src/game/battle/__tests__/p2.test.ts
 */

import { runBattleEngine } from '../engine.js';
import { ITEMS_MAP } from '../../config/index.js';
import { applyKindPassives } from '../kindPassives.js';
import type { SlotItem, Tier, ItemSize, ItemConfig } from '@autocard/shared';

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

function makeSlot(itemId: string, slotIndex: number, tier: Tier = 'bronze', size: ItemSize = 1): SlotItem {
  return { itemId, slotIndex, tier, size };
}

function makeCombatant(board: SlotItem[], hp = 100) {
  return { hp, maxHp: hp, level: 1, board };
}

/** 向 ITEMS_MAP 注册测试专用物品（进程退出前无需清理） */
function registerItem(cfg: ItemConfig) {
  ITEMS_MAP.set(cfg.itemId, cfg);
}

// ────────────────────────────────────────────────────────────────
// 测试 1：applyKindPassives 单元 — dragon burn+2
// ────────────────────────────────────────────────────────────────
console.log('\n── P2 测试套件：KindPassiveRegistry ──\n');

test('测试 1：dragon burn+2 — 2 张 dragon 卡，burn value +4', () => {
  const cfg: ItemConfig = {
    itemId: 'test_dragon_burn',
    name: '测试龙焰',
    description: '',
    size: 1,
    baseTier: 'bronze',
    price: 0,
    cooldown: 2,
    ports: [{ category: 'output', type: 'burn', value: 10 }],
    targetRule: { kind: 'self' },
    kinds: ['dragon'],
    tags: [],
  };

  const dragon2: ItemConfig = { ...cfg, itemId: 'test_dragon_2' };

  // boardConfigs 含 2 张 dragon 卡（含自身）
  const boardConfigs: ItemConfig[] = [cfg, dragon2];

  // dragon 规则：when 满足（有 burn 端口），modify = 2 * 2 = 4
  const result = applyKindPassives('burn', 10, cfg, boardConfigs);
  assert(result === 14, `期望 14，实际 ${result}`);
});

// ────────────────────────────────────────────────────────────────
// 测试 2：applyKindPassives 单元 — weapon damage+3
// ────────────────────────────────────────────────────────────────

test('测试 2：weapon damage+3 — 另有 1 张 weapon，damage +3', () => {
  const cfg: ItemConfig = {
    itemId: 'test_weapon_a',
    name: '测试武器A',
    description: '',
    size: 1,
    baseTier: 'bronze',
    price: 0,
    cooldown: 2,
    ports: [{ category: 'output', type: 'damage', value: 8 }],
    targetRule: { kind: 'self' },
    kinds: ['weapon'],
    tags: [],
  };

  const otherWeapon: ItemConfig = {
    ...cfg,
    itemId: 'test_weapon_b',
    name: '测试武器B',
  };

  const boardConfigs: ItemConfig[] = [cfg, otherWeapon];

  // weapon 规则：当前有 damage 端口，且 board 中有其他 weapon → +3
  const result = applyKindPassives('damage', 8, cfg, boardConfigs);
  assert(result === 11, `期望 11，实际 ${result}`);
});

// ────────────────────────────────────────────────────────────────
// 测试 3：applyKindPassives 单元 — poison 叠毒+N
// ────────────────────────────────────────────────────────────────

test('测试 3：poison 叠毒+N — 3 张 poison 卡，poison +3', () => {
  const cfg: ItemConfig = {
    itemId: 'test_poison_a',
    name: '测试毒刃A',
    description: '',
    size: 1,
    baseTier: 'bronze',
    price: 0,
    cooldown: 2,
    ports: [{ category: 'output', type: 'poison', value: 5 }],
    targetRule: { kind: 'self' },
    kinds: ['poison'],
    tags: [],
  };

  const poison2: ItemConfig = { ...cfg, itemId: 'test_poison_b', name: '测试毒刃B' };
  const poison3: ItemConfig = { ...cfg, itemId: 'test_poison_c', name: '测试毒刃C' };

  const boardConfigs: ItemConfig[] = [cfg, poison2, poison3];

  // poison 规则：有 poison 端口，modify = 3（每张 +1）
  const result = applyKindPassives('poison', 5, cfg, boardConfigs);
  assert(result === 8, `期望 8，实际 ${result}`);
});

// ────────────────────────────────────────────────────────────────
// 测试 4：no-kinds 卡牌不受任何 Kind 被动影响
// ────────────────────────────────────────────────────────────────

test('测试 4：no-kinds — kinds=[] 时 value 原样返回', () => {
  const cfg: ItemConfig = {
    itemId: 'test_no_kinds',
    name: '无 kind 卡牌',
    description: '',
    size: 1,
    baseTier: 'bronze',
    price: 0,
    cooldown: 2,
    ports: [{ category: 'output', type: 'damage', value: 10 }],
    targetRule: { kind: 'self' },
    kinds: [],
    tags: [],
  };

  const result = applyKindPassives('damage', 10, cfg, [cfg]);
  assert(result === 10, `期望 10，实际 ${result}`);

  // 同样适用于 kinds 字段缺失（undefined）
  const cfgNoKinds: ItemConfig = { ...cfg, itemId: 'test_no_kinds_2', kinds: undefined };
  const result2 = applyKindPassives('poison', 7, cfgNoKinds, [cfgNoKinds]);
  assert(result2 === 7, `期望 7，实际 ${result2}`);
});

// ────────────────────────────────────────────────────────────────
// 测试 5：引擎集成 — poison_dagger + venom_vial 联动
// poison_dagger：kinds: ['weapon','poison']，poison port value=4，cooldown=1
// venom_vial：  kinds: ['potion','poison']，poison port value=6，cooldown=2
// 两张 poison 卡在场 → poison 被动 +2（每张 +1），dagger 实际 poison = 4+2 = 6 > 4
// ────────────────────────────────────────────────────────────────

test('测试 5：引擎集成 — poison_dagger + venom_vial，poison 事件 value > 4', () => {
  // 确认实际物品配置已加载
  const daggerCfg = ITEMS_MAP.get('poison_dagger');
  const vialCfg = ITEMS_MAP.get('venom_vial');
  assert(daggerCfg != null, 'poison_dagger 未在 ITEMS_MAP 中找到');
  assert(vialCfg != null, 'venom_vial 未在 ITEMS_MAP 中找到');

  // 攻击方：poison_dagger（slot 0）+ venom_vial（slot 1）
  const attackerBoard: SlotItem[] = [
    makeSlot('poison_dagger', 0, 'bronze', 1),
    makeSlot('venom_vial', 1, 'bronze', 1),
  ];
  // 防御方：一张普通木剑（无 kinds 影响）
  registerItem({
    itemId: 'dummy_sword',
    name: '测试木剑',
    description: '',
    size: 1,
    baseTier: 'bronze',
    price: 0,
    cooldown: 99999, // 不会触发
    ports: [{ category: 'output', type: 'damage', value: 0 }],
    targetRule: { kind: 'self' },
    kinds: [],
    tags: [],
  });
  const defenderBoard: SlotItem[] = [makeSlot('dummy_sword', 0, 'bronze', 1)];

  const result = runBattleEngine(
    makeCombatant(attackerBoard, 200),
    makeCombatant(defenderBoard, 200),
  );

  // 找所有来自攻击方（player）触发 poison 的事件
  const poisonEvents = result.events.filter(e => e.type === 'poison' && e.targetSide === 'enemy');
  assert(poisonEvents.length > 0, '应当有至少一个 poison 事件');

  // poison_dagger 基础值：4 * bronze(1.0) = 4
  // 被动：2 张 poison 卡在场 → +2，最终 value = 6
  // venom_vial 触发目标是 adjacent（指向对方），value=6+2=8，但这里只关心 dagger
  // 取第一个 poison 事件 value（dagger 最先触发），应 > 4
  const firstPoison = poisonEvents[0] as { type: string; value: number; targetSide: string };
  assert(
    firstPoison.value > 4,
    `poison 事件 value 应 > 4（基础值），实际为 ${firstPoison.value}`,
  );

  console.log(`     (首条 poison 事件 value = ${firstPoison.value}，基础值 = 4，Kind 被动生效 ✓)`);
});

// ────────────────────────────────────────────────────────────────
// 汇总
// ────────────────────────────────────────────────────────────────

console.log(`\n── 结果：${passed} 通过 / ${failed} 失败 ──\n`);
if (failed > 0) process.exit(1);
