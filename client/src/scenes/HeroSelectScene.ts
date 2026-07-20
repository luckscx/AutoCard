import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../core/SceneManager.js';
import { api } from '../api/client.js';
import { gameState } from '../core/GameState.js';
import { Button } from '../ui/Button.js';
import { W, H, SIDE_PAD } from '../ui/layout.js';
import type { HeroConfig } from '@autocard/shared';
import type { SceneManager } from '../core/SceneManager.js';

/** 只展示这 3 个英雄 */
const VISIBLE_HEROES = ['dooley', 'jules', 'mak'];

const HERO_AVATAR_COLOR: Record<string, number> = {
  dooley: 0x1a3a5c,
  jules: 0x3a1a2c,
  mak: 0x1a3a1a,
};

const HERO_INITIAL: Record<string, string> = {
  dooley: '杜',
  jules: '朱',
  mak: '麦',
};

/**
 * 英雄选择是独立场景：只负责展示英雄并创建新对局。
 * 配置加载、认证和大厅入口均由 LobbyScene 负责。
 */
export class HeroSelectScene extends Scene {
  private readonly sm: SceneManager;
  private enterId = 0;
  private choosing = false;
  private statusText: Text | null = null;

  constructor(sm: SceneManager) {
    super();
    this.sm = sm;
  }

