import { ValidationError } from '../core/errors.js';
import type { ComponentContext, ComponentDefinition } from '../core/registry.js';
import type {
  FinancialProfile,
  MortgageOffer,
  OfferValidation,
  PropertyPlan,
  ScenarioId,
  ScenarioOfferResult,
  ScenarioResult,
  Traced,
} from '../core/types.js';
import type { MortgageCalcInput, MortgageCalcOutput } from './mortgageCalculator.js';
import { round2 } from './mortgageCalculator.js';

export interface ScenarioInput {
  scenarioId: ScenarioId;
  profile: FinancialProfile;
  property: PropertyPlan;
  offers: MortgageOffer[];
  validations: OfferValidation[];
}

/** Parametri di scenario: esplicitati come SCENARIO_ASSUMPTION, non nascosti. */
export const SCENARIO_PARAMS = Object.freeze({
  BASE: { label: 'Scenario base' },
  APPRAISALMINUS10: { label: 'Perizia inferiore del 10% rispetto al prezzo', appraisalFactor: 0.9 },
  RATEPLUS2PP: { label: 'Aumento del tasso di 2 punti percentuali', rateDeltaPp: 2 },
  INCOMEMINUS20: { label: 'Riduzione del reddito del 20% per sei mesi', incomeFactor: 0.8, months: 6 },
});

const DEFAULT_MAX_LTV_PCT = 80;

/** Formattazione italiana usata nelle note degli scenari. */
const itNum = (n: number, digits = 2): string =>
  new Intl.NumberFormat('it-IT', { maximumFractionDigits: digits }).format(n);

function calc(ctx: ComponentContext, input: MortgageCalcInput): MortgageCalcOutput {
  // Nessuna formula finanziaria qui: delega al tool dedicato via kernel.
  return ctx.invoke<MortgageCalcInput, MortgageCalcOutput>('MortgageCalculator', input);
}

function requireNumber(value: number | null | undefined, field: string): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    throw new ValidationError(`Campo obbligatorio assente o non numerico: ${field}`, [
      { field, code: 'MISSING', message: `${field} non disponibile.` },
    ]);
  }
  return value;
}

function assertNonNegative(profile: FinancialProfile, property: PropertyPlan): void {
  const issues: { field: string; code: string; message: string }[] = [];
  const checks: [string, number | null][] = [
    ['monthlyNetIncome', profile.monthlyNetIncome],
    ['otherMonthlyIncome', profile.otherMonthlyIncome],
    ['existingMonthlyDebts', profile.existingMonthlyDebts],
    ['savings', profile.savings],
    ['emergencyFundMin', profile.emergencyFundMin],
    ['price', property.price],
    ['accessoryCosts', property.accessoryCosts],
    ['plannedWorks', property.plannedWorks],
    ['requestedLoanAmount', property.requestedLoanAmount],
  ];
  for (const [field, value] of checks) {
    if (value !== null && value < 0) {
      issues.push({ field, code: 'NEGATIVE', message: `${field} non può essere negativo.` });
    }
  }
  const income = (profile.monthlyNetIncome ?? 0) + (profile.otherMonthlyIncome ?? 0);
  if (income <= 0) {
    issues.push({
      field: 'monthlyNetIncome',
      code: 'ZERO_INCOME',
      message: 'Il reddito mensile complessivo deve essere maggiore di zero per calcolare rapporti e margini.',
    });
  }
  if (issues.length > 0) {
    throw new ValidationError('Profilo non valido per AffordabilityScenarioEngine.', issues);
  }
}

const CALCULATED = (value: number | null, note?: string): Traced => ({
  value: value === null ? null : round2(value),
  provenance: value === null ? 'MISSING' : 'CALCULATED',
  ...(note ? { note } : {}),
});

const ASSUMED = (value: number | null, note: string): Traced => ({
  value: value === null ? null : round2(value),
  provenance: value === null ? 'MISSING' : 'SCENARIO_ASSUMPTION',
  note,
});

