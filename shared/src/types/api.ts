import type { BattleResult, ChoiceKind, RunState, SlotItem } from './game.js';

// --- Run ---
export interface StartRunRequest {
  heroId: string;
}
export interface StartRunResponse {
  run: RunState;
}

export interface GetRunResponse {
  run: RunState | null;
}

// --- Hour Choice (1/2/4/5) ---
export interface HourChoiceRequest {
  choice: ChoiceKind;
}
export interface HourChoiceResponse {
  run: RunState;
  shopItems?: string[];
  event?: { eventId: string; options: { label: string }[] };
  gift?: { itemId: string };
}

// --- PvE (Hour 3) ---
export interface PveRequest {
  difficulty: 'easy' | 'medium' | 'hard';
}
export interface PveResponse {
  run: RunState;
  battle: BattleResult;
  monster: { monsterId: string; name: string };
}

// --- PvP (Hour 6) ---
export interface PvpResponse {
  run: RunState;
  battle: BattleResult;
  opponent: {
    heroId: string;
    level: number;
    board: SlotItem[];
  };
}

// --- Board ---
export interface PlaceItemRequest {
  itemId: string;
  from: 'board' | 'stash';
  fromIndex: number;
  to: 'board' | 'stash';
  toIndex: number;
}
export interface PlaceItemResponse {
  run: RunState;
}

export interface MergeItemRequest {
  target: 'board' | 'stash';
  indexA: number;
  indexB: number;
}
export interface MergeItemResponse {
  run: RunState;
  mergedItem: SlotItem;
}

// --- Sell ---
export interface SellItemRequest {
  from: 'board' | 'stash';
  slotIndex: number;
}
export interface SellItemResponse {
  run: RunState;
  soldPrice: number;
}

// --- Swap ---
export interface SwapItemsRequest {
  target: 'board' | 'stash';
  indexA: number;
  indexB: number;
}
export interface SwapItemsResponse {
  run: RunState;
}

// --- Shop ---
export interface BuyItemRequest {
  itemId: string;
  targetSlot: 'board' | 'stash';
  slotIndex: number;
}
export interface BuyItemResponse {
  run: RunState;
}

export interface RefreshShopResponse {
  run: RunState;
  shopItems: string[];
}

export interface LeaveShopResponse {
  run: RunState;
}

// --- Event ---
export interface EventChoiceRequest {
  eventId: string;
  optionIndex: number;
}
export interface EventChoiceResponse {
  run: RunState;
  effects: { type: string; value: number | string }[];
}
