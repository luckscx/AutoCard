import { Router } from 'express';
import { UserModel } from '../models/User.js';

const router = Router();

/**
 * GitHub OAuth 登录入口
 * 重定向用户到 GitHub 授权页面
 */
router.get('/github', (_req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(500).json({ error: 'GitHub OAuth 未配置' });
    return;
  }
  const redirectUri = `${process.env.GITHUB_CALLBACK_URL || `${process.env.SERVER_URL || 'http://localhost:3000'}/api/auth/github/callback`}`;
  const state = crypto.randomUUID();
  // 将 state 暂存到 cookie 用于回调校验
  res.cookie('oauth_state', state, { httpOnly: true, maxAge: 600_000, sameSite: 'lax' });
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=user:email`;
  res.redirect(githubAuthUrl);
});

/**
 * GitHub OAuth 回调
 * 用 code 换取 access_token，再获取用户信息
 */
router.get('/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    const cookieState = req.cookies?.oauth_state;

    // 校验 state 防止 CSRF
    if (!code || !state || state !== cookieState) {
      res.status(400).json({ error: '无效的 OAuth 回调参数' });
      return;
    }
    res.clearCookie('oauth_state');

    const clientId = process.env.GITHUB_CLIENT_ID!;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET!;
    const redirectUri = `${process.env.GITHUB_CALLBACK_URL || `${process.env.SERVER_URL || 'http://localhost:3000'}/api/auth/github/callback`}`;

    // 第一步：用 code 换 access_token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        state,
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      console.error('GitHub token exchange failed:', tokenData);
      res.status(400).json({ error: 'GitHub 授权失败' });
      return;
    }
    const accessToken = tokenData.access_token;

    // 第二步：用 access_token 获取 GitHub 用户信息
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    const ghUser = await userRes.json() as {
      id: number;
      login: string;
      name?: string;
      avatar_url?: string;
      email?: string;
    };

    if (!ghUser.id) {
      res.status(400).json({ error: '获取 GitHub 用户信息失败' });
      return;
    }

    const githubId = String(ghUser.id);

    // 查找是否已有绑定此 GitHub 账号的用户
    let user = await UserModel.findOne({ 'oauthProviders.provider': 'github', 'oauthProviders.providerId': githubId });

    if (!user) {
      // 首次 GitHub 登录，自动创建新用户
      const openId = `gh_${githubId}`;
      user = await UserModel.create({
        openId,
        nickname: ghUser.name || ghUser.login || `GitHub_${githubId}`,
        avatarUrl: ghUser.avatar_url,
        oauthProviders: [{ provider: 'github', providerId: githubId, accessToken }],
      });
      console.log(`新用户通过 GitHub OAuth 注册: ${user.nickname} (${user._id})`);
    } else {
      // 已有用户，更新 access_token 和头像
      const provider = user.oauthProviders.find(p => p.provider === 'github');
      if (provider) {
        provider.accessToken = accessToken;
      }
      if (ghUser.avatar_url) {
        user.avatarUrl = ghUser.avatar_url;
      }
      await user.save();
    }

    // 重定向到前端，附带 userId 作为查询参数
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const redirectUrl = `${clientUrl}/?auth=github&uid=${user.openId}&nickname=${encodeURIComponent(user.nickname)}`;
    res.redirect(redirectUrl);
  } catch (e: any) {
    console.error('GitHub OAuth callback error:', e.message);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/?auth=error&message=${encodeURIComponent(e.message)}`);
  }
});

export { router as authRouter };
