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
    it('should hash password with bcrypt', async () => {
      const res = await svc.register('alice', 'password123', 'Alice');
      expect(res.token).toBeTypeOf('string');
      expect(res.user).not.toHaveProperty('passwordHash');
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
    it('should return token for valid credentials', async () => {
      await svc.register('alice', 'password123');
      const res = await svc.login('alice', 'password123');
      expect(res.token).toBeTypeOf('string');
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
