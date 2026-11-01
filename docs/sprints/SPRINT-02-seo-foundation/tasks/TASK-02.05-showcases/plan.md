# TASK-02.05: Витрины GitHub, README и npm — План (Plan)

| Поле паспорта задачи | Значение |
|----------------------|----------|
| **ID задачи спринта** | `TASK-02.05` |
| **ID шага спеки** | `FEAT-003.05` ([`docs/specs/FEAT-003-seo-foundation/tasks.md`](../../../../specs/FEAT-003-seo-foundation/tasks.md)) |
| **ID родительского спринта** | [`SPRINT-02`](../../README.md) |
| **ID родительской фичи / спеки** | [`FEAT-003`](../../../../backlog.md#feat-003) ([`docs/specs/FEAT-003-seo-foundation/`](../../../../specs/FEAT-003-seo-foundation/)) |
| **ID родительской идеи** | [`IDEA-003`](../../../../ideas.md#idea-003) |
| **Тип задачи** | `chore` |
| **Статус задачи** | `✅ реализована` |
| **Git-ветка** | `dev` (правило ежедневной работы из `30-tech-stack.mdc`) |
| **Прочитанные скиллы (`40-skills-router.mdc`)** | `ponytail` |

---

## 1. Цель задачи и фильтр `ponytail` (6-Step Decision Ladder)

**Цель:** На GitHub и в npm сразу понятно, что такое L1DDER, проект находится по словам из задачи, а произношение названия указано в README (`US-4` фичи `FEAT-003`, идея `IDEA-003`).

**Фильтр `ponytail` (заполнить до написания кода):**
- **Что переиспользуем из репозитория / платформы / установленных пакетов:** `gh repo edit`, поля `description` и `keywords` в `package.json`, существующий `README.md`.
- **От чего намеренно отказываемся (`Ponytail skipped` / YAGNI):** переписывание всего README, отдельный русский README, изменение `assets/i18n/{ru,en}/README.md`, тесты на тексты.
- **Публичные швы для тестирования (`Pre-agreed Test Seams`):** новых нет. Меняются только тексты, поэтому тесты на них были бы тавтологией. Результат проверяется по опубликованным значениям.

---

## 2. Состав работ (Пошаговый чек-лист)

- [ ] Шаг 1: Обновить `description` и `keywords` в `package.json` (раздел 6).
- [ ] Шаг 2: Обновить заголовок и первый абзац `README.md` (раздел 6).
- [ ] Шаг 3: Поправить в `docs/specs/FEAT-003-seo-foundation/tasks.md`, `docs/backlog.md` и `README` спринта состав артефактов: `assets/i18n/{ru,en}/README.md` не входят.
- [ ] Шаг 4: Записать прежние значения GitHub в `summary.md`, применить `gh repo edit` с описанием и темами (раздел 6).
- [ ] Шаг 5: Самопроверка по всем критериям DoD ниже + ревью диффа по `ponytail-review`.
- [ ] ⛔ **СТОП №2:** Показать пользователю отчёт самопроверки DoD + обязательный 2-строчный футер `ponytail` (`Ponytail skipped` / `Risk`) и дождаться слова «ок».
- [ ] Шаг 6 (только после второго «ок»): Создать `summary.md` и обновить статус `TASK-02.05` (`FEAT-003.05`) на `✅ реализована` в 4 файлах:
  1. `docs/sprints/SPRINT-02-seo-foundation/README.md`
  2. `docs/specs/FEAT-003-seo-foundation/tasks.md`
  3. `docs/backlog.md`
  4. `docs/roadmap.md` (счётчик прогресса спринта)

---

## 3. Критерии готовности (DoD)

**Агент проверяет (исполняемые команды):**

| # | Критерий | Точная команда / способ проверки |
|---|----------|----------------------------------|
| 1 | На GitHub новое описание и темы, нет слов «public mirror» | `gh repo view ledvanoff/l1dder --json description,repositoryTopics` |
| 2 | Пакет собирается с новыми `description`, `keywords` и README | `npm pack --dry-run`, чтение `package.json` |
| 3 | В README ровно один раз указано произношение, в файлах проекта нет ошибочного `ladder`, ссылки и значки целы | `grep`, просмотр начала файла |
| 4 | Страницы сайта не стали хуже снимка | `make site-gate` |
| 5 | Линтер, типы, тесты, сборка и сайт без ошибок, включая тесты на Windows в CI | `make ci`, CI после пуша |

**После релиза (в `TASK-02.99`):**

- `npm view l1dder description keywords` показывает новые значения.

**Пользователь проверяет (при необходимости):**

- Тексты в разделе 6 и вид страницы репозитория на GitHub.

---

## 4. Артефакты и границы Scope

**Трогаем (создаём или меняем только эти файлы и настройки):**
- `package.json` — `description`, `keywords`.
- `README.md` — заголовок и первый абзац.
- Настройки репозитория на GitHub — описание и темы.
- `docs/specs/FEAT-003-seo-foundation/tasks.md`, `docs/backlog.md`, `docs/sprints/SPRINT-02-seo-foundation/README.md` — уточнение состава артефактов.

**НЕ трогаем (вне Scope):**
- `assets/i18n/{ru,en}/README.md` и `l1dder/README.md`: это описание папки `l1dder/` в проекте пользователя, а не витрина.
- `site/`, `src/`, `assets/releases.json`, версия пакета.

---

## 5. Риски и открытые вопросы

- **Изменения GitHub видны сразу.** Описание и темы появятся до релиза, поэтому они не обещают ничего сверх уже опубликованного. Прежние значения сохраняются в `summary.md` на случай отката.
- **npm обновится только с релизом.** Новые `description`, `keywords` и README попадут в npm вместе с `v1.0.3`.
- **libraries.io и другие каталоги.** Они подтягивают данные сами и обновятся с задержкой.
- **Произношение.** По-русски название читается как «лидер», по-английски как "leader" или "l'oneder" (эль-чудо, L-one-der). В `keywords` и темах этих слов нет: `leader` привлёк бы случайные поиски и не помог бы найти проект.
- **Поиск на слух.** Услышав название, человек наберёт «лидер» или "leader", и проект по таким словам не найдётся. Этого ключевыми словами не исправить.

---

## 6. Тексты на утверждение

**Описание репозитория на GitHub:**

> Spec-driven development framework for AI coding agents: Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode, Cline. Ideas, specs and roadmap in Markdown, driven by /l1-* slash commands.

**Темы GitHub:** `spec-driven-development`, `ai-agents`, `ai-coding`, `agentic-coding`, `coding-agents`, `vibe-coding`, `claude-code`, `cursor`, `codex`, `windsurf`, `github-copilot`, `opencode`, `cline`, `developer-tools`, `cli`

**`description` в `package.json`:**

> Spec-driven development framework for AI coding agents (Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode, Cline): ideas, specs and roadmap in Markdown, driven by /l1-* slash commands.

**`keywords` в `package.json`:** `l1dder`, `spec-driven`, `spec-driven-development`, `ai`, `ai-agents`, `ai-coding`, `agentic-coding`, `coding-agents`, `vibe-coding`, `cursor`, `claude-code`, `codex`, `windsurf`, `copilot`, `opencode`, `cline`, `workflow`, `developer-tools`, `cli`

Убираются: `aidd`, `l1-method` (внутренние названия, которые никто не ищет).

**Начало `README.md`:**

```markdown
# L1DDER — Spec-Driven Development Framework for AI Coding Agents

...значки и ссылка на сайт без изменений...

**L1DDER** (pronounced "leader" or "l'oneder") is a spec-driven development framework for AI coding agents: **Cursor, Claude Code, OpenAI Codex, Windsurf, GitHub Copilot, OpenCode, and Cline**. Ideas, specs, roadmap and tasks live in plain Markdown, `/l1-*` slash commands drive the work, and nothing moves forward without your `"ok"`.
```
