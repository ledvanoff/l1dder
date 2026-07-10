/**
 * @l1dder/yaml — Round-trip YAML wrapper over eemeli/yaml.
 *
 * Provides typed parse/stringify with comment preservation.
 *
 * @packageDocumentation
 */

export { L1dderDocument } from './document.js';
export { parseDocument, parseYaml } from './parse.js';
export type { SafeParsable } from './parse.js';
export { stringifyDocument, stringifyYaml } from './stringify.js';
export { YamlParseError, YamlValidationError } from './errors.js';

// ─── Front-matter ───

export { parseFrontMatter, stringifyFrontMatter } from './front-matter.js';
export type { FrontMatterResult } from './front-matter.js';
