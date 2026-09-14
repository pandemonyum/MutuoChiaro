---
titolo: AffordabilityScenarioEngine
tipo: componente
stato: verificato
aggiornato: 2026-09-14
fonti:
  - app/src/tools/affordabilityScenarioEngine.ts
  - app/tests/scenarios.test.ts
---

# AffordabilityScenarioEngine

Tool deterministico. Autorità esclusiva su rapporto rata/reddito, margine, liquidità
necessaria e residua, effetto della perizia e del reddito, confronto con il fondo di
emergenza dichiarato.

| Voce | Riferimento |
| --- | --- |
| Codice | `app/src/tools/affordabilityScenarioEngine.ts` |
| Verifica | `app/tests/scenarios.test.ts` |
| Scenari | `BASE`, `RATE_PLUS_2PP`, `APPRAISAL_MINUS_10` |

## Separazione dal calcolatore

Rata e interessi non nascono qui: l'engine invoca
[mortgage-calculator.md](mortgage-calculator.md) e costruisce sopra le grandezze di
sostenibilità. La divisione evita che la stessa formula esista in due punti con due
comportamenti ai bordi.

## Quando fallisce

Importi negativi, reddito complessivo non positivo, prezzo o risparmi assenti. Un
risparmio assente non diventa zero: il fallimento è preferibile al margine inventato —
[../concetti/dato-mancante.md](../concetti/dato-mancante.md).

## Collegamenti

- Concetti serviti → [../concetti/perizia-e-liquidita.md](../concetti/perizia-e-liquidita.md), [../concetti/tipi-di-tasso.md](../concetti/tipi-di-tasso.md)
- Natura dei risultati → [../concetti/scenario-ipotetico.md](../concetti/scenario-ipotetico.md)
