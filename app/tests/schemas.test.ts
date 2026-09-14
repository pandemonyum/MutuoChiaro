import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { EVENT_KINDS, PHASES } from '../src/core/types.js';
import { buildRuntime } from '../src/runtime/buildRuntime.js';
import { QUIZ_QUESTIONS } from '../src/data/quizBank.js';
import { declareExistingDebts } from './support/journey.js';
import { ROW_ORDER } from '../src/skills/normalizeMortgageOffers.js';
import { SAFETY_RULES } from '../src/tools/safetyGuard.js';

/**
 * Gli schemi in agents/schemas/ sono dichiarazioni sul runtime.
 * Questi test falliscono se il codice e gli schemi divergono, così la
 * documentazione non può restare indietro rispetto all implementazione.
 */
const SCHEMA_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'agents',
  'schemas',
);

function loadSchema(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(SCHEMA_DIR, name), 'utf8')) as Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function at(schema: unknown, path: string[]): any {
  let node: unknown = schema;
  for (const key of path) {
    node = (node as Record<string, unknown>)[key];
    assert.ok(node !== undefined, `percorso inesistente nello schema: ${path.join('.')}`);
  }
  return node;
}

describe('Schemi JSON allineati al runtime', () => {
  test('runtime-state: le fasi dello schema coincidono con PHASES', () => {
    const schema = loadSchema('runtime-state.schema.json');
    assert.deepEqual(at(schema, ['$defs', 'phase', 'enum']), [...PHASES]);
  });

  test('runtime-event: il vocabolario dello schema coincide con EVENT_KINDS', () => {
    const schema = loadSchema('runtime-event.schema.json');
    assert.deepEqual(at(schema, ['$defs', 'eventKind', 'enum']), [...EVENT_KINDS]);
    assert.deepEqual(at(schema, ['$defs', 'phase', 'enum']), [...PHASES]);
  });

  test('runtime-state: le righe di MutuoSpecchio coincidono con ROW_ORDER', () => {
    const schema = loadSchema('runtime-state.schema.json');
    const declared = at(schema, [
      '$defs',
      'normalizedOffer',
      'properties',
      'rows',
      'propertyNames',
      'enum',
    ]);
    assert.deepEqual([...declared].sort(), [...ROW_ORDER].sort());
  });

  test('agent-envelope: i nomi degli agenti sono quelli registrati', () => {
    const schema = loadSchema('agent-envelope.schema.json');
    const declared: string[] = at(schema, ['properties', 'agent', 'enum']);
    const registered = buildRuntime()
      .registry.list()
      .filter((c) => c.kind === 'agent')
      .map((c) => c.name);
    assert.deepEqual([...declared].sort(), [...registered].sort());
  });

  test('agent-envelope: le categorie di SafetyGuard sono quelle delle regole', () => {
    const schema = loadSchema('agent-envelope.schema.json');
    const declared: string[] = at(schema, [
      '$defs',
      'clarityAgentOutput',
      'properties',
      'safety',
      'properties',
      'matches',
      'items',
      'properties',
      'category',
      'enum',
    ]);
    const used = [...new Set(SAFETY_RULES.map((r) => r.category))];
    assert.deepEqual([...declared].sort(), [...used].sort());
  });

  test('runtime-state: maxAttempts dello schema compatibile con il quiz reale', () => {
    const schema = loadSchema('runtime-state.schema.json');
    const max = at(schema, ['$defs', 'quizAttempt', 'properties', 'attempt', 'maximum']);
    assert.equal(max, 3);
    assert.equal(QUIZ_QUESTIONS.length, 3);
  });
});

