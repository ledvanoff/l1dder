import { createInterface } from "node:readline/promises";

import {
  collectBreakingChanges,
  compareSemver,
  detectInstalledVersion,
  formatUpdateChangelogReport,
  getPendingReleases,
  isAffirmativeAnswer,
  loadReleasesCatalog,
  type ReleaseEntry,
} from "./changelog.js";
import {
  detectExistingAgents,
  PACKAGE_VERSION,
  parseAgentsFlag,
  parseLanguageFlag,
  readProjectConfig,
  runProjectDoctor,
  runProjectSync,
} from "./installer.js";
import {
  addStackSkillToManifest,
  installSkillsFromManifest,
  listDeclaredSkills,
  readSkillsManifest,
} from "./skills-manager.js";
import type { AgentId, Language } from "./types.js";
import { AGENT_LABELS, SUPPORTED_AGENTS } from "./types.js";

export interface CliFlags {
  readonly command: string;
  readonly subcommand?: string | undefined;
  readonly positionalArgs: readonly string[];
  readonly cwd: string;
  readonly rootDir: string;
  readonly lang?: string | undefined;
  readonly agents?: string | undefined;
  readonly skillNames?: string | undefined;
  readonly skillsOnly: boolean;
  readonly remote: boolean;
  readonly yes: boolean;
  readonly force: boolean;
  readonly help: boolean;
  readonly version: boolean;
}

export interface CliRunDeps {
  readonly targetVersion?: string | undefined;
  readonly releasesCatalog?: readonly ReleaseEntry[] | undefined;
  readonly confirmPrompt?: ((question: string) => Promise<string>) | undefined;
}

export function parseArgv(argv: readonly string[]): CliFlags {
  const args = argv.slice(2);
  const positionals: string[] = [];
  const shorthandAgents: string[] = [];
  let cwd = process.cwd();
  let rootDir = "l1dder";
  let lang: string | undefined;
  let agents: string | undefined;
  let skillNames: string | undefined;
  let skillsOnly = false;
  let remote = false;
  let yes = false;
  let force = false;
  let help = false;
  let version = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === "-h" || arg === "--help" || arg === "help") {
      help = true;
    } else if (arg === "-v" || arg === "-V" || arg === "--version") {
      version = true;
    } else if (arg === "-y" || arg === "--yes" || arg === "--no-prompt") {
      yes = true;
    } else if (arg === "--force" || arg === "-f") {
      force = true;
    } else if (arg === "--skills-only" || arg === "--only-skills") {
      skillsOnly = true;
    } else if (arg === "--remote" || arg === "--upstream") {
      remote = true;
    } else if (arg === "--lang" || arg === "-l") {
      lang = args[++i];
    } else if (arg.startsWith("--lang=")) {
      lang = arg.slice("--lang=".length);
    } else if (arg === "--agents" || arg === "-a") {
      agents = args[++i];
    } else if (arg.startsWith("--agents=")) {
      agents = arg.slice("--agents=".length);
    } else if (
      arg === "--cursor" ||
      arg === "--claude" ||
      arg === "--codex" ||
      arg === "--windsurf" ||
      arg === "--copilot" ||
      arg === "--opencode" ||
      arg === "--cline" ||
      arg === "--all"
    ) {
      shorthandAgents.push(arg.slice(2));
    } else if (arg === "--skill" || arg === "--skills" || arg === "-s") {
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        i++;
        skillNames = skillNames ? `${skillNames},${next}` : next;
      } else {
        skillsOnly = true;
      }
    } else if (arg.startsWith("--skill=") || arg.startsWith("--skills=")) {
      const val = arg.slice(arg.indexOf("=") + 1);
      if (val) {
        skillNames = skillNames ? `${skillNames},${val}` : val;
      }
    } else if (arg === "--root") {
      rootDir = args[++i] ?? "l1dder";
    } else if (arg.startsWith("--root=")) {
      rootDir = arg.slice("--root=".length) || "l1dder";
    } else if (arg === "--cwd") {
      cwd = args[++i] ?? process.cwd();
    } else if (arg.startsWith("--cwd=")) {
      cwd = arg.slice("--cwd=".length) || process.cwd();
    } else if (!arg.startsWith("-")) {
      positionals.push(arg);
    }
  }

  const command = positionals[0] ?? "init";
  const subcommand = positionals[1];
  const positionalArgs = positionals.slice(2);
  const resolvedAgents =
    agents !== undefined
      ? agents
      : shorthandAgents.length > 0
        ? shorthandAgents.join(",")
        : undefined;

  if ((command === "update" || command === "sync") && subcommand === "skills") {
    skillsOnly = true;
  }

  return {
    command,
    subcommand,
    positionalArgs,
    cwd,
    rootDir,
    lang,
    agents: resolvedAgents,
    skillNames,
    skillsOnly,
    remote,
    yes,
    force,
    help,
    version,
  };
}

