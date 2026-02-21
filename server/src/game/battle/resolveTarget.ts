import type { TargetRule, SlotItem } from '@autocard/shared';

export interface ResolvedTarget {
  side: 'self' | 'opponent';
  slotIndices: number[];
}

export function resolveTarget(
  rule: TargetRule,
  ownBoard: SlotItem[],
  selfSlotIndex: number,
): ResolvedTarget {
  switch (rule.kind) {
    case 'self':
      return { side: 'self', slotIndices: [] };
    case 'adjacent': {
      const selfItem = ownBoard.find(i => i.slotIndex === selfSlotIndex);
      if (!selfItem) return { side: 'self', slotIndices: [] };
      const selfEnd = selfSlotIndex + selfItem.size;
      const indices: number[] = [];
      for (const item of ownBoard) {
        if (item.slotIndex === selfSlotIndex) continue;
        const itemEnd = item.slotIndex + item.size;
        if (itemEnd === selfSlotIndex || item.slotIndex === selfEnd) {
          indices.push(item.slotIndex);
        }
      }
      return { side: 'self', slotIndices: indices };
    }
    case 'leftmost': {
      const sorted = [...ownBoard].sort((a, b) => a.slotIndex - b.slotIndex);
      const first = sorted.find(i => i.slotIndex !== selfSlotIndex);
      return { side: 'self', slotIndices: first ? [first.slotIndex] : [] };
    }
    case 'rightmost': {
      const sorted = [...ownBoard].sort((a, b) => b.slotIndex - a.slotIndex);
      const last = sorted.find(i => i.slotIndex !== selfSlotIndex);
      return { side: 'self', slotIndices: last ? [last.slotIndex] : [] };
    }
    case 'all': {
      return { side: 'self', slotIndices: ownBoard.filter(i => i.slotIndex !== selfSlotIndex).map(i => i.slotIndex) };
    }
    case 'position': {
      const exists = ownBoard.find(i => i.slotIndex === rule.index);
      return { side: 'self', slotIndices: exists ? [rule.index] : [] };
    }
    default:
      return { side: 'self', slotIndices: [] };
  }
}