/**
 * Motore deterministico di sostenibilità: rapporto rata/reddito, margine mensile,
 * liquidità necessaria e residua, confronto con il fondo di emergenza,
 * effetti di perizia inferiore, aumento del tasso e riduzione del reddito.
 */
export function runScenario(input: ScenarioInput, ctx: ComponentContext): ScenarioResult {
  const { scenarioId, profile, property, offers, validations } = input;
  assertNonNegative(profile, property);

  const price = requireNumber(property.price, 'price');
  const accessory = property.accessoryCosts ?? 0;
  const works = property.plannedWorks ?? 0;
  const savings = requireNumber(profile.savings, 'savings');
  const emergencyFundMin = profile.emergencyFundMin ?? 0;
  const baseIncome =
    requireNumber(profile.monthlyNetIncome, 'monthlyNetIncome') + (profile.otherMonthlyIncome ?? 0);
  // Rate già attive non dichiarate = 0 ai fini del calcolo, ma segnalate come dato mancante
  // dal Profile & Property Agent: il motore non inventa un valore.
  const debts = profile.existingMonthlyDebts ?? 0;

  const assumptions: string[] = [];
  const warnings: string[] = [];

  let income = baseIncome;
  let appraisalValue: number | null = null;
  let rateDeltaPp = 0;
  let incomeShortfallMonths = 0;

  switch (scenarioId) {
    case 'BASE':
      assumptions.push('Tasso e reddito costanti per tutta la durata.');
      assumptions.push('Perizia pari al prezzo di acquisto.');
      break;
    case 'APPRAISAL_MINUS_10':
      appraisalValue = price * SCENARIO_PARAMS.APPRAISALMINUS10.appraisalFactor;
      assumptions.push(
        `Valore di perizia ipotizzato pari al ${itNum(100 * SCENARIO_PARAMS.APPRAISALMINUS10.appraisalFactor, 0)}% del prezzo (${itNum(appraisalValue, 0)} €).`,
      );
      assumptions.push(
        'Il mutuo erogabile è limitato dal rapporto massimo prestito/valore dichiarato nell offerta; il valore di riferimento diventa la perizia, non il prezzo.',
      );
      break;
    case 'RATE_PLUS_2PP':
      rateDeltaPp = SCENARIO_PARAMS.RATEPLUS2PP.rateDeltaPp;
      assumptions.push(
        'Aumento immediato e permanente di 2 punti percentuali sul TAN, applicato al capitale iniziale.',
      );
      assumptions.push(
        'Semplificazione: nella realtà la revisione avviene alle date di indicizzazione e sul capitale residuo.',
      );
      assumptions.push('Applicato solo alle offerte a tasso variabile.');
      break;
    case 'INCOME_MINUS_20_6M':
      income = baseIncome * SCENARIO_PARAMS.INCOMEMINUS20.incomeFactor;
      incomeShortfallMonths = SCENARIO_PARAMS.INCOMEMINUS20.months;
      assumptions.push(
        `Reddito ridotto al ${100 * SCENARIO_PARAMS.INCOMEMINUS20.incomeFactor}% per ${incomeShortfallMonths} mesi, poi ritorno al valore dichiarato.`,
      );
      assumptions.push(
        'La differenza mensile è ipotizzata coperta attingendo ai risparmi residui.',
      );
      break;
  }

  const results: ScenarioOfferResult[] = offers.map((offer) => {
    const validation = validations.find((v) => v.offerId === offer.id);
    const partial = validation?.partial ?? false;
    const missingInsurance =
      offer.insuranceRequired === true &&
      (offer.insuranceCost === null || offer.insuranceCost === undefined);

    if (
      offer.amount === null ||
      offer.years === null ||
      offer.tanPct === null ||
      offer.rateType === null
    ) {
      warnings.push(
        `${offer.displayName}: dati essenziali assenti, scenario non calcolabile per questa offerta.`,
      );
      return notApplicable(offer.id, offer.displayName, partial, validation?.missingFields ?? []);
    }

    const appliesRateDelta = rateDeltaPp !== 0 && offer.rateType === 'VARIABLE';

    let loanAmount = offer.amount;
    let extraDownPayment = 0;
    if (appraisalValue !== null) {
      const maxLtv = offer.maxLtvPct ?? DEFAULT_MAX_LTV_PCT;
      const maxLoanOnAppraisal = (appraisalValue * maxLtv) / 100;
      if (loanAmount > maxLoanOnAppraisal) {
        extraDownPayment = loanAmount - maxLoanOnAppraisal;
        loanAmount = maxLoanOnAppraisal;
      }
    }

    const upfrontKnown =
      (offer.arrangementFee ?? 0) + (offer.appraisalFee ?? 0) + (offer.otherUpfrontCosts ?? 0);
    const insuranceKnown = offer.insuranceCost ?? 0;

    const calcOut = calc(ctx, {
      principal: loanAmount,
      annualNominalRatePct: offer.tanPct,
      years: offer.years,
      upfrontCosts: upfrontKnown + insuranceKnown,
      recurringMonthlyCost: offer.recurringMonthlyCost ?? 0,
      ...(appliesRateDelta ? { rateDeltaPp } : {}),
    });

    const downPayment = price - loanAmount;
    const liquidityNeeded = downPayment + accessory + works + upfrontKnown + insuranceKnown;
    let liquidityRemaining = savings - liquidityNeeded;

    if (incomeShortfallMonths > 0) {
      const monthlyShortfall = baseIncome - income;
      liquidityRemaining -= monthlyShortfall * incomeShortfallMonths;
    }

    const paymentToIncomePct = (calcOut.monthlyPayment / income) * 100;
    const monthlyMargin = income - debts - calcOut.monthlyPayment - (offer.recurringMonthlyCost ?? 0);

    if (missingInsurance) {
      warnings.push(
        `${offer.displayName}: il costo della polizza obbligatoria non è presente nell offerta. Costo totale e liquidità necessaria sono sottostimati di un importo non noto.`,
      );
    }
    if (extraDownPayment > 0) {
      warnings.push(
        `${offer.displayName}: con la perizia ipotizzata il mutuo erogabile scende di ${itNum(extraDownPayment, 0)} €, che diventano anticipo aggiuntivo a carico dell acquirente.`,
      );
    }

    const partialNote = missingInsurance
      ? 'Valore parziale: manca il costo della polizza obbligatoria.'
      : undefined;

    // Un valore che dipende da un parametro ipotizzato dallo scenario viene
    // etichettato come ipotesi, non come calcolo: la distinzione resta visibile
    // anche sui valori derivati.
    const capitalAssumed = extraDownPayment > 0;
    const paymentAssumed = appliesRateDelta || capitalAssumed;
    const incomeAssumed = incomeShortfallMonths > 0;

    const paymentNote = appliesRateDelta
      ? `Rata ricalcolata con TAN ${itNum(calcOut.appliedAnnualRatePct)}%.`
      : `Rata ricalcolata sul capitale ridotto a ${itNum(loanAmount, 0)} € dal limite prestito/valore sulla perizia ipotizzata.`;

    const join = (...parts: (string | undefined)[]): string | undefined => {
      const kept = parts.filter((p): p is string => Boolean(p));
      return kept.length > 0 ? kept.join(' ') : undefined;
    };

    return {
      offerId: offer.id,
      displayName: offer.displayName,
      applicable: true,
      partial: partial || missingInsurance,
      monthlyPayment: paymentAssumed
        ? ASSUMED(calcOut.monthlyPayment, paymentNote)
        : CALCULATED(calcOut.monthlyPayment),
      paymentToIncomePct:
        incomeAssumed || paymentAssumed
          ? ASSUMED(
              paymentToIncomePct,
              incomeAssumed
                ? 'Calcolato sul reddito ridotto ipotizzato.'
                : 'Calcolato sulla rata ipotizzata dallo scenario.',
            )
          : CALCULATED(paymentToIncomePct),
      monthlyMargin: (() => {
        const debtsNote =
          profile.existingMonthlyDebts === null
            ? 'Rate già attive non dichiarate: non incluse nel calcolo.'
            : undefined;
        return incomeAssumed || paymentAssumed
          ? ASSUMED(
              monthlyMargin,
              join(
                incomeAssumed
                  ? 'Calcolato sul reddito ridotto ipotizzato.'
                  : 'Calcolato sulla rata ipotizzata dallo scenario.',
                debtsNote,
              )!,
            )
          : CALCULATED(monthlyMargin, debtsNote);
      })(),
      liquidityNeeded:
        appraisalValue !== null
          ? ASSUMED(
              liquidityNeeded,
              join(
                capitalAssumed
                  ? `Include ${itNum(extraDownPayment, 0)} € di anticipo aggiuntivo dovuto alla perizia ipotizzata.`
                  : 'Con la perizia ipotizzata il limite prestito/valore non viene superato: nessun anticipo aggiuntivo.',
                partialNote,
              )!,
            )
          : CALCULATED(liquidityNeeded, partialNote),
      liquidityRemaining:
        incomeAssumed || appraisalValue !== null
          ? ASSUMED(
              liquidityRemaining,
              join(
                incomeAssumed
                  ? `Include ${incomeShortfallMonths} mesi di minore reddito coperti con i risparmi.`
                  : 'Tiene conto della liquidità necessaria nello scenario di perizia ipotizzata.',
                partialNote,
              )!,
            )
          : CALCULATED(liquidityRemaining, partialNote),
      emergencyFundBreach: liquidityRemaining < emergencyFundMin,
      totalCostSimulated: paymentAssumed
        ? ASSUMED(calcOut.totalCostSimulated, join(paymentNote, partialNote && 'Parziale: costo polizza non noto.')!)
        : missingInsurance
          ? {
              value: round2(calcOut.totalCostSimulated),
              provenance: 'CALCULATED',
              note: 'Parziale: costo polizza non noto.',
            }
          : CALCULATED(calcOut.totalCostSimulated),
      totalInterestSimulated: paymentAssumed
        ? ASSUMED(calcOut.totalInterest, paymentNote)
        : CALCULATED(calcOut.totalInterest),
    };
  });

  return {
    scenarioId,
    label: labelFor(scenarioId),
    assumptions,
    warnings: [...new Set(warnings)],
    offers: results,
  };
}

