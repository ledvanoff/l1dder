# TASK-01.02: Прогонка кодовой базы и всех 20 скиллов через `ponytail` (`ponytail-audit`, `ponytail-review`, `ponytail-debt`, `code-review`) и исправление косяков — План (Plan)

| Поле паспорта задачи | Значение |
|----------------------|----------|
| **ID задачи спринта** | `TASK-01.02` |
| **ID шага спеки** | `FEAT-002.02` ([`docs/specs/FEAT-002-release-hygiene-v1/tasks.md`](../../../../specs/FEAT-002-release-hygiene-v1/tasks.md)) |
| **ID родительского спринта** | [`SPRINT-01`](../../README.md) |
| **ID родительской фичи / спеки** | [`FEAT-002`](../../../../backlog.md#feat-002) ([`docs/specs/FEAT-002-release-hygiene-v1/`](../../../../specs/FEAT-002-release-hygiene-v1/)) |
| **ID родительской идеи** | [`IDEA-002`](../../../../ideas.md#idea-002) |
| **Тип задачи** | `refactor` |
| **Статус задачи** | `🚧 реализация` |
| **Git-ветка** | `refactor/hygiene-TASK-01.02-ponytail-audit` |
| **Прочитанные скиллы (`40-skills-router.mdc`)** | `ponytail`, `ponytail-audit`, `ponytail-review`, `ponytail-debt`, `code-review`, `codebase-design` |

---

## 1. Цель задачи и найденные при аудите точки улучшения

**Цель:** Провести ревизию всего кода CLI (`src/`) и всех 20 скиллов (`assets/i18n/{ru,en}/skills/`) по дисциплинам `ponytail-audit`, `ponytail-review`, `ponytail-debt` и `code-review`, и устранить все найденные несоответствия.

**Находки аудита (`ponytail-audit` + `code-review`):**
1. **`reuse / delete` в `src/skills-manager.ts`:** Константа `DEFAULT_MANIFEST` (37 строк) дублирует содержимое `assets/i18n/ru/skills.json`. Заменяем на чтение эталонного `skills.json` из `resolveAssetsDir()`.
2. **`reuse` в `src/installer.ts`:** Константа `PACKAGE_VERSION` была захардкожена строкой `"1.0.0"`. Читаем версию напрямую из корневого `package.json`, чтобы исключить рассинхронизацию при будущих релизах.
3. **`Spec / Standards` в `code-review/SKILL.md` (`ru` и `en`):** В тексте из апстрима осталась фраза `tell the user to run /setup-matt-pocock-skills` и поиск `CODING_STANDARDS.md`. Привязываем к стандарту `L1DDER`: трекер — `docs/backlog.md`, спека — `docs/specs/FEAT-NNN-<slug>/`, стандарты кода — `l1dder/rules/10-conventions.mdc` и `l1dder/rules/30-tech-stack.mdc`.
4. **`Spec / Standards` в `domain-modeling/SKILL.md` и `ADR-FORMAT.md` (`ru` и `en`):** В апстриме указана папка `docs/adr/` и файлы `0001-slug.md` (без префикса `ADR-`). Выравниваем под стандарт `L1DDER`: `docs/adrs/ADR-NNNN-<slug>.md` и `l1dder/GLOSSARY.md`.
5. **`Spec / Standards` в `retro/SKILL.md` (`ru` и `en`):** Выравниваем ссылки с `CODING_STANDARDS.md` на `l1dder/rules/10-conventions.mdc` и `l1dder/rules/30-tech-stack.mdc` (с синхронизацией через `npx l1dder sync`).

---

## 2. Критерии готовности (DoD)

| # | Критерий | Точная команда / способ проверки |
|---|----------|----------------------------------|
| 1 | В `assets/` нет устаревших ссылок на `/setup-matt-pocock-skills`, `docs/adr/` или `CODING_STANDARDS.md` | `rg "setup-matt-pocock-skills|CODING_STANDARDS\\.md|docs/adr/" assets/` (0 совпадений) |
| 2 | Дублирование в `src/skills-manager.ts` и `src/installer.ts` устранено | `make ci` |
| 3 | Полный цикл `make ci` проходит с 0 ошибок | `make ci` |
