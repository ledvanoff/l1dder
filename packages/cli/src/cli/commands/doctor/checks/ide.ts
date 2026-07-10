import type { AIIdeAdapter, AdapterContext, AdapterManifest, IdeAdapterRegistry } from '@l1dder/core';
import { ConfigSchema } from '@l1dder/schemas';
import type { CliContext } from '../../../context.js';
import { getAdapterRegistry } from '../../adapter-context.js';
import type { DoctorCheck } from '../types.js';

/** Output kind → predicate matching the `source` tag of a transformed file that fulfils it. */
const OUTPUT_KIND_MATCHERS: Readonly<Record<keyof AdapterManifest['outputs'], (source: string) => boolean>> = {
  commands: (source) => source.startsWith('command:'),
  skills: (source) => source.startsWith('skill:'),
  rules: (source) => source.startsWith('rule:'),
  agents_md: (source) => source === 'agents-md',
  hooks: (source) => source.startsWith('hooks:'),
};

/**
 * E8 adapter-compliance checks (Iteration 6, T-07, DEC-6-7): `doctor --section ide`.
 *
 * For each adapter registered in `IdeAdapterRegistry`, mechanically verifies:
 * - Manifest completeness (id/name/version/marker/managedPrefix/outputs present)
 * - Declared vs. actual: every output kind declared in `manifest.outputs` is
 *   actually produced by `transformForInstall()` (a pure, read-only
 *   transform — no files are written), and vice versa (no undeclared output).
 *
 * Does not attempt to verify JSDoc via source-comment parsing — that isn't
 * mechanically checkable once adapters are compiled to `.js` (comments are
 * stripped), so "documented" is approximated by requiring a human-readable
 * `manifest.name` distinct from the bare `id` (DEC-6-1: doctor stays purely
 * mechanical; deeper "is this actually well-documented" judgment belongs to
 * the `hygiene-audit` skill, not doctor).
 */
export async function checkIde(
  ctx: CliContext,
  registryOverride?: IdeAdapterRegistry,
): Promise<DoctorCheck[]> {
  const registry = registryOverride ?? getAdapterRegistry(ctx);
  const ids = registry.ids();

  if (ids.length === 0) {
    return [{ id: 'ide-empty', level: 'warn', message: 'No IDE adapters registered' }];
  }

  const checks: DoctorCheck[] = [];
  for (const id of ids) {
    const adapter = registry.resolve(id);
    if (!adapter) continue;
    checks.push(await checkAdapterCompliance(adapter, ctx));
  }
  return checks;
}

async function checkAdapterCompliance(adapter: AIIdeAdapter, ctx: CliContext): Promise<DoctorCheck> {
  const issues: string[] = [...checkManifestCompleteness(adapter)];

  try {
    issues.push(...(await checkDeclaredVsActual(adapter, ctx)));
  } catch (error) {
    issues.push(`transformForInstall() threw: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (issues.length === 0) {
    return {
      id: `ide-${adapter.id}`,
      level: 'pass',
      message: `${adapter.id}: manifest complete, declared outputs match actual`,
    };
  }

  return {
    id: `ide-${adapter.id}`,
    level: 'fail',
    message: `${adapter.id}: ${issues.join('; ')}`,
  };
}

function checkManifestCompleteness(adapter: AIIdeAdapter): string[] {
  const issues: string[] = [];
  const manifest = adapter.manifest;

  if (manifest.id !== adapter.id) {
    issues.push(`manifest.id ("${manifest.id}") does not match adapter.id ("${adapter.id}")`);
  }
  if (manifest.name.trim().length === 0) {
    issues.push('manifest.name is empty');
  } else if (manifest.name === manifest.id) {
    issues.push('manifest.name is undocumented (equals id — expected a human-readable name)');
  }
  if (!Number.isInteger(manifest.version) || manifest.version < 1) {
    issues.push('manifest.version must be a positive integer');
  }
  if (manifest.marker.trim().length === 0) {
    issues.push('manifest.marker is empty');
  }
  if (manifest.managedPrefix.trim().length === 0) {
    issues.push('manifest.managedPrefix is empty');
  }
  if (Object.keys(manifest.outputs).length === 0) {
    issues.push('manifest.outputs declares no output kinds');
  }

  return issues;
}

async function checkDeclaredVsActual(adapter: AIIdeAdapter, ctx: CliContext): Promise<string[]> {
  const issues: string[] = [];
  const declaredKinds = Object.keys(adapter.manifest.outputs) as (keyof AdapterManifest['outputs'])[];

  const files = await adapter.transformForInstall(buildSyntheticAdapterContext(ctx));
  const producedKinds = new Set<keyof AdapterManifest['outputs']>();

  for (const file of files) {
    for (const [kind, matches] of Object.entries(OUTPUT_KIND_MATCHERS) as [
      keyof AdapterManifest['outputs'],
      (source: string) => boolean,
    ][]) {
      if (matches(file.source)) producedKinds.add(kind);
    }
  }

  for (const kind of declaredKinds) {
    if (!producedKinds.has(kind)) {
      issues.push(`declares "${kind}" output but transformForInstall() produced none`);
    }
  }
  for (const kind of producedKinds) {
    if (!declaredKinds.includes(kind)) {
      issues.push(`transformForInstall() produced undeclared "${kind}" output`);
    }
  }

  return issues;
}

/**
 * Minimal, synthetic `AdapterContext` — one skill and one command are enough
 * to exercise every output kind an adapter might declare. Pure/read-only:
 * `transformForInstall()` never writes to disk.
 */
function buildSyntheticAdapterContext(ctx: CliContext): AdapterContext {
  return {
    projectRoot: ctx.cwd,
    config: ConfigSchema.parse({}),
    skills: [
      {
        frontMatter: {
          id: 'doctor-probe-skill',
          name: 'Doctor Probe Skill',
          format_version: 1,
          phase: 'idle',
          roles: [],
          trigger: 'manual',
          priority: 5,
          context_profile: null,
          tags: [],
          builtin: true,
        },
        body: '## Summary\n\nProbe skill for adapter-compliance checks.\n',
        summary: 'Probe skill for adapter-compliance checks.',
        filePath: 'skills/built-in/doctor-probe-skill.md',
        category: 'builtin',
      },
    ],
    commands: [
      {
        frontMatter: {
          id: 'doctor-probe',
          name: 'Doctor Probe',
          format_version: 1,
          phase: '*',
          trigger_kind: 'no_transition',
          role: 'developer',
          skill: null,
          artifact_template: null,
          artifact_path: null,
          context_profile: null,
          accepts_argument: false,
          idempotent: true,
          requires_owner_approve: false,
          tags: [],
          builtin: true,
        },
        sections: {},
        body: '',
        filePath: 'commands/doctor-probe.md',
      },
    ],
    personas: [],
    standards: {},
    force: false,
    dryRun: true,
  };
}
