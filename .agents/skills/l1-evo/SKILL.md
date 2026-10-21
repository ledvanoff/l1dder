---
name: l1-evo
description: Evolves and refines the L1DDER framework itself using 100% dogfooding (applying ponytail, grilling, domain-modeling, codebase-design, and the Two-Approval Rule from l1dder/evolution/METHODOLOGY-RULES.md), synchronizes all rules/skills/templates/user-guide, logs iterations in WORKLOG-CHANGELOG.md, and updates HANDOFF.md on request. Use when the user invokes /l1-evo or asks to modify the methodology or prepare a methodology handoff.
argument-hint: "[change description | handoff]"
---

# L1DDER — Meta Flow: Эволюция методологии через Догфудинг (`/l1-evo`)

> **ПРАВИЛО ДЛЯ МОДЕЛИ (100% DOGFOODING):** Доработка самой методологии `L1DDER` подчиняется **тем же законам, философии и скиллам**, что и разработка кода в `L1DDER`:
> 1. **Правило двух согласований (`⛔ СТОП №1` после плана и `⛔ СТОП №2` после самопроверки перед записью в чейнджлог).**
> 2. **Опрос развилок по `grilling` (`❓ Q1 ➡️ Рекомендация`).**
> 3. **Фильтр `ponytail` (6-ступенчатая лестница + `Deletion beats addition` + 2-строчный футер `Ponytail skipped / Risk`).**
> 4. **Глубокие модули `codebase-design` (`Deletion Test`) и единый словарь `domain-modeling` (`l1dder/GLOSSARY.md`).**

---

## ШАГ 1: Прочитай правила эволюции и текущее состояние

Вызови инструмент `Read` для 4 файлов:
1. `l1dder/evolution/METHODOLOGY-RULES.md` *(правила догфудинга, `Core vs Stack`, матрица полной синхронизации)*
2. `l1dder/evolution/HANDOFF.md` *(текущий слепок состояния методологии)*
3. `l1dder/evolution/WORKLOG-CHANGELOG.md` *(история изменений)*
4. `l1dder/skills/ponytail/SKILL.md` *(дисциплина минимализма)*

Выбери ветку:
- **Ветка А:** Пользователь попросил только создать/обновить **Handoff** (`/l1-evo handoff` или «сделай хэндофф») → перейди сразу к **ШАГУ 5**.
- **Ветка Б:** Пользователь предложил **доработку самой методологии** → иди строго по **ШАГАМ 2 → 3 → 4 → 5**.

---

## ШАГ 2: Фаза 1 (`Plan` + `grilling` + Фильтр `ponytail`) и `⛔ СТОП №1`

1. **Проведи развилки через `grilling`:** если есть варианты реализации правила/шаблона, задай вопросы в формате:
   ```markdown
   ❓ **Q1 — [Название развилки]**: [Варианты + факты]
   ➡️ **Рекомендация:** [Самый простой и надёжный вариант, принимаемый словом «ок»]
   ```
2. **Примени фильтр `ponytail` и `codebase-design` (`Deletion Test`):**
   - Можно ли решить задачу 1–2 строками в существующем файле вместо создания нового файла/скилла?
   - Сохраняется ли разделение `Core` (не зависит от языка) vs `Stack` (`30-tech-stack.mdc`, `40-skills-router.mdc`, `ci/`)?
   - Сохраняется ли сквозная цепочка ID и пошаговый формат для слабых моделей?
3. Выведи пользователю **План доработки методологии**:
   - **Цель изменения:** 1 предложение.
   - **Оценка `BREAKING CHANGES` (Ломающие изменения):** явно укажи, ломает ли это изменение обратную совместимость (`Да: [что именно и как мигрировать]` / `Нет`).
   - **Фильтр `ponytail`:** что переиспользуем из текущих правил и от каких лишних усложнений отказываемся.
   - **Список файлов по Матрице полной синхронизации (`Single Change = Full Sync`):** какие именно файлы в `l1dder/rules/`, `l1dder/skills/`, `l1dder/templates/`, `l1dder/METHODOLOGY.md`, `l1dder/GLOSSARY.md`, `l1dder/user-guide/`, `assets/releases.json`, `CHANGELOG.md` трогаем.
4. ⛔ **СТОП №1:** Спроси: *«План доработки `L1DDER` готов. Вносим изменения (ок / правки)?»* Не меняй файлы до слова «ок».

---

## ШАГ 3: Фаза 2 (`Implement` по Матрице полной синхронизации) *(ТОЛЬКО после первого «ок»)*

1. Внеси изменения строго в согласованный список файлов внутри `l1dder/`.
2. **Железное правило синхронизации скиллов и правил агентов:**
   - После правки файлов в `l1dder/skills/` или `l1dder/rules/` запусти `npx l1dder sync` (или обнови копии в папках активных агентов `.cursor/`, `.claude/`, `.agents/`, `.windsurf/`, `.github/`), чтобы все агенты получили актуальные правила.
   - Если появился новый термин — он синхронно добавляется в `l1dder/GLOSSARY.md` (`domain-modeling`).

---

## ШАГ 4: Фаза 3 (`Self-check`: `ponytail-review` + двухосевой `code-review`) и `⛔ СТОП №2`

1. Проверь внесённые изменения по двум осям (`code-review` + `ponytail-review`):
   - **Ось 1 (`Standards`):** нет ли воды, противоречий между файлами, битых ссылок, нарушений `Core vs Stack` и расхождений между `l1dder/skills/` и папками агентов.
   - **Ось 2 (`Spec`):** решена ли задача пользователя полностью.
2. ⛔ **СТОП №2:** Покажи пользователю краткий отчёт о проверке, завершив его **обязательным 2-строчным футером `ponytail`**:
   - **Ponytail skipped (от каких лишних наворотов в правилах отказались):** `[1 строка]`
   - **Risk (на что обратить внимание при использовании):** `[1 строка]`
   Спроси: *«Самопроверка доработки методологии пройдена. Фиксируем итерацию в `WORKLOG-CHANGELOG.md` (и обновляем ли `HANDOFF.md`) (ок)?»*

---

## ШАГ 5: Фаза 4 (`Confirm & Record`: запись в `WORKLOG-CHANGELOG.md`, `CHANGELOG.md`, `assets/releases.json` и `HANDOFF.md`) *(после второго «ок»)*

1. Добавь новую запись на самый верх раздела истории в `l1dder/evolution/WORKLOG-CHANGELOG.md` (а при разработке самого репозитория `L1DDER` — также в `CHANGELOG.md` и `assets/releases.json`):
   - Номер версии / итерации и дата (`YYYY-MM-DD`);
   - Задача автора;
   - **Явный блок `BREAKING CHANGES` (Ломающие изменения):** заполни массив `breaking` (`ru` и `en`) в `assets/releases.json` и секцию `### ⚠️ BREAKING CHANGES` в `CHANGELOG.md` (чтобы пользователи при вызове `npx l1dder@latest update` получили предупреждение и подтвердили обновление);
   - Список `Added` / `Changed` / `Removed` и обоснование принятых решений.
2. Если пользователь просил подготовить хэндофф (или это завершение этапа доработки методологии) — обнови `l1dder/evolution/HANDOFF.md`.
