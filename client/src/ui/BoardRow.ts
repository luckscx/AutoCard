import { Container, Graphics, FederatedPointerEvent } from 'pixi.js';
import type { SlotItem } from '@autocard/shared';
import { gameState } from '../core/GameState.js';
import { UnifiedCardView } from './UnifiedCardView.js';
import { BOARD_COLS, CARD_UNIT, CARD_GAP, CARD_H, cardWidth } from './layout.js';
import { getTargetRuleHighlightSlots } from './targetSlotPreview.js';

// 每列宽度（格子宽 + 间隔）
const STEP = CARD_UNIT + CARD_GAP;

/** 格子左上角局部坐标（线性单行） */
function slotLocalPos(slotIndex: number): { x: number; y: number } {
  return { x: slotIndex * STEP, y: 0 };
}

export class BoardRow extends Container {
  private _activeSlots: number;
  private _totalSlots: number;
  get slotCount(): number { return this._activeSlots; }
  private bgSlots: Container;
  private slotGlowLayer: Container;
  private cardsLayer: Container;
  private items: SlotItem[] = [];

  private dragging: UnifiedCardView | null = null;
  private dragItem: SlotItem | null = null;
  private dragOffset = { x: 0, y: 0 };
  private dragGhost: UnifiedCardView | null = null;
  private highlightGraphic: Graphics | null = null;

  onSwap?: (item: SlotItem, targetSlotIndex: number) => void;
  onMerge?: (itemA: SlotItem, itemB: SlotItem) => void;
  onDragOut?: (item: SlotItem, globalX: number, globalY: number) => void;
  onDragging?: (item: SlotItem, globalX: number, globalY: number) => void;
  onDragStop?: () => void;

  containerType: 'board' | 'stash' = 'board';

  constructor(activeSlots = 4, totalSlots = 10) {
    super();
    this._activeSlots = activeSlots;
    this._totalSlots  = totalSlots;

    this.bgSlots = new Container();
    this.addChild(this.bgSlots);
    this.drawBgSlots();

    this.slotGlowLayer = new Container();
    this.addChild(this.slotGlowLayer);

    this.cardsLayer = new Container();
    this.addChild(this.cardsLayer);
  }

  private drawBgSlots() {
    for (let i = 0; i < this._totalSlots; i++) {
      const locked = i >= this._activeSlots;
      const pos = slotLocalPos(i);
      const g = new Graphics();
      g.x = pos.x;
      g.y = pos.y;

      if (locked) {
        g.roundRect(0, 0, CARD_UNIT, CARD_H, 6);
        g.fill({ color: 0x0d0d1a, alpha: 0.7 });
        g.stroke({ color: 0x2a2a3a, width: 1 });
        this.drawLockIcon(g);
      } else {
        g.roundRect(0, 0, CARD_UNIT, CARD_H, 6);
        g.fill({ color: 0x1a1a2e, alpha: 0.5 });
        g.stroke({ color: 0x333355, width: 1 });
      }
      this.bgSlots.addChild(g);
    }
  }

  private drawLockIcon(g: Graphics) {
    const cx = CARD_UNIT / 2;
    const cy = CARD_H / 2;
    const bodyW = Math.round(CARD_UNIT * 0.38);
    const bodyH = Math.round(CARD_H * 0.30);
    const bodyX = Math.round(cx - bodyW / 2);
    const bodyY = Math.round(cy - bodyH * 0.3);
    g.roundRect(bodyX, bodyY, bodyW, bodyH, 3);
    g.fill({ color: 0x3a3a50 });
    const holeR = Math.max(2, Math.round(bodyW * 0.12));
    g.circle(cx, bodyY + bodyH * 0.42, holeR);
    g.fill({ color: 0x1a1a2c });
    const shW = Math.round(bodyW * 0.52);
    const shThick = Math.max(2, Math.round(bodyW * 0.16));
    const shH = Math.round(bodyH * 0.65);
    const shLeft = Math.round(cx - shW / 2);
    const shTop = bodyY - shH;
    g.rect(shLeft, shTop, shThick, shH);
    g.fill({ color: 0x3a3a50 });
    g.rect(shLeft + shW - shThick, shTop, shThick, shH);
    g.fill({ color: 0x3a3a50 });
    g.rect(shLeft, shTop, shW, shThick);
    g.fill({ color: 0x3a3a50 });
  }

