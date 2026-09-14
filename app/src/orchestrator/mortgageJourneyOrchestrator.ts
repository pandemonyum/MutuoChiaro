import { randomUUID } from 'node:crypto';
import { EventBus } from '../core/eventBus.js';
import { Registry } from '../core/registry.js';
import { RunStore } from '../core/runStore.js';
import { IllegalTransitionError, ValidationError } from '../core/errors.js';
import {
  HUMAN_GATE_PHASE,
  HUMAN_GATE_STATEMENT,
  completionBlockers,
  isLegalTransition,
} from '../core/stateMachine.js';
import type {
  AgentEnvelope,
  EventKind,
  MortgageOffer,
  Phase,
  RunState,
  ScenarioId,
  ScenarioResult,
} from '../core/types.js';
import { ANDREA_BEFORE, ANDREA_PROFILE, ANDREA_PROPERTY } from '../data/syntheticPersona.js';
import { buildSyntheticOffers } from '../data/syntheticOffers.js';
import { MAX_QUIZ_ATTEMPTS } from '../data/quizBank.js';
import type {
  ProfileAgentInput,
  ProfileAgentOutput,
} from '../agents/profilePropertyAgent.js';
import type { ClarityAgentInput, ClarityAgentOutput } from '../agents/offerClarityAgent.js';
import type {
  OfferValidatorInput,
  OfferValidatorOutput,
} from '../tools/offerSchemaValidator.js';
import type { NormalizeInput, NormalizeOutput } from '../skills/normalizeMortgageOffers.js';
import type { ScenarioInput } from '../tools/affordabilityScenarioEngine.js';
import type { AssessInput, AssessOutput } from '../skills/assessUserUnderstanding.js';
import type { MetricsInput, MetricsOutput } from '../tools/metricsEngine.js';

const TOKEN = RunStore.token;
const MAX_QUESTION_ROUNDS = 3;
const ALL_SCENARIOS: ScenarioId[] = [
  'BASE',
  'APPRAISAL_MINUS_10',
  'RATE_PLUS_2PP',
  'INCOME_MINUS_20_6M',
];

export interface ProfilePatch {
  monthlyNetIncome?: number | null;
  otherMonthlyIncome?: number | null;
  existingMonthlyDebts?: number | null;
  savings?: number | null;
  emergencyFundMin?: number | null;
  price?: number | null;
  accessoryCosts?: number | null;
  plannedWorks?: number | null;
  requestedLoanAmount?: number | null;
  assumedYears?: number | null;
}

export interface OrchestratorView {
  state: RunState;
  clarity: ClarityAgentOutput | null;
  profileAgent: ProfileAgentOutput | null;
  metrics: MetricsOutput | null;
  nextAction: string;
  completionBlockers: string[];
  humanGateStatement: string;
}

/**
 * Mortgage Journey Orchestrator.
 *
 * Unico componente autorizzato a:
 *  - mantenere e aggiornare lo stato globale;
 *  - decidere quale agente, skill o tool invocare;
 *  - applicare le transizioni di fase legali;
 *  - contare i tentativi e imporre i limiti;
 *  - richiedere il gate umano e impedire il completamento prematuro.
 */
export class MortgageJourneyOrchestrator {
  private readonly clarityByRun = new Map<string, ClarityAgentOutput>();
  private readonly profileByRun = new Map<string, ProfileAgentOutput>();
  private readonly metricsByRun = new Map<string, MetricsOutput>();

  constructor(
    private readonly registry: Registry,
    private readonly store: RunStore,
    private readonly events: EventBus,
  ) {}

  // ------------------------------------------------------------------ run

