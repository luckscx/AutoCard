import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaderboardService } from '../LeaderboardService.js';

const mockRuns = [
  { userId: 'u1', status: 'finished_win', day: 10, level: 15 },
  { userId: 'u1', status: 'finished_lose', day: 5, level: 8 },
  { userId: 'u2', status: 'finished_win', day: 7, level: 20 },
  { userId: 'u3', status: 'active', day: 3, level: 5 },
];

// PvP 记录需带 createdAt 供连胜计算
const mockPvp = [
  { userId: 'u1', won: true, createdAt: new Date('2026-01-01') },
  { userId: 'u1', won: true, createdAt: new Date('2026-01-02') },
  { userId: 'u1', won: false, createdAt: new Date('2026-01-03') },
  { userId: 'u2', won: true, createdAt: new Date('2026-01-01') },
  { userId: 'u3', won: false, createdAt: new Date('2026-01-01') },
];

const mockUsers = [
  { _id: 'u1', nickname: 'Alice', avatarUrl: 'http://a.png' },
  { _id: 'u2', nickname: 'Bob' },
  { _id: 'u3', nickname: 'Carol' },
];

vi.mock('../../models/Run.js', () => ({
  RunModel: { find: () => ({ lean: () => Promise.resolve(mockRuns) }) },
}));
vi.mock('../../models/PvpRecord.js', () => ({
  PvpRecordModel: { find: () => ({ lean: () => Promise.resolve(mockPvp) }) },
}));
vi.mock('../../models/User.js', () => ({
  UserModel: { find: () => ({ lean: () => Promise.resolve(mockUsers) }) },
}));

describe('LeaderboardService', () => {
  let svc: LeaderboardService;

  beforeEach(() => {
    svc = new LeaderboardService();
  });

  it('should rank by fastest_win (smaller day first)', async () => {
    const entries = await svc.getLeaderboard('fastest_win', 10);
    // u2 通关 day=7, u1 通关 day=10, u3 未通关排最后
    expect(entries[0].userId).toBe('u2');
    expect(entries[0].fastestWinDay).toBe(7);
    expect(entries[1].userId).toBe('u1');
    expect(entries[1].fastestWinDay).toBe(10);
    // u3 未通关，fastestWinDay 为 null
    const u3 = entries.find(e => e.userId === 'u3')!;
    expect(u3.fastestWinDay).toBeNull();
  });

  it('should rank by win_rate (top 50 with >=10 battles)', async () => {
    const entries = await svc.getLeaderboard('win_rate', 50);
    // u1: 2/3 ≈ 66.7%, u2: 1/1 = 100%, u3: 0/1 = 0%
    // 都不足 10 场，但 win_rate 过滤条件是 >=10 场才上榜
    // 这里数据不足 10 场，全部被过滤 -> 空榜（符合设计：胜率榜需足够样本）
    expect(entries.every(e => e.totalBattles >= 10)).toBe(true);
  });

  it('should rank by win_streak', async () => {
    const entries = await svc.getLeaderboard('win_streak', 10);
    // u1 最后一场输 -> streak 0; u2 最后一场赢 -> streak 1; u3 输 -> 0
    const u2 = entries.find(e => e.userId === 'u2')!;
    expect(u2.winStreak).toBe(1);
    const u1 = entries.find(e => e.userId === 'u1')!;
    expect(u1.winStreak).toBe(0);
  });

  it('should compute winRate correctly', async () => {
    const entries = await svc.getLeaderboard('win_streak', 10);
    const u1 = entries.find(e => e.userId === 'u1')!;
    expect(u1.winRate).toBeCloseTo(2 / 3, 2);
    expect(u1.totalBattles).toBe(3);
  });

  it('should assign sequential ranks', async () => {
    const entries = await svc.getLeaderboard('fastest_win', 10);
    entries.forEach((e, i) => expect(e.rank).toBe(i + 1));
  });

  it('should respect limit', async () => {
    const entries = await svc.getLeaderboard('fastest_win', 2);
    expect(entries).toHaveLength(2);
  });

  it('should include users with pvp but no runs', async () => {
    const entries = await svc.getLeaderboard('win_streak', 10);
    expect(entries.find(e => e.userId === 'u3')).toBeDefined();
  });

  it('getUserRank returns correct rank', async () => {
    const rank = await svc.getUserRank('u2', 'fastest_win');
    expect(rank).toBe(1);
  });

  it('getCurrentSeason returns YYYY-MM format', async () => {
    const { getCurrentSeason } = await import('../LeaderboardService.js');
    const season = getCurrentSeason();
    expect(season).toMatch(/^\d{4}-\d{2}$/);
  });
});
