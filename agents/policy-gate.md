# Policy Gate

## Scopo e autorita'

Controllare i testi candidati prima della visualizzazione. L'implementazione autorevole
e' [SafetyGuard](../app/src/tools/safetyGuard.ts), invocato da `offer-clarity-agent`
attraverso il registry. Questo documento non aggiunge regole eseguibili.

## Blocca

Le formulazioni riconosciute dalle regole lessicali nelle categorie:

- `RECOMMENDATION`: consigli di scelta, per esempio "Ti conviene scegliere B".
- `RANKING`: classifiche o un'offerta dichiarata migliore in assoluto.
- `APPROVAL_ESTIMATE`: promesse o stime di approvazione del credito.
- `SUITABILITY`: offerta dichiarata adatta o inadatta alla persona.

Non inventare numeri e non descrivere scenari come certi restano vincoli del sistema,
ma il filtro lessicale non e' una verifica semantica universale di questi vincoli.
Provenienza e dati mancanti dipendono anche da validatore, tool, schemi e test.

## Consente

Confronti per criterio, descrizione dei trade-off, caveat, domande da porre alla banca
e spiegazioni educative senza raccomandazioni.

## Input, procedura e output

Input: `{ texts, source }`. Il tool controlla le frasi e restituisce
`{ source, blocked, matches, safeTexts }`. L'agente ricostruisce i gruppi di testo
usando esclusivamente `safeTexts` e registra `safety_guard.blocked` quando necessario.
I testi originali bloccati restano nella pista di audit, non nei messaggi educativi.

## Done e fallback

Nessuna frase intercettata raggiunge la UI nella sua forma originale. La sostituzione
e' neutrale ed esplicita, non una nuova affermazione finanziaria senza fonte.
In caso di blocco la busta dell'agente ha `status = fallback` e
`nextAction = REVIEW_BLOCKED_TEXTS`.

Diversamente dal riferimento, `blocked = true` non vieta da solo la chiusura del run:
il runtime prosegue con testi sostitutivi e mantiene obbligatorio il gate umano.
La conferma non e' un'approvazione bancaria ne' una scelta di contratto.

Verifica: [safetyGuard.test.ts](../app/tests/safetyGuard.test.ts) e
[casi avversariali](evals/failure-cases.md).