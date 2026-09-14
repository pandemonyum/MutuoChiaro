import type { ComponentDefinition } from '../core/registry.js';
import { ValidationError } from '../core/errors.js';
import type { FieldIssue, FinancialProfile, PropertyPlan } from '../core/types.js';

export interface BuildProfileInput {
  profile: FinancialProfile;
  property: PropertyPlan;
}

export interface BuildProfileOutput {
  /** Campi mancanti o contraddittori, ordinati per impatto sulla decisione. */
  issues: FieldIssue[];
  hardErrors: FieldIssue[];
  derived: {
    totalMonthlyIncome: number | null;
    downPayment: number | null;
    cashNeededBeforeOfferCosts: number | null;
    loanToPricePct: number | null;
  };
  complete: boolean;
  summaryForUser: string[];
}

const REQUIRED_NUMERIC: { field: string; label: string; impact: number; get: (i: BuildProfileInput) => number | null }[] = [
  { field: 'monthlyNetIncome', label: 'reddito netto mensile', impact: 1, get: (i) => i.profile.monthlyNetIncome },
  { field: 'savings', label: 'risparmi disponibili', impact: 0.95, get: (i) => i.profile.savings },
  { field: 'price', label: 'prezzo dell immobile', impact: 0.9, get: (i) => i.property.price },
  { field: 'requestedLoanAmount', label: 'importo del mutuo', impact: 0.9, get: (i) => i.property.requestedLoanAmount },
  { field: 'assumedYears', label: 'durata ipotizzata', impact: 0.7, get: (i) => i.property.assumedYears },
  { field: 'existingMonthlyDebts', label: 'rate e debiti mensili già attivi', impact: 0.85, get: (i) => i.profile.existingMonthlyDebts },
  { field: 'emergencyFundMin', label: 'fondo di emergenza minimo', impact: 0.6, get: (i) => i.profile.emergencyFundMin },
  { field: 'accessoryCosts', label: 'spese accessorie', impact: 0.55, get: (i) => i.property.accessoryCosts },
  { field: 'plannedWorks', label: 'lavori previsti', impact: 0.4, get: (i) => i.property.plannedWorks },
  { field: 'otherMonthlyIncome', label: 'altre entrate mensili', impact: 0.3, get: (i) => i.profile.otherMonthlyIncome },
];

/**
 * Costruisce il profilo economico: normalizza, valida e individua i dati
 * mancanti o incoerenti. Non calcola rate né interessi.
 */
export function buildFinancialProfile(input: BuildProfileInput): BuildProfileOutput {
  const issues: FieldIssue[] = [];
  const hardErrors: FieldIssue[] = [];

  for (const spec of REQUIRED_NUMERIC) {
    const value = spec.get(input);
    if (value === null || value === undefined) {
      issues.push({
        field: spec.field,
        code: 'MISSING',
        message: `Manca il dato: ${spec.label}.`,
        decisionImpact: spec.impact,
      });
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      hardErrors.push({
        field: spec.field,
        code: 'NOT_A_NUMBER',
        message: `${spec.label}: il valore inserito non è un numero.`,
        decisionImpact: spec.impact,
      });
      continue;
    }
    if (value < 0) {
      hardErrors.push({
        field: spec.field,
        code: 'NEGATIVE',
        message: `${spec.label}: non sono ammessi importi negativi.`,
        decisionImpact: spec.impact,
      });
    }
  }

  const income = input.profile.monthlyNetIncome;
  if (income !== null && Number.isFinite(income) && income <= 0) {
    hardErrors.push({
      field: 'monthlyNetIncome',
      code: 'ZERO_INCOME',
      message:
        'Il reddito netto mensile deve essere maggiore di zero: senza reddito non è possibile calcolare rapporto rata/reddito e margine mensile.',
      decisionImpact: 1,
    });
  }

  const years = input.property.assumedYears;
  if (years !== null && Number.isFinite(years) && (years < 1 || years > 40)) {
    hardErrors.push({
      field: 'assumedYears',
      code: 'OUT_OF_RANGE',
      message: 'La durata ipotizzata deve essere compresa fra 1 e 40 anni.',
      decisionImpact: 0.7,
    });
  }

  const price = input.property.price;
  const loan = input.property.requestedLoanAmount;
  if (price !== null && loan !== null && Number.isFinite(price) && Number.isFinite(loan)) {
    if (loan > price) {
      hardErrors.push({
        field: 'requestedLoanAmount',
        code: 'INCONSISTENT',
        message:
          'L importo del mutuo richiesto supera il prezzo dell immobile: verifica i due valori inseriti.',
        decisionImpact: 0.9,
      });
    }
  }

  if (hardErrors.length > 0) {
    throw new ValidationError('Profilo non valido.', hardErrors);
  }

  const totalMonthlyIncome =
    income === null ? null : income + (input.profile.otherMonthlyIncome ?? 0);
  const downPayment = price === null || loan === null ? null : price - loan;
  const cashNeeded =
    downPayment === null
      ? null
      : downPayment + (input.property.accessoryCosts ?? 0) + (input.property.plannedWorks ?? 0);
  const loanToPricePct = price === null || loan === null || price === 0 ? null : (loan / price) * 100;

  const summaryForUser: string[] = [];
  if (totalMonthlyIncome !== null) {
    summaryForUser.push(
      `Entrate mensili complessive dichiarate: ${fmt(totalMonthlyIncome)} €.`,
    );
  }
  if (downPayment !== null) {
    summaryForUser.push(
      `Con un prezzo di ${fmt(price!)} € e un mutuo di ${fmt(loan!)} €, l anticipo a tuo carico è ${fmt(downPayment)} €.`,
    );
  }
  if (cashNeeded !== null) {
    summaryForUser.push(
      `Sommando spese accessorie e lavori, prima dei costi delle singole offerte servono ${fmt(cashNeeded)} €.`,
    );
  }
  if (input.profile.existingMonthlyDebts === null) {
    summaryForUser.push(
      'Le rate mensili già attive non risultano dichiarate: il margine mensile mostrato non le include ancora.',
    );
  }

  const complete = issues.length === 0;

  return {
    issues: issues.sort((a, b) => b.decisionImpact - a.decisionImpact),
    hardErrors,
    derived: {
      totalMonthlyIncome,
      downPayment,
      cashNeededBeforeOfferCosts: cashNeeded,
      loanToPricePct: loanToPricePct === null ? null : Math.round(loanToPricePct * 100) / 100,
    },
    complete,
    summaryForUser,
  };
}

function fmt(n: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(n);
}

export const buildFinancialProfileSkill: ComponentDefinition<BuildProfileInput, BuildProfileOutput> =
  {
    name: 'build-financial-profile',
    kind: 'skill',
    purpose:
      'Normalizza e valida profilo economico e piano di acquisto, individuando dati mancanti e incoerenze.',
    run: (input) => buildFinancialProfile(input),
  };
