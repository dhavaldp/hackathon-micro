import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { join } from "node:path";

const script = join(process.cwd(), "apps", "api", "scripts", "demo.mjs");

test("demo reset requires explicit confirmation", () => {
  const result = spawnSync(process.execPath, [script, "reset"], {
    encoding: "utf8", env: { ...process.env, NODE_ENV: "development" },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /demo:reset -- --confirm/);
});

test("local demo commands refuse production mode", () => {
  for (const args of [["setup"], ["start"], ["reset", "--confirm"]]) {
    const result = spawnSync(process.execPath, [script, ...args], {
      encoding: "utf8", env: { ...process.env, NODE_ENV: "production" },
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /cannot run with NODE_ENV=production/);
  }
});

test("local demo rejects invalid port configuration", () => {
  const result = spawnSync(process.execPath, [script, "start"], {
    encoding: "utf8", env: { ...process.env, NODE_ENV: "development", DEMO_API_PORT: "not-a-port" },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /DEMO_API_PORT must be an integer/);
});
