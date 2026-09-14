import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildRuntime } from '../src/runtime/buildRuntime.js';
import { ValidationError } from '../src/core/errors.js';
import { buildSyntheticOffers } from '../src/data/syntheticOffers.js';
import { ANDREA_PROFILE, ANDREA_PROPERTY } from '../src/data/syntheticPersona.js';
import type { ScenarioInput } from '../src/tools/affordabilityScenarioEngine.js';
import type { OfferValidatorInput, OfferValidatorOutput } from '../src/tools/offerSchemaValidator.js';
import type { ScenarioId, ScenarioResult } from '../src/core/types.js';

function scenarioFixture(scenarioId: ScenarioId, overrides: Partial<ScenarioInput> = {}) {
  const rt = buildRuntime();
  const runId = 'run-scenario-test';
  const offers = buildSyntheticOffers();
  const validation = rt.registry.invoke<OfferValidatorInput, OfferValidatorOutput>(
    runId,
    'OfferSchemaValidator',
    { offers },
  );
  const input: ScenarioInput = {
    scenarioId,
    profile: { ...ANDREA_PROFILE, existingMonthlyDebts: 280 },
    property: { ...ANDREA_PROPERTY },
    offers,
    validations: validation.validations,
    ...overrides,
  };
  const result = rt.registry.invoke<ScenarioInput, ScenarioResult>(
    runId,
    'AffordabilityScenarioEngine',
    input,
  );
  return { rt, runId, result, offers };
}

const byId = (r: ScenarioResult, id: string) => r.offers.find((o) => o.offerId === id)!;

describe('AffordabilityScenarioEngine - scenario base', () => {
  test('rapporto rata/reddito e margine mensile calcolati sul reddito dichiarato', () => {
    const { result } = scenarioFixture('BASE');
    const a = byId(result, 'offer-a');
    // reddito 2250, rate attive 280, rata ~1230.90
    assert.ok(a.monthlyPayment.value !== null);
    const expectedRatio = (a.monthlyPayment.value! / 2250) * 100;
    assert.ok(Math.abs(a.paymentToIncomePct.value! - expectedRatio) < 0.05);
    const expectedMargin = 2250 - 280 - a.monthlyPayment.value!;
    assert.ok(Math.abs(a.monthlyMargin.value! - expectedMargin) < 0.05);
    assert.equal(a.monthlyPayment.provenance, 'CALCULATED');
  });

  test('liquidita necessaria e residua includono anticipo, spese, lavori e costi iniziali', () => {
    const { result } = scenarioFixture('BASE');
    const a = byId(result, 'offer-a');
    // anticipo 80.000 + accessorie 18.000 + lavori 10.000 + istruttoria 500 + perizia 320 + polizza 1450
    assert.equal(a.liquidityNeeded.value, 110_270);
    assert.equal(a.liquidityRemaining.value, 100_000 - 110_270);
    assert.equal(a.emergencyFundBreach, true);
  });

  test('la liquidita residua sotto la soglia del fondo di emergenza viene rilevata', () => {
    const { result } = scenarioFixture('BASE', {
      profile: { ...ANDREA_PROFILE, existingMonthlyDebts: 280, savings: 200_000 },
    });
    const a = byId(result, 'offer-a');
    assert.equal(a.liquidityRemaining.value, 200_000 - 110_270);
    assert.equal(a.emergencyFundBreach, false);
  });

  test('il margine dichiara che le rate attive non sono state incluse quando mancano', () => {
    const { result } = scenarioFixture('BASE', {
      profile: { ...ANDREA_PROFILE, existingMonthlyDebts: null },
    });
    const a = byId(result, 'offer-a');
    assert.match(a.monthlyMargin.note ?? '', /non dichiarate/i);
  });
});

