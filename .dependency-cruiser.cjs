/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "core-must-not-depend-on-runtime",
      comment: "@l1dder/core is the foundation — no deps on higher-layer packages",
      severity: "error",
      from: { path: "^packages/core" },
      to: { path: "^packages/(state|knowledge|context|adapter-|cli)" },
    },
    {
      name: "schemas-must-not-depend-on-l1dder",
      comment: "@l1dder/schemas is a leaf — depends only on zod",
      severity: "error",
      from: { path: "^packages/schemas" },
      to: { path: "^packages/(core|yaml|state|knowledge|context|adapter-|cli)" },
    },
    {
      name: "yaml-must-not-depend-on-higher-layers",
      comment: "@l1dder/yaml depends only on @l1dder/core and eemeli/yaml",
      severity: "error",
      from: { path: "^packages/yaml" },
      to: { path: "^packages/(schemas|state|knowledge|context|adapter-|cli)" },
    },
    {
      name: "state-and-knowledge-must-not-cross",
      comment: "state and knowledge are independent peers on Layer 3",
      severity: "error",
      from: { path: "^packages/state" },
      to: { path: "^packages/knowledge" },
    },
    {
      name: "knowledge-and-state-must-not-cross",
      comment: "knowledge and state are independent peers on Layer 3",
      severity: "error",
      from: { path: "^packages/knowledge" },
      to: { path: "^packages/state" },
    },
    {
      name: "context-must-not-depend-on-state-or-knowledge",
      comment: "context receives data via injection, not package deps",
      severity: "error",
      from: { path: "^packages/context" },
      to: { path: "^packages/(state|knowledge)" },
    },
    {
      name: "adapters-must-not-cross",
      comment: "IDE adapters are independent — Cursor doesn't know about Claude",
      severity: "error",
      from: { path: "^packages/(adapter-[a-z]+)" },
      to: { path: "^packages/adapter-", pathNot: "^packages/$1" },
    },
    {
      name: "no-one-depends-on-cli",
      comment: "cli is the composition root — nothing imports from it",
      severity: "error",
      from: { pathNot: "^packages/cli" },
      to: { path: "^packages/cli" },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
