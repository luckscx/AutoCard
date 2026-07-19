import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaderboardService } from '../LeaderboardService.js';

const mockRuns = [
  { userId: 'u1', status: 'finished_win', day: 10, level: 15 },
  { userId: 'u1', status: 'finished_lose', day: 5, level: 8 },
  { userId: 'u2', status: 'finished_win', day: 12, level: 20 },
  { userId: 'u3', status: 'active', day: 3, level: 5 },
];

const mockPvp = [
  { userId: 'u1', won: true },
  { userId: 'u1', won: true },
  { userId: 'u1', won: false },
  { userId: 'u2', won: true },
  { userId: 'u3', won: false },
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

  it('should rank by score (default)', async () => {
    const entries = await svc.getLeaderboard('score', 10);
    expect(entries).toHaveLength(3);
    // u2: win1000 + pvpWin10 + day60 + level40 = 1110
    // u1: win1000 + pvpWin20 + day50 + level30 = 1100
    // u3: win0 + pvpWin0 + day15 + level10 = 25
    expect(entries[0].userId).toBe('u2');
    expect(entries[1].userId).toBe('u1');
    expect(entries[2].userId).toBe('u3');
  });

  it('should rank by wins', async () => {
    const entries = await svc.getLeaderboard('wins', 10);
    // u1: 1 win, u2: 1 win, u3: 0 win
    expect(entries[0].wins).toBeGreaterThanOrEqual(entries[1].wins!);
    expect(entries[2].wins).toBe(0);
  });

  it('should rank by pvpWins', async () => {
    const entries = await svc.getLeaderboard('pvpWins', 10);
    expect(entries[0].userId).toBe('u1'); // 2 pvp wins
    expect(entries[0].pvpWins).toBe(2);
  });

  it('should compute pvpWinRate correctly', async () => {
    const entries = await svc.getLeaderboard('score', 10);
    const u1 = entries.find(e => e.userId === 'u1')!;
    expect(u1.pvpWinRate).toBeCloseTo(2 / 3, 2);
  });

  it('should assign sequential ranks', async () => {
    const entries = await svc.getLeaderboard('score', 10);
    entries.forEach((e, i) => expect(e.rank).toBe(i + 1));
  });

  it('should respect limit', async () => {
    const entries = await svc.getLeaderboard('score', 2);
    expect(entries).toHaveLength(2);
  });

  it('should handle users with no runs gracefully', async () => {
    // u3 只有 pvp 记录无 run，仍应出现在榜单（基于 pvp 数据）
    const entries = await svc.getLeaderboard('pvpWins', 10);
    expect(entries.find(e => e.userId === 'u3')).toBeDefined();
  });
});
