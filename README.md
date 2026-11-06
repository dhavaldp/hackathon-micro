# SmartCommute AI

> Share the ride. Skip the drive.

SmartCommute AI is a one-screen, specification-driven hackathon demo that matches Rogers employees into carpools along a driver's commute route, allocates seats, calculates distance-based fares, checks payment compatibility, and promotes queued riders when a seat is freed.

Built with React, TypeScript, Vite, Vitest, GitHub Copilot instructions, reusable Skills, and specialized developer and QA agents. This README is also the step-by-step presentation guide for demonstrating the project and its Copilot workflow.

## Product Scenario

Alex drives from Brampton GO to CIBC Square in downtown Toronto every morning, passing Mississauga City Centre and Pearson Airport, with 2 free seats.

- Priya requests Mississauga to Downtown and is matched for CAD $4.40.
- Omar requests Pearson to Downtown and is matched for CAD $2.80.
- Sara requests Brampton to Downtown, but both seats are taken, so she is queued at an estimated CAD $8.00.
- Jordan requests a pickup in Hamilton, which is not on the route, so the request cannot be matched.

When Omar cancels, his seat is reclaimed and Sara is automatically promoted from the queue.

## Run And Validate

```bash
npm install
npm run dev
```

Vite prints the local URL in the terminal and opens the system default browser. To open the app in Chrome specifically, set Chrome as the Windows default browser or open the printed URL in Chrome.

```bash
npm test
npm run build
```

The matching test suite currently passes with 6 tests. Run both validation commands before presenting.

## Spec-First Workflow

Use these repository documents to tell the project story in order:

1. [Constitution](.specify/memory/constitution.md) and [AGENTS.md](AGENTS.md) define project boundaries and non-negotiable engineering rules: synthetic data, deterministic matching, route safety, seat limits, and no backend or payment processor.
2. The [feature specification](specs/001-smart-commute-matching/spec.md) defines the user problem, scenario, functional requirements, and acceptance criteria.
3. The [implementation plan](specs/001-smart-commute-matching/plan.md) maps the requirements to the architecture, design constraints, and verification approach.
4. The [task list](specs/001-smart-commute-matching/tasks.md) breaks the work into trackable implementation steps. T001-T009 are complete. T010 (live QA review) and T011 (rehearsal) remain.

The repository demonstrates this spec-first structure. The files alone do not prove which tool or Copilot mode originally authored each document; describe the workflow as the project's method, not as historical evidence.

### Plan-Mode Demonstration

Open the spec and ask Copilot in Plan mode:

```text
Read the constitution and active specification. In Plan mode, identify any ambiguity that could change AC-001 or AC-005. Do not edit files.
```

Compare Copilot's response with the written acceptance criteria. The point is to show that planning resolves requirement ambiguity before implementation.

## Copilot Customization

- **Instructions:** [.github/copilot-instructions.md](.github/copilot-instructions.md) gives workspace-wide guidance, including keeping matching logic outside React, using synthetic data, and running tests after matching-rule changes.
- **Route-matching Skill:** [.github/skills/route-matching/SKILL.md](.github/skills/route-matching/SKILL.md) provides the matching procedure for route order, payment support, fares, seats, and queue promotion.
- **Ride-validation Skill:** [.github/skills/ride-validation/SKILL.md](.github/skills/ride-validation/SKILL.md) guides independent checks against requirements and test evidence.
- **Developer agent:** [.github/agents/commute-developer.agent.md](.github/agents/commute-developer.agent.md) focuses on implementing requested work from the spec.
- **QA agent:** [.github/agents/commute-qa.agent.md](.github/agents/commute-qa.agent.md) focuses on requirement-based review and avoids source edits unless asked.

Show the instructions, Skills, and agents in the repository, then invoke the relevant agent in Copilot Chat. A useful implementation prompt is in [TEAM-DELEGATION.md](TEAM-DELEGATION.md).

## Three-Minute Demo

### 0:00-0:25: Problem

"Employees commute along the same corridors, but coordinating pickups, fair fares, limited seats, and cancellations by text is difficult. We built SmartCommute AI to make those decisions explainable and repeatable."

### 0:25-0:50: Spec-first approach

Show the feature spec, plan, and tasks in that order. Explain that the spec sets the measurable outcomes, the plan describes the technical approach, and tasks track delivery. Highlight the two seats, four requests, and cancellation acceptance criterion.

### 0:50-1:10: Copilot customization

Show the instruction file, the route-matching and ride-validation Skills, and the developer and QA agents. Explain how the instruction file sets project rules while Skills and agents provide task-specific procedures and roles.

### 1:10-2:20: Product

Open the running app and click **Match riders**. Show Priya matched at CAD $4.40, Omar matched at CAD $2.80, Sara queued at an estimated CAD $8.00, and Jordan rejected because Hamilton is not on the route. Select riders to show their explanations. Click **Omar cancels ride** and show Sara promoted.

### 2:20-2:45: Live Copilot QA

Select the `commute-qa` agent in Copilot Chat and use this prompt:

```text
Use the commute-qa agent and ride-validation skill.
Review the current implementation and tests against AC-004 and AC-006.
Do not modify code.
Return the highest-risk test gap, the related acceptance criterion, and one recommended test.
```

One honest review point: the current AC-004 test counts matched riders, but the requirement is that allocated seats never exceed seats offered. The engine subtracts each request's requested seats; a stronger test would include a multi-seat request and sum allocated seats. This is a test-strengthening opportunity, not a demonstrated matching bug.

### 2:45-3:00: Close

"SmartCommute is intentionally small, but its decisions are deterministic, explainable, and covered by acceptance tests. The specification-driven Copilot workflow helps keep implementation and review anchored to those requirements."

## Next Agentic Phase

The repository includes a proposed Copilot coding-agent task in the [team handoff notes](TEAM-DELEGATION.md). The maximum-detour rule is not part of the current specification, so make it a defined requirement and add acceptance tests/tasks before delegating implementation.

Example bounded issue prompt:

```text
Add a maximum-detour rule to SmartCommute AI.
A request should be rejected if the rider's pickup or dropoff would require the driver to travel more than 3 km off the published route.
First update the active specification with measurable acceptance criteria and add implementation and test tasks. Then implement only those tasks, run npm test and npm run build, and create a pull request with the task IDs and acceptance evidence.
```

This demonstrates a bounded agentic workflow: human-defined issue, spec and plan alignment, delegated code changes, tests, and pull-request review. Do not ask the coding agent to implement the rule while it remains outside the active specification.

## Rehearsal Checklist

1. Run `npm test` and `npm run build`.
2. Run `npm run dev`, confirm the app opens, and leave the browser at the ready-to-match screen.
3. Rehearse the full flow twice: match riders, explain outcomes, cancel Omar, and verify Sara's promotion.
4. Keep Copilot Chat open with the QA agent selected and the live prompt ready.
5. If the live Copilot response is delayed, show the checked-in agent and Skill files and explain the intended review.

## Scope

This is a local simulation using synthetic route, rider, and fare data. It does not connect to live mapping, payment processing, or employee directory systems.
