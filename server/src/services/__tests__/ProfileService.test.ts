import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUserById: vi.fn(),
  findRuns: vi.fn(),
  findPvpRecords: vi.fn(),
  sortPvpRecords: vi.fn(),
}));

vi.mock('../../models/User.js', () => ({
  UserModel: { findById: mocks.findUserById },
}));
vi.mock('../../models/Run.js', () => ({
  RunModel: { find: mocks.findRuns },
}));
vi.mock('../../models/PvpRecord.js', () => ({
  PvpRecordModel: { find: mocks.findPvpRecords },
}));

import { ProfileService } from '../ProfileService.js';

const date = (value: string) => new Date(value);
const run = (overrides: Record<string, unknown> = {}) => ({
  _id: { toString: () => 'run-default' },
  heroId: 'hero-a',
  status: 'active',
  day: 1,
  pvpWins: 0,
  level: 1,
  createdAt: date('2026-01-01T00:00:00.000Z'),
  updatedAt: date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});
const pvp = (overrides: Record<string, unknown> = {}) => ({
  day: 1,
  won: true,
  heroId: 'hero-a',
  opponentHeroId: 'hero-b',
  opponentLevel: 2,
  hpLeft: 10,
  maxHp: 100,
  createdAt: date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('ProfileService', () => {
  const service = new ProfileService();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUserById.mockResolvedValue({ nickname: '测试玩家', avatarUrl: 'https://avatar.example/a.png' });
    mocks.findRuns.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    mocks.sortPvpRecords.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    mocks.findPvpRecords.mockReturnValue({ sort: mocks.sortPvpRecords });
  });

  it('统计完整历史，而非只统计最近展示的对局', async () => {
    mocks.findRuns.mockReturnValue({ lean: vi.fn().mockResolvedValue([
      run({ _id: { toString: () => 'old-win' }, heroId: 'hero-old', status: 'finished_win', day: 12, level: 9, updatedAt: date('2026-01-01') }),
      run({ _id: { toString: () => 'recent-loss' }, heroId: 'hero-new', status: 'finished_lose', day: 3, level: 2, updatedAt: date('2026-01-03') }),
      run({ _id: { toString: () => 'recent-win' }, heroId: 'hero-old', status: 'finished_win', day: 5, level: 4, updatedAt: date('2026-01-02') }),
    ]) });

    const profile = await service.getProfile('u1', 2);

    expect(profile).toMatchObject({
      totalRuns: 3,
      wins: 2,
      losses: 1,
      farthestDay: 12,
      bestLevel: 9,
      favoriteHero: 'hero-old',
    });
    expect(profile.recentRuns.map((entry) => entry.runId)).toEqual(['recent-loss', 'recent-win']);
  });

  it('按更新时间倒序展示最近对局，并在没有 updatedAt 时回退到 createdAt', async () => {
    mocks.findRuns.mockReturnValue({ lean: vi.fn().mockResolvedValue([
      run({ _id: { toString: () => 'created-only' }, createdAt: date('2026-02-03T00:00:00.000Z'), updatedAt: undefined }),
      run({ _id: { toString: () => 'older' }, updatedAt: date('2026-02-01T00:00:00.000Z') }),
    ]) });

    const profile = await service.getProfile('u1', 2);

    expect(profile.recentRuns.map((entry) => entry.runId)).toEqual(['older', 'created-only']);
    expect(profile.recentRuns[1].finishedAt).toBe('2026-02-03T00:00:00.000Z');
  });

  it('聚合 PvP 胜负、英雄战绩并限制最近记录', async () => {
    mocks.sortPvpRecords.mockReturnValue({ lean: vi.fn().mockResolvedValue([
      pvp({ won: true, heroId: 'hero-a' }),
      pvp({ won: false, heroId: 'hero-a', day: 2 }),
      pvp({ won: true, heroId: 'hero-b', day: 3 }),
    ]) });

    const profile = await service.getProfile('u1', 2);

    expect(mocks.findPvpRecords).toHaveBeenCalledWith({ userId: 'u1' });
    expect(mocks.sortPvpRecords).toHaveBeenCalledWith({ createdAt: -1 });
    expect(profile).toMatchObject({ totalPvpBattles: 3, pvpWins: 2, pvpLosses: 1, pvpWinRate: 2 / 3 });
    expect(profile.heroStats).toEqual([
      { heroId: 'hero-a', runs: 2, pvpWins: 1, pvpLosses: 1 },
      { heroId: 'hero-b', runs: 1, pvpWins: 1, pvpLosses: 0 },
    ]);
    expect(profile.recentPvp).toHaveLength(2);
  });

  it('用户不存在时不继续查询对局数据', async () => {
    mocks.findUserById.mockResolvedValue(null);

    await expect(service.getProfile('missing')).rejects.toThrow('User not found');
    expect(mocks.findRuns).not.toHaveBeenCalled();
    expect(mocks.findPvpRecords).not.toHaveBeenCalled();
  });

  it('空历史返回稳定的零值档案', async () => {
    const profile = await service.getProfile('u1');

    expect(profile).toMatchObject({
      totalRuns: 0, wins: 0, losses: 0, farthestDay: 0, bestLevel: 0,
      favoriteHero: null, totalPvpBattles: 0, pvpWins: 0, pvpLosses: 0, pvpWinRate: 0,
      recentRuns: [], recentPvp: [], heroStats: [],
    });
  });
});
