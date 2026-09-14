---
titolo: Scenario ipotetico, non previsione
tipo: concetto
stato: verificato
aggiornato: 2026-09-14
fonti:
  - app/src/tools/affordabilityScenarioEngine.ts
  - docs/RISK_AND_CLARITY_NOTE.md
  - app/src/tools/safetyGuard.ts
---

# Scenario ipotetico, non previsione

## La distinzione

Uno scenario risponde a «cosa cambierebbe se», mai a «cosa succederà». `BASE`,
`RATE_PLUS_2PP` e `APPRAISAL_MINUS_10` sono variazioni dichiarate su dati sintetici, non
stime di probabilità. La differenza non è formale: uno scenario presentato come
previsione diventa un consiglio implicito.

## Come viene tenuta

La natura ipotetica è dichiarata nel testo che accompagna ogni scenario, e i testi
passano da [../componenti/safety-guard.md](../componenti/safety-guard.md) prima di
raggiungere l'interfaccia. Il vincolo generale è in
[../decisioni/nessuna-classifica.md](../decisioni/nessuna-classifica.md).

## Il limite noto

Gli scenari sono semplificazioni deliberate: un rialzo immediato e permanente, una
perizia più bassa di una percentuale fissa. Servono a rendere visibile una sensibilità,
non a modellare il mercato. I limiti dichiarati stanno in
[`docs/RISK_AND_CLARITY_NOTE.md`](../../docs/RISK_AND_CLARITY_NOTE.md); il dubbio
didattico ancora aperto è D3 in [../domande-aperte.md](../domande-aperte.md).

## Collegamenti

- Scenario sul tasso → [tipi-di-tasso.md](tipi-di-tasso.md)
- Scenario sulla perizia → [perizia-e-liquidita.md](perizia-e-liquidita.md)
- Perché uno scenario non è una raccomandazione → [../decisioni/nessuna-classifica.md](../decisioni/nessuna-classifica.md)
