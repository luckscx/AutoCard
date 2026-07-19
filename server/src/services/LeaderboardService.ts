import { RunModel, type IRun } from '../models/Run.js';
import { PvpRecordModel } from '../models/PvpRecord.js';
import { UserModel, type IUser } from '../models/User.js';
import type { LeaderboardEntry, LeaderboardMetric } from '@autocard/shared';

/** 综合评分权重 */
const SCORE_WEIGHTS = {
  win: 1000,        // 每通关一局
  pvpWin: 10,       // 每场 PvP 胜利
  day: 5,           // 每最远天数
  level: 2,         // 每级
};

interface AggregatedStat {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  wins: number;
  pvpWins: number;
  pvpBattles: number;
  farthestDay: number;
  bestLevel: number;
  score: number;
}

export class LeaderboardService {
  /** 获取排行榜（按指定指标排序，默认综合 score） */
  async getLeaderboard(metric: LeaderboardMetric = 'score', limit = 50): Promise<LeaderboardEntry[]> {
    const stats = await this.aggregateAll();

    const sorted = stats.sort((a, b) => {
      switch (metric) {
        case 'wins': return b.wins - a.wins;
        case 'pvpWins': return b.pvpWins - a.pvpWins;
        case 'farthestDay': return b.farthestDay - a.farthestDay;
        case 'bestLevel': return b.bestLevel - a.bestLevel;
        case 'score':
        default: return b.score - a.score;
      }
    });

    return sorted.slice(0, limit).map((s, i) => ({
      rank: i + 1,
      userId: s.userId,
      nickname: s.nickname,
      avatarUrl: s.avatarUrl,
      score: s.score,
      wins: s.wins,
      pvpWins: s.pvpWins,
      pvpWinRate: s.pvpBattles ? s.pvpWins / s.pvpBattles : 0,
      farthestDay: s.farthestDay,
      bestLevel: s.bestLevel,
    }));
  }

  /** 获取指定用户排名 */
  async getUserRank(userId: string, metric: LeaderboardMetric = 'score'): Promise<number | null> {
    const board = await this.getLeaderboard(metric, 1000);
    const idx = board.findIndex(e => e.userId === userId);
    return idx >= 0 ? idx + 1 : null;
  }

  /** 聚合所有用户的战绩统计 */
  private async aggregateAll(): Promise<AggregatedStat[]> {
    const [runs, pvpRecords, users] = await Promise.all([
      RunModel.find({}).lean<IRun[]>(),
      PvpRecordModel.find({}).lean(),
      UserModel.find({}).lean<IUser[]>(),
    ]);

    const userMap = new Map(users.map(u => [u._id!.toString(), u]));

    // 按 userId 聚合 Run
    const runAgg = new Map<string, { wins: number; farthestDay: number; bestLevel: number }>();
    for (const r of runs) {
      const uid = r.userId.toString();
      const agg = runAgg.get(uid) ?? { wins: 0, farthestDay: 0, bestLevel: 0 };
      if (r.status === 'finished_win') agg.wins += 1;
      agg.farthestDay = Math.max(agg.farthestDay, r.day);
      agg.bestLevel = Math.max(agg.bestLevel, r.level);
      runAgg.set(uid, agg);
    }

    // 按 userId 聚合 PvP
    const pvpAgg = new Map<string, { wins: number; battles: number }>();
    for (const rec of pvpRecords) {
      const uid = rec.userId.toString();
      const agg = pvpAgg.get(uid) ?? { wins: 0, battles: 0 };
      agg.battles += 1;
      if (rec.won) agg.wins += 1;
      pvpAgg.set(uid, agg);
    }

    // 合并
    const allUserIds = new Set([...runAgg.keys(), ...pvpAgg.keys()]);
    const result: AggregatedStat[] = [];

    for (const uid of allUserIds) {
      const user = userMap.get(uid);
      const ra = runAgg.get(uid) ?? { wins: 0, farthestDay: 0, bestLevel: 0 };
      const pa = pvpAgg.get(uid) ?? { wins: 0, battles: 0 };

      const score =
        ra.wins * SCORE_WEIGHTS.win +
        pa.wins * SCORE_WEIGHTS.pvpWin +
        ra.farthestDay * SCORE_WEIGHTS.day +
        ra.bestLevel * SCORE_WEIGHTS.level;

      result.push({
        userId: uid,
        nickname: user?.nickname ?? `Player_${uid.slice(0, 6)}`,
        avatarUrl: user?.avatarUrl,
        wins: ra.wins,
        pvpWins: pa.wins,
        pvpBattles: pa.battles,
        farthestDay: ra.farthestDay,
        bestLevel: ra.bestLevel,
        score,
      });
    }

    return result;
  }
}
