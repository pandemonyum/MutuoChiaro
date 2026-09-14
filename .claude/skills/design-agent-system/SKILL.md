---
name: design-agent-system
description: Design a minimal executable multi-agent architecture. Use after problem framing or when handoffs exist only in documentation.
---

# Design Agent System

## Workflow
1. Build the agent/skill/tool/human capability matrix.
2. Define non-overlapping agent contracts and external state.
3. Define legal transitions, bounded loops, failures, and human gate.
4. Map every claim to runtime code, schema, test, or human action.

## Required output
Create or update `agents/`, `agents/schemas/`, and `docs/AGENTIC_ARCHITECTURE.md`.

## Quality gate
Reject the result when it relies on static logs, hidden calculations, overlapping agent authority, an unbounded loop, or a non-blocking human gate.
