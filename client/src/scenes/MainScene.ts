import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../core/SceneManager.js';
import { Button } from '../ui/Button.js';
import { BoardRow } from '../ui/BoardRow.js';
import { BottomBar } from '../ui/BottomBar.js';
import { MenuView } from '../ui/MenuView.js';
import { api } from '../api/client.js';
import { gameState } from '../core/GameState.js';
import {
  W, H, SIDE_PAD, INNER_X,
  Z1_Y, Z1_H, Z2_Y, Z2_H, Z2_LABEL_Y, Z2_CARD_Y,
  Z3_Y, Z3_H, Z3_CARD_Y,
} from '../ui/layout.js';
import { HOUR_TYPE } from '@autocard/shared';
import type { SlotItem } from '@autocard/shared';
import type { SceneManager } from '../core/SceneManager.js';

export class MainScene extends Scene {
  private sm: SceneManager;
  private bottomBar!: BottomBar;
  private boardRow!: BoardRow;
  private stashRow!: BoardRow;
  private z1Content!: Container;
  private z2Content!: Container;
  private sellHint!: Container;
  private menuView!: MenuView;
  private stashOpen = false;

  constructor(sm: SceneManager) {
    super();
    this.sm = sm;
  }

  async onEnter() {
    this.removeChildren();
    this.stashOpen = false;
    const run = gameState.run!;

    if (run.status !== 'active') {
      this.showEndScreen();
      return;
    }

    // ---- Z1 背景（竖屏紧凑顶栏）----
    const z1Bg = new Graphics();
    z1Bg.roundRect(0, 0, W - SIDE_PAD * 2, Z1_H, 8);
    z1Bg.fill({ color: 0x0e1a2b, alpha: 0.9 });
    z1Bg.x = SIDE_PAD;
    z1Bg.y = Z1_Y;
    this.addChild(z1Bg);

    this.z1Content = new Container();
    this.addChild(this.z1Content);

    // ---- 卖出遮罩 ----
    this.sellHint = new Container();
    this.sellHint.visible = false;
    this.addChild(this.sellHint);

    // ---- Z2 背景 ----
    const z2Bg = new Graphics();
    z2Bg.roundRect(0, 0, W - SIDE_PAD * 2, Z2_H, 10);
    z2Bg.fill({ color: 0x0e1a2b, alpha: 0.85 });
    z2Bg.x = SIDE_PAD;
    z2Bg.y = Z2_Y;
    this.addChild(z2Bg);

    this.z2Content = new Container();
    this.addChild(this.z2Content);

    // ---- Z3 背景（2行棋盘）----
    const z3Bg = new Graphics();
    z3Bg.roundRect(0, 0, W - SIDE_PAD * 2, Z3_H, 10);
    z3Bg.fill({ color: 0x14243a, alpha: 0.9 });
    z3Bg.x = SIDE_PAD;
    z3Bg.y = Z3_Y;
    this.addChild(z3Bg);

    const boardLabel = new Text({
      text: '我的棋盘',
      style: { fill: '#8899aa', fontSize: 11, fontFamily: 'Arial' },
    });
    boardLabel.x = INNER_X;
    boardLabel.y = Z3_Y + 4;
    this.addChild(boardLabel);

    const boardSlots = run.boardSlots ?? 4;
    this.boardRow = new BoardRow(boardSlots, 10);
    this.boardRow.x = INNER_X;
    this.boardRow.y = Z3_CARD_Y;
    this.boardRow.containerType = 'board';
    this.boardRow.update(run.board);
    this.boardRow.onSwap    = (item, slot) => this.handleSwap(item, slot, 'board');
    this.boardRow.onDragOut = (item, gx, gy) => this.handleBoardDragOut(item, gx, gy);
    this.boardRow.onDragging= (item, gx, gy) => this.handleBoardDragging(item, gx, gy);
    this.boardRow.onDragStop= () => this.handleDragCleanup();
    this.boardRow.onMerge   = (a, b) => this.handleMerge(a, b, 'board');
    this.addChild(this.boardRow);

    // 储物箱行（放在 Z2 内部）
    this.stashRow = new BoardRow(10, 10);
    this.stashRow.x = INNER_X;
    this.stashRow.y = Z2_CARD_Y + 20;
    this.stashRow.containerType = 'stash';
    this.stashRow.update(run.stash);
    this.stashRow.onSwap    = (item, slot) => this.handleSwap(item, slot, 'stash');
    this.stashRow.onDragOut = (item, gx, gy) => this.handleStashDragOut(item, gx, gy);
    this.stashRow.onDragging= (item, gx, gy) => this.handleStashDragging(item, gx, gy);
    this.stashRow.onDragStop= () => this.handleDragCleanup();
    this.stashRow.onMerge   = (a, b) => this.handleMerge(a, b, 'stash');
    this.stashRow.visible = false;
    this.addChild(this.stashRow);

    // ---- Z4 底栏 ----
    this.bottomBar = new BottomBar();
    this.bottomBar.update(run);
    this.bottomBar.onStashToggle = () => this.toggleStash();
    this.addChild(this.bottomBar);

    // ---- 菜单按钮（Z1 右上角）----
    this.menuView = new MenuView();
    this.menuView.onRestart = () => this.handleRestart();
    this.addChild(this.menuView);
    this.buildMenuButton();

    // ---- 初始渲染内容区 ----
    this.renderZ1();
    this.renderZ2();
  }

