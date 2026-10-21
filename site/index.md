---
layout: home

hero:
  name: "L1DDER"
  text: "Spec-Driven & Roadmap-Gated AI Development"
  tagline: "Управляй разработкой сложных продуктов через 6 слэш-команд (/l1-*) и слово «ок». Никакого скрытого state.yml — только чистые Markdown-документы со сквозными ID. Работает в Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode и Cline."
  actions:
    - theme: brand
      text: "⚡ Быстрый старт (3 мин)"
      link: /quickstart
    - theme: alt
      text: "🗺 Главная схема и обзор"
      link: /guide
    - theme: alt
      text: "🤖 ИИ-Агенты и CLI"
      link: /agents-cli

features:
  - icon: 🎯
    title: "Zero Hidden State"
    details: "Никаких хрупких state.yml и блокирующих git-хуков. Единственный источник истины — твои файлы docs/roadmap.md, docs/backlog.md и docs/ideas.md."
  - icon: 🔗
    title: "Железная матрёшка сквозных ID"
    details: "Каждый документ хранит паспорт всех своих родителей (IDEA-001 → FEAT-001 → SPRINT-01 → TASK-01.01..99). Даже слабая модель никогда не потеряет контекст."
  - icon: 🩺
    title: "Doctor Checklist в конце каждого спринта"
    details: "Ни один спринт не закрывается без задачи TASK-NN.99: полный прогон CI, двухосевой code-review, E2E-проверка, синхронизация долгосрочной доки и твой ручной UAT."
  - icon: ✂️
    title: "Встроенная дисциплина Ponytail + Matt Pocock"
    details: "В коробку вшиты скиллы ponytail (Lazy Senior Dev), grilling (умный опрос с рекомендациями), codebase-design (Deep Modules) и вертикальный TDD по швам."
  - icon: 🤖
    title: "Мульти-агентная установка за 1 секунду"
    details: "Одна команда npx l1dder init разворачивает папку l1dder/ и настраивает правила и скиллы для Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode и Cline."
  - icon: 🌍
    title: "Полная поддержка RU и EN"
    details: "Все правила, 11 скиллов, шаблоны документов и путеводитель для человека поставляются на русском (--lang ru) и английском (--lang en) языках."
---

## Установка: через чат ИИ-агента или терминал

### 🤖 Способ 1: Попроси своего ИИ-агента сделать всё самому (даже не открывая терминал)
Просто скопируй и отправь одну фразу в чат **Cursor, Claude Code или Codex**:

```text
Установи в этот проект фреймворк L1DDER командой `npx l1dder@latest init --lang ru --yes`, а затем сразу начни онбординг по `l1dder/skills/l1-onboard/SKILL.md`
```

Агент сам выполнит `npx l1dder@latest init --yes`, прочитает инструкцию из вывода CLI и сразу перейдёт к Шагу 1 настройки твоего проекта!

### 💻 Способ 2: Вручную в терминале

```bash
# Интерактивная установка (выбор языка ru/en и твоих агентов)
npx l1dder init

# Или в одну строку без вопросов (по умолчанию ставит для Cursor, Claude Code и Codex):
npx l1dder init --lang ru --yes
```

Затем открой чат своего агента и введи `/l1-onboard`.
