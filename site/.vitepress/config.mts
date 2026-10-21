import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid(
  defineConfig({
    title: "L1DDER",
    description:
      "Spec-Driven & Roadmap-Gated AI Development Framework for Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode, and Cline",
    base: "/l1dder/",
    cleanUrls: true,
    locales: {
      root: {
        label: "Русский",
        lang: "ru",
        title: "L1DDER",
        description:
          "Spec-Driven & Roadmap-Gated фреймворк разработки с ИИ-агентами (Zero Hidden State)",
        themeConfig: {
          nav: [
            { text: "Главная", link: "/" },
            { text: "Быстрый старт", link: "/quickstart" },
            { text: "Потоки /l1-*", link: "/flows" },
            { text: "ИИ-Агенты и CLI", link: "/agents-cli" },
            { text: "Методология", link: "/methodology" },
            { text: "Шпаргалка", link: "/cheatsheet" },
          ],
          sidebar: [
            {
              text: "Путеводитель (Vibe-Coder Friendly)",
              items: [
                { text: "Обзор и главная схема", link: "/guide" },
                { text: "Быстрый старт за 3 минуты", link: "/quickstart" },
                { text: "Разбор 6 кнопок /l1-*", link: "/flows" },
                { text: "Шпаргалка и FAQ", link: "/cheatsheet" },
              ],
            },
            {
              text: "Справочник и Архитектура",
              items: [
                { text: "ИИ-Агенты и команды CLI", link: "/agents-cli" },
                { text: "Полная спецификация L1DDER", link: "/methodology" },
                { text: "Словарь терминов (Glossary)", link: "/glossary" },
              ],
            },
          ],
        },
      },
      en: {
        label: "English",
        lang: "en",
        link: "/en/",
        title: "L1DDER",
        description:
          "Spec-Driven & Roadmap-Gated AI Development Framework (Zero Hidden State)",
        themeConfig: {
          nav: [
            { text: "Home", link: "/en/" },
            { text: "Quickstart", link: "/en/quickstart" },
            { text: "Flows /l1-*", link: "/en/flows" },
            { text: "AI Agents & CLI", link: "/en/agents-cli" },
            { text: "Methodology", link: "/en/methodology" },
            { text: "Cheatsheet", link: "/en/cheatsheet" },
          ],
          sidebar: [
            {
              text: "Human Guide (Vibe-Coder Friendly)",
              items: [
                { text: "Overview & Visual Map", link: "/en/guide" },
                { text: "3-Minute Quickstart", link: "/en/quickstart" },
                { text: "Deep Dive into /l1-*", link: "/en/flows" },
                { text: "One-Page Cheatsheet & FAQ", link: "/en/cheatsheet" },
              ],
            },
            {
              text: "Reference & Architecture",
              items: [
                { text: "AI Agents & CLI Reference", link: "/en/agents-cli" },
                { text: "Full L1DDER Specification", link: "/en/methodology" },
                { text: "Domain Glossary", link: "/en/glossary" },
              ],
            },
          ],
        },
      },
    },
    themeConfig: {
      socialLinks: [
        { icon: "github", link: "https://github.com/ledvanoff/l1dder" },
      ],
      search: {
        provider: "local",
      },
    },
  }),
);
