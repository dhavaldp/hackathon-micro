import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_USER_HEADER } from "@carpool/contracts";
import { fixtures } from "@carpool/contracts/fixtures";
import { CarpoolApiError, createLiveCarpoolApi } from "../src/carpool/api";

test("live adapter validates payloads, adds selected actor headers, and encodes resource IDs", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    return Response.json({
      data: { booking: fixtures.bookings[0], ride: fixtures.rides[0] },
    }, { status: 201 });
  };

  try {
    const api = createLiveCarpoolApi("http://localhost:3000/");
    const result = await api.book("ride/one", "demo-rider");
    assert.equal(result.booking.id, "booking-active");
    assert.equal(requests[0].url, "http://localhost:3000/api/rides/ride%2Fone/bookings");
    assert.equal(new Headers(requests[0].init?.headers).get(DEMO_USER_HEADER), "demo-rider");
    assert.equal(requests[0].init?.method, "POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("live adapter surfaces structured API errors and rejects invalid response shapes", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    error: { code: "RIDE_FULL", message: "No seats remain." },
  }, { status: 409 });

  try {
    const api = createLiveCarpoolApi("https://example.invalid");
    await assert.rejects(api.book("ride-full", "demo-rider"), (error: unknown) =>
      error instanceof CarpoolApiError && error.code === "RIDE_FULL" && error.message === "No seats remain.",
    );

    globalThis.fetch = async () => Response.json({ data: [{ id: "incomplete" }] });
    await assert.rejects(api.listUsers(), /invalid response/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("live adapter requires configured absolute HTTP(S) URL", async () => {
  await assert.rejects(createLiveCarpoolApi(undefined).listUsers(), /Set EXPO_PUBLIC_API_BASE_URL/);
  await assert.rejects(createLiveCarpoolApi("file:///tmp/api").listUsers(), /must use HTTP or HTTPS/);
});
