import assert from "node:assert/strict";
import test from "node:test";
import { successSchema, healthSchema, apiErrorSchema } from "@carpool/contracts";
import { GET } from "../app/api/health/route";
import { corsHeaders } from "../lib/cors";
import { jsonError, jsonSuccess } from "../lib/http";

test("health is a typed foundation response, not a database readiness claim", async () => {
  const body = successSchema(healthSchema).parse(await GET().json());
  assert.equal(body.data.scope, "foundation-only");
});
test("CORS allows exact configured origins and demo header, never wildcard credentials", () => {
  const headers = corsHeaders("http://localhost:8081", " http://localhost:8081, http://127.0.0.1:8081 ");
  assert.equal(headers.get("Access-Control-Allow-Origin"), "http://localhost:8081");
  assert.ok(headers.get("Access-Control-Allow-Headers")?.includes("X-Demo-User-Id"));
  assert.equal(headers.has("Access-Control-Allow-Credentials"), false);
  for (const origin of [null, "http://localhost:8081.evil.invalid", "https://untrusted.invalid"]) {
    assert.equal(corsHeaders(origin, "http://localhost:8081").has("Access-Control-Allow-Origin"), false);
  }
});
test("shared HTTP helpers preserve status and explicit errors", async () => {
  const error = jsonError("VALIDATION_ERROR", "Invalid location.", { origin: ["Required."] });
  assert.equal(error.status, 400);
  apiErrorSchema.parse(await error.json());
  const response = jsonSuccess({ id: "ride" }, 201);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { data: { id: "ride" } });
});
