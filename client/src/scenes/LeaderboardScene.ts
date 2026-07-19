import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../core/SceneManager.js';
import { Button } from '../ui/Button.js';
import { api, authApi } from '../api/client.js';
import { W, H, SIDE_PAD } from '../ui/layout.js';
import type { LeaderboardMetric, LeaderboardEntry } from '@autocard/shared';
import type { SceneManager } from '../core/SceneManager.js';

const METRICS: { key: LeaderboardMetric; label: string }[] = [
  { key: 'score', label: '综合' },
  { key: 'wins', label: '通关' },
  { key: 'pvpWins', label: 'PvP胜' },
  { key: 'farthestDay', label: '天数' },
  { key: 'bestLevel', label: '等级' },
];

export class LeaderboardScene extends Scene {
  private sm: SceneManager;
  private currentMetric: LeaderboardMetric = 'score';
  private listContainer: Container | null = null;

  constructor(sm: SceneManager) {
    super();
    this.sm = sm;
  }

  async onEnter() {
    this.removeChildren();

    const title = new Text({
      text: '🏆 排行榜',
      style: { fill: '#ffd700', fontSize: 24, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = 30;
    this.addChild(title);

    // 返回按钮
    const back = new Button('← 返回', 80, 32, 0x4a90d9);
    back.x = SIDE_PAD;
    back.y = 24;
    back.on('pointertap', () => this.sm.goto('lobby'));
    this.addChild(back);

    // 指标切换按钮
    const btnW = 56;
    const gap = 8;
    const totalW = METRICS.length * btnW + (METRICS.length - 1) * gap;
    const startX = (W - totalW) / 2;
    METRICS.forEach((m, i) => {
      const btn = new Button(m.label, btnW, 30, this.currentMetric === m.key ? 0xffd700 : 0x2a2a4a);
      btn.x = startX + i * (btnW + gap);
      btn.y = 70;
      btn.on('pointertap', () => {
        this.currentMetric = m.key;
        this.onEnter();
      });
      this.addChild(btn);
    });

    // 加载中
    const loading = new Text({
      text: '加载中...',
      style: { fill: '#aaaacc', fontSize: 14, fontFamily: 'Arial' },
    });
    loading.anchor.set(0.5, 0);
    loading.x = W / 2;
    loading.y = 130;
    this.addChild(loading);

    try {
      const { entries } = await api.getLeaderboard(this.currentMetric, 50);
      this.removeChild(loading);
      this.renderList(entries);
    } catch (e: any) {
      loading.text = `加载失败: ${e.message}`;
    }
  }

  private renderList(entries: LeaderboardEntry[]) {
    if (this.listContainer) {
      this.removeChild(this.listContainer);
      this.listContainer.destroy({ children: true });
    }

    const container = new Container();
    container.x = SIDE_PAD;
    container.y = 115;
    this.listContainer = container;
    this.addChild(container);

    if (entries.length === 0) {
      const empty = new Text({
        text: '暂无数据',
        style: { fill: '#888', fontSize: 14, fontFamily: 'Arial' },
      });
      empty.x = 0;
      empty.y = 20;
      container.addChild(empty);
      return;
    }

    const rowH = 36;
    const rowW = W - SIDE_PAD * 2;

    // 表头
    const header = new Text({
      text: '#    玩家            分数    通关  PvP胜  胜率',
      style: { fill: '#666688', fontSize: 11, fontFamily: 'monospace' },
    });
    header.x = 0;
    header.y = 0;
    container.addChild(header);

    entries.forEach((e, i) => {
      const y = 20 + i * rowH;
      const bg = new Graphics();
      const isCurrentUser = authApi.isLoggedIn() && e.userId === this.getCurrentUserId();
      bg.roundRect(0, y, rowW, rowH - 4, 6);
      bg.fill({ color: isCurrentUser ? 0x1a3a2a : (i % 2 === 0 ? 0x141428 : 0x101020), alpha: 0.8 });
      if (i < 3) bg.stroke({ color: [0xffd700, 0xc0c0c0, 0xcd7f32][i], width: 1.5 });
      container.addChild(bg);

      const rankColor = i < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][i] : '#e0e0ff';
      const nameStr = e.nickname.length > 10 ? e.nickname.slice(0, 10) : e.nickname.padEnd(10);
      const rowText = new Text({
        text: `${String(e.rank).padStart(2)}   ${nameStr}  ${String(e.score).padStart(5)}  ${String(e.wins).padStart(3)}  ${String(e.pvpWins).padStart(4)}  ${(e.pvpWinRate * 100).toFixed(0)}%`,
        style: { fill: rankColor, fontSize: 12, fontFamily: 'monospace' },
      });
      rowText.x = 8;
      rowText.y = y + 8;
      container.addChild(rowText);
    });
  }

  private getCurrentUserId(): string | null {
    // 从 localStorage 读取当前 token 解析 userId（简易实现）
    const token = localStorage.getItem('autocard_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || null;
    } catch {
      return null;
    }
  }
}
