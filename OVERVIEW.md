# Overview — componenti, matrice, dipendenze, macchina a stati

Vista di riferimento del runtime di MutuoChiaro. Per i contratti in prosa vedi
[docs/AGENTIC_ARCHITECTURE.md](docs/AGENTIC_ARCHITECTURE.md); per la mappa
criterio → evidenza vedi [docs/EVIDENCE_MATRIX.md](docs/EVIDENCE_MATRIX.md).

---

## 1. Componenti

### 1.1 Core (infrastruttura, nessuna logica di dominio)

| Componente | File | Responsabilità |
| --- | --- | --- |
| `types` | [`core/types.ts`](app/src/core/types.ts) | Tipi dello stato, fasi, vocabolario chiuso degli eventi, busta agentica, provenienze |
| `errors` | [`core/errors.ts`](app/src/core/errors.ts) | `ComponentNotFoundError`, `ComponentUnavailableError`, `IllegalTransitionError`, `ValidationError`, `StateMutationError` |
| `stateMachine` | [`core/stateMachine.ts`](app/src/core/stateMachine.ts) | `LEGAL_TRANSITIONS`, `completionBlockers`, fase del gate, testo della dichiarazione |
| `RunStore` | [`core/runStore.ts`](app/src/core/runStore.ts) | Stato esterno; mutazioni solo con il token dell'orchestratore; snapshot congelati in profondità |
| `Registry` | [`core/registry.ts`](app/src/core/registry.ts) | Kernel di invocazione: verifica nome, artifact, eventi, durata, invocazioni annidate, disabilitazione |
| `EventBus` | [`core/eventBus.ts`](app/src/core/eventBus.ts) | Stream append-only, numerazione progressiva **per run** |
| `ArtifactStore` | [`core/artifactStore.ts`](app/src/core/artifactStore.ts) | Salvataggio input/output con `ref` citabile e apribile dalla UI |

### 1.2 Orchestratore

| Componente | File | Responsabilità esclusive |
| --- | --- | --- |
| `MortgageJourneyOrchestrator` | [`orchestrator/mortgageJourneyOrchestrator.ts`](app/src/orchestrator/mortgageJourneyOrchestrator.ts) | Stato globale · scelta del componente da invocare · fase corrente · transizioni legali · conteggio dei tentativi · richiesta del gate umano · blocco del completamento prematuro · escalation |

### 1.3 Agenti

| Nome registrato | File | Skill/tool che invoca | Divieti |
| --- | --- | --- | --- |
| `profile-property-agent` | [`agents/profilePropertyAgent.ts`](app/src/agents/profilePropertyAgent.ts) | `build-financial-profile`, `select-next-decisive-question` | Non calcola rate o interessi · non stima approvazioni · non raccomanda banche · non modifica lo stato |
| `offer-clarity-agent` | [`agents/offerClarityAgent.ts`](app/src/agents/offerClarityAgent.ts) | `explain-mortgage-tradeoffs`, `SafetyGuard` | Non produce graduatorie · non assegna punteggi · non dichiara idoneità · non esegue formule · non inventa dati |

### 1.4 Skill

| Nome registrato | File | Input → Output | Invoca |
| --- | --- | --- | --- |
| `build-financial-profile` | [`skills/buildFinancialProfile.ts`](app/src/skills/buildFinancialProfile.ts) | profilo + immobile → dati mancanti, errori bloccanti, valori derivati, riassunto | — |
| `select-next-decisive-question` | [`skills/selectNextDecisiveQuestion.ts`](app/src/skills/selectNextDecisiveQuestion.ts) | dati mancanti + risposte già date + giro corrente → singola domanda + graduatoria motivata | — |
| `normalize-mortgage-offers` | [`skills/normalizeMortgageOffers.ts`](app/src/skills/normalizeMortgageOffers.ts) | offerte + validazioni + profilo → 12 righe uniformi con provenienza + scenario base | `AffordabilityScenarioEngine` |
| `explain-mortgage-tradeoffs` | [`skills/explainMortgageTradeoffs.ts`](app/src/skills/explainMortgageTradeoffs.ts) | offerte normalizzate + scenari → testi neutrali per offerta, trasversali, sui dati mancanti e sugli scenari | — |
| `assess-user-understanding` | [`skills/assessUserUnderstanding.ts`](app/src/skills/assessUserUnderstanding.ts) | risposte + tentativi precedenti → esito, feedback mirato, scenari da riaprire, limite raggiunto | — |

