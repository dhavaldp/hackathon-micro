# Team Delegation and Demo Handoffs

Assumption: four-person mixed Dev + QA team. Replace Person 1-4 with actual names.

## Person 1: Product and Specification Lead

Owns:
- `spec.md`, `plan.md`, and `tasks.md`
- Problem statement and opening pitch
- Spec Kit / Plan-mode demonstration

Live section:
- Explain the Brampton-to-Downtown route, 2 seats, and four competing requests.
- Show measurable acceptance criteria.

Copilot prompt:
```text
Read the constitution and active specification. In Plan mode, identify any ambiguity that could change AC-001 or AC-005. Do not edit files.
```

Definition of done:
- Requirements are measurable.
- Live mapping and payment processing remain out of scope.

## Person 2: Matching Engine Developer

Owns:
- `src/domain/types.ts`
- `src/data/demoCommute.ts`
- `src/engine/matchingEngine.ts`
- Core unit tests

Live section:
- Explain route-order validation, seat allocation, and integer-cent fare calculation.

Copilot feature:
- Use `commute-developer` agent and `route-matching` Skill.

Prompt:
```text
Use the commute-developer agent and route-matching skill. Review T004-T006 against AC-001, AC-003, and AC-005. Run tests and report evidence. Do not expand scope.
```

Definition of done:
- Priya and Omar are matched for exactly $4.40 and $2.80.
- Sara is queued at exactly $8.00 and promoted after Omar cancels.

## Person 3: UI Developer

Owns:
- `src/App.tsx`
- `src/styles.css`
- Responsive and accessible interaction

Live section:
- Operate the browser.
- Run matching and trigger the cancellation.

Copilot feature:
- Use interactive mode for one UI/accessibility refinement.

Prompt:
```text
Follow the active specification. Improve only result accessibility: status must not rely on colour, controls need visible focus, and the queue-promotion result must be announced. Run the build.
```

Definition of done:
- Works at 320px and desktop width.
- Match, queue, and rejection states remain understandable without colour.

## Person 4: QA and Copilot Lead

Owns:
- `src/engine/matchingEngine.test.ts`
- `commute-qa.agent.md`
- `ride-validation/SKILL.md`
- Live Copilot QA review

Live section:
- Invoke the QA agent through Copilot Chat or CLI.
- Summarize its highest-risk finding.

Copilot prompt:
```text
Use the commute-qa agent and ride-validation skill. Review implementation and tests against AC-004 and AC-006. Do not modify code. Return one highest-risk finding and one recommended test.
```

Definition of done:
- Tests pass.
- Finding cites a specification item.

## Whole-team final hour

1. Stop adding features.
2. Run `npm test` and `npm run build`.
3. Rehearse twice.
4. Keep the app reset and ready.
5. Keep Copilot Chat or CLI open with the QA prompt copied.
6. If the live Copilot response is delayed, show the checked-in agent and Skill, then explain the intended review.