  onEnter() {
    const enterId = ++this.enterId;
    this.choosing = false;
    this.removeChildren();

    // 不允许绕过大厅直接选英雄；刷新或深链进入时先回大厅补齐配置。
    if (gameState.heroes.length === 0) {
      void this.sm.goto('lobby');
      return;
    }

    const back = new Button('← 大厅', 80, 32, 0x2a2a4a);
    back.x = SIDE_PAD;
    back.y = 28;
    back.on('pointertap', () => void this.sm.goto('lobby'));
    this.addChild(back);

    const title = new Text({
      text: '选择英雄',
      style: { fill: '#e0e0ff', fontSize: 28, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif', fontWeight: 'bold' },
    });
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = 40;
    this.addChild(title);

    const subtitle = new Text({
      text: '选择一位英雄，开启新的冒险',
      style: { fill: '#aaaacc', fontSize: 14, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif' },
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.x = W / 2;
    subtitle.y = 88;
    this.addChild(subtitle);

    this.statusText = new Text({
      text: '',
      style: { fill: '#ff8a8a', fontSize: 13, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif' },
    });
    this.statusText.anchor.set(0.5, 0);
    this.statusText.x = W / 2;
    this.statusText.y = 350;
    this.addChild(this.statusText);

    this.renderHeroCards(gameState.heroes, enterId);
    this.maybeShowTutorial();
  }

  onExit() {
    this.enterId++;
    this.choosing = false;
    this.statusText = null;
  }

  private renderHeroCards(heroes: HeroConfig[], enterId: number) {
    const visible = heroes.filter(hero => VISIBLE_HEROES.includes(hero.heroId));
    const avatarSize = 80;
    const avatarGap = 20;
    const gridTop = 150;
    const totalW = visible.length * avatarSize + Math.max(0, visible.length - 1) * avatarGap;
    const startX = (W - totalW) / 2;
    let selectedContainer: Container | null = null;

    visible.forEach((hero, i) => {
      const cell = new Container();
      cell.x = startX + i * (avatarSize + avatarGap);
      cell.y = gridTop;
      cell.eventMode = 'static';
      cell.cursor = 'pointer';
      this.addChild(cell);

      const avatarBg = new Graphics();
      avatarBg.roundRect(0, 0, avatarSize, avatarSize, 12);
      avatarBg.fill({ color: HERO_AVATAR_COLOR[hero.heroId] ?? 0x2a2a3a });
      avatarBg.stroke({ color: 0x4a90d9, width: 1.5 });
      cell.addChild(avatarBg);

      const highlight = new Graphics();
      highlight.roundRect(-2, -2, avatarSize + 4, avatarSize + 4, 14);
      highlight.stroke({ color: 0xffd700, width: 3 });
      highlight.alpha = 0;
      cell.addChild(highlight);

      const initial = new Text({
        text: HERO_INITIAL[hero.heroId] ?? hero.name.charAt(0),
        style: { fill: '#ffffff', fontSize: 34, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif', fontWeight: 'bold' },
      });
      initial.anchor.set(0.5);
      initial.position.set(avatarSize / 2, avatarSize / 2);
      cell.addChild(initial);

      const name = new Text({
        text: hero.name,
        style: { fill: '#ffd700', fontSize: 14, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif', fontWeight: 'bold' },
      });
      name.anchor.set(0.5, 0);
      name.position.set(avatarSize / 2, avatarSize + 8);
      cell.addChild(name);

      const description = new Text({
        text: hero.description,
        style: {
          fill: '#999999',
          fontSize: 11,
          fontFamily: 'Noto Sans CJK SC, Arial, sans-serif',
          wordWrap: true,
          wordWrapWidth: avatarSize + 10,
          align: 'center',
        },
      });
      description.anchor.set(0.5, 0);
      description.position.set(avatarSize / 2, avatarSize + 28);
      cell.addChild(description);

      cell.on('pointerenter', () => cell.scale.set(1.05));
      cell.on('pointerleave', () => cell.scale.set(1));
      cell.on('pointertap', () => {
        if (this.choosing) return;
        if (selectedContainer) {
          (selectedContainer.getChildAt(1) as Graphics).alpha = 0;
        }
        selectedContainer = cell;
        highlight.alpha = 1;
        void this.selectHero(hero.heroId, enterId);
      });
    });
  }

  private async selectHero(heroId: string, enterId: number) {
    this.choosing = true;
    if (this.statusText) {
      this.statusText.style.fill = '#aaaacc';
      this.statusText.text = '正在创建冒险...';
    }

    try {
      const { run } = await api.startRun(heroId);
      if (enterId !== this.enterId) return;
      gameState.setRun(run);
      await this.sm.goto('main');
    } catch (error: any) {
      if (enterId !== this.enterId) return;
      this.choosing = false;
      if (this.statusText) {
        this.statusText.style.fill = '#ff8a8a';
        this.statusText.text = error.message || '创建冒险失败，请重试';
      }
      console.error('Start run failed:', error.message);
    }
  }

  private maybeShowTutorial() {
    if (localStorage.getItem('autocard_tip_seen')) return;

    const steps = [
      { title: '🎯 游戏目标', body: '每天 6 小时循环推进，累计 10 场 PvP 胜利即可通关；声望（生命）耗尽则失败。' },
      { title: '⚙️ 端口系统', body: '棋盘（Board）是你部署卡牌的端口。卡牌放入端口后自动触发效果，棋子越多战力越强。' },
      { title: '🛒 运营小时', body: '每日起始为「运营」：三选一（商店/事件/礼物）。商店刷新卡牌，事件触发抉择，礼物免费拿牌。' },
      { title: '⚔️ PvE / PvP', body: '第 3 小时打 PvE 怪物练级，第 6 小时打 PvP 镜像战。胜利积累声望与经验，失败扣声望。' },
      { title: '🔗 合并与出售', body: '同类卡牌可合并升级；不需要的卡牌可出售换金币。合理规划端口布局是取胜关键！' },
    ];

    let stepIdx = 0;
    const wrap = new Container();
    this.addChild(wrap);

    const dismiss = () => {
      localStorage.setItem('autocard_tip_seen', '1');
      if (wrap.parent === this) this.removeChild(wrap);
      wrap.destroy({ children: true });
    };

    const renderStep = () => {
      wrap.removeChildren().forEach(child => child.destroy({ children: true }));
      const tipW = W - SIDE_PAD * 2;
      const boxH = 130;
      const bg = new Graphics();
      bg.roundRect(SIDE_PAD, H - boxH - 20, tipW, boxH, 8);
      bg.fill({ color: 0x0a1520, alpha: 0.95 });
      bg.stroke({ color: 0x4a90d9, width: 1.5 });
      wrap.addChild(bg);

      const step = steps[stepIdx];
      const heading = new Text({
        text: `${step.title} (${stepIdx + 1}/${steps.length})`,
        style: { fill: '#ffd700', fontSize: 14, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif', fontWeight: 'bold' },
      });
      heading.position.set(SIDE_PAD + 12, H - boxH - 12);
      wrap.addChild(heading);

      const body = new Text({
        text: step.body,
        style: { fill: '#ccddee', fontSize: 12, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif', wordWrap: true, wordWrapWidth: tipW - 130 },
      });
      body.position.set(SIDE_PAD + 12, H - boxH + 14);
      wrap.addChild(body);

      const isLast = stepIdx === steps.length - 1;
      const next = new Button(isLast ? '开始游戏' : '下一步', 90, 32, isLast ? 0x07c160 : 0x4a90d9);
      next.position.set(W - SIDE_PAD - 98, H - 52);
      next.on('pointertap', () => {
        if (isLast) dismiss();
        else {
          stepIdx++;
          renderStep();
        }
      });
      wrap.addChild(next);

      if (stepIdx > 0) {
        const previous = new Button('上一步', 80, 32, 0x2a2a4a);
        previous.position.set(W - SIDE_PAD - 196, H - 52);
        previous.on('pointertap', () => {
          stepIdx--;
          renderStep();
        });
        wrap.addChild(previous);
      }

      const skip = new Text({ text: '跳过引导', style: { fill: '#888', fontSize: 11, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif' } });
      skip.position.set(SIDE_PAD + 12, H - 48);
      skip.eventMode = 'static';
      skip.cursor = 'pointer';
      skip.on('pointertap', dismiss);
      wrap.addChild(skip);
    };

    renderStep();
  }
}