  createRun(runId = `run-${randomUUID().slice(0, 8)}`): RunState {
    const now = new Date().toISOString();
    const state: RunState = {
      runId,
      currentPhase: 'START',
      syntheticProfile: { ...ANDREA_PROFILE },
      property: { ...ANDREA_PROPERTY },
      offers: buildSyntheticOffers(),
      offerValidations: [],
      normalizedOffers: [],
      missingData: [],
      resolvedMissingData: [],
      selectedQuestion: null,
      answeredQuestions: [],
      questionRounds: 0,
      maxQuestionRounds: MAX_QUESTION_ROUNDS,
      scenarios: [],
      comprehensionAttempts: [],
      comprehensionResult: {
        status: 'NOT_STARTED',
        attemptsUsed: 0,
        maxAttempts: MAX_QUIZ_ATTEMPTS,
        conceptsUnderstood: [],
        conceptsNotUnderstood: [],
        feedback: [],
      },
      warnings: [],
      confidence: 0,
      artifactReferences: [],
      humanApproval: {
        required: true,
        received: false,
        statement: HUMAN_GATE_STATEMENT,
        receivedAt: null,
        actor: null,
      },
      before: { ...ANDREA_BEFORE, comparisonCriteriaUsed: [...ANDREA_BEFORE.comparisonCriteriaUsed] },
      escalation: { escalated: false, reason: null },
      timestamps: { createdAt: now, updatedAt: now, completedAt: null },
    };
    this.store.create(state);
    this.events.emit({
      runId,
      kind: 'run.started',
      actor: 'MortgageJourneyOrchestrator',
      actorKind: 'orchestrator',
      status: 'info',
      message: 'Run avviato con persona e offerte sintetiche.',
      phaseAfter: 'START',
    });
    return this.store.snapshot(runId) as RunState;
  }

  /**
   * Vista di sola lettura. Non invoca componenti: le metriche sono quelle
   * calcolate dall ultima azione, così una lettura non altera la traccia.
   */
  view(runId: string): OrchestratorView {
    const state = this.store.snapshot(runId) as RunState;
    return {
      state,
      clarity: this.clarityByRun.get(runId) ?? null,
      profileAgent: this.profileByRun.get(runId) ?? null,
      metrics: this.metricsByRun.get(runId) ?? null,
      nextAction: this.suggestNextAction(state),
      completionBlockers: completionBlockers(state),
      humanGateStatement: HUMAN_GATE_STATEMENT,
    };
  }

  /**
   * Vista restituita dopo un avanzamento reale: qui le metriche vengono
   * ricalcolate invocando MetricsEngine dal registry, e l invocazione compare
   * nella traccia perché corrisponde a un vero passo del run.
   */
  private viewAfterAction(runId: string): OrchestratorView {
    const state = this.store.snapshot(runId) as RunState;
    const metrics = this.safeMetrics(runId, state);
    if (metrics) this.metricsByRun.set(runId, metrics);
    return this.view(runId);
  }

  // ------------------------------------------------------- fase A: profilo

  updateProfile(runId: string, patch: ProfilePatch): OrchestratorView {
    this.assertActive(runId);
    this.store.mutate(runId, TOKEN, (draft) => {
      applyPatch(draft, patch);
    });
    return this.runProfileStep(runId, 'Profilo aggiornato dall utente.');
  }

  /** Risposta alla prossima domanda decisiva. */
  answerDecisiveQuestion(runId: string, field: string, value: number | null): OrchestratorView {
    this.assertActive(runId);
    const current = this.store.snapshot(runId);
    if (!current.selectedQuestion || current.selectedQuestion.field !== field) {
      this.rejectTransition(
        runId,
        current.currentPhase,
        current.currentPhase,
        `Risposta a una domanda non attiva: ${field}`,
      );
      throw new ValidationError('Nessuna domanda attiva per questo campo.', [
        { field, code: 'INCONSISTENT', message: 'La domanda indicata non è quella attiva.' },
      ]);
    }
    this.store.mutate(runId, TOKEN, (draft) => {
      applyPatch(draft, { [field]: value } as ProfilePatch);
      draft.answeredQuestions.push(field);
      if (!draft.resolvedMissingData.includes(field)) draft.resolvedMissingData.push(field);
      draft.selectedQuestion = null;
      draft.questionRounds += 1;
    });
    const view = this.runProfileStep(runId, `Risposta registrata per ${field}.`);
    // Il confronto viene ricalcolato subito dopo la risposta.
    if (this.store.snapshot(runId).currentPhase === 'PROFILE_READY') {
      return this.normalizeOffers(runId);
    }
    return view;
  }

