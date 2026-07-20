import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../core/SceneManager.js';
import { Button } from '../ui/Button.js';
import { api, authApi } from '../api/client.js';
import { W, H, SIDE_PAD } from '../ui/layout.js';
import type { LeaderboardType, LeaderboardEntry } from '@autocard/shared';
import type { SceneManager } from '../core/SceneManager.js';

const TABS: { key: LeaderboardType; label: string }[] = [
  { key: 'fastest_win', label: '最快通关' },
  { key: 'win_rate', label: '胜率' },
  { key: 'win_streak', label: '连胜' },
];

export class LeaderboardScene extends Scene {
  private sm: SceneManager;
  private currentType: LeaderboardType = 'fastest_win';
  private listContainer: Container | null = null;
  private seasonLabel: Text | null = null;

  constructor(sm: SceneManager) {
    super();
    this.sm = sm;
  }

  async onEnter() {
    this.removeChildren();

    const title = new Text({
      text: '🏆 排行榜',
      style: { fill: '#ffd700', fontSize: 24, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif', fontWeight: 'bold' },
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

    // Tab 切换
    const btnW = 86;
    const gap = 10;
    const totalW = TABS.length * btnW + (TABS.length - 1) * gap;
    const startX = (W - totalW) / 2;
    TABS.forEach((t, i) => {
      const btn = new Button(t.label, btnW, 30, this.currentType === t.key ? 0xffd700 : 0x2a2a4a);
      btn.x = startX + i * (btnW + gap);
      btn.y = 70;
      btn.on('pointertap', () => {
        this.currentType = t.key;
        this.onEnter();
      });
      this.addChild(btn);
    });

    // 赛季标签
    const season = new Text({
      text: '赛季加载中...',
      style: { fill: '#88ffaa', fontSize: 12, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif' },
    });
    season.anchor.set(1, 0);
    season.x = W - SIDE_PAD;
    season.y = 76;
    this.addChild(season);
    this.seasonLabel = season;

    // 加载中
    const loading = new Text({
      text: '加载中...',
      style: { fill: '#aaaacc', fontSize: 14, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif' },
    });
    loading.anchor.set(0.5, 0);
    loading.x = W / 2;
    loading.y = 130;
    this.addChild(loading);

    try {
      const [board, mine] = await Promise.all([
        api.getLeaderboard(this.currentType, 50),
        authApi.isLoggedIn() ? api.getMyRank(this.currentType).catch(() => null) : Promise.resolve(null),
      ]);
      this.removeChild(loading);
      if (this.seasonLabel) this.seasonLabel.text = `📅 赛季 ${board.season}`;
      this.renderList(board.entries, mine?.rank ?? null);
    } catch (e: any) {
      loading.text = `加载失败: ${e.message}`;
    }
  }

  private renderList(entries: LeaderboardEntry[], myRank: number | null) {
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
        style: { fill: '#888', fontSize: 14, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif' },
      });
      empty.x = 0;
      empty.y = 20;
      container.addChild(empty);
      return;
    }

    const rowH = 38;
    const rowW = W - SIDE_PAD * 2;
    const myUserId = this.getCurrentUserId();

    // 表头
    const header = new Text({
      text: this.getHeaderText(),
      style: { fill: '#666688', fontSize: 11, fontFamily: 'Noto Sans Mono CJK SC, monospace' },
    });
    header.x = 0;
    header.y = 0;
    container.addChild(header);

    entries.forEach((e, i) => {
      const y = 20 + i * rowH;
      const bg = new Graphics();
      const isMe = myUserId != null && e.userId === myUserId;
      bg.roundRect(0, y, rowW, rowH - 4, 6);
      bg.fill({ color: isMe ? 0x1a3a2a : (i % 2 === 0 ? 0x141428 : 0x101020), alpha: 0.8 });
      if (i < 3) bg.stroke({ color: [0xffd700, 0xc0c0c0, 0xcd7f32][i], width: 1.5 });
      if (isMe) bg.stroke({ color: 0x07c160, width: 2 });
      container.addChild(bg);

      const rankColor = i < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][i] : '#e0e0ff';
      const nameStr = e.nickname.length > 9 ? e.nickname.slice(0, 9) : e.nickname.padEnd(9);
      const rowText = new Text({
        text: this.getRowText(e, nameStr),
        style: { fill: rankColor, fontSize: 12, fontFamily: 'Noto Sans Mono CJK SC, monospace' },
      });
      rowText.x = 8;
      rowText.y = y + 9;
      container.addChild(rowText);
    });

    // 我的排名提示（在底部或列表外）
    if (myRank != null) {
      const myBadge = new Text({
        text: `★ 我的排名: #${myRank}`,
        style: { fill: '#07c160', fontSize: 13, fontFamily: 'Noto Sans CJK SC, Arial, sans-serif', fontWeight: 'bold' },
      });
      myBadge.x = SIDE_PAD;
      myBadge.y = 20 + entries.length * rowH + 8;
      container.addChild(myBadge);
    }
  }

  private getHeaderText(): string {
    switch (this.currentType) {
      case 'fastest_win': return '#    玩家          通关天数';
      case 'win_rate': return '#    玩家          胜率    场次';
      case 'win_streak': return '#    玩家          连胜';
      default: return '#    玩家';
    }
  }

  private getRowText(e: LeaderboardEntry, nameStr: string): string {
    switch (this.currentType) {
      case 'fastest_win':
        return `${String(e.rank).padStart(2)}   ${nameStr}  ${e.fastestWinDay == null ? '—' : e.fastestWinDay + '天'}`;
      case 'win_rate':
        return `${String(e.rank).padStart(2)}   ${nameStr}  ${(e.winRate * 100).toFixed(1)}%  ${e.totalBattles}`;
      case 'win_streak':
        return `${String(e.rank).padStart(2)}   ${nameStr}  ${e.winStreak}连胜`;
      default:
        return `${String(e.rank).padStart(2)}   ${nameStr}`;
    }
  }

  private getCurrentUserId(): string | null {
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
