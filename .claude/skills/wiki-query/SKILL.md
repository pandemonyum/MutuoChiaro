---
name: wiki-query
description: Answer a question from the project wiki with citations and file the durable answers back. Use before reconstructing context from code, chat history, or the reference project.
---

# Wiki Query

The wiki lives in `wiki/`. Its structure and conventions are declared in `wiki/SCHEMA.md`.

## Workflow
1. Read `wiki/index.md` and load only the pages the question bears on. Never concatenate a folder.
2. Answer from those pages, citing each page used and, through it, the raw source. A page marked `da-verificare` or `obsoleto` is not evidence: reread its source first.
3. When the wiki does not hold the answer, say so and open an entry in `wiki/domande-aperte.md` instead of inferring one.
4. When the answer is worth keeping, file it back: a new page under `wiki/sintesi/`, or an update to the page that should have held it.

## Required output
The answer with its citations, plus — whenever the wiki changed — the updated pages, the `wiki/index.md` entry, one appended line in `wiki/log.md`, and `npm run wiki:lint` passing.

## Quality gate
Reject the result when a claim has no page or source behind it, when a demo figure is quoted from a page instead of the run state, or when a valuable analysis is left only in the conversation.
