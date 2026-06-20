import type { Types } from 'mongoose';
import {
  INITIAL_PRESTIGE, XP_PER_LEVEL, PVP_WINS_TO_WIN,
  HOURS_PER_DAY, HOUR_TYPE, shopRefreshCostForLevel, boardSlotsForLevel,
  type RunState, type BattleResult, type SlotItem, type PendingLevelUpState,
} from '@autocard/shared';
import { RunModel, type IRun } from '../models/Run.js';
import { PvpMirrorModel } from '../models/PvpMirror.js';
import { HEROES, ITEMS_MAP, BAZAAR_ITEMS_MAP, EVENTS, getMonstersByDifficulty } from '../game/config/index.js';

// 合并基础物品与大巴扎物品，大巴扎优先（bazaar 数据更完整）
const ALL_ITEMS_MAP = new Map([...ITEMS_MAP, ...BAZAAR_ITEMS_MAP]);
import { resolvePveBattle, resolveBattle } from '../game/battle.js';

function toRunState(doc: IRun): RunState {
  return {
    id: doc._id!.toString(),
    userId: doc.userId.toString(),
    heroId: doc.heroId,
    status: doc.status,
    day: doc.day,
    hour: doc.hour,
    prestige: doc.prestige,
    pvpWins: doc.pvpWins,
    xp: doc.xp,
    level: doc.level,
    gold: doc.gold,
    hp: doc.hp,
    maxHp: doc.maxHp,
    board: doc.board,
    stash: doc.stash,
    shopRefreshed: doc.shopRefreshed,
    pendingEvent: doc.pendingEvent ?? undefined,
    income: doc.income,
    hpRegen: doc.hpRegen,
    goldGainBonus: doc.goldGainBonus,
    boardSlots: doc.boardSlots ?? 4,
    pendingLevelUp: doc.pendingLevelUp ? (doc.pendingLevelUp as unknown as PendingLevelUpState) : undefined,
  };
}

export class RunService {
  async startRun(userId: string, heroId: string): Promise<RunState> {
    const hero = HEROES.find(h => h.heroId === heroId);
    if (!hero) throw new Error(`Unknown hero: ${heroId}`);

    const existing = await RunModel.findOne({ userId, status: 'active' });
    if (existing) throw new Error('Already have an active run');

    const startingBoard: SlotItem[] = hero.startingItems.map((itemId, i) => {
      const cfg = ALL_ITEMS_MAP.get(itemId)!;
      return { itemId, tier: cfg.baseTier, size: cfg.size, slotIndex: i };
    });

    const run = await RunModel.create({
      userId,
      heroId,
      status: 'active',
      day: 1,
      hour: 1,
      prestige: INITIAL_PRESTIGE,
      pvpWins: 0,
      xp: 0,
      level: 1,
      gold: hero.startingGold,
      hp: hero.baseHp,
      maxHp: hero.baseHp,
      board: startingBoard,
      stash: [],
      shopItems: [],
      income: 0,
      hpRegen: 0,
      goldGainBonus: 0,
      boardSlots: boardSlotsForLevel(1),
      pendingLevelUp: null,
    });

    return toRunState(run);
  }

  async restartRun(userId: string, heroId?: string): Promise<RunState> {
    // 找到当前活跃 Run（如有），将其标记为放弃
    const activeRun = await RunModel.findOne({ userId, status: 'active' });
    const resolvedHeroId = heroId ?? activeRun?.heroId;
    if (!resolvedHeroId) throw new Error('heroId is required when no active run exists');

    if (activeRun) {
      activeRun.status = 'finished_lose';
      await activeRun.save();
    }

    // 复用 startRun 逻辑（此时已无 active run，不会触发冲突检查）
    return this.startRun(userId, resolvedHeroId);
  }

  async getCurrentRun(userId: string): Promise<RunState | null> {
    const run = await RunModel.findOne({ userId, status: 'active' });
    return run ? toRunState(run) : null;
  }