describe('Lo stato reale rispetta lo schema dichiarato', () => {
  function completedRun() {
    const rt = buildRuntime();
    const runId = 'schema-run';
    rt.orchestrator.createRun(runId);
    declareExistingDebts(rt, runId);
    rt.orchestrator.runScenarios(runId);
    rt.orchestrator.startUnderstandingCheck(runId);
    rt.orchestrator.submitQuiz(
      runId,
      Object.fromEntries(QUIZ_QUESTIONS.map((q) => [q.id, q.correctOptionId])),
    );
    const view = rt.orchestrator.confirmHumanApproval(runId, true, 'schema-test');
    return { rt, runId, view };
  }

  test('lo stato espone tutti i campi obbligatori dello schema, senza extra', () => {
    const schema = loadSchema('runtime-state.schema.json');
    const required: string[] = at(schema, ['required']);
    const allowed = Object.keys(at(schema, ['properties']));
    const { view } = completedRun();
    const actual = Object.keys(view.state);

    for (const field of required) {
      assert.ok(actual.includes(field), `campo obbligatorio assente nello stato: ${field}`);
    }
    for (const field of actual) {
      assert.ok(allowed.includes(field), `campo dello stato non dichiarato nello schema: ${field}`);
    }
    assert.deepEqual([...required].sort(), [...allowed].sort());
  });

  test('un valore assente e sempre etichettato MISSING', () => {
    const { view } = completedRun();
    for (const offer of view.state.normalizedOffers) {
      for (const [key, traced] of Object.entries(offer.rows)) {
        if (traced.value === null && key !== 'tipoTasso' && key !== 'sensibilitaScenari') {
          assert.equal(traced.provenance, 'MISSING', `${offer.offerId}.${key}`);
        }
      }
    }
    for (const scenario of view.state.scenarios) {
      for (const o of scenario.offers) {
        for (const key of ['monthlyPayment', 'liquidityNeeded', 'liquidityRemaining'] as const) {
          if (o[key].value === null) assert.equal(o[key].provenance, 'MISSING');
        }
      }
    }
  });

  test('ogni scenario dichiara almeno una ipotesi, come richiede lo schema', () => {
    const { view } = completedRun();
    for (const scenario of view.state.scenarios) {
      assert.ok(scenario.assumptions.length >= 1, scenario.scenarioId);
    }
  });

  test('COMPLETED implica conferma ricevuta, scenari e comprensione valutata', () => {
    const { view } = completedRun();
    assert.equal(view.state.currentPhase, 'COMPLETED');
    assert.equal(view.state.humanApproval.received, true);
    assert.ok(view.state.humanApproval.receivedAt);
    assert.ok(view.state.humanApproval.actor);
    assert.ok(view.state.scenarios.length >= 1);
    assert.ok(['PASSED', 'NOT_VERIFIED'].includes(view.state.comprehensionResult.status));
    assert.ok(view.state.timestamps.completedAt);
  });

  test('le spiegazioni degli errori del quiz superano la lunghezza minima dichiarata', () => {
    const rt = buildRuntime();
    const runId = 'schema-feedback';
    rt.orchestrator.createRun(runId);
    declareExistingDebts(rt, runId);
    rt.orchestrator.runScenarios(runId);
    rt.orchestrator.startUnderstandingCheck(runId);
    const wrong = Object.fromEntries(
      QUIZ_QUESTIONS.map((q) => [q.id, q.options.find((o) => o.id !== q.correctOptionId)!.id]),
    );
    const view = rt.orchestrator.submitQuiz(runId, wrong);
    assert.equal(view.state.comprehensionResult.feedback.length, 3);
    for (const f of view.state.comprehensionResult.feedback) {
      assert.ok(f.explanation.length >= 80, `${f.questionId}: spiegazione troppo breve`);
    }
  });
});

describe("Gli eventi reali rispettano i vincoli dello schema dell'evento", () => {
  function events() {
    const rt = buildRuntime();
    const runId = 'schema-events';
    rt.orchestrator.createRun(runId);
    declareExistingDebts(rt, runId);
    rt.orchestrator.runScenarios(runId);
    return rt.events.byRun(runId);
  }

  test('i riferimenti agli artifact rispettano il pattern dichiarato', () => {
    const schema = loadSchema('runtime-event.schema.json');
    const inPattern = new RegExp(at(schema, ['properties', 'inputRef', 'pattern']));
    const outPattern = new RegExp(at(schema, ['properties', 'outputRef', 'pattern']));
    let checked = 0;
    for (const e of events()) {
      if (e.inputRef) {
        assert.match(e.inputRef, inPattern);
        checked += 1;
      }
      if (e.outputRef) {
        assert.match(e.outputRef, outPattern);
        checked += 1;
      }
    }
    assert.ok(checked > 20, `attesi molti riferimenti, controllati ${checked}`);
  });

  test('started porta inputRef, completed porta inputRef, outputRef e durata', () => {
    for (const e of events()) {
      if (/\.(started)$/.test(e.kind) && e.kind !== 'handoff.started' && e.kind !== 'run.started') {
        assert.ok(e.inputRef, `${e.kind} senza inputRef`);
        assert.equal(e.status, 'started');
      }
      if (/\.(completed)$/.test(e.kind) && e.kind !== 'handoff.completed' && e.kind !== 'run.completed' && e.kind !== 'scenario.completed') {
        assert.ok(e.inputRef, `${e.kind} senza inputRef`);
        assert.ok(e.outputRef, `${e.kind} senza outputRef`);
        assert.equal(typeof e.durationMs, 'number');
        assert.equal(e.status, 'completed');
      }
    }
  });

  test('state.changed e emesso solo dall orchestratore e dichiara la fase risultante', () => {
    for (const e of events().filter((x) => x.kind === 'state.changed')) {
      assert.equal(e.actorKind, 'orchestrator');
      assert.ok(e.phaseAfter);
      assert.ok((PHASES as readonly string[]).includes(e.phaseAfter!));
    }
  });

  test('la numerazione degli eventi e progressiva e parte da 1 per ogni run', () => {
    const list = events();
    assert.equal(list[0]!.seq, 1);
    list.forEach((e, i) => assert.equal(e.seq, i + 1));
  });
});
