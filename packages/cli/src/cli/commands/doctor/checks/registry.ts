import type { SchemaIssueDetail } from '@l1dder/core';
import {
  AI_CONTEXT_PATH,
  REGISTRY_HASH_MARKER_PREFIX,
  REGISTRY_MANIFEST_PATH,
  REGISTRY_VIEW_PATH,
  inspectAiContextFreshness,
  loadRegistryBundle,
  type GeneratedViewFreshnessStatus,
  type RegistryEngineError,
  type RegistryIssue,
} from '@l1dder/knowledge';

import type { DoctorCheck } from '../types.js';
import type { FileSystemPort } from '@l1dder/core';

/** Stable doctor check IDs for the registry section (plan.md §6). */
export const REGISTRY_DOCTOR_CHECK_IDS = [
  'registry-schema',
  'registry-unique-ids',
  'registry-parent-links',
  'registry-source-paths',
  'registry-orphans',
  'registry-symbols',
  'registry-test-evidence',
  'registry-generated-freshness',
  'ai-context-freshness',
] as const;

/** One of the stable registry doctor check IDs. */
export type RegistryDoctorCheckId = (typeof REGISTRY_DOCTOR_CHECK_IDS)[number];

/**
 * Registry doctor section: schema/graph/symbol/TC/freshness checks.
 *
 * Missing manifest → a single warn (not nine fails), so doctor stays green
 * until HARD-8 / T-17 backfills `knowledge/project-registry.yml`.
 *
 * @param fs - Filesystem port
 * @param projectRoot - Absolute project root
 * @returns Doctor checks with stable IDs from plan.md
 */
export async function checkRegistry(
  fs: FileSystemPort,
  projectRoot: string,
): Promise<DoctorCheck[]> {
  const loaded = await loadRegistryBundle({ fs, projectRoot });
  if (!loaded.ok) {
    return missingOrBrokenManifestChecks(loaded.error);
  }

  const bundle = loaded.value;
  const byCheck = groupIssuesByCheck(bundle.report.issues);

  const checks: DoctorCheck[] = [
    passOrFail(
      'registry-schema',
      byCheck.get('registry-schema') ?? [],
      'Registry manifest schema is valid',
    ),
    passOrFail(
      'registry-unique-ids',
      byCheck.get('registry-unique-ids') ?? [],
      'Registry entity ids are unique',
    ),
    passOrFail(
      'registry-parent-links',
      byCheck.get('registry-parent-links') ?? [],
      'Registry parent/typed links resolve',
    ),
    passOrFail(
      'registry-source-paths',
      byCheck.get('registry-source-paths') ?? [],
      'Registry source paths and heading anchors resolve',
    ),
    passOrFail(
      'registry-orphans',
      byCheck.get('registry-orphans') ?? [],
      'No orphan registry entities (including DEBT/BL)',
    ),
    passOrFail(
      'registry-symbols',
      byCheck.get('registry-symbols') ?? [],
      'Registry symbols match the TypeScript public index',
    ),
    passOrFail(
      'registry-test-evidence',
      byCheck.get('registry-test-evidence') ?? [],
      'Required test-contract evidence is present',
    ),
  ];

  if (bundle.viewStale) {
    checks.push({
      id: 'registry-generated-freshness',
      level: 'fail',
      message: freshnessFailMessage(bundle.viewFreshness),
      hint: 'Run `l1dder registry sync` (or `l1dder doctor --fix`) to regenerate',
      fixable: true,
      details: [
        {
          path: REGISTRY_VIEW_PATH,
          code: 'REGISTRY_VIEW_STALE',
          message: `${bundle.viewFreshness}; expected content hash ${bundle.contentHash}`,
        },
      ],
    });
  } else {
    checks.push({
      id: 'registry-generated-freshness',
      level: 'pass',
      message: `${REGISTRY_VIEW_PATH} matches a fresh registry render`,
    });
  }

  const ai = await inspectAiContextFreshness(
    { fs, projectRoot },
    bundle.contentHash,
  );
  checks.push(aiContextCheck(ai, bundle.contentHash));

  return checks;
}

function missingOrBrokenManifestChecks(
  error: RegistryEngineError,
): DoctorCheck[] {
  if (error.code === 'REGISTRY_MANIFEST_MISSING') {
    return [
      {
        id: 'registry-schema',
        level: 'warn',
        message: 'Registry manifest not created yet',
        hint: 'Create a draft with `l1dder registry sync --init`, then backfill in T-17',
        details: [
          {
            path: REGISTRY_MANIFEST_PATH,
            code: error.code,
            message: error.message,
          },
        ],
      },
    ];
  }

  const isUnique = /duplicate id|duplicate source anchor/i.test(error.message);
  const isParent =
    /parent|feature number|usecase number|unknown|does not exist|referential/i.test(
      error.message,
    );

  const checkId: RegistryDoctorCheckId = isUnique
    ? 'registry-unique-ids'
    : isParent
      ? 'registry-parent-links'
      : 'registry-schema';

  return [
    {
      id: checkId,
      level: 'fail',
      message: error.message,
      ...(error.hint !== undefined ? { hint: error.hint } : {}),
      details: [
        {
          path: REGISTRY_MANIFEST_PATH,
          code: error.code,
          message: error.message,
        },
        ...(error.issues ?? []).map(issueToDetail),
      ],
    },
  ];
}

