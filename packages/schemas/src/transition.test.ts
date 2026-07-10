import { describe, expect, it } from 'vitest';

import { RollbackRequestSchema, TransitionRequestSchema } from './transition.js';

const humanActor = { kind: 'human' as const, id: 'user@example.com' };

describe('TransitionRequestSchema', () => {
  it('parses valid transition request', () => {
    const result = TransitionRequestSchema.parse({
      to: 'plan',
      trigger: { kind: 'cli', command: 'transition' },
      actor: humanActor,
    });
    expect(result.to).toBe('plan');
    expect(result.trigger.kind).toBe('cli');
    expect(result.actor.kind).toBe('human');
    expect(result.dryRun).toBe(false);
    expect(result.force).toBe(false);
  });

  it('accepts dryRun and force flags', () => {
    const result = TransitionRequestSchema.parse({
      to: 'specify',
      trigger: { kind: 'slash', command: 'specify' },
      actor: { kind: 'ai', model: 'claude-opus-4' },
      dryRun: true,
      force: true,
    });
    expect(result.dryRun).toBe(true);
    expect(result.force).toBe(true);
  });

  it('rejects missing required fields', () => {
    expect(() => TransitionRequestSchema.parse({})).toThrow();
    expect(() => TransitionRequestSchema.parse({ to: 'plan' })).toThrow();
    expect(() => TransitionRequestSchema.parse({ to: 'plan', trigger: { kind: 'cli', command: 'x' } })).toThrow();
  });

  it('rejects invalid phase value', () => {
    expect(() =>
      TransitionRequestSchema.parse({
        to: 'nonexistent',
        trigger: { kind: 'cli', command: 'x' },
        actor: humanActor,
      }),
    ).toThrow();
  });
});

describe('RollbackRequestSchema', () => {
  it('parses valid rollback request', () => {
    const result = RollbackRequestSchema.parse({
      to: 'specify',
      reason: 'Requirements changed',
      actor: humanActor,
    });
    expect(result.to).toBe('specify');
    expect(result.reason).toBe('Requirements changed');
    expect(result.actor.kind).toBe('human');
  });

  it('rejects missing reason', () => {
    expect(() =>
      RollbackRequestSchema.parse({
        to: 'specify',
        actor: humanActor,
      }),
    ).toThrow();
  });
});
