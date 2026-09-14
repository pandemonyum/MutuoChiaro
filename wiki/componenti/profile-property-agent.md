---
titolo: Profile & Property Agent
tipo: componente
stato: verificato
aggiornato: 2026-09-14
fonti:
  - app/src/agents/profilePropertyAgent.ts
  - app/src/skills/buildFinancialProfile.ts
  - app/src/skills/selectNextDecisiveQuestion.ts
  - agents/profile-property.md
---

# Profile & Property Agent

Interpreta la situazione dichiarata e il piano di acquisto, rileva lacune e
contraddizioni, sceglie **una** domanda da porre.

| Voce | Riferimento |
| --- | --- |
| Codice | `app/src/agents/profilePropertyAgent.ts` |
| Skill usate | `build-financial-profile`, `select-next-decisive-question` |
| Contratto | [`agents/profile-property.md`](../../agents/profile-property.md) |
| Verifica | `app/tests/journey.e2e.test.ts`, `app/scripts/audit-structure.mjs` |

## L'idea che lo rende agentico

Non somministra un questionario fisso: ordina le lacune per impatto sul confronto e
sceglie la singola domanda che cambia di più il risultato. Le domande che vanno poste
alla banca non vengono girate all'utente. Nel percorso della demo la prima domanda
selezionata riguarda le rate già attive, ed è l'audit strutturale a verificarlo.

## Dove si ferma

Il numero di giri ha un massimo esplicito. Con input non validi l'agente non prosegue:
dichiara gli errori bloccanti e l'orchestratore porta il run in `ESCALATED`. La
confidenza dichiarata scende con l'impatto delle lacune residue.

## Collegamenti

- Perché la lacuna non viene colmata con una stima → [../concetti/dato-mancante.md](../concetti/dato-mancante.md)
- Cosa serve conoscere per la domanda → [../concetti/perizia-e-liquidita.md](../concetti/perizia-e-liquidita.md)
- Chi applica il risultato → [orchestratore.md](orchestratore.md)
