# FEAT-005: Команда `/l1-chore` для служебных правок вне роадмапа — Декомпозиция на шаги (`FEAT-005.MM`)

| Поле паспорта | Значение |
|---------------|----------|
| **ID фичи / спеки** | `FEAT-005` |
| **Родительская идея (`IDEA-NNN`)** | [`IDEA-004`](../../ideas.md#idea-004) |
| **Запись в Бэклоге** | [`docs/backlog.md#feat-005`](../../backlog.md#feat-005) |

## Спринт: `SPRINT-04` — Команда `/l1-chore` и журнал `CHORE-NNN`

**Цель спринта:** пользователь любого проекта на `L1DDER` может выполнять служебные правки вне роадмапа через `/l1-chore` с одной остановкой «ок» и записью `CHORE-NNN` в `docs/backlog.md`, без ослабления `Roadmap Gate` для продуктовых фич.

| Статус | ID шага спеки | ID задачи спринта (`SPRINT-NN`) | Тип | Название задачи | Ключевые артефакты |
|:------:|:-------------:|:-------------------------------:|:---:|-----------------|--------------------|
| [x] | `FEAT-005.01` | `TASK-04.01` | `feat` | Скилл `/l1-chore` на RU и EN, регистрация в `skills.json`, `src/agents.ts` и `src/installer.ts`, контрактные и CLI-тесты | `assets/i18n/{ru,en}/skills/l1-chore/SKILL.md`, `assets/i18n/{ru,en}/skills.json`, `src/agents.ts`, `src/installer.ts`, `tests/chore-skill.test.ts`, `tests/cli.test.ts` |
| [ ] | `FEAT-005.02` | `TASK-04.02` | `feat` | Раздел `CHORE-NNN` в шаблоне `backlog-template.md`, правила `00-methodology.mdc`, `20-workflow.mdc`, `40-skills-router.mdc`, `GLOSSARY.md` и ссылка в `30-tech-stack.mdc` | `assets/i18n/{ru,en}/templates/backlog/backlog-template.md`, `assets/i18n/{ru,en}/rules/*.mdc`, `assets/i18n/{ru,en}/GLOSSARY.md`, `l1dder/rules/30-tech-stack.mdc`, `AGENTS.md` |
| [ ] | `FEAT-005.03` | `TASK-04.03` | `docs` | Описание `/l1-chore` простым языком (для чего команда, примеры правок самого репозитория) и обновление счётчиков (`21 скилл`, `7 команд`) в `README.md`, `METHODOLOGY.md`, `user-guide/*`, `onboarding/continue-project.md`, `site/*` и `seo.mts` | `README.md`, `assets/i18n/{ru,en}/README.md`, `assets/i18n/{ru,en}/METHODOLOGY.md`, `assets/i18n/{ru,en}/user-guide/*`, `assets/i18n/{ru,en}/onboarding/continue-project.md`, `site/*`, `site/.vitepress/seo.mts` |
| [ ] | `FEAT-005.99` | `TASK-04.99` | `chore` | **Гигиена спринта и Doctor Checklist (E2E + UAT + Docs Sync)** *(Обязательная финальная задача)*: живой E2E-прогон `/l1-chore` субагентом в песочнице | `docs/`, тесты, `playground/sandboxes/` |
