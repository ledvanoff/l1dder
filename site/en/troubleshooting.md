# 🩹 Slash Commands `/l1-*` Not Showing

> `/l1-*` commands are regular files in your AI agent's folder. If they are missing from the `/` menu, the agent did not find them in the folder it reads.

## Step 1. Update the files and open a new session

```bash
npx l1dder@latest update
```

Then start a new agent session or restart the agent: a session that is already open may not see new commands.

## Step 2. Check that the command file exists

`npx l1dder doctor` does not check agent folders, so look at the file itself:

| Agent | File that should exist in your project |
|-------|----------------------------------------|
| **Claude Code** | `.claude/skills/l1-task/SKILL.md` |
| **Cursor** | `.agents/skills/l1-task/SKILL.md` or `.cursor/skills/l1-task/SKILL.md` |
| **OpenAI Codex** (commands are invoked as `$l1-task`) | `.agents/skills/l1-task/SKILL.md` |
| **OpenCode** | `.agents/skills/l1-task/SKILL.md` |
| **Windsurf** | `.windsurf/workflows/l1-task.md` |
| **GitHub Copilot** | `.github/prompts/l1-task.prompt.md` |
| **Cline / Roo Code** | There are no separate commands: `L1DDER` installs only rules for them. Write in chat: `Follow l1dder/skills/l1-task/SKILL.md` |

This check works in a macOS/Linux terminal and in PowerShell:

```bash
ls .claude/skills/l1-task/SKILL.md
```

## Step 3. If the file is missing, add the agent

Most likely the agent was not selected during installation. List **all** the agents you use:

```bash
npx l1dder@latest sync --agents cursor,claude
```

> ⚠️ Skill folders of agents missing from the list will be removed. The source folder `l1dder/skills/` stays in place.

Then open a new agent session.

## Still missing: common cases

### Claude Code together with Codex or OpenCode, version `1.0.1` or older

These versions put skills only in `.agents/skills/`, while Claude Code reads only `.claude/skills/`. Update `L1DDER` with the command from Step 1: newer versions keep skills in both folders.

### Cursor doesn't see the commands, and only `claude` is installed

Cursor reads `.claude/skills/` only with the **Third-Party Imports** setting enabled (`Cursor Settings → Agents`). It is more reliable to add Cursor to the agent list as in Step 3: the commands will then be in a folder it always reads.

### A teammate cloned the project and has no commands

The agent folders were not committed. Commit them, or ask your teammate to run `npx l1dder sync` after cloning.

### Windows

No extra setup is needed: `L1DDER` installs commands as plain copies, so symlinks and Developer Mode are not required.

---

Didn't find your case? [Open an issue on GitHub](https://github.com/ledvanoff/l1dder/issues) and mention your agent and `L1DDER` version.
