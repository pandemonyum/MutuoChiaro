# Contratti dei componenti — MutuoChiaro

I contratti non sono solo documentazione: sono definiti nel codice come oggetti congelati
accanto all'implementazione e verificati dai test.

| Contratto | Definizione nel codice | Test |
| --- | --- | --- |
| `PROFILE_AGENT_CONTRACT` | [`app/src/agents/profilePropertyAgent.ts`](../app/src/agents/profilePropertyAgent.ts) | `journey.e2e` › *i contratti degli agenti dichiarano divieti e condizione di completamento* |
| `CLARITY_AGENT_CONTRACT` | [`app/src/agents/offerClarityAgent.ts`](../app/src/agents/offerClarityAgent.ts) | idem |

Tutti gli agenti restituiscono una **busta** conforme a
[`schemas/agent-envelope.schema.json`](schemas/agent-envelope.schema.json).

---

## 1. Mortgage Journey Orchestrator

Non è un agente: è il **piano di controllo**. Non produce testo per l'utente e non esegue
formule.

| Voce | Contenuto |
| --- | --- |
| **purpose** | Condurre il percorso dal profilo alla chiusura, mantenendo lo stato e imponendo i vincoli. |
| **allowed inputs** | Comandi dell'API: creazione run, aggiornamento profilo, risposta alla domanda, modifica offerta, calcolo scenari, invio quiz, approvazione, failure branch dimostrativi. |
| **required outputs** | `OrchestratorView`: stato, spiegazioni correnti, metriche, prossima azione suggerita, requisiti di completamento aperti, dichiarazione del gate. |
| **procedure** | Applica la fase → invoca il componente competente tramite il registry → aggiorna lo stato → applica la transizione legale → emette gli eventi. |
| **prohibitions** | Non calcola rate, interessi, liquidità o margini. Non valida schemi di offerta. Non valuta le risposte del quiz. Non genera i testi mostrati all'utente. Non conclude la sessione senza conferma umana. |
| **done condition** | `COMPLETED` con `completionBlockers` vuoto, oppure `ESCALATED` con motivo registrato. |
| **fallback** | `escalate(reason)`: scrive il motivo nello stato, transizione a `ESCALATED`, evento `run.escalated`. |
| **confidence** | Non produce confidenza propria: propaga quella dichiarata dagli agenti in `state.confidence`. |
| **nextAction** | Stringa in italiano mostrata all'utente, derivata dalla fase corrente. |
| **autorità esclusiva** | Unico detentore del token di mutazione dello stato; unico a chiamare `RunStore.transition`; unico a emettere `state.changed`. |

## 2. Profile & Property Agent — `profile-property-agent`

| Voce | Contenuto |
| --- | --- |
| **purpose** | Interpretare la situazione economica dichiarata e il piano di acquisto, rilevare dati mancanti o contraddittori, proporre la prossima domanda decisiva, formulare spiegazioni semplici. |
| **allowed inputs** | `syntheticProfile`, `property`, `offerValidations`, `answeredQuestions`, `questionRounds`, `maxQuestionRounds`, nomi delle offerte. Ricevuti come **snapshot congelato in profondità**. |
| **required outputs** | `issues` · `derived` (entrate totali, anticipo, liquidità necessaria prima dei costi d'offerta, rapporto prestito/prezzo) · `summaryForUser` · `question` · `questionRationale` · `candidates` · `profileComplete` · `questionsExhausted`. |
| **procedure** | 1) `build-financial-profile` → dati mancanti, errori bloccanti, valori derivati; 2) `select-next-decisive-question` → singola domanda + graduatoria motivata; 3) emette `missing_data.detected` per ogni lacuna e `question.selected` se una domanda è stata scelta; 4) restituisce la busta. |
| **prohibitions** | Non calcola rate o interessi. Non stima probabilità di approvazione o finanziabilità. Non raccomanda una banca o un'offerta. Non modifica direttamente lo stato globale. |
| **done condition** | Nessun dato mancante con impatto sul confronto, **oppure** domanda decisiva selezionata, **oppure** giri massimi esauriti. |
| **fallback** | Input non valido (importo negativo, reddito zero, durata fuori intervallo, mutuo maggiore del prezzo): `status = human-review`, elenco degli errori bloccanti, nessun proseguimento. L'orchestratore trasforma l'esito in `ESCALATED`. |
| **confidence** | `1 − (Σ impatti dei dati mancanti / 10)`, limitata a [0, 1]. |
| **nextAction** | `ASK_DECISIVE_QUESTION` · `PROCEED_WITH_PARTIAL_PROFILE` · `NORMALIZE_OFFERS` · `CORRECT_PROFILE_INPUT`. |
| **status possibili** | `needs-data` (domanda selezionata) · `success` (profilo completo) · `fallback` (giri esauriti con dati mancanti) · `human-review` (input non valido). |