export function formatHelpText(): string {
  const agentList = SUPPORTED_AGENTS.map((id) => `    ${id.padEnd(10)} ${AGENT_LABELS[id]}`).join("\n");
  return `L1DDER v${PACKAGE_VERSION} — Spec-Driven & Roadmap-Gated AI Development Framework

Usage:
  npx l1dder init [options]                       Install l1dder/ and configure AI coding agents
  npx l1dder@latest update                        Update the ENTIRE framework (checks BREAKING CHANGES first)
  npx l1dder@latest update --skills               Update ONLY skills (bundled /l1-*, ponytail*, mattpocock + stack skills)
  npx l1dder sync [options]                       Alias for update (synchronizes l1dder/ and agent folders)
  npx l1dder changelog                            Display release history and BREAKING CHANGES
  npx l1dder skills [list]                        List all skills from l1dder/skills.json (l1dder, core, stack)
  npx l1dder skills update [--remote]             Update all skills in the project (--remote pulls latest from GitHub)
  npx l1dder skills add <owner/repo> --skill <s1> Add a stack skill to l1dder/skills.json, download it, and sync to agents
  npx l1dder skills install                       Download stack skills declared in l1dder/skills.json
  npx l1dder doctor [options]                     Verify l1dder/ and docs/ structure

Options:
  --lang, -l <ru|en>            Language for methodology, rules, skills & templates (default: ru)
  --agents, -a <list>           Comma-separated agents or "all" (default: cursor,claude,codex)
  --cursor / --claude / --codex Shorthand flags to select specific agents
  --skills, --skills-only       Update ONLY skills without modifying rules, templates, or docs
  --remote, --upstream          Also pull latest upstream commits from GitHub for core skills
  --skill, -s <names>           Skill name(s) when running "l1dder skills add <repo> --skill <name>"
  --root <dir>                  Root methodology folder name (default: l1dder)
  --force, -f                   Overwrite Stack files on update/sync (30-tech-stack.mdc, skills.json)
  --yes, -y                     Auto-confirm prompts (including BREAKING CHANGES confirmation)
  --cwd <path>                  Target project directory
  --version, -V                 Print version
  --help, -h                    Print this help message

Supported Agents (--agents):
${agentList}
    all        Install for all supported agents at once

Examples (One-Command Updates):
  npx l1dder@latest update                        # Checks changelog & breaking changes, asks confirmation, updates framework
  npx l1dder@latest update --skills               # Update ONLY skills (leaves rules & templates untouched)
  npx l1dder changelog                            # View full changelog & breaking changes
`;
}

