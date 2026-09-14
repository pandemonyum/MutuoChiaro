# Accordo di lavoro - MutuoChiaro

## Missione

Mantenere un prototipo educativo, tracciabile e offline. Ottimizzare la comprensione,
non la scelta di un'offerta. Persona e offerte restano interamente sintetiche.

## Prima di modificare

1. Leggere [README.md](README.md), [OVERVIEW.md](OVERVIEW.md) e
   [agents/AGENTS.md](agents/AGENTS.md).
2. Identificare il confine tra UI, orchestratore, agenti, skill e tool deterministici.
3. Consultare solo il contratto del ruolo e il frammento di conoscenza pertinenti.
4. Non cambiare dati o numeri della demo senza aggiornare test ed evidenze.

## Vincoli

- Nessuna raccomandazione, classifica aggregata, valutazione di idoneita' o garanzia di credito.
- `null` resta un dato mancante, mai una stima implicita.
- Rate e interessi solo in [mortgageCalculator.ts](app/src/tools/mortgageCalculator.ts);
  liquidita' e margini in [affordabilityScenarioEngine.ts](app/src/tools/affordabilityScenarioEngine.ts).
- Le invocazioni passano dal registry; solo l'orchestratore modifica lo stato globale.
- Testi educativi separati dai calcoli e controllati da `SafetyGuard` prima della UI.
- Scenari ipotetici dichiarati, mai presentati come previsioni.
- Rispettare i limiti del codice: `maxQuestionRounds` e `MAX_QUIZ_ATTEMPTS`.
- Nessun `COMPLETED` senza gate umano e precondizioni soddisfatte.
- Nessuna API esterna, secret, dipendenza di runtime o dato personale reale nella demo.

## Verifica e completamento

Mantenere TypeScript strict, input validati, errori espliciti e test sui rami critici.
Eseguire `npm run verify` da questa directory prima di consegnare modifiche.
La demo deve restare completabile, con fonti visibili, dati mancanti preservati,
policy gate e human gate effettivi. Non confondere i documenti in
[agents/](agents/) con componenti automaticamente caricati dal runtime o con agenti VS Code.