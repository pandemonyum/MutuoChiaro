---
titolo: Perizia, anticipo e liquidità
tipo: concetto
stato: verificato
aggiornato: 2026-09-14
fonti:
  - agents/knowledge/property-liquidity.md
  - app/src/tools/affordabilityScenarioEngine.ts
  - agents/profile-property.md
---

# Perizia, anticipo e liquidità

Estratto operativo per il percorso didattico:
[`agents/knowledge/property-liquidity.md`](../../agents/knowledge/property-liquidity.md).

## Perché è il punto cieco più costoso

Prezzo pattuito e valore di perizia sono due numeri diversi, e il secondo si scopre
tardi. Chi ragiona solo sulla rata scopre l'effetto della perizia quando la liquidità
residua è già impegnata. È l'unico concetto del percorso che riguarda ciò che resta
**dopo** la firma, non ciò che si paga ogni mese.

## Tre grandezze da non confondere

Liquidità necessaria, liquidità residua e fondo di emergenza dichiarato sono distinte.
Stare sotto la soglia dichiarata è un'informazione, non un giudizio di finanziabilità:
il sistema non valuta idoneità al credito, come stabilito in
[../decisioni/nessuna-classifica.md](../decisioni/nessuna-classifica.md).

## Quando il dato non c'è

Risparmi, debiti in corso o soglia non dichiarati restano `null`. Inserire uno zero
produrrebbe un margine falsamente rassicurante: vedi
[dato-mancante.md](dato-mancante.md). La lacuna con più impatto diventa la domanda
decisiva posta da
[../componenti/profile-property-agent.md](../componenti/profile-property-agent.md).

## Collegamenti

- Chi calcola margine e liquidità → [../componenti/affordability-scenario-engine.md](../componenti/affordability-scenario-engine.md)
- Scenario `APPRAISAL_MINUS_10` → [scenario-ipotetico.md](scenario-ipotetico.md)
