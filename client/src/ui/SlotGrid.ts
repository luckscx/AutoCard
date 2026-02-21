import { Container, Graphics, Text } from 'pixi.js';
import type { SlotItem } from '@autocard/shared';
import { gameState } from '../core/GameState.js';

const SLOT_W = 64;
const SLOT_H = 64;
const GAP = 4;

const TIER_COLORS: Record<string, number> = {
  bronze: 0xcd7f32,
  silver: 0xc0c0c0,
  gold: 0xffd700,
  diamond: 0x00ffff,
};

export class SlotGrid extends Container {
  private slots: (Graphics | null)[] = [];
  private slotCount: number;
  private onSlotClick?: (index: number) => void;

  constructor(slotCount: number, onSlotClick?: (index: number) => void) {
    super();
    this.slotCount = slotCount;
    this.onSlotClick = onSlotClick;
    this.drawEmpty();
  }

  private drawEmpty() {
    for (let i = 0; i < this.slotCount; i++) {
      const g = new Graphics();
      g.roundRect(0, 0, SLOT_W, SLOT_H, 6);
      g.fill({ color: 0x2a2a4a, alpha: 0.8 });
      g.stroke({ color: 0x444466, width: 1 });
      g.x = i * (SLOT_W + GAP);
      g.eventMode = 'static';
      g.cursor = 'pointer';
      const idx = i;
      g.on('pointertap', () => this.onSlotClick?.(idx));
      this.addChild(g);
      this.slots.push(g);
    }
  }

  update(items: SlotItem[]) {
    // 清除旧内容（移除旧 item 显示）
    for (const child of [...this.children]) {
      if (child instanceof Container && !(child instanceof Graphics)) {
        this.removeChild(child);
      }
    }

    // 画占位颜色 + 标签
    for (const item of items) {
      const cfg = gameState.itemsMap.get(item.itemId);
      if (!cfg) continue;

      const w = item.size * SLOT_W + (item.size - 1) * GAP;
      const g = new Graphics();
      g.roundRect(0, 0, w, SLOT_H, 6);
      g.fill(TIER_COLORS[item.tier] ?? 0x666666);
      g.x = item.slotIndex * (SLOT_W + GAP);

      const nameText = new Text({
        text: cfg.name,
        style: { fill: '#111', fontSize: 12, fontFamily: 'Arial', wordWrap: true, wordWrapWidth: w - 4 },
      });
      nameText.x = 4;
      nameText.y = 4;

      const tierText = new Text({
        text: item.tier.toUpperCase(),
        style: { fill: '#333', fontSize: 10, fontFamily: 'Arial' },
      });
      tierText.x = 4;
      tierText.y = SLOT_H - 16;

      const container = new Container();
      container.addChild(g, nameText, tierText);
      container.x = g.x;
      container.eventMode = 'static';
      container.cursor = 'pointer';
      const idx = item.slotIndex;
      container.on('pointertap', () => this.onSlotClick?.(idx));
      this.addChild(container);
    }
  }

  get totalWidth() {
    return this.slotCount * (SLOT_W + GAP) - GAP;
  }
}
