# Registro della wiki

Append-only. Una riga per operazione, dalla più vecchia alla più recente. Formato e
operazioni ammesse in [SCHEMA.md](SCHEMA.md#formato-del-log). Le voci passate non si
riscrivono: una correzione è una nuova voce.

## [2026-09-14] schema | creazione dei tre livelli: raw/, wiki/, SCHEMA.md; convenzioni di frontmatter, link relativi, regola di non duplicazione

## [2026-09-14] ingest | fonte: gist "LLM wiki" (karpathy) -> fonti/llm-wiki-karpathy.md, SCHEMA.md, decisioni/wiki-come-layer-di-conoscenza.md

## [2026-09-14] ingest | fonte: repository MutuoChiaro (codice, test, contratti, docs) -> fonti/repository-mutuochiaro.md, 10 pagine in componenti/, 7 in concetti/, 5 in decisioni/, 2 in sintesi/

## [2026-09-14] lint | primo passaggio: scripts/wiki-lint.mjs attivo, collegato a npm run wiki:lint e alla verifica di radice; lacune semantiche aperte in domande-aperte.md
