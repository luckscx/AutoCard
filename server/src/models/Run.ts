import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { RunStatus, SlotItem, Tier, ItemSize, PendingEventState, OwnedPassive, PendingSkillChoiceState } from '@autocard/shared';

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
  pendingEvent?: PendingEventState | null | undefined;
  income: number;
  hpRegen: number;
  goldGainBonus: number;
  boardSlots: number;
  pendingLevelUp?: { level: number; choices: { label: string; kind: string }[] } | null;
  globalPassives?: OwnedPassive[] | null;
  pendingSkillChoice?: PendingSkillChoiceState | null;
  createdAt: Date;
  updatedAt: Date;
}

const SlotItemSchema = new Schema<SlotItem>({
  itemId: { type: String, required: true },
  tier: { type: String, enum: ['bronze', 'silver', 'gold', 'diamond', 'legendary'], required: true },
  size: { type: Number, enum: [1, 2, 3], required: true },
  slotIndex: { type: Number, required: true },
}, { _id: false });

const PendingEventOptionSchema = new Schema<{ label: string }>({
  label: { type: String, required: true },
}, { _id: false });

const PendingEventSchema = new Schema<PendingEventState>({
  eventId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  options: { type: [PendingEventOptionSchema], required: true },
}, { _id: false });

const OwnedPassiveSchema = new Schema<OwnedPassive>({
  id: { type: String, required: true },
  stacks: { type: Number, required: true },
  totalValue: { type: Number, required: true },
}, { _id: false });

const PendingSkillChoiceSchema = new Schema<PendingSkillChoiceState>({
  choices: { type: [String], required: true },
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
  pendingEvent: { type: PendingEventSchema, default: null },
  income: { type: Number, default: 0 },
  hpRegen: { type: Number, default: 0 },
  goldGainBonus: { type: Number, default: 0 },
  boardSlots: { type: Number, default: 4 },
  pendingLevelUp: {
    type: new Schema({
      level: { type: Number, required: true },
      choices: [{ label: String, kind: String, _id: false }],
    }, { _id: false }),
    default: null,
  },
  globalPassives: {
    type: [OwnedPassiveSchema],
    default: [],
  },
  pendingSkillChoice: {
    type: PendingSkillChoiceSchema,
    default: null,
  },
}, { timestamps: true });

RunSchema.index({ userId: 1, status: 1 });

export const RunModel = mongoose.model<IRun>('Run', RunSchema);
