import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGAL_TRANSITIONS,
  completionBlockers,
  isLegalTransition,
} from '../src/core/stateMachine.js';
import { RunStore } from '../src/core/runStore.js';
import { IllegalTransitionError } from '../src/core/errors.js';
import { buildRuntime } from '../src/runtime/buildRuntime.js';
import { PHASES, type Phase, type RunState } from '../src/core/types.js';
import { MAX_QUIZ_ATTEMPTS, QUIZ_QUESTIONS } from '../src/data/quizBank.js';
import { declareExistingDebts } from './support/journey.js';

const correctAnswers = () =>
  Object.fromEntries(QUIZ_QUESTIONS.map((q) => [q.id, q.correctOptionId]));
const wrongAnswers = () =>
  Object.fromEntries(
    QUIZ_QUESTIONS.map((q) => [q.id, q.options.find((o) => o.id !== q.correctOptionId)!.id]),
  );

describe('Macchina a stati - transizioni', () => {
  test('ogni fase dichiarata ha una voce nella tabella delle transizioni', () => {
    for (const phase of PHASES) {
      assert.ok(LEGAL_TRANSITIONS[phase] !== undefined, `fase senza transizioni dichiarate: ${phase}`);
    }
  });

  test('transizioni legali accettate', () => {
    assert.ok(isLegalTransition('START', 'PROFILE_INCOMPLETE'));
    assert.ok(isLegalTransition('PROFILE_INCOMPLETE', 'PROFILE_READY'));
    assert.ok(isLegalTransition('OFFERS_NORMALIZED', 'SCENARIOS_READY'));
    assert.ok(isLegalTransition('UNDERSTANDING_CHECK', 'AWAITING_HUMAN_CONFIRMATION'));
    assert.ok(isLegalTransition('AWAITING_HUMAN_CONFIRMATION', 'COMPLETED'));
  });

  test('transizioni illegali rifiutate', () => {
    assert.equal(isLegalTransition('START', 'COMPLETED'), false);
    assert.equal(isLegalTransition('START', 'SCENARIOS_READY'), false);
    assert.equal(isLegalTransition('PROFILE_READY', 'COMPLETED'), false);
    assert.equal(isLegalTransition('OFFERS_NORMALIZED', 'AWAITING_HUMAN_CONFIRMATION'), false);
    assert.equal(isLegalTransition('SCENARIOS_READY', 'COMPLETED'), false);
    assert.equal(isLegalTransition('COMPLETED', 'PROFILE_INCOMPLETE'), false);
    assert.equal(isLegalTransition('ESCALATED', 'PROFILE_INCOMPLETE'), false);
  });

  test('gli stati terminali non hanno uscite', () => {
    assert.deepEqual(LEGAL_TRANSITIONS.COMPLETED, []);
    assert.deepEqual(LEGAL_TRANSITIONS.ESCALATED, []);
  });

  test('il RunStore rifiuta una transizione illegale', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-transitions');
    assert.throws(
      () => rt.store.transition(run.runId, RunStore.token, 'COMPLETED', 'salto indebito'),
      IllegalTransitionError,
    );
    assert.equal(rt.store.snapshot(run.runId).currentPhase, 'START');
  });

  test('lo stato mutabile non e accessibile senza il token dell orchestratore', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-token');
    assert.throws(() => rt.store.raw(run.runId, Symbol('finto')), /solo all orchestratore/i);
  });

  test('lo snapshot passato agli agenti e congelato in profondita', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-frozen');
    const snapshot = rt.store.snapshot(run.runId);
    assert.ok(Object.isFrozen(snapshot));
    assert.ok(Object.isFrozen(snapshot.syntheticProfile));
    assert.ok(Object.isFrozen(snapshot.offers));
    assert.throws(() => {
      (snapshot as unknown as RunState).currentPhase = 'COMPLETED';
    }, TypeError);
    assert.equal(rt.store.snapshot(run.runId).currentPhase, 'START');
  });
});

describe('Precondizioni di completamento', () => {
  test('un run appena creato elenca tutti i requisiti mancanti', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-blockers');
    const blockers = completionBlockers(rt.store.snapshot(run.runId) as RunState);
    assert.equal(blockers.length, 4);
    assert.ok(blockers.some((b) => /validazione/i.test(b)));
    assert.ok(blockers.some((b) => /scenario/i.test(b)));
    assert.ok(blockers.some((b) => /comprensione/i.test(b)));
    assert.ok(blockers.some((b) => /Conferma umana/i.test(b)));
  });

  test('un tentativo di quiz non superato con tentativi residui blocca ancora il completamento', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-inprogress');
    declareExistingDebts(rt, run.runId);
    rt.orchestrator.runScenarios(run.runId);
    rt.orchestrator.startUnderstandingCheck(run.runId);
    const view = rt.orchestrator.submitQuiz(run.runId, wrongAnswers());
    assert.equal(view.state.comprehensionResult.status, 'IN_PROGRESS');
    assert.ok(view.completionBlockers.some((b) => /in corso/i.test(b)));
  });
});