  async handleHourChoice(runId: string, userId: string, choice: 'shop' | 'event' | 'gift') {
    const run = await this.getActiveRun(runId, userId);
    const hourType = HOUR_TYPE[run.hour as keyof typeof HOUR_TYPE];
    if (hourType !== 'choice') throw new Error(`Hour ${run.hour} is not a choice hour`);

    if (run.pendingEvent) {
      if (choice === 'shop' || choice === 'gift') {
        throw new Error('请先完成随机事件');
      }
      const pe = run.pendingEvent;
      return {
        run: toRunState(run),
        event: { eventId: pe.eventId, options: pe.options },
      };
    }

    if (choice === 'shop') {
      const shopItems = this.generateShopItems(run.level, [...run.board, ...run.stash]);
      run.shopItems = shopItems;
      run.shopRefreshed = false;
      await run.save();
      return { run: toRunState(run), shopItems };
    }

    if (choice === 'event') {
      const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      run.pendingEvent = {
        eventId: ev.eventId,
        name: ev.name,
        description: ev.description,
        options: ev.options.map(o => ({ label: o.label })),
      };
      run.markModified('pendingEvent');
      await run.save();
      return {
        run: toRunState(run),
        event: { eventId: ev.eventId, options: ev.options.map(o => ({ label: o.label })) },
      };
    }

    const allItems = Array.from(ALL_ITEMS_MAP.values()).filter(i => i.baseTier === 'bronze' && i.image);
    const giftCfg = allItems[Math.floor(Math.random() * allItems.length)];
    const freeSlot = this.findFreeSlot(run.stash, giftCfg.size);
    if (freeSlot < 0) throw new Error('储物箱已满，无法领取礼物');

    run.stash.push({
      itemId: giftCfg.itemId,
      tier: giftCfg.baseTier,
      size: giftCfg.size,
      slotIndex: freeSlot,
    });
    run.markModified('stash');
    this.gainXp(run, 1);
    this.advanceHour(run);
    await run.save();

    return { run: toRunState(run), gift: { itemId: giftCfg.itemId } };
  }

  async handlePve(runId: string, userId: string, difficulty: 'easy' | 'medium' | 'hard') {
    const run = await this.getActiveRun(runId, userId);
    const hourType = HOUR_TYPE[run.hour as keyof typeof HOUR_TYPE];
    if (hourType !== 'pve') throw new Error(`Hour ${run.hour} is not PvE hour`);

    const monsters = getMonstersByDifficulty(difficulty);
    const monster = monsters[Math.floor(Math.random() * monsters.length)];

    const battleResult = resolvePveBattle(
      { hp: run.maxHp, maxHp: run.maxHp, level: run.level, board: run.board },
      monster,
    );

    battleResult.xpGained = monster.xpReward;
    battleResult.goldGained = monster.goldReward;

    const actualGold = this.applyGoldGain(run, monster.goldReward);
    run.gold += actualGold;
    battleResult.goldGained = actualGold;
    this.gainXp(run, monster.xpReward);

    if (battleResult.won) {
      const loot: string[] = [];
      for (const drop of monster.lootTable) {
        if (Math.random() < drop.chance) loot.push(drop.itemId);
      }
      battleResult.loot = loot;

      for (const itemId of loot) {
        const cfg = ALL_ITEMS_MAP.get(itemId);
        if (!cfg) continue;
        const freeSlot = this.findFreeSlot(run.stash, cfg.size);
        if (freeSlot < 0) continue;
        run.stash.push({ itemId, tier: cfg.baseTier, size: cfg.size, slotIndex: freeSlot });
        run.markModified('stash');
      }
    }

    this.advanceHour(run);
    await run.save();

    // 构建怪物棋盘（与 resolvePveBattle 内部逻辑保持一致）
    const monsterBoard: SlotItem[] = monster.battleBoard && monster.battleBoard.length > 0
      ? monster.battleBoard.map(slot => {
          const cfg = ALL_ITEMS_MAP.get(slot.itemId);
          return cfg
            ? { itemId: slot.itemId, tier: (slot.tier ?? cfg.baseTier) as SlotItem['tier'], size: cfg.size as SlotItem['size'], slotIndex: slot.slotIndex }
            : { itemId: slot.itemId, tier: (slot.tier ?? 'bronze') as SlotItem['tier'], size: 1 as SlotItem['size'], slotIndex: slot.slotIndex };
        })
      : [{ itemId: '__monster_attack', tier: 'bronze' as const, size: 1 as const, slotIndex: 0 }];

    return {
      run: toRunState(run),
      battle: battleResult,
      monster: { monsterId: monster.monsterId, name: monster.name },
      monsterBoard,
    };
  }

