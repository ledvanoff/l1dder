# TASK-02.02: Модуль SEO, `sitemap.xml`, тексты и языковые связи — План (Plan)

| Поле паспорта задачи | Значение |
|----------------------|----------|
| **ID задачи спринта** | `TASK-02.02` |
| **ID шага спеки** | `FEAT-003.02` ([`docs/specs/FEAT-003-seo-foundation/tasks.md`](../../../../specs/FEAT-003-seo-foundation/tasks.md)) |
| **ID родительского спринта** | [`SPRINT-02`](../../README.md) |
| **ID родительской фичи / спеки** | [`FEAT-003`](../../../../backlog.md#feat-003) ([`docs/specs/FEAT-003-seo-foundation/`](../../../../specs/FEAT-003-seo-foundation/)) |
| **ID родительской идеи** | [`IDEA-003`](../../../../ideas.md#idea-003) |
| **Тип задачи** | `feat` |
| **Статус задачи** | `✅ реализована` |
| **Git-ветка** | `dev` (правило ежедневной работы из `30-tech-stack.mdc`) |
| **Прочитанные скиллы (`40-skills-router.mdc`)** | `ponytail`, `tdd`, исходники VitePress 1.6.4 (`generateSitemap`, `createTitle`) |

---

## 1. Цель задачи и фильтр `ponytail` (6-Step Decision Ladder)

**Цель:** У каждой из 18 страниц появляются свои заголовок и описание, канонический адрес и языковые связи, а поисковики получают полный `sitemap.xml` (`US-1`, `US-2` фичи `FEAT-003`, идея `IDEA-003`).

**Фильтр `ponytail` (заполнить до написания кода):**
- **Что переиспользуем из репозитория / платформы / установленных пакетов:** встроенные в VitePress `sitemap` (он сам добавляет связи `ru`/`en`), `transformPageData` и `titleTemplate`; `scripts/check-site.mjs`.
- **От чего намеренно отказываемся (`Ponytail skipped` / YAGNI):** Open Graph (это `TASK-02.03`), `llms.txt` (это `TASK-02.04`), `lastUpdated` (добавил бы на страницы новый текст), JSON-LD, плагины SEO, правка H1 и текстов страниц.
- **Публичные швы для тестирования (`Pre-agreed Test Seams`):** `buildPageSeo(relativePath)`, таблица страниц против файлов `site/` и `node scripts/check-site.mjs` на маленьких примерах сборки.

---

## 2. Состав работ (Пошаговый чек-лист)

Каждый пункт шага 1 и шага 3 — отдельный срез: один тест, падение на своём поведении, минимальный код.

- [ ] Шаг 1: Срезы `buildPageSeo` в `site/.vitepress/seo.mts`:
  1. `en/guide.md`: заголовок и описание из таблицы.
  2. Канонический адрес `https://ledvanoff.github.io/l1dder/en/guide`, главная даёт `/l1dder/` и `/l1dder/en/`.
  3. `hreflang` `ru`, `en` и `x-default` (ведёт на английскую версию).
  4. Страница без записи в таблице роняет сборку понятной ошибкой.
- [ ] Шаг 2: Срезы таблицы против файлов: каждая страница `site/` есть в таблице и наоборот, заголовки и описания уникальны, заголовок не длиннее 70 символов, описание не длиннее 160.
- [ ] Шаг 3: Срезы `check-site.mjs` на готовой сборке:
  1. `sitemap.xml` отсутствует.
  2. В `sitemap.xml` не хватает страницы или есть лишний адрес.
  3. Заголовок или описание повторяются на разных страницах либо отсутствуют.
  4. Канонический адрес ведёт не на эту страницу.
  5. Нет `hreflang` для одного из языков.
- [ ] Шаг 4: Подключить модуль и `sitemap` в `site/.vitepress/config.mts`, чтобы настоящая сборка прошла проверку.
- [ ] Шаг 5: Самопроверка по всем критериям DoD ниже + ревью диффа по `ponytail-review` (удалить лишний код, проверить всех вызывающих `callers`).
- [ ] ⛔ **СТОП №2:** Показать пользователю отчёт самопроверки DoD + обязательный 2-строчный футер `ponytail` (`Ponytail skipped` / `Risk`) и дождаться слова «ок».
- [ ] Шаг 6 (только после второго «ок»): Создать `summary.md` и обновить статус `TASK-02.02` (`FEAT-003.02`) на `✅ реализована` в 4 файлах:
  1. `docs/sprints/SPRINT-02-seo-foundation/README.md`
  2. `docs/specs/FEAT-003-seo-foundation/tasks.md`
  3. `docs/backlog.md`
  4. `docs/roadmap.md` (счётчик прогресса спринта)

---

## 3. Критерии готовности (DoD)

**Агент проверяет (исполняемые команды):**

| # | Критерий | Точная команда / способ проверки |
|---|----------|----------------------------------|
| 1 | Каждый новый тест упал на своём поведении до кода | Журнал срезов в отчёте СТОП №2 |
| 2 | У всех 18 страниц свои заголовок, описание, канонический адрес и `hreflang` | `make test-e2e` (`check-site.mjs`) |
| 3 | `sitemap.xml` содержит ровно 18 адресов с `/l1dder/` | `make test-e2e` |
| 4 | Страницы не стали хуже снимка: те же адреса и H1, текст, диаграммы и меню на месте | `make site-gate` |
| 5 | При переходах внутри сайта заголовок, описание и канонический адрес меняются на нужные, нет ошибок консоли | Браузер, production-сборка с `/l1dder/`, переход между страницами RU и EN |
| 6 | Поиск по сайту и заголовки в результатах работают как раньше | Браузер, та же сборка |
| 7 | Линтер, типы, тесты, сборка и сайт без ошибок, включая тесты на Windows в CI | `make ci`, CI после пуша |

**Пользователь проверяет (при необходимости):**

- Тексты заголовков и описаний в разделе 6 (их лучше утвердить вместе с этим планом).

---

## 4. Артефакты и границы Scope

**Трогаем (создаём или меняем только эти файлы):**
- `site/.vitepress/seo.mts` — таблица страниц и `buildPageSeo`.
- `site/.vitepress/config.mts` — `sitemap` и `transformPageData`.
- `tests/seo.test.ts` — тесты модуля и таблицы.
- `scripts/check-site.mjs`, `tests/check-site.test.ts` — проверки `sitemap.xml` и тегов страниц.
- `docs/specs/FEAT-003-seo-foundation/{requirements,design}.md` — только если реализация разойдётся со спекой.

**НЕ трогаем (вне Scope):**
- Содержимое страниц `site/*.md` и `assets/i18n/`, снимок `site-baseline.json`.
- Open Graph, картинку, `llms.txt`, витрины GitHub и npm, `src/`, `publish.yml`, `docs.yml`.

---

## 5. Риски и открытые вопросы

- **`x-default` ведёт на английскую версию.** Это для людей, чей язык не русский и не английский. Русская версия остаётся на корне сайта и получает свой `hreflang="ru"`.
- **Заголовок вкладки изменится.** В браузере будет новый заголовок вместо вида «🚀 ... | L1DDER». Заголовки H1 на страницах не меняются.
- **Даты в `sitemap.xml` не появятся.** `lastmod` требует `lastUpdated`, а он добавляет на страницы новую строку. Поисковикам карта сайта нужна и без дат.
- **Пропущенная страница уронит сборку.** Новую страницу придётся добавлять в таблицу SEO. Это намеренно, но стоит помнить при правках сайта.

---

## 6. Тексты страниц на утверждение

| Страница | Заголовок (`<title>`) | Описание (`meta description`) |
|----------|-----------------------|-------------------------------|
| `index.md` | L1DDER — spec-driven разработка с ИИ-агентами | Spec-driven фреймворк: идеи, спеки и роадмап в Markdown и слэш-команды /l1-*. Для Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode и Cline. |
| `guide.md` | Как работать с L1DDER: обзор и главная схема | Путеводитель по L1DDER простым языком: как проходит работа от идеи до готового продукта и почему ИИ-агент не теряет контекст между задачами. |
| `quickstart.md` | Быстрый старт L1DDER: установка и живой пример работы | Как подключить L1DDER к проекту одной командой или фразой в чат и пройти с ИИ-агентом путь от первой идеи до готовой фичи. |
| `flows.md` | Слэш-команды /l1-*: разбор всех цепочек L1DDER | Зачем нужны /l1-onboard, /l1-idea, /l1-feature, /l1-planning, /l1-task и /l1-hotfix, когда их вызывать и что каждая из них создаёт. |
| `cheatsheet.md` | Шпаргалка и FAQ по L1DDER: что делать прямо сейчас | Какую команду вызвать в текущей ситуации, что значат статусы идей, фич и задач, и ответы на частые вопросы о работе с L1DDER. |
| `agents-cli.md` | ИИ-агенты и команды CLI в L1DDER | Какие файлы L1DDER создаёт для Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode и Cline, и как работают init, update, sync и skills. |
| `methodology.md` | Методология L1DDER: spec-driven разработка с ИИ-агентами | Полное описание цикла L1DDER: роадмап как источник истины, сквозные ID, правило двух согласований и обязательная проверка в конце спринта. |
| `glossary.md` | Словарь терминов L1DDER | Что значат термины методологии L1DDER: концепт, идея, спека, спринт, задача, хотфикс и другие, в порядке потока работы. |
| `troubleshooting.md` | Не видны слэш-команды /l1-* в L1DDER: как исправить | Что делать, если команды L1DDER не появляются в Cursor, Claude Code, Codex или другом агенте: обновление, проверка файла и частые случаи. |
| `en/index.md` | L1DDER — Spec-Driven Development with AI Agents | A spec-driven framework: ideas, specs and roadmap in Markdown, plus /l1-* slash commands. For Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode and Cline. |
| `en/guide.md` | How L1DDER Works: Overview and Visual Map | A plain-language guide to L1DDER: how work moves from an idea to a finished product and why your AI agent keeps its context between tasks. |
| `en/quickstart.md` | L1DDER Quickstart: Installation and a Live Example | Add L1DDER to a project with one command or one chat message, then go from your first idea to a finished feature with your AI agent. |
| `en/flows.md` | Slash Commands /l1-*: Every L1DDER Flow Explained | What /l1-onboard, /l1-idea, /l1-feature, /l1-planning, /l1-task and /l1-hotfix are for, when to run them and what each one creates. |
| `en/cheatsheet.md` | L1DDER Cheatsheet and FAQ: What to Do Right Now | Which command to run in your current situation, what the idea, feature and task statuses mean, and answers to common L1DDER questions. |
| `en/agents-cli.md` | AI Agents and CLI Commands in L1DDER | Which files L1DDER creates for Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode and Cline, and how init, update, sync and skills work. |
| `en/methodology.md` | L1DDER Methodology: Spec-Driven Development with AI Agents | The full L1DDER cycle: the roadmap as the source of truth, end-to-end IDs, the two-approval rule and the mandatory end-of-sprint check. |
| `en/glossary.md` | L1DDER Glossary | What the L1DDER terms mean: concept, idea, spec, sprint, task, hotfix and more, in the order of the workflow. |
| `en/troubleshooting.md` | L1DDER Slash Commands /l1-* Not Showing: How to Fix | What to do when L1DDER commands don't appear in Cursor, Claude Code, Codex or another agent: updating, checking the file and common cases. |
