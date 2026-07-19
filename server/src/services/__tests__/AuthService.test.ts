import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { AuthService } from '../AuthService.js';
import type { IUser } from '../../models/User.js';

// 共享内存 store（测试间通过 beforeEach 清空）
const store: { users: any[]; counter: number } = { users: [], counter: 0 };

vi.mock('../../models/User.js', () => {
  class UserModel {
    static async findOne(q: any) {
      const key = Object.keys(q)[0];
      const found = store.users.find(u => u[key] === q[key]);
      if (!found) return null;
      // 返回 store 中同一引用，附加 save 方法
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

const makeUser = (over: Partial<IUser> = {}): IUser =>
  ({ _id: 'uid_1', username: 'alice', nickname: 'Alice', passwordHash: '', ...over } as IUser);

describe('AuthService', () => {
  let svc: AuthService;

  beforeEach(() => {
    store.users = [];
    store.counter = 0;
    svc = new AuthService();
    process.env.JWT_SECRET = '***';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('register', () => {
    it('should hash password with bcrypt and return access+refresh tokens', async () => {
      const res = await svc.register('alice', 'password123', 'Alice');
      expect(res.accessToken).toBeTypeOf('string');
      expect(res.refreshToken).toBeTypeOf('string');
      expect(res.expiresIn).toBe(15 * 60);
      expect(res.user).not.toHaveProperty('passwordHash');
      // refreshToken 不应明文存储（应哈希）
      const stored = store.users.find(u => u.username === 'alice');
      expect(stored.refreshToken).not.toBe(res.refreshToken);
    });

    it('should reject duplicate username', async () => {
      await svc.register('alice', 'password123');
      await expect(svc.register('alice', 'otherpass')).rejects.toThrow('用户名已存在');
    });

    it('should reject short username (<3)', async () => {
      await expect(svc.register('ab', 'password123')).rejects.toThrow();
    });

    it('should reject short password (<6)', async () => {
      await expect(svc.register('alice', '123')).rejects.toThrow();
    });

    it('should reject invalid characters in username', async () => {
      await expect(svc.register('alice@!!', 'password123')).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      await svc.register('alice', 'password123');
      const res = await svc.login('alice', 'password123');
      expect(res.accessToken).toBeTypeOf('string');
      expect(res.refreshToken).toBeTypeOf('string');
    });

    it('should reject wrong password', async () => {
      await svc.register('alice', 'password123');
      await expect(svc.login('alice', 'wrongpass')).rejects.toThrow('用户名或密码错误');
    });

    it('should not leak which username exists', async () => {
      const e1 = await svc.login('nobody', 'x').catch(e => e.message);
      await svc.register('alice', 'password123');
      const e2 = await svc.login('alice', 'wrong').catch(e => e.message);
      expect(e1).toBe(e2);
    });
  });

  describe('refresh token', () => {
    it('should issue new access token via refresh', async () => {
      const reg = await svc.register('alice', 'password123');
      const refreshed = await svc.refresh(reg.refreshToken);
      expect(refreshed).not.toBeNull();
      expect(refreshed!.accessToken).toBeTypeOf('string');
      expect(refreshed!.expiresIn).toBe(15 * 60);
    });

    it('should reject invalid refresh token', async () => {
      const result = await svc.refresh('fake_refresh_token');
      expect(result).toBeNull();
    });

    it('should reject reused refresh token after logout (token revoked)', async () => {
      const reg = await svc.register('alice', 'password123');
      // 模拟 logout：清除 refreshToken
      const user = store.users.find(u => u.username === 'alice');
      user.refreshToken = undefined;
      const result = await svc.refresh(reg.refreshToken);
      expect(result).toBeNull();
    });
  });

  describe('JWT security', () => {
    it('should reject token signed with different secret', () => {
      const forged = jwt.sign({ userId: 'uid_1' }, 'other_secret', { expiresIn: '7d' });
      expect(svc.verifyToken(forged)).toBeNull();
    });

    it('should reject expired token', () => {
      const expired = jwt.sign({ userId: 'uid_1' }, 'test_secret_123', { expiresIn: '-1h' });
      expect(svc.verifyToken(expired)).toBeNull();
    });

    it('should reject tampered payload', () => {
      const token = svc.signTokenForUser(makeUser());
      const parts = token.split('.');
      parts[1] = Buffer.from(JSON.stringify({ userId: 'uid_HACKED', username: 'hacker' })).toString('base64url');
      const tampered = parts.join('.');
      expect(svc.verifyToken(tampered)).toBeNull();
    });

    it('should reject "none" algorithm token (alg confusion)', () => {
      const noneToken = jwt.sign({ userId: 'uid_1' }, '', { algorithm: 'none' });
      expect(svc.verifyToken(noneToken)).toBeNull();
    });

    it('should extract correct userId from valid token', () => {
      const token = svc.signTokenForUser(makeUser({ _id: 'uid_42' }));
      const payload = svc.verifyToken(token);
      expect(payload?.userId).toBe('uid_42');
    });
  });
});
