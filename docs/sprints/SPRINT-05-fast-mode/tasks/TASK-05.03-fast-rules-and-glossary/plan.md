# TASK-05.03: Исключение `/l1-fast` в правилах, словаре, шаблоне роадмапа и соседних скиллах и синхронизация EN `/l1-planning` — План (Plan)

| Поле паспорта задачи | Значение |
|----------------------|----------|
| **ID задачи спринта** | `TASK-05.03` |
| **ID шага спеки** | `FEAT-006.03` ([`docs/specs/FEAT-006-fast-mode/tasks.md`](../../../../specs/FEAT-006-fast-mode/tasks.md)) |
| **ID родительского спринта** | [`SPRINT-05`](../../README.md) |
| **ID родительской фичи / спеки** | [`FEAT-006`](../../../../backlog.md#feat-006) ([`docs/specs/FEAT-006-fast-mode/`](../../../../specs/FEAT-006-fast-mode/)) |
| **ID родительской идеи** | [`IDEA-005`](../../../../ideas.md#idea-005) |
| **Тип задачи** | `feat` |
| **Статус задачи** | `✅ реализована` |
| **Git-ветка** | `dev` |
| **Прочитанные скиллы (`40-skills-router.mdc`)** | `ponytail`, `codebase-design`, `tdd`, `domain-modeling`, `writing-for-agents` |

---

## 1. Цель задачи и фильтр `ponytail` (6-Step Decision Ladder)

**Цель:** Прописать `/l1-fast` (как исключение из `Roadmap Gate` только при пустой позиции `1 (CURRENT)` и режим с двумя остановками в чате и документами после кода) и отклонение спринта через `/l1-planning` в правилах `00/20/40`, словаре `GLOSSARY.md`, шаблоне `roadmap-template.md`, скиллах `l1-task` и `l1-hotfix` и сводке `AGENTS.md` / `CLAUDE.md` на RU и EN, сверить шаги `agent` в `design.md` с фактическим `40-skills-router.mdc`, а также полностью синхронизировать EN-версию `/l1-planning` с RU (шаги 1–5 и Exit Gate) и расширить страж RU/EN на весь скилл.

**Фильтр `ponytail` (заполнить до написания кода):**
- **Что переиспользуем из репозитория / платформы / установленных пакетов:** паттерн контрактных проверок `Seam 3` из `tests/chore-skill.test.ts`, существующие `tests/fast-skill.test.ts` и `tests/planning-reject.test.ts`, пайплайн синхронизации `make build` (`scripts/sync-root-l1dder.mjs`, `scripts/sync-site-docs.mjs`).
- **От чего намеренно отказываемся (`Ponytail skipped` / YAGNI):** не меняем шаблоны паспортов документов (строку `Режим | /l1-fast` добавляет сам скилл `/l1-fast`), не трогаем `assets/releases.json` до релиза и не трогаем пользовательские гайды и `METHODOLOGY.md` (это `TASK-05.04`).
- **Публичные швы для тестирования (`Pre-agreed Test Seams`):**
  - `Seam 3` (`tests/fast-skill.test.ts`): правила `00-methodology.mdc`, `20-workflow.mdc`, `40-skills-router.mdc`, словарь `GLOSSARY.md`, шаблон `roadmap-template.md`, скиллы `l1-task/SKILL.md` и `l1-hotfix/SKILL.md` на RU и EN называют `/l1-fast`, указывают условие пустой `1 (CURRENT)`, границу с `/l1-hotfix` и `/l1-chore` и ветку отклонения спринта в `/l1-planning`.
  - `Seam 4` (`tests/planning-reject.test.ts`): страж совпадения формы RU и EN расширен с ветки отклонения на весь файл `skills/l1-planning/SKILL.md` (шаги `## ШАГ` / `## STEP`, шаги ветки `### О` / `### R`, остановки `⛔`, блоки кода и списки).

---

## 2. Состав работ (Пошаговый чек-лист)

- [x] Шаг 1 (`tdd` срез 1 — `Seam 4`): Расширить в `tests/planning-reject.test.ts` страж RU/EN с ветки отклонения на весь скилл `skills/l1-planning/SKILL.md` (`RED`), синхронизировать шаги 1–5 и Exit Gate в `assets/i18n/en/skills/l1-planning/SKILL.md` с RU-версией и отметить это в `docs/specs/FEAT-006-fast-mode/design.md` (`GREEN`).
- [x] Шаг 2 (`tdd` срез 2 — `Seam 3`, правила `00/20/40`): Добавить в `tests/fast-skill.test.ts` тесты на `00-methodology.mdc`, `20-workflow.mdc` (включая `ЦЕПОЧКА 7: /l1-fast` / `Flow 7 (/l1-fast)` и отклонение спринта в `ЦЕПОЧКА 3` / `Flow 3`) и `40-skills-router.mdc` на RU и EN (`RED`), внести изменения в `assets/i18n/{ru,en}/rules/{00,20,40}-*.mdc` и сверить точные тексты шагов `agent` в `docs/specs/FEAT-006-fast-mode/design.md` (`GREEN`).
- [x] Шаг 3 (`tdd` срез 3 — `Seam 3`, словарь, шаблон роадмапа, соседние скиллы и сводка): Добавить в `tests/fast-skill.test.ts` тесты на `GLOSSARY.md` (статья про `/l1-fast`, `Roadmap Gate`, правило двух согласований и отклонение спринта), `templates/roadmap/roadmap-template.md`, `skills/l1-task/SKILL.md` и `skills/l1-hotfix/SKILL.md` на RU и EN (`RED`), обновить эти файлы и уточнить описание `/l1-planning` в `src/agents.ts` (`GREEN`).
- [x] Шаг 4: Прогнать `make ci` (автосинхронизирует `./l1dder/`, папки агентов и страницы сайта `./site/`, в частности `site/glossary.md` и `site/en/glossary.md`) и проверить дифф по `ponytail-review`.
- [x] ⛔ **СТОП №2:** Показать пользователю отчёт самопроверки DoD + обязательный 2-строчный футер `ponytail` (`Ponytail skipped` / `Risk`) и дождаться слова «ок».
- [x] Шаг 5 (только после второго «ок»): Создать `summary.md` и обновить статус `TASK-05.03` (`FEAT-006.03`) на `✅ реализована` в 4 файлах:
  1. `docs/sprints/SPRINT-05-fast-mode/README.md`
  2. `docs/specs/FEAT-006-fast-mode/tasks.md`
  3. `docs/backlog.md`
  4. `docs/roadmap.md` (счётчик прогресса спринта `3/4 (+ TASK-05.99)`)

---

## 3. Критерии готовности (DoD)

**Агент проверяет (исполняемые команды):**

| # | Критерий | Точная команда / способ проверки |
|---|----------|----------------------------------|
| 1 | Страж RU/EN в `tests/planning-reject.test.ts` проверяет весь `skills/l1-planning/SKILL.md` (шаги 1–5 + ветка отклонения) и проходит | `npx vitest run tests/planning-reject.test.ts` |
| 2 | Контракт `Seam 3` в `tests/fast-skill.test.ts` проверяет `00/20/40-*.mdc`, `GLOSSARY.md`, `roadmap-template.md`, `l1-task/SKILL.md` и `l1-hotfix/SKILL.md` на RU и EN | `npx vitest run tests/fast-skill.test.ts` |
| 3 | Шаги `agent` в `docs/specs/FEAT-006-fast-mode/design.md` сверены символ-в-символ с `assets/i18n/{ru,en}/rules/40-skills-router.mdc` | Проверка `design.md` и `40-skills-router.mdc` |
| 4 | Линтер и проверка типов проходят без ошибок | `make lint && make typecheck` |
| 5 | Полный цикл `make ci` (сборка, синхронизация `./l1dder/` и `./site/`, все тесты, E2E сайта, `doctor`) проходит с 0 ошибок | `make ci` |

**Пользователь проверяет (при необходимости):**

- Формулировки исключения `/l1-fast` в правилах и словаре, синхронность `en/skills/l1-planning/SKILL.md` и шаги `agent` в `design.md`.

---

## 4. Артефакты и границы Scope

**Трогаем (создаём или меняем только эти файлы):**
- `assets/i18n/en/skills/l1-planning/SKILL.md` — синхронизация шагов 1–5 и Exit Gate с RU-версией.
- `assets/i18n/{ru,en}/rules/00-methodology.mdc` — строка `/l1-fast` и упоминание отклонения спринта в `/l1-planning`.
- `assets/i18n/{ru,en}/rules/20-workflow.mdc` — исключение `/l1-fast` в `Roadmap Gate`, отклонение спринта в Цепочке 3 и `ЦЕПОЧКА 7: /l1-fast` (`Flow 7`).
- `assets/i18n/{ru,en}/rules/40-skills-router.mdc` — строка `/l1-fast`, обновление строки `/l1-planning` и раздел «Как использовать» / `How to use`.
- `assets/i18n/{ru,en}/GLOSSARY.md` — статья про `/l1-fast`, исключение в `Roadmap Gate`, отклонение спринта и оговорка в правиле двух согласований.
- `assets/i18n/{ru,en}/templates/roadmap/roadmap-template.md` — исключение `/l1-fast` (при пустой `1 (CURRENT)`) в шапке `Roadmap Gate`.
- `assets/i18n/{ru,en}/skills/l1-task/SKILL.md` и `assets/i18n/{ru,en}/skills/l1-hotfix/SKILL.md` — упоминание `/l1-fast` и границы между `/l1-fast`, `/l1-hotfix` и `/l1-chore`.
- `src/agents.ts` — уточнение строки `/l1-planning` (отклонение текущего спринта) в `buildEntryPointSummary()`.
- `docs/specs/FEAT-006-fast-mode/design.md` — сверка шагов `agent` с `40-skills-router.mdc` и фиксация полного стража RU/EN для `Seam 4`.
- `tests/planning-reject.test.ts` и `tests/fast-skill.test.ts` — контрактные тесты `Seam 4` и `Seam 3`.
- Производные файлы от `make build`: `./l1dder/`, папки агентов, `AGENTS.md`, `CLAUDE.md`, `site/glossary.md`, `site/en/glossary.md`.

**НЕ трогаем (вне Scope):**
- `README.md`, `assets/i18n/{ru,en}/README.md`, `assets/i18n/{ru,en}/METHODOLOGY.md`, `assets/i18n/{ru,en}/user-guide/*` и остальные страницы сайта — это задача `TASK-05.04`.
- `assets/releases.json` — меняется только при выпуске релиза по прямому запросу пользователя.

---

## 5. Риски и открытые вопросы

- **Особенность `en/rules/40-skills-router.mdc` для старых проектов:** в `v1.0.0–v1.2.0` в `assets/i18n/en/rules/40-skills-router.mdc` не было раздела `## How to use` (он был только в RU). Мы добавим `## How to use` в `assets/i18n/en/rules/40-skills-router.mdc` для синхронности RU/EN, а в шаге 2 `agent` для EN в `design.md` укажем: если в файле есть пункт 3 раздела `How to use`, обновить его, иначе пропустить этот шаг (чтобы агент при `npx l1dder update` на старом EN-проекте не спотыкался об отсутствующую строку).
