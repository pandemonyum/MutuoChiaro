import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeMortgage } from '../src/tools/mortgageCalculator.js';
import { ValidationError } from '../src/core/errors.js';

describe('MortgageCalculator - formula della rata', () => {
  test('rata costante calcolata con la formula francese', () => {
    const out = computeMortgage({ principal: 220_000, annualNominalRatePct: 3.1, years: 20 });
    // R = C*i/(1-(1+i)^-n) con i=0.031/12, n=240
    const i = 0.031 / 12;
    const expected = (220_000 * i) / (1 - Math.pow(1 + i, -240));
    assert.equal(out.months, 240);
    assert.ok(Math.abs(out.monthlyPayment - expected) < 0.01, `atteso ~${expected}, ottenuto ${out.monthlyPayment}`);
    assert.ok(Math.abs(out.monthlyPayment - 1230.9) < 1, `rata attesa ~1230,90 €, ottenuta ${out.monthlyPayment}`);
  });

  test('interessi e costo totale simulato coerenti fra loro', () => {
    const out = computeMortgage({
      principal: 220_000,
      annualNominalRatePct: 3.45,
      years: 30,
      upfrontCosts: 2550,
      recurringMonthlyCost: 2,
    });
    assert.ok(Math.abs(out.totalPaidOnLoan - out.monthlyPayment * 360) < 0.01);
    assert.ok(Math.abs(out.totalInterest - (out.totalPaidOnLoan - 220_000)) < 0.01);
    assert.equal(out.recurringTotal, 720);
    assert.ok(
      Math.abs(out.totalCostSimulated - (out.totalPaidOnLoan + 2550 + 720)) < 0.01,
      'il costo totale simulato deve sommare rate, costi iniziali e ricorrenti',
    );
  });

  test('durata piu lunga riduce la rata e aumenta gli interessi totali', () => {
    const short = computeMortgage({ principal: 220_000, annualNominalRatePct: 3.1, years: 20 });
    const long = computeMortgage({ principal: 220_000, annualNominalRatePct: 3.45, years: 30 });
    assert.ok(long.monthlyPayment < short.monthlyPayment, 'la rata a 30 anni deve essere inferiore');
    assert.ok(long.totalInterest > short.totalInterest, 'gli interessi a 30 anni devono essere superiori');
  });

  test('tasso zero gestito senza divisione per zero', () => {
    const out = computeMortgage({ principal: 120_000, annualNominalRatePct: 0, years: 10 });
    assert.equal(out.monthlyPayment, 1000);
    assert.equal(out.totalInterest, 0);
  });

  test('ricalcolo con delta di tasso aumenta la rata', () => {
    const base = computeMortgage({ principal: 220_000, annualNominalRatePct: 2.65, years: 30 });
    const stressed = computeMortgage({
      principal: 220_000,
      annualNominalRatePct: 2.65,
      years: 30,
      rateDeltaPp: 2,
    });
    assert.equal(stressed.appliedAnnualRatePct, 4.65);
    assert.ok(stressed.monthlyPayment > base.monthlyPayment);
    assert.ok(Math.abs(base.monthlyPayment - 886.2) < 1, `rata base attesa ~886,20 €, ottenuta ${base.monthlyPayment}`);
    assert.ok(Math.abs(stressed.monthlyPayment - 1134.3) < 1.5, `rata stressata attesa ~1134 €, ottenuta ${stressed.monthlyPayment}`);
  });

  test('importo negativo rifiutato', () => {
    assert.throws(
      () => computeMortgage({ principal: -1000, annualNominalRatePct: 3, years: 20 }),
      (err: unknown) => err instanceof ValidationError && err.issues.some((i) => i.code === 'NEGATIVE'),
    );
  });

  test('durata non valida rifiutata', () => {
    assert.throws(
      () => computeMortgage({ principal: 100_000, annualNominalRatePct: 3, years: 0 }),
      (err: unknown) => err instanceof ValidationError && err.issues.some((i) => i.field === 'years'),
    );
    assert.throws(
      () => computeMortgage({ principal: 100_000, annualNominalRatePct: 3, years: 60 }),
      ValidationError,
    );
  });

  test('tasso fuori intervallo rifiutato', () => {
    assert.throws(
      () => computeMortgage({ principal: 100_000, annualNominalRatePct: 40, years: 20 }),
      ValidationError,
    );
  });
});
