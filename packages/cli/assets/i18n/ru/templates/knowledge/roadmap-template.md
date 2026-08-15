# Roadmap — {{PROJECT_NAME}}

<!--
  Шаблон: knowledge/roadmap.md
  Используется: l1dder init (scaffolding)
  Парсится: extractSummary() — секция ## Summary
  Обновляется: после каждой Agent Session, которая меняет план, статусы или пулы
  Ownership: Product Owner / автор проекта

  Плейсхолдеры, которые подставляет 'l1dder init': PROJECT_NAME, DATE, AUTHOR.

  Примечание: roadmap.md — человекочитаемый control plane. НЕ делится на as-is/to-be.
  Machine state живёт отдельно; произвольный prose этого файла не парсится.
-->

> **Дата:** {{DATE}} | **Автор:** {{AUTHOR}}

<!--
  Как пользоваться этим файлом
  - Это ваш control plane: держите его коротким и удобным для быстрого сканирования.
  - CLI хранит machine state отдельно и не парсит свободный prose здесь.
  - Порядок вех фиксирован: IDEA → PRODUCT → ARCH → INTEGRATIONS → DATA → STANDARDS → READY.
  - Обход gate — только с явной письменной причиной (Decision / waiver).
-->

## Summary

<!-- Цель продукта и граница MVP. extractSummary() читает ТОЛЬКО эту секцию. -->
<!-- TODO: Один короткий абзац — как выглядит успех первого shippable продукта -->

{{PROJECT_NAME}} — <!-- цель продукта в 2–4 предложениях -->.

### В MVP

- <!-- TODO: обязательная возможность первого релиза -->

### Не в MVP

- <!-- TODO: явно отложено (с кратким «почему») -->

## Discovery Control Plane

<!-- Statuses: pending | brainstorming | planned | in_progress | in_review | complete | not_applicable -->
<!-- not_applicable допустим только для INTEGRATIONS и STANDARDS — и только с письменным rationale. -->
<!-- Держите ровно одну текущую открытую веху; закройте или waive перед переходом дальше. -->

| Milestone | Status | Brainstorm summary | Planned Agent Sessions | Evidence |
|-----------|--------|--------------------|------------------------|----------|
| IDEA | pending | <!-- TODO: проблема, аудитория, альтернативы --> | <!-- напр. AS-IDEA-1 --> | <!-- ссылка или заметка --> |
| PRODUCT | pending | — | — | — |
| ARCH | pending | — | — | — |
| INTEGRATIONS | pending | — | — | — |
| DATA | pending | — | — | — |
| STANDARDS | pending | — | — | — |
| READY | pending | — | — | — |

## MVP Feature Map

<!-- IDs: FEAT-NNN, UC-NNN-MM (первая часть номера должна совпадать с родительским FEAT). Замените примеры. -->

| Feature | Use cases | Status | Notes |
|---------|-----------|--------|-------|
| FEAT-001 — Example core capability <!-- example — replace --> | UC-001-01, UC-001-02 | planned | <!-- example — replace --> |
| FEAT-002 — Example supporting capability <!-- example — replace --> | UC-002-01 | planned | <!-- example — replace --> |

## Delivery Plan

<!-- Стабильные ID итераций/сессий. depends_on — список предыдущих ID. Замените примерную строку. -->

| ID | Scope | depends_on | Covers (FEAT/UC) | Status |
|----|-------|------------|------------------|--------|
| ITER-001 / AS-001 <!-- example — replace --> | <!-- example scope --> | — | FEAT-001 / UC-001-01 | pending |

## Риски и решения

| Risk / Decision | Impact | Mitigation / link |
|-----------------|--------|-------------------|
| <!-- TODO или DEC-001 --> | <!-- high / medium / low --> | <!-- ссылка или заметка --> |

## Technical Debt

<!-- Parking lot для неблокирующих дефектов и осознанных shortcuts. IDs: DEBT-NNN. -->
<!-- Lifecycle: open → nominated → scheduled → done | wontfix. Auto-schedule запрещён. -->
<!-- Severity: low | medium | high. Blocker/critical сюда не кладём. -->

### DEBT-001 — Example deferred cleanup <!-- example — replace -->

- **severity:** medium
- **status:** open
- **What:** <!-- краткое описание долга -->
- **Why deferred:** <!-- почему отложили -->
- **How to pick up:** <!-- Hygiene / Delivery / Quick после nomination -->

## Long-term Backlog

<!-- Отложенные feature / scope / research / infra. IDs: BL-NNN. -->
<!-- Lifecycle: open → nominated → scheduled → done | wontfix. Auto-schedule запрещён. -->
<!-- BL-* становится FEAT-* только через сессию Feature Discovery. -->
<!-- priority: P1 | P2 | P3 · kind: feature | scope | research | infra -->

### BL-001 — Example future initiative <!-- example — replace -->

- **priority:** P2
- **kind:** feature
- **status:** open
- **What:** <!-- краткое описание -->
- **Why deferred:** <!-- почему не в MVP -->
- **How to pick up:** <!-- Feature Discovery → FEAT-* → Delivery Plan -->
