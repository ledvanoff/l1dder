# FEAT-005: Команда `/l1-chore` для служебных правок вне роадмапа — Технический дизайн (Design)

| Поле паспорта | Значение |
|---------------|----------|
| **ID фичи / спеки** | `FEAT-005` |
| **Родительская идея (`IDEA-NNN`)** | [`IDEA-004`](../../ideas.md#idea-004) |
| **Требования** | [`requirements.md`](./requirements.md) |
| **Декомпозиция шагов** | [`tasks.md`](./tasks.md) |

## 1. Архитектурное решение

Фича добавляет 8-й управляющий скилл `l1-chore` в `assets/i18n/{ru,en}/skills/l1-chore/SKILL.md` и регистрирует его в манифесте `skills.json` и CLI (`src/agents.ts`, `src/installer.ts`).

Поток выполнения `/l1-chore` строится по образцу `/l1-hotfix` (одна остановка `⛔ СТОП` в чате без создания `plan.md` и `summary.md`):

```mermaid
flowchart LR
    U["Пользователь:<br/>/l1-chore [задача]"] --> G{"Меняет поведение<br/>продукта?"}
    G -->|"Да"| Stop1["Отказ: предложи<br/>/l1-task или /l1-hotfix"]
    G -->|"Нет (внутренняя кухня)"| S1["Прочитай docs/backlog.md,<br/>вычисли CHORE-NNN"]
    S1 --> S2["Варианты + рекомендация<br/>+ карточка CHORE-NNN<br/>⛔ СТОП (жди «ок»)"]
    S2 -->|"ок"| S3["Реализация (ponytail + tdd)<br/>+ make ci"]
    S3 --> S4["Запиши CHORE-NNN в Раздел 4<br/>docs/backlog.md (создай раздел,<br/>если его ещё нет)"]
```

Внутренний раздел 6 файла `l1dder/rules/30-tech-stack.mdc` (и правило 8 в `AGENTS.md`) упрощается: общий порядок выполнения теперь живёт в `/l1-chore`, а в `30-tech-stack.mdc` и `AGENTS.md` остаются только специфичные для самого репозитория `L1DDER` инварианты (не трогать `src/` и `assets/`, не поднимать версию в `assets/releases.json`, коммитить в `dev`).

## 2. Затрагиваемые глубокие модули и публичные швы (`codebase-design` & `tdd`)

| Модуль (`Module`) | Публичный интерфейс (`Interface` на шве `Seam`) | Что скрыто внутри (`Depth`) | Как тестируем (`Pre-agreed Test Seam`) |
|-------------------|-------------------------------------------------|-----------------------------|----------------------------------------|
| `assets/i18n/{ru,en}/skills/l1-chore/SKILL.md` | Пошаговый текст скилла `/l1-chore` | Проверка границы «продукт vs внутренняя кухня», расчёт `CHORE-NNN`, шаблон карточки с `⛔ СТОП`, автосоздание раздела 4 в `docs/backlog.md` | `tests/chore-skill.test.ts` — контракт текста на RU и EN |
| `src/agents.ts` & `src/installer.ts` | `renderAgentFilesMap()`, `buildEntryPointSummary()`, `runProjectDoctor()` | Включение `l1-chore` в `USER_INVOKED_COMMAND_SKILLS`, сводку `AGENTS.md` / `CLAUDE.md` и список обязательных файлов `doctor` (21 скилл) | `tests/cli.test.ts` — проверка 21 скилла, генерации файлов для всех агентов и `doctor` |
| `assets/i18n/{ru,en}/templates/backlog/backlog-template.md` + `rules/{00,20,40}-*.mdc` + `GLOSSARY.md` | Шаблон бэклога, таблицы ID и правил `Roadmap Gate` | 4-колоночная таблица `CHORE-NNN`, второе исключение из `Roadmap Gate` и определение термина в словаре | `tests/chore-skill.test.ts` — проверка наличия `CHORE-NNN` и `/l1-chore` в шаблоне, правилах и словаре на RU и EN |

**Согласованные публичные швы (`Pre-agreed Test Seams`):**

- `Seam 1` (`tests/chore-skill.test.ts` — контракт скилла `/l1-chore` на RU и EN):
  - проверяет наличие проверки границы (отказ и предложение `/l1-task` или `/l1-hotfix`, если меняется поведение продукта);
  - проверяет наличие ровно одной остановки `⛔ СТОП` / `⛔ STOP`, требования `make ci` и инструкции добавить раздел 4 в `docs/backlog.md`, если его нет;
  - проверяет совпадение числа шагов и остановок между RU и EN.
- `Seam 2` (`tests/cli.test.ts` — интеграция в CLI и агенты):
  - `listDeclaredSkills()` возвращает **21** установленный скилл;
  - `renderAgentFilesMap()` создаёт `.agents/skills/l1-chore/SKILL.md`, `.claude/skills/l1-chore/SKILL.md`, `.windsurf/workflows/l1-chore.md`, `.github/prompts/l1-chore.prompt.md`;
  - `buildEntryPointSummary()` на RU и EN включает `/l1-chore` и называет его в правиле `Roadmap Gate`.
- `Seam 3` (`tests/chore-skill.test.ts` — шаблон бэклога, правила и словарь):
  - `backlog-template.md`, `00-methodology.mdc`, `20-workflow.mdc`, `40-skills-router.mdc` и `GLOSSARY.md` на RU и EN содержат `CHORE-NNN` и `/l1-chore`.

## 3. Модель данных / Схема конфига / Контракты

Формат таблицы раздела 4 в `docs/backlog.md` и `assets/i18n/{ru,en}/templates/backlog/backlog-template.md` (4 колонки):

- **RU:**
  ```markdown
  ## 4. Журнал служебных правок (`CHORE-NNN`)

  > Служебные правки внутренней кухни проекта без изменения поведения продукта, выполненные через `/l1-chore`.

  | ID правки | Дата | Что и зачем | Сообщение коммита |
  |:---------:|------|-------------|:-----------------:|
  | `CHORE-001` | 2026-10-21 | [Что и зачем изменили] | `chore(ci): ...` |
  ```
- **EN:**
  ```markdown
  ## 4. Chore Log (`CHORE-NNN`)

  > Internal repository maintenance changes that do not alter product behavior, executed via `/l1-chore`.

  | Chore ID | Date | What and why | Commit message |
  |:--------:|------|--------------|:--------------:|
  | `CHORE-001` | 2026-10-21 | [What changed and why] | `chore(ci): ...` |
  ```

## 4. Принятые решения и риски

| Вопрос / Развилка | Выбранное решение | Почему (обоснование) |
|-------------------|-------------------|----------------------|
| Колонки таблицы `CHORE-NNN` | 4 колонки (`ID правки \| Дата \| Что и зачем \| Сообщение коммита`) | Служебная правка не привязана к фиче и записывается по факту выполнения; 100% совместимость с уже ведущимся журналом в `docs/backlog.md` |
| Триггер вызова скилла | Слэш-команда `/l1-chore` + словесный запрос про служебную/`chore`-правку в чате | Удобно и через меню команд, и обычным текстом |
| Старые проекты без раздела 4 в `docs/backlog.md` | Скилл `/l1-chore` сам дописывает раздел 4 в конец `docs/backlog.md` | `npx l1dder update` не перезаписывает пользовательский `docs/` |
| Снимок сайта `docs/site-baseline.json` | Проверить через `make site-gate` (обновить `make site-baseline` только если изменится проверяемая структура) | Добавление текста на существующие страницы не ухудшает базовый снимок |
