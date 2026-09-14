# Demo script — 3 minuti

## Preparazione (prima di iniziare)

```bash
cd app && npm install && npm start
```

Apri `http://localhost:5173`. Al caricamento la pagina crea già un run: la fase è `START`
e la sezione **Prima** mostra le tre offerte grezze.

Tieni aperta la sezione **Traccia agentica** in fondo alla pagina: la userai tre volte.

> Ogni affermazione dello script è verificabile in
> [EVIDENCE_MATRIX.md](EVIDENCE_MATRIX.md) e i numeri provengono da
> [BEFORE_AFTER_EVIDENCE.md](BEFORE_AFTER_EVIDENCE.md), rigenerabile con
> `node scripts/demo-run.mjs`.

---

## 0:00 – 0:25 · Andrea e tre offerte disomogenee

**Mostra**: sezione «Prima: le tre offerte come arrivano».

> «Andrea, 32 anni, dipendente, 2.250 € netti al mese, 100.000 € di risparmi, vuole
> comprare casa a 300.000 € con un mutuo da 220.000. Ha ricevuto tre offerte. Guardatele:
> durate diverse, tassi diversi, costi in voci diverse, e in una il costo della polizza
> obbligatoria non c'è. L'unico numero confrontabile a occhio è la rata.»

**Mostra**: la risposta della persona sintetica in fondo alla sezione.

> «Alla domanda "quale elemento useresti per confrontarle", Andrea risponde: *guarderei
> soltanto la rata più bassa*. È esattamente il problema.»

**Indica** il badge «Dati sintetici» in alto.

> «Tutto quello che vedete è inventato a scopo didattico.»

---

## 0:25 – 0:55 · Avvio del run e profilo

**Azione**: clic su **Avvia il percorso guidato** → clic su **Salva e ricalcola**.

> «Il profilo raccoglie entrate, risparmi, il fondo di emergenza che Andrea vuole
> conservare, il prezzo, le spese accessorie, i lavori e l'importo del mutuo. I campi sono
> validati: importi negativi, reddito zero e durate impossibili vengono rifiutati, non
> corretti in silenzio.»

**Mostra**: il riassunto sotto il form, prodotto dal Profile & Property Agent, con la
confidenza dichiarata.

---

## 0:55 – 1:15 · La prossima domanda decisiva

**Mostra**: la sezione **Prossima domanda decisiva**, evidenziata in blu.

> «L'orchestratore non ha fatto partire un questionario. Ha chiesto all'agente di leggere
> lo stato, ha ottenuto la lista dei dati mancanti ordinati per impatto sul confronto, e ha
> selezionato **uno** solo: le rate già attive, impatto 0,85.»

**Leggi** la domanda a schermo:

> «"Hai prestiti, finanziamenti o altre rate mensili già attive? Questo dato incide sul
> margine che rimane dopo il pagamento del mutuo."»

**Apri** il dettaglio «Come è stata scelta questa domanda».

> «Questa è la graduatoria vera, con gli impatti dichiarati.»

**Vai alla Traccia agentica** e mostra la sequenza:
`handoff.started` → `agent.started` (`profile-property-agent`) → `skill.started`
(`build-financial-profile`) → `skill.started` (`select-next-decisive-question`) →
`missing_data.detected` → `question.selected` → `agent.completed` → `handoff.completed`.

**Clicca** su un `inputRef`.

> «Questo è l'input reale che l'agente ha ricevuto, non un log scritto a mano.»

**Azione**: inserisci `280` e clic su **Rispondi e ricalcola**.

---

## 1:15 – 1:40 · MutuoSpecchio

**Mostra**: la tabella **MutuoSpecchio**.

> «Le stesse dodici righe per tutte e tre le offerte. Ogni valore ha un badge che dice
> da dove viene: dato inserito, dato offerta, calcolo, ipotesi, mancante.»

**Indica** la riga «Rata iniziale» e poi «Interessi totali simulati».

> «Ecco il punto. L'offerta C ha la rata più bassa: 886,52 €. Ma gli interessi totali
> simulati dell'offerta A, quella con la rata più alta, sono 75.478 € contro 99.147 €.
> La rata più bassa non è il costo più basso.»

**Indica** la riga «Liquidità residua»: **negativa** in tutte tre.

> «E questo non era visibile in nessuna delle tre offerte, perché dipende dai dati di
> Andrea. Fra anticipo, spese accessorie, lavori e costi iniziali servono circa 110.000 €
> contro 100.000 € di risparmi. La liquidità residua è negativa e sotto la soglia di
> fondo di emergenza che Andrea stesso ha impostato.»

---

## 1:40 – 2:00 · Scenario perizia inferiore del 10%

**Azione**: clic su **Calcola tutti gli scenari**, poi sulla scheda
**Perizia inferiore del 10% rispetto al prezzo**.

**Indica** la riga «Liquidità iniziale necessaria».

> «Con una perizia al 90% del prezzo, il mutuo erogabile si calcola sulla perizia, non sul
> prezzo. Per A e B servono 4.000 € in più. Per C, che dichiara un limite prestito/valore
> più basso, 17.500 € in più. Il prezzo da pagare non cambia: la differenza diventa
> anticipo.»

**Indica** i badge «ipotesi» e il riquadro delle ipotesi dichiarate.

