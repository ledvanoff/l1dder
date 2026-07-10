/**
 * @l1dder/cli — CLI entry point and composition root.
 * Assembles all @l1dder/* packages into a working application.
 *
 * @packageDocumentation
 */

export { runCli } from './cli/program.js';
export type { CliContext, CliContextOverrides } from './cli/context.js';
export { ExitCode } from './cli/output/exit-codes.js';
export { GitDriftChecker } from './cli/adapters/drift-checker.js';
export { NodeShell } from './cli/adapters/shell.js';
