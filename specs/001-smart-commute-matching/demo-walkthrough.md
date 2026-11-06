# Demo Walkthrough Reference

Use this as the presenter's preparation guide and source of expected results. The concise timed talk track remains in [demo-script.md](./demo-script.md); this file adds setup, navigation, Copilot talking points, and verification notes.

## What This Demo Is

SmartCommute is a local, single-screen simulation of one driver's Brampton-to-Downtown Toronto commute. It demonstrates deterministic route matching, seat allocation, distance-based fares, payment compatibility, cancellation, and queue promotion using fictional data. It does not call an AI model to decide matches, and it has no backend, database, live maps, payment processor, or employee-directory integration.

The repository demonstrates a specification-first project structure. The checked-in files establish the current process and constraints; they do not prove which Copilot mode authored each historical artifact.

## Before Presenting

From the repository root, install locked dependencies once and verify the current build:

```powershell
npm ci
npm test
npm run build
npm run dev
```

Vite prints and opens the local URL. If it opens in another browser, copy the printed URL into the browser you plan to present from. Leave the app at **Ready to match** before the demo.

For the Copilot segment, have these files ready to open:

- [Constitution](../../.specify/memory/constitution.md) and [agent guide](../../AGENTS.md)
- [Feature specification](./spec.md), [implementation plan](./plan.md), and [task list](./tasks.md)
- [Workspace Copilot instructions](../../.github/copilot-instructions.md)
- [Route-matching Skill](../../.github/skills/route-matching/SKILL.md) and [ride-validation Skill](../../.github/skills/ride-validation/SKILL.md)
- [Developer agent](../../.github/agents/commute-developer.agent.md) and [QA agent](../../.github/agents/commute-qa.agent.md)

## Explain the Project Artifacts

Walk through the documents in this order:

1. The constitution and `AGENTS.md` establish boundaries: synthetic inputs, a deterministic domain engine, route safety, capacity limits, explainable outcomes, and no backend or payment processor.
2. The feature specification describes Alex's route, four sample requests, functional requirements, and acceptance criteria AC-001 through AC-006.
3. The implementation plan maps those requirements to a React + TypeScript + Vite screen, a pure matching engine, and Vitest tests.
4. The task list breaks implementation into completed work and remaining demo activities. T001-T009 are checked; T010 (live QA review) and T011 (two rehearsals) remain unchecked until actually completed and recorded.

For a live Plan-mode example, open the spec and ask:

```text
Read the constitution and active specification. In Plan mode, identify any ambiguity that could change AC-001 or AC-005. Do not edit files.
```

Explain that the goal is to surface requirement ambiguity before editing, not to claim that the prompt proves how the checked-in files were originally created.

## Show Copilot Customization

- **Instructions** in `.github/copilot-instructions.md` set project-wide boundaries, including keeping matching logic out of React and requiring tests for rule changes.
- The **route-matching Skill** describes the implementation procedure for route eligibility, payment checks, fares, capacity, and queue promotion.
- The **ride-validation Skill** provides a separate requirements-based review procedure.
- The **commute-developer agent** is scoped to implementing requested work from the spec.
- The **commute-qa agent** is scoped to independent requirement and test review.

The useful distinction to call out: instructions apply broadly, Skills provide task-specific procedures, and agents provide focused roles. The QA agent is not the matching engine; the app's deterministic TypeScript code decides the results.

## Run the Product Flow

1. At **Ready to match**, point out Alex's 8:00 AM trip, the ordered route, two offered seats, CAD $0.20/km rate, and accepted payment methods.
2. Click **Match riders**.
3. Select each request card to show its explanation. Expected initial outcomes:

| Rider | Expected result | Why |
|---|---|---|
| Priya | MATCHED, CAD $4.40 | Mississauga City Centre to Downtown is 22 km at CAD $0.20/km. |
| Omar | MATCHED, CAD $2.80 | Pearson Airport to Downtown is 14 km at CAD $0.20/km. |
| Sara | QUEUED, estimated CAD $8.00 | Her 40 km trip is valid, but both offered seats are allocated first. |
| Jordan | NO_ROUTE_MATCH | Hamilton is not a waypoint on Alex's route. |

4. Point out the seat summary: two matched seats out of two. Select Omar and click **Omar cancels ride**.
5. Show that Omar is removed from active matches and Sara is promoted to MATCHED at CAD $8.00. This demonstrates AC-005: cancellation frees a seat and promotes the longest-waiting eligible queued request.
6. Click **Reset** if you need to repeat the flow.

## Optional Live QA Moment

Select the `commute-qa` agent in Copilot Chat and use this bounded review prompt:

```text
Use the commute-qa agent and ride-validation skill.
Review the current implementation and tests against AC-004 and AC-006.
Do not modify code.
Return the highest-risk test gap, the related acceptance criterion, and one recommended test.
```

A known test-strengthening opportunity is AC-004: its current test counts matched decisions, while the invariant is about the sum of requested seats. The engine subtracts requested seats during allocation and the UI summary sums them, but the test would better prove the invariant with a multi-seat request. This is not evidence of a demonstrated matching bug. Do not say the live QA review is complete until it has actually been run and its result recorded under T010.

## Verification Status And Limits

The matching test suite has six tests mapped to AC-001 through AC-006. Run `npm test` and `npm run build` before presenting; report the output from the current run rather than relying on this document as proof. Manual browser coverage is separate from automated tests. The demo does not validate production identity, privacy, real payment processing, live route data, or cross-device behavior.

For the official three-minute timing and concise spoken lines, use [demo-script.md](./demo-script.md). Keep the demo claims within the current specification; for example, maximum-detour behavior is not a current requirement and must not be presented as implemented.