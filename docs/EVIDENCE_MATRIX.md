# Evidence Matrix

Ogni criterio è collegato al file che lo implementa, all'evento osservabile, al test che lo
verifica e al passaggio della demo in cui si vede.

Comando che riesegue tutte le verifiche di questa tabella:

```bash
cd app && npm run verify
```

`npm run verify` = `typecheck` (`tsc --noEmit`) + `test` (113 test) + `audit:structure`
(31 controlli su codice compilato).

---

## A. Deliverable del Tema 02 — Inclusione Finanziaria

| # | Criterio del brief | File | Evento osservabile | Test | Demo |
| --- | --- | --- | --- | --- | --- |
| A1 | User Difficulty Statement: difficoltà, processo, rilevanza | [docs/USER_DIFFICULTY_STATEMENT.md](USER_DIFFICULTY_STATEMENT.md), [`syntheticPersona.ts`](../app/src/data/syntheticPersona.ts) | `run.started` con persona sintetica | `journey.e2e` › *handoff reale … e domanda decisiva* (verifica `existingMonthlyDebts: null` all'avvio) | 0:00–0:25 |
| A2 | Before/After Simplicity Evidence su dati reali del run | [docs/BEFORE_AFTER_EVIDENCE.md](BEFORE_AFTER_EVIDENCE.md), [`metricsEngine.ts`](../app/src/tools/metricsEngine.ts), [`scripts/demo-run.mjs`](../app/scripts/demo-run.mjs) | `tool.completed` (`MetricsEngine`) | `journey.e2e` › *percorso completo fino a COMPLETED* (asserisce 1 → 13 criteri, before `false` → after `true`) | 2:52–3:00 |
| A3 | Risk & Clarity Note: cosa è semplificato, cosa non è alterato, come è evitata l'ambiguità | [docs/RISK_AND_CLARITY_NOTE.md](RISK_AND_CLARITY_NOTE.md) | avvertenze in `state.warnings` | `journey.e2e` › *il costo mancante non viene mai stimato* | 2:00–2:20 |
| A4 | Capability software concreta, non riscrittura di testi | 5 tool deterministici in [`app/src/tools/`](../app/src/tools/) | `tool.started` / `tool.completed` | `mortgageCalculator.test`, `scenarios.test` (25 test sui soli calcoli) | 1:15–2:20 |
| A5 | Nessuna raccomandazione, nessuna consulenza personalizzata | [`safetyGuard.ts`](../app/src/tools/safetyGuard.ts) | `safety_guard.blocked` | `safetyGuard.test` (10 frasi vietate bloccate, 6 ammesse); `journey.e2e` › *nessuna classifica e nessun punteggio* | 2:00–2:20, extra |
| A6 | Semplificare senza cambiare il significato | TAEG «dichiarato» non ricalcolato, rata dichiarata non sostituita: [`normalizeMortgageOffers.ts`](../app/src/skills/normalizeMortgageOffers.ts), [`offerSchemaValidator.ts`](../app/src/tools/offerSchemaValidator.ts) | `offer.incomplete` | `offerValidator.test` › *rata dichiarata incoerente segnalata senza sovrascrivere il dato*, *TAEG dichiarato inferiore al TAN* | 1:15–1:40 |
| A7 | Demo collegata a un processo reale | percorso completo profilo → offerte → scenari → comprensione → chiusura | catena completa di eventi del run | `journey.e2e` › *percorso completo fino a COMPLETED* | tutta |
| A8 | Miglioramento tangibile della comprensione | [`assessUserUnderstanding.ts`](../app/src/skills/assessUserUnderstanding.ts), [`quizBank.ts`](../app/src/data/quizBank.ts) | `understanding.passed` / `understanding.failed` | `stateMachine.test` › *un errore produce feedback mirato*, *un secondo tentativo corretto supera il controllo* | 2:20–2:40 |

## B. Vertical slice (fasi A–G)

| # | Fase | File | Evento | Test | Demo |
| --- | --- | --- | --- | --- | --- |
| B1 | A · Profilo con validazione (no importi negativi, no reddito zero, durate valide) | [`buildFinancialProfile.ts`](../app/src/skills/buildFinancialProfile.ts) | `skill.completed`, `skill.failed` | `stateMachine.test` › *importo negativo…*, *reddito zero…*, *durata non valida…* | 0:25–0:55 |
| B2 | B · Prossima domanda decisiva dipendente dallo stato | [`selectNextDecisiveQuestion.ts`](../app/src/skills/selectNextDecisiveQuestion.ts) | `missing_data.detected`, `question.selected` | `journey.e2e` › *la domanda successiva cambia quando cambiano i dati mancanti* | 0:55–1:15 |
| B3 | B · Ricalcolo automatico dopo la risposta | [`mortgageJourneyOrchestrator.ts`](../app/src/orchestrator/mortgageJourneyOrchestrator.ts) `answerDecisiveQuestion` | `state.changed` → `OFFERS_NORMALIZED` | `journey.e2e` › *percorso completo* (fase dopo la risposta) | 1:15 |
| B4 | C · Tre offerte sintetiche coerenti + modifica manuale | [`syntheticOffers.ts`](../app/src/data/syntheticOffers.ts), `editOffer` | `offer.incomplete` | `journey.e2e` › *modifica manuale di un offerta*, *svuotare un campo obbligatorio…* | 1:15–1:40 |
| B5 | D · Normalizzazione sullo stesso schema con provenienza | [`normalizeMortgageOffers.ts`](../app/src/skills/normalizeMortgageOffers.ts) | `skill.completed` | `journey.e2e` › *percorso completo* (schema identico + provenienza su ogni riga) | 1:15–1:40 |
| B6 | D · Distinzione visiva fra inserito / offerta / calcolo / ipotesi / mancante | badge in [`app/public/styles.css`](../app/public/styles.css), `PROV_BADGE` in [`app/public/app.js`](../app/public/app.js) | provenienza in ogni `Traced` | `scenarios.test` › *i valori derivati da un parametro ipotizzato sono etichettati come ipotesi*; audit › *provenienza: ogni riga normalizzata la dichiara* | 1:15–1:40 |
| B7 | E · Quattro scenari calcolati da tool deterministici | [`affordabilityScenarioEngine.ts`](../app/src/tools/affordabilityScenarioEngine.ts) | `scenario.completed` | `scenarios.test` (17 test su quattro scenari) | 1:40–2:20 |
| B8 | E · Discesa sotto il fondo di emergenza + ipotesi e avvertenze | `affordabilityScenarioEngine.ts` | avvertenze in `state.warnings` | `scenarios.test` › *liquidita necessaria e residua…*, *la liquidita residua sotto la soglia…* | 1:15–1:40 |
| B9 | F · Controllo di comprensione con feedback mirato e riapertura scenario | [`assessUserUnderstanding.ts`](../app/src/skills/assessUserUnderstanding.ts) | `understanding.failed`, `understanding.passed` | `stateMachine.test` › *un errore produce feedback mirato e indica lo scenario da riaprire* | 2:20–2:40 |
| B10 | F · Massimo tre tentativi, poi «comprensione non verificata» con risultati consultabili | `assessUserUnderstanding.ts`, `MAX_QUIZ_ATTEMPTS` | `understanding.failed` ×3 | `stateMachine.test` › *dopo tre tentativi errati…*, *un quarto tentativo viene rifiutato* | 2:20–2:40 |
| B11 | G · Human gate reale collegato allo stato | `confirmHumanApproval`, [`stateMachine.ts`](../app/src/core/stateMachine.ts) `completionBlockers` | `human_approval.required`, `human_approval.received`, `run.completed` | `stateMachine.test` › *il gate blocca il completamento fino alla conferma esplicita*, *senza conferma la fase non cambia* | 2:40–2:52 |
| B12 | G · Non si chiede all'utente di scegliere il mutuo vincente | testo del gate in `stateMachine.ts` `HUMAN_GATE_STATEMENT` | — | `journey.e2e` › *nessuna classifica e nessun punteggio di convenienza nell output* | 2:40–2:52 |

## C. Architettura agentica

| # | Criterio | File | Evento | Test | Demo |
| --- | --- | --- | --- | --- | --- |
| C1 | Orchestratore unico proprietario dello stato | [`runStore.ts`](../app/src/core/runStore.ts) (token privato), [`mortgageJourneyOrchestrator.ts`](../app/src/orchestrator/mortgageJourneyOrchestrator.ts) | `state.changed` | `stateMachine.test` › *lo stato mutabile non e accessibile senza il token*, *lo snapshot … e congelato in profondita* | 0:55–1:15 |
| C2 | Due agenti con contratti completi (purpose … nextAction) | [`profilePropertyAgent.ts`](../app/src/agents/profilePropertyAgent.ts), [`offerClarityAgent.ts`](../app/src/agents/offerClarityAgent.ts) | `agent.started` / `agent.completed` | `journey.e2e` › *i contratti degli agenti dichiarano divieti e condizione di completamento*, *gli agenti dichiarano confidence e nextAction nella busta* | 0:55–1:15 |
| C3 | Profile Agent non calcola rate né stima approvazioni | `PROFILE_AGENT_CONTRACT.prohibitions`; nessun import di `mortgageCalculator` in `agents/` | `skill.started` sulle sole skill consentite | `journey.e2e` › *i contratti degli agenti…* | 0:55–1:15 |
| C4 | Offer Clarity Agent non produce graduatorie né esegue formule | `CLARITY_AGENT_CONTRACT.prohibitions` | `safety_guard.blocked` quando serve | `journey.e2e` › *nessuna classifica…*; audit › *linguaggio: nessun termine di raccomandazione nell output* | 1:15–1:40 |
| C5 | Cinque skill realmente invocate dal runtime | [`app/src/skills/`](../app/src/skills/) | `skill.started` / `skill.completed` | `registry.test` › *il conteggio delle invocazioni dimostra la delega ai tool* | 0:55–2:40 |
| C6 | Cinque tool deterministici separati | [`app/src/tools/`](../app/src/tools/) | `tool.started` / `tool.completed` | `registry.test` › *ogni componente atteso e registrato una sola volta*; audit › *registry: 5 tool, 5 skill, 2 agent* | 1:15–2:20 |
| C7 | Il modello non esegue calcoli, validazione o transizioni | formule solo in `mortgageCalculator.ts`; validazione solo in `offerSchemaValidator.ts`; transizioni solo in `stateMachine.ts` | — | `scenarios.test` › *ogni invocazione dello scenario passa dal MortgageCalculator registrato* (**fallisce se si sostituisce l'invocazione con un calcolo inline**) | — |

## D. Invocation layer ed eventi

| # | Criterio | File | Evento | Test | Demo |
| --- | --- | --- | --- | --- | --- |
| D1 | Registry unico: verifica nome → inputRef → started → esecuzione → outputRef → completed/failed | [`registry.ts`](../app/src/core/registry.ts) | tutti gli eventi `*.started` / `*.completed` / `*.failed` | `registry.test` › *started e completed emessi in ordine con inputRef, outputRef e durata* | 0:55–1:15 |
| D2 | Nome sconosciuto rifiutato con evento | `registry.ts` | `tool.failed` | `registry.test` › *un nome sconosciuto produce un errore e un evento di fallimento* | — |
| D3 | inputRef e outputRef risolvibili e apribili dall'interfaccia | [`artifactStore.ts`](../app/src/core/artifactStore.ts), `GET /api/artifact/:ref` | `inputRef`/`outputRef` su ogni evento di invocazione | `registry.test` › *gli artifact ref sono univoci e risolvibili*; audit › *artifact: ogni invocazione ha inputRef e outputRef* | 0:55–1:15 |
| D4 | Handoff reali orchestratore ↔ agente | `handoff()` in `mortgageJourneyOrchestrator.ts` | `handoff.started`, `handoff.completed` con status/confidence/nextAction | `journey.e2e` › *handoff reale orchestratore -> Profile & Property Agent* | 0:55–1:15 |
| D5 | Invocazioni annidate tracciate dallo stesso kernel | `ComponentContext.invoke` in `registry.ts` | sequenza `skill.started` → `tool.started` → `tool.completed` → `skill.completed` | `registry.test` › *le invocazioni annidate passano dallo stesso kernel* | 1:15–1:40 |
| D6 | Vocabolario di eventi chiuso | `EVENT_KINDS` in [`types.ts`](../app/src/core/types.ts) | — | `registry.test` › *tutti i tipi di evento emessi appartengono al vocabolario dichiarato*; audit | — |
| D7 | Traccia agentica dall'esecuzione, non statica | sezione «Traccia agentica» in [`app/public/index.html`](../app/public/index.html), `renderTrace` in [`app/public/app.js`](../app/public/app.js) | ogni evento con `seq`, `ts`, `durationMs`, `phaseAfter` | una GET non produce eventi: `view()` non invoca componenti | 0:55, 2:00, extra |
| D8 | Lo stato è aggiornato solo dall'orchestratore | il kernel non ha riferimenti in scrittura allo stato | `state.changed` emesso solo da `MortgageJourneyOrchestrator` | `stateMachine.test` › *lo stato mutabile non e accessibile senza il token* | — |

## E. Gestione dello stato

| # | Criterio | File | Evento | Test | Demo |
| --- | --- | --- | --- | --- | --- |
| E1 | Stato esterno, tipizzato, separato dai prompt | [`types.ts`](../app/src/core/types.ts) `RunState`, [`runStore.ts`](../app/src/core/runStore.ts) | — | tutta la suite | — |
| E2 | Transizioni legali dichiarate esplicitamente | `LEGAL_TRANSITIONS` in [`stateMachine.ts`](../app/src/core/stateMachine.ts) | `state.changed` | `stateMachine.test` › *transizioni legali accettate*, *transizioni illegali rifiutate* | — |
| E3 | Approvazione nella fase sbagliata: fallisce | `confirmHumanApproval` | `state.transition_rejected` + HTTP 409 | `stateMachine.test` › *approvazione richiesta nella fase sbagliata: rifiutata e osservabile* | 2:40–2:52 |
| E4 | `COMPLETED` richiede offerte validate + ≥1 scenario + comprensione eseguita + conferma umana | `completionBlockers` in `stateMachine.ts` | `run.completed` | `stateMachine.test` › *un run appena creato elenca tutti i requisiti mancanti*, *un tentativo di quiz non superato … blocca ancora il completamento*; audit › *stato: nessuna scorciatoia verso COMPLETED* | 2:40–2:52 |
| E5 | Stati terminali chiusi | `LEGAL_TRANSITIONS.COMPLETED/ESCALATED` vuoti | — | `stateMachine.test` › *gli stati terminali non hanno uscite*, *un run concluso non accetta ulteriori azioni* | — |
| E6 | Loop limitati con massimo esplicito | `maxQuestionRounds = 3`, `MAX_QUIZ_ATTEMPTS = 3` | `understanding.failed` | `journey.e2e` › *il numero di giri di domande ha un massimo esplicito*; `stateMachine.test` › *un quarto tentativo viene rifiutato* | 2:20–2:40 |

## F. Failure branch

| # | Fallimento | File | Evento | Test | Demo |
| --- | --- | --- | --- | --- | --- |
| F1 | Polizza obbligatoria senza costo: non inventato, offerta conservata, modalità parziale | [`syntheticOffers.ts`](../app/src/data/syntheticOffers.ts) (`insuranceCost: null`), [`offerSchemaValidator.ts`](../app/src/tools/offerSchemaValidator.ts) | `offer.incomplete` | `offerValidator.test` › *rileva la polizza obbligatoria senza costo…*; `journey.e2e` › *il costo mancante non viene mai stimato…* | 2:00–2:20 |
| F2 | Confronti possibili / non possibili dichiarati | `blockedComparisons` / `availableComparisons` | `offer.incomplete` (messaggio con entrambe le liste) | `offerValidator.test` › *dichiara quali confronti restano possibili e quali no* | 2:00–2:20 |
| F3 | Domanda da porre alla banca | `questionForBank` in `offerSchemaValidator.ts` | `offer.incomplete` | `journey.e2e` › *il costo mancante non viene mai stimato* | 2:00–2:20 |
| F4 | Importo negativo | `buildFinancialProfile.ts`, `mortgageCalculator.ts` | `skill.failed` + `run.escalated` | `mortgageCalculator.test` › *importo negativo rifiutato*; `stateMachine.test` › *importo negativo nel profilo porta a escalation* | — |
| F5 | Reddito uguale a zero | `buildFinancialProfile.ts`, `affordabilityScenarioEngine.ts` | `skill.failed` + `run.escalated` | `scenarios.test` › *reddito uguale a zero rifiutato*; `stateMachine.test` › *profilo con reddito zero porta a escalation* | — |
| F6 | Durata non valida | `buildFinancialProfile.ts`, `mortgageCalculator.ts` | `skill.failed` + `run.escalated` | `mortgageCalculator.test` › *durata non valida rifiutata*; `stateMachine.test` › *durata non valida nel profilo porta a escalation* | — |
| F7 | Tool non disponibile | `Registry.disable`, `simulateComponentOutage` | `tool.failed` (chiamato **e** chiamante) + `run.escalated` | `stateMachine.test` › *tool non disponibile porta il run in ESCALATED con evento dedicato* | extra |
| F8 | Output agentico con raccomandazione | [`safetyGuard.ts`](../app/src/tools/safetyGuard.ts), `injectNonCompliantDraft` | `safety_guard.blocked` | `safetyGuard.test` › *un output agentico con raccomandazione viene bloccato e genera l'evento* | extra |
| F9 | Superamento del limite di tentativi | `assessUserUnderstanding.ts` | `understanding.failed` | `stateMachine.test` › *dopo tre tentativi errati lo stato e comprensione non verificata* | 2:20–2:40 |
| F10 | Approvazione nella fase sbagliata | `confirmHumanApproval` | `state.transition_rejected` | `stateMachine.test` › *approvazione richiesta nella fase sbagliata* | 2:40–2:52 |
| F11 | Un errore cambia lo stato o produce escalation, non solo un warning in console | `escalate()`, `rejectTransition()` | `run.escalated`, `state.transition_rejected` | `stateMachine.test` › *un fallimento non si limita a un avviso in console: cambia lo stato* | — |

## G. Interfaccia

| # | Criterio | File | Verifica |
| --- | --- | --- | --- |
| G1 | Italiano, responsive, accessibile (skip link, `aria-live`, `scope`, focus visibile, `prefers-contrast`) | [`index.html`](../app/public/index.html), [`styles.css`](../app/public/styles.css) | ispezione; landmark e label presenti nell'albero di accessibilità |
| G2 | Badge di provenienza su ogni valore | `PROV_BADGE` in [`app/public/app.js`](../app/public/app.js) | audit › *provenienza: ogni riga normalizzata la dichiara* |
| G3 | Nessun semaforo, medaglia, vincitore o ranking | commento e palette in `styles.css` (i colori codificano la provenienza) | `journey.e2e` › *nessuna classifica e nessun punteggio* |
| G4 | Tooltip per TAN, TAEG, prestito/valore, costo totale, liquidità residua | `GLOSSARY` in [`syntheticOffers.ts`](../app/src/data/syntheticOffers.ts), `tooltipFor` in `app.js` | 14 termini serviti da `GET /api/meta` |
| G5 | Formattazione italiana di euro e percentuali | `Intl.NumberFormat('it-IT')` in `app.js` e nei tool | `scenarios.test` › *…marcato come ipotesi* (nota con virgola decimale) |
| G6 | Indicazione «Dati sintetici» visibile | badge in `index.html`, banner educativo | ispezione |
| G7 | Dashboard comprensibile senza aprire la traccia tecnica | sezioni separate; la traccia è l'ultima | ispezione |
| G8 | Nessun dato personale reale | persona e offerte sintetiche, nessuna persistenza, nessuna autenticazione | [RISK_AND_CLARITY_NOTE](RISK_AND_CLARITY_NOTE.md) §6 |

## H. Verifiche eseguibili

| Comando | Cosa verifica | Esito registrato |
| --- | --- | --- |
| `npm run typecheck` | TypeScript strict, `noUncheckedIndexedAccess`, `noUnusedLocals` | nessun errore |
| `npm test` | 113 test in 8 file | 113 pass / 0 fail |
| `npm run audit:structure` | 31 controlli strutturali su codice compilato | 31/31 |
| `node scripts/demo-run.mjs` | rigenera [BEFORE_AFTER_EVIDENCE.md](BEFORE_AFTER_EVIDENCE.md) dal run reale | — |

**Test di mutazione verificato a mano**: sostituendo in
`affordabilityScenarioEngine.ts` l'invocazione
`ctx.invoke('MortgageCalculator', …)` con una chiamata diretta a `computeMortgage`,
falliscono 3 test:

- `scenarios.test` › *ogni invocazione dello scenario passa dal MortgageCalculator registrato*
- `registry.test` › *il conteggio delle invocazioni dimostra la delega ai tool*
- `stateMachine.test` › *tool non disponibile porta il run in ESCALATED con evento dedicato*

Rimuovere una vera invocazione dal registry rompe quindi la suite.
