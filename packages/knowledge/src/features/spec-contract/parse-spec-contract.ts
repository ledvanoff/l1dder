import { err, ok, toSchemaIssueDetails } from '@l1dder/core';
import type { Result, SchemaIssueDetail } from '@l1dder/core';
import { SpecContractSchema } from '@l1dder/schemas';
import type { SpecContract } from '@l1dder/schemas';
import { YamlParseError, parseYaml } from '@l1dder/yaml';
import type { YamlValidationError } from '@l1dder/yaml';

/** Stable error codes from {@link parseSpecContract}. */
export type SpecContractErrorCode =
  | 'SPEC_CONTRACT_MISSING'
  | 'SPEC_CONTRACT_INVALID_YAML'
  | 'SPEC_CONTRACT_INVALID_FIELDS';

/**
 * Structured failure from {@link parseSpecContract}.
 *
 * Callers branch on {@link SpecContractError.code}; never on message text.
 * `issues` is set for {@link SpecContractErrorCode} `SPEC_CONTRACT_INVALID_FIELDS`.
 */
export interface SpecContractError {
  readonly code: SpecContractErrorCode;
  readonly message: string;
  readonly issues?: readonly SchemaIssueDetail[];
}

/** Heading that introduces the machine-readable AI Contract block. */
const AI_CONTRACT_HEADING = /^##\s+AI Contract\s*$/m;

/** Fenced yaml/yml block immediately under the AI Contract section. */
const YAML_FENCE =
  /```(?:yaml|yml)[ \t]*\r?\n([\s\S]*?)```/;

/**
 * Extract and validate the AI Contract YAML block from a feature `spec.md`.
 *
 * Parses only the machine block under `## AI Contract` — prose semantics are
 * ignored. Never throws; failures return a structured {@link SpecContractError}.
 *
 * @param markdown - Full markdown document text
 */
export function parseSpecContract(
  markdown: string,
): Result<SpecContract, SpecContractError> {
  const yamlText = extractAiContractYaml(markdown);
  if (!yamlText.ok) {
    return yamlText;
  }

  const parsed = parseYaml(yamlText.value, SpecContractSchema);
  if (!parsed.ok) {
    return mapYamlFailure(parsed.error);
  }

  return ok(parsed.value);
}

/**
 * Locate the first ` ```yaml ` fence under `## AI Contract` (before the next
 * `##` heading).
 */
function extractAiContractYaml(
  markdown: string,
): Result<string, SpecContractError> {
  const headingMatch = AI_CONTRACT_HEADING.exec(markdown);
  if (!headingMatch) {
    return err({
      code: 'SPEC_CONTRACT_MISSING',
      message:
        'Missing "## AI Contract" section — add a machine-readable YAML block under that heading',
    });
  }

  const afterHeading = markdown.slice(
    headingMatch.index + headingMatch[0].length,
  );
  const sectionBody = sliceUntilNextH2(afterHeading);
  const fenceMatch = YAML_FENCE.exec(sectionBody);
  if (!fenceMatch?.[1]) {
    return err({
      code: 'SPEC_CONTRACT_MISSING',
      message:
        'Missing fenced ```yaml``` block under "## AI Contract"',
    });
  }

  return ok(fenceMatch[1]);
}

/**
 * Return section text up to (but not including) the next `##` heading.
 */
function sliceUntilNextH2(afterHeading: string): string {
  const withoutLeadingNewlines = afterHeading.replace(/^\r?\n/, '');
  const nextHeading = /^##\s+/m.exec(withoutLeadingNewlines);
  if (!nextHeading) {
    return withoutLeadingNewlines;
  }
  return withoutLeadingNewlines.slice(0, nextHeading.index);
}

/**
 * Map `@l1dder/yaml` failures onto stable SpecContract error codes.
 */
function mapYamlFailure(
  error: YamlParseError | YamlValidationError,
): Result<never, SpecContractError> {
  if (error instanceof YamlParseError) {
    return err({
      code: 'SPEC_CONTRACT_INVALID_YAML',
      message: error.message,
    });
  }

  const issues = toSchemaIssueDetails(error.issues);
  return err({
    code: 'SPEC_CONTRACT_INVALID_FIELDS',
    message: formatInvalidFieldsMessage(issues),
    issues,
  });
}

/**
 * Build a compact message from schema issue details.
 */
function formatInvalidFieldsMessage(
  issues: readonly SchemaIssueDetail[],
): string {
  if (issues.length === 0) {
    return 'AI Contract fields failed schema validation';
  }
  return issues
    .map((issue) =>
      issue.path.length > 0
        ? `${issue.path}: ${issue.message}`
        : issue.message,
    )
    .join('; ');
}
