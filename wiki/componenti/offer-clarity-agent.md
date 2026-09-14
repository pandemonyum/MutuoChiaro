---
titolo: Offer Clarity Agent
tipo: componente
stato: verificato
aggiornato: 2026-09-14
fonti:
  - app/src/agents/offerClarityAgent.ts
  - app/src/skills/explainMortgageTradeoffs.ts
  - app/src/skills/assessUserUnderstanding.ts
  - agents/adaptive-tutor.md
---

# Offer Clarity Agent

Traduce in linguaggio semplice differenze e trade-off già calcolati, dichiara i dati
mancanti, prepara il feedback del controllo di comprensione.

| Voce | Riferimento |
| --- | --- |
| Codice | `app/src/agents/offerClarityAgent.ts` |
| Skill usate | `explain-mortgage-tradeoffs`, `assess-user-understanding` |
| Contratto | [`agents/adaptive-tutor.md`](../../agents/adaptive-tutor.md), [`agents/offer-analyst.md`](../../agents/offer-analyst.md) |
| Verifica | `app/tests/journey.e2e.test.ts`, `app/tests/safetyGuard.test.ts` |

## Il passaggio obbligato

Raccoglie **tutti** i testi destinati all'interfaccia in un ordine stabile, li passa a
[safety-guard.md](safety-guard.md) e ricostruisce i gruppi usando solo i testi
approvati. Nessun testo raggiunge l'utente scavalcando questo passaggio: è questa
proprietà, non il vocabolario dell'agente, a rendere verificabile l'assenza di
raccomandazioni.

## Ciò che non fa

Nessuna graduatoria, nessun punteggio di convenienza, nessuna dichiarazione di
adeguatezza, nessuna formula eseguita direttamente, nessun dato inventato.

## Limite noto

Il feedback del quiz nasce da `app/src/data/quizBank.ts`, non dai frammenti in
[`agents/knowledge/`](../../agents/knowledge/index.md) né da questa wiki. Il concetto
TAN/TAEG resta spiegabile ma non verificato: domanda aperta D1.

## Collegamenti

- Concetti spiegati → [../concetti/costi-del-mutuo.md](../concetti/costi-del-mutuo.md), [../concetti/tipi-di-tasso.md](../concetti/tipi-di-tasso.md), [../concetti/taeg.md](../concetti/taeg.md)
- Dichiarazione delle lacune → [../concetti/dato-mancante.md](../concetti/dato-mancante.md)
- Origine dei valori citati → [affordability-scenario-engine.md](affordability-scenario-engine.md)
