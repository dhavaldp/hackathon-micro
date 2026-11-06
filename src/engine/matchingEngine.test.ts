import { describe, expect, it } from 'vitest';
import { driverTrip, demoRequests } from '../data/demoCommute';
import { cancelRide, matchRequests } from './matchingEngine';

describe('SmartCommute matching engine', () => {
  it('meets AC-001 by matching Priya and Omar at the correct fares', () => {
    const decisions = matchRequests(demoRequests, driverTrip);
    const priya = decisions.find((d) => d.requestId === 'priya')!;
    const omar = decisions.find((d) => d.requestId === 'omar')!;

    expect(priya.status).toBe('MATCHED');
    expect(priya.fareCents).toBe(440);
    expect(omar.status).toBe('MATCHED');
    expect(omar.fareCents).toBe(280);
  });

  it('meets AC-002 by queueing Sara once seats are exhausted', () => {
    const decisions = matchRequests(demoRequests, driverTrip);
    const sara = decisions.find((d) => d.requestId === 'sara')!;

    expect(sara.status).toBe('QUEUED');
    expect(sara.fareCents).toBe(800);
  });

  it('meets AC-003 by rejecting an off-route pickup', () => {
    const decisions = matchRequests(demoRequests, driverTrip);
    const jordan = decisions.find((d) => d.requestId === 'jordan')!;

    expect(jordan.status).toBe('NO_ROUTE_MATCH');
    expect(jordan.explanation).toMatch(/route/i);
  });

  it('meets AC-004 by never matching more seats than offered', () => {
    const decisions = matchRequests(demoRequests, driverTrip);
    const matchedSeats = decisions.filter((d) => d.status === 'MATCHED').length;
    expect(matchedSeats).toBeLessThanOrEqual(driverTrip.seatsTotal);
  });

  it('meets AC-005 by promoting Sara after Omar cancels', () => {
    const initial = matchRequests(demoRequests, driverTrip);
    const updated = cancelRide(initial, demoRequests, driverTrip, 'omar');
    const sara = updated.find((d) => d.requestId === 'sara')!;

    expect(updated.some((d) => d.requestId === 'omar')).toBe(false);
    expect(sara.status).toBe('MATCHED');
    expect(sara.fareCents).toBe(800);
  });

  it('meets AC-006 by flagging an unsupported payment method', () => {
    const requests = [
      { ...demoRequests[0], id: 'test-payment', preferredPayment: 'CRYPTO' as never },
    ];
    const decisions = matchRequests(requests, driverTrip);
    expect(decisions[0].status).toBe('PAYMENT_MISMATCH');
  });
});
