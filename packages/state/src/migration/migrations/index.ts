import type { Migration } from '../migration-runner.js';
import { v1Migration } from './v1.js';
import { v2Migration } from './v2.js';
import { v3Migration } from './v3.js';
import { v4Migration } from './v4.js';

/** Ordered registry of state.yml schema migrations. */
export const ALL_MIGRATIONS: readonly Migration[] = [
  v1Migration,
  v2Migration,
  v3Migration,
  v4Migration,
];

export { v1Migration } from './v1.js';
export { v2Migration } from './v2.js';
export { v3Migration } from './v3.js';
export { v4Migration } from './v4.js';
