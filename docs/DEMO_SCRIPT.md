# Demo script — 3 minuti

## Preparazione

```bash
cd app && npm install && npm start
```

Apri `http://localhost:5173`. L'interfaccia ha una barra laterale con sei tappe del
percorso più due voci di trasparenza: userai la navigazione, non lo scorrimento.

Il `runId` è condiviso fra le pagine: puoi spostarti liberamente senza perdere lo stato.
Per partire da zero, **Profilo e casa → Nuovo run**.

> Ogni affermazione dello script è verificabile in [EVIDENCE_MATRIX.md](EVIDENCE_MATRIX.md);
> i numeri provengono da [BEFORE_AFTER_EVIDENCE.md](BEFORE_AFTER_EVIDENCE.md),
> rigenerabile con `node scripts/demo-run.mjs`.

---

## 0:00 – 0:25 · Andrea e tre offerte disomogenee

**Pagina: Offerte.**

> «Andrea, 32 anni, 2.250 € netti al mese, 100.000 € di risparmi, vuole comprare casa a
> 300.000 € con un mutuo da 220.000. Ha ricevuto tre offerte: Stabilità 20 a tasso fisso,
> Casa Lunga 30 a tasso fisso, Orizzonte Variabile a tasso variabile. Durate diverse, tassi
> diversi, costi in voci diverse. L'unico numero confrontabile a occhio è la rata:
> 1.231 €, 982 €, 887 €. Andrea guarda quella e si ferma lì.»

**Indica** il badge «Dati sintetici» nella barra superiore.

> «Tutto quello che vedete è inventato a scopo didattico: nessuna banca reale.»

---

## 0:25 – 0:55 · Profilo

**Pagina: Profilo e casa.** Clic su **Salva e ricalcola**.

> «Il profilo raccoglie entrate, risparmi, il fondo di emergenza che Andrea vuole
> conservare, prezzo, spese accessorie, lavori e importo del mutuo. I valori impossibili
> vengono fermati prima di arrivare al runtime: provate a mettere risparmi negativi e il
> percorso non parte nemmeno.»

**Mostra** la card **Completezza profilo** a destra: la percentuale è calcolata
dall'agente sui dati con impatto, non è decorativa.

---

## 0:55 – 1:15 · La prossima domanda decisiva

**Stessa pagina**, riquadro **Prossima domanda decisiva**.

> «L'orchestratore non ha lanciato un questionario. Ha passato lo stato all'agente, ha
> ottenuto i dati mancanti ordinati per impatto sul confronto e ne ha scelto **uno**:
> le rate già attive, impatto 0,85.»

**Leggi** la domanda:

> «"Hai prestiti, finanziamenti o altre rate mensili già attive? Questo dato incide sul
> margine che rimane dopo il pagamento del mutuo."»

**Pagina: Traccia agentica.** Mostra la sequenza reale:
`handoff.started` → `agent.started` (`profile-property-agent`) → `skill.started`
(`build-financial-profile`) → `skill.started` (`select-next-decisive-question`) →
`missing_data.detected` → `question.selected` → `agent.completed` → `handoff.completed`.

**Clicca** su un pulsante `input:` accanto a un evento.

> «Questo è l'input reale che l'agente ha ricevuto, non un log scritto a mano.»

**Torna al Profilo**, rispondi **€ 280**.

---

## 1:15 – 1:40 · MutuoSpecchio e confronto normalizzato

**Pagina: Offerte**, tabella **Confronto normalizzato**.

> «Le stesse dodici righe per tutte e tre le offerte, e ogni cella dice da dove viene il
> valore: dato inserito, dato offerta, calcolo, ipotesi, mancante.»

**Indica** «Rata iniziale» e poi «Interessi totali simulati».

> «Ecco il punto. Orizzonte Variabile ha la rata più bassa, 886,52 €. Ma gli interessi
> totali simulati di Stabilità 20, quella con la rata più alta, sono 75.478 € contro
> 99.147 €. La rata più bassa non è il costo più basso.»

**Pagina: MutuoSpecchio.** Indica «Liquidità residua»: **negativa** per tutte tre.

> «E questo non era scritto in nessuna delle tre offerte, perché dipende dai dati di
> Andrea. Fra anticipo, spese accessorie, lavori e costi iniziali servono circa 110.000 €
> contro 100.000 € di risparmi. La liquidità residua è negativa e sotto il fondo di
> emergenza che Andrea stesso ha impostato.»

---

## 1:40 – 2:00 · Scenario perizia inferiore del 10%

**Pagina: Scenari**, scheda **Perizia −10%**.

> «Con una perizia al 90% del prezzo, il mutuo erogabile si calcola sulla perizia, non sul
> prezzo. Per Stabilità 20 e Casa Lunga 30 servono 4.000 € in più. Per Orizzonte Variabile,
> che dichiara un limite prestito/valore più basso, 17.500 € in più. Il prezzo non cambia:
> la differenza diventa anticipo.»

