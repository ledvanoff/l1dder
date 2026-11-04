# SPRINT-02: SEO-база сайта и витрин без поломок сайта

| Поле паспорта спринта | Значение |
|-----------------------|----------|
| **ID спринта** | `SPRINT-02` |
| **ID родительской фичи / спеки** | [`FEAT-003`](../../backlog.md#feat-003) ([`docs/specs/FEAT-003-seo-foundation/`](../../specs/FEAT-003-seo-foundation/)) |
| **ID родительской идеи** | [`IDEA-003`](../../ideas.md#idea-003) |
| **Позиция в Роадмапе** | [`docs/roadmap.md`](../../roadmap.md) |
| **Статус спринта** | `✅ реализована` |
| **Дата открытия / закрытия** | 2026-11-01 / 2026-11-04 |

---

## 1. Цель спринта

Дать поисковикам и ИИ-ассистентам корректные данные о L1DDER на сайте, GitHub и npm (`FEAT-003`, `IDEA-003`) и строго доказать перед релизом, что сайт работает не хуже, чем до спринта.

---

## 2. Критерии готовности спринта (Sprint DoD)

Спринт `SPRINT-02` может быть переведён в `✅ реализована` только после закрытия всех задач, включая финальную `TASK-02.99`:

| # | Критерий | Способ проверки |
|---|----------|-----------------|
| 1 | У всех 18 страниц свои заголовок и описание, канонический адрес и `hreflang` | Тесты `seo.mts` + `scripts/check-site.mjs` |
| 2 | `sitemap.xml` содержит ровно 18 рабочих адресов с путём `/l1dder/` | `scripts/check-site.mjs` |
| 3 | Превью с картинкой 1200×630 работает, `llms.txt` содержит все страницы | `scripts/check-site.mjs` + проверка живого сайта |
| 4 | Витрины GitHub, npm и README обновлены | `gh repo view`, `npm view` после релиза |
| 5 | **Гейт сайта:** сборка не хуже снимка, браузерная проверка пройдена, отчёт показан человеку | Гейт из [`tasks.md`](../../specs/FEAT-003-seo-foundation/tasks.md) |
| 6 | Сайт подтверждён в Google Search Console и Яндекс Вебмастере, sitemap отправлен | Ручной шаг автора проекта |
| 7 | **Doctor Checklist & E2E (`TASK-02.99`):** `make ci` + полный E2E-прогон агентом без ошибок | `make ci` + E2E-проверка агентом |
| 8 | **Living Docs Sync (`TASK-02.99`):** обновлены `docs/concept/`, `docs/specs/FEAT-003-seo-foundation/`, `l1dder/rules/` | Проверка `git diff` по документации и правилам |
| 9 | **Human UAT (`TASK-02.99`):** ручное тестирование пройдено и подтверждено человеком («ок») | Явный апрув человека в задаче `TASK-02.99` |
| 10 | **Правила SEO (`TASK-02.99`):** в `l1dder/rules/30-tech-stack.mdc` и `AGENTS.md` закреплены таблица `seo.mts` для новых страниц и отношение к заголовкам в выдаче | Проверка `git diff` по правилам |

---

## 3. Таблица задач спринта (`TASK-02.MM` ↔ `FEAT-003.MM`)

| ID задачи спринта | ID шага спеки | Название задачи | Тип | Статус | Plan | Summary |
|:-----------------:|:-------------:|-----------------|:---:|--------|------|---------|
| `TASK-02.01` | `FEAT-003.01` | Снимок сайта до правок и автоматическая проверка сборки в `make test-e2e` | `chore` | ✅ реализована | [plan](tasks/TASK-02.01-site-baseline-check/plan.md) | [summary](tasks/TASK-02.01-site-baseline-check/summary.md) |
| `TASK-02.02` | `FEAT-003.02` | Модуль SEO, `sitemap.xml`, тексты и языковые связи для всех 18 страниц | `feat` | ✅ реализована | [plan](tasks/TASK-02.02-seo-module/plan.md) | [summary](tasks/TASK-02.02-seo-module/summary.md) |
| `TASK-02.03` | `FEAT-003.03` | Карточка превью, Open Graph и Twitter | `feat` | ✅ реализована | [plan](tasks/TASK-02.03-preview-card/plan.md) | [summary](tasks/TASK-02.03-preview-card/summary.md) |
| `TASK-02.04` | `FEAT-003.04` | `llms.txt` из общей таблицы страниц | `feat` | ✅ реализована | [plan](tasks/TASK-02.04-llms-txt/plan.md) | [summary](tasks/TASK-02.04-llms-txt/summary.md) |
| `TASK-02.05` | `FEAT-003.05` | Витрины: описание и темы GitHub, начало README, `description` и `keywords` в npm | `chore` | ✅ реализована | [plan](tasks/TASK-02.05-showcases/plan.md) | [summary](tasks/TASK-02.05-showcases/summary.md) |
| `TASK-02.99` | `FEAT-003.99` | **Гигиена спринта и Doctor Checklist (E2E + UAT + Docs Sync)**: браузерный гейт сайта и только после него релиз | `chore` | ✅ реализована | [plan](tasks/TASK-02.99-doctor/plan.md) | [summary](tasks/TASK-02.99-doctor/summary.md) |

---

## 4. Итог спринта

- **Что поставлено по `FEAT-003` (`IDEA-003`):** в `dev` готовы заголовки и описания всех 18 страниц, `sitemap.xml`, канонические адреса и `hreflang`, карточка превью, `llms.txt`, новые `README.md` и метаданные npm, автоматическая проверка сборки и гейт сайта внутри `make release`. Уже работают: описание и темы на GitHub, корневой сайт и подтверждение в Google и Яндексе. Сайт L1DDER, npm и README получат изменения только со следующим релизом: `v1.0.3` не выпускался по решению пользователя.
- **Обновления в долгосрочной доке (`concept` / `rules` / `specs`):** `l1dder/rules/30-tech-stack.mdc` (раздел 5), `AGENTS.md`, `docs/concept/architecture.md`, `docs/specs/FEAT-003-seo-foundation/`. ADR не понадобился.
- **Новые идеи / техдолг, вынесенные в `docs/ideas.md` или `docs/backlog.md`:** критерии 3, 4 и 6 из таблицы готовности выполнены частично, остаток записан как [шаги после следующего релиза](../../backlog.md#feat-003).
