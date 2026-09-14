---
titolo: Panoramica del sistema
tipo: sintesi
stato: verificato
aggiornato: 2026-09-14
fonti:
  - app/src/runtime/buildRuntime.ts
  - agents/workflow.md
  - docs/AGENTIC_ARCHITECTURE.md
---

# Panoramica del sistema

Pagina di ingresso per chi arriva al progetto. Descrive come i pezzi si tengono, non
cosa ciascuno fa: per quello ci sono le pagine in [../componenti/](../componenti/).

## La catena

Un solo componente muta lo stato: [l'orchestratore](../componenti/orchestratore.md).
Tutto il resto è invocato attraverso
[un unico kernel](../componenti/registry-ed-eventi.md) e riceve uno snapshot congelato.
I numeri nascono in due tool
([calcolatore](../componenti/mortgage-calculator.md),
[motore degli scenari](../componenti/affordability-scenario-engine.md)); i testi nascono
in un agente ([clarity](../componenti/offer-clarity-agent.md)) e passano tutti da
[un filtro](../componenti/safety-guard.md) prima dell'interfaccia; il percorso non si
chiude senza [una persona](../componenti/gate-umano.md).

## Le quattro regole che spiegano quasi tutte le scelte

1. [Il dato assente resta `null`](../decisioni/dato-mancante-resta-null.md)
2. [Nessuna classifica, nessun punteggio](../decisioni/nessuna-classifica.md)
3. [I calcoli vivono solo nei tool](../decisioni/calcoli-solo-nei-tool.md)
4. [Il gate umano blocca davvero](../decisioni/gate-umano-bloccante.md)

Ciascuna è imposta dal codice e verificata da un test o dall'audit strutturale: è la
differenza fra un vincolo e un'intenzione —
[../fonti/repository-mutuochiaro.md](../fonti/repository-mutuochiaro.md).

## Cosa il sistema deliberatamente non fa

Non consiglia, non ordina, non valuta l'idoneità al credito, non prevede i tassi, non
usa dati reali, non chiama servizi esterni. Le metriche di esito esistono ma restano
misure su dati sintetici — [../componenti/metrics-engine.md](../componenti/metrics-engine.md).

## Dove guardare dopo

- Sequenza reale delle fasi → [`agents/workflow.md`](../../agents/workflow.md)
- Evidenza per criterio → [`docs/EVIDENCE_MATRIX.md`](../../docs/EVIDENCE_MATRIX.md)
- Confronto con il progetto di riferimento → [confronto-con-il-riferimento.md](confronto-con-il-riferimento.md)