  update(items: SlotItem[]) {
    this.items = [...items];
    this.clearSlotTargetGlow();
    this.cardsLayer.removeChildren();
    for (const item of items) {
      const card = new UnifiedCardView(item, 'normal');
      const pos = slotLocalPos(item.slotIndex);
      card.x = pos.x;
      card.y = pos.y;
      card.eventMode = 'static';
      card.cursor = 'grab';
      this.setupDrag(card, item);
      this.setupTargetPreview(card, item);
      this.cardsLayer.addChild(card);
    }
  }

  private clearSlotTargetGlow() {
    this.slotGlowLayer.removeChildren();
  }

  private showSlotTargetGlow(unitSlots: number[]) {
    this.clearSlotTargetGlow();
    for (const s of unitSlots) {
      if (s < 0 || s >= this._activeSlots) continue;
      const pos = slotLocalPos(s);
      const g = new Graphics();
      g.roundRect(0, 0, CARD_UNIT, CARD_H, 6);
      g.fill({ color: 0x3399ff, alpha: 0.38 });
      g.stroke({ color: 0x88ddff, width: 2 });
      g.x = pos.x;
      g.y = pos.y;
      this.slotGlowLayer.addChild(g);
    }
  }

  private setupTargetPreview(card: UnifiedCardView, item: SlotItem) {
    card.on('pointerover', () => {
      if (this.dragItem) return;
      const cfg = gameState.itemsMap.get(item.itemId);
      if (!cfg) return;
      const slots = getTargetRuleHighlightSlots(item, this.items, cfg.targetRule);
      this.showSlotTargetGlow(slots);
    });
    card.on('pointerout', () => {
      if (!this.dragItem) this.clearSlotTargetGlow();
    });
  }

  private setupDrag(card: UnifiedCardView, item: SlotItem) {
    card.on('pointerdown', (e: FederatedPointerEvent) => {
      this.clearSlotTargetGlow();
      this.dragItem = item;
      this.dragging = card;

      const cardGlobalPos = card.getGlobalPosition();
      this.dragOffset.x = e.global.x - cardGlobalPos.x;
      this.dragOffset.y = e.global.y - cardGlobalPos.y;

      this.dragGhost = new UnifiedCardView(item, 'normal');
      this.dragGhost.alpha = 0.7;
      this.dragGhost.x = cardGlobalPos.x;
      this.dragGhost.y = cardGlobalPos.y;

      card.alpha = 0.3;
      card.cursor = 'grabbing';

      const stage = this.getStage();
      if (stage) {
        stage.addChild(this.dragGhost);
        stage.eventMode = 'static';
        stage.on('pointermove', this.handleDragMove);
        stage.on('pointerup', this.handleDragEnd);
        stage.on('pointerupoutside', this.handleDragEnd);
      }
    });
  }

  private handleDragMove = (e: FederatedPointerEvent) => {
    if (!this.dragGhost || !this.dragItem) return;
    this.dragGhost.x = e.global.x - this.dragOffset.x;
    this.dragGhost.y = e.global.y - this.dragOffset.y;

    if (this.isWithinOwnBoard(e.global.x, e.global.y)) {
      const local = this.toLocal(e.global);
      const slotIdx = this.getSlotAtLocal(local.x, local.y);
      this.showHighlight(slotIdx, this.dragItem.size as 1 | 2 | 3);
    } else {
      this.clearHighlight();
    }

    this.onDragging?.(this.dragItem, e.global.x, e.global.y);
  };

