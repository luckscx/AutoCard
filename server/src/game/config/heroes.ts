import type { HeroConfig } from '@autocard/shared';

export const HEROES: HeroConfig[] = [
  {
    heroId: 'dooley',
    name: '杜利',
    description: '连锁触发型机器人。通过 Core 核心物品驱动链式反应，燃烧/冻结协同爆发。',
    baseHp: 100,
    hpPerLevel: 10,
    startingGold: 10,
    startingItems: ['皂沫中士'],
    skillPool: [
      // Build A 灼烧叠层
      'm01_fire_staff', 'm03_flame_orb', 'm04_demon_lord_ring',
      // Build B 充能爆发
      'm06_arcane_crystal', 'm07_energy_prism', 'm09_resonance_crystal',
      // Build C 连锁反应
      'm11_chain_lightning_staff', 'm12_mirror_grimoire', 'm14_spacetime_ripple',
    ],
  },
  {
    heroId: 'jules',
    name: '朱尔斯',
    description: '欢乐型/另类胜利。通过 Joy 欢乐机制让对手"太开心而不战"，护盾暴击兼顾。',
    baseHp: 90,
    hpPerLevel: 9,
    startingGold: 10,
    startingItems: ['巴努叶'],
    skillPool: [
      // Build A 欢乐加速
      'j01_joy_bell', 'j02_happy_lens', 'j04_crazy_metronome', 'j05_joy_anthem',
      // Build B 美食护盾
      'j06_cream_puff', 'j07_jam_bread', 'j09_sugar_coating', 'j10_sweet_sanctuary',
      // Build C 暴击盛宴
      'j11_pepper_grinder', 'j12_spicy_bomb', 'j13_chef_badge', 'j14_perfect_seasoning',
    ],
  },
  {
    heroId: 'mak',
    name: '麦克',
    description: '药剂/毒/燃烧型。通过 Potion 药剂和 Reagent 试剂转化，堆叠持续伤害。',
    baseHp: 95,
    hpPerLevel: 9,
    startingGold: 10,
    startingItems: ['翡翠'],
    skillPool: [
      // Build A 剧毒炼金
      'k01_viper_fang', 'k03_toxin_amplifier', 'k04_corrosive_flask', 'k05_plague_source',
      // Build B 灼烧药剂
      'k06_blazing_potion', 'k07_alchemist_flame', 'k09_catalyst_wick', 'k10_inferno_core',
      // Build C 冰霜试剂
      'k11_ice_crystal_reagent', 'k12_frost_poison_mix', 'k14_extreme_cold_extract', 'k15_absolute_zero_grail',
    ],
  },
  {
    heroId: 'pygmalien',
    name: '皮格马利翁',
    description: '坦克/经济型。护盾治疗滚雪球，Property 房产物品产金，生命值可无限堆叠。',
    baseHp: 120,
    hpPerLevel: 12,
    startingGold: 12,
    startingItems: ['没药'],
    skillPool: [
      // Build A 护盾墙
      'p01_holy_shield', 'p03_thorn_holy_vest', 'p04_faith_amulet', 'p05_scarab',
      // Build B 治疗续航
      'p06_healing_light', 'p08_fountain_of_life', 'p09_regeneration_ring', 'p10_angel_feather',
      // Build C 护盾加速
      'p11_guardian_light', 'p13_time_crescent', 'p14_priest_robe', 'p15_divine_coordination',
    ],
  },
  {
    heroId: 'stelle',
    name: '斯泰尔',
    description: '机甲/载具型。Vehicle 载具驱动高暴击与护盾，工具联动燃烧攻击。',
    baseHp: 100,
    hpPerLevel: 10,
    startingGold: 10,
    startingItems: ['蒸汽汤勺'],
    skillPool: [
      // Build A 冻结爆发
      'w01_ice_claw', 'w04_permafrost_bracer', 'w05_extreme_cold_relic',
      // Build B 叠层强化
      'w06_blood_war_sword', 'w07_battlefield_medal', 'w08_rune_dual_blade', 'w10_pioneer_heart',
      // Build C 重击暴击
      'w11_skybreak_hammer', 'w13_fury_amulet', 'w14_blood_gem', 'w15_dragon_slayer_blade',
    ],
  },
  {
    heroId: 'vanessa',
    name: '瓦内莎',
    description: '武器爆发/水生毒控双路线。多武器暴力或水生减速+毒素组合，新手友好。',
    baseHp: 95,
    hpPerLevel: 9,
    startingGold: 10,
    startingItems: ['毒液'],
    skillPool: [
      // Build A 剧毒叠层
      'r01_snake_fang_dagger', 'r04_shadow_poison_flask', 'r05_alchemist_belt',
      // Build B 灼烧控制
      'r06_branding_knife', 'r08_smoke_bomb', 'r10_ignition_gloves',
      // Build C 暴击连击
      'r11_dual_throwing_knives', 'r12_shadow_blade', 'r13_assassination_badge', 'r14_lucky_rabbit_foot',
    ],
  },
];
