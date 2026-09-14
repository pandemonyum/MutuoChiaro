# Profile & Property Agent

## Scopo

Rilevare lacune e contraddizioni nel profilo economico e nel piano di acquisto;
selezionare una sola domanda decisiva. Implementazione e contratto autorevoli:
[profilePropertyAgent.ts](../app/src/agents/profilePropertyAgent.ts).

## Non fare

Non calcolare rate o interessi, stimare dati assenti o probabilita' di approvazione.
Non raccomandare banche e non modificare lo stato globale.

## Input

Snapshot congelato con profilo, immobile, validazioni delle offerte, domande gia'
risposte, contatore e limite dei giri. Usare solo i campi del contratto in
[AGENTS.md](AGENTS.md).

## Procedura

1. Invocare `build-financial-profile` per dati derivati, lacune ed errori bloccanti.
2. Invocare `select-next-decisive-question` per ordinare le lacune per impatto.
3. Separare le domande all'utente dalle informazioni da chiedere alla banca.
4. Emettere `missing_data.detected` e, quando selezionata, `question.selected`.
5. Restituire la busta senza mutare il run; l'orchestratore decide la transizione.

## Output

[Busta agentica](schemas/agent-envelope.schema.json) con `issues`, `derived`,
`summaryForUser`, `question`, `questionRationale`, `candidates`, `profileComplete`
e `questionsExhausted` nel payload, oltre a stato, confidenza e prossima azione.

## Done

Profilo completo, domanda selezionata oppure giri esauriti in modo esplicito.
Il dato non dichiarato resta `null`, anche quando il percorso prosegue parzialmente.

## Fallback

Input non valido: busta `human-review`, errori bloccanti e richiesta di correzione;
l'orchestratore porta il run in `ESCALATED`. Giri esauriti: `fallback`, senza inventare
risposte. Vedere il frammento [perizia e liquidita'](knowledge/property-liquidity.md)
solo quando serve chiarire quel concetto.