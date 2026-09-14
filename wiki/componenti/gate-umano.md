---
titolo: Gate umano
tipo: componente
stato: verificato
aggiornato: 2026-09-14
fonti:
  - app/src/core/stateMachine.ts
  - app/src/orchestrator/mortgageJourneyOrchestrator.ts
  - agents/AGENTS.md
  - app/tests/stateMachine.test.ts
---

# Gate umano

Non è software: è un passaggio obbligatorio eseguito da una persona, ammesso in una sola
fase del percorso.

| Voce | Riferimento |
| --- | --- |
| Imposizione | tabella delle transizioni e `completionBlockers` in `app/src/core/stateMachine.ts` |
| Contratto | [`agents/AGENTS.md`](../../agents/AGENTS.md) sezione *Human Gate* |
| Verifica | `app/tests/stateMachine.test.ts`, `app/scripts/audit-structure.mjs` |

## Cosa chiede e cosa non chiede

Chiede di dichiarare di aver compreso che la simulazione è educativa, usa dati sintetici
e non è una proposta, una delibera o una raccomandazione. **Non** chiede di scegliere
un'offerta, di esprimere una preferenza o di indicare un vincitore: chiederlo
trasformerebbe il gate nella raccomandazione che il sistema si vieta.

## Perché blocca davvero

La conferma fuori fase produce un errore di transizione e la fase resta invariata. La
conferma con precondizioni mancanti viene registrata, ma i requisiti aperti restano
scritti nello stato e la transizione è rifiutata. Non esiste alcuna scorciatoia verso
`COMPLETED` da una fase diversa: lo verifica l'audit strutturale.

## Collegamenti

- Motivo della scelta → [../decisioni/gate-umano-bloccante.md](../decisioni/gate-umano-bloccante.md)
- Chi applica la transizione → [orchestratore.md](orchestratore.md)
- Cosa deve essere già avvenuto → [offer-clarity-agent.md](offer-clarity-agent.md)