function notApplicable(
  offerId: string,
  displayName: string,
  partial: boolean,
  missingFields: string[],
): ScenarioOfferResult {
  const missing: Traced = { value: null, provenance: 'MISSING' };
  return {
    offerId,
    displayName,
    applicable: false,
    partial,
    monthlyPayment: missing,
    paymentToIncomePct: missing,
    monthlyMargin: missing,
    liquidityNeeded: missing,
    liquidityRemaining: missing,
    emergencyFundBreach: null,
    totalCostSimulated: missing,
    totalInterestSimulated: missing,
    deltaVsBase: Object.fromEntries(missingFields.map((f) => [f, null])),
  };
}

function labelFor(id: ScenarioId): string {
  switch (id) {
    case 'BASE':
      return SCENARIO_PARAMS.BASE.label;
    case 'APPRAISAL_MINUS_10':
      return SCENARIO_PARAMS.APPRAISALMINUS10.label;
    case 'RATE_PLUS_2PP':
      return SCENARIO_PARAMS.RATEPLUS2PP.label;
    case 'INCOME_MINUS_20_6M':
      return SCENARIO_PARAMS.INCOMEMINUS20.label;
  }
}

export const affordabilityScenarioEngineTool: ComponentDefinition<ScenarioInput, ScenarioResult> = {
  name: 'AffordabilityScenarioEngine',
  kind: 'tool',
  purpose:
    'Calcolo deterministico di rapporto rata/reddito, margine mensile, liquidità necessaria e residua, confronto con il fondo di emergenza.',
  run: (input, ctx) => runScenario(input, ctx),
};