  private runProfileStep(runId: string, reason: string): OrchestratorView {
    const snapshot = this.store.snapshot(runId);
    const input: ProfileAgentInput = {
      profile: snapshot.syntheticProfile,
      property: snapshot.property,
      offerValidations: [...snapshot.offerValidations],
      answeredQuestions: [...snapshot.answeredQuestions],
      questionRounds: snapshot.questionRounds,
      maxQuestionRounds: snapshot.maxQuestionRounds,
      offerNames: snapshot.offers.map((o) => ({ offerId: o.id, displayName: o.displayName })),
    };

    const envelope = this.handoff<ProfileAgentInput, AgentEnvelope<ProfileAgentOutput>>(
      runId,
      'profile-property-agent',
      input,
      reason,
    );

    this.profileByRun.set(runId, envelope.output);

    this.store.mutate(runId, TOKEN, (draft) => {
      draft.missingData = envelope.output.issues;
      draft.selectedQuestion = envelope.output.question;
      draft.confidence = envelope.confidence;
      for (const issue of envelope.issues) {
        if (!draft.warnings.includes(issue)) draft.warnings.push(issue);
      }
    });

    if (envelope.status === 'human-review') {
      this.escalate(runId, `Dati di profilo non validi: ${envelope.issues.join('; ')}`);
      return this.viewAfterAction(runId);
    }

    const ready = envelope.output.question === null;
    this.applyTransition(
      runId,
      ready ? 'PROFILE_READY' : 'PROFILE_INCOMPLETE',
      ready
        ? 'Nessun dato mancante con impatto sul confronto.'
        : `Dato mancante rilevato: ${envelope.output.question?.field}`,
    );
    return this.viewAfterAction(runId);
  }

  // -------------------------------------------- fasi C e D: offerte e specchio

  editOffer(runId: string, offerId: string, patch: Partial<MortgageOffer>): OrchestratorView {
    this.assertActive(runId);
    const snapshot = this.store.snapshot(runId);
    if (!snapshot.offers.some((o) => o.id === offerId)) {
      throw new ValidationError(`Offerta inesistente: ${offerId}`, [
        { field: 'offerId', code: 'INCONSISTENT', message: 'Identificativo offerta non valido.' },
      ]);
    }
    this.store.mutate(runId, TOKEN, (draft) => {
      const offer = draft.offers.find((o) => o.id === offerId)!;
      for (const [key, value] of Object.entries(patch)) {
        if (key === 'id' || key === 'syntheticData' || key === 'provenance') continue;
        (offer as unknown as Record<string, unknown>)[key] = value;
        // Un valore modificato a mano non è più un dato dell offerta.
        offer.provenance[key] = value === null ? 'MISSING' : 'USER_INPUT';
      }
      // L offerta modificata torna in validazione: le fasi successive si rifanno.
      draft.scenarios = [];
      draft.normalizedOffers = [];
    });
    if (isLegalTransition(this.store.snapshot(runId).currentPhase, 'OFFERS_INCOMPLETE')) {
      this.applyTransition(runId, 'OFFERS_INCOMPLETE', `Offerta ${offerId} modificata a mano.`);
    }
    return this.normalizeOffers(runId);
  }

  normalizeOffers(runId: string): OrchestratorView {
    this.assertActive(runId);
    const snapshot = this.store.snapshot(runId);

    const validation = this.registry.invoke<OfferValidatorInput, OfferValidatorOutput>(
      runId,
      'OfferSchemaValidator',
      { offers: [...snapshot.offers] },
    );

    this.store.mutate(runId, TOKEN, (draft) => {
      draft.offerValidations = validation.validations;
    });

    for (const v of validation.validations) {
      if (v.missingFields.length === 0 && v.typeErrors.length === 0) continue;
      const name = snapshot.offers.find((o) => o.id === v.offerId)?.displayName ?? v.offerId;
      this.emitOrchestrator(
        runId,
        'offer.incomplete',
        `${name}: campi assenti [${v.missingFields.join(', ')}]. ` +
          `Confronti non possibili: [${v.blockedComparisons.join(', ')}]. ` +
          (v.questionForBank ? `Domanda per la banca: ${v.questionForBank}` : ''),
      );
    }

    if (validation.validations.every((v) => !v.valid && !v.partial)) {
      this.escalate(runId, 'Nessuna offerta utilizzabile: dati essenziali assenti su tutte.');
      return this.viewAfterAction(runId);
    }

    if (validation.anyPartial) {
      const from = this.store.snapshot(runId).currentPhase;
      if (isLegalTransition(from, 'OFFERS_INCOMPLETE')) {
        this.applyTransition(
          runId,
          'OFFERS_INCOMPLETE',
          'Almeno un offerta è utilizzabile solo per confronti parziali.',
        );
      }
    }

    const normalized = this.registry.invoke<NormalizeInput, NormalizeOutput>(
      runId,
      'normalize-mortgage-offers',
      {
        profile: snapshot.syntheticProfile,
        property: snapshot.property,
        offers: [...snapshot.offers],
        validations: validation.validations,
      },
    );

    this.store.mutate(runId, TOKEN, (draft) => {
      draft.normalizedOffers = normalized.normalized;
      draft.scenarios = [normalized.baseScenario];
    });
    this.emitOrchestrator(
      runId,
      'scenario.completed',
      `Scenario base completato su ${normalized.baseScenario.offers.length} offerte.`,
    );

    this.applyTransition(
      runId,
      'OFFERS_NORMALIZED',
      'Tutte le offerte riportate sullo stesso schema di righe.',
    );
    this.refreshClarity(runId);
    return this.viewAfterAction(runId);
  }

