---
titolo: Adottare la wiki come layer di conoscenza
tipo: decisione
stato: verificato
aggiornato: 2026-09-14
fonti:
  - https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
  - scripts/wiki-lint.mjs
  - wiki/SCHEMA.md
---

# Adottare la wiki come layer di conoscenza

**Contesto.** Il repository conteneva già tre depositi di sapere: i contratti in
`agents/`, le evidenze in `docs/` e i frammenti didattici in `agents/knowledge/`.
Nessuno dei tre registra *cosa abbiamo capito e perché abbiamo scelto così*: quel
materiale viveva nelle conversazioni e spariva con esse.

**Decisione.** Adottare il modello a tre livelli descritto in
[../fonti/llm-wiki-karpathy.md](../fonti/llm-wiki-karpathy.md), istanziato in `wiki/`
secondo [../SCHEMA.md](../SCHEMA.md), e adattare skill e subagent perché leggano
l'indice prima di lavorare e vi archivino ciò che merita di restare.

## Scostamenti dal modello di riferimento

| Scostamento | Motivo |
| --- | --- |
| Link Markdown relativi al posto di `[[wikilink]]` | restano cliccabili su GitHub e nel test dei collegamenti già presente nel repo |
| Lint deterministico eseguibile (`npm run wiki:lint`) accanto a quello semantico | il repo tratta un'affermazione non eseguibile come non verificata; valeva anche per la wiki |
| Regola esplicita di non duplicazione | con tre depositi preesistenti, il rischio principale non era la pagina mancante ma la pagina che contraddice il codice |
| Nessun numero della demo nelle pagine | gli importi vivono nello stato del run; copiarli qui creerebbe una seconda verità |
| `wiki/raw/` quasi vuoto | la fonte grezza principale è il repository stesso — [../fonti/repository-mutuochiaro.md](../fonti/repository-mutuochiaro.md) |

**Alternativa scartata.** Estendere `agents/knowledge/` fino a farne la base di
conoscenza generale. Quei frammenti sono vincolati al quiz e verificati da
`schemas.test`: allargarli avrebbe mescolato l'estratto operativo con le note di
progetto e reso i test più fragili.

**Conseguenza accettata.** Una struttura in più da mantenere. Regge finché la
manutenzione resta quasi gratuita: è la premessa del modello di riferimento e la
domanda aperta D5.

**Confine.** La wiki non è caricata dal runtime, non è un prompt di sistema, non è un
componente registrato. Vale lo stesso confine dichiarato per
[`agents/`](../../agents/AGENTS.md).
