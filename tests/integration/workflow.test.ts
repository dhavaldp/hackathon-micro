import assert from "node:assert/strict";
import test from "node:test";
import {
  API_PATHS, DEMO_USER_HEADER, activitySchema, apiErrorSchema, bookingMutationSchema,
  demoUserSchema, rideCancellationSchema, rideSchema,
} from "@carpool/contracts";
import { createLiveCarpoolApi } from "../../apps/mobile/src/carpool/api";

// Runs against a live API with migrated, seeded SQLite:
//   INTEGRATION_API_BASE_URL=http://localhost:3000 npx tsx --test tests/integration/*.test.ts
const base = process.env.INTEGRATION_API_BASE_URL;
const skip = base ? false : "Set INTEGRATION_API_BASE_URL to run against a live API (Modules 2-4 required).";

async function call(path: string, init: { method?: string; actor?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.actor) headers[DEMO_USER_HEADER] = init.actor;
  const response = await fetch(`${base}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return { status: response.status, json: (await response.json()) as { data?: unknown; error?: unknown } };
}

const inHours = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

async function users() {
  const { json } = await call(API_PATHS.demoUsers);
  const list = demoUserSchema.array().parse(json.data);
  assert.ok(list.length >= 3, "seed must provide at least three demo users");
  return list;
}

async function offer(driver: string, seatCapacity: number) {
  const { status, json } = await call(API_PATHS.rides, {
    method: "POST", actor: driver,
    body: { origin: "Integration Origin", destination: "Integration Dest", departureTime: inHours(48), seatCapacity },
  });
  assert.equal(status, 201);
  return rideSchema.parse(json.data);
}

const errorCode = (json: unknown) => apiErrorSchema.parse(json).error.code;

test("offer, search, book, duplicate, self-booking, cancel, rebook", { skip }, async () => {
  const [driver, rider] = await users();
  const ride = await offer(driver.id, 1);
  const found = await call(`${API_PATHS.rides}?origin=integration%20origin`);
  assert.ok(rideSchema.array().parse(found.json.data).some((r) => r.id === ride.id));

  const self = await call(API_PATHS.book(ride.id), { method: "POST", actor: driver.id });
  assert.equal(self.status, 403);
  assert.equal(errorCode(self.json), "SELF_BOOKING");

  const booked = await call(API_PATHS.book(ride.id), { method: "POST", actor: rider.id });
  assert.equal(booked.status, 201);
  const { booking, ride: afterBook } = bookingMutationSchema.parse(booked.json.data);
  assert.equal(afterBook.remainingSeats, 0);

  const dup = await call(API_PATHS.book(ride.id), { method: "POST", actor: rider.id });
  assert.equal(errorCode(dup.json), "DUPLICATE_BOOKING");

  const cancelled = await call(API_PATHS.cancelBooking(booking.id), { method: "POST", actor: rider.id });
  assert.equal(bookingMutationSchema.parse(cancelled.json.data).ride.remainingSeats, 1);
  const again = await call(API_PATHS.cancelBooking(booking.id), { method: "POST", actor: rider.id });
  assert.equal(bookingMutationSchema.parse(again.json.data).ride.remainingSeats, 1, "repeat cancel must not restore twice");

  const rebooked = await call(API_PATHS.book(ride.id), { method: "POST", actor: rider.id });
  assert.equal(rebooked.status, 201);
});

test("concurrent bookings never exceed capacity", { skip }, async () => {
  const list = await users();
  const [driver, ...riders] = list;
  const ride = await offer(driver.id, 1);
  const results = await Promise.all(
    riders.map((rider) => call(API_PATHS.book(ride.id), { method: "POST", actor: rider.id })),
  );
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  for (const r of results.filter((x) => x.status !== 201)) assert.ok([409, 503].includes(r.status));
  const { json } = await call(`${API_PATHS.rides}?origin=integration%20origin`);
  assert.equal(rideSchema.array().parse(json.data).find((r) => r.id === ride.id)?.remainingSeats, 0);
});

test("driver cancellation cancels bookings and blocks new ones; actors enforced", { skip }, async () => {
  const [driver, rider, other] = await users();
  const ride = await offer(driver.id, 2);
  const booked = await call(API_PATHS.book(ride.id), { method: "POST", actor: rider.id });
  const { booking } = bookingMutationSchema.parse(booked.json.data);

  const wrong = await call(API_PATHS.cancelRide(ride.id), { method: "POST", actor: other.id });
  assert.equal(errorCode(wrong.json), "WRONG_ACTOR");
  const wrongBooking = await call(API_PATHS.cancelBooking(booking.id), { method: "POST", actor: other.id });
  assert.equal(errorCode(wrongBooking.json), "WRONG_ACTOR");

  const done = await call(API_PATHS.cancelRide(ride.id), { method: "POST", actor: driver.id });
  assert.deepEqual(rideCancellationSchema.parse(done.json.data).cancelledBookingIds, [booking.id]);
  const late = await call(API_PATHS.book(ride.id), { method: "POST", actor: other.id });
  assert.equal(errorCode(late.json), "RIDE_CANCELLED");

  const activity = await call(API_PATHS.activity, { actor: rider.id });
  const mine = activitySchema.parse(activity.json.data).bookings.find((b) => b.id === booking.id);
  assert.equal(mine?.status, "CANCELLED");
});

test("validation and demo-user errors", { skip }, async () => {
  const [driver] = await users();
  const bad = await call(API_PATHS.rides, {
    method: "POST", actor: driver.id,
    body: { origin: " ", destination: "X", departureTime: inHours(-1), seatCapacity: 99 },
  });

  assert.equal(bad.status, 400);
  assert.equal(errorCode(bad.json), "VALIDATION_ERROR");
  const none = await call(API_PATHS.activity);
  assert.equal(errorCode(none.json), "DEMO_USER_REQUIRED");
  const unknown = await call(API_PATHS.activity, { actor: "no-such-user" });
  assert.equal(errorCode(unknown.json), "DEMO_USER_NOT_FOUND");
});

test("the mobile live adapter completes the ride and booking workflow", { skip }, async () => {
  const client = createLiveCarpoolApi(base);
  const [driver, rider] = await client.listUsers();
  const ride = await client.createRide(driver.id, {
    origin: "Adapter Origin", destination: "Adapter Destination", departureTime: inHours(72), seatCapacity: 1,
  });
  assert.ok((await client.listRides({ origin: "Adapter Origin" })).some((item) => item.id === ride.id));
  const booked = await client.book(ride.id, rider.id);
  assert.equal(booked.ride.remainingSeats, 0);
  assert.ok((await client.getActivity(rider.id)).bookings.some((item) => item.id === booked.booking.id));
  assert.equal((await client.cancelBooking(booked.booking.id, rider.id)).ride.remainingSeats, 1);
  assert.equal((await client.cancelRide(ride.id, driver.id)).ride.status, "CANCELLED");
});

test("departed rides cannot be booked", { skip }, async () => {
  const [rider] = await users();
  const result = await call(API_PATHS.book("demo-ride-departed"), { method: "POST", actor: rider.id });
  assert.equal(result.status, 409);
  assert.equal(errorCode(result.json), "RIDE_DEPARTED");
});

test("ride endpoints reject malformed and ambiguous inputs", { skip }, async () => {
  const [driver] = await users();
  const duplicate = await call(`${API_PATHS.rides}?origin=one&origin=two`);
  assert.equal(duplicate.status, 400);
  assert.equal(errorCode(duplicate.json), "VALIDATION_ERROR");
  const unknown = await call(`${API_PATHS.rides}?unexpected=value`);
  assert.equal(unknown.status, 400);
  assert.equal(errorCode(unknown.json), "VALIDATION_ERROR");
  const malformed = await fetch(`${base}${API_PATHS.rides}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", [DEMO_USER_HEADER]: driver.id },
    body: "{",
  });
  assert.equal(malformed.status, 400);
  assert.equal(errorCode(await malformed.json()), "VALIDATION_ERROR");
});
