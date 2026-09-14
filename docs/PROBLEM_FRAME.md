# Problem Frame

Sintesi in una pagina. Versione estesa: [USER_DIFFICULTY_STATEMENT.md](USER_DIFFICULTY_STATEMENT.md).

**Persona**
Andrea, 32 anni, dipendente a tempo indeterminato, prima casa. Alfabetizzazione
finanziaria bassa o media. Profilo **sintetico**, definito in
[`app/src/data/syntheticPersona.ts`](../app/src/data/syntheticPersona.ts).

**Blocked task**
Confrontare tre offerte di mutuo ricevute da banche diverse e capire quale impatto
avrebbero sul proprio bilancio mensile e sulla liquidità disponibile, prima di avviare una
richiesta formale.

**Barrier**
Le offerte hanno strutture disomogenee: durate diverse, tipologie di tasso diverse, costi
distribuiti in voci diverse, e in un caso un costo obbligatorio non indicato. L'unico dato
immediatamente confrontabile è la rata mensile, che diventa il criterio predefinito anche
quando non è quello decisivo. Resta invisibile che la liquidità residua dopo l'acquisto è
negativa e sotto la soglia di fondo di emergenza che la persona stessa ha impostato.

**Agent intervention**
1. Il **Profile & Property Agent** legge il profilo, rileva che le rate mensili già attive
   non sono dichiarate, ordina i dati mancanti per impatto sul confronto e propone **una**
   domanda decisiva invece di un questionario.
2. I **tool deterministici** normalizzano le tre offerte su dodici righe identiche,
   calcolano rata, interessi, costo totale simulato, liquidità necessaria e residua,
   rapporto rata/reddito e margine mensile, e valutano quattro scenari.
3. L'**Offer Clarity Agent** spiega i trade-off in linguaggio semplice, dichiara i dati
   mancanti e formula la domanda da porre alla banca. `SafetyGuard` impedisce che un testo
   diventi una raccomandazione.
4. Il **controllo di comprensione** verifica tre concetti con feedback mirato e riapertura
   dello scenario pertinente.
5. Il **gate umano** impedisce la chiusura della sessione senza un atto esplicito.

**Before evidence**
Alla domanda «Quale elemento useresti per confrontarle?» la persona sintetica risponde
«Guarderei soltanto la rata più bassa». Criteri di confronto usati: **1**. Termini
finanziari spiegati: **0**. Dati mancanti individuati: **0**.

**After evidence**
Criteri di confronto disponibili: **13**. Termini spiegati: **14**. Dati mancanti
individuati: **1**, con la domanda da porre alla banca. Tre concetti su tre verificati al
secondo tentativo, con **1** errore al primo. Valori prodotti da `MetricsEngine` nel run
canonico: [BEFORE_AFTER_EVIDENCE.md](BEFORE_AFTER_EVIDENCE.md).

**Primary metric**
Numero di concetti verificati dal controllo di comprensione (rata vs costo totale,
sensibilità al tasso, effetto della perizia sulla liquidità iniziale), accompagnato dal
numero di criteri di confronto disponibili e di dati mancanti individuati. Nessuna
percentuale dichiarata a priori.

**Non-goals**
Nessuna raccomandazione, classifica o punteggio di convenienza. Nessuna stima di
approvazione o finanziabilità, nessun credit scoring. Nessuna consulenza finanziaria,
legale, urbanistica o fiscale. Nessun completamento dei dati assenti. Nessuna integrazione
con banche reali, scraping o API esterne. Nessun parsing di documenti. Nessuna richiesta
all'utente di indicare un'offerta vincente.

**Agentic justification**
Il percorso non è determinabile a priori: quale domanda porre dipende da quali dati
mancano e da quanto ciascuno sposta il confronto, quali confronti sono possibili dipende da
quali campi l'offerta riporta davvero, e quale spiegazione serve dipende da quale concetto
l'utente ha sbagliato. Servono quindi decisioni sullo stato corrente, handoff verso
specialisti con autorità distinte, loop limitati e un punto di controllo umano — non una
sequenza fissa. Allo stesso tempo, i calcoli, la validazione e le transizioni **non** sono
affidati a un modello: vivono in tool deterministici invocati attraverso un kernel unico,
perché su denaro un numero plausibile ma sbagliato è peggio di un numero assente.
