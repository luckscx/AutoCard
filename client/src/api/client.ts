import type {
  StartRunResponse, RestartRunResponse, GetRunResponse,
  HourChoiceResponse, PveResponse, PvpResponse,
  PlaceItemResponse, MergeItemResponse,
  BuyItemResponse, RefreshShopResponse, LeaveShopResponse, EventChoiceResponse,
  SellItemResponse, SwapItemsResponse,
  UserMeResponse, LevelUpChoiceResponse, GetLeaderboardResponse,
} from '@autocard/shared';
import type { HeroConfig, ItemConfig, MonsterConfig, EventConfig } from '@autocard/shared';

const BASE = '/api';

// --- Token 管理 ---
const LS_TOKEN = 'autocard_token';
const LS_UID = 'autocard_uid';

function getToken(): string | null {
  return localStorage.getItem(LS_TOKEN);
}

function setToken(token: string) {
  localStorage.setItem(LS_TOKEN, token);
}

function clearToken() {
  localStorage.removeItem(LS_TOKEN);
}

// --- 降级兼容：无 JWT 时使用 x-user-id ---
let legacyUserId = localStorage.getItem(LS_UID) || crypto.randomUUID();
localStorage.setItem(LS_UID, legacyUserId);

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    headers['x-user-id'] = legacyUserId;
  }
  return headers;
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

async function request<T>(method: string, path: string, body?: any, retries = 3): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: authHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 401 && getToken()) {
        // token 过期，清除后降级
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
        throw new Error(err.error || res.statusText);
      }
      return res.json();
    } catch (e) {
      if (attempt < retries) {
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
  token: string;
  user: { userId: string; username?: string; nickname: string };
}

export const authApi = {
  register: (username: string, password: string, nickname?: string) =>
    request<AuthResponse>('POST', '/auth/register', { username, password, nickname }),

  login: (username: string, password: string) =>
    request<AuthResponse>('POST', '/auth/login', { username, password }),

  logout: () => {
    clearToken();
  },

  isLoggedIn: () => !!getToken(),

  /** 登录/注册成功后保存 token */
  saveLogin: (res: AuthResponse) => {
    setToken(res.token);
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
  getLeaderboard: (metric: string = 'score', limit: number = 50) =>
    request<GetLeaderboardResponse>('GET', `/leaderboard?metric=${metric}&limit=${limit}`),
};
