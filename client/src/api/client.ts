import type {
  StartRunResponse, RestartRunResponse, GetRunResponse,
  HourChoiceResponse, PveResponse, PvpResponse,
  PlaceItemResponse, MergeItemResponse,
  BuyItemResponse, RefreshShopResponse, LeaveShopResponse, EventChoiceResponse,
  SellItemResponse, SwapItemsResponse,
  UserMeResponse, LevelUpChoiceResponse, GetLeaderboardResponse, GetMyRankResponse,
} from '@autocard/shared';
import type { HeroConfig, ItemConfig, MonsterConfig, EventConfig } from '@autocard/shared';

const BASE = '/api';

// --- Token 管理 ---
const LS_TOKEN = 'autocard_token';
const LS_REFRESH = 'autocard_refresh';
const LS_UID = 'autocard_uid';
const SS_GUEST = 'autocard_guest';

function getToken(): string | null {
  return localStorage.getItem(LS_TOKEN);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(LS_REFRESH);
}

function setToken(token: string) {
  localStorage.setItem(LS_TOKEN, token);
}

function setRefreshToken(refresh: string) {
  localStorage.setItem(LS_REFRESH, refresh);
}

function clearToken() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_REFRESH);
}

// --- 降级兼容：无 JWT 时使用 x-user-id ---
let legacyUserId = localStorage.getItem(LS_UID) || crypto.randomUUID();
localStorage.setItem(LS_UID, legacyUserId);

