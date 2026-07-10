import type { FileSystemPort } from '@l1dder/core';
import type { DoctorCheck } from '../types.js';
import { StandardsParser } from '@l1dder/knowledge';

/**
 * Standards validation checks: base conventions + workflow YAML files.
 *
 * Skill format validation was moved to the dedicated `skills` section
 * (Iteration 6, T-06), which uses the full SK10 `validateSkillRegistry()`
 * instead of the simplified front-matter check previously embedded here.
 */
export async function checkStandards(
  fs: FileSystemPort,
  projectRoot: string,
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const parser = new StandardsParser({ fs, projectRoot });

  // Base conventions
  const convResult = await parser.loadBaseConventions();
  if (convResult.ok) {
    checks.push({ id: 'standards-conventions', level: 'pass', message: 'conventions.base.yml valid' });
  } else {
    checks.push({
      id: 'standards-conventions',
      level: 'fail',
      message: `conventions.base.yml: ${convResult.error.message}`,
    });
  }

  // Base workflow
  const wfResult = await parser.loadBaseWorkflow();
  if (wfResult.ok) {
    checks.push({ id: 'standards-workflow', level: 'pass', message: 'workflow.base.yml valid' });
  } else {
    checks.push({
      id: 'standards-workflow',
      level: 'fail',
      message: `workflow.base.yml: ${wfResult.error.message}`,
    });
  }

  return checks;
}
