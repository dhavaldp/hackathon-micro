import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseIsoInstant, parseUtcDateBounds, validateRideCreateInput } from './validation.ts';

const fixedNow = new Date('2026-11-06T12:00:00.000Z');
const validRide = {
  origin: '  Brampton  ',
  destination: 'Toronto',
  departureTime: '2026-11-06T09:30:00-05:00',
  seatCapacity: 3,
};

describe('provisional ride input validation', () => {
  it('normalizes locations and offset timestamps', () => {
    const result = validateRideCreateInput(validRide, fixedNow);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.value, {
      origin: 'Brampton',
      destination: 'Toronto',
      departureTime: '2026-11-06T14:30:00.000Z',
      seatCapacity: 3,
    });
  });

  it('requires an explicit offset and rejects impossible dates', () => {
    assert.equal(parseIsoInstant('2026-11-06T15:00:00'), null);
    assert.equal(parseIsoInstant('2026-02-30T15:00:00Z'), null);
  });

  it('rejects past departures, empty locations, and invalid capacities', () => {
    const result = validateRideCreateInput({
      ...validRide,
      origin: '   ',
      departureTime: '2026-11-06T06:00:00-05:00',
      seatCapacity: 0,
    }, fixedNow);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.fieldErrors.origin);
    assert.ok(result.fieldErrors.departureTime);
    assert.ok(result.fieldErrors.seatCapacity);
  });

  it('rejects non-object bodies and overlong locations', () => {
    const nonObject = validateRideCreateInput(null, fixedNow);
    assert.equal(nonObject.ok, false);
    const overlong = validateRideCreateInput({
      ...validRide,
      origin: 'A'.repeat(81),
    }, fixedNow);
    assert.equal(overlong.ok, false);
    if (!overlong.ok) assert.ok(overlong.fieldErrors.origin);
  });

  it('parses valid UTC calendar days as half-open intervals', () => {
    assert.deepEqual(parseUtcDateBounds('2026-11-06'), {
      start: Date.parse('2026-11-06T00:00:00.000Z'),
      end: Date.parse('2026-11-07T00:00:00.000Z'),
    });
    assert.equal(parseUtcDateBounds('2026-02-30'), null);
  });
});
