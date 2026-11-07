# TASK-04.02: Журнал `CHORE-NNN` в шаблоне бэклога, правила и словарь — План (Plan)

| Поле паспорта задачи | Значение |
|----------------------|----------|
| **ID задачи спринта** | `TASK-04.02` |
| **ID шага спеки** | `FEAT-005.02` ([`docs/specs/FEAT-005-chore-command/tasks.md`](../../../../specs/FEAT-005-chore-command/tasks.md)) |
| **ID родительского спринта** | [`SPRINT-04`](../../README.md) |
| **ID родительской фичи / спеки** | [`FEAT-005`](../../../../backlog.md#feat-005) ([`docs/specs/FEAT-005-chore-command/`](../../../../specs/FEAT-005-chore-command/)) |
| **ID родительской идеи** | [`IDEA-004`](../../../../ideas.md#idea-004) |
| **Тип задачи** | `feat` |
| **Статус задачи** | `✅ реализована` |
| **Git-ветка** | `dev` (правило ежедневной работы из `30-tech-stack.mdc`) |
| **Прочитанные скиллы (`40-skills-router.mdc`)** | `ponytail`, `tdd`, `domain-modeling` (словарь) |

---

## 1. Цель задачи и фильтр `ponytail` (6-Step Decision Ladder)

**Цель:** у новых проектов в `docs/backlog.md` сразу есть раздел 4 «Журнал служебных правок (`CHORE-NNN`)», а правила `00/20/40`, шаблон роадмапа, скилл `l1-hotfix` и `GLOSSARY.md` на RU и EN называют `/l1-chore` вторым исключением из `Roadmap Gate` и описывают `CHORE-NNN` (`US-3`, `US-4`, часть `US-5` из [`requirements.md`](../../../../specs/FEAT-005-chore-command/requirements.md)). Внутренний раздел 6 `30-tech-stack.mdc` и правило 8 в `AGENTS.md` сокращаются до ссылки на `/l1-chore` плюс инварианты самого репозитория `L1DDER`.

**Фильтр `ponytail`:**
- **Что переиспользуем:** формат таблицы и заголовка раздела 4 из `design.md` (символ в символ тот же, что пишет скилл `/l1-chore`); устройство разделов `HOTFIX-NNN` во всех правках (строка в таблице ID, строка в таблице команд, цепочка в `20-workflow.mdc`, статья в словаре); `tests/chore-skill.test.ts` и его константы `logHeading` / `logColumns`.
- **От чего отказываемся:** статусов у `CHORE-NNN` нет (запись делается по факту, `design.md`), поэтому строку в таблицу статусов `20-workflow.mdc` не добавляем; якорей `#chore-001` нет (это строки таблицы, а не карточки); в EN-словаре нет статьи про `Hotfix` — дописывать её не будем, это вне задачи.
- **Публичные швы для тестирования (`Seam 3` из `design.md`)** — `tests/chore-skill.test.ts`, тексты на RU и EN:
  - `backlog-template.md`: раздел 4 с тем же заголовком и строкой колонок, что пишет скилл, и упоминанием `/l1-chore`;
  - `20-workflow.mdc`, `GLOSSARY.md`, `roadmap-template.md`, скилл `l1-hotfix`: `Roadmap Gate` называет `/l1-chore`, фраз «единственное исключение» / «only exception» больше нет;
  - `00-methodology.mdc`: строка `CHORE-001` в таблице ID и строка `/l1-chore` в таблице команд;
  - `40-skills-router.mdc`: строка `/l1-chore` с путём `l1dder/skills/l1-chore/SKILL.md`;
  - `GLOSSARY.md`: статья о служебной правке простыми словами (с примером про git), раздел 4 в списке секций бэклога;
  - `20-workflow.mdc`: цепочка 6 / Flow 6 для `/l1-chore` с `CHORE-NNN`.

---

## 2. Состав работ (Пошаговый чек-лист)

Каждый срез: один тест → видим, что он падает на своём поведении → минимальная правка RU и EN → `GREEN`.

- [x] Шаг 1 (срез 1): тест «в `backlog-template.md` есть раздел 4 с заголовком и колонками как в скилле и ссылка на `/l1-chore`» → `RED` → раздел 4 в конце шаблона (формат `design.md`, пример строки про git-хук) и `/l1-chore` в строке «Скиллы управления».
- [x] Шаг 2 (срез 2): тест «`Roadmap Gate` в `20-workflow.mdc`, `GLOSSARY.md`, `roadmap-template.md` и скилле `l1-hotfix` называет `/l1-chore`, нет „единственное исключение“ / „only exception“» → `RED` → правка формулировок: исключения `/l1-hotfix` (срочный баг) и `/l1-chore` (правки самого проекта, которые не меняют продукт); в `frontmatter` `20-workflow.mdc` список цепочек дополнен `/l1-chore`.
- [x] Шаг 3 (срез 3): тест «в `00-methodology.mdc` есть строка `CHORE-001` в таблице ID и `/l1-chore` в таблице команд» → `RED` → две строки RU и EN (`docs/backlog.md`, раздел 4; родительские ID не нужны) и `CHORE-001` в комментарии `backlog.md` дерева `docs/` (RU).
- [x] Шаг 4 (срез 4): тест «в `40-skills-router.mdc` есть строка `/l1-chore` с путём скилла» → `RED` → строка в разделе 0 (простое описание: правки самого проекта — правила git, CI, библиотеки, `Makefile`, правила агента) и `/l1-chore` в пункте «перед реализацией кода прочитай скиллы стека».
- [x] Шаг 5 (срез 5): тест «в `GLOSSARY.md` есть статья о служебной правке с примером про git, бэклог описан из 4 секций с `CHORE-NNN`» → `RED` → статья «Служебная правка (`CHORE-NNN` и `/l1-chore`)» / «Chore (`CHORE-NNN` & `/l1-chore`)» простыми словами и 4-й пункт в списке секций бэклога.
- [x] Шаг 6 (срез 6): тест «в `20-workflow.mdc` есть цепочка 6 / Flow 6 с `/l1-chore` и `CHORE-NNN`» → `RED` → RU: `ЦЕПОЧКА 6` из 4 шагов (граница → `CHORE-NNN` и карточка `⛔ СТОП` → правка и `make ci` → запись в раздел 4), EN: строка `Flow 6` в сводке.
- [x] Шаг 7 (внутренние правила репозитория, без тестов — это текст для агентов этого репо): раздел 6 `l1dder/rules/30-tech-stack.mdc` сокращается до «порядок действий — `/l1-chore`» плюс инварианты `L1DDER` (граница `src/` и `assets/` → `/l1-task` или `/l1-evo`, внутренние правила только здесь и в `AGENTS.md` выше блока, версию не поднимать, коммит и пуш в `dev`, не в `main`, `workflows` работают после `main`, сайт не выкатывать); правило 8 в `AGENTS.md` ссылается на `/l1-chore`; пояснение под заголовком раздела 4 в нашем `docs/backlog.md` — тоже.
- [x] Шаг 8: `make ci` (сборка разложит правила в `./l1dder/`, `.claude/rules/`, `.cursor/rules/`), самопроверка по DoD + ревью диффа по `ponytail-review`.
- [x] ⛔ **СТОП №2:** Показать отчёт самопроверки DoD + 2-строчный футер `ponytail` (`Ponytail skipped` / `Risk`) и дождаться «ок».
- [x] Шаг 9 (только после второго «ок»): `summary.md` и статус `TASK-04.02` (`FEAT-005.02`) `✅ реализована` в 4 файлах:
  1. `docs/sprints/SPRINT-04-chore-command/README.md`
  2. `docs/specs/FEAT-005-chore-command/tasks.md`
  3. `docs/backlog.md`
  4. `docs/roadmap.md` (счётчик `2/3 (+ TASK-04.99)`)

---

## 3. Критерии готовности (DoD)

**Агент проверяет:**

| # | Критерий | Точная команда / способ проверки |
|---|----------|----------------------------------|
| 1 | Шаблон бэклога, правила, шаблон роадмапа, скилл `l1-hotfix` и словарь на RU и EN (`Seam 3`) | `npx vitest run tests/chore-skill.test.ts` |
| 2 | Синхронизированные правила в `./l1dder/rules/` и `.claude/rules/l1dder/` совпадают с `assets/` | `make build` + `git diff --stat` |
| 3 | Проверка типов без ошибок | `make lint && make typecheck` |
| 4 | Полный цикл без ошибок | `make ci` |

**Пользователь проверяет (при желании):**

- Прочитать статью о служебной правке в `assets/i18n/ru/GLOSSARY.md` и новый раздел 6 `l1dder/rules/30-tech-stack.mdc`.

---

## 4. Артефакты и границы Scope

**Трогаем:**
- `assets/i18n/{ru,en}/templates/backlog/backlog-template.md` — раздел 4 и строка «Скиллы управления».
- `assets/i18n/{ru,en}/templates/roadmap/roadmap-template.md` — формулировка `Roadmap Gate`.
- `assets/i18n/{ru,en}/rules/00-methodology.mdc`, `20-workflow.mdc`, `40-skills-router.mdc` — ID, команды, цепочка, маршрутизатор.
- `assets/i18n/{ru,en}/skills/l1-hotfix/SKILL.md` — одна строка: «единственное исключение» → «исключение для срочных багов».
- `assets/i18n/{ru,en}/GLOSSARY.md` — статья о служебной правке, секции бэклога, `Roadmap Gate`.
- `tests/chore-skill.test.ts` — `Seam 3`.
- `l1dder/rules/30-tech-stack.mdc` (раздел 6), `AGENTS.md` (правило 8 выше блока), `docs/backlog.md` (пояснение под разделом 4).
- Сгенерированное сборкой: `./l1dder/`, `.claude/rules/`, `.cursor/rules/` (если есть), блок `l1dder:begin`.

**НЕ трогаем (вне Scope):**
- `README.md`, `assets/i18n/*/README.md`, `METHODOLOGY.md`, `user-guide/*`, `onboarding/*`, `site/*`, счётчики «20 скиллов» — это `TASK-04.03` (там тоже есть «единственное исключение»).
- `src/` — сводка уже обновлена в `TASK-04.01`.
- Шаблон `assets/i18n/*/rules/30-tech-stack.mdc` для внешних проектов, `assets/releases.json`.

---

## 5. Риски и открытые вопросы

- `l1dder/rules/30-tech-stack.mdc` защищён от перезаписи при `update`, но этот репозиторий синхронизирует его в `.claude/rules/` и `.cursor/rules/` сборкой — проверю, что копии обновились.
- Тест на отсутствие «единственное исключение» охватывает только файлы этой задачи; README и путеводитель с той же фразой правятся в `TASK-04.03`, а общий поиск по `assets/` будет в `TASK-04.99`.
