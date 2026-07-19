import mongoose, { Schema, type Document, type Types } from 'mongoose';

/** 单场 PvP 对战明细记录 */
export interface IPvpRecord extends Document {
  runId: Types.ObjectId;
  userId: Types.ObjectId;
  day: number;
  level: number;
  won: boolean;
  heroId: string;
  opponentHeroId: string;
  opponentLevel: number;
  hpLeft: number;
  maxHp: number;
  createdAt: Date;
}

const PvpRecordSchema = new Schema<IPvpRecord>({
  runId: { type: Schema.Types.ObjectId, ref: 'Run', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  day: { type: Number, required: true },
  level: { type: Number, required: true },
  won: { type: Boolean, required: true },
  heroId: { type: String, required: true },
  opponentHeroId: { type: String, required: true },
  opponentLevel: { type: Number, required: true },
  hpLeft: { type: Number, required: true },
  maxHp: { type: Number, required: true },
}, { timestamps: true });

// 玩家维度查询：按时间倒序拉取战绩
PvpRecordSchema.index({ userId: 1, createdAt: -1 });

export const PvpRecordModel = mongoose.model<IPvpRecord>('PvpRecord', PvpRecordSchema);
