---
titolo: Il modello "LLM wiki" di Karpathy
tipo: fonte
stato: verificato
aggiornato: 2026-09-14
fonti:
  - https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
---

# Il modello "LLM wiki" di Karpathy

Fonte remota, citata per URL e non copiata nel repo (vedi [../raw/README.md](../raw/README.md)).

## L'idea

Invece di recuperare ogni volta i documenti grezzi al momento della domanda, il modello
LLM costruisce e mantiene una wiki persistente: file Markdown collegati fra loro, che si
arricchiscono a ogni nuova fonte. Il valore non sta nella singola pagina ma nel fatto che
le pagine e i loro collegamenti restano e si consolidano nel tempo.

L'argomento centrale è di economia dello sforzo: la parte faticosa di una base di
conoscenza non è leggere o ragionare, è la manutenzione. È esattamente la parte che un
modello può fare a costo quasi nullo e che una persona abbandona dopo poche settimane.

## I tre livelli

| Livello | Chi lo possiede | Nota |
| --- | --- | --- |
| Fonti grezze | la persona | immutabili, il modello le legge e non le tocca |
| Wiki | il modello | crea le pagine, le aggiorna, tiene i collegamenti coerenti |
| Schema | entrambi | file di configurazione con struttura, convenzioni e procedure |

## Le tre operazioni

- **Ingest**: leggere la fonte, discuterne i punti con la persona, scrivere la sintesi,
  aggiornare l'indice, propagare gli aggiornamenti sulle pagine toccate, scrivere nel log.
- **Query**: cercare le pagine pertinenti nell'indice, leggerle, rispondere con citazioni
  e archiviare le risposte che meritano di restare.
- **Lint**: controllo periodico di contraddizioni, affermazioni superate, pagine orfane,
  concetti senza pagina, collegamenti mancanti, lacune colmabili con una ricerca.

## Cosa abbiamo adattato

Il documento originale è dichiaratamente astratto: descrive l'idea e chiede di
istanziarla sul proprio dominio. Gli scostamenti scelti per MutuoChiaro sono in
[../decisioni/wiki-come-layer-di-conoscenza.md](../decisioni/wiki-come-layer-di-conoscenza.md)
e le convenzioni risultanti in [../SCHEMA.md](../SCHEMA.md). In sintesi: link Markdown
relativi al posto dei wikilink, lint deterministico eseguibile accanto a quello
semantico, e divieto esplicito di duplicare contratti, evidenze e numeri della demo.
