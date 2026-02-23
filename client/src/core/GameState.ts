import type { RunState, HeroConfig, ItemConfig } from '@autocard/shared';

class GameStateStore {
  run: RunState | null = null;
  heroes: HeroConfig[] = [];
  items: ItemConfig[] = [];
  bazaarItems: ItemConfig[] = [];
  itemsMap = new Map<string, ItemConfig>();

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