  async handlePvp(runId: string, userId: string) {
    const run = await this.getActiveRun(runId, userId);
    const hourType = HOUR_TYPE[run.hour as keyof typeof HOUR_TYPE];
    if (hourType !== 'pvp') throw new Error(`Hour ${run.hour} is not PvP hour`);

    // 保存自己的镜像
    await PvpMirrorModel.findOneAndUpdate(
      { runId: run._id },
      {
        runId: run._id,
        userId: run.userId,
        day: run.day,
        level: run.level,
        snapshot: {
          level: run.level,
          hp: run.hp,
          maxHp: run.maxHp,
          board: run.board,
          heroId: run.heroId,
        },
      },
      { upsert: true, new: true },
    );

    // 查找一个镜像对手（排除自己）
    const mirror = await PvpMirrorModel.findOne({
      userId: { $ne: run.userId },
      day: { $gte: run.day - 1, $lte: run.day + 1 },
      level: { $gte: run.level - 2, $lte: run.level + 2 },
    }).sort({ createdAt: -1 });

    let opponent: { heroId: string; level: number; board: SlotItem[]; hp: number; maxHp: number };

    if (mirror) {
      opponent = {
        heroId: mirror.snapshot.heroId,
        level: mirror.snapshot.level,
        board: mirror.snapshot.board,
        hp: mirror.snapshot.hp,
        maxHp: mirror.snapshot.maxHp,
      };
    } else {
      // 没有其他玩家时生成 AI 对手
      opponent = this.generateAiOpponent(run.level, run.day);
    }

    const result = resolveBattle(
      { hp: run.maxHp, maxHp: run.maxHp, level: run.level, board: run.board },
      { hp: opponent.maxHp, maxHp: opponent.maxHp, level: opponent.level, board: opponent.board },
    );

    const won = result.attackerWon;

    const battleResult: BattleResult = {
      won,
      hpLeft: result.attackerHpLeft,
      xpGained: 1,
      goldGained: won ? 3 : 1,
      events: result.events,
      snapshots: result.snapshots,
    };

    const actualPvpGold = this.applyGoldGain(run, battleResult.goldGained);
    battleResult.goldGained = actualPvpGold;
    run.gold += actualPvpGold;
    this.gainXp(run, 1);

    if (won) {
      run.pvpWins += 1;
      if (run.pvpWins >= PVP_WINS_TO_WIN) {
        run.status = 'finished_win';
      }
    } else {
      run.prestige -= run.day;
      if (run.prestige <= 0) {
        run.prestige = 0;
        run.status = 'finished_lose';
      }
    }

    this.advanceHour(run);
    await run.save();

    return {
      run: toRunState(run),
      battle: battleResult,
      opponent: { heroId: opponent.heroId, level: opponent.level, board: opponent.board },
    };
  }

  // --- Shop ---
  async buyItem(runId: string, userId: string, itemId: string, target: 'board' | 'stash', slotIndex: number) {
    const run = await this.getActiveRun(runId, userId);
    const cfg = ALL_ITEMS_MAP.get(itemId);
    if (!cfg) throw new Error(`Unknown item: ${itemId}`);
    if (run.gold < cfg.price) throw new Error('Not enough gold');

    const tierOrder = ['bronze', 'silver', 'gold', 'diamond', 'legendary'] as const;

    // 检查棋盘+背包是否有同 itemId 的卡牌可合并升级
    // 找到 tier 最低的同种卡牌（优先合并低阶卡，升阶效率最高）
    // 注意：不能使用 {...s} 展开 Mongoose SubDocument，因为 getter 属性不是 own enumerable
    const findSameItems = (container: typeof run.board, containerName: 'board' | 'stash') =>
      container.filter(s => s.itemId === itemId).map(s => ({
        itemId: s.itemId,
        tier: s.tier as string,
        size: s.size as number,
        slotIndex: s.slotIndex as number,
        _container: containerName,
      }));
    const sameItems = [
      ...findSameItems(run.board, 'board'),
      ...findSameItems(run.stash, 'stash'),
    ];
    // 按 tier 排序，选最低的
    sameItems.sort((a, b) => tierOrder.indexOf(a.tier as any) - tierOrder.indexOf(b.tier as any));
    const existingMatch = sameItems[0];

    let merged = false;
    let mergedItem: SlotItem | undefined;

    if (existingMatch && tierOrder.indexOf(existingMatch.tier) < tierOrder.length - 1) {
      const currentIdx = tierOrder.indexOf(existingMatch.tier);
      // 合并：已有卡牌升阶，新买的卡牌消耗掉（不占用新格子）
      const nextTier = tierOrder[currentIdx + 1];

      // 找到原始 Mongoose 文档中的卡牌并修改
      const container = existingMatch._container === 'board' ? run.board : run.stash;
      const docItem = container.find(s => s.slotIndex === existingMatch.slotIndex && s.itemId === itemId);
      if (docItem) {
        docItem.tier = nextTier;
        run.markModified('board');
        run.markModified('stash');
      }

      run.gold -= cfg.price;
      merged = true;
      mergedItem = { itemId, tier: nextTier, size: existingMatch.size, slotIndex: existingMatch.slotIndex };
    }

    if (!merged) {
      // 无可合并卡牌，正常放置
      const container = target === 'board' ? run.board : run.stash;
      this.validatePlacement(container, cfg.size, slotIndex);
      run.gold -= cfg.price;
      container.push({ itemId, tier: cfg.baseTier, size: cfg.size, slotIndex });
      run.markModified(target === 'board' ? 'board' : 'stash');
    }

    await run.save();
    return { run: toRunState(run), merged, mergedItem };
  }

