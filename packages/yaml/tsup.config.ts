import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    testing: "src/testing.ts",
  },
  format: ["esm"],
  target: "node22",
  platform: "node",
  bundle: true,
  splitting: false,
  treeshake: true,
  sourcemap: true,
  dts: true,
  clean: true,
  shims: false,
  external: [/^@l1dder\//, "yaml", "zod"],
});
