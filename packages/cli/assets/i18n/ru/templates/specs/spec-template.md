# {{FEATURE_NAME}} — Спецификация

<!--
  Шаблон: specs/current/spec.md
  Фаза Phase Machine: SPECIFY (создаётся /l1dder-specify)
  Используется: /l1dder-specify (slash-команда; scaffolding + AI-генерация)
  Парсится:
    - extractSummary() — секция ## Summary (dynamic zone, priority 1 — never trim)
    - parseSpecContract() — fenced yaml блок под ## AI Contract (machine-readable)
  Обновляется: в рамках фазы SPECIFY текущей итерации
  Ownership: Product Owner / Analyst / Designer (роли фазы SPECIFY)
  Lifecycle: краткосрочный (per-feature, одна итерация)

  Placeholder-маркеры:
    {{FEATURE_NAME}} — название фичи/задачи
    {{DATE}}         — дата создания
    {{AUTHOR}}       — автор (роль или имя)
    <!-- TODO: ... -- > — секции, требующие заполнения

  Структура (один spec bundle — отдельного ai-spec.md НЕТ):
    1) Human Summary — прозаические секции ниже (## Summary … ## Open Questions)
    2) AI Contract   — машиночитаемый блок ## AI Contract (ключи на английском)

  Migration note (legacy-спеки до этого контракта):
    Спеки без ## AI Contract остаются валидными. Doctor выдаёт warning с
    подсказкой по миграции, а не error. Чтобы мигрировать: добавьте
    ## AI Contract с yaml-ключами ниже (feature, usecases, decisions, models,
    test_contracts). Не создавайте второй файл.

  Валидация (l1dder doctor):
    - ## Summary существует и не пуст
    - ## Implementation Preferences существует (архитектурное требование)
    - ## AI Contract yaml валиден, если присутствует (warn если нет / fail если сломан)
    - Нет незаполненных {{...}} маркеров в финальном документе
    - Нет <!-- TODO --> без owner'а после завершения SPECIFY
-->

> **Фича:** {{FEATURE_NAME}} | **Дата:** {{DATE}} | **Автор:** {{AUTHOR}}

<!-- ========== Human Summary (проза для ревьюера-человека) ========== -->

## Summary

<!-- 5-8 строк: что за фича, какую проблему решает, масштаб изменений -->
<!-- extractSummary() читает ТОЛЬКО эту секцию в SUMMARY mode -->
<!-- Summary должен быть самодостаточным: прочитав его, LLM понимает задачу на 80% -->

<!-- TODO: Опишите фичу в 5-8 строк -->
{{FEATURE_NAME}} — <!-- краткое описание: что это и зачем (1 предложение) -->.

<!-- TODO: Добавьте 3-5 предложений: основная проблема, предлагаемое решение, scope -->

## Problem

<!-- Описание проблемы, которую решает эта фича -->
<!-- Что не работает / чего не хватает / какой gap существует? -->
<!-- Включить: пользовательскую боль, технический долг, или бизнес-потребность -->

<!-- TODO: Опишите проблему -->

### Current Behavior

<!-- TODO: Как система ведёт себя сейчас (или: "функционал отсутствует") -->

### Expected Behavior

<!-- TODO: Как система должна вести себя после реализации -->

## Solution

<!-- Высокоуровневое описание решения: ЧТО делаем (не КАК) -->
<!-- Фокус на пользовательском результате, не на технических деталях -->
<!-- Технические детали — в plan.md (фаза PLAN) -->

<!-- TODO: Опишите решение -->

## Implementation Preferences

<!-- ОБЯЗАТЕЛЬНАЯ СЕКЦИЯ (архитектурное требование — architecture.md, GSD-инсайт) -->
<!-- Ответы пользователя на уточняющие вопросы AI по деталям реализации -->
<!-- AI задаёт вопросы в зависимости от типа фичи, пользователь фиксирует ответы -->
<!-- Эта секция feed'ится в фазу PLAN как обязательный контекст -->

<!--
  Типовые вопросы по типу фичи:
  - Visual/UI: layout, плотность, состояния (loading/empty/error), accessibility, темизация
  - API/CLI: формат ответа, флаги, обработка ошибок, версионирование
  - Content: структура данных, тон, глубина, локализация
  - Integration: sync/async, retry-стратегия, fallback, таймауты
  - Data model: soft/hard delete, unique constraints, индексы
-->

<!-- TODO: Зафиксируйте предпочтения реализации (вопросы AI + ответы пользователя) -->

## Scope

<!-- Что входит в эту итерацию — явный список deliverables -->

<!-- TODO: Перечислите что входит -->
- <!-- deliverable 1 -->
- <!-- deliverable 2 -->
- <!-- deliverable 3 -->

## Out of Scope

<!-- Что явно НЕ входит в эту итерацию (bound expectations) -->
<!-- Помогает AI не расширять scope самостоятельно -->

<!-- TODO: Перечислите что НЕ входит -->
- <!-- исключение 1 -->
- <!-- исключение 2 -->

## Open Questions

<!-- Вопросы, которые остались без ответа после SPECIFY -->
<!-- Статус: blocking (блокирует PLAN) или deferred (можно решить позже) -->

<!-- TODO: Перечислите открытые вопросы (или удалите секцию если нет) -->

| # | Вопрос | Статус | Решение |
|---|--------|--------|---------|
| 1 | <!-- TODO --> | blocking / deferred | — |

<!-- ========== AI Contract (machine-readable; ключи остаются English) ========== -->

## AI Contract

<!--
  MACHINE-READABLE блок. Заголовок и YAML-ключи — English в любой локали.
  Замените placeholder ID на реальные registry ids. models/decisions могут быть [].
  usecases — непустой список. Ключ test_contracts обязателен (список может быть []).

  Спека на одну фичу использует `feature: FEAT-NNN` (как ниже). Спека итерации,
  покрывающей несколько фич, вместо этого пишет `iteration: <ID>` и список
  `features: [FEAT-NNN, ...]`. Обе формы валидны.
-->

```yaml
feature: FEAT-001
usecases:
  - UC-001-01
decisions: []
models: []
test_contracts:
  - TC-001-01-A
```