### 1.5 Tool deterministici

| Nome registrato | File | Autorità esclusiva |
| --- | --- | --- |
| `MortgageCalculator` | [`tools/mortgageCalculator.ts`](app/src/tools/mortgageCalculator.ts) | Rata (ammortamento francese), interessi complessivi, costo totale simulato, ricalcolo con delta di tasso |
| `AffordabilityScenarioEngine` | [`tools/affordabilityScenarioEngine.ts`](app/src/tools/affordabilityScenarioEngine.ts) | Rapporto rata/reddito, margine mensile, liquidità necessaria e residua, effetto perizia, effetto riduzione reddito, confronto con il fondo di emergenza |
| `OfferSchemaValidator` | [`tools/offerSchemaValidator.ts`](app/src/tools/offerSchemaValidator.ts) | Campi obbligatori, tipi, intervalli, campi mancanti, incongruenze, provenienza |
| `MetricsEngine` | [`tools/metricsEngine.ts`](app/src/tools/metricsEngine.ts) | Tempo di completamento, concetti compresi, tentativi, dati mancanti risolti, before/after |
| `SafetyGuard` | [`tools/safetyGuard.ts`](app/src/tools/safetyGuard.ts) | Intercettazione di raccomandazioni, classifiche, stime di approvazione e giudizi di idoneità |

### 1.6 Dati sintetici e interfaccia

| Componente | File | Contenuto |
| --- | --- | --- |
| Persona | [`data/syntheticPersona.ts`](app/src/data/syntheticPersona.ts) | Andrea; `existingMonthlyDebts: null` per attivare la domanda decisiva; risposta iniziale del before |
| Offerte | [`data/syntheticOffers.ts`](app/src/data/syntheticOffers.ts) | Tre offerte; la terza con polizza obbligatoria **senza costo**; glossario di 14 termini |
| Quiz | [`data/quizBank.ts`](app/src/data/quizBank.ts) | Tre domande, risposta corretta, feedback sulla misconcezione, scenario da riaprire, `MAX_QUIZ_ATTEMPTS = 3` |
| Runtime | [`runtime/buildRuntime.ts`](app/src/runtime/buildRuntime.ts) | Composizione unica: registra 5 tool, 5 skill, 2 agenti |
| API + statici | [`server/index.ts`](app/src/server/index.ts) | 16 endpoint su `node:http`, zero dipendenze |
| UI | [`public/`](app/public/) | Sette pagine con barra laterale condivisa (panoramica, profilo, offerte, MutuoSpecchio, scenari, comprensione, traccia), derivate dal prototipo grafico e collegate al runtime |
| Client UI | [`public/assets/app.js`](app/public/assets/app.js) | Renderizza ogni pagina dai dati del run: nessun valore precompilato, `runId` condiviso via `sessionStorage` |

---

## 2. Matrice agent / skill / tool / human gate

