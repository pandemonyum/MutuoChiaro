---
name: design-agent-system
description: Design a minimal executable multi-agent architecture. Use after problem framing or when handoffs exist only in documentation.
---

# Design Agent System

## Workflow
1. Read `wiki/index.md`, then the pages in `wiki/componenti/` and `wiki/decisioni/` for the parts you are about to touch, so an existing decision is not silently reversed.
2. Build the agent/skill/tool/human capability matrix.
3. Define non-overlapping agent contracts, external state, legal transitions, bounded loops, failures, and the human gate.
4. Map every claim to runtime code, schema, test, or human action.

## Required output
Create or update `agents/`, `agents/schemas/`, and `docs/AGENTIC_ARCHITECTURE.md`, then update the affected pages in `wiki/componenti/`, record each binding choice under `wiki/decisioni/` with the alternative rejected, and append one line to `wiki/log.md`. Pages link the contracts, they do not restate them.

## Quality gate
Reject the result when it relies on static logs, hidden calculations, overlapping agent authority, an unbounded loop, or a non-blocking human gate.