  // ------------------------------------------------------- fase E: scenari

  runScenarios(runId: string, scenarioIds: ScenarioId[] = ALL_SCENARIOS): OrchestratorView {
    this.assertActive(runId);
    const snapshot = this.store.snapshot(runId);
    if (snapshot.normalizedOffers.length === 0) {
      throw new ValidationError('Gli scenari richiedono offerte normalizzate.', [
        { field: 'normalizedOffers', code: 'MISSING', message: 'Normalizza prima le offerte.' },
      ]);
    }

    const results: ScenarioResult[] = [];
    for (const scenarioId of scenarioIds) {
      const result = this.registry.invoke<ScenarioInput, ScenarioResult>(
        runId,
        'AffordabilityScenarioEngine',
        {
          scenarioId,
          profile: snapshot.syntheticProfile,
          property: snapshot.property,
          offers: [...snapshot.offers],
          validations: [...snapshot.offerValidations],
        },
      );
      results.push(result);
      this.emitOrchestrator(
        runId,
        'scenario.completed',
        `${result.label}: ${result.offers.filter((o) => o.applicable).length} offerte calcolate, ${result.warnings.length} avvertenze.`,
      );
    }

    this.store.mutate(runId, TOKEN, (draft) => {
      draft.scenarios = results;
      for (const r of results) {
        for (const w of r.warnings) {
          if (!draft.warnings.includes(w)) draft.warnings.push(w);
        }
      }
    });

    this.applyTransition(runId, 'SCENARIOS_READY', `${results.length} scenari calcolati.`);
    this.refreshClarity(runId);
    return this.viewAfterAction(runId);
  }

  // -------------------------------------------------- fase F: comprensione

  startUnderstandingCheck(runId: string): OrchestratorView {
    this.assertActive(runId);
    this.applyTransition(runId, 'UNDERSTANDING_CHECK', 'Avvio del controllo di comprensione.');
    return this.viewAfterAction(runId);
  }

  submitQuiz(runId: string, answers: Record<string, string>): OrchestratorView {
    this.assertActive(runId);
    const snapshot = this.store.snapshot(runId);
    if (snapshot.currentPhase !== 'UNDERSTANDING_CHECK') {
      this.rejectTransition(
        runId,
        snapshot.currentPhase,
        'UNDERSTANDING_CHECK',
        'Il controllo di comprensione non è la fase corrente.',
      );
      throw new IllegalTransitionError(
        snapshot.currentPhase,
        'UNDERSTANDING_CHECK',
        'Il controllo di comprensione non è stato avviato.',
      );
    }
    if (snapshot.comprehensionAttempts.length >= MAX_QUIZ_ATTEMPTS) {
      throw new ValidationError('Limite di tentativi già raggiunto.', [
        {
          field: 'attempts',
          code: 'OUT_OF_RANGE',
          message: `Sono consentiti al massimo ${MAX_QUIZ_ATTEMPTS} tentativi.`,
        },
      ]);
    }

    const assessment = this.registry.invoke<AssessInput, AssessOutput>(
      runId,
      'assess-user-understanding',
      { answers, previousAttempts: [...snapshot.comprehensionAttempts] },
    );

    this.store.mutate(runId, TOKEN, (draft) => {
      draft.comprehensionAttempts.push(assessment.attempt);
      draft.comprehensionResult = assessment.result;
    });

    if (assessment.attempt.passed) {
      this.emitOrchestrator(
        runId,
        'understanding.passed',
        `Controllo superato al tentativo ${assessment.attempt.attempt}. Concetti verificati: ${assessment.result.conceptsUnderstood.join(', ')}.`,
      );
      this.requireHumanApproval(runId);
      return this.viewAfterAction(runId);
    }

    this.emitOrchestrator(
      runId,
      'understanding.failed',
      `Tentativo ${assessment.attempt.attempt} non superato su ${assessment.attempt.wrongQuestionIds.join(', ')}. Tentativi residui: ${assessment.attemptsLeft}.`,
    );

    if (assessment.limitReached) {
      this.store.mutate(runId, TOKEN, (draft) => {
        const note =
          'Comprensione non verificata dopo il numero massimo di tentativi: i risultati restano consultabili.';
        if (!draft.warnings.includes(note)) draft.warnings.push(note);
      });
      this.refreshClarity(runId);
      this.requireHumanApproval(runId);
      return this.viewAfterAction(runId);
    }

    // Errore con tentativi residui: si riaprono gli scenari pertinenti.
    this.refreshClarity(runId);
    this.applyTransition(
      runId,
      'UNDERSTANDING_CHECK',
      `Nuovo tentativo consentito, scenari da riaprire: ${assessment.reopenScenarios.join(', ')}.`,
    );
    return this.viewAfterAction(runId);
  }

