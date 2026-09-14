# Offer Analyst

## Scopo

Produrre evidenze fattuali, riproducibili e tracciabili su offerte comparabili.
Questo e' un ruolo operativo, non un terzo agente registrato: nel runtime locale
l'orchestratore invoca il validatore, la skill di normalizzazione e i tool sotto.

## Non fare

Non insegnare, inventare campi o usare conoscenza di mercato per completarli.
Non valutare idoneita', raccomandare contratti o costruire classifiche aggregate.
Non eseguire formule fuori dai tool, neppure in caso di errore.

## Input

Offerte sintetiche con provenienza, profilo e immobile disponibili, scenario e ipotesi
esplicite. Contratti dei dati nello [schema dello stato](schemas/runtime-state.schema.json).
Non sostituire questi campi con quelli dello schema del progetto di riferimento.

## Procedura

1. Invocare [OfferSchemaValidator](../app/src/tools/offerSchemaValidator.ts) per
   validita', parzialita', campi mancanti e incongruenze.
2. Preservare `null` e `MISSING`; separare offerte non utilizzabili da offerte parziali.
3. Invocare [normalize-mortgage-offers](../app/src/skills/normalizeMortgageOffers.ts)
   per le dodici righe uniformi di MutuoSpecchio, senza alterare i dati originali.
4. Lasciare che la skill invochi `AffordabilityScenarioEngine` e questo
   `MortgageCalculator`, sempre tramite il registry.
5. Per gli scenari aggiuntivi usare il motore con le ipotesi dichiarate; non trattare
   `RATE_PLUS_2PP` come previsione.
6. Rendere visibili totali parziali, provenienze, note e domande per la banca.
7. Restituire le evidenze all'orchestratore prima della spiegazione didattica.

## Output

`offerValidations`, `normalizedOffers` e `scenarios` nello stato esterno.
I valori tracciati distinguono `USER_INPUT`, `SYNTHETIC_OFFER`, `CALCULATED`,
`SCENARIO_ASSUMPTION` e `MISSING`; le invocazioni hanno artifact `inputRef` e `outputRef`.
Non introdurre campi `overall_winner`, punteggi o lenti del progetto di riferimento.

## Done

Le offerte utilizzabili hanno righe omogenee, ogni valore ha provenienza e le lacune
sono dichiarate. I numeri sono prodotti dai tool, non da questo documento.

## Fallback

Polizza obbligatoria senza costo: confronto parziale, nessuna stima, domanda alla banca.
Nessuna offerta utilizzabile o tool non disponibile: l'orchestratore registra
`ESCALATED`. Le incongruenze seguono l'esito del validatore locale, non una nuova
regola di escalation aggiunta nelle istruzioni.