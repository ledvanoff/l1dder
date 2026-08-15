import { z } from 'zod/v4';

/**
 * Leaf-level primitives shared by several schema modules.
 *
 * Kept free of intra-package imports: modules that need both `state.ts` types
 * and their own schemas (e.g. `discovery.ts`) import from here instead, which
 * keeps the module graph acyclic.
 *
 * @packageDocumentation
 */

/**
 * ISO 8601 datetime string validator.
 * Used across all timestamp fields in `state.yml`.
 */
export const IsoDatetime = z.iso.datetime();

const HumanActor = z.object({
  kind: z.literal('human'),
  id: z.string(),
});

const AiActor = z.object({
  kind: z.literal('ai'),
  model: z.string(),
  session_id: z.string().optional(),
});

const SystemActor = z.object({
  kind: z.literal('system'),
});

/** Discriminated union for actors (human | ai | system). */
export const ActorSchema = z.discriminatedUnion('kind', [
  HumanActor,
  AiActor,
  SystemActor,
]);

/** Actor discriminated union (human | ai | system). */
export type Actor = z.infer<typeof ActorSchema>;