  // -------------------------------------------------- fase G: gate umano

  private requireHumanApproval(runId: string): void {
    this.applyTransition(
      runId,
      HUMAN_GATE_PHASE,
      'Controllo di comprensione eseguito: serve la conferma esplicita dell utente.',
    );
    this.emitOrchestrator(
      runId,
      'human_approval.required',
      `Conferma richiesta: "${HUMAN_GATE_STATEMENT}"`,
    );
  }

  /**
   * Gate umano reale: senza questa chiamata il run non può entrare in COMPLETED.
   * Una richiesta in fase sbagliata viene rifiutata e resta osservabile.
   */
  confirmHumanApproval(runId: string, confirmed: boolean, actor: string): OrchestratorView {
    const snapshot = this.store.snapshot(runId);

    if (snapshot.currentPhase !== HUMAN_GATE_PHASE) {
      this.rejectTransition(
        runId,
        snapshot.currentPhase,
        'COMPLETED',
        `Approvazione richiesta nella fase ${snapshot.currentPhase}: consentita solo da ${HUMAN_GATE_PHASE}.`,
      );
      throw new IllegalTransitionError(
        snapshot.currentPhase,
        'COMPLETED',
        `L approvazione umana è consentita solo dalla fase ${HUMAN_GATE_PHASE}.`,
      );
    }

    if (!confirmed) {
      this.store.mutate(runId, TOKEN, (draft) => {
        const note = 'Conferma finale non rilasciata: il run resta aperto.';
        if (!draft.warnings.includes(note)) draft.warnings.push(note);
      });
      return this.viewAfterAction(runId);
    }

    this.store.mutate(runId, TOKEN, (draft) => {
      draft.humanApproval.received = true;
      draft.humanApproval.receivedAt = new Date().toISOString();
      draft.humanApproval.actor = actor;
    });
    this.emitOrchestrator(
      runId,
      'human_approval.received',
      `Conferma ricevuta da ${actor} sulla dichiarazione di natura educativa e sintetica della simulazione.`,
    );

    const blockers = completionBlockers(this.store.snapshot(runId) as RunState);
    if (blockers.length > 0) {
      this.store.mutate(runId, TOKEN, (draft) => {
        for (const b of blockers) if (!draft.warnings.includes(b)) draft.warnings.push(b);
      });
      this.rejectTransition(
        runId,
        snapshot.currentPhase,
        'COMPLETED',
        `Requisiti non soddisfatti: ${blockers.join(' ')}`,
      );
      throw new IllegalTransitionError(
        snapshot.currentPhase,
        'COMPLETED',
        `Requisiti di completamento non soddisfatti: ${blockers.join(' ')}`,
      );
    }

    this.store.mutate(runId, TOKEN, (draft) => {
      draft.timestamps.completedAt = new Date().toISOString();
    });
    this.applyTransition(runId, 'COMPLETED', 'Conferma umana ricevuta e requisiti soddisfatti.');
    this.emitOrchestrator(runId, 'run.completed', 'Run completato.');
    return this.viewAfterAction(runId);
  }

