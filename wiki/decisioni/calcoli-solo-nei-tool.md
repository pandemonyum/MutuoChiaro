---
titolo: I calcoli vivono solo nei tool
tipo: decisione
stato: verificato
aggiornato: 2026-09-14
fonti:
  - AGENTS.md
  - app/src/tools/mortgageCalculator.ts
  - app/tests/scenarios.test.ts
---

# I calcoli vivono solo nei tool

**Decisione.** Rate e interessi esistono in
[`MortgageCalculator`](../componenti/mortgage-calculator.md); liquidità e margini in
[`AffordabilityScenarioEngine`](../componenti/affordability-scenario-engine.md).
Nessun agente, nessuna skill e nessun testo esegue una formula: descrivono valori già
prodotti.

**Alternativa scartata.** Lasciare che l'agente esplicativo ricalcoli al volo i valori
che cita. Più comodo, e sufficiente a rendere ogni numero mostrato non verificabile e
potenzialmente diverso da quello dello scenario.

**Conseguenza accettata.** Più passaggi e più invocazioni registrate per ottenere un
testo. In cambio, ogni numero mostrato ha un'unica origine citabile —
[../concetti/provenienza.md](../concetti/provenienza.md).

**Come si verifica.** Rimuovendo l'invocazione registrata del calcolatore dal percorso
degli scenari la suite fallisce: il vincolo è imposto da un test, non dalla convenzione.
