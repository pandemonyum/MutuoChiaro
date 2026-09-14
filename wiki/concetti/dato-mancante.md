---
titolo: Il dato mancante resta mancante
tipo: concetto
stato: verificato
aggiornato: 2026-09-14
fonti:
  - app/src/tools/offerSchemaValidator.ts
  - app/src/skills/buildFinancialProfile.ts
  - app/scripts/audit-structure.mjs
---

# Il dato mancante resta mancante

Concetto di metodo, non di dominio: attraversa tool, skill, agenti e interfaccia.

## La regola

`null` è un dato assente. Non è zero, non è una media, non è «trascurabile». Un valore
assente viene dichiarato all'utente insieme alla domanda da porre alla banca, e
l'offerta incompleta **resta nel confronto** invece di sparire.

La regola vincolante è in [../decisioni/dato-mancante-resta-null.md](../decisioni/dato-mancante-resta-null.md);
questa pagina spiega perché conta.

## Perché la scorciatoia è dannosa

Sostituire un costo assente con zero non produce un confronto incompleto: produce un
confronto *sbagliato con aria di completezza*. L'offerta priva del dato appare la più
conveniente proprio perché le manca una voce di costo. È l'inversione esatta di ciò che
il prototipo vuole insegnare.

## Come si vede che la regola tiene

L'audit strutturale esegue un percorso completo e controlla tre cose sull'offerta con
polizza obbligatoria dal costo non dichiarato: il costo resta `null`, l'offerta resta
nel confronto, la limitazione compare fra le avvertenze del run.

## Collegamenti

- Effetto sul totale → [costi-del-mutuo.md](costi-del-mutuo.md)
- Effetto sul margine → [perizia-e-liquidita.md](perizia-e-liquidita.md)
- Come la lacuna diventa una domanda → [../componenti/profile-property-agent.md](../componenti/profile-property-agent.md)
- Dichiarazione della lacuna nei testi → [../componenti/offer-clarity-agent.md](../componenti/offer-clarity-agent.md)
