---
titolo: Scostamenti dal progetto di riferimento
tipo: sintesi
stato: verificato
aggiornato: 2026-09-14
fonti:
  - agents/AGENTS.md
  - app/src/data/quizBank.ts
  - app/src/core/stateMachine.ts
---

# Scostamenti dal progetto di riferimento

Il pacchetto in [`agents/`](../../agents/AGENTS.md) riprende la struttura del progetto
di riferimento `DryRunHackaton/MutuoChiaro`. I contenuti sono adattati, non copiati:
questa pagina tiene insieme gli scostamenti in un punto solo, perché sono la causa più
probabile di un'affermazione sbagliata da parte di chi conosce il riferimento.

| Riferimento | Qui | Nota |
| --- | --- | --- |
| Persona e cinque lenti | Andrea e MutuoSpecchio | diversa struttura di presentazione |
| Stato finale `DONE` | `COMPLETED` | vocabolario delle fasi allineato al codice locale |
| Tool failure → `DEMO_FALLBACK` | tool failure → `ESCALATED` | non esiste uno stato di ripiego dimostrativo |
| Due tentativi di quiz | tre tentativi totali | `MAX_QUIZ_ATTEMPTS` nel codice |
| Blocco lessicale impeditivo | blocco con testo sostitutivo ed evento | non impedisce da solo il completamento dopo il gate |

## Perché importa

Un documento del riferimento letto come se valesse qui produce affermazioni non
verificabili sul runtime locale. Gli schemi autorevoli sono i tre in
`agents/schemas/`, già verificati contro il codice da `schemas.test`.

## Collegamenti

- Stati e transizioni → [../componenti/orchestratore.md](../componenti/orchestratore.md)
- Comportamento al blocco → [../componenti/safety-guard.md](../componenti/safety-guard.md)
- Quadro d'insieme → [panoramica-sistema.md](panoramica-sistema.md)