  async refreshShopOnce(runId: string, userId: string) {
    const run = await this.getActiveRun(runId, userId);
    if (run.shopRefreshed) throw new Error('已经刷新过一次了');

    const cost = shopRefreshCostForLevel(run.level);
    if (run.gold < cost) throw new Error(`金币不足，刷新需要 ${cost}G`);

    run.gold -= cost;
    run.shopRefreshed = true;
    const shopItems = this.generateShopItems(run.level, [...run.board, ...run.stash]);
    run.shopItems = shopItems;
    await run.save();

    return { run: toRunState(run), shopItems };
  }

  async leaveShop(runId: string, userId: string) {
    const run = await this.getActiveRun(runId, userId);
    this.gainXp(run, 1);
    this.advanceHour(run);
    run.shopRefreshed = false;
    run.shopItems = [];
    await run.save();
    return toRunState(run);
  }

  // --- Event ---
  async handleEvent(runId: string, userId: string, eventId: string, optionIndex: number) {
    const run = await this.getActiveRun(runId, userId);
    if (!run.pendingEvent || run.pendingEvent.eventId !== eventId) {
      throw new Error('没有进行中的事件或事件 ID 不匹配');
    }

    const ev = EVENTS.find(e => e.eventId === eventId);
    if (!ev) throw new Error(`Unknown event: ${eventId}`);
    if (optionIndex < 0 || optionIndex >= ev.options.length) throw new Error('Invalid option');

    const effects = ev.options[optionIndex].effects;
    const applied: { type: string; value: number | string }[] = [];

    for (const eff of effects) {
      switch (eff.type) {
        case 'gold': {
          const goldValue = eff.value as number;
          // goldGainBonus 只加成正向金币获取，扣金币不加成
          const goldAmount = goldValue > 0 ? this.applyGoldGain(run, goldValue) : goldValue;
          run.gold = Math.max(0, run.gold + goldAmount);
          break;
        }
        case 'xp': this.gainXp(run, eff.value as number); break;
        case 'hp': run.hp = Math.min(run.maxHp, Math.max(1, run.hp + (eff.value as number))); break;
        case 'item': {
          // 简化：放入储物箱第一个空位
          const id = typeof eff.value === 'string' && eff.value.startsWith('random_')
            ? this.randomItemByTier(eff.value.replace('random_', '') as any)
            : eff.value as string;
          const cfg = ALL_ITEMS_MAP.get(id);
          if (cfg) {
            const freeSlot = this.findFreeSlot(run.stash, cfg.size);
            if (freeSlot >= 0) {
              run.stash.push({ itemId: id, tier: cfg.baseTier, size: cfg.size, slotIndex: freeSlot });
              run.markModified('stash');
            }
          }
          break;
        }
        case 'removeItem': {
          if (run.stash.length > 0) {
            run.stash.pop();
            run.markModified('stash');
          } else if (run.board.length > 0) {
            run.board.pop();
            run.markModified('board');
          }
          break;
        }
      }
      applied.push({ type: eff.type, value: eff.value });
    }

    run.pendingEvent = null;
    run.markModified('pendingEvent');
    this.gainXp(run, 1);
    this.advanceHour(run);
    await run.save();
    return { run: toRunState(run), effects: applied };
  }

