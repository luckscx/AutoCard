import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { UserModel, type IUser } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'autocard_dev_secret_change_in_prod';

export interface JwtPayload {
  userId: string;
  username?: string;
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

    const token = this.signToken(user);
    return {
      token,
      user: { userId: user._id.toString(), username: user.username, nickname: user.nickname },
    };
  }

  /** 登录 */
  async login(username: string, password: string) {
    const user = await UserModel.findOne({ username });
    if (!user || !user.passwordHash) throw new Error('用户名或密码错误');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('用户名或密码错误');

    const token = this.signToken(user);
    return {
      token,
      user: { userId: user._id.toString(), username: user.username, nickname: user.nickname },
    };
  }

  /** 验证 JWT token，返回 payload 或 null */
  verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
    } catch {
      return null;
    }
  }

  /** 为任意已存在的用户对象签发 JWT（供 OAuth 回调使用） */
  signTokenForUser(user: IUser): string {
    return this.signToken(user);
  }

  private signToken(user: IUser): string {
    const payload: JwtPayload = {
      userId: user._id.toString(),
      username: user.username,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }
}
