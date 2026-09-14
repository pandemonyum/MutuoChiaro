---
titolo: Tasso fisso e tasso variabile
tipo: concetto
stato: verificato
aggiornato: 2026-09-14
fonti:
  - agents/knowledge/rate-types.md
  - app/src/tools/affordabilityScenarioEngine.ts
  - docs/RISK_AND_CLARITY_NOTE.md
---

# Tasso fisso e tasso variabile

Estratto operativo per il percorso didattico:
[`agents/knowledge/rate-types.md`](../../agents/knowledge/rate-types.md).

## La difficoltà reale

La scelta fra fisso e variabile non è una domanda su quale tasso sia più basso oggi: è
una domanda su quanta variazione una persona può assorbire. Il prototipo non risponde al
posto dell'utente e non prevede l'andamento dei tassi; mostra l'ampiezza dell'effetto
con uno scenario ipotetico e lascia il giudizio alla persona.

## La semplificazione dichiarata

Lo scenario `RATE_PLUS_2PP` applica un rialzo immediato e permanente sul capitale
iniziale. Non è un piano di indicizzazione: è un modo per rendere visibile la
sensibilità. La natura ipotetica va dichiarata ogni volta —
[scenario-ipotetico.md](scenario-ipotetico.md). Quanto questa scorciatoia distorca
l'apprendimento è la domanda aperta D3 in
[../domande-aperte.md](../domande-aperte.md).

## Collegamenti

- Chi calcola l'effetto → [../componenti/affordability-scenario-engine.md](../componenti/affordability-scenario-engine.md)
- Effetto sul margine mensile → [perizia-e-liquidita.md](perizia-e-liquidita.md)
- Cosa cambia sul costo complessivo → [costi-del-mutuo.md](costi-del-mutuo.md)
