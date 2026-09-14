---
name: prepare-demo
description: Prepare an evidence-backed three-minute demo and criterion-to-evidence matrix. Use only after verification passes.
---

# Prepare Demo

## Workflow
1. Read `wiki/index.md`, then `wiki/sintesi/panoramica-sistema.md` and the `wiki/decisioni/` pages, so the narrative claims only what the project has actually decided and verified.
2. Use one scenario for baseline and outcome, and expose one real handoff, skill, tool, state transition, and human gate.
3. Show one controlled failure or missing-data branch.
4. State limitations and distinguish synthetic evidence from external validation; `wiki/domande-aperte.md` is the register of what is still unresolved.

## Required output
Update `docs/DEMO_SCRIPT.md` and `docs/EVIDENCE_MATRIX.md`, then file the durable part of the narrative — the cross-cutting framing, not the script — under `wiki/sintesi/`, and append one line to `wiki/log.md`.

## Quality gate
Reject the result when it relies on static logs, hidden calculations, overlapping agent authority, an unbounded loop, or a non-blocking human gate.
