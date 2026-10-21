# Changelog

Все заметные изменения и **ломающие изменения (`BREAKING CHANGES`)** фреймворка `L1DDER` фиксируются в этом файле (а также в машиночитаемом реестре `assets/releases.json`, который CLI проверяет перед каждым обновлением `npx l1dder update`).

---

## [1.0.1] — 2026-10-21

### Fixed (Хотфиксы `HOTFIX-001` и `HOTFIX-002`)

- **`HOTFIX-002` (Дедупликация скиллов и команд во всех ИИ-агентах):** Устранено дублирование слэш-команд в меню `/` при совместной установке `Cursor`, `Claude Code`, `Codex` и `OpenCode` (`resolveCanonicalSkillsDir` всегда выбирает ровно одну каноническую папку скиллов без дублей в `.claude/commands/` и `.opencode/commands/`). Добавлено автоматическое удаление устаревших команд `l1dder-*` от версий `0.2.x` при вызове `npx l1dder update` / `sync`.
- **`HOTFIX-001` (Документация и витрина сайта):** Очищены формулировки на главной странице и в путеводителе, добавлены прямые ссылки на [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) и [mattpocock/skills](https://github.com/mattpocock/skills).

---

## [1.0.0] — 2026-10-21

### ⚠️ BREAKING CHANGES (Ломающие изменения относительно 0.2.x)

- **Zero Hidden State:** Удалена скрытая стейт-машина `l1dder/.framework/state.yml` и блокирующий git-хук `commit-msg`. Единственный источник истины теперь — Markdown-документы в `docs/` (`docs/ideas.md`, `docs/backlog.md`, `docs/roadmap.md`) с паспортами сквозных ID (`ID Passport`).
- **Новые слэш-команды `/l1-*`:** Старые команды `/l1dder-*` заменены на `/l1-onboard`, `/l1-idea`, `/l1-feature`, `/l1-planning`, `/l1-task`, `/l1-hotfix`, `/l1-evo`.
- **Разделение `l1dder/` и `docs/`:** Правила, скиллы, шаблоны и манифест `skills.json` живут в `l1dder/`, а продуктовая документация проекта — в `docs/`.

### Added (Добавлено)

- **Управляющие скиллы процесса (`/l1-*`):** `l1-onboard`, `l1-idea`, `l1-feature`, `l1-planning`, `l1-task` (с обязательным финалом спринта `TASK-NN.99` Doctor Checklist), `l1-hotfix`, `l1-evo`.
- **Манифест скиллов `l1dder/skills.json` и 20 скиллов в коробке:** в поставку включены 4 скилла `DietrichGebert/ponytail` и 9 инженерных скиллов `mattpocock/skills` (`grilling`, `domain-modeling`, `codebase-design`, `tdd`, `diagnosing-bugs`, `code-review`, `retro`, `prototype`, `writing-for-agents`) со всеми вложенными справочниками.
- **Мульти-агентный инсталлятор:** поддержка `Cursor`, `Claude Code`, `OpenAI Codex`, `Windsurf`, `GitHub Copilot`, `OpenCode`, `Cline` на русском (`--lang ru`) и английском (`--lang en`) языках.
- **Безопасное обновление (`npx l1dder update` и `npx l1dder update --skills`):** проверка `BREAKING CHANGES` с интерактивным подтверждением пользователя перед обновлением.
