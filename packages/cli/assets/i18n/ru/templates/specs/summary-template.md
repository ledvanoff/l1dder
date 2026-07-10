# {{FEATURE_NAME}} — Итоговая ретроспектива

<!--
  Шаблон: specs/current/summary.md (или запись, добавляемая в archive/worklog.md)
  Фаза Phase Machine: COMPLETE (заполняется при выполнении скилла complete-iteration)
  Используется: скилл complete-iteration — структурная ретроспектива «план vs факт + уроки»
  Назначение: зафиксировать что реализовано, где отклонились от плана, принятые решения,
              проблемы и их решения, итог DoD и что дальше.
  Lifecycle: краткосрочный (per-iteration); долговременная запись живёт в archive/worklog.md
  Источник: AI-Driven Methodology summary-template (M5)

  Placeholder-маркеры (ДОЛЖНЫ быть идентичны в en/ru):
    {{FEATURE_NAME}} — название фичи/итерации (из spec.md)
    {{DATE}}         — дата закрытия
    {{AUTHOR}}       — автор (роль или имя)
    <!-- TODO: ... -- > — секции, требующие заполнения

  Примечание: это advisory-шаблон, не CLI-артефакт. Нет команды l1dder, которая его
              генерирует; скилл complete-iteration предлагает AI заполнить его.
-->

> **Фича:** {{FEATURE_NAME}} | **Дата:** {{DATE}} | **Автор:** {{AUTHOR}}

## Implemented

<!-- TODO: Перечислите, что реально сделано — артефакты и однострочное описание каждого -->
- `path/to/artifact` — <!-- TODO: что делает -->
- `path/to/artifact` — <!-- TODO: что делает -->

## Deviations from Plan

<!-- TODO: Что изменилось относительно plan.md и почему. Если ничего — напишите «нет отклонений». -->

## Decisions

<!-- TODO: Архитектурные/технические решения, принятые в процессе. Если значимо — создайте ADR. -->

- **Decision:** <!-- TODO --> — **Rationale:** <!-- TODO --> — **ADR/link:** <!-- TODO (если есть) -->

## Problems & Resolutions

<!-- TODO: Что пошло не так и как починили. -->

- **Problem:** <!-- TODO --> → **Resolution:** <!-- TODO -->

## DoD Result

<!-- TODO: Скопируйте acceptance criteria из plan.md/tasks.md; отметьте pass/fail с пояснением -->

- [ ] <!-- TODO: критерий из plan.md --> — pass/fail + пояснение
- [ ] <!-- TODO: критерий из plan.md --> — pass/fail + пояснение
- [ ] Lint passes
- [ ] Tests pass

## Next

<!-- TODO: Следующая задача/итерация и нерблокирующие хвосты -->
- <!-- TODO -->
