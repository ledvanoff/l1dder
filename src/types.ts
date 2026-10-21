/**
 * Core types for the L1DDER CLI.
 */

export type Language = "ru" | "en";

export const SUPPORTED_LANGUAGES: readonly Language[] = ["ru", "en"] as const;

export type AgentId =
  | "cursor"
  | "claude"
  | "codex"
  | "windsurf"
  | "copilot"
  | "opencode"
  | "cline";

export const SUPPORTED_AGENTS: readonly AgentId[] = [
  "cursor",
  "claude",
  "codex",
  "windsurf",
  "copilot",
  "opencode",
  "cline",
] as const;

export const AGENT_LABELS: Readonly<Record<AgentId, string>> = {
  cursor: "Cursor (.cursor/rules/l1dder/ + .cursor/skills/ + AGENTS.md)",
  claude: "Claude Code (CLAUDE.md + .claude/rules/l1dder/ + .claude/commands/ + .claude/skills/)",
  codex: "OpenAI Codex (AGENTS.md + .agents/skills/)",
  windsurf: "Windsurf (.windsurf/rules/l1dder.md + .windsurf/workflows/)",
  copilot: "GitHub Copilot (.github/copilot-instructions.md + .github/prompts/)",
  opencode: "OpenCode (AGENTS.md + .opencode/commands/ + .agents/skills/)",
  cline: "Cline & Roo Code (.clinerules/l1dder.md + .roo/rules/l1dder.md)",
};

export interface L1dderConfig {
  readonly version: string;
  readonly language: Language;
  readonly rootDir: string;
  readonly agents: readonly AgentId[];
}

export interface ExternalSkillSource {
  readonly repo: string;
  readonly bundled?: boolean | undefined;
  readonly skills: readonly string[];
}

export interface SkillsManifest {
  readonly description?: string | undefined;
  readonly l1dder: readonly string[];
  readonly core: readonly ExternalSkillSource[];
  readonly stack: readonly ExternalSkillSource[];
}

export interface SyncOutcome {
  readonly rootDir: string;
  readonly language: Language;
  readonly agents: readonly AgentId[];
  readonly created: readonly string[];
  readonly updated: readonly string[];
  readonly preservedStack: readonly string[];
  readonly agentFilesWritten: readonly string[];
}

export interface DoctorCheck {
  readonly id: string;
  readonly status: "pass" | "warn" | "fail";
  readonly message: string;
}

export interface DoctorReport {
  readonly ok: boolean;
  readonly rootDir: string;
  readonly language: Language;
  readonly agents: readonly AgentId[];
  readonly checks: readonly DoctorCheck[];
}
