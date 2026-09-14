---
name: verify-agentic-system
description: Audit an agentic project against executable evidence and failure paths. Use after runtime changes and before freeze.
---

# Verify Agentic System

## Workflow
1. Run typecheck, tests, build, and the structural audit.
2. Inspect success, missing input, invalid input, tool failure, unsafe output, loop limit, and human gate.
3. Separate observed evidence from unsupported documentation claims.
4. Rank no more than three fixes by score impact and effort.

## Required output
Create `docs/AGENTIC_READINESS.md` with commands, evidence, failures, and fixes.

## Quality gate
Reject the result when it relies on static logs, hidden calculations, overlapping agent authority, an unbounded loop, or a non-blocking human gate.
