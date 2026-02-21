import type { Types } from 'mongoose';
import {
  INITIAL_PRESTIGE, XP_PER_LEVEL, PVP_WINS_TO_WIN,
  HOURS_PER_DAY, HOUR_TYPE,
  type RunState, type BattleResult, type SlotItem,
} from '@autocard/shared';
import { RunModel, type IRun } from '../models/Run.js';
import { PvpMirrorModel } from '../models/PvpMirror.js';
import { HEROES, ITEMS_MAP, EVENTS, getMonstersByDifficulty } from '../game/config/index.js';
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
  };
}

export class RunService {
  async startRun(userId: string, heroId: string): Promise<RunState> {
    const hero = HEROES.find(h => h.heroId === heroId);
    if (!hero) throw new Error(`Unknown hero: ${heroId}`);

    const existing = await RunModel.findOne({ userId, status: 'active' });
    if (existing) throw new Error('Already have an active run');

    const startingBoard: SlotItem[] = hero.startingItems.map((itemId, i) => {
      const cfg = ITEMS_MAP.get(itemId)!;
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
    });

    return toRunState(run);
  }

  async getCurrentRun(userId: string): Promise<RunState | null> {
    const run = await RunModel.findOne({ userId, status: 'active' });
    return run ? toRunState(run) : null;
  }

  async handleHourChoice(runId: string, userId: string, choice: 'shop' | 'event' | 'gift') {
    const run = await this.getActiveRun(runId, userId);
    const hourType = HOUR_TYPE[run.hour as keyof typeof HOUR_TYPE];
    if (hourType !== 'choice') throw new Error(`Hour ${run.hour} is not a choice hour`);

    let shopItems: string[] | undefined;
    let event: { eventId: string; options: { label: string }[] } | undefined;
    let gift: { itemId: string } | undefined;

    if (choice === 'shop') {
      shopItems = this.generateShopItems(run.level);
      run.shopItems = shopItems;
      run.shopRefreshed = false;
      await run.save();
      return { run: toRunState(run), shopItems, event, gift };
    } else if (choice === 'event') {
      const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      event = { eventId: ev.eventId, options: ev.options.map(o => ({ label: o.label })) };
    } else {
      const allItems = Array.from(ITEMS_MAP.values()).filter(i => i.baseTier === 'bronze');
      const giftItem = allItems[Math.floor(Math.random() * allItems.length)];
      gift = { itemId: giftItem.itemId };
    }

    this.gainXp(run, 1);
    this.advanceHour(run);
    await run.save();

    return { run: toRunState(run), shopItems, event, gift };
  }

  async handlePve(runId: string, userId: string, difficulty: 'easy' | 'medium' | 'hard') {
    const run = await this.getActiveRun(runId, userId);
    const hourType = HOUR_TYPE[run.hour as keyof typeof HOUR_TYPE];
    if (hourType !== 'pve') throw new Error(`Hour ${run.hour} is not PvE hour`);

    const monsters = getMonstersByDifficulty(difficulty);
    const monster = monsters[Math.floor(Math.random() * monsters.length)];

    const battleResult = resolvePveBattle(
      { hp: run.hp, maxHp: run.maxHp, level: run.level, board: run.board },
      { hp: monster.hp, attack: monster.attack },
    );

    battleResult.xpGained = monster.xpReward;
    battleResult.goldGained = monster.goldReward;

    run.hp = battleResult.hpLeft;
    run.gold += monster.goldReward;
    this.gainXp(run, monster.xpReward);

    if (battleResult.won) {
      const loot: string[] = [];
      for (const drop of monster.lootTable) {
        if (Math.random() < drop.chance) loot.push(drop.itemId);
      }
      battleResult.loot = loot;
    }

    this.advanceHour(run);
    await run.save();

    return {
      run: toRunState(run),
      battle: battleResult,
      monster: { monsterId: monster.monsterId, name: monster.name },
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
      { hp: run.hp, maxHp: run.maxHp, level: run.level, board: run.board },
      { hp: opponent.hp, maxHp: opponent.maxHp, level: opponent.level, board: opponent.board },
    );

    const won = result.attackerWon;
    run.hp = result.attackerHpLeft;

    const battleResult: BattleResult = {
      won,
      hpLeft: result.attackerHpLeft,
      xpGained: 1,
      goldGained: won ? 3 : 1,
      events: result.events,
      snapshots: result.snapshots,
    };

    run.gold += battleResult.goldGained;
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
    const cfg = ITEMS_MAP.get(itemId);
    if (!cfg) throw new Error(`Unknown item: ${itemId}`);
    if (run.gold < cfg.price) throw new Error('Not enough gold');

    const container = target === 'board' ? run.board : run.stash;
    this.validatePlacement(container, cfg.size, slotIndex);

    run.gold -= cfg.price;
    container.push({ itemId, tier: cfg.baseTier, size: cfg.size, slotIndex });
    run.markModified(target === 'board' ? 'board' : 'stash');
    await run.save();

    return toRunState(run);
  }

