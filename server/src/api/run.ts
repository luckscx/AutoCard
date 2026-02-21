import { Router } from 'express';
import { RunService } from '../services/RunService.js';
import { UserModel } from '../models/User.js';

const router = Router();
const runService = new RunService();

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

router.post('/start', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { heroId } = req.body;
  const run = await runService.startRun(userId, heroId);
  res.json({ run });
}));

router.get('/current', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const run = await runService.getCurrentRun(userId);
  res.json({ run });
}));

router.post('/hour-choice', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { runId, choice } = req.body;
  const result = await runService.handleHourChoice(runId, userId, choice);
  res.json(result);
}));

router.post('/pve', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { runId, difficulty } = req.body;
  const result = await runService.handlePve(runId, userId, difficulty);
  res.json(result);
}));

router.post('/pvp', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { runId } = req.body;
  const result = await runService.handlePvp(runId, userId);
  res.json(result);
}));

router.post('/buy', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { runId, itemId, target, slotIndex } = req.body;
  const run = await runService.buyItem(runId, userId, itemId, target, slotIndex);
  res.json({ run });
}));

router.post('/shop/refresh', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { runId } = req.body;
  const result = await runService.refreshShopOnce(runId, userId);
  res.json(result);
}));

router.post('/shop/leave', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { runId } = req.body;
  const run = await runService.leaveShop(runId, userId);
  res.json({ run });
}));

router.post('/event', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { runId, eventId, optionIndex } = req.body;
  const result = await runService.handleEvent(runId, userId, eventId, optionIndex);
  res.json(result);
}));

router.post('/board/sell', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { runId, from, slotIndex } = req.body;
  const result = await runService.sellItem(runId, userId, from, slotIndex);
  res.json(result);
}));

router.post('/board/swap', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { runId, target, indexA, indexB } = req.body;
  const run = await runService.swapItems(runId, userId, target, indexA, indexB);
  res.json({ run });
}));

router.post('/board/place', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { runId, from, fromIndex, to, toIndex } = req.body;
  const run = await runService.placeItem(runId, userId, from, fromIndex, to, toIndex);
  res.json({ run });
}));

router.post('/board/merge', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { runId, target, indexA, indexB } = req.body;
  const result = await runService.mergeItems(runId, userId, target, indexA, indexB);
  res.json(result);
}));

export { router as runRouter };
