import { describe, expect, it } from 'vitest';

import { ScriptedAdapter } from './scripted-adapter.js';

describe('ScriptedAdapter', () => {
  it('returns pre-configured response for confirm', async () => {
    const adapter = new ScriptedAdapter({ 'Continue?': false });
    expect(await adapter.confirm('Continue?')).toBe(false);
  });

  it('returns pre-configured response for input', async () => {
    const adapter = new ScriptedAdapter({ 'Name': 'test-project' });
    expect(await adapter.input('Project Name?')).toBe('test-project');
  });

  it('returns pre-configured response for select', async () => {
    const adapter = new ScriptedAdapter({ 'Mode': 'team' });
    const result = await adapter.select('Select Mode:', [
      { value: 'solo' as const, label: 'Solo' },
      { value: 'team' as const, label: 'Team' },
    ]);
    expect(result).toBe('team');
  });

  it('throws on unknown question', async () => {
    const adapter = new ScriptedAdapter({});
    await expect(adapter.confirm('Unknown?')).rejects.toThrow('no pre-configured response');
  });

  it('matches partial message text', async () => {
    const adapter = new ScriptedAdapter({ 'project': 'my-app' });
    expect(await adapter.input('Enter project name:')).toBe('my-app');
  });
});
