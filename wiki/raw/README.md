# Fonti grezze

Livello immutabile della wiki. L'agente legge da qui e cita, **non modifica mai** nulla
di ciò che questo livello contiene.

## Cosa conta come fonte grezza

1. **Il codice del prototipo.** `app/src/`, `app/tests/`, `app/scripts/` e gli schemi in
   `agents/schemas/`. È la fonte di verità su cosa il sistema fa davvero.
2. **I documenti di progetto.** `docs/`, `README.md`, `OVERVIEW.md`, i contratti in
   `agents/`. Fonti su intenzioni, vincoli ed evidenze dichiarate.
3. **Materiale esterno depositato in questa cartella.** Brief, rubriche, trascrizioni,
   export di run, note di riunione. Un file qui dentro non si riscrive: se è superato si
   affianca con una versione nuova e datata.
4. **Fonti remote citate per URL.** Non vengono copiate nel repo. La sintesi sta in
   [../fonti/](../fonti/), con l'indirizzo nel frontmatter.

## Regole

- Nessun dato personale reale, nessun segreto, nessuna credenziale. La demo resta
  interamente sintetica, come richiesto da [../../AGENTS.md](../../AGENTS.md).
- Un export di run va salvato con il suo `runId` e la data nel nome del file.
- Prima di ingerire una fonte, verificare che non sia già coperta: il duplicato produce
  contraddizioni difficili da individuare più avanti.
- La procedura di ingest è descritta in [../SCHEMA.md](../SCHEMA.md).

## Contenuto attuale

Nessun file esterno depositato. Le fonti finora ingerite sono il repository stesso e un
documento remoto citato per URL; le sintesi sono in [../fonti/](../fonti/).
