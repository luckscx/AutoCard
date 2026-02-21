import { Container, Graphics, Text } from 'pixi.js';
import { Scene } from '../core/SceneManager.js';
import { Button } from '../ui/Button.js';
import { BoardRow } from '../ui/BoardRow.js';
import { BottomBar } from '../ui/BottomBar.js';
import { ShopCardView } from '../ui/CardView.js';
import { api } from '../api/client.js';
import { gameState } from '../core/GameState.js';
import type { RunState, SlotItem } from '@autocard/shared';
import type { SceneManager } from '../core/SceneManager.js';
import {
  W, SIDE_PAD, INNER_X,
  Z1_Y, Z1_H, Z2_Y, Z2_H, Z2_LABEL_Y, Z2_CARD_Y,
  Z3_Y, Z3_H, Z3_LABEL_Y, Z3_CARD_Y,
  CARD_UNIT, CARD_GAP,
} from '../ui/layout.js';

interface ShopData {
  run: RunState;
  shopItems: string[];
}

function findFreeSlot(slots: { slotIndex: number; size: number }[], size: number): number {
  for (let i = 0; i <= 10 - size; i++) {
    let free = true;
    for (const s of slots) {
      if (i < s.slotIndex + s.size && i + size > s.slotIndex) { free = false; break; }
    }
    if (free) return i;
  }
  return -1;
}

export class ShopScene extends Scene {
  private sm: SceneManager;
  private shopItems: string[] = [];
  private purchasedSet = new Set<number>();
  private bottomBar!: BottomBar;
  private boardRow!: BoardRow;
  private sellHint!: Container;

  constructor(sm: SceneManager) {
    super();
    this.sm = sm;
  }

  async onEnter(data: ShopData) {
    this.removeChildren();
    this.purchasedSet.clear();
    gameState.setRun(data.run);
    this.shopItems = data.shopItems;
    this.render();
  }

