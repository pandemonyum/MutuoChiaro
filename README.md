# MutuoChiaro

> **Capisci l'impatto. Decidi tu.**

Prototipo educativo e agentico per l'hackathon **Agentic Coding** — **Tema 02, Inclusione
Finanziaria**.

MutuoChiaro aiuta una persona con bassa o media alfabetizzazione finanziaria a capire
**come tre offerte di mutuo diverse inciderebbero sulla sua situazione economica e
sull'acquisto di un immobile specifico**.

Non trova, non dichiara e non raccomanda «il mutuo migliore». Mostra i trade-off e lascia
la decisione all'utente.

> ⚠️ Tutti i dati, la persona e le tre offerte bancarie sono **sintetici**, inventati a
> scopo dimostrativo ed educativo. Nessuna banca reale, nessuno scraping, nessuna API
> esterna. La simulazione non è una consulenza finanziaria, non è una proposta e non è una
> delibera bancaria.

---

## 1. Il problema

> **L'utente confronta le offerte quasi esclusivamente attraverso la rata mensile e non
> riesce a tradurre le condizioni bancarie nell'impatto concreto sulla propria liquidità,
> sul proprio bilancio e sul costo complessivo dell'acquisto.**

La rata è l'unico numero che le offerte presentano in modo omogeneo, quindi diventa il
criterio predefinito anche quando non è quello decisivo. Restano invisibili la differenza
fra TAN e TAEG, l'effetto della durata sul costo totale, i costi iniziali, la sensibilità
di un tasso variabile, l'effetto di una perizia inferiore al prezzo, l'impatto
dell'anticipo sulla liquidità residua e i dati obbligatori assenti dall'offerta.

Enunciato completo e misurazione: [docs/USER_DIFFICULTY_STATEMENT.md](docs/USER_DIFFICULTY_STATEMENT.md).

## 2. La persona della demo

Profilo **sintetico**, definito in [`app/src/data/syntheticPersona.ts`](app/src/data/syntheticPersona.ts):

**Andrea**, 32 anni, dipendente a tempo indeterminato · reddito netto 2.250 €/mese · altre
entrate 0 € · **rate e debiti mensili inizialmente non dichiarati** · risparmi 100.000 € ·
fondo di emergenza minimo 20.000 € · immobile 300.000 € · spese accessorie 18.000 € ·
lavori 10.000 € · mutuo desiderato 220.000 € · prima casa.

Il dato non dichiarato non è una dimenticanza: è ciò che attiva il percorso agentico
**«prossima domanda decisiva»**.

## 3. La proposta: MutuoSpecchio

La funzionalità centrale combina profilo economico, immobile, costi dell'acquisto, offerte
e scenari ipotetici, e restituisce **non una classifica** ma una visualizzazione neutrale
dei trade-off di ogni offerta nella situazione specifica dell'utente.

Cosa emerge nel run canonico, che la sola rata non mostrava:

- l'offerta con la **rata più bassa** (886,52 €) ha **interessi totali simulati più alti**
  (99.147 €) dell'offerta con la rata più alta (75.478 €);
- la **liquidità residua dopo l'acquisto è negativa in tutte e tre le offerte** e sotto la
  soglia di fondo di emergenza impostata dall'utente;
- un'offerta dichiara una **polizza obbligatoria senza indicarne il costo**: il suo costo
  totale resta strutturalmente parziale e il sistema **non lo stima**;
- con un **aumento di 2 punti** la rata dell'offerta variabile passa da 886,52 € a
  1.134,40 €, superando quella dell'offerta fissa a 30 anni;
- con una **perizia al 90% del prezzo** la liquidità necessaria sale di 4.000 € per due
  offerte e di 17.500 € per la terza.

Numeri e provenienza di ognuno: [docs/BEFORE_AFTER_EVIDENCE.md](docs/BEFORE_AFTER_EVIDENCE.md).

## 4. Architettura