## 3. Offer Clarity Agent — `offer-clarity-agent`

| Voce | Contenuto |
| --- | --- |
| **purpose** | Spiegare in linguaggio semplice differenze e trade-off fra le offerte già normalizzate, spiegare TAN, TAEG, durata, costi e scenari, evidenziare i dati mancanti, preparare il feedback del controllo di comprensione. |
| **allowed inputs** | `normalizedOffers`, `offerValidations`, `scenarios`, `emergencyFundMin`, `existingDebtsDeclared`, `comprehensionFeedback`, `injectedDrafts`. Nessun accesso allo stato mutabile. |
| **required outputs** | `perOffer` · `crossOffer` · `missingDataNotes` · `scenarioNotes` · `quizFeedback` · `disclaimers` · `safety` (esito del controllo). |
| **procedure** | 1) `explain-mortgage-tradeoffs` sui valori già calcolati; 2) raccoglie **tutti** i testi destinati alla UI in un ordine stabile; 3) li passa al tool `SafetyGuard`; 4) se qualcosa è bloccato emette `safety_guard.blocked`; 5) ricostruisce i gruppi usando **solo** i testi approvati. |
| **prohibitions** | Non produce una graduatoria delle offerte. Non assegna punteggi di convenienza. Non dichiara un'offerta adatta o inadatta. Non esegue direttamente formule finanziarie. Non inventa dati assenti. |
| **done condition** | Ogni offerta ha almeno una nota neutrale e ogni dato mancante è dichiarato con la domanda da porre alla banca. |
| **fallback** | `status = fallback` con i testi non conformi sostituiti da una formulazione neutrale; il blocco resta osservabile nell'evento e nello stato; la frase originale è conservata **solo** nel registro dei blocchi come pista di audit e non viene mostrata dall'interfaccia. |
| **confidence** | 0,9 con tutte le note presenti e nessun blocco · 0,6 in caso di blocco · 0,4 se manca una nota o un dato mancante non è dichiarato. |
| **nextAction** | `SHOW_MUTUOSPECCHIO` · `REVIEW_BLOCKED_TEXTS`. |
| **status possibili** | `success` · `fallback`. |

## 4. Human Gate

Non è un componente software: è un **passaggio obbligatorio** eseguito da una persona.

| Voce | Contenuto |
| --- | --- |
| **purpose** | Garantire che la sessione non si chiuda senza un atto esplicito dell'utente e che la natura educativa della simulazione sia stata compresa. |
| **fase ammessa** | Solo `AWAITING_HUMAN_CONFIRMATION`. |
| **dichiarazione** | «Dichiaro di aver compreso che questa simulazione è educativa, utilizza dati sintetici e non rappresenta una proposta, una delibera bancaria o una raccomandazione finanziaria.» |
| **cosa NON chiede** | Non chiede di selezionare un'offerta, non chiede una preferenza, non chiede di dichiarare un mutuo vincente. |
| **precondizioni** | Offerte validate · almeno uno scenario completato · controllo di comprensione eseguito · conferma ricevuta. |
| **se richiesto fuori fase** | `IllegalTransitionError` (HTTP 409), evento `state.transition_rejected`, avviso nello stato, **fase invariata**. |
| **se le precondizioni mancano** | Conferma registrata, requisiti aperti scritti nello stato, transizione rifiutata, fase invariata. |
| **eventi** | `human_approval.required` all'ingresso nella fase · `human_approval.received` alla conferma · `run.completed` alla chiusura. |

