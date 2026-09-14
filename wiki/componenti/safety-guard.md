---
titolo: SafetyGuard
tipo: componente
stato: verificato
aggiornato: 2026-09-14
fonti:
  - app/src/tools/safetyGuard.ts
  - app/tests/safetyGuard.test.ts
  - agents/policy-gate.md
---

# SafetyGuard

Tool deterministico. Ultimo passaggio prima dell'interfaccia: blocca e riformula i testi
non conformi.

| Voce | Riferimento |
| --- | --- |
| Codice | `app/src/tools/safetyGuard.ts` (`SAFETY_RULES`) |
| Contratto | [`agents/policy-gate.md`](../../agents/policy-gate.md) |
| Verifica | `app/tests/safetyGuard.test.ts`, `app/scripts/audit-structure.mjs` |

## Comportamento al blocco

Non fallisce: restituisce sempre testi ammessi. La frase non conforme viene sostituita
da una formulazione neutrale, il blocco diventa un evento osservabile e l'originale
resta **solo** nel registro dei blocchi come pista di audit — l'interfaccia non lo
mostra. Un blocco non impedisce da solo il completamento dopo il gate umano.

## Il limite da non dimenticare

Il controllo è lessicale. Copre il vocabolario della raccomandazione — «migliore»,
«conviene», «classifica», «punteggio», «probabilità di approvazione» — ma una frase che
suggerisce una scelta senza usare quelle parole passerebbe. Il presidio vero è
strutturale: l'assenza di campi di ranking nello schema e il fatto che nessun componente
produca un ordinamento. Il perimetro residuo è la domanda aperta D2.

## Collegamenti

- Regola che applica → [../decisioni/nessuna-classifica.md](../decisioni/nessuna-classifica.md)
- Chi gli passa i testi → [offer-clarity-agent.md](offer-clarity-agent.md)
- Dichiarazione degli scenari → [../concetti/scenario-ipotetico.md](../concetti/scenario-ipotetico.md)
