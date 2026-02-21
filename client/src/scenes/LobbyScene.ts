import { Graphics, Text } from 'pixi.js';
import { Scene } from '../core/SceneManager.js';
import { Button } from '../ui/Button.js';
import { api } from '../api/client.js';
import { gameState } from '../core/GameState.js';
import { W, SIDE_PAD } from '../ui/layout.js';
import type { HeroConfig } from '@autocard/shared';
import type { SceneManager } from '../core/SceneManager.js';

export class LobbyScene extends Scene {
  private sm: SceneManager;

  constructor(sm: SceneManager) {
    super();
    this.sm = sm;
  }

  async onEnter() {
    this.removeChildren();

    const title = new Text({ text: '自走牌 AutoCard', style: { fill: '#e0e0ff', fontSize: 36, fontFamily: 'Arial', fontWeight: 'bold' } });
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = 30;
    this.addChild(title);

    const loadingText = new Text({ text: '连接服务器中...', style: { fill: '#aaaacc', fontSize: 18, fontFamily: 'Arial' } });
    loadingText.anchor.set(0.5, 0);
    loadingText.x = W / 2;
    loadingText.y = 80;
    this.addChild(loadingText);

    try {
      const [heroes, items] = await Promise.all([api.getHeroes(), api.getItems()]);
      gameState.setConfigs(heroes, items);

      const { run: existingRun } = await api.getCurrentRun();
      if (existingRun) {
        gameState.setRun(existingRun);
        this.sm.goto('main');
        return;
      }

      loadingText.text = '选择你的英雄';
      this.renderHeroCards(heroes);
    } catch (e: any) {
      console.error('Failed to load:', e.message);
      loadingText.text = '连接失败，点击重试';
      loadingText.eventMode = 'static';
      loadingText.cursor = 'pointer';
      loadingText.on('pointertap', () => this.onEnter());
    }
  }

  private renderHeroCards(heroes: HeroConfig[]) {
    const cardW = 210;
    const totalW = heroes.length * cardW + (heroes.length - 1) * 12;
    const startX = (W - totalW) / 2;

    heroes.forEach((hero, i) => {
      const bg = new Graphics();
      bg.roundRect(0, 0, cardW, 280, 10);
      bg.fill({ color: 0x14243a, alpha: 0.95 });
      bg.stroke({ color: 0x4a90d9, width: 1 });
      bg.x = startX + i * (cardW + 12);
      bg.y = 130;
      this.addChild(bg);

      const name = new Text({ text: hero.name, style: { fill: '#ffd700', fontSize: 22, fontFamily: 'Arial', fontWeight: 'bold' } });
      name.anchor.set(0.5, 0);
      name.x = bg.x + cardW / 2;
      name.y = 146;
      this.addChild(name);

      const desc = new Text({
        text: hero.description,
        style: { fill: '#ccccee', fontSize: 13, fontFamily: 'Arial', wordWrap: true, wordWrapWidth: cardW - 24 },
      });
      desc.x = bg.x + 12;
      desc.y = 180;
      this.addChild(desc);

      const stats = new Text({
        text: `HP: ${hero.baseHp}   HP/Lv: +${hero.hpPerLevel}\n金币: ${hero.startingGold}`,
        style: { fill: '#88aacc', fontSize: 13, fontFamily: 'Arial', lineHeight: 20 },
      });
      stats.x = bg.x + 12;
      stats.y = 260;
      this.addChild(stats);

      const btn = new Button('选择', cardW - 24, 42, 0x3a7bd5);
      btn.x = bg.x + 12;
      btn.y = 350;
      btn.on('pointertap', () => this.selectHero(hero.heroId));
      this.addChild(btn);
    });
  }

  private async selectHero(heroId: string) {
    try {
      const { run } = await api.startRun(heroId);
      gameState.setRun(run);
      this.sm.goto('main');
    } catch (e: any) {
      console.error('Start run failed:', e.message);
    }
  }
}
