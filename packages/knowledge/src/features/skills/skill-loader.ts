import type { FileSystemPort, SkillRegistry } from '@l1dder/core';
import type { ParsedSkill } from '@l1dder/core';
import type { Result } from '@l1dder/core';
import { ok, err } from '@l1dder/core';
import { join } from 'node:path';

import { LoadError } from '../../errors.js';
import { InMemorySkillRegistry } from '../../in-memory-skill-registry.js';
import { parseSkill } from './skill-parser.js';
import { mergeSkill } from './skill-merger.js';

/** Dependencies for SkillLoader. */
export interface SkillLoaderDeps {
  readonly fs: FileSystemPort;
  readonly projectRoot: string;
}

const BUILTIN_DIR = 'skills/built-in';
const CUSTOM_DIR = 'skills/custom';

/**
 * Loads, parses, and merges L1DDER skill files into a SkillRegistry.
 *
 * Three-stage pipeline: load (FS glob via readDir) → parse (frontmatter + Zod) → merge
 * (built-in + custom overrides on id match).
 */
export class SkillLoader {
  private readonly fs: FileSystemPort;
  private readonly projectRoot: string;

  constructor(deps: SkillLoaderDeps) {
    this.fs = deps.fs;
    this.projectRoot = deps.projectRoot;
  }

  /** Load built-in skills from `skills/built-in/*.md`. */
  async loadBuiltIn(): Promise<Result<ParsedSkill[], LoadError>> {
    return this.loadFromDir(BUILTIN_DIR, 'builtin');
  }

  /** Load custom user skills from `skills/custom/*.md`. */
  async loadCustom(): Promise<Result<ParsedSkill[], LoadError>> {
    return this.loadFromDir(CUSTOM_DIR, 'custom');
  }

  /**
   * Load all skills (built-in + custom), merge on id conflict, register in registry.
   *
   * Resolution order: built-in → custom (custom wins on id match via mergeSkill).
   */
  async loadAll(): Promise<Result<SkillRegistry, LoadError>> {
    const registry = new InMemorySkillRegistry();

    const builtinResult = await this.loadBuiltIn();
    if (!builtinResult.ok) return err(builtinResult.error);

    for (const skill of builtinResult.value) {
      registry.register(skill);
    }

    const customResult = await this.loadCustom();
    if (!customResult.ok) return err(customResult.error);

    for (const customSkill of customResult.value) {
      const existing = registry.findById(customSkill.frontMatter.id);
      if (existing && existing.category === 'builtin') {
        const merged = mergeSkill(existing, customSkill);
        registry.register(merged);
      } else {
        registry.register(customSkill);
      }
    }

    return ok(registry);
  }

  private async loadFromDir(
    dir: string,
    category: 'builtin' | 'custom',
  ): Promise<Result<ParsedSkill[], LoadError>> {
    const dirPath = join(this.projectRoot, dir);

    const dirExists = await this.fs.exists(dirPath);
    if (!dirExists) {
      return ok([]);
    }

    let entries: readonly string[];
    try {
      entries = await this.fs.readDir(dirPath);
    } catch (cause) {
      // `exists()` above already confirmed the directory is present, so a
      // failure here is a genuine unexpected error (permissions, race
      // condition, etc.) — it must surface as `err`, not be swallowed into
      // an empty result (which would silently hide missing skills).
      return err(new LoadError(dirPath, 'Failed to read skill directory', cause));
    }

    const mdFiles = entries.filter((e) => e.endsWith('.md'));
    const skills: ParsedSkill[] = [];

    for (const fileName of mdFiles) {
      const filePath = join(dir, fileName);
      const fullPath = join(this.projectRoot, filePath);

      let content: string;
      try {
        content = await this.fs.readFile(fullPath);
      } catch (cause) {
        return err(new LoadError(filePath, 'Failed to read skill file', cause));
      }

      const parseResult = parseSkill(filePath, content, category);
      if (!parseResult.ok) {
        return err(new LoadError(filePath, parseResult.error.message));
      }

      skills.push(parseResult.value);
    }

    return ok(skills);
  }
}
