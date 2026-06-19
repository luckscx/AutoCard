import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../core/SceneManager.js';
import { Button } from '../ui/Button.js'
import { api } from '../api/client.js';
import { gameState } from '../core/GameState.js';
import { W, H, SIDE_PAD } from '../ui/layout.js';
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

    const title = new Text({
      text: '自走牌 AutoCard',
      style: { fill: '#e0e0ff', fontSize: 28, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = 40;
    this.addChild(title);

    const loadingText = new Text({
      text: '连接服务器中...',
      style: { fill: '#aaaacc', fontSize: 16, fontFamily: 'Arial' },
    });
    loadingText.anchor.set(0.5, 0);
    loadingText.x = W / 2;
    loadingText.y = 90;
    this.addChild(loadingText);

    try {
      const [heroes, items, bazaarItems, me] = await Promise.all([
        api.getHeroes(),
        api.getItems(),
        api.getBazaarItems().catch(() => []),
        api.getUserMe().catch(() => null),
      ]);
      gameState.setConfigs(heroes, items, bazaarItems);

      if (me) {
        const nick = new Text({
          text: `冒险者：${me.nickname}`,
          style: { fill: '#aaddff', fontSize: 13, fontFamily: 'Arial' },
        });
        nick.anchor.set(0.5, 0);
        nick.x = W / 2;
        nick.y = 84;
        nick.eventMode = 'static';
        nick.cursor = 'pointer';
        nick.on('pointertap', async () => {
          const next = window.prompt('新昵称（1–24 字）', me.nickname);
          if (next == null || !next.trim()) return;
          try {
            const u = await api.patchNickname(next.trim());
            nick.text = `冒险者：${u.nickname}`;
          } catch (err: any) {
            alert(err.message || '修改失败');
          }
        });
        this.addChild(nick);
      }

      this.maybeShowTutorial();

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

  private maybeShowTutorial() {
    if (localStorage.getItem('autocard_tip_seen')) return;
    const wrap = new Container();
    const tipW = W - SIDE_PAD * 2;
    const bg = new Graphics();
    bg.roundRect(0, 0, tipW, 80, 8);
    bg.fill({ color: 0x0a1520, alpha: 0.92 });
    bg.stroke({ color: 0x4a90d9, width: 1 });
    bg.x = SIDE_PAD;
    bg.y = H - 110;
    wrap.addChild(bg);

    const tip = new Text({
      text: '每天 6 小时：运营三选一 → PvE → 再运营 → PvP。声望耗尽失败；累计 10 场 PvP 胜通关。',
      style: { fill: '#ccddee', fontSize: 11, fontFamily: 'Arial', wordWrap: true, wordWrapWidth: tipW - 100 },
    });
    tip.x = SIDE_PAD + 10;
    tip.y = H - 102;
    wrap.addChild(tip);

    const ok = new Button('知道了', 80, 30, 0x4a90d9);
    ok.x = W - SIDE_PAD - 88;
    ok.y = H - 100;
    ok.on('pointertap', () => {
      localStorage.setItem('autocard_tip_seen', '1');
      this.removeChild(wrap);
      wrap.destroy({ children: true });
    });
    wrap.addChild(ok);

    this.addChild(wrap);
  }

  private renderHeroCards(heroes: HeroConfig[]) {
    // 竖屏：英雄卡竖向排列（或小尺寸横排）
    const cardW = W - SIDE_PAD * 2;
    const cardH = 160;
    const startY = 120;
    const gap = 12;

    heroes.forEach((hero, i) => {
      const bg = new Graphics();
      bg.roundRect(0, 0, cardW, cardH, 10);
      bg.fill({ color: 0x14243a, alpha: 0.95 });
      bg.stroke({ color: 0x4a90d9, width: 1 });
      bg.x = SIDE_PAD;
      bg.y = startY + i * (cardH + gap);
      this.addChild(bg);

      const name = new Text({
        text: hero.name,
        style: { fill: '#ffd700', fontSize: 20, fontFamily: 'Arial', fontWeight: 'bold' },
      });
      name.x = SIDE_PAD + 14;
      name.y = bg.y + 12;
      this.addChild(name);

      const desc = new Text({
        text: hero.description,
        style: { fill: '#ccccee', fontSize: 12, fontFamily: 'Arial', wordWrap: true, wordWrapWidth: cardW - 28 },
      });
      desc.x = SIDE_PAD + 14;
      desc.y = bg.y + 42;
      this.addChild(desc);

      const stats = new Text({
        text: `HP: ${hero.baseHp}   HP/Lv: +${hero.hpPerLevel}   金币: ${hero.startingGold}`,
        style: { fill: '#88aacc', fontSize: 12, fontFamily: 'Arial' },
      });
      stats.x = SIDE_PAD + 14;
      stats.y = bg.y + cardH - 46;
      this.addChild(stats);

      const btn = new Button('选择', cardW - 28, 34, 0x3a7bd5);
      btn.x = SIDE_PAD + 14;
      btn.y = bg.y + cardH - 44;
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
