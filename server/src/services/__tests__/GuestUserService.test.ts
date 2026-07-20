import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findOneAndUpdate: vi.fn(),
  findOne: vi.fn(),
}));

vi.mock('../../models/User.js', () => ({
  UserModel: {
    findOneAndUpdate: mocks.findOneAndUpdate,
    findOne: mocks.findOne,
  },
}));

import { getOrCreateGuestUser } from '../GuestUserService.js';

describe('getOrCreateGuestUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('atomically upserts a guest by openId', async () => {
    const user = { _id: 'user-1', openId: 'guest-123', nickname: 'Player_guest-' };
    mocks.findOneAndUpdate.mockResolvedValue(user);

    await expect(getOrCreateGuestUser('guest-123')).resolves.toBe(user);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { openId: 'guest-123' },
      { $setOnInsert: { openId: 'guest-123', nickname: 'Player_guest-' } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  });

  it('returns the concurrently created user after an E11000 conflict', async () => {
    const duplicateKeyError = Object.assign(new Error('duplicate key'), { code: 11000 });
    const winner = { _id: 'user-1', openId: 'guest-123' };
    mocks.findOneAndUpdate.mockRejectedValue(duplicateKeyError);
    mocks.findOne.mockResolvedValue(winner);

    await expect(getOrCreateGuestUser('guest-123')).resolves.toBe(winner);
    expect(mocks.findOne).toHaveBeenCalledWith({ openId: 'guest-123' });
  });

  it('does not swallow unrelated database errors', async () => {
    const error = new Error('database unavailable');
    mocks.findOneAndUpdate.mockRejectedValue(error);

    await expect(getOrCreateGuestUser('guest-123')).rejects.toBe(error);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });
});