describe('Human gate', () => {
  function readyForGate(runId: string) {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun(runId);
    declareExistingDebts(rt, run.runId);
    rt.orchestrator.runScenarios(run.runId);
    rt.orchestrator.startUnderstandingCheck(run.runId);
    rt.orchestrator.submitQuiz(run.runId, correctAnswers());
    return rt;
  }

  test('il gate blocca il completamento fino alla conferma esplicita', () => {
    const rt = readyForGate('run-gate');
    const before = rt.store.snapshot('run-gate');
    assert.equal(before.currentPhase, 'AWAITING_HUMAN_CONFIRMATION');
    assert.equal(before.humanApproval.received, false);
    assert.equal(rt.events.countByKind('run-gate', 'human_approval.required'), 1);
    assert.equal(rt.events.countByKind('run-gate', 'run.completed'), 0);

    const view = rt.orchestrator.confirmHumanApproval('run-gate', true, 'tester');
    assert.equal(view.state.currentPhase, 'COMPLETED');
    assert.equal(view.state.humanApproval.received, true);
    assert.ok(view.state.humanApproval.receivedAt !== null);
    assert.equal(rt.events.countByKind('run-gate', 'human_approval.received'), 1);
    assert.equal(rt.events.countByKind('run-gate', 'run.completed'), 1);
    assert.ok(view.state.timestamps.completedAt !== null);
  });

  test('senza conferma la fase non cambia', () => {
    const rt = readyForGate('run-gate-no');
    const view = rt.orchestrator.confirmHumanApproval('run-gate-no', false, 'tester');
    assert.equal(view.state.currentPhase, 'AWAITING_HUMAN_CONFIRMATION');
    assert.equal(view.state.humanApproval.received, false);
    assert.equal(rt.events.countByKind('run-gate-no', 'run.completed'), 0);
  });

  test('approvazione richiesta nella fase sbagliata: rifiutata e osservabile', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-gate-early');
    assert.throws(
      () => rt.orchestrator.confirmHumanApproval(run.runId, true, 'tester'),
      IllegalTransitionError,
    );
    const state = rt.store.snapshot(run.runId);
    assert.equal(state.currentPhase, 'START', 'la fase non deve cambiare');
    assert.equal(state.humanApproval.received, false);
    assert.equal(
      rt.events.countByKind(run.runId, 'state.transition_rejected'),
      1,
      'il rifiuto deve produrre un evento osservabile',
    );
    assert.ok(
      state.warnings.some((w) => /Transizione rifiutata/.test(w)),
      'il rifiuto deve essere registrato nello stato',
    );
  });

  test('un run concluso non accetta ulteriori azioni', () => {
    const rt = readyForGate('run-gate-closed');
    rt.orchestrator.confirmHumanApproval('run-gate-closed', true, 'tester');
    assert.throws(() => rt.orchestrator.runScenarios('run-gate-closed'), IllegalTransitionError);
    assert.throws(
      () => rt.orchestrator.updateProfile('run-gate-closed', { savings: 1 }),
      IllegalTransitionError,
    );
  });
});

describe('Limite di tentativi del controllo di comprensione', () => {
  test('dopo tre tentativi errati lo stato e comprensione non verificata', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-quiz-limit');
    declareExistingDebts(rt, run.runId);
    rt.orchestrator.runScenarios(run.runId);
    rt.orchestrator.startUnderstandingCheck(run.runId);

    for (let i = 0; i < MAX_QUIZ_ATTEMPTS; i += 1) {
      rt.orchestrator.submitQuiz(run.runId, wrongAnswers());
    }

    const view = rt.orchestrator.view(run.runId);
    assert.equal(view.state.comprehensionAttempts.length, MAX_QUIZ_ATTEMPTS);
    assert.equal(view.state.comprehensionResult.status, 'NOT_VERIFIED');
    assert.equal(view.state.currentPhase, 'AWAITING_HUMAN_CONFIRMATION');
    assert.equal(rt.events.countByKind(run.runId, 'understanding.failed'), MAX_QUIZ_ATTEMPTS);
    assert.equal(rt.events.countByKind(run.runId, 'understanding.passed'), 0);
    assert.ok(
      view.state.warnings.some((w) => /non verificata/i.test(w)),
      'il limite raggiunto deve essere registrato nello stato',
    );
    // I risultati restano consultabili.
    assert.ok(view.state.normalizedOffers.length > 0);
    assert.ok(view.state.scenarios.length > 0);
  });

  test('un quarto tentativo viene rifiutato', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-quiz-over');
    declareExistingDebts(rt, run.runId);
    rt.orchestrator.runScenarios(run.runId);
    rt.orchestrator.startUnderstandingCheck(run.runId);
    for (let i = 0; i < MAX_QUIZ_ATTEMPTS; i += 1) {
      rt.orchestrator.submitQuiz(run.runId, wrongAnswers());
    }
    // Dopo il limite la fase e AWAITING_HUMAN_CONFIRMATION: il quiz non riapre.
    assert.throws(() => rt.orchestrator.submitQuiz(run.runId, wrongAnswers()), IllegalTransitionError);
  });

  test('un errore produce feedback mirato e indica lo scenario da riaprire', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-quiz-feedback');
    declareExistingDebts(rt, run.runId);
    rt.orchestrator.runScenarios(run.runId);
    rt.orchestrator.startUnderstandingCheck(run.runId);
    const view = rt.orchestrator.submitQuiz(run.runId, { ...correctAnswers(), q3: 'b' });

    assert.equal(view.state.comprehensionResult.status, 'IN_PROGRESS');
    assert.equal(view.state.currentPhase, 'UNDERSTANDING_CHECK');
    const fb = view.state.comprehensionResult.feedback;
    assert.equal(fb.length, 1);
    assert.equal(fb[0]!.questionId, 'q3');
    assert.equal(fb[0]!.reopenScenario, 'APPRAISAL_MINUS_10');
    assert.ok(fb[0]!.explanation.length > 80, 'il feedback deve spiegare, non solo dire "sbagliato"');
    assert.deepEqual(view.state.comprehensionResult.conceptsUnderstood, [
      'rata vs costo totale',
      'sensibilità al tasso',
    ]);
  });

  test('un secondo tentativo corretto supera il controllo', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-quiz-retry');
    declareExistingDebts(rt, run.runId);
    rt.orchestrator.runScenarios(run.runId);
    rt.orchestrator.startUnderstandingCheck(run.runId);
    rt.orchestrator.submitQuiz(run.runId, { ...correctAnswers(), q1: 'a' });
    const view = rt.orchestrator.submitQuiz(run.runId, correctAnswers());
    assert.equal(view.state.comprehensionResult.status, 'PASSED');
    assert.equal(view.state.comprehensionResult.attemptsUsed, 2);
    assert.equal(view.state.currentPhase, 'AWAITING_HUMAN_CONFIRMATION');
  });

  test('il quiz non puo essere inviato prima di essere avviato', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-quiz-early');
    declareExistingDebts(rt, run.runId);
    assert.throws(() => rt.orchestrator.submitQuiz(run.runId, correctAnswers()), IllegalTransitionError);
    assert.equal(rt.events.countByKind(run.runId, 'state.transition_rejected'), 1);
  });
});

