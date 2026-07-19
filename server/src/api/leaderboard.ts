import { Router } from 'express';
import { LeaderboardService } from '../services/LeaderboardService.js';
import type { LeaderboardMetric } from '@autocard/shared';

const router = Router();
const leaderboardService = new LeaderboardService();

const VALID_METRICS: LeaderboardMetric[] = ['score', 'wins', 'pvpWins', 'farthestDay', 'bestLevel'];

function wrap(fn: (req: any, res: any) => Promise<void>) {
  return async (req: any, res: any) => {
    try {
      await fn(req, res);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };
}

// GET /api/leaderboard?metric=score&limit=50
router.get('/', wrap(async (req, res) => {
  const metric = (req.query.metric as string) as LeaderboardMetric;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  if (metric && !VALID_METRICS.includes(metric)) {
    res.status(400).json({ error: `Invalid metric. Valid: ${VALID_METRICS.join(', ')}` });
    return;
  }

  const entries = await leaderboardService.getLeaderboard(metric || 'score', limit);
  res.json({ metric: metric || 'score', entries });
}));

export { router as leaderboardRouter };
