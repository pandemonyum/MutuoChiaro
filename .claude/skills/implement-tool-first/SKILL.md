---
name: implement-tool-first
description: Implement a vertical agentic feature with deterministic tools, executable skills, registered calls, artifacts, events, and tests. Use during runtime implementation.
---

# Implement Tool First

## Workflow
1. Read `wiki/index.md`, then the `wiki/componenti/` page for each part of the slice and the `wiki/decisioni/` pages it must respect.
2. Implement and test deterministic operations first, then register the tool and compose it inside a bounded skill.
3. Invoke the skill from a specialist agent and the agent from the Orchestrator.
4. Record input/output references and start/complete/fail events.

## Required output
Deliver one tested vertical slice and its evidence paths, then bring the wiki back in line: update or create the `wiki/componenti/` pages the slice changed, set their `aggiornato`, add any new page to `wiki/index.md`, and append one line to `wiki/log.md`. `npm run wiki:lint` passes before handoff.

## Quality gate
Reject the result when it relies on static logs, hidden calculations, overlapping agent authority, an unbounded loop, or a non-blocking human gate.
