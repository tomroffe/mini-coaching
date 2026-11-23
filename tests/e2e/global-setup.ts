import { execSync } from "node:child_process";
import postgres from "postgres";

export default async function globalSetup() {
  try {
    process.loadEnvFile();
  } catch {}
  const base = process.env.DATABASE_URL ?? "postgres://crc:crc@localhost:5433/crc";
  const admin = postgres(base, { max: 1 });
  await admin.unsafe("DROP DATABASE IF EXISTS crc_test WITH (FORCE)");
  await admin.unsafe("CREATE DATABASE crc_test");
  await admin.end();
  const env = { ...process.env, DATABASE_URL: base.replace(/\/[^/]+$/, "/crc_test"), SEED_ADMIN_EMAIL: "admin@example.com", SEED_ADMIN_PASSWORD: "change-me-now" };
  execSync("pnpm exec tsx src/db/migrate.ts", { env, stdio: "inherit" });
  execSync("pnpm exec tsx src/db/seed/index.ts", { env, stdio: "inherit" });
}
