# TASK-04.01: Скилл `/l1-chore` на RU и EN и регистрация в CLI — План (Plan)

| Поле паспорта задачи | Значение |
|----------------------|----------|
| **ID задачи спринта** | `TASK-04.01` |
| **ID шага спеки** | `FEAT-005.01` ([`docs/specs/FEAT-005-chore-command/tasks.md`](../../../../specs/FEAT-005-chore-command/tasks.md)) |
| **ID родительского спринта** | [`SPRINT-04`](../../README.md) |
| **ID родительской фичи / спеки** | [`FEAT-005`](../../../../backlog.md#feat-005) ([`docs/specs/FEAT-005-chore-command/`](../../../../specs/FEAT-005-chore-command/)) |
| **ID родительской идеи** | [`IDEA-004`](../../../../ideas.md#idea-004) |
| **Тип задачи** | `feat` |
| **Статус задачи** | `✅ реализована` |
| **Git-ветка** | `dev` (правило ежедневной работы из `30-tech-stack.mdc`) |
| **Прочитанные скиллы (`40-skills-router.mdc`)** | `ponytail`, `tdd`, `codebase-design` |

---

## 1. Цель задачи и фильтр `ponytail` (6-Step Decision Ladder)

**Цель:** в коробке `L1DDER` появляется 21-й встроенный скилл `/l1-chore` на RU и EN, он раскладывается во все агенты как слэш-команда, назван в сводке `AGENTS.md` / `CLAUDE.md` вторым исключением `Roadmap Gate` и проверяется `doctor` (`US-1`, `US-2`, `US-3`, часть `US-4` и часть `US-5` из [`requirements.md`](../../../../specs/FEAT-005-chore-command/requirements.md)).

**Простое объяснение (`US-5`).** Скилл открывается разделом «Для чего эта команда» без жаргона, понятным вайбкодеру. Агент пересказывает его пользователю при вызове и при отказе. Черновик текста:

> `/l1-chore` нужна для правок самого проекта, а не того, что видят твои пользователи. Например: поменять правила работы с git (как называть ветки и коммиты, что проверять перед пушем), настроить автопроверки в CI, обновить библиотеки, поправить `Makefile` или правила для ИИ-агента. Для таких правок не нужны идея, спека и спринт: агент предложит, как сделать, ты отвечаешь «ок», и правка записывается одной строкой в журнал `docs/backlog.md`. Если правка меняет то, что видят или чем пользуются люди, это уже не `/l1-chore`: агент предложит `/l1-task` или `/l1-hotfix`.

**Фильтр `ponytail`:**
- **Что переиспользуем:** структуру и тон `l1-hotfix/SKILL.md` (одна остановка в чате, карточка, `Exit Gate`); существующий механизм раскладки скиллов (`renderAgentFilesMap()` сам подхватывает новую папку в `assets/i18n/*/skills/`); список `USER_INVOKED_COMMAND_SKILLS` для Windsurf и Copilot; стиль контрактных тестов `tests/onboarding-skill.test.ts`.
- **От чего отказываемся:** нового кода разбора `docs/backlog.md` в CLI нет, раздел 4 добавляет агент по тексту скилла (`US-3`); отдельный формат шаблона карточки не выносим в `templates/`; `.opencode/commands/` не трогаем (это `IDEA-008`).
- **Публичные швы для тестирования (`Pre-agreed Test Seams` из `design.md`):**
  - `Seam 1` — `tests/chore-skill.test.ts`: текст `assets/i18n/{ru,en}/skills/l1-chore/SKILL.md` (раздел «Для чего эта команда» / «What this command is for» перед первым шагом, с примером про git; граница «продукт vs служебная правка» с отсылкой к `/l1-task` и `/l1-hotfix`, ровно одна `⛔`, `make ci`, автосоздание раздела 4 с 4 колонками, одинаковое число шагов и остановок на RU и EN).
  - `Seam 2` — `tests/cli.test.ts`: `listDeclaredSkills()` = 21; `renderAgentFilesMap()` создаёт `.agents/skills/l1-chore/SKILL.md`, `.claude/skills/l1-chore/SKILL.md`, `.windsurf/workflows/l1-chore.md`, `.github/prompts/l1-chore.prompt.md`; `buildEntryPointSummary()` на RU и EN содержит `/l1-chore` и называет его в строке `Roadmap Gate`; `runProjectDoctor()` падает, если нет `skills/l1-chore/SKILL.md`.

---

## 2. Состав работ (Пошаговый чек-лист)

Каждый срез: один тест → видим, что он падает **на своём поведении** → минимальная правка → `GREEN`. Чтобы первый тест скилла не падал просто из-за отсутствия файла, сначала создаётся заготовка скилла (frontmatter и заголовок), а каждый следующий тест дописывает в неё один шаг.

- [x] Шаг 1: Заготовка `assets/i18n/{ru,en}/skills/l1-chore/SKILL.md` (frontmatter `name: l1-chore` + `description` с триггерами: `/l1-chore` и словесная просьба о служебной / `chore`-правке; заголовок).
- [x] Шаг 2 (`Seam 1`, срез 0): тест «до первого шага идёт раздел „Для чего эта команда“ / „What this command is for“ с примером про git» → `RED` → раздел простым языком по черновику из п. 1 (RU и EN). При отказе (срез 1) агент объясняет причину этими же словами.
- [x] Шаг 2б (`Seam 1`, срез 1): тест «отказ до правок файлов при изменении поведения продукта, предложить `/l1-task` (`/l1-idea` / `/l1-feature`) или `/l1-hotfix`» → `RED` → ШАГ 1 скилла «Проверка границы».
- [x] Шаг 3 (`Seam 1`, срез 2): тест «ровно одна `⛔ СТОП` / `⛔ STOP` и `make ci`» → `RED` → ШАГИ скилла: чтение `docs/backlog.md` и расчёт `CHORE-NNN`, варианты с рекомендацией и карточка `CHORE-NNN` с `⛔ СТОП`, реализация (`ponytail` + `tdd`) и `make ci`.
- [x] Шаг 4 (`Seam 1`, срез 3): тест «если в `docs/backlog.md` нет раздела 4 — добавить его в конец с заголовком таблицы `ID правки | Дата | Что и зачем | Сообщение коммита` (`Chore ID | Date | What and why | Commit message`)» → `RED` → ШАГ записи `CHORE-NNN` и `Exit Gate`.
- [x] Шаг 5 (`Seam 1`, срез 4): тест «одинаковое число шагов и остановок на RU и EN» (страж: проверю временной мутацией, что умеет падать).
- [x] Шаг 6 (`Seam 2`, срез 5): `declared.length` → 21 и наличие `l1dder/skills/l1-chore/SKILL.md` после `init` → `RED` → добавить `l1-chore` в секцию `l1dder` файлов `assets/i18n/{ru,en}/skills.json`.
- [x] Шаг 7 (`Seam 2`, срез 6): `renderAgentFilesMap()` создаёт 4 файла `l1-chore` для `codex`, `claude`, `windsurf`, `copilot` → `RED` на Windsurf / Copilot → добавить `l1-chore` в `USER_INVOKED_COMMAND_SKILLS` (`src/agents.ts`).
- [x] Шаг 8 (`Seam 2`, срез 7): `buildEntryPointSummary()` на RU и EN содержит строку `/l1-chore` и называет его в правиле `Roadmap Gate` → `RED` → правка текста сводки в `src/agents.ts`. Пояснение у строки `/l1-chore` простое: «правки самого проекта: правила git, CI, библиотеки, `Makefile`, правила агента», а не «служебные правки вне роадмапа».
- [x] Шаг 9 (`Seam 2`, срез 8): `runProjectDoctor()` даёт `fail` без `skills/l1-chore/SKILL.md` → `RED` → добавить файл в `requiredFrameworkFiles` и поменять «20 базовых скиллов» на «21» (`src/installer.ts`).
- [x] Шаг 10: `make build` (обновит `./l1dder/`, папки агентов и блок `l1dder:begin` в `CLAUDE.md` / `AGENTS.md`), затем самопроверка по DoD + ревью диффа по `ponytail-review`.
- [x] ⛔ **СТОП №2:** Показать отчёт самопроверки DoD + 2-строчный футер `ponytail` (`Ponytail skipped` / `Risk`) и дождаться «ок».
- [x] Шаг 11 (только после второго «ок»): `summary.md` и статус `TASK-04.01` (`FEAT-005.01`) `✅ реализована` в 4 файлах:
  1. `docs/sprints/SPRINT-04-chore-command/README.md`
  2. `docs/specs/FEAT-005-chore-command/tasks.md`
  3. `docs/backlog.md`
  4. `docs/roadmap.md` (счётчик `1/3 (+ TASK-04.99)`)

---

## 3. Критерии готовности (DoD)

**Агент проверяет:**

| # | Критерий | Точная команда / способ проверки |
|---|----------|----------------------------------|
| 1 | Контракт скилла `/l1-chore` на RU и EN | `npx vitest run tests/chore-skill.test.ts` |
| 2 | 21 скилл, раскладка в агенты, сводка с `/l1-chore` в `Roadmap Gate`, `doctor` | `npx vitest run tests/cli.test.ts` |
| 3 | Ссылки внутри нового скилла рабочие | `npx vitest run tests/bundled-skills.test.ts` |
| 4 | Проверка типов без ошибок | `make lint && make typecheck` |
| 5 | Полный цикл без ошибок | `make ci` (включает `make test`, `make build`, `make test-e2e`, `make doctor`) |

**Пользователь проверяет (при желании):**

- Прочитать `assets/i18n/ru/skills/l1-chore/SKILL.md`: понятна ли граница «служебная правка или продукт» и карточка `CHORE-NNN`.

---

## 4. Артефакты и границы Scope

**Трогаем:**
- `assets/i18n/{ru,en}/skills/l1-chore/SKILL.md` — новый скилл.
- `assets/i18n/{ru,en}/skills.json` — `l1-chore` в секции `l1dder`.
- `src/agents.ts` — `USER_INVOKED_COMMAND_SKILLS` и текст `buildEntryPointSummary()` (RU и EN).
- `src/installer.ts` — `requiredFrameworkFiles` и счётчик в сообщении `doctor`.
- `tests/chore-skill.test.ts` — новый контрактный тест (`Seam 1`).
- `tests/cli.test.ts` — 21 скилл, файлы агентов, сводка, `doctor` (`Seam 2`).
- `docs/specs/FEAT-005-chore-command/requirements.md` — новое требование `US-5` (простое объяснение), а в `tasks.md`, `docs/backlog.md` и README спринта у `FEAT-005.03` / `TASK-04.03` дописано «простое объяснение, для чего команда».
- Сгенерированное сборкой: `./l1dder/`, `.claude/`, `.cursor/`, `.agents/`, блок `l1dder:begin` в `CLAUDE.md` / `AGENTS.md`.

**НЕ трогаем (вне Scope):**
- Шаблон `backlog-template.md`, правила `00/20/40-*.mdc`, `GLOSSARY.md`, раздел 6 `30-tech-stack.mdc` и правило 8 в `AGENTS.md` — это `TASK-04.02`.
- `README.md`, `METHODOLOGY.md`, `user-guide/*`, `site/*`, `seo.mts` и счётчики в них — это `TASK-04.03`.
- `assets/releases.json` и версия пакета (релиз только по прямой просьбе).
- `.opencode/commands/` (`IDEA-008`), `site/.vitepress/og-card.html`.

---

## 5. Риски и открытые вопросы

- До `TASK-04.02` и `TASK-04.03` правила и документация ещё говорят «20 скиллов» и «единственное исключение — `/l1-hotfix`», а сводка в `CLAUDE.md` уже назовёт `/l1-chore`. Это временное расхождение внутри `dev`, релиз не выпускается до конца спринта.
- `make test-e2e` проверяет сайт: если какие-то страницы сайта выводят список скиллов из ассетов, снимок `docs/site-baseline.json` может сдвинуться. Тогда остановлюсь и скажу, без `make site-baseline` по своей инициативе.
- Скилл ссылается на раздел 4 `docs/backlog.md`, которого в шаблоне ещё нет (появится в `TASK-04.02`); на этот случай как раз и рассчитано автосоздание раздела из `US-3`.
