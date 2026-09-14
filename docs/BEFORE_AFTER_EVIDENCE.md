# Evidenze del run canonico MutuoChiaro (dati sintetici)

runId: `demo-evidence`

## Fase A/B - profilo e prossima domanda decisiva
- fase dopo la conferma del profilo: `PROFILE_INCOMPLETE`
- campo mancante selezionato: `existingMonthlyDebts`
- domanda posta: "Hai prestiti, finanziamenti o altre rate mensili già attive? Questo dato incide sul margine che rimane dopo il pagamento del mutuo."
- motivazione: "Senza questo dato il margine mensile calcolato è più alto di quello reale, e il confronto fra le offerte risulta distorto."
- impatto dichiarato sul confronto: 0.85
- dopo la risposta (280 €/mese) la fase è `OFFERS_NORMALIZED`

## Fase D - MutuoSpecchio, scenario base
| Voce | Offerta Sintetica A - Fisso 20 anni | Offerta Sintetica B - Fisso 30 anni | Offerta Sintetica C - Variabile 30 anni |
| --- | --- | --- | --- |
| Rata iniziale | 1231,16 € `CALCULATED` | 981,77 € `CALCULATED` | 886,52 € `CALCULATED` |
| TAN | 3,1% `SYNTHETIC_OFFER` | 3,45% `SYNTHETIC_OFFER` | 2,65% `SYNTHETIC_OFFER` |
| TAEG dichiarato | 3,38% `SYNTHETIC_OFFER` | 3,72% `SYNTHETIC_OFFER` | 2,95% `SYNTHETIC_OFFER` |
| Durata (anni) | 20 `SYNTHETIC_OFFER` | 30 `SYNTHETIC_OFFER` | 30 `SYNTHETIC_OFFER` |
| Costo totale simulato | 297.748,40 € `CALCULATED` | 356.707,20 € `CALCULATED` | 320.577,20 € `CALCULATED` |
| Interessi totali simulati | 75.478,40 € `CALCULATED` | 133.437,20 € `CALCULATED` | 99.147,20 € `CALCULATED` |
| Costi iniziali | 2270,00 € `SYNTHETIC_OFFER` | 2550,00 € `SYNTHETIC_OFFER` | 350,00 € `SYNTHETIC_OFFER` |
| Liquidità residua | -10.270,00 € `CALCULATED` | -10.550,00 € `CALCULATED` | -8350,00 € `CALCULATED` |
| Rapporto rata/reddito | 54,72% `CALCULATED` | 43,63% `CALCULATED` | 39,4% `CALCULATED` |
| Margine mensile | 738,84 € `CALCULATED` | 986,23 € `CALCULATED` | 1080,48 € `CALCULATED` |

Offerte in confronto parziale: offer-c
- `offer-c` campi assenti: insuranceCost
  - confronti non possibili: costo totale simulato completo; confronto dei costi iniziali complessivi
  - domanda per la banca: Qual è il costo della polizza assicurativa indicata come obbligatoria, e come viene pagata (una tantum, annuale o inclusa nella rata)?

## Fase E - scenari

### Scenario base (`BASE`)

| Voce | Offerta Sintetica A - Fisso 20 anni | Offerta Sintetica B - Fisso 30 anni | Offerta Sintetica C - Variabile 30 anni |
| --- | --- | --- | --- |
| Rata mensile | 1231,16 € `CALCULATED` | 981,77 € `CALCULATED` | 886,52 € `CALCULATED` |
| Rapporto rata/reddito | 54,72% `CALCULATED` | 43,63% `CALCULATED` | 39,4% `CALCULATED` |
| Margine mensile | 738,84 € `CALCULATED` | 986,23 € `CALCULATED` | 1080,48 € `CALCULATED` |
| Liquidità iniziale necessaria | 110.270,00 € `CALCULATED` | 110.550,00 € `CALCULATED` | 108.350,00 € `CALCULATED` |
| Liquidità residua | -10.270,00 € `CALCULATED` | -10.550,00 € `CALCULATED` | -8350,00 € `CALCULATED` |
| Sotto il fondo di emergenza | sì | sì | sì |

Ipotesi dichiarate:
- Tasso e reddito costanti per tutta la durata.
- Perizia pari al prezzo di acquisto.

