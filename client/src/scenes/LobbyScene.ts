import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../core/SceneManager.js';
import { Button } from '../ui/Button.js'
import { api, authApi, setUserId, getGitHubLoginUrl } from '../api/client.js';
import { gameState } from '../core/GameState.js';
import { W, H, SIDE_PAD } from '../ui/layout.js';
import { showAuthOverlay } from '../ui/AuthOverlay.js';
import type { HeroConfig } from '@autocard/shared';
import type { SceneManager } from '../core/SceneManager.js';

/** 只展示这 3 个英雄 */
const VISIBLE_HEROES = ['dooley', 'jules', 'mak'];

/** 各英雄头像背景色 */
const HERO_AVATAR_COLOR: Record<string, number> = {
  dooley: 0x1a3a5c,
  jules:  0x3a1a2c,
  mak:    0x1a3a1a,
};

/** 各英雄头像首字 */
const HERO_INITIAL: Record<string, string> = {
  dooley: '杜',
  jules:  '朱',
  mak:    '麦',
};

export class LobbyScene extends Scene {
  private sm: SceneManager;

  constructor(sm: SceneManager) {
    super();
    this.sm = sm;
  }

  async onEnter() {
    this.removeChildren();

    // 处理 OAuth 回调（URL 中的 auth 参数）
    this.handleOAuthCallback();

    // ── 认证检查：未登录则弹出登录/注册浮层 ──
    if (!authApi.isLoggedIn()) {
      showAuthOverlay(() => {
        // 登录/注册成功或游客跳过后，重新进入 Lobby
        this.onEnter();
      });
      return;
    }

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

        // 登出按钮（仅已登录用户显示）
        const logout = new Text({
          text: '[退出]',
          style: { fill: '#ff6b6b', fontSize: 11, fontFamily: 'Arial' },
        });
        logout.anchor.set(0.5, 0);
        logout.x = W / 2;
        logout.y = 102;
        logout.eventMode = 'static';
        logout.cursor = 'pointer';
        logout.on('pointertap', () => {
          authApi.logout();
          this.onEnter();
        });
        this.addChild(logout);

        // 显示 GitHub 登录按钮（未绑定 GitHub 时才显示）
        const hasGithub = me.oauthProviders?.some(p => p.provider === 'github');
        if (!hasGithub) {
          this.addGitHubLoginButton();
        }
      } else {
        // 未登录，显示 GitHub 登录按钮
        this.addGitHubLoginButton();
      }

      this.maybeShowTutorial();

      const { run: existingRun } = await api.getCurrentRun();
      if (existingRun) {
        gameState.setRun(existingRun);
        this.sm.goto('main');
        return;
      }

      loadingText.text = '选择英雄';
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

  /** 处理 OAuth 回调参数 */
  private handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const authType = params.get('auth');
    if (!authType) return;

    if (authType === 'github') {
      const uid = params.get('uid');
      const nickname = params.get('nickname');
      const token = params.get('token');
      if (uid) {
        setUserId(uid);
        if (token) {
          // GitHub OAuth 成功后保存 JWT
          authApi.saveLogin({ token, user: { userId: uid, nickname: nickname || uid } });
        }
        console.log(`GitHub 登录成功: ${nickname || uid}`);
      }
    } else if (authType === 'error') {
      const message = params.get('message') || '登录失败';
      console.error('OAuth 登录失败:', message);
    }