describe('AffordabilityScenarioEngine - perizia inferiore del 10%', () => {
  test('il mutuo erogabile scende e la liquidita necessaria aumenta', () => {
    const base = scenarioFixture('BASE').result;
    const { result } = scenarioFixture('APPRAISAL_MINUS_10');
    const a = byId(result, 'offer-a');
    const aBase = byId(base, 'offer-a');

    // perizia 270.000, LTV max 80% -> mutuo max 216.000, anticipo aggiuntivo 4.000
    assert.ok(a.liquidityNeeded.value! > aBase.liquidityNeeded.value!);
    assert.equal(a.liquidityNeeded.value! - aBase.liquidityNeeded.value!, 4000);
    assert.equal(a.liquidityNeeded.provenance, 'SCENARIO_ASSUMPTION');
    assert.ok(a.monthlyPayment.value! < aBase.monthlyPayment.value!, 'meno capitale = rata inferiore');
    assert.ok(result.assumptions.some((x) => /perizia/i.test(x)));
    assert.ok(result.warnings.some((w) => /anticipo aggiuntivo/i.test(w)));
  });

  test('i valori derivati da un parametro ipotizzato sono etichettati come ipotesi', () => {
    const { result } = scenarioFixture('APPRAISAL_MINUS_10');
    const a = byId(result, 'offer-a');
    for (const key of [
      'monthlyPayment',
      'paymentToIncomePct',
      'monthlyMargin',
      'liquidityNeeded',
      'liquidityRemaining',
      'totalCostSimulated',
      'totalInterestSimulated',
    ] as const) {
      assert.equal(
        a[key].provenance,
        'SCENARIO_ASSUMPTION',
        `${key} dipende dalla perizia ipotizzata e non può essere etichettato come semplice calcolo`,
      );
    }
  });

  test('nello scenario base nessun valore e etichettato come ipotesi', () => {
    const { result } = scenarioFixture('BASE');
    const a = byId(result, 'offer-a');
    for (const key of ['monthlyPayment', 'paymentToIncomePct', 'liquidityNeeded'] as const) {
      assert.equal(a[key].provenance, 'CALCULATED');
    }
  });

  test('un limite prestito/valore piu basso produce un anticipo aggiuntivo maggiore', () => {
    const base = scenarioFixture('BASE').result;
    const { result } = scenarioFixture('APPRAISAL_MINUS_10');
    // offerta C ha maxLtvPct 75 -> 270.000*0.75 = 202.500 -> +17.500
    const cDelta = byId(result, 'offer-c').liquidityNeeded.value! - byId(base, 'offer-c').liquidityNeeded.value!;
    const aDelta = byId(result, 'offer-a').liquidityNeeded.value! - byId(base, 'offer-a').liquidityNeeded.value!;
    assert.equal(cDelta, 17_500);
    assert.ok(cDelta > aDelta);
  });
});

describe('AffordabilityScenarioEngine - aumento del tasso di 2 punti', () => {
  test('solo il tasso variabile cambia rata e il valore e marcato come ipotesi', () => {
    const base = scenarioFixture('BASE').result;
    const { result } = scenarioFixture('RATE_PLUS_2PP');

    const aBase = byId(base, 'offer-a');
    const a = byId(result, 'offer-a');
    assert.equal(a.monthlyPayment.value, aBase.monthlyPayment.value, 'il fisso non cambia');
    assert.equal(a.monthlyPayment.provenance, 'CALCULATED');

    const cBase = byId(base, 'offer-c');
    const c = byId(result, 'offer-c');
    assert.ok(c.monthlyPayment.value! > cBase.monthlyPayment.value!, 'il variabile cambia');
    assert.equal(c.monthlyPayment.provenance, 'SCENARIO_ASSUMPTION');
    // La nota usa la formattazione italiana con la virgola decimale.
    assert.match(c.monthlyPayment.note ?? '', /TAN 4,65%/);
  });

  test('nello scenario di tasso la rata del variabile supera quella del fisso a 30 anni', () => {
    const base = scenarioFixture('BASE').result;
    const { result } = scenarioFixture('RATE_PLUS_2PP');
    assert.ok(byId(base, 'offer-c').monthlyPayment.value! < byId(base, 'offer-b').monthlyPayment.value!);
    assert.ok(byId(result, 'offer-c').monthlyPayment.value! > byId(result, 'offer-b').monthlyPayment.value!);
  });
});

