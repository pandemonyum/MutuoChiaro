# Casi di valutazione della demo

Scenari operativi adattati al dataset locale di Andrea. Non sono fixture caricate
automaticamente: i test collegati sono le verifiche eseguibili. Il riferimento usa
un pretest 1/3, un'offerta B incompleta e cinque lenti; qui non si assumono quei dati.

| Caso | Azione | Evidenza attesa | Verifica |
| --- | --- | --- | --- |
| D1 - Domanda decisiva | Creare un run e avviare il profilo con rate attive non dichiarate | `existingMonthlyDebts = null`, fase `PROFILE_INCOMPLETE`, domanda sul dato mancante, `question.selected` | [journey.e2e.test.ts](../../app/tests/journey.e2e.test.ts) |
| D2 - Dato mancante nell'offerta | Dichiarare le rate e normalizzare le offerte | `offer-c.insuranceCost = null`, `offer.incomplete`, totale parziale e domanda per la banca, nessuna stima | [journey.e2e.test.ts](../../app/tests/journey.e2e.test.ts) |
| D3 - MutuoSpecchio | Calcolare i quattro scenari | Dodici righe omogenee, provenienza e ipotesi visibili, nessun vincitore o punteggio aggregato | [journey.e2e.test.ts](../../app/tests/journey.e2e.test.ts), [scenarios.test.ts](../../app/tests/scenarios.test.ts) |
| D4 - Feedback mirato | Avviare il quiz e dare una risposta errata | `understanding.failed`, feedback sul concetto e scenario pertinente da riaprire, tentativo registrato | [stateMachine.test.ts](../../app/tests/stateMachine.test.ts), [schemas.test.ts](../../app/tests/schemas.test.ts) |
| D5 - Gate umano | Superare il quiz senza approvare, poi confermare esplicitamente | Prima `AWAITING_HUMAN_CONFIRMATION`, poi `COMPLETED` solo con `completionBlockers` vuoto | [stateMachine.test.ts](../../app/tests/stateMachine.test.ts), [journey.e2e.test.ts](../../app/tests/journey.e2e.test.ts) |
| D6 - Tracciabilita' | Aprire un'invocazione annidata del calcolatore | `inputRef` e `outputRef` risolvibili, eventi del registry e stato modificato solo dall'orchestratore | [registry.test.ts](../../app/tests/registry.test.ts), [schemas.test.ts](../../app/tests/schemas.test.ts) |

Per l'esecuzione manuale seguire [DEMO_SCRIPT.md](../../docs/DEMO_SCRIPT.md).
Confrontare i numeri con [BEFORE_AFTER_EVIDENCE.md](../../docs/BEFORE_AFTER_EVIDENCE.md),
senza duplicarli in questo catalogo. Per tutte le verifiche: `npm run verify`
dalla radice di MutuoChiaro.