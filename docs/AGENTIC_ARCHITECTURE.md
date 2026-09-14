# Architettura agentica — MutuoChiaro

## 1. Forma dell'architettura

```text
UI (public/) ─ HTTP ─> API (src/server/index.ts)
                          │
                          v
              MortgageJourneyOrchestrator          <-- unico proprietario dello stato
                          │
        ┌─────────────────┴──────────────────┐
        v                                    v
 Profile & Property Agent            Offer Clarity Agent
        │                                    │
        │ build-financial-profile            │ explain-mortgage-tradeoffs
        │ select-next-decisive-question      │ SafetyGuard
        v                                    v
              Registry / kernel di invocazione   <-- ogni chiamata passa da qui
                          │
   MortgageCalculator · AffordabilityScenarioEngine · OfferSchemaValidator
   MetricsEngine · SafetyGuard · normalize-mortgage-offers
   assess-user-understanding
                          │
                          v
            EventBus (traccia)  +  ArtifactStore (inputRef/outputRef)
                          │
                          v
                     Human Gate            <-- blocca COMPLETED
```

Due agenti, cinque skill, cinque tool. Nessun componente aggiuntivo introdotto per
aumentarne il numero: ogni elemento ha un'autorità distinta e non sovrapposta.

## 2. Matrice delle capability

| Capability | Chi la esercita | Autorità esclusiva su |
| --- | --- | --- |
| Stato globale e transizioni di fase | `MortgageJourneyOrchestrator` | Unico detentore del token di mutazione; unico a chiamare `RunStore.transition` |
| Scelta del prossimo passo | `MortgageJourneyOrchestrator` | Decide quale agente/skill/tool invocare e in quale fase |
| Interpretazione del profilo e dei dati mancanti | `profile-property-agent` | Rileva lacune e incoerenze, propone la prossima domanda |
| Selezione della domanda decisiva | `select-next-decisive-question` | Ordina i dati mancanti per impatto sul confronto |
| Spiegazione dei trade-off | `offer-clarity-agent` | Produce i testi neutrali mostrati all'utente |
| Formule finanziarie | `MortgageCalculator` | Unico punto in cui si calcola una rata o un interesse |
| Sostenibilità e liquidità | `AffordabilityScenarioEngine` | Unico punto in cui si calcolano rapporti, margini e liquidità |
| Validazione di schema | `OfferSchemaValidator` | Unico punto in cui si decide se un'offerta è valida, parziale o non usabile |
| Valutazione della comprensione | `assess-user-understanding` | Unico punto in cui si decide se una risposta è corretta |
| Metriche before/after | `MetricsEngine` | Unico punto in cui si producono numeri di esito |
| Vocabolario ammesso | `SafetyGuard` | Unico punto in cui un testo viene bloccato o riformulato |
| Chiusura della sessione | Essere umano | `COMPLETED` è raggiungibile solo dopo `human_approval.received` |

## 3. Contratti degli agenti

I contratti sono definiti nel codice come oggetti congelati, accanto
all'implementazione, e verificati da test:
[`PROFILE_AGENT_CONTRACT`](../app/src/agents/profilePropertyAgent.ts),
[`CLARITY_AGENT_CONTRACT`](../app/src/agents/offerClarityAgent.ts).

### 3.1 Profile & Property Agent (`profile-property-agent`)

