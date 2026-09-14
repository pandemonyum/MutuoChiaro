---
titolo: Il gate umano blocca davvero
tipo: decisione
stato: verificato
aggiornato: 2026-09-14
fonti:
  - app/src/core/stateMachine.ts
  - agents/AGENTS.md
  - app/tests/stateMachine.test.ts
---

# Il gate umano blocca davvero

**Decisione.** Nessun run raggiunge `COMPLETED` senza una conferma esplicita della
persona in fase `AWAITING_HUMAN_CONFIRMATION` e con tutte le precondizioni soddisfatte.
La tabella delle transizioni non prevede alcun percorso alternativo verso lo stato
finale.

**Alternativa scartata.** Un gate informativo — mostrare l'avviso e proseguire. È la
forma più diffusa di controllo umano ed è indistinguibile, per l'utente, dall'assenza di
controllo.

**Conseguenza accettata.** La demo non è completamente automatizzabile: qualcuno deve
premere. L'audit strutturale infatti si ferma, verifica lo stato di attesa e solo dopo
conferma.

**Come si verifica.** `app/tests/stateMachine.test.ts` per il blocco; l'audit
strutturale controlla che nessuna fase diversa da `AWAITING_HUMAN_CONFIRMATION` porti a
`COMPLETED` e che `COMPLETED` ed `ESCALATED` siano terminali.

Descrizione del passaggio: [../componenti/gate-umano.md](../componenti/gate-umano.md).