  async refreshShopOnce(runId: string, userId: string) {
    const run = await this.getActiveRun(runId, userId);
    if (run.shopRefreshed) throw new Error('已经刷新过一次了');

    run.shopRefreshed = true;
    const shopItems = this.generateShopItems(run.level);
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
    const ev = EVENTS.find(e => e.eventId === eventId);
    if (!ev) throw new Error(`Unknown event: ${eventId}`);
    if (optionIndex < 0 || optionIndex >= ev.options.length) throw new Error('Invalid option');

    const effects = ev.options[optionIndex].effects;
    const applied: { type: string; value: number | string }[] = [];

    for (const eff of effects) {
      switch (eff.type) {
        case 'gold': run.gold = Math.max(0, run.gold + (eff.value as number)); break;
        case 'xp': this.gainXp(run, eff.value as number); break;
        case 'hp': run.hp = Math.min(run.maxHp, Math.max(1, run.hp + (eff.value as number))); break;
        case 'item': {
          // 简化：放入储物箱第一个空位
          const id = typeof eff.value === 'string' && eff.value.startsWith('random_')
            ? this.randomItemByTier(eff.value.replace('random_', '') as any)
            : eff.value as string;
          const cfg = ITEMS_MAP.get(id);
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
    const cfg = ITEMS_MAP.get(item.itemId);
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
        run.hp += hero.hpPerLevel;
      }
    }
  }

  private advanceHour(run: IRun) {
    if (run.status !== 'active') return;
    run.hour += 1;
    if (run.hour > HOURS_PER_DAY) {
      run.hour = 1;
      run.day += 1;
      // 每天回复部分 HP
      run.hp = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * 0.2));
    }
  }

  private generateShopItems(level: number): string[] {
    const all = Array.from(ITEMS_MAP.values());
    const weighted = all.filter(i => {
      if (level < 3) return i.baseTier === 'bronze';
      if (level < 5) return i.baseTier === 'bronze' || i.baseTier === 'silver';
      return true;
    });
    const result: string[] = [];
    for (let i = 0; i < 3; i++) {
      result.push(weighted[Math.floor(Math.random() * weighted.length)].itemId);
    }
    return result;
  }

  private randomItemByTier(tier: string): string {
    const candidates = Array.from(ITEMS_MAP.values()).filter(i => i.baseTier === tier);
    return candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)].itemId
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
    const board: SlotItem[] = hero.startingItems.map((itemId, i) => {
      const cfg = ITEMS_MAP.get(itemId)!;
      const tierIdx = Math.min(Math.floor(day / 3), 3);
      const tiers = ['bronze', 'silver', 'gold', 'diamond'] as const;
      return { itemId, tier: tiers[tierIdx], size: cfg.size, slotIndex: i };
    });
    return { heroId: hero.heroId, level, board, hp, maxHp: hp };
  }
}