async function promptInteractiveChoices(
  projectDir: string,
  initialLang: string | undefined,
  initialAgents: string | undefined,
): Promise<{ language: Language; agents: readonly AgentId[] }> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    let language: Language = "ru";
    if (initialLang !== undefined) {
      language = parseLanguageFlag(initialLang);
    } else {
      const ans = await rl.question(
        "Select language / Выберите язык [1 = Русский (ru), 2 = English (en)] (default: 1): ",
      );
      const trimmed = ans.trim().toLowerCase();
      if (trimmed === "2" || trimmed === "en" || trimmed === "english") {
        language = "en";
      } else {
        language = "ru";
      }
    }

    let agents: readonly AgentId[];
    if (initialAgents !== undefined) {
      agents = parseAgentsFlag(initialAgents);
    } else {
      const detected = detectExistingAgents(projectDir);
      const promptMsg =
        language === "ru"
          ? `Выберите ИИ-агентов через запятую (${SUPPORTED_AGENTS.join(", ")}, all) [по умолчанию: ${detected.join(",")}]: `
          : `Select AI agents comma-separated (${SUPPORTED_AGENTS.join(", ")}, all) [default: ${detected.join(",")}]: `;
      const ans = await rl.question(promptMsg);
      agents = ans.trim() === "" ? detected : parseAgentsFlag(ans);
    }

    return { language, agents };
  } finally {
    rl.close();
  }
}

async function askBreakingChangesApproval(
  question: string,
  customPrompt?: ((q: string) => Promise<string>) | undefined,
): Promise<boolean> {
  if (customPrompt !== undefined) {
    const answer = await customPrompt(question);
    return isAffirmativeAnswer(answer);
  }
  if (!process.stdin.isTTY) {
    return false;
  }
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await rl.question(question);
    return isAffirmativeAnswer(answer);
  } finally {
    rl.close();
  }
}

/**
 * Check pending releases between installed version and target version.
 * Prints changelog and, if breaking changes exist, asks for user confirmation.
 * Returns `true` if the update is allowed to proceed, or `false` if cancelled.
 */
async function checkAndConfirmBreakingUpdate(options: {
  readonly projectDir: string;
  readonly rootDir: string;
  readonly lang: Language;
  readonly autoConfirm: boolean;
  readonly deps?: CliRunDeps | undefined;
}): Promise<boolean> {
  const { projectDir, rootDir, lang, autoConfirm, deps } = options;
  const toVersion = deps?.targetVersion ?? PACKAGE_VERSION;
  const fromVersion = detectInstalledVersion(projectDir, rootDir);

  if (fromVersion === null || compareSemver(fromVersion, toVersion) >= 0) {
    return true;
  }

  const catalog = deps?.releasesCatalog ?? loadReleasesCatalog();
  const pending = getPendingReleases(fromVersion, toVersion, catalog);
  if (pending.length === 0) {
    return true;
  }

  const report = formatUpdateChangelogReport({
    fromVersion,
    toVersion,
    pendingReleases: pending,
    lang,
  });
  process.stdout.write(report);

  const breaking = collectBreakingChanges(pending, lang);
  if (breaking.length === 0) {
    return true;
  }

  if (autoConfirm) {
    process.stdout.write(
      lang === "ru"
        ? "ℹ️  Ломающие изменения подтверждены автоматически флагом --yes / --force.\n"
        : "ℹ️  Breaking changes auto-confirmed via --yes / --force.\n",
    );
    return true;
  }

  if (
    !process.stdin.isTTY &&
    deps?.confirmPrompt === undefined
  ) {
    process.stdout.write(
      lang === "ru"
        ? "🤖 Инструкция для ИИ-агента: Обнаружены ломающие изменения (BREAKING CHANGES), поэтому обновление приостановлено.\n" +
          "   1. Покажи список BREAKING CHANGES выше пользователю в чате.\n" +
          "   2. Спроси у пользователя подтверждение («Обновляем с учётом этих изменений? да/нет»).\n" +
          "   3. ТОЛЬКО после ответа «да» / «ок» от пользователя запусти команду повторно с флагом --yes:\n" +
          "      npx l1dder@latest update --yes\n"
        : "🤖 AI Agent Instruction: BREAKING CHANGES were detected, so the update was paused.\n" +
          "   1. Show the BREAKING CHANGES list above to the user in chat.\n" +
          "   2. Ask the user for confirmation (\"Proceed with this update? yes/no\").\n" +
          "   3. ONLY after the user replies \"yes\" / \"ok\", re-run the command with --yes:\n" +
          "      npx l1dder@latest update --yes\n",
    );
    return false;
  }

  const question =
    lang === "ru"
      ? "❓ В новой версии есть ломающие изменения (BREAKING CHANGES). Продолжить обновление? (да/нет) [y/N]: "
      : "❓ This update includes BREAKING CHANGES. Proceed with update? (yes/no) [y/N]: ";

  const approved = await askBreakingChangesApproval(question, deps?.confirmPrompt);
  if (!approved) {
    process.stdout.write(
      lang === "ru"
        ? "✗ Обновление отменено. Файлы проекта не были изменены.\n"
        : "✗ Update cancelled. Project files were not modified.\n",
    );
    return false;
  }

  return true;
}

