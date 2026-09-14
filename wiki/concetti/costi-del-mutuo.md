---
titolo: Rata e costo totale
tipo: concetto
stato: verificato
aggiornato: 2026-09-14
fonti:
  - agents/knowledge/mortgage-costs.md
  - app/src/tools/mortgageCalculator.ts
  - app/src/data/quizBank.ts
---

# Rata e costo totale

Estratto operativo, usato nel percorso didattico e verificato da `schemas.test`:
[`agents/knowledge/mortgage-costs.md`](../../agents/knowledge/mortgage-costs.md).
Questa pagina non lo riscrive: aggiunge il contesto e le connessioni.

## Perché è il primo concetto del percorso

È la confusione che il prototipo attacca per prima: la rata è visibile ogni mese, il
costo totale no. Chi confronta offerte guardando la rata sta confrontando la comodità di
cassa, non il prezzo del debito. Il percorso mostra entrambi affiancati invece di
spiegare quale contare — coerente con
[../decisioni/nessuna-classifica.md](../decisioni/nessuna-classifica.md).

## Dove nasce il numero

Solo in [`MortgageCalculator`](../componenti/mortgage-calculator.md). Nessun testo
ricalcola una rata: le spiegazioni descrivono valori già prodotti dal tool, secondo
[../decisioni/calcoli-solo-nei-tool.md](../decisioni/calcoli-solo-nei-tool.md).

## Cosa lo rende fragile

Il costo totale è completo solo se tutte le voci sono note. Un'offerta con una polizza
obbligatoria dal costo non dichiarato produce un totale parziale, e il totale parziale
non va confrontato come se fosse pieno: vedi [dato-mancante.md](dato-mancante.md) e
[taeg.md](taeg.md).

## Collegamenti

- Effetto della durata sugli interessi → [tipi-di-tasso.md](tipi-di-tasso.md)
- Cosa resta in tasca dopo l'acquisto → [perizia-e-liquidita.md](perizia-e-liquidita.md)
- Chi produce la spiegazione → [../componenti/offer-clarity-agent.md](../componenti/offer-clarity-agent.md)
