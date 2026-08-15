import { describe, it, expect } from 'vitest';
import type { Command } from 'commander';
import { Phase } from '@l1dder/core';
import { InMemoryFileSystem, FixedClock, NullLogger } from '@l1dder/core/testing';
import { HelpmeOutputSchema, type HelpmeOutput } from '@l1dder/schemas';
import {
  PRIMARY_ACTION_COMMANDS,
  resolvePrimaryAction,
} from '@l1dder/state';

import { createProgram } from './program.js';
import { createColorPalette } from './output/colors.js';
import { createFormatter } from './output/formatter.js';
import { parseGlobals } from './globals.js';
import { buildContext } from './context.js';
import { NonInteractiveAdapter } from './prompt/non-interactive-adapter.js';
import { executeHelpme } from './commands/helpme/helpme.js';
import { executeDiscovery } from './commands/discovery/discovery.js';
import { executeProfile } from './commands/profile/profile.js';
import { ExitCode } from './output/exit-codes.js';
import type { CliContext } from './context.js';

/**
 * Expand {@link PRIMARY_ACTION_COMMANDS} into concrete CLI invocation strings.
 *
 * Function-valued entries are called with a representative argument so the
 * resulting command word can be checked against the registered Commander tree.
 */
function expandPrimaryActionCommands(): readonly string[] {
  const cmds = PRIMARY_ACTION_COMMANDS;
  return [
    cmds.resolveRecovery,
    cmds.selectProfile('product_discovery'),
    cmds.startBrainstorm('idea'),
    cmds.planMilestone('idea'),
    cmds.startMilestone('idea'),
    cmds.completeMilestone('idea'),
    cmds.advanceStage,
    cmds.transitionPhase(Phase.SPECIFY),
    cmds.none,
  ];
}

/**
 * Extract the top-level command word from a `l1dder …` invocation string.
 *
 * @returns The word after `l1dder`, or `null` for empty / non-l1dder strings
 */
function topLevelCommandWord(invocation: string): string | null {
  const trimmed = invocation.trim();
  if (trimmed.length === 0) return null;
  const parts = trimmed.split(/\s+/);
  if (parts[0] !== 'l1dder') {
    throw new Error(`Expected invocation to start with l1dder, got: ${invocation}`);
  }
  return parts[1] ?? null;
}

/**
 * Collect registered top-level Commander command names (e.g. `init`, `profile`).
 */
function registeredTopLevelNames(program: Command): ReadonlySet<string> {
  return new Set(program.commands.map((cmd) => cmd.name()));
}