  // --- Board operations ---
  async placeItem(runId: string, userId: string, from: 'board' | 'stash', fromIndex: number, to: 'board' | 'stash', toIndex: number) {
    const run = await this.getActiveRun(runId, userId);
    const fromContainer = from === 'board' ? run.board : run.stash;
    const toContainer = to === 'board' ? run.board : run.stash;

    const itemIdx = fromContainer.findIndex(s => s.slotIndex === fromIndex);
    if (itemIdx < 0) throw new Error('No item at source slot');

    const item = fromContainer[itemIdx];
    if (from !== to || fromIndex !== toIndex) {
      this.validatePlacement(toContainer, item.size, toIndex, from === to ? fromIndex : undefined);
    }

    fromContainer.splice(itemIdx, 1);
    item.slotIndex = toIndex;
    toContainer.push(item);

    run.markModified('board');
    run.markModified('stash');
    await run.save();
    return toRunState(run);
  }

  async sellItem(runId: string, userId: string, from: 'board' | 'stash', slotIndex: number) {
    const run = await this.getActiveRun(runId, userId);
    const container = from === 'board' ? run.board : run.stash;
    const itemIdx = container.findIndex(s => s.slotIndex === slotIndex);
    if (itemIdx < 0) throw new Error('No item at that slot');

    const item = container[itemIdx];
    const cfg = ALL_ITEMS_MAP.get(item.itemId);
    const tierMul: Record<string, number> = { bronze: 1, silver: 2, gold: 3, diamond: 5, legendary: 6 };
    const sellPrice = cfg ? Math.max(1, Math.floor(cfg.price * (tierMul[item.tier] ?? 1) * 0.5)) : 1;

    container.splice(itemIdx, 1);
    run.gold += sellPrice;
    run.markModified(from);
    await run.save();

    return { run: toRunState(run), soldPrice: sellPrice };
  }

  async swapItems(runId: string, userId: string, target: 'board' | 'stash', indexA: number, indexB: number) {
    const run = await this.getActiveRun(runId, userId);
    const container = target === 'board' ? run.board : run.stash;
    const a = container.find(s => s.slotIndex === indexA);
    const b = container.find(s => s.slotIndex === indexB);
    if (!a || !b) throw new Error('Items not found for swap');

    // 交换 slotIndex
    const tmpIdx = a.slotIndex;
    a.slotIndex = b.slotIndex;
    b.slotIndex = tmpIdx;

    // 交换后校验是否越界
    if (a.slotIndex + a.size > 10 || b.slotIndex + b.size > 10) {
      throw new Error('Swap would cause out of bounds');
    }

    run.markModified(target);
    await run.save();
    return toRunState(run);
  }

  async mergeItems(runId: string, userId: string, target: 'board' | 'stash', indexA: number, indexB: number) {
    const run = await this.getActiveRun(runId, userId);
    const container = target === 'board' ? run.board : run.stash;

    const a = container.find(s => s.slotIndex === indexA);
    const b = container.find(s => s.slotIndex === indexB);
    if (!a || !b) throw new Error('Items not found');
    if (a.itemId !== b.itemId) throw new Error('Items must be the same');
    if (a.tier !== b.tier) throw new Error('Items must be same tier');

    const tierOrder = ['bronze', 'silver', 'gold', 'diamond', 'legendary'] as const;
    const currentIdx = tierOrder.indexOf(a.tier);
    if (currentIdx >= tierOrder.length - 1) throw new Error('Already max tier');

    const nextTier = tierOrder[currentIdx + 1];
    const bIdx = container.indexOf(b);
    container.splice(bIdx, 1);
    a.tier = nextTier;

    run.markModified(target);
    await run.save();

    return { run: toRunState(run), mergedItem: a };
  }

  // --- Helpers ---
  private async getActiveRun(runId: string, userId: string): Promise<IRun> {
    const run = await RunModel.findById(runId);
    if (!run) throw new Error('Run not found');
    if (run.userId.toString() !== userId) throw new Error('Unauthorized');
    if (run.status !== 'active') throw new Error('Run is not active');
    return run;
  }