  // ------------------------------------------------------ failure branches

  /** Inietta una bozza non conforme per dimostrare SafetyGuard sul percorso reale. */
  injectNonCompliantDraft(runId: string, draft: string): OrchestratorView {
    this.assertActive(runId);
    this.refreshClarity(runId, [draft]);
    return this.viewAfterAction(runId);
  }

  /** Disattiva un componente per dimostrare il ramo "tool non disponibile". */
  simulateComponentOutage(runId: string, componentName: string): OrchestratorView {
    this.assertActive(runId);
    this.registry.disable(componentName);
    try {
      this.runScenarios(runId, ['RATE_PLUS_2PP']);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.escalate(runId, `Componente non disponibile durante il calcolo scenari: ${message}`);
    } finally {
      this.registry.enable(componentName);
    }
    return this.viewAfterAction(runId);
  }

  escalate(runId: string, reason: string): void {
    this.store.mutate(runId, TOKEN, (draft) => {
      draft.escalation = { escalated: true, reason };
      if (!draft.warnings.includes(reason)) draft.warnings.push(reason);
    });
    this.applyTransition(runId, 'ESCALATED', reason);
    this.emitOrchestrator(runId, 'run.escalated', reason);
  }

  // ------------------------------------------------------------- interni

  /** Handoff osservabile orchestratore -> agente. */
  private handoff<I, O>(runId: string, agentName: string, input: I, reason: string): O {
    this.events.emit({
      runId,
      kind: 'handoff.started',
      actor: `MortgageJourneyOrchestrator -> ${agentName}`,
      actorKind: 'orchestrator',
      status: 'started',
      message: reason,
      phaseAfter: this.store.snapshot(runId).currentPhase,
    });
    const output = this.registry.invoke<I, O>(runId, agentName, input);
    const envelope = output as unknown as AgentEnvelope;
    this.events.emit({
      runId,
      kind: 'handoff.completed',
      actor: `${agentName} -> MortgageJourneyOrchestrator`,
      actorKind: 'orchestrator',
      status: 'completed',
      message: `status=${envelope.status} confidence=${envelope.confidence} nextAction=${envelope.nextAction}`,
      phaseAfter: this.store.snapshot(runId).currentPhase,
    });
    return output;
  }

  private refreshClarity(runId: string, injectedDrafts?: string[]): void {
    const snapshot = this.store.snapshot(runId);
    if (snapshot.normalizedOffers.length === 0) return;
    const input: ClarityAgentInput = {
      normalized: [...snapshot.normalizedOffers],
      validations: [...snapshot.offerValidations],
      scenarios: [...snapshot.scenarios],
      emergencyFundMin: snapshot.syntheticProfile.emergencyFundMin,
      existingDebtsDeclared: snapshot.syntheticProfile.existingMonthlyDebts !== null,
      comprehensionFeedback: [...snapshot.comprehensionResult.feedback],
      ...(injectedDrafts ? { injectedDrafts } : {}),
    };
    const envelope = this.handoff<ClarityAgentInput, AgentEnvelope<ClarityAgentOutput>>(
      runId,
      'offer-clarity-agent',
      input,
      'Richiesta di spiegazione neutrale dei trade-off.',
    );
    this.clarityByRun.set(runId, envelope.output);
    this.store.mutate(runId, TOKEN, (draft) => {
      for (const offer of draft.normalizedOffers) {
        const lines = envelope.output.perOffer.find((p) => p.offerId === offer.offerId)?.lines ?? [];
        offer.tradeoffNote = lines.join(' ');
      }
      if (envelope.output.safety.blocked) {
        const note = `SafetyGuard ha bloccato ${envelope.output.safety.blockedCount} frase/i non conformi prima della visualizzazione.`;
        if (!draft.warnings.includes(note)) draft.warnings.push(note);
      }
    });
  }

  private applyTransition(runId: string, to: Phase, reason: string): void {
    const from = this.store.snapshot(runId).currentPhase;
    try {
      this.store.transition(runId, TOKEN, to, reason);
    } catch (error) {
      if (error instanceof IllegalTransitionError) {
        this.rejectTransition(runId, from, to, reason);
      }
      throw error;
    }
    this.events.emit({
      runId,
      kind: 'state.changed',
      actor: 'MortgageJourneyOrchestrator',
      actorKind: 'orchestrator',
      status: 'info',
      message: `${from} -> ${to}: ${reason}`,
      phaseAfter: to,
    });
  }

