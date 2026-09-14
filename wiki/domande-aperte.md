# Domande aperte

Dubbi che la wiki non risolve. Una voce resta qui finché una fonte non la chiude; alla
chiusura si aggiorna la pagina pertinente, si cita la fonte e si annota in
[log.md](log.md). Una domanda senza pagina di destinazione indicata è incompleta.

| # | Domanda | Perché conta | Dove finirà la risposta | Fonte che servirebbe |
| --- | --- | --- | --- | --- |
| D1 | Il concetto TAN/TAEG non è verificato da nessuna domanda del quiz: va aggiunta una domanda o va dichiarato fuori perimetro? | Oggi una spiegazione sul TAEG può essere letta senza che il sistema misuri se è stata capita | [concetti/taeg.md](concetti/taeg.md), [componenti/offer-clarity-agent.md](componenti/offer-clarity-agent.md) | `app/src/data/quizBank.ts` più una decisione di perimetro |
| D2 | Il blocco lessicale di `SafetyGuard` è lessicale: quali riformulazioni non conformi passerebbero comunque? | Determina se il gate di policy è una garanzia o una rete parziale | [componenti/safety-guard.md](componenti/safety-guard.md), [decisioni/nessuna-classifica.md](decisioni/nessuna-classifica.md) | Casi avversariali aggiuntivi in `agents/evals/failure-cases.md` |
| D3 | `RATE_PLUS_2PP` applica un rialzo immediato e permanente: quanto questa semplificazione distorce ciò che l'utente impara sul variabile? | Rischio didattico dichiarato ma non misurato | [concetti/scenario-ipotetico.md](concetti/scenario-ipotetico.md), [concetti/tipi-di-tasso.md](concetti/tipi-di-tasso.md) | Confronto con un piano di indicizzazione reale, oggi assente dal repo |
| D4 | Le metriche before/after di `MetricsEngine` sono calcolate su dati sintetici: cosa servirebbe per renderle un'evidenza esterna? | Separa evidenza osservata da evidenza dichiarata | [componenti/metrics-engine.md](componenti/metrics-engine.md), [sintesi/panoramica-sistema.md](sintesi/panoramica-sistema.md) | Un protocollo di test con persone, fuori dal perimetro attuale |
| D5 | La wiki è coerente col codice solo finché qualcuno esegue il lint: va agganciata a un hook di commit? | Il modello di riferimento regge sul fatto che la manutenzione costi quasi nulla | [decisioni/wiki-come-layer-di-conoscenza.md](decisioni/wiki-come-layer-di-conoscenza.md) | Decisione della persona, non deducibile dal repo |
