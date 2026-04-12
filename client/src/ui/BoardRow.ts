import { Container, Graphics, FederatedPointerEvent } from 'pixi.js';
import type { SlotItem } from '@autocard/shared';
import { gameState } from '../core/GameState.js';
import { CardView } from './CardView.js';
import { CARD_UNIT, CARD_GAP, CARD_H, cardWidth } from './layout.js';
import { getTargetRuleHighlightSlots } from './targetSlotPreview.js';

export class BoardRow extends Container {
  private _activeSlots: number;
  private _totalSlots: number;
  /** 已解锁的可用格数，与 MainScene 的 boardSlots 对应 */
  get slotCount(): number { return this._activeSlots; }
  private bgSlots: Container;
  private slotGlowLayer: Container;
  private cardsLayer: Container;
  private items: SlotItem[] = [];

  private dragging: CardView | null = null;
  private dragItem: SlotItem | null = null;
  private dragOffset = { x: 0, y: 0 };
  private dragGhost: CardView | null = null;
  private highlightGraphic: Graphics | null = null;

  /** 同行内换位 */
  onSwap?: (item: SlotItem, targetSlotIndex: number) => void;
  /** 拖到同 itemId 且同 tier 的另一张卡上触发合成 */
  onMerge?: (itemA: SlotItem, itemB: SlotItem) => void;
  /** 拖出行外（场景决定卖出 or 跨容器移动） */
  onDragOut?: (item: SlotItem, globalX: number, globalY: number) => void;
  /** 拖拽中持续回调（场景据此显示卖出遮罩 / 目标行高亮） */
  onDragging?: (item: SlotItem, globalX: number, globalY: number) => void;
  /** 拖拽结束（场景据此清理所有视觉反馈） */
  onDragStop?: () => void;

  containerType: 'board' | 'stash' = 'board';

