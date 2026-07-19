import mongoose, { Schema, type Document } from 'mongoose';

/** OAuth 提供商条目 */
export interface OAuthProviderEntry {
  provider: 'github' | 'wechat';
  providerId: string;
  accessToken?: string;
}

export interface IUser extends Document {
  openId?: string;
  username?: string;
  passwordHash?: string;
  nickname: string;
  avatarUrl?: string;
  oauthProviders: OAuthProviderEntry[];
  createdAt: Date;
}

const OAuthProviderSchema = new Schema<OAuthProviderEntry>({
  provider: { type: String, enum: ['github', 'wechat'], required: true },
  providerId: { type: String, required: true },
  accessToken: { type: String },
}, { _id: false });

const UserSchema = new Schema<IUser>({
  openId: { type: String, sparse: true, unique: true },
  username: { type: String, sparse: true, unique: true, minlength: 3, maxlength: 24 },
  passwordHash: { type: String },
  nickname: { type: String, required: true },
  avatarUrl: { type: String },
  oauthProviders: [OAuthProviderSchema],
}, { timestamps: true });

// 为 OAuth 提供商建立复合唯一索引，防止同一 provider+providerId 重复绑定
UserSchema.index({ 'oauthProviders.provider': 1, 'oauthProviders.providerId': 1 }, { unique: true });

export const UserModel = mongoose.model<IUser>('User', UserSchema);
