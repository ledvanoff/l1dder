import { describe, expect, it } from 'vitest';

import {
  ConfigSchema,
  ContextConfigSchema,
  DeliveryCriteriaSchema,
  GateConfigEntrySchema,
  GatesConfigSchema,
  HygieneConfigSchema,
  LanguageSchema,
} from './config.js';

const defaultConfig = {
  schema_version: 1,
  role_mode: 'solo',
  adapter: 'cursor',
  gates: {
    default: {
      enabled: true,
      skip_allowed: false,
      min_approvers: 1,
      custom_gates: [],
    },
    overrides: {},
  },
  stage: {
    enforcement: {
      restrict_phases: 'advisory',
      require_criteria: 'advisory',
    },
    delivery_criteria: {
      require_idea_not_skeleton: true,
      require_roadmap: true,
      require_architecture_not_skeleton: true,
      require_erd_not_skeleton: true,
      require_usecases_not_skeleton: true,
      min_design_files: 1,
      check_skeleton_markers: true,
    },
  },
  context: {
    token_budget: 120_000,
    reserved_tokens: 30_000,
    chars_per_token: 3.0,
    overrides: {},
    extra_files: [],
  },
  presets: {
    active: 'default',
    custom: {},
  },
};

describe('ConfigSchema', () => {
  it('parses full default config', () => {
    const result = ConfigSchema.parse(defaultConfig);
    expect(result.schema_version).toBe(1);
    expect(result.role_mode).toBe('solo');
    expect(result.adapters).toEqual([]);
    expect(result.gates.default.enabled).toBe(true);
    expect(result.stage.delivery_criteria.require_idea_not_skeleton).toBe(true);
    expect(result.stage.delivery_criteria.require_roadmap).toBe(true);
    expect(result.stage.delivery_criteria.require_architecture_not_skeleton).toBe(true);
    expect(result.context.token_budget).toBe(120_000);
    expect(result.presets.active).toBe('default');
  });

  it('parses empty object with all defaults', () => {
    const result = ConfigSchema.parse({});
    expect(result.schema_version).toBe(1);
    expect(result.role_mode).toBe('solo');
    expect(result.adapters).toEqual([]);
    expect(result.gates.default.enabled).toBe(true);
    expect(result.gates.default.skip_allowed).toBe(false);
    expect(result.gates.default.min_approvers).toBe(1);
    expect(result.stage.enforcement.restrict_phases).toBe('advisory');
    expect(result.context.token_budget).toBe(120_000);
    expect(result.presets.active).toBe('default');
    expect(result.language.docs).toBe('en');
    expect(result.language.chat).toBe('en');
  });

  it('accepts custom role_mode team', () => {
    const result = ConfigSchema.parse({ role_mode: 'team' });
    expect(result.role_mode).toBe('team');
  });

  it('accepts legacy adapter id for backward compatibility', () => {
    const result = ConfigSchema.parse({ adapter: 'cursor' });
    expect(result.adapters).toEqual([]);
  });

  it('accepts adapters array for multi-target config', () => {
    const result = ConfigSchema.parse({ adapters: ['cursor', 'claude'] });
    expect(result.adapters).toEqual(['cursor', 'claude']);
  });

  it('rejects invalid role_mode', () => {
    expect(() => ConfigSchema.parse({ role_mode: 'invalid' })).toThrow();
  });

  it('defaults language to en/en when section is absent', () => {
    const result = ConfigSchema.parse({});
    expect(result.language).toEqual({ docs: 'en', chat: 'en' });
  });

  it('defaults hygiene config when section is absent (back-compat)', () => {
    const result = ConfigSchema.parse({});
    expect(result.hygiene.drift_threshold).toBe(3);
    expect(result.hygiene.maintenance_cadence_days).toBe(30);
  });

  it('parses old-shape config without hygiene section unaffected', () => {
    const result = ConfigSchema.parse(defaultConfig);
    expect(result.hygiene.drift_threshold).toBe(3);
    expect(result.stage.delivery_criteria.require_idea_not_skeleton).toBe(true);
  });

  it('keeps language fields independent', () => {
    const result = ConfigSchema.parse({ language: { docs: 'ru' } });
    expect(result.language.docs).toBe('ru');
    expect(result.language.chat).toBe('en');
  });

  it('rejects unsupported language code', () => {
    expect(() => ConfigSchema.parse({ language: { docs: 'fr' } })).toThrow();
  });
});

