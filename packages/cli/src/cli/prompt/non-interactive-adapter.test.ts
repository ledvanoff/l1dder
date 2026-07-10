import { describe, expect, it } from 'vitest';

import { NonInteractiveAdapter, MissingPromptDefaultError } from './non-interactive-adapter.js';

describe('NonInteractiveAdapter', () => {
  it('confirm returns true by default', async () => {
    const adapter = new NonInteractiveAdapter();
    expect(await adapter.confirm('Continue?')).toBe(true);
  });

  it('confirm returns true in yes mode', async () => {
    const adapter = new NonInteractiveAdapter({ yes: true });
    expect(await adapter.confirm('Dangerous?')).toBe(true);
  });

  it('input returns default value', async () => {
    const adapter = new NonInteractiveAdapter();
    expect(await adapter.input('Name?', 'default-name')).toBe('default-name');
  });

  it('input throws on missing default', async () => {
    const adapter = new NonInteractiveAdapter();
    await expect(adapter.input('Name?')).rejects.toThrow(MissingPromptDefaultError);
  });

  it('select returns first choice', async () => {
    const adapter = new NonInteractiveAdapter();
    const result = await adapter.select('Mode?', [
      { value: 'solo' as const, label: 'Solo' },
      { value: 'team' as const, label: 'Team' },
    ]);
    expect(result).toBe('solo');
  });
});