| Voce | Contenuto |
| --- | --- |
| **purpose** | Interpretare la situazione economica dichiarata e il piano di acquisto, rilevare dati mancanti o contraddittori, proporre la prossima domanda decisiva. |
| **allowed inputs** | `syntheticProfile`, `property`, `offerValidations`, `answeredQuestions`, `questionRounds` — ricevuti come snapshot congelato in profondità. |
| **required outputs** | `AgentEnvelope` con `issues`, `derived`, `question`, `questionRationale`, `candidates`, `summaryForUser`, `confidence`, `nextAction`, `doneCondition`. |
| **procedure** | 1) invoca `build-financial-profile`; 2) invoca `select-next-decisive-question`; 3) restituisce la busta. |
| **prohibitions** | Non calcola rate o interessi. Non stima probabilità di approvazione o finanziabilità. Non raccomanda una banca o un'offerta. Non modifica lo stato globale. |
| **done condition** | Nessun dato mancante con impatto sul confronto, oppure domanda decisiva selezionata, oppure giri massimi esauriti. |
| **fallback** | Su input non valido: `status = human-review` con gli errori bloccanti, senza proseguire. L'orchestratore trasforma questo esito in `ESCALATED`. |
| **confidence** | `1 − (somma degli impatti dei dati mancanti / 10)`, limitata a [0, 1]. |
| **nextAction** | `ASK_DECISIVE_QUESTION` · `PROCEED_WITH_PARTIAL_PROFILE` · `NORMALIZE_OFFERS` · `CORRECT_PROFILE_INPUT`. |

### 3.2 Offer Clarity Agent (`offer-clarity-agent`)

| Voce | Contenuto |
| --- | --- |
| **purpose** | Spiegare in linguaggio semplice differenze e trade-off fra le offerte già normalizzate, evidenziare i dati mancanti, preparare il feedback del controllo di comprensione. |
| **allowed inputs** | `normalizedOffers`, `offerValidations`, `scenarios`, `comprehensionFeedback`, `injectedDrafts`. Nessun accesso allo stato mutabile. |
| **required outputs** | `AgentEnvelope` con `perOffer`, `crossOffer`, `missingDataNotes`, `scenarioNotes`, `quizFeedback`, `disclaimers`, `safety`. |
| **procedure** | 1) invoca `explain-mortgage-tradeoffs`; 2) fa passare **ogni** testo dal tool `SafetyGuard`; 3) restituisce solo i testi approvati. |
| **prohibitions** | Non produce graduatorie. Non assegna punteggi di convenienza. Non dichiara un'offerta adatta o inadatta. Non esegue formule finanziarie. Non inventa dati assenti. |
| **done condition** | Ogni offerta ha almeno una nota neutrale e ogni dato mancante è dichiarato con la domanda da porre alla banca. |
| **fallback** | Se `SafetyGuard` blocca dei testi: `status = fallback`, testi sostituiti, evento `safety_guard.blocked` emesso, avviso registrato nello stato. |
| **confidence** | 0,9 con tutte le note presenti e nessun blocco; 0,6 in caso di blocco; 0,4 se manca una nota o un dato mancante non è dichiarato. |
| **nextAction** | `SHOW_MUTUOSPECCHIO` · `REVIEW_BLOCKED_TEXTS`. |

## 4. Stato esterno e tipizzato

Definito in [`types.ts`](../app/src/core/types.ts), contenuto in
[`RunStore`](../app/src/core/runStore.ts), separato dai prompt e dai componenti.

Campi: `runId`, `currentPhase`, `syntheticProfile`, `property`, `offers`,
`offerValidations`, `normalizedOffers`, `missingData`, `resolvedMissingData`,
`selectedQuestion`, `answeredQuestions`, `questionRounds`, `maxQuestionRounds`,
`scenarios`, `comprehensionAttempts`, `comprehensionResult`, `warnings`, `confidence`,
`artifactReferences`, `humanApproval`, `before`, `escalation`, `timestamps`.

**Come è imposta l'autorità esclusiva dell'orchestratore:**

1. `RunStore.raw()` e `RunStore.mutate()` richiedono un `Symbol` privato del modulo
   (`RunStore.token`), detenuto dall'orchestratore. Chiamarli con un altro simbolo lancia.
2. Agenti e skill ricevono `RunStore.snapshot()`, un clone **congelato in profondità**: un
   tentativo di scrittura in strict mode lancia `TypeError`.
3. Il kernel di invocazione non ha alcun riferimento in scrittura allo stato.

