import { Router } from 'express';
import { UserModel } from '../models/User.js';
import { getOrCreateGuestUser } from '../services/GuestUserService.js';

const router = Router();

async function resolveUser(req: any) {
  // 1. JWT 认证用户（优先）
  if (req.userId) {
    const user = await UserModel.findById(req.userId);
    if (!user) throw new Error('User not found');
    return { user, openId: user.openId || user.username || req.userId };
  }

  // 2. 降级：旧版 x-user-id
  const openId = req.headers['x-user-id'] as string;
  if (!openId) throw new Error('Authentication required');
  const user = await getOrCreateGuestUser(openId);
  return { user, openId };
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

router.get('/me', wrap(async (req, res) => {
  const { user, openId } = await resolveUser(req);
  res.json({
    userId: user._id!.toString(),
    nickname: user.nickname,
    username: user.username,
    openId,
    avatarUrl: user.avatarUrl,
    oauthProviders: user.oauthProviders?.map(p => ({ provider: p.provider, providerId: p.providerId })),
  });
}));

router.patch('/nickname', wrap(async (req, res) => {
  const { user, openId } = await resolveUser(req);
  const nick = String(req.body.nickname ?? '').trim().slice(0, 24);
  if (nick.length < 1) throw new Error('昵称不能为空');
  user.nickname = nick;
  await user.save();
  res.json({
    userId: user._id!.toString(),
    nickname: user.nickname,
    username: user.username,
    openId,
  });
}));

export { router as userRouter };
