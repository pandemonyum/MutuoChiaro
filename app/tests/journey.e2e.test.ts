import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildRuntime } from '../src/runtime/buildRuntime.js';
import { QUIZ_QUESTIONS } from '../src/data/quizBank.js';
import { PROFILE_AGENT_CONTRACT } from '../src/agents/profilePropertyAgent.js';
import { CLARITY_AGENT_CONTRACT } from '../src/agents/offerClarityAgent.js';
import type { EventKind } from '../src/core/types.js';
import { declareExistingDebts } from './support/journey.js';

const correctAnswers = () =>
  Object.fromEntries(QUIZ_QUESTIONS.map((q) => [q.id, q.correctOptionId]));

describe('Percorso completo - dalla persona sintetica alla conferma umana', () => {
  test('handoff reale orchestratore -> Profile & Property Agent e domanda decisiva', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('e2e-question');

    // FASE A/B: il profilo non dichiara le rate attive.
    assert.equal(run.syntheticProfile.existingMonthlyDebts, null);
    const view = rt.orchestrator.updateProfile('e2e-question', {});

    assert.equal(view.state.currentPhase, 'PROFILE_INCOMPLETE');
    assert.ok(view.state.selectedQuestion);
    assert.equal(view.state.selectedQuestion!.field, 'existingMonthlyDebts');
    assert.match(view.state.selectedQuestion!.question, /rate mensili già attive/i);
    assert.match(view.state.selectedQuestion!.why, /margine/i);

    const events = rt.events.byRun('e2e-question');
    const kinds = events.map((e) => e.kind);
    assert.ok(kinds.includes('handoff.started'), 'handoff verso l agente deve essere osservabile');
    assert.ok(kinds.includes('handoff.completed'));
    assert.ok(kinds.includes('agent.started'));
    assert.ok(kinds.includes('agent.completed'));
    assert.ok(kinds.includes('missing_data.detected'));
    assert.ok(kinds.includes('question.selected'));

    const agentStart = events.find((e) => e.kind === 'agent.started')!;
    assert.equal(agentStart.actor, PROFILE_AGENT_CONTRACT.name);
    assert.ok(agentStart.inputRef);
    const agentDone = events.find((e) => e.kind === 'agent.completed')!;
    assert.ok(agentDone.outputRef);

    // L input dell agente contiene davvero lo stato corrente.
    const payload = rt.artifacts.get(agentStart.inputRef!)!.payload as {
      profile: { monthlyNetIncome: number };
    };
    assert.equal(payload.profile.monthlyNetIncome, 2250);

    // La domanda decisiva dipende dallo stato, non da una sequenza fissa.
    const questionEvent = events.find((e) => e.kind === 'question.selected')!;
    assert.match(questionEvent.message, /existingMonthlyDebts/);
  });

  test('la domanda successiva cambia quando cambiano i dati mancanti', () => {
    const rt = buildRuntime();
    rt.orchestrator.createRun('e2e-dynamic');
    // Se le rate sono dichiarate ma manca il fondo di emergenza, la domanda cambia.
    const view = rt.orchestrator.updateProfile('e2e-dynamic', {
      existingMonthlyDebts: 280,
      emergencyFundMin: null,
    });
    assert.equal(view.state.selectedQuestion!.field, 'emergencyFundMin');
    assert.match(view.state.selectedQuestion!.question, /fondo di emergenza/i);
  });

  test('percorso completo fino a COMPLETED con tutte le evidenze', () => {
    const rt = buildRuntime();
    const runId = 'e2e-full';
    rt.orchestrator.createRun(runId);

    // FASE B: risposta alla domanda decisiva -> ricalcolo automatico.
    const afterAnswer = declareExistingDebts(rt, runId);
    assert.equal(afterAnswer.state.syntheticProfile.existingMonthlyDebts, 280);
    assert.deepEqual(afterAnswer.state.resolvedMissingData, ['existingMonthlyDebts']);
    assert.equal(afterAnswer.state.selectedQuestion, null);

    // FASE C/D: offerte validate e normalizzate sullo stesso schema.
    assert.equal(afterAnswer.state.currentPhase, 'OFFERS_NORMALIZED');
    assert.equal(afterAnswer.state.normalizedOffers.length, 3);
    assert.equal(afterAnswer.state.offerValidations.length, 3);
    const rowKeys = Object.keys(afterAnswer.state.normalizedOffers[0]!.rows);
    for (const offer of afterAnswer.state.normalizedOffers) {
      assert.deepEqual(Object.keys(offer.rows), rowKeys, 'schema identico per tutte le offerte');
      for (const [key, traced] of Object.entries(offer.rows)) {
        assert.ok(traced.provenance, `provenienza mancante su ${offer.offerId}.${key}`);
      }
    }

    // Il failure branch della polizza e attivo.
    const partial = afterAnswer.state.offerValidations.find((v) => v.partial)!;
    assert.equal(partial.offerId, 'offer-c');
    assert.ok(partial.missingFields.includes('insuranceCost'));
    assert.ok(rt.events.countByKind(runId, 'offer.incomplete') >= 1);

    // FASE E: quattro scenari.
    const afterScenarios = rt.orchestrator.runScenarios(runId);
    assert.equal(afterScenarios.state.currentPhase, 'SCENARIOS_READY');
    assert.equal(afterScenarios.state.scenarios.length, 4);
    assert.deepEqual(
      afterScenarios.state.scenarios.map((s) => s.scenarioId),
      ['BASE', 'APPRAISAL_MINUS_10', 'RATE_PLUS_2PP', 'INCOME_MINUS_20_6M'],
    );
    for (const scenario of afterScenarios.state.scenarios) {
      assert.ok(scenario.assumptions.length > 0, `${scenario.scenarioId} senza ipotesi dichiarate`);
    }
    assert.ok(rt.events.countByKind(runId, 'scenario.completed') >= 5);

    // FASE F: controllo di comprensione superato.
    rt.orchestrator.startUnderstandingCheck(runId);
    const afterQuiz = rt.orchestrator.submitQuiz(runId, correctAnswers());
    assert.equal(afterQuiz.state.comprehensionResult.status, 'PASSED');
    assert.equal(afterQuiz.state.comprehensionResult.conceptsUnderstood.length, 3);
    assert.equal(rt.events.countByKind(runId, 'understanding.passed'), 1);

    // FASE G: gate umano.
    assert.equal(afterQuiz.state.currentPhase, 'AWAITING_HUMAN_CONFIRMATION');
    assert.deepEqual(afterQuiz.completionBlockers, ['Conferma umana non ricevuta.']);
    const final = rt.orchestrator.confirmHumanApproval(runId, true, 'utente-test');
    assert.equal(final.state.currentPhase, 'COMPLETED');
    assert.deepEqual(final.completionBlockers, []);

    // Metriche derivate dal run, non inventate.
    const m = final.metrics!;
    assert.equal(m.conceptsUnderstoodCount, 3);
    assert.equal(m.quizAttemptsUsed, 1);
    assert.equal(m.initialWrongAnswers, 0);
    assert.equal(m.missingDataResolved, 1);
    assert.deepEqual(m.resolvedFields, ['existingMonthlyDebts']);
    assert.equal(m.scenariosCompleted, 4);
    assert.equal(m.partialOffers, 1);
    assert.ok(m.completionTimeMs !== null && m.completionTimeMs >= 0);
    assert.deepEqual(m.beforeAfter.before.comparisonCriteriaUsed, ['rata mensile']);
    assert.equal(m.beforeAfter.before.criteriaCount, 1);
    assert.ok(m.beforeAfter.after.criteriaCount > m.beforeAfter.before.criteriaCount);
    assert.equal(m.beforeAfter.before.canExplainPaymentVsTotalCost, false);
    assert.equal(m.beforeAfter.after.canExplainPaymentVsTotalCost, true);
    assert.equal(m.beforeAfter.after.canExplainAppraisalEffect, true);
    assert.equal(m.beforeAfter.after.canRecognizeVariableRateRisk, true);
    assert.ok(m.beforeAfter.after.missingDataKnownToUser >= 1);

    // Sequenza minima di eventi presente nel run.
    const required: EventKind[] = [
      'run.started',
      'state.changed',
      'handoff.started',
      'handoff.completed',
      'agent.started',
      'agent.completed',
      'skill.started',
      'skill.completed',
      'tool.started',
      'tool.completed',
      'missing_data.detected',
      'question.selected',
      'offer.incomplete',
      'scenario.completed',
      'understanding.passed',
      'human_approval.required',
      'human_approval.received',
      'run.completed',
    ];
    const kinds = new Set(rt.events.byRun(runId).map((e) => e.kind));
    for (const kind of required) {
      assert.ok(kinds.has(kind), `evento mancante nel run: ${kind}`);
    }
  });

  test('nessuna classifica e nessun punteggio di convenienza nell output', () => {
    const rt = buildRuntime();
    const runId = 'e2e-neutral';
    rt.orchestrator.createRun(runId);
    declareExistingDebts(rt, runId);
    const view = rt.orchestrator.runScenarios(runId);

    const serialized = JSON.stringify({
      offers: view.state.normalizedOffers,
      clarity: view.clarity,
      scenarios: view.state.scenarios,
    });
    for (const forbidden of [
      'migliore',
      'ottimale',
      'consigliat',
      'ti conviene',
      'classifica',
      'graduatoria',
      'punteggio',
      'vincent',
      'probabilità di approvazione',
    ]) {
      assert.ok(
        !serialized.toLowerCase().includes(forbidden),
        `termine vietato presente nell output: ${forbidden}`,
      );
    }
    // Nessun campo di ranking nello schema normalizzato.
    for (const offer of view.state.normalizedOffers) {
      const keys = Object.keys(offer.rows);
      assert.ok(!keys.some((k) => /rank|score|punteggio/i.test(k)));
    }
  });

  test('modifica manuale di un offerta: rivalidazione e provenienza aggiornata', () => {
    const rt = buildRuntime();
    const runId = 'e2e-edit';
    rt.orchestrator.createRun(runId);
    declareExistingDebts(rt, runId);
    const before = rt.orchestrator.view(runId);
    const paymentBefore = before.state.normalizedOffers.find((o) => o.offerId === 'offer-a')!
      .rows['rataIniziale']!.value!;

    const after = rt.orchestrator.editOffer(runId, 'offer-a', { tanPct: 4.1 });
    const offerA = after.state.normalizedOffers.find((o) => o.offerId === 'offer-a')!;
    assert.ok(offerA.rows['rataIniziale']!.value! > paymentBefore, 'la rata deve essere ricalcolata');
    assert.equal(offerA.rows['tan']!.provenance, 'USER_INPUT');
    assert.equal(offerA.rows['tan']!.value, 4.1);
    assert.equal(after.state.offers.find((o) => o.id === 'offer-a')!.provenance['tanPct'], 'USER_INPUT');
  });

  test("svuotare un campo obbligatorio dell'offerta la porta in confronto parziale", () => {
    const rt = buildRuntime();
    const runId = 'e2e-edit-missing';
    rt.orchestrator.createRun(runId);
    declareExistingDebts(rt, runId);

    const after = rt.orchestrator.editOffer(runId, 'offer-a', { insuranceCost: null });
    const validation = after.state.offerValidations.find((v) => v.offerId === 'offer-a')!;
    assert.equal(validation.partial, true);
    assert.ok(validation.missingFields.includes('insuranceCost'));
    assert.equal(
      after.state.offers.find((o) => o.id === 'offer-a')!.provenance['insuranceCost'],
      'MISSING',
    );
    const normalized = after.state.normalizedOffers.find((o) => o.offerId === 'offer-a')!;
    assert.match(normalized.rows['costiIniziali']!.note ?? '', /Parziale/i);
    assert.ok(rt.events.countByKind(runId, 'offer.incomplete') >= 1);
  });

  test('il costo mancante non viene mai stimato: il dato resta null nello stato', () => {
    const rt = buildRuntime();
    const runId = 'e2e-no-invention';
    rt.orchestrator.createRun(runId);
    declareExistingDebts(rt, runId);
    const view = rt.orchestrator.runScenarios(runId);

    const offerC = view.state.offers.find((o) => o.id === 'offer-c')!;
    assert.equal(offerC.insuranceCost, null);
    assert.equal(offerC.insuranceRequired, true);

    // L offerta resta nel confronto.
    assert.ok(view.state.normalizedOffers.some((o) => o.offerId === 'offer-c'));
    // Il totale e marcato parziale.
    const normalizedC = view.state.normalizedOffers.find((o) => o.offerId === 'offer-c')!;
    assert.match(normalizedC.rows['costoTotaleSimulato']!.note ?? '', /Parziale/i);
    // La domanda per la banca e disponibile all utente.
    const notes = view.clarity!.missingDataNotes.join(' ');
    assert.match(notes, /domanda da porre alla banca/i);
    assert.match(notes, /polizza/i);
    // La limitazione e fra le avvertenze del run.
    assert.ok(view.state.warnings.some((w) => /polizza obbligatoria non è presente/i.test(w)));
  });

  test('i contratti degli agenti dichiarano divieti e condizione di completamento', () => {
    for (const contract of [PROFILE_AGENT_CONTRACT, CLARITY_AGENT_CONTRACT]) {
      assert.ok(contract.purpose.length > 20);
      assert.ok(contract.allowedInputs.length > 0);
      assert.ok(contract.requiredOutputs.length > 0);
      assert.ok(contract.procedure.length > 0);
      assert.ok(contract.prohibitions.length >= 4);
      assert.ok(contract.doneCondition.length > 20);
      assert.ok(contract.fallback.length > 10);
    }
    assert.ok(PROFILE_AGENT_CONTRACT.prohibitions.some((p) => /non calcola rate/i.test(p)));
    assert.ok(CLARITY_AGENT_CONTRACT.prohibitions.some((p) => /graduatoria/i.test(p)));
  });

  test('gli agenti dichiarano confidence e nextAction nella busta', () => {
    const rt = buildRuntime();
    const runId = 'e2e-envelope';
    rt.orchestrator.createRun(runId);
    rt.orchestrator.updateProfile(runId, {});

    const completed = rt.events.byRun(runId).filter((e) => e.kind === 'agent.completed');
    assert.ok(completed.length >= 1);
    for (const event of completed) {
      const envelope = rt.artifacts.get(event.outputRef!)!.payload as {
        status: string;
        confidence: number;
        nextAction: string;
        prohibitionsRespected: string[];
        doneCondition: string;
      };
      assert.ok(['success', 'needs-data', 'human-review', 'fallback'].includes(envelope.status));
      assert.equal(typeof envelope.confidence, 'number');
      assert.ok(envelope.nextAction.length > 0);
      assert.ok(envelope.prohibitionsRespected.length > 0);
      assert.ok(envelope.doneCondition.length > 0);
    }
    const handoffDone = rt.events.byRun(runId).find((e) => e.kind === 'handoff.completed')!;
    assert.match(handoffDone.message, /status=.*confidence=.*nextAction=/);
  });

  test('il numero di giri di domande ha un massimo esplicito', () => {
    const rt = buildRuntime();
    const runId = 'e2e-loop-bound';
    const run = rt.orchestrator.createRun(runId);
    assert.equal(run.maxQuestionRounds, 3);

    // Profilo con molti dati mancanti: il ciclo di domande non e infinito.
    rt.orchestrator.updateProfile(runId, {
      existingMonthlyDebts: null,
      emergencyFundMin: null,
      accessoryCosts: null,
      plannedWorks: null,
    });
    let guard = 0;
    while (rt.store.snapshot(runId).selectedQuestion && guard < 10) {
      const field = rt.store.snapshot(runId).selectedQuestion!.field;
      rt.orchestrator.answerDecisiveQuestion(runId, field, 0);
      guard += 1;
    }
    assert.ok(guard <= run.maxQuestionRounds, `giri usati ${guard}, massimo ${run.maxQuestionRounds}`);
    assert.equal(rt.store.snapshot(runId).selectedQuestion, null);
  });
});
