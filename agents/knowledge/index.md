# Indice della conoscenza

Caricare solo il frammento associato al dubbio corrente. Non concatenare la cartella,
i documenti delle offerte o tutta la cronologia del run. Questi frammenti guidano
sviluppo e revisione: il runtime usa il feedback definito in
[quizBank.ts](../../app/src/data/quizBank.ts), non legge questi Markdown.

| Gap o task | Domanda | Scenario pertinente | Frammento |
| --- | --- | --- | --- |
| Rata vs costo totale | `q1` | `BASE` | [mortgage-costs.md](mortgage-costs.md) |
| Fisso vs variabile e sensibilita' al tasso | `q2` | `RATE_PLUS_2PP` | [rate-types.md](rate-types.md) |
| Perizia, anticipo e liquidita' | `q3` | `APPRAISAL_MINUS_10` | [property-liquidity.md](property-liquidity.md) |
| TAN vs TAEG e costi esclusi | Non verificato dal quiz attuale | Offerta dichiarata | [taeg.md](taeg.md) |

Non duplicare dati numerici delle offerte nei frammenti. Per un importo usare lo stato
e gli artifact del run; per un dato assente mantenere `null` e dichiararne il limite.