import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InMemoryDemoUserRepository, InMemoryRideRepository } from './repositories.ts';
import { RideService } from './service.ts';
import type { DemoUser, Ride } from './types.ts';

const now = new Date('2026-11-06T12:00:00.000Z');
const users: DemoUser[] = [
  { id: 'driver-1', displayName: 'Alex Morgan' },
  { id: 'rider-1', displayName: 'Priya Shah' },
];

function ride(overrides: Partial<Ride>): Ride {
  return {
    id: 'ride-1',
    driverId: 'driver-1',
    origin: 'Brampton',
    destination: 'Toronto',
    departureTime: '2026-11-06T14:00:00.000Z',
    seatCapacity: 2,
    remainingSeats: 2,
    status: 'ACTIVE',
    ...overrides,
  };
}

describe('provisional Module 3 ride service', () => {
  it('lists fictional demo users in the success envelope', () => {
    const service = new RideService(
      new InMemoryRideRepository(),
      new InMemoryDemoUserRepository(users),
      () => now,
      () => 'new-ride',
    );
    assert.deepEqual(service.listDemoUsers(), {
      status: 200,
      body: { data: users },
    });
  });

  it('creates a ride for a known selected user with all seats available', () => {
    const repository = new InMemoryRideRepository();
    const service = new RideService(
      repository,
      new InMemoryDemoUserRepository(users),
      () => now,
      () => 'new-ride',
    );
    const result = service.createRide('driver-1', {
      origin: 'Brampton',
      destination: 'Toronto',
      departureTime: '2026-11-06T15:00:00-05:00',
      seatCapacity: 3,
    });
    assert.equal(result.status, 201);
    assert.deepEqual(repository.list(), [{
      id: 'new-ride',
      driverId: 'driver-1',
      origin: 'Brampton',
      destination: 'Toronto',
      departureTime: '2026-11-06T20:00:00.000Z',
      seatCapacity: 3,
      remainingSeats: 3,
      status: 'ACTIVE',
    }]);
  });

  it('rejects missing and unknown actors', () => {
    const service = new RideService(
      new InMemoryRideRepository(),
      new InMemoryDemoUserRepository(users),
      () => now,
      () => 'unused',
    );
    assert.equal(service.createRide(null, {}).status, 400);
    const unknown = service.createRide('not-a-user', {});
    assert.equal(unknown.status, 400);
    assert.deepEqual((unknown.body as { error: { code: string } }).error.code, 'UNKNOWN_DEMO_USER');
  });

  it('filters upcoming active rides, keeps full rides, and sorts deterministically', () => {
    const repository = new InMemoryRideRepository([
      ride({ id: 'z-ride', departureTime: '2026-11-06T17:00:00.000Z', remainingSeats: 0 }),
      ride({ id: 'a-ride', departureTime: '2026-11-06T17:00:00.000Z' }),
      ride({ id: 'cancelled', status: 'CANCELLED' }),
      ride({ id: 'departed', departureTime: '2026-11-06T11:59:59.000Z' }),
    ]);
    const service = new RideService(repository, new InMemoryDemoUserRepository(users), () => now);
    const result = service.listRides();
    assert.equal(result.status, 200);
    assert.deepEqual((result.body as { data: Ride[] }).data.map((item) => item.id), ['a-ride', 'z-ride']);
    assert.equal((result.body as { data: Ride[] }).data[1].remainingSeats, 0);
  });

  it('applies case-insensitive substring and UTC date filters', () => {
    const repository = new InMemoryRideRepository([
      ride({ id: 'inside', origin: 'North Brampton', departureTime: '2026-11-06T23:59:59.000Z' }),
      ride({ id: 'next-day', departureTime: '2026-11-07T00:00:00.000Z' }),
    ]);
    const service = new RideService(repository, new InMemoryDemoUserRepository(users), () => now);
    const result = service.listRides({ origin: 'bram', date: '2026-11-06' });
    assert.deepEqual((result.body as { data: Ride[] }).data.map((item) => item.id), ['inside']);
  });

  it('returns field errors for invalid filters', () => {
    const service = new RideService(
      new InMemoryRideRepository(),
      new InMemoryDemoUserRepository(users),
      () => now,
    );
    const result = service.listRides({ date: '2026-02-30' });
    assert.equal(result.status, 400);
    assert.ok((result.body as { error: { fieldErrors?: Record<string, string[]> } }).error.fieldErrors?.date);
  });
});
