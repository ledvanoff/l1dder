import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/cli/index.ts" },
  format: ["esm"],
  target: "node22",
  platform: "node",
  bundle: true,
  // Internal workspace packages are private and never published to npm, so they
  // must be inlined into the single CLI bundle (DEC-RL-4). Third-party runtime
  // deps (commander, picocolors, @inquirer/prompts) stay external and are
  // installed from npm via `dependencies`.
  noExternal: [/^@l1dder\//],
  splitting: false,
  treeshake: true,
  sourcemap: true,
  dts: false,
  clean: true,
  shims: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
  onSuccess: "node scripts/copy-assets.mjs",
});