| Fase | Stato in ingresso | Orchestratore chiama | L'agente invoca | Tool coinvolti | Gate umano | Eventi emessi |
| --- | --- | --- | --- | --- | --- | --- |
| **A** Profilo | `START` / `PROFILE_INCOMPLETE` | `profile-property-agent` | `build-financial-profile` | — | no | `handoff.*`, `agent.*`, `skill.*`, `missing_data.detected` |
| **B** Domanda decisiva | `PROFILE_INCOMPLETE` | `profile-property-agent` | `select-next-decisive-question` | — | no | `question.selected`, `state.changed` |
| **C** Validazione offerte | `PROFILE_READY` | — (tool diretto) | — | `OfferSchemaValidator` | no | `tool.*`, `offer.incomplete` |
| **D** Normalizzazione | `PROFILE_READY` / `OFFERS_INCOMPLETE` | `normalize-mortgage-offers` | — | `AffordabilityScenarioEngine` → `MortgageCalculator` | no | `skill.*`, `tool.*`, `scenario.completed`, `state.changed` |
| **D′** Spiegazione | `OFFERS_NORMALIZED` | `offer-clarity-agent` | `explain-mortgage-tradeoffs`, `SafetyGuard` | `SafetyGuard` | no | `handoff.*`, `agent.*`, `safety_guard.blocked` |
| **E** Scenari | `OFFERS_NORMALIZED` | — (tool diretto) ×4 | — | `AffordabilityScenarioEngine` → `MortgageCalculator` | no | `tool.*`, `scenario.completed`, `state.changed` |
| **F** Comprensione | `SCENARIOS_READY` / `UNDERSTANDING_CHECK` | `assess-user-understanding` | — | — | no | `skill.*`, `understanding.failed`, `understanding.passed` |
| **G** Gate umano | `AWAITING_HUMAN_CONFIRMATION` | — | — | — | **sì, bloccante** | `human_approval.required`, `human_approval.received`, `run.completed` |
| **X** Metriche | dopo ogni avanzamento | — (tool diretto) | — | `MetricsEngine` | no | `tool.*` |
| **!** Escalation | qualsiasi fase non terminale | — | — | — | no | `run.escalated`, `state.transition_rejected`, `*.failed` |

**Chi può fare cosa** — nessuna sovrapposizione:

| Autorità | Orchestratore | Agenti | Skill | Tool | Umano |
| --- | :-: | :-: | :-: | :-: | :-: |
| Mutare lo stato globale | ✅ | ❌ | ❌ | ❌ | ❌ |
| Decidere le transizioni di fase | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invocare componenti | ✅ | ✅ (via kernel) | ✅ (via kernel) | ✅ (via kernel) | ❌ |
| Calcolare rate e interessi | ❌ | ❌ | ❌ | ✅ solo `MortgageCalculator` | ❌ |
| Calcolare liquidità e margini | ❌ | ❌ | ❌ | ✅ solo `AffordabilityScenarioEngine` | ❌ |
| Decidere validità di un'offerta | ❌ | ❌ | ❌ | ✅ solo `OfferSchemaValidator` | ❌ |
| Produrre testi per l'utente | ❌ | ✅ | ✅ | ❌ | ❌ |
| Bloccare un testo non conforme | ❌ | ❌ | ❌ | ✅ solo `SafetyGuard` | ❌ |
| Chiudere la sessione | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. Dipendenze

### 3.1 Esterne

**Runtime: nessuna.** Verificato dall'audit strutturale (*dipendenze: nessuna dipendenza di
runtime*).

| Dipendenza | Tipo | Uso |
| --- | --- | --- |
| `typescript@5.9.2` | dev | Compilazione e typecheck |
| `@types/node@22.15.3` | dev | Tipi delle API Node |

Piattaforma: **Node.js ≥ 22**, per `node --test` e `structuredClone`. Il server usa solo
`node:http`, `node:fs/promises`, `node:path`, `node:url`, `node:crypto`. L'interfaccia è
HTML/CSS/JS nativo, senza framework né bundler.

### 3.2 Interne (nessun ciclo)

```text
core/types ─────────────< tutto
core/errors ────────────< tools, skills, agents, orchestrator, server
core/stateMachine ──────< core/runStore, orchestrator, server
core/artifactStore ─────< core/registry
core/eventBus ──────────< core/registry, orchestrator
core/registry ──────────< tools, skills, agents, orchestrator, runtime
core/runStore ──────────< orchestrator

tools/mortgageCalculator  <── tools/affordabilityScenarioEngine (via kernel)
tools/affordabilityScenarioEngine <── skills/normalizeMortgageOffers (via kernel)
tools/safetyGuard         <── agents/offerClarityAgent (via kernel)

skills/buildFinancialProfile        <── agents/profilePropertyAgent
skills/selectNextDecisiveQuestion   <── agents/profilePropertyAgent
skills/explainMortgageTradeoffs     <── agents/offerClarityAgent
skills/normalizeMortgageOffers      <── orchestrator
skills/assessUserUnderstanding      <── orchestrator

agents/* ───> orchestrator ───> runtime/buildRuntime ───> server/index
data/*   ───> orchestrator, server
```

