import type { ItemConfig } from '@autocard/shared';

/**
 * AutoCard 物品设计清单 v1 — 65 张精选卡牌
 * 基于 docs/game-design/物品设计清单v1.md
 * 英雄映射：战士→stelle, 法师→dooley, 盗贼→vanessa, 牧师→pygmalien
 */

export const ITEMS: ItemConfig[] = [
  // ========================================
  // 一、通用物品（20个）
  // ========================================

  // --- 经济/工具类（6个）---

  // U01 锈蚀匕首
  {
    itemId: 'u01_rusty_dagger',
    name: '锈蚀匕首',
    nameEn: 'Rusty Dagger',
    description: '普通攻击，无特效。作为新手第一张牌',
    size: 1,
    baseTier: 'bronze',
    price: 2,
    cooldown: 4,
    ports: [
      { category: 'output', type: 'damage', value: 8 },
    ],
    targetRule: { kind: 'self' },
    tags: ['通用', '经济'],
  },

  // U02 口香糖球
  {
    itemId: 'u02_gumball',
    name: '口香糖球',
    nameEn: 'Gumball',
    description: '出售时，强化最左侧同类端口物品 +1 tier效果值',
    size: 1,
    baseTier: 'bronze',
    price: 2,
    cooldown: 3,
    ports: [
      { category: 'output', type: 'damage', value: 5 },
    ],
    targetRule: { kind: 'self' },
    tags: ['通用', '经济'],
  },

  // U03 金块
  {
    itemId: 'u03_gold_nugget',
    name: '金块',
    nameEn: 'Gold Nugget',
    description: '无战斗效果。出售价值 +3 金币',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    tags: ['通用', '经济'],
  },

  // U04 赏金令牌
  {
    itemId: 'u04_bounty_token',
    name: '赏金令牌',
    nameEn: 'Bounty Token',
    description: '每场胜利获得 +1 金币（经济向，上限5）',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    tags: ['通用', '经济'],
  },

  // U05 旧皮带
  {
    itemId: 'u05_old_belt',
    name: '旧皮带',
    nameEn: 'Old Belt',
    description: '为相邻两个物品各 +1 CD减少（加速触发）',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'adjacent' },
    tags: ['通用', '加速'],
  },

  // U06 行商手册
  {
    itemId: 'u06_merchant_manual',
    name: '行商手册',
    nameEn: "Merchant's Manual",
    description: '商店每轮多刷新1次。出售价值 +2',
    size: 1,
    baseTier: 'silver',
    price: 5,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    tags: ['通用', '经济'],
  },

  // --- 加速/辅助类（7个）---

  // U07 沙漏
  {
    itemId: 'u07_hourglass',
    name: '沙漏',
    nameEn: 'Hourglass',
    description: '加速相邻左侧物品 2s',
    size: 1,
    baseTier: 'bronze',
    price: 2,
    cooldown: 8,
    ports: [
      { category: 'operational', type: 'haste', value: 2 },
    ],
    targetRule: { kind: 'adjacent' },
    tags: ['通用', '加速'],
  },

  // U08 双头沙漏
  {
    itemId: 'u08_dual_hourglass',
    name: '双头沙漏',
    nameEn: 'Dual Hourglass',
    description: '加速左右各一物品 3s，升级后变4s',
    size: 2,
    baseTier: 'silver',
    price: 5,
    cooldown: 10,
    ports: [
      { category: 'operational', type: 'haste', value: 3 },
    ],
    targetRule: { kind: 'adjacent' },
    tags: ['通用', '加速'],
  },

  // U09 齿轮发条
  {
    itemId: 'u09_gear_clockwork',
    name: '齿轮发条',
    nameEn: 'Gear Clockwork',
    description: '为最右侧物品充能1层',
    size: 1,
    baseTier: 'bronze',
    price: 2,
    cooldown: 6,
    ports: [
      { category: 'operational', type: 'charge', value: 1 },
    ],
    targetRule: { kind: 'rightmost' },
    tags: ['通用', '充能'],
  },

  // U10 精密发条
  {
    itemId: 'u10_precision_clockwork',
    name: '精密发条',
    nameEn: 'Precision Clockwork',
    description: '为右侧2个物品各充能1层，满3层触发爆发',
    size: 2,
    baseTier: 'silver',
    price: 5,
    cooldown: 8,
    ports: [
      { category: 'operational', type: 'charge', value: 2 },
    ],
    targetRule: { kind: 'rightmost' },
    tags: ['通用', '充能'],
  },

  // U11 减速陷阱
  {
    itemId: 'u11_slow_trap',
    name: '减速陷阱',
    nameEn: 'Slow Trap',
    description: '减速敌方最快物品 3s',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 12,
    ports: [
      { category: 'operational', type: 'slow', value: 3 },
    ],
    targetRule: { kind: 'self' },
    tags: ['通用', '减速'],
  },

  // U12 冰封地雷
  {
    itemId: 'u12_freeze_mine',
    name: '冰封地雷',
    nameEn: 'Freeze Mine',
    description: '冻结敌方最快物品 2s，触发时己方+10%暴击率',
    size: 2,
    baseTier: 'silver',
    price: 5,
    cooldown: 15,
    ports: [
      { category: 'operational', type: 'freeze', value: 2 },
    ],
    targetRule: { kind: 'self' },
    critRate: 0.1,
    tags: ['通用', '冻结'],
  },

  // U13 破甲箭
  {
    itemId: 'u13_armor_pierce_arrow',
    name: '破甲箭',
    nameEn: 'Armor Pierce Arrow',
    description: '穿透：无视敌方护盾直接造成伤害',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 10,
    ports: [
      { category: 'output', type: 'damage', value: 15 },
    ],
    targetRule: { kind: 'self' },
    tags: ['通用', '伤害'],
  },

  // --- 防御/生存类（7个）---

  // U14 木盾
  {
    itemId: 'u14_wooden_shield',
    name: '木盾',
    nameEn: 'Wooden Shield',
    description: '基础护盾',
    size: 1,
    baseTier: 'bronze',
    price: 2,
    cooldown: 8,
    ports: [
      { category: 'defense', type: 'shield', value: 20 },
    ],
    targetRule: { kind: 'self' },
    tags: ['通用', '护盾'],
  },

  // U15 荆棘护符
  {
    itemId: 'u15_thorn_amulet',
    name: '荆棘护符',
    nameEn: 'Thorn Amulet',
    description: '护盾破碎时，对敌方造成等量伤害的50%',
    size: 2,
    baseTier: 'silver',
    price: 5,
    cooldown: 10,
    ports: [
      { category: 'defense', type: 'shield', value: 30 },
    ],
    targetRule: { kind: 'self' },
    tags: ['通用', '护盾'],
  },

  // U16 急救包
  {
    itemId: 'u16_first_aid_kit',
    name: '急救包',
    nameEn: 'First Aid Kit',
    description: '基础治疗',
    size: 1,
    baseTier: 'bronze',
    price: 2,
    cooldown: 12,
    ports: [
      { category: 'defense', type: 'heal', value: 15 },
    ],
    targetRule: { kind: 'self' },
    tags: ['通用', '治疗'],
  },

  // U17 草药袋
  {
    itemId: 'u17_herb_bag',
    name: '草药袋',
    nameEn: 'Herb Bag',
    description: '每次触发相邻物品时，附带治疗 5',
    size: 2,
    baseTier: 'silver',
    price: 5,
    cooldown: 10,
    ports: [
      { category: 'defense', type: 'heal', value: 10 },
    ],
    targetRule: { kind: 'adjacent' },
    tags: ['通用', '治疗'],
  },

  // U18 生命护符
  {
    itemId: 'u18_life_amulet',
    name: '生命护符',
    nameEn: 'Life Amulet',
    description: '被动：HP上限 +20',
    size: 1,
    baseTier: 'bronze',
    price: 4,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    tags: ['通用', '生存'],
  },

  // U19 战场急救箱
  {
    itemId: 'u19_battle_medkit',
    name: '战场急救箱',
    nameEn: 'Battle Medkit',
    description: '治疗+护盾双端口，适合纯防御型',
    size: 2,
    baseTier: 'gold',
    price: 8,
    cooldown: 20,
    ports: [
      { category: 'defense', type: 'heal', value: 40 },
      { category: 'defense', type: 'shield', value: 20 },
    ],
    targetRule: { kind: 'self' },
    tags: ['通用', '治疗', '护盾'],
  },

  // U20 不死图腾
  {
    itemId: 'u20_undying_totem',
    name: '不死图腾',
    nameEn: 'Undying Totem',
    description: '被动：首次HP归零时以20%HP复活（一局一次）',
    size: 3,
    baseTier: 'diamond',
    price: 12,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    tags: ['通用', '生存'],
  },

  // ========================================
  // 二、战士专属物品（15个）→ stelle
  // Build A: 冻结爆发, Build B: 叠层强化, Build C: 重击暴击
  // ========================================

  // --- Build A - 冻结爆发（5个）---

  // W01 冰爪
  {
    itemId: 'w01_ice_claw',
    name: '冰爪',
    nameEn: 'Ice Claw',
    description: '造成伤害同时附带冻结 1s；冻结状态下伤害 ×1.5',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 7,
    ports: [
      { category: 'output', type: 'damage', value: 30 },
      { category: 'operational', type: 'freeze', value: 1 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'stelle',
    tags: ['战士', '冻结爆发'],
  },

  // W02 霜刃巨斧
  {
    itemId: 'w02_frost_giant_axe',
    name: '霜刃巨斧',
    nameEn: 'Frost Giant Axe',
    description: '冻结后下一击伤害翻倍',
    size: 3,
    baseTier: 'silver',
    price: 6,
    cooldown: 10,
    ports: [
      { category: 'output', type: 'damage', value: 80 },
      { category: 'operational', type: 'freeze', value: 2 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'stelle',
    tags: ['战士', '冻结爆发'],
  },

  // W03 冰封战锤
  {
    itemId: 'w03_frozen_warhammer',
    name: '冰封战锤',
    nameEn: 'Frozen Warhammer',
    description: '敌方处于冻结时，此物品CD缩短50%',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 12,
    ports: [
      { category: 'output', type: 'damage', value: 50 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'stelle',
    tags: ['战士', '冻结爆发'],
  },

  // W04 永冻护腕
  {
    itemId: 'w04_permafrost_bracer',
    name: '永冻护腕',
    nameEn: 'Permafrost Bracer',
    description: '被动：冻结持续时间 +1s（叠加）',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'stelle',
    tags: ['战士', '冻结爆发'],
  },

  // W05 极寒圣物
  {
    itemId: 'w05_extreme_cold_relic',
    name: '极寒圣物',
    nameEn: 'Extreme Cold Relic',
    description: '被动：每次冻结敌方，自身下一次攻击 +40 伤害',
    size: 1,
    baseTier: 'silver',
    price: 5,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'stelle',
    tags: ['战士', '冻结爆发'],
  },

  // --- Build B - 叠层强化（5个）---

  // W06 血战长剑
  {
    itemId: 'w06_blood_war_sword',
    name: '血战长剑',
    nameEn: 'Blood War Sword',
    description: '每次击杀单位（含怪物），永久 +5 伤害（上限+50）',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 6,
    ports: [
      { category: 'output', type: 'damage', value: 25 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'stelle',
    tags: ['战士', '叠层强化'],
  },

  // W07 战场纪念章
  {
    itemId: 'w07_battlefield_medal',
    name: '战场纪念章',
    nameEn: 'Battlefield Medal',
    description: '被动：每赢得一场战斗，战士所有武器 +3 伤害',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'stelle',
    tags: ['战士', '叠层强化'],
  },

  // W08 符文双刃
  {
    itemId: 'w08_rune_dual_blade',
    name: '符文双刃',
    nameEn: 'Rune Dual Blade',
    description: '暴击时，暴击伤害永久提升 +10（上限+100）',
    size: 2,
    baseTier: 'silver',
    price: 6,
    cooldown: 6,
    ports: [
      { category: 'output', type: 'damage', value: 40 },
    ],
    targetRule: { kind: 'self' },
    critRate: 0.15,
    sourceHero: 'stelle',
    tags: ['战士', '叠层强化'],
  },

  // W09 成长护甲
  {
    itemId: 'w09_growth_armor',
    name: '成长护甲',
    nameEn: 'Growth Armor',
    description: '被动：每场战斗开始时 +10 护盾，护盾叠加不清零',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'stelle',
    tags: ['战士', '叠层强化'],
  },

  // W10 拓荒者之心
  {
    itemId: 'w10_pioneer_heart',
    name: '拓荒者之心',
    nameEn: "Pioneer's Heart",
    description: '被动：叠层类 buff 上限翻倍',
    size: 1,
    baseTier: 'gold',
    price: 8,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'stelle',
    tags: ['战士', '叠层强化'],
  },

  // --- Build C - 重击暴击（5个）---

  // W11 破天巨锤
  {
    itemId: 'w11_skybreak_hammer',
    name: '破天巨锤',
    nameEn: 'Skybreak Hammer',
    description: '慢速重击，自带 25% 暴击率',
    size: 3,
    baseTier: 'bronze',
    price: 4,
    cooldown: 14,
    ports: [
      { category: 'output', type: 'damage', value: 120 },
    ],
    targetRule: { kind: 'self' },
    critRate: 0.25,
    sourceHero: 'stelle',
    tags: ['战士', '重击暴击'],
  },

  // W12 战神铠甲
  {
    itemId: 'w12_war_god_armor',
    name: '战神铠甲',
    nameEn: 'War God Armor',
    description: '被动：每拥有1个size 3的物品，暴击率 +10%',
    size: 3,
    baseTier: 'silver',
    price: 6,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'stelle',
    tags: ['战士', '重击暴击'],
  },

  // W13 暴怒护符
  {
    itemId: 'w13_fury_amulet',
    name: '暴怒护符',
    nameEn: 'Fury Amulet',
    description: '被动：HP低于50%时，所有武器 +30% 暴击率',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'stelle',
    tags: ['战士', '重击暴击'],
  },

  // W14 鲜血宝石
  {
    itemId: 'w14_blood_gem',
    name: '鲜血宝石',
    nameEn: 'Blood Gem',
    description: '被动：暴击时回复 10 HP',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'stelle',
    tags: ['战士', '重击暴击'],
  },

  // W15 屠龙之刃
  {
    itemId: 'w15_dragon_slayer_blade',
    name: '屠龙之刃',
    nameEn: 'Dragon Slayer Blade',
    description: '对HP>自身的目标造成额外 30% 伤害',
    size: 2,
    baseTier: 'gold',
    price: 8,
    cooldown: 8,
    ports: [
      { category: 'output', type: 'damage', value: 100 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'stelle',
    tags: ['战士', '重击暴击'],
  },

  // ========================================
  // 三、法师专属物品（15个）→ dooley
  // Build A: 灼烧叠层, Build B: 充能爆发, Build C: 连锁反应
  // ========================================

  // --- Build A - 灼烧叠层（5个）---

  // M01 火焰法杖
  {
    itemId: 'm01_fire_staff',
    name: '火焰法杖',
    nameEn: 'Fire Staff',
    description: '基础灼烧，每秒造成burn值伤害',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 5,
    ports: [
      { category: 'output', type: 'burn', value: 8 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'dooley',
    tags: ['法师', '灼烧叠层'],
  },

  // M02 灼烧魔典
  {
    itemId: 'm02_burn_grimoire',
    name: '灼烧魔典',
    nameEn: 'Burn Grimoire',
    description: '施放灼烧同时加速自身',
    size: 2,
    baseTier: 'silver',
    price: 6,
    cooldown: 8,
    ports: [
      { category: 'output', type: 'burn', value: 15 },
      { category: 'operational', type: 'haste', value: 1 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'dooley',
    tags: ['法师', '灼烧叠层'],
  },

  // M03 烈焰宝珠
  {
    itemId: 'm03_flame_orb',
    name: '烈焰宝珠',
    nameEn: 'Flame Orb',
    description: '灼烧层数≥3时，爆炸造成额外 60 伤害',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 10,
    ports: [
      { category: 'output', type: 'burn', value: 20 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'dooley',
    tags: ['法师', '灼烧叠层'],
  },

  // M04 炎魔之戒
  {
    itemId: 'm04_demon_lord_ring',
    name: '炎魔之戒',
    nameEn: 'Demon Lord Ring',
    description: '被动：灼烧效果每秒额外 +2 伤害',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'dooley',
    tags: ['法师', '灼烧叠层'],
  },

  // M05 凤凰羽毛
  {
    itemId: 'm05_phoenix_feather',
    name: '凤凰羽毛',
    nameEn: 'Phoenix Feather',
    description: '被动：每次灼烧结束时，若敌方HP<30%，立即造成30伤害',
    size: 1,
    baseTier: 'silver',
    price: 5,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'dooley',
    tags: ['法师', '灼烧叠层'],
  },

  // --- Build B - 充能爆发（5个）---

  // M06 奥术晶球
  {
    itemId: 'm06_arcane_crystal',
    name: '奥术晶球',
    nameEn: 'Arcane Crystal',
    description: '每次触发充能1层，满3层释放：造成 100 伤害',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 6,
    ports: [
      { category: 'operational', type: 'charge', value: 1 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'dooley',
    tags: ['法师', '充能爆发'],
  },

  // M07 能量棱镜
  {
    itemId: 'm07_energy_prism',
    name: '能量棱镜',
    nameEn: 'Energy Prism',
    description: '高频充能辅助，配合大型奥术物品',
    size: 1,
    baseTier: 'bronze',
    price: 2,
    cooldown: 4,
    ports: [
      { category: 'operational', type: 'charge', value: 1 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'dooley',
    tags: ['法师', '充能爆发'],
  },

  // M08 超载法阵
  {
    itemId: 'm08_overload_circle',
    name: '超载法阵',
    nameEn: 'Overload Circle',
    description: '被动：充能满层时，随机对敌方施加 burn+slow+damage 三种效果',
    size: 3,
    baseTier: 'silver',
    price: 6,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'dooley',
    tags: ['法师', '充能爆发'],
  },

  // M09 共鸣水晶
  {
    itemId: 'm09_resonance_crystal',
    name: '共鸣水晶',
    nameEn: 'Resonance Crystal',
    description: '被动：相邻物品每次触发，此物品充能 +1',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'adjacent' },
    sourceHero: 'dooley',
    tags: ['法师', '充能爆发'],
  },

  // M10 魔力溢出符
  {
    itemId: 'm10_mana_overflow_rune',
    name: '魔力溢出符',
    nameEn: 'Mana Overflow Rune',
    description: '被动：充能满层后清零时，法师所有物品CD缩短 2s',
    size: 1,
    baseTier: 'silver',
    price: 5,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'dooley',
    tags: ['法师', '充能爆发'],
  },

  // --- Build C - 连锁反应（5个）---

  // M11 连锁闪电杖
  {
    itemId: 'm11_chain_lightning_staff',
    name: '连锁闪电杖',
    nameEn: 'Chain Lightning Staff',
    description: '造成伤害后，有 40% 概率跳跃一次造成 15 伤害',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 8,
    ports: [
      { category: 'output', type: 'damage', value: 30 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'dooley',
    tags: ['法师', '连锁反应'],
  },

  // M12 镜像魔典
  {
    itemId: 'm12_mirror_grimoire',
    name: '镜像魔典',
    nameEn: 'Mirror Grimoire',
    description: '触发时，复制相邻物品的效果一次',
    size: 2,
    baseTier: 'silver',
    price: 6,
    cooldown: 12,
    ports: [
      { category: 'output', type: 'damage', value: 50 },
    ],
    targetRule: { kind: 'adjacent' },
    sourceHero: 'dooley',
    tags: ['法师', '连锁反应'],
  },

  // M13 召唤图腾
  {
    itemId: 'm13_summon_totem',
    name: '召唤图腾',
    nameEn: 'Summon Totem',
    description: '放置时召唤一个size 1的复制品，持续本场战斗',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 15,
    ports: [
      { category: 'output', type: 'damage', value: 40 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'dooley',
    tags: ['法师', '连锁反应'],
  },

  // M14 时空涟漪
  {
    itemId: 'm14_spacetime_ripple',
    name: '时空涟漪',
    nameEn: 'Spacetime Ripple',
    description: '被动：每次有物品触发，法师所有物品value +1（仅本场）',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'dooley',
    tags: ['法师', '连锁反应'],
  },

  // M15 奥术超载符文
  {
    itemId: 'm15_arcane_overload_rune',
    name: '奥术超载符文',
    nameEn: 'Arcane Overload Rune',
    description: '被动：所有充能类物品充能上限 -1（更快爆发）',
    size: 1,
    baseTier: 'gold',
    price: 8,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'dooley',
    tags: ['法师', '连锁反应'],
  },

  // ========================================
  // 四、盗贼专属物品（15个）→ vanessa
  // Build A: 剧毒叠层, Build B: 灼烧+控制, Build C: 暴击连击
  // ========================================

  // --- Build A - 剧毒叠层（5个）---

  // R01 蛇牙匕首
  {
    itemId: 'r01_snake_fang_dagger',
    name: '蛇牙匕首',
    nameEn: 'Snake Fang Dagger',
    description: '叠加剧毒，持续3秒',
    size: 1,
    baseTier: 'bronze',
    price: 2,
    cooldown: 4,
    ports: [
      { category: 'output', type: 'poison', value: 5 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'vanessa',
    tags: ['盗贼', '剧毒叠层'],
  },

  // R02 毒雾飞镖
  {
    itemId: 'r02_poison_mist_dart',
    name: '毒雾飞镖',
    nameEn: 'Poison Mist Dart',
    description: '毒+减速组合，减速时毒伤 ×1.3',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 6,
    ports: [
      { category: 'output', type: 'poison', value: 8 },
      { category: 'operational', type: 'slow', value: 1 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'vanessa',
    tags: ['盗贼', '剧毒叠层'],
  },

  // R03 毒液蒸馏器
  {
    itemId: 'r03_poison_distiller',
    name: '毒液蒸馏器',
    nameEn: 'Poison Distiller',
    description: '己方毒效果持续时间 +2s',
    size: 2,
    baseTier: 'silver',
    price: 5,
    cooldown: 10,
    ports: [
      { category: 'output', type: 'poison', value: 20 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'vanessa',
    tags: ['盗贼', '剧毒叠层'],
  },

  // R04 暗影毒瓶
  {
    itemId: 'r04_shadow_poison_flask',
    name: '暗影毒瓶',
    nameEn: 'Shadow Poison Flask',
    description: '被动：每叠加一层毒，下次攻击 +5 伤害',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'vanessa',
    tags: ['盗贼', '剧毒叠层'],
  },

  // R05 炼毒师腰带
  {
    itemId: 'r05_alchemist_belt',
    name: '炼毒师腰带',
    nameEn: 'Alchemist Belt',
    description: '被动：战斗开始时，敌方自动中毒 5/s 持续 5s',
    size: 2,
    baseTier: 'silver',
    price: 5,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'vanessa',
    tags: ['盗贼', '剧毒叠层'],
  },

  // --- Build B - 灼烧+控制（5个）---

  // R06 烙刀
  {
    itemId: 'r06_branding_knife',
    name: '烙刀',
    nameEn: 'Branding Knife',
    description: '触发减速时，此物品伤害和灼烧各提升50%',
    size: 2,
    baseTier: 'silver',
    price: 5,
    cooldown: 5,
    ports: [
      { category: 'output', type: 'damage', value: 20 },
      { category: 'output', type: 'burn', value: 5 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'vanessa',
    tags: ['盗贼', '灼烧控制'],
  },

  // R07 皮皮虾
  {
    itemId: 'r07_mantis_shrimp',
    name: '皮皮虾',
    nameEn: 'Mantis Shrimp',
    description: '触发减速时，灼烧持续时间 +2s',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 9,
    ports: [
      { category: 'output', type: 'damage', value: 20 },
      { category: 'output', type: 'burn', value: 5 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'vanessa',
    tags: ['盗贼', '灼烧控制'],
  },

  // R08 烟雾弹
  {
    itemId: 'r08_smoke_bomb',
    name: '烟雾弹',
    nameEn: 'Smoke Bomb',
    description: '减速持续时间内，盗贼所有攻击 +15% 暴击率',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 12,
    ports: [
      { category: 'operational', type: 'slow', value: 4 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'vanessa',
    tags: ['盗贼', '灼烧控制'],
  },

  // R09 火枪
  {
    itemId: 'r09_flintlock',
    name: '火枪',
    nameEn: 'Flintlock',
    description: '相邻物品触发灼烧时，此物品伤害永久 +10（上限+80）',
    size: 2,
    baseTier: 'silver',
    price: 6,
    cooldown: 6,
    ports: [
      { category: 'output', type: 'damage', value: 60 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'vanessa',
    tags: ['盗贼', '灼烧控制'],
  },

  // R10 点火手套
  {
    itemId: 'r10_ignition_gloves',
    name: '点火手套',
    nameEn: 'Ignition Gloves',
    description: '被动：攻击时 30% 概率附加 burn(3/s) 持续 3s',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'vanessa',
    tags: ['盗贼', '灼烧控制'],
  },

  // --- Build C - 暴击连击（5个）---

  // R11 双持飞刀
  {
    itemId: 'r11_dual_throwing_knives',
    name: '双持飞刀',
    nameEn: 'Dual Throwing Knives',
    description: '极速攻击，每次攻击有 20% 暴击率',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 3,
    ports: [
      { category: 'output', type: 'damage', value: 15 },
    ],
    targetRule: { kind: 'self' },
    critRate: 0.2,
    sourceHero: 'vanessa',
    tags: ['盗贼', '暴击连击'],
  },

  // R12 影刃
  {
    itemId: 'r12_shadow_blade',
    name: '影刃',
    nameEn: 'Shadow Blade',
    description: '连续暴击时，下一次暴击伤害额外 +30%',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 5,
    ports: [
      { category: 'output', type: 'damage', value: 20 },
    ],
    targetRule: { kind: 'self' },
    critRate: 0.15,
    sourceHero: 'vanessa',
    tags: ['盗贼', '暴击连击'],
  },

  // R13 暗杀徽章
  {
    itemId: 'r13_assassination_badge',
    name: '暗杀徽章',
    nameEn: 'Assassination Badge',
    description: '被动：每次暴击，下一次攻击 CD -0.5s',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'vanessa',
    tags: ['盗贼', '暴击连击'],
  },

  // R14 幸运兔脚
  {
    itemId: 'r14_lucky_rabbit_foot',
    name: '幸运兔脚',
    nameEn: 'Lucky Rabbit Foot',
    description: '被动：全局暴击率 +15%',
    size: 1,
    baseTier: 'silver',
    price: 5,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'vanessa',
    tags: ['盗贼', '暴击连击'],
  },

  // R15 刺客长袍
  {
    itemId: 'r15_assassin_robe',
    name: '刺客长袍',
    nameEn: 'Assassin Robe',
    description: '被动：HP每低于10%，暴击率额外 +5%（最高+50%）',
    size: 3,
    baseTier: 'gold',
    price: 8,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'vanessa',
    tags: ['盗贼', '暴击连击'],
  },

  // ========================================
  // 五、牧师专属物品（15个）→ pygmalien
  // Build A: 护盾墙, Build B: 治疗续航, Build C: 护盾加速
  // ========================================

  // --- Build A - 护盾墙（5个）---

  // P01 圣光盾
  {
    itemId: 'p01_holy_shield',
    name: '圣光盾',
    nameEn: 'Holy Shield',
    description: '护盾破碎时，对敌方造成 20 伤害',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 8,
    ports: [
      { category: 'defense', type: 'shield', value: 40 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'pygmalien',
    tags: ['牧师', '护盾墙'],
  },

  // P02 神圣壁垒
  {
    itemId: 'p02_divine_bastion',
    name: '神圣壁垒',
    nameEn: 'Divine Bastion',
    description: '护盾存在时，所有物品CD缩短 15%',
    size: 3,
    baseTier: 'silver',
    price: 6,
    cooldown: 12,
    ports: [
      { category: 'defense', type: 'shield', value: 80 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'pygmalien',
    tags: ['牧师', '护盾墙'],
  },

  // P03 荆棘圣衣
  {
    itemId: 'p03_thorn_holy_vest',
    name: '荆棘圣衣',
    nameEn: 'Thorn Holy Vest',
    description: '被动：每次受到伤害，回复护盾值的 30%',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'pygmalien',
    tags: ['牧师', '护盾墙'],
  },

  // P04 信仰护符
  {
    itemId: 'p04_faith_amulet',
    name: '信仰护符',
    nameEn: 'Faith Amulet',
    description: '被动：护盾上限 +30，护盾破碎时触发heal(10)',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'pygmalien',
    tags: ['牧师', '护盾墙'],
  },

  // P05 圣甲虫
  {
    itemId: 'p05_scarab',
    name: '圣甲虫',
    nameEn: 'Scarab',
    description: '被动：若护盾>100，所有物品 +20% 效果值',
    size: 1,
    baseTier: 'silver',
    price: 5,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'pygmalien',
    tags: ['牧师', '护盾墙'],
  },

  // --- Build B - 治疗续航（5个）---

  // P06 治愈之光
  {
    itemId: 'p06_healing_light',
    name: '治愈之光',
    nameEn: 'Healing Light',
    description: '治疗溢出时（超过最大HP），转为护盾',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 6,
    ports: [
      { category: 'defense', type: 'heal', value: 25 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'pygmalien',
    tags: ['牧师', '治疗续航'],
  },

  // P07 圣水法阵
  {
    itemId: 'p07_holy_water_circle',
    name: '圣水法阵',
    nameEn: 'Holy Water Circle',
    description: '每次治疗后，下次治疗量 +5（叠加，上限+50）',
    size: 3,
    baseTier: 'silver',
    price: 6,
    cooldown: 10,
    ports: [
      { category: 'defense', type: 'heal', value: 40 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'pygmalien',
    tags: ['牧师', '治疗续航'],
  },

  // P08 生命之泉
  {
    itemId: 'p08_fountain_of_life',
    name: '生命之泉',
    nameEn: 'Fountain of Life',
    description: '大量单次治疗，HP越低治疗量越高（最高×2）',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 15,
    ports: [
      { category: 'defense', type: 'heal', value: 60 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'pygmalien',
    tags: ['牧师', '治疗续航'],
  },

  // P09 再生戒指
  {
    itemId: 'p09_regeneration_ring',
    name: '再生戒指',
    nameEn: 'Regeneration Ring',
    description: '被动：每秒回复 3 HP（持续再生）',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'pygmalien',
    tags: ['牧师', '治疗续航'],
  },

  // P10 天使翎羽
  {
    itemId: 'p10_angel_feather',
    name: '天使翎羽',
    nameEn: 'Angel Feather',
    description: '被动：治疗他人时，自身也回复50%的量',
    size: 1,
    baseTier: 'silver',
    price: 5,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'pygmalien',
    tags: ['牧师', '治疗续航'],
  },

  // --- Build C - 护盾加速（5个）---

  // P11 守护之光
  {
    itemId: 'p11_guardian_light',
    name: '守护之光',
    nameEn: 'Guardian Light',
    description: '护盾+加速，适合前排盾辅助后排输出',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 8,
    ports: [
      { category: 'defense', type: 'shield', value: 30 },
      { category: 'operational', type: 'haste', value: 1 },
    ],
    targetRule: { kind: 'adjacent' },
    sourceHero: 'pygmalien',
    tags: ['牧师', '护盾加速'],
  },

  // P12 圣洁圣所
  {
    itemId: 'p12_holy_sanctuary',
    name: '圣洁圣所',
    nameEn: 'Holy Sanctuary',
    description: '己方有护盾时，所有物品触发速度 +20%',
    size: 2,
    baseTier: 'silver',
    price: 6,
    cooldown: 10,
    ports: [
      { category: 'defense', type: 'shield', value: 40 },
      { category: 'operational', type: 'haste', value: 2 },
    ],
    targetRule: { kind: 'adjacent' },
    sourceHero: 'pygmalien',
    tags: ['牧师', '护盾加速'],
  },

  // P13 时光弦月
  {
    itemId: 'p13_time_crescent',
    name: '时光弦月',
    nameEn: 'Time Crescent',
    description: '加速相邻物品，护盾越厚CD越短',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 8,
    ports: [
      { category: 'operational', type: 'haste', value: 3 },
    ],
    targetRule: { kind: 'adjacent' },
    sourceHero: 'pygmalien',
    tags: ['牧师', '护盾加速'],
  },

  // P14 牧师法袍
  {
    itemId: 'p14_priest_robe',
    name: '牧师法袍',
    nameEn: 'Priest Robe',
    description: '被动：每2s，为最右侧物品提供 shield(15)',
    size: 3,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'rightmost' },
    sourceHero: 'pygmalien',
    tags: ['牧师', '护盾加速'],
  },

  // P15 神圣协调
  {
    itemId: 'p15_divine_coordination',
    name: '神圣协调',
    nameEn: 'Divine Coordination',
    description: '被动：每次护盾触发，己方下一个物品的CD -1s',
    size: 1,
    baseTier: 'gold',
    price: 8,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'pygmalien',
    tags: ['牧师', '护盾加速'],
  },

  // ========================================
  // 六、朱尔斯专属物品（15个）→ jules
  // Build A: 欢乐加速, Build B: 美食护盾, Build C: 暴击盛宴
  // ========================================

  // --- Build A - 欢乐加速（5个）---

  // J01 欢乐铃铛
  {
    itemId: 'j01_joy_bell',
    name: '欢乐铃铛',
    nameEn: 'Joy Bell',
    description: '加速所有物品 2s，每场战斗首次触发效果翻倍',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 10,
    ports: [
      { category: 'operational', type: 'haste', value: 2 },
    ],
    targetRule: { kind: 'all' },
    sourceHero: 'jules',
    tags: ['朱尔斯', '欢乐加速'],
  },

  // J02 快乐滤镜
  {
    itemId: 'j02_happy_lens',
    name: '快乐滤镜',
    nameEn: 'Happy Lens',
    description: '被动：每次有物品被加速，自身获得护盾 8',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'jules',
    tags: ['朱尔斯', '欢乐加速'],
  },

  // J03 派对礼花
  {
    itemId: 'j03_party_popper',
    name: '派对礼花',
    nameEn: 'Party Popper',
    description: '加速相邻物品 3s，同时造成伤害 15',
    size: 2,
    baseTier: 'silver',
    price: 5,
    cooldown: 8,
    ports: [
      { category: 'output', type: 'damage', value: 15 },
      { category: 'operational', type: 'haste', value: 3 },
    ],
    targetRule: { kind: 'adjacent' },
    sourceHero: 'jules',
    tags: ['朱尔斯', '欢乐加速'],
  },

  // J04 疯狂节拍器
  {
    itemId: 'j04_crazy_metronome',
    name: '疯狂节拍器',
    nameEn: 'Crazy Metronome',
    description: '被动：相邻物品每触发一次，此物品 CD -1s',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 6,
    ports: [
      { category: 'operational', type: 'haste', value: 1 },
    ],
    targetRule: { kind: 'adjacent' },
    sourceHero: 'jules',
    tags: ['朱尔斯', '欢乐加速'],
  },

  // J05 欢乐颂歌
  {
    itemId: 'j05_joy_anthem',
    name: '欢乐颂歌',
    nameEn: 'Joy Anthem',
    description: '被动：所有被加速的物品，效果值 +25%（仅本场）',
    size: 1,
    baseTier: 'silver',
    price: 5,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'jules',
    tags: ['朱尔斯', '欢乐加速'],
  },

  // --- Build B - 美食护盾（5个）---

  // J06 奶油泡芙
  {
    itemId: 'j06_cream_puff',
    name: '奶油泡芙',
    nameEn: 'Cream Puff',
    description: '治疗 + 护盾双端口，溢出治疗转为护盾',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 8,
    ports: [
      { category: 'defense', type: 'heal', value: 15 },
      { category: 'defense', type: 'shield', value: 15 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'jules',
    tags: ['朱尔斯', '美食护盾'],
  },

  // J07 果酱面包
  {
    itemId: 'j07_jam_bread',
    name: '果酱面包',
    nameEn: 'Jam Bread',
    description: '护盾存在时，每秒治疗 3 HP',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 10,
    ports: [
      { category: 'defense', type: 'shield', value: 20 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'jules',
    tags: ['朱尔斯', '美食护盾'],
  },

  // J08 巧克力堡垒
  {
    itemId: 'j08_chocolate_fortress',
    name: '巧克力堡垒',
    nameEn: 'Chocolate Fortress',
    description: '大量护盾，护盾破碎时治疗 20 HP',
    size: 3,
    baseTier: 'silver',
    price: 6,
    cooldown: 12,
    ports: [
      { category: 'defense', type: 'shield', value: 60 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'jules',
    tags: ['朱尔斯', '美食护盾'],
  },

  // J09 糖衣护甲
  {
    itemId: 'j09_sugar_coating',
    name: '糖衣护甲',
    nameEn: 'Sugar Coating',
    description: '被动：每场战斗开始时获得护盾 15，护盾不随战斗结束清零',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'jules',
    tags: ['朱尔斯', '美食护盾'],
  },

  // J10 甜蜜庇护所
  {
    itemId: 'j10_sweet_sanctuary',
    name: '甜蜜庇护所',
    nameEn: 'Sweet Sanctuary',
    description: '被动：护盾存在期间，受到伤害减少 20%',
    size: 2,
    baseTier: 'gold',
    price: 8,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'jules',
    tags: ['朱尔斯', '美食护盾'],
  },

  // --- Build C - 暴击盛宴（5个）---

  // J11 胡椒粉碎机
  {
    itemId: 'j11_pepper_grinder',
    name: '胡椒粉碎机',
    nameEn: 'Pepper Grinder',
    description: '高速攻击，自带 20% 暴击率，暴击时额外附加灼烧 3',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 3,
    ports: [
      { category: 'output', type: 'damage', value: 12 },
    ],
    targetRule: { kind: 'self' },
    critRate: 0.2,
    sourceHero: 'jules',
    tags: ['朱尔斯', '暴击盛宴'],
  },

  // J12 辛辣炸弹
  {
    itemId: 'j12_spicy_bomb',
    name: '辛辣炸弹',
    nameEn: 'Spicy Bomb',
    description: '暴击时灼烧伤害 ×2，暴击率 +15%',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 8,
    ports: [
      { category: 'output', type: 'burn', value: 15 },
    ],
    targetRule: { kind: 'self' },
    critRate: 0.15,
    sourceHero: 'jules',
    tags: ['朱尔斯', '暴击盛宴'],
  },

  // J13 厨师徽章
  {
    itemId: 'j13_chef_badge',
    name: '厨师徽章',
    nameEn: 'Chef Badge',
    description: '被动：每场战斗第 3 次暴击后，所有物品暴击率 +10%（叠加）',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'jules',
    tags: ['朱尔斯', '暴击盛宴'],
  },

  // J14 完美调味
  {
    itemId: 'j14_perfect_seasoning',
    name: '完美调味',
    nameEn: 'Perfect Seasoning',
    description: '被动：暴击伤害 +50%，但基础暴击率 -10%',
    size: 1,
    baseTier: 'silver',
    price: 5,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'jules',
    tags: ['朱尔斯', '暴击盛宴'],
  },

  // J15 终极盛宴
  {
    itemId: 'j15_ultimate_feast',
    name: '终极盛宴',
    nameEn: 'Ultimate Feast',
    description: '被动：每有一张朱尔斯专属物品在棋盘上，暴击率 +8%',
    size: 2,
    baseTier: 'gold',
    price: 8,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'jules',
    tags: ['朱尔斯', '暴击盛宴'],
  },

  // ========================================
  // 七、麦克专属物品（15个）→ mak
  // Build A: 剧毒炼金, Build B: 灼烧药剂, Build C: 冰霜试剂
  // ========================================

  // --- Build A - 剧毒炼金（5个）---

  // K01 毒蛇之牙
  {
    itemId: 'k01_viper_fang',
    name: '毒蛇之牙',
    nameEn: 'Viper Fang',
    description: '施加剧毒 6，敌方已中毒时剧毒 ×1.5',
    size: 1,
    baseTier: 'bronze',
    price: 2,
    cooldown: 4,
    ports: [
      { category: 'output', type: 'poison', value: 6 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'mak',
    tags: ['麦克', '剧毒炼金'],
  },

  // K02 炼金坩埚
  {
    itemId: 'k02_alchemy_cauldron',
    name: '炼金坩埚',
    nameEn: 'Alchemy Cauldron',
    description: '大量剧毒，CD较长但剧毒持续8s',
    size: 3,
    baseTier: 'silver',
    price: 6,
    cooldown: 15,
    ports: [
      { category: 'output', type: 'poison', value: 30 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'mak',
    tags: ['麦克', '剧毒炼金'],
  },

  // K03 毒素增幅器
  {
    itemId: 'k03_toxin_amplifier',
    name: '毒素增幅器',
    nameEn: 'Toxin Amplifier',
    description: '被动：所有毒效果持续时间 +2s',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'mak',
    tags: ['麦克', '剧毒炼金'],
  },

  // K04 腐蚀药瓶
  {
    itemId: 'k04_corrosive_flask',
    name: '腐蚀药瓶',
    nameEn: 'Corrosive Flask',
    description: '被动：敌方中毒层数 ≥3 时，每秒额外造成 5 伤害',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'mak',
    tags: ['麦克', '剧毒炼金'],
  },

  // K05 瘟疫之源
  {
    itemId: 'k05_plague_source',
    name: '瘟疫之源',
    nameEn: 'Plague Source',
    description: '被动：每场战斗开始时，敌方自动中毒 8/s 持续 5s',
    size: 2,
    baseTier: 'silver',
    price: 5,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'mak',
    tags: ['麦克', '剧毒炼金'],
  },

  // --- Build B - 灼烧药剂（5个）---

  // K06 灼热药瓶
  {
    itemId: 'k06_blazing_potion',
    name: '灼热药瓶',
    nameEn: 'Blazing Potion',
    description: '施加灼烧 8，灼烧期间敌方被减速 1s',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 6,
    ports: [
      { category: 'output', type: 'burn', value: 8 },
      { category: 'operational', type: 'slow', value: 1 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'mak',
    tags: ['麦克', '灼烧药剂'],
  },

  // K07 炼金火焰
  {
    itemId: 'k07_alchemist_flame',
    name: '炼金火焰',
    nameEn: 'Alchemist Flame',
    description: '灼烧叠加类：每次触发灼烧 +5，叠加不清零（上限+50）',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 5,
    ports: [
      { category: 'output', type: 'burn', value: 10 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'mak',
    tags: ['麦克', '灼烧药剂'],
  },

  // K08 硫磺炸弹
  {
    itemId: 'k08_sulfur_bomb',
    name: '硫磺炸弹',
    nameEn: 'Sulfur Bomb',
    description: '大量灼烧 + 减速，敌方灼烧期间伤害加深 15%',
    size: 2,
    baseTier: 'silver',
    price: 5,
    cooldown: 12,
    ports: [
      { category: 'output', type: 'burn', value: 20 },
      { category: 'operational', type: 'slow', value: 3 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'mak',
    tags: ['麦克', '灼烧药剂'],
  },

  // K09 催化灯芯
  {
    itemId: 'k09_catalyst_wick',
    name: '催化灯芯',
    nameEn: 'Catalyst Wick',
    description: '被动：灼烧效果每秒额外 +3 伤害，敌方灼烧层数越高加成越高',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'mak',
    tags: ['麦克', '灼烧药剂'],
  },

  // K10 炼狱核心
  {
    itemId: 'k10_inferno_core',
    name: '炼狱核心',
    nameEn: 'Inferno Core',
    description: '被动：灼烧结束时立即造成等于总灼烧伤害 30% 的爆发伤害',
    size: 2,
    baseTier: 'gold',
    price: 8,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'mak',
    tags: ['麦克', '灼烧药剂'],
  },

  // --- Build C - 冰霜试剂（5个）---

  // K11 冰晶试剂
  {
    itemId: 'k11_ice_crystal_reagent',
    name: '冰晶试剂',
    nameEn: 'Ice Crystal Reagent',
    description: '冻结敌方 1s，冻结结束时附加毒 5',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 8,
    ports: [
      { category: 'operational', type: 'freeze', value: 1 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'mak',
    tags: ['麦克', '冰霜试剂'],
  },

  // K12 霜毒混合物
  {
    itemId: 'k12_frost_poison_mix',
    name: '霜毒混合物',
    nameEn: 'Frost Poison Mix',
    description: '同时施加毒 8 + 冻结 1s，冻结期间毒伤 ×1.5',
    size: 2,
    baseTier: 'bronze',
    price: 3,
    cooldown: 7,
    ports: [
      { category: 'output', type: 'poison', value: 8 },
      { category: 'operational', type: 'freeze', value: 1 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'mak',
    tags: ['麦克', '冰霜试剂'],
  },

  // K13 冰封药鼎
  {
    itemId: 'k13_frozen_cauldron',
    name: '冰封药鼎',
    nameEn: 'Frozen Cauldron',
    description: '冻结敌方 2s，冻结结束后灼烧 10/s 持续 3s',
    size: 2,
    baseTier: 'silver',
    price: 5,
    cooldown: 14,
    ports: [
      { category: 'operational', type: 'freeze', value: 2 },
      { category: 'output', type: 'burn', value: 10 },
    ],
    targetRule: { kind: 'self' },
    sourceHero: 'mak',
    tags: ['麦克', '冰霜试剂'],
  },

  // K14 极寒萃取液
  {
    itemId: 'k14_extreme_cold_extract',
    name: '极寒萃取液',
    nameEn: 'Extreme Cold Extract',
    description: '被动：冻结持续时间 +1s，敌方冻结时毒/灼烧伤害 +30%',
    size: 1,
    baseTier: 'bronze',
    price: 3,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'mak',
    tags: ['麦克', '冰霜试剂'],
  },

  // K15 绝对零度圣杯
  {
    itemId: 'k15_absolute_zero_grail',
    name: '绝对零度圣杯',
    nameEn: 'Absolute Zero Grail',
    description: '被动：每场战斗首次冻结后，所有毒/灼烧物品 CD 缩短 30%',
    size: 2,
    baseTier: 'gold',
    price: 8,
    cooldown: 0,
    ports: [],
    targetRule: { kind: 'self' },
    sourceHero: 'mak',
    tags: ['麦克', '冰霜试剂'],
  },
];

export const ITEMS_MAP = new Map<string, ItemConfig>(ITEMS.map(i => [i.itemId, i]));
