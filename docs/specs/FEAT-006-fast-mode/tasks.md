# FEAT-006: Режим `/l1-fast` и отклонение текущего спринта — Декомпозиция на шаги (`FEAT-006.MM`)

| Поле паспорта | Значение |
|---------------|----------|
| **ID фичи / спеки** | `FEAT-006` |
| **Родительская идея (`IDEA-NNN`)** | [`IDEA-005`](../../ideas.md#idea-005) |
| **Запись в Бэклоге** | [`docs/backlog.md#feat-006`](../../backlog.md#feat-006) |

> **ПРАВИЛО НУМЕРАЦИИ ШАГОВ:**
> 1. На этапе `/l1-feature` каждый шаг получает стабильный ID внутри фичи: `FEAT-006.01`, `FEAT-006.02`, ...
> 2. **Последним шагом каждого спринта обязательно идёт гигиеническая задача с кодом `.99` (`FEAT-006.99`).**
> 3. На этапе `/l1-planning`, когда фича ставится в спринт `SPRINT-NN`, каждому шагу `FEAT-006.MM` ставится в соответствие задача спринта `TASK-NN.MM`.

## Спринт: `SPRINT-05` — Режим `/l1-fast` и отклонение спринта

**Цель спринта:** пользователь любого проекта на `L1DDER` делает небольшую фичу через `/l1-fast`: сначала код, потом честные реестры, с двумя остановками и без ослабления проверок; при активном спринте получает строгий отказ и может отклонить текущий спринт с откатом через `/l1-planning`.

| Статус | ID шага спеки | ID задачи спринта (`SPRINT-NN`) | Тип | Название задачи | Ключевые артефакты |
|:------:|:-------------:|:-------------------------------:|:---:|-----------------|--------------------|
| [x] | `FEAT-006.01` | `TASK-05.01` | `feat` | Скилл `/l1-fast` на RU и EN, регистрация в `skills.json`, `src/agents.ts` и `src/installer.ts`, тесты контракта и CLI (`Seam 1`, `Seam 2`) | `assets/i18n/{ru,en}/skills/l1-fast/SKILL.md`, `assets/i18n/{ru,en}/skills.json`, `src/agents.ts`, `src/installer.ts`, `tests/fast-skill.test.ts`, `tests/cli.test.ts` |
| [x] | `FEAT-006.02` | `TASK-05.02` | `feat` | Отклонение текущего спринта с откатом в `/l1-planning`, статус `❌ отклонена` для `SPRINT-NN` и `TASK-NN.MM` в правилах и шаблонах (`Seam 4`) | `assets/i18n/{ru,en}/skills/l1-planning/SKILL.md`, `assets/i18n/{ru,en}/rules/20-workflow.mdc`, `assets/i18n/{ru,en}/templates/{roadmap,backlog,sprints}/*`, `tests/planning-reject.test.ts` |
| [x] | `FEAT-006.03` | `TASK-05.03` | `feat` | Исключение `/l1-fast` в правилах `00/20/40`, словаре, шаблоне роадмапа, скиллах `l1-task` и `l1-hotfix`, сводке `AGENTS.md` / `CLAUDE.md` (`Seam 3`); сверка шагов `agent` для релиза; **обязательно:** синхронизация EN `/l1-planning` с RU (шаги 3–5 и Exit Gate) и страж RU/EN на весь скилл в `design.md` | `assets/i18n/{ru,en}/rules/{00,20,40}-*.mdc`, `assets/i18n/{ru,en}/GLOSSARY.md`, `assets/i18n/{ru,en}/templates/roadmap/roadmap-template.md`, `assets/i18n/{ru,en}/skills/{l1-task,l1-hotfix}/SKILL.md`, `src/agents.ts`, `tests/fast-skill.test.ts`, `assets/i18n/en/skills/l1-planning/SKILL.md`, `tests/planning-reject.test.ts` |
| [ ] | `FEAT-006.04` | `TASK-05.04` | `docs` | `/l1-fast` и отклонение спринта простым языком в `README`, `METHODOLOGY.md`, `user-guide/*` и на сайте | `README.md`, `assets/i18n/{ru,en}/README.md`, `assets/i18n/{ru,en}/METHODOLOGY.md`, `assets/i18n/{ru,en}/user-guide/*`, `site/*`, `site/.vitepress/seo.mts` (при необходимости) |
| [ ] | `FEAT-006.99` | `TASK-05.99` | `chore` | **Гигиена спринта и Doctor Checklist (E2E + UAT + Docs Sync)** *(Обязательная финальная задача)*: живой E2E-прогон `/l1-fast` субагентом в песочнице на двух быстрых моделях, включая отказ при активном спринте и отклонение спринта с откатом | `docs/`, тесты, `playground/sandboxes/` |
