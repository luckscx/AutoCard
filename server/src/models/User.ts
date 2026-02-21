import mongoose, { Schema, type Document } from 'mongoose';

export interface IUser extends Document {
  openId?: string;
  nickname: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  openId: { type: String, sparse: true, unique: true },
  nickname: { type: String, required: true },
}, { timestamps: true });

export const UserModel = mongoose.model<IUser>('User', UserSchema);
