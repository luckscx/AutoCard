import type { RunState, HeroConfig, ItemConfig } from '@autocard/shared';

export interface GameSettings {
  /** 战斗回放速度倍率，1 = 正常速，2 = 2倍速，以此类推 */
  playbackSpeed: number;
}

class GameStateStore {
  run: RunState | null = null;
  heroes: HeroConfig[] = [];
  items: ItemConfig[] = [];
  bazaarItems: ItemConfig[] = [];
  itemsMap = new Map<string, ItemConfig>();

  settings: GameSettings = {
    playbackSpeed: 1,
  };

  setRun(run: RunState | null) {
    this.run = run;
  }

  setConfigs(heroes: HeroConfig[], items: ItemConfig[], bazaarItems: ItemConfig[] = []) {
    this.heroes = heroes;
    this.items = items;
    this.bazaarItems = bazaarItems;

    // 合并两套配置，bazaar items 优先
    const allItems = [...items];
    const existingIds = new Set(items.map(i => i.itemId));

    for (const item of bazaarItems) {
      if (!existingIds.has(item.itemId)) {
        allItems.push(item);
      }
    }

    this.itemsMap = new Map(allItems.map(i => [i.itemId, i]));
  }
}

export const gameState = new GameStateStore();
