import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../core/SceneManager.js';
import { Button } from '../ui/Button.js';
import { api, authApi, consumeOAuthCallback } from '../api/client.js';
import { gameState } from '../core/GameState.js';
import { W, H } from '../ui/layout.js';
import { C, T, drawFullscreenBg, drawGlowOrb, drawPanel } from '../ui/theme.js';
import { closeAuthOverlay, showAuthOverlay } from '../ui/AuthOverlay.js';
import type { SceneManager } from '../core/SceneManager.js';

const FONT = 'Noto Sans CJK SC, Arial, sans-serif';

/** 主大厅：负责认证、配置预加载、账户入口和场景导航。 */
export class LobbyScene extends Scene {
  private readonly sm: SceneManager;
  private enterId = 0;

  constructor(sm: SceneManager) {
    super();
    this.sm = sm;
  }

  async onEnter() {
    const enterId = ++this.enterId;
    closeAuthOverlay();
    this.removeChildren();

    // ── 装饰性背景 ──
    const bgG = new Graphics();
    drawFullscreenBg(bgG, W, H);
    this.addChild(bgG);

    // 发光装饰球
    const orbG = new Graphics();
    drawGlowOrb(orbG, W * 0.2, H * 0.12, 60, C.blue, 0.06);
    drawGlowOrb(orbG, W * 0.85, H * 0.08, 50, C.purple, 0.05);
    drawGlowOrb(orbG, W * 0.5, H * 0.7, 120, C.blueDark, 0.04);
    this.addChild(orbG);

    const oauth = consumeOAuthCallback();
    if (!authApi.isLoggedIn() && !authApi.isGuest()) {
      const errMsg = oauth.handled && !oauth.ok ? oauth.message : '';
      showAuthOverlay(() => {
        void this.sm.goto('lobby');
      }, errMsg);
      return;
    }

    // ── 标题区 ──
    const title = new Text({
      text: '自走牌',
      style: {
        fill: 0xffffff,
        fontSize: 38,
        fontFamily: FONT,
        fontWeight: 'bold',
        dropShadow: { color: C.blue, alpha: 0.4, distance: 2, blur: 6, angle: Math.PI / 2 },
      },
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, 72);
    this.addChild(title);

    // 副标题
    const subtitle = new Text({
      text: 'AutoCard · 异世界冒险',
      style: { fill: T.blue, fontSize: 14, fontFamily: FONT },
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(W / 2, 118);
    this.addChild(subtitle);

    // ── Loading 提示 ──
    const loading = new Text({
      text: '连接服务器中...',
      style: { fill: T.secondary, fontSize: 14, fontFamily: FONT },
    });
    loading.anchor.set(0.5, 0);
    loading.position.set(W / 2, 200);
    this.addChild(loading);

    try {
      const [heroes, items, bazaarItems, me, currentRun] = await Promise.all([
        api.getHeroes(),
        api.getItems(),
        api.getBazaarItems().catch(() => []),
        api.getUserMe().catch(() => null),
        api.getCurrentRun(),
      ]);
      if (enterId !== this.enterId) return;

      gameState.setConfigs(heroes, items, bazaarItems);
      gameState.setRun(currentRun.run);
      this.removeChild(loading);
      loading.destroy();

      // ── 账户信息卡片 ──
      if (authApi.isLoggedIn() && me) {
        this.renderAccount(me.nickname);
      } else if (authApi.isGuest()) {
        this.renderGuestAccount();
      }
      this.renderActions(Boolean(currentRun.run));
    } catch (error: any) {
      if (enterId !== this.enterId) return;
      console.error('Failed to load lobby:', error.message);
      loading.text = '连接失败，点击重试';
      loading.style.fill = T.red;
      loading.eventMode = 'static';
      loading.cursor = 'pointer';
      loading.on('pointertap', () => void this.sm.goto('lobby'));
    }
  }

  onExit() {
    this.enterId++;
    closeAuthOverlay();
  }

  private renderAccount(nickname: string) {
    // 账户面板
    const panelW = W - 40;
    const panelH = 52;
    const panelY = 158;
    const panelG = new Graphics();
    drawPanel(panelG, 0, 0, panelW, panelH, 10, C.panel, C.border, 0.06, C.blue);
    panelG.x = 20;
    panelG.y = panelY;
    this.addChild(panelG);

    const avatar = new Text({
      text: '🧙',
      style: { fontSize: 22, fontFamily: FONT },
    });
    avatar.x = 14;
    avatar.y = 15;
    this.addChild(avatar);

    const nick = new Text({
      text: `冒险者 · ${nickname}`,
      style: { fill: T.blue, fontSize: 15, fontFamily: FONT, fontWeight: 'bold' },
    });
    nick.x = 46;
    nick.y = panelY + 18;
    nick.eventMode = 'static';
    nick.cursor = 'pointer';
    nick.on('pointertap', async () => {
      const next = window.prompt('新昵称（1–24 字）', nickname);
      if (next == null || !next.trim()) return;
      try {
        const user = await api.patchNickname(next.trim());
        nickname = user.nickname;
        nick.text = `冒险者 · ${nickname}`;
      } catch (error: any) {
        alert(error.message || '修改失败');
      }
    });
    this.addChild(nick);

    const logout = new Text({
      text: '退出登录',
      style: { fill: T.red, fontSize: 11, fontFamily: FONT },
    });
    logout.anchor.set(1, 0);
    logout.x = W - 34;
    logout.y = panelY + 20;
    logout.eventMode = 'static';
    logout.cursor = 'pointer';
    logout.on('pointertap', async () => {
      await authApi.logout();
      gameState.setRun(null);
      void this.sm.goto('lobby');
    });
    this.addChild(logout);
  }

  private renderGuestAccount() {
    const panelW = W - 40;
    const panelH = 52;
    const panelY = 158;
    const panelG = new Graphics();
    drawPanel(panelG, 0, 0, panelW, panelH, 10, C.panel, C.border);
    panelG.x = 20;
    panelG.y = panelY;
    this.addChild(panelG);

    const guest = new Text({
      text: '👤 游客模式',
      style: { fill: T.secondary, fontSize: 15, fontFamily: FONT, fontWeight: 'bold' },
    });
    guest.x = 16;
    guest.y = panelY + 18;
    this.addChild(guest);

    const backToLogin = new Text({
      text: '返回登录 / 注册',
      style: { fill: T.blue, fontSize: 12, fontFamily: FONT },
    });
    backToLogin.anchor.set(1, 0);
    backToLogin.x = W - 34;
    backToLogin.y = panelY + 20;
    backToLogin.eventMode = 'static';
    backToLogin.cursor = 'pointer';
    backToLogin.on('pointertap', () => {
      authApi.leaveGuest();
      gameState.setRun(null);
      void this.sm.goto('lobby');
    });
    this.addChild(backToLogin);
  }

  private renderActions(hasRun: boolean) {
    // ── 主行动按钮 ──
    const primaryColor = hasRun ? C.green : C.blue;
    const primary = new Button(hasRun ? '继续冒险' : '开始新冒险', 200, 52, primaryColor);
    primary.position.set((W - 200) / 2, 240);
    primary.on('pointertap', () => void this.sm.goto(hasRun ? 'main' : 'hero-select'));
    this.addChild(primary);

    const hint = new Text({
      text: hasRun ? '↩ 返回进行中的旅程' : '⚔ 选择英雄，开启冒险',
      style: { fill: T.muted, fontSize: 12, fontFamily: FONT },
    });
    hint.anchor.set(0.5, 0);
    hint.position.set(W / 2, 302);
    this.addChild(hint);

    // ── 排行榜按钮 ──
    const leaderboard = new Button('🏆 排行榜', 160, 42, C.purple);
    leaderboard.position.set((W - 160) / 2, 350);
    leaderboard.on('pointertap', () => void this.sm.goto('leaderboard'));
    this.addChild(leaderboard);
  }
}
