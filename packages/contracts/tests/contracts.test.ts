import assert from "node:assert/strict";
import test from "node:test";
import {
  API_PATHS, ERROR_STATUS, createRideSchemaAt, discoveryQuerySchema,
  rideSchema, utcDateRange,
} from "../src/index";
import {
  activityResponse, bookingCancellationResponse, bookingResponse,
  discoveryResponse, fixtures, rideCancellationResponse,
} from "../src/fixtures";

test("fixtures preserve capacity, relations, clock, and every error shape", () => {
  assert.deepEqual(fixtures.errors.map(({ error }) => error.code).sort(), Object.keys(ERROR_STATUS).sort());
  for (const ride of fixtures.rides) {
    assert.ok(fixtures.users.some((user) => user.id === ride.driverId));
    const active = fixtures.bookings.filter((booking) => booking.rideId === ride.id && booking.status === "ACTIVE");
    assert.equal(ride.remainingSeats, ride.status === "CANCELLED" ? 0 : ride.seatCapacity - active.length);
    assert.equal(new Set(active.map((booking) => booking.riderId)).size, active.length);
  }
  for (const booking of fixtures.bookings) {
    assert.ok(fixtures.rides.some((ride) => ride.id === booking.rideId));
    assert.ok(fixtures.users.some((user) => user.id === booking.riderId));
  }
  assert.deepEqual(discoveryResponse.data.map((ride) => ride.id), ["ride-available", "ride-full"]);
  assert.equal(bookingResponse.data.booking.status, "ACTIVE");
  assert.equal(bookingCancellationResponse.data.booking.status, "CANCELLED");
  assert.equal(bookingCancellationResponse.data.ride.remainingSeats, 2);
  assert.equal(rideCancellationResponse.data.ride.remainingSeats, 0);
  assert.equal(activityResponse.data.bookings.length, 2);
});
test("ride input limits, normalization, and time boundaries are exact", () => {
  const schema = createRideSchemaAt(new Date(fixtures.clock));
  const input = { origin: " Toronto ", destination: "Brampton", departureTime: "2030-06-02T10:00:00-04:00", seatCapacity: 8 };
  assert.equal(schema.parse(input).origin, "Toronto");
  assert.equal(schema.safeParse({ ...input, seatCapacity: 1 }).success, true);
  for (const origin of ["", " ", "x".repeat(101)]) {
    assert.equal(schema.safeParse({ ...input, origin }).success, false);
  }
  assert.equal(schema.safeParse({ ...input, origin: "x".repeat(100) }).success, true);
  for (const seatCapacity of [0, -1, 1.5, 9, "2"]) {
    assert.equal(schema.safeParse({ ...input, seatCapacity }).success, false);
  }
  for (const departureTime of [fixtures.clock, "2030-05-01T12:00:00Z", "2030-06-02T12:00:00", "2030-02-30T12:00:00Z"]) {
    assert.equal(schema.safeParse({ ...input, departureTime }).success, false);
  }
  assert.equal(schema.safeParse({ ...input, driverId: "spoofed" }).success, false);
});
test("UTC search range validates calendar days and crosses month/year boundaries", () => {
  assert.deepEqual(utcDateRange("2030-12-31"), {
    start: "2030-12-31T00:00:00.000Z", end: "2031-01-01T00:00:00.000Z",
  });
  assert.throws(() => utcDateRange("2030-02-29"));
  assert.equal(discoveryQuerySchema.safeParse({ date: "2030-02-30" }).success, false);
  assert.equal(discoveryQuerySchema.safeParse({ origin: "  " }).success, false);
});
test("response capacity invariants and encoded resource paths", () => {
  const ride = fixtures.rides[0];
  assert.equal(rideSchema.safeParse({ ...ride, remainingSeats: -1 }).success, false);
  assert.equal(rideSchema.safeParse({ ...ride, remainingSeats: 3 }).success, false);
  assert.equal(rideSchema.safeParse({ ...ride, status: "CANCELLED" }).success, false);
  assert.equal(API_PATHS.book("ride/1"), "/api/rides/ride%2F1/bookings");
});