  private gainXp(run: IRun, amount: number) {
    run.xp += amount;
    while (run.xp >= XP_PER_LEVEL) {
      run.xp -= XP_PER_LEVEL;
      run.level += 1;
      const hero = HEROES.find(h => h.heroId === run.heroId);
      if (hero) {
        run.maxHp += hero.hpPerLevel;
        run.hp = Math.min(run.maxHp, run.hp + hero.hpPerLevel);
      }
      // 更新 boardSlots（即时生效）
      run.boardSlots = boardSlotsForLevel(run.level);
      // 生成升级三选一（如果已有 pending 则跳过，避免覆盖）
      if (!run.pendingLevelUp) {
        run.pendingLevelUp = this.generateLevelUpChoices(run);
        run.markModified('pendingLevelUp');
      }
    }
  }

  private generateLevelUpChoices(run: IRun): { level: number; choices: { label: string; kind: string }[] } {
    const canUnlockSlot = run.boardSlots < 10;
    return {
      level: run.level,
      choices: [
        canUnlockSlot
          ? { label: '解锁棋盘格（+1格）', kind: 'unlock_slot' }
          : { label: '生命上限 +5', kind: 'bonus_hp' },
        { label: '升阶一张卡牌（随机）', kind: 'upgrade_item' },
        { label: '生命上限 +10，治疗 10', kind: 'bonus_hp_heal' },
      ],
    };
  }

  async handleLevelUpChoice(runId: string, userId: string, choiceIndex: number): Promise<RunState> {
    const run = await this.getActiveRun(runId, userId);
    if (!run.pendingLevelUp) throw new Error('没有待处理的升级选择');
    if (choiceIndex < 0 || choiceIndex >= run.pendingLevelUp.choices.length) {
      throw new Error('无效的选项索引');
    }

    const choice = run.pendingLevelUp.choices[choiceIndex];
    const tierOrder = ['bronze', 'silver', 'gold', 'diamond', 'legendary'] as const;

    switch (choice.kind) {
      case 'unlock_slot': {
        run.boardSlots = Math.min(10, run.boardSlots + 1);
        break;
      }
      case 'upgrade_item': {
        // 从棋盘或储物箱中随机选一张非 legendary 牌升一阶
        const allItems = [...run.board, ...run.stash];
        const upgradeable = allItems.filter(i => {
          const idx = tierOrder.indexOf(i.tier as typeof tierOrder[number]);
          return idx >= 0 && idx < tierOrder.length - 1;
        });
        if (upgradeable.length > 0) {
          const target = upgradeable[Math.floor(Math.random() * upgradeable.length)];
          const nextTier = tierOrder[tierOrder.indexOf(target.tier as typeof tierOrder[number]) + 1];
          target.tier = nextTier;
          run.markModified('board');
          run.markModified('stash');
        }
        break;
      }
      case 'bonus_hp': {
        run.maxHp += 5;
        run.hp = Math.min(run.maxHp, run.hp + 5);
        break;
      }
      case 'bonus_hp_heal': {
        run.maxHp += 10;
        run.hp = Math.min(run.maxHp, run.hp + 10);
        break;
      }
    }

    run.pendingLevelUp = null;
    run.markModified('pendingLevelUp');
    await run.save();
    return toRunState(run);
  }

  private advanceHour(run: IRun) {
    if (run.status !== 'active') return;
    run.hour += 1;
    if (run.hour > HOURS_PER_DAY) {
      run.hour = 1;
      run.day += 1;
      // income 结算：每天开始获得金币
      if (run.income > 0) {
        run.gold += run.income;
      }
    }
  }

  private applyGoldGain(run: IRun, base: number): number {
    return base + (run.goldGainBonus ?? 0);
  }

  private tierPickWeight(level: number, tier: string): number {
    if (level < 3) return tier === 'bronze' ? 1 : 0;
    if (level < 5) {
      if (tier === 'bronze') return 0.55;
      if (tier === 'silver') return 0.45;
      return 0;
    }
    if (level < 8) {
      if (tier === 'bronze') return 0.32;
      if (tier === 'silver') return 0.33;
      if (tier === 'gold') return 0.25;
      if (tier === 'diamond') return 0.1;
      return 0;
    }
    if (tier === 'bronze') return 0.18;
    if (tier === 'silver') return 0.22;
    if (tier === 'gold') return 0.3;
    if (tier === 'diamond') return 0.28;
    if (tier === 'legendary') return 0.02;
    return 0;
  }

