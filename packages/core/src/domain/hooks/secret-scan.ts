/**
 * Pure secret pattern scanner.
 *
 * Adapted from ECC `before-submit-prompt.js` (MIT, Affaan Mustafa).
 * Detects common API keys and private credentials in text.
 */

/** A detected secret finding. */
export interface SecretFinding {
  /** Human-readable pattern name. */
  readonly pattern: string;
  /** Matched substring (truncated for safety). */
  readonly match: string;
}

const SECRET_PATTERNS: ReadonlyArray<{ name: string; regex: RegExp }> = [
  { name: 'OpenAI API key (sk-)', regex: /sk-[a-zA-Z0-9]{20,}/ },
  { name: 'GitHub personal access token (ghp_)', regex: /ghp_[a-zA-Z0-9]{36,}/ },
  { name: 'AWS access key (AKIA)', regex: /AKIA[A-Z0-9]{16}/ },
  { name: 'Slack token (xox*)', regex: /xox[bpsa]-[a-zA-Z0-9-]+/ },
  { name: 'Private key block', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
];

/**
 * Scan text for potential secrets.
 *
 * Returns an array of findings (empty if no secrets detected).
 * This function is pure — no I/O, no side-effects.
 */
export function findSecrets(text: string): readonly SecretFinding[] {
  const findings: SecretFinding[] = [];

  for (const { name, regex } of SECRET_PATTERNS) {
    const m = regex.exec(text);
    if (m) {
      findings.push({
        pattern: name,
        // Truncate matched value to avoid leaking it in logs.
        match: m[0].slice(0, 12) + '***',
      });
    }
  }

  return findings;
}
