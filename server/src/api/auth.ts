import { Router } from 'express';
import { UserModel } from '../models/User.js';
import { authService } from '../middleware/auth.js';

const router = Router();

function wrap(fn: (req: any, res: any) => Promise<void>) {
  return async (req: any, res: any) => {
    try {
      await fn(req, res);
    } catch (e: any) {
      const status = e.message.includes('已存在') ? 409 : e.message.includes('错误') ? 401 : 400;
      res.status(status).json({ error: e.message });
    }
  };
}

/** POST /api/auth/register — 注册 */
router.post('/register', wrap(async (req, res) => {
  const { username, password, nickname } = req.body;
  if (!username || !password) throw new Error('用户名和密码不能为空');
  if (username.length < 3 || username.length > 24) throw new Error('用户名须3-24个字符');
  if (password.length < 6) throw new Error('密码至少6个字符');

  const result = await authService.register(username, password, nickname);
  res.status(201).json(result);
}));

/** POST /api/auth/login — 登录 */
router.post('/login', wrap(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) throw new Error('用户名和密码不能为空');

  const result = await authService.login(username, password);
  res.json(result);
}));

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
  res.cookie('oauth_state', state, { httpOnly: true, maxAge: 600_000, sameSite: 'lax' });
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=user:email`;
  res.redirect(githubAuthUrl);
});

/**
 * GitHub OAuth 回调
 * 用 code 换取 access_token，再获取用户信息，签发 JWT
 */
router.get('/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    const cookieState = req.cookies?.oauth_state;

    if (!code || !state || state !== cookieState) {
      res.status(400).json({ error: '无效的 OAuth 回调参数' });
      return;
    }
    res.clearCookie('oauth_state');

    const clientId = process.env.GITHUB_CLIENT_ID!;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET!;
    const redirectUri = `${process.env.GITHUB_CALLBACK_URL || `${process.env.SERVER_URL || 'http://localhost:3000'}/api/auth/github/callback`}`;

    // 用 code 换 access_token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri, state }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      console.error('GitHub token exchange failed:', tokenData);
      res.status(400).json({ error: 'GitHub 授权失败' });
      return;
    }
    const accessToken = tokenData.access_token;

    // 获取 GitHub 用户信息
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github.v3+json' },
    });
    const ghUser = await userRes.json() as {
      id: number; login: string; name?: string; avatar_url?: string; email?: string;
    };

    if (!ghUser.id) {
      res.status(400).json({ error: '获取 GitHub 用户信息失败' });
      return;
    }

    const githubId = String(ghUser.id);
    let user = await UserModel.findOne({ 'oauthProviders.provider': 'github', 'oauthProviders.providerId': githubId });

    if (!user) {
      const openId = `gh_${githubId}`;
      user = await UserModel.create({
        openId,
        nickname: ghUser.name || ghUser.login || `GitHub_${githubId}`,
        avatarUrl: ghUser.avatar_url,
        oauthProviders: [{ provider: 'github', providerId: githubId, accessToken }],
      });
      console.log(`新用户通过 GitHub OAuth 注册: ${user.nickname} (${user._id})`);
    } else {
      const provider = user.oauthProviders?.find(p => p.provider === 'github');
      if (provider) provider.accessToken = accessToken;
      if (ghUser.avatar_url) user.avatarUrl = ghUser.avatar_url;
      await user.save();
    }

    // 签发 JWT 并重定向到前端
    const jwtToken = authService.signTokenForUser(user);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const redirectUrl = `${clientUrl}/?auth=github&token=${jwtToken}&uid=${user.openId}&nickname=${encodeURIComponent(user.nickname)}`;
    res.redirect(redirectUrl);
  } catch (e: any) {
    console.error('GitHub OAuth callback error:', e.message);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/?auth=error&message=${encodeURIComponent(e.message)}`);
  }
});

/**
 * 微信 OAuth 登录入口
 * 重定向用户到微信网页授权页面（snsapi_userinfo）
 */
router.get('/wechat', (_req, res) => {
  const appid = process.env.WECHAT_APPID;
  if (!appid) {
    res.status(500).json({ error: '微信 OAuth 未配置' });
    return;
  }
  const redirectUri = `${process.env.WECHAT_CALLBACK_URL || `${process.env.SERVER_URL || 'http://localhost:3000'}/api/auth/wechat/callback`}`;
  const state = crypto.randomUUID();
  res.cookie('oauth_state', state, { httpOnly: true, maxAge: 600_000, sameSite: 'lax' });
  const wechatAuthUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appid}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
  res.redirect(wechatAuthUrl);
});

/**
 * 微信 OAuth 回调
 * 用 code 换取 access_token + openid，再获取用户信息，签发 JWT
 */
router.get('/wechat/callback', async (req, res) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    const cookieState = req.cookies?.oauth_state;

    if (!code || !state || state !== cookieState) {
      res.status(400).json({ error: '无效的 OAuth 回调参数' });
      return;
    }
    res.clearCookie('oauth_state');

    const appid = process.env.WECHAT_APPID!;
    const secret = process.env.WECHAT_APPSECRET!;
    const redirectUri = `${process.env.WECHAT_CALLBACK_URL || `${process.env.SERVER_URL || 'http://localhost:3000'}/api/auth/wechat/callback`}`;

    // 用 code 换 access_token + openid
    const tokenRes = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appid}&secret=${secret}&code=${code}&grant_type=authorization_code`);
    const tokenData = await tokenRes.json() as {
      access_token?: string; openid?: string; unionid?: string; errcode?: number; errmsg?: string;
    };
    if (!tokenData.access_token || !tokenData.openid) {
      console.error('微信 token exchange failed:', tokenData);
      res.status(400).json({ error: `微信授权失败: ${tokenData.errmsg || 'unknown'}` });
      return;
    }
    const { access_token: accessToken, openid } = tokenData;

    // 获取微信用户信息
    const userRes = await fetch(`https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}&lang=zh_CN`);
    const wxUser = await userRes.json() as {
      openid: string; nickname?: string; headimgurl?: string; unionid?: string;
    };

    if (!wxUser.openid) {
      res.status(400).json({ error: '获取微信用户信息失败' });
      return;
    }

    const wechatId = wxUser.unionid || wxUser.openid;
    let user = await UserModel.findOne({ 'oauthProviders.provider': 'wechat', 'oauthProviders.providerId': wechatId });

    if (!user) {
      const uid = `wx_${wechatId}`;
      user = await UserModel.create({
        openId: uid,
        nickname: wxUser.nickname || `微信用户_${wechatId.slice(0, 6)}`,
        avatarUrl: wxUser.headimgurl,
        oauthProviders: [{ provider: 'wechat', providerId: wechatId, accessToken }],
      });
      console.log(`新用户通过微信 OAuth 注册: ${user.nickname} (${user._id})`);
    } else {
      const provider = user.oauthProviders?.find(p => p.provider === 'wechat');
      if (provider) provider.accessToken = accessToken;
      if (wxUser.headimgurl) user.avatarUrl = wxUser.headimgurl;
      await user.save();
    }

    // 签发 JWT 并重定向到前端
    const jwtToken = authService.signTokenForUser(user);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const redirectUrl = `${clientUrl}/?auth=wechat&token=${jwtToken}&uid=${user.openId}&nickname=${encodeURIComponent(user.nickname)}`;
    res.redirect(redirectUrl);
  } catch (e: any) {
    console.error('微信 OAuth callback error:', e.message);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/?auth=error&message=${encodeURIComponent(e.message)}`);
  }
});

export { router as authRouter };