> «Tutti questi valori sono etichettati come ipotesi, non come calcolo, e le assunzioni
> sono scritte sopra la tabella. Anche i valori derivati, come il margine mensile.»

---

## 2:00 – 2:20 · Failure branch: il dato che manca

**Torna** su MutuoSpecchio, colonna dell'offerta C.

> «L'offerta C dichiara una polizza obbligatoria ma non ne indica il costo. Guardate cosa
> fa il sistema: **niente**. Non stima, non usa una media, non riempie il buco.»

**Indica**: l'etichetta «confronto parziale» sull'intestazione della colonna, la nota
«Parziale: costo polizza non noto» sotto il costo totale, e il badge sui costi iniziali.

**Scorri** fino a «Dati mancanti e domande da porre alla banca».

> «Dice quali confronti restano possibili — rata, TAN, TAEG, durata, liquidità, rapporto
> rata/reddito — e quali non lo sono: il costo totale completo. E formula la domanda da
> portare in banca: *"Qual è il costo della polizza assicurativa indicata come
> obbligatoria, e come viene pagata?"*»

**Vai alla Traccia** e filtra su `offer.incomplete`.

> «L'offerta non viene scartata: il run prosegue in modalità parziale, e la limitazione è
> scritta nella Risk & Clarity Note.»

---

## 2:20 – 2:40 · Scenario tasso e controllo di comprensione

**Azione**: scheda **Aumento del tasso di 2 punti percentuali**.

> «Solo la rata dell'offerta variabile cambia: da 886,52 € a 1.134,40 €, e supera la rata
> dell'offerta fissa a 30 anni. Le due offerte a tasso fisso restano identiche, ed è
> etichettato come ipotesi con la semplificazione dichiarata.»

**Azione**: clic su **Vai al controllo di comprensione**. Rispondi alla terza domanda in
modo **sbagliato** (opzione «Perché il prezzo dell'immobile aumenta automaticamente»).

> «Non dice solo "sbagliato". Spiega il concetto, e riapre lo scenario collegato.»

**Mostra** il feedback mirato e il pulsante «Riapri lo scenario collegato».

> «Tre tentativi al massimo. Al terzo la comprensione viene registrata come non
> verificata e i risultati restano comunque consultabili.»

**Azione**: rispondi correttamente al secondo tentativo.

---

## 2:40 – 2:52 · Gate umano

**Mostra**: la sezione **Conferma finale**.

> «La sessione non può chiudersi da sola. Servono quattro cose: offerte validate, almeno
> uno scenario, il controllo di comprensione eseguito e la conferma esplicita. Le prime tre
> ci sono; manca la quarta, ed è scritto qui.»

**Indica** il testo della dichiarazione.

> «E notate cosa **non** chiede: non chiede ad Andrea di scegliere il mutuo vincente.
> Chiede di prendere atto che questa è una simulazione educativa con dati sintetici, che
> non è una proposta né una delibera bancaria.»

**Azione**: spunta la casella e clic su **Confermo e chiudo la sessione**. La fase passa a
`COMPLETED`.

> «Se questa stessa chiamata arriva nella fase sbagliata, viene rifiutata con un errore
> 409 e un evento `state.transition_rejected`: la fase non cambia.»

---

## 2:52 – 3:00 · Before / After e il limite principale

**Mostra**: la sezione **Prima / Dopo**.

> «Questi numeri li produce il MetricsEngine da questo run, non sono stime: un criterio di
> confronto prima, tredici dopo. Zero termini spiegati, quattordici dopo. Un dato mancante
> individuato. Un errore al primo tentativo, tre concetti su tre verificati al secondo. Un
> blocco del SafetyGuard.»

**Chiudi** con il limite principale:

> «Il prototipo utilizza offerte sintetiche e non rappresenta una consulenza o una delibera
> bancaria. MutuoChiaro non dice quale mutuo scegliere: mostra l'impatto. La decisione resta
> di Andrea.»

---

## Se resta tempo: due failure branch aggiuntivi

**Traccia agentica → «Inietta output non conforme»**

> «Iniettiamo una bozza che dice "questo è il mutuo migliore per te, ti consigliamo di
> scegliere questa banca, hai il 90% di probabilità di approvazione". Il SafetyGuard la
> intercetta prima della UI, la sostituisce con una formulazione neutrale ed emette
> `safety_guard.blocked`. La frase originale resta solo come pista di audit.»

**Traccia agentica → «Simula tool non disponibile»**

> «Disattiviamo il MortgageCalculator. Il run non produce numeri sbagliati: fallisce in
> modo osservabile — `tool.failed` sul chiamato e sul chiamante, con l'errore salvato come
> artifact — e passa in `ESCALATED`.»

---

## Checklist pre-demo

```bash
cd app
npm run verify     # typecheck + 113 test + audit strutturale
```

- [ ] `npm run verify` verde
- [ ] server avviato su `http://localhost:5173`
- [ ] pagina ricaricata (run pulito, traccia da `#1`)
- [ ] sezione Traccia agentica visibile senza scorrere troppo
- [ ] risposta `280` pronta per la domanda decisiva
- [ ] risposta sbagliata da usare nel quiz: terza domanda, opzione «Perché il prezzo
      dell'immobile aumenta automaticamente»
