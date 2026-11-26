// Bundle the migrate and seed scripts into plain ESM files for the production image,
// so the container runs them with `node` and needs neither tsx nor the full node_modules.
// @node-rs/argon2 stays external: it is a native module and Next's standalone output
// already ships it (the app uses it for sign-in).
import { build } from "esbuild";

await build({
  entryPoints: { migrate: "src/db/migrate.ts", seed: "src/db/seed/index.ts" },
  outdir: "dist-db",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  external: ["@node-rs/argon2"],
  // Bundled CommonJS deps may call require() for Node built-ins
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: "info",
});
