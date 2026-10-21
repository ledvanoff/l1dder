<!-- l1dder:begin -->
# Методология проекта: L1DDER (`l1dder/`)

Этот проект работает по Spec-Driven & Roadmap-Gated методологии **L1DDER**. Все правила, шаблоны, манифест скиллов (`l1dder/skills.json`) и скиллы находятся в папке `l1dder/`.

## Железные правила для любого ИИ-агента (Cursor, Claude Code, Codex и др.)
1. **Roadmap Gate:** Запрещено брать в работу (`/l1-task`) фичу или задачу, которая не стоит на строке `1 (CURRENT)` в `docs/roadmap.md` (единственное исключение — `/l1-hotfix`).
2. **Правило двух СТОПов:** На каждой задаче обязательно останавливайся дважды и жди явного слова **«ок»** от пользователя: после создания `plan.md` (`⛔ СТОП №1`) и после самопроверки DoD (`⛔ СТОП №2`).
3. **Сквозная цепочка ID (`ID Passport`):** Каждый документ хранит все родительские ID: `IDEA-NNN` (`docs/ideas.md`) → `FEAT-NNN` (`docs/backlog.md` + `docs/specs/FEAT-NNN-<slug>/`) → `SPRINT-NN` (`docs/roadmap.md` + `docs/sprints/SPRINT-NN-<slug>/`) → `TASK-NN.MM` (и обязательный финал спринта `TASK-NN.99` Doctor Checklist).

## Управляющие слэш-команды (при вызове `/l1-*` или `$l1-*` читай соответствующий `SKILL.md`)
- `/l1-onboard` (`$l1-onboard`) → `l1dder/skills/l1-onboard/SKILL.md` (старт проекта, настройка `30-tech-stack.mdc` и `l1dder/skills.json`)
- `/l1-idea` (`$l1-idea`) → `l1dder/skills/l1-idea/SKILL.md` (брейншторм идеи и запись `IDEA-NNN` в `docs/ideas.md`)
- `/l1-feature` (`$l1-feature`) → `l1dder/skills/l1-feature/SKILL.md` (спека `docs/specs/FEAT-NNN-<slug>/` и нарезка в `docs/backlog.md`)
- `/l1-planning` (`$l1-planning`) → `l1dder/skills/l1-planning/SKILL.md` (планирование `docs/roadmap.md` и создание `SPRINT-NN`)
- `/l1-task` (`$l1-task`) → `l1dder/skills/l1-task/SKILL.md` (выполнение очередной задачи `TASK-NN.MM` и финального `TASK-NN.99` Doctor Checklist)
- `/l1-hotfix` (`$l1-hotfix`) → `l1dder/skills/l1-hotfix/SKILL.md` (срочный багфикс `RED → GREEN` и запись `HOTFIX-NNN`)
- `/l1-evo` (`$l1-evo`) → `l1dder/skills/l1-evo/SKILL.md` (эволюция методологии и обновление `HANDOFF.md`)

## Обновление фреймворка и скиллов по просьбе пользователя
- Если пользователь просит **«обнови l1dder»** (весь фреймворк): запусти `npx l1dder@latest update`. Если CLI остановится из-за `BREAKING CHANGES`, покажи список ломающих изменений пользователю, дождись его «да» / «ок» и только после этого запусти `npx l1dder@latest update --yes`.
- Если пользователь просит **«обнови только скиллы l1dder»**: запусти `npx l1dder@latest update --skills`.
- Если пользователь просит добавить сторонний скилл: запусти `npx l1dder skills add <owner/repo> --skill <name>`.

## Обязательные правила и манифест скиллов
- `l1dder/skills.json` — манифест скиллов (`l1dder`, `core`: `ponytail` + `mattpocock/skills`, и `stack`)
- `l1dder/rules/00-methodology.mdc` — стандарт сквозных ID и структура `docs/`
- `l1dder/rules/10-conventions.mdc` — дисциплина кода (`ponytail`, `codebase-design`, `tdd`, `diagnosing-bugs`)
- `l1dder/rules/20-workflow.mdc` — пошаговые алгоритмы цепочек и статусы
- `l1dder/rules/30-tech-stack.mdc` — технологический стек проекта и команды `Makefile`
- `l1dder/rules/40-skills-router.mdc` — маршрутизатор скиллов
<!-- l1dder:end -->
