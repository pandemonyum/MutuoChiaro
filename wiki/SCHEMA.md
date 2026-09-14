# Schema della wiki — MutuoChiaro

Questo file è il **terzo livello** del modello descritto in
[fonti/llm-wiki-karpathy.md](fonti/llm-wiki-karpathy.md): dichiara come la wiki è
strutturata, quali convenzioni valgono e quali procedure eseguire. Persona e agente
lo modificano insieme quando una convenzione si rivela sbagliata; non è un documento
congelato.

## I tre livelli

| Livello | Dove | Proprietario | Regola |
| --- | --- | --- | --- |
| Fonti grezze | `app/src/`, `app/tests/`, `agents/schemas/`, `docs/`, `wiki/raw/` | persona | la wiki le legge e le cita, non le modifica mai |
| Wiki | `wiki/`, escluso `raw/` | agente | l'agente crea le pagine, le aggiorna e ne mantiene i collegamenti |
| Schema | questo file | persona + agente | co-evolve con l'uso |

**Confine di esecuzione.** Come i documenti in [`agents/`](../agents/AGENTS.md), la wiki
non è caricata dal runtime, non è un prompt di sistema e non è un componente registrato.
Guida sviluppo, revisione e demo. Nessuna pagina può introdurre numeri, testi o regole
che il codice non produce.

**Autorità.** In caso di conflitto vince sempre la fonte grezza. Una pagina che
contraddice il codice è un difetto della pagina, non del codice: si corregge la pagina
e si annota l'evento in [log.md](log.md).

## Struttura

| Cartella | Tipo di pagina | Contenuto |
| --- | --- | --- |
| [concetti/](concetti/) | `concetto` | idee di dominio (mutuo) e di metodo (agentico) riusabili in più punti |
| [componenti/](componenti/) | `componente` | un nodo per ogni pezzo del runtime: cosa collega, dove vive, cosa lo verifica |
| [decisioni/](decisioni/) | `decisione` | scelte vincolanti con motivo, alternativa scartata e conseguenza |
| [fonti/](fonti/) | `fonte` | sintesi di una fonte grezza ingerita, con citazione |
| [sintesi/](sintesi/) | `sintesi` | pagine trasversali che mettono in relazione più pagine |

File speciali alla radice: [index.md](index.md) (catalogo), [log.md](log.md) (registro
append-only), [domande-aperte.md](domande-aperte.md) (registro dei dubbi non risolti),
[raw/README.md](raw/README.md) (regole del livello immutabile).

## Convenzioni di pagina

Ogni pagina della wiki inizia con frontmatter YAML:

```yaml
---
titolo: TAN e TAEG
tipo: concetto            # concetto | componente | decisione | fonte | sintesi
stato: verificato         # verificato | da-verificare | obsoleto
aggiornato: 2026-09-14    # ISO, mai nel futuro
fonti:                    # percorsi relativi alla radice del repo, oppure URL
  - app/src/tools/mortgageCalculator.ts
  - docs/RISK_AND_CLARITY_NOTE.md
---
```

- `stato: verificato` si usa **solo** dopo aver riletto la fonte citata. In assenza di
  verifica vale `da-verificare`; una pagina superata resta come `obsoleto` con il
  collegamento a quella che la sostituisce, non viene cancellata.
- `fonti` non è decorativa: il lint controlla che ogni percorso esista.
- Il titolo H1 ripete `titolo`. Il corpo sta sotto le ~60 righe: se cresce, si divide.
- I collegamenti usano link Markdown relativi (`[testo](../concetti/taeg.md)`), non la
  sintassi `[[wikilink]]`. È un adattamento dichiarato del modello di riferimento:
  i link relativi restano cliccabili su GitHub, negli editor e nel test dei collegamenti
  già presente nel repo.
- Ogni pagina è raggiungibile da almeno un'altra pagina. Le pagine orfane sono un errore
  di lint, non uno stile.

## Regola di non duplicazione

- I frammenti in [`agents/knowledge/`](../agents/knowledge/index.md) restano l'estratto
  operativo legato al quiz e sono verificati da `schemas.test`. La wiki **non li
  riscrive**: la pagina di concetto corrispondente li collega e aggiunge solo contesto,
  provenienza e connessioni. Ogni frammento è collegato da esattamente una pagina wiki.
- I contratti in [`agents/`](../agents/AGENTS.md) restano autorevoli sui doveri dei
  componenti. Le pagine in `componenti/` non ricopiano le tabelle dei contratti:
  indicano dove vive il componente, cosa lo verifica e a quali concetti e decisioni è
  legato.
- Le evidenze per criterio restano in [`docs/EVIDENCE_MATRIX.md`](../docs/EVIDENCE_MATRIX.md).
- Nessun importo, tasso o valore numerico della demo viene copiato nella wiki: si cita
  il dato dallo stato del run o dal file che lo definisce.

## Operazioni

### Ingest — integrare una fonte

1. La persona colloca la fonte in `wiki/raw/`, oppure indica una fonte già presente nel
   repo o un URL.
2. L'agente legge la fonte e discute i punti rilevanti prima di scrivere.
3. Scrive o aggiorna una pagina in `fonti/` con la sintesi e la citazione.
4. Aggiorna le pagine di `concetti/`, `componenti/`, `decisioni/` toccate dalla fonte,
   mantenendo i collegamenti nelle due direzioni.
5. Aggiunge le nuove pagine a [index.md](index.md).
6. Registra eventuali dubbi in [domande-aperte.md](domande-aperte.md).
7. Aggiunge una riga a [log.md](log.md).

Una fonte può toccare molte pagine: è il comportamento atteso, non un eccesso.

### Query — rispondere usando la wiki

1. Leggere [index.md](index.md) e caricare **solo** le pagine pertinenti. Non
   concatenare la cartella.
2. Rispondere citando le pagine usate e, tramite loro, le fonti grezze.
3. Se la risposta ha valore oltre la conversazione, archiviarla: nuova pagina in
   `sintesi/` o aggiornamento di una pagina esistente.
4. Se la wiki non basta, dirlo e aprire una voce in
   [domande-aperte.md](domande-aperte.md) invece di inventare.
5. Aggiungere una riga a [log.md](log.md) quando la query ha modificato la wiki.

### Lint — controllo di salute

Parte deterministica, eseguibile:

```bash
npm run wiki:lint
```

`scripts/wiki-lint.mjs` verifica frontmatter, vocabolari di `tipo` e `stato`, date,
esistenza delle fonti citate, link risolvibili, pagine orfane, allineamento con
`index.md`, formato del log e copertura dei frammenti `agents/knowledge/`.
Esce con codice 1 al primo errore; gli avvisi non bloccano.

Parte semantica, a carico dell'agente, da eseguire dopo il comando:

1. Contraddizioni fra pagine.
2. Affermazioni superate da una fonte più recente.
3. Concetti citati spesso ma senza pagina propria.
4. Collegamenti mancanti fra pagine che parlano della stessa cosa.
5. Lacune colmabili leggendo una fonte già nel repo.
6. Nuove domande da aggiungere a [domande-aperte.md](domande-aperte.md).

Il risultato del lint semantico si annota in [log.md](log.md); non si applicano
correzioni silenziose su pagine `verificato` senza rileggerne la fonte.

## Formato del log

Una riga per operazione, in fondo al file, dalla più vecchia alla più recente:

```
## [2026-09-14] ingest | fonte: gist LLM wiki -> fonti/llm-wiki-karpathy.md, SCHEMA.md, 4 concetti
```

Operazioni ammesse: `ingest`, `query`, `lint`, `schema`. Il log è append-only: le voci
passate non si riscrivono.