Verificato da `stateMachine.test.ts` (`lo stato mutabile non e accessibile senza il token`,
`lo snapshot passato agli agenti e congelato in profondita`).

## 5. Macchina a stati

```text
            START
              │
              ├──────────────> ESCALATED  (dati non validi, componente non disponibile)
              v
     PROFILE_INCOMPLETE <─┐  (loop di domande, max 3 giri)
              │           │
              v           │
        PROFILE_READY ────┘
              │
              ├──> OFFERS_INCOMPLETE ──┐   (almeno un'offerta parziale)
              │                        │
              v                        v
        OFFERS_NORMALIZED <────────────┘
              │
              v
       SCENARIOS_READY <──┐
              │           │ (scenario riaperto dopo un errore nel quiz)
              v           │
      UNDERSTANDING_CHECK ┘ <─┐
              │               │ (nuovo tentativo, max 3)
              │───────────────┘
              v
  AWAITING_HUMAN_CONFIRMATION
              │
              v
          COMPLETED
```

Tabella completa in [`stateMachine.ts`](../app/src/core/stateMachine.ts)
(`LEGAL_TRANSITIONS`). Ogni transizione non elencata è rifiutata da
`RunStore.transition` con `IllegalTransitionError`.

**Nessuna scorciatoia verso `COMPLETED`**: solo
`AWAITING_HUMAN_CONFIRMATION` ha `COMPLETED` fra le uscite legali, e l'audit strutturale
verifica questa proprietà sulla tabella.

`COMPLETED` ed `ESCALATED` sono terminali: nessuna uscita, e ogni azione successiva viene
rifiutata.

## 6. Loop limitati

| Loop | Limite | Dove | Comportamento al limite |
| --- | --- | --- | --- |
| Domande decisive | `maxQuestionRounds = 3` | `mortgageJourneyOrchestrator.ts`, applicato da `select-next-decisive-question` | La skill restituisce `question: null, exhausted: true`; il run prosegue con i dati disponibili e i dati mancanti restano segnalati |
| Tentativi del quiz | `MAX_QUIZ_ATTEMPTS = 3` | [`quizBank.ts`](../app/src/data/quizBank.ts) | `comprehensionResult.status = NOT_VERIFIED`, evento `understanding.failed`, avviso nello stato, passaggio al gate umano con i risultati consultabili |

Nessun loop è illimitato e nessuno dipende dalla terminazione spontanea di un modello.

## 7. Percorsi di fallimento

| Fallimento | Rilevato da | Effetto osservabile |
| --- | --- | --- |
| Polizza obbligatoria senza costo | `OfferSchemaValidator` | `offer.incomplete`; offerta `partial`; totali marcati parziali; domanda per la banca; fase `OFFERS_INCOMPLETE`; avviso nello stato |
| Importo negativo | `build-financial-profile` / `MortgageCalculator` | `ValidationError`; `skill.failed`; agente in `human-review`; `run.escalated`; fase `ESCALATED` |
| Reddito uguale a zero | `build-financial-profile` | idem, con codice `ZERO_INCOME` |
| Durata non valida | `build-financial-profile` / `MortgageCalculator` | idem, con codice `OUT_OF_RANGE` |
| Componente non disponibile | `Registry` | `tool.failed` su chiamato e chiamante, con `inputRef` e `outputRef` dell'errore; `run.escalated`; fase `ESCALATED` |
| Componente inesistente | `Registry` | `ComponentNotFoundError` + evento di fallimento |
| Output agentico con raccomandazione | `SafetyGuard` | `safety_guard.blocked`; frase sostituita prima della UI; testo originale conservato solo come pista di audit; avviso nello stato; agente in `fallback` |
| Limite di tentativi del quiz | Orchestratore | `understanding.failed`; `NOT_VERIFIED`; avviso; gate umano comunque raggiungibile |
| Approvazione in fase sbagliata | Orchestratore | `IllegalTransitionError` (HTTP 409); `state.transition_rejected`; avviso nello stato; **fase invariata** |
| Risposta a una domanda non attiva | Orchestratore | `ValidationError` (HTTP 422); `state.transition_rejected` |
| Requisiti di completamento non soddisfatti | `completionBlockers` | Approvazione registrata ma transizione a `COMPLETED` rifiutata, con elenco dei requisiti aperti |