  private handleDragEnd = (e: FederatedPointerEvent) => {
    const stage = this.getStage();
    if (stage) {
      stage.off('pointermove', this.handleDragMove);
      stage.off('pointerup', this.handleDragEnd);
      stage.off('pointerupoutside', this.handleDragEnd);
    }

    if (this.dragging) {
      this.dragging.alpha = 1;
      this.dragging.cursor = 'grab';
    }
    if (this.dragGhost) {
      this.dragGhost.parent?.removeChild(this.dragGhost);
      this.dragGhost.destroy();
      this.dragGhost = null;
    }
    this.clearHighlight();
    this.clearSlotTargetGlow();

    const item = this.dragItem;
    this.dragItem = null;
    this.dragging = null;

    if (item) {
      if (this.isWithinOwnBoard(e.global.x, e.global.y)) {
        const localInBoard = this.toLocal(e.global);
        const targetSlot = this.getSlotAtLocal(localInBoard.x, localInBoard.y);
        const targetItem = targetSlot >= 0 ? this.findItemCoveringSlot(targetSlot) : null;
        const canMerge = targetItem
          && targetItem.slotIndex !== item.slotIndex
          && targetItem.itemId === item.itemId
          && targetItem.tier === item.tier;
        if (canMerge) {
          this.onMerge?.(item, targetItem);
        } else if (targetSlot >= 0 && targetSlot !== item.slotIndex) {
          this.onSwap?.(item, targetSlot);
        }
      } else {
        this.onDragOut?.(item, e.global.x, e.global.y);
      }
    }
    this.onDragStop?.();
  };

  // 判断全局坐标是否在本棋盘范围内（单行）
  private isWithinOwnBoard(globalX: number, globalY: number): boolean {
    const gp = this.getGlobalPosition();
    const gs = this.getAncestorScale(); // scale
    const totalW = BOARD_COLS * STEP - CARD_GAP;
    const totalH = CARD_H;
    return (
      globalX >= gp.x - 15 && globalX <= gp.x + totalW * gs + 15 &&
      globalY >= gp.y - 15 && globalY <= gp.y + totalH * gs + 15
    );
  }

  // 外部调用：跨容器拖拽时在本行显示高亮
  showExternalHighlight(globalX: number, size: 1 | 2 | 3) {
    const local = this.toLocal({ x: globalX, y: 0 });
    const slotIdx = this.getSlotAtLocal(local.x, CARD_H / 2); // 默认第一行
    this.showHighlight(slotIdx, size);
  }

  clearExternalHighlight() {
    this.clearHighlight();
  }

  getSlotIndexAtGlobal(globalX: number): number {
    const local = this.toLocal({ x: globalX, y: 0 });
    return this.getSlotAtLocal(local.x, CARD_H / 2);
  }

  // 根据局部坐标确定 slotIndex（线性单行）
  private getSlotAtLocal(localX: number, _localY: number): number {
    const col = Math.round(localX / STEP);
    if (col < 0 || col >= BOARD_COLS) return -1;
    if (col >= this._totalSlots || col >= this._activeSlots) return -1;
    return col;
  }

  private findItemCoveringSlot(slotIndex: number): SlotItem | null {
    for (const s of this.items) {
      if (slotIndex >= s.slotIndex && slotIndex < s.slotIndex + s.size) return s;
    }
    return null;
  }

  private showHighlight(slotIdx: number, size: 1 | 2 | 3 = 1) {
    this.clearHighlight();
    if (slotIdx < 0) return;
    // 单行：size>1 的卡牌横跨多列
    if (slotIdx + size > BOARD_COLS) return; // 超出行宽度
    if (slotIdx + size > this._activeSlots) return;
    const w = cardWidth(size);
    const pos = slotLocalPos(slotIdx);
    this.highlightGraphic = new Graphics();
    this.highlightGraphic.roundRect(0, 0, w, CARD_H, 6);
    this.highlightGraphic.fill({ color: 0x4a90d9, alpha: 0.3 });
    this.highlightGraphic.stroke({ color: 0x4a90d9, width: 2 });
    this.highlightGraphic.x = pos.x;
    this.highlightGraphic.y = pos.y;
    this.addChild(this.highlightGraphic);
  }

  private clearHighlight() {
    if (this.highlightGraphic) {
      this.removeChild(this.highlightGraphic);
      this.highlightGraphic.destroy();
      this.highlightGraphic = null;
    }
  }

  private getStage(): Container | null {
    let node: Container | null = this as Container;
    while (node?.parent) node = node.parent;
    return node;
  }

  private getAncestorScale(): number {
    let scaleX = 1;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: Container | null = this;
    while (node) {
      scaleX *= node.scale.x;
      node = node.parent as Container | null;
    }
    return scaleX;
  }

  get totalWidth() {
    return BOARD_COLS * STEP - CARD_GAP;
  }

  get totalHeight() {
    return CARD_H;
  }
}