```text
UI (app/public) ─ HTTP ─> API (app/src/server)
                              │
                              v
                  MortgageJourneyOrchestrator        <-- unico proprietario dello stato
                              │
              ┌───────────────┴────────────────┐
              v                                v
     Profile & Property Agent          Offer Clarity Agent
              │                                │
              v                                v
                  Registry / kernel di invocazione  <-- ogni chiamata passa da qui
                              │
     5 skill · 5 tool deterministici · EventBus · ArtifactStore
                              │
                              v
                         Human Gate               <-- blocca COMPLETED
```

| Livello | Componenti |
| --- | --- |
| Orchestratore | `MortgageJourneyOrchestrator` |
| Agenti | `profile-property-agent`, `offer-clarity-agent` |
| Skill | `build-financial-profile`, `select-next-decisive-question`, `normalize-mortgage-offers`, `explain-mortgage-tradeoffs`, `assess-user-understanding` |
| Tool deterministici | `MortgageCalculator`, `AffordabilityScenarioEngine`, `OfferSchemaValidator`, `MetricsEngine`, `SafetyGuard` |
| Controllo | stato esterno tipizzato, transizioni legali, loop limitati, gate umano |

Proprietà imposte dal codice, non dichiarate nei prompt:

- **le formule finanziarie esistono in un solo file** e sono raggiungibili solo tramite il
  registry;
- **lo stato è mutabile solo dall'orchestratore**: agenti e skill ricevono uno snapshot
  congelato in profondità;
- **ogni invocazione produce `inputRef` e `outputRef`** apribili dall'interfaccia;
- **nessun dato mancante viene inventato**: resta `null` nello stato e `MISSING` in UI;
- **il vocabolario neutrale è imposto in esecuzione** da `SafetyGuard`, con evento
  osservabile quando interviene.

Dettaglio, contratti degli agenti, macchina a stati ed eventi:
[docs/AGENTIC_ARCHITECTURE.md](docs/AGENTIC_ARCHITECTURE.md) e [OVERVIEW.md](OVERVIEW.md).

### Pacchetto operativo degli agenti

La struttura di `agents/` riprende quella del progetto di riferimento
`DryRunHackaton/MutuoChiaro`, adattata al runtime locale:

- [AGENTS.md](AGENTS.md): accordo di lavoro per sviluppo e revisione.
- [agents/AGENTS.md](agents/AGENTS.md): indice, contratti e corrispondenza dei ruoli.
- File separati per orchestratore, profilo, analista delle offerte, tutor e policy gate.
- [agents/knowledge/index.md](agents/knowledge/index.md): frammenti da consultare per
  singolo concetto, inclusi perizia e liquidita', pertinenti al quiz attuale.
- [agents/evals/demo-cases.md](agents/evals/demo-cases.md) e
  [agents/evals/failure-cases.md](agents/evals/failure-cases.md): casi verificabili con
  rimandi ai test e alle evidenze della demo.

Questi documenti non vengono caricati automaticamente dal runtime e non aggiungono
agenti selezionabili in VS Code. I componenti eseguibili restano quelli sopra:
analista e tutor sono ruoli distribuiti tra agenti, skill e tool esistenti.
Stati, schemi, dati sintetici, interfaccia e gate restano quelli di questo progetto.

## 5. Avvio rapido

Requisiti: **Node.js ≥ 22** (usa il test runner integrato). Nessuna dipendenza di runtime.

```bash
cd app
npm install
npm start
```

Apri **http://localhost:5173**. Porta diversa: `PORT=8080 npm start`.

Dalla radice del repository funzionano anche `npm start`, `npm test`, `npm run verify`
(proxy verso `app/`).

## 6. Test e verifiche

```bash
cd app
npm run verify
```

Esegue in sequenza:

| Comando | Cosa fa | Esito |
| --- | --- | --- |
| `npm run typecheck` | `tsc --noEmit`, TypeScript strict | nessun errore |
| `npm test` | build + 116 test (`node --test`) | 116 pass / 0 fail |
| `npm run audit:structure` | 31 controlli strutturali sul codice compilato | 31/31 |

