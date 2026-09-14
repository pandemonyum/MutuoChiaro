---
titolo: Registry, eventi e artifact
tipo: componente
stato: verificato
aggiornato: 2026-09-14
fonti:
  - app/src/core/registry.ts
  - app/src/core/eventBus.ts
  - app/src/core/artifactStore.ts
  - app/tests/registry.test.ts
---

# Registry, eventi e artifact

L'infrastruttura che rende osservabile tutto il resto.

| Voce | Riferimento |
| --- | --- |
| Codice | `app/src/core/registry.ts`, `app/src/core/eventBus.ts`, `app/src/core/artifactStore.ts` |
| Verifica | `app/tests/registry.test.ts`, `app/scripts/audit-structure.mjs` |

## La proprietà che conta

`ComponentContext.invoke` è l'unico modo per eseguire un componente: anche le
invocazioni annidate passano dallo stesso kernel. Da qui discende tutto il resto — ogni
invocazione ha un riferimento di input e uno di output, ogni riferimento citato in un
evento è risolvibile in un artifact, ogni evento appartiene a un vocabolario dichiarato.

Senza questa proprietà, «tracciabile» sarebbe un'affermazione della documentazione. Con
essa è un controllo eseguibile sul run: l'audit strutturale conta gli eventi di un
percorso completo e li risolve uno per uno.

## Confine con la wiki

Il registro degli eventi documenta *cosa è successo in un run*; la wiki documenta *cosa
abbiamo capito del sistema*. Un export di run è una fonte grezza da depositare in
[../raw/README.md](../raw/README.md), non una pagina di wiki.

## Collegamenti

- Idea generale → [../concetti/provenienza.md](../concetti/provenienza.md)
- Chi ne è l'unico mutatore → [orchestratore.md](orchestratore.md)
- Chi le consuma → [metrics-engine.md](metrics-engine.md)
