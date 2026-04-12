/**
 * Kind 被动注册表
 *
 * 每条规则由「条件函数」+「数值修正函数」组成。
 * - when：当前卡牌触发某 portType 时，判断己方棋盘是否满足条件
 * - modify：在基础 value 上叠加额外值（可为 0）
 */

import type { ItemConfig } from '@autocard/shared';

export interface KindPassiveRule {
  /** 触发条件：当前卡牌配置 + 己方完整棋盘物品配置列表 */
  when: (cfg: ItemConfig, boardConfigs: ItemConfig[]) => boolean;
  /** 数值修正：返回额外叠加值（可为 0）*/
  modify: (value: number, cfg: ItemConfig, boardConfigs: ItemConfig[]) => number;
}

// 规则注册表：kindId → 规则列表
const registry = new Map<string, KindPassiveRule[]>();

export function registerKindPassive(kindId: string, rule: KindPassiveRule): void {
  const existing = registry.get(kindId) ?? [];
  existing.push(rule);
  registry.set(kindId, existing);
}

/**
 * 对某次 port 触发应用所有 Kind 被动修正
 * @param portType 当前触发的端口类型
 * @param baseValue 品阶倍率后的基础值
 * @param cfg 当前触发卡牌的配置
 * @param boardConfigs 己方棋盘上所有卡牌的配置（含当前卡牌）
 * @returns 修正后的最终值
 */
export function applyKindPassives(
  portType: string,
  baseValue: number,
  cfg: ItemConfig,
  boardConfigs: ItemConfig[],
): number {
  let value = baseValue;
  const kinds = cfg.kinds ?? [];
  for (const kindId of kinds) {
    const rules = registry.get(kindId) ?? [];
    for (const rule of rules) {
      if (rule.when(cfg, boardConfigs)) {
        value += rule.modify(value, cfg, boardConfigs);
      }
    }
  }
  return Math.max(0, Math.round(value));
}

// ────────────────────────────────────────────────────────────────
// 示例规则注册
// ────────────────────────────────────────────────────────────────

/**
 * 规则 1：dragon + burn 联动
 * 每有一张拥有 dragon kind 的卡牌在场，burn 类端口 value +2
 */
registerKindPassive('dragon', {
  when: (cfg) => cfg.ports.some(p => p.type === 'burn'),
  modify: (_value, _cfg, boardConfigs) =>
    2 * boardConfigs.filter(c => (c.kinds ?? []).includes('dragon')).length,
});

/**
 * 规则 2：weapon + damage 相邻联动
 * 当前是 weapon 类卡牌的 damage 端口，若己方棋盘有其他 weapon，damage +3
 */
registerKindPassive('weapon', {
  when: (cfg, boardConfigs) =>
    cfg.ports.some(p => p.type === 'damage') &&
    boardConfigs.filter(c => c.itemId !== cfg.itemId && (c.kinds ?? []).includes('weapon')).length > 0,
  modify: () => 3,
});

/**
 * 规则 3：poison 类卡牌叠毒强化
 * 每有一张拥有 poison kind 的卡牌在场（含自身），poison 端口 +1
 */
registerKindPassive('poison', {
  when: (cfg) => cfg.ports.some(p => p.type === 'poison'),
  modify: (_value, _cfg, boardConfigs) =>
    boardConfigs.filter(c => (c.kinds ?? []).includes('poison')).length,
});
