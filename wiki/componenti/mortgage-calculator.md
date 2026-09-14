---
titolo: MortgageCalculator
tipo: componente
stato: verificato
aggiornato: 2026-09-14
fonti:
  - app/src/tools/mortgageCalculator.ts
  - app/tests/mortgageCalculator.test.ts
  - app/tests/scenarios.test.ts
---

# MortgageCalculator

Tool deterministico. Autorità esclusiva su rata, interessi, costo totale simulato e
ricalcolo con delta di tasso.

| Voce | Riferimento |
| --- | --- |
| Codice | `app/src/tools/mortgageCalculator.ts` |
| Verifica | `app/tests/mortgageCalculator.test.ts`, `app/tests/scenarios.test.ts` |

## Perché l'esclusività è verificabile

Non è una convenzione scritta: rimuovendo l'invocazione registrata del calcolatore dal
percorso degli scenari la suite si rompe. Il vincolo è quindi imposto da un test, non
dalla disciplina di chi scrive.

## Quando fallisce

Capitale non positivo, durata fuori dall'intervallo ammesso, tasso fuori intervallo,
valori non numerici. Il fallimento è esplicito e risale all'orchestratore: non produce
un numero approssimato.

## Collegamenti

- Concetto servito → [../concetti/costi-del-mutuo.md](../concetti/costi-del-mutuo.md)
- Regola generale → [../decisioni/calcoli-solo-nei-tool.md](../decisioni/calcoli-solo-nei-tool.md)
- Chi lo invoca sugli scenari → [affordability-scenario-engine.md](affordability-scenario-engine.md)
