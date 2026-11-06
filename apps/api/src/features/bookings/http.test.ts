import assert from "node:assert/strict";
import { test } from "node:test";
import { handleBookingRequest } from "./http";
import { configureBookingRepository } from "./runtime";
import { BookingError, type BookingRepository } from "./types";

const stubRepository: BookingRepository = {
  transaction: () => Promise.reject(new Error("unused")),
};

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/test", { method: "POST", headers });
}

test("missing X-Demo-User-Id returns 400 INVALID_INPUT without calling the operation", async () => {
  let called = false;
  const response = await handleBookingRequest(request(), async () => {
    called = true;
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, "INVALID_INPUT");
  assert.equal(called, false);
});

test("blank X-Demo-User-Id is rejected", async () => {
  const response = await handleBookingRequest(request({ "X-Demo-User-Id": "   " }), async () => ({}));
  assert.equal(response.status, 400);
});

test("success wraps data in an envelope with the trimmed actor and custom status", async () => {
  configureBookingRepository(stubRepository);
  let actor = "";
  const response = await handleBookingRequest(
    request({ "X-Demo-User-Id": " rider-1 " }),
    async (service, actorId) => {
      actor = actorId;
      assert.equal(typeof service.bookRide, "function");
      return { ok: true };
    },
    201,
  );

  assert.equal(response.status, 201);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  assert.deepEqual(await response.json(), { data: { ok: true } });
  assert.equal(actor, "rider-1");
});

test("BookingError maps to its status and error body", async () => {
  const response = await handleBookingRequest(request({ "X-Demo-User-Id": "u" }), async () => {
    throw new BookingError("RIDE_FULL", "This ride has no seats available.", 409);
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: { code: "RIDE_FULL", message: "This ride has no seats available." },
  });
});

test("unexpected errors return a generic 500 without leaking details", async () => {
  const response = await handleBookingRequest(request({ "X-Demo-User-Id": "u" }), async () => {
    throw new Error("secret db detail");
  });

  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.error.code, "INTERNAL_ERROR");
  assert.doesNotMatch(JSON.stringify(body), /secret/);
});