**Indica** i badge «Ipotesi» e il riquadro **Ipotesi dichiarate**.

> «Tutti questi valori sono etichettati come ipotesi, non come calcolo — anche quelli
> derivati, come il margine mensile — e le assunzioni sono scritte sotto.»

---

## 2:00 – 2:20 · Failure branch: il dato che manca

**Pagina: Offerte**, scheda **Orizzonte Variabile**.

> «Questa offerta dichiara una polizza obbligatoria ma non ne indica il costo. Guardate
> cosa fa il sistema: **niente**. Non stima, non usa una media, non riempie il buco.»

**Indica**: l'avviso in cima, l'etichetta «Parziale» sulla colonna, «Costo simulato:
Parziale» nella scheda, e la riga **Dato da chiedere alla banca** in fondo alla tabella.

> «Dice quali confronti restano possibili e quali no, e formula la domanda da portare in
> banca: *"Qual è il costo della polizza assicurativa indicata come obbligatoria, e come
> viene pagata?"* L'offerta non viene scartata: il run prosegue in modalità parziale.»

---

## 2:20 – 2:40 · Scenario tasso e controllo di comprensione

**Pagina: Scenari**, scheda **Tasso +2 punti**.

> «Solo la rata dell'offerta variabile cambia: da 886,52 € a 1.134,40 €, e supera quella
> del fisso a 30 anni. Le due offerte a tasso fisso restano identiche.»

**Pagina: Comprensione.** Rispondi alla terza domanda in modo **sbagliato**
(«Perché la banca aumenta automaticamente il prezzo di vendita»), poi **Verifica le
risposte**.

> «Non dice solo "sbagliato". Spiega il concetto e riapre lo scenario collegato.»

**Mostra** il feedback e il pulsante **Riapri lo scenario collegato**.

> «Tre tentativi al massimo. Al terzo la comprensione viene registrata come non verificata
> e i risultati restano comunque consultabili.»

Rispondi correttamente al secondo tentativo.

---

## 2:40 – 2:52 · Gate umano

**Stessa pagina**, riquadro **Conferma umana finale**.

> «La sessione non può chiudersi da sola. Servono quattro cose: offerte validate, almeno
> uno scenario, il controllo di comprensione eseguito e la conferma esplicita. Le prime
> tre ci sono; il riquadro dice che manca la quarta.»

> «E notate cosa **non** chiede: non chiede ad Andrea di scegliere il mutuo vincente.
> Chiede di prendere atto che questa è una simulazione educativa con dati sintetici.»

Spunta la casella — solo ora il pulsante si attiva — e conferma. La fase passa a
`COMPLETED` nella barra laterale.

> «Se la stessa chiamata arriva nella fase sbagliata, viene rifiutata con un errore 409 e
> un evento `state.transition_rejected`: la fase non cambia.»

---

## 2:52 – 3:00 · Before / After e il limite principale

**Pagina: MutuoSpecchio**, sezione **Prima e dopo**.

> «Questi numeri li produce il MetricsEngine da questo run: un criterio di confronto prima,
> tredici dopo. Zero termini spiegati, quattordici dopo. Un dato mancante individuato.
> Tre concetti su tre verificati.»

**Chiudi:**

> «Il prototipo utilizza offerte sintetiche e non rappresenta una consulenza o una delibera
> bancaria. MutuoChiaro non dice quale mutuo scegliere: mostra l'impatto. La decisione
> resta di Andrea.»

---

## Se resta tempo: due failure branch aggiuntivi

**Pagina: Traccia agentica.**

**«Inietta output non conforme»**

> «Iniettiamo una bozza che dice "questo è il mutuo migliore per te, ti consigliamo di
> scegliere questa banca, hai il 90% di probabilità di approvazione". Il SafetyGuard la
> intercetta prima dell'interfaccia, la sostituisce con una formulazione neutrale ed emette
> `safety_guard.blocked`, che compare qui nella traccia.»

**«Simula tool non disponibile»**

> «Disattiviamo il MortgageCalculator. Il run non produce numeri sbagliati: fallisce in
> modo osservabile — `tool.failed` sul chiamato e sul chiamante, con l'errore salvato come
> artifact — passa in `ESCALATED`, e la pagina mostra un banner che dichiara il run
> interrotto con il motivo.»

**«Ripercorri la traccia»** anima gli eventi evidenziando il componente corrispondente
nello schema dell'architettura.

---

## Checklist pre-demo

```bash
cd app
npm run verify
```

- [ ] `npm run verify` verde (typecheck + 116 test + 31 controlli)
- [ ] server avviato su `http://localhost:5173`
- [ ] **Profilo e casa → Nuovo run** per partire con la traccia azzerata
- [ ] risposta `280` pronta per la domanda decisiva
- [ ] risposta sbagliata da usare: terza domanda, «Perché la banca aumenta automaticamente
      il prezzo di vendita»
- [ ] finestra a 1440px o più: sotto i 940px la barra laterale passa a menu mobile
