import { ValidationError } from '../core/errors.js';
import type { ComponentDefinition } from '../core/registry.js';

export interface MortgageCalcInput {
  principal: number;
  annualNominalRatePct: number;
  years: number;
  /** Costi iniziali una tantum inclusi nel costo totale simulato. */
  upfrontCosts?: number;
  /** Costi ricorrenti mensili inclusi nel costo totale simulato. */
  recurringMonthlyCost?: number;
  /** Delta da applicare al TAN, in punti percentuali (scenario tasso). */
  rateDeltaPp?: number;
}

export interface MortgageCalcOutput {
  principal: number;
  appliedAnnualRatePct: number;
  years: number;
  months: number;
  monthlyPayment: number;
  totalPaidOnLoan: number;
  totalInterest: number;
  upfrontCosts: number;
  recurringTotal: number;
  /** rate + interessi + costi iniziali + costi ricorrenti */
  totalCostSimulated: number;
  formula: string;
}

const MAX_YEARS = 40;
const MAX_RATE_PCT = 25;

/**
 * Ammortamento francese (rata costante):
 *   R = C * i / (1 - (1 + i)^-n)
 * con i = TAN/12 e n = anni*12. Tasso 0 gestito come C/n.
 */
export function computeMortgage(input: MortgageCalcInput): MortgageCalcOutput {
  const issues: { field: string; code: string; message: string }[] = [];
  const { principal, years } = input;
  const rateDelta = input.rateDeltaPp ?? 0;
  const appliedRate = input.annualNominalRatePct + rateDelta;

  if (!Number.isFinite(principal)) {
    issues.push({ field: 'principal', code: 'NOT_A_NUMBER', message: 'Capitale non numerico.' });
  } else if (principal <= 0) {
    issues.push({
      field: 'principal',
      code: 'NEGATIVE',
      message: 'Il capitale deve essere maggiore di zero.',
    });
  }
  if (!Number.isFinite(years)) {
    issues.push({ field: 'years', code: 'NOT_A_NUMBER', message: 'Durata non numerica.' });
  } else if (years <= 0 || years > MAX_YEARS) {
    issues.push({
      field: 'years',
      code: 'OUT_OF_RANGE',
      message: `La durata deve essere compresa fra 1 e ${MAX_YEARS} anni.`,
    });
  }
  if (!Number.isFinite(appliedRate)) {
    issues.push({ field: 'annualNominalRatePct', code: 'NOT_A_NUMBER', message: 'TAN non numerico.' });
  } else if (appliedRate < 0 || appliedRate > MAX_RATE_PCT) {
    issues.push({
      field: 'annualNominalRatePct',
      code: 'OUT_OF_RANGE',
      message: `Il TAN applicato deve essere compreso fra 0% e ${MAX_RATE_PCT}%.`,
    });
  }
  if (issues.length > 0) {
    throw new ValidationError('Input non valido per MortgageCalculator.', issues);
  }

  const months = Math.round(years * 12);
  const i = appliedRate / 100 / 12;
  const rawPayment =
    i === 0 ? principal / months : (principal * i) / (1 - Math.pow(1 + i, -months));

  // La rata viene arrotondata ai centesimi e i totali derivano dalla rata
  // arrotondata: i valori mostrati restano coerenti fra loro.
  const monthlyPayment = round2(rawPayment);
  const totalPaidOnLoan = monthlyPayment * months;
  const totalInterest = totalPaidOnLoan - principal;
  const upfrontCosts = input.upfrontCosts ?? 0;
  const recurringTotal = (input.recurringMonthlyCost ?? 0) * months;

  return {
    principal: round2(principal),
    appliedAnnualRatePct: round4(appliedRate),
    years,
    months,
    monthlyPayment: round2(monthlyPayment),
    totalPaidOnLoan: round2(totalPaidOnLoan),
    totalInterest: round2(totalInterest),
    upfrontCosts: round2(upfrontCosts),
    recurringTotal: round2(recurringTotal),
    totalCostSimulated: round2(totalPaidOnLoan + upfrontCosts + recurringTotal),
    formula:
      'R = C * i / (1 - (1 + i)^-n), i = TAN/12, n = anni*12; rata arrotondata ai centesimi, totali derivati dalla rata arrotondata',
  };
}

export const mortgageCalculatorTool: ComponentDefinition<MortgageCalcInput, MortgageCalcOutput> = {
  name: 'MortgageCalculator',
  kind: 'tool',
  purpose: 'Calcolo deterministico di rata, interessi e costo totale simulato (ammortamento francese).',
  run: (input) => computeMortgage(input),
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
