# Casi avversariali

Gli esiti sotto sono quelli del runtime locale, non gli stati del progetto di riferimento.
I casi sono specifiche di revisione; le suite collegate esercitano i controlli nel codice.

| Caso | Input o azione | Esito atteso | Verifica |
| --- | --- | --- | --- |
| F1 - Importi non validi | Capitale negativo, durata zero o tasso fuori intervallo | Errore esplicito del calcolatore, nessun numero sostitutivo | [mortgageCalculator.test.ts](../../app/tests/mortgageCalculator.test.ts) |
| F2 - Profilo non valido | Reddito zero o importi negativi | Dati bloccanti, busta `human-review`, run `ESCALATED` | [stateMachine.test.ts](../../app/tests/stateMachine.test.ts) |
| F3 - Incongruenze | TAEG inferiore al TAN o rata dichiarata incoerente | Segnalazione del validatore; non correggere il dato e non introdurre un'escalation automatica diversa dal codice | [offerValidator.test.ts](../../app/tests/offerValidator.test.ts) |
| F4 - Costo obbligatorio assente | `insuranceCost = null` con polizza obbligatoria | Dato `MISSING`, confronto parziale, domanda alla banca | [offerValidator.test.ts](../../app/tests/offerValidator.test.ts), [journey.e2e.test.ts](../../app/tests/journey.e2e.test.ts) |
| F5 - Output prescrittivo | Bozza "Ti conviene scegliere B" o "approvazione garantita" | `SafetyGuard` blocca, testo sostitutivo, `safety_guard.blocked` osservabile | [safetyGuard.test.ts](../../app/tests/safetyGuard.test.ts) |
| F6 - Limite quiz | Tre tentativi errati | `NOT_VERIFIED`, avviso e gate umano, nessun quarto tentativo nel percorso ordinario | [stateMachine.test.ts](../../app/tests/stateMachine.test.ts) |
| F7 - Tool indisponibile | Simulare indisponibilita' di `MortgageCalculator` | `tool.failed`, `ESCALATED`, nessun calcolo improvvisato | [stateMachine.test.ts](../../app/tests/stateMachine.test.ts), [registry.test.ts](../../app/tests/registry.test.ts) |
| F8 - Approvazione prematura | Confermare prima di `AWAITING_HUMAN_CONFIRMATION` | Transizione rifiutata, fase invariata | [stateMachine.test.ts](../../app/tests/stateMachine.test.ts) |
| F9 - Mutazione fuori orchestratore | Tentare accesso senza token o modifica dello snapshot | Mutazione rifiutata, nessuna modifica del run da agenti o skill | [stateMachine.test.ts](../../app/tests/stateMachine.test.ts) |
| F10 - Domande esaurite | Raggiungere il limite dei giri con lacune residue | Nessuna nuova domanda, lacune preservate, limite esplicito | [journey.e2e.test.ts](../../app/tests/journey.e2e.test.ts) |

Il filtro lessicale non prova l'assenza di qualunque consiglio possibile: per i limiti
vedere [policy-gate.md](../policy-gate.md). Non importare dal riferimento il rifiuto
del confronto con una sola offerta o l'obbligo di uno `stress delta` nell'offerta:
qui validazione e scenari hanno contratti diversi.