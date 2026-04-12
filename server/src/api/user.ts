import { Router } from 'express';
import { UserModel } from '../models/User.js';

const router = Router();

async function resolveUser(req: any) {
  const openId = req.headers['x-user-id'] as string;
  if (!openId) throw new Error('Missing x-user-id header');
  let user = await UserModel.findOne({ openId });
  if (!user) {
    user = await UserModel.create({ openId, nickname: `Player_${openId.slice(0, 6)}` });
  }
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
    openId,
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
    openId,
  });
}));

export { router as userRouter };