function authHeaders(): Record<string, string> {
  const token = getToken();
  // 所有业务 API 都携带稳定的客户端 ID。游客直接依赖该 header；JWT
  // 失效并降级为游客时，重试请求也不会出现 x-user-id 缺失。
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': legacyUserId,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/** 用 refreshToken 换取新的 accessToken（静默刷新，不抛异常） */
async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json() as { accessToken: string };
    setToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

/** 设置当前用户 ID（OAuth 回调后使用） */
export function setUserId(newUid: string) {
  legacyUserId = newUid;
  localStorage.setItem(LS_UID, legacyUserId);
}

/** 获取 GitHub OAuth 登录地址 */
export function getGitHubLoginUrl(): string {
  return `${BASE}/auth/github`;
}

/** 获取微信 OAuth 登录地址 */
export function getWechatLoginUrl(): string {
  return `${BASE}/auth/wechat`;
}

export type OAuthCallbackResult =
  | { handled: false }
  | { handled: true; ok: true; provider: 'github' | 'wechat' }
  | { handled: true; ok: false; message: string };

/** 在绘制页面前消费 OAuth 回调；fragment 优先，同时兼容旧版 query 回调。 */
export function consumeOAuthCallback(): OAuthCallbackResult {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#\??/, ''));
  const params = hash.has('auth') ? hash : query;
  const authType = params.get('auth');
  if (!authType) return { handled: false };

  // 立即清除 URL 中的凭据，避免刷新重复处理以及 token 被复制或记录。
  const cleanQuery = params === query ? '' : window.location.search;
  window.history.replaceState({}, '', `${window.location.pathname}${cleanQuery}` || '/');

  if (authType === 'error') {
    return { handled: true, ok: false, message: params.get('message') || '第三方登录失败' };
  }
  if (authType !== 'github' && authType !== 'wechat') {
    return { handled: true, ok: false, message: '未知的第三方登录回调' };
  }

  const userId = params.get('uid');
  const accessToken = params.get('token');
  const refreshToken = params.get('refreshToken');
  if (!userId || !accessToken || !refreshToken) {
    return { handled: true, ok: false, message: '第三方登录回调缺少凭据，请重试' };
  }

  authApi.saveLogin({
    accessToken,
    refreshToken,
    user: { userId, nickname: params.get('nickname') || userId },
  });
  return { handled: true, ok: true, provider: authType };
}

interface RequestOptions {
  /** 认证接口必须关闭，避免携带过期 JWT 触发无关的刷新流程。 */
  authenticated?: boolean;
  /** 只默认重试幂等 GET；注册等写请求不能自动重放。 */
  retries?: number;
}

async function request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  const authenticated = options.authenticated !== false;
  const retries = options.retries ?? (method === 'GET' ? 3 : 0);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: authenticated ? authHeaders() : { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (authenticated && res.status === 401 && getToken()) {
        // accessToken 过期，尝试用 refreshToken 静默刷新
        const refreshed = await tryRefresh();
        if (refreshed) {
          const retry = await fetch(`${BASE}${path}`, {
            method,
            headers: authHeaders(),
            body: body ? JSON.stringify(body) : undefined,
          });
          if (!retry.ok) {
            const err = await retry.json().catch(() => ({ error: retry.statusText }));
            throw new Error(err.error || retry.statusText);
          }
          return retry.json();
        }
        // 刷新失败，清除 token 降级为匿名
        clearToken();
        const retry = await fetch(`${BASE}${path}`, {
          method,
          headers: authHeaders(),
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!retry.ok) {
          const err = await retry.json().catch(() => ({ error: retry.statusText }));
          throw new Error(err.error || retry.statusText);
        }
        return retry.json();
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        // HTTP 业务错误已经得到服务端响应，不应重试（注册重放可能产生重复账号）。
        throw Object.assign(new Error(err.error || res.statusText), { isHttpError: true });
      }
      return res.json();
    } catch (e) {
      const isHttpError = e instanceof Error && 'isHttpError' in e;
      if (!isHttpError && attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  throw new Error('Request failed');
}

// --- Auth API ---
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user: { userId: string; username?: string; nickname: string };
}

export const authApi = {
  register: (username: string, password: string, nickname?: string) =>
    request<AuthResponse>('POST', '/auth/register', { username, password, nickname }, { authenticated: false }),

  login: (username: string, password: string) =>
    request<AuthResponse>('POST', '/auth/login', { username, password }, { authenticated: false }),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; expiresIn: number }>('POST', '/auth/refresh', { refreshToken }, { authenticated: false }),

  logout: async () => {
    const token = getToken();
    if (token) {
      await fetch(`${BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    clearToken();
    sessionStorage.removeItem(SS_GUEST);
  },

  isLoggedIn: () => !!getToken(),

  isGuest: () => sessionStorage.getItem(SS_GUEST) === '1',

  continueAsGuest: () => {
    clearToken();
    sessionStorage.setItem(SS_GUEST, '1');
  },

  /** 退出游客模式，下一次进入大厅时重新展示登录页。 */
  leaveGuest: () => {
    sessionStorage.removeItem(SS_GUEST);
  },

  /** 登录/注册成功后保存 token */
  saveLogin: (res: AuthResponse) => {
    sessionStorage.removeItem(SS_GUEST);
    setToken(res.accessToken);
    if (res.refreshToken) setRefreshToken(res.refreshToken);
    setUserId(res.user.userId);
  },
};

// --- Game API ---
export const api = {
  startRun: (heroId: string) => request<StartRunResponse>('POST', '/run/start', { heroId }),
  restartRun: (heroId: string) => request<RestartRunResponse>('POST', '/run/restart', { heroId }),
  getCurrentRun: () => request<GetRunResponse>('GET', '/run/current'),

  hourChoice: (runId: string, choice: 'shop' | 'event' | 'gift') =>
    request<HourChoiceResponse>('POST', '/run/hour-choice', { runId, choice }),

  pve: (runId: string, difficulty: 'easy' | 'medium' | 'hard') =>
    request<PveResponse>('POST', '/run/pve', { runId, difficulty }),

  pvp: (runId: string) =>
    request<PvpResponse>('POST', '/run/pvp', { runId }),

  buy: (runId: string, itemId: string, target: 'board' | 'stash', slotIndex: number) =>
    request<BuyItemResponse>('POST', '/run/buy', { runId, itemId, target, slotIndex }),

  refreshShop: (runId: string) =>
    request<RefreshShopResponse>('POST', '/run/shop/refresh', { runId }),

  leaveShop: (runId: string) =>
    request<LeaveShopResponse>('POST', '/run/shop/leave', { runId }),

  event: (runId: string, eventId: string, optionIndex: number) =>
    request<EventChoiceResponse>('POST', '/run/event', { runId, eventId, optionIndex }),

  placeItem: (runId: string, from: 'board' | 'stash', fromIndex: number, to: 'board' | 'stash', toIndex: number) =>
    request<PlaceItemResponse>('POST', '/run/board/place', { runId, from, fromIndex, to, toIndex }),

  mergeItems: (runId: string, target: 'board' | 'stash', indexA: number, indexB: number) =>
    request<MergeItemResponse>('POST', '/run/board/merge', { runId, target, indexA, indexB }),

  sellItem: (runId: string, from: 'board' | 'stash', slotIndex: number) =>
    request<SellItemResponse>('POST', '/run/board/sell', { runId, from, slotIndex }),

  swapItems: (runId: string, target: 'board' | 'stash', indexA: number, indexB: number) =>
    request<SwapItemsResponse>('POST', '/run/board/swap', { runId, target, indexA, indexB }),

  levelUpChoice: (runId: string, choiceIndex: number) =>
    request<LevelUpChoiceResponse>('POST', '/run/levelup-choice', { runId, choiceIndex }),

  // Config
  getHeroes: () => request<HeroConfig[]>('GET', '/config/heroes'),
  getItems: () => request<ItemConfig[]>('GET', '/config/items'),
  getBazaarItems: () => request<ItemConfig[]>('GET', '/config/bazaar-items'),
  getMonsters: () => request<MonsterConfig[]>('GET', '/config/monsters'),
  getEvents: () => request<EventConfig[]>('GET', '/config/events'),

  getUserMe: () => request<UserMeResponse>('GET', '/user/me'),
  patchNickname: (nickname: string) =>
    request<UserMeResponse>('PATCH', '/user/nickname', { nickname }),

  // Leaderboard [4.4]
  getLeaderboard: (type: string = 'fastest_win', limit: number = 50) =>
    request<GetLeaderboardResponse>('GET', `/leaderboard?type=${type}&limit=${limit}`),

  getMyRank: (type: string = 'fastest_win') =>
    request<GetMyRankResponse>('GET', `/leaderboard/me?type=${type}`),
};
