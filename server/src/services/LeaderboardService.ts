import { RunModel, type IRun } from '../models/Run.js';
import { PvpRecordModel, type IPvpRecord } from '../models/PvpRecord.js';
import { UserModel, type IUser } from '../models/User.js';
import type { LeaderboardEntry, LeaderboardType } from '@autocard/shared';

/** 赛季计算：每月重置，格式 YYYY-MM */
export function getCurrentSeason(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

interface AggregatedStat {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  fastestWinDay: number | null;   // 首次通关（10胜）到达的 day，越小越好；null=未通关
  winRate: number;                // 0~1
  totalBattles: number;
  winStreak: number;              // 当前/历史最长连胜（按 PvP 顺序）
}

export class LeaderboardService {
  /**
   * 获取排行榜（按指定类型排序）
   * - fastest_win: day 升序（越快通关越靠前）
   * - win_rate:    胜率降序（top 50）
   * - win_streak:  连胜降序
   */
  async getLeaderboard(type: LeaderboardType = 'fastest_win', limit = 50): Promise<LeaderboardEntry[]> {
    const stats = await this.aggregateAll();
    const sorted = stats.sort((a, b) => {
      switch (type) {
        case 'fastest_win': {
          // 未通关的排在后面；已通关的按 day 升序
          if (a.fastestWinDay == null && b.fastestWinDay == null) return 0;
          if (a.fastestWinDay == null) return 1;
          if (b.fastestWinDay == null) return -1;
          return a.fastestWinDay - b.fastestWinDay;
        }
        case 'win_rate':
          if (a.totalBattles === 0 && b.totalBattles === 0) return 0;
          if (a.totalBattles === 0) return 1;
          if (b.totalBattles === 0) return -1;
          return b.winRate - a.winRate;
        case 'win_streak':
        default:
          return b.winStreak - a.winStreak;
      }
    });

    const capped = type === 'win_rate' ? sorted.filter(s => s.totalBattles >= 10).slice(0, 50) : sorted.slice(0, limit);

    return capped.map((s, i) => ({
      rank: i + 1,
      userId: s.userId,
      nickname: s.nickname,
      avatarUrl: s.avatarUrl,
      fastestWinDay: s.fastestWinDay,
      winRate: s.winRate,
      winStreak: s.winStreak,
      totalBattles: s.totalBattles,
    }));
  }

  /** 获取指定用户在某种排行榜中的排名（未上榜返回 null） */
  async getUserRank(userId: string, type: LeaderboardType = 'fastest_win'): Promise<number | null> {
    const board = await this.getLeaderboard(type, 1000);
    const idx = board.findIndex(e => e.userId === userId);
    return idx >= 0 ? idx + 1 : null;
  }

  /** 聚合所有用户战绩 */
  private async aggregateAll(): Promise<AggregatedStat[]> {
    const [runs, pvpRecords, users] = await Promise.all([
      RunModel.find({}).lean<IRun[]>(),
      PvpRecordModel.find({}).lean<IPvpRecord[]>(),
      UserModel.find({}).lean<IUser[]>(),
    ]);

    const userMap = new Map(users.map(u => [u._id!.toString(), u]));

    // 每个用户聚合：最快通关 day + PvP 连胜/胜率
    const result: AggregatedStat[] = [];
    const userIds = new Set([...runs.map(r => r.userId.toString()), ...pvpRecords.map(r => r.userId.toString())]);

    for (const uid of userIds) {
      const userRuns = runs.filter(r => r.userId.toString() === uid);
      const userPvp = pvpRecords.filter(r => r.userId.toString() === uid)
        .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));

      // fastest_win: 第一个 finished_win 的 day
      const firstWin = userRuns.find(r => r.status === 'finished_win');
      const fastestWinDay = firstWin ? firstWin.day : null;

      // win_rate + win_streak
      const totalBattles = userPvp.length;
      const pvpWins = userPvp.filter(r => r.won).length;
      const winRate = totalBattles ? pvpWins / totalBattles : 0;

      // 连胜：从后往前数连续 won
      let streak = 0;
      for (let i = userPvp.length - 1; i >= 0; i--) {
        if (userPvp[i].won) streak++;
        else break;
      }

      const user = userMap.get(uid);
      result.push({
        userId: uid,
        nickname: user?.nickname ?? `Player_${uid.slice(0, 6)}`,
        avatarUrl: user?.avatarUrl,
        fastestWinDay,
        winRate,
        totalBattles,
        winStreak: streak,
      });
    }

    return result;
  }
}
