# Presentazione MutuoChiaro

- `index.html`: deck principale, 14 slide tarate su **5 minuti esatti**. Funziona offline
  (nessun asset esterno, nessun font remoto).

Apri il file direttamente nel browser, poi F11 per la modalità a schermo intero.

## Stile

Il deck segue il sistema visivo Accenture del documento dei temi della sfida
(`hagenthon-temi-sfida-2.html`, non versionato qui): viola `#A100FF` come accento unico,
fondo `#050008`, il segno `>` accanto al nome come firma di marca, etichette a pillola
maiuscole e spaziate, una parola in gradiente viola per slide sul concetto portante.

I token stanno in `:root` e sono gli unici colori ammessi:

| Token | Valore | Uso |
| --- | --- | --- |
| `--purple` | `#A100FF` | Accento unico, bordi, marchio `>` |
| `--purple-light` | `#BE82FF` | Testo d'accento su fondo scuro, gradienti |
| `--rose` | `#FF50A0` | Avvisi e ritardo sul cronometro |
| `--ink` | `#0A0014` | Testo sulle slide chiare, fondo di quelle scure |
| `--black` | `#050008` | Fondo pagina |

Slide chiare e scure si alternano: entrambe sono a norma, il contrasto minimo misurato
è 5,3:1 (viola su bianco e bianco su viola pieno).

## Comandi

| Tasto | Effetto |
| --- | --- |
| `→` `spazio` `PagGiù` | Slide successiva (avvia il cronometro al primo colpo) |
| `←` `PagSu` | Slide precedente |
| `Home` / `End` | Prima / ultima slide |
| `N` | Apre e chiude il **copione del relatore** |
| `T` | Avvia o mette in pausa il cronometro |
| `R` | Azzera il cronometro |

Il cronometro in basso a sinistra confronta il tempo trascorso con il budget cumulato
della slide corrente e dice **quanti secondi di margine o di ritardo** hai. La barra sopra
il copione si riempie man mano che consumi il budget della singola slide e diventa arancione
quando lo superi.

Il copione (`N`) non è visibile al pubblico solo se usi due schermi: a schermo singolo
serve per **provare**, non per presentare. Fai una prova con `N` aperto, poi chiudilo.

## Narrazione e budget

Somma dei budget = 300 secondi. Il testo parlato sta in circa 275 secondi a 150 parole
al minuto: i 25 secondi di scarto sono il margine per le pause.

| # | Slide | Budget | Cosa porta |
| --- | --- | --- | --- |
| 01 | Copertina | 18s | Persona, problema e la promessa del "da 1 a 13" |
| 02 | Problema | 20s | Perché la rata diventa il criterio predefinito |
| 03 | Prima | 24s | Le tre offerte come le vede Andrea, e la baseline 1 / 0 / 0 |
| 04 | Percorso | 18s | Le cinque tappe del percorso agentico |
| 05 | Architettura | 22s | Due agenti, cinque tool, autorità separate e verificate |
| 06 | Domanda decisiva | 31s | Il nucleo agentico: una domanda scelta per impatto, con la traccia reale |
| 07 | MutuoSpecchio | 33s | Il ribaltamento: la rata più bassa non è il costo più basso |
| 08 | Scenari | 23s | Quattro scenari con ipotesi dichiarate |
| 09 | Dato mancante | 26s | Il failure branch principale: quello che il sistema **non** fa |
| 10 | Controllo | 23s | Guardrail, loop limitati, gate umano |
| 11 | Osservabilità | 15s | Eventi, artifact, test e wiki |
| 12 | Impatto | 17s | Before / after prodotto dal `MetricsEngine` |
| 13 | Evoluzione | 20s | L'assistente a cui chiedere, vincolato ai dati del run |
| 14 | Chiusura | 10s | La decisione resta all'utente |

Le due slide più lunghe sono la **06** e la **07**: sono il nucleo agentico e il
ribaltamento del confronto. Se sei in ritardo, taglia sulla 04 e sulla 11, non su queste.

## Sulla slide 13

Il brief della sfida mette **«chatbot generici»** fra le cose da evitare, e il deck
costruisce la propria tesi sul non essere un consulente finanziario AI. La slide
sull'evoluzione va quindi presentata per quello che dice: non «aggiungiamo una chatbot»,
ma un assistente che **risponde soltanto con i numeri del run**, cita la cella da cui
vengono, passa dallo stesso `SafetyGuard` e sul dato mancante dichiara di non sapere
invece di stimare. Se la si racconta come una chatbot generica, contraddice le slide 09
e 10 nel giro di un minuto.

Il copione vive nell'array `SCRIPT` in fondo a `index.html`, una voce per slide nello
stesso ordine del deck. Cambiando un budget va tenuta la somma a 300.

## Provenienza dei dati mostrati

Ogni numero del deck viene dal run canonico e non è stato scritto a mano:

| Dato nel deck | Fonte |
| --- | --- |
| Rate, TAN, interessi, liquidità residua, rapporto rata/reddito | [docs/BEFORE_AFTER_EVIDENCE.md](../docs/BEFORE_AFTER_EVIDENCE.md) |
| Domanda decisiva e impatto 0,85 | idem, fase A/B |
| Valori degli scenari | idem, fase E |
| Dato mancante e domanda per la banca | [docs/RISK_AND_CLARITY_NOTE.md](../docs/RISK_AND_CLARITY_NOTE.md) |
| Conteggi di eventi, tool, skill e agent | idem, traccia agentica del run |
| Before / after (1 → 13, 0 → 14, 3 su 3) | idem, metriche prodotte dal run |
| 116 test e 31 controlli strutturali | [README.md](../README.md), sezione di verifica |

Unica eccezione: la **slide 13** non contiene misure. È una proposta di evoluzione e non
descrive codice esistente. Va presentata al futuro — «il passo successivo sarebbe» — non
come una funzione già disponibile, altrimenti il deck perde la proprietà su cui si regge.

Per rigenerare le evidenze dopo una modifica al runtime:

```bash
cd app && npm run build && node scripts/demo-run.mjs
```

## Limiti dichiarati

Persona, profilo e tre offerte bancarie sono **sintetici**. Il deck presenta una
simulazione educativa: non è una consulenza finanziaria, non è una proposta e non è una
delibera bancaria. I numeri before/after sono l'obiettivo funzionale della demo su una
persona sintetica, non il risultato di uno studio con utenti reali.
