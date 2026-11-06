import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(apiDir, "../..");
const database = join(apiDir, "prisma", "demo.db");
const env = {
  ...process.env,
  DATABASE_URL: `file:${database.split(sep).join("/")}`,
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || "http://localhost:8081,http://127.0.0.1:8081",
};
const prisma = join(root, "node_modules", "prisma", "build", "index.js");
const tsx = join(root, "node_modules", "tsx", "dist", "cli.mjs");
const next = join(root, "node_modules", "next", "dist", "bin", "next");
const [action, ...args] = process.argv.slice(2);

function run(script, scriptArgs) {
  const result = spawnSync(process.execPath, [script, ...scriptArgs], {
    cwd: apiDir, env, stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.NODE_ENV === "production") {
  console.error("The local demo commands cannot run with NODE_ENV=production.");
  process.exit(1);
}

if (action === "setup" && args.length === 0) {
  console.log(`Preparing local fictional demo database: ${database}`);
  run(prisma, ["generate"]);
  run(prisma, ["migrate", "deploy"]);
  run(tsx, ["prisma/demo-seed.ts"]);
} else if (action === "start" && args.length === 0) {
  const port = process.env.DEMO_API_PORT || "3000";
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    console.error("DEMO_API_PORT must be an integer between 1 and 65535.");
    process.exit(1);
  }
  if (!existsSync(database)) {
    console.error("Local demo database not found. Run npm run demo:setup first.");
    process.exit(1);
  }
  const host = process.env.DEMO_API_HOST || "127.0.0.1";
  console.log(`Starting local demo API using: ${database}`);
  run(next, ["dev", "--hostname", host, "--port", port]);
} else if (action === "reset" && args.length === 1 && args[0] === "--confirm") {
  console.log(`Resetting ONLY the local demo database: ${database}`);
  run(prisma, ["migrate", "reset", "--force", "--skip-seed"]);
  run(tsx, ["prisma/demo-seed.ts"]);
} else {
  console.error("Use demo:setup, demo:api, or demo:reset -- --confirm.");
  process.exit(1);
}
