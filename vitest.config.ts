import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["packages/*/src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "integration",
          include: ["packages/*/tests/**/*.integration.test.ts"],
          environment: "node",
          testTimeout: 10_000,
        },
      },
      {
        test: {
          name: "e2e",
          include: ["packages/cli/tests/e2e/**/*.e2e.test.ts"],
          environment: "node",
          testTimeout: 60_000,
        },
      },
    ],
  },
});
