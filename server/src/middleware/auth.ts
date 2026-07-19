import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';

const authService = new AuthService();

/** 扩展 Express Request 类型以注入用户信息 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      username?: string;
    }
  }
}

/**
 * JWT 认证中间件。
 * 优先读取 Authorization: Bearer <token>
 * 降级兼容旧版 x-user-id header（匿名用户）
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. 尝试 JWT 认证
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = authService.verifyToken(token);
    if (payload) {
      req.userId = payload.userId;
      req.username = payload.username;
      return next();
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // 2. 降级：兼容旧版 x-user-id（匿名用户）
  const openId = req.headers['x-user-id'] as string | undefined;
  if (openId) {
    // 旧版匿名模式不设 req.userId，由各路由自行处理
    return next();
  }

  return res.status(401).json({ error: 'Authentication required' });
}

/**
 * 可选认证中间件：有 token 则解析，无 token 也放行（用于兼容期）
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = authService.verifyToken(token);
    if (payload) {
      req.userId = payload.userId;
      req.username = payload.username;
    }
  }
  next();
}

export { authService };
