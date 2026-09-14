# User Difficulty Statement

## Enunciato

> **L'utente confronta le offerte quasi esclusivamente attraverso la rata mensile e non
> riesce a tradurre le condizioni bancarie nell'impatto concreto sulla propria liquidità,
> sul proprio bilancio e sul costo complessivo dell'acquisto.**

## Chi è l'utente

Persona **sintetica**, usata solo a scopo dimostrativo:

| Dato | Valore | Provenienza |
| --- | --- | --- |
| Nome | Andrea | `SYNTHETIC` |
| Età | 32 anni | `SYNTHETIC` |
| Situazione lavorativa | dipendente a tempo indeterminato | `SYNTHETIC` |
| Reddito netto mensile | 2.250 € | `USER_INPUT` |
| Altre entrate familiari | 0 € | `USER_INPUT` |
| Rate e debiti mensili | **non dichiarati all'avvio** | `MISSING` |
| Risparmi | 100.000 € | `USER_INPUT` |
| Fondo di emergenza minimo | 20.000 € | `USER_INPUT` |
| Prezzo dell'immobile | 300.000 € | `USER_INPUT` |
| Spese accessorie stimate | 18.000 € | `USER_INPUT` |
| Lavori previsti | 10.000 € | `USER_INPUT` |
| Mutuo desiderato | 220.000 € | `USER_INPUT` |
| Acquisto | prima casa | `USER_INPUT` |

Definita in [`app/src/data/syntheticPersona.ts`](../app/src/data/syntheticPersona.ts).

## In quale processo

Acquisto della prima casa, momento del **confronto fra tre offerte di mutuo** ricevute da
banche diverse, prima di avviare una richiesta formale. È il punto in cui la persona deve
decidere, ma dispone solo di tre documenti con strutture disomogenee.

## Dove si blocca oggi

Le tre offerte sintetiche hanno strutture diverse: durate diverse, tipologie di tasso
diverse, costi iniziali distribuiti in voci diverse e, in un caso, un costo obbligatorio
non indicato. Il solo dato immediatamente confrontabile è la rata.

La persona sintetica, alla domanda «Quale elemento useresti per confrontarle?», risponde:

> «Guarderei soltanto la rata più bassa.»

Questo criterio la porta a non vedere sei cose, tutte verificabili nel run canonico
registrato in [BEFORE_AFTER_EVIDENCE.md](BEFORE_AFTER_EVIDENCE.md):

1. **La rata più bassa non è il costo più basso.** L'offerta con la rata iniziale minore
   (886,52 €) ha interessi totali simulati per 99.147,20 €, contro i 75.478,40 €
   dell'offerta con la rata più alta (1.231,16 €).
2. **Il TAEG non è il TAN.** Le tre offerte dichiarano TAEG più alti del TAN di
   0,28–0,30 punti, differenza che deriva dai costi obbligatori.
3. **La liquidità residua è il vincolo vero.** Con un mutuo da 220.000 € su un immobile da
   300.000 €, fra anticipo, spese accessorie, lavori e costi iniziali servono circa
   110.000 € contro 100.000 € di risparmi: la liquidità residua è **negativa** in tutte e
   tre le offerte, e sotto la soglia di fondo di emergenza che la persona stessa ha
   impostato. La rata non rendeva visibile questo problema.
4. **Un dato mancante cambia il confronto.** Un'offerta dichiara una polizza obbligatoria
   senza indicarne il costo: il suo costo totale resta strutturalmente incompleto.
5. **Il tasso variabile è sensibile.** Con un aumento di 2 punti la rata dell'offerta
   variabile passa da 886,52 € a 1.134,40 €, superando quella dell'offerta fissa a 30 anni.
6. **Una perizia inferiore richiede più contanti.** Con una perizia al 90% del prezzo, la
   liquidità necessaria sale di 4.000 € per due offerte e di 17.500 € per la terza, che
   dichiara un limite prestito/valore più basso.

## Perché è rilevante

- La rata è l'unico numero che le offerte presentano in modo omogeneo, quindi diventa il
  criterio predefinito anche quando non è il criterio decisivo.
- Il vincolo che può far fallire l'operazione — la liquidità disponibile il giorno del
  rogito — non appare in nessuna delle tre offerte, perché dipende dai dati della persona
  e non da quelli della banca.
- Un dato obbligatorio assente non è visibile come assenza: un documento incompleto
  sembra semplicemente più conveniente.

## Cosa MutuoChiaro fa e cosa non fa

**Fa**: porta le offerte sullo stesso schema di righe, calcola l'impatto sul bilancio e
sulla liquidità della persona con tool deterministici, dichiara la provenienza di ogni
numero, individua i dati mancanti e formula la domanda da porre alla banca, mostra cosa
cambia in quattro scenari e verifica la comprensione con un test.

**Non fa**: non indica quale offerta scegliere, non produce classifiche, non assegna
punteggi di convenienza, non stima la probabilità di approvazione o la finanziabilità, non
inventa i dati assenti. Il confine è descritto in
[RISK_AND_CLARITY_NOTE.md](RISK_AND_CLARITY_NOTE.md) e imposto in esecuzione dal tool
`SafetyGuard` ([`app/src/tools/safetyGuard.ts`](../app/src/tools/safetyGuard.ts)).

## Come viene misurato il miglioramento

Non con percentuali dichiarate, ma con indicatori prodotti dal run e calcolati da
`MetricsEngine` ([`app/src/tools/metricsEngine.ts`](../app/src/tools/metricsEngine.ts)):

- numero di criteri di confronto usati prima (1) e disponibili dopo (13);
- numero di termini finanziari spiegati (0 → 14);
- numero di dati mancanti individuati (0 → 1);
- esito del controllo di comprensione su tre concetti: rata vs costo totale, sensibilità
  al tasso, effetto della perizia sulla liquidità iniziale.

I valori del run canonico sono in [BEFORE_AFTER_EVIDENCE.md](BEFORE_AFTER_EVIDENCE.md),
rigenerabile con `node scripts/demo-run.mjs` dalla cartella `app/`.
