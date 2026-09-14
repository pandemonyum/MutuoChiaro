---
titolo: Provenienza di ogni valore mostrato
tipo: concetto
stato: verificato
aggiornato: 2026-09-14
fonti:
  - app/src/skills/normalizeMortgageOffers.ts
  - app/src/core/artifactStore.ts
  - app/scripts/audit-structure.mjs
---

# Provenienza di ogni valore mostrato

## La regola

Ogni riga normalizzata di un'offerta dichiara da dove viene il suo valore: dichiarato
dall'offerta, calcolato da un tool, oppure assente. L'utente non deve dedurre se un
numero è un dato o una stima del sistema.

## Perché è il fondamento della fiducia

Il prototipo chiede all'utente di non fidarsi delle scorciatoie del mercato. Non può poi
presentare numeri di origine ignota. La provenienza è ciò che rende una spiegazione
verificabile invece che autorevole: chi legge può risalire al tool o al campo che ha
prodotto il valore.

## Come si estende agli eventi

La stessa disciplina vale a livello di esecuzione: ogni invocazione registrata ha un
riferimento di input e uno di output, e ogni riferimento citato in un evento è
risolvibile in un artifact. È la versione macchina della stessa idea —
[../componenti/registry-ed-eventi.md](../componenti/registry-ed-eventi.md).

## Collegamenti

- Chi produce le righe uniformi → [../componenti/offer-schema-validator.md](../componenti/offer-schema-validator.md)
- Valore assente → [dato-mancante.md](dato-mancante.md)
- Valore ipotetico → [scenario-ipotetico.md](scenario-ipotetico.md)
- Ricaduta sulla wiki → [../decisioni/wiki-come-layer-di-conoscenza.md](../decisioni/wiki-come-layer-di-conoscenza.md)
