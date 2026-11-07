# TASK-05.04: `/l1-fast` и отклонение спринта простым языком в `README`, `METHODOLOGY.md`, `user-guide/*` и на сайте — План (Plan)

| Поле паспорта задачи | Значение |
|----------------------|----------|
| **ID задачи спринта** | `TASK-05.04` |
| **ID шага спеки** | `FEAT-006.04` ([`docs/specs/FEAT-006-fast-mode/tasks.md`](../../../../specs/FEAT-006-fast-mode/tasks.md)) |
| **ID родительского спринта** | [`SPRINT-05`](../../README.md) |
| **ID родительской фичи / спеки** | [`FEAT-006`](../../../../backlog.md#feat-006) ([`docs/specs/FEAT-006-fast-mode/`](../../../../specs/FEAT-006-fast-mode/)) |
| **ID родительской идеи** | [`IDEA-005`](../../../../ideas.md#idea-005) |
| **Тип задачи** | `docs` |
| **Статус задачи** | `✅ реализована` |
| **Git-ветка** | `dev` |
| **Прочитанные скиллы (`40-skills-router.mdc`)** | `ponytail`, `tdd`, `writing-for-agents` |

---

## 1. Цель задачи и фильтр `ponytail` (6-Step Decision Ladder)

**Цель:** Описать простым языком на RU и EN команду `/l1-fast` (для небольшой фичи продукта без начатого спринта, которую вызывает строго только человек, а агенту по своей инициативе запускать запрещено) и отклонение текущего спринта с откатом (`git revert`, статус `❌ отклонена`) в `README`, `METHODOLOGY.md`, путеводителе `user-guide/*`, `onboarding/continue-project.md` и на сайте документации.

**Фильтр `ponytail` (заполнить до написания кода):**
- **Что переиспользуем из репозитория / платформы / установленных пакетов:** формулировки из раздела «Для чего эта команда» в `skills/l1-fast/SKILL.md` и статьи «Быстрый режим (`/l1-fast`)» в `GLOSSARY.md`; структуру разделов про `/l1-chore` из `TASK-04.03`; автосинхронизацию страниц сайта `guide`, `quickstart`, `flows`, `cheatsheet`, `methodology`, `glossary` через `scripts/sync-site-docs.mjs` при `make build`.
- **От чего намеренно отказываемся (`Ponytail skipped` / YAGNI):** не создаём новых отдельных страниц сайта, не меняем `site/.vitepress/og-card.html` и не правим руками генерируемые страницы в `site/{guide,quickstart,flows,cheatsheet,methodology,glossary}.md`.
- **Публичные швы для тестирования (`Pre-agreed Test Seams`):**
  - `tests/fast-skill.test.ts` (человеческая документация на RU и EN):
    - `user-guide/README.md`, `user-guide/01-QUICKSTART.md`, `user-guide/02-FLOWS-IN-DETAIL.md`, `user-guide/03-CHEATSHEET.md`, `README.md`, `onboarding/continue-project.md` и `METHODOLOGY.md` на RU и EN описывают `/l1-fast` и отклонение спринта;
    - раздел `/l1-fast` в `02-FLOWS-IN-DETAIL.md` и `METHODOLOGY.md` явно указывает, что команду вызывает строго человек (агенту по своей инициативе запрещено), что `1 (CURRENT)` должна быть пуста и что документы помечаются `режим: /l1-fast` / `mode: /l1-fast`;
    - в `03-CHEATSHEET.md` у спринтов и задач указан статус `❌ отклонена` / `❌ rejected`;
    - корневой `README.md`, `site/agents-cli.md`, `site/en/agents-cli.md` и `site/.vitepress/seo.mts` включают `/l1-fast`.
  - Существующий страж в `tests/chore-skill.test.ts`: во всех обновлённых файлах нет устаревающих счётчиков скиллов/команд (`COUNTED_WORDS`) и фраз «единственное исключение».

---

## 2. Состав работ (Пошаговый чек-лист)

- [x] Шаг 1 (`tdd` срез 1 — путеводитель `user-guide/*`): Добавить в `tests/fast-skill.test.ts` тесты на `user-guide/README.md`, `01-QUICKSTART.md`, `02-FLOWS-IN-DETAIL.md` и `03-CHEATSHEET.md` на RU и EN (`RED`), затем обновить эти файлы (схема и список команд в `README.md`, список в `01-QUICKSTART.md`, раздел «⚡ Кнопка 7: `/l1-fast`» и отклонение спринта в `02-FLOWS-IN-DETAIL.md`, таблица ситуаций, статус `❌ отклонена` и FAQ в `03-CHEATSHEET.md`) (`GREEN`).
- [x] Шаг 2 (`tdd` срез 2 — `README`, `continue-project.md`, `METHODOLOGY.md` и сайт): Добавить в `tests/fast-skill.test.ts` тесты на `assets/i18n/{ru,en}/README.md`, `onboarding/continue-project.md`, `METHODOLOGY.md`, корневой `README.md`, `site/{,en/}agents-cli.md` и `site/.vitepress/seo.mts` (`RED`), внести изменения во все эти файлы (`GREEN`).
- [x] Шаг 3: Запустить `make ci` и `make site-gate` (проверить сборку 18 страниц сайта, длины SEO-описаний ≤ 160 символов, отсутствие счётчиков в `tests/chore-skill.test.ts` и `doctor`) и провести ревью диффа по `ponytail-review`.
- [x] ⛔ **СТОП №2:** Показать пользователю отчёт самопроверки DoD + обязательный 2-строчный футер `ponytail` (`Ponytail skipped` / `Risk`) и дождаться слова «ок».
- [x] Шаг 4 (только после второго «ок»): Создать `summary.md` и обновить статус `TASK-05.04` (`FEAT-006.04`) на `✅ реализована` в 4 файлах:
  1. `docs/sprints/SPRINT-05-fast-mode/README.md`
  2. `docs/specs/FEAT-006-fast-mode/tasks.md`
  3. `docs/backlog.md`
  4. `docs/roadmap.md` (счётчик прогресса спринта `4/4 (+ TASK-05.99)`)

---

## 3. Критерии готовности (DoD)

**Агент проверяет (исполняемые команды):**

| # | Критерий | Точная команда / способ проверки |
|---|----------|----------------------------------|
| 1 | Документация для человека (`user-guide/*`, `README.md`, `continue-project.md`, `METHODOLOGY.md`, `site/agents-cli.md`, `seo.mts`) на RU и EN содержит `/l1-fast` (с правилом «вызывает строго человек») и отклонение спринта | `npx vitest run tests/fast-skill.test.ts` |
| 2 | Ни в одном файле документации и сайта не появились счётчики скиллов/команд, а описания в `seo.mts` укладываются в лимит 160 символов | `npx vitest run tests/chore-skill.test.ts tests/seo.test.ts` |
| 3 | Линтер и проверка типов проходят без ошибок | `make lint && make typecheck` |
| 4 | Полный цикл `make ci` и `make site-gate` (сборка сайта, проверка 18 страниц, `sitemap.xml`, `llms.txt`, снимок `site-baseline.json`, `doctor`) проходит с 0 ошибок | `make ci && make site-gate` |

**Пользователь проверяет (при необходимости):**

- Понятность описания кнопки `/l1-fast` и отклонения спринта в путеводителе `user-guide/02-FLOWS-IN-DETAIL.md` и шпаргалке `03-CHEATSHEET.md`.

---

## 4. Артефакты и границы Scope

**Трогаем (создаём или меняем только эти файлы):**
- `assets/i18n/{ru,en}/user-guide/README.md`, `01-QUICKSTART.md`, `02-FLOWS-IN-DETAIL.md`, `03-CHEATSHEET.md`
- `assets/i18n/{ru,en}/onboarding/continue-project.md`
- `assets/i18n/{ru,en}/README.md` и корневой `README.md`
- `assets/i18n/{ru,en}/METHODOLOGY.md`
- `site/agents-cli.md`, `site/en/agents-cli.md`, `site/.vitepress/seo.mts`
- `tests/fast-skill.test.ts`
- Производные файлы от `make build`: `./l1dder/` и синхронизируемые страницы в `./site/`

**НЕ трогаем (вне Scope):**
- Правила `00/20/40-*.mdc`, скиллы `l1-fast/SKILL.md`, `l1-planning/SKILL.md` и шаблоны — закрыты в `TASK-05.01..03`.
- `docs/concept/*` и живые E2E-прогоны в песочницах — это финальная задача `TASK-05.99` (`Doctor Checklist`).
- `assets/releases.json` — меняется только при выпуске релиза.

---

## 5. Риски и открытые вопросы

- В `site/.vitepress/seo.mts` описание страниц `flows.md` и `en/flows.md` ограничено 160 символами (проверяется в `tests/seo.test.ts` и `scripts/check-site.mjs`); подготовленные строки имеют длину 142 и 148 символов.
- Во всех текстах избегаем цифр рядом со словами «скилл / skill / команд / command / кноп / button / цепоч / chain», чтобы не задеть страж `COUNTED_WORDS` в `tests/chore-skill.test.ts`.