Altri comandi utili:

```bash
npm run build              # compila in dist/
node scripts/demo-run.mjs  # rigenera docs/BEFORE_AFTER_EVIDENCE.md dal run reale
```

Cosa coprono i test (`app/tests/`):

| File | Copertura |
| --- | --- |
| `mortgageCalculator.test.ts` | formula della rata, interessi, costo totale, tasso zero, ricalcolo con delta, importi/durate/tassi non validi |
| `scenarios.test.ts` | quattro scenari, liquidità necessaria e residua, fondo di emergenza, provenienza dei valori derivati, costo parziale, reddito zero, importi negativi |
| `offerValidator.test.ts` | campo mancante, confronti bloccati, domanda per la banca, tipi e intervalli, incongruenze TAEG/rata, provenienza |
| `stateMachine.test.ts` | transizioni legali e illegali, token dello stato, snapshot congelato, precondizioni di completamento, human gate, limite del quiz, escalation |
| `safetyGuard.test.ts` | 10 frasi vietate bloccate, 6 ammesse, categorie, blocco nel percorso reale |
| `registry.test.ts` | sequenza started/completed/failed, inputRef/outputRef, invocazioni annidate, vocabolario eventi, conteggi di delega |
| `journey.e2e.test.ts` | percorso completo `START → COMPLETED`, handoff reali, domanda dinamica, assenza di classifiche, modifica offerta, loop limitato |
| `schemas.test.ts` | allineamento fra schemi JSON e runtime; struttura e collegamenti del pacchetto agentico; corrispondenza fra domande, scenari e frammenti knowledge |