Nessun fallimento si limita a un messaggio in console: ognuno cambia lo stato **o** emette
un evento, e nella maggior parte dei casi entrambi.

## 8. Kernel di invocazione

[`Registry`](../app/src/core/registry.ts) è l'unico punto d'ingresso per agenti, skill e
tool. Per ogni chiamata, nell'ordine:

1. verifica il nome del componente nel registro;
2. salva l'input nell'`ArtifactStore` e ottiene un `inputRef`;
3. emette `agent.started` / `skill.started` / `tool.started` con l'`inputRef`;
4. esegue il componente, passandogli un `ComponentContext` il cui `invoke` rientra nello
   stesso kernel (le chiamate annidate sono quindi tracciate allo stesso modo);
5. salva l'output e ottiene un `outputRef`;
6. emette `*.completed` con `durationMs`, oppure `*.failed` con l'errore serializzato come
   artifact.

L'orchestratore aggiunge `handoff.started` e `handoff.completed` attorno a ogni chiamata
di agente, riportando nel messaggio `status`, `confidence` e `nextAction` della busta.

Il kernel **non** aggiorna lo stato: lo fa solo l'orchestratore.

## 9. Eventi

Vocabolario chiuso in `EVENT_KINDS` ([`types.ts`](../app/src/core/types.ts)), verificato
dai test e dall'audit: nessun evento fuori elenco può comparire nella traccia.

`run.started` · `state.changed` · `state.transition_rejected` · `handoff.started` ·
`handoff.completed` · `agent.started` · `agent.completed` · `agent.failed` ·
`skill.started` · `skill.completed` · `skill.failed` · `tool.started` · `tool.completed` ·
`tool.failed` · `missing_data.detected` · `question.selected` · `offer.incomplete` ·
`scenario.completed` · `safety_guard.blocked` · `understanding.failed` ·
`understanding.passed` · `human_approval.required` · `human_approval.received` ·
`run.completed` · `run.escalated`

`state.transition_rejected` e `skill.failed` sono estensioni rispetto all'elenco minimo del
brief: la prima rende osservabile una transizione rifiutata, la seconda allinea il
vocabolario delle skill a quello di agenti e tool.

Ogni evento porta `seq` (progressivo per run), `ts`, `actor`, `actorKind`, `status`,
`message` e, quando applicabile, `inputRef`, `outputRef`, `durationMs`, `phaseAfter`.

La sezione **Traccia agentica** dell'interfaccia legge `GET /api/run/:id` e mostra gli
eventi reali del run; gli `inputRef` e `outputRef` sono pulsanti che aprono il contenuto
dell'artifact via `GET /api/artifact/:ref`. Nessuna parte della traccia è precompilata: una
richiesta di sola lettura non produce eventi, perché `view()` non invoca componenti.

## 10. Perché il modello non esegue i passi critici

Nel prototipo, agenti e skill sono funzioni deterministiche: la separazione non è
un'intenzione dichiarata nei prompt, ma una struttura del codice.

- Le formule finanziarie esistono in un solo file e sono raggiungibili solo tramite il
  registry. Sostituire l'invocazione registrata con un calcolo inline fa **fallire tre
  test**, verificato per mutazione.
- La validazione di schema è l'unica autorità su validità, parzialità e dati mancanti.
- Le transizioni sono decise da una tabella, non da un testo.
- Il vocabolario ammesso è imposto da regole applicate a valle della generazione dei testi.

Sostituendo l'implementazione di un agente con una chiamata a un modello linguistico, i
contratti, il gate, gli eventi e i limiti resterebbero invariati: cambierebbe solo come
viene prodotto il testo, non chi calcola, chi valida e chi chiude la sessione.
