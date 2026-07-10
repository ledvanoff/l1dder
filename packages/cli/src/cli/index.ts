/**
 * CLI bin entry point.
 *
 * Delegates to `runCli()` from program.ts and exits with the returned code.
 */

import { runCli } from './program.js';

void runCli(process.argv).then((code) => {
  process.exit(code);
});
