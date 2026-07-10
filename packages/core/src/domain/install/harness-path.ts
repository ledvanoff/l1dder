import type { AdapterManifest } from '../../ports/ide-adapter.js';

/** Output artifact kinds resolvable from an adapter manifest. */
export type HarnessOutputKind =
  | 'command'
  | 'skill'
  | 'rule'
  | 'agents_md'
  | 'hooks';

/**
 * Resolve a relative output path under the project harness root.
 *
 * Uses manifest output configuration — e.g. Cursor commands become
 * `.cursor/commands/l1dder-{id}.md`, Claude skills become
 * `.claude/skills/{id}/SKILL.md`.
 */
export function resolveHarnessPath(
  manifest: AdapterManifest,
  kind: HarnessOutputKind,
  id?: string,
): string | undefined {
  const outputs = manifest.outputs;

  switch (kind) {
    case 'command': {
      const cfg = outputs.commands;
      if (!cfg || id === undefined) return undefined;
      const fileName = cfg.filePattern.replace('{id}', id);
      return joinPath(cfg.directory, fileName);
    }
    case 'skill': {
      const cfg = outputs.skills;
      if (!cfg || id === undefined) return undefined;
      const relative = cfg.structure.replace('{skill-id}', id);
      return joinPath(cfg.directory, relative);
    }
    case 'rule': {
      const cfg = outputs.rules;
      if (!cfg) return undefined;
      return joinPath(cfg.directory, cfg.file);
    }
    case 'agents_md': {
      const cfg = outputs.agents_md;
      if (!cfg) return undefined;
      return joinPath(cfg.directory, cfg.file);
    }
    case 'hooks': {
      const cfg = outputs.hooks;
      if (!cfg) return undefined;
      return joinPath(cfg.directory, cfg.file);
    }
    default:
      return undefined;
  }
}

function joinPath(directory: string, file: string): string {
  if (directory === '.' || directory === '') {
    return file;
  }
  return `${directory}/${file}`;
}
