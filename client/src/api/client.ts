import type {
  StartRunResponse, GetRunResponse,
  HourChoiceResponse, PveResponse, PvpResponse,
  PlaceItemResponse, MergeItemResponse,
  BuyItemResponse, RefreshShopResponse, LeaveShopResponse, EventChoiceResponse,
  SellItemResponse, SwapItemsResponse,
} from '@autocard/shared';
import type { HeroConfig, ItemConfig, MonsterConfig, EventConfig } from '@autocard/shared';

const BASE = '/api';

let userId = localStorage.getItem('autocard_uid') || crypto.randomUUID();
localStorage.setItem('autocard_uid', userId);

async function request<T>(method: string, path: string, body?: any, retries = 3): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
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

export const api = {
  startRun: (heroId: string) => request<StartRunResponse>('POST', '/run/start', { heroId }),
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

  // Config
  getHeroes: () => request<HeroConfig[]>('GET', '/config/heroes'),
  getItems: () => request<ItemConfig[]>('GET', '/config/items'),
  getBazaarItems: () => request<ItemConfig[]>('GET', '/config/bazaar-items'),
  getMonsters: () => request<MonsterConfig[]>('GET', '/config/monsters'),
  getEvents: () => request<EventConfig[]>('GET', '/config/events'),
};
