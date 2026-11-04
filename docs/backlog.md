# Бэклог и Таск-трекер — L1DDER

> **Методология:** L1DDER (100% Dogfooding)
> **Скиллы управления:** пополняется через `/l1-feature`, привязывается к спринтам через `/l1-planning`, статусы задач обновляются через `/l1-task` и `/l1-hotfix`.
> **Источник истины по очерёдности:** [`docs/roadmap.md`](./roadmap.md)
> **Последнее обновление:** 2026-11-04

---

## 1. Реестр Фич (Feature Backlog)

| ID фичи / спеки | Название фичи | ID идеи (`IDEA-NNN`) | Приоритет | Статус | Папка спеки | Спринты (`SPRINT-NN`) |
|-----------------|---------------|:--------------------:|:---------:|--------|-------------|-----------------------|
| [`FEAT-001`](#feat-001) | Базовое ядро L1DDER v1.0.0 (CLI, 20 скиллов, skills.json, RU/EN, VitePress Docs) | [`IDEA-001`](./ideas.md#idea-001) | P0 | ✅ реализована | — | Завершено |
| [`FEAT-002`](#feat-002) | Предрелизный гигиенический спринт, полигон на 2 моделях (Composer и Grok), аудит ponytail и релиз v1.0.0 | [`IDEA-002`](./ideas.md#idea-002) | P0 | ✅ реализована | [`FEAT-002`](./specs/FEAT-002-release-hygiene-v1/) | [`SPRINT-01`](./sprints/SPRINT-01-release-hygiene-v1/README.md) |
| [`FEAT-003`](#feat-003) | SEO-база сайта и витрин проекта | [`IDEA-003`](./ideas.md#idea-003) | P1 | ✅ реализована | [`FEAT-003`](./specs/FEAT-003-seo-foundation/) | [`SPRINT-02`](./sprints/SPRINT-02-seo-foundation/README.md) |

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

## 3. Журнал Хотфиксов (`HOTFIX-NNN`)

| ID хотфикса | Связанный ID (`FEAT-NNN` / `TASK-NN.MM` или `—`) | Дата | Проблема / Симптом | Что исправлено | Статус | Коммит / PR |
|-------------|:------------------------------------------------:|------|--------------------|----------------|--------|:-----------:|
| `HOTFIX-001` | `FEAT-001` | 2026-10-21 | Лишние упоминания `state.yml` и метафоры «матрёшка» на сайте/в гайде; отсутствие ссылок на репозитории `ponytail` и `mattpocock/skills` | Очищены формулировки на главной и в гайдах («Сквозная связь всех сущностей»), добавлены прямые ссылки на `DietrichGebert/ponytail` и `mattpocock/skills` | ✅ реализована | `fix(docs): refine landing copy and add upstream skill links` |
| `HOTFIX-002` | `FEAT-001` | 2026-10-21 | Дублирование слэш-команд в меню `/` при совместной установке `cursor,claude,codex,opencode` и сохранение старых команд `l1dder-*` | Введена единая каноническая папка скиллов (`resolveCanonicalSkillsDir`), убрана генерация дублирующих `.claude/commands` и `.opencode/commands`, добавлена автоочистка старых/дублирующих папок при `sync`/`update` | ✅ реализована | `fix(agents): deduplicate skill directories and prune legacy commands` |
| `HOTFIX-003` | `FEAT-001` | 2026-11-01 | Слэш-команды `/l1-*` не видны в Claude Code при совместной установке с Codex или OpenCode: скиллы лежали только в `.agents/skills`, которую Claude Code не читает | `resolveSkillDirs` раскладывает копии из `l1dder/skills/` во все папки, которые читают выбранные агенты (`.agents/skills` и `.claude/skills`); `cursor` + `claude` тоже получает `.agents/skills`, потому что `.claude/skills` Cursor читает только с включённым Third-Party Imports; `.cursor/skills` остаётся, только если папка скиллов нужна одному Cursor; добавлен прогон тестов на `windows-latest` | ✅ реализована | `fix(agents): install skills into every folder selected agents read` |
| `HOTFIX-004` | `FEAT-001` | 2026-11-01 | В GitHub Release попадал весь `CHANGELOG.md`: вся история версий, в `v1.0.1` только на русском; на сайте не было инструкции на случай, когда слэш-команды не видны | `scripts/render-release-notes.mjs` собирает заметки одной версии из `assets/releases.json` (EN, затем RU) и падает на неполной записи; `publish.yml` запускает его до `npm publish`; на сайт добавлена страница `troubleshooting` (RU + EN) со ссылками из шпаргалки и `agents-cli` | ✅ реализована | `fix(release): render bilingual notes for one version and add slash command troubleshooting` |
| `HOTFIX-005` | `FEAT-002` | 2026-11-01 | `make release` падал с `TypeError` на первом `git add`: при `stdio: "inherit"` вызов `execFileSync` возвращает `null`, а хелпер вызывал `.trim()` | В `scripts/release.mjs` `.trim()` заменён на `?.trim()`; добавлен тест полного прогона скрипта на временном локальном remote | ✅ реализована | `fix(release): keep make release from crashing on inherited git output` |
