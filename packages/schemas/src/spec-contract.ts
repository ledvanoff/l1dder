import { z } from 'zod/v4';

import {
  DecisionIdSchema,
  FeatureIdSchema,
  ModelIdSchema,
  TestContractIdSchema,
  UsecaseIdSchema,
} from './registry.js';

/**
 * Machine-readable AI Contract block embedded in a `spec.md`.
 *
 * Lives under a `## AI Contract` heading as a fenced `yaml` code block and
 * reuses registry ID patterns (`FEAT-*`, `UC-*`, `DEC-*`, `MODEL-*`, `TC-*`).
 *
 * Two shapes are accepted because both exist in practice: a single-feature
 * spec writes `feature: FEAT-NNN`, while an iteration spec covering several
 * features writes `features: [...]` plus `iteration`. Both normalize to the
 * `features` list, so consumers read one shape.
 *
 * Unknown keys are ignored: a spec may carry extra project metadata without
 * failing the contract.
 *
 * @see parseSpecContract in `@l1dder/knowledge`
 */
export const SpecContractSchema = z
  .object({
    /** Iteration id for a multi-feature iteration spec. */
    iteration: z.string().min(1).optional(),
    /** Single owning feature — shorthand for a one-element `features` list. */
    feature: FeatureIdSchema.optional(),
    /** Owning features; at least one is required after normalization. */
    features: z.array(FeatureIdSchema).optional(),
    /** Linked usecases; at least one required. */
    usecases: z.array(UsecaseIdSchema).min(1),
    /** Related decisions; may be empty. */
    decisions: z.array(DecisionIdSchema),
    /** Related domain models; may be empty. */
    models: z.array(ModelIdSchema),
    /**
     * Test-contract ids declared for the spec.
     *
     * The key must be present; the list may be empty (e.g. template placeholder).
     */
    test_contracts: z.array(TestContractIdSchema),
  })
  .transform((value, ctx) => {
    const features = value.features ?? (value.feature ? [value.feature] : []);

    if (features.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['features'],
        message: 'Provide `feature: FEAT-NNN` or a non-empty `features` list',
      });
      return z.NEVER;
    }

    return {
      ...(value.iteration !== undefined ? { iteration: value.iteration } : {}),
      features,
      usecases: value.usecases,
      decisions: value.decisions,
      models: value.models,
      test_contracts: value.test_contracts,
    };
  });

/** Parsed AI Contract payload, normalized to the `features` list form. */
export type SpecContract = z.infer<typeof SpecContractSchema>;
