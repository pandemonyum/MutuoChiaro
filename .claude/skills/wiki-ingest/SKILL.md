---
name: wiki-ingest
description: Integrate a new source into the project wiki and propagate the updates across pages, index, and log. Use when a document, run export, external reference, or landed change enters the project.
---

# Wiki Ingest

The wiki lives in `wiki/`. Its structure, conventions, and ownership rules are declared in `wiki/SCHEMA.md`. Read that file before writing any page.

## Workflow
1. Locate the source. External material belongs in `wiki/raw/` and is never modified; in-repo code, tests, and docs are sources as they are; remote material is cited by URL, not copied.
2. Read the source and state the takeaways before writing, so the human can redirect the emphasis.
3. Write or update one page under `wiki/fonti/` with the summary and the citation.
4. Propagate: update every page in `wiki/concetti/`, `wiki/componenti/`, `wiki/decisioni/`, and `wiki/sintesi/` the source touches, and keep the links reciprocal. A single source may touch ten or more pages.
5. Record what the source did not settle in `wiki/domande-aperte.md`, naming the page where the answer will land.

## Required output
Pages carrying valid frontmatter, an entry for each new page in `wiki/index.md` with its current `stato`, one appended line in `wiki/log.md`, and `npm run wiki:lint` passing.

## Quality gate
Reject the result when a page restates a contract from `agents/`, duplicates a fragment in `agents/knowledge/`, copies a demo figure, claims `stato: verificato` without rereading the cited source, or contradicts the code without flagging the conflict.
