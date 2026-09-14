import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateOffers } from '../src/tools/offerSchemaValidator.js';
import { buildSyntheticOffers } from '../src/data/syntheticOffers.js';

describe('OfferSchemaValidator - campo mancante', () => {
  test('rileva la polizza obbligatoria senza costo e produce la domanda per la banca', () => {
    const out = validateOffers({ offers: buildSyntheticOffers() });
    const c = out.validations.find((v) => v.offerId === 'offer-c')!;
    assert.ok(c.missingFields.includes('insuranceCost'));
    assert.equal(c.valid, false);
    assert.equal(c.partial, true, 'offerta usabile per confronti parziali, non scartata');
    assert.ok(c.questionForBank !== null);
    assert.match(c.questionForBank!, /polizza/i);
    assert.equal(out.anyPartial, true);
    assert.equal(out.anyInvalid, false);
  });

  test('dichiara quali confronti restano possibili e quali no', () => {
    const out = validateOffers({ offers: buildSyntheticOffers() });
    const c = out.validations.find((v) => v.offerId === 'offer-c')!;
    assert.ok(c.blockedComparisons.includes('costo totale simulato completo'));
    assert.ok(c.availableComparisons.includes('rata iniziale'));
    assert.ok(c.availableComparisons.includes('rapporto rata/reddito'));
    assert.ok(!c.availableComparisons.includes('costo totale simulato completo'));
  });

  test('le offerte complete sono valide e senza campi mancanti', () => {
    const out = validateOffers({ offers: buildSyntheticOffers() });
    for (const id of ['offer-a', 'offer-b']) {
      const v = out.validations.find((x) => x.offerId === id)!;
      assert.equal(v.valid, true, `${id} deve risultare valida: ${JSON.stringify(v)}`);
      assert.deepEqual(v.missingFields, []);
      assert.deepEqual(v.typeErrors, []);
    }
  });
});

describe('OfferSchemaValidator - dati non validi', () => {
  test('importo negativo segnalato come errore di intervallo', () => {
    const offers = buildSyntheticOffers();
    offers[0]!.amount = -5000;
    const out = validateOffers({ offers });
    const a = out.validations.find((v) => v.offerId === 'offer-a')!;
    assert.ok(a.typeErrors.some((e) => e.field === 'amount' && e.code === 'NEGATIVE'));
    assert.equal(a.valid, false);
    assert.equal(a.partial, false, 'un errore di tipo non consente nemmeno il confronto parziale');
  });

  test('durata non valida segnalata', () => {
    const offers = buildSyntheticOffers();
    offers[1]!.years = 60;
    const out = validateOffers({ offers });
    const b = out.validations.find((v) => v.offerId === 'offer-b')!;
    assert.ok(b.typeErrors.some((e) => e.field === 'years' && e.code === 'OUT_OF_RANGE'));
  });

  test('valore non numerico segnalato senza sostituzioni', () => {
    const offers = buildSyntheticOffers();
    (offers[0] as unknown as Record<string, unknown>)['tanPct'] = 'tre virgola uno';
    const out = validateOffers({ offers });
    const a = out.validations.find((v) => v.offerId === 'offer-a')!;
    assert.ok(a.typeErrors.some((e) => e.field === 'tanPct' && e.code === 'NOT_A_NUMBER'));
  });

  test('dati essenziali assenti su tutte le offerte producono anyInvalid', () => {
    const offers = buildSyntheticOffers().map((o) => ({ ...o, tanPct: null, amount: null }));
    const out = validateOffers({ offers });
    assert.equal(out.anyInvalid, true);
    assert.ok(out.validations.every((v) => !v.valid && !v.partial));
  });

  test('TAEG dichiarato inferiore al TAN segnalato come incongruenza', () => {
    const offers = buildSyntheticOffers();
    offers[0]!.declaredTaegPct = 2.0;
    const out = validateOffers({ offers });
    const a = out.validations.find((v) => v.offerId === 'offer-a')!;
    assert.ok(
      a.inconsistencies.some((i) => i.field === 'declaredTaegPct' && i.code === 'INCONSISTENT'),
    );
  });

  test('rata dichiarata incoerente segnalata senza sovrascrivere il dato', () => {
    const offers = buildSyntheticOffers();
    offers[0]!.declaredInitialPayment = 700;
    const out = validateOffers({ offers });
    const a = out.validations.find((v) => v.offerId === 'offer-a')!;
    assert.ok(
      a.inconsistencies.some((i) => i.field === 'declaredInitialPayment' && i.code === 'INCONSISTENT'),
    );
    assert.equal(offers[0]!.declaredInitialPayment, 700, 'il dato originale non viene modificato');
  });

  test('provenienza non dichiarata segnalata', () => {
    const offers = buildSyntheticOffers();
    delete offers[0]!.provenance['tanPct'];
    const out = validateOffers({ offers });
    const a = out.validations.find((v) => v.offerId === 'offer-a')!;
    assert.ok(a.inconsistencies.some((i) => i.field === 'tanPct' && /Provenienza/i.test(i.message)));
  });
});
