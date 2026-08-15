import { z } from 'zod/v4';

// SYNC WARNING: WorkflowProfileIdSchema values MUST match @l1dder/core WorkflowProfile const object.
// Any change here requires a corresponding update in packages/core/src/domain/workflow-profile.ts.

/** Zod schema for the 4 workflow profile identifiers. */
export const WorkflowProfileIdSchema = z.enum([
  'product_discovery',
  'feature_discovery',
  'delivery',
  'hygiene',
]);

/** One of 4 workflow profile identifiers. */
export type WorkflowProfileId = z.infer<typeof WorkflowProfileIdSchema>;
