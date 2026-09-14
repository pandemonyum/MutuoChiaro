---
name: wiki-lint
description: Health-check the project wiki for contradictions, stale claims, orphan pages, and gaps. Use after a batch of ingests, after runtime changes, and before freeze.
---

# Wiki Lint

The lint has two halves. The bookkeeping half is a command; the judgement half is not.

## Workflow
1. Run the deterministic half and fix every failure it reports:
   ```bash
   npm run wiki:lint
   ```
   It checks frontmatter, vocabularies, dates, cited sources, link resolution, orphan pages, index alignment, log format, and the no-duplication rule against `agents/knowledge/`.
2. Audit what the command cannot see: contradictions between pages, claims a newer source has superseded, concepts referenced often but holding no page of their own, missing links between pages covering the same thing, and gaps a source already in the repo would close.
3. Check each page marked `stato: verificato` against its cited sources. Where the code and a page disagree, the code wins and the page is corrected.
4. Propose new questions for `wiki/domande-aperte.md` and sources worth ingesting.

## Required output
A short report separating command failures from judgement findings, the corrections applied, and one appended line in `wiki/log.md`.

## Quality gate
Reject the result when a page was silently rewritten without rereading its source, when a contradiction was resolved by deleting the inconvenient page instead of dating it `obsoleto`, or when the report claims a clean wiki while the command fails.