Avvertenze:
- Offerta Sintetica C - Variabile 30 anni: il costo della polizza obbligatoria non è presente nell offerta. Costo totale e liquidità necessaria sono sottostimati di un importo non noto.

### Perizia inferiore del 10% rispetto al prezzo (`APPRAISAL_MINUS_10`)

| Voce | Offerta Sintetica A - Fisso 20 anni | Offerta Sintetica B - Fisso 30 anni | Offerta Sintetica C - Variabile 30 anni |
| --- | --- | --- | --- |
| Rata mensile | 1208,77 € `SCENARIO_ASSUMPTION` | 963,92 € `SCENARIO_ASSUMPTION` | 816,00 € `SCENARIO_ASSUMPTION` |
| Rapporto rata/reddito | 53,72% `SCENARIO_ASSUMPTION` | 42,84% `SCENARIO_ASSUMPTION` | 36,27% `SCENARIO_ASSUMPTION` |
| Margine mensile | 761,23 € `SCENARIO_ASSUMPTION` | 1004,08 € `SCENARIO_ASSUMPTION` | 1151,00 € `SCENARIO_ASSUMPTION` |
| Liquidità iniziale necessaria | 114.270,00 € `SCENARIO_ASSUMPTION` | 114.550,00 € `SCENARIO_ASSUMPTION` | 125.850,00 € `SCENARIO_ASSUMPTION` |
| Liquidità residua | -14.270,00 € `SCENARIO_ASSUMPTION` | -14.550,00 € `SCENARIO_ASSUMPTION` | -25.850,00 € `SCENARIO_ASSUMPTION` |
| Sotto il fondo di emergenza | sì | sì | sì |

Ipotesi dichiarate:
- Valore di perizia ipotizzato pari al 90% del prezzo (270.000 €).
- Il mutuo erogabile è limitato dal rapporto massimo prestito/valore dichiarato nell offerta; il valore di riferimento diventa la perizia, non il prezzo.

Avvertenze:
- Offerta Sintetica A - Fisso 20 anni: con la perizia ipotizzata il mutuo erogabile scende di 4000 €, che diventano anticipo aggiuntivo a carico dell acquirente.
- Offerta Sintetica B - Fisso 30 anni: con la perizia ipotizzata il mutuo erogabile scende di 4000 €, che diventano anticipo aggiuntivo a carico dell acquirente.
- Offerta Sintetica C - Variabile 30 anni: il costo della polizza obbligatoria non è presente nell offerta. Costo totale e liquidità necessaria sono sottostimati di un importo non noto.
- Offerta Sintetica C - Variabile 30 anni: con la perizia ipotizzata il mutuo erogabile scende di 17.500 €, che diventano anticipo aggiuntivo a carico dell acquirente.

### Aumento del tasso di 2 punti percentuali (`RATE_PLUS_2PP`)

| Voce | Offerta Sintetica A - Fisso 20 anni | Offerta Sintetica B - Fisso 30 anni | Offerta Sintetica C - Variabile 30 anni |
| --- | --- | --- | --- |
| Rata mensile | 1231,16 € `CALCULATED` | 981,77 € `CALCULATED` | 1134,40 € `SCENARIO_ASSUMPTION` |
| Rapporto rata/reddito | 54,72% `CALCULATED` | 43,63% `CALCULATED` | 50,42% `SCENARIO_ASSUMPTION` |
| Margine mensile | 738,84 € `CALCULATED` | 986,23 € `CALCULATED` | 832,60 € `SCENARIO_ASSUMPTION` |
| Liquidità iniziale necessaria | 110.270,00 € `CALCULATED` | 110.550,00 € `CALCULATED` | 108.350,00 € `CALCULATED` |
| Liquidità residua | -10.270,00 € `CALCULATED` | -10.550,00 € `CALCULATED` | -8350,00 € `CALCULATED` |
| Sotto il fondo di emergenza | sì | sì | sì |

Ipotesi dichiarate:
- Aumento immediato e permanente di 2 punti percentuali sul TAN, applicato al capitale iniziale.
- Semplificazione: nella realtà la revisione avviene alle date di indicizzazione e sul capitale residuo.
- Applicato solo alle offerte a tasso variabile.

Avvertenze:
- Offerta Sintetica C - Variabile 30 anni: il costo della polizza obbligatoria non è presente nell offerta. Costo totale e liquidità necessaria sono sottostimati di un importo non noto.

