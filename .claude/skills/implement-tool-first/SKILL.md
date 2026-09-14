---
name: implement-tool-first
description: Implement a vertical agentic feature with deterministic tools, executable skills, registered calls, artifacts, events, and tests. Use during runtime implementation.
---

# Implement Tool First

## Workflow
1. Implement and test deterministic operations first.
2. Register the tool, then compose it inside a bounded skill.
3. Invoke the skill from a specialist agent and the agent from the Orchestrator.
4. Record input/output references and start/complete/fail events.

## Required output
Deliver one tested vertical slice and its evidence paths.

## Quality gate
Reject the result when it relies on static logs, hidden calculations, overlapping agent authority, an unbounded loop, or a non-blocking human gate.
