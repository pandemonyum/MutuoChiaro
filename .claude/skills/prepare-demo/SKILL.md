---
name: prepare-demo
description: Prepare an evidence-backed three-minute demo and criterion-to-evidence matrix. Use only after verification passes.
---

# Prepare Demo

## Workflow
1. Use one scenario for baseline and outcome.
2. Expose one real handoff, skill, tool, state transition, and human gate.
3. Show one controlled failure or missing-data branch.
4. State limitations and distinguish synthetic evidence from external validation.

## Required output
Update `docs/DEMO_SCRIPT.md` and `docs/EVIDENCE_MATRIX.md`.

## Quality gate
Reject the result when it relies on static logs, hidden calculations, overlapping agent authority, an unbounded loop, or a non-blocking human gate.
