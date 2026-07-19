import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authRouter } from '../auth.js';
import { AuthService } from '../../services/AuthService.js';

// 复用 AuthService 的 mock store
const store: { users: any[]; counter: number } = { users: [], counter: 0 };

vi.mock('../../models/User.js', () => {
  class UserModel {
    static async findOne(q: any) {
      const key = Object.keys(q)[0];
      return store.users.find(u => u[key] === q[key]) || null;
    }
    static async create(data: any) {
      const u = { _id: `uid_${++store.counter}`, ...data };
      store.users.push(u);
      return u;
    }
    async save() { return this; }
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
    process.env.JWT_SECRET='***';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('POST /api/auth/register → 201 with token', async () => {
    const res = await request(makeApp())
      .post('/api/auth/register')
      .send({ username: 'alice', password: 'password123', nickname: 'Alice' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user.username).toBe('alice');
  });

  it('POST /api/auth/register → 400 for invalid username', async () => {
    const res = await request(makeApp())
      .post('/api/auth/register')
      .send({ username: 'ab', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login → token for valid creds', async () => {
    const app = makeApp();
    await request(app).post('/api/auth/register').send({ username: 'alice', password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({ username: 'alice', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf('string');
  });

  it('POST /api/auth/login → 401 for wrong password', async () => {
    const app = makeApp();
    await request(app).post('/api/auth/register').send({ username: 'alice', password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({ username: 'alice', password: 'wrong' });
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
