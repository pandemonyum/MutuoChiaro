import type { Phase, RunState } from './types.js';

/**
 * Transizioni legali della Mortgage Journey.
 * Qualsiasi transizione non presente in questa tabella viene rifiutata.
 */
export const LEGAL_TRANSITIONS: Readonly<Record<Phase, readonly Phase[]>> = Object.freeze({
  START: ['PROFILE_INCOMPLETE', 'PROFILE_READY', 'ESCALATED'],
  PROFILE_INCOMPLETE: ['PROFILE_INCOMPLETE', 'PROFILE_READY', 'ESCALATED'],
  PROFILE_READY: ['OFFERS_INCOMPLETE', 'OFFERS_NORMALIZED', 'PROFILE_INCOMPLETE', 'ESCALATED'],
  OFFERS_INCOMPLETE: ['OFFERS_NORMALIZED', 'OFFERS_INCOMPLETE', 'ESCALATED'],
  OFFERS_NORMALIZED: ['SCENARIOS_READY', 'OFFERS_INCOMPLETE', 'PROFILE_INCOMPLETE', 'ESCALATED'],
  SCENARIOS_READY: [
    'UNDERSTANDING_CHECK',
    'SCENARIOS_READY',
    'OFFERS_NORMALIZED',
    'PROFILE_INCOMPLETE',
    'ESCALATED',
  ],
  UNDERSTANDING_CHECK: [
    'UNDERSTANDING_CHECK',
    'SCENARIOS_READY',
    'AWAITING_HUMAN_CONFIRMATION',
    'ESCALATED',
  ],
  AWAITING_HUMAN_CONFIRMATION: ['COMPLETED', 'UNDERSTANDING_CHECK', 'ESCALATED'],
  COMPLETED: [],
  ESCALATED: [],
});

export const TERMINAL_PHASES: readonly Phase[] = ['COMPLETED', 'ESCALATED'];

export function isLegalTransition(from: Phase, to: Phase): boolean {
  return (LEGAL_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Precondizioni non negoziabili per chiudere il run.
 * Restituisce la lista dei requisiti NON soddisfatti.
 */
export function completionBlockers(state: RunState): string[] {
  const blockers: string[] = [];

  const validated = state.offerValidations.filter((v) => v.valid || v.partial);
  if (validated.length === 0) {
    blockers.push('Nessuna offerta ha superato la validazione di schema.');
  }
  if (state.scenarios.length === 0) {
    blockers.push('Nessuno scenario completato.');
  }
  if (state.comprehensionResult.status === 'NOT_STARTED') {
    blockers.push('Controllo di comprensione non eseguito.');
  }
  if (state.comprehensionResult.status === 'IN_PROGRESS') {
    blockers.push('Controllo di comprensione ancora in corso: tentativi disponibili non esauriti.');
  }
  if (!state.humanApproval.received) {
    blockers.push('Conferma umana non ricevuta.');
  }
  return blockers;
}

/** Il gate umano puo' essere richiesto solo da questa fase. */
export const HUMAN_GATE_PHASE: Phase = 'AWAITING_HUMAN_CONFIRMATION';

export const HUMAN_GATE_STATEMENT =
  'Dichiaro di aver compreso che questa simulazione è educativa, utilizza dati sintetici e non rappresenta una proposta, una delibera bancaria o una raccomandazione finanziaria.';