### Riduzione del reddito del 20% per sei mesi (`INCOME_MINUS_20_6M`)

| Voce | Offerta Sintetica A - Fisso 20 anni | Offerta Sintetica B - Fisso 30 anni | Offerta Sintetica C - Variabile 30 anni |
| --- | --- | --- | --- |
| Rata mensile | 1231,16 € `CALCULATED` | 981,77 € `CALCULATED` | 886,52 € `CALCULATED` |
| Rapporto rata/reddito | 68,4% `SCENARIO_ASSUMPTION` | 54,54% `SCENARIO_ASSUMPTION` | 49,25% `SCENARIO_ASSUMPTION` |
| Margine mensile | 288,84 € `SCENARIO_ASSUMPTION` | 536,23 € `SCENARIO_ASSUMPTION` | 630,48 € `SCENARIO_ASSUMPTION` |
| Liquidità iniziale necessaria | 110.270,00 € `CALCULATED` | 110.550,00 € `CALCULATED` | 108.350,00 € `CALCULATED` |
| Liquidità residua | -12.970,00 € `SCENARIO_ASSUMPTION` | -13.250,00 € `SCENARIO_ASSUMPTION` | -11.050,00 € `SCENARIO_ASSUMPTION` |
| Sotto il fondo di emergenza | sì | sì | sì |

Ipotesi dichiarate:
- Reddito ridotto al 80% per 6 mesi, poi ritorno al valore dichiarato.
- La differenza mensile è ipotizzata coperta attingendo ai risparmi residui.

Avvertenze:
- Offerta Sintetica C - Variabile 30 anni: il costo della polizza obbligatoria non è presente nell offerta. Costo totale e liquidità necessaria sono sottostimati di un importo non noto.

## Failure branch - SafetyGuard su output non conforme

Bozza iniettata: "Questo è il mutuo migliore per te: ti consigliamo di scegliere questa banca, hai il 90% di probabilità di approvazione."

Frasi bloccate: 1
- regola `migliore` categoria `RANKING`
  - testo bloccato: "Questo è il mutuo migliore per te: ti consigliamo di scegliere questa banca, hai il 90% di probabilità di approvazione."
  - sostituito con: "[Frase bloccata da SafetyGuard: MutuoChiaro non produce classifiche fra le offerte.]"

## Fase F - controllo di comprensione

Tentativo 1: risposte errate q3, stato `IN_PROGRESS`, fase `UNDERSTANDING_CHECK`
- concetto da rivedere: perizia e liquidità iniziale
- scenario riaperto: `APPRAISAL_MINUS_10`

Tentativo 2: stato `PASSED`, tentativi usati 2 su 3, fase `AWAITING_HUMAN_CONFIRMATION`

## Fase G - gate umano

Requisiti aperti prima della conferma: Conferma umana non ricevuta.
Fase dopo la conferma: `COMPLETED`
Requisiti aperti dopo la conferma: 0

## Prima / Dopo - metriche prodotte dal run

| Indicatore | Prima | Dopo |
| --- | --- | --- |
| Criteri di confronto usati o disponibili | 1 | 13 |
| Termini finanziari spiegati | 0 | 14 |
| Dati mancanti individuati | 0 | 1 |
| Sa spiegare rata vs costo totale | no | sì |
| Sa spiegare l'effetto della perizia | no | sì |
| Riconosce il rischio del tasso variabile | no | sì |

Criteri di confronto iniziali dichiarati dalla persona sintetica: rata mensile

| Metrica del run | Valore |
| --- | --- |
| Concetti verificati | 3 su 3 |
| Errori al primo tentativo | 1 |
| Tentativi quiz usati | 2 su 3 |
| Eventi di dato mancante rilevato | 2 |
| Dati mancanti risolti | 1 (existingMonthlyDebts) |
| Domande decisive risolte | 1 |
| Scenari completati | 4 |
| Offerte in confronto parziale | 1 |
| Blocchi SafetyGuard | 1 |
| Invocazioni tool | 33 |
| Invocazioni skill | 11 |
| Invocazioni agent | 6 |

## Traccia agentica del run

Eventi totali: 138

