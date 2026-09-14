---
titolo: OfferSchemaValidator
tipo: componente
stato: verificato
aggiornato: 2026-09-14
fonti:
  - app/src/tools/offerSchemaValidator.ts
  - app/src/skills/normalizeMortgageOffers.ts
  - app/tests/offerValidator.test.ts
---

# OfferSchemaValidator

Tool deterministico. Classifica ogni offerta come valida, parziale o non usabile, e
dichiara campi mancanti, incongruenze e provenienza.

| Voce | Riferimento |
| --- | --- |
| Codice | `app/src/tools/offerSchemaValidator.ts` |
| Skill collegata | `normalize-mortgage-offers` (`app/src/skills/normalizeMortgageOffers.ts`) |
| Verifica | `app/tests/offerValidator.test.ts`, `app/scripts/audit-structure.mjs` |

## Non fallisce mai

È una scelta, non una mancanza: un'offerta malformata non deve far cadere il confronto,
deve entrarci dichiarata come parziale. L'alternativa — scartare l'offerta incompleta —
avrebbe reso il confronto più pulito e meno onesto.

## Righe uniformi

La normalizzazione produce lo stesso insieme di righe per ogni offerta, ognuna con la
propria provenienza. L'audit strutturale controlla che nessuna riga mostrata ne sia
priva: [../concetti/provenienza.md](../concetti/provenienza.md).

## Collegamenti

- Cosa succede al campo assente → [../concetti/dato-mancante.md](../concetti/dato-mancante.md)
- Dato dichiarato e non ricalcolato → [../concetti/taeg.md](../concetti/taeg.md)
