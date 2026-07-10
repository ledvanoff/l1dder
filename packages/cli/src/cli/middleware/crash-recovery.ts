import type { CliContext } from '../context.js';

/**
 * Crash recovery middleware — checks for in-flight transition markers (SM7).
 *
 * Runs before each command (except `init`, `--help`, `--version`).
 * In `--json` / `--no-recover` mode: logs a warning but does not prompt.
 */
export async function checkCrashRecovery(ctx: CliContext): Promise<void> {
  let sm: Awaited<ReturnType<CliContext['state']>>;
  try {
    sm = await ctx.state();
  } catch {
    return;
  }

  const recovery = sm.recovery;
  const snapshot = sm.stateSnapshot();
  const marker = recovery.detect(snapshot);
  if (!marker) return;

  const { globals, logger, prompt } = ctx;

  if (globals.json || globals.noRecover) {
    logger.warn(
      `In-flight transition detected: ${marker.from} → ${marker.to}. ` +
      `Use 'l1dder doctor' to investigate.`,
    );
    return;
  }

  logger.warn(
    `Detected interrupted transition: ${marker.from} → ${marker.to} ` +
    `(started at ${marker.started_at})`,
  );

  const shouldResume = await prompt.confirm(
    'Resume the interrupted transition? (No = rollback)',
  );

  const action = shouldResume ? 'resume' : 'rollback';
  const result = recovery.resolve(snapshot, action, ctx.clock);
  if (result.ok) {
    const saveResult = await sm.applyAndSave(() => result.value);
    if (saveResult.ok) {
      logger.info(`Crash recovery: ${action} completed.`);
    } else {
      logger.error(`Crash recovery save failed: ${saveResult.error.message}`);
    }
  } else {
    logger.error(`Crash recovery failed: ${result.error.message}`);
  }
}
