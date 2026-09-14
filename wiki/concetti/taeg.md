---
titolo: TAN e TAEG
tipo: concetto
stato: verificato
aggiornato: 2026-09-14
fonti:
  - agents/knowledge/taeg.md
  - app/src/tools/offerSchemaValidator.ts
  - app/src/data/syntheticOffers.ts
---

# TAN e TAEG

Estratto operativo per il percorso didattico:
[`agents/knowledge/taeg.md`](../../agents/knowledge/taeg.md).

## Il punto delicato

Il TAEG sembra il numero che «contiene tutto» e per questo viene usato come scorciatoia
per il confronto. Nel prototipo il TAEG è **dichiarato dall'offerta**, non ricalcolato:
è un dato di input come gli altri, con la stessa provenienza dichiarata di ogni altra
riga — [provenienza.md](provenienza.md). Un costo assicurativo assente resta assente
anche quando l'offerta espone un TAEG.

## Il buco di verifica

È l'unico concetto del percorso che nessuna domanda del quiz misura. Una spiegazione sul
TAEG può quindi essere letta senza che il sistema sappia se è stata capita: non va
registrata come appresa. È la domanda aperta D1 in
[../domande-aperte.md](../domande-aperte.md).

## Collegamenti

- Chi classifica l'offerta e i suoi campi → [../componenti/offer-schema-validator.md](../componenti/offer-schema-validator.md)
- Perché il costo mancante non viene stimato → [dato-mancante.md](dato-mancante.md)
- Rapporto con il costo complessivo → [costi-del-mutuo.md](costi-del-mutuo.md)
