import { syncRegistryView } from '@l1dder/knowledge';

import type { DoctorFixerContext } from '../types.js';

/**
 * Regenerate `knowledge/registry.md` using the same path as `l1dder registry sync`.
 *
 * @param ctx - Doctor fixer context
 * @returns `true` when sync succeeded (wrote or already fresh)
 */
export async function fixRegistryView(
  ctx: DoctorFixerContext,
): Promise<boolean> {
  const result = await syncRegistryView({
    fs: ctx.fs,
    projectRoot: ctx.projectRoot,
  });
  if (!result.ok) {
    ctx.logger.warn(
      `registry-generated-freshness fix skipped: ${result.error.message}`,
    );
    return false;
  }
  if (result.value.wrote) {
    ctx.logger.info('Regenerated knowledge/registry.md');
  }
  return true;
}
