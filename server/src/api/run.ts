import { Router } from 'express';
import type { HourChoiceRequest } from '@autocard/shared';
import { RunService } from '../services/RunService.js';
import { getOrCreateGuestUser } from '../services/GuestUserService.js';

const router = Router();
const runService = new RunService();

async function getUserId(req: any): Promise<string> {
  // 1. JWT 认证用户（优先）
  if (req.userId) return req.userId;

  // 2. 降级：旧版 x-user-id
  const openId = req.headers['x-user-id'] as string;
  if (!openId) throw new Error('Authentication required');

  const user = await getOrCreateGuestUser(openId);
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

const HOUR_CHOICES = new Set<HourChoiceRequest['choice']>(['shop', 'event', 'gift']);

/** 在 HTTP 边界校验，避免未知 choice 落入免费礼物分支。 */
export function parseHourChoiceRequest(body: unknown): HourChoiceRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Invalid hour-choice request body');
  }

  const { runId, choice } = body as Record<string, unknown>;
  if (typeof runId !== 'string' || runId.trim() === '') {
    throw new Error('runId must be a non-empty string');
  }
  if (typeof choice !== 'string' || !HOUR_CHOICES.has(choice as HourChoiceRequest['choice'])) {
    throw new Error('choice must be one of: shop, event, gift');
  }

  return { runId, choice: choice as HourChoiceRequest['choice'] };
}

router.post('/start', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { heroId } = req.body;
  const run = await runService.startRun(userId, heroId);
  res.json({ run });
}));

router.post('/restart', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { heroId } = req.body;
  const run = await runService.restartRun(userId, heroId);
  res.json({ run });
}));

router.get('/current', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const run = await runService.getCurrentRun(userId);
  res.json({ run });
}));

router.post('/hour-choice', wrap(async (req, res) => {
  const { runId, choice } = parseHourChoiceRequest(req.body);
  const userId = await getUserId(req);
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
  const result = await runService.buyItem(runId, userId, itemId, target, slotIndex);
  res.json(result);
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

router.post('/levelup-choice', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { runId, choiceIndex } = req.body;
  const run = await runService.handleLevelUpChoice(runId, userId, choiceIndex);
  res.json({ run });
}));

router.post('/skill-choice', wrap(async (req, res) => {
  const userId = await getUserId(req);
  const { runId, choiceId } = req.body;
  const run = await runService.handleSkillChoice(runId, userId, choiceId);
  res.json({ run });
}));

export { router as runRouter };