    // 清除 URL 中的 auth 参数，保持 URL 整洁
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('auth');
    cleanUrl.searchParams.delete('uid');
    cleanUrl.searchParams.delete('nickname');
    cleanUrl.searchParams.delete('token');
    cleanUrl.searchParams.delete('message');
    window.history.replaceState({}, '', cleanUrl.toString());
  }

  /** 添加 GitHub 登录按钮 */
  private addGitHubLoginButton() {
    const loginBtn = new Button('GitHub 登录', 120, 36, 0x24292e);
    loginBtn.x = W / 2 - 60;
    loginBtn.y = 120;
    loginBtn.on('pointertap', () => {
      window.location.href = getGitHubLoginUrl();
    });
    this.addChild(loginBtn);
  }

  private renderHeroCards(heroes: HeroConfig[]) {
    // 只显示指定的 3 个英雄
    const visible = heroes.filter(h => VISIBLE_HEROES.includes(h.heroId));

    // 头像尺寸与布局参数
    const avatarSize = 80;     // 头像方块边长
    const avatarGap  = 20;     // 头像横向间距
    const gridTop    = 180;    // 网格顶部 Y（页面中央偏上）

    // 3 个头像横排，整体居中
    const totalW = visible.length * avatarSize + (visible.length - 1) * avatarGap;
    const startX = (W - totalW) / 2;

    // 记录当前选中的 container，用于高亮切换
    let selectedContainer: Container | null = null;

    visible.forEach((hero, i) => {
      const avatarBgColor = HERO_AVATAR_COLOR[hero.heroId] ?? 0x2a2a3a;
      const initial       = HERO_INITIAL[hero.heroId] ?? hero.name.charAt(0);
      const cellX         = startX + i * (avatarSize + avatarGap);

      // ── 整个英雄格子（头像 + 名字 + 描述）放入一个 Container ──
      const cell = new Container();
      cell.x = cellX;
      cell.y = gridTop;
      cell.eventMode = 'static';
      cell.cursor = 'pointer';
      this.addChild(cell);

      // 头像背景（圆角正方形）
      const avatarBg = new Graphics();
      avatarBg.roundRect(0, 0, avatarSize, avatarSize, 12);
      avatarBg.fill({ color: avatarBgColor, alpha: 1 });
      avatarBg.stroke({ color: 0x4a90d9, width: 1.5 });
      cell.addChild(avatarBg);

      // 高亮描边层（默认透明，选中时变金色）
      const highlight = new Graphics();
      highlight.roundRect(-2, -2, avatarSize + 4, avatarSize + 4, 14);
      highlight.stroke({ color: 0xffd700, width: 3 });
      highlight.alpha = 0;
      cell.addChild(highlight);

      // 英雄名首字（大字）
      const initialText = new Text({
        text: initial,
        style: { fill: '#ffffff', fontSize: 34, fontFamily: 'Arial', fontWeight: 'bold' },
      });
      initialText.anchor.set(0.5, 0.5);
      initialText.x = avatarSize / 2;
      initialText.y = avatarSize / 2;
      cell.addChild(initialText);

      // 英雄名（头像下方，14px）
      const nameText = new Text({
        text: hero.name,
        style: { fill: '#ffd700', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' },
      });
      nameText.anchor.set(0.5, 0);
      nameText.x = avatarSize / 2;
      nameText.y = avatarSize + 8;
      cell.addChild(nameText);

      // 描述文字（最多 2 行，11px，灰色）
      const descText = new Text({
        text: hero.description,
        style: {
          fill: '#999999',
          fontSize: 11,
          fontFamily: 'Arial',
          wordWrap: true,
          wordWrapWidth: avatarSize + 10,
          align: 'center',
        },
      });
      descText.anchor.set(0.5, 0);
      descText.x = avatarSize / 2;
      descText.y = avatarSize + 28;
      cell.addChild(descText);

      // ── 交互：hover 放大 ──
      cell.on('pointerenter', () => {
        cell.scale.set(1.05);
      });
      cell.on('pointerleave', () => {
        cell.scale.set(1.0);
      });

      // ── 交互：点击选择 ──
      cell.on('pointertap', () => {
        // 取消上一个选中的高亮
        if (selectedContainer) {
          const prevHighlight = selectedContainer.getChildAt(1) as Graphics;
          prevHighlight.alpha = 0;
        }
        // 点中同一个：取消选中并直接进入游戏
        if (selectedContainer === cell) {
          selectedContainer = null;
        } else {
          // 高亮当前头像
          highlight.alpha = 1;
          selectedContainer = cell;
        }
        // 直接触发英雄选择
        this.selectHero(hero.heroId);
      });
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
