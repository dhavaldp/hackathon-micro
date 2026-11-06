import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GET as getDemoUsers } from './demo-users/route.ts';
import { GET as getRides, POST as postRide } from './rides/route.ts';

const futureRide = {
  origin: 'Brampton',
  destination: 'Toronto',
  departureTime: '2099-02-01T10:00:00-05:00',
  seatCapacity: 2,
};

describe('provisional Module 3 HTTP routes', () => {
  it('lists fictional demo users in a success envelope', async () => {
    const response = getDemoUsers();
    assert.equal(response.status, 200);
    const body = await response.json() as { data: Array<{ id: string }> };
    assert.ok(body.data.length >= 2);
    assert.ok(body.data.every((user) => typeof user.id === 'string'));
  });

  it('requires a selected known demo user to create a ride', async () => {
    const missingActor = await postRide(new Request('http://localhost/api/rides', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(futureRide),
    }));
    assert.equal(missingActor.status, 400);
    assert.equal((await missingActor.json() as { error: { code: string } }).error.code, 'DEMO_USER_REQUIRED');

    const unknownActor = await postRide(new Request('http://localhost/api/rides', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Demo-User-Id': 'missing-user',
      },
      body: JSON.stringify(futureRide),
    }));
    assert.equal(unknownActor.status, 400);
    assert.equal((await unknownActor.json() as { error: { code: string } }).error.code, 'UNKNOWN_DEMO_USER');
  });

  it('creates a ride and returns it through filtered discovery', async () => {
    const createdResponse = await postRide(new Request('http://localhost/api/rides', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Demo-User-Id': 'demo-alex',
      },
      body: JSON.stringify(futureRide),
    }));
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json() as {
      data: { id: string; remainingSeats: number; status: string; departureTime: string };
    };
    assert.equal(created.data.remainingSeats, 2);
    assert.equal(created.data.status, 'ACTIVE');
    assert.equal(created.data.departureTime, '2099-02-01T15:00:00.000Z');

    const discoveryResponse = getRides(new Request('http://localhost/api/rides?origin=bram&date=2099-02-01'));
    assert.equal(discoveryResponse.status, 200);
    const discovery = await discoveryResponse.json() as { data: Array<{ id: string }> };
    assert.deepEqual(discovery.data.map((ride) => ride.id), [created.data.id]);
  });

  it('returns validation errors for malformed JSON and invalid filters', async () => {
    const malformed = await postRide(new Request('http://localhost/api/rides', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Demo-User-Id': 'demo-alex' },
      body: '{',
    }));
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json() as { error: { code: string } }).error.code, 'VALIDATION_ERROR');

    const invalidFilter = getRides(new Request('http://localhost/api/rides?date=2099-02-30'));
    assert.equal(invalidFilter.status, 400);
  });
});
