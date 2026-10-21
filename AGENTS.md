# L1DDER Framework Repository — Instructions for AI Agents

Этот репозиторий содержит исходный код CLI-пакета **`l1dder`**, двуязычные (`ru`/`en`) ассеты методологии в `assets/i18n/{ru,en}/`, реестр релизов `assets/releases.json` и сайт документации `site/`.

## Железные правила при разработке самого фреймворка `L1DDER`

1. **Синхронное редактирование `ru` и `en` (`Single Change = Full Sync`):**
   - Любое пользовательское изменение в правилах, скиллах, шаблонах или путеводителе вносится синхронно в `assets/i18n/ru/` и `assets/i18n/en/`.
   - После изменений обязательно запускается `make ci` (или `npm run build`), который автоматически:
     - синхронизирует `package.json` и генерирует `CHANGELOG.md` из `assets/releases.json` (`scripts/sync-release-meta.mjs`);
     - собирает `dist/cli.js`;
     - синхронизирует корневую папку `./l1dder/` и папки агентов (`scripts/sync-root-l1dder.mjs`);
     - синхронизирует страницы сайта `./site/` (`scripts/sync-site-docs.mjs`).

2. **Когда менять версию, а когда НЕ менять (`dev` vs Release):**
   - **НЕ меняй версию (`assets/releases.json`)** при внутренних инфраструктурных работах в репозитории (`scripts/`, `Makefile`, `tests/`, `playground/`, внутренняя догфудинг-документация `docs/`). Такие изменения просто коммитятся и пушатся в рабочую ветку **`dev`**.
   - **Меняй версию ТОЛЬКО перед выкаткой релиза в npm**, когда накопились пользовательские изменения в CLI (`src/`) или поставляемых ассетах (`assets/i18n/{ru,en}/`) и пользователь явно попросил выпустить релиз.

3. **Как выпускать новый релиз (`assets/releases.json` — ЕДИНСТВЕННЫЙ источник истины):**
   - Мы **не используем `@changesets/cli`** и **не редактируем `package.json` (поле `version`) или `CHANGELOG.md` вручную**.
   - Чтобы выпустить новую версию `X.Y.Z`:
     1. Добавь новый объект релиза **первым элементом** в массив `releases` файла **`assets/releases.json`** (заполнив `version`, `date`, `summary` (`ru`/`en`), `changes` (`ru`/`en`) и `breaking` (`ru`/`en`) — именно поле `breaking` CLI проверяет при `npx l1dder@latest update`, запрашивая подтверждение у пользователя).
     2. Запусти одну команду:
        ```bash
        make release
        ```
        Скрипт `scripts/release.mjs` сам прогонит `make ci` (автоматически обновив `package.json` и `CHANGELOG.md`), закоммитит метаданные в `dev`, сольёт `dev → main`, создаст тег `vX.Y.Z`, запушит `main`, `dev` и теги в GitHub и вернёт ветку обратно на `dev`. GitHub Actions автоматически опубликует пакет в npm (OIDC) и обновит сайт на GitHub Pages.

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
