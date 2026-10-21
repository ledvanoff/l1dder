import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/cli.ts" },
  format: ["esm"],
  target: "node20",
  platform: "node",
  bundle: true,
  splitting: false,
  treeshake: true,
  sourcemap: false,
  dts: false,
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
