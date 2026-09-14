---
titolo: "Il dato assente resta `null`"
tipo: decisione
stato: verificato
aggiornato: 2026-09-14
fonti:
  - AGENTS.md
  - app/src/tools/offerSchemaValidator.ts
  - app/scripts/audit-structure.mjs
---

# Il dato assente resta `null`

**Decisione.** Un valore non dichiarato non viene mai sostituito, stimato o azzerato.
Viene mostrato come mancante, accompagnato dalla domanda da porre alla banca, e
l'offerta incompleta resta nel confronto.

**Alternativa scartata.** Completare il campo con zero o con una media di mercato per
ottenere totali confrontabili. Produrrebbe un confronto apparentemente completo in cui
l'offerta meno documentata appare la più conveniente.

**Conseguenza accettata.** Alcuni totali restano parziali e l'interfaccia deve dirlo
ogni volta. È un costo di chiarezza, non un difetto da nascondere.

**Come si verifica.** L'audit strutturale esegue un percorso completo e controlla che il
costo della polizza obbligatoria non dichiarata resti assente, che l'offerta resti nel
confronto e che la limitazione compaia fra le avvertenze del run.

Spiegazione del concetto: [../concetti/dato-mancante.md](../concetti/dato-mancante.md).
