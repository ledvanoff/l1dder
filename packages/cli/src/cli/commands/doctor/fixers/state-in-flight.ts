import type { DoctorFixerContext } from '../types.js';
import { join } from 'node:path';

/**
 * Fixer: clear orphaned `_in_flight_transition` marker from state.yml.
 *
 * Reads state.yml, removes the marker key, writes back.
 * Returns true if the fix was applied, false otherwise.
 */
export async function fixStateInFlight(ctx: DoctorFixerContext): Promise<boolean> {
  const statePath = join(ctx.projectRoot, '.l1dder', 'state.yml');

  let content: string;
  try {
    content = await ctx.fs.readFile(statePath);
  } catch {
    ctx.logger.warn('Cannot read state.yml for in-flight fix');
    return false;
  }

  if (!content.includes('_in_flight_transition')) {
    return false;
  }

  const lines = content.split('\n');
  const filtered: string[] = [];
  let insideInFlight = false;
  let inFlightIndent = 0;

  for (const line of lines) {
    if (line.trimStart().startsWith('_in_flight_transition:')) {
      insideInFlight = true;
      inFlightIndent = line.length - line.trimStart().length;
      continue;
    }

    if (insideInFlight) {
      const currentIndent = line.length - line.trimStart().length;
      if (line.trim() === '' || currentIndent > inFlightIndent) {
        continue;
      }
      insideInFlight = false;
    }

    filtered.push(line);
  }

  const newContent = filtered.join('\n');
  await ctx.fs.writeFile(statePath, newContent);
  ctx.logger.info('Fixed: cleared _in_flight_transition marker from state.yml');
  return true;
}