describe('PRIMARY_ACTION_COMMANDS ↔ CLI surface', () => {
  // @tc TC-005-02-A
  it('every primary action command names a registered CLI command', () => {
    const globals = parseGlobals({});
    const colors = createColorPalette(false);
    const output = createFormatter('human', colors);
    const program = createProgram(globals, output, colors);

    const registered = registeredTopLevelNames(program);
    // Sanity: the freshly-added `profile` surface must be present, or this
    // contract would silently pass for every non-profile primary action.
    expect(registered.has('profile')).toBe(true);

    const missing: string[] = [];
    for (const invocation of expandPrimaryActionCommands()) {
      const word = topLevelCommandWord(invocation);
      if (word === null) continue; // skip PRIMARY_ACTION_COMMANDS.none
      if (!registered.has(word)) {
        missing.push(`${invocation} → "${word}"`);
      }
    }

    expect(missing).toEqual([]);
  });

  it('plan and complete prefixes fail on missing required flags and therefore must declare needs_input', async () => {
    const plan = resolvePrimaryAction({
      hasInFlightTransition: false,
      selectedProfile: 'product_discovery',
      recommendedProfile: 'product_discovery',
      projectStage: 'discovery',
      currentPhase: 'idle',
      discoveryReady: false,
      currentMilestoneId: 'idea',
      currentMilestoneStatus: 'brainstorming',
      missingEvidence: false,
      allowedTransitions: [],
    });
    const complete = resolvePrimaryAction({
      hasInFlightTransition: false,
      selectedProfile: 'product_discovery',
      recommendedProfile: 'product_discovery',
      projectStage: 'discovery',
      currentPhase: 'idle',
      discoveryReady: false,
      currentMilestoneId: 'idea',
      currentMilestoneStatus: 'in_progress',
      missingEvidence: true,
      allowedTransitions: [],
    });

    const ctx = await createDiscoveryCtx();
    await executeProfile(ctx, 'select', 'product_discovery');
    await executeDiscovery(ctx, 'start', 'idea', {});

    const barePlan = await executeDiscovery(ctx, 'plan', 'idea', {});
    expect(isRequiredArgumentFailure(barePlan)).toBe(true);
    expect(plan.needsInput).toBe(true);
    expect(plan.requiredInputs?.map((input) => input.flag)).toEqual([
      '--summary',
      '--session',
    ]);

    const planned = await executeDiscovery(ctx, 'plan', 'idea', {
      summary: 'Ship a focused idea narrative for the first milestone',
      session: ['AS-idea-1'],
    });
    expect(planned.exitCode).toBe(ExitCode.SUCCESS);
    await executeDiscovery(ctx, 'start', 'idea', {});

    const bareComplete = await executeDiscovery(ctx, 'complete', 'idea', {});
    expect(isRequiredArgumentFailure(bareComplete)).toBe(true);
    expect(complete.needsInput).toBe(true);
    expect(complete.requiredInputs?.map((input) => input.flag)).toEqual([
      '--evidence',
    ]);
  });

  it('given a live idea walk, every Primary Action is executable or declares required inputs', async () => {
    const ctx = await createDiscoveryCtx();

    const afterInit = await readNavigator(ctx);
    expect(afterInit.primary_action.kind).toBe('select_profile');
    expectHardBlockers(afterInit).toEqual([]);
    await dispatchPrimaryAction(ctx, afterInit.primary_action);

    const afterProfile = await readNavigator(ctx);
    expect(afterProfile.primary_action.kind).toBe('start_brainstorm');
    expectHardBlockers(afterProfile).toEqual([]);
    await dispatchPrimaryAction(ctx, afterProfile.primary_action);

    const afterStart = await readNavigator(ctx);
    expect(afterStart.primary_action.kind).toBe('plan_milestone');
    expect(afterStart.primary_action.needs_input).toBe(true);
    expectHardBlockers(afterStart).toEqual([]);
    await dispatchPrimaryAction(ctx, afterStart.primary_action, {
      summary: 'Ship a focused idea narrative for the first milestone',
      session: ['AS-idea-1'],
    });

    const afterPlan = await readNavigator(ctx);
    expect(afterPlan.primary_action.kind).toBe('start_milestone');
    expectHardBlockers(afterPlan).toEqual([]);
    await dispatchPrimaryAction(ctx, afterPlan.primary_action);

    const afterWork = await readNavigator(ctx);
    expect(afterWork.primary_action.kind).toBe('complete_milestone');
    expect(afterWork.primary_action.needs_input).toBe(true);
    expectHardBlockers(afterWork).toEqual([]);
    await dispatchPrimaryAction(ctx, afterWork.primary_action, {
      evidence: ['knowledge/idea.md'],
    });

    const afterComplete = await readNavigator(ctx);
    expect(afterComplete.primary_action.kind).toBe('start_brainstorm');
    expect(afterComplete.primary_action.command).toContain('product');
    expectHardBlockers(afterComplete).toEqual([]);
  });
});

const NOW = '2026-01-15T10:00:00Z';

type NavigatorSnapshot = Pick<HelpmeOutput, 'primary_action' | 'blockers'>;
type NavigatorAction = NavigatorSnapshot['primary_action'];

interface CommandResult {
  readonly exitCode: number;
  readonly error?: { code: string; message: string };
}

/**
 * True when the CLI rejected the invocation for a missing required flag/value.
 */