export async function runCli(
  argv: readonly string[] = process.argv,
  deps?: CliRunDeps,
): Promise<number> {
  try {
    const flags = parseArgv(argv);

    if (flags.version) {
      process.stdout.write(`${deps?.targetVersion ?? PACKAGE_VERSION}\n`);
      return 0;
    }

    if (flags.help) {
      process.stdout.write(formatHelpText());
      return 0;
    }

    const existingConfig = readProjectConfig(flags.cwd, flags.rootDir);
    const activeRootDir = existingConfig?.rootDir ?? flags.rootDir;

    if (flags.command === "changelog") {
      const language = parseLanguageFlag(flags.lang ?? existingConfig?.language ?? "ru");
      const catalog = deps?.releasesCatalog ?? loadReleasesCatalog();
      const report = formatUpdateChangelogReport({
        fromVersion: "0.0.0",
        toVersion: deps?.targetVersion ?? PACKAGE_VERSION,
        pendingReleases: catalog,
        lang: language,
      });
      process.stdout.write(report);
      return 0;
    }

    if (flags.command === "init") {
      const isInteractive = !flags.yes && Boolean(process.stdin.isTTY);
      let language: Language;
      let agents: readonly AgentId[];

      if (isInteractive && (flags.lang === undefined || flags.agents === undefined)) {
        const chosen = await promptInteractiveChoices(flags.cwd, flags.lang, flags.agents);
        language = chosen.language;
        agents = chosen.agents;
      } else {
        language = parseLanguageFlag(flags.lang ?? existingConfig?.language ?? "ru");
        agents =
          flags.agents !== undefined
            ? parseAgentsFlag(flags.agents)
            : (existingConfig?.agents ?? detectExistingAgents(flags.cwd));
      }

      const outcome = runProjectSync({
        projectDir: flags.cwd,
        rootDir: flags.rootDir,
        language,
        agents,
        force: flags.force,
        updateGitignore: true,
        skillsOnly: false,
      });

      printOutcome("init", outcome, false);
      return 0;
    }

    if (flags.command === "update" || flags.command === "sync") {
      const language = parseLanguageFlag(flags.lang ?? existingConfig?.language ?? "ru");
      const agents =
        flags.agents !== undefined
          ? parseAgentsFlag(flags.agents)
          : (existingConfig?.agents ?? detectExistingAgents(flags.cwd));

      const allowed = await checkAndConfirmBreakingUpdate({
        projectDir: flags.cwd,
        rootDir: activeRootDir,
        lang: language,
        autoConfirm: flags.yes || flags.force,
        deps,
      });
      if (!allowed) {
        return 1;
      }

      const outcome = runProjectSync({
        projectDir: flags.cwd,
        rootDir: activeRootDir,
        language,
        agents,
        force: flags.force,
        updateGitignore: false,
        skillsOnly: flags.skillsOnly,
      });

      const manifest = readSkillsManifest(flags.cwd, activeRootDir);
      if (manifest.stack.length > 0 || flags.remote) {
        await installSkillsFromManifest({
          projectDir: flags.cwd,
          rootDir: activeRootDir,
          updateCore: flags.remote,
        });
      }

      printOutcome("update", outcome, flags.skillsOnly);
      return 0;
    }

    if (flags.command === "skills") {
      const sub = flags.subcommand ?? "list";

      if (sub === "list") {
        const rows = listDeclaredSkills(flags.cwd, activeRootDir);
        process.stdout.write(`\n📦 Skills Manifest (${activeRootDir}/skills.json):\n\n`);
        for (const row of rows) {
          const badge = row.installed ? "✓" : "○";
          process.stdout.write(
            `  ${badge} [${row.group.padEnd(6)}] ${row.skill.padEnd(28)} (${row.repo})\n`,
          );
        }
        process.stdout.write("\n");
        return 0;
      }

      if (sub === "add") {
        const repo = flags.positionalArgs[0];
        if (!repo) {
          throw new Error("Usage: npx l1dder skills add <owner/repo> --skill <skill-name>");
        }
        const parsedSkills = (flags.skillNames ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parsedSkills.length === 0) {
          throw new Error(
            "Specify at least one skill with --skill <name> (e.g. npx l1dder skills add vercel-labs/agent-skills --skill vercel-react-best-practices)",
          );
        }

        addStackSkillToManifest({
          projectDir: flags.cwd,
          rootDir: activeRootDir,
          repo,
          skills: parsedSkills,
        });

        const res = await installSkillsFromManifest({
          projectDir: flags.cwd,
          rootDir: activeRootDir,
          updateCore: false,
        });

        process.stdout.write(
          `✓ Added ${repo} (${parsedSkills.join(", ")}) to ${activeRootDir}/skills.json\n` +
            `  • Downloaded: ${res.downloaded.length}, Synced agent files: ${res.agentFilesWritten.length}\n`,
        );
        return 0;
      }

      if (sub === "install" || sub === "update") {
        const language = parseLanguageFlag(flags.lang ?? existingConfig?.language ?? "ru");
        const agents =
          flags.agents !== undefined
            ? parseAgentsFlag(flags.agents)
            : (existingConfig?.agents ?? detectExistingAgents(flags.cwd));

        if (sub === "update") {
          const allowed = await checkAndConfirmBreakingUpdate({
            projectDir: flags.cwd,
            rootDir: activeRootDir,
            lang: language,
            autoConfirm: flags.yes || flags.force,
            deps,
          });
          if (!allowed) {
            return 1;
          }
        }

        const syncRes = runProjectSync({
          projectDir: flags.cwd,
          rootDir: activeRootDir,
          language,
          agents,
          force: flags.force,
          updateGitignore: false,
          skillsOnly: true,
        });

        const manifest = readSkillsManifest(flags.cwd, activeRootDir);
        const updateCoreFromRemote = flags.remote || flags.force;
        let downloadedCount = 0;
        if (manifest.stack.length > 0 || updateCoreFromRemote) {
          const remoteRes = await installSkillsFromManifest({
            projectDir: flags.cwd,
            rootDir: activeRootDir,
            updateCore: updateCoreFromRemote,
          });
          downloadedCount = remoteRes.downloaded.length;
        }

        process.stdout.write(
          `✓ Skills ${sub} complete (${activeRootDir}/skills.json)\n` +
            `  • Bundled skills created/updated: ${syncRes.created.length + syncRes.updated.length}\n` +
            `  • External skills downloaded from GitHub: ${downloadedCount}\n` +
            `  • Agent skill files synced: ${syncRes.agentFilesWritten.length}\n`,
        );
        return 0;
      }

      throw new Error(`Unknown skills subcommand "${sub}". Use: list, install, update, add`);
    }

    if (flags.command === "doctor" || flags.command === "status") {
      const report = runProjectDoctor(flags.cwd, activeRootDir);
      for (const check of report.checks) {
        const icon = check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "✗";
        process.stdout.write(`${icon} [${check.id}] ${check.message}\n`);
      }
      return report.ok ? 0 : 1;
    }

    process.stderr.write(`Unknown command "${flags.command}". Run "npx l1dder --help".\n`);
    return 1;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${message}\n`);
    return 1;
  }
}

function printOutcome(
  mode: "init" | "update",
  outcome: ReturnType<typeof runProjectSync>,
  skillsOnly: boolean,
): void {
  const isRu = outcome.language === "ru";
  if (mode === "init") {
    process.stdout.write(
      isRu
        ? `\n✓ L1DDER v${PACKAGE_VERSION} установлен в ${outcome.rootDir}/ (язык: ${outcome.language}, агенты: ${outcome.agents.join(", ")})\n`
        : `\n✓ L1DDER v${PACKAGE_VERSION} initialized in ${outcome.rootDir}/ (lang: ${outcome.language}, agents: ${outcome.agents.join(", ")})\n`,
    );
  } else if (skillsOnly) {
    process.stdout.write(
      isRu
        ? `\n✓ Скиллы L1DDER v${PACKAGE_VERSION} обновлены в ${outcome.rootDir}/skills/ (правила и шаблоны не тронуты; агенты: ${outcome.agents.join(", ")})\n`
        : `\n✓ L1DDER v${PACKAGE_VERSION} skills updated in ${outcome.rootDir}/skills/ (rules & templates untouched; agents: ${outcome.agents.join(", ")})\n`,
    );
  } else {
    process.stdout.write(
      isRu
        ? `\n✓ Весь фреймворк L1DDER обновлён до v${PACKAGE_VERSION} в ${outcome.rootDir}/ (язык: ${outcome.language}, агенты: ${outcome.agents.join(", ")})\n`
        : `\n✓ Full L1DDER framework updated to v${PACKAGE_VERSION} in ${outcome.rootDir}/ (lang: ${outcome.language}, agents: ${outcome.agents.join(", ")})\n`,
    );
  }

  process.stdout.write(
    isRu
      ? `  • Файлов создано: ${outcome.created.length}, обновлено: ${outcome.updated.length}\n`
      : `  • Files created: ${outcome.created.length}, updated: ${outcome.updated.length}\n`,
  );

  if (outcome.preservedStack.length > 0) {
    process.stdout.write(
      isRu
        ? `  • Сохранены проектные файлы стека (не перезаписаны): ${outcome.preservedStack.join(", ")}\n`
        : `  • Preserved project stack files (untouched): ${outcome.preservedStack.join(", ")}\n`,
    );
  }

  process.stdout.write(
    isRu
      ? `  • Синхронизировано файлов ИИ-агентов: ${outcome.agentFilesWritten.length}\n\n`
      : `  • AI agent files synced: ${outcome.agentFilesWritten.length}\n\n`,
  );

  if (mode === "init") {
    process.stdout.write(
      isRu
        ? `👉 Следующий шаг (для человека в чате агента):\n   Введи команду: /l1-onboard\n\n` +
          `🤖 Инструкция для ИИ-агента (если установку попросил выполнить пользователь в чате):\n` +
          `   Сразу прочитай файл ${outcome.rootDir}/skills/l1-onboard/SKILL.md и начни ШАГ 1 онбординга\n` +
          `   (определи режим from-scratch / existing-code и предложи настройку стека для ${outcome.rootDir}/rules/30-tech-stack.mdc),\n` +
          `   не заставляя пользователя вручную вводить /l1-onboard!\n`
        : `👉 Next step (for human in agent chat):\n   Type command: /l1-onboard\n\n` +
          `🤖 AI Agent Instruction (if the user asked you to install L1DDER in chat):\n` +
          `   Immediately read ${outcome.rootDir}/skills/l1-onboard/SKILL.md and start STEP 1 of onboarding\n` +
          `   (detect from-scratch / existing-code mode and propose stack config for ${outcome.rootDir}/rules/30-tech-stack.mdc)\n` +
          `   without making the user manually type /l1-onboard!\n`,
    );
  }
}

const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("/cli.js") ||
    process.argv[1].endsWith("\\cli.js") ||
    process.argv[1].endsWith("/l1dder") ||
    process.argv[1].endsWith("\\l1dder"));

if (isMain) {
  void runCli(process.argv).then((code) => {
    process.exit(code);
  });
}
