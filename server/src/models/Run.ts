import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { RunStatus, SlotItem, Tier, ItemSize } from '@autocard/shared';

export interface IRun extends Document {
  userId: Types.ObjectId;
  heroId: string;
  status: RunStatus;
  day: number;
  hour: number;
  prestige: number;
  pvpWins: number;
  xp: number;
  level: number;
  gold: number;
  hp: number;
  maxHp: number;
  board: SlotItem[];
  stash: SlotItem[];
  shopItems: string[];
  shopRefreshed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SlotItemSchema = new Schema<SlotItem>({
  itemId: { type: String, required: true },
  tier: { type: String, enum: ['bronze', 'silver', 'gold', 'diamond'], required: true },
  size: { type: Number, enum: [1, 2, 3], required: true },
  slotIndex: { type: Number, required: true },
}, { _id: false });

const RunSchema = new Schema<IRun>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  heroId: { type: String, required: true },
  status: { type: String, enum: ['active', 'finished_win', 'finished_lose'], default: 'active' },
  day: { type: Number, default: 1 },
  hour: { type: Number, default: 1 },
  prestige: { type: Number, default: 20 },
  pvpWins: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  gold: { type: Number, default: 0 },
  hp: { type: Number, default: 100 },
  maxHp: { type: Number, default: 100 },
  board: { type: [SlotItemSchema], default: [] },
  stash: { type: [SlotItemSchema], default: [] },
  shopItems: { type: [String], default: [] },
  shopRefreshed: { type: Boolean, default: false },
}, { timestamps: true });

RunSchema.index({ userId: 1, status: 1 });

export const RunModel = mongoose.model<IRun>('Run', RunSchema);
