# Workflow di esecuzione — MutuoChiaro

Sequenza reale delle invocazioni, nell'ordine in cui compaiono nella traccia agentica.
Verificabile aprendo la sezione **Traccia agentica** dell'interfaccia o eseguendo
`node scripts/demo-run.mjs` dalla cartella `app/`.

---

## Fase A — Profilo

```text
POST /api/run
  └─ orchestrator                      run.started                    → START

POST /api/run/:id/profile
  └─ orchestrator                      handoff.started
     └─ profile-property-agent         agent.started      in:…
        ├─ build-financial-profile     skill.started      in:…
        │                              skill.completed    out:… 0,04 ms
        ├─ select-next-decisive-question skill.started    in:…
        │                              skill.completed    out:… 0,02 ms
        ├─                             missing_data.detected
        └─                             question.selected
                                       agent.completed    out:… 0,31 ms
     └─ orchestrator                   handoff.completed  status=needs-data
                                                          confidence=0,92
                                                          nextAction=ASK_DECISIVE_QUESTION
     └─ orchestrator                   state.changed      → PROFILE_INCOMPLETE
     └─ MetricsEngine                  tool.started/completed
```

Su input non valido (importo negativo, reddito zero, durata fuori intervallo) la catena
diventa: `skill.failed` → agente in `human-review` → `run.escalated` → `ESCALATED`.

## Fase B — Prossima domanda decisiva

```text
POST /api/run/:id/answer   { field: "existingMonthlyDebts", value: 280 }
  └─ orchestrator          aggiorna il profilo, registra la risposta, incrementa il giro
  └─ profile-property-agent  (come sopra, senza question.selected)
  └─ orchestrator          state.changed → PROFILE_READY
  └─ prosegue automaticamente con la fase C/D
```

Limite: `maxQuestionRounds = 3`. Al terzo giro la skill restituisce `question: null`,
`exhausted: true` e il run prosegue con i dati disponibili.

## Fasi C e D — Validazione, normalizzazione, spiegazione

```text
  └─ OfferSchemaValidator            tool.started/completed
  └─ orchestrator                    offer.incomplete     (offerta C, insuranceCost)
  └─ orchestrator                    state.changed        → OFFERS_INCOMPLETE
  └─ normalize-mortgage-offers       skill.started
     └─ AffordabilityScenarioEngine  tool.started
        ├─ MortgageCalculator        tool.started/completed   (offerta A)
        ├─ MortgageCalculator        tool.started/completed   (offerta B)
        └─ MortgageCalculator        tool.started/completed   (offerta C)
                                     tool.completed
                                     skill.completed
  └─ orchestrator                    scenario.completed   (scenario base)
  └─ orchestrator                    state.changed        → OFFERS_NORMALIZED
  └─ orchestrator                    handoff.started
     └─ offer-clarity-agent          agent.started
        ├─ explain-mortgage-tradeoffs skill.started/completed
        └─ SafetyGuard               tool.started/completed
                                     agent.completed
     └─ orchestrator                 handoff.completed    status=success
                                                          nextAction=SHOW_MUTUOSPECCHIO
```

Le invocazioni annidate passano dallo **stesso** kernel: per questo `MortgageCalculator`
compare nella traccia con i propri `inputRef`/`outputRef` anche quando è chiamato da un
altro tool.

## Fase E — Scenari

```text
POST /api/run/:id/scenarios
  ├─ AffordabilityScenarioEngine → 3× MortgageCalculator   BASE
  ├─ AffordabilityScenarioEngine → 3× MortgageCalculator   APPRAISAL_MINUS_10
  ├─ AffordabilityScenarioEngine → 3× MortgageCalculator   RATE_PLUS_2PP
  ├─ AffordabilityScenarioEngine → 3× MortgageCalculator   INCOME_MINUS_20_6M
  └─ orchestrator   scenario.completed ×4
  └─ orchestrator   state.changed → SCENARIOS_READY
  └─ offer-clarity-agent (rigenera le note con gli scenari aggiornati)
```

## Fase F — Controllo di comprensione

```text
POST /api/run/:id/understanding/start
  └─ orchestrator              state.changed → UNDERSTANDING_CHECK

POST /api/run/:id/understanding   { answers: … }
  └─ assess-user-understanding skill.started/completed
  ├─ se errato con tentativi residui:
  │    orchestrator            understanding.failed
  │    offer-clarity-agent     (prepara il feedback mirato)
  │    orchestrator            state.changed → UNDERSTANDING_CHECK
  ├─ se corretto:
  │    orchestrator            understanding.passed
  │    orchestrator            state.changed → AWAITING_HUMAN_CONFIRMATION
  │    orchestrator            human_approval.required
  └─ se raggiunto il limite di 3 tentativi:
       orchestrator            understanding.failed
       stato                   comprehensionResult = NOT_VERIFIED + avviso
       orchestrator            state.changed → AWAITING_HUMAN_CONFIRMATION
       orchestrator            human_approval.required
```

## Fase G — Gate umano

```text
POST /api/run/:id/approve   { confirmed: true }
  ├─ fase ≠ AWAITING_HUMAN_CONFIRMATION
  │    orchestrator   state.transition_rejected   → fase INVARIATA, HTTP 409
  ├─ confirmed = false
  │    avviso nello stato, fase invariata
  ├─ requisiti di completamento non soddisfatti
  │    conferma registrata, requisiti scritti nello stato,
  │    state.transition_rejected, fase invariata, HTTP 409
  └─ conferma valida e requisiti soddisfatti
       orchestrator   human_approval.received
       orchestrator   state.changed → COMPLETED
       orchestrator   run.completed
```

## Failure branch dimostrativi

```text
POST /api/run/:id/inject-noncompliant
  └─ offer-clarity-agent   agent.started
     ├─ explain-mortgage-tradeoffs   skill.started/completed
     └─ SafetyGuard                  tool.started/completed
        └─ orchestrator/agent        safety_guard.blocked
                                     agent.completed  status=fallback
                                                      nextAction=REVIEW_BLOCKED_TEXTS
  └─ avviso registrato nello stato; frase sostituita prima della UI

POST /api/run/:id/simulate-outage   { component: "MortgageCalculator" }
  └─ registry.disable("MortgageCalculator")
  └─ AffordabilityScenarioEngine     tool.started
     └─ MortgageCalculator           tool.failed    in:… out:…(errore)
                                     tool.failed    (il chiamante propaga)
  └─ orchestrator                    run.escalated
  └─ orchestrator                    state.changed  → ESCALATED
  └─ registry.enable(…)              (ripristino, il run resta terminale)
```

---

## Letture di sola lettura

`GET /api/run/:id`, `GET /api/run/:id/events`, `GET /api/run/:id/artifacts`,
`GET /api/artifact/:ref` **non emettono eventi e non invocano componenti**: le metriche
restituite sono quelle calcolate dall'ultimo avanzamento reale. La traccia cresce solo per
effetto di azioni vere, non per il polling dell'interfaccia.

## Ordine di verifica del progetto

```bash
cd app
npm install
npm run typecheck        # tsc --noEmit
npm test                 # build + 113 test
npm run audit:structure  # 31 controlli strutturali sul codice compilato
node scripts/demo-run.mjs > ../docs/BEFORE_AFTER_EVIDENCE.md
```

`npm run verify` esegue typecheck, test e audit in sequenza.
