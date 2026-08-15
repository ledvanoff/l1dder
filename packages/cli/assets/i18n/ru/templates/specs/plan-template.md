# {{FEATURE_NAME}} — Технический план

<!--
  Шаблон: specs/current/plan.md
  Фаза Phase Machine: PLAN (создаётся /l1dder-plan)
  Используется: /l1dder-plan (slash-команда; scaffolding + AI-генерация на основе spec.md)
  Парсится: extractSummary() — секция ## Summary (dynamic zone, priority 1 — never trim)
  Обновляется: в рамках фазы PLAN текущей итерации
  Ownership: Architect / Tech Lead (роли фазы PLAN)
  Lifecycle: краткосрочный (per-feature, одна итерация)
  Входы: specs/current/spec.md (включая Implementation Preferences + AI Contract)

  Placeholder-маркеры:
    {{FEATURE_NAME}} — название фичи/задачи (из spec.md)
    {{DATE}}         — дата создания
    {{AUTHOR}}       — автор (роль или имя)
    <!-- TODO: ... -- > — секции, требующие заполнения

  Migration note:
    Планы без секций Coverage / Test Contracts остаются валидными.
    При обновлении выровняйте Coverage и Test Contracts с id из AI Contract
    в spec.md. Отдельного ai-spec.md / ai-plan.md нет.

  Валидация (l1dder doctor):
    - ## Summary существует и не пуст
    - ## File Changes содержит хотя бы одну запись
    - ## Coverage перечисляет FEAT/UC, которые покрывает план (совпадают с AI Contract)
    - ## Test Contracts перечисляет обязательные TC-* id (совпадают с AI Contract)
    - spec.md существует и завершён (prerequisite)
    - Нет незаполненных {{...}} маркеров в финальном документе
-->

> **Фича:** {{FEATURE_NAME}} | **Дата:** {{DATE}} | **Автор:** {{AUTHOR}}

## Summary

<!-- 5-8 строк: технический подход, ключевые решения, уровень риска -->
<!-- extractSummary() читает ТОЛЬКО эту секцию в SUMMARY mode -->
<!-- Summary должен быть самодостаточным: прочитав его, LLM понимает план на 80% -->

<!-- TODO: Опишите технический план в 5-8 строк -->
Технический план реализации {{FEATURE_NAME}}.

<!-- TODO: Добавьте: выбранный подход (1-2 предложения), затрагиваемые компоненты, оценка сложности (low/medium/high), основной риск -->

## Coverage

<!-- Какие FEAT/UC покрывает этот план — ОБЯЗАНЫ совпадать с AI Contract в spec.md -->

| Kind | Id | Notes |
|------|----|-------|
| feature | FEAT-001 | <!-- TODO: замените на реальный FEAT-* из AI Contract --> |
| usecase | UC-001-01 | <!-- TODO: перечислите каждый UC-*, покрытый планом --> |

## Options Considered + Recommended

<!-- Discovery/plan-mode: 2-3 варианта; ровно один помечен как RECOMMENDED -->
<!-- Варианты можно перенести в ADR и state.decisions[] для значимых решений -->

| # | Option | Pros | Cons | Verdict |
|---|---|---|---|---|
| 1 | <!-- TODO --> | | | recommended / rejected |
| 2 | <!-- TODO --> | | | recommended / rejected |

**Recommended:** <!-- TODO: рекомендуемый вариант и краткое обоснование -->

## Technical Approach

<!-- Выбранный технический подход с обоснованием -->
<!-- Если были альтернативы — кратко описать почему выбрано именно это -->
<!-- Ссылки на паттерны из architecture.md / design/*.md если применимо -->

<!-- TODO: Опишите подход -->

### Approach

<!-- TODO: Детальное описание выбранного подхода -->

### Alternatives Considered

<!-- TODO: Альтернативы и почему отвергнуты (или: "очевидный подход, альтернатив нет") -->

| # | Альтернатива | Плюсы | Минусы | Почему отвергнута |
|---|---|---|---|---|
| 1 | <!-- TODO --> | | | |

## Architecture Impact

<!-- Какие архитектурные артефакты затрагивает эта фича -->
<!-- Используется для To-Be Knowledge Update после discovery -->

### Knowledge Files Affected

<!-- TODO: Какие knowledge-файлы потребуют обновления после реализации -->

| Файл | Тип изменения | Что именно |
|------|---------------|------------|
| `knowledge/to-be/architecture.md` | update / none | <!-- TODO --> |
| `knowledge/to-be/erd.md` | update / none | <!-- TODO --> |
| `knowledge/to-be/usecases.md` | update / none | <!-- TODO --> |
| `knowledge/to-be/integrations.md` | update / none | <!-- TODO --> |

### Design Decisions

<!-- TODO: Новые архитектурные решения, принятые в этом плане (если есть) -->
<!-- Формат: краткое решение + обоснование; ссылайтесь на DEC-* id когда они назначены -->

## File Changes

<!-- Конкретный список файлов/модулей, которые будут созданы/изменены/удалены -->
<!-- Основа для декомпозиции на задачи (фаза TASKS) -->

<!-- TODO: Заполните таблицу -->

| Файл / модуль | Действие | Описание изменений |
|----------------|----------|-------------------|
| <!-- TODO --> | create / modify / delete | <!-- TODO --> |

## Plan Dependencies

<!-- Зависимости от других задач / итераций / Agent Sessions (не npm-пакеты) -->
<!-- Выравнивайте с roadmap rails и depends_on в tasks.md где применимо -->

<!-- TODO: Перечислите блокирующую работу вне этого плана (или: "none") -->

| Depends on | Kind | Why |
|------------|------|-----|
| <!-- напр. HARD-5 / T-11 / ITER-003 --> | iteration / task / session | <!-- TODO --> |

## Dependencies

<!-- Внешние зависимости: новые пакеты, сервисы, API -->
<!-- Если зависимостей нет — секцию можно удалить -->

### New Packages

<!-- TODO: Новые npm-пакеты (или: "новые зависимости не требуются") -->

| Пакет | Версия | Назначение | Размер (approx) |
|-------|--------|-----------|-----------------|
| <!-- TODO --> | | | |

### External Services

<!-- TODO: Внешние сервисы/API (или: "не применимо") -->

## Test Contracts

<!-- Обязательные Test Contracts плана — id ОБЯЗАНЫ совпадать с AI Contract в spec.md -->
<!-- Каждый TC реализуется вместе с кодом (Contract-First). Формат: "given X → expect Y" -->

<!-- TODO: Перечислите TC-* id и однострочные behavioral expectations -->

| Id | Requirement |
|----|-------------|
| TC-001-01-A | <!-- TODO: given X → expect Y --> |

## Risks

<!-- Технические риски и стратегии митигации -->
<!-- Если рисков нет — секцию можно удалить -->

<!-- TODO: Перечислите риски -->

| # | Риск | Вероятность | Влияние | Митигация |
|---|------|-------------|---------|-----------|
| 1 | <!-- TODO --> | low / medium / high | low / medium / high | <!-- TODO --> |