  private generateShopItems(level: number, ownedItems?: SlotItem[]): string[] {
    // 从大巴扎物品池中选牌（有图片的优先，保证UI好看）
    const allBazaar = Array.from(BAZAAR_ITEMS_MAP.values()).filter(i => !i.itemId.startsWith('__'));
    // 优先选有图片的物品，但如果池子不够则 fallback 到全部
    const withImage = allBazaar.filter(i => i.image);
    const pool = (withImage.length > 30 ? withImage : allBazaar).filter(i => {
      if (level < 3) return i.baseTier === 'bronze';
      if (level < 5) return i.baseTier === 'bronze' || i.baseTier === 'silver';
      if (level < 8) return i.baseTier !== 'legendary';
      return true;
    });
    const base = pool.length > 0 ? pool : allBazaar;

    // 升级机制：如果玩家已有卡牌，有概率刷出相同卡牌供升级
    // 收集玩家已有卡牌的 itemId（可合并的，即非 legendary）
    const tierOrder = ['bronze', 'silver', 'gold', 'diamond', 'legendary'] as const;
    const ownedUpgradeable = (ownedItems ?? []).filter(i => {
      const idx = tierOrder.indexOf(i.tier as typeof tierOrder[number]);
      return idx >= 0 && idx < tierOrder.length - 1;
    });
    const ownedItemIds = new Set(ownedUpgradeable.map(i => i.itemId));

    const pickOne = (): string => {
      // 40% 概率刷出玩家已有的可升级卡牌
      if (ownedItemIds.size > 0 && Math.random() < 0.4) {
        const upgradeable = base.filter(i => ownedItemIds.has(i.itemId));
        if (upgradeable.length > 0) {
          return upgradeable[Math.floor(Math.random() * upgradeable.length)].itemId;
        }
      }
      // 正常加权随机
      const weighted = base
        .map(i => ({ i, w: this.tierPickWeight(level, i.baseTier) }))
        .filter(x => x.w > 0);
      const sum = weighted.reduce((s, x) => s + x.w, 0);
      let r = Math.random() * (sum || 1);
      for (const x of weighted) {
        r -= x.w;
        if (r <= 0) return x.i.itemId;
      }
      return weighted[0]?.i.itemId ?? base[Math.floor(Math.random() * base.length)].itemId;
    };
    return [pickOne(), pickOne(), pickOne()];
  }

  private randomItemByTier(tier: string): string {
    const candidates = Array.from(BAZAAR_ITEMS_MAP.values()).filter(i => i.baseTier === tier && i.image);
    const fallback = Array.from(BAZAAR_ITEMS_MAP.values()).filter(i => i.baseTier === tier);
    const pool = candidates.length > 0 ? candidates : fallback;
    return pool.length > 0
      ? pool[Math.floor(Math.random() * pool.length)].itemId
      : 'health_potion';
  }

  private validatePlacement(container: SlotItem[], size: number, slotIndex: number, ignoreIndex?: number) {
    const maxSlots = 10;
    if (slotIndex < 0 || slotIndex + size > maxSlots) {
      throw new Error('Out of bounds');
    }
    for (const existing of container) {
      if (ignoreIndex !== undefined && existing.slotIndex === ignoreIndex) continue;
      const eStart = existing.slotIndex;
      const eEnd = eStart + existing.size;
      const nStart = slotIndex;
      const nEnd = slotIndex + size;
      if (nStart < eEnd && nEnd > eStart) {
        throw new Error('Slot overlap');
      }
    }
  }

  private findFreeSlot(container: SlotItem[], size: number): number {
    const maxSlots = 10;
    for (let i = 0; i <= maxSlots - size; i++) {
      let free = true;
      for (const existing of container) {
        const eEnd = existing.slotIndex + existing.size;
        const nEnd = i + size;
        if (i < eEnd && nEnd > existing.slotIndex) { free = false; break; }
      }
      if (free) return i;
    }
    return -1;
  }

  private generateAiOpponent(level: number, day: number) {
    const hero = HEROES[Math.floor(Math.random() * HEROES.length)];
    const hp = hero.baseHp + hero.hpPerLevel * (level - 1);
    const tierIdx = Math.min(Math.floor((level * 1.2 + day) / 4), 4);
    const tiers = ['bronze', 'silver', 'gold', 'diamond', 'legendary'] as const;
    const tier = tiers[Math.min(tierIdx, tiers.length - 1)];
    const board: SlotItem[] = hero.startingItems.map((itemId, i) => {
      const cfg = ALL_ITEMS_MAP.get(itemId)!;
      return { itemId, tier, size: cfg.size, slotIndex: i };
    });
    return { heroId: hero.heroId, level, board, hp, maxHp: hp };
  }
}
