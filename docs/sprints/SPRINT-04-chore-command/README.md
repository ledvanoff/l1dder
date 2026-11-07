# SPRINT-04: Команда `/l1-chore` и журнал `CHORE-NNN`

| Поле паспорта спринта | Значение |
|-----------------------|----------|
| **ID спринта** | `SPRINT-04` |
| **ID родительской фичи / спеки** | [`FEAT-005`](../../backlog.md#feat-005) ([`docs/specs/FEAT-005-chore-command/`](../../specs/FEAT-005-chore-command/)) |
| **ID родительской идеи** | [`IDEA-004`](../../ideas.md#idea-004) |
| **Позиция в Роадмапе** | [`docs/roadmap.md`](../../roadmap.md) |
| **Статус спринта** | `✅ реализована` |
| **Дата открытия / закрытия** | 2026-11-07 / 2026-11-07 |

---

## 1. Цель спринта

Пользователь любого проекта на `L1DDER` может выполнять служебные правки вне роадмапа через `/l1-chore` с одной остановкой «ок» и записью `CHORE-NNN` в `docs/backlog.md`, без ослабления `Roadmap Gate` для продуктовых фич (`FEAT-005` ← `IDEA-004`).

---

## 2. Критерии готовности спринта (Sprint DoD)

Спринт `SPRINT-04` может быть переведён в `✅ реализована` только после закрытия всех задач, включая финальную `TASK-04.99`:

| # | Критерий | Способ проверки |
|---|----------|-----------------|
| 1 | Скилл `/l1-chore` на RU и EN зарегистрирован в `skills.json` и CLI (21 скилл), раскладывается во все 7 агентов | `tests/chore-skill.test.ts` + `tests/cli.test.ts` |
| 2 | Раздел `CHORE-NNN` добавлен в шаблон `backlog-template.md`, правила `00`, `20`, `40` и `GLOSSARY.md` содержат `CHORE-NNN` и `/l1-chore` | `tests/chore-skill.test.ts` |
| 3 | Документация, гайды и сайт описывают `/l1-chore` простым языком на RU и EN, чисел скиллов и команд в тексте нет, сайт собирается и проходит гейт | `tests/chore-skill.test.ts` + `make ci` + `make site-gate` |
| 4 | У каждой новой версии в `assets/releases.json` есть инструкция агенту, `npx l1dder update` всегда печатает её блок 🤖, а сводка `AGENTS.md` / `CLAUDE.md` требует её выполнить | `tests/cli.test.ts` + `tests/sync-release-meta.test.ts` |
| 5 | **Doctor Checklist & E2E (`TASK-04.99`):** `make ci` + живой E2E-прогон `/l1-chore` субагентом в песочнице (отказ на продукте, автосоздание раздела 4 и запись `CHORE-001`) | `make ci` + E2E-проверка агентом |
| 6 | **Living Docs Sync (`TASK-04.99`):** обновлены `docs/concept/`, `docs/specs/FEAT-005-chore-command/`, `l1dder/rules/` | Проверка `git diff` по документации и правилам |
| 7 | **Human UAT (`TASK-04.99`):** ручное тестирование и просмотр лога пройдены и подтверждены человеком («ок») | Явный апрув человека в задаче `TASK-04.99` |

---

## 3. Таблица задач спринта (`TASK-04.MM` ↔ `FEAT-005.MM`)

> ⚠️ **Железное правило L1DDER:**
> 1. Имя папки каждой задачи в `tasks/` строго начинается с её ID: `tasks/TASK-04.01-<slug>/`.
> 2. Последней задачей каждого спринта строго является `TASK-04.99` (`tasks/TASK-04.99-doctor/`) по шаблону [`doctor-checklist-template.md`](../../../l1dder/templates/tasks/doctor-checklist-template.md).

| ID задачи спринта | ID шага спеки | Название задачи | Тип | Статус | Plan | Summary |
|:-----------------:|:-------------:|-----------------|:---:|--------|------|---------|
| `TASK-04.01` | `FEAT-005.01` | Скилл `/l1-chore` на RU и EN, регистрация в `skills.json`, `src/agents.ts` и `src/installer.ts`, контрактные и CLI-тесты | `feat` | ✅ реализована | [plan](./tasks/TASK-04.01-chore-skill/plan.md) | [summary](./tasks/TASK-04.01-chore-skill/summary.md) |
| `TASK-04.02` | `FEAT-005.02` | Раздел `CHORE-NNN` в шаблоне `backlog-template.md`, правила `00-methodology.mdc`, `20-workflow.mdc`, `40-skills-router.mdc`, `GLOSSARY.md` и ссылка в `30-tech-stack.mdc` | `feat` | ✅ реализована | [plan](./tasks/TASK-04.02-chore-log-and-rules/plan.md) | [summary](./tasks/TASK-04.02-chore-log-and-rules/summary.md) |
| `TASK-04.03` | `FEAT-005.03` | Описание `/l1-chore` простым языком (для чего команда, примеры правок самого репозитория) и удаление чисел скиллов и команд из текста в `README.md`, `METHODOLOGY.md`, `user-guide/*`, `onboarding/continue-project.md`, `site/*` и `seo.mts` | `docs` | ✅ реализована | [plan](./tasks/TASK-04.03-chore-docs/plan.md) | [summary](./tasks/TASK-04.03-chore-docs/summary.md) |
| `TASK-04.04` | `FEAT-005.04` | Обязательная инструкция агенту для каждой версии: поле `agent` в `assets/releases.json`, проверка в сборке, блок 🤖 после `npx l1dder update` и правило в сводке `AGENTS.md` / `CLAUDE.md` | `feat` | ✅ реализована | [plan](./tasks/TASK-04.04-agent-update-steps/plan.md) | [summary](./tasks/TASK-04.04-agent-update-steps/summary.md) |
| `TASK-04.99` | `FEAT-005.99` | **Гигиена спринта и Doctor Checklist (E2E + UAT + Docs Sync)**: живой E2E-прогон `/l1-chore` субагентом в песочнице | `chore` | ✅ реализована | [plan](./tasks/TASK-04.99-doctor/plan.md) | [summary](./tasks/TASK-04.99-doctor/summary.md) |

---

## 4. Итог спринта (заполняется после закрытия `TASK-04.99`)

- **Что поставлено по `FEAT-005` (`IDEA-004`):** скилл `/l1-chore` на RU и EN (простое объяснение назначения, защита границы «продукт vs сам проект», одна остановка «ок», `make ci`, автосоздание раздела 4 `CHORE-NNN` в старых `docs/backlog.md`); регистрация в `skills.json` и CLI (21 скилл); раздел 4 в `backlog-template.md`, правила `00/20/40` и `GLOSSARY.md`; удаление устаревающих чисел скиллов и команд из документации и сайта со страж-тестом; обязательное поле `agent` в `assets/releases.json` и вывод блока «🤖 Инструкция для ИИ-агента после обновления» при `npx l1dder update`; два живых E2E-прогона на быстрых моделях (`Qwen3.8 Flash` и `Kimi K2.7 Code`).
- **Обновления в долгосрочной доке (`concept` / `rules` / `specs`):** обновлены `docs/concept/{idea,vision,architecture,data-model}.md`, `l1dder/rules/30-tech-stack.mdc`, `l1dder/rules/40-skills-router.mdc`, `AGENTS.md`, `l1dder/GLOSSARY.md`.
- **Новые идеи / техдолг, вынесенные в `docs/ideas.md` или `docs/backlog.md`:** падение `make dev` на зависимости `fastdom` плагина `mermaid` (сборка `docs:build` и `docs:preview` работают исправно; кандидат для починки через `/l1-chore`); при выпуске следующего релиза вписать подготовленный шаг `agent` из `docs/specs/FEAT-005-chore-command/design.md` в `assets/releases.json`.
