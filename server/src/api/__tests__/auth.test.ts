import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authRouter } from '../auth.js';

const store: { users: any[]; counter: number } = { users: [], counter: 0 };

vi.mock('../../models/User.js', () => {
  class UserModel {
    static async findOne(q: any) {
      const key = Object.keys(q)[0];
      const found = store.users.find(u => u[key] === q[key]);
      if (!found) return null;
      found.save = async function () { return this; };
      return found;
    }
    static async create(data: any) {
      const u: any = { _id: `uid_${++store.counter}`, ...data };
      u.save = async function () { return this; };
      store.users.push(u);
      return u;
    }
  }
  return { UserModel: UserModel as any, IUser: {} as any };
});

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

describe('Auth API routes', () => {
  beforeEach(() => {
    store.users = [];
    store.counter = 0;
    process.env.JWT_SECRET = 'test_secret_123';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('POST /api/auth/register → 201 with tokens', async () => {
    const res = await request(makeApp())
      .post('/api/auth/register')
      .send({ username: 'alice', password: 'password123', nickname: 'Alice' });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTypeOf('string');
    expect(res.body.refreshToken).toBeTypeOf('string');
    expect(res.body.user.username).toBe('alice');
  });

  it('POST /api/auth/register → 400 for invalid username', async () => {
    const res = await request(makeApp())
      .post('/api/auth/register')
      .send({ username: 'ab', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login → tokens for valid creds', async () => {
    const app = makeApp();
    await request(app).post('/api/auth/register').send({ username: 'alice', password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({ username: 'alice', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTypeOf('string');
    expect(res.body.refreshToken).toBeTypeOf('string');
  });

  it('POST /api/auth/login → 401 for wrong password', async () => {
    const app = makeApp();
    await request(app).post('/api/auth/register').send({ username: 'alice', password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({ username: 'alice', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/refresh → new access token', async () => {
    const app = makeApp();
    const reg = await request(app).post('/api/auth/register').send({ username: 'alice', password: 'password123' });
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: reg.body.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTypeOf('string');
  });

  it('POST /api/auth/refresh → 401 for invalid refresh token', async () => {
    const res = await request(makeApp()).post('/api/auth/refresh').send({ refreshToken: 'fake' });
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/github → 500 when not configured', async () => {
    delete process.env.GITHUB_CLIENT_ID;
    const res = await request(makeApp()).get('/api/auth/github');
    expect(res.status).toBe(500);
  });

  it('GET /api/auth/wechat → 500 when not configured', async () => {
    delete process.env.WECHAT_APPID;
    const res = await request(makeApp()).get('/api/auth/wechat');
    expect(res.status).toBe(500);
  });
});
