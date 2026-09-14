# Mortgage Journey Orchestrator

## Scopo

Condurre il percorso educativo dal profilo al gate umano. Solo
[`MortgageJourneyOrchestrator`](../app/src/orchestrator/mortgageJourneyOrchestrator.ts)
possiede il token di mutazione del run e autorizza le transizioni.

## Non fare

Non estrarre dati, eseguire formule, valutare risposte o generare spiegazioni.
Non classificare offerte, stimare approvazioni o chiudere un run senza conferma umana.
Non invocare direttamente le implementazioni: usare sempre il registry.

## Input e contesto minimo

Comando API, fase corrente, snapshot del run e output del componente precedente.
Passare a ogni componente solo i campi previsti dal suo contratto in
[AGENTS.md](AGENTS.md), senza cronologia completa o documenti estranei al passaggio.
Per il contesto educativo consultare l'indice della knowledge base, non tutti i frammenti.

## Procedura

1. Verificare la fase con la [macchina a stati](../app/src/core/stateMachine.ts).
2. Delegare profilo e domanda decisiva a `profile-property-agent`.
3. Invocare `OfferSchemaValidator` e `normalize-mortgage-offers` per le offerte.
4. Delegare i calcoli a `AffordabilityScenarioEngine`, che invoca `MortgageCalculator`.
5. Delegare le spiegazioni a `offer-clarity-agent`, con controllo `SafetyGuard`.
6. Invocare `assess-user-understanding`; riaprire gli scenari indicati dal feedback.
7. Rispettare `maxQuestionRounds` e `MAX_QUIZ_ATTEMPTS`: quest'ultimo vale 3,
   ossia un primo tentativo e al massimo due ulteriori verifiche.
8. Richiedere il gate in `AWAITING_HUMAN_CONFIRMATION`, anche con esito `NOT_VERIFIED`.
9. Consentire `COMPLETED` solo con conferma esplicita e `completionBlockers` vuoto.

## Output e tracciabilita

`OrchestratorView`: stato, spiegazioni, metriche, prossima azione e requisiti aperti.
Ogni invocazione produce eventi e artifact `inputRef` / `outputRef` tramite il
[registry](../app/src/core/registry.ts). Lo stato deve rispettare lo
[schema runtime](schemas/runtime-state.schema.json).

## Done

La fase risultante e' legale, il componente riceve il contesto previsto e il passaggio
e' osservabile. La chiusura e' `COMPLETED` con gate soddisfatto oppure `ESCALATED`
con motivo registrato.

## Fallback

- Dato assente: mantenere `null`; domanda decisiva o confronto parziale dichiarato.
- Input bloccante o tool indisponibile: `ESCALATED`, senza calcolo sostitutivo.
- Testo non conforme: usare solo la riscrittura approvata da `SafetyGuard`.
- Limite quiz: `NOT_VERIFIED`, avviso e gate umano; non dichiarare comprensione acquisita.
- Transizione illegale: rifiutarla senza cambiare fase.

Questi nomi sono quelli del runtime locale. Gli stati `DONE`, `HUMAN_REVIEW` e
`DEMO_FALLBACK` del progetto di riferimento non sono transizioni di questa applicazione.