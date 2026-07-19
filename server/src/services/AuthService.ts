import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserModel, type IUser } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'autocard_dev_secret_change_in_prod';
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 7;

export interface JwtPayload {
  userId: string;
  username?: string;
  type?: 'access' | 'refresh';
}

export class AuthService {
  /** 注册新用户 */
  async register(username: string, password: string, nickname?: string) {
    // 用户名格式校验：3-24 位，仅允许字母/数字/下划线
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      throw new Error('用户名须为3-24位字母、数字或下划线');
    }
    if (!password || password.length < 6) {
      throw new Error('密码至少6个字符');
    }
    const existing = await UserModel.findOne({ username });
    if (existing) throw new Error('用户名已存在');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      username,
      passwordHash,
      nickname: nickname || username,
    });

    return this.issueTokens(user);
  }

  /** 登录 */
  async login(username: string, password: string) {
    const user = await UserModel.findOne({ username });
    if (!user || !user.passwordHash) throw new Error('用户名或密码错误');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('用户名或密码错误');

    return this.issueTokens(user);
  }

  /** 为已存在用户签发 access + refresh token（供 OAuth 回调复用） */
  async issueTokens(user: IUser) {
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken();
    // 存储 refreshToken 哈希到 DB（防明文泄露）
    user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await user.save();
    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 秒
      user: { userId: user._id!.toString(), username: user.username, nickname: user.nickname },
    };
  }

  /** 用 refreshToken 换取新的 accessToken */
  async refresh(refreshToken: string): Promise<{ accessToken: string; expiresIn: number } | null> {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const user = await UserModel.findOne({ refreshToken: hash });
    if (!user) return null;
    const accessToken = this.signAccessToken(user);
    return { accessToken, expiresIn: 15 * 60 };
  }

  /** 验证 access token，返回 payload 或 null */
  verifyToken(token: string): JwtPayload | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
      if (payload.type && payload.type !== 'access') return null;
      return payload;
    } catch {
      return null;
    }
  }

  /** 为任意已存在的用户对象签发 JWT（供 OAuth 回调使用） */
  signTokenForUser(user: IUser): string {
    return this.signAccessToken(user);
  }

  private signAccessToken(user: IUser): string {
    const payload: JwtPayload = {
      userId: user._id!.toString(),
      username: user.username,
      type: 'access',
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
  }

  private signRefreshToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }
}