  private render() {
    this.removeChildren();
    const run = gameState.run!;

    // ---- Z1: 操作栏（刷新 / 离开）----
    const z1Bg = new Graphics();
    z1Bg.roundRect(0, 0, W - SIDE_PAD * 2, Z1_H, 8);
    z1Bg.fill({ color: 0x0e1a2b, alpha: 0.85 });
    z1Bg.x = SIDE_PAD;
    z1Bg.y = Z1_Y;
    this.addChild(z1Bg);

    const shopTitle = new Text({
      text: '商店',
      style: { fill: '#ffd700', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    shopTitle.x = INNER_X;
    shopTitle.y = Z1_Y + 10;
    this.addChild(shopTitle);

    const goldLabel = new Text({
      text: `${run.gold} G`,
      style: { fill: '#ffcc00', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    goldLabel.x = INNER_X + 60;
    goldLabel.y = Z1_Y + 10;
    this.addChild(goldLabel);

    const leaveBtn = new Button('离开商店', 110, 28, 0x4a90d9);
    leaveBtn.x = W - SIDE_PAD - 128;
    leaveBtn.y = Z1_Y + 4;
    leaveBtn.on('pointertap', () => this.handleLeave());
    this.addChild(leaveBtn);

    const refreshBtn = new Button(
      run.shopRefreshed ? '已刷新' : '刷新商品',
      110, 28,
      run.shopRefreshed ? 0x444444 : 0xd9944a,
    );
    refreshBtn.x = W - SIDE_PAD - 250;
    refreshBtn.y = Z1_Y + 4;
    if (!run.shopRefreshed) {
      refreshBtn.on('pointertap', () => this.handleRefresh());
    }
    this.addChild(refreshBtn);

    // ---- 卖出遮罩 ----
    this.sellHint = new Container();
    this.sellHint.visible = false;
    const sellBg = new Graphics();
    const sellH = (Z2_Y + Z2_H) - Z1_Y;
    sellBg.roundRect(0, 0, W - SIDE_PAD * 2, sellH, 8);
    sellBg.fill({ color: 0xbfa620, alpha: 0.92 });
    sellBg.x = SIDE_PAD;
    sellBg.y = Z1_Y;
    this.sellHint.addChild(sellBg);
    const sellText = new Text({
      text: '松手售出卡牌',
      style: { fill: '#ffffff', fontSize: 28, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    sellText.anchor.set(0.5);
    sellText.x = W / 2;
    sellText.y = Z1_Y + sellH / 2;
    this.sellHint.addChild(sellText);
    this.addChild(this.sellHint);

    // ---- Z2: 商品卡牌 ----
    const z2Bg = new Graphics();
    z2Bg.roundRect(0, 0, W - SIDE_PAD * 2, Z2_H, 10);
    z2Bg.fill({ color: 0x0e1a2b, alpha: 0.85 });
    z2Bg.x = SIDE_PAD;
    z2Bg.y = Z2_Y;
    this.addChild(z2Bg);

    let cardX = INNER_X;
    this.shopItems.forEach((itemId, idx) => {
      const cfg = gameState.itemsMap.get(itemId);
      if (!cfg) return;
      const boardSlot = findFreeSlot(run.board, cfg.size);
      const stashSlot = findFreeSlot(run.stash, cfg.size);
      const target: 'board' | 'stash' = boardSlot >= 0 ? 'board' : stashSlot >= 0 ? 'stash' : 'board';
      const slotIndex = boardSlot >= 0 ? boardSlot : stashSlot;
      const canPlace = boardSlot >= 0 || stashSlot >= 0;
      const purchased = this.purchasedSet.has(idx);

      const card = new ShopCardView(itemId, {
        purchased,
        canAfford: run.gold >= cfg.price,
        canPlace,
        onBuy: !purchased && canPlace && run.gold >= cfg.price
          ? () => this.handleBuy(itemId, idx, target, slotIndex)
          : undefined,
      });
      card.x = cardX;
      card.y = Z2_CARD_Y;
      this.addChild(card);

      const cardW = cfg.size * CARD_UNIT + (cfg.size - 1) * CARD_GAP;
      cardX += cardW + 16;
    });

    // ---- Z3: 玩家棋盘 ----
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
    this.boardRow.onSwap = (item, slot) => this.handleSwapInBoard(item, slot);
    this.boardRow.onDragOut = (item, _gx, gy) => {
      if (gy < Z3_Y) this.handleSellCard(item);
    };
    this.boardRow.onDragging = (_item, _gx, gy) => {
      this.sellHint.visible = gy < Z3_Y;
    };
    this.boardRow.onDragStop = () => { this.sellHint.visible = false; };
    this.addChild(this.boardRow);

    // ---- Z4: 底栏 ----
    this.bottomBar = new BottomBar();
    this.bottomBar.update(run);
    this.addChild(this.bottomBar);
  }

  // ====== API 操作 ======

  private async handleSellCard(item: SlotItem) {
    try {
      const result = await api.sellItem(gameState.run!.id, 'board', item.slotIndex);
      gameState.setRun(result.run);
      this.render();
    } catch (e: any) {
      console.error('Sell failed:', e.message);
    }
  }

  private async handleSwapInBoard(item: SlotItem, targetSlot: number) {
    const run = gameState.run!;
    const targetItem = run.board.find(s => targetSlot >= s.slotIndex && targetSlot < s.slotIndex + s.size);

    if (targetItem && targetItem.slotIndex !== item.slotIndex) {
      try {
        const result = await api.swapItems(run.id, 'board', item.slotIndex, targetItem.slotIndex);
        gameState.setRun(result.run);
        this.render();
      } catch (e: any) {
        console.error('Swap failed:', e.message);
      }
    } else if (!targetItem) {
      try {
        const result = await api.placeItem(run.id, 'board', item.slotIndex, 'board', targetSlot);
        gameState.setRun(result.run);
        this.render();
      } catch (e: any) {
        console.error('Place failed:', e.message);
      }
    }
  }

  private async handleBuy(itemId: string, idx: number, target: 'board' | 'stash', slotIndex: number) {
    try {
      const result = await api.buy(gameState.run!.id, itemId, target, slotIndex);
      gameState.setRun(result.run);
      this.purchasedSet.add(idx);
      this.render();
    } catch (e: any) {
      console.error('Buy failed:', e.message);
    }
  }

  private async handleRefresh() {
    try {
      const result = await api.refreshShop(gameState.run!.id);
      gameState.setRun(result.run);
      this.shopItems = result.shopItems;
      this.purchasedSet.clear();
      this.render();
    } catch (e: any) {
      console.error('Refresh failed:', e.message);
    }
  }

  private async handleLeave() {
    try {
      const result = await api.leaveShop(gameState.run!.id);
      gameState.setRun(result.run);
      this.sm.goto('main');
    } catch (e: any) {
      console.error('Leave shop failed:', e.message);
    }
  }
}
