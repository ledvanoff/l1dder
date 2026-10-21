# Changelog

> **Автогенерируемый файл:** этот файл автоматически собирается из единого источника истины [`assets/releases.json`](assets/releases.json) при вызове `npm run build`.
> При подготовке нового релиза добавляй запись только в `assets/releases.json`.

---

## [1.0.1] — 2026-10-21

**RU:** Хотфикс дедупликации скиллов между ИИ-агентами (HOTFIX-002) и улучшение текстов документации (HOTFIX-001).

**EN:** Skill deduplication hotfix across AI agents (HOTFIX-002) and documentation copy refinements (HOTFIX-001).

### Changes (Изменения)

- **[RU]** HOTFIX-002: Полностью устранено дублирование слэш-команд в меню `/` при совместной установке нескольких агентов (Cursor, Claude Code, Codex, OpenCode) и добавлена автоочистка старых команд v0.2.x (l1dder-*).
- **[RU]** HOTFIX-001: Обновлены формулировки на сайте документации и проставлены прямые ссылки на DietrichGebert/ponytail и mattpocock/skills.
- **[EN]** HOTFIX-002: Eliminated duplicate slash commands in the `/` menu when multiple agents (Cursor, Claude Code, Codex, OpenCode) are enabled, and added automatic pruning of legacy v0.2.x commands (`l1dder-*`).
- **[EN]** HOTFIX-001: Refined documentation site copy and added direct links to DietrichGebert/ponytail and mattpocock/skills.

---

## [1.0.0] — 2026-10-21

**RU:** Полный переход на архитектуру Zero Hidden State (без state.yml и блокирующих git-хуков), 6 слэш-команд /l1-*, манифест скиллов l1dder/skills.json (20 скиллов в коробке) и поддержка 7 ИИ-агентов (Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode, Cline).

**EN:** Complete transition to Zero Hidden State architecture (no state.yml or blocking git hooks), 6 /l1-* slash commands, l1dder/skills.json manifest (20 bundled skills), and support for 7 AI agents (Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode, Cline).

### ⚠️ BREAKING CHANGES (Ломающие изменения)

- **[RU]** Удалена скрытая стейт-машина l1dder/.framework/state.yml и блокирующий git-хук commit-msg. Единственный источник истины теперь — Markdown-файлы в docs/ (docs/ideas.md, docs/backlog.md, docs/roadmap.md).
- **[RU]** Старые слэш-команды /l1dder-* заменены на единую линейку /l1-onboard, /l1-idea, /l1-feature, /l1-planning, /l1-task, /l1-hotfix, /l1-evo.
- **[RU]** Артефакты проекта (концепт, идеи, бэклог, роадмап, спеки и спринты) теперь хранятся в папке docs/, а сам фреймворк, правила и скиллы — в папке l1dder/.
- **[EN]** Removed hidden state machine l1dder/.framework/state.yml and blocking commit-msg git hook. Markdown files in docs/ (docs/ideas.md, docs/backlog.md, docs/roadmap.md) are now the single source of truth.
- **[EN]** Replaced legacy /l1dder-* slash commands with /l1-onboard, /l1-idea, /l1-feature, /l1-planning, /l1-task, /l1-hotfix, /l1-evo.
- **[EN]** Project artifacts (concept, ideas, backlog, roadmap, specs, sprints) now live in docs/, while framework rules, templates, and skills live in l1dder/.

### Changes (Изменения)

- **[RU]** Добавлены 7 управляющих скиллов: /l1-onboard, /l1-idea, /l1-feature, /l1-planning, /l1-task, /l1-hotfix, /l1-evo.
- **[RU]** В коробку вшиты 13 инженерных скиллов из DietrichGebert/ponytail и mattpocock/skills (управляются через l1dder/skills.json).
- **[RU]** Добавлена поддержка установки и обновления для Cursor, Claude Code, OpenAI Codex, Windsurf, GitHub Copilot, OpenCode и Cline.
- **[RU]** Добавлены команды npx l1dder update, npx l1dder update --skills и npx l1dder skills [list|add|install|update].
- **[EN]** Added 7 workflow control skills: /l1-onboard, /l1-idea, /l1-feature, /l1-planning, /l1-task, /l1-hotfix, /l1-evo.
- **[EN]** Bundled 13 core engineering skills from DietrichGebert/ponytail and mattpocock/skills (managed via l1dder/skills.json).
- **[EN]** Added multi-agent installer & updater for Cursor, Claude Code, OpenAI Codex, Windsurf, GitHub Copilot, OpenCode, and Cline.
- **[EN]** Added npx l1dder update, npx l1dder update --skills, and npx l1dder skills [list|add|install|update].
