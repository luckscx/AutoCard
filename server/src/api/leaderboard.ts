import { Router } from 'express';
import { LeaderboardService, getCurrentSeason } from '../services/LeaderboardService.js';
import { authMiddleware } from '../middleware/auth.js';
import type { LeaderboardType } from '@autocard/shared';

const router = Router();
const leaderboardService = new LeaderboardService();

const VALID_TYPES: LeaderboardType[] = ['fastest_win', 'win_rate', 'win_streak'];

function wrap(fn: (req: any, res: any) => Promise<void>) {
  return async (req: any, res: any) => {
    try {
      await fn(req, res);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };
}

// GET /api/leaderboard?type=fastest_win&limit=50
router.get('/', wrap(async (req, res) => {
  const type = (req.query.type as string) as LeaderboardType;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  if (type && !VALID_TYPES.includes(type)) {
    res.status(400).json({ error: `Invalid type. Valid: ${VALID_TYPES.join(', ')}` });
    return;
  }

  const entries = await leaderboardService.getLeaderboard(type || 'fastest_win', limit);
  res.json({ type: type || 'fastest_win', season: getCurrentSeason(), entries });
}));

// GET /api/leaderboard/me?type=fastest_win — 我的排名
router.get('/me', authMiddleware, wrap(async (req, res) => {
  const type = (req.query.type as string) as LeaderboardType || 'fastest_win';
  if (!VALID_TYPES.includes(type)) {
    res.status(400).json({ error: `Invalid type. Valid: ${VALID_TYPES.join(', ')}` });
    return;
  }
  const rank = await leaderboardService.getUserRank(req.userId, type);
  const entries = await leaderboardService.getLeaderboard(type, 1000);
  const entry = entries.find(e => e.userId === req.userId) || null;
  res.json({ type, season: getCurrentSeason(), rank, entry });
}));

export { router as leaderboardRouter };
