import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { SlotItem, PvpMirrorSnapshot } from '@autocard/shared';

export interface IPvpMirror extends Document {
  runId: Types.ObjectId;
  userId: Types.ObjectId;
  day: number;
  level: number;
  snapshot: PvpMirrorSnapshot;
  createdAt: Date;
}

const PvpMirrorSchema = new Schema<IPvpMirror>({
  runId: { type: Schema.Types.ObjectId, ref: 'Run', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: Number, required: true },
  level: { type: Number, required: true },
  snapshot: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });

PvpMirrorSchema.index({ day: 1, level: 1 });

export const PvpMirrorModel = mongoose.model<IPvpMirror>('PvpMirror', PvpMirrorSchema);
