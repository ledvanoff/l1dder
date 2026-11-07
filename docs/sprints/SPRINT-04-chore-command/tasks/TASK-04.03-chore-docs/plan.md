# TASK-04.03: Описание `/l1-chore` простым языком и тексты без чисел скиллов и команд — План (Plan)

| Поле паспорта задачи | Значение |
|----------------------|----------|
| **ID задачи спринта** | `TASK-04.03` |
| **ID шага спеки** | `FEAT-005.03` ([`docs/specs/FEAT-005-chore-command/tasks.md`](../../../../specs/FEAT-005-chore-command/tasks.md)) |
| **ID родительского спринта** | [`SPRINT-04`](../../README.md) |
| **ID родительской фичи / спеки** | [`FEAT-005`](../../../../backlog.md#feat-005) ([`docs/specs/FEAT-005-chore-command/`](../../../../specs/FEAT-005-chore-command/)) |
| **ID родительской идеи** | [`IDEA-004`](../../../../ideas.md#idea-004) |
| **Тип задачи** | `docs` |
| **Статус задачи** | `✅ реализована` |
| **Git-ветка** | `dev` (правило ежедневной работы из `30-tech-stack.mdc`) |
| **Прочитанные скиллы (`40-skills-router.mdc`)** | `ponytail`, `tdd` |

---

## 1. Цель задачи и фильтр `ponytail` (6-Step Decision Ladder)

**Цель:** человек, который читает `README`, путеводитель или сайт, понимает простыми словами, для чего `/l1-chore` (правки самого проекта: правила git, CI, библиотеки, `Makefile`, правила агента). В тексте документации, сайта и сообщений CLI больше нет чисел скиллов и команд: команды перечисляются по именам, а число 21 остаётся только в тесте манифеста (`US-4`, `US-5`).

**Решение пользователя на `⛔ СТОП №1`:** счётчики в тексте не обновляем, а убираем — они устаревают при каждой новой команде и читателю почти ничего не дают.

**Фильтр `ponytail`:**
- **Что переиспользуем:** текст раздела «Для чего эта команда» из скилла `/l1-chore` и статью «Служебная правка» из `GLOSSARY.md` (одни и те же примеры везде); устройство разделов про `/l1-hotfix` в каждом документе — `/l1-chore` встаёт рядом с ним тем же форматом; страницы сайта `guide`, `quickstart`, `flows`, `cheatsheet`, `methodology`, `glossary` собираются из `assets/i18n/*/` сами (`scripts/sync-site-docs.mjs`), их копии в `site/` руками не трогаем.
- **От чего отказываемся:** новой страницы сайта нет (и новой записи в `seo.mts` для страницы); `site/.vitepress/og-card.html` не трогаем (`requirements.md`, раздел 5); `docs/concept/*` — это `TASK-04.99`.
- **Публичный шов для тестирования (новый `Seam 5`, подтверждён):** `tests/chore-skill.test.ts` — документация для человека на RU и EN:
  - путеводитель (`user-guide/README.md`, `02-FLOWS-IN-DETAIL.md`, `03-CHEATSHEET.md`), `README.md` в `assets/`, `onboarding/continue-project.md` и `METHODOLOGY.md` упоминают `/l1-chore`, а раздел о нём в `02-FLOWS-IN-DETAIL.md` содержит пример про git;
  - в этих файлах, корневом `README.md`, вручную написанных страницах сайта (`site/index.md`, `site/agents-cli.md`) и `site/.vitepress/{config,seo}.mts` нет числа рядом со словами «скилл / skill / команд / command / кноп / button / цепоч / chain» и нет фраз «единственное исключение» / «only exception».
  - Ловит: возврат числа и забытый файл или язык при следующей смене состава команд. Не ловит: понятность текста — её проверяет человек на UAT в `TASK-04.99`.

---

## 2. Состав работ (Пошаговый чек-лист)

Каждый срез: один тест → видим, что он падает на своём поведении → правка RU и EN → `GREEN`.

- [x] Шаг 1 (срез 1, путеводитель): тест «`/l1-chore` есть в `user-guide/README.md`, `02-FLOWS-IN-DETAIL.md`, `03-CHEATSHEET.md`, раздел в `02` с примером про git» → `RED` →
  - `user-guide/README.md`: пункт про `/l1-chore` простыми словами в списке команд, цепочка `/l1-chore` в главной схеме;
  - `02-FLOWS-IN-DETAIL.md`: раздел «🧹 Кнопка 6: `/l1-chore` — правки самого проекта» (для чего, примеры, схема `mermaid` из 4 шагов, чем отличается от `/l1-hotfix`), исключения в абзаце про `Roadmap Gate`;
  - `03-CHEATSHEET.md` и `01-QUICKSTART.md`: строка «хочу поменять правила git / CI / библиотеки» → `/l1-chore`, команда в списке.
- [x] Шаг 2 (срез 2, README и онбординг): тест «`/l1-chore` есть в `assets/i18n/*/README.md` и `onboarding/continue-project.md`» → `RED` → строка в таблице команд README (рядом с `/l1-hotfix`), строка в таблице `continue-project.md`.
- [x] Шаг 3 (срез 3, `METHODOLOGY.md`): тест «есть поток `/l1-chore`» → `RED` → «Поток 6: Служебная правка (`/l1-chore`)» и подграф в общей схеме; `/l1-evo` становится «Потоком 7» (ссылок на якоря этих заголовков в репозитории нет).
- [x] Шаг 4 (срез 4, страж): тест «нет числа рядом со словами про скиллы, команды, кнопки и цепочки и нет „единственное исключение“ в файлах `Seam 5`» → `RED` на текущих строках → правки без чисел:
  - корневой `README.md` (EN, витрина GitHub): «Slash Commands (`/l1-*`)», строка `/l1-chore` в таблице, «Bundled Skills Out-of-the-Box: `/l1-*` workflow skills + `ponytail` + `mattpocock/skills`»;
  - `assets/i18n/*/README.md`, `user-guide/README.md`: «встроенные скиллы (управляющие `/l1-*`, `ponytail`, `mattpocock/skills`)», «слэш-команды», «главная схема рабочих цепочек», `/l1-hotfix` без «единственное исключение»;
  - `site/index.md`, `site/en/index.md`: слоган и карточки без чисел;
  - `site/agents-cli.md`, `site/en/agents-cli.md`: без чисел, `"l1-chore"` в примере `skills.json`, `/l1-chore` в списке команд;
  - `site/.vitepress/config.mts`: «Разбор кнопок /l1-*»;
  - `site/.vitepress/seo.mts`: описание страницы `flows` на RU и EN с `/l1-chore` в пределах 160 символов (лимит проверяет `make ci`).
- [x] Шаг 5 (одна строка в CLI): сообщение `doctor` «Все ключевые правила и 21 базовый скилл…» → «Все ключевые правила и встроенные скиллы…» (RU и EN, `src/installer.ts`); тест в `tests/cli.test.ts` на это сообщение не завязан, проверю `make doctor`.
- [x] Шаг 6: `make ci` и `make site-gate`. Если гейт остановится из-за намеренно изменённого текста или меню, обновлю снимок через `make site-baseline` и укажу причину в коммите («`/l1-chore` и тексты без чисел»).
- [x] Шаг 7: самопроверка по DoD + ревью диффа по `ponytail-review` + просмотр страниц `flows` и главной в браузере (`make dev`).
- [x] ⛔ **СТОП №2:** Показать отчёт самопроверки DoD + 2-строчный футер `ponytail` (`Ponytail skipped` / `Risk`) и дождаться «ок».
- [x] Шаг 8 (только после второго «ок»): `summary.md` и статус `TASK-04.03` (`FEAT-005.03`) `✅ реализована` в 4 файлах:
  1. `docs/sprints/SPRINT-04-chore-command/README.md`
  2. `docs/specs/FEAT-005-chore-command/tasks.md`
  3. `docs/backlog.md`
  4. `docs/roadmap.md` (счётчик `3/4 (+ TASK-04.99)`)

---

## 3. Критерии готовности (DoD)

**Агент проверяет:**

| # | Критерий | Точная команда / способ проверки |
|---|----------|----------------------------------|
| 1 | Документация для человека на RU и EN упоминает `/l1-chore`, чисел скиллов и команд в тексте нет, формулировки исключений согласованы (`Seam 5`) | `npx vitest run tests/chore-skill.test.ts` |
| 2 | Сайт собирается, ссылки, якоря, `sitemap.xml`, `llms.txt` и SEO-теги в порядке | `make ci` (включает `make test-e2e` и `make doctor`) |
| 3 | Сайт не хуже снимка | `make site-gate` |
| 4 | Страницы `flows` и главная выглядят правильно, схемы `mermaid` рендерятся | Просмотр в браузере (`make dev`) |

**Пользователь проверяет (при желании):**

- Раздел «Кнопка 6: `/l1-chore`» в путеводителе: понятно ли вайбкодеру, для чего команда.

---

## 4. Артефакты и границы Scope

**Трогаем:**
- `README.md` (корень), `assets/i18n/{ru,en}/README.md`, `assets/i18n/{ru,en}/METHODOLOGY.md`.
- `assets/i18n/{ru,en}/user-guide/README.md`, `01-QUICKSTART.md`, `02-FLOWS-IN-DETAIL.md`, `03-CHEATSHEET.md`.
- `assets/i18n/{ru,en}/onboarding/continue-project.md`.
- `site/index.md`, `site/en/index.md`, `site/agents-cli.md`, `site/en/agents-cli.md`, `site/.vitepress/config.mts`, `site/.vitepress/seo.mts`.
- `src/installer.ts` — одна строка сообщения `doctor` (RU и EN).
- `tests/chore-skill.test.ts` — `Seam 5`.
- При необходимости `docs/site-baseline.json` через `make site-baseline` (с причиной в коммите).
- Сгенерированное сборкой: `./l1dder/`, страницы `site/` из `assets/`.

**НЕ трогаем (вне Scope):**
- Правила, скиллы и шаблоны — сделано в `TASK-04.01` и `TASK-04.02`.
- Число 21 в `tests/cli.test.ts` (`listDeclaredSkills()`): там оно проверяет манифест и остаётся.
- Поле `agent` в `assets/releases.json` и вывод `update` — это `TASK-04.04`.
- `docs/concept/*`, EN-статья `Hotfix` в словаре — `TASK-04.99`.
- `site/.vitepress/og-card.html`, `assets/releases.json`.
- Выкатка сайта: правки уедут на сайт со следующим релизом или по отдельной просьбе.

---

## 5. Риски и открытые вопросы

- Корневой `README.md` и описание в npm обновляются только с релизом: до выпуска на GitHub в `main` останутся старые числа.
- Страж ищет число рядом с ключевыми словами; законные числа вроде «до 7 вопросов» или «6 этапов» онбординга он пропускает, потому что рядом нет этих слов. Если найдётся ложное срабатывание, сузю шаблон, а не уберу проверку.
