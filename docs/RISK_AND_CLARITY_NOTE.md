# Risk & Clarity Note

Questa nota dichiara cosa MutuoChiaro semplifica, cosa **non** altera, quali dati mancano,
quali ipotesi usa, quali limiti restano e dove passa il confine rispetto alla consulenza
finanziaria.

---

## 1. Cosa viene semplificato

| Semplificazione | Come | Dove |
| --- | --- | --- |
| Piano di ammortamento | Solo ammortamento francese a rata costante: `R = C·i/(1−(1+i)^−n)`, con `i = TAN/12`. Non vengono modellati preammortamento, rate variabili, piani italiani o a rata crescente. | [`mortgageCalculator.ts`](../app/src/tools/mortgageCalculator.ts) |
| Arrotondamento | La rata è arrotondata ai centesimi e i totali derivano dalla rata arrotondata, così i valori mostrati sono coerenti fra loro. Nella realtà l'ultima rata differisce di pochi centesimi. | `mortgageCalculator.ts` |
| Aumento del tasso | Rialzo **immediato e permanente** di 2 punti sul TAN, applicato al capitale iniziale. Nella realtà la revisione avviene alle date di indicizzazione e sul capitale residuo, quindi l'effetto reale è diverso. L'ipotesi è dichiarata a schermo in ogni scenario. | [`affordabilityScenarioEngine.ts`](../app/src/tools/affordabilityScenarioEngine.ts) |
| Riduzione del reddito | Riduzione del 20% per 6 mesi, con la differenza ipotizzata coperta dai risparmi residui. Non modella sussidi, TFR, ammortizzatori sociali o rinegoziazioni. | `affordabilityScenarioEngine.ts` |
| Perizia inferiore | Valore di perizia posto al 90% del prezzo; il mutuo erogabile viene limitato dal rapporto prestito/valore massimo dichiarato nell'offerta e la differenza diventa anticipo aggiuntivo. Nella realtà la banca può reagire in altri modi (rifiuto, garanzie aggiuntive, rinegoziazione). | `affordabilityScenarioEngine.ts` |
| Costi accessori dell'acquisto | Trattati come un importo unico inserito dall'utente. Non c'è alcun calcolo di imposte, agevolazioni prima casa, onorari notarili o provvigioni. | [`buildFinancialProfile.ts`](../app/src/skills/buildFinancialProfile.ts) |
| Costi ricorrenti | Un unico importo mensile per offerta, sommato al costo totale simulato. | `mortgageCalculator.ts` |
| Fondo di emergenza | Soglia semplice impostata dall'utente, confrontata con la liquidità residua. Non è una raccomandazione sull'importo corretto. | `affordabilityScenarioEngine.ts` |

## 2. Cosa NON viene alterato

- **Il TAEG dichiarato dall'offerta non viene ricalcolato né corretto.** Viene mostrato
  come dato dell'offerta, con provenienza `SYNTHETIC_OFFER`. Se risulta inferiore al TAN,
  l'incongruenza viene segnalata e il valore resta quello dichiarato.
- **La rata dichiarata dall'offerta non viene sostituita.** Se differisce dalla rata
  ricalcolata oltre la tolleranza, entrambi i valori restano visibili e la discrepanza
  viene segnalata come incongruenza.
- **Nessun dato assente viene stimato, interpolato o completato con valori medi.** Un campo
  mancante resta `null` nello stato e `MISSING` in interfaccia.
- **Nessun valore inserito dall'utente viene corretto in silenzio.** I valori non ammessi
  fanno fallire la validazione con un messaggio esplicito.
- **Nessuna offerta viene rimossa dal confronto** perché incompleta: prosegue in modalità
  parziale, con i confronti bloccati elencati.
- **Il significato delle informazioni non cambia**: il linguaggio è semplificato, le
  grandezze no. «Rata» resta la rata, «costo totale simulato» è dichiarato come simulato.

## 3. Dati mancanti dichiarati

### 3.1 Dato mancante nell'offerta (failure branch principale)

`Offerta Sintetica C — Variabile 30 anni` dichiara `insuranceRequired: true` ma **non
riporta il costo della polizza obbligatoria** (`insuranceCost: null`,
provenienza `MISSING`).

