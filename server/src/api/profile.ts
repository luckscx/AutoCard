import { Router } from 'express';
import { ProfileService } from '../services/ProfileService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const profileService = new ProfileService();

router.use(authMiddleware);

// GET /api/profile — 玩家档案与战绩统计
router.get('/', async (req: any, res: any) => {
  try {
    const profile = await profileService.getProfile(req.userId);
    res.json({ profile });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/profile/history — 分页查询历史对局
router.get('/history', async (req: any, res: any) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 10));
    const profile = await profileService.getProfile(req.userId, pageSize * page);
    const start = (page - 1) * pageSize;
    const recentRuns = profile.recentRuns.slice(start, start + pageSize);
    res.json({
      history: recentRuns,
      page,
      pageSize,
      total: profile.totalRuns,
      hasMore: start + pageSize < profile.totalRuns,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export { router as profileRouter };
