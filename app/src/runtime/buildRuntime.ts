import { ArtifactStore } from '../core/artifactStore.js';
import { EventBus } from '../core/eventBus.js';
import { Registry } from '../core/registry.js';
import { RunStore } from '../core/runStore.js';
import { MortgageJourneyOrchestrator } from '../orchestrator/mortgageJourneyOrchestrator.js';

import { mortgageCalculatorTool } from '../tools/mortgageCalculator.js';
import { affordabilityScenarioEngineTool } from '../tools/affordabilityScenarioEngine.js';
import { offerSchemaValidatorTool } from '../tools/offerSchemaValidator.js';
import { metricsEngineTool } from '../tools/metricsEngine.js';
import { safetyGuardTool } from '../tools/safetyGuard.js';

import { buildFinancialProfileSkill } from '../skills/buildFinancialProfile.js';
import { selectNextDecisiveQuestionSkill } from '../skills/selectNextDecisiveQuestion.js';
import { normalizeMortgageOffersSkill } from '../skills/normalizeMortgageOffers.js';
import { explainMortgageTradeoffsSkill } from '../skills/explainMortgageTradeoffs.js';
import { assessUserUnderstandingSkill } from '../skills/assessUserUnderstanding.js';

import { profilePropertyAgent } from '../agents/profilePropertyAgent.js';
import { offerClarityAgent } from '../agents/offerClarityAgent.js';

export interface Runtime {
  registry: Registry;
  events: EventBus;
  artifacts: ArtifactStore;
  store: RunStore;
  orchestrator: MortgageJourneyOrchestrator;
}

/**
 * Composizione unica del runtime: tutto passa dal registry.
 * Nessun componente viene istanziato altrove.
 */
export function buildRuntime(): Runtime {
  const events = new EventBus();
  const artifacts = new ArtifactStore();
  const registry = new Registry(events, artifacts);
  const store = new RunStore();

  // tool deterministici
  registry.register(mortgageCalculatorTool);
  registry.register(affordabilityScenarioEngineTool);
  registry.register(offerSchemaValidatorTool);
  registry.register(metricsEngineTool);
  registry.register(safetyGuardTool);

  // skill riutilizzabili
  registry.register(buildFinancialProfileSkill);
  registry.register(selectNextDecisiveQuestionSkill);
  registry.register(normalizeMortgageOffersSkill);
  registry.register(explainMortgageTradeoffsSkill);
  registry.register(assessUserUnderstandingSkill);

  // agenti specialisti
  registry.register(profilePropertyAgent);
  registry.register(offerClarityAgent);

  const orchestrator = new MortgageJourneyOrchestrator(registry, store, events);

  return { registry, events, artifacts, store, orchestrator };
}

export const EXPECTED_COMPONENTS = [
  'MortgageCalculator',
  'AffordabilityScenarioEngine',
  'OfferSchemaValidator',
  'MetricsEngine',
  'SafetyGuard',
  'build-financial-profile',
  'select-next-decisive-question',
  'normalize-mortgage-offers',
  'explain-mortgage-tradeoffs',
  'assess-user-understanding',
  'profile-property-agent',
  'offer-clarity-agent',
] as const;