Regola rispettata: **agenti e skill non importano i tool per eseguirli**, solo per i tipi;
l'esecuzione passa sempre da `ctx.invoke`. È ciò che rende osservabile ogni calcolo e che
fa fallire i test se si aggira il kernel.

---

## 4. Macchina a stati

### 4.1 Transizioni legali

Da [`core/stateMachine.ts`](app/src/core/stateMachine.ts). Qualsiasi coppia non elencata è
rifiutata con `IllegalTransitionError`.

| Da | A | Quando |
| --- | --- | --- |
| `START` | `PROFILE_INCOMPLETE` | Il profilo ha dati mancanti con impatto |
| `START` | `PROFILE_READY` | Il profilo è completo |
| `START` | `ESCALATED` | Dati non validi o componente non disponibile |
| `PROFILE_INCOMPLETE` | `PROFILE_INCOMPLETE` | Nuovo giro di domande (max 3) |
| `PROFILE_INCOMPLETE` | `PROFILE_READY` | Nessun dato mancante con impatto |
| `PROFILE_INCOMPLETE` | `ESCALATED` | Errore bloccante |
| `PROFILE_READY` | `OFFERS_INCOMPLETE` | Almeno un'offerta è solo parziale |
| `PROFILE_READY` | `OFFERS_NORMALIZED` | Tutte le offerte validate |
| `PROFILE_READY` | `PROFILE_INCOMPLETE` | Il profilo torna incompleto dopo una modifica |
| `PROFILE_READY` | `ESCALATED` | Errore bloccante |
| `OFFERS_INCOMPLETE` | `OFFERS_NORMALIZED` | Normalizzazione completata in modalità parziale |
| `OFFERS_INCOMPLETE` | `OFFERS_INCOMPLETE` | Nuova modifica di un'offerta |
| `OFFERS_INCOMPLETE` | `ESCALATED` | Nessuna offerta utilizzabile |
| `OFFERS_NORMALIZED` | `SCENARIOS_READY` | Scenari calcolati |
| `OFFERS_NORMALIZED` | `OFFERS_INCOMPLETE` | Offerta modificata a mano |
| `OFFERS_NORMALIZED` | `PROFILE_INCOMPLETE` | Profilo modificato |
| `OFFERS_NORMALIZED` | `ESCALATED` | Errore bloccante |
| `SCENARIOS_READY` | `UNDERSTANDING_CHECK` | Avvio del controllo di comprensione |
| `SCENARIOS_READY` | `SCENARIOS_READY` | Ricalcolo degli scenari |
| `SCENARIOS_READY` | `OFFERS_NORMALIZED` | Offerte rinormalizzate |
| `SCENARIOS_READY` | `PROFILE_INCOMPLETE` | Profilo modificato |
| `SCENARIOS_READY` | `ESCALATED` | Errore bloccante |
| `UNDERSTANDING_CHECK` | `UNDERSTANDING_CHECK` | Nuovo tentativo (max 3) |
| `UNDERSTANDING_CHECK` | `SCENARIOS_READY` | Scenario riaperto dopo un errore |
| `UNDERSTANDING_CHECK` | `AWAITING_HUMAN_CONFIRMATION` | Controllo superato **oppure** limite raggiunto |
| `UNDERSTANDING_CHECK` | `ESCALATED` | Errore bloccante |
| `AWAITING_HUMAN_CONFIRMATION` | `COMPLETED` | Conferma umana ricevuta **e** requisiti soddisfatti |
| `AWAITING_HUMAN_CONFIRMATION` | `UNDERSTANDING_CHECK` | Ritorno al controllo |
| `AWAITING_HUMAN_CONFIRMATION` | `ESCALATED` | Errore bloccante |
| `COMPLETED` | — | Terminale |
| `ESCALATED` | — | Terminale |