Comportamento verificabile nel run:

1. `OfferSchemaValidator` rileva il campo assente.
2. L'orchestratore emette `offer.incomplete`.
3. Il costo non viene stimato: resta `null`.
4. `Costo totale simulato` e `Costi iniziali` sono marcati **parziali** con la nota
   «Parziale: costo polizza non noto».
5. L'interfaccia elenca i confronti **ancora possibili** (rata iniziale, TAN, TAEG
   dichiarato, durata, interessi totali simulati, liquidità residua, rapporto
   rata/reddito, margine mensile, sensibilità agli scenari) e quelli **non possibili**
   (costo totale simulato completo, confronto dei costi iniziali complessivi).
6. L'interfaccia mostra la domanda da porre alla banca: *«Qual è il costo della polizza
   assicurativa indicata come obbligatoria, e come viene pagata (una tantum, annuale o
   inclusa nella rata)?»*
7. L'offerta resta nel confronto.
8. Il run prosegue in modalità parziale (fase `OFFERS_INCOMPLETE` → `OFFERS_NORMALIZED`).
9. La limitazione compare in questa nota e fra le avvertenze del run.

**Conseguenza esplicita**: il costo totale e la liquidità necessaria di quell'offerta sono
**sottostimati di un importo non noto**. Il TAEG dichiarato (2,95%) include quel costo,
quindi è l'unico indicatore dell'offerta che ne tiene conto — ed è anche il motivo per cui
il confronto fra costi totali resta incompleto.

### 3.2 Dato mancante nel profilo

All'avvio, le rate e i debiti mensili già attivi **non sono dichiarati**
(`existingMonthlyDebts: null`). Il motore non sostituisce il dato con una stima: lo tratta
come zero ai soli fini del calcolo e **dichiara nella nota del margine mensile** che le
rate attive non sono incluse, quindi il valore reale sarà inferiore. L'orchestratore
seleziona questo campo come prossima domanda decisiva perché ha l'impatto dichiarato più
alto (0,85) fra i dati mancanti.

## 4. Ipotesi usate

Ogni scenario dichiara le proprie ipotesi a schermo e le espone nell'API. I valori che
dipendono da un'ipotesi sono etichettati `SCENARIO_ASSUMPTION` (badge «ipotesi»), non
`CALCULATED` (badge «calcolo») — compresi i valori **derivati**, come il margine mensile
nello scenario di perizia inferiore.

| Scenario | Ipotesi dichiarate |
| --- | --- |
| Base | Tasso e reddito costanti per tutta la durata; perizia pari al prezzo di acquisto. |
| Perizia −10% | Perizia al 90% del prezzo (270.000 €); il mutuo erogabile è limitato dal rapporto prestito/valore dell'offerta, calcolato sulla perizia e non sul prezzo. |
| Tasso +2 punti | Aumento immediato e permanente sul TAN, applicato al capitale iniziale; semplificazione rispetto all'indicizzazione reale; applicato solo alle offerte a tasso variabile. |
| Reddito −20% per 6 mesi | Reddito al 80% per sei mesi, poi ritorno al valore dichiarato; differenza coperta attingendo ai risparmi residui. |

Ipotesi trasversali:

- Le rate già attive dichiarate sono considerate costanti e non si estinguono durante il
  periodo simulato.
- Le spese accessorie e i lavori sono sostenuti interamente all'acquisto.
- Quando l'utente modifica l'importo del mutuo, lo stesso importo viene applicato a tutte
  le offerte, per mantenere il confronto sullo stesso capitale.
- Il rapporto prestito/valore massimo, se assente in un'offerta, è assunto pari all'80%.

## 5. Come è stata evitata l'ambiguità

- **Provenienza obbligatoria su ogni numero mostrato**: `USER_INPUT`, `SYNTHETIC_OFFER`,
  `CALCULATED`, `SCENARIO_ASSUMPTION`, `MISSING`, resa visibile con un badge accanto al
  valore. L'audit strutturale verifica che nessuna riga sia priva di provenienza.