describe('LanguageSchema', () => {
  it('applies en defaults on empty object', () => {
    const result = LanguageSchema.parse({});
    expect(result.docs).toBe('en');
    expect(result.chat).toBe('en');
  });

  it('accepts ru for both fields', () => {
    const result = LanguageSchema.parse({ docs: 'ru', chat: 'ru' });
    expect(result.docs).toBe('ru');
    expect(result.chat).toBe('ru');
  });
});

describe('GateConfigEntrySchema', () => {
  it('parses spec gate example', () => {
    const gateEntry = {
      enabled: true,
      skip_allowed: true,
      min_approvers: 2,
      custom_gates: ['review-checklist'],
    };
    const result = GateConfigEntrySchema.parse(gateEntry);
    expect(result.skip_allowed).toBe(true);
    expect(result.min_approvers).toBe(2);
    expect(result.custom_gates).toEqual(['review-checklist']);
  });

  it('applies defaults on empty object', () => {
    const result = GateConfigEntrySchema.parse({});
    expect(result.enabled).toBe(true);
    expect(result.skip_allowed).toBe(false);
    expect(result.min_approvers).toBe(1);
    expect(result.custom_gates).toEqual([]);
  });
});

describe('GatesConfigSchema', () => {
  it('accepts per-phase overrides', () => {
    const result = GatesConfigSchema.parse({
      default: {},
      overrides: {
        'spec-gate': { enabled: true, skip_allowed: true, min_approvers: 1, custom_gates: [] },
      },
    });
    expect(result.overrides['spec-gate']).toBeDefined();
  });
});

describe('DeliveryCriteriaSchema', () => {
  it('applies all-true defaults on empty object', () => {
    const result = DeliveryCriteriaSchema.parse({});
    expect(result.require_idea_not_skeleton).toBe(true);
    expect(result.require_roadmap).toBe(true);
    expect(result.require_architecture_not_skeleton).toBe(true);
    expect(result.require_erd_not_skeleton).toBe(true);
    expect(result.require_usecases_not_skeleton).toBe(true);
    expect(result.min_design_files).toBe(1);
    expect(result.check_skeleton_markers).toBe(true);
  });

  it('accepts custom min_design_files, other flags stay default', () => {
    const result = DeliveryCriteriaSchema.parse({ min_design_files: 3 });
    expect(result.min_design_files).toBe(3);
    expect(result.require_idea_not_skeleton).toBe(true);
    expect(result.require_roadmap).toBe(true);
  });

  it('allows disabling erd milestone for projects without a database', () => {
    const result = DeliveryCriteriaSchema.parse({ require_erd_not_skeleton: false });
    expect(result.require_erd_not_skeleton).toBe(false);
    expect(result.require_architecture_not_skeleton).toBe(true);
  });

  it('allows disabling skeleton markers check', () => {
    const result = DeliveryCriteriaSchema.parse({ check_skeleton_markers: false });
    expect(result.check_skeleton_markers).toBe(false);
  });
});

describe('HygieneConfigSchema', () => {
  it('applies defaults on empty object', () => {
    const result = HygieneConfigSchema.parse({});
    expect(result.drift_threshold).toBe(3);
    expect(result.maintenance_cadence_days).toBe(30);
  });

  it('accepts a custom drift threshold and cadence', () => {
    const result = HygieneConfigSchema.parse({ drift_threshold: 5, maintenance_cadence_days: 14 });
    expect(result.drift_threshold).toBe(5);
    expect(result.maintenance_cadence_days).toBe(14);
  });

  it('a cadence of 0 disables the cadence advisory (still valid)', () => {
    const result = HygieneConfigSchema.parse({ maintenance_cadence_days: 0 });
    expect(result.maintenance_cadence_days).toBe(0);
  });
});

describe('ContextConfigSchema', () => {
  it('applies correct defaults', () => {
    const result = ContextConfigSchema.parse({});
    expect(result.token_budget).toBe(120_000);
    expect(result.reserved_tokens).toBe(30_000);
    expect(result.chars_per_token).toBe(3.0);
    expect(result.extra_files).toEqual([]);
  });

  it('accepts custom budget', () => {
    const result = ContextConfigSchema.parse({ token_budget: 200_000 });
    expect(result.token_budget).toBe(200_000);
  });
});