  constructor(activeSlots = 4, totalSlots = 10) {
    super();
    this._activeSlots = activeSlots;
    this._totalSlots = totalSlots;

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
      const g = new Graphics();
      g.x = i * (CARD_UNIT + CARD_GAP);

      if (locked) {
        // 锁定格：更深更暗的底色
        g.roundRect(0, 0, CARD_UNIT, CARD_H, 6);
        g.fill({ color: 0x0d0d1a, alpha: 0.7 });
        g.stroke({ color: 0x2a2a3a, width: 1 });

        // 虚线感：沿边框叠加4个角落短矩形模拟点线边框
        const dashLen = 6;
        const dashColor = 0x2a2a3a;
        for (const [dx, dy, dw, dh] of [
          [2, 0, dashLen, 1],
          [CARD_UNIT - 2 - dashLen, 0, dashLen, 1],
          [2, CARD_H - 1, dashLen, 1],
          [CARD_UNIT - 2 - dashLen, CARD_H - 1, dashLen, 1],
          [0, 2, 1, dashLen],
          [0, CARD_H - 2 - dashLen, 1, dashLen],
          [CARD_UNIT - 1, 2, 1, dashLen],
          [CARD_UNIT - 1, CARD_H - 2 - dashLen, 1, dashLen],
        ] as [number, number, number, number][]) {
          g.rect(dx, dy, dw, dh);
          g.fill({ color: dashColor, alpha: 0.5 });
        }

        // 绘制锁形图标（居中）
        this.drawLockIcon(g);
      } else {
        // 普通可用格
        g.roundRect(0, 0, CARD_UNIT, CARD_H, 6);
        g.fill({ color: 0x1a1a2e, alpha: 0.5 });
        g.stroke({ color: 0x333355, width: 1 });
      }

      this.bgSlots.addChild(g);
    }
  }

  /** 在 Graphics 内部（坐标原点为格子左上角）绘制居中锁图标 */
  private drawLockIcon(g: Graphics) {
    const cx = CARD_UNIT / 2;
    const cy = CARD_H / 2;

    // 锁身（圆角矩形）
    const bodyW = Math.round(CARD_UNIT * 0.38);
    const bodyH = Math.round(CARD_H * 0.30);
    const bodyX = Math.round(cx - bodyW / 2);
    // 锁身居中偏下一点，给锁环留空间
    const bodyY = Math.round(cy - bodyH * 0.3);

    g.roundRect(bodyX, bodyY, bodyW, bodyH, 3);
    g.fill({ color: 0x3a3a50 });

    // 锁孔（锁身中央小圆点）
    const holeR = Math.max(2, Math.round(bodyW * 0.12));
    g.circle(cx, bodyY + bodyH * 0.42, holeR);
    g.fill({ color: 0x1a1a2c });

    // 锁环（用三个矩形拼成 ∩ 形）
    const shW = Math.round(bodyW * 0.52);         // 锁环外宽
    const shThick = Math.max(2, Math.round(bodyW * 0.16)); // 线粗
    const shH = Math.round(bodyH * 0.65);         // 竖边高度
    const shLeft = Math.round(cx - shW / 2);
    const shTop = bodyY - shH;

    // 左竖边
    g.rect(shLeft, shTop, shThick, shH);
    g.fill({ color: 0x3a3a50 });
    // 右竖边
    g.rect(shLeft + shW - shThick, shTop, shThick, shH);
    g.fill({ color: 0x3a3a50 });
    // 顶横边
    g.rect(shLeft, shTop, shW, shThick);
    g.fill({ color: 0x3a3a50 });
  }

  update(items: SlotItem[]) {
    this.items = [...items];
    this.clearSlotTargetGlow();
    this.cardsLayer.removeChildren();
    for (const item of items) {
      const card = new CardView(item);
      card.x = item.slotIndex * (CARD_UNIT + CARD_GAP);
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
    const step = CARD_UNIT + CARD_GAP;
    for (const s of unitSlots) {
      if (s < 0 || s >= this._activeSlots) continue;
      const g = new Graphics();
      g.roundRect(0, 0, CARD_UNIT, CARD_H, 6);
      g.fill({ color: 0x3399ff, alpha: 0.38 });
      g.stroke({ color: 0x88ddff, width: 2 });
      g.x = s * step;
      this.slotGlowLayer.addChild(g);
    }
  }

  private setupTargetPreview(card: CardView, item: SlotItem) {
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

  private setupDrag(card: CardView, item: SlotItem) {
    card.on('pointerdown', (e: FederatedPointerEvent) => {
      this.clearSlotTargetGlow();
      this.dragItem = item;
      this.dragging = card;

      // ✅ 用 global 坐标计算 offset
      const cardGlobalPos = card.getGlobalPosition();
      this.dragOffset.x = e.global.x - cardGlobalPos.x;
      this.dragOffset.y = e.global.y - cardGlobalPos.y;

      // ✅ ghost 放到 stage 最顶层，用 global 坐标初始化位置
      this.dragGhost = new CardView(item);
      this.dragGhost.alpha = 0.7;
      this.dragGhost.x = cardGlobalPos.x;
      this.dragGhost.y = cardGlobalPos.y;

      card.alpha = 0.3;
      card.cursor = 'grabbing';

      const stage = this.getStage();
      if (stage) {
        stage.addChild(this.dragGhost);   // ✅ 添加到最顶层
        stage.eventMode = 'static';
        stage.on('pointermove', this.handleDragMove);
        stage.on('pointerup', this.handleDragEnd);
        stage.on('pointerupoutside', this.handleDragEnd);
      }
    });
  }

  private handleDragMove = (e: FederatedPointerEvent) => {
    if (!this.dragGhost || !this.dragItem) return;

    // ✅ ghost 直接用 global 坐标，完全跟随鼠标
    this.dragGhost.x = e.global.x - this.dragOffset.x;
    this.dragGhost.y = e.global.y - this.dragOffset.y;

    if (this.isWithinOwnRow(e.global.y)) {
      const local = this.toLocal(e.global);
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
      // ✅ 从 stage 移除（而不是从 cardsLayer）
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
      const gy = e.global.y;
      if (this.isWithinOwnRow(gy)) {
        const localInBoard = this.toLocal(e.global);
        const targetSlot = this.getSlotAtLocal(localInBoard.x);
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
    // 超出总格数或落在锁定格，均视为无效
    if (idx < 0 || idx >= this._totalSlots) return -1;
    if (idx >= this._activeSlots) return -1;
    return idx;
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
    // 若高亮范围超出已解锁区域，不显示
    if (slotIdx + size > this._activeSlots) return;
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
    return this._totalSlots * (CARD_UNIT + CARD_GAP) - CARD_GAP;
  }
}
