import { z } from 'zod/v4';

/**
 * A single managed file entry in `.l1dder/install-state.yml`.
 *
 * Tracks provenance for one IDE output file: where it lives, content hash,
 * canonical source, active profile, target adapter, and install timestamp.
 */
export const InstallStateEntrySchema = z.object({
  path: z.string().min(1),
  hash: z.string().min(1),
  source: z.string().min(1),
  profile: z.string().nullable(),
  target: z.string().min(1),
  timestamp: z.string().min(1),
});

/**
 * Root schema for `.l1dder/install-state.yml` — per-target install provenance.
 *
 * Keys in `targets` are adapter IDs (e.g. `cursor`, `claude`).
 */
export const InstallStateSchema = z.object({
  schema_version: z.literal(1).default(1),
  targets: z.record(z.string(), z.array(InstallStateEntrySchema)).default({}),
});

/** Single install-state entry type. */
export type InstallStateEntry = z.infer<typeof InstallStateEntrySchema>;

/** Complete install-state.yml type. */
export type InstallState = z.infer<typeof InstallStateSchema>;
