// SEO data lives here, not in page frontmatter: scripts/sync-site-docs.mjs overwrites some pages from assets/i18n/.
export const SITE_URL = "https://ledvanoff.github.io/l1dder/";

export const SEO_PAGES: Readonly<Record<string, { title: string; description: string }>> = {
  "index.md": {
    title: "L1DDER — spec-driven разработка с ИИ-агентами",
    description:
      "Spec-driven фреймворк: идеи, спеки и роадмап в Markdown и слэш-команды /l1-*. Для Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode и Cline.",
  },
  "guide.md": {
    title: "Как работать с L1DDER: обзор и главная схема",
    description:
      "Путеводитель по L1DDER простым языком: как проходит работа от идеи до готового продукта и почему ИИ-агент не теряет контекст между задачами.",
  },
  "quickstart.md": {
    title: "Быстрый старт L1DDER: установка и живой пример работы",
    description:
      "Как подключить L1DDER к проекту одной командой или фразой в чат и пройти с ИИ-агентом путь от первой идеи до готовой фичи.",
  },
  "flows.md": {
    title: "Слэш-команды /l1-*: разбор всех цепочек L1DDER",
    description:
      "Зачем нужны /l1-onboard, /l1-idea, /l1-feature, /l1-planning, /l1-task, /l1-hotfix, /l1-chore и /l1-fast, когда их вызывать и что они создают.",
  },
  "cheatsheet.md": {
    title: "Шпаргалка и FAQ по L1DDER: что делать прямо сейчас",
    description:
      "Какую команду вызвать в текущей ситуации, что значат статусы идей, фич и задач, и ответы на частые вопросы о работе с L1DDER.",
  },
  "agents-cli.md": {
    title: "ИИ-агенты и команды CLI в L1DDER",
    description:
      "Какие файлы L1DDER создаёт для Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode и Cline, и как работают init, update, sync и skills.",
  },
  "methodology.md": {
    title: "Методология L1DDER: spec-driven разработка с ИИ-агентами",
    description:
      "Полное описание цикла L1DDER: роадмап как источник истины, сквозные ID, правило двух согласований и обязательная проверка в конце спринта.",
  },
  "glossary.md": {
    title: "Словарь терминов L1DDER",
    description:
      "Что значат термины методологии L1DDER: концепт, идея, спека, спринт, задача, хотфикс и другие, в порядке потока работы.",
  },
  "troubleshooting.md": {
    title: "Не видны слэш-команды /l1-* в L1DDER: как исправить",
    description:
      "Что делать, если команды L1DDER не появляются в Cursor, Claude Code, Codex или другом агенте: обновление, проверка файла и частые случаи.",
  },
  "en/index.md": {
    title: "L1DDER — Spec-Driven Development with AI Agents",
    description:
      "A spec-driven framework: ideas, specs and roadmap in Markdown, plus /l1-* slash commands. For Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode and Cline.",
  },
  "en/guide.md": {
    title: "How L1DDER Works: Overview and Visual Map",
    description:
      "A plain-language guide to L1DDER: how work moves from an idea to a finished product and why your AI agent keeps its context between tasks.",
  },
  "en/quickstart.md": {
    title: "L1DDER Quickstart: Installation and a Live Example",
    description:
      "Add L1DDER to a project with one command or one chat message, then go from your first idea to a finished feature with your AI agent.",
  },
  "en/flows.md": {
    title: "Slash Commands /l1-*: Every L1DDER Flow Explained",
    description:
      "What /l1-onboard, /l1-idea, /l1-feature, /l1-planning, /l1-task, /l1-hotfix, /l1-chore and /l1-fast are for, when to run them and what each creates.",
  },
  "en/cheatsheet.md": {
    title: "L1DDER Cheatsheet and FAQ: What to Do Right Now",
    description:
      "Which command to run in your current situation, what the idea, feature and task statuses mean, and answers to common L1DDER questions.",
  },
  "en/agents-cli.md": {
    title: "AI Agents and CLI Commands in L1DDER",
    description:
      "Which files L1DDER creates for Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode and Cline, and how init, update, sync and skills work.",
  },
  "en/methodology.md": {
    title: "L1DDER Methodology: Spec-Driven Development with AI Agents",
    description:
      "The full L1DDER cycle: the roadmap as the source of truth, end-to-end IDs, the two-approval rule and the mandatory end-of-sprint check.",
  },
  "en/glossary.md": {
    title: "L1DDER Glossary",
    description:
      "What the L1DDER terms mean: concept, idea, spec, sprint, task, hotfix and more, in the order of the workflow.",
  },
  "en/troubleshooting.md": {
    title: "L1DDER Slash Commands /l1-* Not Showing: How to Fix",
    description:
      "What to do when L1DDER commands don't appear in Cursor, Claude Code, Codex or another agent: updating, checking the file and common cases.",
  },
};

function pageUrl(relativePath: string): string {
  return SITE_URL + relativePath.replace(/(^|\/)index\.md$/, "$1").replace(/\.md$/, "");
}

function pageLinks(includes: (relativePath: string) => boolean): string[] {
  return Object.entries(SEO_PAGES)
    .filter(([relativePath]) => includes(relativePath))
    .map(([relativePath, { title, description }]) => `- [${title}](${pageUrl(relativePath)}): ${description}`);
}

export function renderLlmsTxt(): string {
  return [
    "# L1DDER",
    "",
    "> L1DDER is a spec-driven development framework for AI coding agents: ideas, specs, roadmap and tasks live in Markdown, and /l1-* slash commands drive the work. Works with Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode and Cline.",
    "",
    "## Документация на русском",
    "",
    ...pageLinks((path) => !path.startsWith("en/")),
    "",
    "## English documentation",
    "",
    ...pageLinks((path) => path.startsWith("en/")),
    "",
    "## Project",
    "",
    "- [GitHub](https://github.com/ledvanoff/l1dder)",
    "- [npm](https://www.npmjs.com/package/l1dder)",
    "",
  ].join("\n");
}

export function buildPageSeo(relativePath: string) {
  const page = SEO_PAGES[relativePath];
  if (page === undefined) {
    throw new Error(`No SEO entry for ${relativePath}: add it to site/.vitepress/seo.mts`);
  }
  const ruPath = relativePath.replace(/^en\//, "");
  const ru = pageUrl(ruPath);
  const en = pageUrl(`en/${ruPath}`);
  const url = pageUrl(relativePath);
  const isEnglish = relativePath.startsWith("en/");
  const head: [string, Record<string, string>][] = [
    ["link", { rel: "canonical", href: url }],
    ["link", { rel: "alternate", hreflang: "ru", href: ru }],
    ["link", { rel: "alternate", hreflang: "en", href: en }],
    ["link", { rel: "alternate", hreflang: "x-default", href: en }],
    ["meta", { property: "og:title", content: page.title }],
    ["meta", { property: "og:description", content: page.description }],
    ["meta", { property: "og:url", content: url }],
    ["meta", { property: "og:locale", content: isEnglish ? "en_US" : "ru_RU" }],
    ["meta", { property: "og:locale:alternate", content: isEnglish ? "ru_RU" : "en_US" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "L1DDER" }],
    ["meta", { property: "og:image", content: `${SITE_URL}og-card.png` }],
    ["meta", { property: "og:image:width", content: "1200" }],
    ["meta", { property: "og:image:height", content: "630" }],
    ["meta", { property: "og:image:alt", content: "L1DDER: Spec-Driven Development with AI Agents" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
  ];
  return { ...page, head };
}
