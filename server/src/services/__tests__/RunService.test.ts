import { describe, expect, it, vi } from 'vitest';
import { RunService } from '../RunService.js';

describe('RunService.handleHourChoice', () => {
  it('does not treat an unknown runtime choice as a free gift', async () => {
    const service = new RunService();
    const getActiveRun = vi.spyOn(service as any, 'getActiveRun');

    await expect(
      service.handleHourChoice('run-1', 'user-1', 'free-gift' as any),
    ).rejects.toThrow('choice must be one of: shop, event, gift');

    expect(getActiveRun).not.toHaveBeenCalled();
  });
});
