# Indice della wiki

Catalogo orientato al contenuto. Caricare **solo** le pagine pertinenti alla domanda
corrente: non concatenare le cartelle. Struttura, convenzioni e procedure di
`ingest` / `query` / `lint` sono in [SCHEMA.md](SCHEMA.md).

Registro delle operazioni: [log.md](log.md) · Dubbi non risolti:
[domande-aperte.md](domande-aperte.md) · Fonti grezze: [raw/README.md](raw/README.md).

## Da dove partire

| Se devi… | Leggi |
| --- | --- |
| capire come si tiene insieme il sistema | [sintesi/panoramica-sistema.md](sintesi/panoramica-sistema.md) |
| capire perché una scelta è stata fatta così | [decisioni/](decisioni/) |
| toccare un pezzo di runtime | la pagina in [componenti/](componenti/) e poi il contratto in [`agents/`](../agents/AGENTS.md) |
| spiegare un concetto all'utente | la pagina in [concetti/](concetti/) e il frammento in [`agents/knowledge/`](../agents/knowledge/index.md) |
| evitare di ripetere un errore già noto del riferimento | [sintesi/confronto-con-il-riferimento.md](sintesi/confronto-con-il-riferimento.md) |

## Concetti

| Pagina | Risponde a | Stato |
| --- | --- | --- |
| [concetti/costi-del-mutuo.md](concetti/costi-del-mutuo.md) | perché la rata bassa non significa mutuo meno caro | verificato |
| [concetti/tipi-di-tasso.md](concetti/tipi-di-tasso.md) | cosa distingue davvero fisso e variabile, e cosa il modello semplifica | verificato |
| [concetti/perizia-e-liquidita.md](concetti/perizia-e-liquidita.md) | cosa resta in tasca dopo l'acquisto e perché la perizia lo cambia | verificato |
| [concetti/taeg.md](concetti/taeg.md) | cosa il TAEG include, cosa no, e perché qui non viene ricalcolato | verificato |
| [concetti/dato-mancante.md](concetti/dato-mancante.md) | perché un costo assente non diventa zero | verificato |
| [concetti/provenienza.md](concetti/provenienza.md) | come si sa da dove viene ogni numero mostrato | verificato |
| [concetti/scenario-ipotetico.md](concetti/scenario-ipotetico.md) | qual è la differenza fra «cosa cambierebbe se» e una previsione | verificato |

## Componenti

| Pagina | Ruolo nel runtime | Stato |
| --- | --- | --- |
| [componenti/orchestratore.md](componenti/orchestratore.md) | unico mutatore dello stato, applica le transizioni | verificato |
| [componenti/profile-property-agent.md](componenti/profile-property-agent.md) | rileva le lacune e sceglie la domanda decisiva | verificato |
| [componenti/offer-clarity-agent.md](componenti/offer-clarity-agent.md) | produce i testi mostrati e il feedback del quiz | verificato |
| [componenti/gate-umano.md](componenti/gate-umano.md) | passaggio umano obbligatorio prima della chiusura | verificato |
| [componenti/mortgage-calculator.md](componenti/mortgage-calculator.md) | rata, interessi, costo totale simulato | verificato |
| [componenti/affordability-scenario-engine.md](componenti/affordability-scenario-engine.md) | margine, liquidità, scenari | verificato |
| [componenti/offer-schema-validator.md](componenti/offer-schema-validator.md) | validità, parzialità e provenienza delle offerte | verificato |
| [componenti/safety-guard.md](componenti/safety-guard.md) | ultimo filtro sui testi verso l'interfaccia | verificato |
| [componenti/metrics-engine.md](componenti/metrics-engine.md) | metriche di esito e confronto before/after | da-verificare |
| [componenti/registry-ed-eventi.md](componenti/registry-ed-eventi.md) | kernel di invocazione, eventi, artifact | verificato |

## Decisioni

| Pagina | Decisione | Stato |
| --- | --- | --- |
| [decisioni/dato-mancante-resta-null.md](decisioni/dato-mancante-resta-null.md) | il valore assente non viene stimato né azzerato | verificato |
| [decisioni/nessuna-classifica.md](decisioni/nessuna-classifica.md) | nessun ordinamento, punteggio o giudizio di idoneità | verificato |
| [decisioni/calcoli-solo-nei-tool.md](decisioni/calcoli-solo-nei-tool.md) | le formule esistono in un solo posto | verificato |
| [decisioni/gate-umano-bloccante.md](decisioni/gate-umano-bloccante.md) | senza conferma umana il run non si chiude | verificato |
| [decisioni/wiki-come-layer-di-conoscenza.md](decisioni/wiki-come-layer-di-conoscenza.md) | adozione e adattamento del modello a tre livelli | verificato |

## Fonti

| Pagina | Fonte sintetizzata | Stato |
| --- | --- | --- |
| [fonti/llm-wiki-karpathy.md](fonti/llm-wiki-karpathy.md) | il modello «LLM wiki», citato per URL | verificato |
| [fonti/repository-mutuochiaro.md](fonti/repository-mutuochiaro.md) | il prototipo stesso: dove vive la verità | verificato |

## Sintesi

| Pagina | Mette in relazione | Stato |
| --- | --- | --- |
| [sintesi/panoramica-sistema.md](sintesi/panoramica-sistema.md) | componenti e decisioni in un quadro unico | verificato |
| [sintesi/confronto-con-il-riferimento.md](sintesi/confronto-con-il-riferimento.md) | gli scostamenti dal progetto di riferimento | verificato |
