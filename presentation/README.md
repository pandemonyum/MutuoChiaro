# Presentazione MutuoChiaro

- `index.html`: deck principale, 13 slide. Funziona offline (nessun asset esterno, nessun
  font remoto) e si controlla con frecce, spazio, Page Up/Down, Home ed End, oppure con i
  pulsanti in basso a destra.

Apri il file direttamente nel browser, poi F11 per la modalità a schermo intero.

## Narrazione

| # | Slide | Cosa porta |
| --- | --- | --- |
| 01 | Copertina | Persona, problema e risultato del run in tre card |
| 02 | Problema | Perché la rata diventa il criterio predefinito |
| 03 | Prima | Le tre offerte come le vede Andrea, e la baseline 1 / 0 / 0 |
| 04 | Percorso | Le cinque tappe del percorso agentico |
| 05 | Architettura | Due agenti, cinque skill, cinque tool, autorità separate |
| 06 | Domanda decisiva | Il nucleo agentico: una domanda scelta per impatto, con la traccia reale |
| 07 | MutuoSpecchio | La rata più bassa non è il costo più basso |
| 08 | Scenari | Quattro scenari con ipotesi dichiarate |
| 09 | Dato mancante | Il failure branch principale: quello che il sistema **non** fa |
| 10 | Controllo | Guardrail, loop limitati, gate umano |
| 11 | Osservabilità | Eventi, artifact, test e wiki |
| 12 | Impatto | Before / after prodotto dal `MetricsEngine` |
| 13 | Chiusura | La decisione resta all'utente |

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

Per rigenerare le evidenze dopo una modifica al runtime:

```bash
cd app && npm run build && node scripts/demo-run.mjs
```

## Limiti dichiarati

Persona, profilo e tre offerte bancarie sono **sintetici**. Il deck presenta una
simulazione educativa: non è una consulenza finanziaria, non è una proposta e non è una
delibera bancaria. I numeri before/after sono l'obiettivo funzionale della demo su una
persona sintetica, non il risultato di uno studio con utenti reali.
