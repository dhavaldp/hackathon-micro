import assert from "node:assert/strict";
import test from "node:test";
import { CarpoolApiError } from "../src/carpool/api";
import { createMockCarpoolApi } from "../src/carpool/mock-api";

const fixedClock = () => new Date("2030-06-01T12:00:00.000Z");

test("mock discovery and user activity use the shared scenarios", async () => {
  const api = createMockCarpoolApi(fixedClock);
  const rides = await api.listRides();
  assert.deepEqual(rides.map((ride) => ride.id), ["ride-available", "ride-full"]);
  assert.equal(rides[0].remainingSeats, 1);
  assert.equal(rides[1].remainingSeats, 0);

  const activity = await api.getActivity("demo-rider-2");
  assert.equal(activity.bookings.length, 1);
  assert.equal(activity.bookings[0].ride.id, "ride-full");
  assert.equal(activity.bookings[0].status, "ACTIVE");
});

test("mock booking, repeat-safe cancellation, rebooking, and ride cancellation preserve capacity", async () => {
  const api = createMockCarpoolApi(fixedClock);

  const booking = await api.book("ride-available", "demo-rider-2");
  assert.equal(booking.ride.remainingSeats, 0);
  await assert.rejects(api.book("ride-available", "demo-rider-2"), (error: unknown) =>
    error instanceof CarpoolApiError && error.code === "DUPLICATE_BOOKING");

  const cancelled = await api.cancelBooking(booking.booking.id, "demo-rider-2");
  assert.equal(cancelled.booking.status, "CANCELLED");
  assert.equal(cancelled.ride.remainingSeats, 1);
  const cancelledAgain = await api.cancelBooking(booking.booking.id, "demo-rider-2");
  assert.equal(cancelledAgain.ride.remainingSeats, 1);

  const rebooking = await api.book("ride-available", "demo-rider-2");
  assert.equal(rebooking.ride.remainingSeats, 0);
  const rideCancellation = await api.cancelRide("ride-available", "demo-driver");
  assert.equal(rideCancellation.ride.status, "CANCELLED");
  assert.equal(rideCancellation.ride.remainingSeats, 0);
  assert.ok(rideCancellation.cancelledBookingIds.includes(rebooking.booking.id));
  assert.ok(rideCancellation.cancelledBookingIds.includes("booking-active"));

  const riderCancellation = await api.cancelBooking(rebooking.booking.id, "demo-rider-2");
  assert.equal(riderCancellation.ride.status, "CANCELLED");
  assert.equal(riderCancellation.ride.remainingSeats, 0);
});

test("mock creation and discovery validate inputs and apply UTC date filters", async () => {
  const api = createMockCarpoolApi(fixedClock);
  const created = await api.createRide("demo-driver", {
    origin: " Toronto ",
    destination: "Ottawa",
    departureTime: "2030-06-05T12:00:00-04:00",
    seatCapacity: 3,
  });
  assert.equal(created.origin, "Toronto");
  assert.equal(created.departureTime, "2030-06-05T16:00:00.000Z");
  assert.equal(created.remainingSeats, 3);

  const filtered = await api.listRides({ origin: " tor ", date: "2030-06-05" });
  assert.deepEqual(filtered.map((ride) => ride.id), [created.id]);
  await assert.rejects(api.createRide("demo-driver", {
    origin: "",
    destination: "Ottawa",
    departureTime: "2030-06-05T12:00:00Z",
    seatCapacity: 3,
  }), (error: unknown) => error instanceof CarpoolApiError && error.code === "VALIDATION_ERROR");
});
