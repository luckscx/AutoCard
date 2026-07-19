import { Container, Graphics, Text, Application } from 'pixi.js';
import { Scene } from '../core/SceneManager.js';
import { Button } from '../ui/Button.js';
import { BoardRow } from '../ui/BoardRow.js';
import { BottomBar } from '../ui/BottomBar.js';
import { ShopCardView } from '../ui/CardView.js';
import { api } from '../api/client.js';
import { gameState } from '../core/GameState.js';
import type { RunState, SlotItem } from '@autocard/shared';
import type { SceneManager } from '../core/SceneManager.js';
import { sound } from '../audio/SoundManager.js';
import {
  W, SIDE_PAD, INNER_X,
  Z1_Y, Z1_H, Z2_Y, Z2_H, Z2_LABEL_Y, Z2_CARD_Y,
  Z3_Y, Z3_H, Z3_CARD_Y,
  CARD_UNIT, CARD_GAP, TIER_COLORS,
} from '../ui/layout.js';
import { shopRefreshCostForLevel } from '@autocard/shared';
import { showUpgradeEffect } from '../ui/UpgradeEffect.js';

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
  private stashOpen = false;
  private stashRow!: BoardRow;
  private stashPanel!: Container;

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
    const wasStashOpen = this.stashOpen;
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

    const refreshCost = shopRefreshCostForLevel(run.level);
    const refreshBtn = new Button(
      run.shopRefreshed ? '已刷新' : `刷新 (${refreshCost}G)`,
      130, 28,
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

      // 检查是否可以升级（玩家已有同种卡牌且非最高阶）
      const tierOrder = ['bronze', 'silver', 'gold', 'diamond', 'legendary'] as const;
      const hasSameItem = run.board.some(s => s.itemId === itemId)
        || run.stash.some(s => s.itemId === itemId);
      const ownedItem = run.board.find(s => s.itemId === itemId) || run.stash.find(s => s.itemId === itemId);
      const canUpgrade = hasSameItem && ownedItem && tierOrder.indexOf(ownedItem.tier) < tierOrder.length - 1;

      const card = new ShopCardView(itemId, {
        purchased,
        canAfford: run.gold >= cfg.price,
        canPlace,
        canUpgrade,
        onBuy: !purchased && (canPlace || canUpgrade) && run.gold >= cfg.price
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
    boardLabel.y = Z3_Y + 4;
    this.addChild(boardLabel);

    this.boardRow = new BoardRow(10);
    this.boardRow.x = INNER_X;
    this.boardRow.y = Z3_CARD_Y;
    this.boardRow.containerType = 'board';
    this.boardRow.update(run.board);
    this.boardRow.onSwap = (item, slot) => this.handleSwapInBoard(item, slot);
    this.boardRow.onDragOut = (item, gx, gy) => {
      const { y: dy } = this.globalToDesign(gx, gy);
      if (this.stashOpen && dy >= Z2_Y && dy < Z2_Y + Z2_H) {
        const slot = this.stashRow.getSlotIndexAtGlobal(gx);
        if (slot >= 0) {
          this.handleCrossMoveToStash(item, slot);
          return;
        }
      }
      if (dy < Z3_Y) {
        this.handleSellCard(item);
      }
    };
    this.boardRow.onDragging = (_item, gx, gy) => {
      const { y: dy } = this.globalToDesign(gx, gy);
      if (this.stashOpen) {
        if (dy < Z2_Y) {
          this.sellHint.visible = true;
          this.stashRow.clearExternalHighlight();
        } else if (dy >= Z2_Y && dy < Z2_Y + Z2_H) {
          this.sellHint.visible = false;
          this.stashRow.showExternalHighlight(gx, _item.size as 1 | 2 | 3);
        } else {
          this.sellHint.visible = false;
          this.stashRow.clearExternalHighlight();
        }
      } else {
        this.sellHint.visible = dy < Z3_Y;
      }
    };
    this.boardRow.onDragStop = () => this.handleDragCleanup();
    this.boardRow.onMerge = (a, b) => this.handleMergeInBoard(a, b);
    this.addChild(this.boardRow);

    // ---- Z4: 底栏 ----
    this.bottomBar = new BottomBar();
    this.bottomBar.update(run);
    this.addChild(this.bottomBar);

    // ---- 储物箱面板（覆盖 Z2，初始隐藏）----
    this.stashPanel = new Container();
    this.stashPanel.visible = false;

    // 背景（覆盖整个 Z2 区域）
    const stashBg = new Graphics();
    stashBg.roundRect(0, 0, W - SIDE_PAD * 2, Z2_H, 10);
    stashBg.fill({ color: 0x0e2a1b, alpha: 0.97 });
    stashBg.x = SIDE_PAD;
    stashBg.y = Z2_Y;
    this.stashPanel.addChild(stashBg);

    // 标题
    const stashTitle = new Text({
      text: '储物箱',
      style: { fill: '#ffcc00', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    stashTitle.x = INNER_X;
    stashTitle.y = Z2_LABEL_Y;
    this.stashPanel.addChild(stashTitle);

    // 关闭按钮
    const closeBtn = new Button('收起', 70, 26, 0x445566);
    closeBtn.x = W - SIDE_PAD - 86;
    closeBtn.y = Z2_LABEL_Y - 2;
    closeBtn.on('pointertap', () => this.toggleStash());
    this.stashPanel.addChild(closeBtn);

    // 储物箱棋盘行
    this.stashRow = new BoardRow(10);
    this.stashRow.x = INNER_X;
    this.stashRow.y = Z2_CARD_Y + 20;
    this.stashRow.containerType = 'stash';
    this.stashRow.update(run.stash);
    this.stashRow.onSwap = (item, slot) => this.handleSwapInStash(item, slot);
    this.stashRow.onMerge = (a, b) => this.handleMergeInStash(a, b);
    this.stashRow.onDragging = (item, gx, gy) => this.handleStashDragging(item, gx, gy);
    this.stashRow.onDragOut = (item, gx, gy) => this.handleStashDragOut(item, gx, gy);
    this.stashRow.onDragStop = () => this.handleDragCleanup();
    this.stashPanel.addChild(this.stashRow);

    this.addChild(this.stashPanel);

    // ---- 绑定底部储物箱按钮 ----
    this.bottomBar.onStashToggle = () => this.toggleStash();

    // 恢复 stash 打开状态
    if (wasStashOpen) {
      this.stashOpen = true;
      this.stashPanel.visible = true;
      this.stashRow.update(run.stash);
    }
  }

  // ====== 储物箱操作 ======

  private toggleStash() {
    this.stashOpen = !this.stashOpen;
    this.stashPanel.visible = this.stashOpen;
    if (this.stashOpen) {
      this.stashRow.update(gameState.run!.stash);
    }
  }

  private handleDragCleanup() {
    this.sellHint.visible = false;
    if (this.stashRow) this.stashRow.clearExternalHighlight();
    this.boardRow.clearExternalHighlight();
  }

  /** 将屏幕全局坐标转为设计坐标（390×844 画布逻辑坐标），用于区域判断 */
  private globalToDesign(gx: number, gy: number): { x: number; y: number } {
    // 走到根节点（Application.stage），其 worldTransform 含 letterbox scale/offset
    let node: Container | null = this as Container;
    while (node.parent) node = node.parent as Container;
    return node.toLocal({ x: gx, y: gy });
  }

  private handleStashDragging(_item: SlotItem, gx: number, gy: number) {
    const { x: dx, y: dy } = this.globalToDesign(gx, gy);
    if (dy < Z2_Y) {
      this.sellHint.visible = true;
      this.boardRow.clearExternalHighlight();
    } else if (dy >= Z3_Y && dy < Z3_Y + Z3_H) {
      this.sellHint.visible = false;
      this.boardRow.showExternalHighlight(gx, _item.size as 1 | 2 | 3);
    } else {
      this.sellHint.visible = false;
      this.boardRow.clearExternalHighlight();
    }
  }

  private handleStashDragOut(item: SlotItem, gx: number, gy: number) {
    const { y: dy } = this.globalToDesign(gx, gy);
    if (dy >= Z3_Y && dy < Z3_Y + Z3_H) {
      const slot = this.boardRow.getSlotIndexAtGlobal(gx);
      if (slot >= 0) {
        this.handleCrossMoveToBoard(item, slot);
        return;
      }
    }
    if (dy < Z2_Y) {
      this.handleSellFromStash(item);
    }
  }

  private async handleCrossMoveToStash(item: SlotItem, toSlot: number) {
    try {
      const result = await api.placeItem(gameState.run!.id, 'board', item.slotIndex, 'stash', toSlot);
      gameState.setRun(result.run);
      this.boardRow.update(result.run.board);
      this.stashRow.update(result.run.stash);
      this.bottomBar.update(result.run);
    } catch (e: any) {
      console.error('Move to stash failed:', e.message);
    }
  }

  private async handleCrossMoveToBoard(item: SlotItem, toSlot: number) {
    try {
      const result = await api.placeItem(gameState.run!.id, 'stash', item.slotIndex, 'board', toSlot);
      gameState.setRun(result.run);
      this.boardRow.update(result.run.board);
      this.stashRow.update(result.run.stash);
      this.bottomBar.update(result.run);
    } catch (e: any) {
      console.error('Move to board failed:', e.message);
    }
  }

  private async handleSellFromStash(item: SlotItem) {
    try {
      const result = await api.sellItem(gameState.run!.id, 'stash', item.slotIndex);
      gameState.setRun(result.run);
      sound.play('sell');
      this.stashRow.update(result.run.stash);
      this.bottomBar.update(result.run);
      this.render();
    } catch (e: any) {
      console.error('Sell stash item failed:', e.message);
    }
  }

  private async handleSwapInStash(item: SlotItem, targetSlot: number) {
    const run = gameState.run!;
    const targetItem = run.stash.find(s => targetSlot >= s.slotIndex && targetSlot < s.slotIndex + s.size);

    if (targetItem && targetItem.slotIndex !== item.slotIndex) {
      try {
        const result = await api.swapItems(run.id, 'stash', item.slotIndex, targetItem.slotIndex);
        gameState.setRun(result.run);
        this.stashRow.update(result.run.stash);
      } catch (e: any) {
        console.error('Stash swap failed:', e.message);
      }
    } else if (!targetItem) {
      try {
        const result = await api.placeItem(run.id, 'stash', item.slotIndex, 'stash', targetSlot);
        gameState.setRun(result.run);
        this.stashRow.update(result.run.stash);
      } catch (e: any) {
        console.error('Stash place failed:', e.message);
      }
    }
  }

  private async handleMergeInStash(a: SlotItem, b: SlotItem) {
    const run = gameState.run!;
    const [indexA, indexB] =
      a.slotIndex <= b.slotIndex ? [a.slotIndex, b.slotIndex] : [b.slotIndex, a.slotIndex];
    try {
      const result = await api.mergeItems(run.id, 'stash', indexA, indexB);
      gameState.setRun(result.run);
      this.stashRow.update(result.run.stash);
      this.bottomBar.update(result.run);
    } catch (e: any) {
      console.error('Stash merge failed:', e.message);
      alert(e.message || '合成失败');
    }
  }

  // ====== API 操作 ======

  private async handleSellCard(item: SlotItem) {
    try {
      const result = await api.sellItem(gameState.run!.id, 'board', item.slotIndex);
      gameState.setRun(result.run);
      sound.play('sell');
      this.render();
    } catch (e: any) {
      console.error('Sell failed:', e.message);
    }
  }

  private async handleMergeInBoard(a: SlotItem, b: SlotItem) {
    const run = gameState.run!;
    const [indexA, indexB] =
      a.slotIndex <= b.slotIndex ? [a.slotIndex, b.slotIndex] : [b.slotIndex, a.slotIndex];
    try {
      const result = await api.mergeItems(run.id, 'board', indexA, indexB);
      gameState.setRun(result.run);
      this.render();
    } catch (e: any) {
      console.error('Merge failed:', e.message);
      alert(e.message || '合成失败');
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
      sound.play('buy');
      this.purchasedSet.add(idx);
      this.render();

      // 合并升级提示 — 使用动效替代原生弹窗，避免打断战斗节奏；须在 render() 之后添加，
      // 否则会被 render() 内的 removeChildren() 立即清空
      if (result.merged && result.mergedItem) {
        const cfg = gameState.itemsMap.get(itemId);
        const tierNames: Record<string, string> = { bronze: '青铜', silver: '白银', gold: '黄金', diamond: '钻石', legendary: '传说' };
        const tierOrder = ['bronze', 'silver', 'gold', 'diamond', 'legendary'] as const;
        const newTierIdx = tierOrder.indexOf(result.mergedItem.tier);
        const prevTier = newTierIdx > 0 ? tierOrder[newTierIdx - 1] : 'bronze';
        const name = cfg?.name ?? itemId;
        showUpgradeEffect(
          this,
          `⬆️ ${name} ${tierNames[prevTier] ?? ''} → ${tierNames[result.mergedItem.tier] ?? result.mergedItem.tier} 升级成功！`,
          TIER_COLORS[result.mergedItem.tier] ?? 0xffd700,
        );
      }
    } catch (e: any) {
      console.error('Buy failed:', e.message);
    }
  }

  private async handleRefresh() {
    try {
      const result = await api.refreshShop(gameState.run!.id);
      gameState.setRun(result.run);
      sound.play('refresh');
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
