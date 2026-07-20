import { UserModel, type IUser } from '../models/User.js';

/**
 * 获取游客用户；不存在时原子创建。
 *
 * MongoDB 的并发 upsert 在唯一索引竞争下仍可能有一个请求收到 E11000，
 * 此时获胜请求已经创建了用户，回查并复用该用户即可。
 */
export async function getOrCreateGuestUser(openId: string): Promise<IUser> {
  try {
    const user = await UserModel.findOneAndUpdate(
      { openId },
      { $setOnInsert: { openId, nickname: `Player_${openId.slice(0, 6)}` } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (!user) throw new Error('Failed to create guest user');
    return user;
  } catch (error: any) {
    if (error?.code !== 11000) throw error;

    // 另一个并发请求已插入相同 openId，读取它创建的用户。
    const user = await UserModel.findOne({ openId });
    if (user) return user;
    throw error;
  }
}
