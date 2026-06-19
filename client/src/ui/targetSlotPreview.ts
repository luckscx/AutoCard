import type { SlotItem, TargetRule } from '@autocard/shared';

function unitSlotsForItem(it: SlotItem): number[] {
  const out: number[] = [];
  for (let s = it.slotIndex; s < it.slotIndex + it.size; s++) out.push(s);
  return out;
}

/** 棋盘悬停：返回要高亮的格子下标 0..9（单位格） */
export function getTargetRuleHighlightSlots(
  hovered: SlotItem,
  board: SlotItem[],
  rule: TargetRule,
): number[] {
  const out = new Set<number>();

  switch (rule.kind) {
    case 'self':
      unitSlotsForItem(hovered).forEach(s => out.add(s));
      break;
    case 'adjacent': {
      const selfEnd = hovered.slotIndex + hovered.size;
      for (const item of board) {
        if (item.slotIndex === hovered.slotIndex) continue;
        const itemEnd = item.slotIndex + item.size;
        if (itemEnd === hovered.slotIndex || item.slotIndex === selfEnd) {
          unitSlotsForItem(item).forEach(s => out.add(s));
        }
      }
      break;
    }
    case 'leftmost': {
      const sorted = [...board].sort((a, b) => a.slotIndex - b.slotIndex);
      const first = sorted.find(i => i.slotIndex !== hovered.slotIndex);
      if (first) unitSlotsForItem(first).forEach(s => out.add(s));
      break;
    }
    case 'rightmost': {
      const sorted = [...board].sort((a, b) => b.slotIndex - a.slotIndex);
      const last = sorted.find(i => i.slotIndex !== hovered.slotIndex);
      if (last) unitSlotsForItem(last).forEach(s => out.add(s));
      break;
    }
    case 'all':
      for (const item of board) {
        if (item.slotIndex === hovered.slotIndex) continue;
        unitSlotsForItem(item).forEach(s => out.add(s));
      }
      break;
    case 'position': {
      const idx = rule.index;
      if (idx >= 0 && idx < 10) {
        const exists = board.find(i => idx >= i.slotIndex && idx < i.slotIndex + i.size);
        if (exists) unitSlotsForItem(exists).forEach(s => out.add(s));
        else out.add(idx);
      }
      break;
    }
    default:
      break;
  }

  return Array.from(out).sort((a, b) => a - b);
}
