import type { BattleResult, ChoiceKind, RunState, SlotItem } from './game.js';

export interface UserMeResponse {
  userId: string;
  nickname: string;
  openId: string;
  avatarUrl?: string;
  oauthProviders?: { provider: string; providerId: string }[];
}

// --- Auth ---
export interface AuthCallbackQuery {
  auth: 'github' | 'error';
  uid?: string;
  nickname?: string;
  message?: string;
}

// --- Run ---
export interface StartRunRequest {
  heroId: string;
}
export interface StartRunResponse {
  run: RunState;
}

export interface RestartRunRequest {
  heroId?: string;
}
export interface RestartRunResponse {
  run: RunState;
}

export interface GetRunResponse {
  run: RunState | null;
}

// --- Hour Choice (1/2/4/5) ---
export interface HourChoiceRequest {
  runId: string;
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
  monsterBoard: SlotItem[];   // 怪物实际使用的棋盘
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
  merged: boolean;
  mergedItem?: SlotItem;
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

// --- Level-Up Choice ---
export interface LevelUpChoiceRequest {
  runId: string;
  choiceIndex: number;
}
export interface LevelUpChoiceResponse {
  run: RunState;
}

// --- 玩家档案与战绩统计 [4.3] ---

export interface RunHistoryEntry {
  runId: string;
  heroId: string;
  status: string;
  day: number;
  pvpWins: number;
  level: number;
  finishedAt: string;
}

export interface HeroStatEntry {
  heroId: string;
  runs: number;
  pvpWins: number;
  pvpLosses: number;
}

export interface RecentPvpEntry {
  day: number;
  won: boolean;
  heroId: string;
  opponentHeroId: string;
  opponentLevel: number;
  hpLeft: number;
  maxHp: number;
  createdAt: string;
}

export interface PlayerProfile {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  totalRuns: number;
  wins: number;
  losses: number;
  totalPvpBattles: number;
  pvpWins: number;
  pvpLosses: number;
  pvpWinRate: number;
  farthestDay: number;
  bestLevel: number;
  favoriteHero: string | null;
  heroStats: HeroStatEntry[];
  recentRuns: RunHistoryEntry[];
  recentPvp: RecentPvpEntry[];
}

export interface GetProfileResponse {
  profile: PlayerProfile;
}

// --- 排行榜系统 [4.4] ---

export type LeaderboardType = 'fastest_win' | 'win_rate' | 'win_streak';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  fastestWinDay: number | null;  // 最快通关天数（越小越好）
  winRate: number;               // 0~1
  winStreak: number;             // 连胜
  totalBattles: number;          // 总对战场次
}

export interface GetLeaderboardResponse {
  type: LeaderboardType;
  season: string;                // 当前赛季 YYYY-MM
  entries: LeaderboardEntry[];
}

export interface GetMyRankResponse {
  type: LeaderboardType;
  season: string;
  rank: number | null;
  entry: LeaderboardEntry | null;
}
