import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  target: "node22",
  platform: "node",
  outDir: "dist",
  clean: true,
  bundle: true,
  splitting: false,
  sourcemap: true,
});
