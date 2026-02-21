import { Container, Graphics, FederatedPointerEvent } from 'pixi.js';
import type { SlotItem } from '@autocard/shared';
import { CardView } from './CardView.js';
import { CARD_UNIT, CARD_GAP, CARD_H, cardWidth } from './layout.js';

export class BoardRow extends Container {
  private slotCount: number;
  private bgSlots: Container;
  private cardsLayer: Container;
  private items: SlotItem[] = [];

  private dragging: CardView | null = null;
  private dragItem: SlotItem | null = null;
  private dragOffset = { x: 0, y: 0 };
  private dragGhost: CardView | null = null;
  private highlightGraphic: Graphics | null = null;

  /** 同行内换位 */
  onSwap?: (item: SlotItem, targetSlotIndex: number) => void;
  /** 拖出行外（场景决定卖出 or 跨容器移动） */
  onDragOut?: (item: SlotItem, globalX: number, globalY: number) => void;
  /** 拖拽中持续回调（场景据此显示卖出遮罩 / 目标行高亮） */
  onDragging?: (item: SlotItem, globalX: number, globalY: number) => void;
  /** 拖拽结束（场景据此清理所有视觉反馈） */
  onDragStop?: () => void;

  containerType: 'board' | 'stash' = 'board';

  constructor(slotCount = 10) {
    super();
    this.slotCount = slotCount;

    this.bgSlots = new Container();
    this.addChild(this.bgSlots);
    this.drawBgSlots();

    this.cardsLayer = new Container();
    this.addChild(this.cardsLayer);
  }

  private drawBgSlots() {
    for (let i = 0; i < this.slotCount; i++) {
      const g = new Graphics();
      g.roundRect(0, 0, CARD_UNIT, CARD_H, 6);
      g.fill({ color: 0x1a1a2e, alpha: 0.5 });
      g.stroke({ color: 0x333355, width: 1 });
      g.x = i * (CARD_UNIT + CARD_GAP);
      this.bgSlots.addChild(g);
    }
  }

  update(items: SlotItem[]) {
    this.items = [...items];
    this.cardsLayer.removeChildren();
    for (const item of items) {
      const card = new CardView(item);
      card.x = item.slotIndex * (CARD_UNIT + CARD_GAP);
      card.eventMode = 'static';
      card.cursor = 'grab';
      this.setupDrag(card, item);
      this.cardsLayer.addChild(card);
    }
  }

  private setupDrag(card: CardView, item: SlotItem) {
    card.on('pointerdown', (e: FederatedPointerEvent) => {
      this.dragItem = item;
      this.dragging = card;
      const local = this.toLocal(e.global);
      this.dragOffset.x = local.x - card.x;
      this.dragOffset.y = local.y - card.y;

      this.dragGhost = new CardView(item);
      this.dragGhost.alpha = 0.7;
      this.dragGhost.x = card.x;
      this.dragGhost.y = card.y;
      this.cardsLayer.addChild(this.dragGhost);

      card.alpha = 0.3;
      card.cursor = 'grabbing';

      const stage = this.getStage();
      if (stage) {
        stage.eventMode = 'static';
        stage.on('pointermove', this.handleDragMove);
        stage.on('pointerup', this.handleDragEnd);
        stage.on('pointerupoutside', this.handleDragEnd);
      }
    });
  }

  private handleDragMove = (e: FederatedPointerEvent) => {
    if (!this.dragGhost || !this.dragItem) return;
    const local = this.toLocal(e.global);
    this.dragGhost.x = local.x - this.dragOffset.x;
    this.dragGhost.y = local.y - this.dragOffset.y;

    if (this.isWithinOwnRow(e.global.y)) {
      const slotIdx = this.getSlotAtLocal(local.x);
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
      this.cardsLayer.removeChild(this.dragGhost);
      this.dragGhost.destroy();
      this.dragGhost = null;
    }
    this.clearHighlight();

    const item = this.dragItem;
    this.dragItem = null;
    this.dragging = null;

    if (item) {
      const gy = e.global.y;
      if (this.isWithinOwnRow(gy)) {
        const localInBoard = this.toLocal(e.global);
        const targetSlot = this.getSlotAtLocal(localInBoard.x);
        if (targetSlot >= 0 && targetSlot !== item.slotIndex) {
          this.onSwap?.(item, targetSlot);
        }
      } else {
        this.onDragOut?.(item, e.global.x, gy);
      }
    }

    this.onDragStop?.();
  };

  private isWithinOwnRow(globalY: number): boolean {
    const rowGlobal = this.getGlobalPosition();
    return globalY >= rowGlobal.y - 15 && globalY <= rowGlobal.y + CARD_H + 15;
  }

  // --- 外部调用：跨容器拖拽时在本行上显示高亮 ---

  showExternalHighlight(globalX: number, size: 1 | 2 | 3) {
    const localX = this.toLocal({ x: globalX, y: 0 }).x;
    const slotIdx = this.getSlotAtLocal(localX);
    this.showHighlight(slotIdx, size);
  }

  clearExternalHighlight() {
    this.clearHighlight();
  }

  getSlotIndexAtGlobal(globalX: number): number {
    const localX = this.toLocal({ x: globalX, y: 0 }).x;
    return this.getSlotAtLocal(localX);
  }

  // --- 内部工具 ---

  private getSlotAtLocal(localX: number): number {
    const step = CARD_UNIT + CARD_GAP;
    const idx = Math.round(localX / step);
    if (idx < 0 || idx >= this.slotCount) return -1;
    return idx;
  }

  private showHighlight(slotIdx: number, size: 1 | 2 | 3 = 1) {
    this.clearHighlight();
    if (slotIdx < 0) return;
    const w = cardWidth(size);
    this.highlightGraphic = new Graphics();
    this.highlightGraphic.roundRect(0, 0, w, CARD_H, 6);
    this.highlightGraphic.fill({ color: 0x4a90d9, alpha: 0.3 });
    this.highlightGraphic.stroke({ color: 0x4a90d9, width: 2 });
    this.highlightGraphic.x = slotIdx * (CARD_UNIT + CARD_GAP);
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

  get totalWidth() {
    return this.slotCount * (CARD_UNIT + CARD_GAP) - CARD_GAP;
  }
}
