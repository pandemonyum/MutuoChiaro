/**
 * MutuoChiaro - tipi condivisi del runtime.
 * Tutti i dati di dominio sono SINTETICI e a scopo educativo.
 */

/** Provenienza obbligatoria di ogni numero mostrato in UI. */
export type Provenance =
  | 'USER_INPUT'
  | 'SYNTHETIC_OFFER'
  | 'CALCULATED'
  | 'SCENARIO_ASSUMPTION'
  | 'MISSING';

/** Valore tracciato: numero + provenienza + eventuale nota. */
export interface Traced<T = number> {
  value: T | null;
  provenance: Provenance;
  note?: string;
}

export const PHASES = [
  'START',
  'PROFILE_INCOMPLETE',
  'PROFILE_READY',
  'OFFERS_INCOMPLETE',
  'OFFERS_NORMALIZED',
  'SCENARIOS_READY',
  'UNDERSTANDING_CHECK',
  'AWAITING_HUMAN_CONFIRMATION',
  'COMPLETED',
  'ESCALATED',
] as const;
export type Phase = (typeof PHASES)[number];

export const EVENT_KINDS = [
  'run.started',
  'state.changed',
  'state.transition_rejected',
  'handoff.started',
  'handoff.completed',
  'agent.started',
  'agent.completed',
  'agent.failed',
  'skill.started',
  'skill.completed',
  'skill.failed',
  'tool.started',
  'tool.completed',
  'tool.failed',
  'missing_data.detected',
  'question.selected',
  'offer.incomplete',
  'scenario.completed',
  'safety_guard.blocked',
  'understanding.failed',
  'understanding.passed',
  'human_approval.required',
  'human_approval.received',
  'run.completed',
  'run.escalated',
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export type ComponentKind = 'agent' | 'skill' | 'tool';

export interface RuntimeEvent {
  seq: number;
  runId: string;
  ts: string;
  kind: EventKind;
  actor: string;
  actorKind: ComponentKind | 'orchestrator' | 'human' | 'system';
  status: 'started' | 'completed' | 'failed' | 'info';
  message: string;
  inputRef?: string;
  outputRef?: string;
  durationMs?: number;
  phaseAfter?: Phase;
}

/** Busta standard restituita da ogni agente (contratto). */
export interface AgentEnvelope<TOut = unknown> {
  agent: string;
  status: 'success' | 'needs-data' | 'human-review' | 'fallback';
  output: TOut;
  evidence: string[];
  issues: string[];
  prohibitionsRespected: string[];
  confidence: number;
  nextAction: string;
  doneCondition: string;
}

// ---------------------------------------------------------------- profilo

export interface FinancialProfile {
  /** Persona sintetica, non una persona reale. */
  personaName: string;
  syntheticData: true;
  monthlyNetIncome: number | null;
  otherMonthlyIncome: number | null;
  /** null = non dichiarato: attiva la prossima domanda decisiva. */
  existingMonthlyDebts: number | null;
  savings: number | null;
  emergencyFundMin: number | null;
}

export interface PropertyPlan {
  price: number | null;
  accessoryCosts: number | null;
  plannedWorks: number | null;
  requestedLoanAmount: number | null;
  assumedYears: number | null;
  firstHome: boolean;
}

export type IssueCode =
  | 'MISSING'
  | 'NEGATIVE'
  | 'ZERO_INCOME'
  | 'OUT_OF_RANGE'
  | 'INCONSISTENT'
  | 'NOT_A_NUMBER';

export interface FieldIssue {
  field: string;
  code: IssueCode;
  message: string;
  /** Peso dell'impatto sul confronto fra offerte (0-1). */
  decisionImpact: number;
}

export interface DecisiveQuestion {
  id: string;
  field: string;
  question: string;
  why: string;
  inputType: 'number' | 'boolean';
  unit?: string;
  decisionImpact: number;
}

// ---------------------------------------------------------------- offerte

export type RateType = 'FIXED' | 'VARIABLE';

/** Offerta sintetica. null su un campo = dato assente, mai inventato. */
export interface MortgageOffer {
  id: string;
  displayName: string;
  syntheticData: true;
  amount: number | null;
  years: number | null;
  rateType: RateType | null;
  tanPct: number | null;
  declaredTaegPct: number | null;
  declaredInitialPayment: number | null;
  arrangementFee: number | null;
  appraisalFee: number | null;
  otherUpfrontCosts: number | null;
  insuranceRequired: boolean | null;
  insuranceCost: number | null;
  recurringMonthlyCost: number | null;
  maxLtvPct: number | null;
  /** Provenienza dichiarata campo per campo. */
  provenance: Record<string, Provenance>;
  notes?: string;
}

export interface OfferValidation {
  offerId: string;
  valid: boolean;
  /** true = usabile solo per confronti parziali. */
  partial: boolean;
  missingFields: string[];
  inconsistencies: FieldIssue[];
  typeErrors: FieldIssue[];
  blockedComparisons: string[];
  availableComparisons: string[];
  questionForBank: string | null;
}

export interface NormalizedOffer {
  offerId: string;
  displayName: string;
  rateType: RateType | null;
  partial: boolean;
  missingFields: string[];
  rows: Record<string, Traced>;
  /** Testo neutrale prodotto dall'Offer Clarity Agent e filtrato da SafetyGuard. */
  tradeoffNote?: string;
}

// ---------------------------------------------------------------- scenari

export type ScenarioId =
  | 'BASE'
  | 'APPRAISAL_MINUS_10'
  | 'RATE_PLUS_2PP'
  | 'INCOME_MINUS_20_6M';

export interface ScenarioOfferResult {
  offerId: string;
  displayName: string;
  applicable: boolean;
  partial: boolean;
  monthlyPayment: Traced;
  paymentToIncomePct: Traced;
  monthlyMargin: Traced;
  liquidityNeeded: Traced;
  liquidityRemaining: Traced;
  emergencyFundBreach: boolean | null;
  totalCostSimulated: Traced;
  totalInterestSimulated: Traced;
  deltaVsBase?: Record<string, number | null>;
}

export interface ScenarioResult {
  scenarioId: ScenarioId;
  label: string;
  assumptions: string[];
  warnings: string[];
  offers: ScenarioOfferResult[];
}

// ---------------------------------------------------------------- quiz

export interface QuizQuestion {
  id: string;
  concept: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  /** Spiegazione mirata mostrata in caso di errore. */
  misconceptionFeedback: string;
  reopenScenario: ScenarioId;
}

export interface QuizAttemptRecord {
  attempt: number;
  ts: string;
  answers: Record<string, string>;
  wrongQuestionIds: string[];
  passed: boolean;
}

export type ComprehensionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PASSED' | 'NOT_VERIFIED';

export interface ComprehensionFeedback {
  questionId: string;
  concept: string;
  explanation: string;
  reopenScenario: ScenarioId;
}

export interface ComprehensionResult {
  status: ComprehensionStatus;
  attemptsUsed: number;
  maxAttempts: number;
  conceptsUnderstood: string[];
  conceptsNotUnderstood: string[];
  feedback: ComprehensionFeedback[];
}

// ---------------------------------------------------------------- stato

export interface HumanApproval {
  required: boolean;
  received: boolean;
  statement: string;
  receivedAt: string | null;
  actor: string | null;
}

export interface BeforeSnapshot {
  question: string;
  answer: string;
  comparisonCriteriaUsed: string[];
  offersShownRaw: number;
  termsExplained: number;
}

export interface RunState {
  runId: string;
  currentPhase: Phase;
  syntheticProfile: FinancialProfile;
  property: PropertyPlan;
  offers: MortgageOffer[];
  offerValidations: OfferValidation[];
  normalizedOffers: NormalizedOffer[];
  missingData: FieldIssue[];
  resolvedMissingData: string[];
  selectedQuestion: DecisiveQuestion | null;
  answeredQuestions: string[];
  questionRounds: number;
  maxQuestionRounds: number;
  scenarios: ScenarioResult[];
  comprehensionAttempts: QuizAttemptRecord[];
  comprehensionResult: ComprehensionResult;
  warnings: string[];
  confidence: number;
  artifactReferences: string[];
  humanApproval: HumanApproval;
  before: BeforeSnapshot;
  escalation: { escalated: boolean; reason: string | null };
  timestamps: { createdAt: string; updatedAt: string; completedAt: string | null };
}
