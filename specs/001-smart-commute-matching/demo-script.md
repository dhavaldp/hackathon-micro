# Three-Minute Demo Script

## 0:00-0:25 Problem
"Hundreds of us commute along the same highway corridors every morning, but coordinating who can pick up whom, split a fair fare, and reassign a seat when someone cancels is genuinely hard to do by text message. We built SmartCommute AI."

## 0:25-0:50 Spec-driven approach
Show `spec.md`, `plan.md`, and `tasks.md`.
"We started with a measurable specification: one driver's real commute route, two seats, four competing ride requests, and a defined cancellation scenario."

## 0:50-1:10 Copilot customization
Show the route-matching Skill and the developer and QA agents.
"We encoded our matching, fare, and payment rules as a reusable Copilot Skill, and separated implementation from independent QA validation."

## 1:10-2:20 Product
Open the app. Click Match riders. Show Priya matched at $4.40, Omar matched at $2.80, Sara queued at an estimated $8.00, and Jordan rejected because Hamilton is not on the route. Click Omar cancels ride. Show the seat reclaimed and Sara automatically promoted to matched at $8.00.

## 2:20-2:45 Live Copilot moment
Prompt: "Use the commute-qa agent and ride-validation skill. Review AC-004 and AC-006. Do not modify code. Identify the highest-risk uncovered case and recommend one test."

## 2:45-3:00 Close
"SmartCommute AI is intentionally small, but the idea scales across every Rogers office and depot. Specification-driven Copilot workflows let us build fair, explainable, and testable matching logic instead of a black box."
