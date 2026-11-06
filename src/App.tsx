import { useMemo, useState } from 'react';
import { driverTrip, demoRequests } from './data/demoCommute';
import type { RideDecision } from './domain/types';
import { cancelRide, matchRequests } from './engine/matchingEngine';

const money = (cents: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);

const paymentLabel: Record<string, string> = {
  CASH: 'Cash',
  E_TRANSFER: 'Interac e-Transfer',
  PAYROLL_DEDUCTION: 'Payroll Deduction',
};

const statusLabel: Record<string, string> = {
  MATCHED: 'Matched',
  QUEUED: 'Queued',
  NO_ROUTE_MATCH: 'Not on route',
  PAYMENT_MISMATCH: 'Payment issue',
};

export default function App() {
  const [decisions, setDecisions] = useState<RideDecision[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const seatsMatched = useMemo(
    () =>
      (decisions ?? []).filter((d) => d.status === 'MATCHED').reduce((sum, decision) => {
        const request = demoRequests.find((r) => r.id === decision.requestId);
        return sum + (request?.requestedSeats ?? 0);
      }, 0),
    [decisions],
  );

  const run = () => {
    const result = matchRequests(demoRequests, driverTrip);
    setDecisions(result);
    setSelectedId(result.find((d) => d.status === 'QUEUED')?.requestId ?? result[0]?.requestId ?? null);
  };

  const cancelOmar = () => {
    if (!decisions) return;
    const updated = cancelRide(decisions, demoRequests, driverTrip, 'omar');
    setDecisions(updated);
    setSelectedId(updated.find((d) => d.requestId === 'sara')?.requestId ?? null);
  };

  const reset = () => {
    setDecisions(null);
    setSelectedId(null);
  };

  const selected = decisions?.find((d) => d.requestId === selectedId);
  const omarStillActive = decisions?.some((d) => d.requestId === 'omar' && d.status === 'MATCHED');

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Employee carpool matching</p>
          <h1>SmartCommute AI</h1>
          <p className="subtitle">Share the ride. Skip the drive.</p>
        </div>
        <span className="spec-badge">Specification-driven</span>
      </header>

      <section className="trip-card" aria-label="Driver trip">
        <div><span>Driver</span><strong>{driverTrip.driverName}</strong></div>
        <div><span>Departure</span><strong>{driverTrip.departureTime}</strong></div>
        <div><span>Seats offered</span><strong>{driverTrip.seatsTotal}</strong></div>
        <div><span>Fare rate</span><strong>{money(driverTrip.farePerKmCents)}/km</strong></div>
        <div className="route-row">
          <span>Route</span>
          <strong>{driverTrip.route.map((w) => w.name).join('  ->  ')}</strong>
        </div>
        <div className="route-row">
          <span>Accepted payments</span>
          <strong>{driverTrip.acceptedPayments.map((p) => paymentLabel[p]).join(', ')}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Ride requests</p>
            <h2>Match today's riders</h2>
            <p>Four colleagues along Alex's commute corridor.</p>
          </div>
          <div className="actions">
            <button type="button" className="secondary" onClick={reset}>Reset</button>
            <button type="button" className="primary" onClick={run}>Match riders</button>
          </div>
        </div>

        {!decisions ? (
          <div className="empty-state">
            <div className="car-icon" aria-hidden="true">🚗</div>
            <h3>Ready to match</h3>
            <p>Click Match riders to run the SmartCommute matching policy.</p>
          </div>
        ) : (
          <div className="request-grid" aria-label="Ride decisions">
            {decisions.map((decision) => (
              <button
                type="button"
                key={decision.requestId}
                className={`request-card ${selectedId === decision.requestId ? 'selected' : ''}`}
                onClick={() => setSelectedId(decision.requestId)}
                aria-pressed={selectedId === decision.requestId}
              >
                <div className="request-top">
                  <span className={`status status-${decision.status.toLowerCase()}`}>
                    {statusLabel[decision.status]}
                  </span>
                  {decision.fareCents !== undefined && <strong>{money(decision.fareCents)}</strong>}
                </div>
                <h3>{decision.riderName}</h3>
                {decision.pickupName && decision.dropoffName ? (
                  <p>{decision.pickupName} to {decision.dropoffName}</p>
                ) : (
                  <p>Pickup not on the published route</p>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {decisions && (
        <section className="explanation" aria-live="polite" aria-label="Decision explanation">
          <div className="explanation-text">
            <p className="eyebrow">Why this decision?</p>
            <h2>{selected?.riderName}: {selected && statusLabel[selected.status]}</h2>
            <p>{selected?.explanation}</p>
          </div>
          {omarStillActive && (
            <button type="button" className="warning" onClick={cancelOmar}>
              Omar cancels ride
            </button>
          )}
        </section>
      )}

      {decisions && (
        <section className="summary" aria-label="Trip summary">
          <div><span>Seats matched</span><strong>{seatsMatched} / {driverTrip.seatsTotal}</strong></div>
          <div><span>Riders matched</span><strong>{decisions.filter((d) => d.status === 'MATCHED').length}</strong></div>
          <div><span>Riders queued</span><strong>{decisions.filter((d) => d.status === 'QUEUED').length}</strong></div>
          <div><span>Unmatched</span><strong>{decisions.filter((d) => d.status === 'NO_ROUTE_MATCH' || d.status === 'PAYMENT_MISMATCH').length}</strong></div>
        </section>
      )}
    </main>
  );
}
