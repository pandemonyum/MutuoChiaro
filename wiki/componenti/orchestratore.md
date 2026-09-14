---
titolo: Mortgage Journey Orchestrator
tipo: componente
stato: verificato
aggiornato: 2026-09-14
fonti:
  - app/src/orchestrator/mortgageJourneyOrchestrator.ts
  - app/src/core/stateMachine.ts
  - agents/orchestrator.md
  - app/tests/stateMachine.test.ts
---

# Mortgage Journey Orchestrator

Piano di controllo del percorso. Non è un agente: non produce testo per l'utente e non
esegue formule.

| Voce | Riferimento |
| --- | --- |
| Codice | `app/src/orchestrator/mortgageJourneyOrchestrator.ts`, `app/src/core/stateMachine.ts` |
| Contratto | [`agents/orchestrator.md`](../../agents/orchestrator.md), [`agents/workflow.md`](../../agents/workflow.md) |
| Verifica | `app/tests/stateMachine.test.ts`, `app/scripts/audit-structure.mjs` |

## Perché è l'unico a mutare lo stato

L'autorità esclusiva sulla mutazione è imposta dal codice, non dalla buona volontà: il
token di mutazione è un `Symbol` privato richiesto da `RunStore`, e lo snapshot passato
agli agenti è clonato e congelato in profondità. Un agente che tentasse di scrivere
troverebbe un oggetto immutabile. Questa è la ragione per cui gli altri componenti
possono essere descritti come puri.

## Ciò che non fa

Non calcola, non valida schemi di offerta, non valuta le risposte del quiz, non genera i
testi mostrati. Delega tutto attraverso
[registry-ed-eventi.md](registry-ed-eventi.md) e applica la transizione.

## Limite noto

Il percorso è una sequenza di fasi con transizioni dichiarate: non gestisce rami
paralleli né ripresa parziale di un run interrotto.

## Collegamenti

- Chiusura del percorso → [gate-umano.md](gate-umano.md)
- Prima fase → [profile-property-agent.md](profile-property-agent.md)
- Fase esplicativa → [offer-clarity-agent.md](offer-clarity-agent.md)
- Perché la chiusura richiede una persona → [../decisioni/gate-umano-bloccante.md](../decisioni/gate-umano-bloccante.md)