**Un test fallisce se si rimuove una vera invocazione dal registry**: sostituendo
`ctx.invoke('MortgageCalculator', …)` con una chiamata diretta alla funzione, falliscono
3 test (verificato per mutazione, vedi [EVIDENCE_MATRIX §H](docs/EVIDENCE_MATRIX.md#h-verifiche-eseguibili)).

## 7. Demo

Percorso da tre minuti, battuta per battuta:
**[docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)**.

In sintesi: Andrea e tre offerte disomogenee → profilo → **l'orchestratore rileva le rate
non dichiarate e pone la prossima domanda decisiva** → MutuoSpecchio → scenario perizia
−10% → **failure branch della polizza mancante** → scenario tasso +2 punti e controllo di
comprensione → **gate umano** → before/after.

La sezione **Traccia agentica** dell'interfaccia mostra gli eventi reali del run corrente
con timestamp, componente, tipo evento, `inputRef`, `outputRef`, durata e fase risultante.
Gli identificativi degli artifact sono cliccabili e aprono il contenuto salvato. Due
pulsanti attivano i failure branch dimostrativi: **«Inietta output non conforme»** e
**«Simula tool non disponibile»**.

## 8. Limiti

1. Persona, profilo e offerte sono **interamente sintetici**.
2. Solo ammortamento francese a rata costante: nessun preammortamento, nessun piano
   alternativo, nessun calcolo fiscale o notarile.
3. Lo scenario di aumento del tasso applica un rialzo **immediato e permanente sul capitale
   iniziale**: semplificazione dichiarata, non l'indicizzazione reale.
4. Il **TAEG è quello dichiarato** dall'offerta: MutuoChiaro non lo ricalcola.
5. Dove un dato obbligatorio manca, il valore resta mancante e i totali sono **parziali**:
   nessuna stima sostitutiva.
6. Nessuna valutazione di finanziabilità, nessun credit scoring, nessuna stima di
   approvazione.
7. Nessuna consulenza finanziaria, legale, urbanistica o fiscale.
8. Nessuna persistenza: lo stato vive in memoria; riavviare il server azzera i run.
9. Quattro scenari fissi, nessuna simulazione probabilistica.
10. `SafetyGuard` lavora su regole lessicali italiane: copre le formulazioni previste, non
    è una garanzia semantica universale.

Elenco completo con ipotesi e confine rispetto alla consulenza:
[docs/RISK_AND_CLARITY_NOTE.md](docs/RISK_AND_CLARITY_NOTE.md).

## 9. Dove sono le evidenze

| Documento | Contenuto |
| --- | --- |
| [docs/EVIDENCE_MATRIX.md](docs/EVIDENCE_MATRIX.md) | **Ogni criterio → file, evento osservabile, test, passaggio della demo** |
| [docs/BEFORE_AFTER_EVIDENCE.md](docs/BEFORE_AFTER_EVIDENCE.md) | Numeri del run canonico, generati da `scripts/demo-run.mjs` |
| [docs/USER_DIFFICULTY_STATEMENT.md](docs/USER_DIFFICULTY_STATEMENT.md) | Difficoltà, processo, rilevanza, come è misurata |
| [docs/RISK_AND_CLARITY_NOTE.md](docs/RISK_AND_CLARITY_NOTE.md) | Cosa è semplificato, cosa non è alterato, ipotesi, limiti, confine |
| [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | Demo da tre minuti |
| [docs/AGENTIC_ARCHITECTURE.md](docs/AGENTIC_ARCHITECTURE.md) | Contratti, stato, transizioni, eventi, failure path |
| [OVERVIEW.md](OVERVIEW.md) | Componenti, matrice, dipendenze, macchina a stati |
| [AGENTS.md](AGENTS.md) | Accordo di lavoro e vincoli per le modifiche |
| [agents/AGENTS.md](agents/AGENTS.md) | Indice operativo, mappa dei ruoli e contratti degli agenti |
| [agents/knowledge/index.md](agents/knowledge/index.md) | Conoscenza selettiva per concetto |
| [agents/evals/](agents/evals/) | Casi canonici e avversariali collegati ai test |
| [agents/schemas/](agents/schemas/) | Schemi JSON di stato, evento e busta agentica |

## 10. Provenienza dei dati

Ogni numero mostrato nell'interfaccia porta un'etichetta di provenienza:

| Etichetta | Badge | Significato |
| --- | --- | --- |
| `USER_INPUT` | dato inserito | Inserito o modificato dall'utente |
| `SYNTHETIC_OFFER` | dato offerta | Presente nell'offerta sintetica, non ricalcolato |
| `CALCULATED` | calcolo | Prodotto da un tool deterministico dai dati disponibili |
| `SCENARIO_ASSUMPTION` | ipotesi | Dipende da un parametro ipotizzato dallo scenario, anche se derivato |
| `MISSING` | mancante | Dato assente, **non stimato e non sostituito** |

## 11. Struttura del repository

```text
MutuoChiaro/
├── README.md · OVERVIEW.md · AGENTS.md
├── docs/                       evidenze, demo, rischi, architettura
├── agents/
│   ├── AGENTS.md · workflow.md  indice, contratti e sequenza reale
│   ├── orchestrator.md         controllo del percorso
│   ├── profile-property.md     profilo e domanda decisiva
│   ├── offer-analyst.md         ruolo analitico su skill e tool
│   ├── adaptive-tutor.md        ruolo didattico e verifica
│   ├── policy-gate.md           guardrail dei testi
│   ├── knowledge/              indice e frammenti per concetto
│   ├── evals/                  casi demo e failure collegati ai test
│   └── schemas/                schemi JSON allineati al runtime
└── app/
    ├── src/
    │   ├── core/               types, errori, stato, macchina a stati, registry,
    │   │                       event bus, artifact store
    │   ├── tools/              5 tool deterministici
    │   ├── skills/             5 skill
    │   ├── agents/             2 agenti con contratto
    │   ├── orchestrator/       MortgageJourneyOrchestrator
    │   ├── data/               persona, offerte e quiz sintetici
    │   ├── runtime/            composizione e registrazione dei componenti
    │   └── server/             API HTTP e file statici
    ├── public/                 interfaccia italiana (HTML/CSS/JS, zero dipendenze)
    ├── tests/                  116 test
    └── scripts/                audit strutturale, run di evidenza
```
