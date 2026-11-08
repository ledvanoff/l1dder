# Changelog

> **Автогенерируемый файл:** этот файл автоматически собирается из единого источника истины [`assets/releases.json`](assets/releases.json) при вызове `npm run build`.
> При подготовке нового релиза добавляй запись только в `assets/releases.json`.

---

## [1.3.0] — 2026-11-08

**RU:** Быстрый режим /l1-fast для небольших фич продукта без начатого спринта (вызывает строго человек) и отклонение текущего спринта с откатом через git revert в /l1-planning.

**EN:** Fast mode /l1-fast for small product features when no sprint is active (strictly human-invoked) and current sprint rejection with git revert rollback in /l1-planning.

### Changes (Изменения)

- **[RU]** FEAT-006: Добавлена команда /l1-fast для небольших фич продукта без активного спринта (вызывает строго только человек, агенту запускать по своей инициативе запрещено): две остановки «ок» в чате, бронь ID на 1 (CURRENT) до кода, коммиты по задачам, полный список проверок и запись всех реестров с пометкой «Режим: /l1-fast» после кода.
- **[RU]** FEAT-006: В /l1-planning добавлена ветка отклонения текущего спринта с откатом его кода через git revert (без переписывания истории), сохранением документов спринта со статусом «❌ отклонена» и освобождением позиции 1 (CURRENT).
- **[RU]** FEAT-006: Полностью синхронизирована английская версия скилла /l1-planning с русской (шаги 1–5 и Exit Gate) и добавлен страж совпадения формы RU/EN на весь скилл.
- **[EN]** FEAT-006: Added the /l1-fast command for small product features when no sprint is active (strictly human-invoked, forbidden for the agent on its own initiative): two 'ok' stops in chat, ID reservation at 1 (CURRENT) before code, per-task commits, full verification checklist, and post-code registries marked 'Mode: /l1-fast'.
- **[EN]** FEAT-006: Added a branch in /l1-planning to reject the current sprint: rolls back its code with git revert (without rewriting history), keeps sprint documents marked '❌ rejected', and frees position 1 (CURRENT).
- **[EN]** FEAT-006: Synchronized the English /l1-planning skill with the Russian version across Steps 1–5 and Exit Gate, with a full-file RU/EN shape guard.

---

## [1.2.0] — 2026-11-07

**RU:** Новая команда /l1-chore для служебных правок самого проекта вне роадмапа и автоматические инструкции для ИИ-агента после обновления.

**EN:** New /l1-chore command for repository maintenance outside the roadmap and post-update instructions for AI agents.

### Changes (Изменения)

- **[RU]** FEAT-005: Добавлена команда /l1-chore и журнал CHORE-NNN в docs/backlog.md для правок самого проекта (правила git, CI, библиотеки, Makefile, тесты, правила агента) с одной остановкой «ок» и проверкой make ci.
- **[RU]** FEAT-005: Из документации и сайта убраны устаревающие счётчики скиллов и команд — команды перечисляются по именам.
- **[RU]** FEAT-005: После npx l1dder update CLI выводит блок «🤖 Инструкция для ИИ-агента после обновления», чтобы агент сам дописывал новые строки в защищённые проектные файлы (например, 40-skills-router.mdc), не затирая настройки пользователя.
- **[EN]** FEAT-005: Added the /l1-chore command and CHORE-NNN log in docs/backlog.md for project maintenance changes (git rules, CI, libraries, Makefile, tests, agent rules) with a single 'ok' stop and make ci verification.
- **[EN]** FEAT-005: Removed stale skill and command counts from documentation and the docs site in favor of listing commands by name.
- **[EN]** FEAT-005: npx l1dder update now prints a '🤖 AI Agent Instruction after L1DDER update' block so the agent can add new entries to protected project files (such as 40-skills-router.mdc) without overwriting custom settings.

---

## [1.1.0] — 2026-11-07

**RU:** Пошаговый онбординг /l1-onboard по одному файлу концепта со стеком после архитектуры, сокращённый шаблон видения и обновлённые встроенные скиллы.

**EN:** Step-by-step /l1-onboard working out the concept one file at a time before the stack, a leaner vision template, and updated bundled skills.

### Changes (Изменения)

- **[RU]** FEAT-004: /l1-onboard теперь проходит 6 этапов по одному файлу (идея → видение → архитектура → модель данных → стек → банк идей и роадмап), задаёт до 7 вопросов с рекомендациями в раунде и переносит заметки между этапами.
- **[RU]** FEAT-004: Сокращён шаблон vision.md, чтобы этапы концепта не дублировали друг друга.
- **[RU]** FEAT-004: Встроенные скиллы ponytail и mattpocock/skills сверены с исходниками, добавлены вложенные файлы (SKILL-MECHANICS.md, scripts/hitl-loop.template.sh) и их рекурсивное копирование во все папки агентов.
- **[EN]** FEAT-004: /l1-onboard now runs in 6 stages one file at a time (idea → vision → architecture → data model → stack → Idea Bank and roadmap), asks up to 7 questions with recommendations per round, and carries notes across stages.
- **[EN]** FEAT-004: Trimmed the vision.md template so concept stages no longer overlap.
- **[EN]** FEAT-004: Synced bundled ponytail and mattpocock/skills with upstream, added nested companion files (SKILL-MECHANICS.md, scripts/hitl-loop.template.sh), and copied nested skill folders to all agent directories.

---

## [1.0.3] — 2026-11-04

**RU:** Обновлены описание пакета и README, чтобы L1DDER проще находился в поиске. Поведение CLI, правила и скиллы не менялись.

**EN:** Updated the package description and README so L1DDER is easier to find in search. CLI behavior, rules and skills are unchanged.

### Changes (Изменения)

- **[RU]** Новые описание и ключевые слова пакета в npm, новое начало README.
- **[RU]** На сайте у каждой страницы свои заголовок и описание, появились `sitemap.xml`, `llms.txt` и карточка превью.
- **[EN]** New npm package description and keywords, new README opening.
- **[EN]** Every docs page now has its own title and description, plus `sitemap.xml`, `llms.txt` and a preview card.

---

## [1.0.2] — 2026-11-01

**RU:** Слэш-команды теперь видны в Claude Code вместе с Codex или OpenCode, заметки к релизам выходят на двух языках, а на сайте появилась инструкция на случай, если команды не отображаются.

**EN:** Slash commands now appear in Claude Code alongside Codex or OpenCode, release notes are bilingual, and the docs explain what to do when commands don't show up.

### Changes (Изменения)

- **[RU]** HOTFIX-003: команды `/l1-*` теперь видны в Claude Code при совместной установке с Codex или OpenCode: скиллы копируются во все папки, которые читают выбранные агенты.
- **[RU]** HOTFIX-004: заметки к релизам на GitHub теперь описывают одну версию на английском и русском, а на сайте появилась страница о том, что делать, если слэш-команды не видны.
- **[EN]** HOTFIX-003: `/l1-*` commands now appear in Claude Code when it is installed together with Codex or OpenCode: skills are copied into every folder the selected agents read.
- **[EN]** HOTFIX-004: GitHub Release notes now cover a single version in English and Russian, and the docs site has a new page on fixing missing slash commands.

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
