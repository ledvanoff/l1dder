# Бэклог и Таск-трекер — L1DDER

> **Методология:** L1DDER (100% Dogfooding)
> **Скиллы управления:** пополняется через `/l1-feature`, привязывается к спринтам через `/l1-planning`, статусы задач обновляются через `/l1-task` и `/l1-hotfix`.
> **Источник истины по очерёдности:** [`docs/roadmap.md`](./roadmap.md)
> **Последнее обновление:** 2026-11-07

---

## 1. Реестр Фич (Feature Backlog)

| ID фичи / спеки | Название фичи | ID идеи (`IDEA-NNN`) | Приоритет | Статус | Папка спеки | Спринты (`SPRINT-NN`) |
|-----------------|---------------|:--------------------:|:---------:|--------|-------------|-----------------------|
| [`FEAT-001`](#feat-001) | Базовое ядро L1DDER v1.0.0 (CLI, 20 скиллов, skills.json, RU/EN, VitePress Docs) | [`IDEA-001`](./ideas.md#idea-001) | P0 | ✅ реализована | — | Завершено |
| [`FEAT-002`](#feat-002) | Предрелизный гигиенический спринт, полигон на 2 моделях (Composer и Grok), аудит ponytail и релиз v1.0.0 | [`IDEA-002`](./ideas.md#idea-002) | P0 | ✅ реализована | [`FEAT-002`](./specs/FEAT-002-release-hygiene-v1/) | [`SPRINT-01`](./sprints/SPRINT-01-release-hygiene-v1/README.md) |
| [`FEAT-003`](#feat-003) | SEO-база сайта и витрин проекта | [`IDEA-003`](./ideas.md#idea-003) | P1 | ✅ реализована | [`FEAT-003`](./specs/FEAT-003-seo-foundation/) | [`SPRINT-02`](./sprints/SPRINT-02-seo-foundation/README.md) |
| [`FEAT-004`](#feat-004) | Пошаговый онбординг и свежие встроенные скиллы | [`IDEA-006`](./ideas.md#idea-006) | P1 | ✅ реализована | [`FEAT-004`](./specs/FEAT-004-step-by-step-onboarding/) | [`SPRINT-03`](./sprints/SPRINT-03-step-by-step-onboarding/README.md) |
| [`FEAT-005`](#feat-005) | Команда `/l1-chore` для служебных правок вне роадмапа | [`IDEA-004`](./ideas.md#idea-004) | P2 | 🚧 реализация | [`FEAT-005`](./specs/FEAT-005-chore-command/) | [`SPRINT-04`](./sprints/SPRINT-04-chore-command/README.md) |

---

## 2. Декомпозиция Фич, Спринты и Задачи (Task Tracker)

### FEAT-001: Базовое ядро L1DDER v1.0.0 {#feat-001}

| Поле паспорта | Значение |
|---------------|----------|
| **ID фичи / спеки** | `FEAT-001` |
| **Родительская идея** | [`IDEA-001`](./ideas.md#idea-001) |
| **Приоритет** | `P0` |
| **Статус фичи** | `✅ реализована` |

---

### FEAT-002: Предрелизный гигиенический спринт, полигон на 2 моделях (Composer и Grok), аудит ponytail и релиз v1.0.0 {#feat-002}

| Поле паспорта | Значение |
|---------------|----------|
| **ID фичи / спеки** | `FEAT-002` |
| **Родительская идея** | [`IDEA-002`](./ideas.md#idea-002) |
| **Папка спецификации** | [`docs/specs/FEAT-002-release-hygiene-v1/`](./specs/FEAT-002-release-hygiene-v1/) |
| **Приоритет** | `P0` |
| **Статус фичи** | `✅ реализована` |
| **Назначенные спринты** | `SPRINT-01` |

#### Спринт: `SPRINT-01` — Гигиенический спринт и выкатка `v1.0.0` (`✅ реализована`)
- **ID спринта:** `SPRINT-01`
- **Родительские ID:** `FEAT-002` → `IDEA-002`
- **Цель спринта:** Подготовить `playground/`, автоматически протестировать `L1DDER` на двух моделях (`Composer` и `Grok`), провести ревизию через `ponytail` и все скиллы, и подготовить релиз `v1.0.0`.
- **Документ спринта:** [`docs/sprints/SPRINT-01-release-hygiene-v1/README.md`](./sprints/SPRINT-01-release-hygiene-v1/README.md)

| ID шага спеки | ID задачи спринта | Название задачи | Тип | Статус | Plan | Summary |
|:-------------:|:-----------------:|-----------------|:---:|--------|------|---------|
| `FEAT-002.01` | `TASK-01.01` | Подготовка `playground/` и полностью автоматический тест методологии на 2 моделях (`Composer` и `Grok`) | `feat` | ✅ реализована | [plan](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.01-playground-dual-model-test/plan.md) | [summary](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.01-playground-dual-model-test/summary.md) |
| `FEAT-002.02` | `TASK-01.02` | Прогонка кодовой базы и всех 20 скиллов через `ponytail` (`ponytail-audit`, `ponytail-review`, `ponytail-debt`, `code-review`) и исправление косяков | `refactor` | ✅ реализована | [plan](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.02-ponytail-skills-audit/plan.md) | [summary](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.02-ponytail-skills-audit/summary.md) |
| `FEAT-002.03` | `TASK-01.03` | Подготовка и выкатка релиза `l1dder@1.0.0` (`npm pack`, `CHANGELOG.md`, `releases.json`, git и деплой) | `chore` | ✅ реализована | [plan](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.03-release-v1-0-0/plan.md) | [summary](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.03-release-v1-0-0/summary.md) |
| `FEAT-002.99` | `TASK-01.99` | **Гигиена спринта и Doctor Checklist (E2E + UAT + Docs Sync)** *(Обязательная)* | `chore` | ✅ реализована | [plan](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.99-doctor/plan.md) | [summary](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.99-doctor/summary.md) |

---

### FEAT-003: SEO-база сайта и витрин проекта {#feat-003}

| Поле паспорта | Значение |
|---------------|----------|
| **ID фичи / спеки** | `FEAT-003` |
| **Родительская идея** | [`IDEA-003`](./ideas.md#idea-003) |
| **Папка спецификации** | [`docs/specs/FEAT-003-seo-foundation/`](./specs/FEAT-003-seo-foundation/) |
| **Приоритет** | `P1` |
| **Статус фичи** | `✅ реализована` |
| **Назначенные спринты** | `SPRINT-02` |

#### Спринт: `SPRINT-02` — SEO-база сайта и витрин без поломок сайта (`✅ реализована`)
- **ID спринта:** `SPRINT-02`
- **Родительские ID:** `FEAT-003` → `IDEA-003`
- **Цель спринта:** Дать поисковикам и ИИ-ассистентам корректные данные о L1DDER на сайте, GitHub и npm и строго доказать перед релизом, что сайт работает не хуже, чем до спринта.
- **Документ спринта:** [`docs/sprints/SPRINT-02-seo-foundation/README.md`](./sprints/SPRINT-02-seo-foundation/README.md)

| ID шага спеки | ID задачи спринта | Название задачи | Тип | Статус | Plan | Summary |
|:-------------:|:-----------------:|-----------------|:---:|--------|------|---------|
| `FEAT-003.01` | `TASK-02.01` | Снимок сайта до правок и автоматическая проверка сборки в `make test-e2e` | `chore` | ✅ реализована | [plan](./sprints/SPRINT-02-seo-foundation/tasks/TASK-02.01-site-baseline-check/plan.md) | [summary](./sprints/SPRINT-02-seo-foundation/tasks/TASK-02.01-site-baseline-check/summary.md) |
| `FEAT-003.02` | `TASK-02.02` | Модуль SEO, `sitemap.xml`, тексты и языковые связи для всех 18 страниц | `feat` | ✅ реализована | [plan](./sprints/SPRINT-02-seo-foundation/tasks/TASK-02.02-seo-module/plan.md) | [summary](./sprints/SPRINT-02-seo-foundation/tasks/TASK-02.02-seo-module/summary.md) |
| `FEAT-003.03` | `TASK-02.03` | Карточка превью, Open Graph и Twitter | `feat` | ✅ реализована | [plan](./sprints/SPRINT-02-seo-foundation/tasks/TASK-02.03-preview-card/plan.md) | [summary](./sprints/SPRINT-02-seo-foundation/tasks/TASK-02.03-preview-card/summary.md) |
| `FEAT-003.04` | `TASK-02.04` | `llms.txt` из общей таблицы страниц | `feat` | ✅ реализована | [plan](./sprints/SPRINT-02-seo-foundation/tasks/TASK-02.04-llms-txt/plan.md) | [summary](./sprints/SPRINT-02-seo-foundation/tasks/TASK-02.04-llms-txt/summary.md) |
| `FEAT-003.05` | `TASK-02.05` | Витрины: описание и темы GitHub, начало README, `description` и `keywords` в npm | `chore` | ✅ реализована | [plan](./sprints/SPRINT-02-seo-foundation/tasks/TASK-02.05-showcases/plan.md) | [summary](./sprints/SPRINT-02-seo-foundation/tasks/TASK-02.05-showcases/summary.md) |
| `FEAT-003.99` | `TASK-02.99` | **Гигиена спринта и Doctor Checklist (E2E + UAT + Docs Sync)** *(Обязательная)*: браузерный гейт сайта и только после него релиз | `chore` | ✅ реализована | [plan](./sprints/SPRINT-02-seo-foundation/tasks/TASK-02.99-doctor/plan.md) | [summary](./sprints/SPRINT-02-seo-foundation/tasks/TASK-02.99-doctor/summary.md) |

#### Что осталось после релиза `v1.0.3`

Спринт закрыт без релиза, затем отдельным решением пользователя выпущен `v1.0.3`: сайт, README и npm обновлены, `main` совпадает с тегом, браузерный гейт на живом сайте пройден.

- Пользователю: отправить `https://ledvanoff.github.io/l1dder/sitemap.xml` в Google Search Console и Яндекс Вебмастер.
- Проверить настоящее превью ссылки.

---

### FEAT-004: Пошаговый онбординг и свежие встроенные скиллы {#feat-004}

| Поле паспорта | Значение |
|---------------|----------|
| **ID фичи / спеки** | `FEAT-004` |
| **Родительская идея** | [`IDEA-006`](./ideas.md#idea-006) |
| **Папка спецификации** | [`docs/specs/FEAT-004-step-by-step-onboarding/`](./specs/FEAT-004-step-by-step-onboarding/) |
| **Приоритет** | `P1` |
| **Статус фичи** | `✅ реализована` |
| **Назначенные спринты** | `SPRINT-03` |

#### Спринт: `SPRINT-03` — Пошаговый онбординг и свежие встроенные скиллы (`✅ реализована`)
- **ID спринта:** `SPRINT-03`
- **Родительские ID:** `FEAT-004` → `IDEA-006`
- **Документ спринта:** [`docs/sprints/SPRINT-03-step-by-step-onboarding/README.md`](./sprints/SPRINT-03-step-by-step-onboarding/README.md)
- **Цель спринта:** новый пользователь проходит онбординг по одному файлу концепта, без портянки текста, а встроенные скиллы актуальны и не содержат битых ссылок.

| ID шага спеки | ID задачи спринта | Название задачи | Тип | Статус | Plan | Summary |
|:-------------:|:-----------------:|-----------------|:---:|--------|------|---------|
| `FEAT-004.01` | `TASK-03.01` | Сверка встроенных скиллов с исходниками: слить обновления с сохранением правок L1DDER, добавить недостающие файлы, тест на целостность ссылок | `chore` | ✅ реализована | [plan](./sprints/SPRINT-03-step-by-step-onboarding/tasks/TASK-03.01-bundled-skills-sync/plan.md) | [summary](./sprints/SPRINT-03-step-by-step-onboarding/tasks/TASK-03.01-bundled-skills-sync/summary.md) |
| `FEAT-004.02` | `TASK-03.02` | Новый скилл `/l1-onboard` на RU и EN со скиллами для каждого этапа, сначала тесты контракта текста | `feat` | ✅ реализована | [plan](./sprints/SPRINT-03-step-by-step-onboarding/tasks/TASK-03.02-onboard-skill/plan.md) | [summary](./sprints/SPRINT-03-step-by-step-onboarding/tasks/TASK-03.02-onboard-skill/summary.md) |
| `FEAT-004.03` | `TASK-03.03` | Сокращённый шаблон `vision.md` и согласование остальных шаблонов концепта | `feat` | ✅ реализована | [plan](./sprints/SPRINT-03-step-by-step-onboarding/tasks/TASK-03.03-concept-templates/plan.md) | [summary](./sprints/SPRINT-03-step-by-step-onboarding/tasks/TASK-03.03-concept-templates/summary.md) |
| `FEAT-004.04` | `TASK-03.04` | Цепочка 0 в `20-workflow.mdc`, гайды `onboarding/`, путеводитель, `METHODOLOGY.md`, словарь и описание скилла | `docs` | ✅ реализована | [plan](./sprints/SPRINT-03-step-by-step-onboarding/tasks/TASK-03.04-docs-and-rules/plan.md) | [summary](./sprints/SPRINT-03-step-by-step-onboarding/tasks/TASK-03.04-docs-and-rules/summary.md) |
| `FEAT-004.99` | `TASK-03.99` | **Гигиена спринта и Doctor Checklist (E2E + UAT + Docs Sync)** *(Обязательная)*: два прогона онбординга субагентом | `chore` | ✅ реализована | [plan](./sprints/SPRINT-03-step-by-step-onboarding/tasks/TASK-03.99-doctor/plan.md) | [summary](./sprints/SPRINT-03-step-by-step-onboarding/tasks/TASK-03.99-doctor/summary.md) |

---

### FEAT-005: Команда `/l1-chore` для служебных правок вне роадмапа {#feat-005}

| Поле паспорта | Значение |
|---------------|----------|
| **ID фичи / спеки** | `FEAT-005` |
| **Родительская идея** | [`IDEA-004`](./ideas.md#idea-004) |
| **Папка спецификации** | [`docs/specs/FEAT-005-chore-command/`](./specs/FEAT-005-chore-command/) |
| **Приоритет** | `P2` |
| **Статус фичи** | `🚧 реализация` |
| **Назначенные спринты** | `SPRINT-04` |

#### Спринт: `SPRINT-04` — Команда `/l1-chore` и журнал `CHORE-NNN` (`🚧 реализация`)
- **ID спринта:** `SPRINT-04`
- **Родительские ID:** `FEAT-005` → `IDEA-004`
- **Документ спринта:** [`docs/sprints/SPRINT-04-chore-command/README.md`](./sprints/SPRINT-04-chore-command/README.md)
- **Цель спринта:** пользователь любого проекта на `L1DDER` может выполнять служебные правки вне роадмапа через `/l1-chore` с одной остановкой «ок» и записью `CHORE-NNN` в `docs/backlog.md`, без ослабления `Roadmap Gate` для продуктовых фич.

| ID шага спеки | ID задачи спринта | Название задачи | Тип | Статус | Plan | Summary |
|:-------------:|:-----------------:|-----------------|:---:|--------|------|---------|
| `FEAT-005.01` | `TASK-04.01` | Скилл `/l1-chore` на RU и EN, регистрация в `skills.json`, `src/agents.ts` и `src/installer.ts`, контрактные и CLI-тесты | `feat` | ✅ реализована | [plan](./sprints/SPRINT-04-chore-command/tasks/TASK-04.01-chore-skill/plan.md) | [summary](./sprints/SPRINT-04-chore-command/tasks/TASK-04.01-chore-skill/summary.md) |
| `FEAT-005.02` | `TASK-04.02` | Раздел `CHORE-NNN` в шаблоне `backlog-template.md`, правила `00-methodology.mdc`, `20-workflow.mdc`, `40-skills-router.mdc`, `GLOSSARY.md` и ссылка в `30-tech-stack.mdc` | `feat` | 📋 запланирована | — | — |
| `FEAT-005.03` | `TASK-04.03` | Описание `/l1-chore` простым языком (для чего команда, примеры правок самого репозитория) и обновление счётчиков (`21 скилл`, `7 команд`) в `README.md`, `METHODOLOGY.md`, `user-guide/*`, `onboarding/continue-project.md`, `site/*` и `seo.mts` | `docs` | 📋 запланирована | — | — |
| `FEAT-005.99` | `TASK-04.99` | **Гигиена спринта и Doctor Checklist (E2E + UAT + Docs Sync)** *(Обязательная)*: живой E2E-прогон `/l1-chore` субагентом в песочнице | `chore` | 📋 запланирована | — | — |

---

## 3. Журнал Хотфиксов (`HOTFIX-NNN`)

| ID хотфикса | Связанный ID (`FEAT-NNN` / `TASK-NN.MM` или `—`) | Дата | Проблема / Симптом | Что исправлено | Статус | Коммит / PR |
|-------------|:------------------------------------------------:|------|--------------------|----------------|--------|:-----------:|
| `HOTFIX-001` | `FEAT-001` | 2026-10-21 | Лишние упоминания `state.yml` и метафоры «матрёшка» на сайте/в гайде; отсутствие ссылок на репозитории `ponytail` и `mattpocock/skills` | Очищены формулировки на главной и в гайдах («Сквозная связь всех сущностей»), добавлены прямые ссылки на `DietrichGebert/ponytail` и `mattpocock/skills` | ✅ реализована | `fix(docs): refine landing copy and add upstream skill links` |
| `HOTFIX-002` | `FEAT-001` | 2026-10-21 | Дублирование слэш-команд в меню `/` при совместной установке `cursor,claude,codex,opencode` и сохранение старых команд `l1dder-*` | Введена единая каноническая папка скиллов (`resolveCanonicalSkillsDir`), убрана генерация дублирующих `.claude/commands` и `.opencode/commands`, добавлена автоочистка старых/дублирующих папок при `sync`/`update` | ✅ реализована | `fix(agents): deduplicate skill directories and prune legacy commands` |
| `HOTFIX-003` | `FEAT-001` | 2026-11-01 | Слэш-команды `/l1-*` не видны в Claude Code при совместной установке с Codex или OpenCode: скиллы лежали только в `.agents/skills`, которую Claude Code не читает | `resolveSkillDirs` раскладывает копии из `l1dder/skills/` во все папки, которые читают выбранные агенты (`.agents/skills` и `.claude/skills`); `cursor` + `claude` тоже получает `.agents/skills`, потому что `.claude/skills` Cursor читает только с включённым Third-Party Imports; `.cursor/skills` остаётся, только если папка скиллов нужна одному Cursor; добавлен прогон тестов на `windows-latest` | ✅ реализована | `fix(agents): install skills into every folder selected agents read` |
| `HOTFIX-004` | `FEAT-001` | 2026-11-01 | В GitHub Release попадал весь `CHANGELOG.md`: вся история версий, в `v1.0.1` только на русском; на сайте не было инструкции на случай, когда слэш-команды не видны | `scripts/render-release-notes.mjs` собирает заметки одной версии из `assets/releases.json` (EN, затем RU) и падает на неполной записи; `publish.yml` запускает его до `npm publish`; на сайт добавлена страница `troubleshooting` (RU + EN) со ссылками из шпаргалки и `agents-cli` | ✅ реализована | `fix(release): render bilingual notes for one version and add slash command troubleshooting` |
| `HOTFIX-005` | `FEAT-002` | 2026-11-01 | `make release` падал с `TypeError` на первом `git add`: при `stdio: "inherit"` вызов `execFileSync` возвращает `null`, а хелпер вызывал `.trim()` | В `scripts/release.mjs` `.trim()` заменён на `?.trim()`; добавлен тест полного прогона скрипта на временном локальном remote | ✅ реализована | `fix(release): keep make release from crashing on inherited git output` |

---

## 4. Журнал служебных правок (`CHORE-NNN`)

Внутренняя кухня репозитория, релиз не нужен. Порядок действий: раздел 6 файла `l1dder/rules/30-tech-stack.mdc`.

| ID правки | Дата | Что и зачем | Сообщение коммита |
|:---------:|------|-------------|:------:|
| `CHORE-001` | 2026-11-04 | Деплой сайта с выбором ветки без релиза: `main` меняется только через `make release`; деплой останавливается на невыпущенных продуктовых правках и на сайте хуже снимка; гейт сайта добавлен в CI | `feat(site): deploy the docs site from a chosen ref without a release`, `ci(site): run the site gate in CI and refine the site deploy rule` |
| `CHORE-002` | 2026-11-04 | Защита от случайного релиза перенесена в репозиторий: хук `scripts/hooks/pre-push` ставится при `npm install`, чужие хуки и настройки git не меняются, обновление через `make hooks-update` | `chore(hooks): install the release guard from the repo on npm install` |
| `CHORE-003` | 2026-11-04 | `package-lock.json` держит версию релиза: раньше оставался на `1.0.0` и менялся при `npm install` в каждом новом клоне | `fix(release): keep package-lock.json on the released version` |
| `CHORE-004` | 2026-11-04 | Порядок служебных правок и этот журнал | `chore(rules): add a chore flow and a CHORE-NNN journal` |
| `CHORE-005` | 2026-11-07 | Добавлен `opencode` в список агентов догфудинг-синхронизации (`scripts/sync-root-l1dder.mjs`, `l1dder/config.json`) и `.claude/launch.json` в `.gitignore` | `chore(repo): add opencode to root sync agents and ignore .claude/launch.json` |
