import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  handleHourChoice: vi.fn(),
}));

vi.mock('../../services/RunService.js', () => ({
  RunService: class {
    handleHourChoice = mocks.handleHourChoice;
  },
}));

vi.mock('../../services/GuestUserService.js', () => ({
  getOrCreateGuestUser: vi.fn(),
}));

import { runRouter } from '../run.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  // 认证不属于本组输入契约测试的范围。
  app.use((req: any, _res, next) => {
    req.userId = 'user-1';
    next();
  });
  app.use('/api/run', runRouter);
  return app;
}

describe('POST /api/run/hour-choice input contract', () => {
  beforeEach(() => {
    mocks.handleHourChoice.mockReset();
    mocks.handleHourChoice.mockResolvedValue({ run: { id: 'run-1' }, gift: { itemId: 'gift-1' } });
  });

  it('delegates an explicit gift choice', async () => {
    const res = await request(makeApp())
      .post('/api/run/hour-choice')
      .send({ runId: 'run-1', choice: 'gift' });

    expect(res.status).toBe(200);
    expect(mocks.handleHourChoice).toHaveBeenCalledOnce();
    expect(mocks.handleHourChoice).toHaveBeenCalledWith('run-1', 'user-1', 'gift');
    expect(res.body.gift).toEqual({ itemId: 'gift-1' });
  });

  it.each([
    ['missing choice', { runId: 'run-1' }],
    ['unknown choice', { runId: 'run-1', choice: 'free-gift' }],
    ['empty choice', { runId: 'run-1', choice: '' }],
    ['non-string choice', { runId: 'run-1', choice: { value: 'gift' } }],
    ['missing runId', { choice: 'gift' }],
    ['empty runId', { runId: '   ', choice: 'gift' }],
    ['non-string runId', { runId: { $ne: null }, choice: 'gift' }],
  ])('rejects %s without invoking the service', async (_label, body) => {
    const res = await request(makeApp()).post('/api/run/hour-choice').send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTypeOf('string');
    expect(mocks.handleHourChoice).not.toHaveBeenCalled();
  });
});
