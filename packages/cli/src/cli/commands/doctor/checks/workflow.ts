import type { FileSystemPort } from '@l1dder/core';
import { join } from 'node:path';
import type { DoctorCheck } from '../types.js';

/**
 * Workflow integrity checks: validates directory structure and expected files.
 */
export async function checkWorkflow(
  fs: FileSystemPort,
  projectRoot: string,
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  // .l1dder/ directory
  const l1dderExists = await safeExists(fs, join(projectRoot, '.l1dder'));
  if (l1dderExists) {
    checks.push({ id: 'workflow-l1dder-dir', level: 'pass', message: '.l1dder/ directory exists' });
  } else {
    checks.push({
      id: 'workflow-l1dder-dir',
      level: 'fail',
      message: '.l1dder/ directory missing',
      hint: "Run 'l1dder init'",
    });
    return checks;
  }

  // state.yml
  const stateExists = await safeExists(fs, join(projectRoot, '.l1dder', 'state.yml'));
  if (stateExists) {
    checks.push({ id: 'workflow-state', level: 'pass', message: '.l1dder/state.yml exists' });
  } else {
    checks.push({
      id: 'workflow-state',
      level: 'fail',
      message: '.l1dder/state.yml missing',
      hint: "Run 'l1dder init'",
    });
  }

  // config.yml
  const configExists = await safeExists(fs, join(projectRoot, '.l1dder', 'config.yml'));
  if (configExists) {
    checks.push({ id: 'workflow-config', level: 'pass', message: '.l1dder/config.yml exists' });
  } else {
    checks.push({
      id: 'workflow-config',
      level: 'fail',
      message: '.l1dder/config.yml missing',
      hint: "Run 'l1dder init'",
    });
  }

  // Expected directories
  const expectedDirs = ['knowledge', 'agents', 'skills', 'standards'];
  for (const dir of expectedDirs) {
    const exists = await safeExists(fs, join(projectRoot, dir));
    if (exists) {
      checks.push({ id: `workflow-dir-${dir}`, level: 'pass', message: `${dir}/ directory exists` });
    } else {
      checks.push({
        id: `workflow-dir-${dir}`,
        level: 'warn',
        message: `${dir}/ directory missing`,
        hint: `Create ${dir}/ directory for project structure`,
      });
    }
  }

  return checks;
}

async function safeExists(fs: FileSystemPort, path: string): Promise<boolean> {
  try {
    return await fs.exists(path);
  } catch {
    return false;
  }
}