| Tipo evento | Occorrenze |
| --- | --- |
| `agent.completed` | 6 |
| `agent.started` | 6 |
| `handoff.completed` | 6 |
| `handoff.started` | 6 |
| `human_approval.received` | 1 |
| `human_approval.required` | 1 |
| `missing_data.detected` | 1 |
| `offer.incomplete` | 1 |
| `question.selected` | 1 |
| `run.completed` | 1 |
| `run.started` | 1 |
| `safety_guard.blocked` | 1 |
| `scenario.completed` | 5 |
| `skill.completed` | 11 |
| `skill.started` | 11 |
| `state.changed` | 9 |
| `tool.completed` | 34 |
| `tool.started` | 34 |
| `understanding.failed` | 1 |
| `understanding.passed` | 1 |

| Componente | Invocazioni |
| --- | --- |
| `MortgageCalculator` (tool) | 15 |
| `AffordabilityScenarioEngine` (tool) | 5 |
| `OfferSchemaValidator` (tool) | 1 |
| `MetricsEngine` (tool) | 9 |
| `SafetyGuard` (tool) | 4 |
| `build-financial-profile` (skill) | 2 |
| `select-next-decisive-question` (skill) | 2 |
| `normalize-mortgage-offers` (skill) | 1 |
| `explain-mortgage-tradeoffs` (skill) | 4 |
| `assess-user-understanding` (skill) | 2 |
| `profile-property-agent` (agent) | 2 |
| `offer-clarity-agent` (agent) | 4 |

Primi 12 eventi con riferimenti agli artifact:

| # | Componente | Evento | inputRef | outputRef | Fase |
| --- | --- | --- | --- | --- | --- |
| 1 | MortgageJourneyOrchestrator | `run.started` | `-` | `-` | START |
| 2 | MortgageJourneyOrchestrator -> profile-property-agent | `handoff.started` | `-` | `-` | START |
| 3 | profile-property-agent | `agent.started` | `art:in:0001:3b33b823` | `-` | - |
| 4 | build-financial-profile | `skill.started` | `art:in:0002:136a5bde` | `-` | - |
| 5 | build-financial-profile | `skill.completed` | `art:in:0002:136a5bde` | `art:out:0003:ccb7bacd` | - |
| 6 | select-next-decisive-question | `skill.started` | `art:in:0004:23e85bb0` | `-` | - |
| 7 | select-next-decisive-question | `skill.completed` | `art:in:0004:23e85bb0` | `art:out:0005:93a466dc` | - |
| 8 | profile-property-agent | `missing_data.detected` | `-` | `-` | - |
| 9 | profile-property-agent | `question.selected` | `-` | `-` | - |
| 10 | profile-property-agent | `agent.completed` | `art:in:0001:3b33b823` | `art:out:0006:79f00a7d` | - |
| 11 | profile-property-agent -> MortgageJourneyOrchestrator | `handoff.completed` | `-` | `-` | START |
| 12 | MortgageJourneyOrchestrator | `state.changed` | `-` | `-` | PROFILE_INCOMPLETE |

## Failure branch - componente non disponibile (run separato)

Fase finale: `ESCALATED`
Motivo registrato: Componente non disponibile durante il calcolo scenari: Componente non disponibile: MortgageCalculator

| # | Componente | Evento | Messaggio |
| --- | --- | --- | --- |
| 54 | MortgageCalculator | `tool.failed` | Componente non disponibile: MortgageCalculator |
| 55 | AffordabilityScenarioEngine | `tool.failed` | ComponentUnavailableError: Componente non disponibile: MortgageCalculator |
| 57 | MortgageJourneyOrchestrator | `run.escalated` | Componente non disponibile durante il calcolo scenari: Componente non disponibile: MortgageCalculator |

## Failure branch - approvazione richiesta nella fase sbagliata

Errore restituito: Transizione non consentita START -> COMPLETED: L approvazione umana è consentita solo dalla fase AWAITING_HUMAN_CONFIRMATION.
Fase dopo il tentativo: `START` (invariata)
Conferma registrata: false

| # | Evento | Messaggio |
| --- | --- | --- |
| 2 | `state.transition_rejected` | Transizione rifiutata START -> COMPLETED: Approvazione richiesta nella fase START: consentita solo da AWAITING_HUMAN_CONFIRMATION. |

---

Tutti i dati riportati sono sintetici e generati da questo script.