- **Un valore modificato a mano cambia provenienza** da `SYNTHETIC_OFFER` a `USER_INPUT`:
  non può essere confuso con un dato dell'offerta.
- **Nessun semaforo, nessuna medaglia, nessun ranking.** I colori dell'interfaccia
  codificano la provenienza del dato, non un giudizio di merito.
- **Vocabolario neutrale imposto in esecuzione.** `SafetyGuard` intercetta
  raccomandazioni, classifiche, stime di approvazione e giudizi di idoneità prima che i
  testi raggiungano l'interfaccia, li sostituisce con una formulazione neutrale ed emette
  l'evento `safety_guard.blocked`.
- **«Simulato» compare nel nome delle grandezze calcolate** («costo totale simulato»,
  «interessi totali simulati»).
- **Il TAEG è etichettato «dichiarato»**, per non farlo passare per un calcolo del sistema.
- **Ogni schermata riporta l'indicazione «Dati sintetici»** e il banner sulla natura
  educativa dello strumento.

## 6. Limiti che restano

1. Persona, profilo e tre offerte sono **interamente inventati**. Nessuna banca reale,
   nessuno scraping, nessuna API esterna, nessun documento reale.
2. Nessuna valutazione di finanziabilità, credit scoring o stima di approvazione.
3. Nessun calcolo fiscale, notarile, urbanistico o legale.
4. Nessun parsing di documenti (PDF, OCR): le offerte sono strutturate a monte.
5. Nessuna persistenza: lo stato vive in memoria nel processo del server; riavviare il
   server azzera i run.
6. Nessuna autenticazione e nessun dato personale reale trattato.
7. Gli scenari sono quattro e fissi. Non c'è simulazione Monte Carlo né distribuzione di
   probabilità sui tassi futuri.
8. Il confronto assume lo stesso capitale su tutte le offerte; non modella importi
   erogabili diversi per banca, al di fuori dello scenario di perizia.
9. I testi neutrali sono generati da regole deterministiche e da un vocabolario chiuso:
   coprono i casi del vertical slice, non il linguaggio bancario in generale.
10. `SafetyGuard` lavora su regole lessicali in italiano: intercetta le formulazioni
    previste, non è una garanzia semantica universale.

## 7. Confine rispetto alla consulenza finanziaria

MutuoChiaro è uno **strumento educativo**. Non è un consulente, non è un intermediario e
non sostituisce la banca.

**Non fa, per costruzione:**

| Cosa non fa | Come è impedito |
| --- | --- |
| Dichiarare un'offerta migliore, ottimale o consigliata | Regole `migliore`, `ottimale`, `classifica`, `consiglio`, `conviene` in `SafetyGuard`; nessun campo di ranking o punteggio nello schema normalizzato; audit strutturale sull'output |
| Stimare probabilità di approvazione o finanziabilità | Regole `approvazione`, `finanziabile` in `SafetyGuard`; nessun modello di scoring nel runtime |
| Dichiarare un'offerta adatta o inadatta alla persona | Regole `idoneita`, `idoneita2` in `SafetyGuard` |
| Chiedere all'utente di indicare il mutuo vincente | Il gate finale è una presa d'atto, non una scelta: l'utente conferma di aver compreso la natura della simulazione |
| Completare i dati mancanti | I campi assenti restano `null`; i totali sono marcati parziali |
| Concludere la sessione senza l'utente | `COMPLETED` richiede offerte validate, almeno uno scenario, il controllo di comprensione eseguito e la conferma umana ricevuta; una richiesta di approvazione in fase errata viene rifiutata con evento `state.transition_rejected` |

**Dichiarazione mostrata all'utente al gate finale:**

> «Dichiaro di aver compreso che questa simulazione è educativa, utilizza dati sintetici e
> non rappresenta una proposta, una delibera bancaria o una raccomandazione finanziaria.»

**Un'informazione di contesto che resta ammessa**, perché è un fatto e non una valutazione
della situazione dell'utente: nel glossario si segnala che molte banche usano riferimenti
interni intorno a un terzo per il rapporto rata/reddito, precisando esplicitamente che si
tratta di un dato di contesto e non di una valutazione del profilo.

La decisione finale resta sempre all'utente.