## 5. Skill

| Skill | purpose | prohibitions | done condition |
| --- | --- | --- | --- |
| `build-financial-profile` | Normalizzare e validare profilo e piano di acquisto, individuando dati mancanti e incoerenze | Non calcola rate né interessi; non stima dati assenti | Valori derivati prodotti e lacune elencate per impatto |
| `select-next-decisive-question` | Ordinare i dati mancanti per impatto e selezionare **una** domanda | Non modifica il profilo; non genera questionari fissi; non trasforma in domande all'utente i dati che vanno chiesti alla banca | Una domanda selezionata, oppure nessuna con motivo dichiarato |
| `normalize-mortgage-offers` | Portare tutte le offerte sullo stesso schema di righe con provenienza dichiarata | Non esegue formule (delega a `AffordabilityScenarioEngine`); non completa i campi assenti | 12 righe uniformi per ogni offerta, ognuna con provenienza |
| `explain-mortgage-tradeoffs` | Tradurre in linguaggio semplice i trade-off già calcolati | Non classifica; non assegna punteggi; non esegue formule; non inventa dati | Una nota per offerta, note trasversali, note sui dati mancanti e sugli scenari |
| `assess-user-understanding` | Valutare le risposte, produrre feedback mirato, indicare gli scenari da riaprire | Non modifica lo stato; non concede tentativi oltre il massimo | Esito calcolato con tentativi usati e feedback per ogni errore |

## 6. Tool deterministici

| Tool | Autorità esclusiva | Fallisce quando |
| --- | --- | --- |
| `MortgageCalculator` | Rata, interessi, costo totale simulato, ricalcolo con delta di tasso | Capitale ≤ 0, durata fuori [1, 40] anni, TAN fuori [0, 25]%, valori non numerici |
| `AffordabilityScenarioEngine` | Rapporto rata/reddito, margine, liquidità necessaria e residua, effetto perizia e reddito, confronto con il fondo di emergenza | Importi negativi, reddito complessivo ≤ 0, prezzo o risparmi assenti |
| `OfferSchemaValidator` | Validità, parzialità, campi mancanti, incongruenze, provenienza | Non fallisce: classifica ogni offerta come valida, parziale o non usabile |
| `MetricsEngine` | Metriche di esito e before/after | Non fallisce: produce metriche da stato ed eventi disponibili |
| `SafetyGuard` | Blocco e riformulazione dei testi non conformi | Non fallisce: restituisce sempre testi ammessi |

## 7. Vincoli verificati in esecuzione

| Vincolo | Come è imposto | Test |
| --- | --- | --- |
| Solo l'orchestratore muta lo stato | `Symbol` privato richiesto da `RunStore.raw`/`mutate` | `stateMachine.test` › *lo stato mutabile non e accessibile senza il token* |
| Gli agenti non possono alterare lo stato ricevuto | `structuredClone` + congelamento profondo | `stateMachine.test` › *lo snapshot passato agli agenti e congelato in profondita* |
| Ogni invocazione passa dal kernel | `ComponentContext.invoke` è l'unico modo per eseguire un componente | `registry.test` › *le invocazioni annidate passano dallo stesso kernel* |
| Le formule non escono dal tool | Rimuovere l'invocazione registrata rompe la suite | `scenarios.test` › *ogni invocazione dello scenario passa dal MortgageCalculator registrato* |
| Nessuna classifica nell'output | `SafetyGuard` + assenza di campi di ranking nello schema | `journey.e2e` › *nessuna classifica e nessun punteggio di convenienza nell output* |
| I loop sono limitati | `maxQuestionRounds`, `MAX_QUIZ_ATTEMPTS` | `journey.e2e` › *il numero di giri di domande ha un massimo esplicito* |
| Il gate blocca la chiusura | `completionBlockers` + tabella delle transizioni | `stateMachine.test` › *il gate blocca il completamento fino alla conferma esplicita* |
