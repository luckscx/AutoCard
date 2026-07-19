import { RunModel, type IRun } from '../models/Run.js';
import { PvpRecordModel, type IPvpRecord } from '../models/PvpRecord.js';
import { UserModel } from '../models/User.js';

/** 单局历史（基于 Run 完成态聚合） */
export interface RunHistoryEntry {
  runId: string;
  heroId: string;
  status: string;
  day: number;
  pvpWins: number;
  level: number;
  finishedAt: string;
}

/** 玩家档案聚合结果 */
export interface PlayerProfile {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  totalRuns: number;
  wins: number;          // 达成 10 胜通关的局数
  losses: number;        // 声望归零失败的局数
  totalPvpBattles: number;
  pvpWins: number;
  pvpLosses: number;
  pvpWinRate: number;    // 0~1
  farthestDay: number;   // 历史最远天数
  bestLevel: number;     // 历史最高等级
  favoriteHero: string | null;  // 出场次数最多的英雄
  heroStats: { heroId: string; runs: number; pvpWins: number; pvpLosses: number }[];
  recentRuns: RunHistoryEntry[];
  recentPvp: {
    day: number;
    won: boolean;
    heroId: string;
    opponentHeroId: string;
    opponentLevel: number;
    hpLeft: number;
    maxHp: number;
    createdAt: string;
  }[];
}

export class ProfileService {
  /** 聚合指定用户的完整档案与战绩统计 */
  async getProfile(userId: string, recentLimit = 20): Promise<PlayerProfile> {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error('User not found');

    // 1. 历史 Run 聚合
    const runs = await RunModel.find({ userId }).lean<IRun[]>();
    const totalRuns = runs.length;

    let wins = 0;
    let losses = 0;
    let farthestDay = 0;
    let bestLevel = 0;
    const heroRunCount = new Map<string, number>();
    for (const run of runs) {
      if (run.status === 'finished_win') wins++;
      if (run.status === 'finished_lose') losses++;
      farthestDay = Math.max(farthestDay, run.day);
      bestLevel = Math.max(bestLevel, run.level);
      heroRunCount.set(run.heroId, (heroRunCount.get(run.heroId) ?? 0) + 1);
    }

    // 统计字段必须覆盖完整历史；recentLimit 仅限制展示列表。
    const recentRuns: RunHistoryEntry[] = runs
      .slice()
      .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
      .slice(0, recentLimit)
      .map((r) => ({
        runId: r._id!.toString(),
        heroId: r.heroId,
        status: r.status,
        day: r.day,
        pvpWins: r.pvpWins,
        level: r.level,
        finishedAt: (r.updatedAt ?? r.createdAt).toISOString(),
      }));

    const favoriteHero = heroRunCount.size
      ? [...heroRunCount.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : null;

    // 2. PvP 战绩聚合
    const pvpRecords = await PvpRecordModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean<IPvpRecord[]>();

    const totalPvpBattles = pvpRecords.length;
    const pvpWins = pvpRecords.filter((r) => r.won).length;
    const pvpLosses = totalPvpBattles - pvpWins;
    const pvpWinRate = totalPvpBattles ? pvpWins / totalPvpBattles : 0;

    const heroStatsMap = new Map<string, { heroId: string; runs: number; pvpWins: number; pvpLosses: number }>();
    for (const rec of pvpRecords) {
      const entry = heroStatsMap.get(rec.heroId) ?? { heroId: rec.heroId, runs: 0, pvpWins: 0, pvpLosses: 0 };
      entry.runs += 1;
      if (rec.won) entry.pvpWins += 1;
      else entry.pvpLosses += 1;
      heroStatsMap.set(rec.heroId, entry);
    }

    const recentPvp = pvpRecords.slice(0, recentLimit).map((r) => ({
      day: r.day,
      won: r.won,
      heroId: r.heroId,
      opponentHeroId: r.opponentHeroId,
      opponentLevel: r.opponentLevel,
      hpLeft: r.hpLeft,
      maxHp: r.maxHp,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      userId,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      totalRuns,
      wins,
      losses,
      totalPvpBattles,
      pvpWins,
      pvpLosses,
      pvpWinRate,
      farthestDay,
      bestLevel,
      favoriteHero,
      heroStats: [...heroStatsMap.values()],
      recentRuns,
      recentPvp,
    };
  }
}
