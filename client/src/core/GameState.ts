import type { RunState, HeroConfig, ItemConfig } from '@autocard/shared';

class GameStateStore {
  run: RunState | null = null;
  heroes: HeroConfig[] = [];
  items: ItemConfig[] = [];
  itemsMap = new Map<string, ItemConfig>();

  setRun(run: RunState | null) {
    this.run = run;
  }

  setConfigs(heroes: HeroConfig[], items: ItemConfig[]) {
    this.heroes = heroes;
    this.items = items;
    this.itemsMap = new Map(items.map(i => [i.itemId, i]));
  }
}

export const gameState = new GameStateStore();