describe('Escalation osservabile', () => {
  test('tool non disponibile porta il run in ESCALATED con evento dedicato', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-outage');
    declareExistingDebts(rt, run.runId);

    const view = rt.orchestrator.simulateComponentOutage(run.runId, 'MortgageCalculator');
    assert.equal(view.state.currentPhase, 'ESCALATED');
    assert.equal(view.state.escalation.escalated, true);
    assert.match(view.state.escalation.reason!, /non disponibile/i);
    assert.equal(rt.events.countByKind(run.runId, 'run.escalated'), 1);
    // Il fallimento del tool disabilitato propaga anche al tool chiamante:
    // entrambi i fallimenti restano osservabili.
    assert.ok(rt.events.countByKind(run.runId, 'tool.failed') >= 1);
    const failed = rt.events.byRun(run.runId).find((e) => e.kind === 'tool.failed')!;
    assert.equal(failed.actor, 'MortgageCalculator');
    assert.ok(
      rt.events
        .byRun(run.runId)
        .some((e) => e.kind === 'tool.failed' && e.actor === 'AffordabilityScenarioEngine'),
      'anche il tool chiamante deve registrare il fallimento',
    );
    assert.ok(failed.inputRef, 'anche un fallimento produce un inputRef');
    assert.ok(failed.outputRef, 'anche un fallimento produce un outputRef con l errore');
  });

  test('profilo con reddito zero porta a escalation, non a un calcolo silenzioso', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-zero-income');
    const view = rt.orchestrator.updateProfile(run.runId, { monthlyNetIncome: 0 });
    assert.equal(view.state.currentPhase, 'ESCALATED');
    assert.equal(rt.events.countByKind(run.runId, 'run.escalated'), 1);
    assert.equal(rt.events.countByKind(run.runId, 'skill.failed'), 1);
    assert.ok(view.state.warnings.some((w) => /maggiore di zero/i.test(w)));
  });

  test('importo negativo nel profilo porta a escalation con dettaglio del campo', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-negative');
    const view = rt.orchestrator.updateProfile(run.runId, { savings: -500 });
    assert.equal(view.state.currentPhase, 'ESCALATED');
    assert.ok(view.state.warnings.some((w) => /negativ/i.test(w)));
  });

  test('durata non valida nel profilo porta a escalation', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-bad-years');
    const view = rt.orchestrator.updateProfile(run.runId, { assumedYears: 99 });
    assert.equal(view.state.currentPhase, 'ESCALATED');
    assert.ok(view.state.warnings.some((w) => /1 e 40 anni/i.test(w)));
  });

  test('un fallimento non si limita a un avviso in console: cambia lo stato', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-fail-state');
    const phaseBefore: Phase = rt.store.snapshot(run.runId).currentPhase;
    rt.orchestrator.updateProfile(run.runId, { monthlyNetIncome: 0 });
    const phaseAfter: Phase = rt.store.snapshot(run.runId).currentPhase;
    assert.notEqual(phaseAfter, phaseBefore);
    assert.equal(phaseAfter, 'ESCALATED');
  });
});
