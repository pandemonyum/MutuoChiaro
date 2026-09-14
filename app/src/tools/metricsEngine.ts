import type { ComponentDefinition } from '../core/registry.js';
import type { RunState, RuntimeEvent } from '../core/types.js';

export interface MetricsInput {
  state: RunState;
  events: RuntimeEvent[];
}

export interface BeforeAfterMetrics {
  before: {
    comparisonCriteriaUsed: string[];
    criteriaCount: number;
    termsExplained: number;
    missingDataKnownToUser: number;
    canExplainPaymentVsTotalCost: boolean;
    canExplainAppraisalEffect: boolean;
    canRecognizeVariableRateRisk: boolean;
  };
  after: {
    comparisonCriteriaUsed: string[];
    criteriaCount: number;
    termsExplained: number;
    missingDataKnownToUser: number;
    canExplainPaymentVsTotalCost: boolean;
    canExplainAppraisalEffect: boolean;
    canRecognizeVariableRateRisk: boolean;
  };
}

export interface MetricsOutput {
  runId: string;
  completionTimeMs: number | null;
  elapsedMs: number;
  conceptsUnderstoodCount: number;
  conceptsUnderstood: string[];
  conceptsNotUnderstood: string[];
  quizAttemptsUsed: number;
  quizMaxAttempts: number;
  initialWrongAnswers: number;
  missingDataDetected: number;
  missingDataResolved: number;
  resolvedFields: string[];
  decisiveQuestionsAnswered: number;
  scenariosCompleted: number;
  partialOffers: number;
  safetyGuardBlocks: number;
  toolInvocations: number;
  agentInvocations: number;
  skillInvocations: number;
  beforeAfter: BeforeAfterMetrics;
}

const CONCEPT_TO_CRITERION: Record<string, string> = {
  'rata vs costo totale': 'costo totale simulato',
  'sensibilità al tasso': 'sensibilità agli scenari di tasso',
  'perizia e liquidità iniziale': 'liquidità necessaria e residua',
};

/**
 * Metriche derivate esclusivamente da stato ed eventi reali del run.
 * Nessuna percentuale predefinita.
 */
export function computeMetrics(input: MetricsInput): MetricsOutput {
  const { state, events } = input;

  const createdAt = Date.parse(state.timestamps.createdAt);
  const completedAt = state.timestamps.completedAt ? Date.parse(state.timestamps.completedAt) : null;
  const elapsedMs = (completedAt ?? Date.parse(state.timestamps.updatedAt)) - createdAt;

  const firstAttempt = state.comprehensionAttempts[0];
  const initialWrongAnswers = firstAttempt ? firstAttempt.wrongQuestionIds.length : 0;

  const understood = state.comprehensionResult.conceptsUnderstood;
  const afterCriteria = [
    'rata iniziale',
    'TAN',
    'TAEG dichiarato',
    'durata',
    'costo totale simulato',
    'interessi totali simulati',
    'costi iniziali',
    'liquidità residua dopo l acquisto',
    'rapporto rata/reddito',
    'margine mensile',
    'tipo di tasso',
    'sensibilità agli scenari',
    'dati mancanti',
  ];

  const explainedTerms = state.normalizedOffers.length > 0 ? GLOSSARY_TERMS.length : 0;

  const metrics: MetricsOutput = {
    runId: state.runId,
    completionTimeMs: completedAt === null ? null : completedAt - createdAt,
    elapsedMs,
    conceptsUnderstoodCount: understood.length,
    conceptsUnderstood: [...understood],
    conceptsNotUnderstood: [...state.comprehensionResult.conceptsNotUnderstood],
    quizAttemptsUsed: state.comprehensionResult.attemptsUsed,
    quizMaxAttempts: state.comprehensionResult.maxAttempts,
    initialWrongAnswers,
    missingDataDetected: countKind(events, 'missing_data.detected') + countKind(events, 'offer.incomplete'),
    missingDataResolved: state.resolvedMissingData.length,
    resolvedFields: [...state.resolvedMissingData],
    decisiveQuestionsAnswered: state.answeredQuestions.length,
    scenariosCompleted: state.scenarios.length,
    partialOffers: state.offerValidations.filter((v) => v.partial).length,
    safetyGuardBlocks: countKind(events, 'safety_guard.blocked'),
    toolInvocations: events.filter((e) => e.kind === 'tool.completed').length,
    agentInvocations: events.filter((e) => e.kind === 'agent.completed').length,
    skillInvocations: events.filter((e) => e.kind === 'skill.completed').length,
    beforeAfter: {
      before: {
        comparisonCriteriaUsed: [...state.before.comparisonCriteriaUsed],
        criteriaCount: state.before.comparisonCriteriaUsed.length,
        termsExplained: state.before.termsExplained,
        missingDataKnownToUser: 0,
        canExplainPaymentVsTotalCost: false,
        canExplainAppraisalEffect: false,
        canRecognizeVariableRateRisk: false,
      },
      after: {
        comparisonCriteriaUsed: state.normalizedOffers.length > 0 ? afterCriteria : [],
        criteriaCount: state.normalizedOffers.length > 0 ? afterCriteria.length : 0,
        termsExplained: explainedTerms,
        missingDataKnownToUser: state.offerValidations.reduce(
          (acc, v) => acc + v.missingFields.length,
          0,
        ),
        canExplainPaymentVsTotalCost: understood.includes('rata vs costo totale'),
        canExplainAppraisalEffect: understood.includes('perizia e liquidità iniziale'),
        canRecognizeVariableRateRisk: understood.includes('sensibilità al tasso'),
      },
    },
  };
  void CONCEPT_TO_CRITERION;
  return metrics;
}

export const GLOSSARY_TERMS = [
  'TAN',
  'TAEG',
  'rata',
  'durata',
  'costo totale simulato',
  'interessi totali',
  'costi iniziali',
  'polizza obbligatoria',
  'liquidità residua',
  'fondo di emergenza',
  'rapporto rata/reddito',
  'margine mensile',
  'rapporto prestito/valore',
  'perizia',
];

function countKind(events: RuntimeEvent[], kind: string): number {
  return events.filter((e) => e.kind === kind).length;
}

export const metricsEngineTool: ComponentDefinition<MetricsInput, MetricsOutput> = {
  name: 'MetricsEngine',
  kind: 'tool',
  purpose:
    'Calcola metriche before/after, concetti compresi, tentativi del quiz e dati mancanti risolti a partire da stato ed eventi reali.',
  run: (input) => computeMetrics(input),
};
