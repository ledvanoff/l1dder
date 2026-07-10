import { join } from 'node:path';

import type { CliContext } from '../context.js';
import { ExitCode } from '../output/exit-codes.js';
import { StandardsParser } from '@l1dder/knowledge';
import { ConfigSchema } from '@l1dder/schemas';
import type { CheckOutput } from '@l1dder/schemas';
import { parseDocument } from '@l1dder/yaml';

/** Individual check entry produced by `l1dder check`. */
interface CheckEntry {
  id: string;
  level: 'pass' | 'warn' | 'fail';
  message: string;
  hint?: string;
}

/** Result returned by executeCheck. */
interface CheckResult {
  exitCode: number;
  data?: CheckOutput;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

const MACHINE_ENFORCED_KEYS = new Set([
  'architecture.dependency_direction',
  'architecture.esm_only',
  'error_handling.result_pattern',
  'testing.framework',
  'formatting.strict_types',
]);

/**
 * Execute `l1dder check` — advisory validation of standards and config.
 *
 * Checks: base YAML parseable, user overrides parsed, config.yml valid,
 * override conflicts with machine-enforced keys.
 */
export async function executeCheck(ctx: CliContext): Promise<CheckResult> {
  const checks: CheckEntry[] = [];
  const parser = new StandardsParser({ fs: ctx.fs, projectRoot: ctx.cwd });

  // 1. Validate base standards (conventions + workflow)
  const convResult = await parser.loadBaseConventions();
  if (convResult.ok) {
    checks.push({
      id: 'base-conventions',
      level: 'pass',
      message: 'conventions.base.yml parsed successfully',
    });
  } else {
    checks.push({
      id: 'base-conventions',
      level: 'fail',
      message: `conventions.base.yml: ${convResult.error.message}`,
      hint: 'Check standards/.base/conventions.base.yml syntax',
    });
  }

  const wfResult = await parser.loadBaseWorkflow();
  if (wfResult.ok) {
    checks.push({
      id: 'base-workflow',
      level: 'pass',
      message: 'workflow.base.yml parsed successfully',
    });
  } else {
    checks.push({
      id: 'base-workflow',
      level: 'fail',
      message: `workflow.base.yml: ${wfResult.error.message}`,
      hint: 'Check standards/.base/workflow.base.yml syntax',
    });
  }

  // 2. Validate user overrides
  const convOverrides = await loadUserOverridesFile(
    ctx,
    'standards/conventions.md',
    'user-overrides-conventions',
    checks,
  );
  const wfOverrides = await loadUserOverridesFile(
    ctx,
    'standards/workflow.md',
    'user-overrides-workflow',
    checks,
  );

  // 3. Check override conflicts with machine-enforced keys
  checkMachineEnforcedConflicts(convOverrides, 'conventions', checks);
  checkMachineEnforcedConflicts(wfOverrides, 'workflow', checks);

  // 4. Validate config.yml
  await validateConfig(ctx, checks);

  // 5. Summarize
  const summary = summarize(checks);

  const hasSchemaFail = checks.some(
    (c) => c.level === 'fail' && (c.id === 'config-schema' || c.id === 'config-parse'),
  );

  const exitCode = hasSchemaFail ? ExitCode.SCHEMA_VALIDATION : ExitCode.SUCCESS;

  const data: CheckOutput = { summary, checks };
  const humanText = formatHuman(ctx, checks, summary);

  return { exitCode, data, humanText };
}

async function loadUserOverridesFile(
  ctx: CliContext,
  relativePath: string,
  checkId: string,
  checks: CheckEntry[],
): Promise<Map<string, { key: string; value: string; reason: string }>> {
  const fullPath = join(ctx.cwd, relativePath);
  try {
    const content = await ctx.fs.readFile(fullPath);
    const parser = new StandardsParser({ fs: ctx.fs, projectRoot: ctx.cwd });
    const overrides = parser.parseUserOverrides(content);
    if (overrides.size > 0) {
      checks.push({
        id: checkId,
        level: 'pass',
        message: `${relativePath}: ${String(overrides.size)} override(s) parsed`,
      });
    } else {
      checks.push({
        id: checkId,
        level: 'pass',
        message: `${relativePath}: no overrides defined`,
      });
    }
    return overrides;
  } catch {
    checks.push({
      id: checkId,
      level: 'pass',
      message: `${relativePath}: file not found (optional)`,
    });
    return new Map();
  }
}

function checkMachineEnforcedConflicts(
  overrides: Map<string, { key: string; value: string; reason: string }>,
  source: string,
  checks: CheckEntry[],
): void {
  for (const [key] of overrides) {
    if (MACHINE_ENFORCED_KEYS.has(key)) {
      checks.push({
        id: `override-conflict-${source}-${key}`,
        level: 'warn',
        message: `Override "${key}" conflicts with machine-enforced rule (ignored at runtime)`,
        hint: `Remove from ${source} overrides or accept it will be ignored`,
      });
    }
  }
}

async function validateConfig(ctx: CliContext, checks: CheckEntry[]): Promise<void> {
  const configPath = join(ctx.cwd, '.l1dder', 'config.yml');

  let content: string;
  try {
    content = await ctx.fs.readFile(configPath);
  } catch {
    checks.push({
      id: 'config-missing',
      level: 'fail',
      message: 'config.yml not found',
      hint: "Run 'l1dder init' to create project files",
    });
    return;
  }

  let parsed: unknown;
  try {
    const doc = parseDocument(content);
    parsed = doc.toJS();
  } catch (e) {
    checks.push({
      id: 'config-parse',
      level: 'fail',
      message: `config.yml: invalid YAML — ${e instanceof Error ? e.message : 'unknown error'}`,
    });
    return;
  }

  const result = ConfigSchema.safeParse(parsed);
  if (result.success) {
    checks.push({
      id: 'config-schema',
      level: 'pass',
      message: 'config.yml validates against ConfigSchema',
    });
  } else {
    checks.push({
      id: 'config-schema',
      level: 'fail',
      message: `config.yml schema errors: ${result.error.issues.map((i) => i.message).join('; ')}`,
      hint: 'Review config.yml against expected schema',
    });
  }
}

function summarize(checks: CheckEntry[]): { pass: number; warn: number; fail: number } {
  let pass = 0;
  let warn = 0;
  let fail = 0;
  for (const c of checks) {
    if (c.level === 'pass') pass++;
    else if (c.level === 'warn') warn++;
    else fail++;
  }
  return { pass, warn, fail };
}

function formatHuman(
  ctx: CliContext,
  checks: CheckEntry[],
  summary: { pass: number; warn: number; fail: number },
): string {
  const { colors } = ctx;
  const lines: string[] = [];

  lines.push('');
  lines.push(colors.dim('────────── L1DDER Check ──────────'));
  lines.push('');

  lines.push(`  ${colors.bold('Standards')}`);
  const stdChecks = checks.filter((c) =>
    c.id.startsWith('base-') || c.id.startsWith('user-overrides') || c.id.startsWith('override-conflict'),
  );
  for (const c of stdChecks) {
    lines.push(`  ${levelGlyph(c.level, colors)} ${c.message}`);
  }

  lines.push('');
  lines.push(`  ${colors.bold('Configuration')}`);
  const cfgChecks = checks.filter((c) => c.id.startsWith('config'));
  for (const c of cfgChecks) {
    lines.push(`  ${levelGlyph(c.level, colors)} ${c.message}`);
  }

  lines.push('');
  const parts: string[] = [];
  if (summary.pass > 0) parts.push(colors.success(`${String(summary.pass)} pass`));
  if (summary.warn > 0) parts.push(colors.warning(`${String(summary.warn)} warn`));
  if (summary.fail > 0) parts.push(colors.error(`${String(summary.fail)} fail`));
  lines.push(`  Summary: ${parts.join(' · ')}`);
  lines.push('');

  return lines.join('\n');
}

function levelGlyph(level: 'pass' | 'warn' | 'fail', colors: CliContext['colors']): string {
  switch (level) {
    case 'pass':
      return colors.glyph.pass;
    case 'warn':
      return colors.glyph.warn;
    case 'fail':
      return colors.glyph.fail;
  }
}
