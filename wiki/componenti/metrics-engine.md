---
titolo: MetricsEngine
tipo: componente
stato: da-verificare
aggiornato: 2026-09-14
fonti:
  - app/src/tools/metricsEngine.ts
  - docs/BEFORE_AFTER_EVIDENCE.md
---

# MetricsEngine

Tool deterministico. Autorità esclusiva sulle metriche di esito e sul confronto
before/after. Non fallisce: produce metriche dallo stato e dagli eventi disponibili.

| Voce | Riferimento |
| --- | --- |
| Codice | `app/src/tools/metricsEngine.ts` |
| Uso documentale | [`docs/BEFORE_AFTER_EVIDENCE.md`](../../docs/BEFORE_AFTER_EVIDENCE.md) |

## Perché lo stato è `da-verificare`

Le metriche sono calcolate correttamente sui dati del run, ma i dati del run sono
sintetici: misurano il comportamento del prototipo, non l'apprendimento di una persona
reale. Finché questa distinzione non è riflessa in ogni luogo che le cita, la pagina non
è `verificato`. È la domanda aperta D4 in [../domande-aperte.md](../domande-aperte.md).

## Collegamenti

- Da dove vengono i dati → [registry-ed-eventi.md](registry-ed-eventi.md)
- Come vanno presentate → [../sintesi/panoramica-sistema.md](../sintesi/panoramica-sistema.md)
