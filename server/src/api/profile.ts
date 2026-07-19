import { Router } from 'express';
import { ProfileService } from '../services/ProfileService.js';
import { UserModel } from '../models/User.js';

const router = Router();
const profileService = new ProfileService();

async function getUserId(req: any): Promise<string> {
  const openId = req.headers['x-user-id'] as string;
  if (!openId) throw new Error('Missing x-user-id header');

  let user = await UserModel.findOne({ openId });
  if (!user) {
    user = await UserModel.create({ openId, nickname: `Player_${openId.slice(0, 6)}` });
  }
  return user._id!.toString();
}

function wrap(fn: (req: any, res: any) => Promise<void>) {
  return async (req: any, res: any) => {
    try {
      await fn(req, res);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };
}

// GET /api/profile — 玩家档案与战绩统计
router.get('/', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const profile = await profileService.getProfile(userId);
  res.json({ profile });
}));

export { router as profileRouter };