describe('AffordabilityScenarioEngine - riduzione del reddito del 20% per sei mesi', () => {
  test('rata invariata, rapporto in aumento, margine e liquidita in calo', () => {
    const base = scenarioFixture('BASE').result;
    const { result } = scenarioFixture('INCOME_MINUS_20_6M');
    const a = byId(result, 'offer-a');
    const aBase = byId(base, 'offer-a');

    assert.equal(a.monthlyPayment.value, aBase.monthlyPayment.value);
    assert.ok(a.paymentToIncomePct.value! > aBase.paymentToIncomePct.value!);
    assert.equal(a.paymentToIncomePct.provenance, 'SCENARIO_ASSUMPTION');
    // 2250*0.2 = 450 al mese per 6 mesi = 2.700 attinti dai risparmi
    assert.equal(aBase.liquidityRemaining.value! - a.liquidityRemaining.value!, 2700);
    assert.equal(a.liquidityRemaining.provenance, 'SCENARIO_ASSUMPTION');
  });
});

describe('AffordabilityScenarioEngine - dati non validi', () => {
  test('reddito uguale a zero rifiutato', () => {
    assert.throws(
      () => scenarioFixture('BASE', { profile: { ...ANDREA_PROFILE, monthlyNetIncome: 0 } }),
      (err: unknown) => err instanceof ValidationError && err.issues.some((i) => i.code === 'ZERO_INCOME'),
    );
  });

  test('importo negativo rifiutato', () => {
    assert.throws(
      () => scenarioFixture('BASE', { property: { ...ANDREA_PROPERTY, price: -1 } }),
      (err: unknown) => err instanceof ValidationError && err.issues.some((i) => i.code === 'NEGATIVE'),
    );
  });

  test('offerta priva di dati essenziali resta non calcolabile senza inventare valori', () => {
    const offers = buildSyntheticOffers();
    offers[0]!.tanPct = null;
    const { result } = scenarioFixture('BASE', { offers });
    const a = byId(result, 'offer-a');
    assert.equal(a.applicable, false);
    assert.equal(a.monthlyPayment.value, null);
    assert.equal(a.monthlyPayment.provenance, 'MISSING');
  });
});

describe('AffordabilityScenarioEngine - costo totale parziale', () => {
  test("l'offerta con polizza obbligatoria senza costo produce totali marcati parziali", () => {
    const { result } = scenarioFixture('BASE');
    const c = byId(result, 'offer-c');
    assert.equal(c.partial, true);
    assert.match(c.totalCostSimulated.note ?? '', /parziale/i);
    assert.ok(result.warnings.some((w) => /polizza obbligatoria non è presente/i.test(w)));
  });

  test('il costo della polizza mancante non viene stimato', () => {
    const { result, offers } = scenarioFixture('BASE');
    const offerC = offers.find((o) => o.id === 'offer-c')!;
    assert.equal(offerC.insuranceCost, null, 'il dato deve restare assente nello stato');
    const c = byId(result, 'offer-c');
    // Il costo totale include solo i costi noti: istruttoria 0 + perizia 350.
    const expectedUpfront = 350;
    const recurring = 3 * 360;
    assert.ok(
      Math.abs(c.totalCostSimulated.value! - (c.totalInterestSimulated.value! + 220_000 + expectedUpfront + recurring)) < 1,
    );
  });

  test('ogni invocazione dello scenario passa dal MortgageCalculator registrato', () => {
    const { rt } = scenarioFixture('BASE');
    assert.ok(
      rt.registry.callCount('MortgageCalculator') >= 3,
      'lo scenario deve delegare il calcolo della rata al tool, una volta per offerta calcolabile',
    );
  });
});