function isRequiredArgumentFailure(result: CommandResult): boolean {
  return (
    result.exitCode === ExitCode.USAGE_ERROR ||
    result.error?.code === 'USAGE_ERROR' ||
    result.error?.code === 'MILESTONE_EVIDENCE_REQUIRED'
  );
}

function expectHardBlockers(
  snapshot: NavigatorSnapshot,
): { toEqual: (expected: readonly unknown[]) => void } {
  const hard = snapshot.blockers.filter(
    (blocker) => blocker.level === 'hard' || blocker.level === undefined,
  );
  return expect(hard);
}

async function createDiscoveryCtx(): Promise<CliContext> {
  const fs = new InMemoryFileSystem();
  const clock = new FixedClock(NOW);
  const logger = new NullLogger();
  const prompt = new NonInteractiveAdapter();
  const colors = createColorPalette(false);
  const output = createFormatter('human', colors);
  const cwd = '/test-project';
  const globals = parseGlobals({ cwd });

  await fs.mkdir(`${cwd}/.l1dder`);
  await fs.writeFile(
    `${cwd}/.l1dder/state.yml`,
    `schema_version: 2
project:
  name: "pa-contract"
  stage: discovery
  stage_history: []
  created_at: "${NOW}"
  updated_at: "${NOW}"
workflow:
  current_phase: idle
  current_status: in_progress
  mode: main
  profile: null
  iteration: 0
  phase_history: []
  gate_history: []
discovery:
  milestones: []
  current: null
  waivers: []
tasks:
  items: []
quick_tasks: []
knowledge_updates: []
decisions: []
`,
  );
  await fs.writeFile(`${cwd}/.l1dder/config.yml`, 'role_mode: solo\n');

  return buildContext(globals, { fs, clock, logger, prompt, output, colors });
}

async function readNavigator(ctx: CliContext): Promise<NavigatorSnapshot> {
  const result = await executeHelpme(ctx);
  expect(result.exitCode).toBe(ExitCode.SUCCESS);
  const parsed = HelpmeOutputSchema.safeParse(result.data);
  expect(parsed.success).toBe(true);
  if (!parsed.success) {
    throw new Error('helpme JSON failed HelpmeOutputSchema');
  }
  return {
    primary_action: parsed.data.primary_action,
    blockers: parsed.data.blockers,
  };
}

/**
 * Follow the `/l1dder-next` contract: run `command` as issued, or append
 * human-authored flags when `needs_input` is set.
 */
async function dispatchPrimaryAction(
  ctx: CliContext,
  action: NavigatorAction,
  humanInput?: {
    readonly summary?: string;
    readonly session?: string[];
    readonly evidence?: string[];
  },
): Promise<void> {
  const words = action.command.trim().split(/\s+/);
  expect(words[0]).toBe('l1dder');

  if (action.needs_input === true) {
    expect(action.required_inputs?.length).toBeGreaterThan(0);
    expect(humanInput).toBeDefined();
    const result = await runL1dderWords(ctx, words.slice(1), humanInput);
    expect(isRequiredArgumentFailure(result)).toBe(false);
    expect(result.exitCode).toBe(ExitCode.SUCCESS);
    return;
  }

  const bare = await runL1dderWords(ctx, words.slice(1));
  expect(isRequiredArgumentFailure(bare)).toBe(false);
  expect(bare.exitCode).toBe(ExitCode.SUCCESS);
}

async function runL1dderWords(
  ctx: CliContext,
  words: readonly string[],
  opts?: {
    readonly summary?: string;
    readonly session?: string[];
    readonly evidence?: string[];
  },
): Promise<CommandResult> {
  const [top, sub, arg] = words;
  if (top === 'profile') {
    return executeProfile(ctx, sub, arg);
  }
  if (top === 'discovery') {
    return executeDiscovery(ctx, sub, arg, {
      summary: opts?.summary,
      session: opts?.session,
      evidence: opts?.evidence,
    });
  }
  throw new Error(`Unsupported primary action command: ${words.join(' ')}`);
}
