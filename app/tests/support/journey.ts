import type { Runtime } from '../../src/runtime/buildRuntime.js';
import { ANDREA_DEMO_EXISTING_DEBTS } from '../../src/data/syntheticPersona.js';
import type { OrchestratorView } from '../../src/orchestrator/mortgageJourneyOrchestrator.js';

/**
 * Percorso minimo condiviso dai test: conferma del profilo (fase A), che fa
 * rilevare all orchestratore il dato mancante, e risposta alla prossima
 * domanda decisiva (fase B).
 */
export function declareExistingDebts(
  rt: Runtime,
  runId: string,
  value: number = ANDREA_DEMO_EXISTING_DEBTS,
): OrchestratorView {
  rt.orchestrator.updateProfile(runId, {});
  return rt.orchestrator.answerDecisiveQuestion(runId, 'existingMonthlyDebts', value);
}
