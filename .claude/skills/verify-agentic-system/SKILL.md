---
name: verify-agentic-system
description: Audit an agentic project against executable evidence and failure paths. Use after runtime changes and before freeze.
---

# Verify Agentic System

## Workflow
1. Run typecheck, tests, build, the structural audit, and `npm run wiki:lint`.
2. Inspect success, missing input, invalid input, tool failure, unsafe output, loop limit, and human gate.
3. Separate observed evidence from unsupported documentation claims. A page in `wiki/` marked `stato: verificato` whose behavior no test or audit check covers is an unsupported claim, and the page is demoted to `da-verificare`.
4. Rank no more than three fixes by score impact and effort.

## Required output
`docs/AGENTIC_READINESS.md` with commands, evidence, failures, and fixes, plus the wiki verdict: which pages the audit contradicted, which must drop to `stato: da-verificare`, and which gaps belong in `wiki/domande-aperte.md`. An auditor without write tools reports these edits; it does not apply them.

## Quality gate
Reject the result when it relies on static logs, hidden calculations, overlapping agent authority, an unbounded loop, or a non-blocking human gate.