  private rejectTransition(runId: string, from: Phase, to: Phase, reason: string): void {
    const message = `Transizione rifiutata ${from} -> ${to}: ${reason}`;
    this.store.mutate(runId, TOKEN, (draft) => {
      if (!draft.warnings.includes(message)) draft.warnings.push(message);
    });
    this.events.emit({
      runId,
      kind: 'state.transition_rejected',
      actor: 'MortgageJourneyOrchestrator',
      actorKind: 'orchestrator',
      status: 'failed',
      message,
      phaseAfter: from,
    });
  }

  private emitOrchestrator(runId: string, kind: EventKind, message: string): void {
    this.events.emit({
      runId,
      kind,
      actor: 'MortgageJourneyOrchestrator',
      actorKind: 'orchestrator',
      status: 'info',
      message,
      phaseAfter: this.store.snapshot(runId).currentPhase,
    });
  }

  private assertActive(runId: string): void {
    const phase = this.store.snapshot(runId).currentPhase;
    if (phase === 'COMPLETED' || phase === 'ESCALATED') {
      throw new IllegalTransitionError(phase, phase, 'Il run è in uno stato terminale.');
    }
  }

  private safeMetrics(runId: string, state: RunState): MetricsOutput | null {
    if (!this.registry.has('MetricsEngine')) return null;
    try {
      return this.registry.invoke<MetricsInput, MetricsOutput>(runId, 'MetricsEngine', {
        state,
        events: this.events.byRun(runId),
      });
    } catch {
      return null;
    }
  }

  private suggestNextAction(state: RunState): string {
    switch (state.currentPhase) {
      case 'START':
        return 'Compila o conferma il profilo per avviare il confronto.';
      case 'PROFILE_INCOMPLETE':
        return state.selectedQuestion
          ? `Rispondi alla prossima domanda decisiva: ${state.selectedQuestion.question}`
          : 'Completa i dati mancanti del profilo.';
      case 'PROFILE_READY':
        return 'Normalizza le offerte per vedere MutuoSpecchio.';
      case 'OFFERS_INCOMPLETE':
        return 'Alcune offerte hanno dati mancanti: il confronto prosegue in modalità parziale.';
      case 'OFFERS_NORMALIZED':
        return 'Calcola gli scenari per vedere cosa cambia negli imprevisti.';
      case 'SCENARIOS_READY':
        return 'Avvia il controllo di comprensione.';
      case 'UNDERSTANDING_CHECK':
        return `Rispondi alle domande del controllo di comprensione (tentativo ${state.comprehensionResult.attemptsUsed + 1} di ${state.comprehensionResult.maxAttempts}).`;
      case 'AWAITING_HUMAN_CONFIRMATION':
        return 'Serve la tua conferma esplicita per chiudere la sessione.';
      case 'COMPLETED':
        return 'Sessione conclusa. La decisione resta tua.';
      case 'ESCALATED':
        return `Run interrotto: ${state.escalation.reason ?? 'motivo non registrato'}.`;
    }
  }
}

function applyPatch(draft: RunState, patch: ProfilePatch): void {
  const profileKeys = [
    'monthlyNetIncome',
    'otherMonthlyIncome',
    'existingMonthlyDebts',
    'savings',
    'emergencyFundMin',
  ] as const;
  const propertyKeys = [
    'price',
    'accessoryCosts',
    'plannedWorks',
    'requestedLoanAmount',
    'assumedYears',
  ] as const;

  for (const key of profileKeys) {
    if (key in patch) draft.syntheticProfile[key] = patch[key] ?? null;
  }
  for (const key of propertyKeys) {
    if (key in patch) draft.property[key] = patch[key] ?? null;
  }
  // L importo del mutuo richiesto si riflette su tutte le offerte sintetiche,
  // così il confronto resta sullo stesso capitale.
  if ('requestedLoanAmount' in patch && typeof patch.requestedLoanAmount === 'number') {
    for (const offer of draft.offers) {
      offer.amount = patch.requestedLoanAmount;
      offer.provenance['amount'] = 'USER_INPUT';
    }
  }
}
