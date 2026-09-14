---
titolo: Il repository come fonte di verità
tipo: fonte
stato: verificato
aggiornato: 2026-09-14
fonti:
  - app/src/runtime/buildRuntime.ts
  - app/scripts/audit-structure.mjs
  - agents/AGENTS.md
  - docs/EVIDENCE_MATRIX.md
---

# Il repository come fonte di verità

La prima fonte ingerita non è un documento esterno: è il prototipo stesso. Questa pagina
dice dove guardare quando una pagina della wiki va verificata.

## Dove vive la verità

| Domanda | Fonte grezza da rileggere |
| --- | --- |
| Cosa esiste davvero a runtime | `app/src/runtime/buildRuntime.ts` e l'elenco `EXPECTED_COMPONENTS` |
| Cosa il sistema garantisce | `app/tests/` e `app/scripts/audit-structure.mjs` |
| Quali doveri e divieti valgono per un ruolo | i contratti in [`agents/`](../../agents/AGENTS.md) |
| Quale evidenza copre quale criterio | [`docs/EVIDENCE_MATRIX.md`](../../docs/EVIDENCE_MATRIX.md) |
| Quali limiti sono dichiarati | [`docs/RISK_AND_CLARITY_NOTE.md`](../../docs/RISK_AND_CLARITY_NOTE.md) |
| Cosa la demo mostra e in quale ordine | [`docs/DEMO_SCRIPT.md`](../../docs/DEMO_SCRIPT.md) |

## Come leggerla

L'audit strutturale non legge la documentazione: costruisce il runtime, esegue un percorso
completo e controlla le proprietà sul risultato. Una pagina della wiki che afferma
qualcosa sul comportamento del sistema deve poter indicare o un test o un controllo di
quell'audit. Se non può, il suo `stato` non è `verificato`.

## Confine

I documenti in `agents/` e le pagine di questa wiki **non** sono caricati dal runtime.
Descrivono e vincolano il lavoro di chi sviluppa, non il comportamento del programma in
esecuzione. Il contenuto didattico effettivamente mostrato all'utente nasce nel codice:
le domande e il feedback stanno in `app/src/data/quizBank.ts`, i testi passano da
[`SafetyGuard`](../componenti/safety-guard.md) prima di raggiungere l'interfaccia.

Pagine derivate: [../sintesi/panoramica-sistema.md](../sintesi/panoramica-sistema.md),
tutte le pagine in [../componenti/](../componenti/).
