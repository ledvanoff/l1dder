import type { CliContext } from '../../context.js';
import type { Config } from '@l1dder/schemas';
import { DeliveryCriteriaChecker, recommend } from '@l1dder/state';
import type { ReadinessRecommendation } from '@l1dder/state';

/**
 * Evaluate discovery readiness using the same checker + recommender as stage/doctor.
 */
export async function evaluateDiscoveryReadiness(
  ctx: CliContext,
  config: Config,
): Promise<ReadinessRecommendation> {
  const checker = new DeliveryCriteriaChecker();
  const criteria = await checker.evaluate(ctx.fs, ctx.cwd, config);
  return recommend(criteria);
}