function groupIssuesByCheck(
  issues: readonly RegistryIssue[],
): Map<RegistryDoctorCheckId, RegistryIssue[]> {
  const map = new Map<RegistryDoctorCheckId, RegistryIssue[]>();
  for (const issue of issues) {
    const checkId = mapIssueToCheckId(issue.code);
    const list = map.get(checkId);
    if (list) list.push(issue);
    else map.set(checkId, [issue]);
  }
  return map;
}

function mapIssueToCheckId(code: string): RegistryDoctorCheckId {
  if (code.startsWith('REGISTRY_SYMBOL_')) return 'registry-symbols';
  if (code.startsWith('REGISTRY_TC_')) return 'registry-test-evidence';
  switch (code) {
    case 'REGISTRY_BROKEN_PATH':
    case 'REGISTRY_BROKEN_ANCHOR':
      return 'registry-source-paths';
    case 'REGISTRY_ORPHAN':
      return 'registry-orphans';
    case 'REGISTRY_CYCLE':
    case 'REGISTRY_UNKNOWN_REF':
      return 'registry-parent-links';
    default:
      return 'registry-schema';
  }
}

function passOrFail(
  id: RegistryDoctorCheckId,
  issues: readonly RegistryIssue[],
  passMessage: string,
): DoctorCheck {
  if (issues.length === 0) {
    return { id, level: 'pass', message: passMessage };
  }

  const hasError = issues.some((i) => (i.severity ?? 'error') === 'error');
  const level: DoctorCheck['level'] = hasError ? 'fail' : 'warn';
  const head = issues[0];
  return {
    id,
    level,
    message:
      issues.length === 1 && head !== undefined
        ? head.message
        : `${String(issues.length)} ${id} finding(s)`,
    ...(head !== undefined ? { hint: head.message } : {}),
    details: issues.map(issueToDetail),
  };
}

function issueToDetail(issue: RegistryIssue): SchemaIssueDetail {
  return {
    path: issue.path ?? issue.ref,
    code: issue.code,
    message: issue.message,
  };
}

function freshnessFailMessage(status: GeneratedViewFreshnessStatus): string {
  switch (status) {
    case 'missing':
      return `${REGISTRY_VIEW_PATH} is missing`;
    case 'missing-marker':
      return `${REGISTRY_VIEW_PATH} is missing a valid content-hash marker`;
    case 'manifest-changed':
      return `${REGISTRY_VIEW_PATH} is stale relative to ${REGISTRY_MANIFEST_PATH}`;
    case 'view-edited':
      return `${REGISTRY_VIEW_PATH} was edited manually (body differs from render)`;
    case 'fresh':
      return `${REGISTRY_VIEW_PATH} is stale`;
  }
}

function aiContextCheck(
  ai: {
    readonly status: 'fresh' | 'stale' | 'missing_marker' | 'missing_file';
    readonly embeddedHash?: string;
    readonly path: string;
  },
  expectedHash: string,
): DoctorCheck {
  switch (ai.status) {
    case 'fresh':
      return {
        id: 'ai-context-freshness',
        level: 'pass',
        message: `${AI_CONTEXT_PATH} registry hash is fresh`,
      };
    case 'stale':
      return {
        id: 'ai-context-freshness',
        level: 'fail',
        message: `${AI_CONTEXT_PATH} registry hash is stale`,
        hint: `Update the marker to ${REGISTRY_HASH_MARKER_PREFIX}${expectedHash} -->`,
        details: [
          {
            path: AI_CONTEXT_PATH,
            code: 'AI_CONTEXT_STALE',
            message: `embedded ${ai.embeddedHash ?? 'unknown'} !== ${expectedHash}`,
          },
        ],
      };
    case 'missing_marker':
      return {
        id: 'ai-context-freshness',
        level: 'warn',
        message: `${AI_CONTEXT_PATH} has no registry hash marker`,
        hint: `Add ${REGISTRY_HASH_MARKER_PREFIX}${expectedHash} --> near the top of the file`,
        details: [
          {
            path: AI_CONTEXT_PATH,
            code: 'AI_CONTEXT_MISSING_MARKER',
            message: 'Registry hash marker not found',
          },
        ],
      };
    case 'missing_file':
      return {
        id: 'ai-context-freshness',
        level: 'warn',
        message: `${AI_CONTEXT_PATH} is missing`,
        hint: 'Create the curated AI context entrypoint (protected knowledge file)',
        details: [
          {
            path: AI_CONTEXT_PATH,
            code: 'AI_CONTEXT_MISSING_FILE',
            message: 'File not found',
          },
        ],
      };
  }
}
