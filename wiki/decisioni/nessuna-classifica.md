---
titolo: Nessuna classifica, nessun punteggio
tipo: decisione
stato: verificato
aggiornato: 2026-09-14
fonti:
  - AGENTS.md
  - app/src/tools/safetyGuard.ts
  - app/scripts/audit-structure.mjs
---

# Nessuna classifica, nessun punteggio

**Decisione.** Il sistema non ordina le offerte, non assegna punteggi di convenienza,
non dichiara un'offerta adatta o inadatta, non stima probabilità di approvazione. Ottimizza
la comprensione, non la scelta.

**Alternativa scartata.** Un punteggio sintetico per offerta. Sarebbe più immediato da
mostrare e più facile da demo-are, ma sostituirebbe il giudizio dell'utente proprio nel
punto in cui il prototipo dichiara di volerlo sostenere — e richiederebbe pesi arbitrari
presentati come oggettivi.

**Conseguenza accettata.** L'utente esce dal percorso con più elementi e senza una
risposta. È l'esito voluto.

**Come si verifica.** Su tre livelli: nessun campo di ranking negli schemi;
[`SafetyGuard`](../componenti/safety-guard.md) blocca il vocabolario della
raccomandazione; l'audit strutturale ispeziona l'output mostrato di un run completo e
cerca i termini vietati. Il limite del terzo livello, lessicale, è la domanda aperta D2.
