import type { BeforeSnapshot, FinancialProfile, PropertyPlan } from '../core/types.js';

/**
 * PERSONA SINTETICA - non corrisponde ad alcuna persona reale.
 * `existingMonthlyDebts: null` è intenzionale: il dato non è dichiarato
 * e attiva il percorso "Prossima domanda decisiva".
 */
export const ANDREA_PROFILE: FinancialProfile = Object.freeze({
  personaName: 'Andrea (persona sintetica, 32 anni, dipendente a tempo indeterminato)',
  syntheticData: true,
  monthlyNetIncome: 2250,
  otherMonthlyIncome: 0,
  existingMonthlyDebts: null,
  savings: 100_000,
  emergencyFundMin: 20_000,
});

export const ANDREA_PROPERTY: PropertyPlan = Object.freeze({
  price: 300_000,
  accessoryCosts: 18_000,
  plannedWorks: 10_000,
  requestedLoanAmount: 220_000,
  assumedYears: 25,
  firstHome: true,
});

/** Risposta di partenza della persona sintetica, usata per il confronto before/after. */
export const ANDREA_BEFORE: BeforeSnapshot = Object.freeze({
  question: 'Quale elemento useresti per confrontarle?',
  answer: 'Guarderei soltanto la rata più bassa.',
  comparisonCriteriaUsed: ['rata mensile'],
  offersShownRaw: 3,
  termsExplained: 0,
});

/** Valore usato nella demo come risposta alla prossima domanda decisiva. */
export const ANDREA_DEMO_EXISTING_DEBTS = 280;
