/**
 * @l1dder/knowledge/testing — test utilities and fixture factories.
 *
 * Import as `import { ... } from '@l1dder/knowledge/testing'`.
 *
 * @packageDocumentation
 */

import type {
  ParsedSkill,
  SkillRegistry,
  SlashCommandRegistry,
  ParsedSlashCommand,
  SymbolIndexerPort,
  TestContractEvidencePort,
} from '@l1dder/core';
import { InMemoryFileSystem, NullLogger } from '@l1dder/core/testing';

import { KnowledgeReader } from './knowledge-reader.js';
import { InMemorySkillRegistry } from './in-memory-skill-registry.js';
import { InMemorySlashCommandRegistry } from './in-memory-slash-command-registry.js';
import { PersonaLoader } from './features/persona-loader.js';
import { SlashCommandLoader } from './features/slash-command-loader.js';
import { StandardsParser } from './features/standards/standards-parser.js';
import { RegistryReader } from './features/registry/registry-reader.js';
import { RegistryValidator } from './features/registry/registry-validator.js';
import { TypeScriptSymbolIndexer } from './features/registry/typescript-symbol-indexer.js';
import { TestContractEvidenceIndexer } from './features/registry/test-contract-evidence-indexer.js';

/**
 * Create a test KnowledgeReader backed by InMemoryFileSystem.
 *
 * @param files - Map of relative paths to file contents
 * @param projectRoot - Virtual project root (default: "/project")
 */
export function createTestKnowledgeReader(
  files: Record<string, string> = {},
  projectRoot = '/project',
): KnowledgeReader {
  const fs = new InMemoryFileSystem();
  for (const [path, content] of Object.entries(files)) {
    void fs.writeFile(`${projectRoot}/${path}`, content);
  }
  return new KnowledgeReader({ fs, projectRoot });
}

/**
 * Create a test SkillRegistry pre-populated with given skills.
 *
 * @param skills - Array of ParsedSkill to register
 */
export function createTestSkillRegistry(
  skills: ParsedSkill[] = [],
): SkillRegistry {
  const registry = new InMemorySkillRegistry();
  for (const skill of skills) {
    registry.register(skill);
  }
  return registry;
}

/**
 * Create a test StandardsParser backed by InMemoryFileSystem.
 *
 * @param files - Map of relative paths to file contents
 * @param projectRoot - Virtual project root (default: "/project")
 */
export function createTestStandardsParser(
  files: Record<string, string> = {},
  projectRoot = '/project',
): StandardsParser {
  const fs = new InMemoryFileSystem();
  for (const [path, content] of Object.entries(files)) {
    void fs.writeFile(`${projectRoot}/${path}`, content);
  }
  return new StandardsParser({ fs, projectRoot });
}

/**
 * Create a test SlashCommandRegistry pre-populated with given commands.
 *
 * @param commands - Array of ParsedSlashCommand to register
 */
export function createTestSlashCommandRegistry(
  commands: ParsedSlashCommand[] = [],
): SlashCommandRegistry {
  const registry = new InMemorySlashCommandRegistry();
  for (const command of commands) {
    registry.register(command);
  }
  return registry;
}

/**
 * Create a test PersonaLoader backed by InMemoryFileSystem.
 *
 * @param files - Map of relative paths to file contents
 * @param projectRoot - Virtual project root (default: "/project")
 */
export function createTestPersonaLoader(
  files: Record<string, string> = {},
  projectRoot = '/project',
): PersonaLoader {
  const fs = new InMemoryFileSystem();
  for (const [path, content] of Object.entries(files)) {
    void fs.writeFile(`${projectRoot}/${path}`, content);
  }
  return new PersonaLoader({ fs, logger: new NullLogger() });
}

/**
 * Create a test SlashCommandLoader backed by InMemoryFileSystem.
 *
 * @param files - Map of relative paths to file contents
 * @param projectRoot - Virtual project root (default: "/project")
 */
export function createTestSlashCommandLoader(
  files: Record<string, string> = {},
  projectRoot = '/project',
): SlashCommandLoader {
  const fs = new InMemoryFileSystem();
  for (const [path, content] of Object.entries(files)) {
    void fs.writeFile(`${projectRoot}/${path}`, content);
  }
  return new SlashCommandLoader({ fs, logger: new NullLogger(), projectRoot });
}

/**
 * Create a test RegistryReader backed by InMemoryFileSystem.
 *
 * @param files - Map of relative paths to file contents
 * @param projectRoot - Virtual project root (default: "/project")
 */
export function createTestRegistryReader(
  files: Record<string, string> = {},
  projectRoot = '/project',
): RegistryReader {
  const fs = new InMemoryFileSystem();
  for (const [path, content] of Object.entries(files)) {
    void fs.writeFile(`${projectRoot}/${path}`, content);
  }
  return new RegistryReader({ fs, projectRoot });
}

/**
 * Create a test RegistryValidator backed by InMemoryFileSystem.
 *
 * @param files - Map of relative paths to file contents
 * @param projectRoot - Virtual project root (default: "/project")
 * @param options - Optional symbol / test-contract indexer wiring
 */
export function createTestRegistryValidator(
  files: Record<string, string> = {},
  projectRoot = '/project',
  options: {
    readonly withSymbolIndexer?: boolean;
    readonly withTestContractIndexer?: boolean;
  } = {},
): RegistryValidator {
  const fs = new InMemoryFileSystem();
  for (const [path, content] of Object.entries(files)) {
    void fs.writeFile(`${projectRoot}/${path}`, content);
  }
  const symbolIndexer: SymbolIndexerPort | undefined = options.withSymbolIndexer
    ? new TypeScriptSymbolIndexer({ fs })
    : undefined;
  const testContractIndexer: TestContractEvidencePort | undefined =
    options.withTestContractIndexer
      ? new TestContractEvidenceIndexer({ fs })
      : undefined;
  return new RegistryValidator({
    fs,
    projectRoot,
    ...(symbolIndexer !== undefined ? { symbolIndexer } : {}),
    ...(testContractIndexer !== undefined ? { testContractIndexer } : {}),
  });
}

/**
 * Create a test {@link TypeScriptSymbolIndexer} backed by InMemoryFileSystem.
 *
 * @param files - Map of relative paths to file contents
 * @param projectRoot - Virtual project root (default: "/project")
 */
export function createTestSymbolIndexer(
  files: Record<string, string> = {},
  projectRoot = '/project',
): { readonly indexer: TypeScriptSymbolIndexer; readonly projectRoot: string } {
  const fs = new InMemoryFileSystem();
  for (const [path, content] of Object.entries(files)) {
    void fs.writeFile(`${projectRoot}/${path}`, content);
  }
  return {
    indexer: new TypeScriptSymbolIndexer({ fs }),
    projectRoot,
  };
}

/**
 * Create a test {@link TestContractEvidenceIndexer} backed by InMemoryFileSystem.
 *
 * @param files - Map of relative paths to file contents
 * @param projectRoot - Virtual project root (default: "/project")
 */
export function createTestContractEvidenceIndexer(
  files: Record<string, string> = {},
  projectRoot = '/project',
): {
  readonly indexer: TestContractEvidenceIndexer;
  readonly projectRoot: string;
} {
  const fs = new InMemoryFileSystem();
  for (const [path, content] of Object.entries(files)) {
    void fs.writeFile(`${projectRoot}/${path}`, content);
  }
  return {
    indexer: new TestContractEvidenceIndexer({ fs }),
    projectRoot,
  };
}
