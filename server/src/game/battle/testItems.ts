/**
 * 战斗引擎单元测试 - 测试物品夹具
 *
 * 必须在导入 engine.js 之前导入本模块。engine.ts 在模块初始化时会构建
 * ALL_ITEMS_MAP = new Map([...ITEMS_MAP, ...BAZAAR_ITEMS_MAP])，该快照只捕获
 * 导入那一刻的 ITEMS_MAP 内容。因此测试专用物品需在本模块（先于 engine）注册，
 * 才能进入引擎的查找表。
 *
 * 本模块仅产生副作用（向 ITEMS_MAP 注册物品），不导出任何符号。
 */

import { ITEMS_MAP } from '../config/index.js';
import type { ItemConfig } from '@autocard/shared';

function registerItem(cfg: ItemConfig): void {
  ITEMS_MAP.set(cfg.itemId, cfg);
}

// 伤害 5、CD=1s
registerItem({
  itemId: 'ut_dmg5', name: 'UT伤害5', description: '', size: 1, baseTier: 'bronze', price: 0,
  cooldown: 1, critRate: 0,
  ports: [{ category: 'output', type: 'damage', value: 5 }],
  targetRule: { kind: 'self' }, tags: [],
});
// 护盾 3、CD=0.5s
registerItem({
  itemId: 'ut_shield3', name: 'UT护盾3', description: '', size: 1, baseTier: 'bronze', price: 0,
  cooldown: 0.5, critRate: 0,
  ports: [{ category: 'defense', type: 'shield', value: 3 }],
  targetRule: { kind: 'self' }, tags: [],
});
// 毒 3、CD=1s
registerItem({
  itemId: 'ut_poison3', name: 'UT毒3', description: '', size: 1, baseTier: 'bronze', price: 0,
  cooldown: 1, critRate: 0,
  ports: [{ category: 'output', type: 'poison', value: 3 }],
  targetRule: { kind: 'self' }, tags: [],
});
// 灼烧 3、CD=10s（只触发一次，便于观察衰减）
registerItem({
  itemId: 'ut_burn3_cd10', name: 'UT灼烧3慢', description: '', size: 1, baseTier: 'bronze', price: 0,
  cooldown: 10, critRate: 0,
  ports: [{ category: 'output', type: 'burn', value: 3 }],
  targetRule: { kind: 'self' }, tags: [],
});
// haste 2s 给自身全体、CD=0.1s（极快）
registerItem({
  itemId: 'ut_haste_all', name: 'UT加速全体', description: '', size: 1, baseTier: 'bronze', price: 0,
  cooldown: 0.1, critRate: 0,
  ports: [{ category: 'operational', type: 'haste', value: 2 }],
  targetRule: { kind: 'all' }, tags: [],
});
// CD=2s、伤害 1
registerItem({
  itemId: 'ut_dmg_cd2', name: 'UT伤害CD2', description: '', size: 1, baseTier: 'bronze', price: 0,
  cooldown: 2, critRate: 0,
  ports: [{ category: 'output', type: 'damage', value: 1 }],
  targetRule: { kind: 'self' }, tags: [],
});
// freeze 2s 给敌方 leftmost、CD=0.5s
registerItem({
  itemId: 'ut_freeze2', name: 'UT冻结2s', description: '', size: 1, baseTier: 'bronze', price: 0,
  cooldown: 0.5, critRate: 0,
  ports: [{ category: 'operational', type: 'freeze', value: 2 }],
  targetRule: { kind: 'leftmost' }, tags: [],
});
// charge 2s 给己方 leftmost、CD=1s
registerItem({
  itemId: 'ut_charge2_leftmost', name: 'UT充能2最左', description: '', size: 1, baseTier: 'bronze', price: 0,
  cooldown: 1, critRate: 0,
  ports: [{ category: 'operational', type: 'charge', value: 2 }],
  targetRule: { kind: 'leftmost' }, tags: [],
});
// destroy 敌方 leftmost、CD=0.5s
registerItem({
  itemId: 'ut_destroy_leftmost', name: 'UT摧毁最左', description: '', size: 1, baseTier: 'bronze', price: 0,
  cooldown: 0.5, critRate: 0,
  ports: [{ category: 'output', type: 'destroy', value: 1 }],
  targetRule: { kind: 'leftmost' }, tags: [],
});
// haste 0.5s 给 adjacent、CD=0.1s
registerItem({
  itemId: 'ut_haste_adjacent', name: 'UT加速相邻', description: '', size: 1, baseTier: 'bronze', price: 0,
  cooldown: 0.1, critRate: 0,
  ports: [{ category: 'operational', type: 'haste', value: 0.5 }],
  targetRule: { kind: 'adjacent' }, tags: [],
});
// 品阶倍率测试：gold 伤害 10、CD=1s
registerItem({
  itemId: 'ut_dmg10_gold', name: 'UT伤害10金', description: '', size: 1, baseTier: 'gold', price: 0,
  cooldown: 1, critRate: 0,
  ports: [{ category: 'output', type: 'damage', value: 10 }],
  targetRule: { kind: 'self' }, tags: [],
});
// Kind 被动测试：dragon 卡，burn 端口，CD=1s
registerItem({
  itemId: 'ut_dragon_burn', name: 'UT龙灼烧', description: '', size: 1, baseTier: 'bronze', price: 0,
  cooldown: 1, critRate: 0, kinds: ['dragon'],
  ports: [{ category: 'output', type: 'burn', value: 3 }],
  targetRule: { kind: 'self' }, tags: [],
});
// Kind 被动测试：另一只 dragon 卡（用于叠加 dragon 数量）
registerItem({
  itemId: 'ut_dragon_other', name: 'UT龙其他', description: '', size: 1, baseTier: 'bronze', price: 0,
  cooldown: 999, critRate: 0, kinds: ['dragon'],
  ports: [{ category: 'output', type: 'damage', value: 1 }],
  targetRule: { kind: 'self' }, tags: [],
});
// heal 5、CD=1s（heal 测试用，动态注册亦可，这里统一预注册）
registerItem({
  itemId: 'ut_heal5', name: 'UT治疗5', description: '', size: 1, baseTier: 'bronze', price: 0,
  cooldown: 1, critRate: 0,
  ports: [{ category: 'defense', type: 'heal', value: 5 }],
  targetRule: { kind: 'self' }, tags: [],
});