`AWAITING_HUMAN_CONFIRMATION` è **l'unica** fase con `COMPLETED` fra le uscite legali.

### 4.2 Precondizioni di `COMPLETED`

`completionBlockers` deve restituire una lista vuota. Requisiti:

1. almeno un'offerta valida o parziale ha superato la validazione di schema;
2. almeno uno scenario completato;
3. controllo di comprensione eseguito (`PASSED` o `NOT_VERIFIED`, **non** `NOT_STARTED` né
   `IN_PROGRESS`);
4. conferma umana ricevuta.

Se la conferma arriva ma un requisito manca, l'approvazione viene registrata, i requisiti
aperti sono scritti nello stato, la transizione è rifiutata con `state.transition_rejected`
e la fase **non cambia**.

### 4.3 Loop e limiti

| Loop | Massimo | Comportamento al limite |
| --- | --- | --- |
| Domande decisive (`PROFILE_INCOMPLETE` → sé stessa) | `maxQuestionRounds = 3` | `question: null`, `exhausted: true`; il run prosegue con i dati disponibili, i mancanti restano segnalati |
| Tentativi del quiz (`UNDERSTANDING_CHECK` → sé stessa) | `MAX_QUIZ_ATTEMPTS = 3` | `NOT_VERIFIED`, avviso nello stato, passaggio al gate umano con i risultati consultabili |

### 4.4 Stato del run

`runId` · `currentPhase` · `syntheticProfile` · `property` · `offers` ·
`offerValidations` · `normalizedOffers` · `missingData` · `resolvedMissingData` ·
`selectedQuestion` · `answeredQuestions` · `questionRounds` · `maxQuestionRounds` ·
`scenarios` · `comprehensionAttempts` · `comprehensionResult` · `warnings` · `confidence` ·
`artifactReferences` · `humanApproval` · `before` · `escalation` · `timestamps`

Schema JSON: [`agents/schemas/runtime-state.schema.json`](agents/schemas/runtime-state.schema.json).

---

## 5. API

| Metodo | Endpoint | Effetto |
| --- | --- | --- |
| `GET` | `/api/meta` | Quiz, glossario, righe di MutuoSpecchio, transizioni legali, componenti registrati, dichiarazione del gate |
| `POST` | `/api/run` | Crea un run con persona e offerte sintetiche |
| `GET` | `/api/run/:id` | Stato, spiegazioni, metriche, eventi, conteggi di invocazione — **sola lettura, non emette eventi** |
| `POST` | `/api/run/:id/profile` | Aggiorna il profilo e riesegue la fase A/B |
| `POST` | `/api/run/:id/answer` | Risposta alla domanda decisiva, poi ricalcolo |
| `POST` | `/api/run/:id/offers/:offerId` | Modifica manuale di un'offerta e rivalidazione |
| `POST` | `/api/run/:id/normalize` | Rivalida e rinormalizza |
| `POST` | `/api/run/:id/scenarios` | Calcola gli scenari (tutti o un sottoinsieme) |
| `POST` | `/api/run/:id/understanding/start` | Entra nel controllo di comprensione |
| `POST` | `/api/run/:id/understanding` | Invia le risposte |
| `POST` | `/api/run/:id/approve` | **Gate umano** |
| `POST` | `/api/run/:id/inject-noncompliant` | Failure branch: bozza non conforme verso `SafetyGuard` |
| `POST` | `/api/run/:id/simulate-outage` | Failure branch: componente non disponibile |
| `GET` | `/api/run/:id/events` | Eventi del run |
| `GET` | `/api/run/:id/artifacts` | Indice degli artifact |
| `GET` | `/api/artifact/:ref` | Contenuto di un artifact |

Codici di errore: `422` validazione (`ValidationError`), `409` transizione illegale
(`IllegalTransitionError`), `503` componente non disponibile, `404` endpoint o risorsa
inesistente.