  // ====== Z1 顶栏 ======

  private buildMenuButton() {
    const MENU_BTN_W = 54;
    const MENU_BTN_H = 30;
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new Graphics();
    bg.roundRect(0, 0, MENU_BTN_W, MENU_BTN_H, 6);
    bg.fill({ color: 0x2a4060, alpha: 0.92 });
    bg.stroke({ color: 0x4a90d9, width: 1 });
    btn.addChild(bg);

    // 汉堡三横线
    for (const lineY of [7, 13, 19]) {
      const line = new Graphics();
      line.rect(8, lineY, 38, 2);
      line.fill(0xffffff);
      btn.addChild(line);
    }

    btn.x = W - SIDE_PAD - MENU_BTN_W;
    btn.y = Z1_Y + (Z1_H - MENU_BTN_H) / 2;

    btn.on('pointerover', () => { bg.tint = 0xbbccdd; });
    btn.on('pointerout',  () => { bg.tint = 0xffffff; });
    btn.on('pointertap',  () => { this.menuView.show(); });

    this.addChild(btn);
  }

  private renderZ1() {
    this.z1Content.removeChildren();
    const run = gameState.run!;
    const hourType = HOUR_TYPE[run.hour as keyof typeof HOUR_TYPE];
    const hourLabel = hourType === 'choice' ? '运营' : hourType === 'pve' ? 'PvE' : 'PvP';

    const title = new Text({
      text: `Day${run.day} H${run.hour} — ${hourLabel}`,
      style: { fill: '#ffd700', fontSize: 13, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    title.x = INNER_X;
    title.y = Z1_Y + (Z1_H - 16) / 2;
    this.z1Content.addChild(title);
  }

  // ====== Z2 内容区 ======

  private renderZ2() {
    this.z2Content.removeChildren();
    const run = gameState.run!;

    if (this.stashOpen) {
      const stashTitle = new Text({
        text: '储物箱',
        style: { fill: '#ffcc00', fontSize: 13, fontFamily: 'Arial', fontWeight: 'bold' },
      });
      stashTitle.x = INNER_X;
      stashTitle.y = Z2_LABEL_Y;
      this.z2Content.addChild(stashTitle);
      this.stashRow.visible = true;
      return;
    }

    this.stashRow.visible = false;

    if (run.pendingLevelUp) {
      this.showLevelUpChoices(run.id, run.pendingLevelUp);
      return;
    }

    const hourType = HOUR_TYPE[run.hour as keyof typeof HOUR_TYPE];

    if (hourType === 'choice') {
      if (run.pendingEvent) {
        this.showPendingEvent(run.id, run.pendingEvent);
      } else {
        this.showChoiceButtons(run.id);
      }
    } else if (hourType === 'pve') {
      this.showPveButtons(run.id);
    } else {
      this.showPvpButton(run.id);
    }
  }

  private toggleStash() {
    this.stashOpen = !this.stashOpen;
    this.renderZ2();
  }

  // 升级三选一 — 竖屏版：竖向排列
  private showLevelUpChoices(
    runId: string,
    pending: { level: number; choices: { label: string; kind: string }[] }
  ) {
    const title = new Text({
      text: `升至 Lv.${pending.level}！选择奖励`,
      style: { fill: '#ffd700', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    title.x = INNER_X;
    title.y = Z2_LABEL_Y;
    this.z2Content.addChild(title);

    const btnColors = [0x4a90d9, 0x4ad97a, 0xd9704a];
    const btnW = W - SIDE_PAD * 2 - INNER_X * 2;
    pending.choices.forEach((choice, i) => {
      const btn = new Button(choice.label, btnW, 50, btnColors[i] ?? 0x4a90d9);
      btn.x = INNER_X;
      btn.y = Z2_CARD_Y + i * 58;
      btn.on('pointertap', async () => {
        try {
          const result = await api.levelUpChoice(runId, i);
          gameState.setRun(result.run);
          this.refresh();
          this.renderZ2();
        } catch (e: any) {
          console.error('levelup choice failed:', e.message);
          alert(e.message || '升级选择失败');
        }
      });
      this.z2Content.addChild(btn);
    });
  }

  // ====== 拖拽处理 ======

  private buildSellOverlay(coverZ2: boolean) {
    this.sellHint.removeChildren();
    const h = coverZ2 ? (Z2_Y + Z2_H - Z1_Y) : Z1_H;
    const bg = new Graphics();
    bg.roundRect(0, 0, W - SIDE_PAD * 2, h, 8);
    bg.fill({ color: 0xbfa620, alpha: 0.92 });
    bg.x = SIDE_PAD;
    bg.y = Z1_Y;
    this.sellHint.addChild(bg);
    const text = new Text({
      text: '松手售出卡牌',
      style: { fill: '#ffffff', fontSize: coverZ2 ? 22 : 13, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    text.anchor.set(0.5);
    text.x = W / 2;
    text.y = Z1_Y + h / 2;
    this.sellHint.addChild(text);
  }

  private handleBoardDragging(item: SlotItem, gx: number, gy: number) {
    if (this.stashOpen) {
      if (gy < Z2_Y) {
        this.buildSellOverlay(false);
        this.sellHint.visible = true;
        this.stashRow.clearExternalHighlight();
      } else if (gy < Z2_Y + Z2_H) {
        this.sellHint.visible = false;
        this.stashRow.showExternalHighlight(gx, item.size as 1 | 2 | 3);
      } else {
        this.sellHint.visible = false;
        this.stashRow.clearExternalHighlight();
      }
    } else {
      if (gy < Z3_Y) {
        this.buildSellOverlay(true);
        this.sellHint.visible = true;
      } else {
        this.sellHint.visible = false;
      }
    }
  }

  private handleStashDragging(item: SlotItem, gx: number, gy: number) {
    if (gy < Z2_Y) {
      this.buildSellOverlay(false);
      this.sellHint.visible = true;
      this.boardRow.clearExternalHighlight();
    } else if (gy >= Z3_Y && gy < Z3_Y + Z3_H) {
      this.sellHint.visible = false;
      this.boardRow.showExternalHighlight(gx, item.size as 1 | 2 | 3);
    } else {
      this.sellHint.visible = false;
      this.boardRow.clearExternalHighlight();
    }
  }

  private handleDragCleanup() {
    this.sellHint.visible = false;
    this.boardRow.clearExternalHighlight();
    this.stashRow.clearExternalHighlight();
  }

  private handleBoardDragOut(item: SlotItem, gx: number, gy: number) {
    if (this.stashOpen && gy >= Z2_Y && gy < Z2_Y + Z2_H) {
      const slot = this.stashRow.getSlotIndexAtGlobal(gx);
      if (slot >= 0) {
        this.handleCrossMove(item, 'board', 'stash', slot);
        return;
      }
    }
    if (gy < Z3_Y) {
      this.handleSell(item, 'board');
    }
  }

  private handleStashDragOut(item: SlotItem, gx: number, gy: number) {
    if (gy >= Z3_Y && gy < Z3_Y + Z3_H) {
      const slot = this.boardRow.getSlotIndexAtGlobal(gx);
      if (slot >= 0) {
        this.handleCrossMove(item, 'stash', 'board', slot);
        return;
      }
    }
    if (gy < Z2_Y) {
      this.handleSell(item, 'stash');
    }
  }

  // ====== API 操作 ======

  private refresh() {
    const run = gameState.run!;
    const newBoardSlots = run.boardSlots ?? 4;

    if (this.boardRow.slotCount !== newBoardSlots) {
      this.removeChild(this.boardRow);
      this.boardRow = new BoardRow(newBoardSlots, 10);
      this.boardRow.x = INNER_X;
      this.boardRow.y = Z3_CARD_Y;
      this.boardRow.containerType = 'board';
      this.boardRow.onSwap    = (item, slot) => this.handleSwap(item, slot, 'board');
      this.boardRow.onDragOut = (item, gx, gy) => this.handleBoardDragOut(item, gx, gy);
      this.boardRow.onDragging= (item, gx, gy) => this.handleBoardDragging(item, gx, gy);
      this.boardRow.onDragStop= () => this.handleDragCleanup();
      this.boardRow.onMerge   = (a, b) => this.handleMerge(a, b, 'board');
      this.addChild(this.boardRow);
    }

    this.boardRow.update(run.board);
    this.stashRow.update(run.stash);
    this.bottomBar.update(run);
    this.renderZ1();
  }

  private async handleSell(item: SlotItem, from: 'board' | 'stash') {
    try {
      const result = await api.sellItem(gameState.run!.id, from, item.slotIndex);
      gameState.setRun(result.run);
      this.refresh();
    } catch (e: any) {
      console.error('Sell failed:', e.message);
    }
  }

  private async handleSwap(item: SlotItem, targetSlot: number, target: 'board' | 'stash') {
    const run = gameState.run!;
    const container = target === 'board' ? run.board : run.stash;
    const targetItem = container.find(s => targetSlot >= s.slotIndex && targetSlot < s.slotIndex + s.size);

    if (targetItem && targetItem.slotIndex !== item.slotIndex) {
      try {
        const result = await api.swapItems(run.id, target, item.slotIndex, targetItem.slotIndex);
        gameState.setRun(result.run);
        this.refresh();
      } catch (e: any) {
        console.error('Swap failed:', e.message);
      }
    } else if (!targetItem) {
      try {
        const result = await api.placeItem(run.id, target, item.slotIndex, target, targetSlot);
        gameState.setRun(result.run);
        this.refresh();
      } catch (e: any) {
        console.error('Place failed:', e.message);
      }
    }
  }

  private async handleCrossMove(item: SlotItem, from: 'board' | 'stash', to: 'board' | 'stash', toSlot: number) {
    try {
      const result = await api.placeItem(gameState.run!.id, from, item.slotIndex, to, toSlot);
      gameState.setRun(result.run);
      this.refresh();
    } catch (e: any) {
      console.error('Cross move failed:', e.message);
    }
  }

  private async handleMerge(a: SlotItem, b: SlotItem, target: 'board' | 'stash') {
    const run = gameState.run!;
    const [indexA, indexB] =
      a.slotIndex <= b.slotIndex ? [a.slotIndex, b.slotIndex] : [b.slotIndex, a.slotIndex];
    try {
      const result = await api.mergeItems(run.id, target, indexA, indexB);
      gameState.setRun(result.run);
      this.refresh();
    } catch (e: any) {
      console.error('Merge failed:', e.message);
      alert(e.message || '合成失败');
    }
  }

  // ====== 重开本局 ======

  private async handleRestart() {
    try {
      const run = gameState.run;
      if (!run) return;
      const result = await api.restartRun(run.heroId);
      gameState.setRun(result.run);
      await this.sm.goto('main');
    } catch (e: any) {
      console.error('重开失败:', e.message);
      alert(e.message || '重开游戏失败，请重试');
    }
  }

  // ====== 选择按钮（竖屏：竖向排列）======

  private showChoiceButtons(runId: string) {
    const choices = [
      { label: '进入商店', choice: 'shop' as const, color: 0x4a90d9 },
      { label: '随机事件', choice: 'event' as const, color: 0xd94a7a },
      { label: '免费礼物', choice: 'gift' as const, color: 0x4ad97a },
    ];
    const btnW = W - SIDE_PAD * 2 - INNER_X * 2;

    choices.forEach((c, i) => {
      const btn = new Button(c.label, btnW, 52, c.color);
      btn.x = INNER_X;
      btn.y = Z2_CARD_Y + i * 60;
      btn.on('pointertap', async () => {
        try {
          const result = await api.hourChoice(runId, c.choice);
          gameState.setRun(result.run);
          if (c.choice === 'shop' && result.shopItems) {
            this.sm.goto('shop', { run: result.run, shopItems: result.shopItems });
          } else {
            this.sm.goto('main');
          }
        } catch (e: any) {
          console.error('hourChoice failed:', e.message);
          alert(e.message || '操作失败');
        }
      });
      this.z2Content.addChild(btn);
    });
  }

  private showPendingEvent(
    runId: string,
    pending: { eventId: string; name: string; description: string; options: { label: string }[] }
  ) {
    const title = new Text({
      text: pending.name,
      style: { fill: '#ffd700', fontSize: 15, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    title.x = INNER_X;
    title.y = Z2_LABEL_Y;
    this.z2Content.addChild(title);

    const desc = new Text({
      text: pending.description,
      style: { fill: '#ccddee', fontSize: 12, fontFamily: 'Arial', wordWrap: true, wordWrapWidth: W - SIDE_PAD * 2 - INNER_X },
    });
    desc.x = INNER_X;
    desc.y = Z2_LABEL_Y + 24;
    this.z2Content.addChild(desc);

    const btnW = W - SIDE_PAD * 2 - INNER_X * 2;
    const startY = Z2_CARD_Y + 30;
    pending.options.forEach((opt, i) => {
      const btn = new Button(opt.label, btnW, 44, 0x4a90d9);
      btn.x = INNER_X;
      btn.y = startY + i * 52;
      btn.on('pointertap', async () => {
        try {
          const result = await api.event(runId, pending.eventId, i);
          gameState.setRun(result.run);
          this.sm.goto('main');
        } catch (e: any) {
          console.error('event failed:', e.message);
          alert(e.message || '事件处理失败');
        }
      });
      this.z2Content.addChild(btn);
    });
  }

  private showPveButtons(runId: string) {
    const difficulties = [
      { label: '简单怪物', diff: 'easy'   as const, color: 0x4ad97a },
      { label: '中等怪物', diff: 'medium' as const, color: 0xd9c44a },
      { label: '困难怪物', diff: 'hard'   as const, color: 0xd94a4a },
    ];
    const btnW = W - SIDE_PAD * 2 - INNER_X * 2;

    difficulties.forEach((d, i) => {
      const btn = new Button(d.label, btnW, 52, d.color);
      btn.x = INNER_X;
      btn.y = Z2_CARD_Y + i * 60;
      btn.on('pointertap', async () => {
        try {
          const boardSnap = [...gameState.run!.board];
          const result = await api.pve(runId, d.diff);
          gameState.setRun(result.run);
          this.sm.goto('battle', {
            type: 'pve',
            result: result.battle,
            monsterName: result.monster.name,
            playerBoard: boardSnap,
            opponentBoard: result.monsterBoard,
          });
        } catch (e: any) {
          console.error('pve failed:', e.message);
          alert(e.message || '战斗开始失败');
        }
      });
      this.z2Content.addChild(btn);
    });
  }

  private showPvpButton(runId: string) {
    const btn = new Button('开始 PvP 镜像战！', W - SIDE_PAD * 2 - INNER_X * 2, 60, 0xd94a7a);
    btn.x = INNER_X;
    btn.y = Z2_CARD_Y + 40;
    btn.on('pointertap', async () => {
      try {
        const boardSnap = [...gameState.run!.board];
        const result = await api.pvp(runId);
        gameState.setRun(result.run);
        this.sm.goto('battle', {
          type: 'pvp',
          result: result.battle,
          opponentHero: result.opponent.heroId,
          opponentBoard: result.opponent.board,
          playerBoard: boardSnap,
        });
      } catch (e: any) {
        console.error('pvp failed:', e.message);
        alert(e.message || 'PvP 开始失败');
      }
    });
    this.z2Content.addChild(btn);
  }

  // ====== 结束画面 ======

  private showEndScreen() {
    const run = gameState.run!;
    const won = run.status === 'finished_win';

    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.addChild(overlay);

    const text = new Text({
      text: won ? '🏆 胜利！\n累计 10 场 PvP 胜利！' : '游戏结束\n声望耗尽',
      style: { fill: won ? '#ffd700' : '#ff4444', fontSize: 28, fontFamily: 'Arial', align: 'center' },
    });
    text.anchor.set(0.5);
    text.x = W / 2;
    text.y = H / 2 - 80;
    this.addChild(text);

    const stats = new Text({
      text: `天数: ${run.day}  等级: ${run.level}  PvP胜场: ${run.pvpWins}`,
      style: { fill: '#aaaacc', fontSize: 16, fontFamily: 'Arial' },
    });
    stats.anchor.set(0.5);
    stats.x = W / 2;
    stats.y = H / 2;
    this.addChild(stats);

    const btn = new Button('返回大厅', W - SIDE_PAD * 4, 50, 0x4a90d9);
    btn.x = SIDE_PAD * 2;
    btn.y = H / 2 + 40;
    btn.on('pointertap', () => {
      gameState.setRun(null);
      this.sm.goto('lobby');
    });
    this.addChild(btn);
  }
}
