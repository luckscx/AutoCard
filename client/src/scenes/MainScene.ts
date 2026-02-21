import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../core/SceneManager.js';
import { Button } from '../ui/Button.js';
import { BoardRow } from '../ui/BoardRow.js';
import { BottomBar } from '../ui/BottomBar.js';
import { api } from '../api/client.js';
import { gameState } from '../core/GameState.js';
import {
  W, SIDE_PAD, INNER_X,
  Z1_Y, Z1_H, Z2_Y, Z2_H, Z2_LABEL_Y, Z2_CARD_Y,
  Z3_Y, Z3_H, Z3_LABEL_Y, Z3_CARD_Y,
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

    // ---- Z1 背景 ----
    const z1Bg = new Graphics();
    z1Bg.roundRect(0, 0, W - SIDE_PAD * 2, Z1_H, 8);
    z1Bg.fill({ color: 0x0e1a2b, alpha: 0.85 });
    z1Bg.x = SIDE_PAD;
    z1Bg.y = Z1_Y;
    this.addChild(z1Bg);

    this.z1Content = new Container();
    this.addChild(this.z1Content);

    // ---- 卖出遮罩 (覆盖 Z1，stash 关闭时覆盖 Z1+Z2) ----
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

    // ---- Z3 背景 ----
    const z3Bg = new Graphics();
    z3Bg.roundRect(0, 0, W - SIDE_PAD * 2, Z3_H, 10);
    z3Bg.fill({ color: 0x14243a, alpha: 0.9 });
    z3Bg.x = SIDE_PAD;
    z3Bg.y = Z3_Y;
    this.addChild(z3Bg);

    const boardLabel = new Text({
      text: '我的棋盘',
      style: { fill: '#8899aa', fontSize: 12, fontFamily: 'Arial' },
    });
    boardLabel.x = INNER_X;
    boardLabel.y = Z3_LABEL_Y;
    this.addChild(boardLabel);

    this.boardRow = new BoardRow(10);
    this.boardRow.x = INNER_X;
    this.boardRow.y = Z3_CARD_Y;
    this.boardRow.containerType = 'board';
    this.boardRow.update(run.board);
    this.boardRow.onSwap = (item, slot) => this.handleSwap(item, slot, 'board');
    this.boardRow.onDragOut = (item, gx, gy) => this.handleBoardDragOut(item, gx, gy);
    this.boardRow.onDragging = (item, gx, gy) => this.handleBoardDragging(item, gx, gy);
    this.boardRow.onDragStop = () => this.handleDragCleanup();
    this.addChild(this.boardRow);

    // 储物箱行（放在 Z2 内部，初始隐藏）
    this.stashRow = new BoardRow(10);
    this.stashRow.x = INNER_X;
    this.stashRow.y = Z2_CARD_Y + 20;
    this.stashRow.containerType = 'stash';
    this.stashRow.update(run.stash);
    this.stashRow.onSwap = (item, slot) => this.handleSwap(item, slot, 'stash');
    this.stashRow.onDragOut = (item, gx, gy) => this.handleStashDragOut(item, gx, gy);
    this.stashRow.onDragging = (item, gx, gy) => this.handleStashDragging(item, gx, gy);
    this.stashRow.onDragStop = () => this.handleDragCleanup();
    this.stashRow.visible = false;
    this.addChild(this.stashRow);

    // ---- Z4 底栏 ----
    this.bottomBar = new BottomBar();
    this.bottomBar.update(run);
    this.bottomBar.onStashToggle = () => this.toggleStash();
    this.addChild(this.bottomBar);

    // ---- 填充 Z1 & Z2 内容 ----
    this.renderZ1();
    this.renderZ2();
  }

  // ====== Z1 顶栏 ======

  private renderZ1() {
    this.z1Content.removeChildren();
    const run = gameState.run!;
    const hourType = HOUR_TYPE[run.hour as keyof typeof HOUR_TYPE];
    const hourLabel = hourType === 'choice' ? '日常运营' : hourType === 'pve' ? 'PvE 野怪' : 'PvP 镜像战';

    const title = new Text({
      text: `Day${run.day} H${run.hour} — ${hourLabel}`,
      style: { fill: '#ffd700', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    title.x = INNER_X;
    title.y = Z1_Y + 10;
    this.z1Content.addChild(title);
  }

  // ====== Z2 内容区 ======

  private renderZ2() {
    this.z2Content.removeChildren();
    const run = gameState.run!;

    if (this.stashOpen) {
      const stashTitle = new Text({
        text: '储物箱',
        style: { fill: '#ffcc00', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' },
      });
      stashTitle.x = INNER_X;
      stashTitle.y = Z2_LABEL_Y;
      this.z2Content.addChild(stashTitle);
      this.stashRow.visible = true;
      return;
    }

    this.stashRow.visible = false;
    const hourType = HOUR_TYPE[run.hour as keyof typeof HOUR_TYPE];

    if (hourType === 'choice') {
      this.showChoiceButtons(run.id);
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
      style: { fill: '#ffffff', fontSize: coverZ2 ? 28 : 14, fontFamily: 'Arial', fontWeight: 'bold' },
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

  // ====== 选择按钮 ======

  private showChoiceButtons(runId: string) {
    const choices = [
      { label: '进入商店', choice: 'shop' as const, color: 0x4a90d9 },
      { label: '随机事件', choice: 'event' as const, color: 0xd94a7a },
      { label: '免费礼物', choice: 'gift' as const, color: 0x4ad97a },
    ];

    choices.forEach((c, i) => {
      const btn = new Button(c.label, 260, 56, c.color);
      btn.x = INNER_X + i * 290;
      btn.y = Z2_CARD_Y + 40;
      btn.on('pointertap', async () => {
        const result = await api.hourChoice(runId, c.choice);
        gameState.setRun(result.run);
        if (c.choice === 'shop' && result.shopItems) {
          this.sm.goto('shop', { run: result.run, shopItems: result.shopItems });
        } else {
          this.sm.goto('main');
        }
      });
      this.z2Content.addChild(btn);
    });
  }

  private showPveButtons(runId: string) {
    const difficulties = [
      { label: '简单怪物', diff: 'easy' as const, color: 0x4ad97a },
      { label: '中等怪物', diff: 'medium' as const, color: 0xd9c44a },
      { label: '困难怪物', diff: 'hard' as const, color: 0xd94a4a },
    ];

    difficulties.forEach((d, i) => {
      const btn = new Button(d.label, 260, 56, d.color);
      btn.x = INNER_X + i * 290;
      btn.y = Z2_CARD_Y + 40;
      btn.on('pointertap', async () => {
        const boardSnap = [...gameState.run!.board];
        const result = await api.pve(runId, d.diff);
        gameState.setRun(result.run);
        this.sm.goto('battle', {
          type: 'pve',
          result: result.battle,
          monsterName: result.monster.name,
          playerBoard: boardSnap,
        });
      });
      this.z2Content.addChild(btn);
    });
  }

  private showPvpButton(runId: string) {
    const btn = new Button('开始 PvP 镜像战！', 400, 60, 0xd94a7a);
    btn.x = INNER_X + 200;
    btn.y = Z2_CARD_Y + 40;
    btn.on('pointertap', async () => {
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
    });
    this.z2Content.addChild(btn);
  }

  // ====== 结束画面 ======

  private showEndScreen() {
    const run = gameState.run!;
    const won = run.status === 'finished_win';

    const overlay = new Graphics();
    overlay.rect(0, 0, W, 600);
    overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.addChild(overlay);

    const text = new Text({
      text: won ? '胜利！累计 10 场 PvP 胜利！' : '游戏结束 — 声望耗尽',
      style: { fill: won ? '#ffd700' : '#ff4444', fontSize: 30, fontFamily: 'Arial' },
    });
    text.anchor.set(0.5);
    text.x = W / 2;
    text.y = 200;
    this.addChild(text);

    const stats = new Text({
      text: `天数: ${run.day}  等级: ${run.level}  PvP胜场: ${run.pvpWins}`,
      style: { fill: '#aaaacc', fontSize: 18, fontFamily: 'Arial' },
    });
    stats.anchor.set(0.5);
    stats.x = W / 2;
    stats.y = 260;
    this.addChild(stats);

    const btn = new Button('返回大厅', 200, 50, 0x4a90d9);
    btn.x = W / 2 - 100;
    btn.y = 320;
    btn.on('pointertap', () => {
      gameState.setRun(null);
      this.sm.goto('lobby');
    });
    this.addChild(btn);
  }
}
